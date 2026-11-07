import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE??'@electric-sql/pglite');const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,is_anonymous boolean default false,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));alter table storage.objects enable row level security;
 grant usage on schema auth,storage,public to anon,authenticated;grant all on storage.objects to anon,authenticated;`);
 const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',guest='33333333-3333-4333-8333-333333333333';
 await db.query('insert into auth.users(id,is_anonymous) values($1,false),($2,false),($3,true)',[owner,other,guest]);
 const sql=await readFile(new URL('../migrations/202611070004_guest_profile_images.sql',import.meta.url),'utf8');await db.exec(sql);
 async function user(id,query,values=[]){return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,is_anonymous:id===guest})]);return tx.query(query,values)});}
 assert.equal((await user(guest,'select * from public.cinema_user_numbers')).rows.length,1);
 assert.equal((await user(owner,'select * from public.cinema_user_numbers')).rows.length,1);
 const before=(await db.query('select * from public.cinema_user_numbers order by number')).rows;await db.exec(sql);assert.deepEqual((await db.query('select * from public.cinema_user_numbers order by number')).rows,before);
 const fresh='44444444-4444-4444-8444-444444444444';await db.query('insert into auth.users(id,is_anonymous) values($1,true)',[fresh]);assert.equal((await db.query('select count(*) n from public.cinema_user_numbers')).rows[0].n,4);
 await user(owner,"insert into storage.objects values('profile-images',$1)",[owner+'/avatar.png']);
 await assert.rejects(user(other,"insert into storage.objects values('profile-images',$1)",[owner+'/cover.png']),/row-level security/);
 await assert.rejects(user(guest,"insert into storage.objects values('profile-images',$1)",[guest+'/avatar.png']),/row-level security/);
 assert.equal((await user(other,'select * from storage.objects')).rows.length,0);
 await user(other,"delete from storage.objects where bucket_id='profile-images'");assert.equal((await db.query('select count(*) n from storage.objects')).rows[0].n,1);
 await user(owner,"delete from storage.objects where bucket_id='profile-images'");assert.equal((await db.query('select count(*) n from storage.objects')).rows[0].n,0);
 // 別の広いポリシーがあっても、このバケットではゲストを許可しない。
 await db.exec('create policy broad_test on storage.objects for all to authenticated using(true) with check(true)');
 await assert.rejects(user(guest,"insert into storage.objects values('profile-images',$1)",[guest+'/bad.png']),/row-level security/);
 console.log('PASS: guest numbers, new guest trigger, stable unique numbers, own folder upload/delete, guest/other denial, restrictive guard, migration rerun');
}finally{await db.close()}
