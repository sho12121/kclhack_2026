"use client";

import Image from "next/image";
import { SpoilerBadge } from "./spoiler-badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBoard } from "@/app/boards/actions";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { CalendarIcon, ClockIcon } from "@/components/ui/icons";
import { MovieSearch } from "@/components/movies/movie-search";
import { formatBoardDate, shiftBoardDate, MAX_BOARD_CAPACITY, MAX_BOARD_TITLE_LENGTH, MIN_BOARD_CAPACITY, validateBoardDraft, validateBoardStartDateTime } from "@/lib/board-draft";
import type { BoardDraft } from "@/types/board";
import type { PublicProfile } from "@/types/social";
import type { Movie } from "@/types/movie";
import { isGeneralAudience } from "@/lib/movie-certification";
import styles from "./board-create-form.module.css";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 日本時間（JST）ベースの日付文字列を生成する (YYYY-MM-DD) */
function formatToJstDateString(d: Date): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const yyyy = parts.find((p) => p.type === "year")?.value ?? String(d.getFullYear());
  const mm = parts.find((p) => p.type === "month")?.value ?? pad2(d.getMonth() + 1);
  const dd = parts.find((p) => p.type === "day")?.value ?? pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

/** 日本語フォーマット（YYYY年MM月DD日 (曜日)） */
function formatJapaneseDateDisplay(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 15, 0, 0)); // JST相当
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = days[dateObj.getUTCDay()];
  return `${y}年${m}月${d}日 (${dayOfWeek})`;
}

/** ドロップダウンと直接入力が1つに統合されたコンボボックスコンポーネント */
type IntegratedNumberDropdownProps = {
  id: string;
  label: string;
  unit: string;
  value: string;
  max: number;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
};

function IntegratedNumberDropdown({
  id,
  label,
  unit,
  value,
  max,
  options,
  onChange,
}: IntegratedNumberDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    function handleOutsideClick(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("pointerdown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + delta + options.length) % options.length);
    } else if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      onChange(options[activeIndex].value);
      setIsOpen(false);
    }
  }

  const formattedCurrent = value.trim() === "" ? "" : pad2(Number(value));

  return (
    <div className={styles.comboContainer} ref={containerRef} onKeyDown={handleKeyDown}
      onBlur={(event) => {
        // タッチで候補やスクロール領域に触れるとrelatedTargetがnullになる。
        // その場合は閉じず、外側へのpointerdownで閉じる。
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}>
      <div className={styles.comboInputBox}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={value}
          className={styles.comboInput}
          aria-label={label}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={isOpen ? `${id}-options` : undefined}
          aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onFocus={() => {
            setActiveIndex(Math.max(0, options.findIndex((option) => option.value === formattedCurrent)));
            setIsOpen(true);
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (raw === "") {
              onChange("");
              return;
            }
            const num = Number(raw);
            if (num <= max) {
              onChange(raw);
            }
          }}
          onBlur={() => {
            if (value.trim() !== "") {
              onChange(pad2(Number(value)));
            }
          }}
        />
        <button
          type="button"
          className={styles.comboArrowBtn}
          aria-label={`${label}の選択肢を開く`}
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-options` : undefined}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          ▾
        </button>
      </div>
      <span className={styles.comboUnitLabel}>{unit}</span>

      {isOpen && (
        <ul id={`${id}-options`} className={styles.comboDropdown} role="listbox" aria-label={`${label}の候補一覧`}
          onMouseDown={event => event.preventDefault()}>
          {options.map((opt, index) => (
            <li
              key={opt.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={opt.value === formattedCurrent}
              className={`${styles.comboOption} ${index === activeIndex ? styles.comboOptionSelected : ""}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.value === formattedCurrent && <span aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 時間（時）の候補
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const val = pad2(i);
  let extra = "";
  if (i === 23) extra = "（深夜）";
  else if (i === 12) extra = "（正午）";
  else if (i === 18) extra = "（夕方）";
  else if (i === 20) extra = "（夜）";
  return { value: val, label: `${val}時 ${extra}` };
});

