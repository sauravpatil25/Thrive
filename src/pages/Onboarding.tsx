import { useEffect, useMemo, useState } from 'react';
import { IconBack, IconPlus, IconX } from '../components/icons';
import { Button, Chip, Field, OptionCard, Segmented, Stepper } from '../components/ui';
import { generatePlan } from '../lib/plan';
import { GOALS, type CustomHabit, type GoalId, type Pace, type Profile, type QuitMode, type Units } from '../lib/types';
import { cmToFtIn, displayWeight, ftInToCm, inputToKg, weightUnit } from '../lib/units';
import { useData } from '../state/data';
import { useToast } from '../state/toast';

interface Draft {
  name: string;
  units: Units;
  goals: GoalId[];
  customHabits: CustomHabit[];
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string; // in the chosen unit
  target: string; // in the chosen unit
  cigsPerDay: number;
  drinksPerWeek: number;
  sleepHours: number;
  bedtime: string;
  smokeMode: QuitMode;
  alcoholMode: QuitMode;
  pace: Pace;
  why: string;
}

const EMPTY: Draft = {
  name: '',
  units: 'metric',
  goals: [],
  customHabits: [],
  heightCm: '',
  heightFt: '',
  heightIn: '',
  weight: '',
  target: '',
  cigsPerDay: 10,
  drinksPerWeek: 10,
  sleepHours: 7,
  bedtime: '23:00',
  smokeMode: 'quit',
  alcoholMode: 'quit',
  pace: 'steady',
  why: '',
};

type Step = 'you' | 'goals' | 'body' | 'habits' | 'approach' | 'why';

const draftKey = (uid: string) => `thrive-onboarding:${uid}`;
const parseNum = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

function heightCmOf(d: Draft): number | null {
  if (d.units === 'metric') return parseNum(d.heightCm);
  const ft = parseNum(d.heightFt);
  if (ft == null) return null;
  return Math.round(ftInToCm(ft, parseNum(d.heightIn) ?? 0) * 10) / 10;
}

function kgOf(s: string, units: Units): number | null {
  const n = parseNum(s);
  return n == null || !Number.isFinite(n) ? null : Math.round(inputToKg(n, units) * 100) / 100;
}

export function toProfile(d: Draft, id: string, startDate: string): Profile {
  return {
    id,
    name: d.name.trim(),
    units: d.units,
    heightCm: heightCmOf(d),
    startWeightKg: kgOf(d.weight, d.units),
    targetWeightKg: d.goals.includes('weight') ? kgOf(d.target, d.units) : null,
    cigsPerDay: d.goals.includes('smoke') ? d.cigsPerDay : 0,
    drinksPerWeek: d.goals.includes('alcohol') ? d.drinksPerWeek : 0,
    sleepHours: d.sleepHours,
    bedtime: d.bedtime,
    goals: d.goals,
    smokeMode: d.smokeMode,
    alcoholMode: d.alcoholMode,
    pace: d.pace,
    why: d.why.trim(),
    customHabits: d.customHabits,
    startDate,
    onboarded: true,
  };
}

