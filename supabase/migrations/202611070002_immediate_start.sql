-- 「今から」はDBの作成時刻で開始する。既存データ・予約開始・旧クライアントは維持。
begin;
create or replace function public.cinema_create_board(
  p_request_id uuid, p_title text, p_movie_tmdb_id integer, p_movie_title text,
  p_movie_poster_url text, p_movie_release_date date, p_movie_genres text[],
  p_capacity integer, p_starts_at timestamptz, p_allow_guests boolean,p_start_immediately boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_owner uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_start_immediately is null then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_allow_guests is null then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if not p_allow_guests and coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'GUEST_NOT_ALLOWED' using errcode='P0001'; end if;
  if p_request_id is null then raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  select created_by into v_owner from public.boards where id = p_request_id;
  if found then
    if v_owner <> v_user then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
    return p_request_id;
  end if;
  if not p_start_immediately and (p_starts_at is null or p_starts_at <= now()) then raise exception 'START_IN_PAST' using errcode = 'P0001'; end if;
  insert into public.boards(id, created_by, title, movie_tmdb_id, movie_title,
    movie_poster_url, movie_release_date, movie_genres, capacity, starts_at, allow_guests)
  values(p_request_id, v_user, btrim(p_title), p_movie_tmdb_id, p_movie_title,
    p_movie_poster_url, p_movie_release_date, coalesce(p_movie_genres, '{}'), p_capacity, case when p_start_immediately then now() else p_starts_at end, p_allow_guests)
  on conflict (id) do nothing;
  select created_by into v_owner from public.boards where id = p_request_id;
  if v_owner <> v_user then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  insert into public.board_members(board_id, user_id) values(p_request_id, v_user) on conflict do nothing;
  return p_request_id;
end;
$$;
revoke all on function public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.cinema_create_board(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,boolean) to authenticated;

create or replace function public.cinema_create_board_with_invites(
  p_request_id uuid,p_title text,p_movie_tmdb_id integer,p_movie_title text,
  p_movie_poster_url text,p_movie_release_date date,p_movie_genres text[],
  p_capacity integer,p_starts_at timestamptz,p_allow_guests boolean,p_invitee_ids uuid[],p_start_immediately boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_board uuid; v_invitee uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'ACCOUNT_REQUIRED'; end if;
  if p_invitee_ids is null or cardinality(p_invitee_ids)>50 then raise exception 'INVALID_INPUT'; end if;
  foreach v_invitee in array p_invitee_ids loop
    if v_invitee is null or not exists(select 1 from public.follows f join auth.users u on u.id=f.following_id
      where f.follower_id=auth.uid() and f.following_id=v_invitee and not coalesce(u.is_anonymous,false)) then
      raise exception 'INVITEE_NOT_FOLLOWED';
    end if;
  end loop;
  v_board:=public.cinema_create_board(p_request_id,p_title,p_movie_tmdb_id,p_movie_title,
    p_movie_poster_url,p_movie_release_date,p_movie_genres,p_capacity,p_starts_at,p_allow_guests,p_start_immediately);
  insert into public.board_invitations(board_id,user_id,invited_by)
    select v_board,recipient,auth.uid() from unnest(p_invitee_ids) recipient on conflict do nothing;
  return v_board;
end;
$$;
revoke all on function public.cinema_create_board_with_invites(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.cinema_create_board_with_invites(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[],boolean) to authenticated;

create or replace function public.cinema_create_board_options(
  p_request_id uuid,p_title text,p_movie_tmdb_id integer,p_movie_title text,
  p_movie_poster_url text,p_movie_release_date date,p_movie_genres text[],
  p_capacity integer,p_starts_at timestamptz,p_allow_guests boolean,p_invitee_ids uuid[],p_has_spoilers boolean,p_start_immediately boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_board uuid; v_exists boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_start_immediately is null or p_request_id is null or p_has_spoilers is null or p_invitee_ids is null then raise exception 'INVALID_INPUT'; end if;
  -- 同じ作成リクエストの再送は最初に保存した設定を維持する。
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select exists(select 1 from public.boards where id=p_request_id) into v_exists;
  if cardinality(p_invitee_ids)>0 then
    v_board:=public.cinema_create_board_with_invites(p_request_id,p_title,p_movie_tmdb_id,p_movie_title,
      p_movie_poster_url,p_movie_release_date,p_movie_genres,p_capacity,p_starts_at,p_allow_guests,p_invitee_ids,p_start_immediately);
  else
    v_board:=public.cinema_create_board(p_request_id,p_title,p_movie_tmdb_id,p_movie_title,
      p_movie_poster_url,p_movie_release_date,p_movie_genres,p_capacity,p_starts_at,p_allow_guests,p_start_immediately);
  end if;
  if not v_exists then update public.boards set has_spoilers=p_has_spoilers where id=v_board and created_by=auth.uid(); end if;
  return v_board;
end;
$$;
revoke all on function public.cinema_create_board_options(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[],boolean,boolean) from public,anon,authenticated;
grant execute on function public.cinema_create_board_options(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[],boolean,boolean) to authenticated;

commit;
