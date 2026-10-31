import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { MovieSearchError, searchMovies } from "../src/lib/tmdb.ts";
import { validateMovieQuery, MAX_QUERY_LENGTH } from "../src/lib/movie-search.ts";

// 実際の認証情報やネットワークは使わない。
const fakeToken = "test-only-token";
let ratingResponse: (id: number) => Response | Promise<Response>;

function mockTmdbFetch(implementation: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  return mock.method(globalThis, "fetch", async (...args: Parameters<typeof fetch>) => {
    const url = new URL(String(args[0]));
    const id = url.pathname.match(/\/movie\/(\d+)\/release_dates$/)?.[1];
    return id ? ratingResponse(Number(id)) : implementation(...args);
  });
}

function certificationData(...codes: string[]) {
  return { results: [{ iso_3166_1: "JP", release_dates: codes.map(certification => ({ certification, type: 3 })) }] };
}
let originalToken: string | undefined;

beforeEach(() => {
  ratingResponse = () => Response.json(certificationData("G"));
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
  const fetchMock = mockTmdbFetch(async (...request: Parameters<typeof fetch>) => {
    assert.equal(request.length, 2);
    return Response.json({ results: [{ adult: false, id: 372058, title: "君の名は。", release_date: "2016-08-26", poster_path: "/sample.jpg", secret: "not-for-client" }] });
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
  assert.deepEqual(movies, [{ tmdbId: 372058, title: "君の名は。", releaseDate: "2016-08-26", posterUrl: "https://image.tmdb.org/t/p/w342/sample.jpg", certification: "G" }]);
  assert.equal(JSON.stringify(movies).includes("not-for-client"), false);
});

test("欠損: 公開日とポスターがなくても表示できる形式にする", async () => {
  mockTmdbFetch(async () => Response.json({ results: [{ adult: false, id: 1, title: "映画", release_date: "", poster_path: null }] }));
  assert.deepEqual(await searchMovies("映画"), [{ tmdbId: 1, title: "映画", releaseDate: null, posterUrl: null, certification: "G" }]);
});

test("画像: TMDbの画像パス以外をクライアントに渡さない", async () => {
  mockTmdbFetch(async () => Response.json({ results: [{ adult: false, id: 1, title: "映画", poster_path: "https://example.com/other.jpg" }] }));
  assert.equal((await searchMovies("映画"))[0].posterUrl, null);
});

test("0件: 正常な空配列を失敗と区別する", async () => {
  mockTmdbFetch(async () => Response.json({ results: [] }));
  assert.deepEqual(await searchMovies("映画"), []);
});

test("成人向け除外: APIの結果に含まれていても、タイトルやポスターを返さない", async () => {
  mockTmdbFetch(async () => Response.json({ results: [
    { adult: false, id: 1, title: "一般作品", poster_path: null },
    { adult: true, id: 2, title: "除外する作品", poster_path: "/excluded.jpg" },
  ] }));
  const movies = await searchMovies("映画");
  assert.deepEqual(movies, [{ tmdbId: 1, title: "一般作品", releaseDate: null, posterUrl: null, certification: "G" }]);
  assert.equal(JSON.stringify(movies).includes("excluded.jpg"), false);
});

test("成人向け除外: 分類が欠けている・型が違う結果も返さない", async () => {
  mockTmdbFetch(async () => Response.json({ results: [
    { id: 1, title: "分類なし" },
    { adult: null, id: 2, title: "分類不明" },
    { adult: "false", id: 3, title: "文字列の分類" },
    { adult: 0, id: 4, title: "数値の分類" },
    null,
  ] }));
  assert.deepEqual(await searchMovies("映画"), []);
});

test("年齢区分: R指定は設定で判定し、個別の除外対象は常に返さない", async () => {
  ratingResponse = (id) => Response.json(certificationData(id === 297090 ? "15" : id === 1714414 ? "" : "G"));
  mockTmdbFetch(async () => Response.json({ results: [
    { adult: false, id: 297090, title: "The Torture Club", poster_path: "/excluded.jpg" },
    { adult: false, id: 1714414, title: "関連ビデオ" },
    { adult: false, id: 1, title: "一般作品" },
  ] }));
  assert.deepEqual(await searchMovies("ちいかわ"), [
    { tmdbId: 1, title: "一般作品", releaseDate: null, posterUrl: null, certification: "G" },
  ]);
  const unrestricted = await searchMovies("ちいかわ", { includeRestricted: true });
  assert.deepEqual(unrestricted.map(movie => [movie.tmdbId, movie.certification]), [[297090, "R15+"], [1, "G"]]);
});

test("成人向け除外: 除外後に最大20件までを返す", async () => {
  mockTmdbFetch(async () => Response.json({ results: [
    { adult: true, id: 100, title: "除外する作品" },
    ...Array.from({ length: 21 }, (_, index) => ({ adult: false, id: index + 1, title: `一般作品${index}` })),
  ] }));
  const movies = await searchMovies("映画");
  assert.equal(movies.length, 20);
  assert.equal(movies[0].tmdbId, 1);
  assert.equal(movies[19].tmdbId, 20);
});

test("年齢制限: 未登録も表示し、オンでも成人向けフラグの作品は除外する", async () => {
  ratingResponse = id => Response.json(certificationData(({ 1: "G", 2: "PG12", 3: "R15+", 4: "R18+", 5: "" } as Record<number, string>)[id] ?? ""));
  mockTmdbFetch(async () => Response.json({ results: [
    ...[1, 2, 3, 4, 5].map(id => ({ id, title: `作品${id}`, adult: false })),
    { id: 6, title: "成人向け作品", adult: true },
  ] }));
  assert.deepEqual((await searchMovies("映画")).map(movie => movie.tmdbId), [1, 2, 5]);
  assert.deepEqual((await searchMovies("映画", { includeRestricted: true })).map(movie => movie.tmdbId), [1, 2, 3, 4, 5]);
});

test("年齢区分の取得失敗: 安全と見なして作品を返さず、エラーを伝える", async () => {
  ratingResponse = () => Response.json({ error: "internal" }, { status: 503 });
  mockTmdbFetch(async () => Response.json({ results: [{ adult: false, id: 1, title: "作品" }] }));
  await assert.rejects(searchMovies("映画"), { status: 502 });
});

test("年齢区分の取得失敗: レート制限と時間切れを区別する", async () => {
  mockTmdbFetch(async () => Response.json({ results: [{ adult: false, id: 1, title: "作品" }] }));
  ratingResponse = () => new Response(null, { status: 429 });
  await assert.rejects(searchMovies("映画"), { status: 429 });
  ratingResponse = () => { throw new DOMException("internal", "TimeoutError"); };
  await assert.rejects(searchMovies("映画"), { status: 504 });
});

test("不正データ: 結果が配列でなければ502にする", async () => {
  mockTmdbFetch(async () => Response.json({ results: "broken" }));
  await assert.rejects(searchMovies("映画"), { status: 502 });
});

test("不正データ: IDとタイトルが壊れた映画を返さない", async () => {
  mockTmdbFetch(async () => Response.json({ results: [{ adult: false, id: "not-an-id", title: null }] }));
  await assert.rejects(searchMovies("映画"), { status: 502 });
});

test("上流401: 内部のエラー本文やトークンを公開しない", async () => {
  mockTmdbFetch(async () => Response.json({ error: fakeToken }, { status: 401 }));
  await assert.rejects(searchMovies("映画"), (error: unknown) => {
    assert.ok(error instanceof MovieSearchError);
    assert.equal(error.status, 502);
    assert.equal(error.message.includes(fakeToken), false);
    return true;
  });
});

test("上流429: 再試行を案内する", async () => {
  mockTmdbFetch(async () => new Response(null, { status: 429 }));
  await assert.rejects(searchMovies("映画"), { status: 429 });
});

test("時間切れ: 504に変換する", async () => {
  mockTmdbFetch(async () => { throw new DOMException("internal detail", "TimeoutError"); });
  await assert.rejects(searchMovies("映画"), { status: 504 });
});

test("通信失敗: 内部の例外メッセージを公開しない", async () => {
  mockTmdbFetch(async () => { throw new Error(fakeToken); });
  await assert.rejects(searchMovies("映画"), (error: unknown) => {
    assert.ok(error instanceof MovieSearchError);
    assert.equal(error.status, 502);
    assert.equal(error.message.includes(fakeToken), false);
    return true;
  });
});


test("年齢区分取得: 遅い作品があっても空いた枠で次を取得し、検索順を保つ", async () => {
  const started: number[] = [];
  let releaseFirst!: () => void;
  let fifthStarted!: () => void;
  const first = new Promise<void>(resolve => { releaseFirst = resolve; });
  const fifth = new Promise<void>(resolve => { fifthStarted = resolve; });
  let active = 0;
  let peak = 0;
  ratingResponse = async (id) => {
    started.push(id);
    active++;
    peak = Math.max(peak, active);
    if (id === 1) await first;
    if (id === 5) fifthStarted();
    active--;
    return Response.json(certificationData("G"));
  };
  mockTmdbFetch(async () => Response.json({ results: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1, title: `作品${i + 1}`, adult: false,
  })) }));
  const pending = searchMovies("映画");
  try {
    await Promise.race([fifth, new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("最初の作品が次の取得を妨げています")), 1000);
      timer.unref();
    })]);
    assert.ok(started.includes(5));
    assert.ok(peak <= 4);
  } finally {
    releaseFirst();
  }
  const movies = await pending;
  assert.deepEqual(movies.map(movie => movie.tmdbId), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("時間制限: 検索本体は10秒、年齢区分を含む全体は30秒", async () => {
  const budgets: number[] = [];
  mock.method(AbortSignal, "timeout", (ms: number) => {
    budgets.push(ms);
    return new AbortController().signal;
  });
  mockTmdbFetch(async () => Response.json({ results: [{ id: 1, title: "作品", adult: false }] }));
  assert.equal((await searchMovies("映画")).length, 1);
  assert.deepEqual(budgets, [30_000, 10_000]);
});


test("年齢区分未登録: 火垂るの墓を初期設定・制限解除どちらでも返す", async () => {
  ratingResponse = () => Response.json(certificationData(""));
  mockTmdbFetch(async () => Response.json({ results: [{ adult: false, id: 12477, title: "火垂るの墓" }] }));
  for (const includeRestricted of [false, true]) {
    const movies = await searchMovies("火垂るの墓", { includeRestricted });
    assert.deepEqual(movies, [{ tmdbId: 12477, title: "火垂るの墓", releaseDate: null, posterUrl: null }]);
  }
});
