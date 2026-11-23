/** Dates are handled as local-calendar "YYYY-MM-DD" strings to avoid timezone drift. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(now: Date = new Date()): string {
  return toISODate(now);
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday of the week containing s. */
export function startOfWeek(s: string): string {
  const d = parseISODate(s);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  return addDays(s, -dow);
}

export function formatLong(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShort(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
