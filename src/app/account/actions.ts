"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfile, profileFromRow } from "@/lib/profile";
import { DatabaseError, databaseError } from "@/lib/database-error";
import { PROFILE_IMAGE_BUCKET, ProfileImageError, validateProfileImage, ownProfileImagePath } from "@/lib/profile-images";
import type { UserProfile } from "@/types/profile";

export type UpdateProfileResult = { success: boolean; error?: string; profile?: UserProfile };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  let client: Awaited<ReturnType<typeof createClient>> | null = null;
  const uploaded: string[] = [];
  let committed = false;
  try {
    const supabase = await createClient(); client = supabase;
    const { data, error: authError } = await supabase.auth.getClaims();
    const id = data?.claims.sub;
    if (authError || !id) return { success: false, error: "ログインしてください。" };
    if (data.claims.is_anonymous === true) return { success: false, error: "ゲストのプロフィールは編集できません。" };
    const result = validateProfile(formData);
    if (!result.profile) return { success: false, error: result.error };
    const previous = await supabase.from("profiles").select("avatar_url,cover_url").eq("id",id).maybeSingle();
    if (previous.error) throw databaseError(previous.error);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const storage = supabase.storage.from(PROFILE_IMAGE_BUCKET);
    let avatarUrl = ownProfileImagePath(previous.data?.avatar_url,id,url) ? previous.data?.avatar_url : null;
    let coverUrl = ownProfileImagePath(previous.data?.cover_url,id,url) ? previous.data?.cover_url : null;
    const oldPaths: string[] = [];
    for (const kind of ["avatar","cover"] as const) {
      const oldUrl = kind === "avatar" ? avatarUrl : coverUrl;
      const removing = formData.get(kind === "avatar" ? "removeAvatar" : "removeCover") === "on";
      const file = formData.get(kind === "avatar" ? "avatarFile" : "coverFile");
      let nextUrl = oldUrl;
      if (removing) nextUrl = null;
      else if (file instanceof File && file.size > 0) {
        const format = await validateProfileImage(file);
        const path = `${id}/${kind}-${crypto.randomUUID()}.${format.extension}`;
        const upload = await storage.upload(path,file,{contentType:format.contentType,cacheControl:"31536000",upsert:false});
        if (upload.error) throw new ProfileImageError("画像を保存できませんでした。接続や画像保存用SQLの設定を確認してください。");
        uploaded.push(path);
        nextUrl = storage.getPublicUrl(path).data.publicUrl;
      } else if (file !== null && !(file instanceof File)) throw new ProfileImageError("画像ファイルを選び直してください。");
      if (oldUrl && oldUrl !== nextUrl) {
        const path = ownProfileImagePath(oldUrl,id,url); if (path) oldPaths.push(path);
      }
      if (kind === "avatar") avatarUrl = nextUrl; else coverUrl = nextUrl;
    }
    const p = result.profile;
    const { data: saved, error } = await supabase.from("profiles").upsert({
      id,nickname:p.nickname,display_name:p.nickname,bio:p.bio,gender:p.gender,
      birth_date:p.birthDate || null,location:p.location,favorite_genres:p.favoriteGenres,
      motto:p.motto,avatar_url:avatarUrl,cover_url:coverUrl,updated_at:new Date().toISOString(),
    }).select("*").single();
    if (error) throw databaseError(error);
    if (!saved) throw new Error("missing saved profile");
    committed = true;
    if (oldPaths.length) { try { await storage.remove(oldPaths); } catch { /* 保存済みプロフィールを維持する。 */ } }
    revalidatePath("/account");
    return {success:true,profile:profileFromRow(id,saved)};
  } catch (error) {
    if (!committed && uploaded.length && client) { try { await client.storage.from(PROFILE_IMAGE_BUCKET).remove(uploaded); } catch { /* 次の保存操作を妨げない。 */ } }
    return {success:false,error:error instanceof ProfileImageError || error instanceof DatabaseError ? error.message : "プロフィールを保存できませんでした。通信環境を確認してください。"};
  }
}
