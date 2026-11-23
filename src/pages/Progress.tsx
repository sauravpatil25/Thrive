import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../components/AppShell';
import { IconLock, IconTrash, IconTrophy } from '../components/icons';
import { Button, Card, SectionTitle } from '../components/ui';
import { useThemeColors } from '../components/useThemeColors';
import { WeighInSheet } from '../components/WeighInSheet';
import { addDays, daysBetween, formatShort, parseISODate, startOfWeek } from '../lib/dates';
import { averageOf, bestPlanStreak, latestWeight, milestones, scoreFor, weeklyTotals } from '../lib/stats';
import { displayWeight, weightUnit } from '../lib/units';
import { useData, useProfile } from '../state/data';
import { useToast } from '../state/toast';

const WEEKS = 12;

export function Progress() {
  const profile = useProfile();
  const { entries, weights, todayISO, deleteWeight } = useData();
  const toast = useToast();
  const colors = useThemeColors();
  const [weighOpen, setWeighOpen] = useState(false);
  const unit = weightUnit(profile.units);
  const show = (kg: number) => displayWeight(kg, profile.units);

  const tracksWeight = profile.goals.includes('weight') || profile.startWeightKg != null;
  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const series = [
    ...(profile.startWeightKg ? [{ date: profile.startDate, value: show(profile.startWeightKg), start: true }] : []),
    ...sortedWeights.map((w) => ({ date: w.date, value: show(w.weightKg), start: false })),
  ];
  const current = latestWeight(profile, weights);
  const change = current && profile.startWeightKg ? show(current.kg) - show(profile.startWeightKg) : null;
  const toGo = current && profile.targetWeightKg ? show(current.kg) - show(profile.targetWeightKg) : null;

  const values = series.map((s) => s.value).concat(profile.targetWeightKg ? [show(profile.targetWeightKg)] : []);
  const yMin = values.length ? Math.floor(Math.min(...values) - 2) : 0;
  const yMax = values.length ? Math.ceil(Math.max(...values) + 2) : 100;

  // Consistency heatmap: columns are weeks (oldest first), rows Mon-Sun.
  const firstWeek = addDays(startOfWeek(todayISO), -7 * (WEEKS - 1));
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstWeek, w * 7 + d);
      const active = date >= profile.startDate && date <= todayISO;
      return { date, active, ratio: active ? scoreFor(profile, date, entries).ratio : 0 };
    }),
  );

  const smoke = profile.goals.includes('smoke') ? weeklyTotals(entries, todayISO, 8, 'cigarettes') : null;
  const alcohol = profile.goals.includes('alcohol') ? weeklyTotals(entries, todayISO, 8, 'drinks') : null;
  const ms = milestones(profile, todayISO, entries, weights);
  const earned = ms.filter((m) => m.achieved).length;

  const avgs = [
    { label: 'Mood', value: averageOf(entries, todayISO, 7, 'mood'), suffix: '/5' },
    { label: 'Energy', value: averageOf(entries, todayISO, 7, 'energy'), suffix: '/5' },
    { label: 'Sleep', value: averageOf(entries, todayISO, 7, 'sleepHours'), suffix: ' h' },
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Progress" sub={`Day ${Math.max(1, daysBetween(profile.startDate, todayISO) + 1)} of your journey`} />
      <div className="flex flex-col gap-5 px-5">
        {tracksWeight && (
          <section>
            <SectionTitle aside={current ? `${show(current.kg)} ${unit} now` : undefined}>Weight</SectionTitle>
            <Card className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Start" value={profile.startWeightKg ? `${show(profile.startWeightKg)}` : '–'} unit={unit} />
                <Stat label="Change" value={change == null ? '–' : `${change > 0 ? '+' : ''}${Math.round(change * 10) / 10}`} unit={unit} tone={change != null && change < 0 ? 'good' : undefined} />
                <Stat label="To goal" value={toGo == null ? '–' : `${Math.max(0, Math.round(toGo * 10) / 10)}`} unit={unit} />
              </div>
              {series.length >= 2 ? (
                <div className="h-48" aria-label="Weight chart" role="img">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid stroke={colors.line} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatShort} tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis domain={[yMin, yMax]} tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        formatter={(v) => [`${v} ${unit}`, 'Weight']}
                        labelFormatter={(l) => formatShort(String(l))}
                        contentStyle={{ background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 12, color: colors.ink, fontWeight: 600 }}
                      />
                      {profile.targetWeightKg && (
                        <ReferenceLine y={show(profile.targetWeightKg)} stroke={colors.amber} strokeDasharray="5 5" label={{ value: 'Goal', fill: colors.amber, fontSize: 11, position: 'insideTopRight' }} />
                      )}
                      <Line type="monotone" dataKey="value" stroke={colors.primary} strokeWidth={3} dot={{ r: 3.5, fill: colors.primary, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm font-medium text-muted">Log your weight every two weeks and your trend will appear here.</p>
              )}
              <Button variant="secondary" block onClick={() => setWeighOpen(true)}>
                Log weight
              </Button>
            </Card>
          </section>
        )}

        <section>
          <SectionTitle aside={`Best streak: ${bestPlanStreak(profile, todayISO, entries)} days`}>Consistency</SectionTitle>
          <Card>
            <div className="flex gap-[5px]" role="img" aria-label={`Daily plan completion over the last ${WEEKS} weeks`}>
              {weeks.map((col, i) => (
                <div key={i} className="flex flex-1 flex-col gap-[5px]">
                  {col.map((c) => (
                    <div key={c.date} title={`${formatShort(c.date)}: ${Math.round(c.ratio * 100)}%`} className={`aspect-square w-full rounded-[4px] ${heat(c.active, c.ratio)}`} />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-muted">
              Less
              {[0, 0.3, 0.6, 0.85, 1].map((r) => (
                <span key={r} className={`h-3 w-3 rounded-[3px] ${heat(true, r)}`} />
              ))}
              More
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle aside="Last 7 days">Averages</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {avgs.map((a) => (
              <div key={a.label} className="rounded-[18px] bg-card px-3 py-3.5 text-center shadow-card">
                <div className="text-2xl font-extrabold tabular-nums">
                  {a.value ?? '–'}
                  {a.value != null && <span className="text-[13px] font-semibold text-muted">{a.suffix}</span>}
                </div>
                <div className="text-xs font-semibold text-muted">{a.label}</div>
              </div>
            ))}
          </div>
        </section>

        {(smoke || alcohol) && (
          <section>
            <SectionTitle aside="Per week">Cutting down</SectionTitle>
            <Card className="flex flex-col gap-5">
              {smoke && <Bars title="Cigarettes" data={smoke} />}
              {alcohol && <Bars title="Drinks" data={alcohol} />}
            </Card>
          </section>
        )}

        <section>
          <SectionTitle aside={`${earned} of ${ms.length}`}>Milestones</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {ms.map((m) => (
              <div key={m.id} className={`flex items-center gap-3 rounded-[18px] p-3.5 ${m.achieved ? 'bg-amber-soft' : 'bg-card shadow-card'}`} data-achieved={m.achieved}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${m.achieved ? 'bg-amber text-white' : 'bg-track text-muted'}`}>
                  {m.achieved ? <IconTrophy size={20} /> : <IconLock size={18} />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={`text-[13.5px] font-extrabold leading-tight ${m.achieved ? 'text-amber-ink' : ''}`}>{m.title}</span>
                  <span className="text-[11.5px] font-medium text-muted">{m.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {sortedWeights.length > 0 && (
          <section>
            <SectionTitle>Weigh-ins</SectionTitle>
            <Card className="flex flex-col divide-y divide-line p-0">
              {[...sortedWeights].reverse().map((w) => (
                <div key={w.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-semibold">{formatShort(w.date)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-extrabold tabular-nums">
                      {show(w.weightKg)} {unit}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete weigh-in on ${formatShort(w.date)}`}
                      onClick={() => deleteWeight(w.id).then(() => toast.show('Weigh-in deleted'), () => toast.error('Could not delete.'))}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted"
                    >
                      <IconTrash size={18} />
                    </button>
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>
      {tracksWeight && <WeighInSheet open={weighOpen} onClose={() => setWeighOpen(false)} />}
    </div>
  );
}

function heat(active: boolean, r: number): string {
  if (!active) return 'border border-dashed border-line';
  if (r === 0) return 'bg-track';
  if (r < 0.4) return 'bg-primary/25';
  if (r < 0.7) return 'bg-primary/50';
  if (r < 1) return 'bg-primary/75';
  return 'bg-primary';
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: 'good' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className={`text-xl font-extrabold tabular-nums ${tone === 'good' ? 'text-primary-ink' : ''}`}>
        {value}
        {value !== '–' && <span className="text-xs font-semibold text-muted"> {unit}</span>}
      </span>
    </div>
  );
}

function Bars({ title, data }: { title: string; data: { week: string; total: number; logged: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div>
      <span className="text-sm font-bold">{title}</span>
      <div className="mt-2 flex h-28 items-end gap-2" role="img" aria-label={`${title} per week: ${data.map((d) => d.total).join(', ')}`}>
        {data.map((d) => (
          <div key={d.week} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] font-bold tabular-nums text-muted">{d.logged ? d.total : ''}</span>
            <div className="w-full rounded-t-md bg-coral/80" style={{ height: `${d.logged ? Math.max(4, (d.total / max) * 72) : 0}px` }} />
            <div className="h-px w-full bg-line" />
            <span className="text-[10px] font-semibold text-muted">{parseISODate(d.week).getDate()}/{parseISODate(d.week).getMonth() + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
