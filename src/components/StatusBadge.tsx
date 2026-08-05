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
    ? INVOICE_STATUS_COLORS[status as InvoiceStatus]
    : STATUS_COLORS[status as WorkOrderStatus];

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  
  const translationKey = type === 'invoice'
    ? (`invoice_${status}` as any)
    : (`status_${status.replace(/ /g, '_').replace(/\//g, '_')}` as any);

  const displayLabel = t(translationKey) || status;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold tracking-wide
        ${colors.bg} ${colors.text}
        ${type === 'workOrder' ? (STATUS_COLORS[status as WorkOrderStatus]?.border || '') + ' border' : ''}
        ${sizeClasses}
      `}
    >
      {displayLabel}
    </span>
  );
}
