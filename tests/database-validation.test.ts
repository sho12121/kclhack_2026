import assert from "node:assert/strict";
import { test } from "node:test";
import { safeAuthRedirect } from "../src/lib/auth-redirect.ts";
import { validateProfile, profileFromRow, defaultProfileName } from "../src/lib/profile.ts";
import { databaseError } from "../src/lib/database-error.ts";

test("初期表示名: DB連番を短く表示し、未発行時は長い番号を補わない", () => {
  assert.equal(defaultProfileName("1"), "ユーザー#1");
  assert.equal(defaultProfileName("25"), "ユーザー#25");
  assert.equal(defaultProfileName(), "ユーザー");
  assert.equal(defaultProfileName("invalid"), "ユーザー");
});

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


test("新規プロフィール: 未設定項目に架空の情報を補わない", () => {
  for (const row of [null, { nickname: "", bio: "", display_name: "" }]) {
    const profile = profileFromRow("id", row);
    for (const key of ["nickname", "bio", "gender", "birthDate", "location", "favoriteGenres", "motto"] as const) {
      assert.equal(profile[key], "");
    }
    assert.equal(profile.avatarUrl, undefined);
  }
});

test("旧プロフィール: 未移行の空の行ではAuth metadataの値を引き継ぐ", () => {
  const profile = profileFromRow("id", { nickname: "", bio: "", location: "" }, { nickname: "以前の名前", bio: "以前の紹介", location: "福岡" });
  assert.equal(profile.nickname, "以前の名前"); assert.equal(profile.bio, "以前の紹介"); assert.equal(profile.location, "福岡");
});

test("プロフィール: 試作時の名前・自己紹介を初期表示に戻し、本人の文章は保持する", () => {
  const sample = profileFromRow("id", { nickname: "たかし", bio: "映画で人生をちょっと豊かに。\n邦画も洋画も好きです。特に人間ドラマや青春映画が好きです。\n最近は、映画をきっかけにいろんな人と話してみたいと思って\nよろしくお願いします！" });
  assert.equal(sample.nickname, "");
  assert.equal(sample.bio, "");
  const saved = profileFromRow("id", { nickname: "映画仲間", bio: "好きな映画について話したいです。" });
  assert.equal(saved.nickname, "映画仲間");
  assert.equal(saved.bio, "好きな映画について話したいです。");
});
