"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import styles from "./account.module.css";
import { UserProfile, UserPost, FavoriteMovie, ActivityItem } from "@/types/profile";
import { logout } from "@/app/login/actions";
import { updateProfile } from "@/app/account/actions";
import {
  MovieCameraLogo,
  HomeIcon,
  ChatIcon,
  FilmIcon,
  UsersIcon,
  UserIcon,
  SettingsIcon,
  BellIcon,
  SearchIcon,
  EditPencilIcon,
  HeartIcon,
  MessageCircleIcon,
  ChevronRightIcon,
  CalendarIcon,
  MapPinIcon,
  TagIcon,
  GenderIcon,
  ChevronDownIcon,
  CameraProjectorWatermark,
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

// 画像に基づいたサンプル投稿一覧データ
const initialPosts: UserPost[] = [
  {
    id: "p1",
    movieTitle: "君の名は。",
    tag: "映画の感想",
    title: "君の名は。について語りたい",
    content:
      "やっぱり何度見ても泣いてしまう...\n映像の美しさと、音楽の力がすごいです。みなさんはこの映画、どう感じましたか？",
    commentCount: 12,
    likeCount: 28,
    date: "2025/04/12",
    posterBg: "kiminonawa",
  },
  {
    id: "p2",
    movieTitle: "インセプション",
    tag: "映画の感想",
    title: "インセプションについて語ろう",
    content:
      "ラストの夢の世界のシーン、何度見ても鳥肌が立ちます。あの終わり方はどう解釈しましたか？自分はこう思います...",
    commentCount: 23,
    likeCount: 56,
    date: "2025/03/28",
    posterBg: "inception",
  },
  {
    id: "p3",
    movieTitle: "千と千尋の神隠し",
    tag: "映画の感想",
    title: "千と千尋の神隠し",
    content:
      "久しぶりに見返したら、やっぱりとても良かったです。千尋の成長がすごく好きで... みなさんの好きなシーンはどこですか？",
    commentCount: 15,
    likeCount: 42,
    date: "2025/02/17",
    posterBg: "chihiro",
  },
  {
    id: "p4",
    movieTitle: "ラ・ラ・ランド",
    tag: "映画の感想",
    title: "ラ・ラ・ランドについて語りたい",
    content:
      "音楽も映像も最高で、何度見ても心が揺さぶられます。ラストのシーンについて、みなさんはどう思いましたか？",
    commentCount: 31,
    likeCount: 67,
    date: "2025/01/10",
    posterBg: "lalaland",
  },
  {
    id: "p5",
    movieTitle: "THE BATMAN",
    tag: "映画の話題",
    title: "「THE BATMAN」の考察スレ",
    content:
      "ロバート・パティンソンのバットマン、めちゃくちゃ良かったですよね。あのラストの意味について考察してみたいです。",
    commentCount: 18,
    likeCount: 36,
    date: "2024/12/21",
    posterBg: "batman",
  },
];

// 好きな映画データ
const favoriteMovies: FavoriteMovie[] = [
  { id: "m1", title: "君の名は。", posterBg: "kiminonawa" },
  { id: "m2", title: "インセプション", posterBg: "inception" },
  { id: "m3", title: "千と千尋の神隠し", posterBg: "chihiro" },
  { id: "m4", title: "ラ・ラ・ランド", posterBg: "lalaland" },
];

// 最近のアクティビティデータ
const recentActivities: ActivityItem[] = [
  {
    id: "a1",
    iconBg: "lalaland",
    title: "「ラ・ラ・ランド」の掲示板にコメントしました",
    timeAgo: "2時間前",
  },
  {
    id: "a2",
    iconBg: "kiminonawa",
    title: "「君の名は。」の掲示板を立てました",
    timeAgo: "1日前",
  },
  {
    id: "a3",
    iconBg: "avatar",
    title: "ユーザー まいさんをフォローしました",
    timeAgo: "2日前",
  },
];

export type AccountViewProps = {
  initialProfile: UserProfile;
};

export function AccountView({ initialProfile }: AccountViewProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<"posts" | "favorites">("posts");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.success) {
        setProfile((prev) => ({
          ...prev,
          nickname: (formData.get("nickname") as string) || prev.nickname,
          bio: (formData.get("bio") as string) || prev.bio,
          gender: (formData.get("gender") as string) || prev.gender,
          birthDate: (formData.get("birthDate") as string) || prev.birthDate,
          location: (formData.get("location") as string) || prev.location,
          favoriteGenres: (formData.get("favoriteGenres") as string) || prev.favoriteGenres,
          motto: (formData.get("motto") as string) || prev.motto,
        }));
        setIsEditModalOpen(false);
      } else {
        alert(res.error || "プロフィールの更新に失敗しました。");
      }
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
    <div className={`account-page-root ${styles.accountPageRoot}`}>
      {/* 1. 上部ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.logoLink}>
            <MovieCameraLogo />
            <span className={styles.logoTitle}>ハナシネマ</span>
          </Link>
          <span className={styles.headerSubtitle}>
            映画について語りたい人が語り合える掲示板
          </span>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.searchBox}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="映画・ユーザーを検索"
              className={styles.searchInput}
              aria-label="映画・ユーザーを検索"
            />
          </div>

          <button
            type="button"
            className={styles.iconButton}
            aria-label="通知"
            onClick={() => alert("通知機能は現在準備中です。")}
          >
            <BellIcon />
          </button>

          <div className={styles.userMenuWrapper}>
            <button
              type="button"
              className={styles.userMenuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label="ユーザーメニュー"
            >
              <div className={styles.headerAvatar}>
                <TakashiAvatar />
              </div>
              <ChevronDownIcon />
            </button>

            {isMenuOpen && (
              <div className={styles.menuDropdown}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleOpenEdit();
                  }}
                >
                  <EditPencilIcon />
                  プロフィール編集
                </button>
                <form action={logout}>
                  <button
                    type="submit"
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. メインコンテンツエリア (3カラム) */}
      <div className={styles.layoutContainer}>
        {/* 2-A. 左サイドバー */}
        <aside className={styles.leftSidebar} aria-label="ナビゲーション">
          <nav className={styles.navGroup}>
            <Link href="/" className={styles.navLink}>
              <HomeIcon />
              <span>ホーム</span>
            </Link>
            <Link href="/" className={styles.navLink}>
              <ChatIcon />
              <span>トピックを探す</span>
            </Link>
            <Link href="/" className={styles.navLink}>
              <FilmIcon />
              <span>映画を探す</span>
            </Link>
            <Link href="/" className={styles.navLink}>
              <UsersIcon />
              <span>ユーザーを探す</span>
            </Link>
            <Link href="/account" className={`${styles.navLink} ${styles.navLinkActive}`}>
              <UserIcon />
              <span>マイページ</span>
            </Link>
            <Link href="/account" className={styles.navLink} onClick={(e) => { e.preventDefault(); handleOpenEdit(); }}>
              <SettingsIcon />
              <span>設定</span>
            </Link>
          </nav>

          <div className={styles.sidebarFooter}>
            <CameraProjectorWatermark />
            <p className={styles.sidebarTagline}>
              好きな映画の話で、<br />もっと広がる世界を。
            </p>
          </div>
        </aside>

        {/* 2-B. 中央メインカラム */}
        <main className={styles.centerColumn}>
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
              {initialPosts.map((post) => (
                <article key={post.id} className={styles.postCard}>
                  <div className={styles.postPoster}>
                    {renderPoster(post.posterBg, styles.postPoster)}
                  </div>
                  <div className={styles.postMain}>
                    <div className={styles.postHeaderRow}>
                      <h2 className={styles.postTitle}>{post.title}</h2>
                      <span className={styles.postBadge}>{post.tag}</span>
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                    <div className={styles.postFooter}>
                      <div className={styles.postMetaLeft}>
                        <span className={styles.metaItem}>
                          <MessageCircleIcon /> {post.commentCount}
                        </span>
                        <span className={styles.metaItem}>
                          <HeartIcon /> {post.likeCount}
                        </span>
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
        </main>

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
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>プロフィールを編集</h3>
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
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="edit-nickname">ニックネーム</label>
                <input
                  id="edit-nickname"
                  name="nickname"
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

