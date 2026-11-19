import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { UnoStudio3D } from './components/studio3d/UnoStudio3D';
import { SimulatorLab } from './components/simulator/SimulatorLab';
import { ProjectsGallery } from './components/projects/ProjectsGallery';
import { LessonsView } from './components/lessons/LessonsView';
import { ChallengeArena } from './components/challenges/ChallengeArena';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { AdminPanel } from './components/admin/AdminPanel';
import { ProfileDrawer } from './components/profile/ProfileDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineStatusBanner } from './components/PWAControls';
import { ShortcutProvider } from './context/ShortcutContext';
import { ShortcutsModal } from './components/ShortcutsModal';

function ArdunoLabShell() {
  const { activeTab, platformConfig, lang, simulatorFocusMode } = useApp();
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const isFocusActive = activeTab === 'simulator' && simulatorFocusMode;

  const announcementText =
    lang === 'ar'
      ? platformConfig.announcementAr
      : lang === 'fr'
        ? platformConfig.announcementFr || platformConfig.announcementEn
        : platformConfig.announcementEn || platformConfig.announcementAr;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {!isFocusActive && <Navbar />}
      {!isFocusActive &&
        platformConfig.announcementActive &&
        announcementText &&
        !dismissedBanner && (
          <div className="bg-[#00878F] text-white px-3 sm:px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2.5">
            <Megaphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{announcementText}</span>
            <button
              type="button"
              onClick={() => setDismissedBanner(true)}
              aria-label="Dismiss announcement"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-white/15 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      <main
        className={`flex-1 flex flex-col ${!isFocusActive ? 'pb-16 md:pb-0' : ''}`}
      >
        {activeTab === 'studio' && <UnoStudio3D />}
        {activeTab === 'simulator' && <SimulatorLab />}
        {activeTab === 'projects' && <ProjectsGallery />}
        {activeTab === 'lessons' && <LessonsView />}
        {activeTab === 'challenges' && <ChallengeArena />}
        {activeTab === 'leaderboard' && <LeaderboardView />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
      {!isFocusActive && <MobileBottomNav />}
      {!isFocusActive && <ProfileDrawer />}
      <OfflineStatusBanner />
      <ShortcutsModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ShortcutProvider>
        <ArdunoLabShell />
      </ShortcutProvider>
    </AppProvider>
  );
}
