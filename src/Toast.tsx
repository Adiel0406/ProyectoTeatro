import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type ToastTone = "success" | "error";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const sequenceRef = useRef(0);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    const duration = tone === "error" ? 7000 : 4500;
    setToast({ id: ++sequenceRef.current, message, tone, duration });
    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  return { toast, showToast, dismissToast };
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`toast toast--${toast.tone}`}
      key={toast.id}
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      style={{ "--toast-duration": `${toast.duration}ms` } as CSSProperties & { "--toast-duration": string }}
    >
      <span className="toast__message">{toast.message}</span>
      <button className="toast__dismiss" type="button" aria-label="Cerrar notificación" onClick={onDismiss}>
        ×
      </button>
      <span className="toast__timer" aria-hidden="true" />
    </div>
  );
}
