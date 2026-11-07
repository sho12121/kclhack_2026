import assert from "node:assert/strict";
import {test} from "node:test";
import {validateProfileImage,ownProfileImagePath,MAX_PROFILE_IMAGE_SIZE} from "../src/lib/profile-images.ts";
import {defaultProfileName,profileFromRow} from "../src/lib/profile.ts";
const id="11111111-1111-4111-8111-111111111111", origin="https://test.supabase.co";
test("プロフィール画像: PNGヘッダーと容量・形式を検証する",async()=>{
 const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13]);
 assert.equal((await validateProfileImage(new File([bytes],"icon.png",{type:"image/png"}))).extension,"png");
 await assert.rejects(validateProfileImage(new File(["<svg/>"],"icon.png",{type:"image/png"})));
 await assert.rejects(validateProfileImage(new File([new Uint8Array(MAX_PROFILE_IMAGE_SIZE+1)],"icon.png",{type:"image/png"})));
 await assert.rejects(validateProfileImage(new File([bytes],"icon.svg",{type:"image/svg+xml"})));
});
test("画像の削除: 本人・同じStorage・画像用ファイルだけを許可する",()=>{
 const path=`${id}/avatar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png`,url=`${origin}/storage/v1/object/public/profile-images/${path}`;
 assert.equal(ownProfileImagePath(url,id,origin),path);
 assert.equal(ownProfileImagePath(url,"22222222-2222-4222-8222-222222222222",origin),null);
 assert.equal(ownProfileImagePath(url.replace(origin,"https://evil.invalid"),id,origin),null);
 assert.equal(ownProfileImagePath(url+"?token=bad",id,origin),null);
});
test("ゲスト名は連番を使い、画像を消した後は古いmetadataへ戻さない",()=>{
 assert.equal(defaultProfileName("12","ゲスト"),"ゲスト#12");
 const profile=profileFromRow(id,{nickname:"名前",avatar_url:null,cover_url:null},{avatarUrl:"古い画像",coverUrl:"古い背景"});
 assert.equal(profile.avatarUrl,undefined);assert.equal(profile.coverUrl,undefined);
});
