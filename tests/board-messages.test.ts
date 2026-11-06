import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMessageSnapshot, isDatabaseId } from "../src/lib/board-messages.ts";
const message = { id: "9007199254740993", boardId: "board", authorId: "user", authorName: "映画好き", content: "感想", createdAt: "2026-11-06T00:00:00Z", deletedAt: null, authorIsGuest: false };
test("会話: 大きな投稿IDを文字列のまま扱い、削除とゲスト情報を受け取る", () => {
  const result = parseMessageSnapshot({ messages: [message], deletedIds: [message.id] });
  assert.equal(result.messages[0].id, message.id);
  assert.equal(result.messages[0].authorIsGuest, false);
  assert.deepEqual(result.deletedIds, [message.id]);
  assert.deepEqual(parseMessageSnapshot({ messages: [], deletedIds: [] }), { messages: [], deletedIds: [] });
});
test("会話: 欠けたデータや不正な削除IDを成功として扱わない", () => {
  for (const value of [null, {}, { messages: [], deletedIds: [1] }, { messages: [{...message,content:null}], deletedIds: [] }, { messages: [{...message,id:2}], deletedIds: [] }]) assert.throws(()=>parseMessageSnapshot(value));
});
test("DB ID: PostgreSQL bigintの範囲と整数形式を検証する", () => {
  for (const id of ["1", "9007199254740993", "9223372036854775807"]) assert.equal(isDatabaseId(id),true);
  for (const id of ["0", "-1", "1.2", "1e3", "9223372036854775808", 1, "1 OR 1=1", null]) assert.equal(isDatabaseId(id),false);
});

test("返信: 返信先IDを精度を落とさず受け取り、不正な参照を拒否する", () => {
  const reply = {...message, replyToId: "9007199254740992", replyToAuthorName: "返信先"};
  assert.equal(parseMessageSnapshot({messages:[reply],deletedIds:[]}).messages[0].replyToId,reply.replyToId);
  assert.throws(()=>parseMessageSnapshot({messages:[{...reply,replyToId:123}],deletedIds:[]}));
  assert.throws(()=>parseMessageSnapshot({messages:[{...reply,replyToAuthorName:{}}],deletedIds:[]}));
});

test("返信引用: 本文を受け取り、不正な型を拒否する", () => {
 const reply={...message,replyToId:"1",replyToAuthorName:"相手",replyToContent:"引用元の文章"};
 assert.equal(parseMessageSnapshot({messages:[reply],deletedIds:[]}).messages[0].replyToContent,"引用元の文章");
 assert.throws(()=>parseMessageSnapshot({messages:[{...reply,replyToContent:123}],deletedIds:[]}));
});
