import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cpu,
  FileCode2,
  GripVertical,
  Info,
  Move,
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

export const ARDUNOLAB_COMPONENT_MIME = 'application/x-ardunolab-component';

interface ComponentExplorerSidebarProps {
  lang: Language;
  onAddComponent: (kind: ComponentKind) => void;
  placedCounts: Partial<Record<ComponentKind, number>>;
  onClose?: () => void;
  onDragPartStart?: (kind: ComponentKind) => void;
  onDragPartEnd?: () => void;
}

function ComponentMiniIcon({ kind, swatch }: { kind: ComponentKind; swatch: string }) {
  if (kind.startsWith('led-')) {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <line x1="11" y1="18" x2="11" y2="25" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="17" y1="18" x2="17" y2="24" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M 8 18 L 8 11 A 6 6 0 0 1 20 11 L 20 18 Z"
          fill={swatch}
          stroke="#0f172a"
          strokeWidth="1"
        />
        <rect x="7" y="16.5" width="14" height="2.5" rx="1" fill={swatch} />
        <circle cx="12" cy="9.5" r="1.4" fill="#ffffff" fillOpacity="0.65" />
      </svg>
    );
  }
  if (kind.startsWith('resistor-')) {
    const b1 = kind === 'resistor-220' ? '#ef4444' : '#78350f';
    const b2 = kind === 'resistor-220' ? '#ef4444' : '#0f172a';
    const b3 = kind === 'resistor-220' ? '#78350f' : kind === 'resistor-1k' ? '#ef4444' : '#f97316';
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <line x1="2" y1="14" x2="26" y2="14" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <rect x="6" y="10" width="16" height="8" rx="3" fill="#f5deb3" stroke="#b45309" strokeWidth="1" />
        <rect x="8.5" y="10" width="2" height="8" fill={b1} />
        <rect x="12" y="10" width="2" height="8" fill={b2} />
        <rect x="15.5" y="10" width="2" height="8" fill={b3} />
        <rect x="19" y="10" width="1.5" height="8" fill="#d97706" />
      </svg>
    );
  }
  if (kind === 'button') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <rect x="5" y="6" width="18" height="16" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="8" y1="22" x2="8" y2="25" stroke="#94a3b8" strokeWidth="1.8" />
        <line x1="20" y1="22" x2="20" y2="25" stroke="#94a3b8" strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === 'potentiometer') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <rect x="5" y="5" width="18" height="18" rx="3.5" fill="#0369a1" stroke="#0c4a6e" strokeWidth="1.1" />
        <circle cx="14" cy="14" r="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        <line x1="14" y1="14" x2="18" y2="10" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'ldr') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <circle cx="14" cy="13" r="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.4" />
        <path d="M 9 10.5 Q 14 8 19 10.5 Q 14 13 9 15.5 Q 14 18 19 15.5" fill="none" stroke="#b45309" strokeWidth="1.5" />
        <line x1="11" y1="21" x2="11" y2="25" stroke="#94a3b8" strokeWidth="1.6" />
        <line x1="17" y1="21" x2="17" y2="25" stroke="#94a3b8" strokeWidth="1.6" />
      </svg>
    );
  }
  if (kind === 'ultrasonic') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <rect x="2" y="7" width="24" height="13" rx="2.5" fill="#0d9488" stroke="#115e59" strokeWidth="1.1" />
        <circle cx="8.5" cy="13.5" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
        <circle cx="8.5" cy="13.5" r="1.8" fill="#1e293b" />
        <circle cx="19.5" cy="13.5" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
        <circle cx="19.5" cy="13.5" r="1.8" fill="#1e293b" />
      </svg>
    );
  }
  if (kind === 'servo') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <rect x="4" y="9" width="20" height="13" rx="2.5" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.1" />
        <circle cx="18" cy="15.5" r="4.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        <rect x="16.5" y="6" width="3" height="10" rx="1.5" fill="#f8fafc" stroke="#475569" strokeWidth="0.9" />
      </svg>
    );
  }
  if (kind === 'buzzer') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <circle cx="14" cy="14" r="9" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
      </svg>
    );
  }
  if (kind === 'multimeter') {
    return (
      <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
        <rect x="4.5" y="2.5" width="19" height="22" rx="3.2" fill="#eab308" stroke="#a16207" strokeWidth="1.1" />
        <rect x="6.5" y="4.5" width="15" height="18" rx="2" fill="#1e293b" />
        <rect x="8" y="6" width="12" height="5.5" rx="1" fill="#a7f3d0" stroke="#0f172a" strokeWidth="0.6" />
        <circle cx="14" cy="15.8" r="3.4" fill="#334155" stroke="#94a3b8" strokeWidth="0.9" />
        <line x1="14" y1="15.8" x2="16.2" y2="13.8" stroke="#facc15" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="10" cy="21" r="1.4" fill="#ef4444" />
        <circle cx="18" cy="21" r="1.4" fill="#64748b" />
      </svg>
    );
  }
  // TMP36 Temperature Sensor (TO-92)
  return (
    <svg viewBox="0 0 28 28" className="w-6 h-6" aria-hidden="true">
      <path d="M 7 16 L 7 10 A 7 7 0 0 1 21 10 L 21 16 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.1" />
      <line x1="10" y1="16" x2="10" y2="24" stroke="#94a3b8" strokeWidth="1.6" />
      <line x1="14" y1="16" x2="14" y2="24" stroke="#94a3b8" strokeWidth="1.6" />
      <line x1="18" y1="16" x2="18" y2="24" stroke="#94a3b8" strokeWidth="1.6" />
    </svg>
  );
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
  { id: 'instruments', label: { ar: 'أجهزة قياس', en: 'Meters', fr: 'Mesure' } },
];

