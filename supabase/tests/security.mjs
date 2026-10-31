// 一時的なローカルPostgreSQLで検証する。本番Supabaseには接続しない。
const { PGlite } = await import(process.env.PGLITE_MODULE ?? "@electric-sql/pglite");
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
try {
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid(),auth.jwt() to anon,authenticated;`);
await db.exec(await readFile(new URL("../migrations/202611010001_movie_boards.sql", import.meta.url), "utf8"));
console.log('Migration syntax: passed');
const owner='11111111-1111-4111-8111-111111111111', guest='22222222-2222-4222-8222-222222222222', outsider='33333333-3333-4333-8333-333333333333', board='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await db.query('insert into auth.users(id) values($1),($2),($3)',[owner,guest,outsider]);
async function user(id,anonymous,sql,values=[]){return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:anonymous})]);return tx.query(sql,values)});}
const create=`select public.cinema_create_board($1,$2,372058,$3,null,null,ARRAY['アニメーション'],2,now()+interval '1 day') as id`;
await user(owner,false,create,[board,'映画の感想','君の名は。']);
await user(owner,false,create,[board,'再送','君の名は。']);
assert.equal((await db.query('select count(*) as count from public.board_members')).rows[0].count,1);
await assert.rejects(user(outsider,false,create,[board,'横取り','君の名は。']),/FORBIDDEN/);
await user(guest,true,'select public.cinema_join_board($1)',[board]);
await user(guest,true,'select public.cinema_join_board($1)',[board]);
await assert.rejects(user(outsider,false,'select public.cinema_join_board($1)',[board]),/BOARD_FULL/);
await assert.rejects(user(guest,true,'select public.cinema_post_message($1,$2)',[board,'開始前']),/NOT_STARTED/);
await assert.rejects(user(outsider,false,'select public.cinema_post_message($1,$2)',[board,'侵入']),/NOT_A_MEMBER/);
await user(owner,false,'insert into public.profiles(id,nickname) values($1,$2)',[owner,'作成者']);
await assert.rejects(user(guest,true,'insert into public.profiles(id,nickname) values($1,$2)',[guest,'不可']),/row-level security/);
assert.equal((await user(outsider,false,'select * from public.profiles')).rows.length,0);
await db.query("update public.boards set starts_at=now()-interval '1 minute' where id=$1",[board]);
await user(owner,false,'select public.cinema_post_message($1,$2)',[board,' 感想です ']);
await user(guest,true,'select public.cinema_post_message($1,$2)',[board,'私も見ました']);
assert.equal((await user(owner,false,'select * from public.messages')).rows.length,2);
assert.equal((await user(outsider,false,'select * from public.messages')).rows.length,0);
assert.equal((await db.query('select content from public.messages order by id limit 1')).rows[0].content,'感想です');
await assert.rejects(user(owner,false,'insert into public.messages(board_id,author_id,author_name,content) values($1,$2,$3,$4)',[board,guest,'なりすまし','不可']),/permission denied/);
await db.transaction(async tx=>{await tx.exec('set local role anon');const data=await tx.query('select * from public.cinema_list_boards()');assert.equal(data.rows.length,1);assert.equal(data.rows[0].participant_count,2);assert.equal('content' in data.rows[0],false);});
await db.exec(await readFile(new URL("../migrations/202611010001_movie_boards.sql", import.meta.url), "utf8"));
console.log('Passed: create/retry, owner spoof rejection, capacity/duplicate join, future posting guard, member-only messages, profile ownership, anonymous profile rejection, public summaries, direct write rejection, migration rerun');

} catch(e) { console.error({message:e.message,code:e.code,position:e.position});process.exitCode=1; } finally { await db.close(); }
