import { useMemo, useState } from 'react';
import {
  Cpu,
  Compass,
  Keyboard,
  Palette,
  Play,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  useShortcuts,
  type ShortcutCategory,
  type ShortcutDefinition,
} from '../context/ShortcutContext';
import { tLoc, translations } from '../i18n/translations';
import { Dialog } from './ui/dialog';
import { cn } from '../lib/utils';

const CATEGORY_ORDER: ShortcutCategory[] = [
  'simulator',
  'navigation',
  'appearance',
];

export function ShortcutsModal() {
  const { lang, activeTab } = useApp();
  const {
    shortcuts,
    shortcutsEnabled,
    setShortcutsEnabled,
    modalOpen,
    setModalOpen,
    triggerShortcut,
    formatKeys,
  } = useShortcuts();

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shortcuts;
    return shortcuts.filter((item) => {
      const label = tLoc(item.label, lang).toLowerCase();
      const desc = tLoc(item.description, lang).toLowerCase();
      const keyStr = item.keys.join('+').toLowerCase();
      return (
        label.includes(q) ||
        desc.includes(q) ||
        keyStr.includes(q) ||
        item.label.en.toLowerCase().includes(q)
      );
    });
  }, [lang, query, shortcuts]);

  const grouped = useMemo(() => {
    const map: Record<ShortcutCategory, ShortcutDefinition[]> = {
      simulator: [],
      navigation: [],
      appearance: [],
    };
    for (const item of filtered) {
      map[item.category].push(item);
    }
    return map;
  }, [filtered]);

  const categoryMeta: Record<
    ShortcutCategory,
    { label: string; icon: typeof Cpu }
  > = {
    simulator: {
      label: tLoc(translations.shortcuts.catSimulator, lang),
      icon: Cpu,
    },
    navigation: {
      label: tLoc(translations.shortcuts.catNavigation, lang),
      icon: Compass,
    },
    appearance: {
      label: tLoc(translations.shortcuts.catAppearance, lang),
      icon: Palette,
    },
  };

  const handleRunFromModal = (item: ShortcutDefinition) => {
    if (item.id === 'open-shortcuts') {
      setModalOpen(false);
      return;
    }
    setModalOpen(false);
    window.setTimeout(() => {
      triggerShortcut(item.id);
    }, 30);
  };

  return (
    <Dialog
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={tLoc(translations.shortcuts.modalTitle, lang)}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {tLoc(translations.shortcuts.modalSubtitle, lang)}
        </p>

        {/* Enable / Disable Global Shortcuts Accessibility Toggle */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Keyboard className="w-4 h-4 text-[#00878F] dark:text-[#22c6cf] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                {tLoc(translations.shortcuts.enabledLabel, lang)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {tLoc(translations.shortcuts.enabledHint, lang)}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shortcutsEnabled}
            aria-label={tLoc(translations.shortcuts.enabledLabel, lang)}
            onClick={() => setShortcutsEnabled(!shortcutsEnabled)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
              shortcutsEnabled
                ? 'bg-[#00878F]'
                : 'bg-slate-300 dark:bg-slate-700',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform',
                shortcutsEnabled
                  ? 'translate-x-6 rtl:-translate-x-6'
                  : 'translate-x-1 rtl:-translate-x-1',
              )}
            />
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tLoc(translations.shortcuts.searchPlaceholder, lang)}
            aria-label={tLoc(translations.shortcuts.searchPlaceholder, lang)}
            className="w-full ps-9 pe-9 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00878F]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categorized Shortcut List */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {tLoc(translations.shortcuts.noMatches, lang)}
          </div>
        ) : (
          <div className="space-y-5">
            {CATEGORY_ORDER.map((category) => {
              const items = grouped[category];
              if (items.length === 0) return null;
              const MetaIcon = categoryMeta[category].icon;
              return (
                <section key={category} aria-label={categoryMeta[category].label}>
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    <MetaIcon className="w-3.5 h-3.5 text-[#00878F] dark:text-[#22c6cf]" />
                    <span>{categoryMeta[category].label}</span>
                  </h3>
                  <div className="divide-y divide-slate-200/80 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                    {items.map((item) => {
                      const displayKeys = formatKeys(item.keys);
                      const isSimulatorInactive =
                        item.scope === 'simulator' && activeTab !== 'simulator';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleRunFromModal(item)}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-start transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00878F]',
                            !shortcutsEnabled && item.id !== 'open-shortcuts' && 'opacity-60',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {tLoc(item.label, lang)}
                              </span>
                              {item.scope === 'simulator' && (
                                <span
                                  className={cn(
                                    'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded',
                                    isSimulatorInactive
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                      : 'bg-[#00878F]/15 text-[#00878F] dark:bg-[#22c6cf]/20 dark:text-[#22c6cf]',
                                  )}
                                >
                                  {tLoc(translations.shortcuts.simulatorOnlyTag, lang)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {tLoc(item.description, lang)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              dir="ltr"
                              className="inline-flex items-center gap-1"
                            >
                              {displayKeys.map((keyToken, idx) => (
                                <span
                                  key={`${item.id}-${keyToken}-${idx}`}
                                  className="inline-flex items-center gap-1"
                                >
                                  <kbd className="min-w-[24px] text-center px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                                    {keyToken}
                                  </kbd>
                                  {idx < displayKeys.length - 1 && (
                                    <span className="text-[10px] text-slate-400">+</span>
                                  )}
                                </span>
                              ))}
                            </span>
                            <Play className="w-3 h-3 text-slate-400 opacity-60 hidden sm:block" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{tLoc(translations.shortcuts.pressTip, lang)}</span>
          <span dir="ltr" className="font-mono font-semibold">
            Esc
          </span>
        </div>
      </div>
    </Dialog>
  );
}
