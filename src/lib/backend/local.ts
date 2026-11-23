import type { DailyEntry, Profile, WeightEntry } from '../types';
import { BackendError, type AuthEvent, type AuthUser, type Backend } from './types';

/**
 * Browser-only backend for development and automated tests. Data lives in
 * localStorage and never leaves the device. Not used in production builds.
 */
interface Store {
  users: Record<string, { id: string; email: string; passwordHash: string }>;
  session: string | null;
  profiles: Record<string, Profile>;
  entries: Record<string, Record<string, DailyEntry>>;
  weights: Record<string, WeightEntry[]>;
}

const KEY = 'thrive-local-backend';

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* fall through */
  }
  return { users: {}, session: null, profiles: {}, entries: {}, weights: {} };
}

function write(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

async function hash(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`thrive:${pw}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const delay = () => new Promise((r) => setTimeout(r, 30));

export function createLocalBackend(): Backend {
  const listeners = new Set<(e: AuthEvent, u: AuthUser | null) => void>();
  const emit = (e: AuthEvent, u: AuthUser | null) => listeners.forEach((l) => l(e, u));
  const userOf = (s: Store, id: string | null): AuthUser | null => {
    if (!id) return null;
    const u = Object.values(s.users).find((x) => x.id === id);
    return u ? { id: u.id, email: u.email } : null;
  };

  return {
    kind: 'local',

    async getUser() {
      const s = read();
      return userOf(s, s.session);
    },

    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signUp(email, password) {
      await delay();
      const s = read();
      const key = email.trim().toLowerCase();
      if (s.users[key]) throw new BackendError('An account with this email already exists.');
      const id = crypto.randomUUID();
      s.users[key] = { id, email: key, passwordHash: await hash(password) };
      s.session = id;
      write(s);
      emit('signed_in', { id, email: key });
      return { needsConfirmation: false };
    },

    async signIn(email, password) {
      await delay();
      const s = read();
      const u = s.users[email.trim().toLowerCase()];
      if (!u || u.passwordHash !== (await hash(password))) throw new BackendError('Incorrect email or password.');
      s.session = u.id;
      write(s);
      const user = { id: u.id, email: u.email };
      emit('signed_in', user);
      return user;
    },

    async signOut() {
      const s = read();
      s.session = null;
      write(s);
      emit('signed_out', null);
    },

    async sendPasswordReset() {
      await delay();
    },

    async updatePassword(password) {
      const s = read();
      const u = Object.values(s.users).find((x) => x.id === s.session);
      if (!u) throw new BackendError('Not signed in.');
      u.passwordHash = await hash(password);
      write(s);
    },

    async loadProfile(userId) {
      await delay();
      return read().profiles[userId] ?? null;
    },

    async saveProfile(profile) {
      const s = read();
      s.profiles[profile.id] = profile;
      write(s);
    },

    async loadEntries(userId, fromDate) {
      await delay();
      return Object.values(read().entries[userId] ?? {}).filter((e) => e.date >= fromDate);
    },

    async saveEntry(userId, entry) {
      const s = read();
      (s.entries[userId] ??= {})[entry.date] = entry;
      write(s);
    },

    async loadWeights(userId) {
      await delay();
      return read().weights[userId] ?? [];
    },

    async addWeight(userId, entry) {
      const s = read();
      (s.weights[userId] ??= []).push(entry);
      write(s);
    },

    async deleteWeight(userId, id) {
      const s = read();
      s.weights[userId] = (s.weights[userId] ?? []).filter((w) => w.id !== id);
      write(s);
    },

    async deleteAllData(userId) {
      const s = read();
      delete s.profiles[userId];
      delete s.entries[userId];
      delete s.weights[userId];
      write(s);
    },
  };
}
