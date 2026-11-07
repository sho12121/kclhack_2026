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
 for(const file of ['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060004_favorites_invitations.sql','202611070001_board_spoilers.sql','202611070002_immediate_start.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',g='33333333-3333-4333-8333-333333333333';
 const immediate='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',scheduled='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',guestRoom='cccccccc-cccc-4ccc-8ccc-cccccccccccc',invited='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 await db.query('insert into auth.users(id,is_anonymous) values($1,false),($2,false),($3,true)',[a,b,g]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:id===g})]);return tx.query(sql,params)});}
 const create=`select public.cinema_create_board_options($1,'今からテスト',372058,'映画',null,null,'{}',4,$2::timestamptz,true,$3::uuid[],true,$4)`;
 await user(a,create,[immediate,null,[],true]);
 assert.equal((await db.query('select starts_at<=now() started,has_spoilers from public.boards where id=$1',[immediate])).rows[0].started,true);
 await user(a,'select public.cinema_post_message($1,$2)',[immediate,'すぐ投稿できる']);
 const first=(await db.query('select starts_at from public.boards where id=$1',[immediate])).rows[0].starts_at;
 await user(a,create,[immediate,null,[],true]);assert.deepEqual((await db.query('select starts_at from public.boards where id=$1',[immediate])).rows[0].starts_at,first);
 await assert.rejects(user(b,create,[immediate,null,[],true]),/FORBIDDEN/);
 await assert.rejects(user(a,create,[scheduled,'2000-01-01T00:00:00Z',[],false]),/START_IN_PAST/);
 await user(a,create,[scheduled,'2099-01-01T00:00:00Z',[],false]);await assert.rejects(user(a,'select public.cinema_post_message($1,$2)',[scheduled,'まだ開始前']),/NOT_STARTED/);
 await user(g,create,[guestRoom,null,[],true]);await user(g,'select public.cinema_post_message($1,$2)',[guestRoom,'ゲストもすぐ投稿']);
 await user(a,'select public.cinema_set_follow($1,true)',[b]);await user(a,create,[invited,null,[b],true]);assert.equal((await db.query('select count(*) n from public.board_invitations where board_id=$1',[invited])).rows[0].n,1);
 await db.exec(await readFile(new URL('../migrations/202611070002_immediate_start.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select count(*) n from public.boards')).rows[0].n,4);
 console.log('PASS immediate start: no date required, DB start time, immediate posting, future-date validation, guest/invite support, retry preservation, owner guard, rerun');
} finally {await db.close();}
