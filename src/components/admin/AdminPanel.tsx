import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type {
  AdminCustomLesson,
  AdminUserSummary,
  CertificateRecord,
} from '../../types/arduino';
import { LESSONS, TRACK_META } from '../../data/lessons';
import { tLoc, translations } from '../../i18n/translations';
import { Button } from '../ui/button';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

type AdminTab = 'overview' | 'users' | 'roadmap' | 'certs' | 'settings';

const ALL_BADGE_IDS = Object.keys(translations.badges) as Array<
  keyof typeof translations.badges
>;

interface OverviewPayload {
  adminEmail?: string;
  stats: {
    totalUsers: number;
    totalXpAwarded: number;
    totalLessonsCompleted: number;
    totalChallengesSolved: number;
    totalCertificates: number;
    totalProjects: number;
    totalCustomLessons: number;
  };
  users: AdminUserSummary[];
  certificates: Array<CertificateRecord & { userId: number }>;
  customLessons: AdminCustomLesson[];
  settings: {
    adminEmail: string;
    announcementActive: boolean;
    announcementAr: string;
    announcementEn: string;
    announcementFr: string;
    xpMultiplier: number;
    certThreshold: number;
    certIssuerName: string;
    certDirectorName: string;
  };
}

export function AdminPanel() {
  const {
    lang,
    isAdmin,
    adminToken,
    adminLogin,
    adminLogout,
    getAdminHeaders,
    signInWithGoogle,
    refreshPlatformConfig,
    refreshUserData,
  } = useApp();

  // Admin Login Form State
  const [loginEmail, setLoginEmail] = useState('berrahmaomarfarouk@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin Dashboard State
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [xpDrafts, setXpDrafts] = useState<Record<number, string>>({});

  // New Custom Lesson Form
  const [newLesson, setNewLesson] = useState({
    stationId: 1,
    titleAr: '',
    titleEn: '',
    summaryAr: '',
    theoryAr: '',
    xp: 90,
    code: `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  Serial.println("Custom Lesson Active");\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}`,
  });

  // Settings Draft
  const [settingsDraft, setSettingsDraft] = useState({
    announcementActive: false,
    announcementAr: '',
    announcementEn: '',
    announcementFr: '',
    xpMultiplier: 1,
    certThreshold: 100,
    certIssuerName: 'ArdunoLab Academy',
    certDirectorName: 'Omar Farouk Berrahma',
    newAdminPassword: '',
  });

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3200);
  };

  const fetchOverview = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch('/api/admin/overview', { headers });
      if (res.status === 401 || res.status === 403) {
        if (adminToken) adminLogout();
        setLoading(false);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as OverviewPayload;
        setData(json);
        setSettingsDraft({
          announcementActive: json.settings.announcementActive,
          announcementAr: json.settings.announcementAr,
          announcementEn: json.settings.announcementEn,
          announcementFr: json.settings.announcementFr,
          xpMultiplier: json.settings.xpMultiplier,
          certThreshold: json.settings.certThreshold,
          certIssuerName: json.settings.certIssuerName,
          certDirectorName: json.settings.certDirectorName,
          newAdminPassword: '',
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAdmin, getAdminHeaders, adminToken, adminLogout]);

  useEffect(() => {
    if (isAdmin) {
      fetchOverview();
    }
  }, [isAdmin, fetchOverview]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    const res = await adminLogin(loginEmail, loginPassword);
    setLoggingIn(false);
    if (!res.ok) {
      soundEngine.playError();
      setLoginError(
        lang === 'ar'
          ? 'بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.'
          : res.error || 'Invalid credentials',
      );
    }
  };

  const handleUpdateUser = async (
    userId: number,
    payload: { xp?: number; role?: 'student' | 'admin'; isBanned?: boolean },
  ) => {
    const headers = await getAdminHeaders();
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      soundEngine.playSuccess();
      flashStatus(lang === 'ar' ? 'تم تحديث بيانات الطالب بنجاح' : 'Student updated');
      await fetchOverview();
      await refreshUserData();
    }
  };

  const handleToggleBadge = async (
    userId: number,
    badgeId: string,
    hasBadge: boolean,
  ) => {
    const headers = await getAdminHeaders();
    const res = await fetch(`/api/admin/users/${userId}/badge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ badgeId, action: hasBadge ? 'revoke' : 'grant' }),
    });
    if (res.ok) {
      soundEngine.playSelect();
      await fetchOverview();
      await refreshUserData();
    }
  };

  const handleToggleCertificate = async (
    userId: number,
    hasCert: boolean,
    displayName: string,
  ) => {
    const headers = await getAdminHeaders();
    const res = await fetch(`/api/admin/users/${userId}/certificate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: hasCert ? 'revoke' : 'issue',
        recipientName: displayName,
      }),
    });
    if (res.ok) {
      soundEngine.playSuccess();
      flashStatus(
        hasCert
          ? lang === 'ar'
            ? 'تم سحب الشهادة'
            : 'Certificate revoked'
          : lang === 'ar'
            ? 'تم إصدار الشهادة للطالب بنجاح!'
            : 'Certificate issued!',
      );
      await fetchOverview();
      await refreshUserData();
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const headers = await getAdminHeaders();
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      soundEngine.playSelect();
      flashStatus(lang === 'ar' ? 'تم حذف الحساب' : 'User deleted');
      await fetchOverview();
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.titleAr.trim() || !newLesson.code.trim()) return;
    const headers = await getAdminHeaders();
    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers,
      body: JSON.stringify(newLesson),
    });
    if (res.ok) {
      soundEngine.playSuccess();
      flashStatus(
        lang === 'ar'
          ? 'تمت إضافة الدرس الجديد إلى خارطة الطريق!'
          : 'Custom lesson published to Roadmap!',
      );
      setNewLesson((prev) => ({
        ...prev,
        titleAr: '',
        titleEn: '',
        summaryAr: '',
        theoryAr: '',
      }));
      await Promise.all([fetchOverview(), refreshPlatformConfig()]);
    }
  };

  const handleToggleLessonPublished = async (lesson: AdminCustomLesson) => {
    const headers = await getAdminHeaders();
    const res = await fetch(`/api/admin/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ published: !lesson.published }),
    });
    if (res.ok) {
      soundEngine.playSelect();
      await Promise.all([fetchOverview(), refreshPlatformConfig()]);
    }
  };

  const handleDeleteLesson = async (id: number) => {
    const headers = await getAdminHeaders();
    const res = await fetch(`/api/admin/lessons/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      soundEngine.playSelect();
      await Promise.all([fetchOverview(), refreshPlatformConfig()]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = await getAdminHeaders();
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      soundEngine.playSuccess();
      flashStatus(
        lang === 'ar'
          ? 'تم حفظ إعدادات المنصة وتطبيقها فوراً!'
          : 'Platform settings saved and applied live!',
      );
      setSettingsDraft((prev) => ({ ...prev, newAdminPassword: '' }));
      await Promise.all([fetchOverview(), refreshPlatformConfig()]);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [data, userSearch]);

  // ==================== NOT AUTHENTICATED AS ADMIN: LOGIN GATE ====================
  if (!isAdmin) {
    return (
      <section className="max-w-md mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 sm:p-8 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {tLoc(translations.admin.loginTitle, lang)}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tLoc(translations.admin.loginHint, lang)}
            </p>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'بريد حساب الإدارة' : 'Admin Email'}
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'كلمة مرور الإدارة' : 'Admin Password'}
              </label>
              <input
                type="password"
                required
                dir="ltr"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>

            {loginError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {loginError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loggingIn}>
              <KeyRound className="w-4 h-4" />
              <span>
                {loggingIn
                  ? lang === 'ar'
                    ? 'جاري التحقق...'
                    : 'Verifying...'
                  : lang === 'ar'
                    ? 'دخول لوحة التحكم'
                    : 'Enter Admin Panel'}
              </span>
            </Button>
          </form>

          <div className="relative text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative bg-white dark:bg-[#111827] px-3 text-[11px] text-slate-500">
              {lang === 'ar' ? 'أو الدخول المباشر بحساب المالك' : 'Or sign in with Owner Google'}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={signInWithGoogle}
          >
            <LogIn className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'دخول Google الإداري (berrahmaomarfarouk@gmail.com)'
                : 'Owner Google Sign-In'}
            </span>
          </Button>
        </div>
      </section>
    );
  }

  // ==================== AUTHENTICATED ADMIN CONTROL CENTER ====================
  const adminTabs: Array<{ id: AdminTab; label: string; icon: typeof Shield }> = [
    { id: 'overview', label: tLoc(translations.admin.tabOverview, lang), icon: LayoutDashboard },
    { id: 'users', label: tLoc(translations.admin.tabUsers, lang), icon: Users },
    { id: 'roadmap', label: tLoc(translations.admin.tabRoadmap, lang), icon: BookOpen },
    { id: 'certs', label: tLoc(translations.admin.tabCerts, lang), icon: GraduationCap },
    { id: 'settings', label: tLoc(translations.admin.tabSettings, lang), icon: Settings },
  ];

  return (
    <section className="max-w-[1480px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#00878F] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {tLoc(translations.admin.title, lang)}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {tLoc(translations.admin.subtitle, lang)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data?.adminEmail && (
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {data.adminEmail}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchOverview}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>{lang === 'ar' ? 'تحديث البيانات' : 'Refresh'}</span>
          </Button>
          {adminToken && (
            <Button variant="outline" size="sm" onClick={adminLogout}>
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'خروج الإدارة' : 'Admin Logout'}</span>
            </Button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {adminTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setTab(item.id);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                active
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: OVERVIEW KPIs ==================== */}
      {tab === 'overview' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: lang === 'ar' ? 'إجمالي الطلاب' : 'Total Students', val: data.stats.totalUsers, icon: Users, color: 'text-[#00878F]' },
              { label: lang === 'ar' ? 'مجموع النقاط XP' : 'Total XP', val: data.stats.totalXpAwarded, icon: Trophy, color: 'text-amber-500' },
              { label: lang === 'ar' ? 'دروس مكتملة' : 'Lessons Done', val: data.stats.totalLessonsCompleted, icon: BookOpen, color: 'text-emerald-500' },
              { label: lang === 'ar' ? 'تحديات محلولة' : 'Challenges', val: data.stats.totalChallengesSolved, icon: Award, color: 'text-indigo-500' },
              { label: lang === 'ar' ? 'شهادات صادرة' : 'Certificates', val: data.stats.totalCertificates, icon: GraduationCap, color: 'text-sky-500' },
              { label: lang === 'ar' ? 'دروس إضافية' : 'Custom Lessons', val: data.stats.totalCustomLessons, icon: Plus, color: 'text-rose-500' },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{kpi.label}</span>
                    <Icon className={cn('w-4 h-4', kpi.color)} />
                  </div>
                  <div className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
                    {kpi.val}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Settings Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#00878F]" />
                <span>{lang === 'ar' ? 'الحالة الحية للمنصة' : 'Live Platform Configuration'}</span>
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'مضاعف النقاط XP' : 'XP Multiplier'}</span>
                  <span className="font-mono font-bold text-[#00878F]">×{data.settings.xpMultiplier}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'نسبة فتح الشهادة' : 'Certificate Threshold'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{data.settings.certThreshold}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'الإعلان العام للطلاب' : 'Global Announcement'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {data.settings.announcementActive
                      ? lang === 'ar'
                        ? 'مفعّل'
                        : 'Active'
                      : lang === 'ar'
                        ? 'مخفي'
                        : 'Hidden'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">{lang === 'ar' ? 'الجهة المانحة للشهادة' : 'Certificate Issuer'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{data.settings.certIssuerName}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTab('settings')}>
                {lang === 'ar' ? 'تعديل الإعدادات' : 'Edit Settings'}
              </Button>
            </div>

            {/* Quick Top Students */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>{lang === 'ar' ? 'أوائل الطلاب حالياً' : 'Current Top Performers'}</span>
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {data.users.slice(0, 5).map((u, idx) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold text-slate-400 w-5">#{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">{u.displayName}</div>
                        <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-[#00878F] shrink-0">{u.xp} XP</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: STUDENTS, XP, BADGES & ROLES ==================== */}
      {tab === 'users' && data && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث بالاسم أو البريد...' : 'Search by name or email...'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 ps-9 pe-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>
            <div className="text-xs font-mono text-slate-500">
              {filteredUsers.length} {lang === 'ar' ? 'مستخدم' : 'users'}
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredUsers.map((u) => {
              const expanded = expandedUserId === u.id;
              const xpVal = xpDrafts[u.id] ?? String(u.xp);
              return (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] flex items-center justify-center font-bold text-sm shrink-0">
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {u.displayName}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded',
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                            )}
                          >
                            {u.role}
                          </span>
                          {u.certificate && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {u.certificate.certificateCode}
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
                              <ShieldAlert className="w-3 h-3" />
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {u.email} · {u.lessonsCompleted} lessons · {u.badges.length} badges
                        </div>
                      </div>
                    </div>

                    {/* Direct XP + Role + Actions Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={xpVal}
                          onChange={(e) =>
                            setXpDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          className="w-20 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs font-mono text-slate-900 dark:text-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateUser(u.id, { xp: Number(xpVal) || 0 })}
                        >
                          <Save className="w-3 h-3" />
                          <span>XP</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateUser(u.id, { xp: u.xp + 100 })}
                        >
                          +100
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleUpdateUser(u.id, {
                            role: u.role === 'admin' ? 'student' : 'admin',
                          })
                        }
                      >
                        <Shield className="w-3 h-3" />
                        <span>{u.role === 'admin' ? 'Demote' : 'Make Admin'}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant={expanded ? 'default' : 'outline'}
                        onClick={() => setExpandedUserId(expanded ? null : u.id)}
                      >
                        <Award className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'الشارات والشهادة' : 'Badges & Cert'}</span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        title="Delete user"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Badges & Certificate Control Drawer */}
                  {expanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ar'
                            ? 'انقر على أي شارة لمنحها أو سحبها من الطالب:'
                            : 'Click any badge to grant or revoke:'}
                        </span>
                        <Button
                          size="sm"
                          variant={u.certificate ? 'outline' : 'default'}
                          onClick={() =>
                            handleToggleCertificate(
                              u.id,
                              Boolean(u.certificate),
                              u.displayName,
                            )
                          }
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>
                            {u.certificate
                              ? lang === 'ar'
                                ? 'سحب الشهادة'
                                : 'Revoke Certificate'
                              : lang === 'ar'
                                ? 'منح شهادة التخرج فوراً'
                                : 'Issue Graduation Certificate'}
                          </span>
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {ALL_BADGE_IDS.map((bid) => {
                          const has = u.badges.includes(bid);
                          return (
                            <button
                              key={bid}
                              type="button"
                              onClick={() => handleToggleBadge(u.id, bid, has)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                                has
                                  ? 'bg-[#00878F] text-white border-[#00878F]'
                                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#00878F]',
                              )}
                            >
                              {has ? '✓ ' : '+ '}
                              {tLoc(translations.badges[bid].name, lang)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ROADMAP & CUSTOM LESSONS MANAGER ==================== */}
      {tab === 'roadmap' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create New Lesson Form */}
          <form
            onSubmit={handleCreateLesson}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4"
          >
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00878F]" />
              <span>
                {lang === 'ar'
                  ? 'إضافة درس جديد لخارطة الطريق'
                  : 'Add New Roadmap Lesson'}
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'المحطة (1 إلى 5)' : 'Target Station'}
                </label>
                <select
                  value={newLesson.stationId}
                  onChange={(e) =>
                    setNewLesson((p) => ({ ...p, stationId: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {TRACK_META.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tLoc(tr.title, lang)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'نقاط المكافأة XP' : 'XP Reward'}
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={newLesson.xp}
                  onChange={(e) =>
                    setNewLesson((p) => ({ ...p, xp: Number(e.target.value) || 75 }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'عنوان الدرس (بالعربية) *' : 'Lesson Title (Arabic) *'}
              </label>
              <input
                type="text"
                required
                value={newLesson.titleAr}
                onChange={(e) => setNewLesson((p) => ({ ...p, titleAr: e.target.value }))}
                placeholder="مثال: التحكم في شاشة LCD أو مصفوفة LED"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'عنوان الدرس (بالإنجليزية)' : 'Lesson Title (English)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={newLesson.titleEn}
                onChange={(e) => setNewLesson((p) => ({ ...p, titleEn: e.target.value }))}
                placeholder="e.g., Blinking SOS Morse Code Signal"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'ملخص وشرح نظري' : 'Summary & Theory'}
              </label>
              <textarea
                rows={3}
                value={newLesson.theoryAr}
                onChange={(e) =>
                  setNewLesson((p) => ({
                    ...p,
                    summaryAr: e.target.value.slice(0, 140),
                    theoryAr: e.target.value,
                  }))
                }
                placeholder="اشرح فكرة الدرس والهدف التعليمي منه..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'كود الأردوينو المبدئي (C++)' : 'Starter Arduino C++ Sketch'}
              </label>
              <textarea
                rows={5}
                dir="ltr"
                required
                value={newLesson.code}
                onChange={(e) => setNewLesson((p) => ({ ...p, code: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-[#0b1120] text-teal-200 font-mono px-3 py-2 text-xs"
              />
            </div>

            <Button type="submit" className="w-full">
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'نشر الدرس على خارطة الطريق' : 'Publish to Roadmap'}</span>
            </Button>
          </form>

          {/* Existing Built-in Stations + Admin Custom Lessons */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {lang === 'ar'
                  ? `الدروس الإضافية المُنشأة من الإدارة (${data.customLessons.length})`
                  : `Admin Custom Lessons (${data.customLessons.length})`}
              </h3>
              {data.customLessons.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  {lang === 'ar'
                    ? 'لم يتم إنشاء دروس مخصصة بعد. أضف درساً من النموذج ليظهر فوراً للطلاب.'
                    : 'No custom lessons created yet. Add one from the form to publish it live.'}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.customLessons.map((cl) => (
                    <div
                      key={cl.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {cl.titleAr}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Station {cl.stationId} · +{cl.xp} XP ·{' '}
                          {cl.published ? 'Published' : 'Draft'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleLessonPublished(cl)}
                        >
                          {cl.published ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>{cl.published ? 'Hide' : 'Publish'}</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(cl.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {lang === 'ar'
                  ? `محطات المنهج الأساسي (${LESSONS.length} درساً)`
                  : `Core Curriculum Stations (${LESSONS.length} lessons)`}
              </h3>
              <div className="space-y-2 text-xs">
                {TRACK_META.map((tr) => {
                  const count = LESSONS.filter((l) => l.track === tr.id).length;
                  return (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">
                        {tLoc(tr.title, lang)}
                      </span>
                      <span className="font-mono text-[#00878F] dark:text-[#22c6cf] font-semibold">
                        {count} lessons · +{tr.bonusXp} XP badge
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: CERTIFICATES MANAGEMENT ==================== */}
      {tab === 'certs' && data && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#00878F]" />
              <span>
                {lang === 'ar'
                  ? `الشهادات المعتمدة الصادرة (${data.certificates.length})`
                  : `Issued Graduation Certificates (${data.certificates.length})`}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'رمز التحقق' : 'Verify Code'}</th>
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'اسم الخريج' : 'Recipient'}</th>
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الجهة المانحة' : 'Issued By'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'نسبة الإتمام' : 'Completion'}</th>
                  <th className="py-3 px-4 text-end">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.certificates.map((cert) => (
                  <tr key={cert.certificateCode}>
                    <td className="py-3 px-4 font-mono font-bold text-[#00878F]">
                      {cert.certificateCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {cert.recipientName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{cert.issuedBy}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {cert.completionPercent}%
                    </td>
                    <td className="py-3 px-4 text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleToggleCertificate(cert.userId, true, cert.recipientName)
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'سحب' : 'Revoke'}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: GLOBAL PLATFORM SETTINGS ==================== */}
      {tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5"
        >
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.admin.tabSettings, lang)}</span>
          </h2>

          {/* Global Announcement */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={settingsDraft.announcementActive}
                onChange={(e) =>
                  setSettingsDraft((p) => ({
                    ...p,
                    announcementActive: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-[#00878F]"
              />
              <span>
                {lang === 'ar'
                  ? 'تفعيل شريط الإعلان العام أعلى المنصة للطلاب'
                  : 'Enable Global Student Announcement Banner'}
              </span>
            </label>

            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                value={settingsDraft.announcementAr}
                onChange={(e) =>
                  setSettingsDraft((p) => ({ ...p, announcementAr: e.target.value }))
                }
                placeholder="نص الإعلان بالعربية..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                dir="ltr"
                value={settingsDraft.announcementEn}
                onChange={(e) =>
                  setSettingsDraft((p) => ({ ...p, announcementEn: e.target.value }))
                }
                placeholder="Announcement text in English..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* XP Multiplier & Certificate Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'مضاعف النقاط (XP Multiplier)' : 'XP Event Multiplier'}
              </label>
              <select
                value={settingsDraft.xpMultiplier}
                onChange={(e) =>
                  setSettingsDraft((p) => ({
                    ...p,
                    xpMultiplier: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              >
                <option value={1}>1x (Normal)</option>
                <option value={1.5}>1.5x (Bonus Event)</option>
                <option value={2}>2x (Double XP)</option>
                <option value={3}>3x (Super Sprint)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar'
                  ? 'نسبة إتمام المسار المطلوبة للشهادة (%)'
                  : 'Certificate Unlock Threshold (%)'}
              </label>
              <input
                type="number"
                min={20}
                max={100}
                value={settingsDraft.certThreshold}
                onChange={(e) =>
                  setSettingsDraft((p) => ({
                    ...p,
                    certThreshold: Number(e.target.value) || 100,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Certificate Branding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'اسم الأكاديمية على الشهادة' : 'Certificate Academy Name'}
              </label>
              <input
                type="text"
                value={settingsDraft.certIssuerName}
                onChange={(e) =>
                  setSettingsDraft((p) => ({ ...p, certIssuerName: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'توقيع مدير الأكاديمية على الشهادة' : 'Certificate Director Signature'}
              </label>
              <input
                type="text"
                value={settingsDraft.certDirectorName}
                onChange={(e) =>
                  setSettingsDraft((p) => ({ ...p, certDirectorName: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Optional Change Admin Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'ar'
                ? 'تغيير كلمة مرور الإدارة (اتركه فارغاً للإبقاء على الحالية)'
                : 'Change Admin Password (leave blank to keep current)'}
            </label>
            <input
              type="password"
              dir="ltr"
              minLength={6}
              value={settingsDraft.newAdminPassword}
              onChange={(e) =>
                setSettingsDraft((p) => ({ ...p, newAdminPassword: e.target.value }))
              }
              placeholder="New password (min 6 chars)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <Button type="submit">
            <Save className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حفظ جميع الإعدادات' : 'Save Platform Settings'}</span>
          </Button>
        </form>
      )}
    </section>
  );
}
