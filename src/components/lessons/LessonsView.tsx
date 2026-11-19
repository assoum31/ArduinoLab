import { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  GraduationCap,
  Lock,
  Map as MapIcon,
  Play,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LESSONS, TRACK_META } from '../../data/lessons';
import { tLoc, translations } from '../../i18n/translations';
import { analyzeCircuit } from '../../engine/arduinoSim';
import { BreadboardCanvas } from '../simulator/BreadboardCanvas';
import { CertificateModal, CORE_CERT_LESSONS } from './CertificateModal';
import { Button } from '../ui/button';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

export function LessonsView() {
  const {
    lang,
    allLessons,
    completedLessons,
    badges,
    certificate,
    platformConfig,
    completeItem,
    claimCertificate,
    loadIntoSimulator,
    isAdmin,
  } = useApp();

  const [viewMode, setViewMode] = useState<'roadmap' | 'study'>('roadmap');
  const [selectedLessonId, setSelectedLessonId] = useState(LESSONS[0].id);
  const [activeTrack, setActiveTrack] = useState<number | 'all'>('all');
  const [certOpen, setCertOpen] = useState(false);
  const [certCelebration, setCertCelebration] = useState(false);
  const [stationToast, setStationToast] = useState<string | null>(null);

  const selectedLesson = useMemo(
    () => allLessons.find((l) => l.id === selectedLessonId) || allLessons[0],
    [allLessons, selectedLessonId],
  );

  const visibleTracks = useMemo(
    () =>
      activeTrack === 'all'
        ? TRACK_META
        : TRACK_META.filter((tr) => tr.id === activeTrack),
    [activeTrack],
  );

  const isCompleted = completedLessons.includes(selectedLesson.id);
  const completedBuiltinCount = LESSONS.filter((l) =>
    completedLessons.includes(l.id),
  ).length;
  const progressPct = Math.round((completedBuiltinCount / LESSONS.length) * 100);
  const certThreshold = platformConfig.certThreshold || 100;
  const certReady =
    Boolean(certificate) ||
    completedBuiltinCount >= CORE_CERT_LESSONS ||
    progressPct >= certThreshold ||
    isAdmin;

  const earnedStationsCount = TRACK_META.filter((tr) => {
    const reqIds = LESSONS.filter((l) => l.track === tr.id).map((l) => l.id);
    return (
      badges.includes(tr.badgeId) ||
      (reqIds.length > 0 && reqIds.every((id) => completedLessons.includes(id)))
    );
  }).length;

  const previewAnalysis = useMemo(
    () =>
      analyzeCircuit(selectedLesson.circuit, {
        D13: 255,
        D12: 255,
        D11: 255,
        D10: 255,
        D9: 220,
      }),
    [selectedLesson],
  );

  const openLessonForStudy = (lessonId: string) => {
    soundEngine.playSelect();
    setSelectedLessonId(lessonId);
    setViewMode('study');
  };

  const handleCompleteLesson = async () => {
    const alreadyDone = completedLessons.includes(selectedLesson.id);
    const isBuiltin = LESSONS.some((l) => l.id === selectedLesson.id);
    const nextBuiltinCount =
      !alreadyDone && isBuiltin ? completedBuiltinCount + 1 : completedBuiltinCount;
    const justFinishedCore11 =
      !alreadyDone &&
      isBuiltin &&
      completedBuiltinCount < CORE_CERT_LESSONS &&
      nextBuiltinCount >= CORE_CERT_LESSONS;
    const justFinishedAllLessons =
      !alreadyDone &&
      isBuiltin &&
      completedBuiltinCount < LESSONS.length &&
      nextBuiltinCount === LESSONS.length;

    const res = await completeItem('lesson', selectedLesson.id, selectedLesson.xp);
    soundEngine.playSuccess();

    if (justFinishedCore11 || justFinishedAllLessons) {
      confetti({
        particleCount: 120,
        spread: 95,
        origin: { x: 0.25, y: 0.6 },
        colors: ['#00878F', '#D4AF37', '#10B981', '#F59E0B'],
      });
      confetti({
        particleCount: 120,
        spread: 95,
        origin: { x: 0.75, y: 0.6 },
        colors: ['#00878F', '#D4AF37', '#10B981', '#F59E0B'],
      });
      if (!certificate) {
        claimCertificate().catch(() => {});
      }
      setCertCelebration(true);
      setCertOpen(true);
    } else {
      confetti({
        particleCount: res.newlyUnlockedStations.length > 0 ? 110 : 55,
        spread: res.newlyUnlockedStations.length > 0 ? 85 : 60,
        origin: { y: 0.65 },
      });
    }

    if (res.newlyUnlockedStations.length > 0) {
      const badgeKey = res.newlyUnlockedStations[0] as keyof typeof translations.badges;
      const meta = translations.badges[badgeKey];
      if (meta) {
        setStationToast(tLoc(meta.name, lang));
        setTimeout(() => setStationToast(null), 5000);
      }
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Station Badge Unlocked Celebration Banner */}
      {stationToast && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <Award className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              {tLoc(translations.lessons.stationBadgeUnlocked, lang)} — {stationToast}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStationToast(null)}
            className="text-xs font-semibold underline cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* Top Roadmap Header & Progress Overview */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
            {tLoc(translations.lessons.title, lang)}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {tLoc(translations.lessons.subtitle, lang)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Progress Telemetry */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
            <div className="text-xs">
              <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                {completedBuiltinCount}/{LESSONS.length} · {progressPct}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {earnedStationsCount}/5{' '}
                {lang === 'ar' ? 'شارات محطات' : lang === 'fr' ? 'badges d’étapes' : 'station badges'}
              </div>
            </div>
            <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#00878F] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* View Mode Toggle: Roadmap Map vs Lesson Study */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setViewMode('roadmap');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                viewMode === 'roadmap'
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400',
              )}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{tLoc(translations.lessons.roadmapView, lang)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setViewMode('study');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                viewMode === 'study'
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400',
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{tLoc(translations.lessons.studyView, lang)}</span>
            </button>
          </div>

          {/* Quick Certificate Action */}
          <Button
            variant={certReady ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              soundEngine.playSelect();
              setCertCelebration(false);
              setCertOpen(true);
            }}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{tLoc(translations.lessons.viewCertificate, lang)}</span>
          </Button>
        </div>
      </div>

      {/* ==================== VIEW 1: INTERACTIVE 5-STATION ROADMAP MAP ==================== */}
      {viewMode === 'roadmap' ? (
        <div className="space-y-6">
          {/* Station Spine Container */}
          <div className="relative space-y-6">
            {TRACK_META.map((station, stationIndex) => {
              const stationLessons = allLessons.filter(
                (l) => l.track === station.id,
              );
              const builtinStationLessons = LESSONS.filter(
                (l) => l.track === station.id,
              );
              const doneCount = stationLessons.filter((l) =>
                completedLessons.includes(l.id),
              ).length;
              const builtinDone = builtinStationLessons.filter((l) =>
                completedLessons.includes(l.id),
              ).length;
              const stationComplete =
                badges.includes(station.badgeId) ||
                (builtinStationLessons.length > 0 &&
                  builtinDone === builtinStationLessons.length);
              const stationPct = Math.round(
                (doneCount / Math.max(1, stationLessons.length)) * 100,
              );

              return (
                <div key={station.id} className="relative">
                  {/* Vertical Roadmap Connector Line */}
                  {stationIndex < TRACK_META.length && (
                    <div
                      aria-hidden="true"
                      className="hidden md:block absolute start-7 top-16 bottom-[-28px] w-0.5 bg-slate-200 dark:bg-slate-800"
                    />
                  )}

                  <div
                    className={cn(
                      'rounded-2xl border bg-white dark:bg-[#111827] overflow-hidden transition-colors',
                      stationComplete
                        ? 'border-emerald-500/40 dark:border-emerald-500/35'
                        : 'border-slate-200 dark:border-slate-800',
                    )}
                  >
                    {/* Station Header Row */}
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-mono text-base font-extrabold text-white shrink-0 shadow-sm"
                          style={{
                            backgroundColor: stationComplete
                              ? '#10b981'
                              : station.accent,
                          }}
                        >
                          {stationComplete ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            `0${station.id}`
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                              {tLoc(station.title, lang)}
                            </h2>
                            <span className="font-mono tabular-nums text-xs font-bold text-[#00878F] dark:text-[#22c6cf]">
                              {doneCount}/{stationLessons.length}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            {tLoc(station.subtitle, lang)}
                          </p>
                        </div>
                      </div>

                      {/* Station Milestone Badge Card */}
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-2 rounded-xl border shrink-0',
                          stationComplete
                            ? 'border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400',
                        )}
                      >
                        <Award
                          className={cn(
                            'w-6 h-6 shrink-0',
                            stationComplete ? 'text-amber-500' : 'text-slate-400',
                          )}
                        />
                        <div className="text-xs">
                          <div className="font-bold">
                            {tLoc(station.badgeName, lang)}
                          </div>
                          <div className="text-[11px] opacity-85 font-mono tabular-nums">
                            {stationComplete
                              ? tLoc(translations.lessons.stationBadgeUnlocked, lang)
                              : `+${station.bonusXp} XP · ${stationPct}%`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Station Progress Thin Strip */}
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${stationPct}%`,
                          backgroundColor: stationComplete
                            ? '#10b981'
                            : station.accent,
                        }}
                      />
                    </div>

                    {/* Lesson Nodes Grid Inside Station */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {stationLessons.map((lesson) => {
                        const done = completedLessons.includes(lesson.id);
                        return (
                          <div
                            key={lesson.id}
                            className={cn(
                              'group rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all',
                              done
                                ? 'border-emerald-500/35 bg-emerald-500/5 dark:bg-emerald-500/10'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1424] hover:border-[#00878F]',
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={cn(
                                    'font-mono text-xs font-bold',
                                    done
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-[#00878F] dark:text-[#22c6cf]',
                                  )}
                                >
                                  {lesson.isCustom
                                    ? lang === 'ar'
                                      ? 'درس إضافي'
                                      : 'BONUS'
                                    : `#${String(lesson.number).padStart(2, '0')}`}
                                </span>
                                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  +{lesson.xp} XP
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                {tLoc(lesson.title, lang)}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                {tLoc(lesson.summary, lang)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => openLessonForStudy(lesson.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <BookOpen className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {done
                                    ? lang === 'ar'
                                      ? 'مراجعة'
                                      : 'Review'
                                    : lang === 'ar'
                                      ? 'ابدأ الدرس'
                                      : 'Start'}
                                </span>
                              </button>
                              <button
                                type="button"
                                title={tLoc(translations.lessons.testInSimulator, lang)}
                                onClick={() =>
                                  loadIntoSimulator({
                                    title: tLoc(lesson.title, lang),
                                    code: lesson.code,
                                    blocks: lesson.blocks,
                                    circuit: lesson.circuit,
                                    autoRun: true,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#00878F] hover:text-[#00878F] transition-colors cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FINAL ROADMAP DESTINATION: OFFICIAL GRADUATION CERTIFICATE */}
          <div className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#082f33] p-6 sm:p-8 text-white shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                  {certReady ? (
                    <Trophy className="w-7 h-7" />
                  ) : (
                    <GraduationCap className="w-7 h-7" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'نهاية المسار · المحطة الختامية'
                        : lang === 'fr'
                          ? 'FIN DU PARCOURS · DIPLÔME OFFICIEL'
                          : 'FINAL MILESTONE · GRADUATION CREDENTIAL'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold">
                    {tLoc(translations.lessons.certificateTitle, lang)}
                  </h2>
                  <p className="text-sm text-slate-300 max-w-2xl">
                    {tLoc(translations.lessons.certificateDesc, lang)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="text-xs font-mono text-slate-300 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-lg font-extrabold text-amber-300 tabular-nums">
                    {Math.min(completedBuiltinCount, CORE_CERT_LESSONS)} / {CORE_CERT_LESSONS}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {certReady
                      ? lang === 'ar'
                        ? 'جاهزة للطباعة والتحميل'
                        : lang === 'fr'
                          ? 'Prêt à imprimer'
                          : 'Unlocked · Printable'
                      : lang === 'ar'
                        ? 'دروس أساسية لفتح الشهادة'
                        : lang === 'fr'
                          ? 'Leçons requises'
                          : 'Core Lessons'}
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => {
                    soundEngine.playSelect();
                    setCertCelebration(false);
                    setCertOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold"
                >
                  {certReady ? (
                    <Award className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{tLoc(translations.lessons.viewCertificate, lang)}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== VIEW 2: LESSON STUDY DECK ==================== */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                soundEngine.playSelect();
                setViewMode('roadmap');
              }}
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{tLoc(translations.lessons.roadmapView, lang)}</span>
            </Button>

            {/* Station Quick Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSelect();
                  setActiveTrack('all');
                }}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  activeTrack === 'all'
                    ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400',
                )}
              >
                {lang === 'ar'
                  ? `الكل (${allLessons.length})`
                  : `All (${allLessons.length})`}
              </button>
              {TRACK_META.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setActiveTrack(tr.id);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                    activeTrack === tr.id
                      ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  S{tr.id}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Stations & Lessons */}
            <div className="lg:col-span-4 space-y-5">
              {visibleTracks.map((track) => {
                const trackLessons = allLessons.filter(
                  (l) => l.track === track.id,
                );
                return (
                  <div key={track.id} className="space-y-2">
                    <div className="px-1 flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tLoc(track.title, lang)}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tLoc(track.subtitle, lang)}
                        </p>
                      </div>
                      {badges.includes(track.badgeId) && (
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                      {trackLessons.map((lesson) => {
                        const done = completedLessons.includes(lesson.id);
                        const active = selectedLesson.id === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playSelect();
                              setSelectedLessonId(lesson.id);
                            }}
                            className={cn(
                              'w-full text-start px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer',
                              active
                                ? 'bg-[#00878F]/10 dark:bg-[#00878F]/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0',
                                  done
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : active
                                      ? 'bg-[#00878F] text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                                )}
                              >
                                {done ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  String(lesson.number).padStart(2, '0')
                                )}
                              </span>
                              <div className="min-w-0">
                                <div
                                  className={cn(
                                    'text-sm font-semibold truncate',
                                    active
                                      ? 'text-[#00878F] dark:text-[#22c6cf]'
                                      : 'text-slate-900 dark:text-slate-100',
                                  )}
                                >
                                  {tLoc(lesson.title, lang)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                                  +{lesson.xp} XP · {lesson.circuit.components.length} parts
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 rtl:rotate-180" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Active Lesson Interactive Detail Deck */}
            <article className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>
                      {lang === 'ar'
                        ? `المحطة ${selectedLesson.track} · الدرس ${selectedLesson.number}`
                        : `Station ${selectedLesson.track} · Lesson ${selectedLesson.number}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-[#00878F] dark:text-[#22c6cf] font-semibold">
                      +{Math.round(selectedLesson.xp * (platformConfig.xpMultiplier || 1))} XP
                    </span>
                    {isCompleted && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {tLoc(translations.lessons.completed, lang)}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {tLoc(selectedLesson.title, lang)}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {tLoc(selectedLesson.summary, lang)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    onClick={() =>
                      loadIntoSimulator({
                        title: tLoc(selectedLesson.title, lang),
                        code: selectedLesson.code,
                        blocks: selectedLesson.blocks,
                        circuit: selectedLesson.circuit,
                        autoRun: true,
                      })
                    }
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{tLoc(translations.lessons.testInSimulator, lang)}</span>
                  </Button>
                  <Button
                    variant={isCompleted ? 'secondary' : 'outline'}
                    onClick={handleCompleteLesson}
                    disabled={isCompleted}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isCompleted
                        ? tLoc(translations.lessons.completed, lang)
                        : tLoc(translations.lessons.markComplete, lang)}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-7 space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#00878F]" />
                      <span>{tLoc(translations.lessons.theory, lang)}</span>
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {tLoc(selectedLesson.theory, lang)}
                    </p>

                    <div className="pt-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        {tLoc(translations.lessons.keyFunctions, lang)}
                      </div>
                      <div className="flex flex-wrap gap-2 font-mono text-xs" dir="ltr">
                        {selectedLesson.keyFunctions.map((fn) => (
                          <code
                            key={fn}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf]"
                          >
                            {fn}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-[#00878F]" />
                        <span>Pinout</span>
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        {selectedLesson.pinoutNotes.map((pn) => (
                          <div
                            key={pn.pin}
                            className="flex items-baseline justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <span className="font-mono font-bold text-[#00878F] dark:text-[#22c6cf] shrink-0">
                              {pn.pin}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 text-end">
                              {tLoc(pn.role, lang)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                        {tLoc(translations.lessons.guidedSteps, lang)}
                      </h3>
                      <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {selectedLesson.steps.map((st, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono font-bold text-[#00878F]">
                              {idx + 1}.
                            </span>
                            <span>{tLoc(st, lang)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Live Circuit Preview */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tLoc(translations.lessons.schematicPreview, lang)}
                  </h3>
                  <div className="h-[310px]">
                    <BreadboardCanvas
                      lang={lang}
                      circuit={selectedLesson.circuit}
                      onChangeCircuit={() => {}}
                      viewMode="breadboard"
                      running={true}
                      ledD13On={selectedLesson.number <= 1}
                      pinValues={{ D13: 255, D12: 255, D11: 255, D10: 255, D9: 210 }}
                      servoAngles={{ D9: 90 }}
                      buzzerTone={null}
                      componentPower={previewAnalysis.componentPower}
                      diagnostics={previewAnalysis.diagnostics}
                      compactPalette={true}
                    />
                  </div>
                </div>

                {/* Starter Code */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#00878F]" />
                    <span>Arduino C++ Sketch</span>
                  </h3>
                  <pre
                    dir="ltr"
                    className="p-4 rounded-xl bg-[#0b1120] text-teal-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800"
                  >
                    {selectedLesson.code}
                  </pre>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* Lesson Complete & Official Printable Certificate Modal */}
      <CertificateModal
        open={certOpen}
        onClose={() => setCertOpen(false)}
        celebrationMode={certCelebration}
      />
    </section>
  );
}
