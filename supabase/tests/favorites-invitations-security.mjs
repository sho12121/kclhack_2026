// 実Supabaseへ接続せずPostgreSQLで権限とトランザクションを検証する。
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db=new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid(),auth.jwt() to anon,authenticated;`);
 const migrationFiles=['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060004_favorites_invitations.sql'];
 for(const file of migrationFiles)await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const owner='11111111-1111-4111-8111-111111111111',friend='22222222-2222-4222-8222-222222222222',stranger='33333333-3333-4333-8333-333333333333',guest='44444444-4444-4444-8444-444444444444';
 const board='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',invalid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 await db.query('insert into auth.users(id,is_anonymous) values($1,false),($2,false),($3,false),($4,true)',[owner,friend,stranger,guest]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:id===guest})]);return tx.query(sql,params)});}
 await user(owner,'select public.cinema_set_follow($1,true)',[friend]);
 const create=`select public.cinema_create_board_with_invites($1,'招待テスト',372058,'君の名は。',null,null,'{}',2,now()+interval '1 day',false,$2::uuid[])`;
 await assert.rejects(user(owner,create,[invalid,[friend,stranger]]),/INVITEE_NOT_FOLLOWED/);
 assert.equal((await db.query('select count(*) n from public.boards where id=$1',[invalid])).rows[0].n,0);
 await assert.rejects(user(guest,create,[invalid,[]]),/ACCOUNT_REQUIRED/);
 await user(owner,create,[board,[friend,friend]]);
 await user(owner,create,[board,[friend]]); // 通信再送でも招待・通知は1件。
 assert.equal((await db.query('select count(*) n from public.board_invitations')).rows[0].n,1);
 assert.equal((await db.query("select count(*) n from public.notifications where kind='board_invitation'")).rows[0].n,1);
 assert.equal((await db.query('select count(*) n from public.board_members where board_id=$1',[board])).rows[0].n,1); // 自動参加させない。
 const inbox=(await user(friend,'select public.cinema_notifications() inbox')).rows[0].inbox;
 assert.ok(inbox.items.some(item=>item.kind==='board_invitation' && item.boardId===board));
 assert.equal((await user(stranger,'select * from public.board_invitations')).rows.length,0);
 await assert.rejects(user(stranger,'insert into public.board_invitations(board_id,user_id,invited_by) values($1,$2,$3)',[board,friend,stranger]),/permission denied/);
 await user(friend,'select public.cinema_set_board_favorite($1,true)',[board]);
 await user(friend,'select public.cinema_set_board_favorite($1,true)',[board]);
 assert.equal((await user(friend,'select * from public.board_favorites')).rows.length,1);
 assert.equal((await user(owner,'select * from public.board_favorites')).rows.length,0);
 await assert.rejects(user(guest,'select public.cinema_set_board_favorite($1,true)',[board]),/ACCOUNT_REQUIRED/);
 await assert.rejects(user(friend,'insert into public.board_favorites(user_id,board_id) values($1,$2)',[owner,board]),/permission denied/);
 await user(friend,'select public.cinema_set_board_favorite($1,false)',[board]);
 assert.equal((await user(friend,'select * from public.board_favorites')).rows.length,0);
 await user(friend,'select public.cinema_set_board_favorite($1,true)',[board]);
 await user(owner,'select public.cinema_delete_board($1)',[board]);
 assert.equal((await db.query('select count(*) n from public.board_favorites')).rows[0].n,0);
 assert.equal((await db.query('select count(*) n from public.board_invitations')).rows[0].n,0);
 await assert.rejects(user(friend,'select public.cinema_set_board_favorite($1,true)',[board]),/BOARD_NOT_FOUND/);
 await db.exec(await readFile(new URL('../migrations/202611060004_favorites_invitations.sql',import.meta.url),'utf8'));
 console.log('PASS: favorites, private RLS, invite target validation, atomic rollback, retry deduplication, notifications, no auto-join, guest restriction, cascades, migration rerun');
} finally {await db.close();}
