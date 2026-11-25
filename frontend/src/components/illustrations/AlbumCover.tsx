import { useId } from "react";

const palettes = [
  { from: "#8B5CF6", to: "#38BDF8", paper: "#EEE8FB", ink: "#3A2D64", accent: "#F0A879" },
  { from: "#E8A87C", to: "#C97B63", paper: "#FAEFE6", ink: "#6B3D2F", accent: "#9BAF88" },
  { from: "#6E8FA8", to: "#A9C0C4", paper: "#EDF3F2", ink: "#334B55", accent: "#E9C99B" },
  { from: "#A4B494", to: "#6C8B72", paper: "#F0F2E8", ink: "#3B4A37", accent: "#D6A57C" },
];

function hashName(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return hash;
}

export function AlbumCover({ name, className = "" }: { name: string; className?: string }) {
  const raw = useId();
  const id = `album-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const palette = palettes[hashName(name) % palettes.length];
  const variant = hashName(name) % 3;

  return (
    <div className={`album-cover ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="400" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor={palette.paper} />
            <stop offset="1" stopColor={`${palette.from}22`} />
          </linearGradient>
          <linearGradient id={`${id}-shape`} x1="40" y1="30" x2="370" y2="260" gradientUnits="userSpaceOnUse">
            <stop stopColor={palette.from} />
            <stop offset="1" stopColor={palette.to} />
          </linearGradient>
        </defs>
        <rect width="400" height="280" fill={`url(#${id}-bg)`} />
        <circle cx="338" cy="58" r="34" fill={palette.accent} opacity="0.75" />
        {variant === 0 ? (
          <>
            <path d="M-40 250V70a136 136 0 0 1 272 0v180" fill={`url(#${id}-shape)`} opacity="0.82" />
            <path d="M72 280V152a92 92 0 0 1 184 0v128" fill={palette.paper} opacity="0.9" />
            <path d="M120 280V174a56 56 0 0 1 112 0v106" fill={palette.ink} opacity="0.16" />
          </>
        ) : variant === 1 ? (
          <>
            <circle cx="152" cy="146" r="98" fill={`url(#${id}-shape)`} opacity="0.8" />
            <circle cx="250" cy="188" r="78" fill={palette.accent} opacity="0.6" />
            <path d="M0 230c72-28 128-14 184 8 58 22 126 18 216-18v60H0v-50z" fill={palette.ink} opacity="0.24" />
            <path d="M-10 250c80-24 142-8 198 10 56 18 128 12 222-22v42H-10v-30z" fill={`url(#${id}-shape)`} opacity="0.65" />
          </>
        ) : (
          <>
            <path d="M52 280V94a94 94 0 0 1 188 0v186" fill={`url(#${id}-shape)`} opacity="0.82" />
            <path d="M148 280V138a42 42 0 0 1 84 0v142" fill={palette.paper} opacity="0.92" />
            <path d="M0 242c84-16 140 4 196 18 56 14 120 8 204-18v38H0v-38z" fill={palette.ink} opacity="0.2" />
            <circle cx="322" cy="196" r="38" fill={palette.paper} opacity="0.85" />
          </>
        )}
        <g stroke={palette.ink} strokeOpacity="0.22" strokeWidth="1">
          <path d="M24 34h52M50 8v52" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
