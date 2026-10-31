import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { memberMessagesQuery, messagesFromMembership } from "../src/lib/board-messages.ts";

const boardId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const row = (id: string) => ({ id, board_id: boardId, author_id: userId, author_name: "名前", content: "感想", created_at: "2026-11-01T00:00:00Z" });

test("会話取得: 参加確認と50件の取得を1回の通信にまとめ、本人と掲示板を指定する", async () => {
  const calls: URL[] = [];
  const supabase = createClient("https://example.invalid", "test-publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      calls.push(new URL(String(input)));
      return Response.json([{ board_id: boardId, boards: { messages: [row("2"), row("1")] } }]);
    } },
  });
  const result = await memberMessagesQuery(supabase, boardId, userId);
  assert.equal(result.error, null);
  assert.equal(calls.length, 1);
  const query = calls[0];
  assert.equal(query.pathname, "/rest/v1/board_members");
  assert.equal(query.searchParams.get("board_id"), `eq.${boardId}`);
  assert.equal(query.searchParams.get("user_id"), `eq.${userId}`);
  assert.equal(query.searchParams.get("boards.messages.limit"), "50");
  assert.equal(query.searchParams.get("boards.messages.order"), "id.desc");
  assert.deepEqual(messagesFromMembership(result.data, false).map(m => m.id), ["1", "2"]);

  await memberMessagesQuery(supabase, boardId, userId, { after: "9007199254740993" });
  assert.equal(calls[1].searchParams.get("boards.messages.id"), "gt.9007199254740993");
  assert.equal(calls[1].searchParams.get("boards.messages.order"), "id.asc");
  await memberMessagesQuery(supabase, boardId, userId, { before: "50" });
  assert.equal(calls[2].searchParams.get("boards.messages.id"), "lt.50");
  assert.equal(calls[2].searchParams.get("boards.messages.order"), "id.desc");
});

test("会話取得: 非参加者は403、参加者の投稿0件は正常な空配列として扱う", () => {
  assert.throws(() => messagesFromMembership(null, false), { status: 403 });
  assert.deepEqual(messagesFromMembership({ boards: { messages: [] } }, false), []);
  assert.deepEqual(messagesFromMembership({ boards: { messages: [row("2"), row("3")] } }, true).map(m => m.id), ["2", "3"]);
  assert.throws(() => messagesFromMembership({ boards: null }, false));
  assert.throws(() => messagesFromMembership({ boards: { messages: [{ ...row("1"), content: null }] } }, false));
});
