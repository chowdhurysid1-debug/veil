"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "cn";

type ToastTone = "neutral" | "success" | "error";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
  action?: { label: string; onAction: () => void };
  /** Runs when the toast closes any way other than its action: timeout or dismiss. */
  onExpire?: () => void;
}

interface Toast extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Mirrors `toasts` so callbacks fire exactly once, outside state updaters.
  const toastsRef = useRef<Toast[]>([]);
  const nextId = useRef(0);

  const replaceToasts = useCallback((next: Toast[]) => {
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      nextId.current += 1;
      const next = [...toastsRef.current, { ...options, id: nextId.current }];
      const overflow = next.slice(0, Math.max(0, next.length - MAX_VISIBLE));
      replaceToasts(next.slice(-MAX_VISIBLE));
      // A toast pushed off the stack still settles, so a pending label saves.
      overflow.forEach((toast) => toast.onExpire?.());
    },
    [replaceToasts],
  );

  const close = useCallback(
    (toast: Toast, reason: "action" | "expire") => {
      if (!toastsRef.current.some((item) => item.id === toast.id)) return;
      replaceToasts(toastsRef.current.filter((item) => item.id !== toast.id));
      if (reason === "action") toast.action?.onAction();
      else toast.onExpire?.();
    },
    [replaceToasts],
  );

  // Leaving the app area settles anything still open.
  useEffect(
    () => () => {
      toastsRef.current.forEach((toast) => toast.onExpire?.());
      toastsRef.current = [];
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={close} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}

const TONE_ICONS = {
  neutral: Info,
  success: CircleCheck,
  error: CircleAlert,
} as const;

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (toast: Toast, reason: "action" | "expire") => void;
}) {
  const tone = toast.tone ?? "neutral";
  const durationMs = toast.durationMs ?? DEFAULT_DURATION_MS;
  const Icon = TONE_ICONS[tone];
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast, "expire"), durationMs);
    return () => clearTimeout(timer);
  }, [toast, durationMs, onClose]);

  return (
    <motion.div
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      role={tone === "error" ? "alert" : "status"}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-md"
    >
      <div className="flex items-start gap-3 p-4 pr-3">
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            tone === "neutral" && "text-indigo-400",
            tone === "success" && "text-emerald-400",
            tone === "error" && "text-rose-400",
          )}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-white">{toast.title}</p>
          {toast.description && (
            <p className="text-sm leading-relaxed text-zinc-400">
              {toast.description}
            </p>
          )}
        </div>
        {toast.action && (
          <button
            type="button"
            onClick={() => onClose(toast, "action")}
            className="h-9 shrink-0 cursor-pointer rounded-lg bg-zinc-800 px-3 text-sm font-semibold text-white outline-none ring-1 ring-zinc-700 transition-all duration-200 hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-indigo-500 active:bg-zinc-800"
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onClose(toast, "expire")}
          aria-label="Dismiss"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-zinc-500 outline-none transition-all duration-200 hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div
        aria-hidden
        className={cn(
          "h-0.5 origin-left",
          tone === "error" ? "bg-rose-500/60" : "bg-indigo-500/70",
        )}
        style={{
          animation: shouldReduceMotion
            ? undefined
            : `veil-toast-countdown ${durationMs}ms linear forwards`,
        }}
      />
    </motion.div>
  );
}
