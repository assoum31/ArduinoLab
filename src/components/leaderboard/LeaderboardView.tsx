import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Crown,
  Flame,
  GraduationCap,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { LeaderboardEntry } from '../../types/arduino';
import { tLoc, translations } from '../../i18n/translations';
import { LESSONS } from '../../data/lessons';
import { Button } from '../ui/button';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

export function LeaderboardView() {
  const {
    lang,
    profile,
    firebaseUser,
    signInWithGoogle,
    completedLessons,
    badges,
    platformConfig,
    setActiveTab,
  } = useApp();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'xp' | 'lessons' | 'badges'>('xp');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      }
    } catch {
      // ignore network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const sortedEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...entries].sort((a, b) => {
      if (sortBy === 'lessons') return b.lessonsCompleted - a.lessonsCompleted || b.xp - a.xp;
      if (sortBy === 'badges') return b.badgesCount - a.badgesCount || b.xp - a.xp;
      return b.xp - a.xp;
    });
    const reindexed = list.map((e, i) => ({ ...e, position: i + 1 }));
    if (!q) return reindexed;
    return reindexed.filter((e) => e.displayName.toLowerCase().includes(q));
  }, [entries, search, sortBy]);

  const topThree = useMemo(() => sortedEntries.slice(0, 3), [sortedEntries]);

  // Compute current user's standing & XP needed to overtake next rank
  const myStanding = useMemo(() => {
    const byXp = [...entries].sort((a, b) => b.xp - a.xp);
    const foundIdx = firebaseUser
      ? byXp.findIndex((e) => e.uid === profile.uid)
      : -1;
    if (foundIdx >= 0) {
      const prev = foundIdx > 0 ? byXp[foundIdx - 1] : null;
      return {
        rank: foundIdx + 1,
        xpToNext: prev ? Math.max(1, prev.xp - profile.xp + 1) : 0,
        nextName: prev?.displayName || null,
      };
    }
    const higher = byXp.filter((e) => e.xp > profile.xp);
    const nextTarget = higher[higher.length - 1] || null;
    return {
      rank: higher.length + 1,
      xpToNext: nextTarget ? Math.max(1, nextTarget.xp - profile.xp + 1) : 0,
      nextName: nextTarget?.displayName || null,
    };
  }, [entries, firebaseUser, profile.uid, profile.xp]);

  const getRankLabel = (rankKey: string) => {
    const meta =
      translations.profile.ranks[
        rankKey as keyof typeof translations.profile.ranks
      ] || translations.profile.ranks.spark_novice;
    return tLoc(meta, lang);
  };

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {tLoc(translations.leaderboard.title, lang)}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {tLoc(translations.leaderboard.subtitle, lang)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {platformConfig.xpMultiplier > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold">
              <Flame className="w-3.5 h-3.5" />
              <span>
                {lang === 'ar'
                  ? `حدث مضاعفة النقاط ×${platformConfig.xpMultiplier} مفعّل!`
                  : `${platformConfig.xpMultiplier}x XP Boost Active!`}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              soundEngine.playSelect();
              fetchLeaderboard();
            }}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              soundEngine.playSelect();
              setActiveTab('lessons');
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {lang === 'ar' ? 'اجمع المزيد من النقاط' : 'Earn More XP'}
            </span>
          </Button>
        </div>
      </div>

      {/* Personal Standing & Motivation Banner */}
      <div className="rounded-2xl border border-[#00878F]/30 bg-gradient-to-r from-[#00878F]/10 via-white to-slate-50 dark:from-[#00878F]/20 dark:via-[#111827] dark:to-[#0D1424] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00878F] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <span className="text-[10px] font-semibold opacity-80">RANK</span>
            <span className="font-mono text-xl font-extrabold leading-none">
              #{myStanding.rank}
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#00878F] dark:text-[#22c6cf]">
              {tLoc(translations.leaderboard.yourStanding, lang)}
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <span>{profile.displayName}</span>
              <span className="font-mono tabular-nums text-sm text-amber-600 dark:text-amber-400">
                {profile.xp} XP
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {myStanding.xpToNext > 0 && myStanding.nextName ? (
                <>
                  {lang === 'ar'
                    ? `تحتاج ${myStanding.xpToNext} نقطة لتتجاوز ${myStanding.nextName}`
                    : lang === 'fr'
                      ? `${myStanding.xpToNext} XP pour dépasser ${myStanding.nextName}`
                      : `Need ${myStanding.xpToNext} XP to overtake ${myStanding.nextName}`}
                </>
              ) : (
                <>
                  {lang === 'ar'
                    ? 'أنت في الصدارة! واصل التحديات للحفاظ على المركز الأول.'
                    : 'You are leading the board! Keep building to stay #1.'}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#00878F]" />
              {completedLessons.length}/{LESSONS.length}
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {badges.length}
            </span>
          </div>
          {!firebaseUser && (
            <Button size="sm" onClick={signInWithGoogle}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {lang === 'ar'
                  ? 'سجّل الدخول لتثبيت مركزك'
                  : 'Sign in to claim rank'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((entry, idx) => {
            const medalColors = [
              'border-amber-400/60 bg-gradient-to-b from-amber-500/15 to-white dark:to-[#111827]',
              'border-slate-300 dark:border-slate-600 bg-gradient-to-b from-slate-300/15 to-white dark:to-[#111827]',
              'border-orange-400/50 bg-gradient-to-b from-orange-500/10 to-white dark:to-[#111827]',
            ];
            const iconColors = ['text-amber-500', 'text-slate-400', 'text-orange-500'];
            const MedalIcon = idx === 0 ? Crown : idx === 1 ? Trophy : Medal;

            return (
              <div
                key={entry.uid}
                className={cn(
                  'rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-xs',
                  medalColors[idx],
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt={entry.displayName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#00878F] text-white flex items-center justify-center font-bold text-base shrink-0">
                        {entry.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span>{entry.displayName}</span>
                        {entry.hasCertificate && (
                          <GraduationCap
                            className="w-4 h-4 text-amber-500 shrink-0"
                            aria-label="Certified"
                          />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {getRankLabel(entry.rank)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-extrabold text-lg">
                    <MedalIcon className={cn('w-5 h-5', iconColors[idx])} />
                    <span className={iconColors[idx]}>#{entry.position}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800 text-center">
                  <div>
                    <div className="font-mono tabular-nums font-extrabold text-base text-[#00878F] dark:text-[#22c6cf]">
                      {entry.xp}
                    </div>
                    <div className="text-[10px] text-slate-500">XP</div>
                  </div>
                  <div>
                    <div className="font-mono tabular-nums font-bold text-base text-slate-900 dark:text-white">
                      {entry.lessonsCompleted}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tLoc(translations.leaderboard.lessonsCol, lang)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono tabular-nums font-bold text-base text-amber-600 dark:text-amber-400">
                      {entry.badgesCount}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tLoc(translations.leaderboard.badgesCol, lang)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content Split: Full Leaderboard Table + XP Motivation Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          {/* Search & Sort Controls */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'ابحث عن متعلم...'
                    : lang === 'fr'
                      ? 'Rechercher un étudiant...'
                      : 'Search students...'
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 ps-9 pe-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {(['xp', 'lessons', 'badges'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setSortBy(key);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                    sortBy === key
                      ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  {key === 'xp'
                    ? tLoc(translations.leaderboard.xpCol, lang)
                    : key === 'lessons'
                      ? tLoc(translations.leaderboard.lessonsCol, lang)
                      : tLoc(translations.leaderboard.badgesCol, lang)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                  <th className="py-3 px-4 text-start font-semibold">
                    {tLoc(translations.leaderboard.rankCol, lang)}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold">
                    {tLoc(translations.leaderboard.studentCol, lang)}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold hidden sm:table-cell">
                    {tLoc(translations.leaderboard.levelCol, lang)}
                  </th>
                  <th className="py-3 px-4 text-center font-semibold">
                    {tLoc(translations.leaderboard.lessonsCol, lang)}
                  </th>
                  <th className="py-3 px-4 text-center font-semibold">
                    {tLoc(translations.leaderboard.badgesCol, lang)}
                  </th>
                  <th className="py-3 px-4 text-end font-semibold">
                    {tLoc(translations.leaderboard.xpCol, lang)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {sortedEntries.map((row) => {
                  const isMe = firebaseUser && row.uid === profile.uid;
                  return (
                    <tr
                      key={row.uid}
                      className={cn(
                        'transition-colors',
                        isMe
                          ? 'bg-[#00878F]/10 dark:bg-[#00878F]/15'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                      )}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        #{row.position}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {row.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="truncate">{row.displayName}</span>
                              {row.hasCertificate && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  {tLoc(translations.leaderboard.certified, lang)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        {getRankLabel(row.rank)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                        {row.lessonsCompleted}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        {row.badgesCount}
                      </td>
                      <td className="py-3 px-4 text-end font-mono tabular-nums font-extrabold text-[#00878F] dark:text-[#22c6cf]">
                        {row.xp} XP
                      </td>
                    </tr>
                  );
                })}
                {!loading && sortedEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-xs text-slate-500 dark:text-slate-400"
                    >
                      {lang === 'ar'
                        ? 'لا توجد نتائج مطابقة.'
                        : 'No matching students found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: XP & Motivation Guide */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00878F]" />
              <span>{tLoc(translations.leaderboard.howToEarn, lang)}</span>
            </h2>
            <div className="space-y-3 text-xs">
              {[
                {
                  title: lang === 'ar' ? 'إتمام درس في خارطة الطريق' : 'Complete a Roadmap Lesson',
                  xp: '+50 — +200 XP',
                  desc: lang === 'ar' ? 'كل درس يرفع رصيدك ويقربك من شارة المحطة.' : 'Every lesson advances your station mastery.',
                },
                {
                  title: lang === 'ar' ? 'فتح شارة محطة كاملة (1-5)' : 'Unlock a Full Station Badge',
                  xp: '+100 — +150 XP',
                  desc: lang === 'ar' ? 'مكافأة فورية + شارة دائمة عند إنهاء كل محطة.' : 'Instant bonus XP + permanent station badge.',
                },
                {
                  title: lang === 'ar' ? 'اجتياز تحديات التوصيل والأخطاء' : 'Pass Arena Challenges',
                  xp: '+75 — +150 XP',
                  desc: lang === 'ar' ? 'اختبارات آلية للتوصيل وإصلاح الأكواد.' : 'Automated wiring, debug & code verifications.',
                },
                {
                  title: lang === 'ar' ? 'حفظ مشروع دائرة خاص بك' : 'Save a Custom Circuit',
                  xp: '+25 XP',
                  desc: lang === 'ar' ? 'ابنِ دائرتك في المحاكي واحفظها في حسابك.' : 'Design and save circuits from the Lab.',
                },
                {
                  title: lang === 'ar' ? 'إتمام المسار بالكامل' : 'Complete Full Roadmap',
                  xp: lang === 'ar' ? 'شهادة معتمدة 🎓' : 'Official Certificate 🎓',
                  desc: lang === 'ar' ? 'تظهر شارة الاعتماد بجانب اسمك في لوحة المتصدرين.' : 'Verified graduation credential on leaderboard.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#00878F] dark:text-[#22c6cf] shrink-0 whitespace-nowrap">
                    {item.xp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
