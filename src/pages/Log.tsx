import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/AppShell';
import { IconCheck } from '../components/icons';
import { Button, Card, CheckRow, Scale, Segmented, Stepper } from '../components/ui';
import { addDays, formatLong } from '../lib/dates';
import { drinksSoFarThisWeek, generatePlan, smokeLimit, weeklyDrinkLimit } from '../lib/plan';
import type { DailyEntry } from '../lib/types';
import { useData, useProfile } from '../state/data';
import { useToast } from '../state/toast';

type Form = Pick<DailyEntry, 'mood' | 'energy' | 'sleepHours' | 'cigarettes' | 'drinks' | 'note'>;

export function Log() {
  const profile = useProfile();
  const { todayISO, entries, entryFor, updateEntry, toggleItem } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const yesterday = addDays(todayISO, -1);
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const date = day === 'today' ? todayISO : yesterday;
  const entry = entryFor(date);
  const canYesterday = yesterday >= profile.startDate;

  const fromEntry = (e: DailyEntry): Form => ({
    mood: e.mood,
    energy: e.energy,
    sleepHours: e.sleepHours ?? profile.sleepHours ?? 7,
    cigarettes: e.cigarettes ?? 0,
    drinks: e.drinks ?? 0,
    note: e.note,
  });
  const [form, setForm] = useState<Form>(() => fromEntry(entry));
  const [busy, setBusy] = useState(false);

  // Reset the form when switching between today and yesterday.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(fromEntry(entryFor(date))), [date]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const plan = generatePlan(profile, date, entries);
  const done = new Set(entry.completed);
  const smokes = profile.goals.includes('smoke');
  const drinks = profile.goals.includes('alcohol');
  const cigLimit = smokeLimit(profile, date);
  const weekLimit = weeklyDrinkLimit(profile, date);
  const weekUsed = drinksSoFarThisWeek(date, entries) + (form.drinks ?? 0);

  const cigs = form.cigarettes ?? 0;
  const cigOk = cigs <= cigLimit;
  const cigNote = cigLimit === 0
    ? cigs === 0 ? 'Smoke-free day. Well done.' : 'Logged. Tomorrow is a fresh start.'
    : cigOk ? `Within today's limit of ${cigLimit}` : `${cigs - cigLimit} over the limit. Noted, and that's okay.`;

  const drinkCount = form.drinks ?? 0;
  const drinkOk = weekLimit === 0 ? drinkCount === 0 : weekUsed <= weekLimit;
  const drinkNote = weekLimit === 0
    ? drinkCount === 0 ? 'Alcohol-free day. Nice.' : 'Logged. Your total never resets.'
    : drinkOk ? `${weekUsed} of ${weekLimit} this week` : `${weekUsed - weekLimit} over this week's limit. Noted.`;

  async function save() {
    setBusy(true);
    try {
      await updateEntry(date, {
        ...form,
        cigarettes: smokes ? form.cigarettes : null,
        drinks: drinks ? form.drinks : null,
        note: form.note.trim(),
        logged: true,
      });
      toast.show(day === 'today' ? 'Today is logged. Nice work.' : 'Yesterday is logged.');
      navigate('/');
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-in">
      <PageHeader sub={formatLong(date)} title="Evening log" right={entry.logged ? <span className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary-ink"><IconCheck size={14} /> Logged</span> : undefined} />

      <div className="flex flex-col gap-4 px-5">
        {canYesterday && (
          <Segmented<'today' | 'yesterday'>
            label="Day to log"
            value={day}
            onChange={setDay}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
            ]}
          />
        )}

        <Card className="flex flex-col gap-3">
          <span className="text-[15px] font-extrabold">How was your mood?</span>
          <Scale label="Mood" value={form.mood} onChange={(v) => set('mood', v)} />
          <span className="mt-1 text-[15px] font-extrabold">Energy level?</span>
          <Scale label="Energy" value={form.energy} onChange={(v) => set('energy', v)} />
        </Card>

        <Card className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">Sleep last night</span>
            <span className="text-[13px] font-medium text-muted">Goal: 7+ hours</span>
          </div>
          <Stepper label="hours of sleep" value={form.sleepHours ?? 7} min={0} max={14} step={0.5} format={(v) => `${v} h`} onChange={(v) => set('sleepHours', v)} />
        </Card>

        {(smokes || drinks) && (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-extrabold">Honest check</span>
              <span className="text-[13px] font-medium text-muted">A slip never wipes your progress. It just shapes tomorrow&apos;s plan.</span>
            </div>
            {smokes && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Cigarettes</span>
                  <span className={`text-[12.5px] font-semibold ${cigOk ? 'text-primary-ink' : 'text-coral-ink'}`}>{cigNote}</span>
                </div>
                <Stepper label="cigarettes" value={cigs} max={80} onChange={(v) => set('cigarettes', v)} />
              </div>
            )}
            {smokes && drinks && <div className="h-px bg-line" />}
            {drinks && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Drinks</span>
                  <span className={`text-[12.5px] font-semibold ${drinkOk ? 'text-primary-ink' : 'text-coral-ink'}`}>{drinkNote}</span>
                </div>
                <Stepper label="drinks" value={drinkCount} max={40} onChange={(v) => set('drinks', v)} />
              </div>
            )}
          </Card>
        )}

        <Card className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-[15px] font-extrabold">
            Notes, cravings or triggers
          </label>
          <span className="text-[13px] font-medium text-muted">Optional. Spotting patterns helps.</span>
          <textarea
            id="note"
            rows={2}
            maxLength={500}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="e.g. Stressful call after lunch"
            className="mt-1 rounded-[14px] border-[1.5px] border-line bg-field px-3.5 py-3 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted/70 focus:border-primary"
          />
        </Card>

        <div>
          <span className="mb-2 block text-[15px] font-extrabold">{day === 'today' ? "Today's plan" : "Yesterday's plan"}</span>
          <div className="flex flex-col rounded-[22px] bg-card px-1 py-1.5 shadow-card">
            {plan.map((p) => (
              <CheckRow key={p.id} checked={done.has(p.id)} onToggle={() => toggleItem(date, p.id)} label={p.label} badge={p.custom ? 'Custom' : undefined} />
            ))}
          </div>
        </div>

        <Button block className="h-14" onClick={save} loading={busy}>
          <IconCheck size={20} /> Save {day}
        </Button>
      </div>
    </div>
  );
}
