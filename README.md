# Thrive

Small daily steps to a healthier you. Thrive is an installable web app (PWA) for
losing weight, quitting smoking and alcohol, walking more, sleeping better and
building your own habits, one tick at a time.

## Features

- **Email + password accounts** (Supabase Auth), with password reset
- **Onboarding questionnaire**: name, units (kg/cm or lb/ft), goals, custom habits,
  starting weight and goal, current habits, quit-now or taper approach, and your "why"
- **Daily plan**: 5-10 concrete ticks generated from your goals. Tapering lowers
  limits weekly at a gentle, steady or fast pace.
- **Home screen**: progress ring, smoke-free / alcohol-free / plan streaks, your why,
  fortnightly weigh-in reminder
- **Evening log** (about 2 minutes): mood, energy, sleep, an honest slip check that
  never wipes your progress, notes. Yesterday can be logged too.
- **Progress**: weight chart against your goal, 12-week consistency heatmap,
  weekly cigarettes and drinks, 7-day averages, milestones
- **Profile**: edit goals, habits, approach, units, theme (auto/light/dark),
  export your data, delete everything
- Works offline for viewing, installs to the home screen, light and dark themes

## Tech

React 18 + TypeScript + Vite, Tailwind CSS, Supabase (Postgres + Auth with
row-level security), Recharts, vite-plugin-pwa. Tests: Vitest (logic) and
Playwright (end-to-end, phone-sized screens). Deployed to GitHub Pages by
GitHub Actions; a deploy only happens when every test passes.

## Set up Supabase (once)

1. In the Supabase dashboard open **SQL Editor**, paste
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it.
2. **Authentication > URL Configuration**: set **Site URL** to
   `https://<your-github-user>.github.io/thrive/` and add the same URL under
   **Redirect URLs**.
3. In GitHub: **Settings > Secrets and variables > Actions > Variables**, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_...`
   key). Both are safe to be public; never use the secret key in the app.
4. **Settings > Pages**: set Source to **GitHub Actions**.

## Develop

```bash
npm install
npm run dev:demo      # runs with an on-device test backend, no Supabase needed
npm run dev           # uses Supabase settings from .env.local
npm test              # unit tests
npm run e2e           # end-to-end tests (demo backend)
```
