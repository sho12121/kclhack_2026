import React from "react";

// 夕暮れの街並みと空のカバー画像
export function CoverArtwork({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 1000 320" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="35%" stopColor="#3b82f6" />
          <stop offset="65%" stopColor="#fb923c" />
          <stop offset="85%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
        <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(253,186,116,0.3)" />
        </linearGradient>
      </defs>
      <rect width="1000" height="320" fill="url(#skyGrad)" />
      
      {/* 雲 */}
      <ellipse cx="200" cy="120" rx="140" ry="40" fill="url(#cloudGrad)" />
      <ellipse cx="280" cy="100" rx="100" ry="30" fill="url(#cloudGrad)" />
      <ellipse cx="750" cy="140" rx="180" ry="45" fill="url(#cloudGrad)" />
      <ellipse cx="680" cy="110" rx="120" ry="35" fill="url(#cloudGrad)" />

      {/* 遠くの都市シルエット */}
      <path d="M 0 320 L 0 250 L 40 250 L 40 265 L 70 265 L 70 240 L 90 240 L 90 270 L 130 270 L 130 230 L 145 200 L 160 230 L 190 230 L 190 270 L 220 270 L 220 250 L 260 250 L 260 265 L 310 265 L 310 220 L 330 220 L 330 260 L 380 260 L 380 245 L 420 245 L 420 270 L 480 270 L 480 235 L 510 235 L 510 260 L 550 260 L 550 225 L 570 190 L 590 225 L 630 225 L 630 265 L 680 265 L 680 240 L 720 240 L 720 260 L 770 260 L 770 215 L 795 215 L 795 265 L 840 265 L 840 245 L 890 245 L 890 260 L 940 260 L 940 230 L 960 210 L 975 230 L 1000 230 L 1000 320 Z" fill="#0f172a" opacity="0.85" />
      <path d="M 120 320 L 120 280 L 180 280 L 180 320 M 340 320 L 340 275 L 400 275 L 400 320 M 650 320 L 650 270 L 700 270 L 700 320 M 820 320 L 820 280 L 870 280 L 870 320" fill="#1e293b" />
    </svg>
  );
}

// たかしの夕暮れアバター
export function TakashiAvatar({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="avatarSky" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="40%" stopColor="#fdba74" />
          <stop offset="80%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
      </defs>
      {/* 背景の空 */}
      <circle cx="60" cy="60" r="60" fill="url(#avatarSky)" />

      {/* 遠くのビル群シルエット */}
      <path d="M 20 120 L 20 85 L 35 85 L 35 90 L 50 90 L 50 80 L 65 80 L 65 92 L 80 92 L 80 82 L 95 82 L 95 90 L 105 90 L 105 120 Z" fill="#0f172a" opacity="0.4" />

      {/* 手前の人物のシルエット（後ろ姿の青年） */}
      <ellipse cx="60" cy="55" rx="14" ry="16" fill="#0f172a" />
      {/* 髪型 */}
      <path d="M 44 54 C 44 40 50 34 60 34 C 70 34 76 40 76 54 C 74 57 72 61 70 63 C 65 60 55 60 50 63 C 48 61 46 57 44 54 Z" fill="#0f172a" />
      {/* 首と肩・背中 */}
      <path d="M 54 68 L 66 68 L 68 76 L 86 86 L 90 120 L 30 120 L 34 86 L 52 76 Z" fill="#0f172a" />
      {/* シャツの襟・服の陰影 */}
      <path d="M 40 92 C 50 88 70 88 80 92 L 82 120 L 38 120 Z" fill="#1e293b" />
    </svg>
  );
}

// 映画ポスター1: 君の名は。
export function KimiNoNaWaPoster({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="knnSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="85%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect width="120" height="180" rx="6" fill="url(#knnSky)" />
      {/* 彗星の軌跡 */}
      <path d="M 10 20 Q 50 60 110 110" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.9" />
      <path d="M 30 35 Q 70 80 115 130" stroke="#fef08a" strokeWidth="1.5" fill="none" opacity="0.8" />
      <circle cx="20" cy="28" r="3" fill="#ffffff" />
      {/* 雲 */}
      <path d="M 0 120 Q 30 100 60 115 Q 90 95 120 110 L 120 180 L 0 180 Z" fill="#ffffff" opacity="0.75" />
      {/* 二人のシルエット */}
      <ellipse cx="45" cy="148" rx="4" ry="5" fill="#0f172a" />
      <path d="M 41 153 L 49 153 L 51 172 L 39 172 Z" fill="#0f172a" />
      <ellipse cx="75" cy="146" rx="4" ry="5" fill="#0f172a" />
      <path d="M 71 151 L 79 151 L 82 172 L 68 172 Z" fill="#0f172a" />
      {/* タイトル風文字 */}
      <text x="60" y="30" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="2">君の名は。</text>
    </svg>
  );
}

