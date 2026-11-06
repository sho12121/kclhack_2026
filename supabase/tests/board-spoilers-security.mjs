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
 for(const file of ['202611010001_movie_boards.sql','202611060001_social_features.sql','202611060004_favorites_invitations.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',g='33333333-3333-4333-8333-333333333333';
 const old='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',on='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',off='cccccccc-cccc-4ccc-8ccc-cccccccccccc',guestBoard='dddddddd-dddd-4ddd-8ddd-dddddddddddd',invited='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
 await db.query('insert into auth.users(id,is_anonymous) values($1,false),($2,false),($3,true)',[a,b,g]);
 async function user(id,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:id===g})]);return tx.query(sql,params)});}
 await user(a,`select public.cinema_create_board($1,'既存',372058,'映画',null,null,'{}',4,now()+interval '1 day',true)`,[old]);
 const migration=await readFile(new URL('../migrations/202611070001_board_spoilers.sql',import.meta.url),'utf8');await db.exec(migration);
 const create=`select public.cinema_create_board_options($1,'注意あり',372058,'映画',null,null,'{}',4,now()+interval '1 day',true,$2::uuid[],$3)`;
 await user(a,create,[on,[],true]);await user(a,create,[off,[],false]);await user(g,create,[guestBoard,[],true]);
 await user(a,'select public.cinema_set_follow($1,true)',[b]);await user(a,create,[invited,[b],true]);
 await user(a,create,[on,[],false]); // 再送で最初の設定を変更しない。
 await assert.rejects(user(b,create,[on,[],false]),/FORBIDDEN/);
 await assert.rejects(user(a,create,['ffffffff-ffff-4fff-8fff-ffffffffffff',[],null]),/INVALID_INPUT/);
 const listed=(await user(a,'select public.cinema_list_boards_with_labels() boards')).rows[0].boards;
 assert.equal(listed.find(x=>x.id===old).has_spoilers,false);assert.equal(listed.find(x=>x.id===on).has_spoilers,true);assert.equal(listed.find(x=>x.id===off).has_spoilers,false);assert.equal(listed.find(x=>x.id===guestBoard).has_spoilers,true);assert.equal(listed.find(x=>x.id===invited).has_spoilers,true);
 assert.equal((await db.query('select count(*) n from public.board_invitations where board_id=$1',[invited])).rows[0].n,1);
 await db.exec(migration);assert.equal((await db.query('select has_spoilers from public.boards where id=$1',[on])).rows[0].has_spoilers,true);
 const publicList=await db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select public.cinema_list_boards_with_labels() boards')});assert.equal(publicList.rows[0].boards.length,5);
 console.log('PASS spoilers: legacy default off, on/off persistence, guest, invitations, retry preservation, owner guard, null rejection, public label, rerun');
} finally {await db.close();}
