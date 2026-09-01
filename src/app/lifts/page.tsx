'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import AdminLockModal from '@/components/AdminLockModal';
import { lifts, workOrders, vehicles, customers, users } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import type { Lift, WorkOrder, Vehicle, Customer, User } from '@/lib/types';

const PRESET_LIFT_TYPES = [
  '2-Post Lift (4.0T)',
  '2-Post Lift (3.5T)',
  'Scissor Lift (3.5T)',
  'Scissor Lift (3.0T)',
  '4-Post Alignment (5.0T)',
  '4-Post Lift (4.5T)',
  'In-Ground Lift (3.5T)',
  'Motorcycle Lift (0.8T)',
];

export default function LiftsPage() {
  const { t, lang } = useLanguage();
  const { isAdmin, currentUser } = useAuth();

  const [liftsList, setLiftsList] = useState<Lift[]>([]);
  const [woList, setWoList] = useState<WorkOrder[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [userList, setUserList] = useState<User[]>([]);

  // Modals state
  const [assignModalLiftId, setAssignModalLiftId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLiftId, setEditingLiftId] = useState<string | null>(null);

  // Admin Lock Modal State
  const [showAdminLock, setShowAdminLock] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);
  const [adminActionTitle, setAdminActionTitle] = useState('');

  const reload = useCallback(() => {
    setLiftsList(lifts.getAll());
    setWoList(workOrders.getAll());
    setVehicleList(vehicles.getAll());
    setCustomerList(customers.getAll());
    setUserList(users.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Guard function for admin actions
  const requireAdmin = (action: () => void, title: string) => {
    if (isAdmin) {
      action();
    } else {
      setAdminActionTitle(title);
      setPendingAdminAction(() => action);
      setShowAdminLock(true);
    }
  };

  const handleAssignWO = (liftId: string, woId: string | null) => {
    lifts.assignWorkOrder(liftId, woId);
    setAssignModalLiftId(null);
    reload();
  };

  const handleToggleMaintenance = (lift: Lift) => {
    requireAdmin(() => {
      const nextStatus = lift.status === 'Maintenance' ? 'Available' : 'Maintenance';
      lifts.update(lift.id, {
        status: nextStatus,
        current_work_order_id: nextStatus === 'Maintenance' ? null : lift.current_work_order_id,
      });
      reload();
    }, lang === 'pt' ? 'Alterar estado de manutenção do elevador' : 'Change lift maintenance status');
  };

  const handleSaveLift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const type = (fd.get('type') as string).trim();
    const maxWeight = Number(fd.get('max_weight_kg')) || 4000;
    const initialStatus = (fd.get('status') as 'Available' | 'Maintenance') || 'Available';

    if (editingLiftId) {
      lifts.update(editingLiftId, {
        name,
        type,
        max_weight_kg: maxWeight,
      });
    } else {
      lifts.create({
        name,
        type,
        max_weight_kg: maxWeight,
        status: initialStatus,
        current_work_order_id: null,
      });
    }
    setShowCreateModal(false);
    setEditingLiftId(null);
    reload();
  };

  const handleDeleteLift = (lift: Lift) => {
    requireAdmin(() => {
      if (confirm(t('lift_delete_confirm'))) {
        lifts.delete(lift.id);
        reload();
      }
    }, lang === 'pt' ? `Eliminar ${lift.name}` : `Delete ${lift.name}`);
  };

  const openCreateModal = () => {
    requireAdmin(() => {
      setEditingLiftId(null);
      setShowCreateModal(true);
    }, lang === 'pt' ? 'Criar Novo Elevador' : 'Create New Lift');
  };

  const openEditModal = (lift: Lift) => {
    requireAdmin(() => {
      setEditingLiftId(lift.id);
      setShowCreateModal(true);
    }, lang === 'pt' ? `Editar ${lift.name}` : `Edit ${lift.name}`);
  };

  const editingLift = editingLiftId ? liftsList.find(l => l.id === editingLiftId) : null;

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
      {/* Admin Access Status Banner */}
      {!isAdmin && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🔒</span>
            <span className="text-amber-300 font-medium">
              {lang === 'pt'
                ? 'Controlo de Gestão: Apenas o Administrador pode criar ou eliminar elevadores.'
                : 'Management Control: Only the Administrator can create or delete lifts.'}
            </span>
          </div>
          <button
            onClick={() => {
              setAdminActionTitle(lang === 'pt' ? 'Autenticação de Administrador' : 'Admin Authentication');
              setPendingAdminAction(null);
              setShowAdminLock(true);
            }}
            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 transition-all shrink-0"
          >
            {lang === 'pt' ? '👑 Desbloquear Admin' : '👑 Unlock Admin'}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('lift_title')}</h1>
            {isAdmin && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                👑 Admin Control
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--muted)] mt-1">{t('lift_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {availableCount} {t('lift_available')}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {occupiedCount} {t('lift_occupied')}
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary text-xs flex items-center gap-2 py-2 px-3.5 shadow-lg shadow-blue-500/20"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t('lift_add_button')}</span>
            {!isAdmin && <span className="text-[10px] opacity-75">🔒</span>}
          </button>
        </div>
      </div>

      {/* Lifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className={`card p-6 flex flex-col justify-between border-2 transition-all duration-300 group hover:shadow-xl ${
                isMaintenance
                  ? 'border-red-500/30 bg-red-500/5'
                  : isOccupied
                  ? 'border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
            >
              <div>
                {/* Card Header with Edit & Delete Actions */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">{lift.name}</h3>
                    <p className="text-xs text-[var(--muted)]">{lift.type} • {t('lift_capacity')}: {lift.max_weight_kg.toLocaleString()} kg</p>
                  </div>
                  <div className="flex items-center gap-1.5">
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

                    {/* Edit button (Admin protected) */}
                    <button
                      onClick={() => openEditModal(lift)}
                      className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-blue-400 transition-colors"
                      title={isAdmin ? t('edit') : `${t('edit')} (Admin 🔒)`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    {/* Delete button (Admin protected) */}
                    <button
                      onClick={() => handleDeleteLift(lift)}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--muted)] hover:text-red-400 transition-colors"
                      title={isAdmin ? t('delete') : `${t('delete')} (Admin 🔒)`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
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
                        {t('wo_order_number')} #{activeWo.id.slice(0, 6).toUpperCase()} →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 py-10 text-center text-[var(--muted)] rounded-xl border border-dashed border-[var(--border)]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-50">
                      <path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
                      <line x1="2" y1="21" x2="22" y2="21" />
                    </svg>
                    <p className="text-xs">{isMaintenance ? t('lift_maintenance_badge') : t('lift_available_badge')}</p>
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

        {/* Empty state if no lifts */}
        {liftsList.length === 0 && (
          <div className="col-span-full py-16 text-center card border-dashed border-2 p-8">
            <div className="text-4xl mb-3">🏗️</div>
            <h3 className="text-base font-bold text-[var(--foreground)]">{t('lift_no_lifts')}</h3>
            <p className="text-xs text-[var(--muted)] mt-1 mb-4">Clique no botão abaixo para adicionar o primeiro elevador da oficina.</p>
            <button
              onClick={openCreateModal}
              className="btn-primary text-xs mx-auto"
            >
              + {t('lift_add_button')}
            </button>
          </div>
        )}
      </div>

      {/* Lift Occupation Timeline */}
      {liftsList.length > 0 && (
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

              {/* Rows for Lifts */}
              <div className="space-y-3 pt-3">
                {liftsList.map(lift => {
                  const activeWo = woList.find(wo => wo.lift_id === lift.id || wo.id === lift.current_work_order_id);
                  const vehicle = activeWo ? vehicleList.find(v => v.id === activeWo.vehicle_id) : null;
                  const isMaintenance = lift.status === 'Maintenance';

                  return (
                    <div key={lift.id} className="flex items-center gap-3">
                      <div className="w-44 text-xs font-semibold text-[var(--foreground)] truncate shrink-0">
                        {lift.name.split('(')[0].trim()}
                      </div>
                      <div className="flex-1 h-10 bg-[var(--hover)] rounded-xl relative border border-[var(--border)] overflow-hidden">
                        {isMaintenance ? (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center text-xs text-red-300 font-semibold">
                            {t('lift_maintenance')}
                          </div>
                        ) : activeWo && vehicle ? (
                          <div
                            className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 flex items-center justify-between text-xs text-white font-bold shadow-md truncate"
                            style={{ left: '10%', right: '40%' }}
                          >
                            <span className="truncate">{vehicle.make} {vehicle.model} ({vehicle.plate})</span>
                            <span className="text-[10px] opacity-80 shrink-0 ml-2">
                              {t(`status_${activeWo.status.toLowerCase().replace(/[\s/]+/g, '_')}`) || activeWo.status}
                            </span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--muted)]">
                            {t('lift_available')}
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
      )}

      {/* Create / Edit Lift Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingLiftId(null); }}
        title={editingLiftId ? t('lift_modal_edit') : t('lift_modal_new')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveLift} className="space-y-4">
          <div>
            <label className="form-label">{t('lift_name')} *</label>
            <input
              type="text"
              name="name"
              required
              placeholder="ex: Elevador 4 (2 Colunas)"
              defaultValue={editingLift?.name || ''}
              className="w-full"
            />
          </div>

          <div>
            <label className="form-label">{t('lift_type')} *</label>
            <input
              type="text"
              name="type"
              list="lift-preset-types"
              required
              placeholder="ex: 2-Post Lift (4.0T)"
              defaultValue={editingLift?.type || ''}
              className="w-full"
            />
            <datalist id="lift-preset-types">
              {PRESET_LIFT_TYPES.map(pt => (
                <option key={pt} value={pt} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="form-label">{t('lift_max_weight')} *</label>
            <input
              type="number"
              name="max_weight_kg"
              step="100"
              min="500"
              max="20000"
              required
              defaultValue={editingLift?.max_weight_kg || 4000}
              className="w-full"
            />
          </div>

          {!editingLiftId && (
            <div>
              <label className="form-label">{t('inv_status')}</label>
              <select name="status" defaultValue="Available" className="w-full">
                <option value="Available">{t('lift_available')}</option>
                <option value="Maintenance">{t('lift_maintenance')}</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setShowCreateModal(false); setEditingLiftId(null); }}
            >
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {editingLiftId ? t('save') : t('create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Work Order Modal */}
      <Modal open={!!assignModalLiftId} onClose={() => setAssignModalLiftId(null)} title={t('lift_assign')}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            {t('lift_select_wo_prompt')} <strong className="text-[var(--foreground)]">{liftsList.find(l => l.id === assignModalLiftId)?.name}</strong>:
          </p>
          {unassignedWOs.length === 0 ? (
            <p className="text-center py-6 text-sm text-[var(--muted)]">{t('lift_no_pending_wos')}</p>
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

      {/* Admin Lock Modal */}
      <AdminLockModal
        open={showAdminLock}
        onClose={() => { setShowAdminLock(false); setPendingAdminAction(null); }}
        actionTitle={adminActionTitle}
        onSuccess={() => {
          if (pendingAdminAction) {
            pendingAdminAction();
            setPendingAdminAction(null);
          }
        }}
      />
    </div>
  );
}
