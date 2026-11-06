-- 202611060001_social_features.sqlの適用後に実行する。
-- コメント削除を「投稿者本人、またはその掲示板の作成者」に許可する。
-- このSQLの適用自体では、既存のコメントを削除しない。
begin;

create or replace function public.cinema_delete_message(p_message_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_author uuid; v_owner uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  -- 作成者は必ずコメントの所属掲示板から取得し、クライアントの指定を信用しない。
  select m.author_id, b.created_by into v_author, v_owner
    from public.messages m join public.boards b on b.id=m.board_id
    where m.id=p_message_id for update of m;
  if not found then raise exception 'MESSAGE_NOT_FOUND' using errcode='P0001'; end if;
  if v_user<>v_author and v_user<>v_owner then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.messages
    set content='削除されたコメントです。', deleted_at=coalesce(deleted_at,now())
    where id=p_message_id;
  delete from public.notifications where message_id=p_message_id;
end;
$$;

revoke all on function public.cinema_delete_message(bigint) from public,anon,authenticated;
grant execute on function public.cinema_delete_message(bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
