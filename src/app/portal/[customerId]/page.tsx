'use client';

import { useEffect, useState, useCallback, use } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { customers, vehicles, workOrders, users } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import type { Customer, Vehicle, WorkOrder, User } from '@/lib/types';

export default function CustomerPortalPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params);
  const { t, lang, setLang, formatCurrency, formatDate } = useLanguage();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [customerWOs, setCustomerWOs] = useState<WorkOrder[]>([]);
  const [userList, setUserList] = useState<User[]>([]);

  // Collapse / Expand State for Work Order Cards
  const [expandedWOIds, setExpandedWOIds] = useState<Record<string, boolean>>({});

  const reload = useCallback(() => {
    const cust = customers.getByIdOrSlug(customerId);
    if (cust) {
      setCustomer(cust);
      setCustomerVehicles(vehicles.getByCustomer(cust.id));
      const wos = workOrders.getAll().filter(w => w.customer_id === cust.id);
      setCustomerWOs(wos);
      setUserList(users.getAll());

      // Expand active work orders by default
      const initialExpanded: Record<string, boolean> = {};
      wos.forEach(w => {
        if (!['Invoiced', 'Closed'].includes(w.status)) {
          initialExpanded[w.id] = true;
        }
      });
      setExpandedWOIds(initialExpanded);
    }
  }, [customerId]);

  useEffect(() => { reload(); }, [reload]);

  const toggleExpand = (woId: string) => {
    setExpandedWOIds(prev => ({ ...prev, [woId]: !prev[woId] }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    customerWOs.forEach(w => { next[w.id] = expand; });
    setExpandedWOIds(next);
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-3">
          <div className="text-4xl">🚘</div>
          <h2 className="text-lg font-bold">Cliente não encontrado</h2>
          <p className="text-xs text-neutral-400">Verifique o link de acesso ao portal do cliente.</p>
        </div>
      </div>
    );
  }

  // Active work orders first, then past ones
  const activeWOs = customerWOs.filter(w => !['Invoiced', 'Closed'].includes(w.status));
  const pastWOs = customerWOs.filter(w => ['Invoiced', 'Closed'].includes(w.status));
  const allExpanded = customerWOs.length > 0 && customerWOs.every(w => expandedWOIds[w.id]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-2 sm:p-4 relative overflow-hidden">
      {/* Background Watermark Logo for Client App */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/Logo_transp.png')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center 40%',
          backgroundSize: '550px auto',
          opacity: 0.15,
        }}
      />

      {/* Mobile Screen App Frame — Pure Grayscale Chrome Layout */}
      <div className="w-full max-w-md sm:max-w-lg mx-auto min-h-[90vh] bg-neutral-900/90 backdrop-blur-2xl border border-neutral-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-0 sm:my-4 transition-all duration-300 relative z-10">

        {/* App Bar Header with GEARSHIFT AUTOMOTIVE Branding */}
        <header className="bg-neutral-950 p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Logo_transp.png"
                alt="GEARSHIFT AUTOMOTIVE"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)]"
              />
            </div>
            <div>
              <h1 className="font-black text-xs text-white tracking-widest uppercase leading-snug font-montserrat">GEARSHIFT AUTOMOTIVE</h1>
              <p className="text-[10px] text-neutral-300 font-bold tracking-wider">{customer.name}</p>
            </div>
          </div>

          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-200 active:scale-95 transition-all"
          >
            {lang === 'pt' ? '🇵🇹 PT' : '🇬🇧 EN'}
          </button>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Quick Action Contact Buttons — Native Mobile Action Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:+351210000000"
              className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 hover:from-emerald-500 hover:to-green-500 border border-emerald-400/40 text-white flex items-center justify-between shadow-xl shadow-emerald-600/25 active:scale-[0.98] transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-xs font-black uppercase tracking-wider block text-white leading-tight">{t('portal_call')}</span>
                  <span className="text-[10px] font-mono text-emerald-100 opacity-90 block font-semibold">+351 210 000 000</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-1" />
            </a>

            <a
              href={`mailto:oficina@gearshift.pt?subject=Reparação Cliente ${encodeURIComponent(customer.name)}`}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border border-sky-400/40 text-white flex items-center justify-between shadow-xl shadow-blue-600/25 active:scale-[0.98] transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-xs font-black uppercase tracking-wider block text-white leading-tight">{t('portal_email')}</span>
                  <span className="text-[10px] font-mono text-sky-100 opacity-90 block font-semibold">oficina@gearshift.pt</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-1" />
            </a>
          </div>

          {/* ACTIVE REPAIRS SECTION WITH EXPAND / COLLAPSE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                Reparações em Curso ({activeWOs.length})
              </h2>

              {customerWOs.length > 0 && (
                <button
                  onClick={() => toggleAll(!allExpanded)}
                  className="text-[11px] text-white hover:text-neutral-300 font-bold transition-colors underline decoration-neutral-600"
                >
                  {allExpanded ? 'Colapsar Tudo ▲' : 'Expandir Tudo ▼'}
                </button>
              )}
            </div>

            {activeWOs.length > 0 ? (
              activeWOs.map(wo => {
                const vehicle = customerVehicles.find(v => v.id === wo.vehicle_id);
                const tech = userList.find(u => u.id === wo.assigned_technician_id);
                const totals = workOrders.getTotal(wo);
                const isExpanded = !!expandedWOIds[wo.id];

                return (
                  <div
                    key={wo.id}
                    className="rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-700/80 overflow-hidden shadow-2xl transition-all duration-300"
                  >
                    {/* Collapsed / Card Header Bar */}
                    <div
                      onClick={() => toggleExpand(wo.id)}
                      className="p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors flex items-center justify-between select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg shrink-0">
                          🚘
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Veículo'}
                          </h3>
                          <p className="font-mono text-[11px] text-neutral-300 font-bold">{vehicle?.plate}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={wo.status} size="sm" />
                        <span className="text-xs text-neutral-400 transition-transform duration-200">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Content Area */}
                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-4 border-t border-neutral-800 animate-fade-in">
                        {/* Service Description */}
                        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1 mt-3">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Descrição do Serviço</span>
                          <p className="text-neutral-200 leading-relaxed">{wo.customer_notes || 'Manutenção / Reparação na Oficina'}</p>
                        </div>

                        {/* Labor Lines Breakdown */}
                        {wo.labor_lines && wo.labor_lines.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Serviços em Execução</span>
                            <div className="space-y-1.5">
                              {wo.labor_lines.map(line => (
                                <div key={line.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                                  <span className="text-neutral-200 font-medium">⚙️ {line.description}</span>
                                  <span className="text-neutral-400 font-mono text-[10px] font-bold">{line.hours}h</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Technician & Repair Time */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-neutral-800">
                          <div>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Técnico Responsável</span>
                            <p className="text-neutral-200 font-semibold">{tech?.name || 'GEARSHIFT Team'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Data Reparação</span>
                            <p className="text-neutral-200 font-mono font-bold">
                              {wo.scheduled_start ? wo.scheduled_start.replace('T', ' ') : 'Agendada'}
                            </p>
                          </div>
                        </div>

                        {/* Cost & Summary Footer */}
                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                          <span className="text-neutral-400 font-semibold">Total Estimado</span>
                          <span className="text-lg font-black text-white">{formatCurrency(totals.subtotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center rounded-2xl bg-neutral-900/60 border border-dashed border-neutral-800 text-neutral-400 space-y-1">
                <p className="text-sm font-bold text-white">Nenhuma reparação ativa neste momento</p>
                <p className="text-xs text-neutral-400">O seu veículo não se encontra na oficina.</p>
              </div>
            )}
          </div>

          {/* PAST REPAIRS HISTORY (EXPANDABLE) */}
          {pastWOs.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Histórico de Reparações ({pastWOs.length})
              </h2>

              <div className="space-y-2">
                {pastWOs.map(wo => {
                  const vehicle = customerVehicles.find(v => v.id === wo.vehicle_id);
                  const totals = workOrders.getTotal(wo);
                  const isExpanded = !!expandedWOIds[wo.id];

                  return (
                    <div key={wo.id} className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
                      <div
                        onClick={() => toggleExpand(wo.id)}
                        className="p-3.5 cursor-pointer flex items-center justify-between text-xs hover:bg-neutral-800/80 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-white">{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Veículo'}</p>
                          <p className="text-[10px] text-neutral-400">{formatDate(wo.created_at)} • {wo.customer_notes.slice(0, 25)}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{formatCurrency(totals.subtotal)}</span>
                          <StatusBadge status={wo.status} size="sm" />
                          <span className="text-[10px] text-neutral-400">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3.5 pt-0 border-t border-neutral-800 space-y-2 text-xs text-neutral-300 bg-neutral-950">
                          <p className="italic text-[11px] text-neutral-300">{wo.customer_notes}</p>
                          {wo.labor_lines.map(l => (
                            <div key={l.id} className="flex justify-between text-[11px] text-slate-400">
                              <span>• {l.description}</span>
                              <span className="font-mono text-white">{formatCurrency(l.hours * l.rate)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VEHICLES & NEXT REVISION KM */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">
              Próxima Revisão Automóvel
            </h2>

            <div className="space-y-3">
              {customerVehicles.map(v => {
                const hasTarget = v.next_service_mileage != null && v.next_service_mileage > 0;
                const diff = hasTarget ? (v.next_service_mileage! - v.mileage) : null;
                const isOverdue = diff != null && diff <= 0;

                return (
                  <div key={v.id} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">{v.make} {v.model}</h3>
                        <p className="font-mono text-xs text-neutral-400">{v.plate}</p>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-mono font-bold">
                        {v.mileage.toLocaleString()} km
                      </span>
                    </div>

                    {hasTarget && (
                      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-400 font-semibold">Meta da Revisão:</span>
                          <span className="font-mono font-bold text-white">{v.next_service_mileage!.toLocaleString()} km</span>
                        </div>
                        {isOverdue ? (
                          <p className="text-red-400 font-bold flex items-center gap-1">
                            ⚠️ Revisão Ultrapassada por {Math.abs(diff!).toLocaleString()} km!
                          </p>
                        ) : (
                          <p className="text-neutral-300 font-bold">
                            Restam {diff!.toLocaleString()} km para a revisão
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="p-5 border-t border-neutral-800/90 bg-neutral-950/80 text-center space-y-3">
          {/* Social Media Action Icons Row */}
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://wa.me/351910000000"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700/80 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="WhatsApp"
              title="WhatsApp GEARSHIFT"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700/80 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Instagram"
              title="Instagram GEARSHIFT"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700/80 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Facebook"
              title="Facebook GEARSHIFT"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700/80 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Location"
              title="Oficina no Google Maps"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </a>
          </div>

          <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
            GEARSHIFT AUTOMOTIVE • App do Cliente
          </p>
        </footer>
      </div>
    </div>
  );
}
