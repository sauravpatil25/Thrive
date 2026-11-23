import type { Profile } from './types';

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    name: 'Sam',
    units: 'metric',
    heightCm: 178,
    startWeightKg: 90,
    targetWeightKg: 80,
    cigsPerDay: 10,
    drinksPerWeek: 14,
    sleepHours: 6.5,
    bedtime: '23:00',
    goals: ['weight', 'smoke', 'alcohol', 'energy', 'steps'],
    smokeMode: 'quit',
    alcoholMode: 'quit',
    pace: 'steady',
    why: '',
    customHabits: [],
    startDate: '2026-11-02', // a Monday
    onboarded: true,
    ...over,
  };
}
