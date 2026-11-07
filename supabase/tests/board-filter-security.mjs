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
 for(const file of ['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060002_board_moderation.sql','202611060004_favorites_invitations.sql','202611060005_message_replies.sql','202611060006_reply_previews.sql','202611070001_board_spoilers.sql','202611070003_board_filter.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',g='33333333-3333-4333-8333-333333333333';
 const board='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',guestBoard='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 await db.query('insert into auth.users(id,is_anonymous) values($1,false),($2,false),($3,true)',[a,b,g]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:id===g})]);return tx.query(sql,params)});}
 for(const [owner,room] of [[a,board],[g,guestBoard]])await user(owner,`select public.cinema_create_board($1,'フィルタテスト',372058,'映画',null,null,'{}',4,now()+interval '1 day',true)`,[room]);
 await user(b,'select public.cinema_join_board($1)',[board]);await db.exec("update public.boards set starts_at=now()-interval '1 day'");
 const first=(await user(a,'select public.cinema_post_message_result($1,$2,null) snapshot',[board,'原文：お前は無能'])).rows[0].snapshot;
 assert.equal(first.filterEnabled,false);assert.equal(first.filterVersion,'0');assert.equal(first.messages.length,1);assert.equal(first.messages[0].content,'原文：お前は無能');
 await assert.rejects(user(b,'select public.cinema_set_board_filter($1,true)',[board]),/FORBIDDEN/);
 await user(a,'select public.cinema_set_board_filter($1,true)',[board]);await user(a,'select public.cinema_set_board_filter($1,true)',[board]);
 const reply=(await user(b,'select public.cinema_post_message_result($1,$2,$3) snapshot',[board,'返信：ＦＵＣＫ',first.postedId])).rows[0].snapshot;
 assert.equal(reply.filterEnabled,true);assert.equal(reply.filterVersion,'1');assert.equal(reply.messages[0].replyToContent,'原文：お前は無能');assert.equal(reply.messages.length,1);
 const inbox=(await user(a,'select public.cinema_notifications() inbox')).rows[0].inbox;assert.equal(inbox.items[0].filterEnabled,true);
 const delta=(await user(b,'select public.cinema_get_messages($1,$2,null,$2) snapshot',[board,reply.postedId])).rows[0].snapshot;assert.equal(delta.filterEnabled,true);assert.equal(delta.filterVersion,'1');assert.equal(delta.messages.length,0);
 await user(a,'select public.cinema_set_board_filter($1,false)',[board]);const off=(await user(b,'select public.cinema_get_messages($1) snapshot',[board])).rows[0].snapshot;assert.equal(off.filterVersion,'2');assert.equal(off.messages[0].content,'原文：お前は無能');
 await user(g,'select public.cinema_set_board_filter($1,true)',[guestBoard]);
 await assert.rejects(user(b,'update public.boards set filter_enabled=true where id=$1',[board]),/permission denied/);
 await db.exec(await readFile(new URL('../migrations/202611070003_board_filter.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select count(*) n from public.messages')).rows[0].n,2);
 console.log('PASS filter DB: owner-only toggle, guest-owner support, persistent setting/version, idempotent switch, post/quote/notification metadata, delta detects changes, originals retained, direct update denied, rerun');
} finally {await db.close();}
