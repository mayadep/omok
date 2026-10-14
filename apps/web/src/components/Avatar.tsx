import type { ReactNode } from "react";

interface Def {
  name: string;
  bg: [string, string];
  body: (fur: string) => ReactNode;
  fur: string;
}

const eye = (x: number, y: number) => (
  <g>
    <circle cx={x} cy={y} r="3.4" fill="#fff" />
    <circle cx={x + 0.6} cy={y + 0.4} r="2" fill="#1b1b22" />
    <circle cx={x + 1.3} cy={y - 0.5} r="0.7" fill="#fff" />
  </g>
);

export const CHARACTERS: Def[] = [
  {
    name: "고양이",
    bg: ["#f6c177", "#e08f4f"],
    fur: "#fbf1e2",
    body: (f) => (
      <>
        <path d="M14 26 L17 8 L29 18 Z M50 26 L47 8 L35 18 Z" fill={f} />
        <path d="M17.5 13 L18.5 20 L24 18 Z M46.5 13 L45.5 20 L40 18 Z" fill="#f2a7a0" />
        <ellipse cx="32" cy="36" rx="19" ry="17" fill={f} />
        {eye(24, 34)}
        {eye(40, 34)}
        <path d="M30 41 h4 l-2 2.4 z" fill="#e0817b" />
        <path d="M32 43.4 v2 M32 45.4 q-3 2.4 -5.5 0.4 M32 45.4 q3 2.4 5.5 0.4" stroke="#7a4b3a" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M10 38 h8 M10 42 l8 -1.5 M54 38 h-8 M54 42 l-8 -1.5" stroke="#cdbfae" strokeWidth="0.9" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "여우",
    bg: ["#8fd3c8", "#3f9aa0"],
    fur: "#f08a3c",
    body: (f) => (
      <>
        <path d="M12 28 L15 6 L30 19 Z M52 28 L49 6 L34 19 Z" fill={f} />
        <path d="M16 12 L17 20 L24 18 Z M48 12 L47 20 L40 18 Z" fill="#3a2a25" />
        <path d="M11 33 Q32 14 53 33 Q50 54 32 54 Q14 54 11 33 Z" fill={f} />
        <path d="M32 54 Q18 52 14 38 Q26 44 32 44 Q38 44 50 38 Q46 52 32 54 Z" fill="#fff6ea" />
        {eye(23, 35)}
        {eye(41, 35)}
        <ellipse cx="32" cy="46" rx="3" ry="2.2" fill="#2a2024" />
      </>
    ),
  },
  {
    name: "곰",
    bg: ["#b9a7e8", "#7e6cc4"],
    fur: "#a8744a",
    body: (f) => (
      <>
        <circle cx="16" cy="17" r="8" fill={f} />
        <circle cx="48" cy="17" r="8" fill={f} />
        <circle cx="16" cy="17" r="4" fill="#d9a77d" />
        <circle cx="48" cy="17" r="4" fill="#d9a77d" />
        <ellipse cx="32" cy="36" rx="20" ry="18" fill={f} />
        <ellipse cx="32" cy="42" rx="9" ry="7" fill="#e4bd98" />
        {eye(23, 32)}
        {eye(41, 32)}
        <ellipse cx="32" cy="39.5" rx="3.2" ry="2.4" fill="#2a2024" />
        <path d="M32 42 v2.5 M28.5 45.5 q3.5 2.5 7 0" stroke="#5b3b2a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "토끼",
    bg: ["#f4b6c8", "#d9739b"],
    fur: "#fffaf7",
    body: (f) => (
      <>
        <ellipse cx="23" cy="14" rx="5.5" ry="13" fill={f} />
        <ellipse cx="41" cy="14" rx="5.5" ry="13" fill={f} />
        <ellipse cx="23" cy="15" rx="2.8" ry="9.5" fill="#f6b7c4" />
        <ellipse cx="41" cy="15" rx="2.8" ry="9.5" fill="#f6b7c4" />
        <ellipse cx="32" cy="39" rx="18" ry="16" fill={f} />
        {eye(25, 37)}
        {eye(39, 37)}
        <path d="M30 43 h4 l-2 2.2 z" fill="#e58aa0" />
        <path d="M32 45.2 q-3 2.5 -5.5 0.4 M32 45.2 q3 2.5 5.5 0.4" stroke="#8a5a62" strokeWidth="1" fill="none" strokeLinecap="round" />
        <circle cx="19" cy="43" r="3" fill="#f9c9d3" opacity="0.8" />
        <circle cx="45" cy="43" r="3" fill="#f9c9d3" opacity="0.8" />
      </>
    ),
  },
  {
    name: "부엉이",
    bg: ["#9ec4f2", "#4f7fc4"],
    fur: "#8a6a4b",
    body: (f) => (
      <>
        <path d="M13 24 L16 8 L28 16 Z M51 24 L48 8 L36 16 Z" fill={f} />
        <ellipse cx="32" cy="36" rx="20" ry="19" fill={f} />
        <ellipse cx="32" cy="46" rx="11" ry="9" fill="#e8d5b7" />
        <circle cx="23" cy="32" r="8" fill="#f6ecd9" />
        <circle cx="41" cy="32" r="8" fill="#f6ecd9" />
        <circle cx="23" cy="32" r="4.4" fill="#2a2430" />
        <circle cx="41" cy="32" r="4.4" fill="#2a2430" />
        <circle cx="24.4" cy="30.6" r="1.4" fill="#fff" />
        <circle cx="42.4" cy="30.6" r="1.4" fill="#fff" />
        <path d="M29.5 38 h5 l-2.5 5 z" fill="#f0a93a" />
      </>
    ),
  },
  {
    name: "판다",
    bg: ["#a7e3b0", "#4fa86a"],
    fur: "#fdfdfb",
    body: (f) => (
      <>
        <circle cx="15" cy="16" r="7.5" fill="#23232b" />
        <circle cx="49" cy="16" r="7.5" fill="#23232b" />
        <ellipse cx="32" cy="36" rx="21" ry="18.5" fill={f} />
        <ellipse cx="23" cy="33" rx="6" ry="7.5" fill="#23232b" transform="rotate(20 23 33)" />
        <ellipse cx="41" cy="33" rx="6" ry="7.5" fill="#23232b" transform="rotate(-20 41 33)" />
        <circle cx="23.6" cy="33" r="2.6" fill="#fff" />
        <circle cx="40.4" cy="33" r="2.6" fill="#fff" />
        <circle cx="24" cy="33.3" r="1.4" fill="#23232b" />
        <circle cx="40" cy="33.3" r="1.4" fill="#23232b" />
        <ellipse cx="32" cy="42" rx="3.2" ry="2.3" fill="#23232b" />
        <path d="M32 44.3 v2 M28.5 47 q3.5 2.4 7 0" stroke="#23232b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>
    ),
  },
];

interface Props {
  character: number;
  size?: number;
  ring?: string;
}

export function Avatar({ character, size = 56, ring }: Props) {
  const def = CHARACTERS[character % CHARACTERS.length];
  const gid = `bg${character}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={def.name} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={def.bg[0]} />
          <stop offset="1" stopColor={def.bg[1]} />
        </linearGradient>
        <clipPath id={`clip${character}`}>
          <circle cx="32" cy="32" r="31" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip${character})`}>
        <rect width="64" height="64" fill={`url(#${gid})`} />
        <ellipse cx="32" cy="66" rx="30" ry="12" fill="rgba(255,255,255,0.18)" />
        {def.body(def.fur)}
      </g>
      <circle cx="32" cy="32" r="31" fill="none" stroke={ring ?? "rgba(255,255,255,0.28)"} strokeWidth="2" />
    </svg>
  );
}
