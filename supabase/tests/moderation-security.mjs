// 掲示板管理者の削除権限を、実Supabaseに接続せずPostgreSQLで確認する。
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
 const migrationFiles=['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060002_board_moderation.sql'];
 for(const file of migrationFiles)await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',otherOwner='33333333-3333-4333-8333-333333333333',guest='44444444-4444-4444-8444-444444444444';
 const board='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',otherBoard='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',guestBoard='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await db.query('insert into auth.users(id,is_anonymous) values($1,false),($2,false),($3,false),($4,true)',[owner,member,otherOwner,guest]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:id===guest})]);return tx.query(sql,params)});}
 const create=`select public.cinema_create_board($1,'削除権限テスト',372058,'君の名は。',null,null,'{}',null,now()+interval '1 day',true)`;
 for(const [id,room] of [[owner,board],[otherOwner,otherBoard],[guest,guestBoard]])await user(id,create,[room]);
 for(const [id,room] of [[member,board],[otherOwner,board],[guest,board],[owner,otherBoard],[member,guestBoard]])await user(id,'select public.cinema_join_board($1)',[room]);
 await db.exec("update public.boards set starts_at=now()-interval '1 day'");
 async function post(id,room,content){return (await user(id,'select public.cinema_post_message($1,$2) id',[room,content])).rows[0].id;}
 const own=await post(owner,board,'管理者自身のコメント');
 const regular=await post(member,board,'参加者のコメント');
 const guestPost=await post(guest,board,'ゲストのコメント');
 const foreignPost=await post(otherOwner,otherBoard,'別の掲示板のコメント');
 const ownMemberPost=await post(member,board,'本人が削除するコメント');
 const guestOwnerTarget=await post(member,guestBoard,'ゲスト作成者が管理するコメント');
 await assert.rejects(user(member,'select public.cinema_delete_message($1)',[own]),/FORBIDDEN/);
 await assert.rejects(user(otherOwner,'select public.cinema_delete_message($1)',[regular]),/FORBIDDEN/);
 await assert.rejects(user(owner,'select public.cinema_delete_message($1)',[foreignPost]),/FORBIDDEN/);
 await assert.rejects(user(guest,'select public.cinema_delete_message($1)',[regular]),/FORBIDDEN/);
 await user(owner,'select public.cinema_delete_message($1)',[regular]);
 await user(owner,'select public.cinema_delete_message($1)',[guestPost]);
 await user(owner,'select public.cinema_delete_message($1)',[own]);
 await user(member,'select public.cinema_delete_message($1)',[ownMemberPost]);
 await user(guest,'select public.cinema_delete_message($1)',[guestOwnerTarget]);
 for(const id of [regular,guestPost,own,ownMemberPost,guestOwnerTarget]) {
  const saved=(await db.query('select content,deleted_at from public.messages where id=$1',[id])).rows[0];
  assert.equal(saved.content,'削除されたコメントです。');assert.ok(saved.deleted_at);
  assert.equal((await db.query('select count(*) n from public.notifications where message_id=$1',[id])).rows[0].n,0);
 }
 assert.equal((await db.query('select content from public.messages where id=$1',[foreignPost])).rows[0].content,'別の掲示板のコメント');
 const changes=(await user(member,'select public.cinema_get_messages($1,$2,null,$3) snapshot',[board,guestPost,own])).rows[0].snapshot;
 assert.ok(changes.deletedIds.includes(regular));assert.ok(changes.deletedIds.includes(guestPost));
 await user(owner,'select public.cinema_delete_message($1)',[regular]);
 await assert.rejects(user(owner,'select public.cinema_delete_message(9223372036854775807)'),/MESSAGE_NOT_FOUND/);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select public.cinema_delete_message($1)',[foreignPost]);}),/permission denied/);
 await assert.rejects(user(owner,'delete from public.messages where id=$1',[foreignPost]),/permission denied/);
 await db.exec(await readFile(new URL('../migrations/202611060002_board_moderation.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select count(*) n from public.messages')).rows[0].n,6);
 console.log('Passed: board owner moderates members/guests, author self-deletion, ordinary member/other-board owner/guest denied, guest board owner allowed, deleted content removed, notifications cleared, deletion synchronization, repeat-safe migration, direct/unauthenticated deletion denied');
} catch(error){console.error({message:error.message,code:error.code,stack:error.stack});process.exitCode=1;}finally{await db.close();}
