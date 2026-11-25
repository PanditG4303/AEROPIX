import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Cloud,
  Fingerprint,
  Gauge,
  Images,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { ArchitectureDiagram } from "../components/illustrations/ArchitectureDiagram";
import { CloudUploadScene } from "../components/illustrations/CloudUploadScene";

const demoShots = [
  { file: "demo-01.jpg", title: "Violet ridgeline", meta: "Demo · landscape" },
  { file: "demo-03.jpg", title: "Quiet shoreline", meta: "Demo · study" },
  { file: "demo-05.jpg", title: "Desert bloom", meta: "Demo · photograph" },
  { file: "demo-06.jpg", title: "Coastal dusk", meta: "Demo · photograph" },
  { file: "demo-08.jpg", title: "Concrete light", meta: "Demo · architecture" },
];

const features = [
  {
    icon: Lock,
    title: "Private by default",
    copy: "Every object lives in a private bucket with Block Public Access enabled. Images are streamed through short-lived presigned URLs — never a public object link.",
  },
  {
    icon: Layers,
    title: "A library that stays organised",
    copy: "Albums group moments without duplicating files. Favourites, search, sort and file-type filters are backed by real SQL queries, not client-side guesses.",
  },
  {
    icon: Zap,
    title: "Fast on a real cloud",
    copy: "The React interface talks to a FastAPI service on EC2, which writes binaries to Amazon S3 and keeps only lightweight metadata in SQLite.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Choose your photographs",
    copy: "Drag JPG, JPEG, PNG, WEBP or GIF files into the upload centre. Type, dimension and size checks happen before anything touches storage.",
  },
  {
    step: "02",
    title: "FastAPI validates and prepares",
    copy: "Pillow verifies the bytes, extracts dimensions, strips metadata for the thumbnail and writes a safe, per-user object key.",
  },
  {
    step: "03",
    title: "Boto3 writes to Amazon S3",
    copy: "The original and its thumbnail are uploaded with server-side encryption. The database records the key, not the binary.",
  },
  {
    step: "04",
    title: "Presigned URLs bring it back",
    copy: "Every thumbnail and original is served through a time-limited signed link that expires automatically after fifteen minutes.",
  },
];

const securityPoints = [
  "Private S3 bucket with all four Block Public Access settings enabled",
  "Server-side encryption on every object (SSE-S3 or SSE-KMS)",
  "Least-privilege IAM instance profile — no long-lived keys on the server",
  "JWT authentication with Argon2 password hashing",
  "Per-user ownership checks on every image, album and media route",
];

