import { useId } from "react";

export function ServerEC2Art({ className = "" }: { className?: string }) {
  const raw = useId();
  const id = `ec2-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} role="img" aria-label="Amazon EC2 server">
      <defs>
        <linearGradient id={`${id}-bg`} x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF4E5" />
          <stop offset="1" stopColor="#F7E0C2" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="24" fill={`url(#${id}-bg)`} />
      <g stroke="#B8752B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="30" y="36" width="60" height="18" rx="4" fill="#FFF9EF" />
        <rect x="30" y="64" width="60" height="18" rx="4" fill="#FFF9EF" />
        <path d="M40 45h22M40 73h22" strokeOpacity="0.55" />
        <circle cx="78" cy="45" r="2.2" fill="#B8752B" stroke="none" />
        <circle cx="78" cy="73" r="2.2" fill="#B8752B" stroke="none" />
        <path d="M45 88v8h30v-8" strokeOpacity="0.4" />
      </g>
      <path d="M62 15l3.2 6.8 7.3.9-5.4 5.1 1.4 7.3-6.5-3.6-6.5 3.6 1.4-7.3-5.4-5.1 7.3-.9L62 15z" fill="#F0A44B" opacity="0.9" />
    </svg>
  );
}

export function BucketS3Art({ className = "" }: { className?: string }) {
  const raw = useId();
  const id = `s3-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} role="img" aria-label="Amazon S3 bucket">
      <defs>
        <linearGradient id={`${id}-bg`} x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAF6F0" />
          <stop offset="1" stopColor="#D3EDE2" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="30" y1="38" x2="92" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F7A59" />
          <stop offset="1" stopColor="#1F5A43" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="24" fill={`url(#${id}-bg)`} />
      <ellipse cx="60" cy="40" rx="31" ry="10" fill="#1F5A43" />
      <path d="M29 40v40c0 7 14 12 31 12s31-5 31-12V40" fill={`url(#${id}-body)`} />
      <ellipse cx="60" cy="40" rx="24" ry="6.5" fill="#BFE3D3" />
      <path d="M46 64l14-8 14 8-14 8-14-8z" fill="#F7F4EE" opacity="0.9" />
      <path d="M46 71l14 8 14-8" stroke="#D9F0E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d="M60 30v-5M54 28l-3-3M66 28l3-3" stroke="#8FC7AE" strokeWidth="1.8" strokeLinecap="round" />
      <text x="60" y="98" textAnchor="middle" fill="#DCEEE5" fontSize="9" letterSpacing="2" fontFamily="Inter, sans-serif">
        S3
      </text>
    </svg>
  );
}

export function StorageGauge({ percent, label = "Storage used" }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 52;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg viewBox="0 0 140 82" className="storage-gauge" role="img" aria-label={`${label}: ${clamped.toFixed(1)} percent`}>
      <defs>
        <linearGradient id="gauge-gradient" x1="14" y1="0" x2="126" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <path d="M18 66a52 52 0 0 1 104 0" stroke="currentColor" strokeOpacity="0.12" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path
        d="M18 66a52 52 0 0 1 104 0"
        stroke="url(#gauge-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="70" y="55" textAnchor="middle" className="storage-gauge__value" fontSize="24" fontWeight="600" fill="currentColor">
        {clamped.toFixed(clamped >= 10 ? 0 : 1)}%
      </text>
      <text x="70" y="73" textAnchor="middle" fontSize="8" letterSpacing="1.4" fill="currentColor" opacity="0.55">
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
