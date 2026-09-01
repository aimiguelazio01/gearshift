'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm">
      {/* Clickable Backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      {/* Centering wrapper - allows scroll when modal exceeds viewport */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6" onClick={onClose}>
        {/* Modal Dialog Box */}
        <div
          ref={dialogRef}
          className={`
            relative ${maxWidth} w-full rounded-2xl
            bg-[var(--card)] border border-[var(--border)]
            shadow-2xl shadow-black/70
            animate-in fade-in zoom-in-95 duration-150
            text-left
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)] bg-[var(--card)] rounded-t-2xl">
            <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] truncate pr-2">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition-colors shrink-0"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - no scroll, full height */}
          <div className="px-5 sm:px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
