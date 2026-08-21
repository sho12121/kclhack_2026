import type { Metadata } from "next";
import "./globals.css";
import "./preview.css";
import "./mobile-navigation.css";
import "./board-home.css";
import "./layout-refinement.css";
import { AppProvider } from "@/components/app-provider";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = { title: "ハナシネマ | 映画を語り合う", description: "同じ映画を好きな人と、同じ時間に語り合う。" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="ja"><body><AppProvider><SiteShell>{children}</SiteShell></AppProvider></body></html>; }
