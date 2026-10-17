import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { MovieSearchError, searchMovies } from "../src/lib/tmdb.ts";
import { validateMovieQuery, MAX_QUERY_LENGTH } from "../src/lib/movie-search.ts";

// 実際の認証情報やネットワークは使わない。
const fakeToken = "test-only-token";
let originalToken: string | undefined;

beforeEach(() => {
  originalToken = process.env.TMDB_READ_ACCESS_TOKEN;
  process.env.TMDB_READ_ACCESS_TOKEN = fakeToken;
});

afterEach(() => {
  mock.restoreAll();
  if (originalToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
  else process.env.TMDB_READ_ACCESS_TOKEN = originalToken;
});

test("検索語: 空白だけと100文字を超える入力を拒否する", () => {
  assert.notEqual(validateMovieQuery(" \t　"), null);
  assert.notEqual(validateMovieQuery("あ".repeat(MAX_QUERY_LENGTH + 1)), null);
  assert.equal(validateMovieQuery("あ".repeat(MAX_QUERY_LENGTH)), null);
  assert.equal(validateMovieQuery("  君の名は。  "), null);
});

test("未設定: TMDbに通信せず、設定の内部情報を返さない", async () => {
  delete process.env.TMDB_READ_ACCESS_TOKEN;
  const fetchMock = mock.method(globalThis, "fetch");
  await assert.rejects(searchMovies("映画"), (error: unknown) => {
    assert.ok(error instanceof MovieSearchError);
    assert.equal(error.status, 503);
    assert.equal(error.message.includes("TMDB_READ_ACCESS_TOKEN"), false);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("正常: 日本語をURLで扱い、トークンはヘッダーだけに送る", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (...request: Parameters<typeof fetch>) => {
    assert.equal(request.length, 2);
    return Response.json({ results: [{ id: 372058, title: "君の名は。", release_date: "2016-08-26", poster_path: "/sample.jpg", secret: "not-for-client" }] });
  });
  const movies = await searchMovies("映画 & 君の名は。");
  const [input, init] = fetchMock.mock.calls[0].arguments;
  const url = new URL(String(input));
  assert.equal(url.searchParams.get("query"), "映画 & 君の名は。");
  assert.equal(url.searchParams.get("language"), "ja-JP");
  assert.equal(url.searchParams.get("include_adult"), "false");
  assert.equal(url.toString().includes(fakeToken), false);
  assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${fakeToken}`);
  assert.equal(init?.cache, "no-store");
  assert.ok(init?.signal instanceof AbortSignal);
  assert.deepEqual(movies, [{ tmdbId: 372058, title: "君の名は。", releaseDate: "2016-08-26", posterUrl: "https://image.tmdb.org/t/p/w342/sample.jpg" }]);
  assert.equal(JSON.stringify(movies).includes("not-for-client"), false);
});

test("欠損: 公開日とポスターがなくても表示できる形式にする", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ results: [{ id: 1, title: "映画", release_date: "", poster_path: null }] }));
  assert.deepEqual(await searchMovies("映画"), [{ tmdbId: 1, title: "映画", releaseDate: null, posterUrl: null }]);
});

test("画像: TMDbの画像パス以外をクライアントに渡さない", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ results: [{ id: 1, title: "映画", poster_path: "https://example.com/other.jpg" }] }));
  assert.equal((await searchMovies("映画"))[0].posterUrl, null);
});

test("0件: 正常な空配列を失敗と区別する", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ results: [] }));
  assert.deepEqual(await searchMovies("映画"), []);
});

test("不正データ: 結果が配列でなければ502にする", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ results: "broken" }));
  await assert.rejects(searchMovies("映画"), { status: 502 });
});

test("不正データ: IDとタイトルが壊れた映画を返さない", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ results: [{ id: "not-an-id", title: null }] }));
  await assert.rejects(searchMovies("映画"), { status: 502 });
});

test("上流401: 内部のエラー本文やトークンを公開しない", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ error: fakeToken }, { status: 401 }));
  await assert.rejects(searchMovies("映画"), (error: unknown) => {
    assert.ok(error instanceof MovieSearchError);
    assert.equal(error.status, 502);
    assert.equal(error.message.includes(fakeToken), false);
    return true;
  });
});

test("上流429: 再試行を案内する", async () => {
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 429 }));
  await assert.rejects(searchMovies("映画"), { status: 429 });
});

test("時間切れ: 504に変換する", async () => {
  mock.method(globalThis, "fetch", async () => { throw new DOMException("internal detail", "TimeoutError"); });
  await assert.rejects(searchMovies("映画"), { status: 504 });
});

test("通信失敗: 内部の例外メッセージを公開しない", async () => {
  mock.method(globalThis, "fetch", async () => { throw new Error(fakeToken); });
  await assert.rejects(searchMovies("映画"), (error: unknown) => {
    assert.ok(error instanceof MovieSearchError);
    assert.equal(error.status, 502);
    assert.equal(error.message.includes(fakeToken), false);
    return true;
  });
});
