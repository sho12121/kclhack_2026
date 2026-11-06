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
 for(const file of ['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060002_board_moderation.sql','202611060004_favorites_invitations.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',outsider='44444444-4444-4444-8444-444444444444';
 const board='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 for(const id of [a,b,c,outsider])await db.query('insert into auth.users(id) values($1)',[id]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:false})]);return tx.query(sql,params)});}
 for(const room of [board,other])await user(a,`select public.cinema_create_board($1,'返信テスト',372058,'君の名は。',null,null,'{}',null,now()+interval '1 day',true)`,[room]);
 for(const id of [b,c])await user(id,'select public.cinema_join_board($1)',[board]);
 await db.exec("update public.boards set starts_at=now()-interval '1 day'");
 const legacy=(await user(a,'select public.cinema_post_message($1,$2) id',[board,'既存コメント'])).rows[0].id;
 assert.equal((await db.query("select count(*) n from public.notifications where kind='board_reply'")).rows[0].n,2);
 const migration=await readFile(new URL('../migrations/202611060005_message_replies.sql',import.meta.url),'utf8');await db.exec(migration);
 assert.equal((await db.query("select count(*) n from public.notifications where kind='board_reply'")).rows[0].n,0);
 async function post(id,room,text,reply=null){return (await user(id,'select public.cinema_post_message($1,$2,$3) id',[room,text,reply])).rows[0].id;}
 await post(b,board,'通常投稿');
 assert.equal((await db.query("select count(*) n from public.notifications")).rows[0].n,0);
 const reply=await post(b,board,'元コメントへの返信',legacy);
 const notifications=(await db.query("select user_id,kind from public.notifications")).rows;
 assert.deepEqual(notifications,[{user_id:a,kind:'comment_reply'}]);
 await post(a,board,'自分への返信',legacy);
 assert.equal((await db.query('select count(*) n from public.notifications')).rows[0].n,1);
 await assert.rejects(post(outsider,board,'侵入',legacy),/NOT_A_MEMBER/);
 await assert.rejects(post(a,other,'別の板',legacy),/REPLY_TARGET_NOT_FOUND/);
 await assert.rejects(post(a,board,'不存在','9223372036854775807'),/REPLY_TARGET_NOT_FOUND/);
 const snapshot=(await user(c,'select public.cinema_get_messages($1) snapshot',[board])).rows[0].snapshot;
 assert.equal(snapshot.messages.find(m=>m.id===reply).replyToId,legacy);
 await user(a,'select public.cinema_delete_message($1)',[legacy]);
 await assert.rejects(post(b,board,'削除済みへの返信',legacy),/REPLY_TARGET_NOT_FOUND/);
 await db.exec(migration); // 実際の返信通知は再実行しても維持。
 assert.equal((await db.query("select count(*) n from public.notifications where kind='comment_reply'")).rows[0].n,1);
 await user(b,'select public.cinema_delete_message($1)',[reply]);
 assert.equal((await db.query('select count(*) n from public.notifications')).rows[0].n,0);
 await user(a,'select public.cinema_delete_board($1)',[board]);
 assert.equal((await db.query('select count(*) n from public.messages where board_id=$1',[board])).rows[0].n,0);
 console.log('PASS replies: legacy preservation, broadcast removal, recipient-only notice, no self-notice, membership, cross-board/deleted target rejection, snapshot, cascade, migration rerun');
} finally {await db.close();}
