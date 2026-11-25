import { useId } from "react";

export function EmptyGalleryArt({ className = "" }: { className?: string }) {
  const raw = useId();
  const id = `empty-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 440 320"
      fill="none"
      className={className}
      role="img"
      aria-label="An empty gallery frame waiting for its first image"
    >
      <defs>
        <linearGradient id={`${id}-frame`} x1="100" y1="80" x2="340" y2="270" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7F4EE" />
          <stop offset="1" stopColor="#E8E1F6" />
        </linearGradient>
        <linearGradient id={`${id}-cloud`} x1="150" y1="120" x2="310" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <circle cx="220" cy="164" r="142" fill="#EFEAF9" />
      <circle cx="220" cy="164" r="112" stroke="#8B5CF6" strokeOpacity="0.16" strokeDasharray="2 8" />
      <g transform="rotate(-6 220 170)">
        <rect x="104" y="62" width="232" height="212" rx="18" fill={`url(#${id}-frame)`} stroke="#CFC6E8" />
        <rect x="120" y="78" width="200" height="180" rx="12" fill="#EDE9F7" stroke="#D8D0EB" strokeDasharray="4 6" />
        <path
          d="M180 192c-18 0-32-14-32-31 0-16 13-29 29-31 5-19 22-33 42-33 23 0 42 18 44 40 15 3 26 16 26 32 0 18-15 33-34 33h-75z"
          fill={`url(#${id}-cloud)`}
          opacity="0.9"
        />
        <circle cx="248" cy="174" r="4" fill="#F7F4EE" />
        <path d="M240 174h16M248 166v16" stroke="#F7F4EE" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="154" y="241" width="96" height="6" rx="3" fill="#CFC6E8" />
        <rect x="182" y="253" width="40" height="5" rx="2.5" fill="#DDD5ED" />
      </g>
      <g stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" opacity="0.75">
        <path d="M82 92h22M93 81v22" />
        <path d="M352 246h16M360 238v16" />
        <circle cx="66" cy="232" r="2.5" fill="#A78BFA" stroke="none" />
        <circle cx="380" cy="104" r="2" fill="#7DD3FC" stroke="none" />
      </g>
    </svg>
  );
}

export function UploadSuccessArt({ className = "" }: { className?: string }) {
  const raw = useId();
  const id = `success-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      className={className}
      role="img"
      aria-label="Upload successful"
    >
      <defs>
        <linearGradient id={`${id}-cloud`} x1="94" y1="60" x2="240" y2="190" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7F4EE" />
          <stop offset="1" stopColor="#E4E0FB" />
        </linearGradient>
        <linearGradient id={`${id}-accent`} x1="118" y1="112" x2="206" y2="176" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="124" r="92" fill="#F1ECFB" />
      <circle cx="160" cy="124" r="72" stroke="#C4B5FD" strokeDasharray="2 7" />
      <path
        d="M87 143c-15 0-27-12-27-27 0-13 10-24 23-26 4-21 23-37 45-37 22 0 41 15 45 36 17 2 30 16 30 33 0 18-15 33-34 33H87z"
        fill={`url(#${id}-cloud)`}
        stroke="#D6CEF0"
      />
      <circle cx="160" cy="124" r="31" fill={`url(#${id}-accent)`} />
      <path d="M147 124l9 9 18-19" stroke="#F7F4EE" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round">
        <path d="M54 64l10-10M58 44h12M244 190l10 10M258 202h-12" />
      </g>
      <circle cx="258" cy="70" r="3" fill="#8B5CF6" />
      <circle cx="58" cy="176" r="2.5" fill="#38BDF8" />
      <circle cx="246" cy="142" r="2" fill="#F0A879" />
    </svg>
  );
}

export function Spinner({ size = 18, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <span className="spinner" style={{ width: size, height: size }} role="status" aria-label={label}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.4" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function BrandLoader({ label = "Preparing your gallery" }: { label?: string }) {
  return (
    <div className="brand-loader">
      <div className="brand-loader__orb">
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  );
}
