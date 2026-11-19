import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { Language } from '../i18n/translations';
import type {
  CertificateRecord,
  CircuitState,
  CodeBlock,
  LessonData,
  PlatformConfig,
  SavedProject,
  UserProfile,
} from '../types/arduino';
import { LESSONS, STATION_REQUIREMENTS } from '../data/lessons';
import { arduinoCppToBlocks } from '../engine/blocklyBridge';
import { soundEngine } from '../utils/sound';

export type ActiveTab =
  | 'studio'
  | 'simulator'
  | 'projects'
  | 'lessons'
  | 'challenges'
  | 'leaderboard'
  | 'admin';

export type ThemePreference = 'system' | 'light' | 'dark';

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface LocalProgressStore {
  xp: number;
  completedLessons: string[];
  completedChallenges: string[];
  badges: string[];
  savedProjects: SavedProject[];
  certificate: CertificateRecord | null;
}

const LOCAL_STORE_KEY = 'ardunolab_guest_progress_v2';
const ADMIN_TOKEN_KEY = 'ardunolab_admin_session_token';
const OWNER_EMAIL = 'berrahmaomarfarouk@gmail.com';

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  announcementActive: false,
  announcementAr: '',
  announcementEn: '',
  announcementFr: '',
  xpMultiplier: 1,
  certThreshold: 100,
  certIssuerName: 'ArdunoLab Academy',
  certDirectorName: 'Omar Farouk Berrahma',
  customLessons: [],
};

function loadLocalStore(): LocalProgressStore {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY) || localStorage.getItem('ardunolab_guest_progress_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalProgressStore>;
      return {
        xp: parsed.xp || 0,
        completedLessons: parsed.completedLessons || [],
        completedChallenges: parsed.completedChallenges || [],
        badges: parsed.badges || [],
        savedProjects: parsed.savedProjects || [],
        certificate: parsed.certificate || null,
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    xp: 0,
    completedLessons: [],
    completedChallenges: [],
    badges: [],
    savedProjects: [],
    certificate: null,
  };
}

