import { useMemo, useState } from 'react';
import {
  Clock,
  Cpu,
  FolderOpen,
  Layers,
  Play,
  Search,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ALL_READY_PROJECTS,
  type ProjectCategory,
  type ReadyProject,
} from '../../data/showcaseProjects';
import {
  STARTER_TEMPLATES,
  type StarterTemplate,
} from '../../data/starterTemplates';
import { PALETTE_COMPONENTS } from '../simulator/BreadboardCanvas';
import { tLoc, translations } from '../../i18n/translations';
import { Button } from '../ui/button';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

type FilterTab = 'all' | 'templates' | ProjectCategory | 'saved';

export function ProjectsGallery() {
  const { lang, savedProjects, deleteCircuitProject, loadIntoSimulator } = useApp();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');

  const normalizedQ = query.trim().toLowerCase();

  const filteredTemplates = useMemo(() => {
    if (filter !== 'all' && filter !== 'templates') return [];
    return STARTER_TEMPLATES.filter((tpl) => {
      if (!normalizedQ) return true;
      const hay = [
        tpl.title.ar,
        tpl.title.en,
        tpl.title.fr,
        tpl.description.ar,
        tpl.description.en,
        tpl.description.fr,
        tpl.concept.ar,
        tpl.concept.en,
        tpl.concept.fr,
        ...tpl.pinsUsed,
        ...tpl.circuit.components.map((c) => c.kind),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(normalizedQ);
    });
  }, [filter, normalizedQ]);

  const filteredBuiltIn = useMemo(() => {
    if (filter === 'saved' || filter === 'templates') return [];
    return ALL_READY_PROJECTS.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (!normalizedQ) return true;
      const hay = [
        p.title.ar,
        p.title.en,
        p.title.fr,
        p.description.ar,
        p.description.en,
        p.description.fr,
        ...p.pinsUsed,
        ...p.circuit.components.map((c) => c.kind),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(normalizedQ);
    });
  }, [filter, normalizedQ]);

  const filteredSaved = useMemo(() => {
    if (filter !== 'all' && filter !== 'saved') return [];
    return savedProjects.filter((p) => {
      if (!normalizedQ) return true;
      return `${p.title} ${p.description}`.toLowerCase().includes(normalizedQ);
    });
  }, [filter, savedProjects, normalizedQ]);

  const launchTemplate = (tpl: StarterTemplate, autoRun: boolean) => {
    loadIntoSimulator({
      title: tLoc(tpl.title, lang),
      code: tpl.code,
      blocks: tpl.blocks,
      circuit: tpl.circuit,
      autoRun,
    });
  };

  const launchBuiltIn = (proj: ReadyProject, autoRun: boolean) => {
    loadIntoSimulator({
      title: tLoc(proj.title, lang),
      code: proj.code,
      blocks: proj.blocks,
      circuit: proj.circuit,
      autoRun,
    });
  };

  const launchSaved = (
    proj: (typeof savedProjects)[number],
    autoRun: boolean,
  ) => {
    try {
      const blocks = JSON.parse(proj.blocksJson || '[]');
      const circuit = JSON.parse(
        proj.circuitJson || '{"components":[],"wires":[]}',
      );
      loadIntoSimulator({
        title: proj.title,
        code: proj.code,
        blocks,
        circuit,
        autoRun,
      });
    } catch {
      soundEngine.playError();
    }
  };

  const tabs: Array<{ id: FilterTab; label: string }> = [
    {
      id: 'all',
      label: `${tLoc(translations.projects.catAll, lang)} (${ALL_READY_PROJECTS.length + STARTER_TEMPLATES.length + savedProjects.length})`,
    },
    {
      id: 'templates',
      label: `${tLoc(translations.projects.catTemplates, lang)} (${STARTER_TEMPLATES.length})`,
    },
    { id: 'track-1', label: lang === 'ar' ? 'رقمي' : lang === 'fr' ? 'Numérique' : 'Digital' },
    { id: 'track-2', label: lang === 'ar' ? 'تناظري و PWM' : lang === 'fr' ? 'Analogique' : 'Analog & PWM' },
    { id: 'track-3', label: lang === 'ar' ? 'مشغلات وصوت' : lang === 'fr' ? 'Actionneurs' : 'Actuators' },
    { id: 'track-4', label: lang === 'ar' ? 'حساسات ذكية' : lang === 'fr' ? 'Capteurs' : 'Sensors' },
    { id: 'track-5', label: lang === 'ar' ? 'مشاريع التخرج' : lang === 'fr' ? 'Projets Finaux' : 'Capstone' },
    { id: 'bonus', label: tLoc(translations.projects.catBonus, lang) },
    { id: 'saved', label: `${tLoc(translations.projects.catSaved, lang)} (${savedProjects.length})` },
  ];

  return (
    <section className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
            {tLoc(translations.projects.title, lang)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {tLoc(translations.projects.subtitle, lang)}
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tLoc(translations.projects.searchPlaceholder, lang)}
            className="w-full min-h-[44px] sm:min-h-0 rounded-xl sm:rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] ps-10 pe-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00878F]"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setFilter(tab.id);
            }}
            className={cn(
              'min-h-[40px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border',
              filter === tab.id
                ? 'bg-[#00878F] text-white border-[#00878F]'
                : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#00878F]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Starter Templates Spotlight Section */}
      {filteredTemplates.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[#00878F]/25 bg-[#00878F]/[0.04] dark:bg-[#00878F]/[0.07] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00878F] shrink-0" />
                <span>{tLoc(translations.projects.starterTemplatesTitle, lang)}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {tLoc(translations.projects.starterTemplatesSubtitle, lang)}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#00878F] dark:text-[#22c6cf] shrink-0">
              {filteredTemplates.length} {tLoc(translations.projects.catTemplates, lang)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => {
              const uniqueKinds = Array.from(
                new Set(tpl.circuit.components.map((c) => c.kind)),
              );
              const swatches = uniqueKinds
                .map((kind) => PALETTE_COMPONENTS.find((p) => p.kind === kind))
                .filter(Boolean);

              return (
                <article
                  key={tpl.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden flex flex-col justify-between hover:border-[#00878F]/60 transition-colors shadow-xs"
                >
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: tpl.accentColor }}
                  />
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#00878F] dark:text-[#22c6cf] truncate">
                          {tLoc(tpl.concept, lang)}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 text-slate-500 dark:text-slate-400 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-sans font-semibold text-[10px]">
                            {tpl.difficulty === 'beginner'
                              ? tLoc(translations.projects.beginnerBadge, lang)
                              : tLoc(translations.projects.easyBadge, lang)}
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3" />
                            {tpl.estMinutes}m
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {tLoc(tpl.title, lang)}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {tLoc(tpl.description, lang)}
                      </p>

                      {/* Component Swatch Strip & Pinout Summary */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {swatches.map((sw) =>
                            sw ? (
                              <span
                                key={sw.kind}
                                className="inline-flex items-center gap-1"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: sw.swatch }}
                                />
                                <span>{tLoc(sw.name, lang)}</span>
                              </span>
                            ) : null,
                          )}
                        </div>
                        <div
                          className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400"
                          dir="ltr"
                        >
                          <span className="inline-flex items-center gap-1 truncate">
                            <Cpu className="w-3 h-3 text-[#00878F] shrink-0" />
                            <span>{tpl.pinsUsed.join(' · ')}</span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {tpl.circuit.components.length} parts · {tpl.circuit.wires.length} wires
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => launchTemplate(tpl, false)}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{tLoc(translations.projects.useTemplate, lang)}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => launchTemplate(tpl, true)}
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-[#00878F]" />
                        <span>{tLoc(translations.projects.runDemo, lang)}</span>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved User Projects Section (shown when in 'all' with saved items or in 'saved' tab) */}
      {filteredSaved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#00878F]" />
            <span>{tLoc(translations.projects.catSaved, lang)}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSaved.map((proj) => (
              <div
                key={proj.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{tLoc(translations.projects.catSaved, lang)}</span>
                    <button
                      type="button"
                      aria-label="Delete project"
                      onClick={() => {
                        soundEngine.playSelect();
                        deleteCircuitProject(proj.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {proj.title}
                  </h3>
                  {proj.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => launchSaved(proj, true)}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{tLoc(translations.projects.openAndRun, lang)}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => launchSaved(proj, false)}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{tLoc(translations.projects.openInLab, lang)}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Ready-to-Experiment Projects Grid */}
      {filteredBuiltIn.length > 0 && (
        <div className="space-y-3">
          {filter === 'all' && (
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00878F]" />
              <span>
                {tLoc(translations.projects.allProjects, lang)} ({filteredBuiltIn.length})
              </span>
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBuiltIn.map((proj) => {
              const compNames = Array.from(
                new Set(proj.circuit.components.map((c) => c.label || c.kind)),
              ).slice(0, 4);

              return (
                <article
                  key={proj.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col justify-between gap-4 hover:border-[#00878F]/50 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#00878F] dark:text-[#22c6cf]">
                        {tLoc(proj.categoryLabel, lang)}
                      </span>
                      <span className="font-mono tabular-nums">
                        {proj.circuit.components.length} parts · {proj.circuit.wires.length} wires
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {tLoc(proj.title, lang)}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {tLoc(proj.description, lang)}
                    </p>

                    {/* Clean unboxed hardware metadata */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                      <div className="flex items-center gap-1.5 truncate">
                        <Cpu className="w-3.5 h-3.5 text-[#00878F] shrink-0" />
                        <span className="truncate">
                          Pins: {proj.pinsUsed.join(' · ')}
                        </span>
                      </div>
                      <div className="truncate text-slate-400 dark:text-slate-500">
                        {compNames.join(' · ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => launchBuiltIn(proj, true)}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{tLoc(translations.projects.openAndRun, lang)}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => launchBuiltIn(proj, false)}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{tLoc(translations.projects.openInLab, lang)}</span>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 &&
        filteredBuiltIn.length === 0 &&
        filteredSaved.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {filter === 'saved'
              ? tLoc(translations.profile.noSaved, lang)
              : tLoc(translations.projects.noResults, lang)}
          </div>
        )}
    </section>
  );
}
