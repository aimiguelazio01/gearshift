'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { invoices, workOrders, customers, vehicles } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import type { Invoice, InvoiceStatus } from '@/lib/types';

export default function InvoicesPage() {
  const { t, formatCurrency, formatDate } = useLanguage();
  const [list, setList] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<'all' | InvoiceStatus | 'overdue'>('all');

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('inv_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {list.length} faturas • {t('inv_outstanding')}: {formatCurrency(totalOutstanding)}
            {overdue.length > 0 && (
              <span className="text-red-400 ml-2">• {overdue.length} {t('inv_overdue_alert')}</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-500/15 text-blue-400' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('all')}
        </button>
        <button
          onClick={() => setFilter('Unpaid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'Unpaid' ? 'bg-blue-500/15 text-blue-400' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_Unpaid')}
        </button>
        <button
          onClick={() => setFilter('Partial')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'Partial' ? 'bg-blue-500/15 text-blue-400' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_Partial')}
        </button>
        <button
          onClick={() => setFilter('Paid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'Paid' ? 'bg-blue-500/15 text-blue-400' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
          }`}
        >
          {t('invoice_Paid')}
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'overdue' ? 'bg-blue-500/15 text-blue-400' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                          EM ATRASO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right text-sm font-medium">{formatCurrency(inv.total)}</td>
                  <td className="text-right text-sm text-emerald-400">{formatCurrency(inv.paid_amount)}</td>
                  <td className={`text-right text-sm font-bold ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatCurrency(balance)}
                  </td>
                  <td className={`text-sm ${isOverdue ? 'text-red-400' : 'text-[var(--muted)]'}`}>
                    {formatDate(inv.due_date)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-[var(--muted)]">Nenhuma fatura encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
