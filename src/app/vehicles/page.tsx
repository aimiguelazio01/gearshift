'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import AdminLockModal from '@/components/AdminLockModal';
import { vehicles, customers } from '@/lib/store';
import { matchesSearch } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import type { Vehicle, Customer } from '@/lib/types';

export default function VehiclesPage() {
  const { t, lang } = useLanguage();
  const { permissions, isTechnician, currentUser } = useAuth();
  const [list, setList] = useState<Vehicle[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [showAuthLock, setShowAuthLock] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const reload = useCallback(() => {
    setList(vehicles.getAll());
    setCustomerList(customers.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = list.filter(v =>
    matchesSearch(`${v.make} ${v.model} ${v.plate} ${v.vin} ${v.year}`, search)
  );

  const handleOpenCreate = () => {
    if (permissions.canManageCustomersAndVehicles) {
      setEditId(null);
      setShowModal(true);
    } else {
      setPendingAction(() => () => { setEditId(null); setShowModal(true); });
      setShowAuthLock(true);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextServiceRaw = fd.get('next_service_mileage');
    const data = {
      customer_id: fd.get('customer_id') as string,
      vin: fd.get('vin') as string,
      make: fd.get('make') as string,
      model: fd.get('model') as string,
      year: Number(fd.get('year')),
      plate: fd.get('plate') as string,
      mileage: Number(fd.get('mileage')),
      next_service_mileage: nextServiceRaw ? Number(nextServiceRaw) : null,
      color: fd.get('color') as string,
      engine_type: fd.get('engine_type') as string,
    };
    if (editId) {
      vehicles.update(editId, data);
    } else {
      vehicles.create(data);
    }
    setShowModal(false);
    setEditId(null);
    reload();
  };

  const handleDelete = (id: string) => {
    if (!permissions.canManageCustomersAndVehicles) {
      setPendingAction(() => () => {
        if (confirm(t('confirm_delete'))) {
          vehicles.delete(id);
          reload();
        }
      });
      setShowAuthLock(true);
      return;
    }

    if (confirm(t('confirm_delete'))) {
      vehicles.delete(id);
      reload();
    }
  };

  const openEdit = (v: Vehicle) => {
    if (!permissions.canManageCustomersAndVehicles) {
      setPendingAction(() => () => {
        setEditId(v.id);
        setShowModal(true);
      });
      setShowAuthLock(true);
      return;
    }
    setEditId(v.id);
    setShowModal(true);
  };

  const editingVehicle = editId ? list.find(v => v.id === editId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Role Notice Banner for Technicians */}
      {isTechnician && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🚗</span>
            <span className="text-cyan-300 font-medium">
              {lang === 'pt'
                ? `Perfil Técnico: Modo de consulta da frota de veículos. O registo de novos veículos é gerido pela Administração e Consultores de Serviço.`
                : `Technician Profile: Fleet view mode. Vehicle registration is managed by Administration and Service Advisors.`}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('veh_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{list.length} {t('veh_total')}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary"
          title={!permissions.canManageCustomersAndVehicles ? (lang === 'pt' ? 'Apenas Administrativos e Administradores podem adicionar veículos' : 'Only Advisors and Admins can add vehicles') : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t('veh_add_button')}</span>
          {!permissions.canManageCustomersAndVehicles && <span className="text-[10px] opacity-75">🔒</span>}
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder={t('veh_search_placeholder')} />

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('inv_vehicle')}</th>
              <th>{t('veh_plate')}</th>
              <th>{t('veh_owner')}</th>
              <th>{t('veh_vin')}</th>
              <th>{t('veh_engine')}</th>
              <th>{t('veh_mileage')}</th>
              <th className="text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => {
              const owner = customerList.find(c => c.id === v.customer_id);
              return (
                <tr key={v.id}>
                  <td>
                    <Link href={`/vehicles/${v.id}`} className="font-semibold text-[var(--foreground)] hover:text-blue-400 transition-colors">
                      {v.year} {v.make} {v.model}
                    </Link>
                    {v.color && <div className="text-xs text-[var(--muted)]">{v.color}</div>}
                  </td>
                  <td>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--hover)] text-[var(--foreground)]">
                      {v.plate}
                    </span>
                  </td>
                  <td className="text-sm">
                    {owner ? (
                      <Link href={`/customers/${owner.id}`} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                        {owner.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="font-mono text-xs text-[var(--muted)]">{v.vin}</td>
                  <td className="text-sm text-[var(--muted)]">{v.engine_type}</td>
                  <td className="text-sm font-medium">{v.mileage.toLocaleString()} km</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title={t('edit')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 transition-colors"
                        title={t('delete')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[var(--muted)]">
                  {t('veh_no_vehicles')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? t('veh_modal_edit') : t('veh_modal_new')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">{t('veh_owner')} *</label>
            <select name="customer_id" required defaultValue={editingVehicle?.customer_id || ''} className="w-full">
              <option value="">{t('cust_select_placeholder')}</option>
              {customerList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">{t('veh_make')} *</label>
              <input type="text" name="make" required defaultValue={editingVehicle?.make || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_model')} *</label>
              <input type="text" name="model" required defaultValue={editingVehicle?.model || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_year')} *</label>
              <input type="number" name="year" required defaultValue={editingVehicle?.year || new Date().getFullYear()} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('veh_plate')} *</label>
              <input type="text" name="plate" required defaultValue={editingVehicle?.plate || ''} className="w-full uppercase font-mono" />
            </div>
            <div>
              <label className="form-label">{t('veh_vin')} *</label>
              <input type="text" name="vin" required defaultValue={editingVehicle?.vin || ''} className="w-full uppercase font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">{t('veh_mileage')} (km) *</label>
              <input type="number" name="mileage" required defaultValue={editingVehicle?.mileage || 0} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_engine')}</label>
              <input type="text" name="engine_type" defaultValue={editingVehicle?.engine_type || ''} placeholder="2.0 TDI" className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_color')}</label>
              <input type="text" name="color" defaultValue={editingVehicle?.color || ''} className="w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">{t('veh_next_revision')} (km)</label>
            <input type="number" name="next_service_mileage" defaultValue={editingVehicle?.next_service_mileage || ''} placeholder="ex: 150000" className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{editId ? t('save') : t('create')}</button>
          </div>
        </form>
      </Modal>

      {/* Auth Lock Modal */}
      <AdminLockModal
        open={showAuthLock}
        onClose={() => { setShowAuthLock(false); setPendingAction(null); }}
        actionTitle={lang === 'pt' ? 'Gestão de Veículos (Apenas Administrativo/Admin)' : 'Vehicle Management (Advisor/Admin Only)'}
        onSuccess={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
}
