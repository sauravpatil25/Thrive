import type { DailyEntry, Profile, WeightEntry } from '../types';

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthEvent = 'signed_in' | 'signed_out' | 'password_recovery';

export interface SignUpResult {
  /** True when the user must confirm their email before signing in. */
  needsConfirmation: boolean;
}

/** Everything the app needs from a backend. Implemented by Supabase (prod) and a local store (dev/tests). */
export interface Backend {
  readonly kind: 'supabase' | 'local';

  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (event: AuthEvent, user: AuthUser | null) => void): () => void;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  loadProfile(userId: string): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;

  loadEntries(userId: string, fromDate: string): Promise<DailyEntry[]>;
  saveEntry(userId: string, entry: DailyEntry): Promise<void>;

  loadWeights(userId: string): Promise<WeightEntry[]>;
  addWeight(userId: string, entry: WeightEntry): Promise<void>;
  deleteWeight(userId: string, id: string): Promise<void>;

  /** Removes all of the user's health data (profile, logs, weights). */
  deleteAllData(userId: string): Promise<void>;
}

export class BackendError extends Error {}
