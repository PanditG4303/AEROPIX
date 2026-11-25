import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { useId } from "react";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <div className="not-found">
      <div className="not-found__inner">
        <svg viewBox="0 0 420 300" className="not-found__art" role="img" aria-label="A lost photograph floating between clouds">
          <defs>
            <linearGradient id={`${id}-photo`} x1="120" y1="70" x2="300" y2="230" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F7F4EE" />
              <stop offset="1" stopColor="#E6E1F4" />
            </linearGradient>
            <linearGradient id={`${id}-sky`} x1="130" y1="90" x2="290" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#33356B" />
              <stop offset="1" stopColor="#9A7BD1" />
            </linearGradient>
          </defs>
          <circle cx="210" cy="148" r="126" fill="#F1ECFA" />
          <circle cx="210" cy="148" r="96" stroke="#A78BFA" strokeOpacity="0.25" strokeDasharray="2 8" />
          <g transform="rotate(-8 210 150)">
            <rect x="136" y="68" width="150" height="176" rx="14" fill={`url(#${id}-photo)`} stroke="#D3CAE8" />
            <rect x="147" y="79" width="128" height="134" rx="9" fill={`url(#${id}-sky)`} />
            <circle cx="248" cy="112" r="12" fill="#F5D8AF" opacity="0.85" />
            <path d="M147 172c26-20 44-8 62-22 18-13 38-4 66 22v41H147v-41z" fill="#241F45" opacity="0.7" />
            <rect x="157" y="159" width="66" height="5" rx="2.5" fill="#F7F4EE" opacity="0.55" />
            <rect x="157" y="170" width="40" height="4" rx="2" fill="#F7F4EE" opacity="0.3" />
            <rect x="157" y="225" width="76" height="5" rx="2.5" fill="#2B3350" opacity="0.5" />
          </g>
          <g stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
            <path d="M66 72h20M76 62v20" />
            <path d="M344 226h16M352 218v16" />
            <circle cx="350" cy="76" r="2.5" fill="#38BDF8" stroke="none" />
            <circle cx="74" cy="232" r="2" fill="#A78BFA" stroke="none" />
          </g>
          <text x="210" y="292" textAnchor="middle" fill="#8A829B" fontSize="11" letterSpacing="3" fontFamily="Inter, sans-serif">
            LOST IN THE CLOUD
          </text>
        </svg>
        <p className="eyebrow">404 · not found</p>
        <h1>This frame is empty.</h1>
        <p className="not-found__lede">
          The page you were looking for has drifted out of the gallery. It may have been moved,
          renamed, or never existed at all.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">
            <ArrowLeft size={16} /> Back to the landing page
          </Link>
          <Link to="/app" className="btn btn--ghost">
            <Compass size={16} /> Go to your dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
