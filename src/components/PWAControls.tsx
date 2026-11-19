import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  RefreshCw,
  Share,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  useOnlineStatus,
  usePWAInstall,
  useServiceWorkerState,
} from '../hooks/usePWA';
import { tLoc, translations } from '../i18n/translations';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { soundEngine } from '../utils/sound';
import { cn } from '../lib/utils';

interface PWAInstallButtonProps {
  compact?: boolean;
  fullWidth?: boolean;
  onAction?: () => void;
}

export function PWAInstallButton({
  compact = false,
  fullWidth = false,
  onAction,
}: PWAInstallButtonProps) {
  const { lang } = useApp();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          soundEngine.playSelect();
          await install();
          onAction?.();
        }}
        title={tLoc(translations.pwa.installTitle, lang)}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-xl md:rounded-lg border border-[#00878F]/40 bg-[#00878F]/10 hover:bg-[#00878F] text-[#00878F] dark:text-[#22c6cf] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
          fullWidth
            ? 'w-full min-h-[48px] px-4 py-2.5'
            : compact
              ? 'px-2.5 py-1.5'
              : 'px-3 py-1.5',
        )}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className={compact ? 'hidden xl:inline' : ''}>
          {tLoc(translations.pwa.installApp, lang)}
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            setShowIOSGuide(true);
          }}
          title={tLoc(translations.pwa.installIosTitle, lang)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-xl md:rounded-lg border border-[#00878F]/40 bg-[#00878F]/10 hover:bg-[#00878F] text-[#00878F] dark:text-[#22c6cf] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
            fullWidth ? 'w-full min-h-[48px] px-4 py-2.5' : 'px-2.5 py-1.5',
          )}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className={compact ? 'hidden xl:inline' : ''}>
            {tLoc(translations.pwa.installApp, lang)}
          </span>
        </button>

        <Dialog
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title={tLoc(translations.pwa.installIosTitle, lang)}
          className="max-w-sm"
        >
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>{tLoc(translations.pwa.installIosIntro, lang)}</p>
            <ol className="space-y-2.5 list-decimal list-inside text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <Share className="w-4 h-4 text-[#00878F] shrink-0 mt-0.5" />
                <span>{tLoc(translations.pwa.installIosStep1, lang)}</span>
              </li>
              <li>{tLoc(translations.pwa.installIosStep2, lang)}</li>
            </ol>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowIOSGuide(false)}
            >
              {tLoc(translations.pwa.gotIt, lang)}
            </Button>
          </div>
        </Dialog>
      </>
    );
  }

  return null;
}

export function OfflineStatusBanner() {
  const { lang } = useApp();
  const isOnline = useOnlineStatus();
  const {
    offlineReady,
    needRefresh,
    applyUpdate,
    dismissOfflineReady,
    dismissRefresh,
  } = useServiceWorkerState();

  // Auto-dismiss the "Ready for offline use" confirmation after 5s
  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => {
      dismissOfflineReady();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [offlineReady, dismissOfflineReady]);

  if (isOnline && !offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 md:bottom-4 start-3 sm:start-4 end-3 sm:end-auto z-40 flex flex-col gap-2 pointer-events-none max-w-md"
    >
      {!isOnline && (
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500 text-slate-950 px-3.5 py-2.5 text-xs font-semibold shadow-lg">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="leading-snug">
            {tLoc(translations.pwa.offlineNotice, lang)}
          </span>
        </div>
      )}

      {needRefresh && (
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-[#00878F]/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-4 h-4 text-[#00878F] dark:text-[#22c6cf] shrink-0" />
            <span className="truncate">
              {tLoc(translations.pwa.updateAvailable, lang)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={applyUpdate}
              className="px-2.5 py-1 rounded-lg bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-bold cursor-pointer"
            >
              {tLoc(translations.pwa.updateNow, lang)}
            </button>
            <button
              type="button"
              onClick={dismissRefresh}
              aria-label="Dismiss update"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {isOnline && offlineReady && !needRefresh && (
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{tLoc(translations.pwa.offlineReady, lang)}</span>
          </div>
          <button
            type="button"
            onClick={dismissOfflineReady}
            aria-label="Dismiss"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
