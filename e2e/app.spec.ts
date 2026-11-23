import { expect, test } from '@playwright/test';
import { onboard, PASSWORD, signUp } from './helpers';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('new user signs up, onboards and gets a personal daily plan', async ({ page }) => {
  await signUp(page);
  await onboard(page, { habit: 'No sugar after 8 pm', why: 'Energy for the people I love.' });

  const plan = page.getByRole('checkbox');
  await expect(page.getByRole('checkbox', { name: /No cigarettes today/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Alcohol-free day/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Walk 10,000 steps/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /No sugar after 8 pm/ })).toBeVisible();
  await expect(page.getByText('“Energy for the people I love.”')).toBeVisible();
  await expect(page.getByText(/money saved/i)).toHaveCount(0);

  const total = await plan.count();
  await expect(page.getByTestId('score')).toHaveText(`0/${total}`);
  await page.getByRole('checkbox', { name: /Walk 10,000 steps/ }).click();
  await page.getByRole('checkbox', { name: /No cigarettes today/ }).click();
  await expect(page.getByTestId('score')).toHaveText(`2/${total}`);
  await expect(page.getByRole('checkbox', { name: /Walk 10,000 steps/ })).toHaveAttribute('aria-checked', 'true');

  // Untick works, and state survives a reload.
  await page.getByRole('checkbox', { name: /No cigarettes today/ }).click();
  await expect(page.getByTestId('score')).toHaveText(`1/${total}`);
  await page.reload();
  await expect(page.getByTestId('score')).toHaveText(`1/${total}`);
  await expect(page.getByRole('checkbox', { name: /Walk 10,000 steps/ })).toHaveAttribute('aria-checked', 'true');
});

test('evening log saves mood, sleep and an honest slip without shaming', async ({ page }) => {
  await signUp(page);
  await onboard(page);

  await page.getByRole('link', { name: /Log my evening/ }).click();
  await expect(page.getByRole('heading', { name: 'Evening log' })).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Mood' }).getByRole('radio', { name: '4 Good' }).click();
  await page.getByRole('radiogroup', { name: 'Energy' }).getByRole('radio', { name: '3 Okay' }).click();
  await page.getByRole('button', { name: 'Increase hours of sleep' }).click();
  await page.getByRole('button', { name: 'Increase cigarettes' }).click();
  await page.getByRole('button', { name: 'Increase cigarettes' }).click();
  await expect(page.getByText('Logged. Tomorrow is a fresh start.')).toBeVisible();
  await page.getByLabel('Notes, cravings or triggers').fill('Stressful call after lunch');
  await page.getByRole('button', { name: 'Save today' }).click();

  await expect(page.getByText('Today is logged. Nice work.')).toBeVisible();
  await expect(page.getByRole('link', { name: "Edit today's log" })).toBeVisible();
  await expect(page.getByTestId('card-smoke')).toContainText('0 days');

  // Reopening shows what was saved.
  await page.getByRole('link', { name: "Edit today's log" }).click();
  await expect(page.getByRole('radiogroup', { name: 'Mood' }).getByRole('radio', { name: '4 Good' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('group', { name: 'cigarettes' }).locator('output')).toHaveText('2');
  await expect(page.getByLabel('Notes, cravings or triggers')).toHaveValue('Stressful call after lunch');
});

test('taper mode shows a reducing daily limit', async ({ page }) => {
  await signUp(page);
  await onboard(page, { goals: ['Quit smoking'], smokeTaper: true });
  // Default baseline 10/day, steady pace: week 1 allows 8.
  await expect(page.getByRole('checkbox', { name: /No more than 8 cigarettes/ })).toBeVisible();
  await expect(page.getByTestId('card-smoke')).toContainText('8');
});

test('weigh-in is saved, charted and can be deleted', async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Weight', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log weight' }).click();
  const dialog = page.getByRole('dialog', { name: 'Log your weight' });
  await dialog.getByLabel('Weight').fill('500');
  await dialog.getByRole('button', { name: 'Save weight' }).click();
  await expect(dialog.getByText('Enter your weight in kg.')).toBeVisible();
  await dialog.getByLabel('Weight').fill('90.4');
  await dialog.getByRole('button', { name: 'Save weight' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText('90.4 kg now')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Weight chart' })).toBeVisible();
  await expect(page.getByText('-1.6')).toBeVisible();
  await page.getByRole('button', { name: /Delete weigh-in/ }).click();
  await expect(page.getByText('Weigh-in deleted')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Weight chart' })).toHaveCount(0);
});

test('validation blocks a goal weight above current weight', async ({ page }) => {
  await signUp(page);
  await page.getByLabel('What should we call you?').fill('Alex');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Lose weight', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Current weight').fill('80');
  await page.getByLabel('Goal weight').fill('85');
  await expect(page.getByText('Your goal should be below your current weight.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByLabel('Goal weight').fill('75');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
});

test('imperial units and theme can be changed in profile', async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await expect(page.getByRole('checkbox', { name: /Drink 3 L of water/ })).toBeVisible();

  await page.getByRole('link', { name: 'Profile', exact: true }).first().click();
  await page.getByRole('radio', { name: 'lb · ft' }).click();
  await expect(page.getByLabel('Goal weight')).toHaveValue('180.8');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved')).toBeVisible();

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('checkbox', { name: /Drink 100 oz of water/ })).toBeVisible();
});

test('custom habits can be added later and appear in the plan', async ({ page }) => {
  await signUp(page);
  await onboard(page, { goals: ['Less stress'] });
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Profile' }).click();
  await page.getByLabel('New habit').fill('Read 10 pages');
  await page.getByRole('button', { name: 'Add habit' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved')).toBeVisible();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('checkbox', { name: /Read 10 pages/ })).toBeVisible();
});

test('sign out and sign back in, with a helpful error on a wrong password', async ({ page }) => {
  const email = await signUp(page);
  await onboard(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /, Alex$/ })).toBeVisible();
});

test('delete all data returns to onboarding', async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Delete all my data' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page.getByRole('heading', { name: "Let's get to know you" })).toBeVisible();
});

test('no screen scrolls sideways on a phone', async ({ page }) => {
  await signUp(page);
  await onboard(page, { habit: 'A rather long custom habit name to check wrapping works' });
  for (const tab of ['Today', 'Log', 'Progress', 'Profile']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click();
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${tab} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test('is an installable PWA', async ({ page }) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Thrive');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state))
    .toBe('activated');
});
