'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import { users, workOrders, vehicles, customers } from '@/lib/store';
import { matchesSearch } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import type { User, UserRole, WorkOrder, Vehicle, Customer } from '@/lib/types';

const PRESET_SPECIALTIES = [
  'Mecânica Geral & Revisões',
  'Diagnóstico & Eletricidade',
  'Travões & Suspensão',
  'Motor & Transmissão',
  'Climatização & A/C',
  'Alinhamento & Pneus',
  'Carroçaria & Pintura',
  'Atendimento & Orçamentação',
];

export default function TeamPage() {
  const { t, lang, formatCurrency } = useLanguage();
  const { isAdmin, currentUser, usersList, switchUser, verifyAdminPin } = useAuth();

  const [teamList, setTeamList] = useState<User[]>([]);
  const [woList, setWoList] = useState<WorkOrder[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTechJobs, setSelectedTechJobs] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  // PIN Unlock State for non-admin screen
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const reload = useCallback(() => {
    setTeamList(users.getAll());
    setWoList(workOrders.getAll());
    setVehicleList(vehicles.getAll());
    setCustomerList(customers.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Calculations & KPIs
  const technicians = teamList.filter(u => u.role === 'Technician' && u.active !== false);
  const activeWOs = woList.filter(wo => !['Invoiced', 'Closed'].includes(wo.status));
  const avgHourlyRate = technicians.length > 0
    ? technicians.reduce((sum, t) => sum + (t.hourly_rate || 75), 0) / technicians.length
    : 0;

  // Filtered staff list
  const filtered = teamList.filter(member => {
    const matchSearch = matchesSearch(
      `${member.name} ${member.email} ${member.role} ${member.specialty || ''} ${member.phone || ''}`,
      search
    );
    const matchRole = roleFilter === 'all' || member.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? member.active !== false :
      member.active === false;

    return matchSearch && matchRole && matchStatus;
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const role = fd.get('role') as UserRole;
    const rateRaw = fd.get('hourly_rate');
    const hourlyRate = role === 'Technician' && rateRaw ? Number(rateRaw) : null;
    const active = fd.get('active') === 'true';

    const data = {
      name: (fd.get('name') as string).trim(),
      role,
      email: (fd.get('email') as string).trim(),
      phone: (fd.get('phone') as string).trim(),
      specialty: (fd.get('specialty') as string).trim(),
      hourly_rate: hourlyRate,
      active,
    };

    if (editingId) {
      users.update(editingId, data);
    } else {
      users.create(data);
    }

    setShowModal(false);
    setEditingId(null);
    reload();
  };

  const executeDelete = () => {
    if (!deleteTargetUser) return;
    users.delete(deleteTargetUser.id);
    if (editingId === deleteTargetUser.id) {
      setEditingId(null);
      setShowModal(false);
    }
    setDeleteTargetUser(null);
    reload();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (member: User) => {
    setEditingId(member.id);
    setShowModal(true);
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pinInput)) {
      setPinError(false);
      setPinInput('');
      const admin = usersList.find(u => u.role === 'Admin');
      if (admin) switchUser(admin.id);
    } else {
      setPinError(true);
    }
  };

  const editingMember = editingId ? teamList.find(u => u.id === editingId) : null;

  // ── Restricted Access Screen for Non-Admins ──
  if (!isAdmin) {
    const adminUser = usersList.find(u => u.role === 'Admin');
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6 border-amber-500/30 shadow-2xl shadow-amber-500/5">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
            👑
          </div>

          <div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              {lang === 'pt' ? 'Acesso Restrito' : 'Restricted Access'}
            </span>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-3">
              {lang === 'pt' ? 'Técnicos & Funcionários da Oficina' : 'Workshop Technicians & Staff'}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
              {lang === 'pt'
                ? 'Esta secção é confidencial e de acesso exclusivo ao Administrador da oficina (gestão de colaboradores, taxas horárias e funções).'
                : 'This section is confidential and restricted exclusively to the Workshop Administrator.'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-xs flex items-center justify-between">
            <span className="text-[var(--muted)]">{lang === 'pt' ? 'Utilizador atual:' : 'Current user:'}</span>
            <span className="font-semibold text-[var(--foreground)]">{currentUser?.name} ({currentUser?.role})</span>
          </div>

          <form onSubmit={handleUnlockPin} className="space-y-3 pt-2 text-left">
            <div>
              <label className="form-label text-xs">
                {lang === 'pt' ? 'Introduza o PIN de Administrador (Padrão: 1234)' : 'Enter Admin PIN Code (Default: 1234)'}
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(false); }}
                placeholder="••••"
                className="w-full text-center font-mono text-lg tracking-widest"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-400 mt-1 text-center font-semibold">
                  {lang === 'pt' ? '❌ PIN incorreto.' : '❌ Incorrect PIN.'}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-600/20"
            >
              {lang === 'pt' ? 'Desbloquear Acesso de Administrador' : 'Unlock Administrator Access'}
            </button>
          </form>

          {adminUser && (
            <div className="pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => switchUser(adminUser.id)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                {lang === 'pt' ? `👑 Entrar como ${adminUser.name} →` : `👑 Switch to ${adminUser.name} →`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Administrator View ──
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('team_title')}</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              👑 Admin Only
            </span>
          </div>
          <p className="text-sm text-[var(--muted)] mt-1">{t('team_subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t('team_add_button')}</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg">
              👥
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">{t('team_kpi_total')}</span>
              <p className="text-xl font-bold text-[var(--foreground)] mt-0.5">{teamList.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center text-lg">
              🔧
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">{t('team_kpi_technicians')}</span>
              <p className="text-xl font-bold text-[var(--foreground)] mt-0.5">{technicians.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg">
              💶
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">{t('team_kpi_avg_rate')}</span>
              <p className="text-xl font-bold text-[var(--foreground)] mt-0.5">{formatCurrency(avgHourlyRate)}/h</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-lg">
              📋
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">{t('team_kpi_assigned_wos')}</span>
              <p className="text-xl font-bold text-[var(--foreground)] mt-0.5">{activeWOs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t('team_search_placeholder')} />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
          className="w-44"
        >
          <option value="all">{t('team_all_roles')}</option>
          <option value="Technician">{t('team_role_technician')}</option>
          <option value="Service Advisor">{t('team_role_advisor')}</option>
          <option value="Admin">{t('team_role_admin')}</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-36"
        >
          <option value="all">{t('team_active_status')}: {t('all')}</option>
          <option value="active">{t('team_active')}</option>
          <option value="inactive">{t('team_inactive')}</option>
        </select>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(member => {
          const isActive = member.active !== false;
          const assignedWOs = activeWOs.filter(wo => wo.assigned_technician_id === member.id);

          const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
            'Technician': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
            'Service Advisor': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
            'Admin': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
          };
          const colors = roleColors[member.role] || roleColors['Technician'];

          return (
            <div
              key={member.id}
              className={`card group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border ${
                !isActive ? 'opacity-60 border-neutral-800 bg-neutral-950/40' : 'hover:border-blue-500/40'
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Header: Avatar, Name, Role & Action Buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base shrink-0 shadow-inner">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[var(--foreground)]">{member.name}</h3>
                        {!isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            {t('team_inactive')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {member.role === 'Technician' ? t('team_role_technician') :
                           member.role === 'Service Advisor' ? t('team_role_advisor') :
                           t('team_role_admin')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(member)}
                      className="p-2 rounded-xl bg-[var(--hover)] hover:bg-blue-500/20 text-[var(--muted)] hover:text-blue-400 border border-[var(--border)] transition-all"
                      title={t('edit')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTargetUser(member)}
                      className="p-2 rounded-xl bg-[var(--hover)] hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 border border-[var(--border)] transition-all"
                      title={t('delete')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 text-xs pt-2 border-t border-[var(--border)]">
                  {member.specialty && (
                    <div className="flex items-center gap-2 text-[var(--foreground)] font-medium">
                      <span className="text-[var(--muted)]">🎯</span>
                      <span className="truncate">{member.specialty}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <span>📧</span>
                    <span className="truncate">{member.email || '—'}</span>
                  </div>

                  {member.phone && (
                    <div className="flex items-center gap-2 text-[var(--muted)]">
                      <span>📱</span>
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Hourly Rate & Workload */}
                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <div>
                    {member.role === 'Technician' ? (
                      <div>
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider block">{t('rate')}</span>
                        <span className="font-bold text-sm text-[var(--foreground)]">
                          {formatCurrency(member.hourly_rate || 75)}/h
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)] italic">—</span>
                    )}
                  </div>

                  {member.role === 'Technician' && (
                    <div>
                      {assignedWOs.length > 0 ? (
                        <button
                          onClick={() => setSelectedTechJobs(member)}
                          className="px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold text-xs hover:bg-blue-500/25 transition-colors flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <span>{assignedWOs.length} OS {t('team_assigned_jobs').toLowerCase()}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--muted)] px-2 py-0.5 rounded-md bg-[var(--hover)]">
                          {t('team_no_assigned_jobs')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center card border-dashed border-2 p-8 text-[var(--muted)]">
            <div className="text-4xl mb-2">👷</div>
            <p className="text-base font-bold text-[var(--foreground)]">{t('team_no_members')}</p>
          </div>
        )}
      </div>

      {/* Create / Edit Staff Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? t('team_modal_edit') : t('team_modal_new')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">{t('team_name')} *</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={editingMember?.name || ''}
              placeholder="ex: João Silva"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('team_role')} *</label>
              <select name="role" required defaultValue={editingMember?.role || 'Technician'} className="w-full">
                <option value="Technician">{t('team_role_technician')}</option>
                <option value="Service Advisor">{t('team_role_advisor')}</option>
                <option value="Admin">{t('team_role_admin')}</option>
              </select>
            </div>

            <div>
              <label className="form-label">{t('team_hourly_rate')} (€)</label>
              <input
                type="number"
                name="hourly_rate"
                step="5"
                min="0"
                placeholder="ex: 75"
                defaultValue={editingMember?.hourly_rate ?? 75}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('team_email')}</label>
              <input
                type="email"
                name="email"
                defaultValue={editingMember?.email || ''}
                placeholder="nome@oficina.pt"
                className="w-full"
              />
            </div>
            <div>
              <label className="form-label">{t('team_phone')}</label>
              <input
                type="tel"
                name="phone"
                defaultValue={editingMember?.phone || ''}
                placeholder="+351 912 345 678"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="form-label">{t('team_specialty')}</label>
            <input
              type="text"
              name="specialty"
              list="specialty-presets"
              defaultValue={editingMember?.specialty || ''}
              placeholder="ex: Diagnóstico Eletrónico, Mecânica Geral"
              className="w-full"
            />
            <datalist id="specialty-presets">
              {PRESET_SPECIALTIES.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="form-label">{t('team_active_status')}</label>
            <select
              name="active"
              defaultValue={editingMember?.active !== false ? 'true' : 'false'}
              className="w-full"
            >
              <option value="true">{t('team_active')}</option>
              <option value="false">{t('team_inactive')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            {editingMember ? (
              <button
                type="button"
                onClick={() => setDeleteTargetUser(editingMember)}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs border border-red-500/20 transition-colors"
              >
                {t('delete')}
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowModal(false); setEditingId(null); }}
              >
                {t('cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? t('save') : t('create')}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        title={t('team_modal_edit')}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>

          <div>
            <h3 className="font-bold text-base text-[var(--foreground)]">
              {t('team_delete_confirm').split('?')[0]}?
            </h3>
            <p className="text-sm font-semibold text-blue-400 mt-1">
              {deleteTargetUser?.name} ({deleteTargetUser?.role})
            </p>
            <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
              Todas as ordens de serviço atualmente atribuídas a este funcionário ficarão sem técnico atribuído.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              className="btn-secondary text-xs px-4 py-2"
              onClick={() => setDeleteTargetUser(null)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={executeDelete}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
            >
              {t('delete')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Technician Jobs Modal */}
      <Modal
        open={!!selectedTechJobs}
        onClose={() => setSelectedTechJobs(null)}
        title={`${t('team_assigned_jobs')} — ${selectedTechJobs?.name || ''}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {selectedTechJobs && (
            <>
              {activeWOs.filter(wo => wo.assigned_technician_id === selectedTechJobs.id).length === 0 ? (
                <p className="text-sm text-center py-6 text-[var(--muted)]">{t('team_no_assigned_jobs')}</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {activeWOs
                    .filter(wo => wo.assigned_technician_id === selectedTechJobs.id)
                    .map(wo => {
                      const vehicle = vehicleList.find(v => v.id === wo.vehicle_id);
                      const customer = customerList.find(c => c.id === wo.customer_id);
                      return (
                        <Link
                          key={wo.id}
                          href={`/work-orders/${wo.id}`}
                          className="p-3.5 rounded-xl card hover:border-blue-500 flex items-center justify-between transition-colors block"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--foreground)]">
                                {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Veículo'}
                              </span>
                              <span className="font-mono text-xs text-[var(--muted)]">({vehicle?.plate})</span>
                            </div>
                            <p className="text-xs text-[var(--muted)] mt-1">
                              {customer?.name} • {wo.customer_notes.slice(0, 45)}...
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-blue-400 font-semibold">{t('btn_view_details')} →</span>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <button className="btn-secondary text-xs" onClick={() => setSelectedTechJobs(null)}>
              {t('btn_close')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
