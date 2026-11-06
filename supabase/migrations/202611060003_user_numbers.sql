-- 初期表示名用の短い番号。既存プロフィール・会話は変更しない。
begin;
create table if not exists public.cinema_user_numbers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  number bigint generated always as identity unique not null
);
alter table public.cinema_user_numbers enable row level security;
revoke all on public.cinema_user_numbers from public, anon, authenticated;
grant select on public.cinema_user_numbers to authenticated;
drop policy if exists cinema_own_user_number on public.cinema_user_numbers;
create policy cinema_own_user_number on public.cinema_user_numbers for select to authenticated
  using (user_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');

create or replace function public.cinema_assign_user_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(new.is_anonymous, false) then
    insert into public.cinema_user_numbers(user_id) values(new.id) on conflict(user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.cinema_assign_user_number() from public, anon, authenticated;
drop trigger if exists cinema_assign_user_number on auth.users;
create trigger cinema_assign_user_number after insert or update of is_anonymous on auth.users
  for each row execute function public.cinema_assign_user_number();

insert into public.cinema_user_numbers(user_id)
  select id from auth.users where not coalesce(is_anonymous,false)
  order by created_at, id on conflict(user_id) do nothing;
commit;
