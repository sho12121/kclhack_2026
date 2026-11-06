-- 先に202611010001_movie_boards.sqlを実行済みのプロジェクトへ追加する。
-- 既存データを維持し、ゲスト設定・フォロー・通知・本人による削除を追加する。
begin;
alter table public.boards add column if not exists allow_guests boolean not null default true;
alter table public.messages add column if not exists deleted_at timestamptz;
drop policy if exists cinema_guest_message_guard on public.messages;
create policy cinema_guest_message_guard on public.messages as restrictive for select to authenticated using (
  coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true'
  or exists(select 1 from public.boards b where b.id=messages.board_id and b.allow_guests)
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id), check(follower_id <> following_id)
);
create index if not exists cinema_follows_target on public.follows(following_id, follower_id);
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check(kind in ('follow','board_created','board_reply','board_deleted')),
  board_id uuid references public.boards(id) on delete set null,
  message_id bigint references public.messages(id) on delete cascade,
  board_title text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists cinema_notifications_inbox on public.notifications(user_id, id desc);
create index if not exists cinema_notifications_unread on public.notifications(user_id) where read_at is null;
create index if not exists cinema_notifications_message on public.notifications(message_id);
create index if not exists cinema_notifications_board on public.notifications(board_id);
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
revoke all on public.follows, public.notifications from public, anon, authenticated;
grant select on public.follows, public.notifications to authenticated;
drop policy if exists cinema_follows_read on public.follows;
create policy cinema_follows_read on public.follows for select to authenticated using (true);
drop policy if exists cinema_notifications_owner on public.notifications;
create policy cinema_notifications_owner on public.notifications for select to authenticated using(user_id = (select auth.uid()));

-- 公開プロフィールはこの関数の項目だけ。生年月日・性別・居住地は返さない。
create or replace function public.cinema_public_profile(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',u.id,
    'nickname',left(coalesce(nullif(btrim(p.nickname),''),nullif(btrim(p.display_name),''),nullif(u.raw_user_meta_data->>'display_name',''),'ユーザー-'||left(u.id::text,4)),40),
    'bio',coalesce(p.bio,''),'favoriteGenres',coalesce(p.favorite_genres,''),'motto',coalesce(p.motto,''),
    'followCount',(select count(*) from public.follows f where f.follower_id=u.id),
    'followerCount',(select count(*) from public.follows f where f.following_id=u.id),
    'isFollowing',exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=u.id))
  from auth.users u left join public.profiles p on p.id=u.id
  where u.id=p_user_id and not coalesce(u.is_anonymous,false) and auth.uid() is not null;
$$;
create or replace function public.cinema_find_profiles(p_query text default '',p_owner uuid default null,p_relation text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(q.profile order by q.name,q.id),'[]'::jsonb) from (
    select u.id,public.cinema_public_profile(u.id) profile,
      coalesce(nullif(p.nickname,''),nullif(p.display_name,''),'ユーザー-'||left(u.id::text,4)) name
    from auth.users u left join public.profiles p on p.id=u.id
    where auth.uid() is not null and not coalesce(u.is_anonymous,false)
      and (coalesce(p_query,'')='' or position(lower(left(p_query,80)) in lower(coalesce(p.nickname,'')||' '||coalesce(p.display_name,'')||' '||coalesce(u.raw_user_meta_data->>'display_name','')))>0)
      and (p_relation is null or (p_relation='following' and exists(select 1 from public.follows f where f.follower_id=p_owner and f.following_id=u.id))
        or (p_relation='followers' and exists(select 1 from public.follows f where f.following_id=p_owner and f.follower_id=u.id)))
    order by name,u.id limit 50
  ) q;
