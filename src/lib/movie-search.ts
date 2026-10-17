// ブラウザとサーバーの両方で使う、秘密情報を含まない入力ルール。
export const MAX_QUERY_LENGTH = 100;

export function validateMovieQuery(query: string): string | null {
  if (!query.trim()) return "映画のタイトルを入力してください。";
  if (query.trim().length > MAX_QUERY_LENGTH) {
    return `タイトルは${MAX_QUERY_LENGTH}文字以内で入力してください。`;
  }
  return null;
}
