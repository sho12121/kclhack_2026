-- コメント返信と返信先本人だけへの投稿通知。既存コメントは維持する。
begin;
alter table public.messages add column if not exists reply_to_id bigint references public.messages(id) on delete set null;
-- 旧方式の一斉投稿通知だけを整理する。コメント本文は削除しない。
delete from public.notifications where kind='board_reply';
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check(kind in ('follow','board_created','board_reply','board_deleted','board_invitation','comment_reply'));
create index if not exists cinema_message_replies on public.messages(reply_to_id) where reply_to_id is not null;
create or replace function public.cinema_post_message(p_board_id uuid, p_content text, p_reply_to_id bigint)
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
  if p_reply_to_id is not null then
    perform 1 from public.messages where id=p_reply_to_id and board_id=p_board_id and deleted_at is null for share;
    if not found then raise exception 'REPLY_TARGET_NOT_FOUND' using errcode='P0001'; end if;
  end if;
  select coalesce(nullif(btrim(nickname), ''), nullif(btrim(display_name), '')) into v_name from public.profiles where id = v_user;
  if coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    v_name := 'ゲスト-' || left(v_user::text, 4);
  else
    v_name := coalesce(v_name, 'ユーザー-' || left(v_user::text, 4));
  end if;
  insert into public.messages(board_id, author_id, author_name, content, reply_to_id)
    values(p_board_id, v_user, left(v_name, 40), btrim(p_content), p_reply_to_id) returning id into v_id;
  return v_id::text;
end;
$$;
-- 旧クライアントの通常投稿も利用可能にする。
create or replace function public.cinema_post_message(p_board_id uuid,p_content text)
returns text language sql security definer set search_path='' as $$
  select public.cinema_post_message(p_board_id,p_content,null);
$$;
revoke all on function public.cinema_post_message(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.cinema_post_message(uuid,text,bigint) to authenticated;
revoke all on function public.cinema_post_message(uuid,text) from public,anon,authenticated;
grant execute on function public.cinema_post_message(uuid,text) to authenticated;

-- 通常投稿では通知しない。返信先の作者にだけ通知し、自分への返信は通知しない。
create or replace function public.cinema_reply_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.reply_to_id is not null then
    insert into public.notifications(user_id,actor_id,kind,board_id,message_id,board_title)
      select parent.author_id,new.author_id,'comment_reply',new.board_id,new.id,b.title
      from public.messages parent join public.boards b on b.id=new.board_id
      where parent.id=new.reply_to_id and parent.board_id=new.board_id
        and parent.deleted_at is null and parent.author_id<>new.author_id
        and exists(select 1 from public.board_members m where m.board_id=new.board_id and m.user_id=parent.author_id);
  end if;
  return new;
end;
$$;
revoke all on function public.cinema_reply_notification() from public,anon,authenticated;
drop trigger if exists cinema_message_notification on public.messages;
create trigger cinema_message_notification after insert on public.messages for each row execute function public.cinema_reply_notification();
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
    'authorIsGuest',coalesce(u.is_anonymous,false),'replyToId',m.reply_to_id::text,'replyToAuthorName',parent.author_name) order by m.id),'[]'::jsonb) into v_messages
  from (select * from public.messages where board_id=p_board_id and (p_after is null or id>p_after) and (p_before is null or id<p_before)
    order by case when p_after is not null then id end asc,case when p_after is null then id end desc limit 50) m
    join auth.users u on u.id=m.author_id left join public.messages parent on parent.id=m.reply_to_id and parent.board_id=m.board_id;
  select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb) into v_deleted from public.messages
    where board_id=p_board_id and deleted_at is not null and p_visible_after is not null and id>=p_visible_after;
  return jsonb_build_object('messages',v_messages,'deletedIds',v_deleted);
end;
$$;
commit;
