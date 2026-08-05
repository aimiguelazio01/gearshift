import { WorkOrderStatus, InvoiceStatus } from './types';
import { Language, translations } from './translations';

// ── ID generation ──
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ── Currency formatting (Default to EUR €) ──
export function formatCurrency(amount: number, lang: Language = 'en'): string {
  const locale = lang === 'pt' ? 'pt-PT' : 'de-DE';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date formatting ──
export function formatDate(iso: string, lang: Language = 'en'): string {
  return new Date(iso).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string, lang: Language = 'en'): string {
  return new Date(iso).toLocaleString(lang === 'pt' ? 'pt-PT' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── Work Order status colors ──
export const STATUS_COLORS: Record<WorkOrderStatus, { bg: string; text: string; border: string }> = {
  'Estimate':         { bg: 'bg-slate-500/20',  text: 'text-slate-300',  border: 'border-slate-500/40' },
  'Approved':         { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40' },
  'In Progress':      { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/40' },
  'Waiting on Parts': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  'QA/Complete':      { bg: 'bg-emerald-500/20',text: 'text-emerald-300',border: 'border-emerald-500/40' },
  'Invoiced':         { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  'Closed':           { bg: 'bg-gray-500/20',   text: 'text-gray-400',   border: 'border-gray-500/40' },
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string }> = {
  'Unpaid':  { bg: 'bg-red-500/20',     text: 'text-red-300' },
  'Partial': { bg: 'bg-amber-500/20',   text: 'text-amber-300' },
  'Paid':    { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
};

// ── Part categories ──
export const PART_CATEGORIES = [
  'Brakes',
  'Engine',
  'Transmission',
  'Suspension',
  'Electrical',
  'Exhaust',
  'Cooling',
  'Filters',
  'Fluids & Lubricants',
  'Body & Trim',
  'Tires & Wheels',
  'HVAC',
  'Fuel System',
  'Belts & Hoses',
  'Other',
];

// ── Slug generation ──
export function slugify(text: string): string {
  return text
    .normalize('NFD')                   // decompose accents (ã → a + ~)
    .replace(/[\u0300-\u036f]/g, '')    // strip diacritic marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');         // remove everything except letters and digits
}

// ── Search helper ──
export function matchesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

// ── Margin calculation ──
export function marginPercent(cost: number, sale: number): number {
  if (sale === 0) return 0;
  return ((sale - cost) / sale) * 100;
}
