export type Units = 'metric' | 'imperial';
export type GoalId = 'weight' | 'smoke' | 'alcohol' | 'energy' | 'steps' | 'sleep' | 'eat' | 'stress';
export type QuitMode = 'quit' | 'taper';
export type Pace = 'gentle' | 'steady' | 'aggressive';
export type ThemePref = 'system' | 'light' | 'dark';

export interface CustomHabit {
  id: string;
  label: string;
}

/** All body measurements are stored in metric (kg, cm) and converted for display. */
export interface Profile {
  id: string;
  name: string;
  units: Units;
  heightCm: number | null;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  cigsPerDay: number;
  drinksPerWeek: number;
  sleepHours: number | null;
  bedtime: string; // "HH:MM", 24h
  goals: GoalId[];
  smokeMode: QuitMode;
  alcoholMode: QuitMode;
  pace: Pace;
  why: string;
  customHabits: CustomHabit[];
  startDate: string; // YYYY-MM-DD, day 1 of the plan
  onboarded: boolean;
}

export interface DailyEntry {
  date: string; // YYYY-MM-DD (local)
  completed: string[]; // plan item ids ticked that day
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  sleepHours: number | null;
  cigarettes: number | null;
  drinks: number | null;
  note: string;
  logged: boolean; // true once the evening log was saved
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
}

export interface PlanItem {
  id: string;
  label: string;
  sub: string;
  custom?: boolean;
}

export const GOALS: { id: GoalId; label: string }[] = [
  { id: 'weight', label: 'Lose weight' },
  { id: 'smoke', label: 'Quit smoking' },
  { id: 'alcohol', label: 'Quit alcohol' },
  { id: 'energy', label: 'More energy' },
  { id: 'steps', label: 'Walk more' },
  { id: 'sleep', label: 'Sleep better' },
  { id: 'eat', label: 'Eat cleaner' },
  { id: 'stress', label: 'Less stress' },
];

export function emptyEntry(date: string): DailyEntry {
  return {
    date,
    completed: [],
    mood: null,
    energy: null,
    sleepHours: null,
    cigarettes: null,
    drinks: null,
    note: '',
    logged: false,
  };
}
