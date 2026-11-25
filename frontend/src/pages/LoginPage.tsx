import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { FormError, PasswordField } from "../components/ui/FormBits";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError } from "../services/api";

interface LocationState {
  from?: string;
}

export function LoginPage() {
  usePageTitle("Sign in");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = (location.state as LocationState | null)?.from ?? "/app";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from.startsWith("/app") ? from : "/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.detail
          : "Something went wrong while signing in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => {
    setEmail("demo@aeropix.app");
    setPassword("AeropixDemo123!");
    setError("");
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside__top">
          <Logo />
          <Link to="/" className="auth-aside__back">
            <ArrowLeft size={15} /> Back to site
          </Link>
        </div>
        <div className="auth-aside__copy">
          <p className="eyebrow eyebrow--light">Private image library</p>
          <h1>
            The quiet place
            <br />
            for your <em>photographs.</em>
          </h1>
          <p>
            Sign in to your library, continue organising albums, or explore the seeded demo
            collection with real cloud-ready architecture behind it.
          </p>
          <ul className="auth-aside__list">
            <li>
              <Check size={14} /> Presigned, time-limited image access
            </li>
            <li>
              <Check size={14} /> Albums, favourites and search
            </li>
            <li>
              <Check size={14} /> Genuine Amazon S3 storage path
            </li>
          </ul>
        </div>
        <div className="auth-aside__foot">
          <Lock size={14} />
          <span>JWT sessions · Argon2 password hashing</span>
        </div>
      </aside>

      <main className="auth-main">
        <motion.div
          className="auth-card"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-card__head">
            <div className="auth-card__badge">
              <ShieldCheck size={14} /> Secure sign-in
            </div>
            <h2>Welcome back</h2>
            <p>Enter the email address and password for your AEROPIX account.</p>
          </div>

          <form className="form" onSubmit={submit} noValidate>
            <FormError>{error}</FormError>
            <div className="field">
              <label className="field__label" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={busy}
              />
            </div>
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              name="password"
              disabled={busy}
            />
            <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to AEROPIX"}
              {!busy ? <ArrowRight size={16} /> : null}
            </button>
          </form>

          <button type="button" className="demo-credentials" onClick={useDemo} disabled={busy}>
            <span className="demo-credentials__head">
              <span className="tag tag--demo">Demo</span>
              <strong>Use the seeded demo account</strong>
            </span>
            <span className="demo-credentials__body">
              <code>demo@aeropix.app</code>
              <code>AeropixDemo123!</code>
            </span>
            <span className="demo-credentials__hint">Click to fill the form</span>
          </button>

          <p className="auth-card__switch">
            New to AEROPIX? <Link to="/register">Create an account</Link>
          </p>
        </motion.div>
        <p className="auth-legal">
          By signing in you agree that this project is an academic demonstration. Do not upload
          sensitive or confidential images to a public deployment.
        </p>
      </main>
    </div>
  );
}
