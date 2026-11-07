-- ゲストの短い表示番号と、通常アカウントのプロフィール画像保存。
begin;
create table if not exists public.cinema_user_numbers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  number bigint generated always as identity unique not null
);
alter table public.cinema_user_numbers enable row level security;
revoke all on public.cinema_user_numbers from public,anon,authenticated;
grant select on public.cinema_user_numbers to authenticated;
drop policy if exists cinema_own_user_number on public.cinema_user_numbers;
create policy cinema_own_user_number on public.cinema_user_numbers for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.cinema_assign_user_number()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.cinema_user_numbers(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.cinema_assign_user_number() from public,anon,authenticated;
drop trigger if exists cinema_assign_user_number on auth.users;
create trigger cinema_assign_user_number after insert on auth.users for each row execute function public.cinema_assign_user_number();
insert into public.cinema_user_numbers(user_id) select id from auth.users order by created_at,id on conflict(user_id) do nothing;

-- アイコンと背景は公開画像。アップロード・削除は本人のフォルダのみ。
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-images','profile-images',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists cinema_profile_images_guard on storage.objects;
create policy cinema_profile_images_guard on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'profile-images' or ((storage.foldername(name))[1]=auth.uid()::text and coalesce(auth.jwt()->>'is_anonymous','false')='false'))
  with check(bucket_id<>'profile-images' or ((storage.foldername(name))[1]=auth.uid()::text and coalesce(auth.jwt()->>'is_anonymous','false')='false'));
drop policy if exists cinema_profile_images_select on storage.objects;
create policy cinema_profile_images_select on storage.objects for select to authenticated
  using(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text and coalesce(auth.jwt()->>'is_anonymous','false')='false');
drop policy if exists cinema_profile_images_insert on storage.objects;
create policy cinema_profile_images_insert on storage.objects for insert to authenticated
  with check(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text and coalesce(auth.jwt()->>'is_anonymous','false')='false');
drop policy if exists cinema_profile_images_delete on storage.objects;
create policy cinema_profile_images_delete on storage.objects for delete to authenticated
  using(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text and coalesce(auth.jwt()->>'is_anonymous','false')='false');
commit;
