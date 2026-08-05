'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

import { exportBackupToXLS, importBackupFromXLS } from '@/lib/backupManager';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const { lang, setLang, t } = useLanguage();

  const handleExport = () => {
    const ok = exportBackupToXLS();
    if (ok) {
      setToast({ msg: t('backup_success') });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await importBackupFromXLS(file);
    if (ok) {
      setToast({ msg: t('recover_success') });
    } else {
      setToast({ msg: t('recover_error'), isError: true });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const navItems = [
    { href: '/', label: t('nav_dashboard'), icon: DashboardIcon },
    { href: '/customers', label: t('nav_customers'), icon: CustomersIcon },
    { href: '/vehicles', label: t('nav_vehicles'), icon: VehiclesIcon },
    { href: '/parts', label: t('nav_parts'), icon: PartsIcon },
    { href: '/work-orders', label: t('nav_work_orders'), icon: WorkOrdersIcon },
    { href: '/lifts', label: t('nav_lifts'), icon: LiftsIcon },
    { href: '/calendar', label: t('nav_calendar'), icon: CalendarIcon },
    { href: '/invoices', label: t('nav_invoices'), icon: InvoicesIcon },
  ];

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] animate-bounce">
          <div className={`px-4 py-3 rounded-xl border shadow-2xl font-bold text-xs flex items-center gap-2 backdrop-blur-xl ${
            toast.isError
              ? 'bg-rose-950/90 border-rose-600 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}>
            <span>{toast.isError ? '❌' : '✅'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-neutral-900/90 border border-neutral-700 text-white shadow-xl backdrop-blur-xl"
        aria-label="Open menu"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-neutral-950/95 backdrop-blur-2xl border-r border-neutral-800
          transition-all duration-300 ease-in-out shadow-2xl
          ${collapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        {/* Logo-Driven Pure Grayscale Header */}
        <div className="flex items-center gap-3 px-4 h-24 border-b border-neutral-800 shrink-0 bg-gradient-to-b from-neutral-900 to-neutral-950">
          <div className="w-14 h-14 shrink-0 flex items-center justify-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo_transp.png"
              alt="GEARSHIFT AUTOMOTIVE"
              className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-xs font-black tracking-widest text-white uppercase whitespace-nowrap">GEARSHIFT</h1>
              <p className="text-[10px] font-black text-neutral-300 tracking-wider uppercase whitespace-nowrap">AUTOMOTIVE</p>
              <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700">
                <p className="text-[7.5px] text-neutral-300 font-mono font-bold tracking-tighter whitespace-nowrap">EST. 2023 | SERVICE | REPAIR</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold
                  transition-all duration-200 relative overflow-hidden
                  ${isActive
                    ? 'bg-neutral-800 text-white border border-neutral-600 shadow-md shadow-black/50'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-white rounded-r-full shadow-lg shadow-white/50" />
                )}
                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`} />
                {!collapsed && <span className="whitespace-nowrap tracking-wide">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Backup & Recovery XLS Actions */}
        <div className="p-3 border-t border-neutral-800 shrink-0 bg-neutral-950/80">
          {collapsed ? (
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={handleExport}
                className="w-10 h-10 rounded-xl bg-neutral-900 hover:bg-emerald-950/60 border border-neutral-700 hover:border-emerald-500 text-emerald-400 flex items-center justify-center transition-all"
                title={t('btn_backup_xls')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <label
                className="w-10 h-10 rounded-xl bg-neutral-900 hover:bg-sky-950/60 border border-neutral-700 hover:border-sky-500 text-sky-400 flex items-center justify-center cursor-pointer transition-all"
                title={t('btn_recover_xls')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500/50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md group"
                title={t('btn_backup_xls')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 group-hover:scale-110 transition-transform">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="whitespace-nowrap">{t('btn_backup_xls')}</span>
              </button>

              <label
                className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-sky-500/50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md group"
                title={t('btn_recover_xls')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400 group-hover:scale-110 transition-transform">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="whitespace-nowrap">{t('btn_recover_xls')}</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <div className="p-3.5 border-t border-neutral-800 shrink-0 bg-neutral-950">
          <div className={`flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 ${collapsed ? 'flex-col' : ''}`}>
            <button
              onClick={() => setLang('pt')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                lang === 'pt'
                  ? 'bg-white text-black shadow-md font-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Português (Portugal)"
            >
              <span>🇵🇹</span>
              {!collapsed && <span>PT</span>}
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                lang === 'en'
                  ? 'bg-white text-black shadow-md font-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="English"
            >
              <span>🇬🇧</span>
              {!collapsed && <span>EN</span>}
            </button>
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-12 border-t border-neutral-800 text-neutral-400 hover:text-white transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      {/* Spacer */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`} />
    </>
  );
}

// ── Icons ──
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
    </svg>
  );
}

function CustomersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function VehiclesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17l-1 2h16l-1-2" />
      <circle cx="7.5" cy="13" r="1.5" />
      <circle cx="16.5" cy="13" r="1.5" />
    </svg>
  );
}

function PartsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function WorkOrdersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function InvoicesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function LiftsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
      <path d="M7 12V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8" />
      <line x1="2" y1="21" x2="22" y2="21" />
      <circle cx="9" cy="8" r="1" />
      <circle cx="15" cy="8" r="1" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
