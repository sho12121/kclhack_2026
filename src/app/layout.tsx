import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ハナシネマ | 映画について語る掲示板",
  description: "同じ映画を観た人と、感想を語り合う映画掲示板。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main">本文へ移動</a>
        <SiteHeader />
        <main id="main" className="main-container">{children}</main>
        <footer className="site-footer" aria-label="クレジット">
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
            <Image src="/tmdb-logo.svg" alt="TMDB" width={120} height={10} />
          </a>
          <p className="attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </footer>
      </body>
    </html>
  );
}
