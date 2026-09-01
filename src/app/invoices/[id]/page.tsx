'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import AdminLockModal from '@/components/AdminLockModal';
import { invoices, workOrders, customers, vehicles, parts } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { translatePartName } from '@/lib/translations';
import type { Invoice, WorkOrder, Customer, Vehicle, Part } from '@/lib/types';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, formatCurrency, formatDate, formatDateTime } = useLanguage();
  const { permissions, isTechnician, currentUser, usersList, switchUser, verifyAdminPin } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [partsList, setPartsList] = useState<Part[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAuthLock, setShowAuthLock] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const reload = useCallback(() => {
    const inv = invoices.getById(id);
    if (inv) {
      setInvoice(inv);
      const order = workOrders.getById(inv.work_order_id);
      setWo(order || null);
      if (order) {
        setCustomer(customers.getById(order.customer_id) || null);
        setVehicle(vehicles.getById(order.vehicle_id) || null);
      }
      setPartsList(parts.getAll());
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

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

  if (isTechnician) {
    const adminUser = usersList.find(u => u.role === 'Admin');
    const advisorUser = usersList.find(u => u.role === 'Service Advisor');

    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6 border-indigo-500/30 shadow-2xl shadow-indigo-500/5">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
            💳
          </div>

          <div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              {lang === 'pt' ? 'Acesso Restrito' : 'Restricted Access'}
            </span>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-3">
              {lang === 'pt' ? 'Faturação & Pagamentos' : 'Invoices & Payments'}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
              {lang === 'pt'
                ? 'Os mecânicos e técnicos não têm acesso aos detalhes das faturas ou pagamentos. Esta secção é de uso exclusivo da Administração e Receção.'
                : 'Technicians do not have access to invoice details. This section is restricted to Administration and Service Advisors.'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-xs flex items-center justify-between">
            <span className="text-[var(--muted)]">{lang === 'pt' ? 'Utilizador atual:' : 'Current user:'}</span>
            <span className="font-semibold text-[var(--foreground)]">{currentUser?.name} ({currentUser?.role})</span>
          </div>

          <form onSubmit={handleUnlockPin} className="space-y-3 pt-2 text-left">
            <div>
              <label className="form-label text-xs">
                {lang === 'pt' ? 'Introduza o PIN de Administrador (Padrão: 1234)' : 'Enter Admin PIN (Default: 1234)'}
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
              className="btn-primary w-full py-2.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white shadow-lg shadow-indigo-600/20"
            >
              {lang === 'pt' ? 'Desbloquear Acesso' : 'Unlock Access'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
            {advisorUser && (
              <button
                type="button"
                onClick={() => switchUser(advisorUser.id)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold block w-full text-center"
              >
                {lang === 'pt' ? `📋 Entrar como ${advisorUser.name} (Consultor) →` : `📋 Switch to ${advisorUser.name} →`}
              </button>
            )}
            {adminUser && (
              <button
                type="button"
                onClick={() => switchUser(adminUser.id)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold block w-full text-center"
              >
                {lang === 'pt' ? `👑 Entrar como ${adminUser.name} (Admin) →` : `👑 Switch to ${adminUser.name} →`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-center py-20 text-[var(--muted)]">{t('inv_not_found')}</div>;
  }

  const balance = invoice.total - invoice.paid_amount;
  const isOverdue = invoice.status !== 'Paid' && new Date(invoice.due_date) < new Date();

  const handleAddPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const method = fd.get('method') as string;
    invoices.addPayment(id, amount, method);
    setShowPaymentModal(false);
    reload();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/invoices" className="hover:text-blue-400 transition-colors">{t('inv_title')}</Link>
        <span>›</span>
        <span className="text-[var(--foreground)]">FAT-{invoice.id.slice(0, 6).toUpperCase()}</span>
      </div>

      {/* Invoice Document */}
      <div className="card max-w-4xl mx-auto">
        {/* Header */}
        <div className="p-8 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[var(--foreground)]">GEARSHIFT AUTOMOTIVE</h1>
                  <p className="text-[10px] text-[var(--muted)]">{t('nav_system_subtitle')}</p>
                </div>
              </div>
              <div className="text-sm text-[var(--muted)] space-y-0.5">
                <p>Rua da Oficina 123</p>
                <p>Lisboa, Portugal</p>
                <p>geral@gearshift.pt</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">{t('inv_invoice_header')}</h2>
              <p className="font-mono text-sm text-[var(--muted)] mt-1">FAT-{invoice.id.slice(0, 6).toUpperCase()}</p>
              <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                <p>{t('inv_issued_date')}: {formatDate(invoice.created_at)}</p>
                <p className={isOverdue ? 'text-red-400 font-semibold' : ''}>{t('inv_due_date_label')}: {formatDate(invoice.due_date)}</p>
              </div>
              <div className="mt-3">
                <StatusBadge status={invoice.status} type="invoice" />
                {isOverdue && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold uppercase">
                    {t('invoice_overdue')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          {customer && (
            <div className="mt-6 p-4 rounded-xl bg-[var(--hover)]">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{t('inv_bill_to')}</p>
              <p className="font-semibold text-[var(--foreground)]">{customer.name}</p>
              <p className="text-sm text-[var(--muted)]">{customer.address}</p>
              <p className="text-sm text-[var(--muted)]">{customer.email} • {customer.phone}</p>
              {vehicle && (
                <p className="text-sm text-[var(--muted)] mt-1">
                  {t('veh_title')}: {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.plate})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="p-8">
          {wo && (
            <>
              {/* Labor */}
              {wo.labor_lines.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">{t('wo_labor_lines')}</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('description')}</th>
                        <th className="text-right">{t('hours')}</th>
                        <th className="text-right">{t('rate')}</th>
                        <th className="text-right">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wo.labor_lines.map(line => (
                        <tr key={line.id}>
                          <td className="text-sm">{line.description}</td>
                          <td className="text-right text-sm">{line.hours}</td>
                          <td className="text-right text-sm">{formatCurrency(line.rate)}</td>
                          <td className="text-right text-sm font-medium">{formatCurrency(line.hours * line.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Parts */}
              {wo.part_lines.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">{t('wo_parts_used')}</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('parts_name')}</th>
                        <th className="text-right">{t('quantity')}</th>
                        <th className="text-right">{t('parts_sale')}</th>
                        <th className="text-right">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wo.part_lines.map(line => {
                        const part = partsList.find(p => p.id === line.part_id);
                        return (
                          <tr key={line.id}>
                            <td>
                              <span className="text-sm">{part ? translatePartName(part.name, lang) : t('unknown')}</span>
                              <span className="text-xs text-[var(--muted)] ml-2">{part?.sku}</span>
                            </td>
                            <td className="text-right text-sm">{line.qty}</td>
                            <td className="text-right text-sm">{formatCurrency(line.unit_price)}</td>
                            <td className="text-right text-sm font-medium">{formatCurrency(line.qty * line.unit_price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">{t('wo_subtotal')}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">{t('inv_tax')}</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2">
                <span className="font-bold text-lg">{t('total')}</span>
                <span className="font-bold text-lg">{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>{t('status_paid')}</span>
                    <span>-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-bold ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    <span>{t('inv_pending_balance')}</span>
                    <span>{formatCurrency(balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Action */}
          {invoice.status !== 'Paid' && (
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => {
                  if (permissions.canManageInvoices) {
                    setShowPaymentModal(true);
                  } else {
                    setPendingAction(() => () => setShowPaymentModal(true));
                    setShowAuthLock(true);
                  }
                }}
                className="btn-success"
              >
                {t('inv_record_payment')}
                {!permissions.canManageInvoices && <span className="text-[10px] ml-1.5 opacity-75">🔒</span>}
              </button>
            </div>
          )}
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div className="border-t border-[var(--border)] p-8">
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">{t('inv_payment_history')}</h3>
            <div className="space-y-2">
              {invoice.payments.map(pay => (
                <div key={pay.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--hover)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pay.method}</p>
                      <p className="text-xs text-[var(--muted)]">{formatDateTime(pay.paid_at)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-400">{formatCurrency(pay.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={t('inv_record_payment')}>
        <form onSubmit={handleAddPayment} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            {t('inv_pending_balance')}: <strong className="text-red-400">{formatCurrency(balance)}</strong>
          </p>
          <div>
            <label className="form-label">{t('inv_amount')} *</label>
            <input type="number" name="amount" step="0.01" required max={balance} defaultValue={balance} className="w-full" />
          </div>
          <div>
            <label className="form-label">{t('inv_method')} *</label>
            <select name="method" required className="w-full">
              <option value="Cartão de Crédito/Débito">{t('inv_method_card')}</option>
              <option value="Multibanco / MBWay">{t('inv_method_mb')}</option>
              <option value="Dinheiro">{t('inv_method_cash')}</option>
              <option value="Transferência Bancária">{t('inv_method_transfer')}</option>
              <option value="Cheque">{t('inv_method_check')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-success">{t('inv_record_payment')}</button>
          </div>
        </form>
      </Modal>

      {/* Auth Lock Modal */}
      <AdminLockModal
        open={showAuthLock}
        onClose={() => { setShowAuthLock(false); setPendingAction(null); }}
        actionTitle={lang === 'pt' ? 'Registar Pagamento (Apenas Administrativo/Admin)' : 'Record Payment (Advisor/Admin Only)'}
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
