import { useEffect, useState } from 'react';
import { PageHeader } from '../components/AppShell';
import { IconDownload, IconPlus, IconTrash, IconX } from '../components/icons';
import { Button, Card, Chip, Field, OptionCard, Segmented, SectionTitle, Sheet } from '../components/ui';
import { backend } from '../lib/backend';
import { useInstall } from '../lib/install';
import { GOALS, type GoalId, type Profile as ProfileT, type ThemePref } from '../lib/types';
import { displayWeight, inputToKg, weightUnit } from '../lib/units';
import { useAuth } from '../state/auth';
import { useData, useProfile } from '../state/data';
import { useTheme } from '../state/theme';
import { useToast } from '../state/toast';

export function Profile() {
  const saved = useProfile();
  const { user } = useAuth();
  const { saveProfile, entries, weights, deleteAllData } = useData();
  const { pref, setPref } = useTheme();
  const install = useInstall();
  const toast = useToast();
  const [p, setP] = useState<ProfileT>(saved);
  const [target, setTarget] = useState(saved.targetWeightKg ? String(displayWeight(saved.targetWeightKg, saved.units)) : '');
  const [newHabit, setNewHabit] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setP(saved), [saved]);

  const set = <K extends keyof ProfileT>(k: K, v: ProfileT[K]) => setP((x) => ({ ...x, [k]: v }));
  const has = (g: GoalId) => p.goals.includes(g);
  const toggleGoal = (g: GoalId) => set('goals', has(g) ? p.goals.filter((x) => x !== g) : [...p.goals, g]);
  const unit = weightUnit(p.units);

  const targetKg = target.trim() ? inputToKg(Number(target.replace(',', '.')), p.units) : null;
  const targetError = targetKg != null && (!Number.isFinite(targetKg) || targetKg < 30 || targetKg > 350) ? 'That goal looks off.' : undefined;
  const next: ProfileT = { ...p, targetWeightKg: targetKg != null && Number.isFinite(targetKg) ? Math.round(targetKg * 100) / 100 : null };
  const dirty = JSON.stringify(next) !== JSON.stringify(saved);
  const valid = p.name.trim().length > 0 && !targetError && (p.goals.length > 0 || p.customHabits.length > 0);

  const changeUnits = (u: ProfileT['units']) => {
    if (u === p.units) return;
    if (targetKg != null && Number.isFinite(targetKg)) setTarget(String(displayWeight(targetKg, u)));
    set('units', u);
  };

  const addHabit = () => {
    const label = newHabit.trim();
    if (!label) return;
    if (p.customHabits.length >= 8) return toast.error('You can have up to 8 of your own habits.');
    set('customHabits', [...p.customHabits, { id: crypto.randomUUID().slice(0, 8), label: label.slice(0, 60) }]);
    setNewHabit('');
  };

  async function save() {
    setBusy(true);
    try {
      await saveProfile({ ...next, name: next.name.trim(), why: next.why.trim() });
      toast.show('Changes saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: saved, entries: Object.values(entries), weights }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `thrive-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function wipe() {
    try {
      await deleteAllData();
      toast.show('All your data was deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete.');
    }
  }

  return (
    <div className="fade-in">
      <PageHeader title="Profile" sub={user?.email} />
      <div className="flex flex-col gap-5 px-5">
        <section>
          <SectionTitle>About you</SectionTitle>
          <Card className="flex flex-col gap-4">
            <Field label="Name" value={p.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-muted">Units</span>
              <Segmented label="Units" value={p.units} onChange={changeUnits} options={[{ value: 'metric', label: 'kg · cm' }, { value: 'imperial', label: 'lb · ft' }]} />
            </div>
            {has('weight') && (
              <Field label="Goal weight" type="number" inputMode="decimal" step="0.1" suffix={unit} value={target} onChange={(e) => setTarget(e.target.value)} error={targetError} />
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="why-edit" className="text-[13px] font-bold text-muted">
                Your why
              </label>
              <textarea
                id="why-edit"
                rows={2}
                maxLength={200}
                value={p.why}
                onChange={(e) => set('why', e.target.value)}
                className="rounded-[14px] border-[1.5px] border-line bg-field px-3.5 py-3 text-[15px] font-semibold outline-none focus:border-primary"
              />
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle>Goals</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g.id} on={has(g.id)} onClick={() => toggleGoal(g.id)}>
                {g.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Your habits</SectionTitle>
          <Card className="flex flex-col gap-2">
            {p.customHabits.length === 0 && <p className="text-sm font-medium text-muted">Add habits of your own. They show up in your daily plan.</p>}
            {p.customHabits.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-2xl bg-field px-4 py-2">
                <span className="text-[15px] font-semibold">{h.label}</span>
                <button type="button" aria-label={`Remove ${h.label}`} onClick={() => set('customHabits', p.customHabits.filter((x) => x.id !== h.id))} className="flex h-9 w-9 items-center justify-center rounded-full text-muted">
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
                placeholder="e.g. Read 10 pages"
                className="h-12 flex-1 rounded-[14px] border-[1.5px] border-line bg-field px-3.5 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted/70 focus:border-primary"
              />
              <button type="submit" aria-label="Add habit" className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft text-primary-ink">
                <IconPlus size={22} />
              </button>
            </form>
          </Card>
        </section>

        {(has('smoke') || has('alcohol') || has('sleep') || has('energy')) && (
          <section>
            <SectionTitle>Plan settings</SectionTitle>
            <Card className="flex flex-col gap-4">
              {has('smoke') && (
                <div role="radiogroup" aria-label="Smoking approach" className="flex flex-col gap-2">
                  <span className="text-[15px] font-extrabold">Smoking</span>
                  <OptionCard on={p.smokeMode === 'quit'} onClick={() => set('smokeMode', 'quit')} title="Quit from today" desc="No cigarettes, every day." />
                  <OptionCard on={p.smokeMode === 'taper'} onClick={() => set('smokeMode', 'taper')} title="Taper down" desc={`From ${p.cigsPerDay || 10} a day to zero.`} />
                </div>
              )}
              {has('alcohol') && (
                <div role="radiogroup" aria-label="Alcohol approach" className="flex flex-col gap-2">
                  <span className="text-[15px] font-extrabold">Alcohol</span>
                  <OptionCard on={p.alcoholMode === 'quit'} onClick={() => set('alcoholMode', 'quit')} title="Quit from today" desc="Every day alcohol-free." />
                  <OptionCard on={p.alcoholMode === 'taper'} onClick={() => set('alcoholMode', 'taper')} title="Taper down" desc={`From ${p.drinksPerWeek || 10} a week to zero.`} />
                </div>
              )}
              {((has('smoke') && p.smokeMode === 'taper') || (has('alcohol') && p.alcoholMode === 'taper')) && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-muted">Taper pace</span>
                  <Segmented label="Taper pace" value={p.pace} onChange={(v) => set('pace', v)} options={[{ value: 'gentle', label: 'Gentle' }, { value: 'steady', label: 'Steady' }, { value: 'aggressive', label: 'Fast' }]} />
                </div>
              )}
              {(has('sleep') || has('energy')) && <Field label="Target bedtime" type="time" value={p.bedtime} onChange={(e) => set('bedtime', e.target.value || '23:00')} />}
            </Card>
          </section>
        )}

        {dirty && (
          <div className="sticky z-20" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}>
            <Button block className="h-14" onClick={save} loading={busy} disabled={!valid}>
              Save changes
            </Button>
          </div>
        )}

        <section>
          <SectionTitle>App</SectionTitle>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-muted">Appearance</span>
              <Segmented<ThemePref> label="Appearance" value={pref} onChange={setPref} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </div>
            {!install.installed && install.canPrompt && (
              <Button variant="secondary" block onClick={() => void install.prompt()}>
                <IconDownload size={20} /> Install Thrive on this device
              </Button>
            )}
            {!install.installed && !install.canPrompt && install.ios && (
              <p className="rounded-2xl bg-primary-soft px-4 py-3 text-[13px] font-semibold text-primary-ink">
                To install on iPhone: tap the Share button in Safari, then “Add to Home Screen”.
              </p>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>Your data</SectionTitle>
          <Card className="flex flex-col gap-3">
            <Button variant="secondary" block onClick={exportData}>
              <IconDownload size={20} /> Export my data
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => {
                // Next sign-in should start on Today, not on this screen.
                history.replaceState(null, '', '#/');
                void backend.signOut();
              }}
            >
              Sign out
            </Button>
            <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
              <IconTrash size={20} /> Delete all my data
            </Button>
          </Card>
        </section>
        <p className="pb-4 text-center text-xs font-medium text-muted">Thrive v{__APP_VERSION__}</p>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete all your data?">
        <p className="mb-5 text-[15px] font-medium text-muted">
          This permanently removes your profile, every daily log and all weigh-ins. You will start again from onboarding. This cannot be undone.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" block onClick={() => void wipe()}>
            Yes, delete everything
          </Button>
          <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
