"use client";

import Image from "next/image";
import { useState } from "react";
import type { Movie } from "@/types/movie";
import styles from "./movie-results.module.css";

export type MovieCardProps = { movie: Movie };

/** UI担当B: 映画1件の表示。画像なし・画像取得失敗にも対応する。 */
export function MovieCard({ movie }: MovieCardProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <article className={styles.card}>
      <div className={styles.poster}>
        {movie.posterUrl && movie.posterUrl !== failedUrl ? (
          <Image
            src={movie.posterUrl}
            alt={`${movie.title}のポスター`}
            fill
            sizes="(max-width: 600px) 45vw, (max-width: 900px) 29vw, 230px"
            onError={() => setFailedUrl(movie.posterUrl)}
          />
        ) : (
          <div className={styles.placeholder} aria-label="ポスター画像なし">
            <span aria-hidden="true">◒</span><span>NO POSTER</span>
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.movieTitle}>{movie.title}</h3>
        <p className={styles.releaseDate}>
          {movie.releaseDate ? <><time dateTime={movie.releaseDate}>{movie.releaseDate.replaceAll("-", "/")}</time> 公開</> : "公開日不明"}
        </p>
        <a className={styles.detailLink} href={`https://www.themoviedb.org/movie/${movie.tmdbId}`} target="_blank" rel="noreferrer">
          TMDBで作品を見る<span aria-hidden="true"> ↗</span><span className={styles.srOnly}>（新しいタブで開きます）</span>
        </a>
      </div>
    </article>
  );
}
