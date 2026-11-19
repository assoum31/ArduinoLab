import {
  Box,
  Cpu,
  FolderKanban,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { useApp, type ActiveTab } from '../context/AppContext';
import { tLoc, translations } from '../i18n/translations';
import { soundEngine } from '../utils/sound';
import { cn } from '../lib/utils';

export function MobileBottomNav() {
  const { lang, activeTab, setActiveTab } = useApp();

  const items: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Box;
  }> = [
    {
      id: 'studio',
      label: tLoc(translations.mobile.studioShort, lang),
      icon: Box,
    },
    {
      id: 'simulator',
      label: tLoc(translations.nav.simulator, lang),
      icon: Cpu,
    },
    {
      id: 'projects',
      label: tLoc(translations.nav.projects, lang),
      icon: FolderKanban,
    },
    {
      id: 'lessons',
      label: tLoc(translations.mobile.lessonsShort, lang),
      icon: GraduationCap,
    },
    {
      id: 'challenges',
      label: tLoc(translations.nav.challenges, lang),
      icon: Trophy,
    },
  ];

  return (
    <nav
      aria-label="Mobile Primary Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/92 dark:bg-[#0B1120]/92 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab(item.id);
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00878F]',
                active
                  ? 'text-[#00878F] dark:text-[#22c6cf]'
                  : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white',
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#00878F] dark:bg-[#22c6cf]"
                />
              )}
              <Icon className={cn('w-5 h-5 shrink-0', active && 'stroke-[2.25]')} />
              <span className="text-[10px] font-semibold leading-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
