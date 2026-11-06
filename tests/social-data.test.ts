import assert from "node:assert/strict";
import {test} from "node:test";
import {parsePublicProfile,parseInbox} from "../src/lib/social-data.ts";
import {safeAuthRedirect} from "../src/lib/auth-redirect.ts";
const id="11111111-1111-4111-8111-111111111111";
test("公開プロフィール: 生年月日や居住地などの余分な項目をクライアントへ渡さない",()=>{
 const profile=parsePublicProfile({id,nickname:"映画好き",bio:"自己紹介",favoriteGenres:"アニメ",motto:"映画を語ろう",followCount:1,followerCount:2,isFollowing:false,birthDate:"2000-01-01",location:"非公開",gender:"非公開"});
 assert.deepEqual(Object.keys(profile).sort(),["id","nickname","bio","favoriteGenres","motto","followCount","followerCount","isFollowing"].sort());
 assert.equal(profile.followCount,1);
 assert.throws(()=>parsePublicProfile({...profile,followCount:-1}));
 assert.throws(()=>parsePublicProfile({...profile,id:"https://evil.invalid"}));
});
test("通知: ID・種類・リンク先を検証し、本文や秘密項目を転送しない",()=>{
 const item={id:"9223372036854775807",kind:"follow",actorId:id,actorName:"映画好き",boardId:null,boardTitle:null,createdAt:"2026-11-06T00:00:00Z",readAt:null};
 const inbox=parseInbox({unreadCount:1,items:[{...item,privateContent:"非公開"}]});
 assert.equal(inbox.items[0].id,item.id);assert.equal("privateContent" in inbox.items[0],false);
 for (const bad of [{...item,kind:"unexpected"},{...item,boardId:"//evil.invalid"},{...item,id:1}])assert.throws(()=>parseInbox({unreadCount:1,items:[bad]}));
});
test("ログイン後の戻り先: 通知・公開プロフィールに戻り、任意のURLは拒否する",()=>{
 for(const path of ["/notifications","/users",`/users/${id}`])assert.equal(safeAuthRedirect(path),path);
 for(const path of ["/users/../../admin",`/users/${id}?next=https://evil.invalid`,"//evil.invalid","/notifications/../admin"])assert.equal(safeAuthRedirect(path),"/account");
});

test("招待通知: 掲示板への移動先を保持し、削除済みの掲示板も扱う", () => {
 const item={id:"1",kind:"board_invitation",actorId:id,actorName:"映画好き",boardId:id,boardTitle:"映画の感想",createdAt:"2026-11-06T00:00:00Z",readAt:null};
 assert.equal(parseInbox({unreadCount:1,items:[item]}).items[0].kind,"board_invitation");
 assert.equal(parseInbox({unreadCount:1,items:[{...item,boardId:null}]}).items[0].boardId,null);
});

test("返信通知の本文・移動先: 正しい型だけを転送する", () => {
 const item={id:"1",kind:"comment_reply",actorId:id,actorName:"相手",boardId:id,boardTitle:"会話",messageId:"9007199254740993",messagePreview:"返信の本文",createdAt:"2026-11-06T00:00:00Z",readAt:null};
 const parsed=parseInbox({unreadCount:1,items:[item]}).items[0];
 assert.equal(parsed.messageId,item.messageId);assert.equal(parsed.messagePreview,"返信の本文");
 assert.throws(()=>parseInbox({unreadCount:1,items:[{...item,messageId:123}]}));
 assert.throws(()=>parseInbox({unreadCount:1,items:[{...item,messagePreview:{}}]}));
 assert.equal(safeAuthRedirect(`/boards/${id}?message=9007199254740993`),`/boards/${id}?message=9007199254740993`);
 assert.equal(safeAuthRedirect(`/boards/${id}?message=9223372036854775808`),"/account");
 assert.equal(safeAuthRedirect(`/boards/${id}?message=1&next=https://evil.invalid`),"/account");
});
