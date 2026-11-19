import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard } from 'lucide-react';
import { useApp, type ActiveTab } from './AppContext';
import { tLoc, translations, type LocalizedText } from '../i18n/translations';
import { soundEngine } from '../utils/sound';

export type ShortcutCategory = 'navigation' | 'simulator' | 'appearance';

export interface ShortcutCombo {
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  combo: ShortcutCombo;
  altCombos?: ShortcutCombo[];
  keys: string[];
  label: LocalizedText;
  description: LocalizedText;
  scope: 'global' | 'simulator';
  allowInInput?: boolean;
}

interface ShortcutToast {
  id: number;
  keys: string[];
  message: string;
}

interface ShortcutContextValue {
  shortcuts: ShortcutDefinition[];
  isMac: boolean;
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  toggleModal: () => void;
  registerHandler: (id: string, handler: () => string | void) => () => void;
  triggerShortcut: (id: string) => void;
  announceFeedback: (keys: string[], message: string) => void;
  formatKeys: (keys: string[]) => string[];
}

const SHORTCUTS_ENABLED_KEY = 'ardunolab_shortcuts_enabled';

const WORKSPACE_TAB_ORDER: ActiveTab[] = [
  'studio',
  'simulator',
  'projects',
  'lessons',
  'challenges',
  'leaderboard',
];

