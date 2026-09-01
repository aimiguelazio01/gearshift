'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';
import { customers, vehicles, parts, workOrders, invoices, users } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import { translatePartName } from '@/lib/translations';
import type { Customer, Vehicle, WorkOrder, Part, Invoice, User } from '@/lib/types';

export default function Dashboard() {
  const { t, lang, formatCurrency, formatDate } = useLanguage();
  const [data, setData] = useState<{
    customers: Customer[];
    vehicles: Vehicle[];
    workOrderList: WorkOrder[];
    partsList: Part[];
    invoiceList: Invoice[];
    usersList: User[];
    lowStock: Part[];
  } | null>(null);

  useEffect(() => {
    const c = customers.getAll();
    const v = vehicles.getAll();
    const wo = workOrders.getAll();
    const p = parts.getAll();
    const inv = invoices.getAll();
    const u = users.getAll();
    const ls = parts.getLowStock();
    setData({ customers: c, vehicles: v, workOrderList: wo, partsList: p, invoiceList: inv, usersList: u, lowStock: ls });
  }, []);

  if (!data) return null;

  const activeWOs = data.workOrderList.filter(wo => !['Invoiced', 'Closed'].includes(wo.status));
  const pendingInvoices = data.invoiceList.filter(inv => inv.status !== 'Paid');
  const totalRevenue = data.invoiceList.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0);
  const overdueInvoices = invoices.getOverdue();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* GEARSHIFT AUTOMOTIVE Hero Header */}
      <div className="card p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 z-10">
          <div className="w-20 h-20 shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo_transp.png" alt="GEARSHIFT AUTOMOTIVE" className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(255,255,255,0.25)]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-widest uppercase font-montserrat">GEARSHIFT AUTOMOTIVE</h1>
              <span className="badge-chrome text-[10px] px-2.5 py-1 rounded-md">EST. 2023</span>
            </div>
            <p className="text-xs text-neutral-300 font-black uppercase tracking-widest mt-1">SERVICE | REPAIR | DIAGNOSTICS</p>
            <p className="text-xs text-slate-400 mt-1">{t('dash_subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap">
          <Link href="/work-orders" className="btn-primary text-xs py-3 px-4 shadow-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t('wo_add_button')}</span>
          </Link>

          <Link
            href="/calendar"
            className="group px-4 py-3 rounded-xl bg-gradient-to-r from-neutral-800 via-neutral-900 to-black hover:from-neutral-700 hover:to-neutral-800 border border-neutral-600/80 text-white font-bold text-xs flex items-center gap-2.5 shadow-xl shadow-black/40 hover:border-neutral-400 active:scale-95 transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-700 flex items-center justify-center shrink-0 group-hover:border-white transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="tracking-wide">{t('cal_title')}</span>
            <span className="text-[10px] text-neutral-400 font-mono group-hover:text-white transition-colors">↗</span>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title={t('dash_kpi_active_wo')}
          value={activeWOs.length}
          subtitle={`${data.workOrderList.length} ${t('dash_kpi_total_wo')}`}
          color="blue"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          }
        />
        <KPICard
          title={t('dash_kpi_low_stock')}
          value={data.lowStock.length}
          subtitle={`${data.partsList.length} ${t('dash_kpi_parts_catalog')}`}
          color={data.lowStock.length > 0 ? 'red' : 'emerald'}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          }
        />
        <KPICard
          title={t('dash_kpi_pending_invoices')}
          value={pendingInvoices.length}
          subtitle={overdueInvoices.length > 0 ? `${overdueInvoices.length} ${t('dash_kpi_overdue')}` : t('dash_kpi_all_current')}
          color="amber"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <KPICard
          title={t('dash_kpi_revenue')}
          value={formatCurrency(totalRevenue)}
          subtitle={t('dash_kpi_from_paid')}
          color="emerald"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Work Orders */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">{t('dash_active_wo_title')}</h2>
            <Link href="/work-orders" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              {t('view_all')}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('inv_vehicle')}</th>
                  <th>{t('inv_customer')}</th>
                  <th>{t('inv_status')}</th>
                  <th>{t('wo_technician')}</th>
                  <th>{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {activeWOs.slice(0, 5).map((wo) => {
                  const vehicle = vehicles.getById(wo.vehicle_id);
                  const customer = customers.getById(wo.customer_id);
                  const tech = users.getById(wo.assigned_technician_id);
                  return (
                    <tr key={wo.id}>
                      <td>
                        <Link href={`/work-orders/${wo.id}`} className="font-medium text-[var(--foreground)] hover:text-blue-400 transition-colors">
                          {vehicle ? `${vehicle.make} ${vehicle.model}` : t('unknown')}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">{vehicle?.plate}</div>
                      </td>
                      <td className="text-sm text-[var(--muted)]">{customer?.name || t('unknown')}</td>
                      <td><StatusBadge status={wo.status} size="sm" /></td>
                      <td className="text-sm text-[var(--muted)]">{tech?.name || '—'}</td>
                      <td className="text-sm text-[var(--muted)]">{formatDate(wo.created_at)}</td>
                    </tr>
                  );
                })}
                {activeWOs.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-[var(--muted)] py-8">{t('dash_no_active_wo')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar Cards */}
        <div className="space-y-6">
          {/* Low Stock */}
          <div className="card">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{t('dash_low_stock_title')}</h2>
              <Link href="/parts" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {t('manage')}
              </Link>
            </div>
            <div className="p-3 space-y-1">
              {data.lowStock.slice(0, 5).map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--hover)] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{translatePartName(part.name, lang)}</p>
                    <p className="text-xs text-[var(--muted)]">{part.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${part.qty_on_hand === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {part.qty_on_hand}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">min: {part.reorder_threshold}</p>
                  </div>
                </div>
              ))}
              {data.lowStock.length === 0 && (
                <p className="text-center text-[var(--muted)] py-6 text-sm">{t('dash_all_stock_ok')}</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">{t('dash_quick_stats')}</h2>
            <div className="space-y-3">
              <Link href="/customers" className="flex justify-between items-center hover:text-blue-400 transition-colors">
                <span className="text-sm text-[var(--muted)]">{t('dash_total_customers')}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{data.customers.length}</span>
              </Link>
              <Link href="/vehicles" className="flex justify-between items-center hover:text-blue-400 transition-colors">
                <span className="text-sm text-[var(--muted)]">{t('dash_total_vehicles')}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{data.vehicles.length}</span>
              </Link>
              <Link href="/team" className="flex justify-between items-center hover:text-blue-400 transition-colors">
                <span className="text-sm text-[var(--muted)]">{t('dash_technicians')}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{data.usersList.filter(u => u.role === 'Technician').length}</span>
              </Link>
              <Link href="/parts" className="flex justify-between items-center hover:text-blue-400 transition-colors">
                <span className="text-sm text-[var(--muted)]">{t('dash_parts_in_catalog')}</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">{data.partsList.length}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
