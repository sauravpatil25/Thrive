import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { IconCheck, IconMinus, IconPlus, IconX } from './icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  block?: boolean;
  loading?: boolean;
};

export function Button({ variant = 'primary', block, loading, className, children, disabled, ...p }: ButtonProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-on-primary shadow-card',
        variant === 'secondary' && 'bg-card text-ink shadow-card',
        variant === 'ghost' && 'text-primary-ink',
        variant === 'danger' && 'bg-coral-soft text-coral-ink',
        block && 'w-full',
        className,
      )}
    >
      {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-3xl bg-card p-5 shadow-card', className)}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 mt-2 flex items-baseline justify-between">
      <h2 className="text-[19px] font-extrabold tracking-tight">{children}</h2>
      {aside && <span className="text-[13px] font-semibold text-muted">{aside}</span>}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('text-xs font-bold uppercase tracking-[0.06em]', className)}>{children}</span>;
}

/** Progress ring. ratio is 0-1. */
export function Ring({ ratio, size = 140, stroke = 14, children }: { ratio: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
          style={{ opacity: clamped === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function CheckRow({
  checked,
  onToggle,
  label,
  sub,
  badge,
}: {
  checked: boolean;
  onToggle(): void;
  label: string;
  sub?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex min-h-[60px] w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition active:bg-track/60"
    >
      <span
        className={cx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-2 transition-colors',
          checked ? 'border-primary bg-primary text-on-primary' : 'border-line',
        )}
      >
        {checked && <IconCheck size={16} className="tick-pop" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cx('text-[15px] font-bold transition-colors', checked && 'text-muted line-through')}>{label}</span>
        {sub && <span className="text-[12.5px] font-medium text-muted">{sub}</span>}
      </span>
      {badge && <span className="rounded-lg bg-primary-soft px-2 py-1 text-[11px] font-bold text-primary-ink">{badge}</span>}
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange(v: number): void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v * 10) / 10)));
  return (
    <div className="flex items-center gap-2.5" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => set(value - step)}
        disabled={value <= min}
        className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-track text-ink transition active:scale-95 disabled:opacity-40"
      >
        <IconMinus size={20} />
      </button>
      <output aria-live="polite" className="min-w-[56px] text-center text-[22px] font-extrabold tabular-nums">
        {format(value)}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => set(value + step)}
        disabled={value >= max}
        className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-track text-ink transition active:scale-95 disabled:opacity-40"
      >
        <IconPlus size={20} />
      </button>
    </div>
  );
}

const SCALE_WORDS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];

export function Scale({ value, onChange, label }: { value: number | null; onChange(v: number): void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {SCALE_WORDS.map((w, i) => {
        const on = value === i + 1;
        return (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${i + 1} ${w}`}
            onClick={() => onChange(i + 1)}
            className={cx(
              'flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[14px] border-2 transition',
              on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-field text-ink',
            )}
          >
            <span className="text-[17px] font-extrabold">{i + 1}</span>
            <span className="text-[11px] font-semibold">{w}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition',
        on ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line bg-card text-ink',
      )}
    >
      {on && <IconCheck size={14} />}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-track p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-[40px] flex-1 rounded-xl px-3 text-sm font-bold transition',
            value === o.value ? 'bg-card text-ink shadow-card' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function OptionCard({
  on,
  onClick,
  title,
  desc,
}: {
  on: boolean;
  onClick(): void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cx(
        'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition',
        on ? 'border-primary bg-primary-soft/50' : 'border-line bg-card',
      )}
    >
      <span className={cx('mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2', on ? 'border-primary' : 'border-line')}>
        {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-extrabold">{title}</span>
        <span className="text-[13px] font-medium leading-snug text-muted">{desc}</span>
      </span>
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; suffix?: string; error?: string };

export function Field({ label, hint, suffix, error, className, ...p }: FieldProps) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          {...p}
          aria-invalid={!!error || undefined}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className={cx(
            'h-12 w-full rounded-[14px] border-[1.5px] bg-field px-3.5 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-muted/70 focus:border-primary',
            error ? 'border-coral' : 'border-line',
            suffix && 'pr-12',
          )}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{suffix}</span>}
      </div>
      {(error || hint) && (
        <span id={`${id}-hint`} className={cx('text-[12.5px] font-medium', error ? 'text-coral-ink' : 'text-muted')}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose(): void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-up relative w-full max-w-md rounded-t-3xl bg-bg p-5 sm:rounded-3xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-track">
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label={label}>
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
    </div>
  );
}
