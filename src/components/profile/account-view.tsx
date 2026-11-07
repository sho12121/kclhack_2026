"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MAX_PROFILE_IMAGE_SIZE } from "@/lib/profile-images";
import styles from "./account.module.css";
import { UserProfile } from "@/types/profile";
import { SiteSidebar } from "@/components/layout/site-sidebar";
import { updateProfile } from "@/app/account/actions";
import type { BoardSummary } from "@/types/board";
import { SpoilerBadge } from "@/components/boards/spoiler-badge";
import { FavoriteButton } from "@/components/boards/favorite-button";
import { defaultProfileName } from "@/lib/profile";
import { formatBoardDate } from "@/lib/board-draft";
import {
  ChatIcon,
  UserIcon,
  EditPencilIcon,
  CalendarIcon,
  MapPinIcon,
  TagIcon,
  GenderIcon,
} from "./icons";
import { DefaultAvatar } from "./artworks";


export type AccountViewProps = {
  initialProfile: UserProfile;
  isGuest?: boolean;
  favoriteBoards?: BoardSummary[];
  favoritesError?: string;
  createdBoards?: BoardSummary[];
  boardsError?: string;
  followError?: string;
};

export function AccountView({ initialProfile, isGuest = false, favoriteBoards = [], favoritesError, createdBoards = [], boardsError, followError }: AccountViewProps) {
  const [removedFavoriteIds, setRemovedFavoriteIds] = useState<string[]>([]);
  const visibleFavorites = favoriteBoards.filter(board => !removedFavoriteIds.includes(board.id));
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<"posts" | "favorites">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [profileError, setProfileError] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  const closeEdit = () => { setIsEditModalOpen(false); setAvatarPreview(null); setCoverPreview(null); };
  function previewFile(event: React.ChangeEvent<HTMLInputElement>, kind: "avatar" | "cover") {
    const file = event.currentTarget.files?.[0];
    const setter = kind === "avatar" ? setAvatarPreview : setCoverPreview;
    if (!file) { setter(null); return; }
    if (!file.size || file.size > MAX_PROFILE_IMAGE_SIZE || !["image/png","image/jpeg","image/webp"].includes(file.type)) {
      event.currentTarget.value = ""; setter(null); setProfileError("各2MB以下のPNG・JPEG・WebPを選んでください。"); return;
    }
    setProfileError(null); setter(URL.createObjectURL(file));
  }

  // 編集フォーム状態
  const [editForm, setEditForm] = useState({
    nickname: profile.nickname || defaultProfileName(profile.userNumber),
    bio: profile.bio,
    gender: profile.gender,
    birthDate: profile.birthDate,
    location: profile.location,
    favoriteGenres: profile.favoriteGenres,
    motto: profile.motto,
  });

  const handleOpenEdit = () => {
    if (isGuest) return;
    setRemoveAvatar(false); setRemoveCover(false); setAvatarPreview(null); setCoverPreview(null);
    setProfileError(null);
    setEditForm({
      nickname: profile.nickname || defaultProfileName(profile.userNumber),
      bio: profile.bio,
      gender: profile.gender,
      birthDate: profile.birthDate,
      location: profile.location,
      favoriteGenres: profile.favoriteGenres,
      motto: profile.motto,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGuest) return;
    const formData = new FormData(e.currentTarget);

    setProfileError(null);
    startTransition(async () => {
      try {
        const res = await updateProfile(formData);
        if (res.success && res.profile) {
          setProfile({...res.profile,userNumber:profile.userNumber,followCount:profile.followCount,followerCount:profile.followerCount});
          closeEdit();
        } else setProfileError(res.error || "プロフィールを保存できませんでした。");
      } catch { setProfileError("通信に失敗しました。入力内容はそのままで、もう一度保存をお試しください。"); }
    });
  };

  return (
    <div className={styles.accountPageRoot}>
      {/* 2. メインコンテンツエリア (3カラム) */}
      <div className={styles.layoutContainer}>
        <SiteSidebar active="account" onEditProfile={isGuest ? undefined : handleOpenEdit} />

        {/* 2-B. 中央メインカラム */}
        <div className={styles.centerColumn}>
          {/* プロフィールヒーローカード */}
          <div className={styles.profileHeroCard}>
            <div className={styles.coverPhotoWrapper}>
              {profile.coverUrl && <Image src={profile.coverUrl} alt="プロフィール背景" fill sizes="(max-width: 640px) 100vw, 780px" unoptimized className={styles.profileImage} />}
            </div>

            <div className={styles.profileHeroBody}>
              <div className={styles.avatarHeaderRow}>
                <div className={styles.profileAvatar}>
                  {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="プロフィールアイコン" fill sizes="96px" unoptimized className={styles.profileImage} /> : <DefaultAvatar />}
                </div>
                {!isGuest && <button
                  type="button"
                  className={styles.editProfileButton}
                  onClick={handleOpenEdit}
                >
                  <EditPencilIcon />
                  <span>プロフィールを編集</span>
                </button>}
              </div>

              <div className={styles.profileDetails}>
                <h1 className={styles.profileName}>{profile.nickname || defaultProfileName(profile.userNumber)}</h1>
                {isGuest ? <p className={styles.profileBio}>ゲストのプロフィールは編集できません。</p> : profile.bio.trim() ? <p className={styles.profileBio}>{profile.bio}</p> : <button type="button" className={styles.profilePrompt} onClick={handleOpenEdit}>プロフィールを記入</button>}

                {!isGuest && <div className={styles.followMetrics}>
                  <Link href={`/users/${profile.id}?tab=following`}>フォロー <strong className={styles.followNumber}>{followError ? "—" : profile.followCount}</strong></Link>
                  <Link href={`/users/${profile.id}?tab=followers`}>フォロワー <strong className={styles.followNumber}>{followError ? "—" : profile.followerCount}</strong></Link>
                </div>}
                {followError && <p role="alert">{followError}</p>}
              </div>
            </div>
          </div>

          {/* タブバー */}
          <div className={styles.tabsContainer} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "posts"}
              className={`${styles.tabButton} ${activeTab === "posts" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("posts")}
            >
              作成した掲示板
            </button>
            {!isGuest && <button
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
              className={`${styles.tabButton} ${activeTab === "favorites" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("favorites")}
            >
              お気に入り
            </button>}
          </div>

          {/* タブコンテンツ */}
          {activeTab === "posts" ? (
            <div className={styles.postList}>
              {boardsError && <p role="alert">{boardsError}</p>}
              {!boardsError && !createdBoards.length && <p>まだ作成した掲示板はありません。</p>}
              {createdBoards.map(board => <article key={board.id} className={styles.postCard}>
                <div className={styles.postMain}>
                  <SpoilerBadge show={board.hasSpoilers} /><h2 className={styles.postTitle}><Link href={`/boards/${board.id}`}>{board.title}</Link></h2>
                  <p>{board.movie.title}</p>
                  <p className={styles.postContent}>参加者 {board.participantCount}人 ／ 定員 {board.capacity === null ? "制限なし" : `${board.capacity}人`}</p>
                  <div className={styles.postFooter}><span>開始日時：{formatBoardDate(board.startsAt)}</span></div>
                </div>
              </article>)}
            </div>
          ) : (
            <div className={styles.postList}>
              {favoritesError && <p role="alert">{favoritesError}</p>}
              {!favoritesError && !visibleFavorites.length && <p>お気に入りの掲示板はまだありません。掲示板の「お気に入りに登録」から追加できます。</p>}
              {visibleFavorites.map(board => <article key={board.id} className={styles.postCard}>
                <div className={styles.postMain}>
                  <SpoilerBadge show={board.hasSpoilers} /><h2 className={styles.postTitle}><Link href={`/boards/${board.id}`}>{board.title}</Link></h2>
                  <p>{board.movie.title}</p>
                  <FavoriteButton boardId={board.id} initialFavorite onChange={favorite => { if (!favorite) setRemovedFavoriteIds(ids => [...ids, board.id]); }} />
                </div>
              </article>)}
            </div>
          )}
        </div>

        {/* 2-C. 右サイドバー */}
        <aside className={styles.rightSidebar} aria-label="ユーザー情報サマリー">
          {/* プロフィール概要 */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>プロフィール概要</h2>
            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <UserIcon className={styles.summaryIcon} />
                <span className={styles.summaryLabel}>ニックネーム</span>
                <span className={styles.summaryValue}>{profile.nickname || defaultProfileName(profile.userNumber)}</span>
              </div>
              <div className={styles.summaryItem}>
                <GenderIcon className={styles.summaryIcon} />
                <span className={styles.summaryLabel}>性別</span>
                <span className={styles.summaryValue}>{profile.gender}</span>
              </div>
              <div className={styles.summaryItem}>
                <CalendarIcon className={styles.summaryIcon} />
                <span className={styles.summaryLabel}>生年月日</span>
                <span className={styles.summaryValue}>{profile.birthDate}</span>
              </div>
              <div className={styles.summaryItem}>
                <MapPinIcon className={styles.summaryIcon} />
                <span className={styles.summaryLabel}>居住地</span>
                <span className={styles.summaryValue}>{profile.location}</span>
              </div>
              <div className={styles.summaryItem}>
                <TagIcon className={styles.summaryIcon} />
                <span className={styles.summaryLabel}>好きなジャンル</span>
                <span className={styles.summaryValue}>{profile.favoriteGenres}</span>
              </div>
              <div className={styles.summaryItem}>
                <ChatIcon className={styles.summaryIcon} />
                <span className={styles.summaryLabel}>ひとこと</span>
                <span className={styles.summaryValue}>{profile.motto}</span>
              </div>
            </div>
          </div>

          {/* 最近のアクティビティ */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>最近のアクティビティ</h2>
            <p>作成した掲示板は「作成した掲示板」タブで確認できます。</p>

          </div>
        </aside>
      </div>

      {/* 3. プロフィール編集モーダル */}
      {!isGuest && isEditModalOpen && (
        <div className={styles.modalBackdrop} onClick={closeEdit}>
          <div className={styles.modalBox} role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 id="profile-edit-title" className={styles.modalTitle}>プロフィールを編集</h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeEdit}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className={styles.modalForm}>
              {profileError && <p role="alert" style={{color: "#b91c1c"}}>{profileError}</p>}
              <p className={styles.imageHelp}>PNG・JPEG・WebP、各2MBまで。画像は公開画像として保存します。</p>
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-avatar">アイコン画像</label>
                <div className={styles.avatarPreview}>{!removeAvatar && (avatarPreview || profile.avatarUrl) ? <Image src={avatarPreview || profile.avatarUrl!} alt="アイコンのプレビュー" width={72} height={72} unoptimized className={styles.profileImage} /> : <DefaultAvatar />}</div>
                <input id="edit-avatar" name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" disabled={isPending || removeAvatar} onChange={event=>previewFile(event,"avatar")} />
                <label className={styles.imageReset}><input type="checkbox" name="removeAvatar" checked={removeAvatar} onChange={event=>setRemoveAvatar(event.target.checked)} disabled={isPending} />初期アイコンに戻す</label>
              </div>
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-cover">背景画像</label>
                <div className={styles.coverPreview}>{!removeCover && (coverPreview || profile.coverUrl) && <Image src={coverPreview || profile.coverUrl!} alt="背景のプレビュー" fill sizes="400px" unoptimized className={styles.profileImage} />}</div>
                <input id="edit-cover" name="coverFile" type="file" accept="image/png,image/jpeg,image/webp" disabled={isPending || removeCover} onChange={event=>previewFile(event,"cover")} />
                <label className={styles.imageReset}><input type="checkbox" name="removeCover" checked={removeCover} onChange={event=>setRemoveCover(event.target.checked)} disabled={isPending} />初期背景に戻す</label>
              </div>
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-nickname">ニックネーム</label>
                <input
                  id="edit-nickname"
                  name="nickname"
                  maxLength={40}
                  type="text"
                  required
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  className={styles.inputControl}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-bio">自己紹介</label>
                <textarea
                  id="edit-bio"
                  name="bio"
                  maxLength={1000}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className={styles.textareaControl}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-gender">性別</label>
                <input
                  id="edit-gender"
                  name="gender"
                  maxLength={30}
                  type="text"
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className={styles.inputControl}
                  placeholder="男性 / 女性 / その他"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-birthDate">生年月日</label>
                <input
                  id="edit-birthDate"
                  name="birthDate"
                  maxLength={10}
                  type="text"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className={styles.inputControl}
                  placeholder="例: 2005/04/12"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-location">居住地</label>
                <input
                  id="edit-location"
                  name="location"
                  maxLength={80}
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className={styles.inputControl}
                  placeholder="例: 福岡"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-genres">好きなジャンル</label>
                <input
                  id="edit-genres"
                  name="favoriteGenres"
                  maxLength={200}
                  type="text"
                  value={editForm.favoriteGenres}
                  onChange={(e) => setEditForm({ ...editForm, favoriteGenres: e.target.value })}
                  className={styles.inputControl}
                  placeholder="例: 邦画 / 洋画 / アニメ / ドラマ"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-motto">ひとこと</label>
                <input
                  id="edit-motto"
                  name="motto"
                  maxLength={120}
                  type="text"
                  value={editForm.motto}
                  onChange={(e) => setEditForm({ ...editForm, motto: e.target.value })}
                  className={styles.inputControl}
                  placeholder="映画で出会った感動を誰かと共有したいです！"
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeEdit}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={styles.saveButton}
                >
                  {isPending ? "保存中..." : "保存する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

