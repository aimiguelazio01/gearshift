'use client';

import { WorkOrderStatus, InvoiceStatus } from '@/lib/types';
import { STATUS_COLORS, INVOICE_STATUS_COLORS } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface StatusBadgeProps {
  status: WorkOrderStatus | InvoiceStatus;
  type?: 'workOrder' | 'invoice';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, type = 'workOrder', size = 'md' }: StatusBadgeProps) {
  const { t } = useLanguage();
  const colors = type === 'invoice'
    ? (INVOICE_STATUS_COLORS[status as InvoiceStatus] || { bg: 'bg-neutral-800', text: 'text-neutral-300' })
    : (STATUS_COLORS[status as WorkOrderStatus] || { bg: 'bg-neutral-800', text: 'text-neutral-300', border: 'border-neutral-700' });

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  
  const normalizedKey = status.toLowerCase().replace(/[\s/]+/g, '_');
  const translationKey = type === 'invoice'
    ? `invoice_${normalizedKey}`
    : `status_${normalizedKey}`;

  const translated = t(translationKey);
  const displayLabel = translated !== translationKey ? translated : (t(`status_${status.replace(/[\s/]+/g, '_')}`) || status);

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold tracking-wide
        ${colors.bg} ${colors.text}
        ${type === 'workOrder' ? ((colors as any)?.border || '') + ' border' : ''}
        ${sizeClasses}
      `}
    >
      {displayLabel}
    </span>
  );
}
