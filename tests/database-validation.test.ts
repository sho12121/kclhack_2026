import assert from "node:assert/strict";
import { test } from "node:test";
import { safeAuthRedirect } from "../src/lib/auth-redirect.ts";
import { validateProfile, profileFromRow } from "../src/lib/profile.ts";
import { databaseError } from "../src/lib/database-error.ts";

test("認証の戻り先: 正規の掲示板URLだけを許可し、外部URLやコードを拒否する", () => {
  const board = "/boards/11111111-1111-4111-8111-111111111111";
  assert.equal(safeAuthRedirect(board), board);
  for (const value of ["https://evil.invalid", "//evil.invalid", "/boards/not-an-id", "/boards/11111111-1111-4111-8111-111111111111?next=https://evil.invalid", [board], null]) {
    assert.equal(safeAuthRedirect(value), "/account");
  }
  assert.equal(safeAuthRedirect(undefined, "/?create=1"), "/?create=1");
});

test("プロフィール: 空欄への変更を保存し、生年月日の表記を統一する", () => {
  const form = new FormData(); form.set("nickname", " 映画好き "); form.set("bio", ""); form.set("birthDate", "2005/04/12");
  const result = validateProfile(form);
  assert.equal(result.error, null); assert.equal(result.profile?.birthDate, "2005-04-12"); assert.equal(result.profile?.bio, "");
  const profile = profileFromRow("id", { nickname: "映画好き", bio: "", location: "" }, { bio: "以前の紹介", location: "以前の地域" });
  assert.equal(profile.bio, ""); assert.equal(profile.location, ""); assert.equal(profile.followCount, 0);
});

test("プロフィール: 長すぎる値・空の名前・存在しない日付・ファイルを拒否する", () => {
  const form = new FormData(); form.set("nickname", "名前");
  form.set("bio", "あ".repeat(1001)); assert.ok(validateProfile(form).error); form.set("bio", "");
  form.set("birthDate", "2005-02-30"); assert.ok(validateProfile(form).error); form.set("birthDate", "");
  form.set("nickname", " "); assert.ok(validateProfile(form).error);
  form.set("nickname", new File(["bad"], "test.txt")); assert.ok(validateProfile(form).error);
});

test("DBエラー: 権限・満員・開始前を区別し、内部情報は公開しない", () => {
  assert.equal(databaseError({ message: "BOARD_FULL" }).status, 409);
  assert.equal(databaseError({ message: "NOT_A_MEMBER" }).status, 403);
  assert.equal(databaseError({ message: "NOT_STARTED" }).status, 409);
  assert.equal(databaseError({ code: "42P01", message: "private schema info" }).status, 503);
  assert.equal(databaseError({ message: "secret-token=xyz" }).message.includes("xyz"), false);
  assert.equal(databaseError({ message: "toString" }).status, 502);
});

test("DB読み取り: 一時的な接続失敗だけを再試行し、権限エラーは繰り返さない", async () => {
  const { readDatabase } = await import("../src/lib/database-read.ts");
  let count = 0;
  const result = await readDatabase(async () => ({ status: ++count === 1 ? 0 : 200 }));
  assert.equal(result.status, 200); assert.equal(count, 2);
  count = 0;
  await readDatabase(async () => { count++; return { status: 403 }; });
  assert.equal(count, 1);
});


test("旧プロフィール: 未移行の空の行ではAuth metadataの値を引き継ぐ", () => {
  const profile = profileFromRow("id", { nickname: "", bio: "", location: "" }, { nickname: "以前の名前", bio: "以前の紹介", location: "福岡" });
  assert.equal(profile.nickname, "以前の名前"); assert.equal(profile.bio, "以前の紹介"); assert.equal(profile.location, "福岡");
});
