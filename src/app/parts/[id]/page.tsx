'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { parts, suppliers, stockMovements } from '@/lib/store';
import { marginPercent } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import type { Part, Supplier, StockMovement } from '@/lib/types';

export default function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, formatCurrency, formatDateTime } = useLanguage();
  const [part, setPart] = useState<Part | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const reload = useCallback(() => {
    const p = parts.getById(id);
    if (p) {
      setPart(p);
      setSupplier(p.supplier_id ? suppliers.getById(p.supplier_id) || null : null);
      setMovements(stockMovements.getByPart(id).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (!part) {
    return <div className="text-center py-20 text-[var(--muted)]">Part not found</div>;
  }

  const isLow = part.qty_on_hand <= part.reorder_threshold;
  const margin = marginPercent(part.cost_price, part.sale_price);

  const reasonLabels: Record<string, { label: string; color: string }> = {
    received: { label: t('parts_reason_received'), color: 'text-emerald-400' },
    used_on_job: { label: 'Usado em Serviço', color: 'text-amber-400' },
    adjusted: { label: t('parts_reason_adjusted'), color: 'text-blue-400' },
    returned: { label: t('parts_reason_returned'), color: 'text-purple-400' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/parts" className="hover:text-blue-400 transition-colors">{t('parts_title')}</Link>
        <span>›</span>
        <span className="text-[var(--foreground)]">{part.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Part Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">{part.name}</h1>
                <p className="font-mono text-sm text-[var(--muted)] mt-1">{part.sku}</p>
                {part.description && <p className="text-sm text-[var(--muted)] mt-2">{part.description}</p>}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--hover)] text-[var(--muted)]">{part.category}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-3 rounded-xl bg-[var(--hover)]">
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('parts_cost')}</span>
                <p className="text-lg font-bold text-[var(--foreground)] mt-1">{formatCurrency(part.cost_price)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--hover)]">
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('parts_sale')}</span>
                <p className="text-lg font-bold text-[var(--foreground)] mt-1">{formatCurrency(part.sale_price)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--hover)]">
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('parts_margin')}</span>
                <p className={`text-lg font-bold mt-1 ${margin > 40 ? 'text-emerald-400' : margin > 20 ? 'text-amber-400' : 'text-red-400'}`}>
                  {margin.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-xl ${isLow ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('parts_stock')}</span>
                <p className={`text-lg font-bold mt-1 ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                  {part.qty_on_hand}
                </p>
                <p className="text-[10px] text-[var(--muted)]">Min: {part.reorder_threshold}</p>
              </div>
            </div>

            {part.location && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('parts_location')}</span>
                <p className="font-mono text-sm text-[var(--foreground)]">{part.location}</p>
              </div>
            )}
          </div>

          {/* Stock Movement History */}
          <div className="card">
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold">Histórico de Movimentos de Stock</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Motivo</th>
                    <th className="text-right">Qtd</th>
                    <th>Ordem de Serviço</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => {
                    const r = reasonLabels[m.reason] || { label: m.reason, color: 'text-[var(--muted)]' };
                    return (
                      <tr key={m.id}>
                        <td className="text-sm text-[var(--muted)]">{formatDateTime(m.created_at)}</td>
                        <td><span className={`text-sm font-medium ${r.color}`}>{r.label}</span></td>
                        <td className={`text-right font-mono font-bold ${m.qty_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.qty_delta > 0 ? '+' : ''}{m.qty_delta}
                        </td>
                        <td>
                          {m.work_order_id ? (
                            <Link href={`/work-orders/${m.work_order_id}`} className="text-sm text-blue-400 hover:text-blue-300">
                              Ver OS
                            </Link>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {movements.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-[var(--muted)]">Sem movimentos registados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Supplier Info */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Fornecedor</h3>
            {supplier ? (
              <div className="space-y-2">
                <p className="font-medium text-[var(--foreground)]">{supplier.name}</p>
                <p className="text-sm text-[var(--muted)]">{supplier.contact_info}</p>
                <p className="text-sm text-[var(--muted)]">Prazo de entrega: {supplier.lead_time_days} dias</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Sem fornecedor atribuído</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
