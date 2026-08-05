'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { lifts, workOrders, vehicles, customers, users } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import type { Lift, WorkOrder, Vehicle, Customer, User } from '@/lib/types';

export default function LiftsPage() {
  const { t } = useLanguage();
  const [liftsList, setLiftsList] = useState<Lift[]>([]);
  const [woList, setWoList] = useState<WorkOrder[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [assignModalLiftId, setAssignModalLiftId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLiftsList(lifts.getAll());
    setWoList(workOrders.getAll());
    setVehicleList(vehicles.getAll());
    setCustomerList(customers.getAll());
    setUserList(users.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleAssignWO = (liftId: string, woId: string | null) => {
    lifts.assignWorkOrder(liftId, woId);
    setAssignModalLiftId(null);
    reload();
  };

  const handleToggleMaintenance = (lift: Lift) => {
    const nextStatus = lift.status === 'Maintenance' ? 'Available' : 'Maintenance';
    lifts.update(lift.id, {
      status: nextStatus,
      current_work_order_id: nextStatus === 'Maintenance' ? null : lift.current_work_order_id,
    });
    reload();
  };

  const occupiedCount = liftsList.filter(l => l.status === 'Occupied').length;
  const availableCount = liftsList.filter(l => l.status === 'Available').length;

  // Unassigned active work orders
  const unassignedWOs = woList.filter(wo =>
    !['Invoiced', 'Closed'].includes(wo.status) && (!wo.lift_id || wo.lift_id === '')
  );

  // Time slots for daily timeline (08:00 to 18:00)
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('lift_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{t('lift_subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {availableCount} {t('lift_available')}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {occupiedCount} {t('lift_occupied')}
          </div>
        </div>
      </div>

      {/* 3 Lifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {liftsList.map(lift => {
          const activeWo = woList.find(wo => wo.id === lift.current_work_order_id || wo.lift_id === lift.id);
          const vehicle = activeWo ? vehicleList.find(v => v.id === activeWo.vehicle_id) : null;
          const customer = activeWo ? customerList.find(c => c.id === activeWo.customer_id) : null;
          const tech = activeWo ? userList.find(u => u.id === activeWo.assigned_technician_id) : null;

          const isOccupied = lift.status === 'Occupied' || activeWo != null;
          const isMaintenance = lift.status === 'Maintenance';

          return (
            <div
              key={lift.id}
              className={`card p-6 flex flex-col justify-between border-2 transition-all duration-300 ${
                isMaintenance
                  ? 'border-red-500/30 bg-red-500/5'
                  : isOccupied
                  ? 'border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">{lift.name}</h3>
                    <p className="text-xs text-[var(--muted)]">{lift.type} • {t('lift_capacity')}: {lift.max_weight_kg.toLocaleString()} kg</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      isMaintenance
                        ? 'bg-red-500/20 text-red-300'
                        : isOccupied
                        ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {isMaintenance ? t('lift_maintenance') : isOccupied ? t('lift_occupied') : t('lift_available')}
                  </span>
                </div>

                {/* Occupied Vehicle Content */}
                {isOccupied && activeWo && vehicle ? (
                  <div className="mt-4 p-4 rounded-xl bg-[var(--hover)] border border-[var(--border)] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('lift_current_vehicle')}</span>
                        <Link href={`/vehicles/${vehicle.id}`} className="font-bold text-base block text-[var(--foreground)] hover:text-blue-400">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </Link>
                        <p className="font-mono text-xs text-[var(--muted)]">{vehicle.plate}</p>
                      </div>
                      <StatusBadge status={activeWo.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--border)]">
                      <div>
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('inv_customer')}</span>
                        <p className="font-medium text-[var(--foreground)] truncate">{customer?.name || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('lift_technician')}</span>
                        <p className="font-medium text-[var(--foreground)] truncate">{tech?.name || t('wo_unassigned')}</p>
                      </div>
                    </div>

                    {activeWo.scheduled_start && (
                      <div className="text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--border)] flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>
                          {activeWo.scheduled_start.split('T')[1]?.slice(0, 5)} - {activeWo.scheduled_end?.split('T')[1]?.slice(0, 5) || '18:00'} ({activeWo.estimated_hours || 2}h)
                        </span>
                      </div>
                    )}

                    <div className="pt-1">
                      <Link href={`/work-orders/${activeWo.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                        Ver Ordem de Serviço #{activeWo.id.slice(0, 6).toUpperCase()} →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 py-10 text-center text-[var(--muted)] rounded-xl border border-dashed border-[var(--border)]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-50">
                      <path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
                      <line x1="2" y1="21" x2="22" y2="21" />
                    </svg>
                    <p className="text-xs">{isMaintenance ? 'Elevador em Manutenção' : 'Elevador Livre para Serviço'}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-[var(--border)] flex gap-2">
                {isOccupied ? (
                  <button
                    onClick={() => handleAssignWO(lift.id, null)}
                    className="flex-1 btn-secondary text-xs py-2"
                  >
                    {t('lift_unassign')}
                  </button>
                ) : (
                  <button
                    onClick={() => setAssignModalLiftId(lift.id)}
                    disabled={isMaintenance}
                    className="flex-1 btn-primary text-xs py-2 disabled:opacity-30"
                  >
                    {t('lift_assign')}
                  </button>
                )}
                <button
                  onClick={() => handleToggleMaintenance(lift)}
                  className={`px-3 py-2 text-xs rounded-xl border transition-colors ${
                    isMaintenance
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                  title={t('lift_status_change')}
                >
                  ⚙️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lift Occupation Timeline */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--foreground)]">{t('lift_timeline')}</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour markers */}
            <div className="grid grid-cols-11 gap-1 text-[11px] font-mono text-[var(--muted)] pb-2 border-b border-[var(--border)]">
              {timeSlots.map(time => (
                <div key={time} className="text-center">{time}</div>
              ))}
            </div>

            {/* Rows for 3 Lifts */}
            <div className="space-y-3 pt-3">
              {liftsList.map(lift => {
                const activeWo = woList.find(wo => wo.lift_id === lift.id || wo.id === lift.current_work_order_id);
                const vehicle = activeWo ? vehicleList.find(v => v.id === activeWo.vehicle_id) : null;
                const isMaintenance = lift.status === 'Maintenance';

                return (
                  <div key={lift.id} className="flex items-center gap-3">
                    <div className="w-44 text-xs font-semibold text-[var(--foreground)] truncate shrink-0">
                      {lift.name.split(' ')[0]} {lift.name.split(' ')[1]}
                    </div>
                    <div className="flex-1 h-10 bg-[var(--hover)] rounded-xl relative border border-[var(--border)] overflow-hidden">
                      {isMaintenance ? (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center text-xs text-red-300 font-semibold">
                          Manutenção
                        </div>
                      ) : activeWo && vehicle ? (
                        <div
                          className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 flex items-center justify-between text-xs text-white font-bold shadow-md truncate"
                          style={{ left: '10%', right: '40%' }} // Visual block representation
                        >
                          <span className="truncate">{vehicle.make} {vehicle.model} ({vehicle.plate})</span>
                          <span className="text-[10px] opacity-80 shrink-0 ml-2">{activeWo.status}</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--muted)]">
                          Disponível
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Work Order Modal */}
      <Modal open={!!assignModalLiftId} onClose={() => setAssignModalLiftId(null)} title={t('lift_assign')}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Selecione uma ordem de serviço para colocar no <strong className="text-[var(--foreground)]">{liftsList.find(l => l.id === assignModalLiftId)?.name}</strong>:
          </p>
          {unassignedWOs.length === 0 ? (
            <p className="text-center py-6 text-sm text-[var(--muted)]">Sem ordens de serviço pendentes de elevador.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {unassignedWOs.map(wo => {
                const vehicle = vehicleList.find(v => v.id === wo.vehicle_id);
                const customer = customerList.find(c => c.id === wo.customer_id);
                return (
                  <div
                    key={wo.id}
                    onClick={() => assignModalLiftId && handleAssignWO(assignModalLiftId, wo.id)}
                    className="p-3 rounded-xl card hover:border-blue-500 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-sm text-[var(--foreground)]">{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Veículo'} ({vehicle?.plate})</p>
                      <p className="text-xs text-[var(--muted)]">{customer?.name} • {wo.customer_notes.slice(0, 40)}...</p>
                    </div>
                    <StatusBadge status={wo.status} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button className="btn-secondary" onClick={() => setAssignModalLiftId(null)}>{t('cancel')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
