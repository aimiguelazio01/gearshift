'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import { vehicles, customers } from '@/lib/store';
import { matchesSearch } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import type { Vehicle, Customer } from '@/lib/types';

export default function VehiclesPage() {
  const { t } = useLanguage();
  const [list, setList] = useState<Vehicle[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setList(vehicles.getAll());
    setCustomerList(customers.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = list.filter(v =>
    matchesSearch(`${v.make} ${v.model} ${v.plate} ${v.vin} ${v.year}`, search)
  );

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
    if (confirm(t('confirm_delete'))) {
      vehicles.delete(id);
      reload();
    }
  };

  const editingVehicle = editId ? list.find(v => v.id === editId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('veh_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{list.length} {t('veh_registered')}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditId(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('veh_add_button')}
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder={t('veh_search_placeholder')} />

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(v => {
          const owner = customerList.find(c => c.id === v.customer_id);
          const nextService = v.next_service_mileage;
          const isOverdue = nextService != null && v.mileage >= nextService;
          const remainingKm = nextService != null ? nextService - v.mileage : null;

          return (
            <div key={v.id} className="card group hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/vehicles/${v.id}`} className="text-lg font-semibold text-[var(--foreground)] hover:text-blue-400 transition-colors">
                      {v.year} {v.make} {v.model}
                    </Link>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {owner ? (
                        <Link href={`/customers/${owner.id}`} className="hover:text-blue-400 transition-colors">
                          {owner.name}
                        </Link>
                      ) : t('none')}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(v.id); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)]" title={t('edit')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400" title={t('delete')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_plate')}</span>
                    <p className="font-mono font-semibold text-[var(--foreground)]">{v.plate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_mileage')}</span>
                    <p className="font-medium text-[var(--foreground)]">{v.mileage.toLocaleString()} km</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_color')} / {t('veh_engine')}</span>
                    <p className="text-[var(--muted)] text-xs">{v.color} • {v.engine_type}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('veh_next_service')}</span>
                    {nextService != null ? (
                      <p className={`font-semibold text-xs ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                        {nextService.toLocaleString()} km
                        <span className="block text-[10px] font-normal">
                          {isOverdue
                            ? `${Math.abs(remainingKm!).toLocaleString()} ${t('veh_km_overdue')}`
                            : `${remainingKm!.toLocaleString()} ${t('veh_km_remaining')}`}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[var(--muted)] text-xs">—</p>
                    )}
                  </div>
                </div>

                {/* Service Alert Badge if Overdue */}
                {isOverdue && (
                  <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{t('veh_service_due')}</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-[10px] text-[var(--muted)] font-mono truncate" title={v.vin}>{t('veh_vin')}: {v.vin}</p>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-[var(--muted)]">
            <p className="text-lg">{t('veh_no_found')}</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? t('veh_modal_edit') : t('veh_modal_new')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">{t('veh_owner')} *</label>
            <select name="customer_id" required defaultValue={editingVehicle?.customer_id || ''} className="w-full">
              <option value="">Selecionar cliente...</option>
              {customerList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Marca *</label>
              <input type="text" name="make" required defaultValue={editingVehicle?.make || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">Modelo *</label>
              <input type="text" name="model" required defaultValue={editingVehicle?.model || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">Ano *</label>
              <input type="number" name="year" required defaultValue={editingVehicle?.year || new Date().getFullYear()} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('veh_plate')} *</label>
              <input type="text" name="plate" required defaultValue={editingVehicle?.plate || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_vin')}</label>
              <input type="text" name="vin" defaultValue={editingVehicle?.vin || ''} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('veh_mileage')} (km)</label>
              <input type="number" name="mileage" defaultValue={editingVehicle?.mileage || 0} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_next_service')}</label>
              <input type="number" name="next_service_mileage" placeholder="ex: 100000" defaultValue={editingVehicle?.next_service_mileage ?? ''} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('veh_color')}</label>
              <input type="text" name="color" defaultValue={editingVehicle?.color || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('veh_engine')}</label>
              <input type="text" name="engine_type" defaultValue={editingVehicle?.engine_type || ''} className="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{editId ? t('save') : t('create')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