const CATEGORY_LABELS: Record<ExplorerCategory, { ar: string; en: string; fr: string }> = {
  outputs: { ar: 'مخارج', en: 'Outputs', fr: 'Sorties' },
  passives: { ar: 'مقاومات', en: 'Passives', fr: 'Passifs' },
  inputs: { ar: 'مداخل', en: 'Inputs', fr: 'Entrées' },
  sensors: { ar: 'حساسات', en: 'Sensors', fr: 'Capteurs' },
  instruments: { ar: 'أجهزة قياس', en: 'Meters', fr: 'Mesure' },
};

const CATEGORY_SEARCH_TERMS: Record<ExplorerCategory, string[]> = {
  outputs: ['outputs', 'output', 'actuators', 'actuator', 'مخارج', 'مخرج', 'إخراج', 'sorties', 'sortie', 'actionneur'],
  passives: ['passives', 'passive', 'resistors', 'resistor', 'مقاومات', 'مقاومة', 'عناصر سلبية', 'passifs', 'passif', 'resistances'],
  inputs: ['inputs', 'input', 'controls', 'control', 'مداخل', 'مدخل', 'إدخال', 'تحكم', 'entrees', 'entree', 'commandes'],
  sensors: ['sensors', 'sensor', 'detectors', 'detector', 'حساسات', 'حساس', 'مستشعر', 'مستشعرات', 'capteurs', 'capteur'],
  instruments: ['instruments', 'instrument', 'meters', 'meter', 'multimeter', 'test', 'measure', 'أجهزة قياس', 'قياس', 'مالتيميتر', 'mesure', 'multimetre'],
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const tokens = trimmed
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (tokens.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((segment, idx) =>
        idx % 2 === 1 ? (
          <mark
            key={idx}
            className="bg-amber-300/65 dark:bg-amber-400/25 text-inherit rounded-xs px-0.5"
          >
            {segment}
          </mark>
        ) : (
          <span key={idx}>{segment}</span>
        ),
      )}
    </>
  );
}

