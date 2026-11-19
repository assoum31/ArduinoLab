import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Language } from '../i18n/translations';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AccentTheme = 'teal' | 'emerald' | 'indigo' | 'amber' | 'rose';
export type FontSizeScale = 'sm' | 'md' | 'lg' | 'xl';

export interface UserSettingsData {
  themePreference: ThemePreference;
  accentTheme: AccentTheme;
  fontSize: FontSizeScale;
  codeFontSize: number;
  preferredLang: Language;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface UserSettingsSnapshot extends UserSettingsData {
  id: string;
  label: string;
  createdAtMs: number;
}

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  themePreference: 'system',
  accentTheme: 'teal',
  fontSize: 'md',
  codeFontSize: 13,
  preferredLang: 'ar',
  soundEnabled: true,
  reducedMotion: false,
};

export const LOCAL_SETTINGS_KEY = 'ardunolab_user_settings_v1';

const VALID_THEMES: ReadonlySet<string> = new Set(['system', 'light', 'dark']);
const VALID_ACCENTS: ReadonlySet<string> = new Set([
  'teal',
  'emerald',
  'indigo',
  'amber',
  'rose',
]);
const VALID_FONT_SIZES: ReadonlySet<string> = new Set(['sm', 'md', 'lg', 'xl']);
const VALID_LANGS: ReadonlySet<string> = new Set(['ar', 'en', 'fr']);
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function sanitizeUserSettings(
  input: Partial<UserSettingsData> | Record<string, unknown>,
  fallback: UserSettingsData = DEFAULT_USER_SETTINGS,
): UserSettingsData {
  const themePreference =
    typeof input.themePreference === 'string' && VALID_THEMES.has(input.themePreference)
      ? (input.themePreference as ThemePreference)
      : fallback.themePreference;

  const accentTheme =
    typeof input.accentTheme === 'string' && VALID_ACCENTS.has(input.accentTheme)
      ? (input.accentTheme as AccentTheme)
      : fallback.accentTheme;

  const fontSize =
    typeof input.fontSize === 'string' && VALID_FONT_SIZES.has(input.fontSize)
      ? (input.fontSize as FontSizeScale)
      : fallback.fontSize;

  const rawCodeSize = Number(input.codeFontSize);
  const codeFontSize = Number.isFinite(rawCodeSize)
    ? Math.max(12, Math.min(20, Math.round(rawCodeSize)))
    : fallback.codeFontSize;

  const preferredLang =
    typeof input.preferredLang === 'string' && VALID_LANGS.has(input.preferredLang)
      ? (input.preferredLang as Language)
      : fallback.preferredLang;

  const soundEnabled =
    typeof input.soundEnabled === 'boolean' ? input.soundEnabled : fallback.soundEnabled;

  const reducedMotion =
    typeof input.reducedMotion === 'boolean' ? input.reducedMotion : fallback.reducedMotion;

  return {
    themePreference,
    accentTheme,
    fontSize,
    codeFontSize,
    preferredLang,
    soundEnabled,
    reducedMotion,
  };
}

export function sanitizeSnapshotLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed.slice(0, 60);
}

export function loadLocalUserSettings(): UserSettingsData {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return sanitizeUserSettings(parsed, DEFAULT_USER_SETTINGS);
    }
    // Migrate legacy individual theme/lang keys seamlessly
    const legacyLang = localStorage.getItem('ardunolab_lang');
    const legacyTheme = localStorage.getItem('ardunolab_theme');
    return sanitizeUserSettings(
      {
        preferredLang: legacyLang as Language | undefined,
        themePreference: legacyTheme as ThemePreference | undefined,
      },
      DEFAULT_USER_SETTINGS,
    );
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveLocalUserSettings(settings: UserSettingsData): void {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem('ardunolab_lang', settings.preferredLang);
    localStorage.setItem('ardunolab_theme', settings.themePreference);
  } catch {
    // ignore local storage quota errors
  }
}

function toEpochMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export function subscribeUserSettings(
  uid: string,
  onRemoteSettings: (settings: UserSettingsData | null, updatedAtMs: number | null) => void,
  onSyncError: (message: string) => void,
): Unsubscribe {
  if (!VALID_ID_REGEX.test(uid)) {
    return () => {};
  }
  const path = `userSettings/${uid}`;
  const ref = doc(db, 'userSettings', uid);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onRemoteSettings(null, null);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      const clean = sanitizeUserSettings(data, DEFAULT_USER_SETTINGS);
      const updatedMs = data.updatedAt ? toEpochMs(data.updatedAt) : Date.now();
      onRemoteSettings(clean, updatedMs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onSyncError(wrapped instanceof Error ? wrapped.message : String(wrapped));
      }
    },
  );
}

