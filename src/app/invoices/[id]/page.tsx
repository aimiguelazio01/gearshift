'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { invoices, workOrders, customers, vehicles, parts } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import type { Invoice, WorkOrder, Customer, Vehicle, Part } from '@/lib/types';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, formatCurrency, formatDate, formatDateTime } = useLanguage();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [partsList, setPartsList] = useState<Part[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  if (!invoice) {
    return <div className="text-center py-20 text-[var(--muted)]">Fatura não encontrada</div>;
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
                  <h1 className="text-lg font-bold text-[var(--foreground)]">AutoWorkshop</h1>
                  <p className="text-[10px] text-[var(--muted)]">Gestão de Oficina Automóvel</p>
                </div>
              </div>
              <div className="text-sm text-[var(--muted)] space-y-0.5">
                <p>Rua da Oficina 123</p>
                <p>Lisboa, Portugal</p>
                <p>geral@autoworkshop.pt</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">FATURA</h2>
              <p className="font-mono text-sm text-[var(--muted)] mt-1">FAT-{invoice.id.slice(0, 6).toUpperCase()}</p>
              <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                <p>Emitida: {formatDate(invoice.created_at)}</p>
                <p className={isOverdue ? 'text-red-400 font-semibold' : ''}>Vencimento: {formatDate(invoice.due_date)}</p>
              </div>
              <div className="mt-3">
                <StatusBadge status={invoice.status} type="invoice" />
                {isOverdue && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                    EM ATRASO
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
                  Veículo: {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.plate})
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
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Mão de Obra</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th className="text-right">Horas</th>
                        <th className="text-right">Taxa</th>
                        <th className="text-right">Valor</th>
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
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Peças</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Peça</th>
                        <th className="text-right">Qtd</th>
                        <th className="text-right">Preço</th>
                        <th className="text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wo.part_lines.map(line => {
                        const part = partsList.find(p => p.id === line.part_id);
                        return (
                          <tr key={line.id}>
                            <td>
                              <span className="text-sm">{part?.name || 'Desconhecido'}</span>
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
                <span className="text-[var(--muted)]">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">IVA (23%)</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg">{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Pago</span>
                    <span>-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-bold ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    <span>Saldo Pendente</span>
                    <span>{formatCurrency(balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Action */}
          {invoice.status !== 'Paid' && (
            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowPaymentModal(true)} className="btn-success">
                {t('inv_record_payment')}
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
            Saldo pendente: <strong className="text-red-400">{formatCurrency(balance)}</strong>
          </p>
          <div>
            <label className="form-label">{t('inv_amount')} *</label>
            <input type="number" name="amount" step="0.01" required max={balance} defaultValue={balance} className="w-full" />
          </div>
          <div>
            <label className="form-label">{t('inv_method')} *</label>
            <select name="method" required className="w-full">
              <option value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</option>
              <option value="Multibanco / MBWay">Multibanco / MBWay</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência Bancária">Transferência Bancária</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-success">{t('inv_record_payment')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
