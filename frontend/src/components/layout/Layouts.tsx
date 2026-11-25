import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../Logo";
import { Avatar } from "../ui/Avatar";

const marketingLinks = [
  { label: "Overview", href: "#overview" },
  { label: "How it works", href: "#workflow" },
  { label: "Architecture", href: "#architecture" },
  { label: "Demo gallery", href: "#demo" },
];

export function MarketingLayout() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="marketing-shell">
      <header className="marketing-nav">
        <div className="marketing-nav__inner">
          <Logo />
          <nav className="marketing-nav__links" aria-label="Main navigation">
            {marketingLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="marketing-nav__actions">
            {status === "authenticated" && user ? (
              <Link to="/app" className="btn btn--primary btn--sm">
                <Avatar name={user.name} size={22} />
                Open workspace
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost btn--sm marketing-nav__signin">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn--primary btn--sm">
                  Create account
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="marketing-nav__toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open ? (
          <motion.div
            className="marketing-nav__mobile"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: reduced ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {marketingLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="marketing-nav__mobile-actions">
              <Link to="/login" className="btn btn--ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn--primary">
                Create account
              </Link>
            </div>
          </motion.div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="marketing-footer">
        <div className="marketing-footer__inner">
          <div className="marketing-footer__brand">
            <Logo />
            <p>
              A cloud-based image storage and gallery system built for an academic cloud
              computing project. Real Amazon S3, real FastAPI, real privacy.
            </p>
            <span className="pill pill--demo">Demo content is clearly labelled</span>
          </div>
          <div className="marketing-footer__columns">
            <div>
              <h3>Product</h3>
              <a href="#overview">Overview</a>
              <a href="#workflow">How it works</a>
              <a href="#demo">Demo gallery</a>
              <Link to="/register">Create account</Link>
            </div>
            <div>
              <h3>Engineering</h3>
              <a href="#architecture">Architecture</a>
              <a href="#security">Security model</a>
              <Link to="/login">Sign in</Link>
            </div>
            <div>
              <h3>Project</h3>
              <span className="marketing-footer__muted">Amazon S3 storage layer</span>
              <span className="marketing-footer__muted">FastAPI + SQLite metadata</span>
              <span className="marketing-footer__muted">React single-page interface</span>
            </div>
          </div>
        </div>
        <div className="marketing-footer__base">
          <p>© {new Date().getFullYear()} AEROPIX. Academic project — local demo mode.</p>
          <p>Built with FastAPI, React, Boto3 and Amazon S3.</p>
        </div>
      </footer>
    </div>
  );
}

export function MarketingHeaderSpacer() {
  return <div className="marketing-header-spacer" aria-hidden="true" />;
}

const appLinks = [
  { to: "/app", label: "Dashboard", end: true },
  { to: "/app/gallery", label: "Gallery" },
  { to: "/app/upload", label: "Upload" },
  { to: "/app/albums", label: "Albums" },
  { to: "/app/settings", label: "Settings" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-main">
        Skip to content
      </a>

      <aside className={`app-sidebar ${drawerOpen ? "is-open" : ""}`}>
        <div className="app-sidebar__head">
          <Logo to="/app" />
          <button
            type="button"
            className="icon-button app-sidebar__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="app-nav" aria-label="Workspace navigation">
          {appLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `app-nav__link ${isActive ? "is-active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Storage mode</p>
          <div className="sidebar-card__row">
            <span className="storage-dot storage-dot--local" />
            <p>Local development storage</p>
          </div>
          <p className="sidebar-card__hint">
            Switch <code>STORAGE_BACKEND=s3</code> to store new uploads in your private Amazon
            S3 bucket.
          </p>
        </div>

        <div className="app-sidebar__footer">
          {user ? (
            <>
              <Link to="/app/settings" className="sidebar-user">
                <Avatar name={user.name} size={36} />
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
              </Link>
              <button type="button" className="btn btn--ghost btn--sm sidebar-logout" onClick={() => void logout()}>
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </aside>

      {drawerOpen ? (
        <button
          type="button"
          className="app-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <div className="app-main-wrap">
        <header className="app-topbar">
          <button
            type="button"
            className="icon-button app-topbar__menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <span className="menu-bars" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>

          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>AEROPIX</span>
            <span aria-hidden="true">/</span>
            <span className="breadcrumb__current">
              {appLinks
                .slice()
                .reverse()
                .find(
                  (link) =>
                    link.to === "/app"
                      ? location.pathname === "/app"
                      : location.pathname.startsWith(link.to),
                )?.label ?? "Workspace"}
            </span>
          </nav>

          <div className="app-topbar__actions">
            <Link to="/app/upload" className="btn btn--primary btn--sm app-topbar__upload">
              New upload
            </Link>
            <div className="user-menu">
              <button
                type="button"
                className="user-menu__trigger"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
              >
                {user ? <Avatar name={user.name} size={32} /> : null}
                <span className="user-menu__chevron" aria-hidden="true">
                  ▾
                </span>
              </button>
              {menuOpen ? (
                <motion.div
                  className="user-menu__panel"
                  role="menu"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0.01 : 0.18 }}
                >
                  <div className="user-menu__head">
                    <strong>{user?.name}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <Link to="/app/settings" role="menuitem">
                    Profile &amp; settings
                  </Link>
                  <Link to="/app/albums" role="menuitem">
                    Your albums
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                  >
                    Sign out
                  </button>
                </motion.div>
              ) : null}
            </div>
          </div>
        </header>

        <main id="app-main" className="app-content">
          <Outlet />
        </main>

        <footer className="app-footer">
          <p>AEROPIX · academic cloud project</p>
          <p>Uploads are private by default. Media links expire automatically.</p>
        </footer>
      </div>
    </div>
  );
}
