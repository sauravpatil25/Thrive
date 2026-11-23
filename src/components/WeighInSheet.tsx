import { useState, type FormEvent } from 'react';
import { inputToKg, weightUnit, displayWeight } from '../lib/units';
import { latestWeight } from '../lib/stats';
import { useData, useProfile } from '../state/data';
import { useToast } from '../state/toast';
import { Button, Field, Sheet } from './ui';

export function WeighInSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const profile = useProfile();
  const { weights, addWeight, todayISO } = useData();
  const toast = useToast();
  const last = latestWeight(profile, weights);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayISO);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unit = weightUnit(profile.units);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value.replace(',', '.'));
    const kg = inputToKg(n, profile.units);
    if (!value || !Number.isFinite(n) || kg < 20 || kg > 400) return setError(`Enter your weight in ${unit}.`);
    if (date > todayISO) return setError('The date cannot be in the future.');
    setBusy(true);
    try {
      await addWeight(kg, date);
      toast.show('Weight saved');
      setValue('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log your weight">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Weight"
          type="number"
          inputMode="decimal"
          step="0.1"
          suffix={unit}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={last ? String(displayWeight(last.kg, profile.units)) : ''}
          hint={last ? `Last: ${displayWeight(last.kg, profile.units)} ${unit}` : 'Same time of day each time works best.'}
          error={error ?? undefined}
        />
        <Field label="Date" type="date" max={todayISO} value={date} onChange={(e) => setDate(e.target.value)} />
        <Button type="submit" block loading={busy}>
          Save weight
        </Button>
      </form>
    </Sheet>
  );
}
