import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';

export * from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const localMode = import.meta.env.MODE === 'demo';

/**
 * Set when a production build has no Supabase settings. The app shows this
 * instead of silently storing data on the device.
 */
export const configError: string | null =
  !localMode && import.meta.env.PROD && !(url && key)
    ? 'Thrive is missing its Supabase settings (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY).'
    : null;

/** `vite --mode demo` (and dev without settings) uses the on-device backend; everything else uses Supabase. */
export const backend: Backend = !localMode && url && key ? createSupabaseBackend(url, key) : createLocalBackend();
