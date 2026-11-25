import { useId } from "react";
import { Link } from "react-router-dom";

export function LogoMark({ size = 34 }: { size?: number }) {
  const rawId = useId();
  const id = `logo-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="logo-mark"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="12" y1="10" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#131A33" />
          <stop offset="1" stopColor="#080D1C" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill={`url(#${id}-bg)`} />
      <path
        d="M19.4 41.3c-4.7 0-8.4-3.7-8.4-8.2 0-4.2 3.2-7.7 7.4-8.2 1.5-5.2 6.3-9 12-9 6.5 0 11.9 5 12.5 11.4 4.3.6 7.5 4.3 7.5 8.7 0 4.9-4 8.9-9 8.9H19.4z"
        fill={`url(#${id}-fill)`}
        opacity="0.96"
      />
      <circle cx="32" cy="31.6" r="7.4" fill="#0A1024" />
      <circle cx="32" cy="31.6" r="3.3" fill="#F7F4EE" />
      <path
        d="M43.4 48.2l4.2-7.4 4.2 7.4"
        stroke="#F7F4EE"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  showMark?: boolean;
}

export function Logo({ to = "/", size = "md", showMark = true }: LogoProps) {
  const content = (
    <>
      {showMark ? <LogoMark size={size === "lg" ? 42 : size === "sm" ? 28 : 34} /> : null}
      <span className="logo-word">AEROPIX</span>
      <span className="logo-dot" aria-hidden="true" />
    </>
  );
  return (
    <Link to={to} className={`brand brand--${size}`} aria-label="AEROPIX home">
      {content}
    </Link>
  );
}
