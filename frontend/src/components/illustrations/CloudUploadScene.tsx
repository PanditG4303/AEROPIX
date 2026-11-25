import { useId } from "react";

/**
 * Original animated cloud upload illustration. Purely vector — no remote
 * images or third-party assets.
 */
export function CloudUploadScene({ className = "" }: { className?: string }) {
  const raw = useId();
  const id = `cloud-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className={`cloud-scene ${className}`} aria-hidden="true">
      <svg viewBox="0 0 640 540" fill="none" className="cloud-scene__svg">
        <defs>
          <radialGradient id={`${id}-halo`} cx="0" cy="0" r="1" gradientTransform="translate(332 260) rotate(90) scale(260)">
            <stop stopColor="#7C6CF6" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#3B4EA8" stopOpacity="0.18" />
            <stop offset="1" stopColor="#0A1024" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-cloud`} x1="190" y1="155" x2="470" y2="370" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7F4EE" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#C9CDFA" stopOpacity="0.6" />
            <stop offset="1" stopColor="#7C7CF0" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`${id}-stroke`} x1="170" y1="150" x2="480" y2="360" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="1" stopColor="#A4A7FF" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`${id}-sky-a`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#23345E" />
            <stop offset="0.55" stopColor="#A46F67" />
            <stop offset="1" stopColor="#E8C49D" />
          </linearGradient>
          <linearGradient id={`${id}-sky-b`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#131A3A" />
            <stop offset="0.55" stopColor="#4E4AA0" />
            <stop offset="1" stopColor="#8A74D8" />
          </linearGradient>
          <linearGradient id={`${id}-sky-c`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#081322" />
            <stop offset="1" stopColor="#25465A" />
          </linearGradient>
          <linearGradient id={`${id}-accent`} x1="260" y1="360" x2="390" y2="470" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
          <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <circle cx="320" cy="255" r="255" fill={`url(#${id}-halo)`} />
        <circle cx="320" cy="255" r="198" stroke="#8489E9" strokeOpacity="0.16" strokeDasharray="2 9" />
        <circle cx="320" cy="255" r="248" stroke="#8489E9" strokeOpacity="0.1" strokeDasharray="2 12" />

        <g opacity="0.5" stroke="#9BA4E8" strokeWidth="1">
          <path d="M40 120h60M70 90v60" strokeLinecap="round" />
          <path d="M540 430h44M562 408v44" strokeLinecap="round" />
          <circle cx="545" cy="120" r="2.5" fill="#C4B5FD" stroke="none" />
          <circle cx="106" cy="402" r="2" fill="#93C5FD" stroke="none" />
          <circle cx="560" cy="300" r="1.6" fill="#C4B5FD" stroke="none" />
        </g>

        {/* photo cards travelling to the cloud */}
        <g className="scene-float scene-float--a">
          <g transform="translate(62 248) rotate(-9)">
            <rect width="160" height="196" rx="16" fill="#F7F4EE" />
            <rect x="9" y="9" width="142" height="150" rx="10" fill={`url(#${id}-sky-a)`} />
            <circle cx="112" cy="54" r="16" fill="#F5D8AF" opacity="0.9" />
            <path d="M9 122c28-26 48-14 68-27 23-15 44-3 74 25v30H9v-28z" fill="#7B4C43" opacity="0.9" />
            <path d="M9 143c30-17 54-5 81-14 16-5 30 1 52 15v15H9v-16z" fill="#C48B62" opacity="0.95" />
            <rect x="19" y="171" width="70" height="5" rx="2.5" fill="#2B3350" opacity="0.65" />
            <rect x="19" y="181" width="42" height="4" rx="2" fill="#2B3350" opacity="0.3" />
          </g>
        </g>

        <g className="scene-float scene-float--b">
          <g transform="translate(414 138) rotate(7)">
            <rect width="174" height="136" rx="14" fill="#F7F4EE" />
            <rect x="8" y="8" width="158" height="101" rx="9" fill={`url(#${id}-sky-b)`} />
            <path d="M8 84c28-30 46-16 66-38 16-18 32-11 60 12 10 8 20 11 32 12v39H8V84z" fill="#161D3D" opacity="0.8" />
            <circle cx="126" cy="38" r="13" fill="#D9CFF6" opacity="0.8" />
            <rect x="18" y="119" width="82" height="5" rx="2.5" fill="#2B3350" opacity="0.6" />
          </g>
        </g>

        <g className="scene-float scene-float--c">
          <g transform="translate(428 302) rotate(-5)">
            <rect width="152" height="178" rx="15" fill="#F7F4EE" />
            <rect x="8" y="8" width="136" height="134" rx="9" fill={`url(#${id}-sky-c)`} />
            <circle cx="113" cy="34" r="10" fill="#D6D1BE" opacity="0.75" />
            <g fill="#E8B878">
              <rect x="24" y="86" width="6" height="10" rx="1" />
              <rect x="38" y="72" width="6" height="10" rx="1" />
              <rect x="52" y="94" width="6" height="10" rx="1" />
              <rect x="66" y="66" width="6" height="10" rx="1" />
              <rect x="80" y="88" width="6" height="10" rx="1" />
              <rect x="94" y="74" width="6" height="10" rx="1" />
              <rect x="108" y="96" width="6" height="10" rx="1" />
              <rect x="34" y="108" width="6" height="10" rx="1" />
              <rect x="62" y="112" width="6" height="10" rx="1" />
              <rect x="92" y="110" width="6" height="10" rx="1" />
            </g>
            <path d="M8 108h136v34H8z" fill="#0D2130" opacity="0.55" />
            <rect x="18" y="158" width="72" height="5" rx="2.5" fill="#2B3350" opacity="0.6" />
            <rect x="18" y="167" width="46" height="4" rx="2" fill="#2B3350" opacity="0.28" />
          </g>
        </g>

        {/* dotted upload paths */}
        <path
          d="M214 330C244 310 250 286 268 270"
          stroke="#C4B5FD"
          strokeOpacity="0.6"
          strokeWidth="1.6"
          strokeDasharray="3 7"
          strokeLinecap="round"
          className="scene-path"
        />
        <path
          d="M414 244C392 254 382 262 374 274"
          stroke="#93C5FD"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          strokeDasharray="3 7"
          strokeLinecap="round"
          className="scene-path scene-path--slow"
        />
        <path
          d="M424 330C404 326 396 322 386 318"
          stroke="#C4B5FD"
          strokeOpacity="0.5"
          strokeWidth="1.6"
          strokeDasharray="3 7"
          strokeLinecap="round"
          className="scene-path"
        />

        {/* cloud */}
        <g className="scene-cloud">
          <ellipse cx="325" cy="372" rx="150" ry="22" fill="#080D1C" opacity="0.28" filter={`url(#${id}-blur)`} />
          <path
            d="M204 344c-35 0-63-27-63-61 0-33 27-60 61-60 5-42 41-75 85-75 35 0 66 21 81 52 9-6 21-10 33-10 35 0 64 28 64 63 0 6-1 12-3 18 23 11 39 34 39 61 0 38-32 68-71 68H204z"
            fill={`url(#${id}-cloud)`}
            stroke={`url(#${id}-stroke)`}
            strokeWidth="1.5"
          />
          <path
            d="M238 282c-16 0-28-12-28-27 0-14 11-26 25-26 2-25 23-45 49-45 21 0 40 13 47 32 5-3 11-5 17-5 18 0 33 14 33 32 0 3 0 6-1 8 13 5 22 17 22 31 0 21-17 38-39 38H238z"
            fill="#F7F4EE"
            fillOpacity="0.07"
            stroke="#FFFFFF"
            strokeOpacity="0.14"
          />
          <g transform="translate(292 300)">
            <circle cx="32" cy="32" r="32" fill={`url(#${id}-accent)`} opacity="0.16" />
            <path
              d="M20 34.5l8 8 16-17"
              stroke="#F7F4EE"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <text x="320" y="398" textAnchor="middle" fill="#C7CCEE" fontSize="10.5" letterSpacing="2.6" fontFamily="Inter, sans-serif">
            ENCRYPTED · PRIVATE
          </text>
        </g>

        {/* storage cylinder */}
        <g transform="translate(300 438)" className="scene-float scene-float--d">
          <ellipse cx="46" cy="16" rx="46" ry="14" fill="#121A36" stroke="#6D74D9" strokeOpacity="0.5" />
          <path d="M0 16v34c0 8 20 14 46 14s46-6 46-14V16" fill="#0B1226" stroke="#6D74D9" strokeOpacity="0.5" />
          <path d="M0 33c0 8 20 14 46 14s46-6 46-14" stroke="#6D74D9" strokeOpacity="0.3" />
          <ellipse cx="46" cy="16" rx="34" ry="9" fill="#1A2244" />
          <path d="M32 13l14-7 14 7-14 7-14-7z" fill="#8B5CF6" opacity="0.85" />
          <text x="46" y="40" textAnchor="middle" fill="#B9BFF3" fontSize="10" letterSpacing="2" fontFamily="Inter, sans-serif">
            S3
          </text>
        </g>
      </svg>

      <div className="scene-chip scene-chip--secure">
        <span className="scene-chip__dot" />
        <span>
          <strong>Private bucket</strong>
          <small>Presigned access only</small>
        </span>
      </div>
      <div className="scene-chip scene-chip--upload">
        <span className="scene-chip__icon">↑</span>
        <span>
          <strong>Upload complete</strong>
          <small>2.4 MB · JPEG</small>
        </span>
      </div>
    </div>
  );
}
