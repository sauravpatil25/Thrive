import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, startOfWeek } from './dates';
import { generatePlan } from './plan';
import { makeProfile } from './test-utils';
import { bestFreeRun, dayScore, freeStreak, milestones, planStreak, toEntryMap, weighInDueIn, weeklyTotals } from './stats';
import { emptyEntry, type DailyEntry } from './types';
import { cmToFtIn, displayWeight, ftInToCm, inputToKg } from './units';

const p = makeProfile({ goals: ['smoke', 'alcohol'] }); // plan: water, smoke, alcohol
const e = (date: string, over: Partial<DailyEntry> = {}): DailyEntry => ({ ...emptyEntry(date), ...over });
const allDone = (date: string) => e(date, { completed: generatePlan(p, date).map((i) => i.id) });

describe('dates', () => {
  it('does calendar arithmetic', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysBetween('2026-11-02', '2026-11-23')).toBe(21);
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23'); // Monday
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23'); // Sunday
  });
});

describe('dayScore', () => {
  it('ignores ticks for items no longer in the plan', () => {
    const plan = generatePlan(p, '2026-11-10');
    expect(dayScore(plan, e('2026-11-10', { completed: ['water', 'smoke', 'old-item'] }))).toEqual({ done: 2, total: 3, ratio: 2 / 3 });
  });
});

describe('planStreak', () => {
  it('counts consecutive days at 70%+ and does not break on an unfinished today', () => {
    const m = toEntryMap(['2026-11-20', '2026-11-21', '2026-11-22'].map(allDone));
    expect(planStreak(p, '2026-11-23', m)).toBe(3);
    m['2026-11-23'] = allDone('2026-11-23');
    expect(planStreak(p, '2026-11-23', m)).toBe(4);
  });

  it('breaks on a weak day', () => {
    const m = toEntryMap([allDone('2026-11-20'), e('2026-11-21', { completed: ['water'] }), allDone('2026-11-22')]);
    expect(planStreak(p, '2026-11-23', m)).toBe(1);
  });
});

describe('freeStreak', () => {
  it('counts days since start when nothing was logged, today only once logged at zero', () => {
    expect(freeStreak(p, '2026-11-02', {}, 'cigarettes').current).toBe(0);
    expect(freeStreak(p, '2026-11-12', {}, 'cigarettes').current).toBe(10);
    const m = toEntryMap([e('2026-11-12', { cigarettes: 0 })]);
    expect(freeStreak(p, '2026-11-12', m, 'cigarettes').current).toBe(11);
  });

  it('restarts after a slip but keeps the total', () => {
    const m = toEntryMap([
      e('2026-11-03', { cigarettes: 0 }),
      e('2026-11-04', { cigarettes: 0 }),
      e('2026-11-05', { cigarettes: 2 }),
      e('2026-11-06', { cigarettes: 0 }),
    ]);
    const s = freeStreak(p, '2026-11-08', m, 'cigarettes');
    expect(s.lastSlip).toBe('2026-11-05');
    expect(s.current).toBe(2); // 6th, 7th
    expect(s.total).toBe(3);
    expect(bestFreeRun(p, '2026-11-08', m, 'cigarettes')).toBe(3); // 2nd-4th
  });
});

describe('milestones', () => {
  it('stay earned after a slip', () => {
    const days = Array.from({ length: 8 }, (_, i) => e(addDays('2026-11-02', i), { cigarettes: 0 }));
    const m = toEntryMap([...days, e('2026-11-10', { cigarettes: 3 })]);
    const ms = milestones(p, '2026-11-11', m, []);
    expect(ms.find((x) => x.id === 'smoke-7')!.achieved).toBe(true);
    expect(freeStreak(p, '2026-11-11', m, 'cigarettes').current).toBe(0);
  });

  it('uses pounds for imperial users', () => {
    const ip = makeProfile({ units: 'imperial', goals: ['weight'] });
    const ms = milestones(ip, '2026-11-20', {}, [{ id: 'w', date: '2026-11-16', weightKg: 90 - 2.3 }]);
    expect(ms.find((x) => x.id === 'weight-5')!.achieved).toBe(true); // 2.3 kg ≈ 5.07 lb
    expect(ms.find((x) => x.id === 'weight-10')!.achieved).toBe(false);
  });
});

describe('weighInDueIn', () => {
  it('is due every 14 days from the last weigh-in', () => {
    const wp = makeProfile();
    expect(weighInDueIn(wp, [], '2026-11-10')).toBe(6);
    expect(weighInDueIn(wp, [], '2026-11-16')).toBe(0);
    expect(weighInDueIn(wp, [{ id: 'a', date: '2026-11-15', weightKg: 89 }], '2026-11-16')).toBe(13);
  });
});

describe('weeklyTotals', () => {
  it('sums by Monday-Sunday week', () => {
    const m = toEntryMap([e('2026-11-16', { drinks: 2 }), e('2026-11-22', { drinks: 3 }), e('2026-11-23', { drinks: 1 })]);
    expect(weeklyTotals(m, '2026-11-24', 2, 'drinks')).toEqual([
      { week: '2026-11-16', total: 5, logged: 2 },
      { week: '2026-11-23', total: 1, logged: 1 },
    ]);
  });
});

describe('units', () => {
  it('round-trips weight and height', () => {
    expect(displayWeight(inputToKg(200, 'imperial'), 'imperial')).toBe(200);
    expect(displayWeight(80, 'imperial')).toBe(176.4);
    expect(cmToFtIn(ftInToCm(5, 11))).toEqual({ ft: 5, inch: 11 });
  });
});
