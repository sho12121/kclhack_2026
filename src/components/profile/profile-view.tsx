export type ProfileViewProps = {
  profile: {
    displayName: string;
    bio: string;
  } | null;
};

/** プロフィールの表示だけを担当（下位互換用コンポーネント） */
export function ProfileView({ profile }: ProfileViewProps) {
  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title">マイプロフィール</h1>

      {!profile && <p>プロフィールはまだ設定されていません。</p>}

      <dl>
        <dt>表示名</dt>
        <dd>{profile?.displayName || "未設定"}</dd>
        <dt>自己紹介</dt>
        <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {profile?.bio || "自己紹介はまだありません。"}
        </dd>
      </dl>
    </section>
  );
}

export { AccountView } from "./account-view";
