import type { UserProfile } from "../types/profile.ts";

type ProfileFields = Pick<UserProfile, "nickname" | "bio" | "gender" | "birthDate" | "location" | "favoriteGenres" | "motto">;
export function validateProfile(form: FormData): { profile: ProfileFields; error: null } | { profile: null; error: string } {
  const limits = { nickname: 40, bio: 1000, gender: 30, birthDate: 10, location: 80, favoriteGenres: 200, motto: 120 };
  const labels = { nickname: "ニックネーム", bio: "自己紹介", gender: "性別", birthDate: "生年月日", location: "居住地", favoriteGenres: "好きなジャンル", motto: "ひとこと" };
  const values: Record<string, string> = {};
  for (const key of Object.keys(limits) as (keyof ProfileFields)[]) {
    const value = form.get(key);
    if (value !== null && typeof value !== "string") return { profile: null, error: `${labels[key]}の入力を確認してください。` };
    const text = (value ?? "").trim();
    if (text.length > limits[key]) return { profile: null, error: `${labels[key]}は${limits[key]}文字以内で入力してください。` };
    values[key] = text;
  }
  if (!values.nickname) return { profile: null, error: "ニックネームを入力してください。" };
  const date = values.birthDate.replaceAll("/", "-");
  if (date) {
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date || timestamp > Date.now()) {
      return { profile: null, error: "生年月日を正しい日付で入力してください。" };
    }
  }
  return { profile: { ...values, birthDate: date } as ProfileFields, error: null };
}

export function profileFromRow(id: string, row: Record<string, unknown> | null, metadata: Record<string, unknown> = {}): UserProfile {
  // 新方式ではnicknameを必須にして保存する。未移行の行は旧Auth metadataも参照する。
  const hasSavedProfile = typeof row?.nickname === "string" && Boolean(row.nickname.trim());
  const text = (key: string, alternate: string = key) => {
    if (hasSavedProfile && typeof row?.[key] === "string") return row[key] as string;
    if (typeof metadata[alternate] === "string") return metadata[alternate] as string;
    return typeof row?.[key] === "string" ? row[key] as string : "";
  };
  const nickname = text("nickname") || text("display_name", "displayName") || (typeof metadata.display_name === "string" ? metadata.display_name : "");
  const bio = text("bio");
  // プロトタイプの紹介文だけを初期状態に戻す。本人の紹介文は保持する。
  const compactBio = bio.replace(/\s/g, "");
  const isSampleBio = compactBio.startsWith("映画で人生をちょっと豊かに。") && compactBio.includes("邦画も洋画も好きです。") && compactBio.includes("青春映画") && compactBio.endsWith("よろしくお願いします！");
  return {
    id, nickname: nickname === "たかし" ? "" : nickname,
    bio: isSampleBio ? "" : bio, gender: text("gender"), birthDate: text("birth_date", "birthDate"),
    location: text("location"), favoriteGenres: text("favorite_genres", "favoriteGenres"), motto: text("motto"),
    avatarUrl: text("avatar_url", "avatarUrl") || undefined, coverUrl: text("cover_url", "coverUrl") || undefined,
    followCount: 0, followerCount: 0,
  };
}

/** DBが一意に発行した連番を表示する。SQL反映前は長い代替番号を作らない。 */
export function defaultProfileName(number?: string): string {
  return number && /^[1-9]\d*$/.test(number) ? `ユーザー#${number}` : "ユーザー";
}
