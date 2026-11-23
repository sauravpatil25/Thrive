import { addDays, daysBetween, startOfWeek } from './dates';
import { generatePlan } from './plan';
import { KG_PER_LB } from './units';
import type { DailyEntry, PlanItem, Profile, WeightEntry } from './types';

/** A day counts towards the plan streak once this share of its plan is ticked. */
export const STREAK_THRESHOLD = 0.7;
export const WEIGH_IN_INTERVAL_DAYS = 14;

export type EntryMap = Record<string, DailyEntry>;

export function toEntryMap(entries: DailyEntry[]): EntryMap {
  return Object.fromEntries(entries.map((e) => [e.date, e]));
}

export function dayScore(plan: PlanItem[], entry: DailyEntry | undefined): { done: number; total: number; ratio: number } {
  const total = plan.length;
  if (!entry || total === 0) return { done: 0, total, ratio: 0 };
  const ids = new Set(plan.map((p) => p.id));
  const done = entry.completed.filter((id) => ids.has(id)).length;
  return { done, total, ratio: done / total };
}

export function scoreFor(profile: Profile, date: string, entries: EntryMap) {
  return dayScore(generatePlan(profile, date, entries), entries[date]);
}

/**
 * Consecutive days meeting the threshold, ending today. If today isn't there
 * yet it doesn't break the streak; counting starts from yesterday.
 */
export function planStreak(profile: Profile, todayISO: string, entries: EntryMap): number {
  const ok = (d: string) => scoreFor(profile, d, entries).ratio >= STREAK_THRESHOLD;
  let d = ok(todayISO) ? todayISO : addDays(todayISO, -1);
  let n = 0;
  while (d >= profile.startDate && ok(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface FreeStreak {
  /** Current run of days without a logged slip. */
  current: number;
  /** All logged days at zero since the start. Never resets. */
  total: number;
  lastSlip: string | null;
}

/**
 * Smoke-/alcohol-free counter. Days before today count unless a slip was
 * logged on them; today counts once it is logged at zero.
 */
export function freeStreak(
  profile: Profile,
  todayISO: string,
  entries: EntryMap,
  field: 'cigarettes' | 'drinks',
): FreeStreak {
  let lastSlip: string | null = null;
  let total = 0;
  for (const e of Object.values(entries)) {
    if (e.date < profile.startDate || e.date > todayISO) continue;
    const v = e[field];
    if (v != null && v > 0) {
      if (!lastSlip || e.date > lastSlip) lastSlip = e.date;
    } else if (v === 0) {
      total++;
    }
  }
  const from = lastSlip ? addDays(lastSlip, 1) : profile.startDate;
  let current = Math.max(0, daysBetween(from, todayISO));
  const t = entries[todayISO]?.[field];
  if (t === 0 && from <= todayISO) current++;
  return { current, total, lastSlip };
}

/** Longest free run ever (same counting rules as freeStreak). Used for milestones so they stay earned. */
export function bestFreeRun(profile: Profile, todayISO: string, entries: EntryMap, field: 'cigarettes' | 'drinks'): number {
  let best = 0;
  let run = 0;
  for (let d = profile.startDate; d <= todayISO; d = addDays(d, 1)) {
    const v = entries[d]?.[field];
    const free = d === todayISO ? v === 0 : !(v != null && v > 0);
    run = free ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Longest plan streak ever. */
export function bestPlanStreak(profile: Profile, todayISO: string, entries: EntryMap): number {
  let best = 0;
  let run = 0;
  for (let d = profile.startDate; d <= todayISO; d = addDays(d, 1)) {
    run = scoreFor(profile, d, entries).ratio >= STREAK_THRESHOLD ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function latestWeight(profile: Profile, weights: WeightEntry[]): { kg: number; date: string } | null {
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (sorted[0]) return { kg: sorted[0].weightKg, date: sorted[0].date };
  if (profile.startWeightKg) return { kg: profile.startWeightKg, date: profile.startDate };
  return null;
}

/** Days until the next fortnightly weigh-in (0 or negative = due). */
export function weighInDueIn(profile: Profile, weights: WeightEntry[], todayISO: string): number {
  const last = latestWeight(profile, weights);
  const lastDate = last?.date ?? profile.startDate;
  return WEIGH_IN_INTERVAL_DAYS - daysBetween(lastDate, todayISO);
}

/** Sum of a numeric field per week (Mon-Sun) for the last n weeks, oldest first. */
export function weeklyTotals(entries: EntryMap, todayISO: string, weeks: number, field: 'cigarettes' | 'drinks') {
  const out: { week: string; total: number; logged: number }[] = [];
  const thisWeek = startOfWeek(todayISO);
  for (let i = weeks - 1; i >= 0; i--) {
    const week = addDays(thisWeek, -7 * i);
    let total = 0;
    let logged = 0;
    for (let d = 0; d < 7; d++) {
      const v = entries[addDays(week, d)]?.[field];
      if (v != null) {
        total += v;
        logged++;
      }
    }
    out.push({ week, total, logged });
  }
  return out;
}

export function averageOf(entries: EntryMap, todayISO: string, days: number, field: 'mood' | 'energy' | 'sleepHours'): number | null {
  const vals: number[] = [];
  for (let i = 0; i < days; i++) {
    const v = entries[addDays(todayISO, -i)]?.[field];
    if (v != null) vals.push(v);
  }
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  achieved: boolean;
}

export function milestones(profile: Profile, todayISO: string, entries: EntryMap, weights: WeightEntry[]): Milestone[] {
  const out: Milestone[] = [];
  const g = new Set(profile.goals);
  const logged = Object.values(entries).filter((e) => e.logged).length;
  const streak = bestPlanStreak(profile, todayISO, entries);

  for (const n of [3, 7, 14, 30]) {
    out.push({ id: `plan-${n}`, title: `${n}-day plan streak`, detail: 'Hit 70%+ of your plan', achieved: streak >= n });
  }
  if (g.has('smoke')) {
    const best = bestFreeRun(profile, todayISO, entries, 'cigarettes');
    for (const n of [1, 7, 30, 90]) {
      out.push({ id: `smoke-${n}`, title: `${n} day${n > 1 ? 's' : ''} smoke-free`, detail: 'In a row', achieved: best >= n });
    }
  }
  if (g.has('alcohol')) {
    const best = bestFreeRun(profile, todayISO, entries, 'drinks');
    for (const n of [1, 7, 30, 90]) {
      out.push({ id: `alcohol-${n}`, title: `${n} day${n > 1 ? 's' : ''} alcohol-free`, detail: 'In a row', achieved: best >= n });
    }
  }
  if (g.has('weight') && profile.startWeightKg) {
    const now = latestWeight(profile, weights)?.kg ?? profile.startWeightKg;
    const lostKg = profile.startWeightKg - now;
    const metric = profile.units === 'metric';
    const lost = metric ? lostKg : lostKg / KG_PER_LB;
    for (const n of metric ? [1, 3, 5, 10] : [2, 5, 10, 20]) {
      out.push({
        id: `weight-${n}`,
        title: `${n} ${metric ? 'kg' : 'lb'} down`,
        detail: 'From your starting weight',
        achieved: lost >= n - 1e-9,
      });
    }
  }
  for (const n of [7, 30]) {
    out.push({ id: `log-${n}`, title: `${n} evening logs`, detail: 'Showing up counts', achieved: logged >= n });
  }
  return out;
}
