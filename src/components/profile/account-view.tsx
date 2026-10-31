"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import styles from "./account.module.css";
import { UserProfile, UserPost, FavoriteMovie, ActivityItem } from "@/types/profile";
import { SiteSidebar } from "@/components/layout/site-sidebar";
import { updateProfile } from "@/app/account/actions";
import {
  ChatIcon,
  UserIcon,
  EditPencilIcon,
  ChevronRightIcon,
  CalendarIcon,
  MapPinIcon,
  TagIcon,
  GenderIcon,
} from "./icons";
import {
  CoverArtwork,
  TakashiAvatar,
  KimiNoNaWaPoster,
  InceptionPoster,
  SpiritedAwayPoster,
  LaLaLandPoster,
  BatmanPoster,
} from "./artworks";

const favoriteMovies: FavoriteMovie[] = [];
const recentActivities: ActivityItem[] = [];

export type AccountViewProps = {
  initialProfile: UserProfile;
  posts?: UserPost[];
  postsError?: string;
};

export function AccountView({ initialProfile, posts = [], postsError }: AccountViewProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<"posts" | "favorites">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [profileError, setProfileError] = useState<string | null>(null);

  // 編集フォーム状態
  const [editForm, setEditForm] = useState({
    nickname: profile.nickname,
    bio: profile.bio,
    gender: profile.gender,
    birthDate: profile.birthDate,
    location: profile.location,
    favoriteGenres: profile.favoriteGenres,
    motto: profile.motto,
  });

  const handleOpenEdit = () => {
    setProfileError(null);
    setEditForm({
      nickname: profile.nickname,
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
    const formData = new FormData(e.currentTarget);

    setProfileError(null);
    startTransition(async () => {
      try {
        const res = await updateProfile(formData);
        if (res.success && res.profile) {
          setProfile(res.profile);
          setIsEditModalOpen(false);
        } else setProfileError(res.error || "プロフィールを保存できませんでした。");
      } catch { setProfileError("通信に失敗しました。入力内容はそのままで、もう一度保存をお試しください。"); }
    });
  };

  // ポスターのレンダリングヘルパー
  const renderPoster = (type: string, className: string) => {
    switch (type) {
      case "kiminonawa":
        return <KimiNoNaWaPoster className={className} />;
      case "inception":
        return <InceptionPoster className={className} />;
      case "chihiro":
        return <SpiritedAwayPoster className={className} />;
      case "lalaland":
        return <LaLaLandPoster className={className} />;
      case "batman":
        return <BatmanPoster className={className} />;
      default:
        return <div className={className} style={{ backgroundColor: "#cbd5e1" }} />;
    }
  };

  return (
    <div className={styles.accountPageRoot}>
      {/* 2. メインコンテンツエリア (3カラム) */}
      <div className={styles.layoutContainer}>
        <SiteSidebar active="account" onEditProfile={handleOpenEdit} />

        {/* 2-B. 中央メインカラム */}
        <div className={styles.centerColumn}>
          {/* プロフィールヒーローカード */}
          <div className={styles.profileHeroCard}>
            <div className={styles.coverPhotoWrapper}>
              <CoverArtwork />
              <div className={styles.coverPhotoOverlay} />
            </div>

            <div className={styles.profileHeroBody}>
              <div className={styles.avatarHeaderRow}>
                <div className={styles.profileAvatar}>
                  <TakashiAvatar />
                </div>
                <button
                  type="button"
                  className={styles.editProfileButton}
                  onClick={handleOpenEdit}
                >
                  <EditPencilIcon />
                  <span>プロフィールを編集</span>
                </button>
              </div>

              <div className={styles.profileDetails}>
                <h1 className={styles.profileName}>{profile.nickname}</h1>
                <p className={styles.profileBio}>{profile.bio}</p>

                <div className={styles.followMetrics}>
                  <span>
                    フォロー <strong className={styles.followNumber}>{profile.followCount}</strong>
                  </span>
                  <span>
                    フォロワー <strong className={styles.followNumber}>{profile.followerCount}</strong>
                  </span>
                </div>
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
              投稿一覧
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
              className={`${styles.tabButton} ${activeTab === "favorites" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("favorites")}
            >
              お気に入り
            </button>
          </div>

          {/* タブコンテンツ */}
          {activeTab === "posts" ? (
            <div className={styles.postList}>
              {postsError && <p role="alert">{postsError}</p>}
              {!postsError && posts.length === 0 && <p>まだ会話への投稿はありません。</p>}
              {posts.map((post) => (
                <article key={post.id} className={styles.postCard}>
                  <div className={styles.postPoster}>
                    {renderPoster(post.posterBg, styles.postPoster)}
                  </div>
                  <div className={styles.postMain}>
                    <div className={styles.postHeaderRow}>
                      <h2 className={styles.postTitle}><Link href={`/boards/${post.boardId}`}>{post.title}</Link></h2>
                      <span className={styles.postBadge}>{post.tag}</span>
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                    <div className={styles.postFooter}>
                      <div className={styles.postMetaLeft}>
                        <span>{post.date}</span>
                      </div>
                      <ChevronRightIcon className={styles.postArrow} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.postList}>
              <div className={styles.postCard} style={{ justifyContent: "center", padding: "40px 20px", color: "#64748b" }}>
                <p>保存されたお気に入りの投稿はまだありません。</p>
              </div>
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
                <span className={styles.summaryValue}>{profile.nickname}</span>
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

          {/* 好きな映画 */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <h2 className={styles.sidebarCardTitle} style={{ margin: 0 }}>好きな映画</h2>
              <Link href="/" className={styles.moreLink}>
                もっと見る <ChevronRightIcon />
              </Link>
            </div>
            <p>お気に入り機能は準備中です。</p>
            <div className={styles.movieGrid}>
              {favoriteMovies.map((movie) => (
                <div key={movie.id} className={styles.movieGridItem}>
                  <div className={styles.moviePoster}>
                    {renderPoster(movie.posterBg, styles.moviePoster)}
                  </div>
                  <p className={styles.movieGridTitle}>{movie.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 最近のアクティビティ */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>最近のアクティビティ</h2>
            <p>会話への投稿は「投稿一覧」で確認できます。</p>
            <div className={styles.activityList}>
              {recentActivities.map((act) => (
                <div key={act.id} className={styles.activityItem}>
                  <div className={styles.activityAvatar}>
                    {act.iconBg === "avatar" ? (
                      <TakashiAvatar />
                    ) : (
                      renderPoster(act.iconBg, styles.activityAvatar)
                    )}
                  </div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityText}>{act.title}</p>
                    <span className={styles.activityTime}>{act.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 3. プロフィール編集モーダル */}
      {isEditModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalBox} role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 id="profile-edit-title" className={styles.modalTitle}>プロフィールを編集</h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsEditModalOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className={styles.modalForm}>
              {profileError && <p role="alert" style={{color: "#b91c1c"}}>{profileError}</p>}
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
                  onClick={() => setIsEditModalOpen(false)}
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

