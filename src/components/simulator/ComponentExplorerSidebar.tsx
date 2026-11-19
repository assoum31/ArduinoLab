import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Cpu,
  FileCode2,
  Info,
  Plus,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type { ComponentKind } from '../../types/arduino';
import {
  COMPONENT_DATASHEETS,
  type ComponentDatasheet,
  type ExplorerCategory,
} from '../../data/componentDatasheets';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

interface ComponentExplorerSidebarProps {
  lang: Language;
  onAddComponent: (kind: ComponentKind) => void;
  placedCounts: Partial<Record<ComponentKind, number>>;
  onClose?: () => void;
}

const CATEGORY_TABS: Array<{
  id: 'all' | ExplorerCategory;
  label: { ar: string; en: string; fr: string };
}> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tous' } },
  { id: 'outputs', label: { ar: 'مخارج', en: 'Outputs', fr: 'Sorties' } },
  { id: 'passives', label: { ar: 'مقاومات', en: 'Passives', fr: 'Passifs' } },
  { id: 'inputs', label: { ar: 'مداخل', en: 'Inputs', fr: 'Entrées' } },
  { id: 'sensors', label: { ar: 'حساسات', en: 'Sensors', fr: 'Capteurs' } },
];

export function ComponentExplorerSidebar({
  lang,
  onAddComponent,
  placedCounts,
  onClose,
}: ComponentExplorerSidebarProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ExplorerCategory>('all');
  const [activeSheet, setActiveSheet] = useState<ComponentDatasheet | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMPONENT_DATASHEETS.filter((part) => {
      if (category !== 'all' && part.category !== category) return false;
      if (!q) return true;
      const haystack = [
        part.name.ar,
        part.name.en,
        part.name.fr,
        part.partNumber,
        part.packageType,
        part.operatingVoltage,
        ...part.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  const computePopoverPosition = (rowEl: HTMLElement) => {
    const rowRect = rowEl.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect() || rowRect;
    const isRtl = document.documentElement.dir === 'rtl' || lang === 'ar';
    const cardW = 340;
    const cardH = 440;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Position beside the sidebar (left of sidebar in RTL, right of sidebar in LTR),
    // falling back to opposite side if viewport edge would clip it.
    let left = isRtl ? sidebarRect.left - cardW - 12 : sidebarRect.right + 12;
    if (left < 12) {
      left = Math.min(vw - cardW - 12, sidebarRect.right + 12);
    } else if (left + cardW > vw - 12) {
      left = Math.max(12, sidebarRect.left - cardW - 12);
    }

    const top = Math.max(16, Math.min(vh - cardH - 16, rowRect.top - 24));
    return { top, left };
  };

  const openDatasheet = (part: ComponentDatasheet, rowEl: HTMLElement) => {
    clearCloseTimer();
    setActiveSheet(part);
    setPopoverCoords(computePopoverPosition(rowEl));
  };

  const scheduleCloseDatasheet = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveSheet(null);
    }, 160);
  };

  const pinBadgeClass = (role: 'vcc' | 'gnd' | 'signal' | 'passive') => {
    switch (role) {
      case 'vcc':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'gnd':
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
      case 'signal':
        return 'bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] border-[#00878F]/35';
      default:
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35';
    }
  };

  return (
    <aside
      ref={sidebarRef}
      aria-label={tLoc(translations.simulator.componentExplorer, lang)}
      className="relative w-full xl:w-[276px] shrink-0 rounded-t-3xl xl:rounded-xl border-t xl:border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col overflow-hidden max-h-[82dvh] xl:max-h-[680px] shadow-2xl xl:shadow-none pb-safe xl:pb-0"
    >
      {/* Mobile Bottom Sheet Drag Handle */}
      <div
        aria-hidden="true"
        className="xl:hidden pt-2.5 pb-1 flex justify-center bg-slate-50/80 dark:bg-slate-900/70 shrink-0"
      >
        <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Sidebar Header */}
      <div className="px-4 xl:px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-900/70">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="w-4 h-4 text-[#00878F] shrink-0" />
          <h2 className="text-sm xl:text-xs font-extrabold text-slate-900 dark:text-white truncate">
            {tLoc(translations.simulator.componentExplorer, lang)}
          </h2>
          <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00878F]/10 text-[#00878F] dark:text-[#22c6cf]">
            {filteredParts.length}/{COMPONENT_DATASHEETS.length}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide Component Explorer"
            className="min-h-[40px] min-w-[40px] xl:min-h-0 xl:min-w-0 xl:p-1 flex items-center justify-center rounded-xl xl:rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 xl:w-3.5 xl:h-3.5" />
          </button>
        )}
      </div>

      {/* Search Bar & Category Filter */}
      <div className="p-2.5 space-y-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-2.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tLoc(translations.simulator.searchPartsPlaceholder, lang)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 ps-8 pe-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00878F]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 -translate-y-1/2 end-2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setCategory(tab.id);
              }}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                category === tab.id
                  ? 'bg-[#00878F] text-white'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {tLoc(tab.label, lang)}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-[#00878F] shrink-0" />
          <span className="truncate">
            {tLoc(translations.simulator.datasheetHoverHint, lang)}
          </span>
        </p>
      </div>

      {/* Scrollable Electronics Parts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredParts.length === 0 ? (
          <div className="py-8 px-3 text-center space-y-1.5">
            <Search className="w-6 h-6 text-slate-400 mx-auto opacity-70" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tLoc(translations.simulator.noPartsMatch, lang)}
            </p>
          </div>
        ) : (
          filteredParts.map((part) => {
            const countOnBoard = placedCounts[part.kind] || 0;
            const isInspecting = activeSheet?.kind === part.kind;
            return (
              <div
                key={part.kind}
                onMouseEnter={(e) => openDatasheet(part, e.currentTarget)}
                onMouseLeave={scheduleCloseDatasheet}
                className={cn(
                  'group rounded-lg border px-2.5 py-2 transition-all duration-150 flex items-center justify-between gap-2',
                  isInspecting
                    ? 'border-[#00878F] bg-[#00878F]/8 dark:bg-[#00878F]/15 shadow-xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-[#00878F]/60 hover:bg-white dark:hover:bg-slate-900',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/40 dark:border-slate-700 shadow-xs"
                    style={{ backgroundColor: `${part.swatch}22` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: part.swatch }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tLoc(part.name, lang)}
                      </span>
                      {countOnBoard > 0 && (
                        <span className="font-mono text-[9px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                          ×{countOnBoard}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      <span className="truncate">{part.partNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Datasheet Pin (Touch-friendly) + Add to Breadboard */}
                <div className="flex items-center gap-1.5 xl:gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playSelect();
                      const rowEl = e.currentTarget.closest('div.group') as HTMLElement | null;
                      if (isInspecting) {
                        setActiveSheet(null);
                      } else if (rowEl) {
                        openDatasheet(part, rowEl);
                      }
                    }}
                    title={tLoc(translations.simulator.viewDatasheet, lang)}
                    className={cn(
                      'min-h-[40px] min-w-[40px] xl:min-h-0 xl:min-w-0 xl:p-1.5 flex items-center justify-center rounded-xl xl:rounded-md transition-colors cursor-pointer',
                      isInspecting
                        ? 'bg-[#00878F] text-white'
                        : 'text-slate-500 xl:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 xl:bg-transparent hover:text-[#00878F] hover:bg-slate-200/70 dark:hover:bg-slate-800',
                    )}
                  >
                    <Info className="w-4 h-4 xl:w-3.5 xl:h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddComponent(part.kind)}
                    title={tLoc(translations.simulator.addToBoard, lang)}
                    className="min-h-[40px] min-w-[40px] xl:min-h-0 xl:min-w-0 xl:p-1.5 flex items-center justify-center rounded-xl xl:rounded-md bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] hover:bg-[#00878F] hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 xl:w-3.5 xl:h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Viewport-Aware Floating Datasheet & Technical Specifications Popover (Bottom Sheet on mobile < xl) */}
      {activeSheet && popoverCoords && (
        <>
          <div
            onClick={() => setActiveSheet(null)}
            className="xl:hidden fixed inset-0 z-[55] bg-slate-950/60 backdrop-blur-xs"
          />
          <div
            role="tooltip"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleCloseDatasheet}
            style={
              typeof window !== 'undefined' && window.innerWidth >= 1280
                ? {
                    top: popoverCoords.top,
                    left: popoverCoords.left,
                    width: 'min(340px, calc(100vw - 24px))',
                  }
                : undefined
            }
            className="fixed z-[60] inset-x-2 bottom-2 xl:inset-auto rounded-2xl xl:rounded-xl border border-[#00878F]/50 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 pb-safe xl:pb-0"
          >
          {/* Datasheet Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeSheet.swatch }}
                />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00878F] dark:text-[#22c6cf]">
                  {activeSheet.partNumber}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight">
                {tLoc(activeSheet.name, lang)}
              </h3>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {activeSheet.packageType}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSheet(null)}
              aria-label="Close datasheet"
              className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Datasheet Body */}
          <div className="p-3.5 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {tLoc(activeSheet.summary, lang)}
            </p>

            {/* Primary Electrical Ratings */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{tLoc(translations.studio.voltage, lang)}</span>
                </div>
                <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeSheet.operatingVoltage}
                </div>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'التيار / القدرة' : lang === 'fr' ? 'Courant / Puiss.' : 'Current / Power'}
                </div>
                <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeSheet.currentRating}
                </div>
              </div>
            </div>

            {/* Technical Specifications Table */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {tLoc(translations.studio.specs, lang)}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
                {activeSheet.specs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] bg-white dark:bg-slate-900/50"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {tLoc(spec.label, lang)}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-end">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinout Table */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'توزيع الأرجل (Pinout)' : 'Pinout Configuration'}
              </div>
              <div className="space-y-1">
                {activeSheet.pinout.map((p) => (
                  <div
                    key={p.pin}
                    className="flex items-start gap-2 text-[11px] leading-snug"
                  >
                    <span
                      className={cn(
                        'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 min-w-[42px] text-center',
                        pinBadgeClass(p.role),
                      )}
                    >
                      {p.pin}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 pt-0.5">
                      {tLoc(p.desc, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Arduino C++ Usage */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <FileCode2 className="w-3 h-3 text-[#00878F]" />
                <span>Arduino C++</span>
              </div>
              <pre
                dir="ltr"
                className="rounded-lg bg-slate-950 text-teal-300 font-mono text-[10.5px] px-2.5 py-2 overflow-x-auto leading-relaxed border border-slate-800"
              >
                {activeSheet.codeExample}
              </pre>
            </div>

            {/* Wiring Safety Note */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5 leading-snug">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{tLoc(activeSheet.wiringNote, lang)}</span>
            </div>

            {/* Quick Action Footer */}
            <button
              type="button"
              onClick={() => {
                onAddComponent(activeSheet.kind);
              }}
              className="w-full min-h-[44px] xl:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl xl:rounded-lg bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tLoc(translations.simulator.addToBoard, lang)}</span>
            </button>
          </div>
          </div>
        </>
      )}
    </aside>
  );
}
