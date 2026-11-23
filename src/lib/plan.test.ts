import { describe, expect, it } from 'vitest';
import { generatePlan, planWeek, smokeLimit, taperLimit, waterLitres, weeklyDrinkLimit } from './plan';
import { makeProfile } from './test-utils';
import { emptyEntry } from './types';

describe('taperLimit', () => {
  it('cuts below the baseline from week one', () => {
    expect(taperLimit(10, 0, 'steady')).toBe(8);
    expect(taperLimit(1, 0, 'gentle')).toBe(0);
  });

  it('decreases every week and reaches zero', () => {
    const steady = [0, 1, 2, 3, 4, 5].map((w) => taperLimit(10, w, 'steady'));
    expect(steady).toEqual([8, 6, 4, 2, 0, 0]);
    expect(taperLimit(20, 9, 'gentle')).toBe(0);
    expect(taperLimit(20, 2, 'aggressive')).toBe(0);
  });

  it('never goes negative or above baseline', () => {
    for (const pace of ['gentle', 'steady', 'aggressive'] as const) {
      for (let w = 0; w < 20; w++) {
        const v = taperLimit(15, w, pace);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(15);
      }
    }
  });
});

describe('planWeek', () => {
  it('counts whole weeks since the start', () => {
    const p = makeProfile();
    expect(planWeek(p, '2026-11-02')).toBe(0);
    expect(planWeek(p, '2026-11-08')).toBe(0);
    expect(planWeek(p, '2026-11-09')).toBe(1);
    expect(planWeek(p, '2026-10-01')).toBe(0);
  });
});

describe('waterLitres', () => {
  it('scales with weight within 2-3.5 L', () => {
    expect(waterLitres(null)).toBe(2.5);
    expect(waterLitres(50)).toBe(2);
    expect(waterLitres(90)).toBe(3);
    expect(waterLitres(150)).toBe(3.5);
  });
});

describe('generatePlan', () => {
  it('uses "No cigarettes today" when quitting', () => {
    const plan = generatePlan(makeProfile(), '2026-11-23');
    const smoke = plan.find((p) => p.id === 'smoke')!;
    expect(smoke.label).toBe('No cigarettes today');
    expect(plan.find((p) => p.id === 'alcohol')!.label).toBe('Alcohol-free day');
  });

  it('has a plain 10,000 steps tick', () => {
    const plan = generatePlan(makeProfile(), '2026-11-23');
    expect(plan.find((p) => p.id === 'steps')!.label).toBe('Walk 10,000 steps');
  });

  it('shows a daily cigarette limit when tapering', () => {
    const p = makeProfile({ smokeMode: 'taper' });
    expect(smokeLimit(p, '2026-11-02')).toBe(8);
    expect(generatePlan(p, '2026-11-02').find((i) => i.id === 'smoke')!.label).toBe('No more than 8 cigarettes');
    // Week 5+ at steady pace: down to zero.
    expect(generatePlan(p, '2026-12-07').find((i) => i.id === 'smoke')!.label).toBe('No cigarettes today');
  });

  it('tracks the weekly drink allowance when tapering alcohol', () => {
    const p = makeProfile({ alcoholMode: 'taper' }); // 14/week, steady -> 11 in week 0
    expect(weeklyDrinkLimit(p, '2026-11-02')).toBe(11);
    const entries = {
      '2026-11-02': { ...emptyEntry('2026-11-02'), drinks: 4 },
      '2026-11-03': { ...emptyEntry('2026-11-03'), drinks: 3 },
    };
    const item = generatePlan(p, '2026-11-04', entries).find((i) => i.id === 'alcohol')!;
    expect(item.label).toBe('Stay within 11 drinks this week');
    expect(item.sub).toBe('7 used so far · 4 left');
    const full = { ...entries, '2026-11-04': { ...emptyEntry('2026-11-04'), drinks: 4 } };
    expect(generatePlan(p, '2026-11-05', full).find((i) => i.id === 'alcohol')!.label).toBe('Alcohol-free day');
  });

  it('only includes items for chosen goals, plus custom habits', () => {
    const plan = generatePlan(makeProfile({ goals: ['stress'], customHabits: [{ id: 'a1', label: 'Read 10 pages' }] }), '2026-11-23');
    expect(plan.map((p) => p.id)).toEqual(['water', 'breathe', 'custom:a1']);
    expect(plan[2].custom).toBe(true);
  });

  it('shows water in ounces for imperial users', () => {
    const plan = generatePlan(makeProfile({ units: 'imperial' }), '2026-11-23');
    expect(plan[0].label).toMatch(/^Drink \d+ oz of water$/);
  });

  it('keeps ids unique', () => {
    const plan = generatePlan(makeProfile({ goals: ['weight', 'smoke', 'alcohol', 'energy', 'steps', 'sleep', 'eat', 'stress'] }), '2026-11-23');
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });
});
