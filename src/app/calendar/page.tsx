'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { workOrders, vehicles, customers, lifts, users } from '@/lib/store';
import { useLanguage } from '@/context/LanguageContext';
import type { WorkOrder, Vehicle, Customer, Lift, User } from '@/lib/types';

// ── Helpers ──
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  r.setDate(r.getDate() + diff);
  return r;
}

export default function CalendarPage() {
  const { t, lang, formatCurrency, formatDateTime } = useLanguage();
  const [woList, setWoList] = useState<WorkOrder[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [liftList, setLiftList] = useState<Lift[]>([]);
  const [userList, setUserList] = useState<User[]>([]);

  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [calendarMode, setCalendarMode] = useState<'all' | 'scheduled' | 'created'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [liftFilter, setLiftFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');

  // Modals
  const [scheduleWOId, setScheduleWOId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSelectedDate, setCreateSelectedDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const reload = useCallback(() => {
    setWoList(workOrders.getAll());
    setVehicleList(vehicles.getAll());
    setCustomerList(customers.getAll());
    setLiftList(lifts.getAll());
    setUserList(users.getAll());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Filters
  const filteredWOs = woList.filter(wo => {
    if (liftFilter && wo.lift_id !== liftFilter) return false;
    if (techFilter && wo.assigned_technician_id !== techFilter) return false;
    if (calendarMode === 'scheduled' && !wo.scheduled_start) return false;
    return true;
  });

  // Function to determine which WOs belong to a date cell depending on current mode
  function wosForDate(dateStr: string) {
    return filteredWOs.filter(wo => {
      const scheduledDate = wo.scheduled_start ? wo.scheduled_start.split('T')[0] : null;
      const createdDate = wo.created_at ? wo.created_at.split('T')[0] : null;

      if (calendarMode === 'scheduled') {
        return scheduledDate === dateStr;
      }
      if (calendarMode === 'created') {
        return createdDate === dateStr;
      }
      return scheduledDate === dateStr || (!scheduledDate && createdDate === dateStr);
    });
  }

  // Unscheduled WOs (no scheduled_start)
  const unscheduledWOs = woList.filter(wo =>
    !wo.scheduled_start && !['Invoiced', 'Closed'].includes(wo.status)
  );

  const techList = userList.filter(u => u.role === 'Technician');

  // ── Month data ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;

  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = startPad - 1; i >= 0; i--) calendarDays.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  for (let d = 1; d <= lastDay.getDate(); d++) calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true });
  const totalSlots = Math.ceil(calendarDays.length / 7) * 7;
  for (let d = 1; calendarDays.length < totalSlots; d++) calendarDays.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });

  // ── Week data ──
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8..18

  const locale = lang === 'pt' ? 'pt-PT' : 'en-US';

  // ── Title ──
  const titleLabel = view === 'day'
    ? currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })} — ${weekDays[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  // ── Submit handlers ──
  const handleScheduleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduleWOId) return;
    const fd = new FormData(e.currentTarget);
    const dateStr = fd.get('date') as string;
    const startTimeStr = fd.get('start_time') as string;
    const estHours = Number(fd.get('estimated_hours'));
    const liftId = fd.get('lift_id') as string;
    const techId = fd.get('assigned_technician_id') as string;

    const startIso = `${dateStr}T${startTimeStr}:00`;
    const endDate = new Date(new Date(startIso).getTime() + estHours * 3600000);
    const endIso = endDate.toISOString();

    workOrders.update(scheduleWOId, {
      lift_id: liftId || null,
      assigned_technician_id: techId || '',
      scheduled_start: startIso,
      scheduled_end: endIso,
      estimated_hours: estHours,
    });
    if (liftId) lifts.assignWorkOrder(liftId, scheduleWOId);
    setScheduleWOId(null);
    reload();
  };

  const handleAddLaborInCalendar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduleWOId) return;
    const fd = new FormData(e.currentTarget);
    workOrders.addLaborLine(scheduleWOId, {
      description: fd.get('description') as string,
      hours: Number(fd.get('hours')),
      rate: Number(fd.get('rate')),
    });
    e.currentTarget.reset();
    reload();
  };

  const handleCreateNewService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vehicleId = fd.get('vehicle_id') as string;
    const vehicle = vehicleList.find(v => v.id === vehicleId);
    const liftId = fd.get('lift_id') as string || null;
    const dateStr = fd.get('scheduled_date') as string;
    const timeStr = fd.get('scheduled_time') as string;
    const estHours = Number(fd.get('estimated_hours') || 2);
    const techId = fd.get('assigned_technician_id') as string;
    const notes = fd.get('customer_notes') as string;
    const initialLabor = fd.get('initial_labor') as string;

    const startIso = `${dateStr}T${timeStr}:00`;
    const endDate = new Date(new Date(startIso).getTime() + estHours * 3600000);

    const newWO = workOrders.create({
      customer_id: vehicle?.customer_id || '',
      vehicle_id: vehicleId,
      status: 'Approved',
      assigned_technician_id: techId,
      lift_id: liftId,
      scheduled_start: startIso,
      scheduled_end: endDate.toISOString(),
      estimated_hours: estHours,
      internal_notes: '',
      customer_notes: notes || '',
    });
    if (newWO && initialLabor) {
      workOrders.addLaborLine(newWO.id, { description: initialLabor, hours: estHours, rate: 75 });
    }
    if (liftId && newWO) lifts.assignWorkOrder(liftId, newWO.id);
    setShowCreateModal(false);
    setSelectedCustomer('');
    reload();
  };

  const selectedWO = scheduleWOId ? woList.find(w => w.id === scheduleWOId) : null;
  const customerVehicles = selectedCustomer ? vehicleList.filter(v => v.customer_id === selectedCustomer) : vehicleList;

  // ── Render a single WO card ──
  function WOCard({ wo, compact = false }: { wo: WorkOrder; compact?: boolean }) {
    const vehicle = vehicleList.find(v => v.id === wo.vehicle_id);
    const lift = liftList.find(l => l.id === wo.lift_id);
    const tech = userList.find(u => u.id === wo.assigned_technician_id);

    const isScheduled = !!wo.scheduled_start;

    return (
      <div
        onClick={(e) => { e.stopPropagation(); setScheduleWOId(wo.id); }}
        className={`p-2 rounded-lg border hover:border-blue-400 cursor-pointer text-xs shadow-sm transition-all hover:shadow-md ${
          isScheduled ? 'bg-[var(--card)] border-[var(--border)]' : 'bg-purple-500/5 border-purple-500/20'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-[var(--foreground)] truncate">
            {vehicle ? `${vehicle.make} ${vehicle.model}` : '?'}
          </span>
          <StatusBadge status={wo.status} size="sm" />
        </div>
        {!compact && <p className="text-[10px] text-[var(--muted)] font-mono mt-0.5">{vehicle?.plate}</p>}

        {lift && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            🏗️ {lift.name.split('(')[0].trim()}
          </span>
        )}

        {isScheduled ? (
          <div className="text-[9px] text-emerald-400 font-medium mt-1 flex justify-between items-center">
            <span>🔧 {t('wo_repair_date').split('(')[0]}: {wo.scheduled_start?.split('T')[1]?.slice(0, 5)}</span>
            <span>{wo.estimated_hours || 2}h</span>
          </div>
        ) : (
          <div className="text-[9px] text-purple-400 font-medium mt-1">
            📝 {t('wo_created_date').split('(')[0]}: {wo.created_at.split('T')[0]}
          </div>
        )}
        {!compact && tech && <p className="text-[9px] text-[var(--muted)] mt-0.5">👷 {tech.name}</p>}
      </div>
    );
  }

  const dayHeaderNames = lang === 'pt'
    ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('cal_title')}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{t('cal_subtitle')}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => { setCreateSelectedDate(isoDate(new Date())); setShowCreateModal(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t('cal_add_service')}
          </button>
          <button className="btn-secondary text-xs" onClick={goToday}>{t('cal_today')}</button>
          <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
            {(['month', 'week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'}`}>
                {v === 'month' ? t('cal_month') : v === 'week' ? t('cal_week') : t('cal_day')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Mode Selector (Created vs Scheduled) & Nav + Filters ═══ */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--foreground)]">{t('cal_filter_by')}</span>
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--hover)]">
              <button
                onClick={() => setCalendarMode('all')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  calendarMode === 'all' ? 'bg-blue-500 text-white font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {t('cal_mode_all')}
              </button>
              <button
                onClick={() => setCalendarMode('scheduled')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  calendarMode === 'scheduled' ? 'bg-emerald-500 text-white font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>🔧</span> {t('cal_mode_scheduled')}
              </button>
              <button
                onClick={() => setCalendarMode('created')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  calendarMode === 'created' ? 'bg-purple-500 text-white font-bold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>📝</span> {t('cal_mode_created')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select value={liftFilter} onChange={e => setLiftFilter(e.target.value)} className="text-xs py-2">
              <option value="">{t('cal_filter_lift')}</option>
              {liftList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={techFilter} onChange={e => setTechFilter(e.target.value)} className="text-xs py-2">
              <option value="">{t('cal_filter_tech')}</option>
              {techList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mx-auto">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--hover)] text-[var(--foreground)] font-bold">←</button>
            <h2 className="text-lg font-bold text-[var(--foreground)] capitalize min-w-[220px] text-center">{titleLabel}</h2>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-[var(--hover)] text-[var(--foreground)] font-bold">→</button>
          </div>
        </div>
      </div>

      {/* ═══ MONTH VIEW ═══ */}
      {view === 'month' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--hover)] text-center text-xs font-bold text-[var(--muted)] py-3">
            {dayHeaderNames.map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[var(--border)]">
            {calendarDays.map(({ date, isCurrentMonth }, idx) => {
              const dateStr = isoDate(date);
              const isToday = dateStr === isoDate(new Date());
              const dayWOs = wosForDate(dateStr);
              return (
                <div
                  key={idx}
                  onClick={() => { setCreateSelectedDate(dateStr); setShowCreateModal(true); }}
                  className={`min-h-[110px] p-2 flex flex-col transition-colors cursor-pointer group/cell ${!isCurrentMonth ? 'opacity-30 bg-black/10' : isToday ? 'bg-blue-500/5' : 'hover:bg-[var(--hover)]/50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${isToday ? 'bg-blue-500 text-white' : 'text-[var(--foreground)]'}`}>{date.getDate()}</span>
                    {dayWOs.length > 0
                      ? <span className="text-[10px] font-semibold text-blue-400">{dayWOs.length} OS</span>
                      : <span className="text-[10px] text-blue-400 opacity-0 group-hover/cell:opacity-100 transition-opacity">{t('cal_add_service')}</span>}
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[90px]">
                    {dayWOs.map(wo => <WOCard key={wo.id} wo={wo} compact />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ WEEK VIEW ═══ */}
      {view === 'week' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-[var(--border)] bg-[var(--hover)]">
            <div className="p-2 text-center text-[10px] font-bold text-[var(--muted)] border-r border-[var(--border)]">{t('hours')}</div>
            {weekDays.map((d, i) => {
              const dateStr = isoDate(d);
              const isToday = dateStr === isoDate(new Date());
              return (
                <div key={i} className={`p-2 text-center border-r border-[var(--border)] last:border-r-0 ${isToday ? 'bg-blue-500/10' : ''}`}>
                  <p className="text-[10px] font-bold text-[var(--muted)]">{dayHeaderNames[i]}</p>
                  <p className={`text-sm font-bold ${isToday ? 'text-blue-400' : 'text-[var(--foreground)]'}`}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[60px]">
                <div className="p-1.5 text-[10px] font-mono text-[var(--muted)] text-right pr-3 border-r border-[var(--border)] flex items-start justify-end">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((d, di) => {
                  const dateStr = isoDate(d);
                  const isToday = dateStr === isoDate(new Date());
                  const hourWOs = wosForDate(dateStr).filter(wo => {
                    const start = wo.scheduled_start || wo.created_at;
                    const h = parseInt(start.split('T')[1]?.slice(0, 2) || '08', 10);
                    return h === hour;
                  });
                  return (
                    <div
                      key={di}
                      onClick={() => { setCreateSelectedDate(dateStr); setShowCreateModal(true); }}
                      className={`p-1 border-r border-[var(--border)] last:border-r-0 cursor-pointer hover:bg-[var(--hover)] transition-colors ${isToday ? 'bg-blue-500/5' : ''}`}
                    >
                      {hourWOs.map(wo => <WOCard key={wo.id} wo={wo} compact />)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ DAY VIEW ═══ */}
      {view === 'day' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-[var(--border)] bg-[var(--hover)]">
            <div className="p-3 text-center text-[10px] font-bold text-[var(--muted)] border-r border-[var(--border)]">{t('hours')}</div>
            {liftList.map(l => (
              <div key={l.id} className="p-3 text-center border-r border-[var(--border)] last:border-r-0">
                <p className="text-xs font-bold text-[var(--foreground)]">{l.name.split('(')[0].trim()}</p>
                <p className="text-[10px] text-[var(--muted)]">{l.type}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {HOURS.map(hour => {
              const dateStr = isoDate(currentDate);
              return (
                <div key={hour} className="grid grid-cols-[80px_repeat(3,1fr)] min-h-[64px]">
                  <div className="p-1.5 text-[10px] font-mono text-[var(--muted)] text-right pr-3 border-r border-[var(--border)] flex items-start justify-end pt-2">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {liftList.map(lift => {
                    const liftHourWOs = wosForDate(dateStr).filter(wo => {
                      if (wo.lift_id !== lift.id) return false;
                      const start = wo.scheduled_start || wo.created_at;
                      const h = parseInt(start.split('T')[1]?.slice(0, 2) || '08', 10);
                      return h === hour;
                    });
                    return (
                      <div
                        key={lift.id}
                        onClick={() => { setCreateSelectedDate(dateStr); setShowCreateModal(true); }}
                        className="p-1 border-r border-[var(--border)] last:border-r-0 cursor-pointer hover:bg-[var(--hover)] transition-colors"
                      >
                        {liftHourWOs.map(wo => <WOCard key={wo.id} wo={wo} />)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Unscheduled WOs Panel ═══ */}
      {unscheduledWOs.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {t('cal_unscheduled_title')} ({unscheduledWOs.length})
          </h3>
          <p className="text-xs text-[var(--muted)]">{t('cal_unscheduled_sub')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unscheduledWOs.map(wo => <WOCard key={wo.id} wo={wo} />)}
          </div>
        </div>
      )}

      {/* ═══ Edit Scheduled WO Modal ═══ */}
      <Modal open={!!scheduleWOId} onClose={() => setScheduleWOId(null)} title={t('cal_manage_schedule')} maxWidth="max-w-xl">
        {selectedWO && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 rounded-xl bg-[var(--hover)] border border-[var(--border)] flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-[var(--foreground)]">OS #{selectedWO.id.slice(0, 6).toUpperCase()}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{t('inv_customer')}: <strong className="text-[var(--foreground)]">{customerList.find(c => c.id === selectedWO.customer_id)?.name}</strong></p>
                <p className="text-xs text-[var(--muted)]">{t('inv_vehicle')}: <strong className="text-[var(--foreground)]">{vehicleList.find(v => v.id === selectedWO.vehicle_id)?.make} {vehicleList.find(v => v.id === selectedWO.vehicle_id)?.model} ({vehicleList.find(v => v.id === selectedWO.vehicle_id)?.plate})</strong></p>
                <p className="text-[11px] text-purple-300 mt-1 font-mono">📝 {t('wo_created_date')}: {formatDateTime(selectedWO.created_at)}</p>
              </div>
              <StatusBadge status={selectedWO.status} />
            </div>

            {/* Manual Repair Date Form */}
            <form onSubmit={handleScheduleSubmit} className="space-y-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">🔧 {t('wo_repair_date')}</h4>
                <Link href={`/work-orders/${selectedWO.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">{t('btn_view_details')} →</Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t('wo_lift_assigned')}</label>
                  <select name="lift_id" defaultValue={selectedWO.lift_id || ''} className="w-full">
                    <option value="">{t('wo_no_lift')}</option>
                    {liftList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">{t('wo_technician')}</label>
                  <select name="assigned_technician_id" defaultValue={selectedWO.assigned_technician_id || ''} className="w-full">
                    <option value="">{t('wo_unassigned')}</option>
                    {techList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">{t('date')} *</label>
                  <input type="date" name="date" required defaultValue={selectedWO.scheduled_start?.split('T')[0] || isoDate(new Date())} className="w-full" />
                </div>
                <div>
                  <label className="form-label">{t('cal_start_time')} *</label>
                  <input type="time" name="start_time" required defaultValue={selectedWO.scheduled_start?.split('T')[1]?.slice(0, 5) || '09:00'} className="w-full" />
                </div>
                <div>
                  <label className="form-label">{t('cal_est_hours')} *</label>
                  <input type="number" name="estimated_hours" step="0.5" min="0.5" required defaultValue={selectedWO.estimated_hours || 2} className="w-full" />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button type="submit" className="btn-primary text-xs py-2 px-4 shadow-md shadow-blue-500/20">{t('cal_save_repair_date')}</button>
              </div>
            </form>

            {/* Labor lines */}
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">{t('cal_registered_services')}</h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {selectedWO.labor_lines.map(line => (
                  <div key={line.id} className="p-2 rounded-lg bg-[var(--hover)] flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--foreground)]">{line.description}</span>
                    <span className="text-[var(--muted)] font-mono">{line.hours}h @ {formatCurrency(line.rate)}/h</span>
                  </div>
                ))}
                {selectedWO.labor_lines.length === 0 && <p className="text-xs text-[var(--muted)] italic py-1">{t('cal_no_services')}</p>}
              </div>

              <form onSubmit={handleAddLaborInCalendar} className="flex gap-2 pt-1">
                <input type="text" name="description" placeholder={t('description')} required className="flex-1 text-xs" />
                <input type="number" name="hours" step="0.25" defaultValue="1" className="w-14 text-xs text-center" />
                <input type="number" name="rate" defaultValue="75" className="w-14 text-xs text-center" />
                <button type="submit" className="btn-secondary text-xs whitespace-nowrap">{t('add')}</button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ Create New Service Modal ═══ */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setSelectedCustomer(''); }} title={t('cal_new_service_modal')} maxWidth="max-w-xl">
        <form onSubmit={handleCreateNewService} className="space-y-4">
          <div>
            <label className="form-label">{t('inv_customer')} *</label>
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full" required>
              <option value="">{t('cust_select_placeholder')}</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">{t('inv_vehicle')} *</label>
            <select name="vehicle_id" required className="w-full">
              <option value="">{t('wo_select_vehicle')}</option>
              {customerVehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {v.plate}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('nav_lifts')}</label>
              <select name="lift_id" className="w-full">
                <option value="">{t('wo_no_lift')}</option>
                {liftList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('wo_technician')}</label>
              <select name="assigned_technician_id" className="w-full">
                <option value="">{t('wo_unassigned')}</option>
                {techList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--hover)] border border-[var(--border)]">
            <div>
              <label className="form-label text-[11px]">{t('date')} *</label>
              <input type="date" name="scheduled_date" required defaultValue={createSelectedDate || isoDate(new Date())} className="w-full text-xs" />
            </div>
            <div>
              <label className="form-label text-[11px]">{t('cal_start_time')} *</label>
              <input type="time" name="scheduled_time" required defaultValue="09:00" className="w-full text-xs" />
            </div>
            <div>
              <label className="form-label text-[11px]">{t('cal_est_hours')}</label>
              <input type="number" name="estimated_hours" step="0.5" defaultValue="2" min="0.5" className="w-full text-xs" />
            </div>
          </div>
          <div>
            <label className="form-label">{t('description')}</label>
            <input type="text" name="initial_labor" placeholder="ex: Mudança de Correia de Distribuição..." className="w-full" />
          </div>
          <div>
            <label className="form-label">{t('cust_notes')}</label>
            <textarea name="customer_notes" rows={2} placeholder={t('wo_customer_notes')} className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowCreateModal(false); setSelectedCustomer(''); }}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('cal_create_and_schedule')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
