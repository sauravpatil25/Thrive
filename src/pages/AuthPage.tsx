import { useState, type FormEvent } from 'react';
import { IconLeaf } from '../components/icons';
import { Button, Field } from '../components/ui';
import { backend } from '../lib/backend';
import { useToast } from '../state/toast';

type Mode = 'signin' | 'signup' | 'reset';

const MIN_PASSWORD = 8;
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function AuthPage() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailOk(email)) return setError('Please enter a valid email address.');
    if (mode !== 'reset' && password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await backend.signUp(email.trim(), password);
        if (r.needsConfirmation) {
          setNotice(`We sent a confirmation link to ${email.trim()}. Open it on this device, then sign in.`);
          setMode('signin');
        }
      } else if (mode === 'signin') {
        await backend.signIn(email.trim(), password);
      } else {
        await backend.sendPasswordReset(email.trim());
        setNotice('If an account exists for that email, a reset link is on its way.');
        toast.show('Reset email sent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-14">
      <div className="mb-10 flex flex-col items-start gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-card">
          <IconLeaf size={30} />
        </span>
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">
            {mode === 'signup' ? 'Become your healthiest self.' : mode === 'signin' ? 'Welcome back.' : 'Reset password'}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-muted">
            {mode === 'reset'
              ? 'Enter your email and we will send you a link to choose a new password.'
              : 'Small daily steps, one tick at a time.'}
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        {mode !== 'reset' && (
          <Field
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={mode === 'signup' ? `At least ${MIN_PASSWORD} characters` : undefined}
          />
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-ink">
            {notice}
          </p>
        )}

        <Button type="submit" block loading={busy} className="mt-2 h-14">
          {mode === 'signup' ? 'Create account' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm font-semibold text-muted">
        {mode === 'signup' && (
          <p>
            Already have an account?{' '}
            <button type="button" className="font-bold text-primary-ink" onClick={() => switchMode('signin')}>
              Sign in
            </button>
          </p>
        )}
        {mode === 'signin' && (
          <>
            <p>
              New here?{' '}
              <button type="button" className="font-bold text-primary-ink" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </p>
            <button type="button" className="font-bold text-primary-ink" onClick={() => switchMode('reset')}>
              Forgot password?
            </button>
          </>
        )}
        {mode === 'reset' && (
          <button type="button" className="font-bold text-primary-ink" onClick={() => switchMode('signin')}>
            Back to sign in
          </button>
        )}
      </div>

      {backend.kind === 'local' && (
        <p className="mt-auto pt-10 text-center text-xs font-medium text-muted">Local test mode: data stays in this browser.</p>
      )}
    </div>
  );
}

export function NewPasswordPage({ onDone }: { onDone(): void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    try {
      await backend.updatePassword(password);
      toast.show('Password updated');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-6 pt-16">
      <h1 className="text-[28px] font-extrabold tracking-tight">Choose a new password</h1>
      <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error ?? undefined} />
      <Button type="submit" block loading={busy}>
        Save password
      </Button>
    </form>
  );
}
