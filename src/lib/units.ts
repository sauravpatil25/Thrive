import type { Units } from './types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}

export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * CM_PER_IN;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Weight in the user's unit, rounded to 0.1. */
export function displayWeight(kg: number, units: Units): number {
  return round1(units === 'metric' ? kg : kgToLb(kg));
}

export function weightUnit(units: Units): string {
  return units === 'metric' ? 'kg' : 'lb';
}

export function formatWeight(kg: number, units: Units): string {
  return `${displayWeight(kg, units)} ${weightUnit(units)}`;
}

/** Converts a value typed in the user's unit back to kg. */
export function inputToKg(value: number, units: Units): number {
  return units === 'metric' ? value : lbToKg(value);
}

export function formatHeight(cm: number, units: Units): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}′${inch}″`;
}

export function formatWater(litres: number, units: Units): string {
  if (units === 'metric') return `${litres} L`;
  return `${Math.round((litres * 1000) / 29.5735 / 5) * 5} oz`;
}