function saveLocalStore(data: LocalProgressStore) {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getRankFromXp(xp: number): string {
  if (xp >= 1500) return 'embedded_architect';
  if (xp >= 800) return 'circuit_master';
  if (xp >= 300) return 'wire_apprentice';
  return 'spark_novice';
}

interface AppContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'dark' | 'light';
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  simulatorFocusMode: boolean;
  setSimulatorFocusMode: (focus: boolean) => void;
  toggleSimulatorFocusMode: () => void;

  // Platform Config & Full Curriculum (built-in + admin custom lessons)
  platformConfig: PlatformConfig;
  refreshPlatformConfig: () => Promise<void>;
  allLessons: LessonData[];

  // Auth, Admin & Gamification
  firebaseUser: User | null;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  profile: UserProfile;
  completedLessons: string[];
  completedChallenges: string[];
  badges: string[];
  savedProjects: SavedProject[];
  certificate: CertificateRecord | null;
  claimCertificate: (recipientName?: string) => Promise<CertificateRecord | null>;
  completeItem: (
    itemType: 'lesson' | 'challenge',
    itemId: string,
    xpReward: number,
  ) => Promise<{ newlyUnlockedStations: string[] }>;
  saveCircuitProject: (payload: {
    title: string;
    description: string;
    code: string;
    blocks: CodeBlock[];
    circuit: CircuitState;
  }) => Promise<boolean>;
  deleteCircuitProject: (id: number) => Promise<void>;
  refreshUserData: () => Promise<void>;

  // Admin Session Control
  isAdmin: boolean;
  adminToken: string | null;
  adminLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  adminLogout: () => void;
  getAdminHeaders: () => Promise<Record<string, string>>;

  // Shared Simulator Workspace State
  simTitle: string;
  simCode: string;
  simBlocks: CodeBlock[];
  simCircuit: CircuitState;
  autoRunToken: number;
  setSimCode: (code: string) => void;
  setSimBlocks: (blocks: CodeBlock[]) => void;
  setSimCircuit: React.Dispatch<React.SetStateAction<CircuitState>>;
  loadIntoSimulator: (payload: {
    title: string;
    code: string;
    blocks: CodeBlock[];
    circuit: CircuitState;
    autoRun?: boolean;
  }) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('ardunolab_lang');
    if (saved === 'ar' || saved === 'en' || saved === 'fr') return saved;
    return 'ar';
  });

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('ardunolab_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme);
  const theme: 'dark' | 'light' =
    themePreference === 'system' ? systemTheme : themePreference;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTabState] = useState<ActiveTab>('studio');
  const [profileOpen, setProfileOpen] = useState(false);
  const [simulatorFocusMode, setSimulatorFocusMode] = useState(false);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    if (tab !== 'simulator') {
      setSimulatorFocusMode(false);
    }
  }, []);

  const toggleSimulatorFocusMode = useCallback(() => {
    soundEngine.playSelect();
    setSimulatorFocusMode((prev) => {
      const next = !prev;
      if (next) setProfileOpen(false);
      return next;
    });
  }, []);

  // Platform config (announcement, XP multiplier, cert threshold, admin custom lessons)
  // Hydrates from localStorage cache first so custom curriculum stays available offline
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(() => {
    try {
      const cached = localStorage.getItem('ardunolab_platform_config_cache');
      if (cached) {
        return { ...DEFAULT_PLATFORM_CONFIG, ...(JSON.parse(cached) as Partial<PlatformConfig>) };
      }
    } catch {
      // ignore cache parse errors
    }
    return DEFAULT_PLATFORM_CONFIG;
  });

  // Admin Session Token (for direct Admin Account sign-in)
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  // Firebase Auth & Cloud SQL State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [localStore, setLocalStore] = useState<LocalProgressStore>(loadLocalStore);
  const [cloudProfile, setCloudProfile] = useState<UserProfile | null>(null);
  const [cloudCompletedLessons, setCloudCompletedLessons] = useState<string[]>([]);
  const [cloudCompletedChallenges, setCloudCompletedChallenges] = useState<string[]>([]);
  const [cloudBadges, setCloudBadges] = useState<string[]>([]);
  const [cloudProjects, setCloudProjects] = useState<SavedProject[]>([]);
  const [cloudCertificate, setCloudCertificate] = useState<CertificateRecord | null>(null);

  // Shared Simulator Workspace initialized with Blink Lesson
  const starterLesson = LESSONS.find((l) => l.id === 'lesson-1') || LESSONS[0];
  const [simTitle, setSimTitle] = useState<string>(starterLesson.title.en);
  const [simCode, setSimCode] = useState<string>(starterLesson.code);
  const [simBlocks, setSimBlocks] = useState<CodeBlock[]>(starterLesson.blocks);
  const [simCircuit, setSimCircuit] = useState<CircuitState>(starterLesson.circuit);
  const [autoRunToken, setAutoRunToken] = useState<number>(0);

  // Sync HTML dir, lang, and dark class
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('ardunolab_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dark', theme === 'dark');
    html.style.colorScheme = theme;
    try {
      localStorage.setItem('ardunolab_theme', themePreference);
    } catch {
      // ignore storage errors
    }
  }, [theme, themePreference]);

  const refreshPlatformConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/platform-config');
      if (!res.ok) return;
      const data = (await res.json()) as PlatformConfig;
      setPlatformConfig(data);
      try {
        localStorage.setItem('ardunolab_platform_config_cache', JSON.stringify(data));
      } catch {
        // ignore storage quota errors
      }
    } catch {
      // keep cached/default curriculum offline
    }
  }, []);

  useEffect(() => {
    refreshPlatformConfig();
  }, [refreshPlatformConfig]);

  const allLessons: LessonData[] = useMemo(() => {
    const mappedCustom: LessonData[] = (platformConfig.customLessons || []).map(
      (cl, idx) => ({
        id: cl.lessonKey,
        number: LESSONS.length + idx,
        track: (Math.max(1, Math.min(5, cl.stationId)) as 1 | 2 | 3 | 4 | 5),
        xp: cl.xp,
        isCustom: true,
        title: {
          ar: cl.titleAr,
          en: cl.titleEn || cl.titleAr,
          fr: cl.titleFr || cl.titleEn || cl.titleAr,
        },
        summary: {
          ar: cl.summaryAr || cl.titleAr,
          en: cl.summaryEn || cl.summaryAr || cl.titleEn,
          fr: cl.summaryFr || cl.summaryEn || cl.titleFr,
        },
        theory: {
          ar: cl.theoryAr || cl.summaryAr || cl.titleAr,
          en: cl.theoryEn || cl.summaryEn || cl.titleEn,
          fr: cl.theoryFr || cl.summaryFr || cl.titleFr,
        },
        keyFunctions: ['setup()', 'loop()', 'Serial.begin(9600)'],
        pinoutNotes: [
          {
            pin: 'D13 / GND',
            role: {
              ar: 'دائرة افتراضية مجهزة للتجربة الفورية',
              en: 'Default test circuit ready for experimentation',
              fr: 'Circuit par défaut prêt à tester',
            },
          },
        ],
        steps: [
          {
            ar: 'اقرأ شرح الدرس ثم افتحه في المحاكي لتشغيل الكود وتجربته.',
            en: 'Read the lesson theory, then launch it in the Simulator to test the code.',
            fr: 'Lisez la théorie puis ouvrez-la dans le simulateur.',
          },
        ],
        code: cl.code,
        blocks: arduinoCppToBlocks(cl.code),
        circuit: starterLesson.circuit,
      }),
    );
    return [...LESSONS, ...mappedCustom];
  }, [platformConfig.customLessons, starterLesson.circuit]);

  const setLang = useCallback(
    (nextLang: Language) => {
      setLangState(nextLang);
      soundEngine.playSelect();
      if (firebaseUser) {
        firebaseUser
          .getIdToken()
          .then((token) =>
            fetch('/api/preferences', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ preferredLang: nextLang }),
            }),
          )
          .catch(() => {});
      }
    },
    [firebaseUser],
  );

  const setThemePreference = useCallback((pref: ThemePreference) => {
    soundEngine.playSelect();
    setThemePreferenceState(pref);
  }, []);

  const toggleTheme = useCallback(() => {
    soundEngine.playSelect();
    setThemePreferenceState(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEngine.setEnabled(next);
      if (next) soundEngine.playSelect();
      return next;
    });
  }, []);

  const hydrateCloudData = useCallback(async (user: User) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.profile) setCloudProfile(data.profile);
      if (Array.isArray(data.progress)) {
        setCloudCompletedLessons(
          data.progress
            .filter((p: { itemType: string }) => p.itemType === 'lesson')
            .map((p: { itemId: string }) => p.itemId),
        );
        setCloudCompletedChallenges(
          data.progress
            .filter((p: { itemType: string }) => p.itemType === 'challenge')
            .map((p: { itemId: string }) => p.itemId),
        );
      }
      if (Array.isArray(data.badges)) {
        setCloudBadges(data.badges.map((b: { badgeId: string }) => b.badgeId));
      }
      if (Array.isArray(data.projects)) {
        setCloudProjects(data.projects);
      }
      setCloudCertificate(data.certificate || null);
    } catch (err) {
      console.error('Cloud sync hydrate error:', err);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (firebaseUser) {
      await hydrateCloudData(firebaseUser);
    }
  }, [firebaseUser, hydrateCloudData]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        await hydrateCloudData(user);
      } else {
        setCloudProfile(null);
        setCloudCertificate(null);
      }
    });
    return () => unsub();
  }, [hydrateCloudData]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        soundEngine.playSuccess();
        await hydrateCloudData(result.user);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Sign-in cancelled or failed.';
      setAuthError(msg);
      soundEngine.playError();
    }
  }, [hydrateCloudData]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setCloudProfile(null);
    setCloudCompletedLessons([]);
    setCloudCompletedChallenges([]);
    setCloudBadges([]);
    setCloudProjects([]);
    setCloudCertificate(null);
    soundEngine.playSelect();
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        return { ok: false, error: data.error || 'Invalid credentials' };
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAdminToken(data.token);
      soundEngine.playSuccess();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Connection failed' };
    }
  }, []);

  const adminLogout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    soundEngine.playSelect();
  }, []);

  const getAdminHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (adminToken) {
      headers['X-Admin-Token'] = adminToken;
    }
    if (firebaseUser) {
      try {
        const fbToken = await firebaseUser.getIdToken();
        headers['Authorization'] = `Bearer ${fbToken}`;
      } catch {
        // ignore
      }
    }
    return headers;
  }, [adminToken, firebaseUser]);

  const completeItem = useCallback(
    async (
      itemType: 'lesson' | 'challenge',
      itemId: string,
      xpReward: number,
    ): Promise<{ newlyUnlockedStations: string[] }> => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ itemType, itemId, xpReward }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.profile) setCloudProfile(data.profile);
            if (Array.isArray(data.progress)) {
              setCloudCompletedLessons(
                data.progress
                  .filter((p: { itemType: string }) => p.itemType === 'lesson')
                  .map((p: { itemId: string }) => p.itemId),
              );
              setCloudCompletedChallenges(
                data.progress
                  .filter((p: { itemType: string }) => p.itemType === 'challenge')
                  .map((p: { itemId: string }) => p.itemId),
              );
            }
            if (Array.isArray(data.badges)) {
              setCloudBadges(
                data.badges.map((b: { badgeId: string }) => b.badgeId),
              );
            }
            if (data.certificate) {
              setCloudCertificate(data.certificate);
            }
            return {
              newlyUnlockedStations: Array.isArray(data.newlyUnlockedStations)
                ? data.newlyUnlockedStations
                : [],
            };
          }
        } catch (err) {
          console.error('Failed to sync progress:', err);
        }
      }

      // Guest local progress persistence + Station Badges + Certificate auto-unlock
      let unlockedStations: string[] = [];
      setLocalStore((prev) => {
        const list =
          itemType === 'lesson'
            ? prev.completedLessons
            : prev.completedChallenges;
        if (list.includes(itemId)) return prev;

        const nextLessons =
          itemType === 'lesson'
            ? [...prev.completedLessons, itemId]
            : prev.completedLessons;
        const nextChallenges =
          itemType === 'challenge'
            ? [...prev.completedChallenges, itemId]
            : prev.completedChallenges;
        const nextBadges = new Set(prev.badges);
        let addedXp = Math.round(xpReward * (platformConfig.xpMultiplier || 1));

        if (itemType === 'lesson') {
          nextBadges.add('first_blink');
          if (['lesson-9', 'lesson-10', 'lesson-13'].includes(itemId)) {
            nextBadges.add('sensor_wizard');
          }
          for (const st of STATION_REQUIREMENTS) {
            const doneAll = st.lessonIds.every((lid) => nextLessons.includes(lid));
            if (doneAll && !prev.badges.includes(st.badgeId)) {
              nextBadges.add(st.badgeId);
              unlockedStations.push(st.badgeId);
              addedXp += st.bonusXp;
            }
          }
        } else {
          if (itemId.startsWith('wire-')) nextBadges.add('wire_master');
          if (itemId.startsWith('debug-')) nextBadges.add('bug_hunter');
          if (itemId.startsWith('code-')) nextBadges.add('code_architect');
        }

        const builtinDone = LESSONS.filter((l) => nextLessons.includes(l.id)).length;
        const pct = Math.round((builtinDone / LESSONS.length) * 100);
        const CORE_CERT_LESSONS = 11;
        let nextCert = prev.certificate;
        if (
          !nextCert &&
          (builtinDone >= CORE_CERT_LESSONS || pct >= (platformConfig.certThreshold || 100))
        ) {
          const randBytes = new Uint8Array(4);
          if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(randBytes);
          } else {
            for (let i = 0; i < randBytes.length; i++) {
              randBytes[i] = Math.floor(Math.random() * 256);
            }
          }
          const uniqueHex = Array.from(randBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .slice(0, 6)
            .toUpperCase();
          nextCert = {
            certificateCode: `ARD-${new Date().getFullYear()}-${uniqueHex}`,
            recipientName:
              lang === 'ar'
                ? 'صانع إلكترونيات متميز'
                : lang === 'fr'
                  ? 'Créateur Arduino Certifié'
                  : 'Certified Arduino Maker',
            issuedBy: platformConfig.certIssuerName || 'ArdunoLab Academy',
            completionPercent: pct,
            issuedAt: new Date().toISOString(),
          };
        }

        const updated: LocalProgressStore = {
          ...prev,
          xp: prev.xp + addedXp,
          completedLessons: nextLessons,
          completedChallenges: nextChallenges,
          badges: Array.from(nextBadges),
          certificate: nextCert,
        };
        saveLocalStore(updated);
        return updated;
      });

      return { newlyUnlockedStations: unlockedStations };
    },
    [firebaseUser, lang, platformConfig.certIssuerName, platformConfig.certThreshold, platformConfig.xpMultiplier],
  );

  const claimCertificate = useCallback(
    async (recipientName?: string): Promise<CertificateRecord | null> => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/certificate/claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ recipientName }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.certificate) {
              setCloudCertificate(data.certificate);
              return data.certificate as CertificateRecord;
            }
          }
        } catch {
          return null;
        }
        return null;
      }

      // Guest certificate update/issue
      const builtinDone = LESSONS.filter((l) =>
        localStore.completedLessons.includes(l.id),
      ).length;
      const pct = Math.round((builtinDone / LESSONS.length) * 100);
      const CORE_CERT_LESSONS = 11;
      if (
        builtinDone < CORE_CERT_LESSONS &&
        pct < (platformConfig.certThreshold || 100) &&
        !adminToken
      ) {
        return null;
      }

      const randBytes = new Uint8Array(4);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randBytes);
      } else {
        for (let i = 0; i < randBytes.length; i++) {
          randBytes[i] = Math.floor(Math.random() * 256);
        }
      }
      const uniqueHex = Array.from(randBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 6)
        .toUpperCase();

      const cert: CertificateRecord = {
        certificateCode:
          localStore.certificate?.certificateCode ||
          `ARD-${new Date().getFullYear()}-${uniqueHex}`,
        recipientName:
          recipientName?.trim() ||
          localStore.certificate?.recipientName ||
          'Arduino Maker',
        issuedBy: platformConfig.certIssuerName || 'ArdunoLab Academy',
        completionPercent: Math.max(pct, builtinDone >= CORE_CERT_LESSONS ? 100 : pct),
        issuedAt: localStore.certificate?.issuedAt || new Date().toISOString(),
      };
      setLocalStore((prev) => {
        const updated = { ...prev, certificate: cert };
        saveLocalStore(updated);
        return updated;
      });
      return cert;
    },
    [adminToken, firebaseUser, localStore.certificate, localStore.completedLessons, platformConfig.certIssuerName, platformConfig.certThreshold],
  );

  const saveCircuitProject = useCallback(
    async (payload: {
      title: string;
      description: string;
      code: string;
      blocks: CodeBlock[];
      circuit: CircuitState;
    }): Promise<boolean> => {
      const blocksJson = JSON.stringify(payload.blocks);
      const circuitJson = JSON.stringify(payload.circuit);

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: payload.title,
              description: payload.description,
              code: payload.code,
              blocksJson,
              circuitJson,
            }),
          });
          if (res.ok) {
            await hydrateCloudData(firebaseUser);
            return true;
          }
        } catch (err) {
          console.error('Cloud save project failed:', err);
        }
      }

      setLocalStore((prev) => {
        const nextProject: SavedProject = {
          id: Date.now(),
          title: payload.title,
          description: payload.description,
          code: payload.code,
          blocksJson,
          circuitJson,
          createdAt: new Date().toISOString(),
        };
        const nextBadges = Array.from(new Set([...prev.badges, 'cloud_maker']));
        const updated: LocalProgressStore = {
          ...prev,
          xp: prev.xp + 25,
          badges: nextBadges,
          savedProjects: [nextProject, ...prev.savedProjects],
        };
        saveLocalStore(updated);
        return updated;
      });
      return true;
    },
    [firebaseUser, hydrateCloudData],
  );

  const deleteCircuitProject = useCallback(
    async (id: number) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          setCloudProjects((prev) => prev.filter((p) => p.id !== id));
          return;
        } catch (err) {
          console.error('Delete cloud project error:', err);
        }
      }

      setLocalStore((prev) => {
        const updated: LocalProgressStore = {
          ...prev,
          savedProjects: prev.savedProjects.filter((p) => p.id !== id),
        };
        saveLocalStore(updated);
        return updated;
      });
    },
    [firebaseUser],
  );

  const loadIntoSimulator = useCallback(
    (payload: {
      title: string;
      code: string;
      blocks: CodeBlock[];
      circuit: CircuitState;
      autoRun?: boolean;
    }) => {
      setSimTitle(payload.title);
      setSimCode(payload.code);
      setSimBlocks(payload.blocks);
      setSimCircuit(payload.circuit);
      if (payload.autoRun) {
        setAutoRunToken((n) => n + 1);
      }
      setActiveTab('simulator');
      soundEngine.playSelect();
    },
    [],
  );

  const profile: UserProfile = useMemo(() => {
    if (firebaseUser && cloudProfile) {
      return cloudProfile;
    }
    return {
      uid: 'guest',
      email: '',
      displayName:
        lang === 'ar'
          ? 'صانع إلكترونيات'
          : lang === 'fr'
            ? 'Créateur Arduino'
            : 'Arduino Maker',
      photoUrl: null,
      xp: localStore.xp,
      rank: getRankFromXp(localStore.xp),
      role: adminToken ? 'admin' : 'student',
      preferredLang: lang,
    };
  }, [firebaseUser, cloudProfile, localStore.xp, lang, adminToken]);

  const isAdmin = useMemo(() => {
    if (adminToken) return true;
    if (cloudProfile?.role === 'admin') return true;
    if (firebaseUser?.email?.toLowerCase() === OWNER_EMAIL) return true;
    return false;
  }, [adminToken, cloudProfile?.role, firebaseUser?.email]);

  const completedLessons = firebaseUser
    ? cloudCompletedLessons
    : localStore.completedLessons;
  const completedChallenges = firebaseUser
    ? cloudCompletedChallenges
    : localStore.completedChallenges;
  const badges = firebaseUser ? cloudBadges : localStore.badges;
  const savedProjects = firebaseUser
    ? cloudProjects
    : localStore.savedProjects;
  const certificate = firebaseUser ? cloudCertificate : localStore.certificate;

  const value: AppContextValue = {
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
    profileOpen,
    setProfileOpen,
    simulatorFocusMode,
    setSimulatorFocusMode,
    toggleSimulatorFocusMode,
    platformConfig,
    refreshPlatformConfig,
    allLessons,
    firebaseUser,
    authLoading,
    authError,
    signInWithGoogle,
    signOutUser,
    profile,
    completedLessons,
    completedChallenges,
    badges,
    savedProjects,
    certificate,
    claimCertificate,
    completeItem,
    saveCircuitProject,
    deleteCircuitProject,
    refreshUserData,
    isAdmin,
    adminToken,
    adminLogin,
    adminLogout,
    getAdminHeaders,
    simTitle,
    simCode,
    simBlocks,
    simCircuit,
    autoRunToken,
    setSimCode,
    setSimBlocks,
    setSimCircuit,
    loadIntoSimulator,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
