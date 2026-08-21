"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "./app-provider";
import { MoviePoster } from "./board-card";
import type { Visibility } from "@/lib/types";

const standardCapacities = [2, 3, 4, 5] as const;

export function CreateBoardScreen() {
  const { movies, createBoard } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const [movieId, setMovieId] = useState(params.get("movieId") ?? movies[0].id);
  const [startAt, setStartAt] = useState("2026-08-30T20:00");
  const [capacity, setCapacity] = useState(4);
  const [customCapacity, setCustomCapacity] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const movie = movies.find((item) => item.id === movieId)!;
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!startAt || capacity < 2 || capacity > 10 || !description.trim()) return; const boardId = createBoard(movieId, startAt, capacity, visibility, description.trim()); router.push(`/boards/${boardId}`); };
  return <section className="content-narrow"><p className="eyebrow">CREATE A BOARD</p><h1 className="page-title">語り合い板を作る</h1><form className="form-card" onSubmit={submit}><label>映画<select value={movieId} onChange={(event) => setMovieId(event.target.value)}>{movies.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><div className="selected-movie"><MoviePoster title={movie.title} compact /><span><strong>{movie.title}</strong><small>{movie.releaseDate} 公開</small></span></div><label>開始日時<input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required /></label><fieldset className="capacity-field"><legend>定員</legend><div className="capacity-options">{standardCapacities.map((count) => <label className="capacity-option" key={count}><input type="radio" name="capacity" checked={!customCapacity && capacity === count} onChange={() => { setCapacity(count); setCustomCapacity(false); }} /><span>{count}人</span></label>)}<label className="capacity-option"><input type="radio" name="capacity" checked={customCapacity} onChange={() => { setCustomCapacity(true); if (capacity < 6) setCapacity(6); }} /><span>6人以上</span></label></div>{customCapacity && <label className="custom-capacity">人数（最大10人）<input type="number" min="6" max="10" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} required /></label>}</fieldset><label>どんなことを語りたいですか？<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="例：ラストシーンについて、みんながどう感じたか聞きたいです。" rows={4} required /></label><fieldset><legend>公開設定</legend><label className="radio"><input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} /> <span><strong>🔒 非公開</strong><small>参加者だけが会話を閲覧できます</small></span></label><label className="radio"><input type="radio" checked={visibility === "public"} onChange={() => setVisibility("public")} /> <span><strong>🔓 公開</strong><small>将来的に会話を公開できます</small></span></label></fieldset><button className="button primary" type="submit">板を作成する <span>→</span></button></form></section>;
}
