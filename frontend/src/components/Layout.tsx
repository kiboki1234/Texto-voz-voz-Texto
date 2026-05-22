import { Activity, BarChart3, Building2, FlaskConical, Leaf } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/cientifico', label: 'Científico', icon: FlaskConical },
  { to: '/gad', label: 'GAD', icon: Building2 },
  { to: '/agricultor', label: 'Agricultor', icon: Leaf },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-[#f6f7f4] text-ink">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 overflow-hidden rounded-md border border-slate-200 shadow-sm">
              <img src="/agrometria.jpeg" alt="Logo AgroMetrIA" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">AgroMetrIA</p>
              <p className="text-xs text-slate-500">Dashboard Meteorológico UPEC</p>
            </div>
          </NavLink>
          <nav className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'focus-ring flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-4 text-xs text-slate-500">
          <BarChart3 size={15} />
          Fuente: SQL Server Insights en modo solo lectura.
        </div>
      </footer>
    </div>
  );
}
