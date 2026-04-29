import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastSpec {
  id: number;
  message: string;
  onUndo: () => void;
  duration: number;
}

interface UndoToastContextValue {
  showUndo: (spec: { message: string; onUndo: () => void; duration?: number }) => void;
}

const UndoToastContext = createContext<UndoToastContextValue | null>(null);

export function useUndoToast() {
  const ctx = useContext(UndoToastContext);
  if (!ctx) throw new Error('useUndoToast는 <UndoToastProvider> 안에서만 사용 가능합니다.');
  return ctx;
}

export function UndoToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastSpec[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showUndo = useCallback<UndoToastContextValue['showUndo']>(({ message, onUndo, duration = 5000 }) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev, { id, message, onUndo, duration }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <UndoToastContext.Provider value={{ showUndo }}>
      {children}
      <div className="ew-undo-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <UndoToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </UndoToastContext.Provider>
  );
}

function UndoToastItem({ toast, onDismiss }: { toast: ToastSpec; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct <= 0) window.clearInterval(intervalId);
    }, 50);
    return () => window.clearInterval(intervalId);
  }, [toast.duration]);

  return (
    <div className="ew-undo-toast" role="status">
      <span className="ew-undo-toast__msg">{toast.message}</span>
      <button
        type="button"
        className="ew-undo-toast__btn"
        onClick={() => {
          toast.onUndo();
          onDismiss();
        }}
      >
        되돌리기
      </button>
      <div className="ew-undo-toast__progress" style={{ width: `${progress}%` }} />
    </div>
  );
}