const TAB_LABELS: Record<ActiveTab, LocalizedText> = {
  studio: translations.nav.studio3d,
  simulator: translations.nav.simulator,
  projects: translations.nav.projects,
  lessons: translations.nav.lessons,
  challenges: translations.nav.challenges,
  leaderboard: translations.nav.leaderboard,
  admin: translations.nav.admin,
};

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // Simulator Lab
  {
    id: 'run-simulation',
    category: 'simulator',
    combo: { key: 'Enter', ctrlOrMeta: true },
    keys: ['Ctrl', 'Enter'],
    label: {
      ar: 'تشغيل / إيقاف المحاكاة',
      en: 'Run / Stop Simulation',
      fr: 'Lancer / Arrêter la Simulation',
    },
    description: {
      ar: 'بدء أو إيقاف تنفيذ كود الأردوينو فوراً (يعمل حتى أثناء الكتابة في محرر الكود)',
      en: 'Start or stop Arduino sketch execution immediately (works inside the code editor)',
      fr: 'Démarre ou arrête le sketch Arduino immédiatement (même dans l’éditeur de code)',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'reset-simulation',
    category: 'simulator',
    combo: { key: 'r', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'R'],
    label: {
      ar: 'إعادة ضبط المحاكي',
      en: 'Reset Simulation',
      fr: 'Réinitialiser la Simulation',
    },
    description: {
      ar: 'إيقاف المحاكاة وتصفير المنافذ والمراقب التسلسلي',
      en: 'Stop execution and clear pin states and Serial Monitor logs',
      fr: 'Arrête la simulation et efface les états des broches et le moniteur série',
    },
    scope: 'simulator',
    allowInInput: true,
  },
  {
    id: 'toggle-board-view',
    category: 'simulator',
    combo: { key: 'b', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'B'],
    label: {
      ar: 'تبديل Breadboard / المخطط',
      en: 'Toggle Breadboard / Schematic',
      fr: 'Basculer Breadboard / Schéma',
    },
    description: {
      ar: 'التبديل بين عرض لوحة التجارب الحقيقية والمخطط الكهربائي',
      en: 'Switch between the physical Breadboard canvas and Schematic view',
      fr: 'Alterne entre la plaque d’essai et le schéma électrique',
    },
    scope: 'simulator',
    allowInInput: true,
  },
  {
    id: 'cycle-editor-mode',
    category: 'simulator',
    combo: { key: 'e', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'E'],
    label: {
      ar: 'تبديل وضع المحرر (بلوك / مزدوج / كود)',
      en: 'Cycle Editor Mode (Blocks / Split / C++)',
      fr: 'Changer Mode Éditeur (Blocs / Mixte / C++)',
    },
    description: {
      ar: 'التنقل السريع بين المحرر المرئي والوضع المزدوج وكود C++',
      en: 'Cycle between Blockly visual blocks, Split view, and C++ code editor',
      fr: 'Alterne entre Blockly, vue divisée et éditeur C++',
    },
    scope: 'simulator',
    allowInInput: true,
  },
  {
    id: 'toggle-explorer',
    category: 'simulator',
    combo: { key: 'x', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'X'],
    label: {
      ar: 'إظهار / إخفاء مستكشف المكونات',
      en: 'Toggle Component Explorer',
      fr: 'Afficher / Masquer l’Explorateur',
    },
    description: {
      ar: 'فتح أو طي الشريط الجانبي لمكتبة القطع الإلكترونية وبياناتها الفنية',
      en: 'Show or hide the searchable electronics parts and datasheet sidebar',
      fr: 'Affiche ou masque la barre latérale des composants et fiches techniques',
    },
    scope: 'simulator',
    allowInInput: true,
  },
  {
    id: 'toggle-focus-mode',
    category: 'simulator',
    combo: { key: 'f', ctrlOrMeta: true, shift: true },
    altCombos: [{ key: 'f', alt: true }],
    keys: ['Ctrl', 'Shift', 'F'],
    label: {
      ar: 'تبديل وضع التركيز',
      en: 'Toggle Focus Mode',
      fr: 'Activer / Quitter Mode Focus',
    },
    description: {
      ar: 'إخفاء القوائم والأشرطة لتوسيع مساحة لوحة التجارب ومحرر الكود',
      en: 'Hide navigation and sidebars to maximize breadboard and code workspace',
      fr: 'Masque la navigation et les panneaux pour maximiser l’espace de travail',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'save-project',
    category: 'simulator',
    combo: { key: 's', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'S'],
    label: {
      ar: 'حفظ المشروع سحابياً',
      en: 'Save Project to Cloud',
      fr: 'Sauvegarder le Projet',
    },
    description: {
      ar: 'فتح نافذة حفظ الدائرة والكود في معرض مشاريعك',
      en: 'Open the dialog to save your current circuit and sketch',
      fr: 'Ouvre la fenêtre de sauvegarde du circuit et du code',
    },
    scope: 'simulator',
    allowInInput: true,
  },

  // Navigation & Views
  {
    id: 'switch-view',
    category: 'navigation',
    combo: { key: 'l', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'L'],
    label: {
      ar: 'تبديل الشاشة (العرض التالي)',
      en: 'Switch View (Next Workspace)',
      fr: 'Changer de Vue (Espace Suivant)',
    },
    description: {
      ar: 'التنقل الدائري السريع بين استوديو 3D، المحاكي، المشاريع، الدروس، التحديات والمتصدرين',
      en: 'Cycle through 3D Studio, Simulator, Projects, Lessons, Challenges, and Leaderboard',
      fr: 'Parcourt Studio 3D, Simulateur, Projets, Leçons, Défis et Classement',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'jump-studio',
    category: 'navigation',
    combo: { key: '1', alt: true },
    keys: ['Alt', '1'],
    label: {
      ar: 'الانتقال إلى استوديو 3D',
      en: 'Go to 3D Studio',
      fr: 'Aller au Studio 3D',
    },
    description: {
      ar: 'فتح لوحة Arduino Uno R3 ثلاثية الأبعاد',
      en: 'Jump directly to the interactive 3D Arduino Uno R3 board',
      fr: 'Ouvre directement la carte Arduino Uno R3 en 3D',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'jump-simulator',
    category: 'navigation',
    combo: { key: '2', alt: true },
    keys: ['Alt', '2'],
    label: {
      ar: 'الانتقال إلى المحاكي',
      en: 'Go to Simulator Lab',
      fr: 'Aller au Simulateur',
    },
    description: {
      ar: 'فتح مختبر المحاكاة ولوحة التجارب ومحرر الكود',
      en: 'Jump directly to the Breadboard & Code Simulator',
      fr: 'Ouvre directement le simulateur Breadboard & Code',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'jump-projects',
    category: 'navigation',
    combo: { key: '3', alt: true },
    keys: ['Alt', '3'],
    label: {
      ar: 'الانتقال إلى معرض المشاريع',
      en: 'Go to Projects Gallery',
      fr: 'Aller aux Projets',
    },
    description: {
      ar: 'استعراض القوالب الجاهزة ومشاريعك المحفوظة',
      en: 'Browse Starter Templates, showcase circuits, and saved projects',
      fr: 'Parcourt les modèles de départ et vos projets sauvegardés',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'jump-lessons',
    category: 'navigation',
    combo: { key: '4', alt: true },
    keys: ['Alt', '4'],
    label: {
      ar: 'الانتقال إلى الدروس والخارطة',
      en: 'Go to Lessons & Roadmap',
      fr: 'Aller aux Leçons',
    },
    description: {
      ar: 'فتح المسار التعليمي التفاعلي المكون من 11 درساً',
      en: 'Open the interactive 11-lesson Arduino curriculum',
      fr: 'Ouvre le parcours interactif de 11 leçons',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'jump-challenges',
    category: 'navigation',
    combo: { key: '5', alt: true },
    keys: ['Alt', '5'],
    label: {
      ar: 'الانتقال إلى ساحة التحديات',
      en: 'Go to Challenge Arena',
      fr: 'Aller aux Défis',
    },
    description: {
      ar: 'اختبر مهاراتك في تحديات التوصيل وتصحيح الأكواد',
      en: 'Open hardware wiring and C++ debugging challenges',
      fr: 'Ouvre les défis de câblage et de débogage C++',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'jump-leaderboard',
    category: 'navigation',
    combo: { key: '6', alt: true },
    keys: ['Alt', '6'],
    label: {
      ar: 'الانتقال إلى لوحة المتصدرين',
      en: 'Go to Leaderboard',
      fr: 'Aller au Classement',
    },
    description: {
      ar: 'عرض ترتيب المتعلمين ونقاط الخبرة XP',
      en: 'View community XP rankings and top makers',
      fr: 'Affiche le classement communautaire et les points XP',
    },
    scope: 'global',
    allowInInput: true,
  },

  // Appearance & Utilities
  {
    id: 'toggle-theme',
    category: 'appearance',
    combo: { key: 'd', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'D'],
    label: {
      ar: 'تبديل الوضع الفاتح / الداكن',
      en: 'Toggle Light / Dark Theme',
      fr: 'Basculer Mode Clair / Sombre',
    },
    description: {
      ar: 'التبديل الفوري بين المظهر الفاتح والداكن للواجهة',
      en: 'Switch immediately between Light and Dark appearance',
      fr: 'Bascule immédiatement entre les thèmes clair et sombre',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'toggle-sound',
    category: 'appearance',
    combo: { key: 'm', ctrlOrMeta: true, shift: true },
    keys: ['Ctrl', 'Shift', 'M'],
    label: {
      ar: 'كتم / تفعيل المؤثرات الصوتية',
      en: 'Mute / Unmute Sound',
      fr: 'Couper / Activer le Son',
    },
    description: {
      ar: 'تشغيل أو إيقاف أصوات التفاعل والجرس الكهربائي',
      en: 'Toggle UI interaction audio and Piezo buzzer feedback',
      fr: 'Active ou désactive les effets sonores et le buzzer',
    },
    scope: 'global',
    allowInInput: true,
  },
  {
    id: 'open-shortcuts',
    category: 'appearance',
    combo: { key: '/', ctrlOrMeta: true },
    altCombos: [{ key: '?', shift: true }, { key: '?' }],
    keys: ['Ctrl', '/'],
    label: {
      ar: 'عرض قائمة اختصارات لوحة المفاتيح',
      en: 'Open Keyboard Shortcuts',
      fr: 'Ouvrir les Raccourcis Clavier',
    },
    description: {
      ar: 'فتح أو إغلاق دليل الاختصارات السريع (أو اضغط ? خارج حقول النص)',
      en: 'Show or hide this shortcuts guide (or press ? outside text inputs)',
      fr: 'Affiche ou masque ce guide (ou appuyez sur ? hors des champs de texte)',
    },
    scope: 'global',
    allowInInput: true,
  },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

function matchesCombo(event: KeyboardEvent, combo: ShortcutCombo): boolean {
  const wantsCtrlOrMeta = Boolean(combo.ctrlOrMeta);
  const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
  if (wantsCtrlOrMeta !== hasCtrlOrMeta) return false;

  const wantsAlt = Boolean(combo.alt);
  if (wantsAlt !== event.altKey) return false;

  const targetKey = combo.key.toLowerCase();
  const eventKey = event.key.toLowerCase();

  // Handle '?' which produces shiftKey=true on standard keyboards
  if (targetKey === '?') {
    return event.key === '?' && !hasCtrlOrMeta && !event.altKey;
  }

  const wantsShift = Boolean(combo.shift);
  if (wantsShift !== event.shiftKey) return false;

  // Match either event.key or physical key code (useful for Arabic/French layouts!)
  if (eventKey === targetKey) return true;
  if (targetKey.length === 1 && targetKey >= 'a' && targetKey <= 'z') {
    if (event.code === `Key${targetKey.toUpperCase()}`) return true;
  }
  if (targetKey.length === 1 && targetKey >= '0' && targetKey <= '9') {
    if (event.code === `Digit${targetKey}`) return true;
  }
  if (targetKey === '/' && event.code === 'Slash') {
    return true;
  }
  return false;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const {
    lang,
    activeTab,
    setActiveTab,
    toggleTheme,
    soundEnabled,
    toggleSound,
    simulatorFocusMode,
    setSimulatorFocusMode,
    toggleSimulatorFocusMode,
    profileOpen,
    setProfileOpen,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<ShortcutToast | null>(null);
  const [shortcutsEnabled, setShortcutsEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SHORTCUTS_ENABLED_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  }, []);

  const handlersRef = useRef<Map<string, () => string | void>>(new Map());
  const pendingRunRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const setShortcutsEnabled = useCallback((enabled: boolean) => {
    soundEngine.playSelect();
    setShortcutsEnabledState(enabled);
    try {
      localStorage.setItem(SHORTCUTS_ENABLED_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const formatKeys = useCallback(
    (keys: string[]) =>
      keys.map((k) => {
        if (isMac && k === 'Ctrl') return '⌘';
        if (isMac && k === 'Alt') return '⌥';
        return k;
      }),
    [isMac],
  );

  const announceFeedback = useCallback(
    (keys: string[], message: string) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({
        id: Date.now(),
        keys: formatKeys(keys),
        message,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 1700);
    },
    [formatKeys],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const registerHandler = useCallback(
    (id: string, handler: () => string | void) => {
      handlersRef.current.set(id, handler);
      if (id === 'run-simulation' && pendingRunRef.current) {
        pendingRunRef.current = false;
        window.setTimeout(() => {
          const msg = handlersRef.current.get('run-simulation')?.();
          if (msg) {
            announceFeedback(['Ctrl', 'Enter'], msg);
          }
        }, 80);
      }
      return () => {
        if (handlersRef.current.get(id) === handler) {
          handlersRef.current.delete(id);
        }
      };
    },
    [announceFeedback],
  );

  const toggleModal = useCallback(() => {
    soundEngine.playSelect();
    setModalOpen((prev) => !prev);
  }, []);

  const triggerShortcut = useCallback(
    (id: string) => {
      const def = SHORTCUT_DEFINITIONS.find((s) => s.id === id);
      const keys = def ? def.keys : [];

      if (id === 'open-shortcuts') {
        toggleModal();
        return;
      }

      if (id === 'switch-view') {
        soundEngine.playSelect();
        const currentIdx = WORKSPACE_TAB_ORDER.indexOf(activeTab);
        const nextTab =
          WORKSPACE_TAB_ORDER[(currentIdx + 1) % WORKSPACE_TAB_ORDER.length];
        setActiveTab(nextTab);
        announceFeedback(
          keys,
          `${tLoc(translations.shortcuts.toastSwitchedTo, lang)} ${tLoc(TAB_LABELS[nextTab], lang)}`,
        );
        return;
      }

      const jumpMap: Record<string, ActiveTab> = {
        'jump-studio': 'studio',
        'jump-simulator': 'simulator',
        'jump-projects': 'projects',
        'jump-lessons': 'lessons',
        'jump-challenges': 'challenges',
        'jump-leaderboard': 'leaderboard',
      };
      if (id in jumpMap) {
        const nextTab = jumpMap[id];
        soundEngine.playSelect();
        setActiveTab(nextTab);
        announceFeedback(
          keys,
          `${tLoc(translations.shortcuts.toastSwitchedTo, lang)} ${tLoc(TAB_LABELS[nextTab], lang)}`,
        );
        return;
      }

      if (id === 'toggle-theme') {
        toggleTheme();
        announceFeedback(keys, tLoc(translations.shortcuts.toastThemeSwitched, lang));
        return;
      }

      if (id === 'toggle-sound') {
        const nextMuted = soundEnabled;
        toggleSound();
        announceFeedback(
          keys,
          nextMuted
            ? tLoc(translations.shortcuts.toastSoundMuted, lang)
            : tLoc(translations.shortcuts.toastSoundUnmuted, lang),
        );
        return;
      }

      if (id === 'toggle-focus-mode') {
        if (activeTab !== 'simulator') {
          soundEngine.playSelect();
          setActiveTab('simulator');
          setSimulatorFocusMode(true);
          announceFeedback(keys, tLoc(translations.shortcuts.toastFocusOn, lang));
        } else {
          const nextFocus = !simulatorFocusMode;
          toggleSimulatorFocusMode();
          announceFeedback(
            keys,
            nextFocus
              ? tLoc(translations.shortcuts.toastFocusOn, lang)
              : tLoc(translations.shortcuts.toastFocusOff, lang),
          );
        }
        return;
      }

      if (id === 'run-simulation') {
        const handler = handlersRef.current.get('run-simulation');
        if (handler && activeTab === 'simulator') {
          const msg = handler();
          announceFeedback(
            keys,
            msg || tLoc(translations.shortcuts.toastSimStarted, lang),
          );
        } else {
          // Switch into Simulator and auto-run once mounted
          soundEngine.playSelect();
          pendingRunRef.current = true;
          setActiveTab('simulator');
          announceFeedback(
            keys,
            `${tLoc(translations.shortcuts.toastSwitchedTo, lang)} ${tLoc(translations.nav.simulator, lang)}`,
          );
        }
        return;
      }

      // Simulator-scoped registered handlers
      const registered = handlersRef.current.get(id);
      if (registered) {
        const msg = registered();
        if (msg) {
          announceFeedback(keys, msg);
        }
      } else if (def?.scope === 'simulator') {
        soundEngine.playSelect();
        announceFeedback(keys, tLoc(translations.shortcuts.toastOpenSimFirst, lang));
      }
    },
    [
      activeTab,
      announceFeedback,
      lang,
      setActiveTab,
      setSimulatorFocusMode,
      simulatorFocusMode,
      soundEnabled,
      toggleModal,
      toggleSimulatorFocusMode,
      toggleSound,
      toggleTheme,
    ],
  );

  // Global keyboard event listener
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      // Escape always closes Shortcuts modal or Profile Drawer gracefully
      if (event.key === 'Escape') {
        if (modalOpen) {
          event.preventDefault();
          setModalOpen(false);
          return;
        }
        if (profileOpen) {
          event.preventDefault();
          setProfileOpen(false);
          return;
        }
      }

      const inInput = isEditableTarget(event.target);

      // Always allow Ctrl+/ to open the Shortcuts Manager even if shortcuts are paused
      const openDef = SHORTCUT_DEFINITIONS.find((s) => s.id === 'open-shortcuts');
      if (openDef) {
        const matchesMain = matchesCombo(event, openDef.combo);
        const matchesQuestion =
          !inInput &&
          Boolean(openDef.altCombos?.some((c) => matchesCombo(event, c)));
        if (matchesMain || matchesQuestion) {
          event.preventDefault();
          triggerShortcut('open-shortcuts');
          return;
        }
      }

      if (!shortcutsEnabled) return;
      if (modalOpen) return;

      for (const def of SHORTCUT_DEFINITIONS) {
        if (def.id === 'open-shortcuts') continue;
        if (inInput && !def.allowInInput) continue;

        const matched =
          matchesCombo(event, def.combo) ||
          Boolean(def.altCombos?.some((c) => matchesCombo(event, c)));

        if (matched) {
          // For simulator-scoped shortcuts when not in simulator, don't block browser defaults
          if (def.scope === 'simulator' && activeTab !== 'simulator') {
            continue;
          }
          event.preventDefault();
          triggerShortcut(def.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab,
    modalOpen,
    profileOpen,
    setProfileOpen,
    shortcutsEnabled,
    triggerShortcut,
  ]);

  const value: ShortcutContextValue = {
    shortcuts: SHORTCUT_DEFINITIONS,
    isMac,
    shortcutsEnabled,
    setShortcutsEnabled,
    modalOpen,
    setModalOpen,
    toggleModal,
    registerHandler,
    triggerShortcut,
    announceFeedback,
    formatKeys,
  };

  return (
    <ShortcutContext.Provider value={value}>
      {children}

      {/* Accessible Live Feedback Toast for Keyboard Shortcuts */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-20 md:bottom-4 inset-x-0 z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-lg text-xs font-semibold"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#00878F] dark:text-[#22c6cf] shrink-0" />
            <span>{toast.message}</span>
            {toast.keys.length > 0 && (
              <span dir="ltr" className="inline-flex items-center gap-1 ms-1">
                {toast.keys.map((k, idx) => (
                  <kbd
                    key={`${k}-${idx}`}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </ShortcutContext.Provider>
  );
}

export function useShortcuts() {
  const ctx = useContext(ShortcutContext);
  if (!ctx) {
    throw new Error('useShortcuts must be used inside ShortcutProvider');
  }
  return ctx;
}

export function useShortcutHandler(
  id: string,
  handler: () => string | void,
) {
  const { registerHandler } = useShortcuts();
  const latestHandlerRef = useRef(handler);
  latestHandlerRef.current = handler;

  useEffect(() => {
    return registerHandler(id, () => latestHandlerRef.current());
  }, [id, registerHandler]);
}
