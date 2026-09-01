'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { invoices, workOrders, customers, vehicles } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import type { Invoice, InvoiceStatus } from '@/lib/types';

export default function InvoicesPage() {
  const { t, lang, formatCurrency, formatDate } = useLanguage();
  const { isTechnician, currentUser, usersList, switchUser, verifyAdminPin } = useAuth();
  const [list, setList] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<'all' | InvoiceStatus | 'overdue'>('all');

  // PIN Unlock State for non-authorized users
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const reload = useCallback(() => setList(invoices.getAll()), []);
  useEffect(() => { reload(); }, [reload]);

  const overdue = invoices.getOverdue();

  const filtered = list.filter(inv => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return inv.status !== 'Paid' && new Date(inv.due_date) < new Date();
    return inv.status === filter;
  });

  const totalOutstanding = list
    .filter(inv => inv.status !== 'Paid')
    .reduce((sum, inv) => sum + (inv.total - inv.paid_amount), 0);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pinInput)) {
      setPinError(false);
      setPinInput('');
      const admin = usersList.find(u => u.role === 'Admin');
      if (admin) switchUser(admin.id);
    } else {
      setPinError(true);
    }
  };

  // ── Restricted Access Screen for Technicians ──
  if (isTechnician) {
    const adminUser = usersList.find(u => u.role === 'Admin');
    const advisorUser = usersList.find(u => u.role === 'Service Advisor');

    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6 border-indigo-500/30 shadow-2xl shadow-indigo-500/5">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
            💳
          </div>

          <div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              {lang === 'pt' ? 'Acesso Restrito' : 'Restricted Access'}
            </span>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-3">
              {lang === 'pt' ? 'Faturação & Pagamentos' : 'Invoices & Payments'}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
              {lang === 'pt'
                ? 'Os mecânicos e técnicos não têm acesso à área financeira e faturas. Esta secção é de uso exclusivo da Administração e Receção/Consultores de Serviço.'
                : 'Technicians do not have access to billing and invoices. This section is restricted to Administration and Service Advisors.'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-xs flex items-center justify-between">
            <span className="text-[var(--muted)]">{lang === 'pt' ? 'Utilizador atual:' : 'Current user:'}</span>
            <span className="font-semibold text-[var(--foreground)]">{currentUser?.name} ({currentUser?.role})</span>
          </div>

          <form onSubmit={handleUnlockPin} className="space-y-3 pt-2 text-left">
            <div>
              <label className="form-label text-xs">
                {lang === 'pt' ? 'Introduza o PIN de Administrador (Padrão: 1234)' : 'Enter Admin PIN (Default: 1234)'}
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(false); }}
                placeholder="••••"
                className="w-full text-center font-mono text-lg tracking-widest"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-400 mt-1 text-center font-semibold">
                  {lang === 'pt' ? '❌ PIN incorreto.' : '❌ Incorrect PIN.'}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white shadow-lg shadow-indigo-600/20"
            >
              {lang === 'pt' ? 'Desbloquear Acesso' : 'Unlock Access'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
            {advisorUser && (
              <button
                type="button"
                onClick={() => switchUser(advisorUser.id)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold block w-full text-center"
              >
                {lang === 'pt' ? `📋 Entrar como ${advisorUser.name} (Consultor) →` : `📋 Switch to ${advisorUser.name} →`}
              </button>
            )}
            {adminUser && (
              <button
                type="button"
                onClick={() => switchUser(adminUser.id)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold block w-full text-center"
              >
                {lang === 'pt' ? `👑 Entrar como ${adminUser.name} (Admin) →` : `👑 Switch to ${adminUser.name} →`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('inv_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {list.length} {t('inv_title').toLowerCase()} • {t('inv_outstanding')}: <span className="text-[var(--foreground)] font-semibold">{formatCurrency(totalOutstanding)}</span>
            {overdue.length > 0 && (
              <span className="text-red-400 font-medium ml-2">• {overdue.length} {t('inv_overdue_alert')}</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('all')}
        </button>
        <button
          onClick={() => setFilter('Unpaid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'Unpaid' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_unpaid')}
        </button>
        <button
          onClick={() => setFilter('Partial')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'Partial' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_partial')}
        </button>
        <button
          onClick={() => setFilter('Paid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'Paid' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_paid')}
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'overdue' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_overdue')} ({overdue.length})
        </button>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('inv_number')}</th>
              <th>{t('inv_customer')}</th>
              <th>{t('inv_vehicle')}</th>
              <th>{t('inv_status')}</th>
              <th className="text-right">{t('inv_total')}</th>
              <th className="text-right">{t('inv_paid')}</th>
              <th className="text-right">{t('inv_balance')}</th>
              <th>{t('inv_due_date')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const wo = workOrders.getById(inv.work_order_id);
              const customer = wo ? customers.getById(wo.customer_id) : null;
              const vehicle = wo ? vehicles.getById(wo.vehicle_id) : null;
              const isOverdue = inv.status !== 'Paid' && new Date(inv.due_date) < new Date();
              const balance = inv.total - inv.paid_amount;

              return (
                <tr key={inv.id} className={isOverdue ? 'bg-red-500/5' : ''}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-[var(--foreground)] hover:text-blue-400 transition-colors font-mono text-xs">
                      FAT-{inv.id.slice(0, 6).toUpperCase()}
                    </Link>
                    <div className="text-[10px] text-[var(--muted)]">{formatDate(inv.created_at)}</div>
                  </td>
                  <td className="text-sm text-[var(--muted)]">{customer?.name || '—'}</td>
                  <td className="text-sm text-[var(--muted)]">
                    {vehicle ? `${vehicle.make} ${vehicle.model}` : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inv.status} type="invoice" size="sm" />
                      {isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold uppercase">
                          {t('invoice_overdue')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right text-sm font-medium">{formatCurrency(inv.total)}</td>
                  <td className="text-right text-sm text-emerald-400">{formatCurrency(inv.paid_amount)}</td>
                  <td className={`text-right text-sm font-bold ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatCurrency(balance)}
                  </td>
                  <td className={`text-sm ${isOverdue ? 'text-red-400 font-semibold' : 'text-[var(--muted)]'}`}>
                    {formatDate(inv.due_date)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-[var(--muted)]">{t('inv_no_found')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
