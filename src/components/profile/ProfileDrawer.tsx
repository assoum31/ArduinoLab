import {
  FolderOpen,
  GraduationCap,
  LogIn,
  LogOut,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { tLoc, translations } from '../../i18n/translations';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { LESSONS } from '../../data/lessons';
import { CHALLENGES } from '../../data/challenges';
import { soundEngine } from '../../utils/sound';
import {
  BADGE_INVENTORY_ITEMS,
  BadgeInventory,
} from './BadgeInventory';

export function ProfileDrawer() {
  const {
    lang,
    profileOpen,
    setProfileOpen,
    firebaseUser,
    authError,
    signInWithGoogle,
    signOutUser,
    profile,
    completedLessons,
    completedChallenges,
    badges,
    certificate,
    savedProjects,
    deleteCircuitProject,
    loadIntoSimulator,
    setActiveTab,
  } = useApp();

  const rankThresholds = [
    { key: 'spark_novice', min: 0, next: 300 },
    { key: 'wire_apprentice', min: 300, next: 800 },
    { key: 'circuit_master', min: 800, next: 1500 },
    { key: 'embedded_architect', min: 1500, next: 2500 },
  ];
  const currentRankObj =
    rankThresholds.find((r) => r.key === profile.rank) || rankThresholds[0];
  const pct = Math.min(
    100,
    Math.round(
      ((profile.xp - currentRankObj.min) /
        Math.max(1, currentRankObj.next - currentRankObj.min)) *
        100,
    ),
  );
  const rankLabel =
    translations.profile.ranks[
      profile.rank as keyof typeof translations.profile.ranks
    ] || translations.profile.ranks.spark_novice;

  const handleLoadProject = (proj: (typeof savedProjects)[number]) => {
    try {
      const blocks = JSON.parse(proj.blocksJson || '[]');
      const circuit = JSON.parse(proj.circuitJson || '{"components":[],"wires":[]}');
      loadIntoSimulator({
        title: proj.title,
        code: proj.code,
        blocks,
        circuit,
      });
      setProfileOpen(false);
    } catch {
      soundEngine.playError();
    }
  };

  return (
    <Dialog
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      title={tLoc(translations.profile.title, lang)}
    >
      <div className="space-y-6">
        {/* User Header & Cloud Auth */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#00878F] text-white flex items-center justify-center font-bold text-lg">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{profile.displayName}</span>
                {certificate && (
                  <GraduationCap className="w-4 h-4 text-amber-500" />
                )}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{tLoc(rankLabel, lang)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {firebaseUser
                    ? tLoc(translations.profile.cloudSynced, lang)
                    : tLoc(translations.profile.guestMode, lang)}
                </span>
              </div>
            </div>
          </div>

          {firebaseUser ? (
            <Button variant="outline" size="sm" onClick={signOutUser}>
              <LogOut className="w-3.5 h-3.5" />
              <span>{tLoc(translations.profile.signOut, lang)}</span>
            </Button>
          ) : (
            <Button size="sm" onClick={signInWithGoogle}>
              <LogIn className="w-3.5 h-3.5" />
              <span>{tLoc(translations.profile.signInGoogle, lang)}</span>
            </Button>
          )}
        </div>

        {authError && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {authError}
          </div>
        )}

        {/* XP Progress & Summary Metrics */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {tLoc(rankLabel, lang)}
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-[#00878F] dark:text-[#22c6cf]">
              {profile.xp} / {currentRankObj.next} XP
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-[#00878F] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tLoc(translations.nav.lessons, lang)}
              </div>
              <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {completedLessons.length}/{LESSONS.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tLoc(translations.nav.challenges, lang)}
              </div>
              <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {completedChallenges.length}/{CHALLENGES.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tLoc(translations.profile.badges, lang)}
              </div>
              <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {badges.length}/{BADGE_INVENTORY_ITEMS.length}
              </div>
            </div>
          </div>

          {certificate && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <GraduationCap className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {tLoc(translations.lessons.certificateTitle, lang)}
                  </div>
                  <div className="font-mono text-[11px] text-amber-700 dark:text-amber-300">
                    {certificate.certificateCode}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setProfileOpen(false);
                  setActiveTab('lessons');
                }}
              >
                {lang === 'ar' ? 'عرض' : 'View'}
              </Button>
            </div>
          )}
        </div>

        {/* Interactive Achievement Badge Inventory */}
        <BadgeInventory
          lang={lang}
          earnedBadgeIds={badges}
          completedLessons={completedLessons}
        />

        {/* Saved Custom Circuits */}
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.profile.savedCircuits, lang)}</span>
          </h4>
          {savedProjects.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              {tLoc(translations.profile.noSaved, lang)}
            </p>
          ) : (
            <div className="space-y-2">
              {savedProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {proj.title}
                    </div>
                    {proj.description && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {proj.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleLoadProject(proj)}
                    >
                      {tLoc(translations.profile.loadCircuit, lang)}
                    </Button>
                    <button
                      type="button"
                      aria-label="Delete project"
                      onClick={() => {
                        soundEngine.playSelect();
                        deleteCircuitProject(proj.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
