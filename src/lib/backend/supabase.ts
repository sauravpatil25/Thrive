import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { CustomHabit, DailyEntry, GoalId, Pace, Profile, QuitMode, Units } from '../types';
import { BackendError, type AuthUser, type Backend } from './types';

/* Row shapes, matching supabase/migrations/0001_init.sql */
interface ProfileRow {
  id: string;
  name: string;
  units: Units;
  height_cm: number | null;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  cigs_per_day: number;
  drinks_per_week: number;
  sleep_hours: number | null;
  bedtime: string;
  goals: GoalId[];
  smoke_mode: QuitMode;
  alcohol_mode: QuitMode;
  pace: Pace;
  why: string;
  custom_habits: CustomHabit[];
  start_date: string;
  onboarded: boolean;
}

interface EntryRow {
  user_id: string;
  date: string;
  completed: string[];
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  cigarettes: number | null;
  drinks: number | null;
  note: string;
  logged: boolean;
}

interface WeightRow {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
}

const num = (v: unknown) => (v == null ? null : Number(v));

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  name: r.name,
  units: r.units,
  heightCm: num(r.height_cm),
  startWeightKg: num(r.start_weight_kg),
  targetWeightKg: num(r.target_weight_kg),
  cigsPerDay: r.cigs_per_day,
  drinksPerWeek: r.drinks_per_week,
  sleepHours: num(r.sleep_hours),
  bedtime: r.bedtime.slice(0, 5),
  goals: r.goals,
  smokeMode: r.smoke_mode,
  alcoholMode: r.alcohol_mode,
  pace: r.pace,
  why: r.why,
  customHabits: r.custom_habits ?? [],
  startDate: r.start_date,
  onboarded: r.onboarded,
});

const fromProfile = (p: Profile): ProfileRow => ({
  id: p.id,
  name: p.name,
  units: p.units,
  height_cm: p.heightCm,
  start_weight_kg: p.startWeightKg,
  target_weight_kg: p.targetWeightKg,
  cigs_per_day: p.cigsPerDay,
  drinks_per_week: p.drinksPerWeek,
  sleep_hours: p.sleepHours,
  bedtime: p.bedtime,
  goals: p.goals,
  smoke_mode: p.smokeMode,
  alcohol_mode: p.alcoholMode,
  pace: p.pace,
  why: p.why,
  custom_habits: p.customHabits,
  start_date: p.startDate,
  onboarded: p.onboarded,
});

const toEntry = (r: EntryRow): DailyEntry => ({
  date: r.date,
  completed: r.completed ?? [],
  mood: r.mood,
  energy: r.energy,
  sleepHours: num(r.sleep_hours),
  cigarettes: r.cigarettes,
  drinks: r.drinks,
  note: r.note ?? '',
  logged: r.logged,
});

const toUser = (u: User | null | undefined): AuthUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);

function check<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new BackendError(friendly(res.error.message));
  return res.data as NonNullable<R['data']>;
}

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/already registered/i.test(msg)) return 'An account with this email already exists.';
  if (/failed to fetch|network/i.test(msg)) return 'You seem to be offline. Please try again when connected.';
  return msg;
}

export function createSupabaseBackend(url: string, key: string): Backend {
  const sb: SupabaseClient = createClient(url, key, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const redirectTo = `${location.origin}${import.meta.env.BASE_URL}`;

  return {
    kind: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') cb('password_recovery', toUser(session?.user));
        else if (event === 'SIGNED_OUT') cb('signed_out', null);
        else if (event === 'SIGNED_IN') cb('signed_in', toUser(session?.user));
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(email, password) {
      const data = check(await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }));
      // Supabase returns a user with no identities when the email is already taken.
      if (data.user && data.user.identities?.length === 0) throw new BackendError('An account with this email already exists.');
      return { needsConfirmation: !data.session };
    },

    async signIn(email, password) {
      const data = check(await sb.auth.signInWithPassword({ email, password }));
      return toUser(data.user)!;
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async sendPasswordReset(email) {
      check(await sb.auth.resetPasswordForEmail(email, { redirectTo }));
    },

    async updatePassword(password) {
      check(await sb.auth.updateUser({ password }));
    },

    async loadProfile(userId) {
      const res = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (res.error) throw new BackendError(friendly(res.error.message));
      return res.data ? toProfile(res.data as ProfileRow) : null;
    },

    async saveProfile(profile) {
      check(await sb.from('profiles').upsert(fromProfile(profile)));
    },

    async loadEntries(userId, fromDate) {
      const rows = check(await sb.from('daily_entries').select('*').eq('user_id', userId).gte('date', fromDate));
      return (rows as EntryRow[]).map(toEntry);
    },

    async saveEntry(userId, e) {
      const row: EntryRow = {
        user_id: userId,
        date: e.date,
        completed: e.completed,
        mood: e.mood,
        energy: e.energy,
        sleep_hours: e.sleepHours,
        cigarettes: e.cigarettes,
        drinks: e.drinks,
        note: e.note,
        logged: e.logged,
      };
      check(await sb.from('daily_entries').upsert(row, { onConflict: 'user_id,date' }));
    },

    async loadWeights(userId) {
      const rows = check(await sb.from('weight_entries').select('id,user_id,date,weight_kg').eq('user_id', userId));
      return (rows as WeightRow[]).map((r) => ({ id: r.id, date: r.date, weightKg: Number(r.weight_kg) }));
    },

    async addWeight(userId, w) {
      check(await sb.from('weight_entries').insert({ id: w.id, user_id: userId, date: w.date, weight_kg: w.weightKg }));
    },

    async deleteWeight(userId, id) {
      check(await sb.from('weight_entries').delete().eq('user_id', userId).eq('id', id));
    },

    async deleteAllData(userId) {
      check(await sb.from('weight_entries').delete().eq('user_id', userId));
      check(await sb.from('daily_entries').delete().eq('user_id', userId));
      check(await sb.from('profiles').delete().eq('id', userId));
    },
  };
}
