-- 掲示板のネタバレ表示。既存データは維持し、以前の掲示板はオフにする。
begin;
alter table public.boards add column if not exists has_spoilers boolean not null default false;

create or replace function public.cinema_create_board_options(
  p_request_id uuid,p_title text,p_movie_tmdb_id integer,p_movie_title text,
  p_movie_poster_url text,p_movie_release_date date,p_movie_genres text[],
  p_capacity integer,p_starts_at timestamptz,p_allow_guests boolean,p_invitee_ids uuid[],p_has_spoilers boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_board uuid; v_exists boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null or p_has_spoilers is null or p_invitee_ids is null then raise exception 'INVALID_INPUT'; end if;
  -- 同じ作成リクエストの再送は最初に保存した設定を維持する。
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select exists(select 1 from public.boards where id=p_request_id) into v_exists;
  if cardinality(p_invitee_ids)>0 then
    v_board:=public.cinema_create_board_with_invites(p_request_id,p_title,p_movie_tmdb_id,p_movie_title,
      p_movie_poster_url,p_movie_release_date,p_movie_genres,p_capacity,p_starts_at,p_allow_guests,p_invitee_ids);
  else
    v_board:=public.cinema_create_board(p_request_id,p_title,p_movie_tmdb_id,p_movie_title,
      p_movie_poster_url,p_movie_release_date,p_movie_genres,p_capacity,p_starts_at,p_allow_guests);
  end if;
  if not v_exists then update public.boards set has_spoilers=p_has_spoilers where id=v_board and created_by=auth.uid(); end if;
  return v_board;
end;
$$;
revoke all on function public.cinema_create_board_options(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.cinema_create_board_options(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[],boolean) to authenticated;

create or replace function public.cinema_list_boards_with_labels(p_board_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(listing)||jsonb_build_object('has_spoilers',b.has_spoilers) order by listing.created_at desc),'[]'::jsonb)
  from public.cinema_list_boards(p_board_id) listing join public.boards b on b.id=listing.id;
$$;
revoke all on function public.cinema_list_boards_with_labels(uuid) from public,anon,authenticated;
grant execute on function public.cinema_list_boards_with_labels(uuid) to anon,authenticated;
commit;
