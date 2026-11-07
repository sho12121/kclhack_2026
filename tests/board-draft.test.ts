import assert from "node:assert/strict";
import { test } from "node:test";
import { validateBoardDraft, validateBoardStartDateTime, shiftBoardDate, type BoardDraftInput } from "../src/lib/board-draft.ts";

const now = Date.parse("2026-10-29T00:00:00Z");
const input: BoardDraftInput = {
  title: "  ラストについて話そう  ",
  movie: { tmdbId: 372058, title: "君の名は。", releaseDate: null, posterUrl: null },
  capacity: "4",
  startDateTime: "2026-10-31T20:00",
};

test("掲示板: 映画の選択を必須にする", () => {
  assert.ok(validateBoardDraft({ ...input, movie: null }, now).error);
});

test("掲示板: 空白だけのタイトルと長すぎるタイトルを拒否する", () => {
  for (const title of [" \t　", "あ".repeat(81)]) {
    assert.ok(validateBoardDraft({ ...input, title }, now).error);
  }
});

test("掲示板: 定員は3〜20人の整数に限定する", () => {
  for (const capacity of ["", "1", "2", "21", "2.5", "人数", "Infinity"]) {
    assert.ok(validateBoardDraft({ ...input, capacity }, now).error, capacity);
  }
  for (const capacity of ["3", "20"]) {
    assert.equal(validateBoardDraft({ ...input, capacity }, now).error, null);
  }
});

test("掲示板: 開始日時は日本時間として解釈しUTCに変換する", () => {
  const { draft, error } = validateBoardDraft(input, now);
  assert.equal(error, null);
  assert.equal(draft?.startsAt, "2026-10-31T11:00:00.000Z");
  assert.equal(draft?.title, "ラストについて話そう");
});

test("掲示板: 過去・現在・存在しない日時と不正な形式を拒否する", () => {
  for (const startDateTime of ["", "不正", "2026-10-28T23:59", "2026-10-29T09:00", "2027-02-30T20:00", "2026-10-31T24:00"]) {
    assert.ok(validateBoardDraft({ ...input, startDateTime }, now).error, startDateTime);
  }
});

test("掲示板: 新しい日時UIでも、未来の日時という元のルールを維持する", () => {
  for (const startDateTime of ["2026-10-29T09:01", "2027-10-29T09:00"]) {
    assert.equal(validateBoardStartDateTime(startDateTime, now), null);
    assert.equal(validateBoardDraft({ ...input, startDateTime }, now).error, null);
  }
  assert.ok(validateBoardStartDateTime("2027-02-30T12:00", now));
});


test("掲示板: 定員の制限なしをnullとして扱い、数値0とは区別する", () => {
  const result = validateBoardDraft({ ...input, capacity: "unlimited" }, now);
  assert.equal(result.error, null);
  assert.equal(result.draft?.capacity, null);
  assert.ok(validateBoardDraft({ ...input, capacity: "0" }, now).error);
});

test("開始日の加減: 選択日を基準に日・月を移動し、月末とうるう年を扱う", () => {
  assert.equal(shiftBoardDate("2026-10-31", 3, "days"), "2026-11-03");
  assert.equal(shiftBoardDate("2026-10-31", -3, "days"), "2026-10-28");
  assert.equal(shiftBoardDate("2026-01-31", 1, "months"), "2026-02-28");
  assert.equal(shiftBoardDate("2028-01-31", 1, "months"), "2028-02-29");
  assert.equal(shiftBoardDate("2026-03-31", -1, "months"), "2026-02-28");
  assert.equal(shiftBoardDate("2026-12-31", 1, "months"), "2027-01-31");
  assert.equal(shiftBoardDate("2026-02-30", 1, "months"), null);
});

test("掲示板: ゲスト受け入れ設定を確認内容に保持する", () => {
  assert.equal(validateBoardDraft({...input,allowGuests:false},now).draft?.allowGuests,false);
  assert.equal(validateBoardDraft({...input,allowGuests:true},now).draft?.allowGuests,true);
  assert.equal(validateBoardDraft(input,now).draft?.allowGuests,true);
});

test("ネタバレ注意: 初期値はオフ、指定時は作成内容に保持する", () => {
  assert.equal(validateBoardDraft(input,now).draft?.hasSpoilers,false);
  assert.equal(validateBoardDraft({...input,hasSpoilers:true},now).draft?.hasSpoilers,true);
});

test("今から: 日時を指定せずに開始でき、確認後に時間が進んでも期限切れにならない", () => {
  const immediate = {...input,startImmediately:true,startDateTime:""};
  assert.equal(validateBoardDraft(immediate,now).draft?.startsAt,new Date(now).toISOString());
  assert.equal(validateBoardDraft(immediate,now+3600000).error,null);
  assert.ok(validateBoardDraft({...immediate,startImmediately:false},now).error);
});
