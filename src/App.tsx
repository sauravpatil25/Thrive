import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Spinner } from './components/ui';
import { configError } from './lib/backend';
import { AuthPage, NewPasswordPage } from './pages/AuthPage';
import { Log } from './pages/Log';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { Today } from './pages/Today';
import { AuthProvider, useAuth } from './state/auth';
import { DataProvider, useData } from './state/data';
import { ThemeProvider } from './state/theme';
import { ToastProvider } from './state/toast';

// Charts are the heaviest dependency, so the Progress screen loads on demand.
const Progress = lazy(() => import('./pages/Progress').then((m) => ({ default: m.Progress })));

function Gate() {
  const { user, ready, recovering, doneRecovering } = useAuth();
  if (!ready) return <Spinner />;
  if (recovering && user) return <NewPasswordPage onDone={doneRecovering} />;
  if (!user) return <AuthPage />;
  return (
    <DataProvider key={user.id} userId={user.id}>
      <SignedIn />
    </DataProvider>
  );
}

function SignedIn() {
  const { profile, loading } = useData();
  if (loading && !profile) return <Spinner label="Loading your plan" />;
  if (!profile?.onboarded) return <Onboarding />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Today />} />
          <Route path="log" element={<Log />} />
          <Route path="progress" element={<Suspense fallback={<Spinner />}><Progress /></Suspense>} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  if (configError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-6">
        <p className="rounded-2xl bg-coral-soft p-5 text-sm font-semibold text-coral-ink">{configError}</p>
      </div>
    );
  }
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
