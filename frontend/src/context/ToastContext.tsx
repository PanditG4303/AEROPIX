import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduced = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextToastId++;
      setToasts((items) => [...items.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-viewport" aria-live="polite" aria-atomic="false">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => {
              const Icon = icons[toast.tone];
              return (
                <motion.div
                  key={toast.id}
                  className={`toast toast--${toast.tone}`}
                  role="status"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }}
                  transition={{ duration: reduced ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="toast__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div className="toast__body">
                    <p className="toast__title">{toast.title}</p>
                    {toast.description ? (
                      <p className="toast__description">{toast.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="toast__close"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