export async function saveUserSettingsToFirestore(
  uid: string,
  settings: UserSettingsData,
): Promise<void> {
  if (!VALID_ID_REGEX.test(uid)) {
    throw new Error('Invalid user ID for Firestore settings sync.');
  }
  const clean = sanitizeUserSettings(settings);
  const path = `userSettings/${uid}`;
  const ref = doc(db, 'userSettings', uid);

  let existsAlready = false;
  try {
    const existingSnap = await getDoc(ref);
    existsAlready = existingSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existsAlready) {
    try {
      await updateDoc(ref, {
        themePreference: clean.themePreference,
        accentTheme: clean.accentTheme,
        fontSize: clean.fontSize,
        codeFontSize: clean.codeFontSize,
        preferredLang: clean.preferredLang,
        soundEnabled: clean.soundEnabled,
        reducedMotion: clean.reducedMotion,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(ref, {
        ownerId: uid,
        themePreference: clean.themePreference,
        accentTheme: clean.accentTheme,
        fontSize: clean.fontSize,
        codeFontSize: clean.codeFontSize,
        preferredLang: clean.preferredLang,
        soundEnabled: clean.soundEnabled,
        reducedMotion: clean.reducedMotion,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export function subscribeSettingsSnapshots(
  uid: string,
  onSnapshots: (snapshots: UserSettingsSnapshot[]) => void,
  onSyncError: (message: string) => void,
): Unsubscribe {
  if (!VALID_ID_REGEX.test(uid)) {
    return () => {};
  }
  const path = `userSettings/${uid}/snapshots`;
  const q = query(
    collection(db, 'userSettings', uid, 'snapshots'),
    where('ownerId', '==', uid),
    limit(20),
  );

  return onSnapshot(
    q,
    (snap) => {
      const items: UserSettingsSnapshot[] = snap.docs
        .map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const clean = sanitizeUserSettings(data, DEFAULT_USER_SETTINGS);
          return {
            id: docSnap.id,
            label:
              typeof data.label === 'string' && data.label.trim()
                ? data.label.trim().slice(0, 60)
                : 'Preset',
            createdAtMs: toEpochMs(data.createdAt),
            ...clean,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onSnapshots(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onSyncError(wrapped instanceof Error ? wrapped.message : String(wrapped));
      }
    },
  );
}

export async function exportSettingsSnapshotToFirestore(
  uid: string,
  label: string,
  settings: UserSettingsData,
): Promise<string> {
  if (!VALID_ID_REGEX.test(uid)) {
    throw new Error('Invalid user ID for settings snapshot export.');
  }
  const cleanLabel = sanitizeSnapshotLabel(label);
  if (!cleanLabel) {
    throw new Error('Snapshot label cannot be empty.');
  }
  const clean = sanitizeUserSettings(settings);

  // Master Gate Guarantee: ensure parent /userSettings/{uid} document exists first
  await saveUserSettingsToFirestore(uid, clean);

  const snapshotId = `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `userSettings/${uid}/snapshots/${snapshotId}`;
  const ref = doc(db, 'userSettings', uid, 'snapshots', snapshotId);

  try {
    await setDoc(ref, {
      ownerId: uid,
      label: cleanLabel,
      themePreference: clean.themePreference,
      accentTheme: clean.accentTheme,
      fontSize: clean.fontSize,
      codeFontSize: clean.codeFontSize,
      preferredLang: clean.preferredLang,
      soundEnabled: clean.soundEnabled,
      reducedMotion: clean.reducedMotion,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return snapshotId;
}

export async function deleteSettingsSnapshotFromFirestore(
  uid: string,
  snapshotId: string,
): Promise<void> {
  if (!VALID_ID_REGEX.test(uid) || !VALID_ID_REGEX.test(snapshotId)) {
    throw new Error('Invalid snapshot identifier.');
  }
  const path = `userSettings/${uid}/snapshots/${snapshotId}`;
  const ref = doc(db, 'userSettings', uid, 'snapshots', snapshotId);

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function downloadSettingsJsonFile(
  settings: UserSettingsData,
  label?: string,
): void {
  const clean = sanitizeUserSettings(settings);
  const payload = {
    app: 'ArdunoLab',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    label: label ? sanitizeSnapshotLabel(label) : undefined,
    settings: clean,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ardunolab-settings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedSettingsJson(rawText: string): UserSettingsData {
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  const source =
    parsed && typeof parsed === 'object' && parsed.settings && typeof parsed.settings === 'object'
      ? (parsed.settings as Record<string, unknown>)
      : parsed;
  if (!source || typeof source !== 'object') {
    throw new Error('Invalid settings JSON format');
  }
  return sanitizeUserSettings(source, DEFAULT_USER_SETTINGS);
}
