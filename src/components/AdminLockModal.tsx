'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface AdminLockModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionTitle?: string;
}

export default function AdminLockModal({
  open,
  onClose,
  onSuccess,
  actionTitle,
}: AdminLockModalProps) {
  const { t, lang } = useLanguage();
  const { currentUser, usersList, switchUser, verifyAdminPin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const adminUsers = usersList.filter(u => u.role === 'Admin');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pin)) {
      setError(false);
      setPin('');
      // Switch to first admin user if current user is not admin
      const admin = adminUsers[0];
      if (admin && currentUser?.role !== 'Admin') {
        switchUser(admin.id);
      }
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(true);
    }
  };

  const handleSelectAdminUser = (adminId: string) => {
    switchUser(adminId);
    setError(false);
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Modal
      open={open}
      onClose={() => { setError(false); setPin(''); onClose(); }}
      title={lang === 'pt' ? '🔒 Controlo de Acesso de Administrador' : '🔒 Administrator Access Control'}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 py-1 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
          👑
        </div>

        <div>
          <h3 className="font-bold text-base text-[var(--foreground)]">
            {lang === 'pt' ? 'Permissão de Administrador Necessária' : 'Administrator Permission Required'}
          </h3>
          {actionTitle && (
            <p className="text-xs text-blue-400 font-semibold mt-0.5">
              {actionTitle}
            </p>
          )}
          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
            {lang === 'pt'
              ? 'Apenas o Administrador da oficina tem permissão para criar, editar ou eliminar Elevadores e Técnicos/Funcionários.'
              : 'Only the Workshop Administrator has permission to create, edit, or delete Lifts and Technicians/Staff.'}
          </p>
        </div>

        {/* Current Active User Banner */}
        <div className="p-3 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-xs flex items-center justify-between">
          <span className="text-[var(--muted)]">{lang === 'pt' ? 'Sessão atual:' : 'Current session:'}</span>
          <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
            <span>{currentUser?.name || 'Desconhecido'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
              {currentUser?.role || 'Utilizador'}
            </span>
          </span>
        </div>

        {/* Option 1: Enter Admin PIN (1234) */}
        <form onSubmit={handlePinSubmit} className="space-y-3 pt-2 text-left">
          <div>
            <label className="form-label text-xs">
              {lang === 'pt' ? 'Introduza o Código PIN de Administrador (Padrão: 1234)' : 'Enter Admin PIN Code (Default: 1234)'}
            </label>
            <input
              type="password"
              maxLength={8}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false); }}
              placeholder="••••"
              className="w-full text-center font-mono text-lg tracking-widest"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-400 mt-1 text-center font-semibold">
                {lang === 'pt' ? '❌ Código PIN incorreto.' : '❌ Incorrect PIN code.'}
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

        {/* Option 2: Switch to Admin Account directly */}
        {adminUsers.length > 0 && (
          <div className="pt-3 border-t border-[var(--border)] space-y-2">
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {lang === 'pt' ? 'Ou mude para um perfil de Administrador:' : 'Or switch to an Administrator profile:'}
            </p>
            <div className="flex flex-col gap-1.5">
              {adminUsers.map(admin => (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => handleSelectAdminUser(admin.id)}
                  className="p-2.5 rounded-xl bg-[var(--hover)] hover:bg-amber-500/15 hover:border-amber-500/30 border border-[var(--border)] flex items-center justify-between text-xs transition-all"
                >
                  <span className="font-semibold text-[var(--foreground)]">👑 {admin.name}</span>
                  <span className="text-[10px] text-amber-400 font-bold">{lang === 'pt' ? 'Mudar perfil →' : 'Switch →'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => { setError(false); setPin(''); onClose(); }}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
