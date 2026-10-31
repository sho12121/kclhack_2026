-- ハナシネマ: プロフィール・掲示板・参加者・会話。
-- Supabase SQL Editorで実行。既存のプロフィール行は削除しない。
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text not null default ''
);
alter table public.profiles
  add column if not exists nickname text not null default '',
  add column if not exists display_name text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists gender text not null default '',
  add column if not exists birth_date date,
  add column if not exists location text not null default '',
  add column if not exists favorite_genres text not null default '',
  add column if not exists motto text not null default '',
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.profiles enable row level security;
grant usage on schema public to anon, authenticated;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
-- restrictiveにすることで、以前作成した広い許可ポリシーがあっても他人の行を操作させない。
drop policy if exists cinema_profile_owner_guard on public.profiles;
create policy cinema_profile_owner_guard on public.profiles as restrictive
  for all to authenticated
  using (id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false')
  with check (id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
drop policy if exists cinema_profile_owner_access on public.profiles;
create policy cinema_profile_owner_access on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  movie_tmdb_id integer not null check (movie_tmdb_id > 0),
  movie_title text not null check (char_length(movie_title) between 1 and 500),
  movie_poster_url text check (movie_poster_url is null or movie_poster_url ~ '^https://image[.]tmdb[.]org/t/p/w342/[A-Za-z0-9._-]+$'),
  movie_release_date date,
  movie_genres text[] not null default '{}' check (cardinality(movie_genres) <= 20),
  capacity integer check (capacity is null or capacity between 2 and 20),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  author_name text not null check (char_length(author_name) between 1 and 40),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists cinema_boards_starts on public.boards(starts_at, created_at desc);
create index if not exists cinema_members_user on public.board_members(user_id, board_id);
create index if not exists cinema_messages_board on public.messages(board_id, id);
create index if not exists cinema_messages_author on public.messages(author_id, id desc);

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.messages enable row level security;
revoke all on public.boards, public.board_members, public.messages from anon, authenticated;
grant select on public.boards to anon, authenticated;
grant select on public.board_members, public.messages to authenticated;
drop policy if exists cinema_public_board_metadata on public.boards;
create policy cinema_public_board_metadata on public.boards for select to anon, authenticated using (true);
drop policy if exists cinema_own_membership on public.board_members;
create policy cinema_own_membership on public.board_members for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists cinema_member_messages on public.messages;
create policy cinema_member_messages on public.messages for select to authenticated using (
  exists (select 1 from public.board_members m where m.board_id = messages.board_id and m.user_id = (select auth.uid()))
);

-- 公開するのは募集情報と人数のみ。メンバーのID・会話本文は公開しない。
create or replace function public.cinema_list_boards(p_board_id uuid default null)
returns table (id uuid, title text, movie jsonb, capacity integer, starts_at timestamptz,
  created_at timestamptz, participant_count bigint, is_member boolean, is_owner boolean)
language sql stable security definer set search_path = '' as $$
  select b.id, b.title,
    jsonb_build_object('tmdbId', b.movie_tmdb_id, 'title', b.movie_title,
      'posterUrl', b.movie_poster_url, 'releaseDate', b.movie_release_date, 'genres', b.movie_genres),
    b.capacity, b.starts_at, b.created_at,
    (select count(*) from public.board_members m where m.board_id = b.id),
    exists(select 1 from public.board_members m where m.board_id = b.id and m.user_id = auth.uid()),
    b.created_by = auth.uid()
  from public.boards b where p_board_id is null or b.id = p_board_id
  order by b.created_at desc;
$$;

-- 作成と作成者の参加を1トランザクションで行う。request IDで再送を二重作成にしない。
create or replace function public.cinema_create_board(
  p_request_id uuid, p_title text, p_movie_tmdb_id integer, p_movie_title text,
  p_movie_poster_url text, p_movie_release_date date, p_movie_genres text[],
  p_capacity integer, p_starts_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_owner uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_request_id is null then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  select created_by into v_owner from public.boards where id = p_request_id;
  if found then
    if v_owner <> v_user then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
    return p_request_id;
  end if;
  if p_starts_at is null or p_starts_at <= now() then raise exception 'START_IN_PAST' using errcode = 'P0001'; end if;
  insert into public.boards(id, created_by, title, movie_tmdb_id, movie_title,
    movie_poster_url, movie_release_date, movie_genres, capacity, starts_at)
  values(p_request_id, v_user, btrim(p_title), p_movie_tmdb_id, p_movie_title,
    p_movie_poster_url, p_movie_release_date, coalesce(p_movie_genres, '{}'), p_capacity, p_starts_at)
  on conflict (id) do nothing;
  select created_by into v_owner from public.boards where id = p_request_id;
  if v_owner <> v_user then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  insert into public.board_members(board_id, user_id) values(p_request_id, v_user) on conflict do nothing;
  return p_request_id;
end;
$$;

-- 同じ掲示板の参加処理を行ロックで直列化し、同時申込でも定員を超えない。
create or replace function public.cinema_join_board(p_board_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_capacity integer; v_count bigint;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  select capacity into v_capacity from public.boards where id = p_board_id for update;
  if not found then raise exception 'BOARD_NOT_FOUND' using errcode = 'P0001'; end if;
  if exists(select 1 from public.board_members where board_id = p_board_id and user_id = v_user) then return; end if;
  select count(*) into v_count from public.board_members where board_id = p_board_id;
  if v_capacity is not null and v_count >= v_capacity then raise exception 'BOARD_FULL' using errcode = 'P0001'; end if;
  insert into public.board_members(board_id, user_id) values(p_board_id, v_user);
end;
$$;

create or replace function public.cinema_post_message(p_board_id uuid, p_content text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_starts_at timestamptz; v_name text; v_id bigint;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  select starts_at into v_starts_at from public.boards where id = p_board_id;
  if not found then raise exception 'BOARD_NOT_FOUND' using errcode = 'P0001'; end if;
  if not exists(select 1 from public.board_members where board_id = p_board_id and user_id = v_user) then
    raise exception 'NOT_A_MEMBER' using errcode = 'P0001';
  end if;
  if now() < v_starts_at then raise exception 'NOT_STARTED' using errcode = 'P0001'; end if;
  if p_content is null or char_length(btrim(p_content)) not between 1 and 2000 then
    raise exception 'INVALID_MESSAGE' using errcode = 'P0001';
  end if;
  select coalesce(nullif(btrim(nickname), ''), nullif(btrim(display_name), '')) into v_name from public.profiles where id = v_user;
  if coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    v_name := 'ゲスト-' || left(v_user::text, 4);
  else
    v_name := coalesce(v_name, 'ユーザー-' || left(v_user::text, 4));
  end if;
  insert into public.messages(board_id, author_id, author_name, content)
    values(p_board_id, v_user, left(v_name, 40), btrim(p_content)) returning id into v_id;
  return v_id::text;
end;
$$;

revoke all on function public.cinema_list_boards(uuid) from public;
revoke all on function public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz) from public;
revoke all on function public.cinema_join_board(uuid) from public;
revoke all on function public.cinema_post_message(uuid,text) from public;
grant execute on function public.cinema_list_boards(uuid) to anon, authenticated;
grant execute on function public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz) to authenticated;
grant execute on function public.cinema_join_board(uuid) to authenticated;
grant execute on function public.cinema_post_message(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;
