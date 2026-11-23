import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct-horse-9';

export function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export async function signUp(page: Page, email = uniqueEmail()) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Become your healthiest self.' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: "Let's get to know you" })).toBeVisible();
  return email;
}

export interface OnboardOpts {
  name?: string;
  imperial?: boolean;
  goals?: string[];
  habit?: string;
  weight?: string;
  target?: string;
  smokeTaper?: boolean;
  why?: string;
}

const cont = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();

export async function onboard(page: Page, o: OnboardOpts = {}) {
  const goals = o.goals ?? ['Lose weight', 'Quit smoking', 'Quit alcohol', 'Walk more'];
  await page.getByLabel('What should we call you?').fill(o.name ?? 'Alex');
  if (o.imperial) await page.getByRole('radio', { name: 'lb · ft' }).click();
  await cont(page);

  for (const g of goals) await page.getByRole('button', { name: g, exact: true }).click();
  if (o.habit) {
    await page.getByLabel('New habit').fill(o.habit);
    await page.getByRole('button', { name: 'Add habit' }).click();
  }
  await cont(page);

  await page.getByLabel('Current weight').fill(o.weight ?? '92');
  if (goals.includes('Lose weight')) await page.getByLabel('Goal weight').fill(o.target ?? '82');
  await cont(page);

  await expect(page.getByRole('heading', { name: 'Your habits right now' })).toBeVisible();
  await cont(page);

  if (goals.includes('Quit smoking') || goals.includes('Quit alcohol')) {
    await expect(page.getByRole('heading', { name: 'How do you want to quit?' })).toBeVisible();
    if (o.smokeTaper) await page.getByRole('radiogroup', { name: 'Smoking approach' }).getByRole('radio', { name: /Taper down/ }).click();
    await cont(page);
  }

  if (o.why) await page.getByLabel('Your why (optional)').fill(o.why);
  await page.getByRole('button', { name: 'Start my plan' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`, ${o.name ?? 'Alex'}$`) })).toBeVisible();
}
