import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Cloud,
  Database,
  HardDrive,
  Heart,
  Images,
  Layers,
  Plus,
  Server,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useDashboard, useStorageStatus } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatBytes, formatShortDate, greeting, timeAgo } from "../services/format";
import { AlbumCover } from "../components/illustrations/AlbumCover";
import { StorageGauge } from "../components/illustrations/CloudArt";
import { AnimatedNumber } from "../components/ui/FormBits";
import { PageLoader, SkeletonBlock } from "../components/ui/Feedback";
import { EmptyGalleryArt } from "../components/illustrations/StateArt";

const typeColors = ["#7C6CF6", "#38BDF8", "#E8A87C", "#69A57E", "#C084A8", "#8A90A5"];

export function DashboardPage() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const dashboard = useDashboard();
  const storage = useStorageStatus();
  const today = new Date();
  const firstName = user?.name.split(" ")[0] ?? "there";

  if (dashboard.isLoading) {
    return <PageLoader label="Gathering your library" />;
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <div className="page">
        <div className="panel panel--error">
          <h2>Your dashboard could not be loaded</h2>
          <p>
            {dashboard.error instanceof Error
              ? dashboard.error.message
              : "The API did not respond. Confirm the backend is running and try again."}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => void dashboard.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard.data;
  const storagePercent = stats.storage_used_percent;
  const activityMax = Math.max(1, ...stats.activity.map((point) => point.uploads));
  const hasImages = stats.total_images > 0;

  const fade = (delay = 0) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0.01 : 0.5, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="page dashboard">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            {today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="page-title">
            {greeting()}, <em>{firstName}.</em>
          </h1>
          <p className="page-subtitle">
            {hasImages
              ? `Your library holds ${stats.total_images} photograph${stats.total_images === 1 ? "" : "s"} across ${stats.total_albums} album${stats.total_albums === 1 ? "" : "s"}.`
              : "Your private library is ready and waiting for its first photograph."}
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/app/gallery" className="btn btn--ghost">
            <Images size={16} /> Open gallery
          </Link>
          <Link to="/app/upload" className="btn btn--primary">
            <UploadCloud size={16} /> Upload images
          </Link>
        </div>
      </header>

      <section className="stat-grid" aria-label="Library statistics">
        <motion.article className="stat-card" {...fade(0)}>
          <div className="stat-card__head">
            <span className="stat-card__icon stat-card__icon--violet">
              <Images size={18} />
            </span>
            <span className="stat-card__trend">All time</span>
          </div>
          <p className="stat-card__value">
            <AnimatedNumber value={stats.total_images} />
          </p>
          <p className="stat-card__label">Photographs stored</p>
          <p className="stat-card__hint">
            {stats.largest_image_bytes > 0
              ? `Largest file ${formatBytes(stats.largest_image_bytes)}`
              : "No files uploaded yet"}
          </p>
        </motion.article>

        <motion.article className="stat-card" {...fade(0.06)}>
          <div className="stat-card__head">
            <span className="stat-card__icon stat-card__icon--blue">
              <Layers size={18} />
            </span>
            <Link to="/app/albums" className="stat-card__link">
              Manage <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="stat-card__value">
            <AnimatedNumber value={stats.total_albums} />
          </p>
          <p className="stat-card__label">Albums created</p>
          <p className="stat-card__hint">
            {stats.recent_albums[0]
              ? `Latest: ${stats.recent_albums[0].name}`
              : "Group related moments together"}
          </p>
        </motion.article>

        <motion.article className="stat-card" {...fade(0.12)}>
          <div className="stat-card__head">
            <span className="stat-card__icon stat-card__icon--rose">
              <Heart size={18} />
            </span>
            <Link to="/app/gallery?favorite=true" className="stat-card__link">
              View <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="stat-card__value">
            <AnimatedNumber value={stats.total_favorites} />
          </p>
          <p className="stat-card__label">Favourites</p>
          <p className="stat-card__hint">
            {stats.total_favorites === 0
              ? "Tap the heart on a photograph"
              : "Marked with the heart in your gallery"}
          </p>
        </motion.article>

        <motion.article className="stat-card stat-card--storage" {...fade(0.18)}>
          <div className="stat-card__head">
            <span className="stat-card__icon stat-card__icon--green">
              <HardDrive size={18} />
            </span>
            <span className="stat-card__trend">
              of {formatBytes(stats.storage_quota_bytes, { decimals: 0 })}
            </span>
          </div>
          <div className="stat-card__storage-row">
            <div>
              <p className="stat-card__value stat-card__value--small">
                {formatBytes(stats.storage_used_bytes)}
              </p>
              <p className="stat-card__label">Storage used</p>
            </div>
            <StorageGauge percent={storagePercent} />
          </div>
        </motion.article>
      </section>

      <div className="dashboard-grid">
        <motion.section className="panel panel--chart" {...fade(0.1)}>
          <header className="panel__head">
            <div>
              <p className="eyebrow">Activity</p>
              <h2>Uploads, last 14 days</h2>
            </div>
            <span className="panel__meta">
              <CalendarDays size={14} /> real database events
            </span>
          </header>

          {hasImages ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={248}>
                <AreaChart data={stats.activity} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C6CF6" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#7C6CF6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" strokeOpacity={0.09} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => formatShortDate(value)}
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={22}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, activityMax + (activityMax > 3 ? 1 : 2)]}
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip
                    cursor={{ stroke: "#7C6CF6", strokeOpacity: 0.3, strokeWidth: 1.5 }}
                    contentStyle={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "var(--shadow-md)",
                      color: "var(--text)",
                    }}
                    labelFormatter={(value: string) => formatShortDate(value)}
                    formatter={(value: number) => [`${value} upload${value === 1 ? "" : "s"}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    isAnimationActive={!reduced}
                    stroke="#7C6CF6"
                    strokeWidth={2.2}
                    fill="url(#activityFill)"
                    dot={{ r: 2.6, strokeWidth: 0, fill: "#7C6CF6" }}
                    activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--surface-raised)", fill: "#7C6CF6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">
              <EmptyGalleryArt className="chart-empty__art" />
              <div>
                <h3>No activity yet</h3>
                <p>Your upload chart will appear here as soon as your first image is stored.</p>
                <Link to="/app/upload" className="btn btn--primary btn--sm">
                  <Plus size={15} /> Upload an image
                </Link>
              </div>
            </div>
          )}
        </motion.section>

        <motion.section className="panel" {...fade(0.16)}>
          <header className="panel__head">
            <div>
              <p className="eyebrow">Composition</p>
              <h2>Library by file type</h2>
            </div>
          </header>
          {stats.storage_by_type.length ? (
            <div className="type-breakdown">
              <div className="type-breakdown__chart">
                <ResponsiveContainer width="100%" height={172}>
                  <PieChart>
                    <Pie
                      data={stats.storage_by_type}
                      dataKey="bytes"
                      nameKey="type"
                      isAnimationActive={!reduced}
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {stats.storage_by_type.map((entry, index) => (
                        <Cell key={entry.type} fill={typeColors[index % typeColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-raised)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--text)",
                      }}
                      formatter={(value: number, name: string) => [formatBytes(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="type-breakdown__center" aria-hidden="true">
                  <span>{stats.storage_by_type.length}</span>
                  <small>{stats.storage_by_type.length === 1 ? "format" : "formats"}</small>
                </div>
              </div>
              <ul className="type-breakdown__legend">
                {stats.storage_by_type.map((entry, index) => (
                  <li key={entry.type}>
                    <span
                      className="legend-dot"
                      style={{ background: typeColors[index % typeColors.length] }}
                      aria-hidden="true"
                    />
                    <strong>{entry.type}</strong>
                    <span>{entry.count}</span>
                    <span className="type-breakdown__bytes">{formatBytes(entry.bytes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="panel__empty">Upload images to see how your storage is composed.</p>
          )}

          <div className={`storage-banner storage-banner--${storage.data?.backend ?? "local"}`}>
            {storage.data?.backend === "s3" ? <Cloud size={17} /> : <Server size={17} />}
            <div>
              <strong>
                {storage.data?.backend === "s3" ? "Amazon S3 storage" : "Local development storage"}
              </strong>
              <p>
                {storage.data?.backend === "s3"
                  ? `${storage.data.bucket} · ${storage.data.region} · ${storage.data.encryption}`
                  : "Files are stored on this machine. No AWS credentials required."}
              </p>
            </div>
            <Link to="/app/settings" className="link-button">
              Details <ArrowRight size={13} />
            </Link>
          </div>
        </motion.section>
      </div>

      <div className="dashboard-grid dashboard-grid--lower">
        <motion.section className="panel" {...fade(0.18)}>
          <header className="panel__head">
            <div>
              <p className="eyebrow">Recently added</p>
              <h2>Newest photographs</h2>
            </div>
            <Link to="/app/gallery" className="link-button">
              View all <ArrowRight size={14} />
            </Link>
          </header>

          {stats.recent_uploads.length ? (
            <div className="recent-grid">
              {stats.recent_uploads.map((image) => (
                <Link key={image.id} to={`/app/images/${image.id}`} className="recent-card">
                  <span className="recent-card__media">
                    {image.thumbnail_url ? (
                      <img src={image.thumbnail_url} alt={image.original_filename} loading="lazy" />
                    ) : (
                      <Images size={20} />
                    )}
                    {image.is_demo ? <span className="tag tag--demo">Demo</span> : null}
                    {image.is_favorite ? (
                      <span className="recent-card__favorite" aria-label="Favourite">
                        <Heart size={12} fill="currentColor" />
                      </span>
                    ) : null}
                  </span>
                  <span className="recent-card__body">
                    <strong>{image.original_filename}</strong>
                    <small>
                      {formatShortDate(image.created_at)} · {formatBytes(image.size_bytes)}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="recent-empty">
              <p>Nothing here yet. New uploads will appear first.</p>
              <Link to="/app/upload" className="btn btn--ghost btn--sm">
                <UploadCloud size={15} /> Add a photograph
              </Link>
            </div>
          )}
        </motion.section>

        <motion.section className="panel" {...fade(0.22)}>
          <header className="panel__head">
            <div>
              <p className="eyebrow">Collections</p>
              <h2>Recent albums</h2>
            </div>
            <Link to="/app/albums" className="link-button">
              All albums <ArrowRight size={14} />
            </Link>
          </header>

          {stats.recent_albums.length ? (
            <ul className="album-mini-list">
              {stats.recent_albums.map((album) => (
                <li key={album.id}>
                  <Link to={`/app/albums/${album.id}`}>
                    <span className="album-mini-list__cover">
                      {album.cover_url ? (
                        <img src={album.cover_url} alt="" loading="lazy" />
                      ) : (
                        <AlbumCover name={album.name} />
                      )}
                    </span>
                    <span className="album-mini-list__body">
                      <strong>{album.name}</strong>
                      <small>
                        {album.image_count} image{album.image_count === 1 ? "" : "s"} ·{" "}
                        {timeAgo(album.updated_at)}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="recent-empty">
              <p>Albums keep related photographs together without duplicating files.</p>
              <Link to="/app/albums" className="btn btn--ghost btn--sm">
                <Layers size={15} /> Create an album
              </Link>
            </div>
          )}

          <div className="system-status">
            <p className="eyebrow">System</p>
            <div>
              <Database size={15} />
              <span>SQLite metadata</span>
              <span className="system-status__ok">connected</span>
            </div>
            <div>
              <ShieldCheck size={15} />
              <span>Private media access</span>
              <span className="system-status__ok">signed URLs</span>
            </div>
            <div>
              <Cloud size={15} />
              <span>{storage.data?.provider ?? "Storage provider"}</span>
              <span className="system-status__ok">
                {storage.data?.reachable === false ? "unreachable" : "ready"}
              </span>
            </div>
          </div>
        </motion.section>
      </div>

      {!hasImages ? (
        <section className="dashboard-onboarding">
          {[...Array(1)].map((_, index) => (
            <SkeletonBlock key={index} className="dashboard-onboarding__skeleton" />
          ))}
          <div className="dashboard-onboarding__copy">
            <p className="eyebrow">Start here</p>
            <h2>Your gallery is ready when you are.</h2>
            <p>
              Upload a photograph, create an album, and watch these statistics become real. The
              seeded demo account already contains eight images if you would like to look around.
            </p>
            <Link to="/app/upload" className="btn btn--primary">
              Upload your first image <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