// 分（分）の候補
const MINUTE_OPTIONS = [
  { value: "59", label: "59分" },
  { value: "00", label: "00分（ちょうど）" },
  { value: "15", label: "15分" },
  { value: "30", label: "30分（半）" },
  { value: "45", label: "45分" },
  ...Array.from({ length: 12 }, (_, i) => {
    const val = pad2(i * 5);
    if (["00", "15", "30", "45"].includes(val)) return null;
    return { value: val, label: `${val}分` };
  }).filter((item): item is { value: string; label: string } => item !== null),
].sort((a, b) => Number(a.value) - Number(b.value));

export function BoardCreateForm({ initialNow, inviteCandidates = [], invitationError = "", canInvite = false }: {
  initialNow: number; inviteCandidates?: PublicProfile[]; invitationError?: string; canInvite?: boolean;
}) {
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const id = useId();
  const [title, setTitle] = useState("");
  const [movie, setMovie] = useState<Movie | null>(null);
  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 定員（スライダー・ステッパー・テキスト入力連動）
  const [capacity, setCapacity] = useState("4");
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(false);
  const [allowGuests, setAllowGuests] = useState(true);
  const [hasSpoilers, setHasSpoilers] = useState(false);

  const [startImmediately, setStartImmediately] = useState(false);

  // 開始日時（初期値: 7日後の23時59分）
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(initialNow + 7 * 24 * 60 * 60 * 1000);
    return formatToJstDateString(d);
  });
  const [selectedHour, setSelectedHour] = useState("23");
  const [selectedMinute, setSelectedMinute] = useState("59");

  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardDraft | null>(null);
  const [isCreating, startCreating] = useTransition();
  const [requestId, setRequestId] = useState("");
  const router = useRouter();

  // サーバーから受け取った時刻を使い、初回描画を一致させる。
  const todayStr = formatToJstDateString(new Date(now));

  // 定員のバリデーション
  const capacityNum = Number(capacity);
  const isCapacityValid =
    capacity.trim() !== "" &&
    Number.isInteger(capacityNum) &&
    capacityNum >= MIN_BOARD_CAPACITY &&
    capacityNum <= MAX_BOARD_CAPACITY;

  // 開始日時の整形とバリデーション
  const formattedHour = selectedHour.trim() === "" ? "" : pad2(Number(selectedHour));
  const formattedMinute = selectedMinute.trim() === "" ? "" : pad2(Number(selectedMinute));
  const fullStartDateTime = `${selectedDate}T${formattedHour}:${formattedMinute}`;
  const dateTimeError = startImmediately ? null : validateBoardStartDateTime(fullStartDateTime, now);

  const isFormValid = (unlimitedCapacity || isCapacityValid) && !dateTimeError;

  function invalidatePreview() {
    setPreview(null);
    setRequestId("");
    setError(null);
  }

  function handleCapacityChange(val: string) {
    setCapacity(val);
    invalidatePreview();
  }

  function handleStepCapacity(delta: number) {
    const current = isCapacityValid ? capacityNum : 4;
    const next = Math.min(MAX_BOARD_CAPACITY, Math.max(MIN_BOARD_CAPACITY, current + delta));
    setCapacity(String(next));
    invalidatePreview();
  }

  function shiftSelectedDate(amount: number, unit: "days" | "months") {
    const target = shiftBoardDate(selectedDate, amount, unit);
    if (!target || target < todayStr) return;
    setSelectedDate(target);
    invalidatePreview();
  }

  // 現在選択中の日付が今日から何日後かを計算
  let daysDiffFromToday = 0;
  if (selectedDate && todayStr) {
    const t0 = Date.parse(`${todayStr}T00:00:00+09:00`);
    const tSel = Date.parse(`${selectedDate}T00:00:00+09:00`);
    if (Number.isFinite(t0) && Number.isFinite(tSel)) {
      daysDiffFromToday = Math.round((tSel - t0) / (24 * 60 * 60 * 1000));
    }
  }

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!unlimitedCapacity && !isCapacityValid) {
      setError(`定員は${MIN_BOARD_CAPACITY}〜${MAX_BOARD_CAPACITY}人で入力してください。`);
      return;
    }

    const result = validateBoardDraft({
      title,
      movie,
      capacity: unlimitedCapacity ? "unlimited" : capacity,
      startDateTime: fullStartDateTime,
      allowGuests, hasSpoilers, startImmediately,
    });
    setError(result.error);
    setPreview(result.draft);
    setRequestId(result.draft ? crypto.randomUUID() : "");
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-heading`}>
      <div className={styles.heading}>
        <h2 id={`${id}-heading`}>掲示板を作成</h2>
        <Link href="/" className={styles.closeLink} aria-label="作成を閉じる">
          閉じる
        </Link>
      </div>
      <p className={styles.panelDescription}>
        タイトル・映画・定員・開始日時を設定できます。確認後に作成ボタンを押せます。作成すると掲示板一覧に公開されます。会話の本文は参加者だけが閲覧できます。
      </p>

      {/* タイトル入力 */}
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor={`${id}-title`}>掲示板のタイトル</label>
          <span className={styles.requiredBadge}>必須</span>
        </div>
        <input
          id={`${id}-title`}
          form={`${id}-form`}
          name="title"
          required
          maxLength={MAX_BOARD_TITLE_LENGTH}
          value={title}
          placeholder="例：この映画のラストについて話したい"
          onChange={(event) => {
            setTitle(event.target.value);
            invalidatePreview();
          }}
        />
        <small className={styles.fieldHelp}>最大{MAX_BOARD_TITLE_LENGTH}文字まで入力できます。</small>
      </div>

      {/* 映画選択 */}
      <fieldset className={styles.moviePicker}>
        <legend className={styles.legend}>
          話したい映画 <span className={styles.requiredBadge}>必須</span>
        </legend>

        {movie ? (
          <div className={styles.selectedMovieCard}>
            <div className={styles.selectedPosterWrapper}>
              {movie.posterUrl && movie.posterUrl !== failedPosterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt={`${movie.title}のポスター`}
                  fill
                  sizes="(max-width: 600px) 74px, 88px"
                  className={styles.selectedPosterImg}
                  onError={() => setFailedPosterUrl(movie.posterUrl)}
                />
              ) : (
                <div className={styles.selectedPosterPlaceholder} aria-label="ポスター画像なし">
                  <span aria-hidden="true" className={styles.placeholderIcon}>◒</span>
                  <span className={styles.placeholderText}>NO POSTER</span>
                </div>
              )}
            </div>

            <div className={styles.selectedMovieInfo}>
              <div className={styles.selectedStatusRow} role="status">
                <span className={styles.selectedBadge}>選択中</span>
                {movie.releaseDate && (
                  <span className={styles.selectedReleaseDate}>
                    {movie.releaseDate.replaceAll("-", "/")} 公開
                  </span>
                )}
                {movie.certification && <span className={styles.selectedBadge}>{movie.certification}</span>}
              </div>
              <h3 className={styles.selectedMovieTitle}>
                <span className={styles.selectedLabelText}>選択中：</span>{movie.title}
              </h3>
              <div className={styles.selectedMovieActions}>
                <button
                  className={styles.secondarySmall}
                  type="button"
                  aria-expanded={isSearchOpen}
                  aria-controls={`${id}-search`}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                >
                  {isSearchOpen ? "映画検索を閉じる" : "映画を選び直す"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.unselectedMovieBox}>
            <div className={styles.unselectedContent}>
              <span className={styles.unselectedIcon} aria-hidden="true">🎬</span>
              <div>
                <p role="status" className={styles.unselectedText}>映画が選択されていません。</p>
                <p className={styles.unselectedSubtext}>掲示板のテーマにする映画を検索して選択してください。</p>
              </div>
            </div>
            <button
              className={styles.secondary}
              type="button"
              aria-expanded={isSearchOpen}
              aria-controls={`${id}-search`}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              {isSearchOpen ? "映画検索を閉じる" : "映画を検索する"}
            </button>
          </div>
        )}

        <div id={`${id}-search`} className={styles.searchContainer} hidden={!isSearchOpen}>
            <div className={styles.searchInner}>
              <div className={styles.searchHeader}>
                <h4>映画を検索して選択</h4>
                <p>キーワードを入力して作品を検索してください。</p>
              </div>
              <MovieSearch
                selectedMovieId={movie?.tmdbId}
                onRestrictedChange={(includeRestricted) => {
                  if (!includeRestricted && movie?.certification && !isGeneralAudience(movie.certification)) {
                    setMovie(null);
                    invalidatePreview();
                  }
                }}
                onSelect={(selected) => {
                  setMovie(selected);
                  setFailedPosterUrl(null);
                  setIsSearchOpen(false);
                  invalidatePreview();
                }}
              />
            </div>
        </div>
      </fieldset>

      {/* 掲示板作成フォーム */}
      <form id={`${id}-form`} onSubmit={handleConfirm}>
        <div className={styles.field}>
          <button type="button" className={styles.spoilerToggle} aria-pressed={hasSpoilers} disabled={isCreating} onClick={() => { setHasSpoilers(value => !value); invalidatePreview(); }}>ネタバレ注意</button>
          <small className={styles.fieldHelp}>{hasSpoilers ? "掲示板に「ネタバレ」と表示します。" : "映画の内容や結末に触れる場合はオンにしてください。"}</small>
        </div>
        <fieldset className={styles.invitationPicker} disabled={isCreating}>
          <legend>フォロー中のユーザーを招待（任意）</legend>
          <p className={styles.fieldHelp}>相手に通知が届きます。参加は相手が選び、定員の枠は予約されません。</p>
          {!canInvite ? <p className={styles.fieldHelp}>招待には通常アカウントでのログインが必要です。</p>
            : invitationError ? <p role="alert">{invitationError}</p>
            : !inviteCandidates.length ? <p className={styles.fieldHelp}>フォロー中のユーザーはいません。掲示板で出会った人のプロフィールからフォローできます。</p>
            : <><div className={styles.invitationOptions}>{inviteCandidates.map(person => <label key={person.id} className={styles.unlimitedOption}>
              <input type="checkbox" checked={inviteeIds.includes(person.id)} onChange={event => {
                setInviteeIds(ids => event.target.checked ? [...ids, person.id] : ids.filter(value => value !== person.id));
                invalidatePreview();
              }} />{person.nickname}
            </label>)}</div><small className={styles.fieldHelp}>候補は最大50人表示します。選択中：{inviteeIds.length}人</small></>}
        </fieldset>
        <div className={styles.field}>
          <label className={styles.unlimitedOption}>
            <input type="checkbox" checked={allowGuests} onChange={event => {
              setAllowGuests(event.target.checked);
              invalidatePreview();
            }} />
            ゲストユーザーの参加を受け入れる
          </label>
          <small className={styles.fieldHelp}>オフにすると、通常アカウントでログインした人だけが参加できます。ゲストとして作成する場合はオンにしてください。</small>
        </div>
        {/* 定員設定（スライダー・ステッパー・テキスト入力連動） */}
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor={`${id}-capacity`}>定員（作成者を含む）</label>
            <span className={styles.requiredBadge}>必須</span>
          </div>

          <label className={styles.unlimitedOption}>
            <input type="checkbox" checked={unlimitedCapacity} onChange={(event) => {
              setUnlimitedCapacity(event.target.checked);
              invalidatePreview();
            }} />
            制限なし
          </label>
          <fieldset className={styles.capacityFields} disabled={unlimitedCapacity}>
          <div className={styles.capacityControl}>
            {/* ステッパー ＆ テキスト入力 */}
            <div className={styles.stepperGroup}>
              <button
                type="button"
                className={styles.stepButton}
                aria-label="定員を1人減らす"
                disabled={!isCapacityValid || capacityNum <= MIN_BOARD_CAPACITY}
                onClick={() => handleStepCapacity(-1)}
              >
                −
              </button>

              <div className={styles.capacityInputWrap}>
                <input
                  id={`${id}-capacity`}
                  name="capacity"
                  type="number"
                  required
                  min={MIN_BOARD_CAPACITY}
                  max={MAX_BOARD_CAPACITY}
                  step="1"
                  value={capacity}
                  className={styles.capacityInput}
                  aria-invalid={!isCapacityValid}
                  aria-describedby={`${id}-capacity-help${!isCapacityValid ? ` ${id}-capacity-error` : ""}`}
                  onChange={(event) => handleCapacityChange(event.target.value)}
                />
                <span className={styles.capacityUnit}>人</span>
              </div>

              <button
                type="button"
                className={styles.stepButton}
                aria-label="定員を1人増やす"
                disabled={!isCapacityValid || capacityNum >= MAX_BOARD_CAPACITY}
                onClick={() => handleStepCapacity(1)}
              >
                ＋
              </button>
            </div>

            {/* スライダー */}
            <div className={styles.sliderWrap}>
              <input
                type="range"
                min={MIN_BOARD_CAPACITY}
                max={MAX_BOARD_CAPACITY}
                step="1"
                value={isCapacityValid ? capacityNum : Math.min(MAX_BOARD_CAPACITY, Math.max(MIN_BOARD_CAPACITY, Number(capacity) || MIN_BOARD_CAPACITY))}
                className={styles.capacitySlider}
                aria-label="定員スライダー"
                onChange={(event) => handleCapacityChange(event.target.value)}
              />
              <div className={styles.sliderLabels}>
                <span>{MIN_BOARD_CAPACITY}人（最小）</span>
                <span>10人</span>
                <span>{MAX_BOARD_CAPACITY}人（最大）</span>
              </div>
            </div>
          </div>

          </fieldset>
          <small id={`${id}-capacity-help`} className={styles.fieldHelp}>
            制限なし、または{MIN_BOARD_CAPACITY}〜{MAX_BOARD_CAPACITY}人から選べます。
          </small>

          {!unlimitedCapacity && !isCapacityValid && (
            <p id={`${id}-capacity-error`} role="alert" className={styles.fieldError}>
              ⚠️ 定員は{MIN_BOARD_CAPACITY}〜{MAX_BOARD_CAPACITY}人の範囲で入力してください（それ以外の数字では作成できません）。
            </p>
          )}
        </div>

        {/* 開始日時設定 */}
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.blockTitle}>掲示板の開始</span>
            <span className={styles.requiredBadge}>必須</span>
          </div>

          {/* 送信用 hidden input */}
          <input
            id={`${id}-starts`}
            name="startDateTime"
            type="hidden"
            value={fullStartDateTime}
          />

          <fieldset className={styles.startMode} disabled={isCreating}>
            <legend>開始方法</legend>
            <label><input type="radio" name="startMode" value="now" checked={startImmediately} onChange={() => { setStartImmediately(true); invalidatePreview(); }} />今から</label>
            <label><input type="radio" name="startMode" value="scheduled" checked={!startImmediately} onChange={() => { setStartImmediately(false); invalidatePreview(); }} />日時を指定</label>
          </fieldset>
          {startImmediately ? <p className={styles.fieldHelp}>作成するとすぐに開始します。日時の指定は不要です。</p> : <div className={styles.dateTimeSection}>
            {/* 1. 操作しやすい日付選択UI */}
            <div className={styles.dateSelectBlock}>
              <div className={styles.dateBlockHeader}>
                <span className={styles.blockTitle}><CalendarIcon /> 日付を設定</span>
              </div>

              <div className={styles.dateAdjustGrid} role="group" aria-label="開始日の調整">
                {[
                  { amount: 1, unit: "days", label: "1日" },
                  { amount: 3, unit: "days", label: "3日" },
                  { amount: 7, unit: "days", label: "7日" },
                  { amount: 14, unit: "days", label: "14日" },
                  { amount: 1, unit: "months", label: "1か月" },
                ].map(({ amount, unit, label }) => (
                  <div key={label} className={styles.dateAdjustPair}>
                    {[1, -1].map(sign => {
                      const delta = amount * sign;
                      const dateUnit = unit === "months" ? "months" : "days";
                      const target = shiftBoardDate(selectedDate, delta, dateUnit);
                      return <button key={sign} type="button" className={styles.chipBtn}
                        disabled={!target || target < todayStr}
                        onClick={() => shiftSelectedDate(delta, dateUnit)}>
                        {sign > 0 ? "+" : "−"}{label}
                      </button>;
                    })}
                  </div>
                ))}
              </div>

              {/* ステッパー付き日付表示カード */}
              <div className={styles.dateStepperCard}>
                <button
                  type="button"
                  className={styles.dateNavBtn}
                  disabled={selectedDate <= todayStr}
                  aria-label="前日へ移動"
                  onClick={() => shiftSelectedDate(-1, "days")}
                >
                  ← 前の日
                </button>

                <div className={styles.dateCenterDisplay}>
                  <span className={styles.dateMainText}>
                    {formatJapaneseDateDisplay(selectedDate)}
                  </span>
                  <span className={styles.dateSubBadge}>
                    {daysDiffFromToday === 0
                      ? "本日"
                      : `今から ${daysDiffFromToday}日後`}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.dateNavBtn}
                  aria-label="翌日へ移動"
                  onClick={() => shiftSelectedDate(1, "days")}
                >
                  次の日 →
                </button>
              </div>

              {/* カレンダーで直接指定 */}
              <div className={styles.calendarPickerWrap}>
                <label htmlFor={`${id}-calendar-date`}>カレンダーから選ぶ:</label>
                <input
                  id={`${id}-calendar-date`}
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  className={styles.calendarDateInput}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    invalidatePreview();
                  }}
                />
              </div>
            </div>

            {/* 2. ドロップダウンと入力が1つに統合された、時間と分の2つの入力欄 */}
            <div className={styles.timeSelectBlock}>
              <span className={styles.blockTitle}><ClockIcon /> 時刻を設定（時間・分）</span>

              <div className={styles.timeInputsRow}>
                {/* 時間（時） */}
                <IntegratedNumberDropdown
                  id={`${id}-hour`}
                  label="時間"
                  unit="時"
                  value={selectedHour}
                  max={23}
                  options={HOUR_OPTIONS}
                  onChange={(val) => {
                    setSelectedHour(val);
                    invalidatePreview();
                  }}
                />

                <span className={styles.timeSeparator} aria-hidden="true">:</span>

                {/* 分（分） */}
                <IntegratedNumberDropdown
                  id={`${id}-minute`}
                  label="分"
                  unit="分"
                  value={selectedMinute}
                  max={59}
                  options={MINUTE_OPTIONS}
                  onChange={(val) => {
                    setSelectedMinute(val);
                    invalidatePreview();
                  }}
                />
              </div>
              <small className={styles.fieldHelp}>
                キーボードで数字を直接入力するか、右側の「▾」から候補を選択できます。
              </small>
            </div>

            {/* 設定中の日時サマリー */}
            <div className={styles.dateTimeSummary}>
              <span className={styles.dateTimeSummaryText}>
                <CalendarIcon /> 開始日時：{selectedDate} {formattedHour}:{formattedMinute}
              </span>
              <span className={styles.dateTimeRangeNotice}>
                掲示板が始まる日時です。過去の日時は選べません。
              </span>
            </div>

            {/* 日時エラー表示 */}
            {dateTimeError && (
              <p role="alert" className={styles.fieldError}>
                ⚠️ {dateTimeError}
              </p>
            )}
          </div>}
        </div>

        {error && (
          <div role="alert" className={styles.errorAlert}>
            <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.primary}
            type="submit"
            disabled={!isFormValid}
            title={!isFormValid ? "定員または開始日時の入力内容をご確認ください" : undefined}
          >
            作成内容を確認
          </button>
          <Link href="/" className={styles.cancelLink}>キャンセル</Link>
        </div>
      </form>

      {/* 確認プレビュー */}
      {preview && !dateTimeError && (
        <section className={styles.preview} aria-labelledby={`${id}-preview`}>
          <div className={styles.previewHeader}>
            <span className={styles.previewBadge}>確認</span>
            <h3 id={`${id}-preview`}>入力内容の確認</h3>
          </div>
          <p role="status" className={styles.previewStatus}>内容を確認して「作成する」を押してください。</p>
          <dl className={styles.previewList}>
            <div className={styles.previewItem}><dt>ネタバレ注意</dt><dd>{preview.hasSpoilers ? <SpoilerBadge show /> : "なし"}</dd></div>
            <div className={styles.previewItem}><dt>招待する人</dt><dd>{inviteeIds.length ? inviteCandidates.filter(person => inviteeIds.includes(person.id)).map(person => person.nickname).join("、") : "招待しない"}</dd></div>
            <div className={styles.previewItem}><dt>参加できる人</dt><dd>{preview.allowGuests ? "登録ユーザー・ゲスト" : "登録ユーザーのみ"}</dd></div>
            <div className={styles.previewItem}>
              <dt>タイトル</dt>
              <dd className={styles.previewTitleValue}>{preview.title}</dd>
            </div>
            <div className={styles.previewItem}>
              <dt>映画</dt>
              <dd className={styles.previewMovieValue}>
                {preview.movie.posterUrl && preview.movie.posterUrl !== failedPosterUrl ? (
                  <div className={styles.previewPosterWrapper}>
                    <Image
                      src={preview.movie.posterUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className={styles.previewPosterImg}
                      onError={() => setFailedPosterUrl(preview.movie.posterUrl)}
                    />
                  </div>
                ) : null}
                <div className={styles.previewMovieText}>
                  <strong>{preview.movie.title}</strong>
                  {preview.movie.releaseDate && (
                    <span className={styles.previewMovieDate}>
                      （{preview.movie.releaseDate.replaceAll("-", "/")} 公開）
                    </span>
                  )}
                </div>
              </dd>
            </div>
            <div className={styles.previewItem}>
              <dt>定員</dt>
              <dd>{preview.capacity === null ? "制限なし" : `${preview.capacity}人（作成者を含む）`}</dd>
            </div>
            <div className={styles.previewItem}>
              <dt>開始日時</dt>
              <dd>{preview.startImmediately ? "今から（作成後すぐに開始）" : formatBoardDate(preview.startsAt)}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={isCreating}
              onClick={() => {
                if (!preview || !requestId) return;
                const form = new FormData();
                form.set("requestId", requestId);
                form.set("title", preview.title);
                form.set("tmdbId", String(preview.movie.tmdbId));
                form.set("capacity", preview.capacity === null ? "unlimited" : String(preview.capacity));
                form.set("startDateTime", preview.startImmediately ? "" : fullStartDateTime);
                form.set("startImmediately", String(preview.startImmediately ?? false));
                form.set("allowGuests", String(preview.allowGuests));
                form.set("hasSpoilers", String(preview.hasSpoilers ?? false));
                for (const inviteeId of inviteeIds) form.append("inviteeId", inviteeId);
                startCreating(async () => {
                  try {
                    const result = await createBoard(form);
                    if (result.error) { setError(result.error); return; }
                    if (result.id) router.push(`/boards/${result.id}`);
                  } catch { setError("保存できませんでした。通信環境を確認して再度お試しください。"); }
                });
              }}>{isCreating ? "保存しています…" : "作成する"}</button>
          </div>
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
        </section>
      )}
    </section>
  );
}
