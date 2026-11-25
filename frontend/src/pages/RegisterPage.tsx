import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Circle, Lock, Sparkles } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { FormError, PasswordField } from "../components/ui/FormBits";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError } from "../services/api";

const rules = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "At least one letter", test: (value: string) => /[A-Za-z]/.test(value) },
  { label: "At least one number", test: (value: string) => /\d/.test(value) },
];

export function RegisterPage() {
  usePageTitle("Create account");
  const { register } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ruleState = useMemo(
    () => rules.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );
  const passwordOkay = ruleState.every((rule) => rule.passed);
  const matches = confirm.length > 0 && confirm === password;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!passwordOkay) {
      setError("Your password does not yet meet all the requirements below.");
      return;
    }
    if (!matches) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.detail
          : "Something went wrong while creating your account. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell auth-shell--register">
      <aside className="auth-aside auth-aside--register">
        <div className="auth-aside__top">
          <Logo />
          <Link to="/" className="auth-aside__back">
            <ArrowLeft size={15} /> Back to site
          </Link>
        </div>
        <div className="auth-aside__copy">
          <p className="eyebrow eyebrow--light">Start your library</p>
          <h1>
            Your moments.
            <br />
            Your cloud. <em>Your space.</em>
          </h1>
          <p>
            Create a private AEROPIX account in seconds. Upload your first images, group them into
            albums, and watch your dashboard fill with real statistics.
          </p>
          <div className="auth-aside__quote">
            <Sparkles size={16} />
            <p>
              “A photograph is a small promise that this moment mattered enough to keep.”
            </p>
          </div>
        </div>
        <div className="auth-aside__foot">
          <Lock size={14} />
          <span>Private bucket · signed access · your data stays yours</span>
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
              <Sparkles size={14} /> Fresh account
            </div>
            <h2>Create your gallery</h2>
            <p>All you need is a name, an email address and a strong password.</p>
          </div>

          <form className="form" onSubmit={submit} noValidate>
            <FormError>{error}</FormError>
            <div className="field">
              <label className="field__label" htmlFor="register-name">
                Your name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Arpita Sharma"
                maxLength={80}
                required
                disabled={busy}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="register-email">
                Email address
              </label>
              <input
                id="register-email"
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
              autoComplete="new-password"
              name="new-password"
              disabled={busy}
            />
            <ul className="password-rules" aria-label="Password requirements">
              {ruleState.map((rule) => (
                <li key={rule.label} className={rule.passed ? "is-passed" : ""}>
                  {rule.passed ? <Check size={13} /> : <Circle size={9} />}
                  {rule.label}
                </li>
              ))}
            </ul>
            <div className="field">
              <label className="field__label" htmlFor="register-confirm">
                Confirm password
              </label>
              <input
                id="register-confirm"
                name="confirm-password"
                type="password"
                className={`input ${confirm && !matches ? "input--invalid" : ""}`}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                placeholder="Repeat your password"
                required
                disabled={busy}
                aria-invalid={Boolean(confirm) && !matches}
              />
              {confirm ? (
                <p className={`field__hint ${matches ? "is-success" : "is-error"}`}>
                  {matches ? "Passwords match." : "Passwords do not match yet."}
                </p>
              ) : null}
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
              {busy ? "Creating your gallery…" : "Create account"}
              {!busy ? <ArrowRight size={16} /> : null}
            </button>
          </form>

          <p className="auth-card__switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
        <p className="auth-legal">
          Storing personal photographs on a public deployment requires care. Review the privacy
          notes in the project documentation before inviting real users.
        </p>
      </main>
    </div>
  );
}
