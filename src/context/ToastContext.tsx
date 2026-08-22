import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'cart';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastState | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastCartToastRef = useRef<number>(0);

  const dismiss = (id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  const show = (message: string, type: ToastType = 'success') => {
    // Deduplicate rapid "added to cart" toasts — if the same cart toast
    // was shown in the last 1.2s, skip it.
    if (type === 'cart') {
      const now = Date.now();
      if (now - lastCartToastRef.current < 1200) return;
      lastCartToastRef.current = now;
    }
    const id = nextId++;
    setToasts((t) => [...t, { id, type, message }]);
    // Cart toasts dismiss faster (2.5s), others 3.5s
    const ttl = type === 'cart' ? 2500 : 3500;
    setTimeout(() => dismiss(id), ttl);
  };

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => {
        const base =
          'pointer-events-auto cursor-pointer rounded-xl shadow-lg px-4 py-3 text-sm font-bold text-center transition-all duration-300 animate-[fadeDown_0.2s_ease-out]';
        const color =
          t.type === 'success'
            ? 'bg-emerald-600 text-white'
            : t.type === 'error'
            ? 'bg-rose-600 text-white'
            : t.type === 'cart'
            ? 'bg-charcoal-900 text-white border border-rose-500'
            : 'bg-rose-600 text-white';
        return (
          <div key={t.id} onClick={() => onDismiss(t.id)} className={`${base} ${color}`}>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