export function LandingPage() {
  usePageTitle();
  const { status, user } = useAuth();
  const reduced = useReducedMotion();
  const primaryHref = status === "authenticated" ? "/app" : "/register";
  const primaryLabel = status === "authenticated" ? "Open your workspace" : "Start your gallery";

  const fadeIn = (delay = 0) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: reduced ? 0.01 : 0.6, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <>
      <section className="hero" id="overview">
        <div className="hero__grain" aria-hidden="true" />
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__inner">
          <motion.div
            className="hero__copy"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="pill pill--hero">
              <Sparkles size={13} /> AWS cloud computing project · 2026
            </span>
            <h1 className="hero__title">
              Every memory,
              <br />
              held in the <em>cloud.</em>
            </h1>
            <p className="hero__lede">
              AEROPIX is a private image library for people who care where their photographs
              live. Real Amazon S3 storage, a rigorous FastAPI backend, and a gallery that feels
              quiet, deliberate and yours.
            </p>
            <div className="hero__actions">
              <Link to={primaryHref} className="btn btn--primary btn--lg">
                {primaryLabel}
                <ArrowRight size={17} />
              </Link>
              <Link to="/login" className="btn btn--glass btn--lg">
                {status === "authenticated" && user ? `Signed in as ${user.name.split(" ")[0]}` : "Sign in to a demo account"}
              </Link>
            </div>
            <dl className="hero__facts">
              <div>
                <dt>Storage</dt>
                <dd>Amazon S3</dd>
              </div>
              <div>
                <dt>API</dt>
                <dd>FastAPI</dd>
              </div>
              <div>
                <dt>Interface</dt>
                <dd>React</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>Presigned</dd>
              </div>
            </dl>
          </motion.div>

          <motion.div
            className="hero__visual"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.9, delay: reduced ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <CloudUploadScene />
          </motion.div>
        </div>

        <div className="hero__marquee" aria-hidden="true">
          <div className="hero__marquee-track">
            {[0, 1].map((copy) => (
              <span key={copy}>
                PRIVATE STORAGE <i>·</i> PRESIGNED ACCESS <i>·</i> FASTAPI <i>·</i> AMAZON S3 <i>·</i>{" "}
                ARGON2 <i>·</i> JWT <i>·</i> REACT <i>·</i>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="section__inner">
          <motion.div className="stat-band" {...fadeIn()}>
            <div className="stat-band__item">
              <span className="stat-band__value">8</span>
              <span className="stat-band__label">original demo photographs, seeded locally</span>
            </div>
            <div className="stat-band__item">
              <span className="stat-band__value">5</span>
              <span className="stat-band__label">validated image formats — JPG, JPEG, PNG, WEBP, GIF</span>
            </div>
            <div className="stat-band__item">
              <span className="stat-band__value">15 min</span>
              <span className="stat-band__label">presigned URL lifetime on every private object</span>
            </div>
            <div className="stat-band__item">
              <span className="stat-band__value">100%</span>
              <span className="stat-band__label">of AWS objects remain private by policy</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section" id="overview-detail">
        <div className="section__inner">
          <motion.header className="section-head" {...fadeIn()}>
            <p className="eyebrow">The idea</p>
            <h2 className="section-title">
              A gallery built like a <em>quiet room</em>, not a feed.
            </h2>
            <p className="section-lede">
              No likes, no algorithm, no public profile. Just your photographs, carefully stored,
              clearly organised and reachable only through links that expire.
            </p>
          </motion.header>

          <div className="feature-grid">
            {features.map((feature, index) => (
              <motion.article key={feature.title} className="feature-card" {...fadeIn(index * 0.08)}>
                <span className="feature-card__icon" aria-hidden="true">
                  <feature.icon size={20} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                <span className="feature-card__index" aria-hidden="true">
                  0{index + 1}
                </span>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper" id="workflow">
        <div className="section__inner">
          <div className="workflow">
            <motion.div className="workflow__intro" {...fadeIn()}>
              <p className="eyebrow">From click to cloud</p>
              <h2 className="section-title">
                Four deliberate steps,
                <br />
                <em>no magic.</em>
              </h2>
              <p className="section-lede">
                The same path runs in local development and on EC2. Only the storage driver
                changes when you switch to Amazon S3.
              </p>
              <div className="workflow__note">
                <ShieldCheck size={18} />
                <p>
                  Files are validated before storage. Filenames are never trusted. Object keys are
                  generated on the server.
                </p>
              </div>
            </motion.div>

            <ol className="workflow__steps">
              {workflow.map((item, index) => (
                <motion.li key={item.step} {...fadeIn(index * 0.06)}>
                  <span className="workflow__step">{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section" id="demo">
        <div className="section__inner">
          <motion.header className="section-head section-head--split" {...fadeIn()}>
            <div>
              <p className="eyebrow">Inside the demo library</p>
              <h2 className="section-title">
                A gallery with real <em>photographs</em> inside.
              </h2>
            </div>
            <p className="section-head__aside">
              Every demo asset below is an original, locally generated artwork that ships with
              the project. Each card is labelled <strong>Demo</strong> in the application — it is
              sample content, not a stock library.
            </p>
          </motion.header>

          <div className="demo-mosaic">
            {demoShots.map((shot, index) => (
              <motion.figure
                key={shot.file}
                className={`demo-mosaic__item demo-mosaic__item--${index + 1}`}
                {...fadeIn(index * 0.06)}
              >
                <img src={`/demo/${shot.file}`} alt={shot.title} loading="lazy" />
                <figcaption>
                  <span className="tag tag--demo">Demo</span>
                  <div>
                    <strong>{shot.title}</strong>
                    <small>{shot.meta}</small>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
            <motion.div className="demo-mosaic__card" {...fadeIn(0.2)}>
              <Images size={22} />
              <h3>Eight curated demo images</h3>
              <p>
                Seeded through the same upload pipeline as a real user, so the dashboard,
                albums and storage counters all show genuine database state.
              </p>
              <Link to="/login" className="link-button">
                Explore the demo account <ArrowUpRight size={14} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section section--paper" id="architecture">
        <div className="section__inner">
          <motion.header className="section-head section-head--split" {...fadeIn()}>
            <div>
              <p className="eyebrow">Architecture</p>
              <h2 className="section-title">
                One request, <em>carefully travelled.</em>
              </h2>
            </div>
            <p className="section-head__aside">
              Nginx serves the built React interface and proxies <code>/api</code> to FastAPI on
              the same EC2 instance. Media never sits on the web server — it lives in a private
              S3 bucket and is read with presigned links.
            </p>
          </motion.header>

          <motion.div className="architecture-frame" {...fadeIn(0.05)}>
            <ArchitectureDiagram />
          </motion.div>

          <div className="arch-notes">
            <motion.div className="arch-note" {...fadeIn(0.05)}>
              <Cloud size={19} />
              <div>
                <h3>Amazon S3</h3>
                <p>Private bucket, versioning recommended, SSE on every object.</p>
              </div>
            </motion.div>
            <motion.div className="arch-note" {...fadeIn(0.1)}>
              <Gauge size={19} />
              <div>
                <h3>Amazon EC2</h3>
                <p>Ubuntu instance running Gunicorn/Uvicorn behind Nginx.</p>
              </div>
            </motion.div>
            <motion.div className="arch-note" {...fadeIn(0.15)}>
              <Fingerprint size={19} />
              <div>
                <h3>IAM instance profile</h3>
                <p>Temporary, scoped credentials — no secrets baked into the server.</p>
              </div>
            </motion.div>
            <motion.div className="arch-note" {...fadeIn(0.2)}>
              <Images size={19} />
              <div>
                <h3>Metadata</h3>
                <p>SQLite stores users, albums and object keys — never image bytes.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="security-band" id="security">
        <div className="section__inner security-band__inner">
          <motion.div className="security-band__copy" {...fadeIn()}>
            <p className="eyebrow eyebrow--light">Security model</p>
            <h2 className="section-title section-title--light">
              Private is not a setting here.
              <br />
              <em>It is the architecture.</em>
            </h2>
            <p>
              There is no public URL to leak, because there are no public objects. Access is
              always a decision made by the API, signed for a short window and tied to your
              identity.
            </p>
            <Link to="/register" className="btn btn--light">
              Create your private gallery <ArrowRight size={16} />
            </Link>
          </motion.div>
          <motion.ul className="security-band__list" {...fadeIn(0.1)}>
            {securityPoints.map((point) => (
              <li key={point}>
                <span className="security-band__check">
                  <Check size={13} />
                </span>
                {point}
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <motion.div className="cta-panel" {...fadeIn()}>
            <div className="cta-panel__glow" aria-hidden="true" />
            <UploadCloud size={28} />
            <p className="eyebrow">Your first upload is waiting</p>
            <h2 className="section-title section-title--light">
              Give your photographs a <em>proper home.</em>
            </h2>
            <p>
              Create an account and upload in under a minute. Local demo mode runs without any AWS
              credentials; the S3 path is documented and ready when you are.
            </p>
            <div className="cta-panel__actions">
              <Link to={primaryHref} className="btn btn--light btn--lg">
                {primaryLabel}
                <ArrowRight size={17} />
              </Link>
              <a href="#architecture" className="btn btn--ghost-light btn--lg">
                Read the architecture
              </a>
            </div>
            <div className="cta-panel__demo">
              <span>Demo credentials</span>
              <code>demo@aeropix.app</code>
              <code>AeropixDemo123!</code>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