export function Onboarding() {
  const { userId, todayISO, saveProfile } = useData();
  const toast = useToast();
  const [d, setD] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(draftKey(userId));
      if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) };
    } catch {
      /* ignore */
    }
    return EMPTY;
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [newHabit, setNewHabit] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(userId), JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d, userId]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const has = (g: GoalId) => d.goals.includes(g);
  const needsApproach = has('smoke') || has('alcohol');

  const steps: Step[] = useMemo(
    () => ['you', 'goals', 'body', 'habits', ...(needsApproach ? (['approach'] as Step[]) : []), 'why'],
    [needsApproach],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  const weightKg = kgOf(d.weight, d.units);
  const targetKg = kgOf(d.target, d.units);
  const heightCm = heightCmOf(d);
  const unit = weightUnit(d.units);

  const errors: Partial<Record<'height' | 'weight' | 'target', string>> = {};
  if (heightCm != null && (heightCm < 100 || heightCm > 250)) errors.height = 'That height looks off. Please check it.';
  if (has('weight') && weightKg == null) errors.weight = 'Needed to track weight loss.';
  else if (weightKg != null && (weightKg < 30 || weightKg > 350)) errors.weight = 'That weight looks off. Please check it.';
  if (has('weight')) {
    if (targetKg == null) errors.target = 'Set a goal. You can change it any time.';
    else if (weightKg != null && targetKg >= weightKg) errors.target = 'Your goal should be below your current weight.';
    else if (targetKg < 30) errors.target = 'That goal looks off. Please check it.';
  }

  const canContinue: Record<Step, boolean> = {
    you: d.name.trim().length > 0,
    goals: d.goals.length > 0 || d.customHabits.length > 0,
    body: Object.keys(errors).length === 0,
    habits: true,
    approach: true,
    why: true,
  };

  const toggleGoal = (g: GoalId) => set('goals', has(g) ? d.goals.filter((x) => x !== g) : [...d.goals, g]);

  const addHabit = () => {
    const label = newHabit.trim();
    if (!label) return;
    if (d.customHabits.length >= 8) return toast.error('You can add up to 8 of your own habits.');
    set('customHabits', [...d.customHabits, { id: crypto.randomUUID().slice(0, 8), label: label.slice(0, 60) }]);
    setNewHabit('');
  };

  const switchUnits = (u: Units) => {
    if (u === d.units) return;
    // Convert what was typed so nothing is lost.
    const conv = (s: string) => {
      const kg = kgOf(s, d.units);
      return kg == null ? '' : String(displayWeight(kg, u));
    };
    const hcm = heightCmOf(d);
    const fi = hcm != null ? cmToFtIn(hcm) : null;
    setD((x) => ({
      ...x,
      units: u,
      weight: conv(x.weight),
      target: conv(x.target),
      heightCm: hcm != null ? String(Math.round(hcm)) : '',
      heightFt: fi ? String(fi.ft) : '',
      heightIn: fi ? String(fi.inch) : '',
    }));
  };

  async function finish() {
    setBusy(true);
    try {
      await saveProfile(toProfile(d, userId, todayISO));
      localStorage.removeItem(draftKey(userId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const next = () => (stepIdx < steps.length - 1 ? setStepIdx(stepIdx + 1) : void finish());
  const back = () => setStepIdx(Math.max(0, stepIdx - 1));
  const preview = step === 'why' ? generatePlan(toProfile(d, userId, todayISO), todayISO) : [];

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex h-10 items-center justify-between">
          {stepIdx > 0 ? (
            <button type="button" onClick={back} aria-label="Back" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full">
              <IconBack size={22} />
            </button>
          ) : (
            <span />
          )}
          <span className="text-[13px] font-bold text-muted">
            Step {stepIdx + 1} of {steps.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div key={step} className="fade-in flex flex-1 flex-col gap-5">
        {step === 'you' && (
          <>
            <StepTitle title="Let's get to know you" sub="Thrive builds a plan of small daily steps around you." />
            <Field label="What should we call you?" value={d.name} maxLength={40} autoComplete="given-name" onChange={(e) => set('name', e.target.value)} placeholder="Your first name" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-muted">Units</span>
              <Segmented
                label="Units"
                value={d.units}
                onChange={switchUnits}
                options={[
                  { value: 'metric', label: 'kg · cm' },
                  { value: 'imperial', label: 'lb · ft' },
                ]}
              />
            </div>
          </>
        )}

        {step === 'goals' && (
          <>
            <StepTitle title="What do you want to change?" sub="Pick as many as you like. Each becomes a small daily step." />
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip key={g.id} on={has(g.id)} onClick={() => toggleGoal(g.id)}>
                  {g.label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-muted">Your own daily habits (optional)</span>
              {d.customHabits.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-2.5 shadow-card">
                  <span className="text-[15px] font-semibold">{h.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${h.label}`}
                    onClick={() => set('customHabits', d.customHabits.filter((x) => x.id !== h.id))}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted"
                  >
                    <IconX size={18} />
                  </button>
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addHabit();
                }}
              >
                <input
                  aria-label="New habit"
                  value={newHabit}
                  maxLength={60}
                  onChange={(e) => setNewHabit(e.target.value)}
                  placeholder="e.g. No sugar after 8 pm"
                  className="h-12 flex-1 rounded-[14px] border-[1.5px] border-line bg-field px-3.5 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted/70 focus:border-primary"
                />
                <button type="submit" aria-label="Add habit" className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft text-primary-ink">
                  <IconPlus size={22} />
                </button>
              </form>
            </div>
          </>
        )}

        {step === 'body' && (
          <>
            <StepTitle title="Where are you starting?" sub="Only you can see this. It sets your water goal and tracks progress." />
            {d.units === 'metric' ? (
              <Field label="Height" type="number" inputMode="decimal" suffix="cm" value={d.heightCm} onChange={(e) => set('heightCm', e.target.value)} error={errors.height} hint="Optional" />
            ) : (
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Height" type="number" inputMode="numeric" suffix="ft" value={d.heightFt} onChange={(e) => set('heightFt', e.target.value)} />
                  <Field label="&nbsp;" aria-label="Height inches" type="number" inputMode="numeric" suffix="in" value={d.heightIn} onChange={(e) => set('heightIn', e.target.value)} />
                </div>
                <span className={`text-[12.5px] font-medium ${errors.height ? 'text-coral-ink' : 'text-muted'}`}>{errors.height ?? 'Optional'}</span>
              </div>
            )}
            <Field
              label="Current weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              suffix={unit}
              value={d.weight}
              onChange={(e) => set('weight', e.target.value)}
              error={errors.weight}
              hint={has('weight') ? undefined : 'Optional'}
            />
            {has('weight') && (
              <Field
                label="Goal weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                suffix={unit}
                value={d.target}
                onChange={(e) => set('target', e.target.value)}
                error={d.target || d.weight ? errors.target : undefined}
                hint="A steady pace is about 0.5–1 kg (1–2 lb) a week."
              />
            )}
          </>
        )}

        {step === 'habits' && (
          <>
            <StepTitle title="Your habits right now" sub="Be honest. This is your baseline, not a judgement." />
            {has('smoke') && (
              <Row label="Cigarettes per day" hint="On a typical day">
                <Stepper label="cigarettes per day" value={d.cigsPerDay} min={1} max={80} onChange={(v) => set('cigsPerDay', v)} />
              </Row>
            )}
            {has('alcohol') && (
              <Row label="Drinks per week" hint="1 drink ≈ a small glass of wine or a beer">
                <Stepper label="drinks per week" value={d.drinksPerWeek} min={1} max={120} onChange={(v) => set('drinksPerWeek', v)} />
              </Row>
            )}
            <Row label="Sleep per night" hint="On average">
              <Stepper label="hours of sleep" value={d.sleepHours} min={3} max={12} step={0.5} format={(v) => `${v} h`} onChange={(v) => set('sleepHours', v)} />
            </Row>
            <Field label="Target bedtime" type="time" value={d.bedtime} onChange={(e) => set('bedtime', e.target.value || '23:00')} hint="Used for your nightly “in bed by” step" />
          </>
        )}

        {step === 'approach' && (
          <>
            <StepTitle title="How do you want to quit?" sub="Both work. Choose what feels doable, and you can change it later." />
            {has('smoke') && (
              <div role="radiogroup" aria-label="Smoking approach" className="flex flex-col gap-2.5">
                <span className="text-[15px] font-extrabold">Smoking</span>
                <OptionCard on={d.smokeMode === 'quit'} onClick={() => set('smokeMode', 'quit')} title="Quit from today" desc="Go smoke-free now. Your daily step is “No cigarettes today”." />
                <OptionCard on={d.smokeMode === 'taper'} onClick={() => set('smokeMode', 'taper')} title="Taper down" desc={`Cut down from ${d.cigsPerDay} a day, a little each week, until you reach zero.`} />
              </div>
            )}
            {has('alcohol') && (
              <div role="radiogroup" aria-label="Alcohol approach" className="flex flex-col gap-2.5">
                <span className="text-[15px] font-extrabold">Alcohol</span>
                <OptionCard on={d.alcoholMode === 'quit'} onClick={() => set('alcoholMode', 'quit')} title="Quit from today" desc="Every day is an alcohol-free day." />
                <OptionCard on={d.alcoholMode === 'taper'} onClick={() => set('alcoholMode', 'taper')} title="Taper down" desc={`Lower your weekly limit from ${d.drinksPerWeek} drinks until you reach zero.`} />
                <p className="rounded-2xl bg-amber-soft px-4 py-3 text-[13px] font-semibold leading-snug text-amber-ink">
                  If you drink heavily every day, stopping suddenly can be dangerous. Please talk to a doctor first, and consider tapering.
                </p>
              </div>
            )}
            {(d.smokeMode === 'taper' && has('smoke')) || (d.alcoholMode === 'taper' && has('alcohol')) ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-muted">Taper pace</span>
                <Segmented
                  label="Taper pace"
                  value={d.pace}
                  onChange={(v) => set('pace', v)}
                  options={[
                    { value: 'gentle', label: 'Gentle' },
                    { value: 'steady', label: 'Steady' },
                    { value: 'aggressive', label: 'Fast' },
                  ]}
                />
                <span className="text-[12.5px] font-medium text-muted">
                  {d.pace === 'gentle' ? 'About 10 weeks to zero.' : d.pace === 'steady' ? 'About 5 weeks to zero.' : 'About 3 weeks to zero.'}
                </span>
              </div>
            ) : null}
          </>
        )}

        {step === 'why' && (
          <>
            <StepTitle title="Why does this matter to you?" sub="We will show this on your home screen for the days motivation dips." />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="why" className="text-[13px] font-bold text-muted">
                Your why (optional)
              </label>
              <textarea
                id="why"
                rows={3}
                maxLength={200}
                value={d.why}
                onChange={(e) => set('why', e.target.value)}
                placeholder="I want to wake up with energy and feel proud of my body."
                className="rounded-[14px] border-[1.5px] border-line bg-field px-3.5 py-3 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted/70 focus:border-primary"
              />
            </div>
            <div className="rounded-3xl bg-card p-4 shadow-card">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-primary-ink">Your plan for today</span>
              <ul className="mt-2 flex flex-col gap-2">
                {preview.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 text-[14px] font-semibold">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <Button block className="mt-8 h-14" onClick={next} disabled={!canContinue[step]} loading={busy}>
        {step === 'why' ? 'Start my plan' : 'Continue'}
      </Button>
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
      <p className="text-[14px] font-medium text-muted">{sub}</p>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-card p-4 shadow-card">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-extrabold">{label}</span>
        {hint && <span className="text-[12.5px] font-medium text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
