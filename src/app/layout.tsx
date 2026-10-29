import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "ハナシネマ | 次に語りたい映画を探そう",
  description: "映画との出会いから、会話がはじまる。気になる作品を検索できる映画SNS。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main">本文へ移動</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="ハナシネマ ホーム">
            <span className="brand-mark" aria-hidden="true">◒</span>ハナシネマ
          </Link>
          <nav className="site-nav" aria-label="アカウント">
            <Link className="nav-link" href="/login">ログイン</Link>
            <Link className="nav-link" href="/account">プロフィール</Link>
          </nav>
        </header>
        <main id="main" className="main-container">{children}</main>
        <footer className="site-footer" aria-label="クレジット">
          <p className="footer-tagline">一本の映画から、話したいことがある。</p>
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
            <Image src="/tmdb-logo.svg" alt="TMDB" width={120} height={10} />
          </a>
          <p className="attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </footer>
      </body>
    </html>
  );
}
