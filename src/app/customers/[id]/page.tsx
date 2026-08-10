'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { customers, vehicles, workOrders, settings } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import { generateArduinoNFCCode } from '@/lib/nfcGenerator';
import { slugify } from '@/lib/utils';
import type { Customer, Vehicle, WorkOrder } from '@/lib/types';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, formatCurrency, formatDate } = useLanguage();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [woList, setWoList] = useState<WorkOrder[]>([]);

  // Modals & Tabs
  const [showQRModal, setShowQRModal] = useState(false);
  const [modalTab, setModalTab] = useState<'qr' | 'nfc' | 'arduino'>('qr');
  const [copied, setCopied] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);

  // Web Domain / Base URL configuration for NFC & QR Codes
  const [publicBaseUrl, setPublicBaseUrl] = useState<string>('');
  const [domainSaved, setDomainSaved] = useState<boolean>(false);

  useEffect(() => {
    const saved = settings.get();
    const savedBaseUrl = saved.publicBaseUrl.replace(/gearshift(?:-one|1)\.vercel\.app/, 'gearshift2.vercel.app');
    if (savedBaseUrl) {
      setPublicBaseUrl(savedBaseUrl);
      if (savedBaseUrl !== saved.publicBaseUrl) settings.update({ publicBaseUrl: savedBaseUrl });
    } else if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('gearshift-one')) {
        setPublicBaseUrl('https://gearshift2.vercel.app');
      } else {
        setPublicBaseUrl(origin);
      }
    }
  }, []);

  const handleSaveDomain = () => {
    if (publicBaseUrl) {
      const normalizedUrl = publicBaseUrl.replace(/gearshift(?:-one|1)\.vercel\.app/, 'gearshift2.vercel.app');
      settings.update({ publicBaseUrl: normalizedUrl });
      setPublicBaseUrl(normalizedUrl);
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2500);
    }
  };

  const reload = useCallback(() => {
    const cust = customers.getByIdOrSlug(id);
    if (cust) {
      setCustomer(cust);
      setVehicleList(vehicles.getByCustomer(cust.id));
      setWoList(workOrders.getAll().filter(w => w.customer_id === cust.id));
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (!customer) {
    return <div className="text-center py-20 text-[var(--muted)]">Cliente não encontrado</div>;
  }

  const customerSlug = slugify(customer.name);
  const cleanBaseUrl = (publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')).trim().replace(/\/$/, '');
  const portalUrl = `${cleanBaseUrl}/portal/${customerSlug}`;
  const isLocalhostUrl = cleanBaseUrl.includes('localhost') || cleanBaseUrl.includes('127.0.0.1');

  const handleCopyLink = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // NFC Write Handler — Integrates direct Web Serial (Vercel HTTPS), Native Web NFC & local nfc_v01 Studio
  const nfcStudioServer = (settings.get().nfcStudioUrl || 'http://localhost:3001').replace(/\/$/, '');
  const nfcStudioAppUrl = `${nfcStudioServer}/?url=${encodeURIComponent(portalUrl)}&autowrite=true`;

  const openNFCStudio = () => {
    if (typeof window === 'undefined') return;
    window.open(nfcStudioAppUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNFCStudioWrite = async () => {
    setNfcStatus(null);

    // Open this during the user click so popup blocking does not prevent the
    // local NFC Studio tab after an asynchronous USB/Web NFC attempt.
    openNFCStudio();

    // 1. Web Serial API (Chrome/Edge over HTTPS on Vercel or Localhost)
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      try {
        setNfcStatus('🔌 Selecione a porta USB (COM4) na janela do navegador...');
        // @ts-ignore Web Serial API
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        setNfcStatus(`📲 Conectado à porta USB!\nA enviar URL: ${portalUrl}\n\n👉 ENCOSTE O CARTÃO NTAG215 no leitor PN532 agora!`);

        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();
        await writer.write(encoder.encode(`WRITE:URL:${portalUrl}\n`));
        writer.releaseLock();

        // Listen for serial response asynchronously
        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();

        let buffer = '';
        const timeout = setTimeout(async () => {
          try { await reader.cancel(); } catch {}
          try { await port.close(); } catch {}
          setNfcStatus(`✅ Comando enviado para o Arduino!\nURL: ${portalUrl}\n\nEncoste o seu cartão NTAG215 no leitor PN532.`);
        }, 8000);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          if (buffer.includes('SUCCESS:WRITTEN') || buffer.includes('is fully updated') || buffer.includes('OK:SET_URL')) {
            setNfcStatus(`✅ CARTÃO NFC GRAVADO COM SUCESSO!\nURL: ${portalUrl}`);
            clearTimeout(timeout);
            try { await reader.cancel(); } catch {}
            try { await port.close(); } catch {}
            break;
          }
        }
        return;
      } catch (err: any) {
        if (err.name === 'NotFoundError') {
          setNfcStatus('ℹ️ Seleção de porta USB cancelada.');
          return;
        }
        // Fallback to next methods if Web Serial fails
      }
    }

    // 2. Native Web NFC API (Android Chrome)
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        // @ts-ignore Web NFC API
        const ndef = new NDEFReader();
        await ndef.write({
          records: [{ recordType: 'url', data: portalUrl }]
        });
        setNfcStatus(`✅ Cartão NFC gravado com sucesso via Web NFC:\n${portalUrl}`);
        return;
      } catch (err: any) {
        // Handled gracefully
      }
    }

    // 3. Try reaching local nfc_v01 server via API (if on localhost)
    try {
      const res = await fetch(`${nfcStudioServer}/api/update-ino`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: portalUrl, type: 'URL' }),
      });
      const data = await res.json();
      if (data.success) {
        setNfcStatus(`✅ URL enviada para o leitor PN532 (${portalUrl})! A compilar sketch Arduino...`);
        fetch(`${nfcStudioServer}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).then(r => r.json()).then(uploadData => {
          if (uploadData.success) {
            setNfcStatus(`👉 CÓDIGO CARREGADO NO ARDUINO! Encoste o seu cartão NTAG215 ao leitor PN532!`);
          }
        }).catch(() => { });
        return;
      }
    } catch (err: any) {
      // HTTPS→HTTP fetch blocked by browser — expected when on Vercel
    }

    setNfcStatus(`ℹ️ URL pronta a gravar: ${portalUrl}\n\n⚠️ O servidor Arduino local (${nfcStudioServer}) não está ativo nesta máquina.\n\n👉 Execute "Write-NFC-Card.bat" (ou abra "NFC-Card-Writer.exe") e tente novamente.`);
  };

  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}`;
  const arduinoSketch = generateArduinoNFCCode(portalUrl, customer.name);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/customers" className="hover:text-blue-400 transition-colors">{t('cust_title')}</Link>
        <span>›</span>
        <span className="text-[var(--foreground)]">{customer.name}</span>
      </div>

      {/* Header Info */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold text-blue-400">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--foreground)]">{customer.name}</h1>
                {customer.tags.map(tag => (
                  <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tag === 'VIP' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                    }`}>{tag}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--muted)]">
                {customer.email && <span>📧 {customer.email}</span>}
                {customer.phone && <span>📱 {customer.phone}</span>}
                {customer.address && <span>📍 {customer.address}</span>}
              </div>
              {customer.notes && (
                <p className="mt-2 text-sm text-[var(--muted)] italic">&ldquo;{customer.notes}&rdquo;</p>
              )}
            </div>
          </div>

          {/* Generate Mobile App & NFC Access Button */}
          <div className="shrink-0">
            <button
              onClick={() => setShowQRModal(true)}
              className="btn-primary text-xs flex items-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>{t('portal_generate_app')} / NFC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Mobile App Preview Banner */}
      <div className="card p-5 bg-gradient-to-r from-blue-900/20 via-slate-900 to-slate-900 border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0">
            📱
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--foreground)]">{t('portal_title')} — {customer.name}</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Estado da reparação em tempo real, quilómetros para a próxima revisão e contactos diretos.
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={() => handleCopyLink(portalUrl)} className="btn-secondary text-xs">
            {copied ? '✓ Copiado!' : t('portal_copy_link')}
          </button>
          <a href={`/portal/${customerSlug}`} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs flex items-center gap-1">
            <span>{t('portal_open_app')}</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicles */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold">{t('veh_title')} ({vehicleList.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {vehicleList.map(v => (
              <Link key={v.id} href={`/vehicles/${v.id}`} className="flex items-center justify-between p-4 hover:bg-[var(--hover)] transition-colors">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{v.year} {v.make} {v.model}</p>
                  <p className="text-xs text-[var(--muted)]">{v.plate} • {v.color} • {v.mileage.toLocaleString()} km</p>
                  {v.next_service_mileage && (
                    <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
                      Próxima Revisão: {v.next_service_mileage.toLocaleString()} km
                    </span>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
            {vehicleList.length === 0 && (
              <p className="text-center py-8 text-sm text-[var(--muted)]">Nenhum veículo registado</p>
            )}
          </div>
        </div>

        {/* Work Order History */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold">{t('cust_service_history')} ({woList.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {woList.map(wo => {
              const vehicle = vehicles.getById(wo.vehicle_id);
              const totals = workOrders.getTotal(wo);
              return (
                <Link key={wo.id} href={`/work-orders/${wo.id}`} className="block p-4 hover:bg-[var(--hover)] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Desconhecido'}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{wo.customer_notes.slice(0, 60)}{wo.customer_notes.length > 60 ? '...' : ''}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={wo.status} size="sm" />
                      <p className="text-xs text-[var(--muted)] mt-1">{formatCurrency(totals.subtotal)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-2">{formatDate(wo.created_at)}</p>
                </Link>
              );
            })}
            {woList.length === 0 && (
              <p className="text-center py-8 text-sm text-[var(--muted)]">Sem histórico de serviço</p>
            )}
          </div>
        </div>
      </div>

      {/* QR Code & NFC Access Modal */}
      <Modal open={showQRModal} onClose={() => setShowQRModal(false)} title={t('nfc_modal_title')} maxWidth="max-w-xl">
        <div className="space-y-4">
          {/* Modal Tabs — GEARSHIFT Chrome Metallic Design */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <button
              onClick={() => setModalTab('qr')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${modalTab === 'qr'
                  ? 'bg-gradient-to-r from-white via-neutral-200 to-neutral-300 text-black border border-white shadow-md font-montserrat scale-[1.02]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>{t('nfc_tab_qr')}</span>
            </button>

            <button
              onClick={() => setModalTab('nfc')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${modalTab === 'nfc'
                  ? 'bg-gradient-to-r from-white via-neutral-200 to-neutral-300 text-black border border-white shadow-md font-montserrat scale-[1.02]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                <path d="M9.46 9.88a4 4 0 0 1 0 4.24" />
                <path d="M12.91 11.44a1 1 0 0 1 0 1.12" />
                <rect x="2" y="2" width="20" height="20" rx="5" />
              </svg>
              <span>{t('nfc_tab_write')}</span>
            </button>

            <button
              onClick={() => setModalTab('arduino')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${modalTab === 'arduino'
                  ? 'bg-gradient-to-r from-white via-neutral-200 to-neutral-300 text-black border border-white shadow-md font-montserrat scale-[1.02]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" />
                <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" />
              </svg>
              <span>{t('nfc_tab_arduino')}</span>
            </button>
          </div>

          {/* TAB 1: QR CODE */}
          {modalTab === 'qr' && (
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="p-4 rounded-2xl bg-white inline-block shadow-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeImgUrl}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[var(--foreground)]">{customer.name}</h3>
                <p className="text-xs text-[var(--muted)]">
                  {lang === 'pt' ? 'Digitalize este Código QR com a câmara do telemóvel para abrir a App do Cliente.' : 'Scan this QR code with a phone camera to open the Client App.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--hover)] border border-[var(--border)] flex items-center justify-between text-xs gap-2">
                <span className="font-mono text-[var(--muted)] truncate">{portalUrl}</span>
                <button onClick={() => handleCopyLink(portalUrl)} className="btn-secondary text-[11px] shrink-0">
                  {copied ? (lang === 'pt' ? '✓ Copiado!' : '✓ Copied!') : (lang === 'pt' ? 'Copiar' : 'Copy')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WEB NFC DIRECT WRITE — GEARSHIFT METALLIC DESIGN */}
          {modalTab === 'nfc' && (
            <div className="space-y-4 py-2 text-center animate-fade-in">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border border-neutral-700/80 shadow-2xl space-y-4">
                {/* Vector NFC Wave Antenna Chip Badge */}
                <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-950 border border-neutral-700 flex items-center justify-center shadow-xl shadow-black relative group">
                  <div className="absolute inset-0 rounded-2xl bg-white/5 animate-ping opacity-60" />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white relative z-10">
                    <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                    <path d="M9.46 9.88a4 4 0 0 1 0 4.24" />
                    <path d="M12.91 11.44a1 1 0 0 1 0 1.12" />
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                  </svg>
                </div>

                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-widest font-montserrat">{t('nfc_direct_write_title')}</h3>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    {t('nfc_direct_write_desc')}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 pt-2">
                  {/* PRIMARY ACTION: Direct Web Serial USB connection in browser */}
                  <button
                    onClick={handleNFCStudioWrite}
                    className="btn-primary w-full text-xs py-3.5 px-6 font-black shadow-xl active:scale-95 transition-all duration-200 inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-white cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v6m0 0l-3-3m3 3l3-3M6 12a6 6 0 1012 0 6 6 0 00-12 0z"/>
                    </svg>
                    <span>⚡ Conectar Arduino USB &amp; Gravar Cartão</span>
                  </button>

                  {/* SECONDARY ACTION: Open standalone NFC Studio on port 3001 */}
                  <a
                    href={nfcStudioAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full text-[11px] py-2.5 px-4 font-semibold shadow-md active:scale-95 transition-all inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 rounded-lg no-underline"
                  >
                    <span>🔗 Abrir NFC Studio Studio Local (localhost:3001)</span>
                    <span>↗</span>
                  </a>
                </div>

                {/* Show the exact URL being written */}
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 font-mono truncate text-center mt-2">
                  {portalUrl}
                </div>
              </div>

              {nfcStatus && (
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-left text-neutral-200 font-mono font-semibold space-y-2">
                  <p className="whitespace-pre-wrap">{nfcStatus}</p>
                  <a
                    href={nfcStudioAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-[11px] py-1.5 px-3 inline-flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 rounded-lg no-underline"
                  >
                    <span>🔗 Abrir NFC Studio (localhost:3001)</span>
                    <span>↗</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARDUINO C++ GENERATOR */}
          {modalTab === 'arduino' && (
            <div className="space-y-3 py-2 text-left animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Código Sketch Arduino PN532</h3>
                  <p className="text-xs text-[var(--muted)]">Código C++ pronto a compilar para gravar este cartão NTAG215 específico.</p>
                </div>
                <button onClick={() => handleCopyLink(arduinoSketch)} className="btn-secondary text-xs">
                  {copied ? '✓ Código Copiado!' : 'Copiar Código C++'}
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-64 overflow-y-auto leading-relaxed">
                {arduinoSketch}
              </pre>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button className="btn-secondary text-xs" onClick={() => setShowQRModal(false)}>
              Fechar
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs flex items-center gap-1"
            >
              <span>Abrir App do Cliente</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
}
