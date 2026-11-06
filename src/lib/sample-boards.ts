import type { BoardSummary } from "@/types/board";

/** 発表・画面確認用の固定データ。実際の投稿やDBのレコードではない。 */
export const sampleBoards: BoardSummary[] = [
  {
    id: "sample-biohazard",
    createdAt: "2026-10-28T18:00:00+09:00",
    title: "【ネタバレ】新作バイオハザード観たやつ集合",
    movie: {
      tmdbId: 1423191,
      title: "バイオハザード（2026）",
      releaseDate: "2026-09-16",
      posterUrl: "/sample-posters/biohazard.jpg",
      genres: ["ホラー", "サイエンスフィクション", "アドベンチャー"],
    },
    capacity: 4,
    allowGuests: true, participantCount: 2,
    startsAt: "2026-10-30T20:00:00+09:00",
  },
  {
    id: "sample-chiikawa",
    createdAt: "2026-10-29T12:00:00+09:00",
    title: "映画でちいかわデビューした結果",
    movie: {
      tmdbId: 1586876,
      title: "映画ちいかわ 人魚の島のひみつ",
      releaseDate: "2026-07-24",
      posterUrl: "/sample-posters/chiikawa.jpg",
      genres: ["アニメーション", "ファミリー", "アドベンチャー", "ファンタジー"],
    },
    capacity: 6,
    allowGuests: true, participantCount: 4,
    startsAt: "2026-11-02T19:00:00+09:00",
  },
  {
    id: "sample-mamaseka",
    createdAt: "2026-10-30T15:00:00+09:00",
    title: "観終わったんだが余韻がすごい",
    movie: {
      tmdbId: 1675182,
      title: "ママがもうこの世界にいなくても 私の命の日記",
      releaseDate: "2026-10-02",
      posterUrl: "/sample-posters/mamaseka.jpg",
      genres: ["ファミリー", "ドラマ"],
    },
    capacity: null,
    allowGuests: true, participantCount: 3,
    startsAt: "2026-11-03T21:00:00+09:00",
  },
];
