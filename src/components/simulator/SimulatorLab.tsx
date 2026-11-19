import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Blocks,
  Camera,
  Check,
  Code2,
  Columns2,
  Copy,
  Download,
  FileText,
  FolderKanban,
  GitBranch,
  Keyboard,
  Loader2,
  Maximize2,
  Minimize2,
  PanelBottom,
  PanelLeft,
  Play,
  RotateCcw,
  Save,
  Square,
  Terminal,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useShortcutHandler, useShortcuts } from '../../context/ShortcutContext';
import { tLoc, translations } from '../../i18n/translations';
import {
  analyzeCircuit,
  ArduinoSimulatorRunner,
} from '../../engine/arduinoSim';
import {
  arduinoCppToBlocks,
  blocksToArduinoCpp,
} from '../../engine/blocklyBridge';
import type {
  CodeBlock,
  ComponentKind,
  PlacedComponent,
  SerialEntry,
} from '../../types/arduino';
import { BreadboardCanvas } from './BreadboardCanvas';
import { ComponentExplorerSidebar } from './ComponentExplorerSidebar';
import { BlocklyEditor } from './BlocklyEditor';
import { CodeEditor } from './CodeEditor';
import { OscilloscopePanel } from './OscilloscopePanel';
import { SerialPanel } from './SerialPanel';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { soundEngine } from '../../utils/sound';
import { exportLabReportPdf } from '../../utils/labReportPdf';
import { exportCircuitSnapshotPng } from '../../utils/circuitSnapshotPng';
import { cn } from '../../lib/utils';

