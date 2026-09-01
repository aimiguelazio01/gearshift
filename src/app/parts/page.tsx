'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import AdminLockModal from '@/components/AdminLockModal';
import { parts, suppliers, partCategories } from '@/lib/store';
import { matchesSearch, marginPercent } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { translateCategory, translatePartName, translatePartDesc } from '@/lib/translations';
import type { Part, Supplier, StockMovement } from '@/lib/types';

export default function PartsPage() {
  const { t, lang, formatCurrency } = useLanguage();
  const { permissions, isTechnician } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'parts' | 'suppliers' | 'categories'>('parts');

  const [list, setList] = useState<Part[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);

  // Parts Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [adjustModal, setAdjustModal] = useState<string | null>(null);

  // Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'part' | 'supplier' | 'category';
    idOrName: string;
    displayName: string;
    count?: number;
  } | null>(null);

  // Auth Lock Modal
  const [showAuthLock, setShowAuthLock] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const reload = useCallback(() => {
    setList(parts.getAll());
    setSupplierList(suppliers.getAll());
    setCategoryList(partCategories.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Parts Filter ──
  const filtered = list.filter(p => {
    const translatedName = translatePartName(p.name, lang);
    const translatedCat = translateCategory(p.category, lang);
    const matchSearch = matchesSearch(`${p.name} ${translatedName} ${p.sku} ${p.category} ${translatedCat}`, search);
    const matchCategory = !categoryFilter || p.category === categoryFilter || translateCategory(p.category, 'en') === categoryFilter;
    const matchStock =
      stockFilter === 'all' ? true :
      stockFilter === 'low' ? p.qty_on_hand <= p.reorder_threshold :
      p.qty_on_hand > p.reorder_threshold;
    return matchSearch && matchCategory && matchStock;
  });

  const lowStockCount = list.filter(p => p.qty_on_hand <= p.reorder_threshold).length;
  const totalValue = list.reduce((sum, p) => sum + p.qty_on_hand * p.cost_price, 0);

  // ── Actions Handlers ──
  const handleOpenCreatePart = () => {
    if (permissions.canManagePartsCatalog) {
      setEditId(null);
      setShowModal(true);
    } else {
      setPendingAction(() => () => { setEditId(null); setShowModal(true); });
      setShowAuthLock(true);
    }
  };

  const handleOpenCreateSupplier = () => {
    if (permissions.canManagePartsCatalog) {
      setEditingSupplierId(null);
      setShowSupplierModal(true);
    } else {
      setPendingAction(() => () => { setEditingSupplierId(null); setShowSupplierModal(true); });
      setShowAuthLock(true);
    }
  };

  const handleOpenCreateCategory = () => {
    if (permissions.canManagePartsCatalog) {
      setNewCatName('');
      setShowCategoryModal(true);
    } else {
      setPendingAction(() => () => { setNewCatName(''); setShowCategoryModal(true); });
      setShowAuthLock(true);
    }
  };

  const handleSavePart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = (fd.get('category') as string).trim();

    if (category) {
      partCategories.create(category);
    }

    const data = {
      sku: (fd.get('sku') as string).trim(),
      name: (fd.get('name') as string).trim(),
      description: (fd.get('description') as string).trim(),
      category: category || 'Outros',
      supplier_id: fd.get('supplier_id') as string,
      cost_price: Number(fd.get('cost_price')),
      sale_price: Number(fd.get('sale_price')),
      qty_on_hand: Number(fd.get('qty_on_hand')),
      reorder_threshold: Number(fd.get('reorder_threshold')),
      location: (fd.get('location') as string).trim(),
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

  const openDeletePartConfirm = (p: Part) => {
    if (!permissions.canManagePartsCatalog) {
      setPendingAction(() => () => openDeletePartConfirm(p));
      setShowAuthLock(true);
      return;
    }
    setDeleteConfirm({
      type: 'part',
      idOrName: p.id,
      displayName: translatePartName(p.name, lang) || p.sku,
    });
  };

  const openEditPart = (p: Part) => {
    if (!permissions.canManagePartsCatalog) {
      setPendingAction(() => () => {
        setEditId(p.id);
        setShowModal(true);
      });
      setShowAuthLock(true);
      return;
    }
    setEditId(p.id);
    setShowModal(true);
  };

  const handleAdjust = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustModal) return;
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get('qty_change'));
    const reason = fd.get('reason') as StockMovement['reason'];
    parts.adjustStock(adjustModal, qty, reason);
    setAdjustModal(null);
    reload();
  };

  // ── Supplier Handlers ──
  const handleSaveSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: (fd.get('name') as string).trim(),
      contact_info: (fd.get('contact_info') as string).trim(),
      lead_time_days: Number(fd.get('lead_time_days')) || 3,
    };

    if (editingSupplierId) {
      suppliers.update(editingSupplierId, data);
    } else {
      suppliers.create(data);
    }
    setShowSupplierModal(false);
    setEditingSupplierId(null);
    reload();
  };

  const openDeleteSupplierConfirm = (sup: Supplier) => {
    if (!permissions.canManagePartsCatalog) {
      setPendingAction(() => () => openDeleteSupplierConfirm(sup));
      setShowAuthLock(true);
      return;
    }
    const supParts = list.filter(p => p.supplier_id === sup.id);
    setDeleteConfirm({
      type: 'supplier',
      idOrName: sup.id,
      displayName: sup.name,
      count: supParts.length,
    });
  };

  // ── Category Handlers ──
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    partCategories.create(trimmed);
    setNewCatName('');
    setShowCategoryModal(false);
    reload();
  };

  const openDeleteCategoryConfirm = (catName: string) => {
    if (!permissions.canManagePartsCatalog) {
      setPendingAction(() => () => openDeleteCategoryConfirm(catName));
      setShowAuthLock(true);
      return;
    }
    const catParts = list.filter(p => p.category === catName || translateCategory(p.category, 'en') === catName);
    setDeleteConfirm({
      type: 'category',
      idOrName: catName,
      displayName: translateCategory(catName, lang),
      count: catParts.length,
    });
  };

  // ── Confirm Delete Action ──
  const handleExecuteDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'part') {
      parts.delete(deleteConfirm.idOrName);
      if (showModal) {
        setShowModal(false);
        setEditId(null);
      }
    } else if (deleteConfirm.type === 'supplier') {
      // Unlink parts using this supplier
      const linkedParts = list.filter(p => p.supplier_id === deleteConfirm.idOrName);
      linkedParts.forEach(p => {
        parts.update(p.id, { supplier_id: '' });
      });
      suppliers.delete(deleteConfirm.idOrName);
      if (showSupplierModal) {
        setShowSupplierModal(false);
        setEditingSupplierId(null);
      }
    } else if (deleteConfirm.type === 'category') {
      // Reassign parts using this category to 'Outros'
      const linkedParts = list.filter(p => p.category === deleteConfirm.idOrName);
      linkedParts.forEach(p => {
        parts.update(p.id, { category: 'Outros' });
      });
      partCategories.delete(deleteConfirm.idOrName);
    }

    setDeleteConfirm(null);
    reload();
  };

  const editingPart = editId ? list.find(p => p.id === editId) : null;
  const adjustingPart = adjustModal ? list.find(p => p.id === adjustModal) : null;
  const editingSupplier = editingSupplierId ? supplierList.find(s => s.id === editingSupplierId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Role Notice Banner for Technicians */}
      {isTechnician && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📦</span>
            <span className="text-cyan-300 font-medium">
              {lang === 'pt'
                ? `Perfil Técnico: Modo de consulta técnica e registo de saídas de peças. Os preços de custo e venda são confidenciais e reservados à Administração/Consultores.`
                : `Technician Profile: Technical view & stock adjustment mode. Cost and sale prices are confidential and restricted to Administration & Advisors.`}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('parts_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {list.length} {t('parts_in_catalog')} • {supplierList.length} {t('parts_tab_suppliers').toLowerCase()} • {categoryList.length} {t('parts_tab_categories').toLowerCase()}
            {!isTechnician && (
              <>
                {' • '}
                {t('parts_inventory_value')}: <span className="text-[var(--foreground)] font-semibold">{formatCurrency(totalValue)}</span>
              </>
            )}
            {lowStockCount > 0 && (
              <span className="text-amber-400 font-medium ml-2">• {lowStockCount} {t('parts_low_stock_badge')}</span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenCreateCategory}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 hover:border-blue-500/40"
            title={t('parts_add_category')}
          >
            <span>🏷️</span>
            <span>+ {lang === 'pt' ? 'Criar Categoria' : 'New Category'}</span>
          </button>
          <button
            onClick={handleOpenCreateSupplier}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 hover:border-blue-500/40"
            title={t('parts_add_supplier')}
          >
            <span>🏭</span>
            <span>+ {lang === 'pt' ? 'Criar Fornecedor' : 'New Supplier'}</span>
          </button>
          <button
            onClick={handleOpenCreatePart}
            className="btn-primary text-xs flex items-center gap-2 py-2 px-3.5 shadow-lg shadow-blue-500/20"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t('parts_add_button')}</span>
            {!permissions.canManagePartsCatalog && <span className="text-[10px] opacity-75">🔒</span>}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[var(--border)] gap-2">
        <button
          onClick={() => setActiveTab('parts')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'parts'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <span>📦</span>
          <span>{t('parts_tab_parts')}</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--hover)] text-[10px] text-[var(--muted)] font-mono">
            {list.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <span>🏭</span>
          <span>{t('parts_tab_suppliers')}</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--hover)] text-[10px] text-[var(--muted)] font-mono">
            {supplierList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <span>🏷️</span>
          <span>{t('parts_tab_categories')}</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--hover)] text-[10px] text-[var(--muted)] font-mono">
            {categoryList.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: Parts Catalog ── */}
      {activeTab === 'parts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} placeholder={t('parts_search_placeholder')} />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-48"
            >
              <option value="">{t('parts_all_categories')}</option>
              {categoryList.map(c => (
                <option key={c} value={c}>{translateCategory(c, lang)}</option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
              className="w-40"
            >
              <option value="all">{t('parts_all_stock')}</option>
              <option value="low">{t('parts_low_stock')}</option>
              <option value="ok">{t('parts_in_stock')}</option>
            </select>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('sku')}</th>
                  <th>{t('parts_name')}</th>
                  <th>{t('parts_category')}</th>
                  <th>{t('location')}</th>
                  {!isTechnician && (
                    <>
                      <th className="text-right">{t('cost')}</th>
                      <th className="text-right">{t('parts_sale_price')}</th>
                      <th className="text-right">{t('parts_margin')}</th>
                    </>
                  )}
                  <th className="text-center">{t('parts_stock')}</th>
                  <th className="text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isLow = p.qty_on_hand <= p.reorder_threshold;
                  const margin = marginPercent(p.cost_price, p.sale_price);
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs font-semibold">{p.sku}</td>
                      <td>
                        <Link href={`/parts/${p.id}`} className="font-medium text-[var(--foreground)] hover:text-blue-400 transition-colors">
                          {translatePartName(p.name, lang)}
                        </Link>
                        <div className="text-xs text-[var(--muted)] truncate max-w-[200px]">{translatePartDesc(p.description, lang)}</div>
                      </td>
                      <td>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--hover)] text-[var(--muted)]">
                          {translateCategory(p.category, lang)}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-[var(--muted)]">{p.location}</td>
                      {!isTechnician && (
                        <>
                          <td className="text-right text-sm text-[var(--muted)]">{formatCurrency(p.cost_price)}</td>
                          <td className="text-right text-sm font-semibold">{formatCurrency(p.sale_price)}</td>
                          <td className="text-right text-xs">
                            <span className={`font-semibold ${margin >= 40 ? 'text-emerald-400' : margin >= 20 ? 'text-blue-400' : 'text-amber-400'}`}>
                              {margin.toFixed(0)}%
                            </span>
                          </td>
                        </>
                      )}
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isLow ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {p.qty_on_hand}
                          {isLow && <span className="text-[10px]">⚠️</span>}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setAdjustModal(p.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-blue-400 transition-colors"
                            title={t('parts_adjust_stock')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                          </button>
                          <button
                            onClick={() => openEditPart(p)}
                            className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            title={t('edit')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button
                            onClick={() => openDeletePartConfirm(p)}
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
                    <td colSpan={isTechnician ? 6 : 9} className="text-center py-12 text-[var(--muted)]">
                      {t('parts_no_parts')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Suppliers ── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--foreground)]">
              {lang === 'pt' ? 'Lista de Fornecedores Registados' : 'Registered Suppliers'} ({supplierList.length})
            </h2>
            <button
              onClick={handleOpenCreateSupplier}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <span>+</span>
              <span>{lang === 'pt' ? 'Novo Fornecedor' : 'Add Supplier'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {supplierList.map(sup => {
              const supParts = list.filter(p => p.supplier_id === sup.id);
              return (
                <div key={sup.id} className="card p-5 space-y-3 hover:border-blue-500/40 transition-colors relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-[var(--foreground)]">{sup.name}</h3>
                      <p className="text-xs text-[var(--muted)] mt-1">{sup.contact_info || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingSupplierId(sup.id); setShowSupplierModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-blue-400 transition-colors"
                        title={t('edit')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => openDeleteSupplierConfirm(sup)}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors"
                        title={lang === 'pt' ? 'Eliminar Fornecedor' : 'Delete Supplier'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">
                      🚚 {t('parts_lead_time')}: <strong className="text-[var(--foreground)]">{sup.lead_time_days} {t('parts_days')}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-semibold">
                      {supParts.length} {t('parts_title').toLowerCase()}
                    </span>
                  </div>
                </div>
              );
            })}

            {supplierList.length === 0 && (
              <div className="col-span-full py-12 text-center card border-dashed border-2 text-[var(--muted)] space-y-3">
                <p className="text-sm font-semibold">{t('parts_no_suppliers')}</p>
                <button onClick={handleOpenCreateSupplier} className="btn-secondary text-xs">
                  + {lang === 'pt' ? 'Criar Primeiro Fornecedor' : 'Create First Supplier'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Categories ── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--foreground)]">
              {lang === 'pt' ? 'Categorias de Peças Disponíveis' : 'Part Categories'} ({categoryList.length})
            </h2>
            <button
              onClick={handleOpenCreateCategory}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <span>+</span>
              <span>{lang === 'pt' ? 'Nova Categoria' : 'Add Category'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryList.map(cat => {
              const catParts = list.filter(p => p.category === cat || translateCategory(p.category, 'en') === cat);
              return (
                <div key={cat} className="card p-4 flex items-center justify-between hover:border-blue-500/40 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--foreground)]">{translateCategory(cat, lang)}</h4>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{catParts.length} {t('parts_title').toLowerCase()}</p>
                  </div>
                  <button
                    onClick={() => openDeleteCategoryConfirm(cat)}
                    className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors"
                    title={lang === 'pt' ? `Eliminar categoria ${cat}` : `Delete category ${cat}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Part Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? t('parts_modal_edit') : t('parts_modal_new')} maxWidth="max-w-xl">
        <form onSubmit={handleSavePart} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('sku')} *</label>
              <input type="text" name="sku" required defaultValue={editingPart?.sku || ''} className="w-full uppercase font-mono" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">{t('parts_category')} *</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold"
                >
                  + {t('parts_add_category')}
                </button>
              </div>
              <input
                type="text"
                name="category"
                list="part-category-list"
                required
                defaultValue={editingPart?.category || 'Travões'}
                placeholder="ex: Travões, Filtros..."
                className="w-full"
              />
              <datalist id="part-category-list">
                {categoryList.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="form-label">{t('parts_name')} *</label>
            <input type="text" name="name" required defaultValue={editingPart ? translatePartName(editingPart.name, lang) : ''} className="w-full" />
          </div>

          <div>
            <label className="form-label">{t('description')}</label>
            <textarea name="description" rows={2} defaultValue={editingPart ? translatePartDesc(editingPart.description, lang) : ''} className="w-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">{t('parts_supplier')}</label>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold"
                >
                  + {t('parts_add_supplier')}
                </button>
              </div>
              <select name="supplier_id" defaultValue={editingPart?.supplier_id || ''} className="w-full">
                <option value="">{t('parts_select_supplier')}</option>
                {supplierList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{t('location')}</label>
              <input type="text" name="location" defaultValue={editingPart?.location || 'A1-01'} className="w-full font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="form-label">{t('cost')} (€) *</label>
              <input type="number" step="0.01" name="cost_price" required defaultValue={editingPart?.cost_price || 0} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('parts_sale_price')} (€) *</label>
              <input type="number" step="0.01" name="sale_price" required defaultValue={editingPart?.sale_price || 0} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('parts_stock')} *</label>
              <input type="number" name="qty_on_hand" required defaultValue={editingPart?.qty_on_hand || 0} className="w-full" />
            </div>
            <div>
              <label className="form-label">{t('parts_min_threshold')}</label>
              <input type="number" name="reorder_threshold" defaultValue={editingPart?.reorder_threshold || 5} className="w-full" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            {editingPart ? (
              <button
                type="button"
                className="btn-danger text-xs py-2 px-3"
                onClick={() => openDeletePartConfirm(editingPart)}
              >
                🗑️ {t('delete')}
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>{t('cancel')}</button>
              <button type="submit" className="btn-primary">{editId ? t('save') : t('create')}</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Supplier Modal */}
      <Modal
        open={showSupplierModal}
        onClose={() => { setShowSupplierModal(false); setEditingSupplierId(null); }}
        title={editingSupplierId ? t('parts_manage_suppliers') : t('parts_add_supplier')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="form-label">{t('parts_supplier_name')} *</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={editingSupplier?.name || ''}
              placeholder="ex: AutoPeças Norte, Lda"
              className="w-full"
            />
          </div>

          <div>
            <label className="form-label">{t('parts_supplier_contact')}</label>
            <input
              type="text"
              name="contact_info"
              defaultValue={editingSupplier?.contact_info || ''}
              placeholder="encomendas@autopecas.pt | +351 220 000 000"
              className="w-full"
            />
          </div>

          <div>
            <label className="form-label">{t('parts_supplier_lead_time')}</label>
            <input
              type="number"
              name="lead_time_days"
              min="1"
              max="90"
              defaultValue={editingSupplier?.lead_time_days || 3}
              className="w-full"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            {editingSupplier ? (
              <button
                type="button"
                className="btn-danger text-xs py-2 px-3"
                onClick={() => openDeleteSupplierConfirm(editingSupplier)}
              >
                🗑️ {t('delete')}
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowSupplierModal(false); setEditingSupplierId(null); }}
              >
                {t('cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {editingSupplierId ? t('save') : t('create')}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        open={showCategoryModal}
        onClose={() => { setShowCategoryModal(false); setNewCatName(''); }}
        title={t('parts_add_category')}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="form-label">{t('parts_category_name')} *</label>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              required
              placeholder="ex: Iluminação & Óticas"
              className="w-full"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setShowCategoryModal(false); setNewCatName(''); }}
            >
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`${t('parts_adjust_stock')} — ${adjustingPart ? translatePartName(adjustingPart.name, lang) : ''}`}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            {t('parts_current_stock')}: <span className="text-[var(--foreground)] font-bold">{adjustingPart?.qty_on_hand}</span> {t('parts_units')}
          </p>
          <div>
            <label className="form-label">{t('parts_qty_change')} (+/-) *</label>
            <input type="number" name="qty_change" required placeholder="ex: +10 ou -2" className="w-full font-mono" />
          </div>
          <div>
            <label className="form-label">{t('parts_adjust_reason')} *</label>
            <input type="text" name="reason" required placeholder={t('parts_adjust_reason_ph')} className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAdjustModal(null)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>

      {/* In-App Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={lang === 'pt' ? '⚠️ Confirmar Eliminação' : '⚠️ Confirm Deletion'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 space-y-2">
            <p className="text-sm font-semibold text-red-200">
              {deleteConfirm?.type === 'supplier' && (lang === 'pt'
                ? `Tem a certeza de que deseja eliminar o fornecedor "${deleteConfirm.displayName}"?`
                : `Are you sure you want to delete supplier "${deleteConfirm.displayName}"?`)}
              {deleteConfirm?.type === 'category' && (lang === 'pt'
                ? `Tem a certeza de que deseja eliminar a categoria "${deleteConfirm.displayName}"?`
                : `Are you sure you want to delete category "${deleteConfirm.displayName}"?`)}
              {deleteConfirm?.type === 'part' && (lang === 'pt'
                ? `Tem a certeza de que deseja eliminar a peça "${deleteConfirm.displayName}" do inventário?`
                : `Are you sure you want to delete part "${deleteConfirm.displayName}"?`)}
            </p>
            {deleteConfirm?.count !== undefined && deleteConfirm.count > 0 && (
              <p className="text-xs text-[var(--muted)]">
                {deleteConfirm.type === 'supplier' && (lang === 'pt'
                  ? `ℹ️ Existem ${deleteConfirm.count} peça(s) associadas que ficarão sem fornecedor atribuído.`
                  : `ℹ️ ${deleteConfirm.count} linked part(s) will be unlinked.`)}
                {deleteConfirm.type === 'category' && (lang === 'pt'
                  ? `ℹ️ Existem ${deleteConfirm.count} peça(s) nesta categoria que serão reatribuídas à categoria "Outros".`
                  : `ℹ️ ${deleteConfirm.count} linked part(s) will be reassigned to "Other".`)}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteConfirm(null)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn-danger font-bold flex items-center gap-1.5 py-2 px-4 shadow-lg shadow-red-500/20"
              onClick={handleExecuteDelete}
            >
              <span>🗑️</span>
              <span>{lang === 'pt' ? 'Eliminar Definitivamente' : 'Delete Permanently'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Auth Lock Modal */}
      <AdminLockModal
        open={showAuthLock}
        onClose={() => { setShowAuthLock(false); setPendingAction(null); }}
        actionTitle={lang === 'pt' ? 'Gestão de Peças & Catálogo (Apenas Administrativo/Admin)' : 'Parts Catalog Management (Advisor/Admin Only)'}
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
