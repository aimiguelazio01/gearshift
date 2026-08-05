'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import { parts, suppliers } from '@/lib/store';
import { matchesSearch, marginPercent, PART_CATEGORIES } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import type { Part, Supplier } from '@/lib/types';

export default function PartsPage() {
  const { t, formatCurrency } = useLanguage();
  const [list, setList] = useState<Part[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [adjustModal, setAdjustModal] = useState<string | null>(null);

  const reload = useCallback(() => {
    setList(parts.getAll());
    setSupplierList(suppliers.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = list.filter(p => {
    const matchSearch = matchesSearch(`${p.name} ${p.sku} ${p.category}`, search);
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    const matchStock =
      stockFilter === 'all' ? true :
      stockFilter === 'low' ? p.qty_on_hand <= p.reorder_threshold :
      p.qty_on_hand > p.reorder_threshold;
    return matchSearch && matchCategory && matchStock;
  });

  const lowStockCount = list.filter(p => p.qty_on_hand <= p.reorder_threshold).length;
  const totalValue = list.reduce((sum, p) => sum + p.qty_on_hand * p.cost_price, 0);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      sku: fd.get('sku') as string,
      name: fd.get('name') as string,
      description: fd.get('description') as string,
      category: fd.get('category') as string,
      supplier_id: fd.get('supplier_id') as string,
      cost_price: Number(fd.get('cost_price')),
      sale_price: Number(fd.get('sale_price')),
      qty_on_hand: Number(fd.get('qty_on_hand')),
      reorder_threshold: Number(fd.get('reorder_threshold')),
      location: fd.get('location') as string,
    };
    if (editId) {
      parts.update(editId, data);
    } else {
      parts.create(data);
    }
    setShowModal(false);
    setEditId(null);
    reload();
  };

  const handleAdjustStock = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustModal) return;
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get('qty'));
    const reason = fd.get('reason') as 'received' | 'adjusted' | 'returned';
    parts.adjustStock(adjustModal, qty, reason);
    setAdjustModal(null);
    reload();
  };

  const editingPart = editId ? list.find(p => p.id === editId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('parts_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {list.length} peças • {t('parts_value')}: {formatCurrency(totalValue)}
            {lowStockCount > 0 && (
              <span className="text-red-400 ml-2">• {lowStockCount} {t('parts_low_stock').toLowerCase()}</span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditId(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('parts_add_button')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t('parts_search_placeholder')} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-44">
          <option value="">{t('parts_all_categories')}</option>
          {PART_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as typeof stockFilter)} className="w-36">
          <option value="all">{t('parts_all_stock')}</option>
          <option value="low">{t('parts_low_stock')}</option>
          <option value="ok">{t('parts_in_stock')}</option>
        </select>
      </div>

      {/* Parts Table */}
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Peça</th>
              <th>{t('parts_sku')}</th>
              <th>{t('parts_category')}</th>
              <th className="text-right">{t('parts_cost')}</th>
              <th className="text-right">{t('parts_sale')}</th>
              <th className="text-right">{t('parts_margin')}</th>
              <th className="text-center">{t('parts_stock')}</th>
              <th>{t('parts_location')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isLow = p.qty_on_hand <= p.reorder_threshold;
              const margin = marginPercent(p.cost_price, p.sale_price);
              return (
                <tr key={p.id} className={isLow ? 'bg-red-500/5' : ''}>
                  <td>
                    <Link href={`/parts/${p.id}`} className="font-medium text-[var(--foreground)] hover:text-blue-400 transition-colors">
                      {p.name}
                    </Link>
                    {p.description && <p className="text-xs text-[var(--muted)] mt-0.5 max-w-[200px] truncate">{p.description}</p>}
                  </td>
                  <td className="font-mono text-xs text-[var(--muted)]">{p.sku}</td>
                  <td>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--hover)] text-[var(--muted)]">{p.category}</span>
                  </td>
                  <td className="text-right text-sm">{formatCurrency(p.cost_price)}</td>
                  <td className="text-right text-sm font-medium">{formatCurrency(p.sale_price)}</td>
                  <td className="text-right">
                    <span className={`text-xs font-semibold ${margin > 40 ? 'text-emerald-400' : margin > 20 ? 'text-amber-400' : 'text-red-400'}`}>
                      {margin.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => setAdjustModal(p.id)}
                      className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-lg transition-colors ${
                        isLow
                          ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                          : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                      }`}
                    >
                      {p.qty_on_hand}
                      {isLow && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 9v4M12 17h.01" />
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="text-xs text-[var(--muted)]">{p.location || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditId(p.id); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-[var(--muted)]">{t('parts_no_found')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Part Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? 'Editar Peça' : 'Nova Peça'} maxWidth="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('parts_sku')} *</label>
              <input type="text" name="sku" required defaultValue={editingPart?.sku || ''} className="w-full font-mono" />
            </div>
            <div>
              <label className="form-label">{t('parts_category')} *</label>
              <select name="category" required defaultValue={editingPart?.category || ''} className="w-full">
                <option value="">Selecionar...</option>
                {PART_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Nome *</label>
            <input type="text" name="name" required defaultValue={editingPart?.name || ''} className="w-full" />
          </div>
          <div>
            <label className="form-label">Descrição</label>
            <textarea name="description" rows={2} defaultValue={editingPart?.description || ''} className="w-full" />
          </div>
          <div>
            <label className="form-label">Fornecedor</label>
            <select name="supplier_id" defaultValue={editingPart?.supplier_id || ''} className="w-full">
              <option value="">Nenhum</option>
              {supplierList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('parts_cost')} (€) *</label>
              <input type="number" name="cost_price" step="0.01" required defaultValue={editingPart?.cost_price || ''} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('parts_sale')} (€) *</label>
              <input type="number" name="sale_price" step="0.01" required defaultValue={editingPart?.sale_price || ''} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Qtd Stock</label>
              <input type="number" name="qty_on_hand" defaultValue={editingPart?.qty_on_hand || 0} className="w-full" />
            </div>
            <div>
              <label className="form-label">Reencomendar a</label>
              <input type="number" name="reorder_threshold" defaultValue={editingPart?.reorder_threshold || 5} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('parts_location')}</label>
              <input type="text" name="location" defaultValue={editingPart?.location || ''} className="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{editId ? t('save') : t('create')}</button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={t('parts_adjust_stock')}>
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Stock atual: <strong className="text-[var(--foreground)]">{list.find(p => p.id === adjustModal)?.qty_on_hand ?? 0}</strong>
          </p>
          <div>
            <label className="form-label">{t('parts_qty_change')}</label>
            <input type="number" name="qty" required placeholder="+10 ou -5" className="w-full" />
            <p className="text-xs text-[var(--muted)] mt-1">Use números positivos para adicionar, negativos para subtrair</p>
          </div>
          <div>
            <label className="form-label">{t('parts_reason')}</label>
            <select name="reason" required className="w-full">
              <option value="received">{t('parts_reason_received')}</option>
              <option value="adjusted">{t('parts_reason_adjusted')}</option>
              <option value="returned">{t('parts_reason_returned')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAdjustModal(null)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('parts_adjust_stock')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