export function SimulatorLab() {
  const {
    lang,
    simTitle,
    simCode,
    simBlocks,
    simCircuit,
    autoRunToken,
    setSimCode,
    setSimBlocks,
    setSimCircuit,
    setActiveTab,
    saveCircuitProject,
    completeItem,
    profile,
    simulatorFocusMode,
    setSimulatorFocusMode,
    toggleSimulatorFocusMode,
  } = useApp();
  const { modalOpen: shortcutsModalOpen, toggleModal: toggleShortcutsModal, isMac } =
    useShortcuts();
  const modKey = isMac ? '⌘' : 'Ctrl';

  const [editorMode, setEditorMode] = useState<'blocks' | 'split' | 'code'>('split');
  const [boardView, setBoardView] = useState<'breadboard' | 'schematic'>('breadboard');
  const [explorerOpen, setExplorerOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true,
  );
  const [mobilePane, setMobilePane] = useState<'circuit' | 'editor' | 'scope' | 'serial'>('circuit');
  const [showOscilloscope, setShowOscilloscope] = useState(true);
  const [showFocusSerial, setShowFocusSerial] = useState(false);
  const [showFocusPalette, setShowFocusPalette] = useState(false);
  const [running, setRunning] = useState(false);
  const [pinValues, setPinValues] = useState<Record<string, number>>({});
  const [servoAngles, setServoAngles] = useState<Record<string, number>>({});
  const [buzzerTone, setBuzzerTone] = useState<{ pin: string; freq: number } | null>(null);
  const [ledD13On, setLedD13On] = useState(false);
  const [serialLog, setSerialLog] = useState<SerialEntry[]>([]);
  const [plotData, setPlotData] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  // Save to Cloud Modal
  const [saveOpen, setSaveOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Printable Lab Report PDF Export Modal
  const breadboardSvgRef = useRef<SVGSVGElement | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfStudent, setPdfStudent] = useState('');
  const [pdfCourse, setPdfCourse] = useState('');
  const [pdfNotes, setPdfNotes] = useState('');
  const [pdfIncludeSerial, setPdfIncludeSerial] = useState(true);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pngExporting, setPngExporting] = useState(false);
  const [pngSaved, setPngSaved] = useState(false);

  const circuitRef = useRef(simCircuit);
  circuitRef.current = simCircuit;

  const serialInputQueueRef = useRef<string[]>([]);
  const runnerRef = useRef<ArduinoSimulatorRunner | null>(null);

  useEffect(() => {
    const runner = new ArduinoSimulatorRunner({
      getCircuit: () => circuitRef.current,
      onStateChange: (patch) => {
        setPinValues(patch.pinValues);
        setServoAngles(patch.servoAngles);
        setBuzzerTone(patch.buzzerTone);
        setLedD13On(patch.ledD13On);
      },
      onSerialOut: (text, numericValue) => {
        const now = new Date();
        const ts = now.toTimeString().slice(0, 8);
        setSerialLog((prev) => [
          ...prev.slice(-80),
          {
            id: Date.now() + Math.random(),
            timestamp: ts,
            text,
            direction: 'rx',
            numericValue,
          },
        ]);
        if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {
          setPlotData((prev) => [...prev.slice(-59), numericValue]);
        }
      },
      onBuzzerTone: (freq, durationMs) => {
        soundEngine.playBuzzerTone(freq, durationMs);
      },
      onBuzzerStop: () => {
        soundEngine.stopBuzzer();
      },
      getSerialInput: () => serialInputQueueRef.current.shift() || null,
    });
    runnerRef.current = runner;
    return () => {
      runner.stop();
      soundEngine.stopBuzzer();
    };
  }, []);

  // Automatically start simulation when a user clicks "Load & Run Now" from All Projects
  const lastAutoRunRef = useRef(0);
  useEffect(() => {
    if (autoRunToken > 0 && autoRunToken !== lastAutoRunRef.current) {
      lastAutoRunRef.current = autoRunToken;
      setSerialLog([]);
      setPlotData([]);
      setRunning(true);
      const timer = window.setTimeout(() => {
        runnerRef.current?.start(simCode);
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [autoRunToken, simCode]);

  // Escape exits Focus Mode when no modal dialogs are open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        simulatorFocusMode &&
        !saveOpen &&
        !pdfOpen &&
        !shortcutsModalOpen
      ) {
        e.preventDefault();
        soundEngine.playSelect();
        setSimulatorFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    simulatorFocusMode,
    saveOpen,
    pdfOpen,
    shortcutsModalOpen,
    setSimulatorFocusMode,
  ]);

  const analysis = useMemo(
    () => analyzeCircuit(simCircuit, pinValues),
    [simCircuit, pinValues],
  );

  const placedComponentCounts = useMemo(() => {
    const counts: Partial<Record<ComponentKind, number>> = {};
    for (const c of simCircuit.components) {
      counts[c.kind] = (counts[c.kind] || 0) + 1;
    }
    return counts;
  }, [simCircuit.components]);

  const handleAddComponentFromExplorer = (kind: ComponentKind) => {
    soundEngine.playSelect();
    setSimCircuit((prev) => {
      const idx = prev.components.length;
      const defaultVal =
        kind === 'potentiometer'
          ? 512
          : kind === 'ldr'
            ? 520
            : kind === 'ultrasonic'
              ? 45
              : kind === 'temp-sensor'
                ? 25
                : 0;
      const rawX = 450 + (idx % 5) * 45;
      const rawY = 125 + (idx % 3) * 60;
      const comp: PlacedComponent = {
        id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`,
        kind,
        x: Math.max(360, Math.min(725, rawX)),
        y: Math.max(80, Math.min(340, rawY)),
        label: kind.toUpperCase().replace('-', ' '),
        value: defaultVal,
      };
      return { ...prev, components: [...prev.components, comp] };
    });
  };

  const handleToggleRun = () => {
    if (running) {
      runnerRef.current?.stop();
      setRunning(false);
      soundEngine.playSelect();
    } else {
      setSerialLog([]);
      setPlotData([]);
      setRunning(true);
      soundEngine.playSelect();
      runnerRef.current?.start(simCode);
      // Grant First Blink badge subtly if first simulation run
      completeItem('lesson', 'sim-first-run', 15).catch(() => {});
    }
  };

  const handleResetSimulation = () => {
    runnerRef.current?.stop();
    setRunning(false);
    setPinValues({});
    setServoAngles({});
    setLedD13On(false);
    setSerialLog([]);
    setPlotData([]);
    soundEngine.playSelect();
  };

  // Register live Simulator handlers with the Global Keyboard Shortcut Manager
  useShortcutHandler('run-simulation', () => {
    const wasRunning = running;
    handleToggleRun();
    return wasRunning
      ? tLoc(translations.shortcuts.toastSimStopped, lang)
      : tLoc(translations.shortcuts.toastSimStarted, lang);
  });

  useShortcutHandler('reset-simulation', () => {
    handleResetSimulation();
    return tLoc(translations.shortcuts.toastSimReset, lang);
  });

  useShortcutHandler('toggle-board-view', () => {
    soundEngine.playSelect();
    setBoardView((prev) => (prev === 'breadboard' ? 'schematic' : 'breadboard'));
    return tLoc(translations.shortcuts.toastBoardView, lang);
  });

  useShortcutHandler('cycle-editor-mode', () => {
    soundEngine.playSelect();
    setEditorMode((prev) =>
      prev === 'blocks' ? 'split' : prev === 'split' ? 'code' : 'blocks',
    );
    return tLoc(translations.shortcuts.toastEditorMode, lang);
  });

  useShortcutHandler('toggle-explorer', () => {
    if (simulatorFocusMode) {
      setSimulatorFocusMode(false);
      setExplorerOpen(true);
    } else {
      setExplorerOpen((v) => !v);
    }
    soundEngine.playSelect();
    return tLoc(translations.shortcuts.toastExplorerToggled, lang);
  });

  useShortcutHandler('save-project', () => {
    soundEngine.playSelect();
    setProjectTitle(simTitle || 'My Arduino Circuit');
    setSaveOpen(true);
    return tLoc(translations.shortcuts.toastSaveOpened, lang);
  });

  const handleBlocksChange = (nextBlocks: CodeBlock[]) => {
    setSimBlocks(nextBlocks);
    setSimCode(blocksToArduinoCpp(nextBlocks));
  };

  const handleSyncFromCode = () => {
    soundEngine.playSelect();
    const parsed = arduinoCppToBlocks(simCode);
    setSimBlocks(parsed);
  };

  const handleCopyIde = async () => {
    try {
      await navigator.clipboard.writeText(simCode);
      setCopied(true);
      soundEngine.playSuccess();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      soundEngine.playError();
    }
  };

  const handleDownloadIno = () => {
    const blob = new Blob([simCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(simTitle || 'ardunolab_sketch').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ino`;
    a.click();
    URL.revokeObjectURL(url);
    soundEngine.playSuccess();
  };

  const handleExportPng = async () => {
    if (pngExporting) return;
    setPngExporting(true);
    try {
      const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');
      await exportCircuitSnapshotPng({
        svgElement: breadboardSvgRef.current,
        title: simTitle || 'Arduino Uno R3 Circuit',
        viewMode: boardView,
        circuit: simCircuit,
        lang,
        darkMode: isDark,
      });
      soundEngine.playSuccess();
      setPngSaved(true);
      setTimeout(() => setPngSaved(false), 2000);
    } catch {
      soundEngine.playError();
    } finally {
      setPngExporting(false);
    }
  };

  const handleSaveCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    const ok = await saveCircuitProject({
      title: projectTitle.trim(),
      description: projectDesc.trim(),
      code: simCode,
      blocks: simBlocks,
      circuit: simCircuit,
    });
    if (ok) {
      soundEngine.playSuccess();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setSaveOpen(false);
        setProjectTitle('');
        setProjectDesc('');
      }, 900);
    }
  };

  const openPdfModal = () => {
    soundEngine.playSelect();
    setPdfTitle(simTitle || 'Arduino Uno R3 Lab Experiment');
    setPdfStudent(profile.displayName || '');
    setPdfError(null);
    setPdfOpen(true);
  };

  const handleExportPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setPdfExporting(true);
    setPdfError(null);
    try {
      await exportLabReportPdf({
        lang,
        title: pdfTitle.trim() || simTitle || 'Arduino Uno R3 Lab Experiment',
        studentName: pdfStudent.trim() || profile.displayName || 'Student',
        courseName: pdfCourse.trim(),
        notes: pdfNotes,
        viewMode: boardView,
        circuit: simCircuit,
        code: simCode,
        diagnostics: analysis.diagnostics,
        serialLog,
        includeSerialLog: pdfIncludeSerial,
        svgElement: breadboardSvgRef.current,
      });
      soundEngine.playSuccess();
      setPdfOpen(false);
    } catch (err) {
      soundEngine.playError();
      setPdfError(
        err instanceof Error ? err.message : 'Failed to generate PDF report',
      );
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <section
      className={cn(
        simulatorFocusMode
          ? 'w-full min-h-[100dvh] xl:h-screen flex flex-col px-2 sm:px-3 py-2 gap-2 xl:overflow-hidden'
          : 'max-w-[1600px] w-full mx-auto px-2.5 sm:px-6 py-2.5 sm:py-4 space-y-2.5 sm:space-y-3',
      )}
    >
      {/* Top Simulator Action Toolbar (Mobile-first scrollable strip, wraps cleanly on desktop) */}
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 rounded-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]',
          simulatorFocusMode ? 'px-2.5 sm:px-3 py-1.5 shrink-0' : 'px-2.5 sm:px-4 py-2 sm:py-2.5',
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 sm:flex-wrap">
          {!simulatorFocusMode && (
            <>
              <Button
                size="sm"
                variant={explorerOpen ? 'default' : 'outline'}
                aria-pressed={explorerOpen}
                title={`${tLoc(translations.simulator.componentExplorer, lang)} (${modKey}+Shift+X)`}
                onClick={() => {
                  soundEngine.playSelect();
                  setExplorerOpen((v) => !v);
                }}
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">
                  {tLoc(translations.simulator.componentExplorer, lang)}
                </span>
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className="hidden sm:inline-flex"
                onClick={() => {
                  runnerRef.current?.stop();
                  setRunning(false);
                  soundEngine.playSelect();
                  setActiveTab('projects');
                }}
              >
                <FolderKanban className="w-3.5 h-3.5 text-[#00878F]" />
                <span>{tLoc(translations.projects.allProjects, lang)}</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant={running ? 'destructive' : 'default'}
            onClick={handleToggleRun}
            title={`${running ? tLoc(translations.simulator.stop, lang) : tLoc(translations.simulator.run, lang)} (${modKey}+Enter)`}
          >
            {running ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{tLoc(translations.simulator.stop, lang)}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{tLoc(translations.simulator.run, lang)}</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            title={`${tLoc(translations.simulator.reset, lang)} (${modKey}+Shift+R)`}
            onClick={handleResetSimulation}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tLoc(translations.simulator.reset, lang)}</span>
          </Button>

          {/* Breadboard vs Schematic Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setBoardView('breadboard');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                boardView === 'breadboard'
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400',
              )}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{tLoc(translations.simulator.breadboardView, lang)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setBoardView('schematic');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                boardView === 'schematic'
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400',
              )}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{tLoc(translations.simulator.schematicView, lang)}</span>
            </button>
          </div>

          {/* Virtual Oscilloscope Panel Toggle */}
          <button
            type="button"
            aria-pressed={showOscilloscope}
            onClick={() => {
              soundEngine.playSelect();
              setShowOscilloscope((v) => {
                const next = !v;
                if (next && typeof window !== 'undefined' && window.innerWidth < 1280) {
                  setMobilePane('scope');
                }
                return next;
              });
            }}
            title={tLoc(translations.simulator.oscilloscopeTitle, lang)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0',
              showOscilloscope
                ? 'bg-[#00878F]/15 border-[#00878F]/50 text-[#00878F] dark:text-[#22c6cf]'
                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{tLoc(translations.simulator.oscilloscope, lang)}</span>
          </button>

          {/* Focus Mode quick panel drawers for Parts Palette & Serial Monitor */}
          {simulatorFocusMode && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={showFocusPalette}
                onClick={() => {
                  soundEngine.playSelect();
                  setShowFocusPalette((v) => !v);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                  showFocusPalette
                    ? 'bg-[#00878F]/15 border-[#00878F]/50 text-[#00878F] dark:text-[#22c6cf]'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                <PanelBottom className="w-3.5 h-3.5" />
                <span>{tLoc(translations.simulator.togglePalette, lang)}</span>
              </button>
              <button
                type="button"
                aria-pressed={showFocusSerial}
                onClick={() => {
                  soundEngine.playSelect();
                  setShowFocusSerial((v) => !v);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                  showFocusSerial
                    ? 'bg-[#00878F]/15 border-[#00878F]/50 text-[#00878F] dark:text-[#22c6cf]'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{tLoc(translations.simulator.toggleSerial, lang)}</span>
                {serialLog.length > 0 && !showFocusSerial && (
                  <span className="font-mono text-[10px] px-1 rounded bg-[#00878F] text-white">
                    {serialLog.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right: Editor Mode Switcher + Export / Cloud Save + Focus Mode Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900 shrink-0">
            {([
              { id: 'blocks', icon: Blocks, label: translations.simulator.blocksMode },
              { id: 'split', icon: Columns2, label: translations.simulator.splitMode },
              { id: 'code', icon: Code2, label: translations.simulator.codeMode },
            ] as const).map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setEditorMode(m.id);
                    setMobilePane('editor');
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 min-h-[34px] sm:min-h-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                    editorMode === m.id
                      ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tLoc(m.label, lang)}</span>
                </button>
              );
            })}
          </div>

          {!simulatorFocusMode && (
            <>
              <Button size="sm" variant="secondary" onClick={handleCopyIde}>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copied
                    ? tLoc(translations.simulator.copied, lang)
                    : tLoc(translations.simulator.copyIde, lang)}
                </span>
              </Button>

              <Button size="sm" variant="outline" onClick={handleDownloadIno}>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {tLoc(translations.simulator.downloadIno, lang)}
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPng}
                disabled={pngExporting}
                title={tLoc(translations.simulator.exportPngTooltip, lang)}
              >
                {pngExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00878F]" />
                ) : pngSaved ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-[#00878F]" />
                )}
                <span>
                  {pngSaved
                    ? tLoc(translations.simulator.exportPngSaved, lang)
                    : tLoc(translations.simulator.exportPng, lang)}
                </span>
              </Button>

              <Button size="sm" variant="outline" onClick={openPdfModal}>
                <FileText className="w-3.5 h-3.5 text-[#00878F]" />
                <span>{tLoc(translations.simulator.exportPdf, lang)}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                title={`${tLoc(translations.simulator.saveCloud, lang)} (${modKey}+Shift+S)`}
                onClick={() => {
                  setProjectTitle(simTitle || 'My Arduino Circuit');
                  setSaveOpen(true);
                }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{tLoc(translations.simulator.saveCloud, lang)}</span>
              </Button>
            </>
          )}

          {simulatorFocusMode && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPng}
                disabled={pngExporting}
                aria-label={tLoc(translations.simulator.exportPng, lang)}
                title={tLoc(translations.simulator.exportPngTooltip, lang)}
              >
                {pngExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00878F]" />
                ) : pngSaved ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-[#00878F]" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleShortcutsModal}
                aria-label={tLoc(translations.shortcuts.buttonLabel, lang)}
                title={`${tLoc(translations.shortcuts.buttonLabel, lang)} (${modKey}+/)`}
              >
                <Keyboard className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {/* Focus Mode Toggle Button */}
          <Button
            size="sm"
            variant={simulatorFocusMode ? 'default' : 'outline'}
            onClick={toggleSimulatorFocusMode}
            aria-pressed={simulatorFocusMode}
            title={
              simulatorFocusMode
                ? `${tLoc(translations.simulator.exitFocusMode, lang)} (Esc)`
                : `${tLoc(translations.simulator.focusMode, lang)} (${modKey}+Shift+F)`
            }
          >
            {simulatorFocusMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{tLoc(translations.simulator.exitFocusMode, lang)}</span>
                <kbd className="hidden sm:inline-block ms-1 px-1 py-0.5 text-[10px] font-mono rounded bg-white/20">
                  Esc
                </kbd>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#00878F]" />
                <span>{tLoc(translations.simulator.focusMode, lang)}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile / Tablet Pane Switcher (< xl): Switch cleanly between Circuit, Code, Scope, and Serial */}
      <div
        role="tablist"
        aria-label="Simulator Workspace Panes"
        className="xl:hidden grid grid-cols-4 gap-1 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
      >
        {(
          [
            {
              id: 'circuit',
              label: tLoc(translations.mobile.circuitTab, lang),
              icon: Wrench,
            },
            {
              id: 'editor',
              label: tLoc(translations.mobile.editorTab, lang),
              icon: Code2,
            },
            {
              id: 'scope',
              label: tLoc(translations.mobile.scopeTab, lang),
              icon: Activity,
            },
            {
              id: 'serial',
              label: tLoc(translations.mobile.serialTab, lang),
              icon: Terminal,
              count: serialLog.length,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = mobilePane === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                soundEngine.playSelect();
                setMobilePane(tab.id);
              }}
              className={cn(
                'min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap px-2',
                active
                  ? 'bg-white dark:bg-slate-800 text-[#00878F] dark:text-[#22c6cf] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {'count' in tab && tab.count > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] tabular-nums">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Sandbox Layout: Optional Component Explorer Sidebar + Breadboard & Dual Editor */}
      <div
        className={cn(
          'flex flex-col xl:flex-row items-stretch',
          simulatorFocusMode
            ? 'flex-1 min-h-0 gap-2.5'
            : 'gap-3.5 xl:min-h-[640px]',
        )}
      >
        {/* Searchable Component Explorer: Mobile Bottom Sheet on < xl, Docked Left Sidebar on xl+ */}
        {!simulatorFocusMode && explorerOpen && (
          <>
            {/* Mobile/Tablet Backdrop */}
            <div
              onClick={() => {
                soundEngine.playSelect();
                setExplorerOpen(false);
              }}
              className="xl:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
            />
            <div className="fixed inset-x-0 bottom-0 z-50 xl:static xl:z-auto xl:inset-auto flex xl:block">
              <ComponentExplorerSidebar
                lang={lang}
                placedCounts={placedComponentCounts}
                onAddComponent={(kind) => {
                  handleAddComponentFromExplorer(kind);
                  if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                    setMobilePane('circuit');
                  }
                }}
                onClose={() => {
                  soundEngine.playSelect();
                  setExplorerOpen(false);
                }}
              />
            </div>
          </>
        )}

        {/* Two-Zone Sandbox Split: Interactive Breadboard + Dual Editor */}
        <div
          className={cn(
            'flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-12 items-stretch',
            simulatorFocusMode ? 'min-h-0 gap-2.5' : 'gap-3 sm:gap-4',
          )}
        >
          {/* Circuit Stage (7 cols on xl; shown on mobile when mobilePane is 'circuit' or 'serial') */}
          <div
            className={cn(
              'xl:col-span-7 flex flex-col',
              simulatorFocusMode ? 'min-h-0 gap-2' : 'gap-3',
              mobilePane === 'editor' ? 'hidden xl:flex' : 'flex',
            )}
          >
            <div
              className={cn(
                'flex-1',
                simulatorFocusMode ? 'min-h-0' : 'min-h-[380px] sm:min-h-[440px]',
                mobilePane === 'serial' || mobilePane === 'scope' ? 'hidden xl:block' : 'block',
              )}
            >
              <BreadboardCanvas
                lang={lang}
                circuit={simCircuit}
                onChangeCircuit={setSimCircuit}
                viewMode={boardView}
                running={running}
                ledD13On={ledD13On}
                pinValues={pinValues}
                servoAngles={servoAngles}
                buzzerTone={buzzerTone}
                componentPower={analysis.componentPower}
                diagnostics={analysis.diagnostics}
                compactPalette={simulatorFocusMode && !showFocusPalette}
                svgExternalRef={breadboardSvgRef}
              />
            </div>

            {/* Virtual Oscilloscope Panel (Real-Time Analog Pin Voltage Fluctuations A0–A5) */}
            {(showOscilloscope || mobilePane === 'scope') && (
              <div
                className={cn(
                  mobilePane === 'scope'
                    ? 'block'
                    : showOscilloscope
                      ? 'hidden xl:block'
                      : 'hidden',
                )}
              >
                <OscilloscopePanel
                  lang={lang}
                  running={running}
                  telemetry={analysis.analogPinTelemetry}
                  onClose={() => {
                    soundEngine.playSelect();
                    setShowOscilloscope(false);
                    if (mobilePane === 'scope') setMobilePane('circuit');
                  }}
                />
              </div>
            )}

            {/* Live Serial Monitor + Live Serial Plotter */}
            {(!simulatorFocusMode || showFocusSerial || mobilePane === 'serial') && (
              <div
                className={cn(
                  mobilePane === 'circuit' || mobilePane === 'scope' ? 'hidden xl:block' : 'block',
                )}
              >
                <SerialPanel
                  lang={lang}
                  entries={serialLog}
                  plotData={plotData}
                  onClear={() => {
                    setSerialLog([]);
                    setPlotData([]);
                  }}
                  onSendInput={(txt) => {
                    serialInputQueueRef.current.push(txt);
                    const ts = new Date().toTimeString().slice(0, 8);
                    setSerialLog((prev) => [
                      ...prev,
                      {
                        id: Date.now() + Math.random(),
                        timestamp: ts,
                        text: txt,
                        direction: 'tx',
                      },
                    ]);
                  }}
                />
              </div>
            )}
          </div>

          {/* Dual Programming Workspace (5 cols on xl; shown on mobile when mobilePane === 'editor') */}
          <div
            className={cn(
              'xl:col-span-5 rounded-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col',
              simulatorFocusMode ? 'min-h-0' : 'min-h-[480px] xl:min-h-[640px]',
              mobilePane === 'editor' ? 'flex' : 'hidden xl:flex',
            )}
          >
            {editorMode === 'blocks' && (
              <BlocklyEditor
                lang={lang}
                blocks={simBlocks}
                onChangeBlocks={handleBlocksChange}
              />
            )}
            {editorMode === 'code' && (
              <CodeEditor
                lang={lang}
                code={simCode}
                onChange={setSimCode}
                onSyncToBlocks={handleSyncFromCode}
              />
            )}
            {editorMode === 'split' && (
              <div className="flex-1 grid grid-rows-2 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden min-h-0">
                <div className="overflow-hidden min-h-0">
                  <BlocklyEditor
                    lang={lang}
                    blocks={simBlocks}
                    onChangeBlocks={handleBlocksChange}
                  />
                </div>
                <div className="overflow-hidden min-h-0">
                  <CodeEditor
                    lang={lang}
                    code={simCode}
                    onChange={setSimCode}
                    onSyncToBlocks={handleSyncFromCode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Circuit Modal */}
      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title={tLoc(translations.simulator.saveCloud, lang)}
        className="max-w-md"
      >
        <form onSubmit={handleSaveCloud} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g., Smart Traffic Controller"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="Describe pins and sensors used..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSaveOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant={saveSuccess ? 'success' : 'default'}>
              {saveSuccess ? 'Saved!' : tLoc(translations.simulator.saveCloud, lang)}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Printable Lab Report PDF Export Modal */}
      <Dialog
        open={pdfOpen}
        onClose={() => !pdfExporting && setPdfOpen(false)}
        title={tLoc(translations.simulator.pdfModalTitle, lang)}
        className="max-w-lg"
      >
        <form onSubmit={handleExportPdf} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {tLoc(translations.simulator.pdfModalDesc, lang)}
          </p>

          {/* Report Content Summary Strip */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5 text-center">
            <div>
              <div className="font-mono text-sm font-bold text-[#00878F] dark:text-[#22c6cf] tabular-nums">
                {simCircuit.components.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {tLoc(translations.simulator.components, lang)}
              </div>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-800">
              <div className="font-mono text-sm font-bold text-[#00878F] dark:text-[#22c6cf] tabular-nums">
                {simCircuit.wires.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'الأسلاك' : lang === 'fr' ? 'Fils' : 'Wires'}
              </div>
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-[#00878F] dark:text-[#22c6cf] tabular-nums">
                {simCode.split('\n').length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'أسطر الكود' : lang === 'fr' ? 'Lignes C++' : 'C++ Lines'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'عنوان التجربة / المشروع' : lang === 'fr' ? 'Titre du projet' : 'Experiment Title'}
              </label>
              <input
                type="text"
                required
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tLoc(translations.simulator.pdfStudent, lang)}
              </label>
              <input
                type="text"
                value={pdfStudent}
                onChange={(e) => setPdfStudent(e.target.value)}
                placeholder="e.g., Sara Al-Mansouri"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tLoc(translations.simulator.pdfCourse, lang)}
              </label>
              <input
                type="text"
                value={pdfCourse}
                onChange={(e) => setPdfCourse(e.target.value)}
                placeholder="e.g., Embedded Systems 101"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tLoc(translations.simulator.pdfNotes, lang)}
            </label>
            <textarea
              rows={3}
              value={pdfNotes}
              onChange={(e) => setPdfNotes(e.target.value)}
              placeholder={tLoc(translations.simulator.pdfNotesPlaceholder, lang)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
            />
          </div>

          {serialLog.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={pdfIncludeSerial}
                onChange={(e) => setPdfIncludeSerial(e.target.checked)}
                className="rounded accent-[#00878F] cursor-pointer"
              />
              <span>
                {tLoc(translations.simulator.pdfIncludeSerial, lang)} ({serialLog.length})
              </span>
            </label>
          )}

          {pdfError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
              {pdfError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pdfExporting}
              onClick={() => setPdfOpen(false)}
            >
              {lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" size="sm" disabled={pdfExporting}>
              {pdfExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tLoc(translations.simulator.pdfGenerating, lang)}</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>{tLoc(translations.simulator.pdfDownloadBtn, lang)}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
