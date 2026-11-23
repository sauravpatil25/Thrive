import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { backend, type AuthUser } from '../lib/backend';

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  /** True after the user opens a password-reset link; the app asks for a new password. */
  recovering: boolean;
  doneRecovering(): void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let alive = true;
    backend
      .getUser()
      .then((u) => alive && setUser(u))
      .finally(() => alive && setReady(true));
    const off = backend.onAuthChange((event, u) => {
      if (event === 'password_recovery') setRecovering(true);
      setUser(event === 'signed_out' ? null : u);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <Ctx.Provider value={{ user, ready, recovering, doneRecovering: () => setRecovering(false) }}>{children}</Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
