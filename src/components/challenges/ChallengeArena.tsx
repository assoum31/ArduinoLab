import { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Bug,
  Cable,
  CheckCircle2,
  Code2,
  Lightbulb,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CHALLENGES } from '../../data/challenges';
import { tLoc, translations } from '../../i18n/translations';
import { analyzeCircuit } from '../../engine/arduinoSim';
import {
  arduinoCppToBlocks,
  blocksToArduinoCpp,
} from '../../engine/blocklyBridge';
import type {
  ChallengeCheckResult,
  ChallengeMode,
  CircuitState,
  CodeBlock,
} from '../../types/arduino';
import { BreadboardCanvas } from '../simulator/BreadboardCanvas';
import { CodeEditor } from '../simulator/CodeEditor';
import { BlocklyEditor } from '../simulator/BlocklyEditor';
import { Button } from '../ui/button';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

export function ChallengeArena() {
  const { lang, completedChallenges, completeItem } = useApp();
  const [mode, setMode] = useState<ChallengeMode>('wiring');

  const modeChallenges = useMemo(
    () => CHALLENGES.filter((c) => c.mode === mode),
    [mode],
  );
  const [selectedId, setSelectedId] = useState(CHALLENGES[0].id);

  const activeChallenge = useMemo(
    () =>
      modeChallenges.find((c) => c.id === selectedId) || modeChallenges[0],
    [modeChallenges, selectedId],
  );

  const [workCode, setWorkCode] = useState(activeChallenge.initialCode);
  const [workBlocks, setWorkBlocks] = useState<CodeBlock[]>(
    activeChallenge.initialBlocks,
  );
  const [workCircuit, setWorkCircuit] = useState<CircuitState>(
    activeChallenge.initialCircuit,
  );
  const [codeTab, setCodeTab] = useState<'code' | 'blocks'>('code');
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState<ChallengeCheckResult[] | null>(null);

  const selectChallenge = (id: string) => {
    const target = CHALLENGES.find((c) => c.id === id);
    if (!target) return;
    soundEngine.playSelect();
    setSelectedId(id);
    setWorkCode(target.initialCode);
    setWorkBlocks(target.initialBlocks);
    setWorkCircuit(target.initialCircuit);
    setShowHint(false);
    setResults(null);
  };

  const switchMode = (nextMode: ChallengeMode) => {
    soundEngine.playSelect();
    setMode(nextMode);
    const first = CHALLENGES.find((c) => c.mode === nextMode);
    if (first) {
      setSelectedId(first.id);
      setWorkCode(first.initialCode);
      setWorkBlocks(first.initialBlocks);
      setWorkCircuit(first.initialCircuit);
      setShowHint(false);
      setResults(null);
    }
  };

  const handleReset = () => {
    soundEngine.playSelect();
    setWorkCode(activeChallenge.initialCode);
    setWorkBlocks(activeChallenge.initialBlocks);
    setWorkCircuit(activeChallenge.initialCircuit);
    setResults(null);
  };

  const handleRunVerification = async () => {
    const checks = activeChallenge.evaluate(workCode, workCircuit);
    setResults(checks);
    const allPassed = checks.every((c) => c.passed);
    if (allPassed) {
      soundEngine.playSuccess();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.65 },
      });
      await completeItem('challenge', activeChallenge.id, activeChallenge.xp);
    } else {
      soundEngine.playError();
    }
  };

  const analysis = useMemo(
    () =>
      analyzeCircuit(workCircuit, {
        D13: 255,
        D12: 255,
        D11: 255,
        D9: 220,
        D8: 255,
      }),
    [workCircuit],
  );

  const isSolved = completedChallenges.includes(activeChallenge.id);
  const allPassedNow = results !== null && results.every((r) => r.passed);

  const modeTabs: Array<{
    id: ChallengeMode;
    icon: typeof Cable;
    label: string;
  }> = [
    { id: 'wiring', icon: Cable, label: tLoc(translations.challenges.modeWire, lang) },
    { id: 'debug', icon: Bug, label: tLoc(translations.challenges.modeDebug, lang) },
    { id: 'code', icon: Code2, label: tLoc(translations.challenges.modeCode, lang) },
  ];

  return (
    <section className="max-w-[1520px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3.5 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
            {tLoc(translations.challenges.title, lang)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {tLoc(translations.challenges.subtitle, lang)}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl sm:rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {modeTabs.map((mt) => {
            const Icon = mt.icon;
            return (
              <button
                key={mt.id}
                type="button"
                onClick={() => switchMode(mt.id)}
                className={cn(
                  'min-h-[40px] sm:min-h-0 flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  mode === mt.id
                    ? 'bg-[#00878F] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{mt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Challenge Selector Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
        {modeChallenges.map((ch) => {
          const solved = completedChallenges.includes(ch.id);
          const active = activeChallenge.id === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => selectChallenge(ch.id)}
              className={cn(
                'text-start rounded-2xl sm:rounded-xl border p-3.5 sm:p-4 transition-colors cursor-pointer min-h-[68px]',
                active
                  ? 'border-[#00878F] bg-[#00878F]/10 dark:bg-[#00878F]/15'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700',
              )}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-mono font-semibold text-[#00878F] dark:text-[#22c6cf]">
                  +{ch.xp} XP
                </span>
                {solved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tLoc(translations.challenges.solved, lang)}
                  </span>
                ) : (
                  <span className="capitalize">{ch.difficulty}</span>
                )}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {tLoc(ch.title, lang)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Challenge Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Left/Top Interactive Arena Stage (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          {mode === 'wiring' ? (
            <div className="h-[400px] sm:h-[520px]">
              <BreadboardCanvas
                lang={lang}
                circuit={workCircuit}
                onChangeCircuit={setWorkCircuit}
                viewMode="breadboard"
                running={true}
                ledD13On={true}
                pinValues={{ D13: 255, D11: 255, D9: 220, D8: 255 }}
                servoAngles={{ D9: 90 }}
                buzzerTone={null}
                componentPower={analysis.componentPower}
                diagnostics={analysis.diagnostics}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[520px] bg-white dark:bg-[#111827]">
              {mode === 'code' && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {tLoc(activeChallenge.title, lang)}
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setCodeTab('code')}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-semibold cursor-pointer',
                        codeTab === 'code'
                          ? 'bg-white dark:bg-slate-900 text-[#00878F]'
                          : 'text-slate-600 dark:text-slate-400',
                      )}
                    >
                      C++ Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkBlocks(arduinoCppToBlocks(workCode));
                        setCodeTab('blocks');
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-semibold cursor-pointer',
                        codeTab === 'blocks'
                          ? 'bg-white dark:bg-slate-900 text-[#00878F]'
                          : 'text-slate-600 dark:text-slate-400',
                      )}
                    >
                      Blocks
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                {mode === 'code' && codeTab === 'blocks' ? (
                  <BlocklyEditor
                    lang={lang}
                    blocks={workBlocks}
                    onChangeBlocks={(next) => {
                      setWorkBlocks(next);
                      setWorkCode(blocksToArduinoCpp(next));
                    }}
                  />
                ) : (
                  <CodeEditor
                    lang={lang}
                    code={workCode}
                    onChange={setWorkCode}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Mission Brief, Controls, Hint & Automated Test Runner (4 cols) */}
        <aside className="xl:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-mono font-bold text-[#00878F] dark:text-[#22c6cf]">
                  +{activeChallenge.xp} XP
                </span>
                {isSolved && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Trophy className="w-3.5 h-3.5" />
                    {tLoc(translations.challenges.solved, lang)}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tLoc(activeChallenge.title, lang)}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {tLoc(activeChallenge.description, lang)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button className="flex-1" onClick={handleRunVerification}>
                <Play className="w-4 h-4 fill-current" />
                <span>{tLoc(translations.challenges.verifyBtn, lang)}</span>
              </Button>
              <Button variant="outline" size="icon" onClick={handleReset} title={tLoc(translations.challenges.resetChallenge, lang)}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Toggleable Hint */}
            <div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSelect();
                  setShowHint((h) => !h);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{tLoc(translations.challenges.hint, lang)}</span>
              </button>
              {showHint && (
                <p className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {tLoc(activeChallenge.hint, lang)}
                </p>
              )}
            </div>

            {/* Automated Test Runner Results */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {tLoc(translations.challenges.testChecks, lang)}
              </h3>

              {results === null ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'اضغط "تحقق من الحل" لتشغيل الفحص الكهربائي والبرمجي الآلي.'
                    : lang === 'fr'
                      ? 'Cliquez sur "Vérifier la solution" pour lancer les tests automatisés.'
                      : 'Click "Run Verification" to execute automated hardware & firmware assertions.'}
                </p>
              ) : (
                <div className="space-y-2">
                  <div
                    className={cn(
                      'p-3 rounded-lg border text-xs font-bold flex items-center gap-2',
                      allPassedNow
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
                    )}
                  >
                    {allPassedNow ? (
                      <Trophy className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {allPassedNow
                        ? `${tLoc(translations.challenges.passedTitle, lang)} (+${activeChallenge.xp} XP)`
                        : tLoc(translations.challenges.failedTitle, lang)}
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {results.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        {r.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            r.passed
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-rose-700 dark:text-rose-300'
                          }
                        >
                          {tLoc(r.label, lang)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
