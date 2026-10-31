"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfile, profileFromRow } from "@/lib/profile";
import { databaseError } from "@/lib/database-error";
import type { UserProfile } from "@/types/profile";

export type UpdateProfileResult = { success: boolean; error?: string; profile?: UserProfile };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const result = validateProfile(formData);
  if (!result.profile) return { success: false, error: result.error };
  try {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();
    const id = data?.claims.sub;
    if (authError || !id) return { success: false, error: "ログインしてください。" };
    if (data.claims.is_anonymous === true) return { success: false, error: "プロフィールの編集にはアカウントでのログインが必要です。" };
    const p = result.profile;
    const { data: saved, error } = await supabase.from("profiles").upsert({
      id, nickname: p.nickname, display_name: p.nickname, bio: p.bio, gender: p.gender,
      birth_date: p.birthDate || null, location: p.location, favorite_genres: p.favoriteGenres,
      motto: p.motto, updated_at: new Date().toISOString(),
    }).select("*").single();
    if (error) return { success: false, error: databaseError(error).message };
    if (!saved) return { success: false, error: "保存結果を確認できませんでした。" };
    revalidatePath("/account");
    return { success: true, profile: profileFromRow(id, saved) };
  } catch { return { success: false, error: "プロフィールを保存できませんでした。通信環境を確認してください。" }; }
}
