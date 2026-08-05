'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import { customers, vehicles } from '@/lib/store';
import { matchesSearch, slugify } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const { t, formatDate } = useLanguage();
  const [list, setList] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const reload = useCallback(() => setList(customers.getAll()), []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = list.filter(c => {
    const matchSearch = matchesSearch(`${c.name} ${c.email} ${c.phone}`, search);
    const matchTag = !tagFilter || c.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const allTags = [...new Set(list.flatMap(c => c.tags))];

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
    if (confirm(t('confirm_delete'))) {
      customers.delete(id);
      reload();
    }
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setShowModal(true);
  };

  const editingCustomer = editId ? list.find(c => c.id === editId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('cust_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{list.length} {t('cust_registered')}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditId(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('cust_add_button')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t('cust_search_placeholder')} />
        </div>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="w-40">
            <option value="">{t('cust_all_tags')}</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => {
          const vehicleCount = vehicles.getByCustomer(c.id).length;
          return (
            <div key={c.id} className="card group hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/customers/${slugify(c.name)}`} className="font-semibold text-[var(--foreground)] hover:text-blue-400 transition-colors">
                        {c.name}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">{c.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)]" title={t('edit')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400" title={t('delete')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    {c.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" /></svg>
                    {vehicleCount} {t('cust_vehicles_count')}
                  </div>
                </div>

                {c.tags.length > 0 && (
                  <div className="mt-3 flex gap-1.5 flex-wrap">
                    {c.tags.map(tag => (
                      <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        tag === 'VIP' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                        tag === 'Fleet' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                        'bg-gray-500/15 text-gray-400 border border-gray-500/25'
                      }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                  {t('cust_added_date')} {formatDate(c.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-[var(--muted)]">
            <p className="text-lg">{t('cust_no_found')}</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? t('cust_modal_edit') : t('cust_modal_new')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">{t('cust_name')} *</label>
            <input type="text" name="name" required defaultValue={editingCustomer?.name || ''} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('cust_phone')}</label>
              <input type="tel" name="phone" defaultValue={editingCustomer?.phone || ''} className="w-full" />
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
            <label className="form-label">{t('cust_tags')}</label>
            <input type="text" name="tags" placeholder="VIP, Fleet" defaultValue={editingCustomer?.tags.join(', ') || ''} className="w-full" />
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
    </div>
  );
}
