-- お気に入りと招待。既存プロフィール・掲示板・会話は維持する。
begin;
create table if not exists public.board_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, board_id)
);
alter table public.board_favorites enable row level security;
revoke all on public.board_favorites from public,anon,authenticated;
grant select on public.board_favorites to authenticated;
drop policy if exists cinema_own_favorites on public.board_favorites;
create policy cinema_own_favorites on public.board_favorites for select to authenticated
  using(user_id=auth.uid() and coalesce(auth.jwt()->>'is_anonymous','false')='false');
create or replace function public.cinema_set_board_favorite(p_board_id uuid,p_favorite boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'ACCOUNT_REQUIRED'; end if;
  if p_favorite is null then raise exception 'INVALID_INPUT'; end if;
  if p_favorite then
    if not exists(select 1 from public.boards where id=p_board_id) then raise exception 'BOARD_NOT_FOUND'; end if;
    insert into public.board_favorites(user_id,board_id) values(auth.uid(),p_board_id) on conflict do nothing;
  else delete from public.board_favorites where user_id=auth.uid() and board_id=p_board_id;
  end if;
end;
$$;
revoke all on function public.cinema_set_board_favorite(uuid,boolean) from public,anon,authenticated;
grant execute on function public.cinema_set_board_favorite(uuid,boolean) to authenticated;

create table if not exists public.board_invitations (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(board_id,user_id), check(user_id<>invited_by)
);
alter table public.board_invitations enable row level security;
revoke all on public.board_invitations from public,anon,authenticated;
grant select on public.board_invitations to authenticated;
drop policy if exists cinema_own_invitations on public.board_invitations;
create policy cinema_own_invitations on public.board_invitations for select to authenticated
  using(auth.uid()=user_id or auth.uid()=invited_by);
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check(kind in ('follow','board_created','board_reply','board_deleted','board_invitation'));

create or replace function public.cinema_invitation_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(user_id,actor_id,kind,board_id,board_title)
    select new.user_id,new.invited_by,'board_invitation',b.id,b.title from public.boards b where b.id=new.board_id;
  return new;
end;
$$;
revoke all on function public.cinema_invitation_notification() from public,anon,authenticated;
drop trigger if exists cinema_invitation_notification on public.board_invitations;
create trigger cinema_invitation_notification after insert on public.board_invitations
  for each row execute function public.cinema_invitation_notification();

-- 作成と招待は同じトランザクション。失敗時には掲示板だけが残らない。
create or replace function public.cinema_create_board_with_invites(
  p_request_id uuid,p_title text,p_movie_tmdb_id integer,p_movie_title text,
  p_movie_poster_url text,p_movie_release_date date,p_movie_genres text[],
  p_capacity integer,p_starts_at timestamptz,p_allow_guests boolean,p_invitee_ids uuid[]
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
    p_movie_poster_url,p_movie_release_date,p_movie_genres,p_capacity,p_starts_at,p_allow_guests);
  insert into public.board_invitations(board_id,user_id,invited_by)
    select v_board,recipient,auth.uid() from unnest(p_invitee_ids) recipient on conflict do nothing;
  return v_board;
end;
$$;
revoke all on function public.cinema_create_board_with_invites(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[]) from public,anon,authenticated;
grant execute on function public.cinema_create_board_with_invites(uuid,text,integer,text,text,date,text[],integer,timestamptz,boolean,uuid[]) to authenticated;
commit;
