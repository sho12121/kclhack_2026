-- 返信本文プレビューと引用・引用元への移動。既存データは削除しない。
begin;
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
    'authorIsGuest',coalesce(u.is_anonymous,false),'replyToId',m.reply_to_id::text,'replyToAuthorName',parent.author_name,'replyToContent',case when parent.deleted_at is not null then '削除されたコメントです。' else left(parent.content,240) end) order by m.id),'[]'::jsonb) into v_messages
  from (select * from public.messages where board_id=p_board_id and (p_after is null or id>p_after) and (p_before is null or id<p_before)
    order by case when p_after is not null then id end asc,case when p_after is null then id end desc limit 50) m
    join auth.users u on u.id=m.author_id left join public.messages parent on parent.id=m.reply_to_id and parent.board_id=m.board_id;
  select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb) into v_deleted from public.messages
    where board_id=p_board_id and deleted_at is not null and p_visible_after is not null and (id>=p_visible_after or id in (
      select reply_to_id from public.messages where board_id=p_board_id and id>=p_visible_after and reply_to_id is not null
    ));
  return jsonb_build_object('messages',v_messages,'deletedIds',v_deleted);
end;
$$;

create or replace function public.cinema_get_message_context(p_board_id uuid,p_message_id bigint)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_snapshot jsonb; v_next bigint;
begin
  -- 最初に既存関数で認証・参加・ゲスト制限を検証する。
  v_snapshot:=public.cinema_get_messages(p_board_id,null,null,null);
  if not exists(select 1 from public.messages where id=p_message_id and board_id=p_board_id) then
    raise exception 'MESSAGE_NOT_FOUND' using errcode='P0001';
  end if;
  if exists(select 1 from jsonb_array_elements(v_snapshot->'messages') m where m->>'id'=p_message_id::text) then return v_snapshot; end if;
  select min(id) into v_next from public.messages where board_id=p_board_id and id>p_message_id;
  return public.cinema_get_messages(p_board_id,null,v_next,null);
end;
$$;
revoke all on function public.cinema_get_message_context(uuid,bigint) from public,anon,authenticated;
grant execute on function public.cinema_get_message_context(uuid,bigint) to authenticated;

create or replace function public.cinema_notifications(p_before bigint default null)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('unreadCount',(select count(*) from public.notifications where user_id=auth.uid() and read_at is null),
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',q.id::text,'kind',q.kind,'boardId',q.board_id,'boardTitle',q.board_title,
      'actorId',case when not coalesce(u.is_anonymous,false) then q.actor_id else null end,
      'actorName',case when coalesce(u.is_anonymous,false) then 'ゲスト' else coalesce(nullif(p.nickname,''),nullif(p.display_name,''),'ユーザー') end,
      'messageId',case when visible.can_read then m.id::text else null end,
      'messagePreview',case when visible.can_read then left(m.content,240) else null end,
      'createdAt',q.created_at,'readAt',q.read_at) order by q.id desc)
      from (select * from public.notifications where user_id=auth.uid() and (p_before is null or id<p_before) order by id desc limit 30) q
      left join auth.users u on u.id=q.actor_id left join public.profiles p on p.id=q.actor_id
      left join public.messages m on m.id=q.message_id and m.board_id=q.board_id
      left join public.boards b on b.id=q.board_id
      cross join lateral (select q.kind='comment_reply' and m.deleted_at is null and m.id is not null
        and (b.allow_guests or coalesce(auth.jwt()->>'is_anonymous','false')<>'true')
        and exists(select 1 from public.board_members member where member.board_id=q.board_id and member.user_id=auth.uid()) can_read) visible
    ),'[]'::jsonb));
$$;
commit;