export function ComponentExplorerSidebar({
  lang,
  onAddComponent,
  placedCounts,
  onClose,
  onDragPartStart,
  onDragPartEnd,
}: ComponentExplorerSidebarProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ExplorerCategory>('all');
  const [activeSheet, setActiveSheet] = useState<ComponentDatasheet | null>(null);
  const [draggingKind, setDraggingKind] = useState<ComponentKind | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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

  const queryMatchedParts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [...COMPONENT_DATASHEETS];
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    const scored: Array<{ part: ComponentDatasheet; score: number }> = [];
    for (const part of COMPONENT_DATASHEETS) {
      const primaryName = normalizeSearchText(tLoc(part.name, lang));
      const allNames = normalizeSearchText(
        `${part.name.ar} ${part.name.en} ${part.name.fr}`,
      );
      const categoryHaystack = normalizeSearchText(
        [part.category, ...CATEGORY_SEARCH_TERMS[part.category]].join(' '),
      );
      const fullHaystack = normalizeSearchText(
        [
          part.name.ar,
          part.name.en,
          part.name.fr,
          part.category,
          ...CATEGORY_SEARCH_TERMS[part.category],
          part.partNumber,
          part.packageType,
          part.operatingVoltage,
          tLoc(part.summary, lang),
          ...part.keywords,
        ].join(' '),
      );

      if (!tokens.every((token) => fullHaystack.includes(token))) continue;

      let score = 0;
      if (primaryName.startsWith(normalizedQuery)) score += 6;
      else if (allNames.includes(normalizedQuery)) score += 4;
      if (categoryHaystack.includes(normalizedQuery)) score += 3;
      scored.push({ part, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.part);
  }, [query, lang]);

  const categoryMatchCounts = useMemo(() => {
    const counts: Record<'all' | ExplorerCategory, number> = {
      all: queryMatchedParts.length,
      outputs: 0,
      passives: 0,
      inputs: 0,
      sensors: 0,
      instruments: 0,
    };
    for (const part of queryMatchedParts) {
      counts[part.category]++;
    }
    return counts;
  }, [queryMatchedParts]);

  const filteredParts = useMemo(() => {
    if (category === 'all') return queryMatchedParts;
    return queryMatchedParts.filter((part) => part.category === category);
  }, [queryMatchedParts, category]);

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
            ref={searchInputRef}
            type="search"
            role="searchbox"
            aria-label={tLoc(translations.simulator.searchPartsPlaceholder, lang)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                setQuery('');
              }
            }}
            placeholder={tLoc(translations.simulator.searchPartsPlaceholder, lang)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 ps-8 pe-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00878F] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label={tLoc(translations.simulator.clearSearch, lang)}
              title={tLoc(translations.simulator.clearSearch, lang)}
              className="absolute top-1/2 -translate-y-1/2 end-1.5 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORY_TABS.map((tab) => {
            const matchCount = categoryMatchCounts[tab.id];
            const isActive = category === tab.id;
            const dimmed = query.trim().length > 0 && matchCount === 0 && !isActive;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  soundEngine.playSelect();
                  setCategory(tab.id);
                }}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-[#00878F] text-white'
                    : dimmed
                      ? 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                <span>{tLoc(tab.label, lang)}</span>
                {query.trim().length > 0 && (
                  <span
                    className={cn(
                      'font-mono tabular-nums text-[10px]',
                      isActive ? 'text-white/85' : 'opacity-70',
                    )}
                  >
                    {matchCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Move className="w-3 h-3 text-[#00878F] shrink-0" />
          <span className="truncate">
            {tLoc(translations.simulator.dragDropHint, lang)}
          </span>
        </p>
      </div>

      {/* Scrollable Draggable Electronics Parts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredParts.length === 0 ? (
          <div className="py-8 px-3 text-center space-y-2.5">
            <Search className="w-6 h-6 text-slate-400 mx-auto opacity-70" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tLoc(translations.simulator.noPartsMatch, lang)}
            </p>
            <div className="flex flex-col items-center gap-1.5">
              {category !== 'all' && queryMatchedParts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setCategory('all');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#00878F] text-white hover:bg-[#006d73] transition-colors cursor-pointer"
                >
                  {tLoc(translations.simulator.showInAllCategories, lang)} ({queryMatchedParts.length})
                </button>
              )}
              {(query || category !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setQuery('');
                    setCategory('all');
                    searchInputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {tLoc(translations.simulator.clearSearch, lang)}
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredParts.map((part) => {
            const countOnBoard = placedCounts[part.kind] || 0;
            const isInspecting = activeSheet?.kind === part.kind;
            const isDragging = draggingKind === part.kind;
            return (
              <div
                key={part.kind}
                draggable
                title={tLoc(translations.simulator.dragPartTooltip, lang)}
                onDragStart={(e) => {
                  clearCloseTimer();
                  setActiveSheet(null);
                  setDraggingKind(part.kind);
                  e.dataTransfer.setData(ARDUNOLAB_COMPONENT_MIME, part.kind);
                  e.dataTransfer.setData('text/plain', part.kind);
                  e.dataTransfer.effectAllowed = 'copy';
                  soundEngine.playSelect();
                  onDragPartStart?.(part.kind);
                }}
                onDragEnd={() => {
                  setDraggingKind(null);
                  onDragPartEnd?.();
                }}
                onMouseEnter={(e) => {
                  if (!draggingKind) openDatasheet(part, e.currentTarget);
                }}
                onMouseLeave={scheduleCloseDatasheet}
                className={cn(
                  'group rounded-lg border px-2 py-2 transition-all duration-150 flex items-center justify-between gap-1.5 select-none cursor-grab active:cursor-grabbing',
                  isDragging
                    ? 'opacity-55 scale-[0.98] border-dashed border-[#00878F] bg-[#00878F]/10'
                    : isInspecting
                      ? 'border-[#00878F] bg-[#00878F]/8 dark:bg-[#00878F]/15 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-[#00878F]/60 hover:bg-white dark:hover:bg-slate-900',
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical
                    aria-hidden="true"
                    className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#00878F] transition-colors shrink-0"
                  />
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
                    style={{ backgroundColor: `${part.swatch}16` }}
                  >
                    <ComponentMiniIcon kind={part.kind} swatch={part.swatch} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        <HighlightedText text={tLoc(part.name, lang)} query={query} />
                      </span>
                      {countOnBoard > 0 && (
                        <span className="font-mono tabular-nums text-[9px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                          ×{countOnBoard}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      <span className="font-mono truncate">
                        <HighlightedText text={part.partNumber} query={query} />
                      </span>
                      <span aria-hidden="true" className="opacity-50 shrink-0">
                        ·
                      </span>
                      <span className="shrink-0">
                        <HighlightedText
                          text={tLoc(CATEGORY_LABELS[part.category], lang)}
                          query={query}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Datasheet Pin (Touch-friendly) + Add to Breadboard */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    draggable={false}
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
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddComponent(part.kind);
                    }}
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