$$;
create or replace function public.cinema_set_follow(p_user_id uuid,p_follow boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  if coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'ACCOUNT_REQUIRED' using errcode='P0001'; end if;
  if p_follow is null or p_user_id=v_user then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if not exists(select 1 from auth.users where id=p_user_id and not coalesce(is_anonymous,false)) then raise exception 'USER_NOT_FOUND' using errcode='P0001'; end if;
  if p_follow then insert into public.follows(follower_id,following_id) values(v_user,p_user_id) on conflict do nothing;
  else delete from public.follows where follower_id=v_user and following_id=p_user_id; end if;
end;
$$;

create or replace function public.cinema_social_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='follows' then
    insert into public.notifications(user_id,actor_id,kind) values(new.following_id,new.follower_id,'follow');
  elsif tg_table_name='boards' and tg_op='INSERT' then
    insert into public.notifications(user_id,actor_id,kind,board_id,board_title)
      select f.follower_id,new.created_by,'board_created',new.id,new.title from public.follows f
      where f.following_id=new.created_by and f.follower_id<>new.created_by;
  elsif tg_table_name='boards' and tg_op='DELETE' then
    insert into public.notifications(user_id,actor_id,kind,board_title)
      select m.user_id,old.created_by,'board_deleted',old.title from public.board_members m
      where m.board_id=old.id and m.user_id<>old.created_by;
    return old;
  elsif tg_table_name='messages' then
    insert into public.notifications(user_id,actor_id,kind,board_id,message_id,board_title)
      select m.user_id,new.author_id,'board_reply',new.board_id,new.id,b.title
      from public.board_members m join public.boards b on b.id=m.board_id
      where m.board_id=new.board_id and m.user_id<>new.author_id;
  end if;
  return new;
end;
$$;
drop trigger if exists cinema_follow_notification on public.follows;
create trigger cinema_follow_notification after insert on public.follows for each row execute function public.cinema_social_notifications();
drop trigger if exists cinema_board_notification on public.boards;
create trigger cinema_board_notification after insert on public.boards for each row execute function public.cinema_social_notifications();
drop trigger if exists cinema_board_deleted_notification on public.boards;
create trigger cinema_board_deleted_notification before delete on public.boards for each row execute function public.cinema_social_notifications();
drop trigger if exists cinema_message_notification on public.messages;
create trigger cinema_message_notification after insert on public.messages for each row execute function public.cinema_social_notifications();

-- 参加・投稿は画面を経由しない呼び出しでもゲスト設定を確認する。
create or replace function public.cinema_join_board(p_board_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_capacity integer; v_count bigint; v_allow boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select capacity,allow_guests into v_capacity,v_allow from public.boards where id=p_board_id for update;
  if not found then raise exception 'BOARD_NOT_FOUND' using errcode='P0001'; end if;
  if not v_allow and coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'GUEST_NOT_ALLOWED' using errcode='P0001'; end if;
  if exists(select 1 from public.board_members where board_id=p_board_id and user_id=v_user) then return; end if;
  select count(*) into v_count from public.board_members where board_id=p_board_id;
  if v_capacity is not null and v_count>=v_capacity then raise exception 'BOARD_FULL' using errcode='P0001'; end if;
  insert into public.board_members(board_id,user_id) values(p_board_id,v_user);
end;
$$;

create or replace function public.cinema_delete_message(p_message_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_author uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select author_id into v_author from public.messages where id=p_message_id for update;
  if not found then raise exception 'MESSAGE_NOT_FOUND' using errcode='P0001'; end if;
  if v_author<>auth.uid() then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.messages set content='削除されたコメントです。',deleted_at=coalesce(deleted_at,now()) where id=p_message_id;
  delete from public.notifications where message_id=p_message_id;
end;
$$;
create or replace function public.cinema_delete_board(p_board_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select created_by into v_owner from public.boards where id=p_board_id for update;
  if not found then raise exception 'BOARD_NOT_FOUND' using errcode='P0001'; end if;
  if v_owner<>auth.uid() then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  delete from public.boards where id=p_board_id;
end;
$$;

-- 新規投稿と、表示中の過去のコメントの削除を1回の通信で取得する。
create or replace function public.cinema_get_messages(p_board_id uuid,p_after bigint default null,p_before bigint default null,p_visible_after bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_allow boolean; v_messages jsonb; v_deleted jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  if (p_after is not null and p_before is not null) or coalesce(p_after,0)<0 or coalesce(p_before,0)<0 or coalesce(p_visible_after,0)<0 then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select allow_guests into v_allow from public.boards where id=p_board_id;
  if not found then raise exception 'BOARD_NOT_FOUND' using errcode='P0001'; end if;
  if not v_allow and coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'GUEST_NOT_ALLOWED' using errcode='P0001'; end if;
  if not exists(select 1 from public.board_members where board_id=p_board_id and user_id=auth.uid()) then raise exception 'NOT_A_MEMBER' using errcode='P0001'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id::text,'boardId',m.board_id,'authorId',m.author_id,
    'authorName',m.author_name,'content',m.content,'createdAt',m.created_at,'deletedAt',m.deleted_at,
    'authorIsGuest',coalesce(u.is_anonymous,false)) order by m.id),'[]'::jsonb) into v_messages
  from (select * from public.messages where board_id=p_board_id and (p_after is null or id>p_after) and (p_before is null or id<p_before)
    order by case when p_after is not null then id end asc,case when p_after is null then id end desc limit 50) m
    join auth.users u on u.id=m.author_id;
  select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb) into v_deleted from public.messages
    where board_id=p_board_id and deleted_at is not null and p_visible_after is not null and id>=p_visible_after;
  return jsonb_build_object('messages',v_messages,'deletedIds',v_deleted);
end;
$$;

create or replace function public.cinema_read_notifications(p_ids bigint[] default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null and (p_ids is null or id=any(p_ids));
end;
$$;
create or replace function public.cinema_notifications(p_before bigint default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('unreadCount',(select count(*) from public.notifications where user_id=auth.uid() and read_at is null),
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',q.id::text,'kind',q.kind,'boardId',q.board_id,'boardTitle',q.board_title,
      'actorId',case when not coalesce(u.is_anonymous,false) then q.actor_id else null end,
      'actorName',case when coalesce(u.is_anonymous,false) then 'ゲスト' else coalesce(nullif(p.nickname,''),nullif(p.display_name,''),'ユーザー') end,
      'createdAt',q.created_at,'readAt',q.read_at) order by q.id desc)
      from (select * from public.notifications where user_id=auth.uid() and (p_before is null or id<p_before) order by id desc limit 30) q
      left join auth.users u on u.id=q.actor_id left join public.profiles p on p.id=q.actor_id),'[]'::jsonb));
