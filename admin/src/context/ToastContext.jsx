import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let toastSeq = 0;

function ToastViewport({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const toneClass =
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : toast.tone === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : toast.tone === "error"
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-slate-200 bg-white text-slate-800";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-sm ${toneClass}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded px-1 text-xs opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, tone = "info", durationMs = 3200) => {
    const id = `t-${Date.now()}-${toastSeq++}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    if (durationMs > 0) {
      window.setTimeout(() => {
        removeToast(id);
      }, durationMs);
    }
    return id;
  }, [removeToast]);

  const value = useMemo(
    () => ({
      showToast,
      success: (msg, ms) => showToast(msg, "success", ms),
      error: (msg, ms) => showToast(msg, "error", ms),
      warning: (msg, ms) => showToast(msg, "warning", ms),
      info: (msg, ms) => showToast(msg, "info", ms),
      removeToast,
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
