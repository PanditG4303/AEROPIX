import { animate } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function AnimatedNumber({
  value,
  format = (current) => Math.round(current).toLocaleString("en"),
  duration = 0.9,
  className = "",
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <span className={className} aria-live="off">
      {format(display)}
    </span>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••",
  id,
  name = "password",
  error,
  hint,
  disabled,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className={`input-wrap ${error ? "input-wrap--error" : ""}`}>
        <input
          id={inputId}
          name={name}
          className="input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
        <button
          type="button"
          className="input-wrap__action"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error ? (
        <p className="field__error" id={`${inputId}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="form-alert" role="alert">
      {children}
    </div>
  );
}