$$;

-- 旧シグネチャの公開関数を差し替える。テーブルや保存済みデータは削除しない。
drop function if exists public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz);
create or replace function public.cinema_create_board(
  p_request_id uuid, p_title text, p_movie_tmdb_id integer, p_movie_title text,
  p_movie_poster_url text, p_movie_release_date date, p_movie_genres text[],
  p_capacity integer, p_starts_at timestamptz, p_allow_guests boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_owner uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_allow_guests is null then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if not p_allow_guests and coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'GUEST_NOT_ALLOWED' using errcode='P0001'; end if;
  if p_request_id is null then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  select created_by into v_owner from public.boards where id = p_request_id;
  if found then
    if v_owner <> v_user then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
    return p_request_id;
  end if;
  if p_starts_at is null or p_starts_at <= now() then raise exception 'START_IN_PAST' using errcode = 'P0001'; end if;
  insert into public.boards(id, created_by, title, movie_tmdb_id, movie_title,
    movie_poster_url, movie_release_date, movie_genres, capacity, starts_at, allow_guests)
  values(p_request_id, v_user, btrim(p_title), p_movie_tmdb_id, p_movie_title,
    p_movie_poster_url, p_movie_release_date, coalesce(p_movie_genres, '{}'), p_capacity, p_starts_at, p_allow_guests)
  on conflict (id) do nothing;
  select created_by into v_owner from public.boards where id = p_request_id;
  if v_owner <> v_user then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  insert into public.board_members(board_id, user_id) values(p_request_id, v_user) on conflict do nothing;
  return p_request_id;
end;
$$;

create or replace function public.cinema_post_message(p_board_id uuid, p_content text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_starts_at timestamptz; v_name text; v_id bigint; v_allow boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  select starts_at,allow_guests into v_starts_at,v_allow from public.boards where id = p_board_id;
  if not found then raise exception 'BOARD_NOT_FOUND' using errcode = 'P0001'; end if;
  if not v_allow and coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'GUEST_NOT_ALLOWED' using errcode='P0001'; end if;
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

drop function if exists public.cinema_list_boards(uuid);
create or replace function public.cinema_list_boards(p_board_id uuid default null)
returns table (id uuid, title text, movie jsonb, capacity integer, starts_at timestamptz,
  created_at timestamptz, participant_count bigint, is_member boolean, is_owner boolean, allow_guests boolean, created_by uuid, creator_name text, creator_is_guest boolean)
language sql stable security definer set search_path = '' as $$
  select b.id, b.title,
    jsonb_build_object('tmdbId', b.movie_tmdb_id, 'title', b.movie_title,
      'posterUrl', b.movie_poster_url, 'releaseDate', b.movie_release_date, 'genres', b.movie_genres),
    b.capacity, b.starts_at, b.created_at,
    (select count(*) from public.board_members m where m.board_id = b.id),
    exists(select 1 from public.board_members m where m.board_id = b.id and m.user_id = auth.uid()),
    b.created_by = auth.uid(), b.allow_guests, b.created_by,
    case when coalesce(u.is_anonymous,false) then 'ゲスト' else coalesce(nullif(p.nickname,''),nullif(p.display_name,''),'ユーザー') end,
    coalesce(u.is_anonymous,false)
  from public.boards b join auth.users u on u.id=b.created_by left join public.profiles p on p.id=b.created_by where p_board_id is null or b.id = p_board_id
  order by b.created_at desc;
$$;

revoke all on function public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean) to authenticated;
revoke all on function public.cinema_list_boards(uuid) from public,anon,authenticated;
grant execute on function public.cinema_list_boards(uuid) to anon,authenticated;
revoke all on function public.cinema_join_board(uuid) from public,anon,authenticated;
grant execute on function public.cinema_join_board(uuid) to authenticated;
revoke all on function public.cinema_post_message(uuid,text) from public,anon,authenticated;
grant execute on function public.cinema_post_message(uuid,text) to authenticated;
revoke all on function public.cinema_public_profile(uuid) from public,anon,authenticated;
grant execute on function public.cinema_public_profile(uuid) to authenticated;
revoke all on function public.cinema_find_profiles(text,uuid,text) from public,anon,authenticated;
grant execute on function public.cinema_find_profiles(text,uuid,text) to authenticated;
revoke all on function public.cinema_set_follow(uuid,boolean) from public,anon,authenticated;
grant execute on function public.cinema_set_follow(uuid,boolean) to authenticated;
revoke all on function public.cinema_delete_message(bigint) from public,anon,authenticated;
grant execute on function public.cinema_delete_message(bigint) to authenticated;
revoke all on function public.cinema_delete_board(uuid) from public,anon,authenticated;
grant execute on function public.cinema_delete_board(uuid) to authenticated;
revoke all on function public.cinema_get_messages(uuid,bigint,bigint,bigint) from public,anon,authenticated;
grant execute on function public.cinema_get_messages(uuid,bigint,bigint,bigint) to authenticated;
revoke all on function public.cinema_read_notifications(bigint[]) from public,anon,authenticated;
grant execute on function public.cinema_read_notifications(bigint[]) to authenticated;
revoke all on function public.cinema_notifications(bigint) from public,anon,authenticated;
grant execute on function public.cinema_notifications(bigint) to authenticated;
revoke all on function public.cinema_social_notifications() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
