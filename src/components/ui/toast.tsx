"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type Tone = "info" | "success" | "error";
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const icons = { info: Info, success: CheckCircle2, error: XCircle };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message: string, tone: Tone = "info") => {
      const id = Date.now() + Math.random();
      setItems((all) => [...all, { id, tone, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(var(--bottom-nav-height) + 12px)" }}
      >
        <div aria-live="polite" className="contents">
          {items
            .filter((t) => t.tone !== "error")
            .map((t) => (
              <ToastView key={t.id} t={t} onDismiss={dismiss} />
            ))}
        </div>
        <div aria-live="assertive" className="contents">
          {items
            .filter((t) => t.tone === "error")
            .map((t) => (
              <ToastView key={t.id} t={t} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ t, onDismiss }: { t: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = icons[t.tone];
  return (
    <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md bg-text px-4 py-3 text-sm text-bg shadow-pop">
      <Icon aria-hidden="true" size={18} className="shrink-0" />
      <span className="flex-1">{t.message}</span>
      <button type="button" aria-label="Dismiss" onClick={() => onDismiss(t.id)} className="rounded-sm p-1 hover:opacity-80">
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
