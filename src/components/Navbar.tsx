import { useState } from 'react';
import {
  Box,
  ChevronRight,
  Cpu,
  FolderKanban,
  Globe,
  GraduationCap,
  Keyboard,
  Medal,
  Monitor,
  Moon,
  Palette,
  Settings,
  Shield,
  SlidersHorizontal,
  Sun,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp, type ActiveTab, type ThemePreference } from '../context/AppContext';
import { useShortcuts } from '../context/ShortcutContext';
import { LESSONS } from '../data/lessons';
import { ALL_READY_PROJECTS } from '../data/showcaseProjects';
import { tLoc, translations, type Language } from '../i18n/translations';
import { soundEngine } from '../utils/sound';
import { Dialog } from './ui/dialog';
import { PWAInstallButton } from './PWAControls';
import { cn } from '../lib/utils';

export function Navbar() {
  const {
    lang,
    setLang,
    theme,
    themePreference,
    setThemePreference,
    toggleTheme,
    soundEnabled,
    toggleSound,
    activeTab,
    setActiveTab,
    setProfileOpen,
    settingsOpen,
    setSettingsOpen,
    profile,
    firebaseUser,
    isAdmin,
  } = useApp();
  const { toggleModal: toggleShortcutsModal, modalOpen: shortcutsOpen, isMac } =
    useShortcuts();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Box;
    count?: number;
  }> = [
    { id: 'studio', label: tLoc(translations.nav.studio3d, lang), icon: Box },
    { id: 'simulator', label: tLoc(translations.nav.simulator, lang), icon: Cpu },
    { id: 'projects', label: tLoc(translations.nav.projects, lang), icon: FolderKanban, count: ALL_READY_PROJECTS.length },
    { id: 'lessons', label: tLoc(translations.nav.lessons, lang), icon: GraduationCap, count: LESSONS.length },
    { id: 'challenges', label: tLoc(translations.nav.challenges, lang), icon: Trophy },
    { id: 'leaderboard', label: tLoc(translations.nav.leaderboard, lang), icon: Medal },
  ];

  const langs: Language[] = ['ar', 'en', 'fr'];

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    title: string;
    icon: typeof Sun;
  }> = [
    {
      id: 'light',
      label: tLoc(translations.nav.themeLight, lang),
      title: tLoc(translations.nav.switchToLight, lang),
      icon: Sun,
    },
    {
      id: 'dark',
      label: tLoc(translations.nav.themeDark, lang),
      title: tLoc(translations.nav.switchToDark, lang),
      icon: Moon,
    },
    {
      id: 'system',
      label: tLoc(translations.nav.themeSystem, lang),
      title: tLoc(translations.nav.useSystemTheme, lang),
      icon: Monitor,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 h-12 md:h-14 border-b border-slate-200 dark:border-slate-800 bg-white/92 dark:bg-[#0B1120]/92 backdrop-blur-md">
        <div className="h-full max-w-[1600px] mx-auto px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Clean single-line brand wordmark */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setActiveTab('studio');
            }}
            className="flex items-center gap-2 whitespace-nowrap shrink-0 text-slate-900 dark:text-white font-extrabold text-[15px] sm:text-lg tracking-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F] rounded-md px-1 min-h-[40px]"
          >
            <span className="w-7 h-7 rounded-lg bg-[#00878F] text-white flex items-center justify-center text-xs font-mono font-bold shadow-sm">
              ∞
            </span>
            <span>{tLoc(translations.brand, lang)}</span>
          </button>

          {/* Zone 2: Desktop single-line navigation links (mobile uses thumb-zone bottom bar) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-2 lg:gap-5 overflow-x-auto no-scrollbar min-w-0"
          >
            {navItems.map((item) => {
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
                  className={cn(
                    'relative flex items-center gap-1.5 px-1.5 py-4 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00878F] rounded-md',
                    active
                      ? 'text-[#00878F] dark:text-[#22c6cf]'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={cn(
                        'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums',
                        active
                          ? 'bg-[#00878F]/15 text-[#00878F] dark:bg-[#22c6cf]/20 dark:text-[#22c6cf]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#00878F] dark:bg-[#22c6cf]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Responsive Utilities & Profile Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Language switcher */}
            <div
              role="group"
              aria-label="Language"
              className="hidden md:flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900"
            >
              {langs.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    'px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                    lang === l
                      ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Desktop Install App Prompt (auto-hides when installed) */}
            <div className="hidden md:flex">
              <PWAInstallButton compact />
            </div>

            {/* Desktop Admin link */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab('admin');
              }}
              title={tLoc(translations.nav.admin, lang)}
              className={cn(
                'hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : isAdmin
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">{tLoc(translations.nav.admin, lang)}</span>
            </button>

            {/* Desktop Shortcuts & Sound */}
            <button
              type="button"
              onClick={toggleShortcutsModal}
              aria-label={`${tLoc(translations.shortcuts.buttonLabel, lang)} (${isMac ? '⌘+/' : 'Ctrl+/'})`}
              aria-haspopup="dialog"
              aria-expanded={shortcutsOpen}
              title={`${tLoc(translations.shortcuts.buttonLabel, lang)} (${isMac ? '⌘+/' : 'Ctrl+/'})`}
              className={cn(
                'hidden md:inline-flex p-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                shortcutsOpen
                  ? 'bg-[#00878F]/15 text-[#00878F] dark:bg-[#22c6cf]/20 dark:text-[#22c6cf]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              <Keyboard className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleSound}
              aria-label={
                soundEnabled
                  ? tLoc(translations.nav.muteSound, lang)
                  : tLoc(translations.nav.unmuteSound, lang)
              }
              aria-pressed={soundEnabled}
              title={
                soundEnabled
                  ? tLoc(translations.nav.muteSound, lang)
                  : tLoc(translations.nav.unmuteSound, lang)
              }
              className="hidden md:inline-flex p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Dedicated Light / Dark Theme Toggle Button (persisted in localStorage) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark'
                  ? tLoc(translations.nav.switchToLight, lang)
                  : tLoc(translations.nav.switchToDark, lang)
              }
              aria-pressed={theme === 'dark'}
              title={
                theme === 'dark'
                  ? tLoc(translations.nav.switchToLight, lang)
                  : tLoc(translations.nav.switchToDark, lang)
              }
              className={cn(
                'inline-flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] md:min-h-0 md:min-w-0 md:px-2.5 md:py-1.5 rounded-xl md:rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                theme === 'dark'
                  ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:border-[#22c6cf]/60'
                  : 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-white hover:border-[#00878F]/60',
              )}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 md:w-3.5 md:h-3.5 text-[#22c6cf] shrink-0" />
              ) : (
                <Sun className="w-4 h-4 md:w-3.5 md:h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="hidden lg:inline">
                {theme === 'dark'
                  ? tLoc(translations.nav.themeDark, lang)
                  : tLoc(translations.nav.themeLight, lang)}
              </span>
            </button>

            {/* Desktop Appearance & Firebase Cloud Settings Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setSettingsOpen(true);
              }}
              aria-label={tLoc(translations.settings.title, lang)}
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              title={tLoc(translations.settings.title, lang)}
              className={cn(
                'hidden md:inline-flex p-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                settingsOpen
                  ? 'bg-[#00878F]/15 text-[#00878F] dark:bg-[#22c6cf]/20 dark:text-[#22c6cf]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Profile & XP Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setProfileOpen(true);
              }}
              className="flex items-center gap-1.5 sm:gap-2 min-h-[40px] md:min-h-0 px-2.5 sm:px-3 py-1.5 rounded-xl md:rounded-lg bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]"
            >
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={profile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="tabular-nums font-mono">{profile.xp} XP</span>
            </button>

            {/* Mobile Quick Settings & Overflow Sheet Trigger */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setMobileMenuOpen(true);
              }}
              aria-label={tLoc(translations.mobile.quickSettings, lang)}
              aria-haspopup="dialog"
              aria-expanded={mobileMenuOpen}
              className={cn(
                'md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                activeTab === 'leaderboard' || activeTab === 'admin'
                  ? 'border-[#00878F] bg-[#00878F]/10 text-[#00878F] dark:text-[#22c6cf]'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200',
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Sheet: Leaderboard, Admin, Language, Theme, Sound & Shortcuts */}
      <Dialog
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={tLoc(translations.mobile.quickSettings, lang)}
      >
        <div className="space-y-5">
          {/* Secondary Destinations */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab('leaderboard');
                setMobileMenuOpen(false);
              }}
              className={cn(
                'w-full min-h-[52px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-colors cursor-pointer',
                activeTab === 'leaderboard'
                  ? 'border-[#00878F] bg-[#00878F]/10 text-[#00878F] dark:text-[#22c6cf]'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100',
              )}
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Medal className="w-5 h-5 text-amber-500" />
                <span>{tLoc(translations.nav.leaderboard, lang)}</span>
              </span>
              <ChevronRight className="w-4 h-4 opacity-60 rtl:rotate-180" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setMobileMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="w-full min-h-[52px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-[#00878F]/35 bg-[#00878F]/10 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Palette className="w-5 h-5 text-[#00878F]" />
                <span>{tLoc(translations.settings.title, lang)}</span>
              </span>
              <ChevronRight className="w-4 h-4 opacity-60 rtl:rotate-180" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className={cn(
                'w-full min-h-[52px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-colors cursor-pointer',
                activeTab === 'admin'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100',
              )}
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Shield className="w-5 h-5 text-amber-500" />
                <span>{tLoc(translations.nav.admin, lang)}</span>
              </span>
              <ChevronRight className="w-4 h-4 opacity-60 rtl:rotate-180" />
            </button>
          </div>

          {/* Language Selector (Mobile Touch Friendly) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Globe className="w-3.5 h-3.5 text-[#00878F]" />
              <span>{tLoc(translations.mobile.language, lang)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'ar', label: 'العربية' },
                { id: 'en', label: 'English' },
                { id: 'fr', label: 'Français' },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLang(item.id)}
                  aria-pressed={lang === item.id}
                  className={cn(
                    'min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
                    lang === item.id
                      ? 'border-[#00878F] bg-[#00878F] text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Appearance Theme Selector (Light / Dark / System) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {tLoc(translations.nav.themeLabel, lang)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = themePreference === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setThemePreference(option.id)}
                    aria-pressed={active}
                    className={cn(
                      'min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer',
                      active
                        ? 'border-[#00878F] bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf]'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound & Keyboard Shortcuts */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundEnabled}
              className="min-h-[48px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#00878F]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span className="truncate">
                {soundEnabled
                  ? tLoc(translations.nav.muteSound, lang)
                  : tLoc(translations.nav.unmuteSound, lang)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                toggleShortcutsModal();
              }}
              className="min-h-[48px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-[#00878F]" />
              <span className="truncate">
                {tLoc(translations.shortcuts.buttonLabel, lang)}
              </span>
            </button>
          </div>

          {/* Mobile Install App CTA (auto-hides when already installed in standalone mode) */}
          <PWAInstallButton
            fullWidth
            onAction={() => setMobileMenuOpen(false)}
          />
        </div>
      </Dialog>
    </>
  );
}
