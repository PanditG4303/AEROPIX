import { useId } from "react";
import { ServerEC2Art, BucketS3Art } from "./CloudArt";

/** Editable AWS architecture diagram. The same layout is provided as a
 * standalone SVG/PNG in infrastructure/architecture and docs. */
export function ArchitectureDiagram({ className = "" }: { className?: string }) {
  const raw = useId();
  const id = `arch-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 960 540"
      className={`architecture-diagram ${className}`}
      role="img"
      aria-label="AEROPIX AWS architecture: browser to Nginx and FastAPI on EC2, FastAPI to S3, metadata in SQLite, credentials supplied by an IAM instance profile"
    >
      <defs>
        <linearGradient id={`${id}-ec2`} x1="275" y1="70" x2="625" y2="470" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8ED" />
          <stop offset="1" stopColor="#FDEFD8" />
        </linearGradient>
        <linearGradient id={`${id}-primary`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
        <marker id={`${id}-arrow`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0 0.7L8.4 4.5 0 8.3z" fill="#67708C" />
        </marker>
        <marker id={`${id}-arrow-blue`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0 0.7L8.4 4.5 0 8.3z" fill="#6366F1" />
        </marker>
        <marker id={`${id}-arrow-green`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0 0.7L8.4 4.5 0 8.3z" fill="#569A31" />
        </marker>
      </defs>

      <rect x="1" y="1" width="958" height="538" rx="22" fill="#FBF8F2" stroke="#E8E1D5" />

      {/* Browser */}
      <g>
        <rect x="34" y="196" width="172" height="160" rx="16" fill="#0C1327" />
        <rect x="34" y="196" width="172" height="30" rx="16" fill="#141C36" />
        <circle cx="51" cy="211" r="3.2" fill="#F0A879" />
        <circle cx="63" cy="211" r="3.2" fill="#F5D8AF" />
        <circle cx="75" cy="211" r="3.2" fill="#8B5CF6" />
        <text x="120" y="215" textAnchor="middle" fill="#9AA4C8" fontSize="9" letterSpacing="1.2">
          BROWSER
        </text>
        <rect x="48" y="240" width="144" height="56" rx="8" fill="#17203C" stroke="#2A3558" />
        <text x="60" y="261" fill="#F7F4EE" fontSize="11" fontWeight="600">
          AEROPIX SPA
        </text>
        <text x="60" y="278" fill="#8F9AC0" fontSize="9">
          React · Vite
        </text>
        <circle cx="170" cy="252" r="5" fill="#38BDF8" opacity="0.8" />
        <rect x="48" y="308" width="64" height="20" rx="6" fill="#1B2545" />
        <text x="80" y="322" textAnchor="middle" fill="#9BA8D6" fontSize="8.5">
          HTTPS
        </text>
        <text x="120" y="336" textAnchor="middle" fill="#7C86A9" fontSize="8.5" letterSpacing="0.4">
          user's device
        </text>
      </g>

      {/* Browser → Nginx */}
      <path d="M206 264H298" stroke="#67708C" strokeWidth="1.6" markerEnd={`url(#${id}-arrow)`} />
      <rect x="216" y="241" width="74" height="16" rx="8" fill="#F1ECFB" stroke="#DDD4F3" />
      <text x="253" y="252" textAnchor="middle" fill="#6357A8" fontSize="8" letterSpacing="0.4">
        HTTPS · 443
      </text>

      {/* EC2 container */}
      <rect x="276" y="66" width="350" height="408" rx="20" fill={`url(#${id}-ec2)`} stroke="#E7C99F" strokeDasharray="6 5" />
      <text x="296" y="92" fill="#8A5A24" fontSize="10.5" fontWeight="600" letterSpacing="1.2">
        AMAZON EC2 · UBUNTU
      </text>
      <text x="606" y="92" textAnchor="end" fill="#A87F4D" fontSize="8.5">
        t3.micro · instance profile
      </text>

      <g>
        <rect x="300" y="116" width="302" height="64" rx="12" fill="#FFFFFF" stroke="#EADAC2" />
        <rect x="316" y="132" width="32" height="32" rx="8" fill="#0F1730" />
        <path d="M324 140h16M324 146h16M324 152h10M324 158h16" stroke="#A5B4FC" strokeWidth="1.6" strokeLinecap="round" />
        <text x="362" y="141" fill="#22304F" fontSize="12" fontWeight="600">
          Nginx
        </text>
        <text x="362" y="158" fill="#7C849B" fontSize="9.5">
          Reverse proxy · serves React build
        </text>
        <circle cx="584" cy="148" r="4" fill="#4ADE80" />
      </g>

      <path d="M451 180v30" stroke="#67708C" strokeWidth="1.6" markerEnd={`url(#${id}-arrow)`} />
      <text x="462" y="198" fill="#8A90A5" fontSize="8.5">
        proxy_pass
      </text>

      <g>
        <rect x="300" y="214" width="302" height="88" rx="12" fill="#FFFFFF" stroke="#DCD5F2" />
        <rect x="316" y="231" width="32" height="32" rx="8" fill={`url(#${id}-primary)`} />
        <path d="M325 247h14M325 252h14M325 257h7" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" />
        <text x="362" y="241" fill="#22304F" fontSize="12" fontWeight="600">
          FastAPI application
        </text>
        <text x="362" y="258" fill="#7C849B" fontSize="9.5">
          REST API · JWT auth · upload validation
        </text>
        <rect x="362" y="270" width="72" height="18" rx="6" fill="#F3F0FB" />
        <text x="398" y="282" textAnchor="middle" fill="#7665B8" fontSize="8">
          /api/images
        </text>
        <rect x="442" y="270" width="54" height="18" rx="6" fill="#EEF7FD" />
        <text x="469" y="282" textAnchor="middle" fill="#437BA5" fontSize="8">
          /api/auth
        </text>
        <rect x="504" y="270" width="72" height="18" rx="6" fill="#F0F8F4" />
        <text x="540" y="282" textAnchor="middle" fill="#4B7E64" fontSize="8">
          /api/dashboard
        </text>
      </g>

      <path d="M451 320v30" stroke="#67708C" strokeWidth="1.6" markerEnd={`url(#${id}-arrow)`} />
      <text x="462" y="339" fill="#8A90A5" fontSize="8.5">
        SQLAlchemy
      </text>

      <g>
        <rect x="300" y="354" width="302" height="78" rx="12" fill="#FFFFFF" stroke="#E5DCCD" />
        <ellipse cx="332" cy="382" rx="16" ry="6" fill="#8B5CF6" opacity="0.16" />
        <path d="M316 382v20c0 4 7 7 16 7s16-3 16-7v-20" fill="none" stroke="#8B5CF6" strokeWidth="1.6" />
        <text x="362" y="378" fill="#22304F" fontSize="12" fontWeight="600">
          SQLite metadata database
        </text>
        <text x="362" y="395" fill="#7C849B" fontSize="9.5">
          users · images · albums · album_images
        </text>
        <text x="362" y="412" fill="#A39B8B" fontSize="8.5">
          binaries are never stored in the database
        </text>
      </g>

      <text x="451" y="454" textAnchor="middle" fill="#9A815F" fontSize="8.5" letterSpacing="0.4">
        file system · /opt/aeropix
      </text>

      {/* FastAPI → S3 */}
      <path d="M606 258H726" stroke="#569A31" strokeWidth="1.8" markerEnd={`url(#${id}-arrow-green)`} />
      <rect x="620" y="237" width="92" height="18" rx="9" fill="#EDF8EE" stroke="#D2EAD5" />
      <text x="666" y="249" textAnchor="middle" fill="#3F7A46" fontSize="8">
        boto3 · PutObject
      </text>
      <text x="666" y="272" textAnchor="middle" fill="#7E9B83" fontSize="7.5">
        presigned GET
      </text>

      {/* S3 */}
      <g>
        <rect x="730" y="108" width="196" height="196" rx="16" fill="#0E291F" />
        <ellipse cx="828" cy="156" rx="57" ry="18" fill="#1D5139" />
        <path d="M771 156v72c0 10 25 18 57 18s57-8 57-18v-72" fill="#133B2B" stroke="#2F7A59" />
        <ellipse cx="828" cy="156" rx="57" ry="18" fill="#1B4A35" />
        <ellipse cx="828" cy="156" rx="44" ry="12" fill="#D9EEE4" />
        <path d="M806 199l22-12 22 12-22 12-22-12z" fill="#8FC7AE" opacity="0.9" />
        <text x="828" y="253" textAnchor="middle" fill="#F1FAF5" fontSize="12" fontWeight="600">
          Amazon S3
        </text>
        <text x="828" y="270" textAnchor="middle" fill="#A9C9BB" fontSize="8.5">
          private bucket · images + thumbnails
        </text>
        <text x="828" y="287" textAnchor="middle" fill="#7FA795" fontSize="7.5">
          Block Public Access · SSE-S3
        </text>
      </g>

      {/* IAM */}
      <g>
        <rect x="730" y="340" width="196" height="104" rx="14" fill="#FFFFFF" stroke="#E3D9C7" />
        <circle cx="760" cy="370" r="15" fill="#FDF0E3" />
        <path d="M760 362v10l6 4" stroke="#C17828" strokeWidth="1.7" strokeLinecap="round" />
        <text x="786" y="368" fill="#22304F" fontSize="11" fontWeight="600">
          IAM instance profile
        </text>
        <text x="786" y="383" fill="#7C849B" fontSize="8.5">
          temporary credentials
        </text>
        <rect x="746" y="400" width="164" height="28" rx="7" fill="#FBF7EF" stroke="#EEE3D1" />
        <text x="828" y="418" textAnchor="middle" fill="#8B6A3B" fontSize="7.5">
          s3:PutObject · GetObject · DeleteObject
        </text>
      </g>
      <path d="M730 380H676V446" stroke="#C17828" strokeWidth="1.4" strokeDasharray="4 4" markerEnd={`url(#${id}-arrow)`} fill="none" />
      <path d="M730 206h-12" stroke="#C17828" strokeWidth="1.4" strokeDasharray="4 4" />

      {/* presigned return path */}
      <path
        d="M828 108V46H120v150"
        stroke="#6366F1"
        strokeWidth="1.5"
        strokeDasharray="5 6"
        fill="none"
        markerEnd={`url(#${id}-arrow-blue)`}
        opacity="0.75"
      />
      <rect x="396" y="31" width="200" height="28" rx="14" fill="#F1ECFB" stroke="#DDD4F3" />
      <text x="496" y="49" textAnchor="middle" fill="#6357A8" fontSize="8.5" letterSpacing="0.2">
        presigned image URL · expires in 15 min
      </text>

      <g transform="translate(786 470)">
        <circle cx="4" cy="4" r="4" fill="#6366F1" />
        <text x="16" y="7" fill="#8A90A5" fontSize="8">
          private by default
        </text>
      </g>

      {/* small decorative EC2 / S3 icons */}
      <g transform="translate(232 78) scale(0.28)" opacity="0.9">
        <ServerEC2Art />
      </g>
      <g transform="translate(848 484) scale(0.24)" opacity="0.9">
        <BucketS3Art />
      </g>
    </svg>
  );
}
