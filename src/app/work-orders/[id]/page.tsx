'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { workOrders, customers, vehicles, users, parts, invoices, lifts } from '@/lib/store';
import { STATUS_COLORS } from '@/lib/utils';
import { WORK_ORDER_STATUSES } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import type { WorkOrder, Customer, Vehicle, User, Part, Lift } from '@/lib/types';

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, formatCurrency, formatDate, formatDateTime } = useLanguage();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tech, setTech] = useState<User | null>(null);
  const [partsList, setPartsList] = useState<Part[]>([]);
  const [liftList, setLiftList] = useState<Lift[]>([]);
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);

  const reload = useCallback(() => {
    const order = workOrders.getById(id);
    if (order) {
      setWo(order);
      setCustomer(customers.getById(order.customer_id) || null);
      setVehicle(vehicles.getById(order.vehicle_id) || null);
      setTech(users.getById(order.assigned_technician_id) || null);
      setPartsList(parts.getAll());
      setLiftList(lifts.getAll());
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (!wo) {
    return <div className="text-center py-20 text-[var(--muted)]">Work order not found</div>;
  }

  const totals = workOrders.getTotal(wo);
  const currentIdx = WORK_ORDER_STATUSES.indexOf(wo.status);

  const advanceStatus = () => {
    if (currentIdx < WORK_ORDER_STATUSES.length - 1) {
      const nextStatus = WORK_ORDER_STATUSES[currentIdx + 1];
      workOrders.update(id, { status: nextStatus });
      reload();
    }
  };

  const regressStatus = () => {
    if (currentIdx > 0) {
      const prevStatus = WORK_ORDER_STATUSES[currentIdx - 1];
      workOrders.update(id, { status: prevStatus });
      reload();
    }
  };

  const handleAddLabor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    workOrders.addLaborLine(id, {
      description: fd.get('description') as string,
      hours: Number(fd.get('hours')),
      rate: Number(fd.get('rate')),
    });
    setShowLaborModal(false);
    reload();
  };

  const handleAddPart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const partId = fd.get('part_id') as string;
    const part = partsList.find(p => p.id === partId);
    workOrders.addPartLine(id, {
      part_id: partId,
      qty: Number(fd.get('qty')),
      unit_price: part?.sale_price || 0,
    });
    setShowPartModal(false);
    reload();
  };

  const handleRemoveLabor = (lineId: string) => {
    workOrders.removeLaborLine(id, lineId);
    reload();
  };

  const handleRemovePart = (lineId: string) => {
    workOrders.removePartLine(id, lineId);
    reload();
  };

  const handleGenerateInvoice = () => {
    const existing = invoices.getByWorkOrder(id);
    if (existing) {
      alert('Invoice already exists for this work order.');
      return;
    }
    invoices.generateFromWorkOrder(id);
    reload();
  };

  const handleLiftChange = (liftId: string) => {
    if (liftId) {
      lifts.assignWorkOrder(liftId, id);
    } else if (wo.lift_id) {
      lifts.assignWorkOrder(wo.lift_id, null);
    }
    reload();
  };

  const nextStatus = currentIdx < WORK_ORDER_STATUSES.length - 1 ? WORK_ORDER_STATUSES[currentIdx + 1] : null;
  const currentLift = wo.lift_id ? liftList.find(l => l.id === wo.lift_id) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/work-orders" className="hover:text-blue-400 transition-colors">{t('wo_title')}</Link>
        <span>›</span>
        <span className="text-[var(--foreground)]">
          {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Work Order'}
        </span>
      </div>

      {/* Status Pipeline */}
      <div className="card p-5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {WORK_ORDER_STATUSES.map((status, idx) => {
            const isActive = status === wo.status;
            const isPast = idx < currentIdx;
            const colors = STATUS_COLORS[status];
            const translatedStatus = t(`status_${status.replace(/ /g, '_').replace(/\//g, '_')}` as any) || status;
            return (
              <div key={status} className="flex items-center">
                <div className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                  ${isActive ? `${colors.bg} ${colors.text} ring-1 ring-current` :
                    isPast ? 'bg-emerald-500/10 text-emerald-400' : 'text-[var(--muted)]'}
                `}>
                  {isPast && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {translatedStatus}
                </div>
                {idx < WORK_ORDER_STATUSES.length - 1 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--border)] mx-0.5 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <button onClick={regressStatus} disabled={currentIdx === 0} className="btn-secondary text-xs disabled:opacity-30">
            {t('wo_previous_step')}
          </button>
          {wo.status === 'QA/Complete' ? (
            <button onClick={handleGenerateInvoice} className="btn-success text-xs">
              {t('wo_generate_invoice')}
            </button>
          ) : nextStatus ? (
            <button onClick={advanceStatus} className="btn-primary text-xs">
              {t('wo_move_to')} {t(`status_${nextStatus.replace(/ /g, '_').replace(/\//g, '_')}` as any) || nextStatus} →
            </button>
          ) : null}
        </div>
      </div>

      {/* Header Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle & Customer */}
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{t('inv_vehicle')}</h3>
                {vehicle ? (
                  <Link href={`/vehicles/${vehicle.id}`} className="text-lg font-bold text-[var(--foreground)] hover:text-blue-400 transition-colors">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Link>
                ) : <span className="text-[var(--muted)]">{t('unknown')}</span>}
                <p className="text-sm text-[var(--muted)] mt-0.5">{vehicle?.plate} • {vehicle?.mileage?.toLocaleString()} km</p>
              </div>
              <div className="flex-1">
                <h3 className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{t('inv_customer')}</h3>
                {customer ? (
                  <Link href={`/customers/${customer.id}`} className="text-lg font-bold text-[var(--foreground)] hover:text-blue-400 transition-colors">
                    {customer.name}
                  </Link>
                ) : <span className="text-[var(--muted)]">{t('unknown')}</span>}
                <p className="text-sm text-[var(--muted)] mt-0.5">{customer?.phone}</p>
              </div>
              <div>
                <h3 className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{t('wo_technician')}</h3>
                <p className="font-medium text-[var(--foreground)]">{tech?.name || t('wo_unassigned')}</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">{formatDate(wo.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Labor Lines */}
          <div className="card">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold">{t('wo_labor_lines')}</h2>
              <button onClick={() => setShowLaborModal(true)} className="btn-secondary text-xs">{t('wo_add_labor')}</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="text-right">Horas</th>
                  <th className="text-right">Taxa/h</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {wo.labor_lines.map(line => (
                  <tr key={line.id}>
                    <td className="text-sm">{line.description}</td>
                    <td className="text-right text-sm">{line.hours}</td>
                    <td className="text-right text-sm">{formatCurrency(line.rate)}</td>
                    <td className="text-right text-sm font-medium">{formatCurrency(line.hours * line.rate)}</td>
                    <td>
                      <button onClick={() => handleRemoveLabor(line.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {wo.labor_lines.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-[var(--muted)] text-sm">Sem mão de obra adicionada</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Part Lines */}
          <div className="card">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold">{t('wo_parts_used')}</h2>
              <button onClick={() => setShowPartModal(true)} className="btn-secondary text-xs">{t('wo_add_part')}</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">Preço Unit.</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {wo.part_lines.map(line => {
                  const part = partsList.find(p => p.id === line.part_id);
                  return (
                    <tr key={line.id}>
                      <td>
                        <span className="text-sm font-medium">{part?.name || 'Unknown'}</span>
                        <span className="text-xs text-[var(--muted)] ml-2">{part?.sku}</span>
                      </td>
                      <td className="text-right text-sm">{line.qty}</td>
                      <td className="text-right text-sm">{formatCurrency(line.unit_price)}</td>
                      <td className="text-right text-sm font-medium">{formatCurrency(line.qty * line.unit_price)}</td>
                      <td>
                        <button onClick={() => handleRemovePart(line.id)} className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {wo.part_lines.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-[var(--muted)] text-sm">Sem peças adicionadas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Lift Assignment & Schedule Card */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center justify-between">
              <span>Elevador & Agendamento</span>
              <Link href="/lifts" className="text-xs text-blue-400 hover:text-blue-300 font-normal">Ver Elevadores →</Link>
            </h3>

            <div>
              <label className="form-label text-xs">Atribuir Elevador</label>
              <select
                value={wo.lift_id || ''}
                onChange={e => handleLiftChange(e.target.value)}
                className="w-full text-xs"
              >
                <option value="">Nenhum (Sem Elevador)</option>
                {liftList.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                ))}
              </select>
            </div>

            {currentLift && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center justify-between">
                <span>🏗️ {currentLift.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20">Ativo</span>
              </div>
            )}
            <div className="pt-2 border-t border-[var(--border)] text-xs space-y-2">
              <div className="text-[var(--muted)]">
                <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block">📝 Data de Criação (Automática)</span>
                <span className="font-mono text-[var(--foreground)]">{formatDateTime(wo.created_at)}</span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">🔧 Data da Reparação (Manual)</span>
                {wo.scheduled_start ? (
                  <div className="font-mono text-[var(--foreground)] mt-0.5">
                    {wo.scheduled_start.replace('T', ' ')} ({wo.estimated_hours || 2}h)
                  </div>
                ) : (
                  <div className="text-[var(--muted)] italic mt-0.5">Nenhuma data de reparação definida.</div>
                )}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold">{t('wo_order_summary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">{t('wo_labor_total')}</span>
                <span className="font-medium">{formatCurrency(totals.labor)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">{t('wo_parts_total')}</span>
                <span className="font-medium">{formatCurrency(totals.parts)}</span>
              </div>
              <div className="border-t border-[var(--border)] pt-2 flex justify-between">
                <span className="font-semibold">{t('wo_subtotal')}</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(totals.subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('wo_customer_notes')}</h3>
              <p className="text-sm text-[var(--muted)]">{wo.customer_notes || '—'}</p>
            </div>
            <div className="pt-3 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                {t('wo_internal_notes')}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">{t('wo_staff_only')}</span>
              </h3>
              <p className="text-sm text-[var(--muted)]">{wo.internal_notes || '—'}</p>
            </div>
          </div>

          {/* Status */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3">{t('inv_status')}</h3>
            <StatusBadge status={wo.status} />
          </div>
        </div>
      </div>

      {/* Add Labor Modal */}
      <Modal open={showLaborModal} onClose={() => setShowLaborModal(false)} title="Adicionar Mão de Obra">
        <form onSubmit={handleAddLabor} className="space-y-4">
          <div>
            <label className="form-label">Descrição *</label>
            <input type="text" name="description" required placeholder="ex: Mudança de óleo, inspeção" className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Horas *</label>
              <input type="number" name="hours" step="0.25" required defaultValue="1" className="w-full" />
            </div>
            <div>
              <label className="form-label">Taxa (€/h) *</label>
              <input type="number" name="rate" step="0.01" required defaultValue={tech?.hourly_rate || 75} className="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowLaborModal(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('add')}</button>
          </div>
        </form>
      </Modal>

      {/* Add Part Modal */}
      <Modal open={showPartModal} onClose={() => setShowPartModal(false)} title="Adicionar Peça">
        <form onSubmit={handleAddPart} className="space-y-4">
          <div>
            <label className="form-label">Selecionar Peça *</label>
            <select name="part_id" required className="w-full">
              <option value="">Escolher peça...</option>
              {partsList.filter(p => p.qty_on_hand > 0).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {formatCurrency(p.sale_price)} — Stock: {p.qty_on_hand}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Quantidade *</label>
            <input type="number" name="qty" min="1" required defaultValue="1" className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowPartModal(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('add')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