// 映画ポスター2: インセプション
export function InceptionPoster({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="incSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="40%" stopColor="#1e3a8a" />
          <stop offset="80%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="120" height="180" rx="6" fill="url(#incSky)" />
      {/* 折れ曲がる都市 */}
      <path d="M 10 10 L 40 50 L 20 80 L 0 50 Z" fill="#0f172a" opacity="0.8" />
      <path d="M 110 10 L 80 50 L 100 80 L 120 50 Z" fill="#0f172a" opacity="0.8" />
      {/* 道路と人物たち */}
      <path d="M 35 180 L 50 120 L 70 120 L 85 180 Z" fill="#334155" opacity="0.6" />
      {/* 人物4人 */}
      <circle cx="50" cy="142" r="3" fill="#020617" />
      <rect x="48" y="145" width="4" height="12" fill="#020617" />
      <circle cx="58" cy="140" r="3.5" fill="#020617" />
      <rect x="56" y="143" width="5" height="15" fill="#020617" />
      <circle cx="68" cy="143" r="3" fill="#020617" />
      <rect x="66" y="146" width="4" height="12" fill="#020617" />
      <text x="60" y="45" fill="#e2e8f0" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="3">INCEPTION</text>
    </svg>
  );
}

// 映画ポスター3: 千と千尋の神隠し
export function SpiritedAwayPoster({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chihiroBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="50%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <rect width="120" height="180" rx="6" fill="url(#chihiroBg)" />
      {/* ランタンの光 */}
      <circle cx="60" cy="80" r="45" fill="#fef08a" opacity="0.2" />
      {/* 千尋 */}
      <ellipse cx="60" cy="90" rx="14" ry="16" fill="#fed7aa" />
      {/* 髪型 */}
      <path d="M 46 88 C 46 72 54 68 60 68 C 66 68 74 72 74 88 C 72 90 70 82 60 82 C 50 82 48 90 46 88 Z" fill="#451a03" />
      {/* ポニーテール */}
      <path d="M 68 76 Q 80 82 76 96" stroke="#451a03" strokeWidth="4" fill="none" />
      {/* 服（赤緑） */}
      <path d="M 48 106 L 72 106 L 76 150 L 44 150 Z" fill="#dc2626" />
      <rect x="55" y="106" width="10" height="44" fill="#ffffff" />
      <text x="60" y="32" fill="#fed7aa" fontSize="8" fontWeight="700" textAnchor="middle" letterSpacing="1">千と千尋の神隠し</text>
    </svg>
  );
}

// 映画ポスター4: ラ・ラ・ランド
export function LaLaLandPoster({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lalasky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="40%" stopColor="#4c1d95" />
          <stop offset="75%" stopColor="#701a75" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>
      <rect width="120" height="180" rx="6" fill="url(#lalasky)" />
      {/* 街の夜景の明かり */}
      <circle cx="20" cy="140" r="1" fill="#fde047" />
      <circle cx="35" cy="145" r="1.5" fill="#fde047" />
      <circle cx="75" cy="142" r="1" fill="#fde047" />
      <circle cx="95" cy="144" r="1.5" fill="#fde047" />
      {/* 街灯 */}
      <line x1="88" y1="95" x2="88" y2="155" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="88" cy="94" r="4" fill="#fef08a" />
      {/* ダンスする二人 */}
      {/* 男性（スーツ） */}
      <circle cx="52" cy="120" r="3" fill="#ffffff" />
      <path d="M 48 123 L 56 123 L 58 138 L 52 150 L 46 138 Z" fill="#1e293b" />
      {/* 女性（黄色のドレス） */}
      <circle cx="62" cy="122" r="3" fill="#fed7aa" />
      <path d="M 59 125 L 65 125 L 72 142 L 56 142 Z" fill="#eab308" />
      <line x1="65" y1="142" x2="68" y2="150" stroke="#1e293b" strokeWidth="1.5" />
      <text x="60" y="32" fill="#fef08a" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="2">LA LA LAND</text>
    </svg>
  );
}

// 映画ポスター5: THE BATMAN
export function BatmanPoster({ className }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="batSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#450a0a" />
          <stop offset="50%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>
      <rect width="120" height="180" rx="6" fill="url(#batSky)" />
      {/* コウモリのシルエット */}
      <path d="M 60 70 L 45 60 L 30 75 L 35 90 L 50 82 L 60 98 L 70 82 L 85 90 L 90 75 L 75 60 Z" fill="#0a0a0a" />
      {/* バットマンの胸・肩 */}
      <path d="M 20 180 L 30 140 L 45 120 L 60 125 L 75 120 L 90 140 L 100 180 Z" fill="#000000" />
      <text x="60" y="160" fill="#dc2626" fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="1.5">THE BATMAN</text>
    </svg>
  );
}

