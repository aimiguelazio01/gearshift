'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import AdminLockModal from '@/components/AdminLockModal';
import { customers, vehicles } from '@/lib/store';
import { matchesSearch, slugify } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const { t, lang, formatDate } = useLanguage();
  const { permissions, isTechnician, currentUser } = useAuth();
  const [list, setList] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [showAuthLock, setShowAuthLock] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const reload = useCallback(() => setList(customers.getAll()), []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = list.filter(c => {
    const matchSearch = matchesSearch(`${c.name} ${c.email} ${c.phone}`, search);
    const matchTag = !tagFilter || c.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const allTags = [...new Set(list.flatMap(c => c.tags))];

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
    const data = {
      name: fd.get('name') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string,
      address: fd.get('address') as string,
      notes: fd.get('notes') as string,
      tags: (fd.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
    };
    if (editId) {
      customers.update(editId, data);
    } else {
      customers.create(data);
    }
    setShowModal(false);
    setEditId(null);
    reload();
  };

  const handleDelete = (id: string) => {
    if (!permissions.canManageCustomersAndVehicles) {
      setPendingAction(() => () => {
        if (confirm(t('cust_delete_confirm') || t('confirm_delete'))) {
          customers.delete(id);
          reload();
        }
      });
      setShowAuthLock(true);
      return;
    }

    if (confirm(t('cust_delete_confirm') || t('confirm_delete'))) {
      customers.delete(id);
      reload();
    }
  };

  const openEdit = (c: Customer) => {
    if (!permissions.canManageCustomersAndVehicles) {
      setPendingAction(() => () => {
        setEditId(c.id);
        setShowModal(true);
      });
      setShowAuthLock(true);
      return;
    }
    setEditId(c.id);
    setShowModal(true);
  };

  const editingCustomer = editId ? list.find(c => c.id === editId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Role Notice Banner for Technicians */}
      {isTechnician && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">👤</span>
            <span className="text-cyan-300 font-medium">
              {lang === 'pt'
                ? `Perfil Técnico: Modo de consulta de fichas de clientes. A gestão cadastral de clientes é efetuada pela Administração e Consultores de Serviço.`
                : `Technician Profile: Customer records view mode. Customer registration is managed by Administration and Service Advisors.`}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('cust_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{list.length} {t('cust_total')}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary"
          title={!permissions.canManageCustomersAndVehicles ? (lang === 'pt' ? 'Apenas Administrativos e Administradores podem criar clientes' : 'Only Advisors and Admins can create customers') : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t('cust_add_button')}</span>
          {!permissions.canManageCustomersAndVehicles && <span className="text-[10px] opacity-75">🔒</span>}
        </button>
      </div>

      {/* Search & Tags */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t('cust_search_placeholder')} />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1.5 items-center overflow-x-auto pb-1">
            <button
              onClick={() => setTagFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!tagFilter ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]'}`}
            >
              {t('all')}
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tag === tagFilter ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('cust_name')}</th>
              <th>{t('cust_phone')}</th>
              <th>{t('cust_email')}</th>
              <th>{t('cust_vehicles')}</th>
              <th>{t('cust_tags')}</th>
              <th>{t('cust_since')}</th>
              <th className="text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const custVehicles = vehicles.getByCustomer(c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/customers/${c.id}`} className="font-semibold text-[var(--foreground)] hover:text-blue-400 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-sm text-[var(--muted)]">{c.phone}</td>
                  <td className="text-sm text-[var(--muted)]">{c.email || '—'}</td>
                  <td>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      {custVehicles.length} {t('nav_vehicles').toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-[var(--hover)] text-[var(--muted)]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-sm text-[var(--muted)]">{formatDate(c.created_at)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title={t('edit')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
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
                  {t('cust_no_customers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? t('cust_modal_edit') : t('cust_modal_new')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">{t('cust_name')} *</label>
            <input type="text" name="name" required defaultValue={editingCustomer?.name || ''} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('cust_phone')} *</label>
              <input type="tel" name="phone" required defaultValue={editingCustomer?.phone || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('cust_email')}</label>
              <input type="email" name="email" defaultValue={editingCustomer?.email || ''} className="w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">{t('cust_address')}</label>
            <input type="text" name="address" defaultValue={editingCustomer?.address || ''} className="w-full" />
          </div>
          <div>
            <label className="form-label">{t('cust_tags_comma')}</label>
            <input type="text" name="tags" defaultValue={editingCustomer?.tags.join(', ') || ''} placeholder="VIP, Regular, Frota" className="w-full" />
          </div>
          <div>
            <label className="form-label">{t('cust_notes')}</label>
            <textarea name="notes" rows={3} defaultValue={editingCustomer?.notes || ''} className="w-full" />
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
        actionTitle={lang === 'pt' ? 'Gestão de Clientes (Apenas Administrativo/Admin)' : 'Customer Management (Advisor/Admin Only)'}
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
