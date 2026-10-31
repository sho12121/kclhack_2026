/** 読み取りだけを一度再試行する。投稿などの変更処理には使用しない。 */
export async function readDatabase<T extends { status: number }>(query: () => PromiseLike<T>): Promise<T> {
  let result: T;
  try { result = await query(); }
  catch { return await query(); }
  return result.status === 0 || [502, 503, 504].includes(result.status) ? await query() : result;
}
