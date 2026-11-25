import { useMutation } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Cloud,
  Database,
  HardDrive,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Server,
  Settings2,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormError, PasswordField } from "../components/ui/FormBits";
import { PageLoader } from "../components/ui/Feedback";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useHealth, useStorageStatus } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { api, ApiError } from "../services/api";
import { formatBytes, formatDate } from "../services/format";
import type { ThemePreference } from "../types";

const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun; description: string }> = [
  { value: "light", label: "Light", icon: Sun, description: "Warm paper and ink" },
  { value: "dark", label: "Dark", icon: Moon, description: "Midnight navy" },
  { value: "system", label: "System", icon: Monitor, description: "Follow your device" },
];

export function SettingsPage() {
  usePageTitle("Settings");
  const { user, updateUser, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const reduced = useReducedMotion();
  const storage = useStorageStatus();
  const health = useHealth();

  const [name, setName] = useState(user?.name ?? "");
  const [profileError, setProfileError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const profileMutation = useMutation({
    mutationFn: (payload: { name?: string; theme?: ThemePreference }) => api.auth.updateProfile(payload),
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success("Profile saved", "Your account details are up to date.");
    },
    onError: (error) => {
      setProfileError(error instanceof ApiError ? error.detail : "Your profile could not be saved.");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.auth.changePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      }),
    onSuccess: () => {
      setPasswordSuccess("Password updated. Use your new password the next time you sign in.");
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    },
    onError: (error) => {
      setPasswordError(error instanceof ApiError ? error.detail : "Your password could not be changed.");
    },
  });

  if (!user) return <PageLoader label="Loading your profile" />;

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileError("");
    if (!name.trim()) {
      setProfileError("Your name cannot be blank.");
      return;
    }
    profileMutation.mutate({ name: name.trim() });
  };

  const chooseTheme = (value: ThemePreference) => {
    setPreference(value);
    profileMutation.mutate(
      { theme: value },
      {
        onSuccess: (updated) => {
          updateUser(updated);
          toast.success("Appearance updated", `Theme preference saved as ${value}.`);
        },
      },
    );
  };

  const changePassword = (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!passwordForm.current) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (passwordForm.next.length < 8 || !/[A-Za-z]/.test(passwordForm.next) || !/\d/.test(passwordForm.next)) {
      setPasswordError("The new password needs at least 8 characters, a letter and a number.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    passwordMutation.mutate();
  };

  const fade = (delay = 0) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0.01 : 0.42, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  });

  const storageData = storage.data;

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="page-title">
            Settings &amp; <em>preferences.</em>
          </h1>
          <p className="page-subtitle">
            Manage your profile, appearance and password. Review exactly where your images are
            stored.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-main">
          <motion.section className="panel settings-panel" {...fade()}>
            <header className="panel__head">
              <div>
                <p className="eyebrow">Profile</p>
                <h2>How you appear</h2>
              </div>
              <span className="settings-panel__icon">
                <UserRound size={18} />
              </span>
            </header>
            <form className="form settings-form" onSubmit={saveProfile}>
              <FormError>{profileError}</FormError>
              <div className="settings-form__row">
                <div className="field">
                  <label className="field__label" htmlFor="settings-name">
                    Display name
                  </label>
                  <input
                    id="settings-name"
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="settings-email">
                    Email address
                  </label>
                  <input
                    id="settings-email"
                    className="input"
                    value={user.email}
                    readOnly
                    disabled
                    aria-describedby="settings-email-hint"
                  />
                  <p className="field__hint" id="settings-email-hint">
                    Email changes are not supported in this academic build.
                  </p>
                </div>
              </div>
              <div className="settings-form__footer">
                <p>
                  Member since {formatDate(user.created_at)} · user #{user.id}
                </p>
                <button type="submit" className="btn btn--primary btn--sm" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </motion.section>

          <motion.section className="panel settings-panel" {...fade(0.06)}>
            <header className="panel__head">
              <div>
                <p className="eyebrow">Appearance</p>
                <h2>Choose your light</h2>
              </div>
              <span className="settings-panel__icon">
                <Sun size={18} />
              </span>
            </header>
            <div className="theme-options" role="radiogroup" aria-label="Theme preference">
              {themeOptions.map((option) => {
                const Icon = option.value === "system" ? Laptop : option.icon;
                const active = preference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`theme-option ${active ? "is-active" : ""}`}
                    onClick={() => chooseTheme(option.value)}
                  >
                    <span className={`theme-option__preview theme-option__preview--${option.value}`}>
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="theme-option__body">
                      <Icon size={16} />
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    {active ? (
                      <span className="theme-option__check">
                        <Check size={13} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="settings-note">
              Theme preference is stored in your browser and on your user record. The interface
              respects <code>prefers-reduced-motion</code> automatically.
            </p>
          </motion.section>

          <motion.section className="panel settings-panel" {...fade(0.12)}>
            <header className="panel__head">
              <div>
                <p className="eyebrow">Security</p>
                <h2>Change your password</h2>
              </div>
              <span className="settings-panel__icon">
                <KeyRound size={18} />
              </span>
            </header>
            <form className="form" onSubmit={changePassword}>
              <FormError>{passwordError}</FormError>
              {passwordSuccess ? (
                <div className="form-alert form-alert--success" role="status">
                  {passwordSuccess}
                </div>
              ) : null}
              <PasswordField
                label="Current password"
                value={passwordForm.current}
                onChange={(value) => setPasswordForm((form) => ({ ...form, current: value }))}
                autoComplete="current-password"
                name="current-password"
              />
              <div className="settings-form__row">
                <PasswordField
                  label="New password"
                  value={passwordForm.next}
                  onChange={(value) => setPasswordForm((form) => ({ ...form, next: value }))}
                  autoComplete="new-password"
                  name="new-password"
                  hint="At least 8 characters, including a letter and a number."
                />
                <PasswordField
                  label="Confirm new password"
                  value={passwordForm.confirm}
                  onChange={(value) => setPasswordForm((form) => ({ ...form, confirm: value }))}
                  autoComplete="new-password"
                  name="confirm-password"
                />
              </div>
              <div className="settings-form__footer">
                <p>Passwords are hashed with Argon2 and never stored in plain text.</p>
                <button type="submit" className="btn btn--primary btn--sm" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </motion.section>
        </div>

        <aside className="settings-aside">
          <motion.section className="panel settings-panel settings-panel--storage" {...fade(0.08)}>
            <header className="panel__head">
              <div>
                <p className="eyebrow">Storage</p>
                <h2>{storageData?.provider ?? "Storage provider"}</h2>
              </div>
              <span className={`storage-dot storage-dot--${storageData?.backend ?? "local"}`} />
            </header>

            {storage.isLoading ? (
              <p className="settings-note">Reading storage configuration…</p>
            ) : storageData ? (
              <>
                <div className="storage-mode-banner">
                  {storageData.backend === "s3" ? <Cloud size={18} /> : <Server size={18} />}
                  <div>
                    <strong>
                      {storageData.backend === "s3"
                        ? "Genuine Amazon S3 backend"
                        : "Local development backend"}
                    </strong>
                    <p>{storageData.health_detail}</p>
                  </div>
                </div>
                <dl className="settings-list">
                  <div>
                    <dt>Backend</dt>
                    <dd>{storageData.backend.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt>Bucket</dt>
                    <dd className="mono">{storageData.bucket ?? "Local media directory"}</dd>
                  </div>
                  <div>
                    <dt>Region</dt>
                    <dd>{storageData.region ?? "Not applicable"}</dd>
                  </div>
                  <div>
                    <dt>Encryption</dt>
                    <dd>{storageData.encryption}</dd>
                  </div>
                  <div>
                    <dt>Private objects</dt>
                    <dd>{storageData.private ? "Yes — public access blocked" : "Review configuration"}</dd>
                  </div>
                  <div>
                    <dt>Presigned lifetime</dt>
                    <dd>{Math.round(storageData.presign_ttl_seconds / 60)} minutes</dd>
                  </div>
                  <div>
                    <dt>Maximum upload</dt>
                    <dd>{storageData.max_upload_mb} MB</dd>
                  </div>
                  <div>
                    <dt>Quota</dt>
                    <dd>{formatBytes(storageData.quota_mb * 1024 * 1024, { decimals: 0 })}</dd>
                  </div>
                </dl>
                {storageData.local_path ? (
                  <p className="settings-note mono settings-note--path">{storageData.local_path}</p>
                ) : null}
              </>
            ) : (
              <p className="settings-note">Storage status is unavailable. Confirm the API is running.</p>
            )}
          </motion.section>

          <motion.section className="panel settings-panel" {...fade(0.14)}>
            <header className="panel__head">
              <div>
                <p className="eyebrow">System</p>
                <h2>Service health</h2>
              </div>
              <span className="settings-panel__icon">
                <Settings2 size={18} />
              </span>
            </header>
            <div className="health-list">
              <div>
                <Database size={15} />
                <span>API &amp; database</span>
                <strong className={health.data?.database === "connected" ? "is-ok" : ""}>
                  {health.isLoading ? "Checking…" : health.data?.database ?? "Unavailable"}
                </strong>
              </div>
              <div>
                <ShieldCheck size={15} />
                <span>Authentication</span>
                <strong className="is-ok">JWT · Argon2</strong>
              </div>
              <div>
                <HardDrive size={15} />
                <span>Storage reachable</span>
                <strong className={storageData?.reachable ? "is-ok" : ""}>
                  {storageData?.reachable === null
                    ? "Not configured"
                    : storageData?.reachable
                      ? "Yes"
                      : "No"}
                </strong>
              </div>
              <div>
                <Lock size={15} />
                <span>Session</span>
                <strong>Bearer token</strong>
              </div>
            </div>
            <p className="settings-note">
              Version {health.data?.version ?? "1.0.0"} · {health.data?.environment ?? "development"} ·
              demo seeding {health.data?.demo_enabled ? "enabled" : "disabled"}.
            </p>
          </motion.section>

          <motion.section className="panel settings-panel settings-panel--note" {...fade(0.2)}>
            <p className="eyebrow">Academic note</p>
            <h2>About this build</h2>
            <p>
              AEROPIX is a student cloud-computing project. Local mode exists so the application
              can be demonstrated without creating paid AWS resources. Switch
              <code> STORAGE_BACKEND=s3</code> with a configured bucket and instance profile to
              store new uploads in Amazon S3 through the identical interface.
            </p>
            <div className="settings-badges">
              <span>FastAPI</span>
              <span>React</span>
              <span>Boto3</span>
              <span>SQLAlchemy</span>
            </div>
          </motion.section>
        </aside>
      </div>
    </div>
  );
}
