'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { workOrders, customers, vehicles, users, lifts } from '@/lib/store';
import { matchesSearch, STATUS_COLORS } from '@/lib/utils';
import { WORK_ORDER_STATUSES } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import type { WorkOrder, Customer, Vehicle, Lift } from '@/lib/types';

export default function WorkOrdersPage() {
  const { t, formatCurrency, formatDate } = useLanguage();
  const [list, setList] = useState<WorkOrder[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [liftList, setLiftList] = useState<Lift[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const reload = useCallback(() => {
    setList(workOrders.getAll());
    setCustomerList(customers.getAll());
    setVehicleList(vehicles.getAll());
    setLiftList(lifts.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const techList = users.getTechnicians();

  const filtered = list.filter(wo => {
    const vehicle = vehicleList.find(v => v.id === wo.vehicle_id);
    const customer = customerList.find(c => c.id === wo.customer_id);
    return matchesSearch(
      `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.plate || ''} ${customer?.name || ''} ${wo.customer_notes}`,
      search
    );
  });

  const handleCreateWO = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vehicleId = fd.get('vehicle_id') as string;

    if (!vehicleId) {
      alert('Por favor selecione um veículo.');
      return;
    }

    const vehicle = vehicleList.find(v => v.id === vehicleId);
    const customerId = selectedCustomer || vehicle?.customer_id || customerList[0]?.id || '';

    const liftId = (fd.get('lift_id') as string) || null;
    const dateStr = fd.get('scheduled_date') as string;
    const timeStr = fd.get('scheduled_time') as string;
    const estHoursRaw = fd.get('estimated_hours');
    const estHours = estHoursRaw ? Number(estHoursRaw) : 2;

    let startIso: string | undefined;
    let endIso: string | undefined;
    if (dateStr && timeStr) {
      startIso = `${dateStr}T${timeStr}:00`;
      const startDateObj = new Date(startIso);
      const endDateObj = new Date(startDateObj.getTime() + estHours * 3600000);
      endIso = endDateObj.toISOString();
    }

    const newWO = workOrders.create({
      customer_id: customerId,
      vehicle_id: vehicleId,
      status: 'Estimate',
      assigned_technician_id: (fd.get('assigned_technician_id') as string) || '',
      lift_id: liftId,
      scheduled_start: startIso || null,
      scheduled_end: endIso || null,
      estimated_hours: estHours,
      internal_notes: (fd.get('internal_notes') as string) || '',
      customer_notes: (fd.get('customer_notes') as string) || 'Revisão / Reparação Automóvel',
    });

    if (liftId && newWO) {
      lifts.assignWorkOrder(liftId, newWO.id);
    }

    setShowModal(false);
    setSelectedCustomer('');
    reload();
  };

  const customerVehicles = selectedCustomer
    ? vehicleList.filter(v => v.customer_id === selectedCustomer)
    : vehicleList;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('wo_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{list.length} {t('wo_total')}</p>
        </div>
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              {t('wo_view_kanban')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              {t('wo_view_list')}
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('wo_add_button')}
          </button>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder={t('wo_search_placeholder')} />

      {viewMode === 'kanban' ? (
        /* ── Kanban Board ── */
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          {WORK_ORDER_STATUSES.map(status => {
            const statusWOs = filtered.filter(wo => wo.status === status);
            const colors = STATUS_COLORS[status];
            const translatedStatus = t(`status_${status.replace(/ /g, '_').replace(/\//g, '_')}` as any) || status;
            return (
              <div key={status} className="flex-shrink-0 w-72">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${colors.bg}`}>
                  <span className={`text-xs font-semibold ${colors.text}`}>{translatedStatus}</span>
                  <span className={`text-xs font-bold ${colors.text} bg-white/10 rounded-full w-5 h-5 flex items-center justify-center`}>
                    {statusWOs.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {statusWOs.map(wo => {
                    const vehicle = vehicleList.find(v => v.id === wo.vehicle_id);
                    const tech = techList.find(u => u.id === wo.assigned_technician_id);
                    const lift = liftList.find(l => l.id === wo.lift_id);
                    const totals = workOrders.getTotal(wo);

                    return (
                      <Link
                        key={wo.id}
                        href={`/work-orders/${wo.id}`}
                        className="block card p-4 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {vehicle ? `${vehicle.make} ${vehicle.model}` : t('unknown')}
                            </p>
                            <p className="text-xs text-[var(--muted)]">{vehicle?.plate}</p>
                          </div>
                          <p className="text-xs font-bold text-[var(--foreground)]">{formatCurrency(totals.subtotal)}</p>
                        </div>

                        {lift && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                            <span>🏗️</span>
                            <span>{lift.name}</span>
                          </div>
                        )}

                        <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2">{wo.customer_notes}</p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-blue-300">
                              {tech?.name.charAt(0) || '?'}
                            </div>
                            <span className="text-[10px] text-[var(--muted)]">{tech?.name || t('wo_unassigned')}</span>
                          </div>
                          <span className="text-[10px] text-[var(--muted)]">{formatDate(wo.created_at)}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {statusWOs.length === 0 && (
                    <div className="text-center py-8 text-[var(--muted)] text-xs border border-dashed border-[var(--border)] rounded-xl">
                      Sem ordens
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('inv_vehicle')}</th>
                <th>{t('inv_customer')}</th>
                <th>{t('inv_status')}</th>
                <th>Elevador</th>
                <th>{t('wo_technician')}</th>
                <th>Descrição</th>
                <th className="text-right">Total</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(wo => {
                const vehicle = vehicleList.find(v => v.id === wo.vehicle_id);
                const customer = customerList.find(c => c.id === wo.customer_id);
                const tech = techList.find(u => u.id === wo.assigned_technician_id);
                const lift = liftList.find(l => l.id === wo.lift_id);
                const totals = workOrders.getTotal(wo);
                return (
                  <tr key={wo.id}>
                    <td>
                      <Link href={`/work-orders/${wo.id}`} className="font-medium text-[var(--foreground)] hover:text-blue-400">
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : t('unknown')}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">{vehicle?.plate}</div>
                    </td>
                    <td className="text-sm text-[var(--muted)]">{customer?.name || '—'}</td>
                    <td><StatusBadge status={wo.status} size="sm" /></td>
                    <td>
                      {lift ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          {lift.name.split(' ')[0]} {lift.name.split(' ')[1]}
                        </span>
                      ) : <span className="text-xs text-[var(--muted)]">—</span>}
                    </td>
                    <td className="text-sm text-[var(--muted)]">{tech?.name || '—'}</td>
                    <td className="text-sm text-[var(--muted)] max-w-[200px] truncate">{wo.customer_notes}</td>
                    <td className="text-right text-sm font-medium">{formatCurrency(totals.subtotal)}</td>
                    <td className="text-sm text-[var(--muted)]">{formatDate(wo.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Work Order Modal with Lift & Schedule Selection */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setSelectedCustomer(''); }} title={t('wo_add_button')} maxWidth="max-w-xl">
        <form onSubmit={handleCreateWO} className="space-y-4">
          <div>
            <label className="form-label">{t('inv_customer')}</label>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full"
            >
              <option value="">Todos os clientes (Filtrar veículo)...</option>
              {customerList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">{t('inv_vehicle')} *</label>
            <select name="vehicle_id" required className="w-full">
              <option value="">Selecionar veículo...</option>
              {customerVehicles.map(v => {
                const owner = customerList.find(c => c.id === v.customer_id);
                return (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} ({v.plate}) {owner ? `— ${owner.name}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('wo_technician')}</label>
              <select name="assigned_technician_id" className="w-full">
                <option value="">{t('wo_unassigned')}</option>
                {techList.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Elevador (Oficina)</label>
              <select name="lift_id" className="w-full">
                <option value="">Nenhum (Sem Elevador)</option>
                {liftList.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--hover)] border border-[var(--border)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Agendamento de Serviço</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label text-[11px]">Data</label>
                <input type="date" name="scheduled_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full text-xs" />
              </div>
              <div>
                <label className="form-label text-[11px]">Hora Início</label>
                <input type="time" name="scheduled_time" defaultValue="09:00" className="w-full text-xs" />
              </div>
              <div>
                <label className="form-label text-[11px]">Duração (h)</label>
                <input type="number" name="estimated_hours" step="0.5" defaultValue="2" min="0.5" className="w-full text-xs" />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">{t('wo_customer_notes')}</label>
            <textarea name="customer_notes" rows={2} placeholder="Descrição do serviço solicitado..." className="w-full" />
          </div>
          <div>
            <label className="form-label">{t('wo_internal_notes')}</label>
            <textarea name="internal_notes" rows={2} placeholder="Observações internas..." className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setSelectedCustomer(''); }}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('create')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
