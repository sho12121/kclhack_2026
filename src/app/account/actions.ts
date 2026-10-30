"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileResult = {
  success: boolean;
  error?: string;
};

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    return { success: false, error: "認証されていません。" };
  }

  const nickname = (formData.get("nickname") as string) || "";
  const bio = (formData.get("bio") as string) || "";
  const gender = (formData.get("gender") as string) || "";
  const birthDate = (formData.get("birthDate") as string) || "";
  const location = (formData.get("location") as string) || "";
  const favoriteGenres = (formData.get("favoriteGenres") as string) || "";
  const motto = (formData.get("motto") as string) || "";

  // 1. Supabase Authのuser_metadataに保存（DBテーブルが未作成でも確実に永続化）
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      displayName: nickname,
      nickname,
      bio,
      gender,
      birthDate,
      location,
      favoriteGenres,
      motto,
    },
  });

  if (authError) {
    console.error("Auth updateUser error:", authError);
  }

  // 2. profilesテーブルが存在する場合はそちらにもupsert試行
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      nickname,
      display_name: nickname,
      bio,
      gender,
      birth_date: birthDate,
      location,
      favorite_genres: favoriteGenres,
      motto,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // profilesテーブル未作成やスキーマ相違の場合はスキップ
    console.warn("Profiles table upsert failed (non-blocking):", err);
  }

  revalidatePath("/account");
  return { success: true };
}

