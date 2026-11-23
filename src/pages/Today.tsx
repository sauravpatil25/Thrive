import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/AppShell';
import { IconFlame, IconGlass, IconMoon, IconNoSmoke, IconScale, IconStreak } from '../components/icons';
import { CheckRow, Eyebrow, Ring, SectionTitle } from '../components/ui';
import { WeighInSheet } from '../components/WeighInSheet';
import { formatLong, greeting } from '../lib/dates';
import { generatePlan, smokeLimit, weeklyDrinkLimit } from '../lib/plan';
import { dayScore, freeStreak, planStreak, weighInDueIn } from '../lib/stats';
import { useData, useProfile } from '../state/data';

export function Today() {
  const profile = useProfile();
  const { entries, weights, todayISO, entryFor, toggleItem } = useData();
  const [weighOpen, setWeighOpen] = useState(false);

  const plan = generatePlan(profile, todayISO, entries);
  const entry = entryFor(todayISO);
  const done = new Set(entry.completed);
  const score = dayScore(plan, entry);
  const left = score.total - score.done;
  const next = plan.find((p) => !done.has(p.id));
  const streak = planStreak(profile, todayISO, entries);
  const dueIn = weighInDueIn(profile, weights, todayISO);
  const tracksWeight = profile.goals.includes('weight') || profile.startWeightKg != null;

  const headline =
    score.total === 0
      ? 'Add a goal or habit to get your daily plan.'
      : left === 0
        ? 'Perfect day. You showed up for yourself.'
        : left === 1
          ? '1 small step left. Finish strong.'
          : score.done === 0
            ? `${left} small steps today. Start with one.`
            : `${left} small steps left. You're on track.`;

  const cards: { key: string; Icon: typeof IconFlame; value: string; unit?: string; label: string; sub?: string }[] = [];
  if (profile.goals.includes('smoke')) {
    const limit = smokeLimit(profile, todayISO);
    if (profile.smokeMode === 'quit' || limit === 0) {
      const s = freeStreak(profile, todayISO, entries, 'cigarettes');
      cards.push({ key: 'smoke', Icon: IconNoSmoke, value: String(s.current), unit: s.current === 1 ? 'day' : 'days', label: 'Smoke-free', sub: s.lastSlip ? `${s.total} in total` : undefined });
    } else {
      cards.push({ key: 'smoke', Icon: IconNoSmoke, value: String(limit), unit: 'max', label: 'Cigarettes today' });
    }
  }
  if (profile.goals.includes('alcohol')) {
    const weekly = weeklyDrinkLimit(profile, todayISO);
    if (profile.alcoholMode === 'quit' || weekly === 0) {
      const s = freeStreak(profile, todayISO, entries, 'drinks');
      cards.push({ key: 'alcohol', Icon: IconGlass, value: String(s.current), unit: s.current === 1 ? 'day' : 'days', label: 'Alcohol-free', sub: s.lastSlip ? `${s.total} in total` : undefined });
    } else {
      cards.push({ key: 'alcohol', Icon: IconGlass, value: String(weekly), unit: 'max', label: 'Drinks this week' });
    }
  }
  cards.push({ key: 'plan', Icon: cards.length ? IconStreak : IconFlame, value: String(streak), unit: streak === 1 ? 'day' : 'days', label: 'Plan streak' });

  return (
    <div className="fade-in">
      <PageHeader
        sub={formatLong(todayISO)}
        title={`${greeting()}, ${profile.name}`}
        right={
          <Link to="/profile" aria-label="Profile" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-base font-extrabold text-primary-ink">
            {profile.name.slice(0, 1).toUpperCase()}
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-5">
        <section aria-label="Today's score" className="flex items-center gap-[18px] rounded-3xl bg-card p-5 shadow-card">
          <Ring ratio={score.ratio}>
            <span className="text-[34px] font-extrabold tracking-tight tabular-nums" data-testid="score">
              {score.done}/{score.total}
            </span>
            <span className="text-xs font-semibold text-muted">done today</span>
          </Ring>
          <div className="flex min-w-0 flex-col gap-2.5">
            <Eyebrow className="text-primary-ink">Today&apos;s score</Eyebrow>
            <span className="text-[17px] font-bold leading-snug">{headline}</span>
            <div className="flex flex-col gap-0.5 rounded-[14px] bg-primary-soft px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-primary-ink">Up next</span>
              <span className="text-[13px] font-semibold">{next ? next.label : entry.logged ? 'All done. Rest well.' : 'Log your evening'}</span>
            </div>
          </div>
        </section>

        <section aria-label="Streaks" className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}>
          {cards.map(({ key, Icon, value, unit, label, sub }) => (
            <div key={key} className="flex flex-col gap-1.5 rounded-[18px] bg-card px-3 py-3.5 shadow-card" data-testid={`card-${key}`}>
              <Icon size={22} className="text-amber" />
              <span className="text-2xl font-extrabold tracking-tight tabular-nums">
                {value}
                {unit && <span className="text-[13px] font-semibold text-muted"> {unit}</span>}
              </span>
              <span className="text-xs font-semibold text-muted">{label}</span>
              {sub && <span className="text-[11px] font-semibold text-muted">{sub}</span>}
            </div>
          ))}
        </section>

        {tracksWeight && dueIn <= 0 && (
          <button
            type="button"
            onClick={() => setWeighOpen(true)}
            className="flex items-center justify-between gap-3 rounded-[18px] bg-amber-soft px-4 py-3.5 text-left"
          >
            <span className="flex items-center gap-3">
              <IconScale size={24} className="text-amber-ink" />
              <span className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-[0.04em] text-amber-ink">Weigh-in due</span>
                <span className="text-sm font-semibold">Your fortnightly check-in</span>
              </span>
            </span>
            <span className="rounded-xl border-[1.5px] border-amber-ink px-3 py-2 text-sm font-extrabold text-amber-ink">Log</span>
          </button>
        )}

        {profile.why && (
          <div className="flex flex-col gap-1 rounded-[18px] border-[1.5px] border-dashed border-line px-4 py-3.5">
            <Eyebrow className="text-muted">Your why</Eyebrow>
            <span className="text-[15px] font-semibold italic leading-snug">“{profile.why}”</span>
          </div>
        )}

        <div>
          <SectionTitle aside="Tap to tick">Today&apos;s plan</SectionTitle>
          <div className="flex flex-col rounded-[22px] bg-card px-1 py-1.5 shadow-card">
            {plan.map((p) => (
              <CheckRow key={p.id} checked={done.has(p.id)} onToggle={() => toggleItem(todayISO, p.id)} label={p.label} sub={p.sub} badge={p.custom ? 'Custom' : undefined} />
            ))}
            {plan.length === 0 && <p className="p-4 text-sm font-medium text-muted">Add goals or habits in your profile to build a plan.</p>}
          </div>
        </div>

        <Link to="/log" className="flex h-[54px] items-center justify-center gap-2 rounded-[18px] bg-primary text-base font-extrabold text-on-primary shadow-card">
          <IconMoon size={20} />
          {entry.logged ? "Edit today's log" : 'Log my evening · 2 min'}
        </Link>

        {tracksWeight && dueIn > 0 && (
          <button type="button" onClick={() => setWeighOpen(true)} className="mx-auto py-2 text-sm font-bold text-primary-ink">
            Log weight · next check-in in {dueIn} day{dueIn === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <WeighInSheet open={weighOpen} onClose={() => setWeighOpen(false)} />
    </div>
  );
}
