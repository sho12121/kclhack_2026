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
 for(const file of ['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060002_board_moderation.sql','202611060004_favorites_invitations.sql','202611060005_message_replies.sql','202611060006_reply_previews.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
 const board='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 for(const id of [a,b,c])await db.query('insert into auth.users(id) values($1)',[id]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:false})]);return tx.query(sql,params)});}
 for(const room of [board,other])await user(a,`select public.cinema_create_board($1,'引用テスト',372058,'君の名は。',null,null,'{}',null,now()+interval '1 day',true)`,[room]);
 await user(b,'select public.cinema_join_board($1)',[board]);await db.exec("update public.boards set starts_at=now()-interval '1 day'");
 async function post(id,text,reply=null){return (await user(id,'select public.cinema_post_message($1,$2,$3) id',[board,text,reply])).rows[0].id;}
 const parent=await post(a,'返信される元の本文');
 for(let i=0;i<65;i++)await post(a,`通常コメント${i}`);
 const reply=await post(b,'通知に表示される返信本文',parent);
 const inbox=(await user(a,'select public.cinema_notifications() inbox')).rows[0].inbox;
 assert.equal(inbox.items.length,1);assert.equal(inbox.items[0].messagePreview,'通知に表示される返信本文');assert.equal(inbox.items[0].messageId,reply);
 assert.equal((await user(c,'select public.cinema_notifications() inbox')).rows[0].inbox.items.length,0);
 const latest=(await user(a,'select public.cinema_get_messages($1) snapshot',[board])).rows[0].snapshot;
 assert.equal(latest.messages.find(m=>m.id===reply).replyToContent,'返信される元の本文');assert.ok(!latest.messages.some(m=>m.id===parent));
 const context=(await user(a,'select public.cinema_get_message_context($1,$2) snapshot',[board,parent])).rows[0].snapshot;
 assert.ok(context.messages.some(m=>m.id===parent));
 await assert.rejects(user(c,'select public.cinema_get_message_context($1,$2)',[board,parent]),/NOT_A_MEMBER/);
 await assert.rejects(user(a,'select public.cinema_get_message_context($1,$2)',[other,parent]),/MESSAGE_NOT_FOUND/);
 await user(a,'select public.cinema_delete_message($1)',[parent]);
 const deleted=(await user(b,'select public.cinema_get_messages($1,null,null,$2) snapshot',[board,latest.messages[0].id])).rows[0].snapshot;
 assert.ok(deleted.deletedIds.includes(parent));assert.equal(deleted.messages.find(m=>m.id===reply).replyToContent,'削除されたコメントです。');
 // 通知受信者が退出した後に本文を返さない。
 await db.query('delete from public.board_members where board_id=$1 and user_id=$2',[board,a]);
 const hidden=(await user(a,'select public.cinema_notifications() inbox')).rows[0].inbox;
 assert.equal(hidden.items[0].messagePreview,null);assert.equal(hidden.items[0].messageId,null);
 await db.exec(await readFile(new URL('../migrations/202611060006_reply_previews.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select count(*) n from public.messages')).rows[0].n,67);
 console.log('PASS previews: recipient-only body, quote text, old-message context, membership/cross-board guards, deleted quote sync outside visible range, revoked-member privacy, migration rerun');
} finally {await db.close();}
