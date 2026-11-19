import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xl pb-safe',
          className,
        )}
      >
        {/* Mobile Sheet Drag Handle */}
        <div
          aria-hidden="true"
          className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0"
        >
          <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {title && (
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <h2 className="text-base sm:text-lg font-bold truncate">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5 flex items-center justify-center rounded-xl sm:rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
