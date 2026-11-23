import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}

interface ToastApi {
  show(text: string): void;
  error(text: string): void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((text: string, tone: Toast['tone']) => {
    const id = nextId.current++;
    setItems((xs) => [...xs.filter((x) => x.text !== text), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === 'error' ? 5000 : 2500);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show: (t) => push(t, 'ok'), error: (t) => push(t, 'error') }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`toast-in pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold shadow-card ${
              t.tone === 'error' ? 'bg-coral-soft text-coral-ink' : 'bg-ink text-bg'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast outside ToastProvider');
  return c;
}
