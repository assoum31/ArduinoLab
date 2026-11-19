import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold">Something went wrong</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  حدث خطأ غير متوقع — يمكنك إعادة تحميل الواجهة للمتابعة
                </p>
              </div>
            </div>
            <pre className="text-[11px] font-mono bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 overflow-x-auto max-h-36 text-rose-600 dark:text-rose-300">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload / إعادة التحميل</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
