import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  CloudUpload,
  Code2,
  Download,
  Loader2,
  LogIn,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  useApp,
  type AccentTheme,
  type FontSizeScale,
  type ThemePreference,
} from '../../context/AppContext';
import {
  downloadSettingsJsonFile,
  parseImportedSettingsJson,
} from '../../services/userSettingsFirestore';
import { tLoc, translations } from '../../i18n/translations';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

const ACCENT_OPTIONS: Array<{
  id: AccentTheme;
  hex: string;
  ring: string;
}> = [
  { id: 'teal', hex: '#00878F', ring: 'ring-[#00878F]' },
  { id: 'emerald', hex: '#059669', ring: 'ring-emerald-600' },
  { id: 'indigo', hex: '#4f46e5', ring: 'ring-indigo-600' },
  { id: 'amber', hex: '#d97706', ring: 'ring-amber-600' },
  { id: 'rose', hex: '#e11d48', ring: 'ring-rose-600' },
];

const FONT_SIZE_OPTIONS: Array<{
  id: FontSizeScale;
  samplePx: number;
  scaleText: string;
}> = [
  { id: 'sm', samplePx: 12, scaleText: '90%' },
  { id: 'md', samplePx: 14, scaleText: '100%' },
  { id: 'lg', samplePx: 16, scaleText: '110%' },
  { id: 'xl', samplePx: 18, scaleText: '120%' },
];

