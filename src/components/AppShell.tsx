import { NavLink, Outlet } from 'react-router-dom';
import { useData } from '../state/data';
import { IconChart, IconCloudOff, IconHome, IconPen, IconUser } from './icons';

const tabs = [
  { to: '/', label: 'Today', Icon: IconHome, end: true },
  { to: '/log', label: 'Log', Icon: IconPen },
  { to: '/progress', label: 'Progress', Icon: IconChart },
  { to: '/profile', label: 'Profile', Icon: IconUser },
];

export function AppShell() {
  const { offline } = useData();
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      {offline && (
        <div className="pt-safe flex items-center justify-center gap-2 bg-amber-soft px-4 py-2 text-[13px] font-semibold text-amber-ink">
          <IconCloudOff size={16} /> Offline. Showing your last synced data.
        </div>
      )}
      <main className="pb-tabbar">
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-4">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11.5px] transition ${
                  isActive ? 'font-bold text-primary-ink' : 'font-semibold text-muted'
                }`
              }
            >
              <Icon size={24} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="pt-safe flex items-center justify-between px-5 pb-4 pt-7">
      <div className="flex flex-col gap-0.5">
        {sub && <span className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{sub}</span>}
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}
