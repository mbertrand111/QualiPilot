import { useLocation, Link } from 'react-router-dom';
import type { ReactNode } from 'react';

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TriageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/',           icon: HomeIcon,    label: 'Tableau de bord', exact: true },
  { path: '/triage',     icon: TriageIcon,  label: 'Bugs à trier',     exact: false },
  { path: '/conformity', icon: AlertIcon,   label: 'Anomalies',        exact: false },
  { path: '/kpis',       icon: ChartIcon,   label: 'KPIs',             exact: false },
  { path: '/history',    icon: ClockIcon,   label: 'Historique',       exact: false },
  { path: '/settings',   icon: CogIcon,     label: 'Paramètres',       exact: false },
];

// ─── Layout ──────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export function Layout({ children, title, actions }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#f7f8fc] overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-[#0b1e45] sidebar-texture flex flex-col shrink-0 shadow-2xl z-10">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <img src="/logo-dark.png" alt="QualiPilot" className="h-10 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Navigation</span>
          </div>

          {NAV_ITEMS.map(({ path, icon: Icon, label, exact }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname === path || location.pathname.startsWith(path + '/');

            return (
              <Link
                key={path}
                to={path}
                className={[
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium group',
                  active
                    ? 'bg-[#1E63B6] text-white shadow-md shadow-[#0F3E8A]/60'
                    : 'text-white/50 hover:bg-white/[0.07] hover:text-white',
                ].join(' ')}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#66D2DB]' : 'text-white/40 group-hover:text-white/80'}`} />
                <span className="truncate">{label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#66D2DB] shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sync status footer */}
        <div className="px-5 py-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#66D2DB] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#66D2DB]"></span>
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-white/40 font-medium">Dernière sync</div>
              <div className="text-[11px] text-white/50 font-mono truncate">23/03/2026 — 09:30</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Page header */}
        {(title || actions) && (
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100/80 px-8 py-4 flex items-center justify-between shrink-0">
            <h1 className="text-[21px] font-bold text-[#0F3E8A] tracking-tight">{title}</h1>
            {actions && (
              <div className="flex items-center gap-3">{actions}</div>
            )}
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto bg-[#f7f8fc] p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
