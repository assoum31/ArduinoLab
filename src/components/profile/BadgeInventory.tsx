import { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Bug,
  Cable,
  CheckCircle2,
  Cloud,
  Cog,
  Cpu,
  GraduationCap,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { STATION_REQUIREMENTS } from '../../data/lessons';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

type BadgeId = keyof typeof translations.badges;
type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
type BadgeCategory = 'station' | 'mastery';

export interface BadgeInventoryItem {
  id: BadgeId;
  icon: LucideIcon;
  category: BadgeCategory;
  tier: BadgeTier;
  xpBonus: number;
  accentHex: string;
  iconColorClass: string;
  milestoneDetail: { ar: string; en: string; fr: string };
  requirementHint: { ar: string; en: string; fr: string };
}

export const BADGE_INVENTORY_ITEMS: readonly BadgeInventoryItem[] = [
  {
    id: 'station_1_digital',
    icon: Zap,
    category: 'station',
    tier: 'silver',
    xpBonus: 100,
    accentHex: '#00878F',
    iconColorClass: 'text-[#00878F] dark:text-[#22c6cf]',
    milestoneDetail: {
      ar: 'أثبتّ فهمك لقانون أوم، المقاومات الحامية، وإشارات الإدخال والإخراج الرقمية (HIGH/LOW) عبر أردوينو Uno.',
      en: 'Proven mastery of Ohm’s Law, current-limiting resistors, breadboard routing, and digital HIGH/LOW I/O control on Arduino Uno.',
      fr: 'Maîtrise confirmée de la loi d’Ohm, des résistances de protection et des entrées/sorties numériques HIGH/LOW.',
    },
    requirementHint: {
      ar: 'أكمل جميع دروس المحطة 1 في خارطة الطريق',
      en: 'Complete all Station 1 lessons on the Roadmap',
      fr: 'Terminez toutes les leçons de l’Étape 1',
    },
  },
  {
    id: 'station_2_analog',
    icon: Activity,
    category: 'station',
    tier: 'silver',
    xpBonus: 100,
    accentHex: '#F59E0B',
    iconColorClass: 'text-amber-500 dark:text-amber-400',
    milestoneDetail: {
      ar: 'أتقنت قراءة الإشارات التماثلية بدقة 10-bit ADC وتوليد موجات PWM للتحكم المتدرج في شدة الإضاءة والطاقة.',
      en: 'Mastered 10-bit ADC analog sampling (0–1023), voltage dividers, and PWM duty-cycle modulation for smooth power control.',
      fr: 'Maîtrise de l’échantillonnage analogique 10-bit (0–1023) et de la modulation PWM.',
    },
    requirementHint: {
      ar: 'أكمل جميع دروس المحطة 2 في خارطة الطريق',
      en: 'Complete all Station 2 lessons on the Roadmap',
      fr: 'Terminez toutes les leçons de l’Étape 2',
    },
  },
  {
    id: 'station_3_actuators',
    icon: Cog,
    category: 'station',
    tier: 'gold',
    xpBonus: 100,
    accentHex: '#6366F1',
    iconColorClass: 'text-indigo-500 dark:text-indigo-400',
    milestoneDetail: {
      ar: 'تحكمت في المحركات الزاوية SG90 Servo وأنظمة التنبيه الصوتي Piezo بتوقيتات دقيقة وتفاعلية.',
      en: 'Commanded precision SG90 servo angular positioning and multi-frequency Piezo audio synthesis in real time.',
      fr: 'Pilotage précis des servomoteurs SG90 et synthèse sonore Piezo multi-fréquences.',
    },
    requirementHint: {
      ar: 'أكمل جميع دروس المحطة 3 في خارطة الطريق',
      en: 'Complete all Station 3 lessons on the Roadmap',
      fr: 'Terminez toutes les leçons de l’Étape 3',
    },
  },
  {
    id: 'station_4_sensors',
    icon: Radar,
    category: 'station',
    tier: 'gold',
    xpBonus: 100,
    accentHex: '#0EA5E9',
    iconColorClass: 'text-sky-500 dark:text-sky-400',
    milestoneDetail: {
      ar: 'بنيت دوائر استشعار ذكية تقيس المسافة بالموجات فوق الصوتية HC-SR04 والحرارة TMP36 مع بث مباشر عبر Serial.',
      en: 'Engineered smart sensing pipelines combining HC-SR04 ultrasonic time-of-flight, TMP36 thermal conversion, and Serial telemetry.',
      fr: 'Conception de chaînes de capteurs HC-SR04 ultrason, TMP36 thermique et télémétrie série.',
    },
    requirementHint: {
      ar: 'أكمل جميع دروس المحطة 4 في خارطة الطريق',
      en: 'Complete all Station 4 lessons on the Roadmap',
      fr: 'Terminez toutes les leçons de l’Étape 4',
    },
  },
  {
    id: 'station_5_capstone',
    icon: GraduationCap,
    category: 'station',
    tier: 'platinum',
    xpBonus: 150,
    accentHex: '#10B981',
    iconColorClass: 'text-emerald-500 dark:text-emerald-400',
    milestoneDetail: {
      ar: 'دمجت الحساسات والمشغلات معاً في مشاريع تخرج متكاملة وأكملت مسار هندسة الأردوينو حتى الشهادة المعتمدة.',
      en: 'Integrated multi-sensor hardware and closed-loop firmware into complete Capstone systems, unlocking official graduation credentials.',
      fr: 'Intégration complète capteurs + actionneurs en projets de fin de parcours certifiés.',
    },
    requirementHint: {
      ar: 'أكمل جميع دروس مشاريع التخرج في المحطة 5',
      en: 'Complete all Station 5 Capstone lessons',
      fr: 'Terminez tous les projets finaux de l’Étape 5',
    },
  },
  {
    id: 'first_blink',
    icon: Sparkles,
    category: 'mastery',
    tier: 'bronze',
    xpBonus: 25,
    accentHex: '#F59E0B',
    iconColorClass: 'text-amber-500 dark:text-amber-400',
    milestoneDetail: {
      ar: 'انطلاقتك الرسمية في عالم الإلكترونيات المدمجة بتشغيل أول محاكاة حية أو إتمام أول درس عملي.',
      en: 'Marked your official launch into embedded electronics by running your first live Arduino simulation or completing Lesson 1.',
      fr: 'Votre premier pas officiel en électronique embarquée via votre première simulation ou leçon.',
    },
    requirementHint: {
      ar: 'شغّل أول محاكاة أو أكمل أي درس',
      en: 'Run your first simulation or complete any lesson',
      fr: 'Lancez une simulation ou terminez une leçon',
    },
  },
  {
    id: 'wire_master',
    icon: Cable,
    category: 'mastery',
    tier: 'silver',
    xpBonus: 50,
    accentHex: '#14B8A6',
    iconColorClass: 'text-teal-500 dark:text-teal-400',
    milestoneDetail: {
      ar: 'أثبتّ دقة عالية في تتبع المسارات الكهربائية وتوصيل الدوائر بشكل آمن وخالٍ من القصر الكهربائي.',
      en: 'Demonstrated clean schematic tracing and safe, short-free breadboard wiring in an automated hardware challenge.',
      fr: 'Câblage propre et sécurisé démontré lors d’un défi matériel automatisé.',
    },
    requirementHint: {
      ar: 'اجتز أي تحدي توصيل في ساحة التحديات',
      en: 'Pass any Wiring Challenge in the Challenge Arena',
      fr: 'Réussissez un défi de câblage dans l’Arène',
    },
  },
  {
    id: 'bug_hunter',
    icon: Bug,
    category: 'mastery',
    tier: 'silver',
    xpBonus: 50,
    accentHex: '#F43F5E',
    iconColorClass: 'text-rose-500 dark:text-rose-400',
    milestoneDetail: {
      ar: 'شخّصت أخطاءً منطقية وبرمجية في كود Arduino C++ وأعدت الدائرة للعمل وفق المواصفات المطلوبة.',
      en: 'Diagnosed faulty pin configurations and logic bugs in Arduino C++ firmware to restore verified circuit behavior.',
      fr: 'Diagnostic et correction de bugs Arduino C++ vérifiés par les tests automatisés.',
    },
    requirementHint: {
      ar: 'اجتز أي تحدي صيد الأخطاء في ساحة التحديات',
      en: 'Solve any Debug Challenge in the Challenge Arena',
      fr: 'Résolvez un défi de débogage dans l’Arène',
    },
  },
  {
    id: 'code_architect',
    icon: Cpu,
    category: 'mastery',
    tier: 'gold',
    xpBonus: 60,
    accentHex: '#818CF8',
    iconColorClass: 'text-indigo-500 dark:text-indigo-400',
    milestoneDetail: {
      ar: 'كتبت كود تحكم مدمجاً نظيفاً يجتاز اختبارات التحقق الآلي للمنافذ والحلقات والتوقيت.',
      en: 'Authored clean embedded C++ logic passing automated pin-state, timing, and firmware architecture verification.',
      fr: 'Écriture d’un firmware C++ propre validé par la suite de tests automatisés.',
    },
    requirementHint: {
      ar: 'اجتز أي تحدي إكمال الكود في ساحة التحديات',
      en: 'Pass any Code Completion Challenge in the Challenge Arena',
      fr: 'Validez un défi de complétion de code',
    },
  },
  {
    id: 'sensor_wizard',
    icon: Award,
    category: 'mastery',
    tier: 'gold',
    xpBonus: 60,
    accentHex: '#38BDF8',
    iconColorClass: 'text-sky-500 dark:text-sky-400',
    milestoneDetail: {
      ar: 'أتقنت معايرة الحساسات البيئية وتحويل القراءات الخام إلى قياسات هندسية دقيقة بالـ cm أو °C.',
      en: 'Calibrated environmental sensors and converted raw electrical signals into accurate engineering units (cm / °C).',
      fr: 'Calibration de capteurs environnementaux et conversion en unités physiques (cm / °C).',
    },
    requirementHint: {
      ar: 'أكمل درس السونار أو الحرارة أو الطقس الذكي',
      en: 'Complete an ultrasonic, temperature, or weather station lesson',
      fr: 'Terminez une leçon ultrason, température ou météo',
    },
  },
  {
    id: 'cloud_maker',
    icon: Cloud,
    category: 'mastery',
    tier: 'bronze',
    xpBonus: 25,
    accentHex: '#10B981',
    iconColorClass: 'text-emerald-500 dark:text-emerald-400',
    milestoneDetail: {
      ar: 'وثّقت إبداعك الهندسي وحفظت أول مشروع دائرة مخصص في مكتبتك لإعادة فتحه ومشاركته لاحقاً.',
      en: 'Archived your own custom breadboard design and Arduino sketch to your circuit library for rapid iteration.',
      fr: 'Sauvegarde de votre premier circuit personnalisé dans votre bibliothèque.',
    },
    requirementHint: {
      ar: 'احفظ أي دائرة من المختبر باستخدام زر "حفظ المشروع"',
      en: 'Save any circuit from the Simulator Lab',
      fr: 'Sauvegardez un circuit depuis le simulateur',
    },
  },
];

const TIER_STYLES: Record<
  BadgeTier,
  {
    label: { ar: string; en: string; fr: string };
    badgeClass: string;
    ringClass: string;
  }
> = {
  bronze: {
    label: { ar: 'برونزية', en: 'Bronze', fr: 'Bronze' },
    badgeClass:
      'bg-amber-700/15 text-amber-700 dark:text-amber-300 border-amber-600/30',
    ringClass: 'ring-amber-500/35',
  },
  silver: {
    label: { ar: 'فضية', en: 'Silver', fr: 'Argent' },
    badgeClass:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/40',
    ringClass: 'ring-teal-500/35',
  },
  gold: {
    label: { ar: 'ذهبية', en: 'Gold', fr: 'Or' },
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    ringClass: 'ring-amber-400/45',
  },
  platinum: {
    label: { ar: 'بلاتينية', en: 'Platinum', fr: 'Platine' },
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    ringClass: 'ring-emerald-400/45',
  },
};

interface BadgeInventoryProps {
  lang: Language;
  earnedBadgeIds: string[];
  completedLessons: string[];
}

export function BadgeInventory({
  lang,
  earnedBadgeIds,
  completedLessons,
}: BadgeInventoryProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [pinnedId, setPinnedId] = useState<BadgeId | null>(null);
  const [hoveredId, setHoveredId] = useState<BadgeId | null>(null);

  const earnedSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

  const unlockedCount = useMemo(
    () => BADGE_INVENTORY_ITEMS.filter((b) => earnedSet.has(b.id)).length,
    [earnedSet],
  );
  const lockedCount = BADGE_INVENTORY_ITEMS.length - unlockedCount;
  const collectionPct = Math.round(
    (unlockedCount / BADGE_INVENTORY_ITEMS.length) * 100,
  );

  // Sort unlocked badges first in "All" view so achievements shine at the top
  const visibleBadges = useMemo(() => {
    const filtered = BADGE_INVENTORY_ITEMS.filter((item) => {
      const earned = earnedSet.has(item.id);
      if (filter === 'unlocked') return earned;
      if (filter === 'locked') return !earned;
      return true;
    });
    if (filter === 'all') {
      return [...filtered].sort(
        (a, b) => Number(earnedSet.has(b.id)) - Number(earnedSet.has(a.id)),
      );
    }
    return filtered;
  }, [earnedSet, filter]);

  const defaultInspectorId: BadgeId = useMemo(() => {
    const firstEarned = BADGE_INVENTORY_ITEMS.find((b) => earnedSet.has(b.id));
    return firstEarned?.id ?? BADGE_INVENTORY_ITEMS[0].id;
  }, [earnedSet]);

  const inspectedId = hoveredId ?? pinnedId ?? defaultInspectorId;
  const inspectedItem =
    BADGE_INVENTORY_ITEMS.find((b) => b.id === inspectedId) ||
    BADGE_INVENTORY_ITEMS[0];
  const inspectedEarned = earnedSet.has(inspectedItem.id);
  const inspectedMeta = translations.badges[inspectedItem.id];
  const inspectedTier = TIER_STYLES[inspectedItem.tier];
  const InspectedIcon = inspectedItem.icon;

  // Compute station lesson progress for station badges
  const getStationProgress = (badgeId: BadgeId) => {
    const req = STATION_REQUIREMENTS.find((s) => s.badgeId === badgeId);
    if (!req) return null;
    const done = req.lessonIds.filter((lid) =>
      completedLessons.includes(lid),
    ).length;
    return { done, total: req.lessonIds.length };
  };

  const inspectedProgress = getStationProgress(inspectedItem.id);

  return (
    <div className="space-y-3.5">
      {/* Header + Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#00878F]" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {tLoc(translations.profile.badges, lang)}
          </h4>
          <span className="font-mono tabular-nums text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#00878F]/10 text-[#00878F] dark:text-[#22c6cf]">
            {unlockedCount}/{BADGE_INVENTORY_ITEMS.length}
          </span>
        </div>

        {/* Segmented Filter */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
          {([
            { id: 'all', label: tLoc(translations.profile.badgeFilterAll, lang), count: BADGE_INVENTORY_ITEMS.length },
            { id: 'unlocked', label: tLoc(translations.profile.badgeFilterUnlocked, lang), count: unlockedCount },
            { id: 'locked', label: tLoc(translations.profile.badgeFilterLocked, lang), count: lockedCount },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setFilter(tab.id);
              }}
              className={cn(
                'px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap',
                filter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Collection Mastery Bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00878F] via-teal-400 to-amber-400 transition-all duration-500"
            style={{ width: `${collectionPct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {tLoc(translations.profile.badgeHoverHint, lang)}
        </p>
      </div>

      {/* Interactive Badge Grid with Tactile Hover Lift & Glow */}
      {visibleBadges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 px-4 py-6 text-center space-y-2">
          <Award className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {tLoc(translations.profile.badgeEmptyUnlocked, lang)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {visibleBadges.map((item) => {
            const earned = earnedSet.has(item.id);
            const Icon = item.icon;
            const meta = translations.badges[item.id];
            const tierMeta = TIER_STYLES[item.tier];
            const isSelected = inspectedItem.id === item.id;
            const stationProg = getStationProgress(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => {
                  soundEngine.playSelect();
                  setPinnedId(item.id);
                }}
                aria-pressed={pinnedId === item.id}
                className={cn(
                  'group relative text-start rounded-xl border p-3 transition-all duration-200 cursor-pointer focus:outline-none',
                  earned
                    ? 'border-[#00878F]/35 bg-gradient-to-br from-white via-slate-50/90 to-[#00878F]/10 dark:from-slate-900 dark:via-slate-900 dark:to-[#00878F]/15 hover:-translate-y-1 hover:shadow-lg hover:border-[#00878F]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-65 hover:opacity-95 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700',
                  isSelected &&
                    (earned
                      ? cn('ring-2 shadow-md', tierMeta.ringClass)
                      : 'ring-1 ring-slate-400/50 dark:ring-slate-600'),
                )}
              >
                {/* Top Status Row: Medallion Emblem + Earned/Locked Marker */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 shrink-0',
                      earned
                        ? 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-200/70 dark:bg-slate-800/80 border-slate-300/60 dark:border-slate-700/60',
                    )}
                    style={
                      earned
                        ? {
                            boxShadow: `0 4px 14px -4px ${item.accentHex}55`,
                          }
                        : undefined
                    }
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        earned ? item.iconColorClass : 'text-slate-400 dark:text-slate-500',
                      )}
                    />
                  </div>

                  {earned ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>+{item.xpBonus}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {stationProg && (
                        <span>
                          {stationProg.done}/{stationProg.total}
                        </span>
                      )}
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Badge Name & Concise Summary */}
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {tLoc(meta.name, lang)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {tLoc(meta.desc, lang)}
                </div>

                {/* Subtle bottom tier accent bar revealed on hover */}
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-3 bottom-0 h-0.5 rounded-full transition-opacity duration-200',
                    earned
                      ? 'opacity-45 group-hover:opacity-100'
                      : 'opacity-0 group-hover:opacity-35',
                  )}
                  style={{ backgroundColor: item.accentHex }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Detailed Milestone Spotlight Inspector Panel */}
      <div
        className={cn(
          'rounded-xl border p-4 transition-colors duration-200',
          inspectedEarned
            ? 'border-[#00878F]/40 bg-gradient-to-br from-[#00878F]/8 via-white to-amber-500/8 dark:from-[#00878F]/15 dark:via-slate-900 dark:to-amber-500/10'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70',
        )}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center border shrink-0',
              inspectedEarned
                ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 shadow-sm'
                : 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
            )}
            style={
              inspectedEarned
                ? { boxShadow: `0 6px 18px -4px ${inspectedItem.accentHex}66` }
                : undefined
            }
          >
            <InspectedIcon
              className={cn(
                'w-6 h-6',
                inspectedEarned ? inspectedItem.iconColorClass : 'text-slate-400',
              )}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {tLoc(inspectedMeta.name, lang)}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold uppercase',
                  inspectedTier.badgeClass,
                )}
              >
                {tLoc(inspectedTier.label, lang)}
              </span>
              <span className="font-mono text-[10px] font-bold text-[#00878F] dark:text-[#22c6cf]">
                +{inspectedItem.xpBonus} XP
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {tLoc(inspectedItem.milestoneDetail, lang)}
            </p>

            {/* Status Footer */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              {inspectedEarned ? (
                <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{tLoc(translations.profile.badgeUnlockedLabel, lang)}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{tLoc(inspectedItem.requirementHint, lang)}</span>
                </div>
              )}

              {inspectedProgress && !inspectedEarned && (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#00878F] transition-all"
                      style={{
                        width: `${Math.round(
                          (inspectedProgress.done / Math.max(1, inspectedProgress.total)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {inspectedProgress.done}/{inspectedProgress.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
