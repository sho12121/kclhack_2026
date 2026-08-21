import { Suspense } from "react";
import { CreateBoardScreen } from "@/components/create-board-screen";

export default function NewBoardPage() {
  return <Suspense fallback={<p className="empty">読み込み中...</p>}><CreateBoardScreen /></Suspense>;
}
