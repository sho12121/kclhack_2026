export class ProfileImageError extends Error {}

export const PROFILE_IMAGE_BUCKET = "profile-images";
export const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

/** 拡張子やブラウザの申告だけに頼らず、ファイルのヘッダーも確認する。 */
export async function validateProfileImage(file: File): Promise<{extension:string; contentType:string}> {
  if (file.size > MAX_PROFILE_IMAGE_SIZE || file.size === 0) throw new ProfileImageError("画像は各2MB以下のPNG・JPEG・WebPを選んでください。");
  const data = new Uint8Array(await file.slice(0,12).arrayBuffer());
  if (data.length>=8 && [137,80,78,71,13,10,26,10].every((byte,index)=>data[index]===byte) && file.type==="image/png") return {extension:"png",contentType:"image/png"};
  if (data.length>=3 && data[0]===255 && data[1]===216 && data[2]===255 && file.type==="image/jpeg") return {extension:"jpg",contentType:"image/jpeg"};
  if (data.length>=12 && String.fromCharCode(...data.slice(0,4))==="RIFF" && String.fromCharCode(...data.slice(8,12))==="WEBP" && file.type==="image/webp") return {extension:"webp",contentType:"image/webp"};
  throw new ProfileImageError("PNG・JPEG・WebP形式の画像を選んでください。");
}

export function ownProfileImagePath(value: unknown, userId: string, supabaseUrl: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const prefix = `/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/${userId}/`;
    if (url.origin!==new URL(supabaseUrl).origin || url.search || url.hash || !url.pathname.startsWith(prefix)) return null;
    const filename = url.pathname.slice(prefix.length);
    return /^(avatar|cover)-[0-9a-f-]+\.(png|jpg|webp)$/i.test(filename) ? `${userId}/${filename}` : null;
  } catch {return null;}
}
