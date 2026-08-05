'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { vehicles, customers, workOrders, users } from '@/lib/store';
import StatusBadge from '@/components/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import type { Vehicle, Customer, WorkOrder } from '@/lib/types';

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, formatCurrency, formatDate } = useLanguage();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [owner, setOwner] = useState<Customer | null>(null);
  const [woList, setWoList] = useState<WorkOrder[]>([]);

  const reload = useCallback(() => {
    const v = vehicles.getById(id);
    if (v) {
      setVehicle(v);
      setOwner(customers.getById(v.customer_id) || null);
      setWoList(workOrders.getByVehicle(id));
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (!vehicle) {
    return <div className="text-center py-20 text-[var(--muted)]">Vehicle not found</div>;
  }

  const nextService = vehicle.next_service_mileage;
  const isOverdue = nextService != null && vehicle.mileage >= nextService;
  const remainingKm = nextService != null ? nextService - vehicle.mileage : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/vehicles" className="hover:text-blue-400 transition-colors">{t('veh_title')}</Link>
        <span>›</span>
        <span className="text-[var(--foreground)]">{vehicle.year} {vehicle.make} {vehicle.model}</span>
      </div>

      {/* Vehicle Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-cyan-400">
              <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17l-1 2h16l-1-2" />
              <circle cx="7.5" cy="13" r="1.5" />
              <circle cx="16.5" cy="13" r="1.5" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {isOverdue && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {t('veh_service_due')}
                </span>
              )}
            </div>

            {owner && (
              <p className="text-sm text-[var(--muted)] mt-1">
                {t('veh_owner')}: <Link href={`/customers/${owner.id}`} className="text-blue-400 hover:text-blue-300 transition-colors">{owner.name}</Link>
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_plate')}</span>
                <p className="font-mono font-bold text-lg text-[var(--foreground)]">{vehicle.plate}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_mileage')}</span>
                <p className="font-semibold text-[var(--foreground)]">{vehicle.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_next_service')}</span>
                {nextService != null ? (
                  <p className={`font-semibold text-sm ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                    {nextService.toLocaleString()} km
                    <span className="block text-[10px] font-normal">
                      {isOverdue
                        ? `${Math.abs(remainingKm!).toLocaleString()} ${t('veh_km_overdue')}`
                        : `${remainingKm!.toLocaleString()} ${t('veh_km_remaining')}`}
                    </span>
                  </p>
                ) : (
                  <p className="text-[var(--muted)] text-sm">—</p>
                )}
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_color')}</span>
                <p className="text-[var(--foreground)]">{vehicle.color}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_engine')}</span>
                <p className="text-[var(--foreground)]">{vehicle.engine_type}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_vin')}</span>
              <p className="font-mono text-sm text-[var(--muted)]">{vehicle.vin}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service History Timeline */}
      <div className="card">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">{t('cust_service_history')} ({woList.length} registos)</h2>
        </div>
        <div className="p-5">
          {woList.length === 0 ? (
            <p className="text-center py-8 text-[var(--muted)]">Sem registos de serviço para este veículo</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />

              <div className="space-y-6">
                {woList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(wo => {
                  const tech = users.getById(wo.assigned_technician_id);
                  const totals = workOrders.getTotal(wo);
                  return (
                    <div key={wo.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[var(--background)]" />

                      <Link href={`/work-orders/${wo.id}`} className="block card p-4 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">{wo.customer_notes.slice(0, 80)}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <StatusBadge status={wo.status} size="sm" />
                              {tech && <span className="text-xs text-[var(--muted)]">Técnico: {tech.name}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{formatCurrency(totals.subtotal)}</p>
                            <p className="text-xs text-[var(--muted)]">{formatDate(wo.created_at)}</p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
