import assert from "node:assert/strict";
import { test } from "node:test";
import { validateBoardDraft, type BoardDraftInput } from "../src/lib/board-draft.ts";

const now = Date.parse("2026-10-29T00:00:00Z");
const input: BoardDraftInput = {
  title: "  ラストについて話そう  ",
  movie: { tmdbId: 372058, title: "君の名は。", releaseDate: null, posterUrl: null },
  capacity: "4",
  endDateTime: "2026-10-31T20:00",
};

test("掲示板: 映画の選択を必須にする", () => {
  assert.ok(validateBoardDraft({ ...input, movie: null }, now).error);
});

test("掲示板: 空白だけのタイトルと長すぎるタイトルを拒否する", () => {
  for (const title of [" \t　", "あ".repeat(81)]) {
    assert.ok(validateBoardDraft({ ...input, title }, now).error);
  }
});

test("掲示板: 定員は2〜20人の整数に限定する", () => {
  for (const capacity of ["", "1", "21", "2.5", "人数", "Infinity"]) {
    assert.ok(validateBoardDraft({ ...input, capacity }, now).error, capacity);
  }
  for (const capacity of ["2", "20"]) {
    assert.equal(validateBoardDraft({ ...input, capacity }, now).error, null);
  }
});

test("掲示板: 終了日時は日本時間として解釈しUTCに変換する", () => {
  const { draft, error } = validateBoardDraft(input, now);
  assert.equal(error, null);
  assert.equal(draft?.endsAt, "2026-10-31T11:00:00.000Z");
  assert.equal(draft?.title, "ラストについて話そう");
});

test("掲示板: 過去・現在・存在しない日時と不正な形式を拒否する", () => {
  for (const endDateTime of ["", "不正", "2026-10-28T23:59", "2026-10-29T09:00", "2027-02-30T20:00", "2026-10-31T24:00"]) {
    assert.ok(validateBoardDraft({ ...input, endDateTime }, now).error, endDateTime);
  }
});