export function SettingsModal() {
  const {
    lang,
    settingsOpen,
    setSettingsOpen,
    userSettings,
    updateUserSettings,
    resetUserSettings,
    firebaseUser,
    signInWithGoogle,
    settingsSyncStatus,
    settingsLastSyncedAt,
    settingsSyncError,
    settingsSnapshots,
    syncSettingsToFirebase,
    exportSettingsSnapshot,
    restoreSettingsSnapshot,
    deleteSettingsSnapshot,
  } = useApp();

  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [savingNow, setSavingNow] = useState(false);
  const [exportingSnapshot, setExportingSnapshot] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showTempFeedback = (tone: 'success' | 'error', text: string) => {
    setFeedbackMsg({ tone, text });
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  const handleSaveToFirebase = async () => {
    setSavingNow(true);
    const ok = await syncSettingsToFirebase();
    setSavingNow(false);
    if (ok) {
      soundEngine.playSuccess();
      showTempFeedback('success', tLoc(translations.settings.savedSuccess, lang));
    } else {
      soundEngine.playError();
      showTempFeedback('error', tLoc(translations.settings.statusError, lang));
    }
  };

  const handleExportCloudSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallbackLabel =
      lang === 'ar'
        ? `إعدادات ${new Date().toLocaleDateString('ar-EG')}`
        : `Setup ${new Date().toLocaleDateString('en-US')}`;
    const label = snapshotLabel.trim() || fallbackLabel;
    setExportingSnapshot(true);
    const ok = await exportSettingsSnapshot(label);
    setExportingSnapshot(false);
    if (ok) {
      setSnapshotLabel('');
      showTempFeedback('success', tLoc(translations.settings.savedSuccess, lang));
    } else {
      showTempFeedback('error', tLoc(translations.settings.statusError, lang));
    }
  };

  const handleExportJson = () => {
    soundEngine.playSelect();
    downloadSettingsJsonFile(userSettings, snapshotLabel.trim() || undefined);
  };

  const handleImportJsonChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportedSettingsJson(text);
      updateUserSettings(imported);
      soundEngine.playSuccess();
      showTempFeedback('success', tLoc(translations.settings.importSuccess, lang));
    } catch {
      soundEngine.playError();
      showTempFeedback('error', tLoc(translations.settings.importError, lang));
    }
  };

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    icon: typeof Sun;
  }> = [
    { id: 'light', label: tLoc(translations.nav.themeLight, lang), icon: Sun },
    { id: 'dark', label: tLoc(translations.nav.themeDark, lang), icon: Moon },
    { id: 'system', label: tLoc(translations.nav.themeSystem, lang), icon: Monitor },
  ];

  const syncStatusBadge = (() => {
    if (settingsSyncStatus === 'syncing') {
      return {
        icon: Loader2,
        spin: true,
        text: tLoc(translations.settings.statusSyncing, lang),
        cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      };
    }
    if (settingsSyncStatus === 'synced') {
      return {
        icon: Cloud,
        spin: false,
        text: tLoc(translations.settings.statusSynced, lang),
        cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
    }
    if (settingsSyncStatus === 'error') {
      return {
        icon: AlertCircle,
        spin: false,
        text: tLoc(translations.settings.statusError, lang),
        cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      };
    }
    return {
      icon: CloudOff,
      spin: false,
      text: tLoc(translations.settings.statusGuest, lang),
      cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
    };
  })();

  const StatusIcon = syncStatusBadge.icon;

  return (
    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title={tLoc(translations.settings.title, lang)}
    >
      <div className="space-y-6">
        {/* Live Sync Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold',
              syncStatusBadge.cls,
            )}
          >
            <StatusIcon
              className={cn('w-3.5 h-3.5 shrink-0', syncStatusBadge.spin && 'animate-spin')}
            />
            <span>{syncStatusBadge.text}</span>
          </span>
          {settingsLastSyncedAt && firebaseUser && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {tLoc(translations.settings.lastSynced, lang)}{' '}
              {new Date(settingsLastSyncedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* 1. Light / Dark / System Mode */}
        <section className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.settings.appearanceMode, lang)}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = userSettings.themePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    soundEngine.playSelect();
                    updateUserSettings({ themePreference: opt.id });
                  }}
                  className={cn(
                    'min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
                    active
                      ? 'border-[#00878F] bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf]'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Preferred Color Theme (Accent Palette) */}
        <section className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.settings.accentPalette, lang)}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ACCENT_OPTIONS.map((item) => {
              const active = userSettings.accentTheme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    soundEngine.playSelect();
                    updateUserSettings({ accentTheme: item.id });
                  }}
                  className={cn(
                    'min-h-[44px] flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer',
                    active
                      ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700',
                  )}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: item.hex }}
                  >
                    {active && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </span>
                  <span className="truncate">
                    {tLoc(translations.settings.accents[item.id], lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Global Interface Font Size */}
        <section className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Type className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.settings.fontSize, lang)}</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZE_OPTIONS.map((opt) => {
              const active = userSettings.fontSize === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    soundEngine.playSelect();
                    updateUserSettings({ fontSize: opt.id });
                  }}
                  className={cn(
                    'min-h-[54px] flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl border transition-colors cursor-pointer',
                    active
                      ? 'border-[#00878F] bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf]'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700',
                  )}
                >
                  <span
                    className="font-extrabold leading-none"
                    style={{ fontSize: `${opt.samplePx}px` }}
                  >
                    Aa
                  </span>
                  <span className="text-[10px] font-semibold">
                    {tLoc(translations.settings.fontSizes[opt.id], lang)} ({opt.scaleText})
                  </span>
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {tLoc(translations.settings.fontPreview, lang)}
          </div>
        </section>

        {/* 4. Code Editor Font Size */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="settings-code-font-size"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"
            >
              <Code2 className="w-4 h-4 text-[#00878F]" />
              <span>{tLoc(translations.settings.codeFontSize, lang)}</span>
            </label>
            <span className="font-mono tabular-nums text-xs font-bold px-2 py-0.5 rounded bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf]">
              {userSettings.codeFontSize}px
            </span>
          </div>
          <input
            id="settings-code-font-size"
            type="range"
            min={12}
            max={20}
            step={1}
            value={userSettings.codeFontSize}
            onChange={(e) =>
              updateUserSettings({ codeFontSize: Number(e.target.value) })
            }
            className="w-full accent-[#00878F] cursor-pointer"
          />
          <pre
            dir="ltr"
            style={{ fontSize: `${userSettings.codeFontSize}px` }}
            className="rounded-xl bg-[#0d1322] text-teal-300 font-mono px-3.5 py-2 border border-slate-800 overflow-x-auto leading-relaxed"
          >
            digitalWrite(13, HIGH); // LED ON
          </pre>
        </section>

        {/* 5. Sound & Reduced Motion */}
        <section className="space-y-2.5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.settings.comfortTitle, lang)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={userSettings.soundEnabled}
              onClick={() => {
                const next = !userSettings.soundEnabled;
                updateUserSettings({ soundEnabled: next });
                if (next) soundEngine.playSelect();
              }}
              className={cn(
                'min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer',
                userSettings.soundEnabled
                  ? 'border-[#00878F] bg-[#00878F]/10 text-slate-900 dark:text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400',
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {userSettings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#00878F] shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">
                  {tLoc(translations.settings.soundEffects, lang)}
                </span>
              </span>
              <span className="font-mono text-[10px] font-bold">
                {userSettings.soundEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={userSettings.reducedMotion}
              onClick={() => {
                soundEngine.playSelect();
                updateUserSettings({ reducedMotion: !userSettings.reducedMotion });
              }}
              className={cn(
                'min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer',
                userSettings.reducedMotion
                  ? 'border-[#00878F] bg-[#00878F]/10 text-slate-900 dark:text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400',
              )}
            >
              <span className="truncate">
                {tLoc(translations.settings.reducedMotion, lang)}
              </span>
              <span className="font-mono text-[10px] font-bold shrink-0">
                {userSettings.reducedMotion ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </section>

        {/* 6. Firebase Cloud Save & Cross-Device Export */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/70 p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-[#00878F] shrink-0" />
              <span>{tLoc(translations.settings.firebaseSectionTitle, lang)}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {tLoc(translations.settings.firebaseSectionDesc, lang)}
            </p>
          </div>

          {feedbackMsg && (
            <div
              role="status"
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-semibold border flex items-center gap-2',
                feedbackMsg.tone === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
              )}
            >
              {feedbackMsg.tone === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {settingsSyncError && !feedbackMsg && (
            <div className="rounded-xl px-3 py-2 text-[11px] font-medium border bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 break-words">
              {tLoc(translations.settings.statusError, lang)}
            </div>
          )}

          {!firebaseUser ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {tLoc(translations.settings.signInPrompt, lang)}
              </p>
              <Button size="sm" onClick={signInWithGoogle} className="shrink-0">
                <LogIn className="w-3.5 h-3.5" />
                <span>{tLoc(translations.profile.signInGoogle, lang)}</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Immediate Manual Save to Firebase */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveToFirebase}
                  disabled={savingNow}
                >
                  {savingNow ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{tLoc(translations.settings.saveToFirebaseBtn, lang)}</span>
                </Button>
              </div>

              {/* Export Named Cloud Preset Snapshot to Firestore */}
              <form
                onSubmit={handleExportCloudSnapshot}
                className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800"
              >
                <label
                  htmlFor="settings-snapshot-label"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 block"
                >
                  {tLoc(translations.settings.exportSnapshotTitle, lang)}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="settings-snapshot-label"
                    type="text"
                    maxLength={60}
                    value={snapshotLabel}
                    onChange={(e) => setSnapshotLabel(e.target.value)}
                    placeholder={tLoc(
                      translations.settings.exportSnapshotPlaceholder,
                      lang,
                    )}
                    className="flex-1 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00878F]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    disabled={exportingSnapshot}
                    className="shrink-0 min-h-[40px]"
                  >
                    {exportingSnapshot ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudUpload className="w-3.5 h-3.5 text-[#00878F]" />
                    )}
                    <span>{tLoc(translations.settings.exportSnapshotBtn, lang)}</span>
                  </Button>
                </div>
              </form>

              {/* Cloud Exported Presets List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tLoc(translations.settings.savedSnapshotsList, lang)} ({settingsSnapshots.length})
                </div>
                {settingsSnapshots.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    {tLoc(translations.settings.noSnapshotsYet, lang)}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pe-1">
                    {settingsSnapshots.map((snap) => {
                      const accentSwatch =
                        ACCENT_OPTIONS.find((a) => a.id === snap.accentTheme)?.hex || '#00878F';
                      return (
                        <div
                          key={snap.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-3 py-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: accentSwatch }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {snap.label}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                {snap.themePreference} · {snap.fontSize.toUpperCase()} · {snap.codeFontSize}px · {snap.preferredLang.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restoreSettingsSnapshot(snap)}
                            >
                              {tLoc(translations.settings.applyPreset, lang)}
                            </Button>
                            <button
                              type="button"
                              aria-label="Delete preset"
                              onClick={() => deleteSettingsSnapshot(snap.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Portable JSON File Export / Import & Reset */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportJson}>
                <Download className="w-3.5 h-3.5 text-[#00878F]" />
                <span>{tLoc(translations.settings.exportJsonBtn, lang)}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 text-[#00878F]" />
                <span>{tLoc(translations.settings.importJsonBtn, lang)}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportJsonChange}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={resetUserSettings}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{tLoc(translations.settings.resetDefaults, lang)}</span>
            </button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
