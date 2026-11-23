import { addDays, daysBetween, startOfWeek } from './dates';
import { formatWater } from './units';
import type { DailyEntry, Pace, PlanItem, Profile } from './types';

/** Share of the starting amount removed each week when tapering. */
export const TAPER_RATE: Record<Pace, number> = {
  gentle: 0.1, // ~10 weeks to zero
  steady: 0.2, // ~5 weeks
  aggressive: 1 / 3, // ~3 weeks
};

/** 0-based plan week for a date (week 0 = the first 7 days). */
export function planWeek(profile: Pick<Profile, 'startDate'>, date: string): number {
  return Math.max(0, Math.floor(daysBetween(profile.startDate, date) / 7));
}

/**
 * Allowed amount during a taper. Week 0 already cuts one step below the
 * baseline, so the user starts improving on day 1, and it reaches 0.
 */
export function taperLimit(baseline: number, week: number, pace: Pace): number {
  if (baseline <= 0) return 0;
  const remaining = 1 - TAPER_RATE[pace] * (week + 1);
  if (remaining <= 0) return 0;
  return Math.min(baseline - 1, Math.max(0, Math.round(baseline * remaining)));
}

/** Daily water goal in litres: ~33 ml per kg, rounded to 0.5 L, kept within 2-3.5 L. */
export function waterLitres(weightKg: number | null): number {
  if (!weightKg) return 2.5;
  return Math.min(3.5, Math.max(2, Math.round(weightKg * 0.033 * 2) / 2));
}

export function formatBedtime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function smokeLimit(profile: Profile, date: string): number {
  if (profile.smokeMode === 'quit') return 0;
  return taperLimit(profile.cigsPerDay, planWeek(profile, date), profile.pace);
}

export function weeklyDrinkLimit(profile: Profile, date: string): number {
  if (profile.alcoholMode === 'quit') return 0;
  return taperLimit(profile.drinksPerWeek, planWeek(profile, date), profile.pace);
}

/** Drinks logged from Monday of this week up to (not including) date. */
export function drinksSoFarThisWeek(date: string, entries: Record<string, DailyEntry>): number {
  let total = 0;
  for (let d = startOfWeek(date); d < date; d = addDays(d, 1)) total += entries[d]?.drinks ?? 0;
  return total;
}

/**
 * The day's checklist: small, concrete actions derived from the user's goals.
 * Item ids are stable so ticks survive plan changes.
 */
export function generatePlan(profile: Profile, date: string, entries: Record<string, DailyEntry> = {}): PlanItem[] {
  const g = new Set(profile.goals);
  const items: PlanItem[] = [];

  items.push({
    id: 'water',
    label: `Drink ${formatWater(waterLitres(profile.startWeightKg), profile.units)} of water`,
    sub: 'Keep a bottle close by',
  });

  if (g.has('steps') || g.has('weight')) {
    items.push({ id: 'steps', label: 'Walk 10,000 steps', sub: 'Tick it when your phone says so' });
  }

  if (g.has('smoke')) {
    const limit = smokeLimit(profile, date);
    items.push(
      limit === 0
        ? { id: 'smoke', label: 'No cigarettes today', sub: 'Every smoke-free day counts' }
        : {
            id: 'smoke',
            label: `No more than ${limit} cigarette${limit === 1 ? '' : 's'}`,
            sub: `Taper week ${planWeek(profile, date) + 1} · down from ${profile.cigsPerDay}`,
          },
    );
  }

  if (g.has('alcohol')) {
    const weekly = weeklyDrinkLimit(profile, date);
    if (weekly === 0) {
      items.push({ id: 'alcohol', label: 'Alcohol-free day', sub: 'Keep the run going' });
    } else {
      const used = drinksSoFarThisWeek(date, entries);
      const left = Math.max(0, weekly - used);
      items.push({
        id: 'alcohol',
        label: left === 0 ? 'Alcohol-free day' : `Stay within ${weekly} drinks this week`,
        sub: left === 0 ? 'Weekly limit reached' : `${used} used so far · ${left} left`,
      });
    }
  }

  if (g.has('weight')) {
    items.push({ id: 'move', label: '20 minutes of exercise', sub: 'Workout, sport or a brisk walk' });
  }

  if (g.has('eat') || g.has('weight')) {
    items.push({ id: 'veg', label: 'Veg or salad with 2 meals', sub: 'Half the plate, if you can' });
  }

  if (g.has('sleep') || g.has('energy')) {
    items.push({ id: 'bed', label: `In bed by ${formatBedtime(profile.bedtime)}`, sub: 'Screens off 30 minutes before' });
  }

  if (g.has('energy')) {
    items.push({ id: 'daylight', label: '10 minutes of daylight', sub: 'Ideally in the morning' });
  }

  if (g.has('stress')) {
    items.push({ id: 'breathe', label: '5-minute breathing break', sub: 'Slow breaths, longer out than in' });
  }

  for (const h of profile.customHabits) {
    items.push({ id: `custom:${h.id}`, label: h.label, sub: 'Your habit', custom: true });
  }

  return items;
}
