import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  Grid3x3,
  Hand,
  Maximize2,
  MessageSquareText,
  Plus,
  Route,
  Trash2,
  Unplug,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  CircuitState,
  ComponentKind,
  ComponentOverloadInfo,
  ComponentPowerState,
  ElectricalDiagnostic,
  PlacedComponent,
  WireConnection,
} from '../../types/arduino';
import { COMPONENT_PINS, isLedKind } from '../../engine/arduinoSim';
import {
  computeCircuitCurrentFlow,
  type CurrentFlowMode,
  type FlowCategory,
} from '../../engine/currentFlow';
import {
  computeMultimeterReadings,
  getMultimeterModeFromValue,
  getMultimeterValueFromMode,
  type MultimeterMode,
} from '../../engine/multimeterSolver';
import {
  autoRouteCircuitWires,
  buildRoundedOrthogonalPath,
  simplifyOrthogonalPoints,
  type WirePoint,
} from '../../engine/wireAutoRouter';
import { useApp } from '../../context/AppContext';
import { soundEngine } from '../../utils/sound';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { cn } from '../../lib/utils';
import { ARDUNOLAB_COMPONENT_MIME } from './ComponentExplorerSidebar';
import {
  SmartComponentTooltip,
  type SmartTooltipTarget,
} from './SmartComponentTooltip';
import {
  WIRE_COLORS,
  WireColorSelector,
  getSmartWireColorForNode,
  isLightWireHex,
} from './WireColorSelector';

export { WIRE_COLORS };

export const PALETTE_COMPONENTS: Array<{
  kind: ComponentKind;
  name: { ar: string; en: string; fr: string };
  swatch: string;
}> = [
  { kind: 'led-red', name: { ar: 'LED أحمر', en: 'Red LED', fr: 'LED Rouge' }, swatch: '#ef4444' },
  { kind: 'led-green', name: { ar: 'LED أخضر', en: 'Green LED', fr: 'LED Verte' }, swatch: '#22c55e' },
  { kind: 'led-blue', name: { ar: 'LED أزرق', en: 'Blue LED', fr: 'LED Bleue' }, swatch: '#3b82f6' },
  { kind: 'led-yellow', name: { ar: 'LED أصفر', en: 'Yellow LED', fr: 'LED Jaune' }, swatch: '#eab308' },
  { kind: 'resistor-220', name: { ar: 'مقاومة 220Ω', en: '220Ω Resistor', fr: 'Rés. 220Ω' }, swatch: '#d97706' },
  { kind: 'resistor-1k', name: { ar: 'مقاومة 1kΩ', en: '1kΩ Resistor', fr: 'Rés. 1kΩ' }, swatch: '#b45309' },
  { kind: 'resistor-10k', name: { ar: 'مقاومة 10kΩ', en: '10kΩ Resistor', fr: 'Rés. 10kΩ' }, swatch: '#92400e' },
  { kind: 'button', name: { ar: 'زر ضاغط', en: 'Pushbutton', fr: 'Bouton' }, swatch: '#64748b' },
  { kind: 'potentiometer', name: { ar: 'مقاومة متغيرة', en: 'Potentiometer', fr: 'Potentiomètre' }, swatch: '#0284c7' },
  { kind: 'ldr', name: { ar: 'حساس ضوء LDR', en: 'LDR Sensor', fr: 'Capteur LDR' }, swatch: '#ca8a04' },
  { kind: 'ultrasonic', name: { ar: 'حساس HC-SR04', en: 'HC-SR04 Sonar', fr: 'HC-SR04' }, swatch: '#0d9488' },
  { kind: 'servo', name: { ar: 'محرك سيرفو SG90', en: 'SG90 Servo', fr: 'Servo SG90' }, swatch: '#2563eb' },
  { kind: 'buzzer', name: { ar: 'جرس Piezo', en: 'Piezo Buzzer', fr: 'Buzzer Piezo' }, swatch: '#334155' },
  { kind: 'temp-sensor', name: { ar: 'حساس حرارة', en: 'TMP36 Temp', fr: 'Temp TMP36' }, swatch: '#475569' },
  { kind: 'multimeter', name: { ar: 'مالتيميتر V/mA/Ω', en: 'Multimeter', fr: 'Multimètre' }, swatch: '#eab308' },
];

// Fixed SVG coordinates for Arduino Uno R3 pins (left board: x=24..285, y=42..365)
const ARDUINO_PINS: Array<{ id: string; label: string; x: number; y: number; group: 'digital' | 'power' | 'analog' }> = [
  // Top-right digital column along right side of Uno for clean horizontal breadboard routing
  { id: 'GND1', label: 'GND', x: 274, y: 66, group: 'power' },
  { id: 'D13', label: 'D13', x: 274, y: 84, group: 'digital' },
  { id: 'D12', label: 'D12', x: 274, y: 102, group: 'digital' },
  { id: 'D11', label: '~11', x: 274, y: 120, group: 'digital' },
  { id: 'D10', label: '~10', x: 274, y: 138, group: 'digital' },
  { id: 'D9', label: '~9', x: 274, y: 156, group: 'digital' },
  { id: 'D8', label: 'D8', x: 274, y: 174, group: 'digital' },
  { id: 'D7', label: 'D7', x: 274, y: 196, group: 'digital' },
  { id: 'D6', label: '~6', x: 274, y: 214, group: 'digital' },
  { id: 'D5', label: '~5', x: 274, y: 232, group: 'digital' },
  { id: 'D4', label: 'D4', x: 274, y: 250, group: 'digital' },
  { id: 'D3', label: '~3', x: 274, y: 268, group: 'digital' },
  { id: 'D2', label: 'D2', x: 274, y: 286, group: 'digital' },

  // Power & Analog pins on left/bottom-right accessible rail
  { id: '3.3V', label: '3.3V', x: 46, y: 174, group: 'power' },
  { id: '5V', label: '5V', x: 46, y: 194, group: 'power' },
  { id: 'GND2', label: 'GND', x: 46, y: 214, group: 'power' },
  { id: 'VIN', label: 'VIN', x: 46, y: 234, group: 'power' },

  { id: 'A0', label: 'A0', x: 46, y: 266, group: 'analog' },
  { id: 'A1', label: 'A1', x: 46, y: 284, group: 'analog' },
  { id: 'A2', label: 'A2', x: 46, y: 302, group: 'analog' },
  { id: 'A3', label: 'A3', x: 46, y: 320, group: 'analog' },
  { id: 'A4', label: 'A4', x: 46, y: 338, group: 'analog' },
  { id: 'A5', label: 'A5', x: 46, y: 356, group: 'analog' },
];

interface BreadboardPoint {
  id: string;
  x: number;
  y: number;
  kind: 'rail-pos' | 'rail-neg' | 'hole';
  stripKey: string;
  label: string;
  col: number;
  half?: 'top' | 'bot';
}

interface DragWireState {
  fromNodeId: string;
  startPt: WirePoint;
  corners: WirePoint[];
  axis: 'h' | 'v' | null;
  cursorSnapped: WirePoint;
  targetNodeId: string | null;
  hasDragged: boolean;
  pointerId: number;
}

const TOP_HOLE_ROWS: Array<{ row: number; letter: string; y: number }> = [
  { row: 0, letter: 'A', y: 96 },
  { row: 1, letter: 'B', y: 114 },
  { row: 2, letter: 'C', y: 132 },
  { row: 3, letter: 'D', y: 150 },
  { row: 4, letter: 'E', y: 168 },
];

const BOT_HOLE_ROWS: Array<{ row: number; letter: string; y: number }> = [
  { row: 0, letter: 'F', y: 228 },
  { row: 1, letter: 'G', y: 246 },
  { row: 2, letter: 'H', y: 264 },
  { row: 3, letter: 'I', y: 282 },
  { row: 4, letter: 'J', y: 300 },
];

const BREADBOARD_POINTS: BreadboardPoint[] = (() => {
  const pts: BreadboardPoint[] = [];
  // Top & bottom power rails (+5V / GND)
  for (let col = 0; col < 12; col++) {
    const rx = Number((376 + col * 29.6).toFixed(1));
    pts.push(
      { id: `bb:pos:top:${col}`, x: rx, y: 62, kind: 'rail-pos', stripKey: 'rail:pos:top', label: `+5V #${col + 1}`, col, half: 'top' },
      { id: `bb:neg:top:${col}`, x: rx, y: 76, kind: 'rail-neg', stripKey: 'rail:neg:top', label: `GND #${col + 1}`, col, half: 'top' },
      { id: `bb:pos:bot:${col}`, x: rx, y: 336, kind: 'rail-pos', stripKey: 'rail:pos:bot', label: `+5V #${col + 1}`, col, half: 'bot' },
      { id: `bb:neg:bot:${col}`, x: rx, y: 352, kind: 'rail-neg', stripKey: 'rail:neg:bot', label: `GND #${col + 1}`, col, half: 'bot' },
    );
  }
  // 24 columns x 10 rows (A..E top strip, F..J bottom strip)
  for (let col = 0; col < 24; col++) {
    const cx = Number((376 + col * 14.8).toFixed(1));
    for (const r of TOP_HOLE_ROWS) {
      pts.push({
        id: `bb:col:${col}:top:${r.row}`,
        x: cx,
        y: r.y,
        kind: 'hole',
        stripKey: `col:${col}:top`,
        label: `${col + 1}${r.letter}`,
        col,
        half: 'top',
      });
    }
    for (const r of BOT_HOLE_ROWS) {
      pts.push({
        id: `bb:col:${col}:bot:${r.row}`,
        x: cx,
        y: r.y,
        kind: 'hole',
        stripKey: `col:${col}:bot`,
        label: `${col + 1}${r.letter}`,
        col,
        half: 'bot',
      });
    }
  }
  return pts;
})();

const BREADBOARD_POINT_MAP = new Map<string, BreadboardPoint>(
  BREADBOARD_POINTS.map((p) => [p.id, p]),
);

function getResistorBands(kind: ComponentKind): [string, string, string, string] {
  if (kind === 'resistor-1k') return ['#78350f', '#0f172a', '#ef4444', '#d97706']; // Brown-Black-Red-Gold
  if (kind === 'resistor-10k') return ['#78350f', '#0f172a', '#f97316', '#d97706']; // Brown-Black-Orange-Gold
  return ['#ef4444', '#ef4444', '#78350f', '#d97706']; // 220Ω Red-Red-Brown-Gold
}

function getLedFill(kind: ComponentKind): { off: string; on: string; glow: string } {
  switch (kind) {
    case 'led-green':
      return { off: '#166534', on: '#4ade80', glow: '#22c55e' };
    case 'led-blue':
      return { off: '#1e3a8a', on: '#60a5fa', glow: '#3b82f6' };
    case 'led-yellow':
      return { off: '#854d0e', on: '#fde047', glow: '#facc15' };
    default:
      return { off: '#7f1d1d', on: '#f87171', glow: '#ef4444' };
  }
}

interface WireConnectionAnim {
  glowColor: string;
  coreColor: string;
  ringColor: string;
  tag: string;
}

const PWM_ANIM_PINS = new Set(['D3', 'D5', 'D6', 'D9', 'D10', 'D11']);

function getWireAnimationPalette(
  fromNode: string,
  toNode: string,
  wireColor: string,
): WireConnectionAnim {
  const nodes = [fromNode, toNode];
  const arduinoPins = nodes
    .filter((n) => n.startsWith('arduino:'))
    .map((n) => n.slice('arduino:'.length));

  // Power supply rails (5V / 3.3V / VIN) -> vivid crimson-amber power pulse
  if (arduinoPins.some((p) => p === '5V' || p === '3.3V' || p === 'VIN')) {
    const rail = arduinoPins.find((p) => p === '5V' || p === '3.3V' || p === 'VIN') || '5V';
    return {
      glowColor: '#ef4444',
      coreColor: '#fef2f2',
      ringColor: '#f87171',
      tag: `${rail} PWR`,
    };
  }

  // Ground rails (GND) -> cool cyan-slate ground return pulse (high contrast in both themes)
  if (arduinoPins.some((p) => p.startsWith('GND'))) {
    return {
      glowColor: '#38bdf8',
      coreColor: '#e0f2fe',
      ringColor: '#0ea5e9',
      tag: 'GND',
    };
  }

  // Analog pins (A0–A5) -> warm amber-gold sensor pulse
  if (arduinoPins.some((p) => /^A[0-5]$/.test(p))) {
    const pin = arduinoPins.find((p) => /^A[0-5]$/.test(p)) || 'ANALOG';
    return {
      glowColor: '#f59e0b',
      coreColor: '#fef9c3',
      ringColor: '#fbbf24',
      tag: `${pin} ANALOG`,
    };
  }

  // PWM digital pins -> electric cyan-teal pulse
  if (arduinoPins.some((p) => PWM_ANIM_PINS.has(p))) {
    const pin = arduinoPins.find((p) => PWM_ANIM_PINS.has(p)) || 'PWM';
    return {
      glowColor: wireColor === '#1e293b' ? '#06b6d4' : wireColor,
      coreColor: '#ecfeff',
      ringColor: '#22d3ee',
      tag: `${pin} PWM`,
    };
  }

  // Digital I/O or component-to-component link -> harmonized with selected wire color
  const digitalPin = arduinoPins.find((p) => p.startsWith('D'));
  const brightAccent = wireColor === '#1e293b' ? '#14b8a6' : wireColor;
  return {
    glowColor: brightAccent,
    coreColor: '#ffffff',
    ringColor: brightAccent,
    tag: digitalPin ? `${digitalPin} SIG` : 'LINK OK',
  };
}

interface CurrentFlowPalette {
  stroke: string;
  core: string;
  glow: string;
  arrowFill: string;
  arrowStroke: string;
}

function getCurrentFlowPalette(
  category: FlowCategory,
  mode: CurrentFlowMode,
): CurrentFlowPalette {
  if (category === 'overload') {
    return {
      stroke: '#ef4444',
      core: '#fef08a',
      glow: '#f97316',
      arrowFill: '#fef08a',
      arrowStroke: '#991b1b',
    };
  }
  if (category === 'signal') {
    return {
      stroke: '#38bdf8',
      core: '#e0f2fe',
      glow: '#0284c7',
      arrowFill: '#e0f2fe',
      arrowStroke: '#075985',
    };
  }
  if (mode === 'electrons') {
    return {
      stroke: '#06b6d4',
      core: '#cffafe',
      glow: '#22d3ee',
      arrowFill: '#a5f3fc',
      arrowStroke: '#155e75',
    };
  }
  return {
    stroke: '#f59e0b',
    core: '#fef08a',
    glow: '#fbbf24',
    arrowFill: '#fde047',
    arrowStroke: '#78350f',
  };
}

interface BreadboardCanvasProps {
  lang: Language;
  circuit: CircuitState;
  onChangeCircuit: React.Dispatch<React.SetStateAction<CircuitState>>;
  viewMode: 'breadboard' | 'schematic';
  running: boolean;
  ledD13On: boolean;
  pinModes?: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
  pinValues: Record<string, number>;
  servoAngles: Record<string, number>;
  buzzerTone: { pin: string; freq: number } | null;
  componentPower: Record<string, ComponentPowerState>;
  diagnostics: ElectricalDiagnostic[];
  compactPalette?: boolean;
  svgExternalRef?: React.MutableRefObject<SVGSVGElement | null>;
  draggingLibraryKind?: ComponentKind | null;
  onDropLibraryEnd?: () => void;
}

export function BreadboardCanvas({
  lang,
  circuit,
  onChangeCircuit,
  viewMode,
  running,
  ledD13On,
  pinModes = {},
  pinValues,
  servoAngles,
  buzzerTone,
  componentPower,
  diagnostics,
  compactPalette = false,
  svgExternalRef,
  draggingLibraryKind = null,
  onDropLibraryEnd,
}: BreadboardCanvasProps) {
  const { userSettings } = useApp();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const [wireColor, setWireColor] = useState('#ef4444');
  const [autoColorByPin, setAutoColorByPin] = useState(false);
  const [colorFilterHex, setColorFilterHex] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [wireStart, setWireStart] = useState<string | null>(null);
  const [wiringToolActive, setWiringToolActive] = useState(false);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [dragWire, setDragWire] = useState<DragWireState | null>(null);
  const suppressNextClickRef = useRef(false);
  const [cursorPt, setCursorPt] = useState<{ x: number; y: number } | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [paletteDragKind, setPaletteDragKind] = useState<ComponentKind | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    kind: ComponentKind;
    x: number;
    y: number;
  } | null>(null);
  const activeDragKind = draggingLibraryKind ?? paletteDragKind;

  // Smart context-aware hover tooltips for breadboard components & Arduino UNO
  const [smartTooltipsEnabled, setSmartTooltipsEnabled] = useState(true);
  const [tooltipTarget, setTooltipTarget] = useState<SmartTooltipTarget | null>(null);

  // Live Electric Current Flow visualization state (active while simulation runs)
  const [currentFlowEnabled, setCurrentFlowEnabled] = useState(true);
  const [flowMode, setFlowMode] = useState<CurrentFlowMode>('conventional');
  const systemReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const reducedMotion = userSettings.reducedMotion || systemReducedMotion;

  // Active smooth connection animations keyed by newly established wire ID
  const [wireAnims, setWireAnims] = useState<Record<string, WireConnectionAnim>>({});
  const wireAnimTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = wireAnimTimersRef.current;
    return () => {
      for (const id of timers.values()) {
        window.clearTimeout(id);
      }
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!activeDragKind) {
      setDropPreview(null);
    }
  }, [activeDragKind]);

  useEffect(() => {
    if (!smartTooltipsEnabled || draggingId || wireStart || dragWire || activeDragKind) {
      setTooltipTarget(null);
    }
  }, [smartTooltipsEnabled, draggingId, wireStart, dragWire, activeDragKind]);

  // Interactive CAD-style Workspace Zoom & Pan state (wheel + touch pinch zoom-in/zoom-out)
  const BASE_W = 770;
  const BASE_H = 400;
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4.0;

  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [panMode, setPanMode] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const effectivePanMode = panMode || spaceHeld;

  // Toggleable Snapping Grid Overlay state
  const [snapGridEnabled, setSnapGridEnabled] = useState(true);
  const [gridStep, setGridStep] = useState<10 | 15 | 20>(15);
  const GRID_ORIGIN_X = 360;
  const GRID_ORIGIN_Y = 80;

  const toggleWiringTool = () => {
    soundEngine.playSelect();
    setWiringToolActive((prev) => {
      const next = !prev;
      if (next) {
        setPanMode(false);
        setDraggingId(null);
        setSnapGridEnabled(true);
        setWireStart(null);
        setDragWire(null);
      } else {
        setDragWire(null);
        setHoverNodeId(null);
      }
      return next;
    });
  };

  const snapWireGridPoint = (x: number, y: number): WirePoint => {
    const sx = GRID_ORIGIN_X + Math.round((x - GRID_ORIGIN_X) / gridStep) * gridStep;
    const sy = GRID_ORIGIN_Y + Math.round((y - GRID_ORIGIN_Y) / gridStep) * gridStep;
    return {
      x: Math.max(12, Math.min(758, sx)),
      y: Math.max(12, Math.min(388, sy)),
    };
  };

  const snapCoord = (x: number, y: number) => {
    if (!snapGridEnabled) {
      return {
        x: Math.max(360, Math.min(725, Math.round(x))),
        y: Math.max(80, Math.min(340, Math.round(y))),
      };
    }
    const sx = GRID_ORIGIN_X + Math.round((x - GRID_ORIGIN_X) / gridStep) * gridStep;
    const sy = GRID_ORIGIN_Y + Math.round((y - GRID_ORIGIN_Y) / gridStep) * gridStep;
    return {
      x: Math.max(360, Math.min(725, sx)),
      y: Math.max(80, Math.min(340, sy)),
    };
  };

  const cycleGridStep = () => {
    soundEngine.playSelect();
    setGridStep((prev) => (prev === 10 ? 15 : prev === 15 ? 20 : 10));
  };

  const panDragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
  }>({ active: false, startClientX: 0, startClientY: 0, origPanX: 0, origPanY: 0 });

  const activeTouchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    active: boolean;
    startDist: number;
    startZoom: number;
    worldAnchorX: number;
    worldAnchorY: number;
  }>({ active: false, startDist: 1, startZoom: 1, worldAnchorX: BASE_W / 2, worldAnchorY: BASE_H / 2 });

  const clampZoom = (z: number) =>
    Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(z * 1000) / 1000));

  const clampPan = (panX: number, panY: number, zoom = viewRef.current.zoom) => {
    const panLimitFactor = Math.max(0.75, 1.1 / Math.max(MIN_ZOOM, zoom));
    return {
      panX: Math.max(-BASE_W * panLimitFactor, Math.min(BASE_W * panLimitFactor, panX)),
      panY: Math.max(-BASE_H * panLimitFactor, Math.min(BASE_H * panLimitFactor, panY)),
    };
  };

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: BASE_W / 2, y: BASE_H / 2 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: BASE_W / 2, y: BASE_H / 2 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  // Zoom anchored precisely on a screen coordinate so the pin/wire under the cursor stays fixed
  const zoomAtClientPoint = (targetZoom: number, clientX: number, clientY: number) => {
    const cur = viewRef.current;
    const nextZoom = clampZoom(targetZoom);
    if (Math.abs(nextZoom - cur.zoom) < 0.0005) return;

    const world = toSvgCoords(clientX, clientY);
    const curVbW = BASE_W / cur.zoom;
    const curVbH = BASE_H / cur.zoom;
    const curVbX = (BASE_W - curVbW) / 2 - cur.panX;
    const curVbY = (BASE_H - curVbH) / 2 - cur.panY;

    const relX = (world.x - curVbX) / curVbW;
    const relY = (world.y - curVbY) / curVbH;

    const nextVbW = BASE_W / nextZoom;
    const nextVbH = BASE_H / nextZoom;
    const nextVbX = world.x - relX * nextVbW;
    const nextVbY = world.y - relY * nextVbH;

    const clamped = clampPan(
      (BASE_W - nextVbW) / 2 - nextVbX,
      (BASE_H - nextVbH) / 2 - nextVbY,
    );
    const nextView = { zoom: nextZoom, panX: clamped.panX, panY: clamped.panY };
    viewRef.current = nextView;
    setView(nextView);
  };

  const adjustZoom = (multiplier: number) => {
    soundEngine.playSelect();
    const cur = viewRef.current;
    const nextZoom = clampZoom(cur.zoom * multiplier);
    const clamped = clampPan(cur.panX, cur.panY);
    const nextView = { zoom: nextZoom, panX: clamped.panX, panY: clamped.panY };
    viewRef.current = nextView;
    setView(nextView);
  };

  const resetView = () => {
    soundEngine.playSelect();
    const nextView = { zoom: 1, panX: 0, panY: 0 };
    viewRef.current = nextView;
    setView(nextView);
  };

  // Non-passive cursor-centered mouse-wheel, trackpad pinch & Safari touch-gesture guards
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let deltaPx = e.deltaY;
      if (e.deltaMode === 1) deltaPx *= 28; // line mode (Firefox)
      else if (e.deltaMode === 2) deltaPx *= 180; // page mode
      const clampedDelta = Math.max(-160, Math.min(160, deltaPx));
      const sensitivity = e.ctrlKey ? 0.0085 : 0.0022;
      const factor = Math.exp(-clampedDelta * sensitivity);
      zoomAtClientPoint(viewRef.current.zoom * factor, e.clientX, e.clientY);
    };
    const onTouchMoveGuard = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };
    const onGesturePrevent = (e: Event) => {
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMoveGuard, { passive: false });
    el.addEventListener('gesturestart', onGesturePrevent);
    el.addEventListener('gesturechange', onGesturePrevent);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMoveGuard);
      el.removeEventListener('gesturestart', onGesturePrevent);
      el.removeEventListener('gesturechange', onGesturePrevent);
    };
  }, []);

  // Optional Spacebar temporary pan hold while canvas is focused/hovered
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement === canvasWrapRef.current) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const vbW = BASE_W / view.zoom;
  const vbH = BASE_H / view.zoom;
  const vbX = (BASE_W - vbW) / 2 - view.panX;
  const vbY = (BASE_H - vbH) / 2 - view.panY;

  // Build quick lookup map of every connectable pin & breadboard hole coordinate
  const buildPinCoordsMap = (components: PlacedComponent[]) => {
    const map = new Map<string, { x: number; y: number }>();
    ARDUINO_PINS.forEach((p) => map.set(`arduino:${p.id}`, { x: p.x, y: p.y }));
    components.forEach((c) => {
      const defs = COMPONENT_PINS[c.kind] || [];
      defs.forEach((d) => {
        map.set(`comp:${c.id}:${d.id}`, { x: c.x + d.dx, y: c.y + d.dy });
      });
    });
    BREADBOARD_POINTS.forEach((bp) => {
      map.set(bp.id, { x: bp.x, y: bp.y });
    });
    return map;
  };

  const pinCoords = useMemo(
    () => buildPinCoordsMap(circuit.components),
    [circuit.components],
  );

  // Track whether wires are currently auto-routed cleanly
  const isAutoRouted = useMemo(() => {
    if (circuit.wires.length === 0) return false;
    return circuit.wires.every((w) => {
      if (!w.waypoints || w.waypoints.length < 2) return false;
      const p1 = pinCoords.get(w.from);
      const p2 = pinCoords.get(w.to);
      if (!p1 || !p2) return false;
      const first = w.waypoints[0];
      const last = w.waypoints[w.waypoints.length - 1];
      return (
        Math.hypot(first.x - p1.x, first.y - p1.y) < 1.5 &&
        Math.hypot(last.x - p2.x, last.y - p2.y) < 1.5
      );
    });
  }, [circuit.wires, pinCoords]);

  const autoRouteStickyRef = useRef(false);
  useEffect(() => {
    if (isAutoRouted) {
      autoRouteStickyRef.current = true;
    } else if (circuit.wires.length === 0) {
      autoRouteStickyRef.current = false;
    }
  }, [isAutoRouted, circuit.wires.length]);

  const handleAutoRoute = () => {
    if (circuit.wires.length === 0) return;
    if (isAutoRouted) {
      // Toggle cleanly back to standard curved jumper wires
      autoRouteStickyRef.current = false;
      soundEngine.playSelect();
      onChangeCircuit((prev) => ({
        ...prev,
        wires: prev.wires.map(({ waypoints: _wp, ...rest }) => rest),
      }));
      return;
    }
    autoRouteStickyRef.current = true;
    soundEngine.playWireSnap();
    onChangeCircuit((prev) => {
      const coords = buildPinCoordsMap(prev.components);
      return {
        ...prev,
        wires: autoRouteCircuitWires(prev.components, prev.wires, coords),
      };
    });
  };

  const formatNodeLabel = (nodeId: string): string => {
    if (nodeId.startsWith('arduino:')) {
      return `UNO ${nodeId.slice(8)}`;
    }
    if (nodeId.startsWith('comp:')) {
      const parts = nodeId.split(':');
      const comp = circuit.components.find((c) => c.id === parts[1]);
      const pinDef = comp ? (COMPONENT_PINS[comp.kind] || []).find((p) => p.id === parts[2]) : undefined;
      return `${comp?.label || comp?.kind || parts[1]} · ${pinDef?.label || parts[2]}`;
    }
    const bbPt = BREADBOARD_POINT_MAP.get(nodeId);
    if (bbPt) {
      return `BB ${bbPt.label}`;
    }
    return nodeId;
  };

  // Prioritize Arduino & component pins before breadboard holes for crisp magnetic snapping
  const findNearestConnectableNode = (
    x: number,
    y: number,
    excludeNodeId?: string,
    maxDist = 13,
  ): { id: string; pt: WirePoint } | null => {
    let bestPin: { id: string; pt: WirePoint; dist: number } | null = null;
    for (const p of ARDUINO_PINS) {
      const id = `arduino:${p.id}`;
      if (id === excludeNodeId) continue;
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist <= maxDist && (!bestPin || dist < bestPin.dist)) {
        bestPin = { id, pt: { x: p.x, y: p.y }, dist };
      }
    }
    for (const comp of circuit.components) {
      const defs = COMPONENT_PINS[comp.kind] || [];
      for (const d of defs) {
        const id = `comp:${comp.id}:${d.id}`;
        if (id === excludeNodeId) continue;
        const px = comp.x + d.dx;
        const py = comp.y + d.dy;
        const dist = Math.hypot(px - x, py - y);
        if (dist <= maxDist && (!bestPin || dist < bestPin.dist)) {
          bestPin = { id, pt: { x: px, y: py }, dist };
        }
      }
    }
    if (bestPin) return { id: bestPin.id, pt: bestPin.pt };

    if (viewMode === 'breadboard') {
      const bbMaxDist = Math.min(maxDist, 10.5);
      let bestBb: { id: string; pt: WirePoint; dist: number } | null = null;
      for (const bp of BREADBOARD_POINTS) {
        if (bp.id === excludeNodeId) continue;
        const dist = Math.hypot(bp.x - x, bp.y - y);
        if (dist <= bbMaxDist && (!bestBb || dist < bestBb.dist)) {
          bestBb = { id: bp.id, pt: { x: bp.x, y: bp.y }, dist };
        }
      }
      if (bestBb) return { id: bestBb.id, pt: bestBb.pt };
    }
    return null;
  };

  const buildDragWireWaypoints = (dw: DragWireState): WirePoint[] => {
    const endPt = (dw.targetNodeId && pinCoords.get(dw.targetNodeId)) || dw.cursorSnapped;
    const raw: WirePoint[] = [...dw.corners];
    const last = raw[raw.length - 1] ?? dw.startPt;
    if (Math.abs(last.x - endPt.x) > 0.5 && Math.abs(last.y - endPt.y) > 0.5) {
      if (dw.axis === 'v') {
        raw.push({ x: last.x, y: endPt.y });
      } else {
        raw.push({ x: endPt.x, y: last.y });
      }
    }
    raw.push(endPt);
    const cleaned = simplifyOrthogonalPoints(raw);
    if (cleaned.length < 2) {
      return [dw.startPt, endPt];
    }
    cleaned[0] = dw.startPt;
    cleaned[cleaned.length - 1] = endPt;
    return cleaned;
  };

  const commitWireConnection = (
    fromNode: string,
    toNode: string,
    customWaypoints?: WirePoint[],
  ) => {
    if (fromNode === toNode) return;
    const resolvedColor = autoColorByPin
      ? (getSmartWireColorForNode(fromNode) ?? getSmartWireColorForNode(toNode) ?? wireColor)
      : wireColor;
    const newWire: WireConnection = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: fromNode,
      to: toNode,
      color: resolvedColor,
      ...(customWaypoints && customWaypoints.length >= 2 ? { waypoints: customWaypoints } : {}),
    };
    const animStyle = getWireAnimationPalette(newWire.from, newWire.to, newWire.color);
    setWireAnims((prev) => ({ ...prev, [newWire.id]: animStyle }));
    const timerId = window.setTimeout(() => {
      wireAnimTimersRef.current.delete(newWire.id);
      setWireAnims((prev) => {
        if (!(newWire.id in prev)) return prev;
        const next = { ...prev };
        delete next[newWire.id];
        return next;
      });
    }, 1450);
    wireAnimTimersRef.current.set(newWire.id, timerId);

    onChangeCircuit((prev) => {
      const nextWires = [...prev.wires, newWire];
      if (!customWaypoints && autoRouteStickyRef.current) {
        const coords = buildPinCoordsMap(prev.components);
        return {
          ...prev,
          wires: autoRouteCircuitWires(prev.components, nextWires, coords),
        };
      }
      return {
        ...prev,
        wires: nextWires,
      };
    });
    soundEngine.playWireSnap();
    setWireStart(null);
  };

  const handlePinClick = (nodeId: string, e: React.MouseEvent) => {
    if (effectivePanMode) return;
    e.stopPropagation();
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (!wireStart) {
      if (autoColorByPin) {
        const smart = getSmartWireColorForNode(nodeId);
        if (smart) setWireColor(smart);
      }
      setSelectedWireId(null);
      setWireStart(nodeId);
      soundEngine.playSelect();
      return;
    }
    if (wireStart === nodeId) {
      setWireStart(null);
      return;
    }
    commitWireConnection(wireStart, nodeId);
  };

  const handleRecolorWire = (wireId: string, newColor: string) => {
    soundEngine.playSelect();
    onChangeCircuit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === wireId ? { ...w, color: newColor } : w)),
    }));
  };

  const handleDeleteWire = (wireId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundEngine.playSelect();
    const existingTimer = wireAnimTimersRef.current.get(wireId);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      wireAnimTimersRef.current.delete(wireId);
    }
    setWireAnims((prev) => {
      if (!(wireId in prev)) return prev;
      const next = { ...prev };
      delete next[wireId];
      return next;
    });
    setSelectedWireId((prev) => (prev === wireId ? null : prev));
    onChangeCircuit((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
  };

  const placeComponentAt = (kind: ComponentKind, rawX: number, rawY: number, isDrop = false) => {
    if (isDrop) {
      soundEngine.playWireSnap();
    } else {
      soundEngine.playSelect();
    }
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
    const snapped = snapCoord(rawX, rawY);
    const comp: PlacedComponent = {
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      kind,
      x: snapped.x,
      y: snapped.y,
      label: kind === 'multimeter' ? 'DMM' : kind.toUpperCase().replace('-', ' '),
      value: defaultVal,
    };
    onChangeCircuit((prev) => ({
      ...prev,
      components: [...prev.components, comp],
    }));
    setSelectedCompId(comp.id);
  };

  const handleAddComponent = (kind: ComponentKind) => {
    const offset = (circuit.components.length % 5) * 28;
    const rawX = 465 + offset;
    const rawY = 140 + (circuit.components.length % 3) * 60;
    placeComponentAt(kind, rawX, rawY, false);
  };

  const isComponentDragEvent = (e: React.DragEvent): boolean => {
    if (activeDragKind) return true;
    const types = Array.from(e.dataTransfer?.types || []);
    return types.includes(ARDUNOLAB_COMPONENT_MIME) || types.includes('text/plain');
  };

  const handleCanvasDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isComponentDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isComponentDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const pos = toSvgCoords(e.clientX, e.clientY);
    const snapped = snapCoord(pos.x, pos.y);
    const kind = activeDragKind || 'led-red';
    setDropPreview((prev) =>
      prev && prev.kind === kind && prev.x === snapped.x && prev.y === snapped.y
        ? prev
        : { kind, x: snapped.x, y: snapped.y },
    );
  };

  const handleCanvasDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && e.currentTarget.contains(nextTarget)) return;
    setDropPreview(null);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isComponentDragEvent(e)) return;
    e.preventDefault();
    const rawKind =
      e.dataTransfer.getData(ARDUNOLAB_COMPONENT_MIME) ||
      e.dataTransfer.getData('text/plain') ||
      activeDragKind ||
      '';
    setDropPreview(null);
    setPaletteDragKind(null);
    onDropLibraryEnd?.();
    if (!(rawKind in COMPONENT_PINS)) return;
    const pos = toSvgCoords(e.clientX, e.clientY);
    placeComponentAt(rawKind as ComponentKind, pos.x, pos.y, true);
  };

  const handleRemoveComponent = (compId: string) => {
    soundEngine.playSelect();
    onChangeCircuit((prev) => ({
      components: prev.components.filter((c) => c.id !== compId),
      wires: prev.wires.filter(
        (w) =>
          !w.from.startsWith(`comp:${compId}:`) &&
          !w.to.startsWith(`comp:${compId}:`),
      ),
    }));
    if (selectedCompId === compId) setSelectedCompId(null);
  };

  const updateComponentValue = (compId: string, value: number) => {
    onChangeCircuit((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === compId ? { ...c, value } : c,
      ),
    }));
  };

  const beginPinchGesture = () => {
    const entries = Array.from(activeTouchPointersRef.current.entries());
    if (entries.length < 2) return;
    const [[id1, p1], [id2, p2]] = entries;
    const dist = Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y));
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const anchor = toSvgCoords(midX, midY);

    try {
      svgRef.current?.setPointerCapture?.(id1);
      svgRef.current?.setPointerCapture?.(id2);
    } catch {
      // ignore if pointer is no longer active
    }

    panDragRef.current.active = false;
    setDraggingId(null);
    pinchStateRef.current = {
      active: true,
      startDist: dist,
      startZoom: viewRef.current.zoom,
      worldAnchorX: anchor.x,
      worldAnchorY: anchor.y,
    };
  };

  const handleSvgPointerDownCapture = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'touch') return;
    activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activeTouchPointersRef.current.size >= 2) {
      beginPinchGesture();
    }
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pinchStateRef.current.active || activeTouchPointersRef.current.size >= 2) {
      (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
      return;
    }
    // Interactive Wiring Tool: click-and-drag from any pin or breadboard hole with snap-to-grid
    if (wiringToolActive && !effectivePanMode && e.button === 0) {
      const pos = toSvgCoords(e.clientX, e.clientY);
      const found = findNearestConnectableNode(pos.x, pos.y, undefined, 13);
      if (found) {
        e.stopPropagation();
        try {
          (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
        } catch {
          // ignore if capture is unavailable
        }
        setTooltipTarget(null);
        setSelectedWireId(null);
        if (autoColorByPin) {
          const smart = getSmartWireColorForNode(found.id);
          if (smart) setWireColor(smart);
        }
        setDragWire({
          fromNodeId: found.id,
          startPt: found.pt,
          corners: [found.pt],
          axis: null,
          cursorSnapped: found.pt,
          targetNodeId: null,
          hasDragged: false,
          pointerId: e.pointerId,
        });
        setHoverNodeId(found.id);
        soundEngine.playSelect();
        return;
      }
      // Keep left-click canvas stable while aiming in Wiring Tool mode
      return;
    }
    // Allow panning when Pan tool is active, middle mouse button, or dragging empty canvas/board surface
    const targetTag = (e.target as Element)?.getAttribute?.('data-pan-surface');
    if (effectivePanMode || e.button === 1 || targetTag === 'true') {
      panDragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origPanX: viewRef.current.panX,
        origPanY: viewRef.current.panY,
      };
      (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
    }
  };

  const handleSvgDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (wiringToolActive) return;
    const targetTag = (e.target as Element)?.getAttribute?.('data-pan-surface');
    if (targetTag !== 'true') return;
    soundEngine.playSelect();
    if (viewRef.current.zoom > 1.25) {
      resetView();
    } else {
      zoomAtClientPoint(2.2, e.clientX, e.clientY);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && activeTouchPointersRef.current.has(e.pointerId)) {
      activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchStateRef.current.active && activeTouchPointersRef.current.size >= 2) {
        const pts = Array.from(activeTouchPointersRef.current.values());
        const [p1, p2] = pts;
        const svg = svgRef.current;
        const rect = svg?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          const dist = Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y));
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          const nextZoom = clampZoom(
            pinchStateRef.current.startZoom * (dist / pinchStateRef.current.startDist),
          );
          const nextVbW = BASE_W / nextZoom;
          const nextVbH = BASE_H / nextZoom;

          // Match preserveAspectRatio="xMidYMid meet" so 2-finger midpoint stays locked to the exact pin/component
          const scale = Math.max(nextVbW / rect.width, nextVbH / rect.height);
          const renderedW = nextVbW / scale;
          const renderedH = nextVbH / scale;
          const offsetX = (rect.width - renderedW) / 2;
          const offsetY = (rect.height - renderedH) / 2;
          const relX = (midX - rect.left - offsetX) / renderedW;
          const relY = (midY - rect.top - offsetY) / renderedH;

          const nextVbX = pinchStateRef.current.worldAnchorX - relX * nextVbW;
          const nextVbY = pinchStateRef.current.worldAnchorY - relY * nextVbH;

          const clamped = clampPan(
            (BASE_W - nextVbW) / 2 - nextVbX,
            (BASE_H - nextVbH) / 2 - nextVbY,
            nextZoom,
          );
          const nextView = {
            zoom: nextZoom,
            panX: clamped.panX,
            panY: clamped.panY,
          };
          viewRef.current = nextView;
          setView(nextView);
        }
        return;
      }
    }

    if (panDragRef.current.active) {
      const svg = svgRef.current;
      const rect = svg?.getBoundingClientRect();
      const curVbW = BASE_W / viewRef.current.zoom;
      const curVbH = BASE_H / viewRef.current.zoom;
      // Use uniform meet aspect scale so horizontal & vertical pan stay 1:1 with pointer movement
      const scale =
        rect && rect.width > 0 && rect.height > 0
          ? Math.max(curVbW / rect.width, curVbH / rect.height)
          : 1;
      const dx = (e.clientX - panDragRef.current.startClientX) * scale;
      const dy = (e.clientY - panDragRef.current.startClientY) * scale;
      const clamped = clampPan(
        panDragRef.current.origPanX + dx,
        panDragRef.current.origPanY + dy,
      );
      const nextView = {
        zoom: viewRef.current.zoom,
        panX: clamped.panX,
        panY: clamped.panY,
      };
      viewRef.current = nextView;
      setView(nextView);
      return;
    }

    const pos = toSvgCoords(e.clientX, e.clientY);

    // Live click-and-drag grid-snapped wire path drawing
    if (dragWire) {
      const target = findNearestConnectableNode(pos.x, pos.y, dragWire.fromNodeId, 13);
      const snapped = target ? target.pt : snapWireGridPoint(pos.x, pos.y);
      setHoverNodeId(target?.id ?? null);
      setDragWire((prev) => {
        if (!prev) return null;
        const hasDragged =
          prev.hasDragged || Math.hypot(pos.x - prev.startPt.x, pos.y - prev.startPt.y) >= 6;
        let corners = [...prev.corners];
        let axis = prev.axis;
        const anchor = corners[corners.length - 1] ?? prev.startPt;
        const dx = snapped.x - anchor.x;
        const dy = snapped.y - anchor.y;
        const turnThreshold = Math.max(10, gridStep);
        const backtrackRadius = Math.max(8, gridStep * 0.75);

        if (axis === null) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= Math.max(8, gridStep * 0.6)) {
            axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
          }
        } else if (axis === 'h') {
          if (
            corners.length > 1 &&
            Math.hypot(snapped.x - corners[corners.length - 2].x, snapped.y - corners[corners.length - 2].y) <
              backtrackRadius
          ) {
            corners.pop();
            axis = 'v';
          } else if (Math.abs(dy) >= turnThreshold && Math.abs(dx) >= 4) {
            const turnPt: WirePoint = { x: snapped.x, y: anchor.y };
            if (Math.hypot(turnPt.x - anchor.x, turnPt.y - anchor.y) >= 4) {
              corners.push(turnPt);
            }
            axis = 'v';
          }
        } else if (axis === 'v') {
          if (
            corners.length > 1 &&
            Math.hypot(snapped.x - corners[corners.length - 2].x, snapped.y - corners[corners.length - 2].y) <
              backtrackRadius
          ) {
            corners.pop();
            axis = 'h';
          } else if (Math.abs(dx) >= turnThreshold && Math.abs(dy) >= 4) {
            const turnPt: WirePoint = { x: anchor.x, y: snapped.y };
            if (Math.hypot(turnPt.x - anchor.x, turnPt.y - anchor.y) >= 4) {
              corners.push(turnPt);
            }
            axis = 'h';
          }
        }

        if (corners.length > 14) {
          corners = simplifyOrthogonalPoints(corners);
        }

        return {
          ...prev,
          corners,
          axis,
          cursorSnapped: snapped,
          targetNodeId: target?.id ?? null,
          hasDragged,
        };
      });
      return;
    }

    if ((wiringToolActive || wireStart) && !effectivePanMode && !draggingId) {
      const hovered = findNearestConnectableNode(pos.x, pos.y, wireStart ?? undefined, 12);
      setHoverNodeId(hovered?.id ?? null);
      if (wireStart) {
        setCursorPt(
          hovered
            ? hovered.pt
            : wiringToolActive
              ? snapWireGridPoint(pos.x, pos.y)
              : pos,
        );
      }
    } else if (wireStart) {
      setCursorPt(pos);
    }

    if (draggingId && !effectivePanMode) {
      const snapped = snapCoord(pos.x, pos.y);
      onChangeCircuit((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === draggingId ? { ...c, x: snapped.x, y: snapped.y } : c,
        ),
        // Clear cached waypoints on attached wires while dragging so wires stay attached smoothly
        wires: prev.wires.map((w) =>
          w.waypoints &&
          (w.from.startsWith(`comp:${draggingId}:`) || w.to.startsWith(`comp:${draggingId}:`))
            ? { id: w.id, from: w.from, to: w.to, color: w.color }
            : w,
        ),
      }));
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      activeTouchPointersRef.current.delete(e.pointerId);
      if (activeTouchPointersRef.current.size < 2) {
        pinchStateRef.current.active = false;
      }
      if (activeTouchPointersRef.current.size === 1) {
        const remaining = Array.from(activeTouchPointersRef.current.values())[0];
        panDragRef.current = {
          active: true,
          startClientX: remaining.x,
          startClientY: remaining.y,
          origPanX: viewRef.current.panX,
          origPanY: viewRef.current.panY,
        };
        return;
      }
    }
    if (dragWire) {
      try {
        (e.currentTarget as SVGSVGElement).releasePointerCapture?.(dragWire.pointerId);
      } catch {
        // ignore if already released
      }
      if (dragWire.targetNodeId && dragWire.targetNodeId !== dragWire.fromNodeId) {
        const waypoints = buildDragWireWaypoints(dragWire);
        commitWireConnection(dragWire.fromNodeId, dragWire.targetNodeId, waypoints);
        suppressNextClickRef.current = true;
      } else if (!dragWire.hasDragged) {
        // Short click fallback: start or finish click-to-wire seamlessly
        if (wireStart && wireStart !== dragWire.fromNodeId) {
          commitWireConnection(wireStart, dragWire.fromNodeId);
        } else {
          setWireStart((prev) => (prev === dragWire.fromNodeId ? null : dragWire.fromNodeId));
        }
        suppressNextClickRef.current = true;
      } else {
        suppressNextClickRef.current = true;
      }
      setDragWire(null);
      return;
    }
    if (panDragRef.current.active) {
      panDragRef.current.active = false;
    }
    if (draggingId) {
      setDraggingId(null);
      // Automatically re-optimize routed wire paths after dropping a dragged component
      if (autoRouteStickyRef.current) {
        onChangeCircuit((prev) => {
          const coords = buildPinCoordsMap(prev.components);
          return {
            ...prev,
            wires: autoRouteCircuitWires(prev.components, prev.wires, coords),
          };
        });
      }
    }
  };

  const buildWirePath = (x1: number, y1: number, x2: number, y2: number): string => {
    if (viewMode === 'schematic') {
      const midX = Math.round((x1 + x2) / 2);
      return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }
    const dx = Math.abs(x2 - x1);
    const lift = Math.min(85, Math.max(24, dx * 0.28));
    const cx1 = x1 + (x2 >= x1 ? dx * 0.25 : -dx * 0.25);
    const cy1 = y1 - lift;
    const cx2 = x2 - (x2 >= x1 ? dx * 0.25 : -dx * 0.25);
    const cy2 = y2 - lift;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  // Compute real-time directional electric current flows while simulation is running
  const currentFlowMap = useMemo(
    () =>
      computeCircuitCurrentFlow({
        circuit,
        running: running && currentFlowEnabled,
        pinValues,
        pinModes,
        componentPower,
        buzzerTone,
        servoAngles,
      }),
    [
      circuit,
      running,
      currentFlowEnabled,
      pinValues,
      pinModes,
      componentPower,
      buzzerTone,
      servoAngles,
    ],
  );

  // Compute live readings for any placed Virtual Digital Multimeters (V / mA / Ω)
  const multimeterReadings = useMemo(
    () =>
      computeMultimeterReadings({
        circuit,
        running,
        pinValues,
        pinModes,
        componentPower,
        buzzerTone,
        servoAngles,
      }),
    [circuit, running, pinValues, pinModes, componentPower, buzzerTone, servoAngles],
  );

  // Interactive sensor/input & test instrument components present on the breadboard
  const interactiveInputs = circuit.components.filter((c) =>
    ['button', 'potentiometer', 'ldr', 'ultrasonic', 'temp-sensor', 'multimeter'].includes(c.kind),
  );

  // Overloaded components & global rail short-circuit detection
  const overloadedEntries = useMemo(() => {
    const list: Array<{ comp: PlacedComponent; overload: ComponentOverloadInfo }> = [];
    for (const comp of circuit.components) {
      const ov = componentPower[comp.id]?.overload;
      if (ov) {
        list.push({ comp, overload: ov });
      }
    }
    return list;
  }, [circuit.components, componentPower]);

  const railShortDiag = useMemo(
    () => diagnostics.find((d) => d.code === 'SHORT_CIRCUIT' && !d.componentId) || null,
    [diagnostics],
  );

  // Play crisp warning tone once when a new overload condition appears (never spams)
  const prevOverloadKeysRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentKeys = new Set<string>(overloadedEntries.map((e) => `${e.comp.id}:${e.overload.reason}`));
    if (railShortDiag) currentKeys.add('rail:short');
    if (prevOverloadKeysRef.current === null) {
      prevOverloadKeysRef.current = currentKeys;
      return;
    }
    let hasNew = false;
    for (const key of currentKeys) {
      if (!prevOverloadKeysRef.current.has(key)) {
        hasNew = true;
        break;
      }
    }
    prevOverloadKeysRef.current = currentKeys;
    if (hasNew) {
      soundEngine.playError();
    }
  }, [overloadedEntries, railShortDiag]);

  const activeOverloadItem = useMemo(() => {
    if (overloadedEntries.length === 0) return null;
    if (selectedCompId) {
      const match = overloadedEntries.find((e) => e.comp.id === selectedCompId);
      if (match) return match;
    }
    return overloadedEntries[0];
  }, [overloadedEntries, selectedCompId]);

  const getOverloadReasonLabel = (reason: ComponentOverloadInfo['reason']): string => {
    switch (reason) {
      case 'overvoltage':
        return tLoc(translations.simulator.overloadReasonOvervoltage, lang);
      case 'overcurrent':
        return tLoc(translations.simulator.overloadReasonOvercurrent, lang);
      case 'overpower':
        return tLoc(translations.simulator.overloadReasonOverpower, lang);
      case 'reverse-polarity':
        return tLoc(translations.simulator.overloadReasonReverse, lang);
      default:
        return tLoc(translations.simulator.overloadReasonShort, lang);
    }
  };

  const primaryDiag = diagnostics[0];
  const selectedWire = selectedWireId
    ? circuit.wires.find((w) => w.id === selectedWireId) ?? null
    : null;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0D1424] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Wiring Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
        {/* Wiring Tool Toggle & Wire Color-Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Click-and-Drag Wiring Tool Toggle (Shortcut: W) */}
          <button
            type="button"
            aria-pressed={wiringToolActive}
            onClick={toggleWiringTool}
            title={tLoc(translations.simulator.wiringToolTooltip, lang)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer',
              wiringToolActive
                ? 'bg-[#00878F] text-white border-[#00878F] shadow-sm hover:bg-[#00737a]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#00878F] hover:text-[#00878F] dark:hover:text-[#22c6cf]',
            )}
          >
            <Cable className="w-3.5 h-3.5 shrink-0" />
            <span>{tLoc(translations.simulator.wiringTool, lang)}</span>
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full border border-white/80 dark:border-slate-900/80 shrink-0"
              style={{ backgroundColor: wireColor }}
            />
            <kbd
              className={cn(
                'hidden sm:inline-block px-1 rounded text-[10px] font-mono leading-tight',
                wiringToolActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300',
              )}
            >
              W
            </kbd>
          </button>

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Dedicated Jumper Wire Color-Selector Tool (9 standard colors + custom + debug filter) */}
          <WireColorSelector
            lang={lang}
            wireColor={wireColor}
            onSelectColor={(hex) => {
              setWireColor(hex);
              if (selectedWire) {
                handleRecolorWire(selectedWire.id, hex);
              }
            }}
            autoColorByPin={autoColorByPin}
            onToggleAutoColor={() => setAutoColorByPin((v) => !v)}
            wires={circuit.wires}
            colorFilterHex={colorFilterHex}
            onChangeColorFilter={setColorFilterHex}
            wiringToolActive={wiringToolActive}
          />

          {(wireStart || dragWire) && (
            <button
              type="button"
              onClick={() => {
                setWireStart(null);
                setDragWire(null);
              }}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline ms-1 whitespace-nowrap cursor-pointer"
            >
              {tLoc(translations.simulator.wiringToolCancel, lang)}
            </button>
          )}
        </div>

        {/* Electrical Safety Diagnostic Indicator (Icon + Explicit Text, never hue-only) */}
        <div className="flex items-center gap-2">
          {primaryDiag && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                primaryDiag.severity === 'error'
                  ? 'text-rose-600 dark:text-rose-400'
                  : primaryDiag.severity === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {primaryDiag.severity === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[260px]">
                {tLoc(primaryDiag.message, lang)}
              </span>
            </div>
          )}

          {selectedCompId && (
            <button
              type="button"
              onClick={() => handleRemoveComponent(selectedCompId)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={circuit.wires.length === 0}
            aria-pressed={isAutoRouted}
            onClick={handleAutoRoute}
            title={
              isAutoRouted
                ? tLoc(translations.simulator.autoRouteCurvedTooltip, lang)
                : tLoc(translations.simulator.autoRouteTooltip, lang)
            }
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              isAutoRouted
                ? 'bg-[#00878F] text-white border-[#00878F] shadow-sm hover:bg-[#00737a]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#00878F] hover:text-[#00878F] dark:hover:text-[#22c6cf]',
            )}
          >
            <Route className="w-3.5 h-3.5 shrink-0" />
            <span>{tLoc(translations.simulator.autoRoute, lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              autoRouteStickyRef.current = false;
              setSelectedWireId(null);
              setColorFilterHex(null);
              soundEngine.playSelect();
              onChangeCircuit((prev) => ({ ...prev, wires: [] }));
            }}
            title={tLoc(translations.simulator.clearWires, lang)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Unplug className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {tLoc(translations.simulator.clearWires, lang)}
            </span>
          </button>
        </div>
      </div>

      {/* Contextual Selected-Wire Recolor & Delete Strip (click any wire to change its color or remove it) */}
      {selectedWire && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full border border-slate-400/70 shrink-0"
              style={{ backgroundColor: selectedWire.color }}
            />
            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
              {formatNodeLabel(selectedWire.from)} ⇄ {formatNodeLabel(selectedWire.to)}
            </span>
            <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {tLoc(translations.simulator.wireSelectedRecolor, lang)}:
            </span>
            <div className="flex items-center gap-1">
              {WIRE_COLORS.map((wc) => {
                const isCurrent = selectedWire.color.toLowerCase() === wc.hex.toLowerCase();
                return (
                  <button
                    key={wc.id}
                    type="button"
                    title={`${tLoc(wc.name, lang)} · ${tLoc(wc.role, lang)}`}
                    onClick={() => {
                      handleRecolorWire(selectedWire.id, wc.hex);
                      setWireColor(wc.hex);
                    }}
                    className={cn(
                      'w-4 h-4 rounded-full border transition-transform cursor-pointer',
                      isCurrent
                        ? 'scale-120 border-[#00878F] ring-2 ring-[#00878F]/40'
                        : 'border-slate-400/60 hover:scale-110',
                    )}
                    style={{ backgroundColor: wc.hex }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleDeleteWire(selectedWire.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{tLoc(translations.simulator.wireDeleteSelected, lang)}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedWireId(null)}
              aria-label="Close"
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Component Overload Warning Strip (visible when any part exceeds V/mA/mW ratings or rail shorts) */}
      {(overloadedEntries.length > 0 || railShortDiag) && (
        <div
          role="alert"
          aria-live="assertive"
          className="px-3 py-2 border-b border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-100"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-600 text-white shrink-0 shadow-sm">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-tight">
                  {tLoc(translations.simulator.overloadBannerTitle, lang)}
                </p>
                {railShortDiag && (
                  <p className="text-[11px] font-medium text-rose-700 dark:text-rose-200 mt-0.5">
                    {tLoc(railShortDiag.message, lang)}
                  </p>
                )}
              </div>
            </div>

            {overloadedEntries.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {overloadedEntries.map(({ comp, overload }) => {
                  const isFocused = activeOverloadItem?.comp.id === comp.id;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelect();
                        setSelectedCompId(comp.id);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer',
                        isFocused
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-white/90 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900',
                      )}
                    >
                      <Flame className="w-3 h-3 shrink-0" />
                      <span>{comp.label || comp.kind}</span>
                      <span className="font-mono tabular-nums opacity-90">
                        {overload.measuredLabel} &gt; {overload.ratedMaxLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeOverloadItem && (
            <div className="mt-1.5 pt-1.5 border-t border-rose-500/25 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-bold">
                  {getOverloadReasonLabel(activeOverloadItem.overload.reason)}:
                </span>
                <span>{tLoc(activeOverloadItem.overload.summary, lang)}</span>
              </div>
              <div className="text-rose-700 dark:text-amber-300 font-medium">
                <span className="font-bold me-1">
                  {tLoc(translations.simulator.overloadFix, lang)}:
                </span>
                <span>{tLoc(activeOverloadItem.overload.fixHint, lang)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Interactive SVG Canvas (LTR coordinate frame for accurate hardware geometry) */}
      <div
        ref={canvasWrapRef}
        tabIndex={0}
        onDragEnter={handleCanvasDragEnter}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        onKeyDown={(e) => {
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            adjustZoom(1.22);
          } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            adjustZoom(1 / 1.22);
          } else if (e.key === '0') {
            e.preventDefault();
            resetView();
          } else if (e.key === 'g' || e.key === 'G') {
            e.preventDefault();
            soundEngine.playSelect();
            setSnapGridEnabled((s) => !s);
          } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            handleAutoRoute();
          } else if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            soundEngine.playSelect();
            setSmartTooltipsEnabled((v) => !v);
          } else if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            soundEngine.playSelect();
            setCurrentFlowEnabled((v) => !v);
          } else if (e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            toggleWiringTool();
          } else if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const colorIdx = Number(e.key) - 1;
            const picked = WIRE_COLORS[colorIdx];
            if (picked) {
              e.preventDefault();
              soundEngine.playSelect();
              setWireColor(picked.hex);
              if (selectedWireId) {
                handleRecolorWire(selectedWireId, picked.hex);
              }
            }
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedWireId) {
              e.preventDefault();
              handleDeleteWire(selectedWireId);
            } else if (selectedCompId) {
              e.preventDefault();
              handleRemoveComponent(selectedCompId);
            }
          } else if (e.key === 'Escape') {
            if (dragWire || wireStart) {
              e.preventDefault();
              soundEngine.playSelect();
              setDragWire(null);
              setWireStart(null);
            } else if (selectedWireId) {
              e.preventDefault();
              soundEngine.playSelect();
              setSelectedWireId(null);
            } else if (colorFilterHex) {
              e.preventDefault();
              soundEngine.playSelect();
              setColorFilterHex(null);
            } else if (wiringToolActive) {
              e.preventDefault();
              soundEngine.playSelect();
              setWiringToolActive(false);
              setHoverNodeId(null);
            }
          }
        }}
        className={cn(
          'relative flex-1 min-h-[340px] w-full overflow-hidden select-none focus:outline-none transition-shadow',
          activeDragKind && 'ring-2 ring-inset ring-[#00878F]/50',
        )}
        dir="ltr"
      >
        {/* Floating Live Current Flow Direction HUD (visible while simulation is running) */}
        {running && currentFlowEnabled && (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#111827]/95 px-2 py-1.5 shadow-md max-w-[calc(100%-220px)]"
          >
            {/* Conventional (+ -> -) vs Electron Flow (- -> +) Segmented Switch */}
            <div className="flex items-center rounded-md bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                aria-pressed={flowMode === 'conventional'}
                onClick={() => {
                  soundEngine.playSelect();
                  setFlowMode('conventional');
                }}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                  flowMode === 'conventional'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                {tLoc(translations.simulator.currentConventional, lang)}
              </button>
              <button
                type="button"
                aria-pressed={flowMode === 'electrons'}
                onClick={() => {
                  soundEngine.playSelect();
                  setFlowMode('electrons');
                }}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                  flowMode === 'electrons'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                {tLoc(translations.simulator.currentElectrons, lang)}
              </button>
            </div>

            {/* Quiet Unboxed Telemetry & Directional Legend */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {currentFlowMap.activeWireCount > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span
                      aria-hidden="true"
                      className={
                        flowMode === 'electrons'
                          ? 'text-cyan-500 font-bold'
                          : 'text-amber-500 font-bold'
                      }
                    >
                      ▸
                    </span>
                    <span>{tLoc(translations.simulator.currentLegendPower, lang)}</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span aria-hidden="true" className="text-sky-500 font-bold">
                      ▸
                    </span>
                    <span>{tLoc(translations.simulator.currentLegendSignal, lang)}</span>
                  </span>
                  {currentFlowMap.totalCurrentMa > 0 && (
                    <>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-100"
                      >
                        {currentFlowMap.totalCurrentMa} mA
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
                  {tLoc(translations.simulator.currentIdleNote, lang)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Floating Zoom, Pan & Snap Grid Control Bar */}
        <div
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#111827]/95 p-1 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={view.zoom <= MIN_ZOOM}
            onClick={() => adjustZoom(1 / 1.25)}
            title={tLoc(translations.simulator.zoomOut, lang)}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#00878F] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            title={tLoc(translations.simulator.resetZoom, lang)}
            className="px-1.5 py-1 rounded-md font-mono tabular-nums text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[46px]"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button
            type="button"
            disabled={view.zoom >= MAX_ZOOM}
            onClick={() => adjustZoom(1.25)}
            title={tLoc(translations.simulator.zoomIn, lang)}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#00878F] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setPanMode((p) => {
                const next = !p;
                if (next) {
                  setWiringToolActive(false);
                  setDragWire(null);
                }
                return next;
              });
            }}
            title={tLoc(translations.simulator.panTool, lang)}
            className={cn(
              'p-1.5 rounded-md transition-colors cursor-pointer',
              effectivePanMode
                ? 'bg-[#00878F] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <Hand className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Toggleable Snapping Grid Overlay Button + Pitch Selector */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setSnapGridEnabled((s) => !s);
            }}
            aria-pressed={snapGridEnabled}
            title={tLoc(translations.simulator.snapGrid, lang)}
            className={cn(
              'p-1.5 rounded-md transition-colors cursor-pointer',
              snapGridEnabled
                ? 'bg-[#00878F] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
          {snapGridEnabled && (
            <button
              type="button"
              onClick={cycleGridStep}
              title={tLoc(translations.simulator.gridPitch, lang)}
              className="px-1.5 py-1 rounded-md font-mono tabular-nums text-[10px] font-semibold bg-[#00878F]/10 text-[#00878F] dark:text-[#22c6cf] hover:bg-[#00878F]/20 transition-colors cursor-pointer"
            >
              {gridStep}px
            </button>
          )}

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Smart Component Tooltips Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setSmartTooltipsEnabled((v) => !v);
            }}
            aria-pressed={smartTooltipsEnabled}
            title={tLoc(translations.simulator.smartTooltips, lang)}
            className={cn(
              'p-1.5 rounded-md transition-colors cursor-pointer',
              smartTooltipsEnabled
                ? 'bg-[#00878F] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
          </button>

          {/* Live Electric Current Flow Visualization Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setCurrentFlowEnabled((v) => !v);
            }}
            aria-pressed={currentFlowEnabled}
            title={tLoc(translations.simulator.currentFlowToggle, lang)}
            className={cn(
              'p-1.5 rounded-md transition-colors cursor-pointer',
              currentFlowEnabled
                ? running
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-[#00878F] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <Zap className="w-3.5 h-3.5" />
          </button>

          {(view.zoom !== 1 || view.panX !== 0 || view.panY !== 0) && (
            <button
              type="button"
              onClick={resetView}
              title={tLoc(translations.simulator.resetZoom, lang)}
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#00878F] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <svg
          ref={(node) => {
            svgRef.current = node;
            if (svgExternalRef) svgExternalRef.current = node;
          }}
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className={cn(
            'w-full h-full touch-none',
            effectivePanMode
              ? 'cursor-grab active:cursor-grabbing'
              : wiringToolActive
                ? 'cursor-crosshair'
                : '',
          )}
          onPointerDownCapture={handleSvgPointerDownCapture}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerCancel={handleSvgPointerUp}
          onPointerLeave={(e) => {
            setTooltipTarget(null);
            if (!dragWire) {
              setHoverNodeId(null);
              handleSvgPointerUp(e);
            }
          }}
          onDoubleClick={handleSvgDoubleClick}
          onClick={() => {
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }
            setWireStart(null);
            setSelectedCompId(null);
            setSelectedWireId(null);
          }}
        >
          <defs>
            <pattern id="grid-bg" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke={viewMode === 'schematic' ? '#00878F' : '#64748b'}
                strokeOpacity={viewMode === 'schematic' ? 0.14 : 0.1}
                strokeWidth="0.8"
              />
            </pattern>
            <pattern
              id="snap-grid-overlay"
              x={GRID_ORIGIN_X}
              y={GRID_ORIGIN_Y}
              width={gridStep}
              height={gridStep}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`}
                fill="none"
                stroke="#00878F"
                strokeOpacity={viewMode === 'schematic' ? 0.28 : 0.22}
                strokeWidth="0.65"
                strokeDasharray="2 2"
              />
              <circle
                cx="0"
                cy="0"
                r="1.25"
                fill="#00878F"
                fillOpacity={viewMode === 'schematic' ? 0.72 : 0.58}
              />
            </pattern>
            <filter id="led-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="overload-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="wire-pulse-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x="-1800"
            y="-1200"
            width="4400"
            height="2800"
            fill="url(#grid-bg)"
            data-pan-surface="true"
          />

          {/* ================= ARDUINO UNO R3 BOARD / SCHEMATIC BLOCK ================= */}
          {viewMode === 'breadboard' ? (
            <g>
              {/* PCB Body */}
              <rect
                x="28"
                y="38"
                width="262"
                height="340"
                rx="10"
                fill="#007d85"
                stroke="#005d63"
                strokeWidth="2.5"
                data-pan-surface="true"
              />
              {/* USB Type-B Port */}
              <rect
                x="66"
                y="18"
                width="56"
                height="46"
                rx="3"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              {/* DC Barrel Jack */}
              <rect
                x="196"
                y="22"
                width="42"
                height="42"
                rx="3"
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              {/* Reset Button */}
              <rect x="38" y="56" width="22" height="22" rx="3" fill="#cbd5e1" />
              <circle cx="49" cy="67" r="6" fill="#dc2626" />
              <text x="36" y="92" fill="#e2e8f0" fontSize="8" fontFamily="monospace">
                RESET
              </text>

              {/* Silkscreen Header */}
              <text
                x="156"
                y="112"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="16"
                fontWeight="800"
                fontFamily="sans-serif"
              >
                ARDUINO UNO
              </text>
              <text
                x="156"
                y="128"
                textAnchor="middle"
                fill="#ccfbf1"
                fontSize="9"
                fontFamily="monospace"
              >
                R3 · ATmega328P
              </text>

              {/* ATmega328P DIP Chip (Hover for Smart Arduino Board Tooltip) */}
              <g
                className={smartTooltipsEnabled ? 'cursor-help' : undefined}
                onPointerEnter={(e) => {
                  if (
                    !smartTooltipsEnabled ||
                    e.pointerType !== 'mouse' ||
                    draggingId ||
                    wireStart ||
                    activeDragKind ||
                    panDragRef.current.active
                  ) {
                    return;
                  }
                  setTooltipTarget({
                    kind: 'arduino',
                    clientX: e.clientX,
                    clientY: e.clientY,
                  });
                }}
                onPointerMove={(e) => {
                  if (!smartTooltipsEnabled || e.pointerType !== 'mouse') return;
                  setTooltipTarget((prev) =>
                    prev && prev.kind === 'arduino'
                      ? { kind: 'arduino', clientX: e.clientX, clientY: e.clientY }
                      : prev,
                  );
                }}
                onPointerLeave={() => {
                  setTooltipTarget((prev) => (prev?.kind === 'arduino' ? null : prev));
                }}
              >
                <rect
                  x="118"
                  y="165"
                  width="76"
                  height="168"
                  rx="4"
                  fill="#1e293b"
                  stroke={tooltipTarget?.kind === 'arduino' ? '#22c6cf' : '#0f172a'}
                  strokeWidth={tooltipTarget?.kind === 'arduino' ? '2' : '1.5'}
                />
                <text
                  x="156"
                  y="252"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  transform="rotate(-90 156 252)"
                >
                  ATMEGA328P-PU
                </text>
              </g>

              {/* On-board Power LED (ON) & L (D13) LED */}
              <circle cx="100" cy="146" r="4.5" fill={running ? '#22c55e' : '#14532d'} />
              <text x="109" y="149" fill="#e2e8f0" fontSize="8" fontFamily="monospace">
                ON
              </text>
              <circle
                cx="198"
                cy="146"
                r="5"
                fill={ledD13On ? '#fbbf24' : '#78350f'}
                filter={ledD13On ? 'url(#led-glow)' : undefined}
              />
              <text x="208" y="149" fill="#fde68a" fontSize="8" fontFamily="monospace">
                L(13)
              </text>

              {/* Direct Power-Rail Short-Circuit Overload Indicator on Arduino Uno */}
              {railShortDiag && (
                <g pointerEvents="none">
                  <rect
                    x="25"
                    y="35"
                    width="268"
                    height="346"
                    rx="12"
                    fill="#ef4444"
                    fillOpacity="0.12"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeDasharray="8 4"
                    filter="url(#overload-glow)"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="1;0.35;1"
                      dur="0.85s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  <g transform="translate(159, 60)">
                    <rect
                      x="-68"
                      y="-13"
                      width="136"
                      height="24"
                      rx="6"
                      fill="#dc2626"
                      stroke="#fecaca"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      ⚠ {tLoc(translations.simulator.overloadReasonShort, lang).toUpperCase()}
                    </text>
                  </g>
                </g>
              )}
            </g>
          ) : (
            /* IEEE SCHEMATIC MICROCONTROLLER SYMBOL */
            <g>
              <rect
                x="34"
                y="42"
                width="252"
                height="332"
                fill="none"
                stroke="#00878F"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <text
                x="160"
                y="72"
                textAnchor="middle"
                fill="#00878F"
                fontSize="13"
                fontWeight="700"
                fontFamily="monospace"
              >
                U1: ARDUINO UNO R3
              </text>
              <text
                x="160"
                y="90"
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                ATmega328P (5V / 16MHz)
              </text>
            </g>
          )}

          {/* Arduino Interactive Pin Sockets */}
          {ARDUINO_PINS.map((pin) => {
            const nodeId = `arduino:${pin.id}`;
            const isStart = wireStart === nodeId;
            const activeVal = pinValues[pin.id] ?? 0;
            const isRight = pin.x > 150;
            return (
              <g
                key={pin.id}
                className="cursor-pointer"
                onClick={(e) => handlePinClick(nodeId, e)}
              >
                <rect
                  x={pin.x - 6}
                  y={pin.y - 6}
                  width="12"
                  height="12"
                  rx="2"
                  fill={
                    isStart
                      ? '#f59e0b'
                      : activeVal > 0
                        ? '#22d3ee'
                        : pin.id === '5V' || pin.id === '3.3V'
                          ? '#991b1b'
                          : '#0f172a'
                  }
                  stroke={isStart ? '#fef08a' : '#cbd5e1'}
                  strokeWidth={isStart ? 2 : 1}
                />
                <circle cx={pin.x} cy={pin.y} r="2.2" fill="#eab308" />
                <text
                  x={isRight ? pin.x - 11 : pin.x + 11}
                  y={pin.y + 3}
                  textAnchor={isRight ? 'end' : 'start'}
                  fill={
                    viewMode === 'schematic'
                      ? '#00878F'
                      : pin.label.startsWith('~')
                        ? '#fde68a'
                        : '#ffffff'
                  }
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {pin.label}
                </text>
              </g>
            );
          })}

          {/* ================= HALF-SIZE BREADBOARD (RIGHT ZONE) ================= */}
          {viewMode === 'breadboard' ? (() => {
            const activeStripKey =
              BREADBOARD_POINT_MAP.get(dragWire?.targetNodeId ?? '')?.stripKey ??
              BREADBOARD_POINT_MAP.get(hoverNodeId ?? '')?.stripKey ??
              BREADBOARD_POINT_MAP.get(dragWire?.fromNodeId ?? '')?.stripKey ??
              BREADBOARD_POINT_MAP.get(wireStart ?? '')?.stripKey ??
              null;
            const showBbInteractive = wiringToolActive || Boolean(wireStart) || Boolean(dragWire);
            return (
              <g>
                <rect
                  x="348"
                  y="42"
                  width="396"
                  height="332"
                  rx="10"
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  data-pan-surface="true"
                />
                {/* Top Power Rail (+5V red / GND blue) */}
                <line
                  x1="368"
                  y1="62"
                  x2="724"
                  y2="62"
                  stroke="#ef4444"
                  strokeWidth={activeStripKey === 'rail:pos:top' ? '4.5' : '2'}
                  strokeOpacity={activeStripKey === 'rail:pos:top' ? '0.85' : '1'}
                />
                <line
                  x1="368"
                  y1="76"
                  x2="724"
                  y2="76"
                  stroke="#2563eb"
                  strokeWidth={activeStripKey === 'rail:neg:top' ? '4.5' : '2'}
                  strokeOpacity={activeStripKey === 'rail:neg:top' ? '0.85' : '1'}
                />
                <text x="355" y="65" fill="#ef4444" fontSize="11" fontWeight="bold">
                  +
                </text>
                <text x="355" y="79" fill="#2563eb" fontSize="12" fontWeight="bold">
                  -
                </text>

                {/* Center DIP Valley */}
                <rect x="366" y="200" width="360" height="14" rx="3" fill="#e2e8f0" />

                {/* Active 5-Hole Vertical Copper Strip Highlight when Wiring */}
                {activeStripKey && activeStripKey.startsWith('col:') && (() => {
                  const [, colStr, half] = activeStripKey.split(':');
                  const colNum = Number(colStr);
                  const cx = Number((376 + colNum * 14.8).toFixed(1));
                  const sy = half === 'top' ? 89 : 221;
                  return (
                    <rect
                      x={cx - 5.5}
                      y={sy}
                      width="11"
                      height="86"
                      rx="5.5"
                      fill="#00878F"
                      fillOpacity="0.18"
                      stroke="#00878F"
                      strokeOpacity="0.72"
                      strokeWidth="1.2"
                      pointerEvents="none"
                      data-export-exclude="true"
                    />
                  );
                })()}

                {/* Bottom Power Rail */}
                <line
                  x1="368"
                  y1="336"
                  x2="724"
                  y2="336"
                  stroke="#ef4444"
                  strokeWidth={activeStripKey === 'rail:pos:bot' ? '4.5' : '2'}
                  strokeOpacity={activeStripKey === 'rail:pos:bot' ? '0.85' : '1'}
                />
                <line
                  x1="368"
                  y1="352"
                  x2="724"
                  y2="352"
                  stroke="#2563eb"
                  strokeWidth={activeStripKey === 'rail:neg:bot' ? '4.5' : '2'}
                  strokeOpacity={activeStripKey === 'rail:neg:bot' ? '0.85' : '1'}
                />

                {/* Interactive Breadboard Holes & Power Rail Sockets */}
                {BREADBOARD_POINTS.map((bp) => {
                  const isStart = wireStart === bp.id || dragWire?.fromNodeId === bp.id;
                  const isTarget = dragWire?.targetNodeId === bp.id;
                  const isHoveredPt = hoverNodeId === bp.id;
                  const isRail = bp.kind !== 'hole';
                  const inActiveStrip = activeStripKey === bp.stripKey;
                  return (
                    <g
                      key={bp.id}
                      className={showBbInteractive ? 'cursor-crosshair' : 'cursor-pointer'}
                      onClick={(e) => handlePinClick(bp.id, e)}
                    >
                      {isRail ? (
                        <circle
                          cx={bp.x}
                          cy={bp.y}
                          r={isStart || isTarget ? 3.8 : isHoveredPt ? 3.2 : showBbInteractive ? 2.5 : 2}
                          fill={
                            isStart
                              ? '#f59e0b'
                              : isTarget
                                ? '#22c55e'
                                : bp.kind === 'rail-pos'
                                  ? '#dc2626'
                                  : '#1d4ed8'
                          }
                          fillOpacity={isStart || isTarget || isHoveredPt || inActiveStrip ? '0.98' : '0.72'}
                          stroke={isStart || isTarget || isHoveredPt ? '#ffffff' : 'none'}
                          strokeWidth="1"
                        />
                      ) : (
                        <rect
                          x={bp.x - (isStart || isTarget ? 3.2 : 2.2)}
                          y={bp.y - (isStart || isTarget ? 3.2 : 2.2)}
                          width={isStart || isTarget ? 6.4 : 4.4}
                          height={isStart || isTarget ? 6.4 : 4.4}
                          rx={isStart || isTarget ? 1.4 : 0.8}
                          fill={
                            isStart
                              ? '#f59e0b'
                              : isTarget
                                ? '#10b981'
                                : isHoveredPt
                                  ? '#00878F'
                                  : inActiveStrip
                                    ? '#0f766e'
                                    : '#475569'
                          }
                          fillOpacity={isStart || isTarget || isHoveredPt ? '1' : inActiveStrip ? '0.82' : '0.48'}
                        />
                      )}
                      {(isHoveredPt || isTarget) && showBbInteractive && (
                        <circle
                          cx={bp.x}
                          cy={bp.y}
                          r="6.2"
                          fill="none"
                          stroke={isTarget ? '#10b981' : '#00878F'}
                          strokeWidth="1.4"
                          pointerEvents="none"
                          data-export-exclude="true"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })() : (
            <g>
              <rect
                x="348"
                y="42"
                width="396"
                height="332"
                rx="6"
                fill="none"
                stroke="#64748b"
                strokeOpacity="0.35"
                strokeDasharray="4 4"
              />
              <text
                x="546"
                y="64"
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
                fontFamily="monospace"
              >
                SCHEMATIC WORKSPACE (IEEE SYMBOLS)
              </text>
            </g>
          )}

          {/* ================= TOGGLEABLE SNAPPING GRID OVERLAY ================= */}
          {snapGridEnabled && (
            <g pointerEvents="none" data-export-exclude="true">
              <rect
                x="355"
                y="48"
                width="382"
                height="320"
                rx="6"
                fill="url(#snap-grid-overlay)"
                stroke="#00878F"
                strokeOpacity="0.28"
                strokeWidth="1"
              />
              {/* Live Alignment Crosshairs + Peer Axis Guides while dragging a component */}
              {draggingId && (() => {
                const dragged = circuit.components.find((c) => c.id === draggingId);
                if (!dragged) return null;
                const alignedX = circuit.components.some(
                  (c) => c.id !== dragged.id && c.x === dragged.x,
                );
                const alignedY = circuit.components.some(
                  (c) => c.id !== dragged.id && c.y === dragged.y,
                );
                return (
                  <g>
                    {/* Vertical snap guide */}
                    <line
                      x1={dragged.x}
                      y1="48"
                      x2={dragged.x}
                      y2="368"
                      stroke={alignedX ? '#10b981' : '#00878F'}
                      strokeWidth={alignedX ? 1.4 : 1}
                      strokeDasharray={alignedX ? '4 2' : '3 3'}
                      strokeOpacity="0.85"
                    />
                    {/* Horizontal snap guide */}
                    <line
                      x1="355"
                      y1={dragged.y}
                      x2="737"
                      y2={dragged.y}
                      stroke={alignedY ? '#10b981' : '#00878F'}
                      strokeWidth={alignedY ? 1.4 : 1}
                      strokeDasharray={alignedY ? '4 2' : '3 3'}
                      strokeOpacity="0.85"
                    />
                    {/* Snap anchor point */}
                    <circle
                      cx={dragged.x}
                      cy={dragged.y}
                      r="3.5"
                      fill={alignedX || alignedY ? '#10b981' : '#00878F'}
                      fillOpacity="0.9"
                    />
                    {/* Live snapped coordinate readout pill */}
                    <g transform={`translate(${Math.min(648, dragged.x + 14)}, ${Math.max(64, dragged.y - 44)})`}>
                      <rect
                        x="0"
                        y="0"
                        width="82"
                        height="16"
                        rx="4"
                        fill="#0f172a"
                        fillOpacity="0.9"
                        stroke={alignedX || alignedY ? '#10b981' : '#22d3ee'}
                        strokeWidth="0.9"
                      />
                      <text
                        x="41"
                        y="11"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="8"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        {`${dragged.x}, ${dragged.y}`}
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}

          {/* ================= PLACED COMPONENTS ================= */}
          {circuit.components.map((comp) => {
            const pins = COMPONENT_PINS[comp.kind] || [];
            const pwr = componentPower[comp.id];
            const isSelected = selectedCompId === comp.id;
            const isTooltipHovered =
              tooltipTarget?.kind === 'component' && tooltipTarget.compId === comp.id;

            // Find servo angle if servo is driven
            let servoAngle = 90;
            if (comp.kind === 'servo') {
              const firstAngle = Object.values(servoAngles)[0];
              if (typeof firstAngle === 'number') servoAngle = firstAngle;
            }

            return (
              <g
                key={comp.id}
                transform={`translate(${comp.x}, ${comp.y})`}
                className={
                  effectivePanMode
                    ? 'cursor-grab active:cursor-grabbing'
                    : wiringToolActive
                      ? 'cursor-crosshair'
                      : 'cursor-move'
                }
                onPointerEnter={(e) => {
                  if (
                    !smartTooltipsEnabled ||
                    e.pointerType !== 'mouse' ||
                    draggingId ||
                    wireStart ||
                    dragWire ||
                    activeDragKind ||
                    panDragRef.current.active
                  ) {
                    return;
                  }
                  setTooltipTarget({
                    kind: 'component',
                    compId: comp.id,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  });
                }}
                onPointerMove={(e) => {
                  if (!smartTooltipsEnabled || e.pointerType !== 'mouse') return;
                  if (draggingId || wireStart || dragWire || activeDragKind || panDragRef.current.active) return;
                  setTooltipTarget((prev) =>
                    prev && prev.kind === 'component' && prev.compId === comp.id
                      ? { kind: 'component', compId: comp.id, clientX: e.clientX, clientY: e.clientY }
                      : { kind: 'component', compId: comp.id, clientX: e.clientX, clientY: e.clientY },
                  );
                }}
                onPointerLeave={() => {
                  setTooltipTarget((prev) =>
                    prev?.kind === 'component' && prev.compId === comp.id ? null : prev,
                  );
                }}
                onPointerDown={(e) => {
                  if (
                    effectivePanMode ||
                    wiringToolActive ||
                    pinchStateRef.current.active ||
                    activeTouchPointersRef.current.size >= 2
                  ) {
                    return;
                  }
                  e.stopPropagation();
                  setTooltipTarget(null);
                  setSelectedCompId(comp.id);
                  setDraggingId(comp.id);
                }}
              >
                {(isSelected || isTooltipHovered) && !pwr?.overload && (
                  <rect
                    x="-42"
                    y="-36"
                    width="84"
                    height="72"
                    rx="8"
                    fill={isTooltipHovered && !isSelected ? '#00878F' : 'none'}
                    fillOpacity={isTooltipHovered && !isSelected ? '0.07' : undefined}
                    stroke="#00878F"
                    strokeWidth={isSelected ? '1.8' : '1.4'}
                    strokeOpacity={isSelected ? '1' : '0.75'}
                    strokeDasharray="4 2"
                  />
                )}

                {/* Pulsing Red Hazard Aura behind any Overloaded Component */}
                {pwr?.overload && (
                  <g pointerEvents="none">
                    <rect
                      x="-44"
                      y="-38"
                      width="88"
                      height="76"
                      rx="10"
                      fill="#ef4444"
                      fillOpacity="0.16"
                      stroke="#ef4444"
                      strokeWidth={isSelected ? '2.6' : '2.1'}
                      strokeDasharray="5 3"
                      filter="url(#overload-glow)"
                    >
                      <animate
                        attributeName="fill-opacity"
                        values="0.1;0.28;0.1"
                        dur="0.95s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="1;0.45;1"
                        dur="0.95s"
                        repeatCount="indefinite"
                      />
                    </rect>
                    <circle
                      cx="0"
                      cy="0"
                      r="24"
                      fill="#f97316"
                      fillOpacity="0.22"
                      filter="url(#overload-glow)"
                    >
                      <animate
                        attributeName="r"
                        values="20;29;20"
                        dur="1.1s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="fill-opacity"
                        values="0.32;0.08;0.32"
                        dur="1.1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}

                {/* LED (Realistic Dome vs IEEE Diode Schematic Symbol) */}
                {isLedKind(comp.kind) && (() => {
                  const palette = getLedFill(comp.kind);
                  const bright = running ? pwr?.brightness ?? 0 : 0;
                  const lit = bright > 0.02;
                  if (viewMode === 'schematic') {
                    return (
                      <g>
                        <polygon
                          points="-12,-10 12,0 -12,10"
                          fill={lit ? palette.on : 'none'}
                          stroke={palette.glow}
                          strokeWidth="2"
                        />
                        <line x1="12" y1="-10" x2="12" y2="10" stroke={palette.glow} strokeWidth="2" />
                        <line x1="-10" y1="26" x2="-10" y2="6" stroke="#64748b" strokeWidth="1.5" />
                        <line x1="10" y1="26" x2="10" y2="6" stroke="#64748b" strokeWidth="1.5" />
                      </g>
                    );
                  }
                  return (
                    <g>
                      <line x1="-10" y1="8" x2="-10" y2="26" stroke="#94a3b8" strokeWidth="2.5" />
                      <line x1="10" y1="8" x2="10" y2="26" stroke="#94a3b8" strokeWidth="2.5" />
                      {lit && (
                        <circle
                          cx="0"
                          cy="-8"
                          r={18 + bright * 12}
                          fill={palette.glow}
                          fillOpacity={0.28 + bright * 0.45}
                          filter="url(#led-glow)"
                        />
                      )}
                      <path
                        d="M -14 8 L -14 -10 A 14 14 0 0 1 14 -10 L 14 8 Z"
                        fill={lit ? palette.on : palette.off}
                        stroke="#0f172a"
                        strokeWidth="1.2"
                      />
                      <rect x="-16" y="5" width="32" height="5" rx="2" fill={palette.off} />
                      <circle cx="-5" cy="-12" r="3" fill="#ffffff" fillOpacity="0.45" />
                      {pwr?.warnNoResistor && !pwr?.overload && (
                        <text x="0" y="-27" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
                          ! 220Ω
                        </text>
                      )}
                    </g>
                  );
                })()}

                {/* RESISTOR (Authentic 4-band color stripes vs Zig-Zag Schematic) */}
                {comp.kind.startsWith('resistor-') && (() => {
                  const bands = getResistorBands(comp.kind);
                  if (viewMode === 'schematic') {
                    return (
                      <g>
                        <path
                          d="M -26 0 L -16 0 L -12 -7 L -6 7 L 0 -7 L 6 7 L 12 -7 L 16 0 L 26 0"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="2.2"
                        />
                      </g>
                    );
                  }
                  return (
                    <g>
                      <line x1="-26" y1="0" x2="26" y2="0" stroke="#94a3b8" strokeWidth="2.6" />
                      <rect
                        x="-18"
                        y="-7"
                        width="36"
                        height="14"
                        rx="5"
                        fill="#f5deb3"
                        stroke="#b45309"
                        strokeWidth="1.2"
                      />
                      <rect x="-12" y="-7" width="4" height="14" fill={bands[0]} />
                      <rect x="-5" y="-7" width="4" height="14" fill={bands[1]} />
                      <rect x="2" y="-7" width="4" height="14" fill={bands[2]} />
                      <rect x="10" y="-7" width="3" height="14" fill={bands[3]} />
                    </g>
                  );
                })()}

                {/* TACTILE PUSHBUTTON (Interactive press & hold!) */}
                {comp.kind === 'button' && (
                  <g
                    onPointerDown={(e) => {
                      if (running && !effectivePanMode) {
                        e.stopPropagation();
                        soundEngine.playSelect();
                        updateComponentValue(comp.id, 1);
                      }
                    }}
                    onPointerUp={(e) => {
                      if (running) {
                        e.stopPropagation();
                        updateComponentValue(comp.id, 0);
                      }
                    }}
                    onPointerLeave={() => {
                      if (running && comp.value === 1) updateComponentValue(comp.id, 0);
                    }}
                  >
                    <rect
                      x="-20"
                      y="-18"
                      width="40"
                      height="36"
                      rx="5"
                      fill="#334155"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="11"
                      fill={comp.value === 1 ? '#00878F' : '#1e293b'}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />
                    <line x1="-16" y1="18" x2="-16" y2="22" stroke="#94a3b8" strokeWidth="2.5" />
                    <line x1="16" y1="18" x2="16" y2="22" stroke="#94a3b8" strokeWidth="2.5" />
                  </g>
                )}

                {/* 10k POTENTIOMETER */}
                {comp.kind === 'potentiometer' && (() => {
                  const val = comp.value ?? 512;
                  const deg = -135 + (val / 1023) * 270;
                  return (
                    <g>
                      <rect x="-24" y="-22" width="48" height="44" rx="6" fill="#0369a1" stroke="#0c4a6e" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="15" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                      <g transform={`rotate(${deg})`}>
                        <line x1="0" y1="0" x2="0" y2="-13" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                      </g>
                      <text x="0" y="-27" textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        {val}
                      </text>
                    </g>
                  );
                })()}

                {/* LDR PHOTORESISTOR */}
                {comp.kind === 'ldr' && (
                  <g>
                    <circle cx="0" cy="-2" r="18" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                    <path
                      d="M -10 -7 Q 0 -12 10 -7 Q 0 -2 -10 3 Q 0 8 10 3"
                      fill="none"
                      stroke="#b45309"
                      strokeWidth="2.2"
                    />
                    <text x="0" y="-25" textAnchor="middle" fill="#ca8a04" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      LDR {comp.value ?? 500}
                    </text>
                  </g>
                )}

                {/* HC-SR04 ULTRASONIC SENSOR */}
                {comp.kind === 'ultrasonic' && (
                  <g>
                    <rect x="-36" y="-20" width="72" height="38" rx="4" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                    <circle cx="-18" cy="-1" r="12" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="-18" cy="-1" r="7" fill="#334155" />
                    <circle cx="18" cy="-1" r="12" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="18" cy="-1" r="7" fill="#334155" />
                    {running && (
                      <path
                        d="M -10 -24 Q 0 -32 10 -24"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                      />
                    )}
                    <text x="0" y="-27" textAnchor="middle" fill="#0d9488" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {comp.value ?? 45} cm
                    </text>
                  </g>
                )}

                {/* SG90 MICRO SERVO (Animated Rotating Horn!) */}
                {comp.kind === 'servo' && (
                  <g>
                    <rect x="-24" y="-18" width="48" height="38" rx="4" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
                    <circle cx="0" cy="-2" r="10" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
                    <g transform={`translate(0, -2) rotate(${servoAngle - 90})`}>
                      <rect x="-4" y="-24" width="8" height="28" rx="4" fill="#ffffff" stroke="#334155" strokeWidth="1.2" />
                      <circle cx="0" cy="0" r="3" fill="#475569" />
                    </g>
                    <text x="0" y="-30" textAnchor="middle" fill="#2563eb" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {servoAngle}°
                    </text>
                  </g>
                )}

                {/* PIEZO BUZZER */}
                {comp.kind === 'buzzer' && (() => {
                  const sounding = running && (pwr?.powered || Boolean(buzzerTone));
                  return (
                    <g>
                      {sounding && (
                        <>
                          <circle cx="0" cy="0" r="24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeOpacity="0.8" />
                          <circle cx="0" cy="0" r="30" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.45" />
                        </>
                      )}
                      <circle cx="0" cy="0" r="18" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="5" fill="#94a3b8" />
                      <text x="-10" y="-7" fill="#ef4444" fontSize="9" fontWeight="bold">+</text>
                    </g>
                  );
                })()}

                {/* TMP36 TEMPERATURE SENSOR */}
                {comp.kind === 'temp-sensor' && (
                  <g>
                    <path d="M -14 14 L -14 -8 A 14 10 0 0 1 14 -8 L 14 14 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                    <text x="0" y="5" textAnchor="middle" fill="#cbd5e1" fontSize="7.5" fontFamily="monospace">
                      TMP36
                    </text>
                    <text x="0" y="-24" textAnchor="middle" fill="#f97316" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {comp.value ?? 24}°C
                    </text>
                  </g>
                )}

                {/* VIRTUAL DIGITAL MULTIMETER (DC V / DC mA / Ω) */}
                {comp.kind === 'multimeter' && (() => {
                  const mode = getMultimeterModeFromValue(comp.value);
                  const reading = multimeterReadings[comp.id];
                  const displayText =
                    reading?.displayText ??
                    (mode === 'resistance' ? 'OL' : mode === 'current' ? '0.00 mA' : '0.00 V');
                  const unitBadge = reading?.unitBadge ?? (mode === 'voltage' ? 'DC V' : mode === 'current' ? 'DC mA' : 'Ω');
                  const isFuse = reading?.warning === 'fuse-overload';
                  const isLiveWarn = reading?.warning === 'live-circuit';
                  const isActiveReading = Boolean(reading?.connected && reading.warning === 'none');

                  const lcdBg = isFuse
                    ? '#fee2e2'
                    : isLiveWarn
                      ? '#fef3c7'
                      : isActiveReading
                        ? '#a7f3d0'
                        : '#cbd5e1';
                  const lcdText = isFuse
                    ? '#b91c1c'
                    : isLiveWarn
                      ? '#b45309'
                      : isActiveReading
                        ? '#064e3b'
                        : '#334155';

                  const selectMode = (next: MultimeterMode, e: React.MouseEvent) => {
                    e.stopPropagation();
                    soundEngine.playSelect();
                    updateComponentValue(comp.id, getMultimeterValueFromMode(next));
                  };

                  if (viewMode === 'schematic') {
                    const symLetter = mode === 'voltage' ? 'V' : mode === 'current' ? 'A' : 'Ω';
                    return (
                      <g>
                        <line x1="-16" y1="12" x2="-16" y2="30" stroke="#dc2626" strokeWidth="2" />
                        <line x1="16" y1="12" x2="16" y2="30" stroke="#334155" strokeWidth="2" />
                        <circle
                          cx="0"
                          cy="-6"
                          r="22"
                          fill="#0f172a"
                          fillOpacity="0.92"
                          stroke={isFuse ? '#ef4444' : isLiveWarn ? '#f59e0b' : '#eab308'}
                          strokeWidth="2"
                        />
                        <text
                          x="0"
                          y="-11"
                          textAnchor="middle"
                          fill="#facc15"
                          fontSize="11"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {symLetter}
                        </text>
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill={isFuse ? '#fca5a5' : '#6ee7b7'}
                          fontSize="7.8"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {displayText}
                        </text>
                      </g>
                    );
                  }

                  return (
                    <g>
                      {/* Red & Black Test Lead Stubs */}
                      <line x1="-16" y1="20" x2="-16" y2="30" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round" />
                      <line x1="16" y1="20" x2="16" y2="30" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />

                      {/* Yellow Protective Holster */}
                      <rect
                        x="-36"
                        y="-34"
                        width="72"
                        height="58"
                        rx="7"
                        fill="#eab308"
                        stroke="#a16207"
                        strokeWidth="1.5"
                      />
                      {/* Dark Instrument Faceplate */}
                      <rect
                        x="-32"
                        y="-30"
                        width="64"
                        height="50"
                        rx="4.5"
                        fill="#0f172a"
                        stroke="#1e293b"
                        strokeWidth="1"
                      />

                      {/* Recessed Backlit LCD Panel */}
                      <rect
                        x="-28"
                        y="-26"
                        width="56"
                        height="23"
                        rx="2.5"
                        fill={lcdBg}
                        stroke="#334155"
                        strokeWidth="0.9"
                      />
                      <text
                        x="-25"
                        y="-19"
                        textAnchor="start"
                        fill={lcdText}
                        fillOpacity="0.85"
                        fontSize="5.6"
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        {unitBadge}
                      </text>
                      <text
                        x="25"
                        y="-19"
                        textAnchor="end"
                        fill={lcdText}
                        fillOpacity="0.65"
                        fontSize="5"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        {reading?.connected ? 'AUTO' : 'OPEN'}
                      </text>
                      <text
                        x="0"
                        y="-7.5"
                        textAnchor="middle"
                        fill={lcdText}
                        fontSize={displayText.length > 7 ? '8.8' : '10.2'}
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        {displayText}
                      </text>

                      {/* Interactive Mode Selector Keys directly on the DMM Face (V / mA / Ω) */}
                      {(
                        [
                          { id: 'voltage' as const, label: 'V', x: -28, w: 17, activeFill: '#00878F' },
                          { id: 'current' as const, label: 'mA', x: -9, w: 18, activeFill: '#d97706' },
                          { id: 'resistance' as const, label: 'Ω', x: 11, w: 17, activeFill: '#0284c7' },
                        ]
                      ).map((btn) => {
                        const active = mode === btn.id;
                        return (
                          <g
                            key={btn.id}
                            className="cursor-pointer"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => selectMode(btn.id, e)}
                          >
                            <rect
                              x={btn.x}
                              y="1"
                              width={btn.w}
                              height="12.5"
                              rx="2.5"
                              fill={active ? btn.activeFill : '#1e293b'}
                              stroke={active ? '#f8fafc' : '#475569'}
                              strokeWidth={active ? '1' : '0.7'}
                            />
                            <text
                              x={btn.x + btn.w / 2}
                              y="9.6"
                              textAnchor="middle"
                              fill={active ? '#ffffff' : '#94a3b8'}
                              fontSize="6.8"
                              fontWeight="800"
                              fontFamily="monospace"
                            >
                              {btn.label}
                            </text>
                          </g>
                        );
                      })}

                      {/* Probe Jack Collars at Bottom Bezel */}
                      <circle cx="-16" cy="18" r="2.6" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.7" />
                      <circle cx="16" cy="18" r="2.6" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.7" />
                    </g>
                  );
                })()}

                {/* Live Internal Current Direction Indicator across Active Resistors & LEDs */}
                {running && currentFlowEnabled && (() => {
                  const compFlow = currentFlowMap.components[comp.id];
                  if (!compFlow?.active) return null;
                  const style = getCurrentFlowPalette(compFlow.category, flowMode);
                  const isElectrons = flowMode === 'electrons';
                  const xStart = isElectrons ? compFlow.toX : compFlow.fromX;
                  const yStart = isElectrons ? compFlow.toY : compFlow.fromY;
                  const xEnd = isElectrons ? compFlow.fromX : compFlow.toX;
                  const yEnd = isElectrons ? compFlow.fromY : compFlow.toY;
                  const flowPathId = `comp-flow-${comp.id}`;
                  const isResistor = comp.kind.startsWith('resistor-');
                  const dComp = isResistor
                    ? `M ${xStart} -12 L ${xEnd} -12`
                    : `M ${xStart} ${yStart} Q 0 12 ${xEnd} ${yEnd}`;
                  const angleDeg = xEnd >= xStart ? 0 : 180;
                  const durSec = compFlow.category === 'overload' ? 0.55 : 1.05;
                  return (
                    <g pointerEvents="none" data-export-exclude="true">
                      <path
                        id={flowPathId}
                        d={dComp}
                        fill="none"
                        stroke={style.stroke}
                        strokeOpacity="0.45"
                        strokeWidth="1.4"
                        strokeDasharray="3 3"
                      />
                      {reducedMotion ? (
                        <polygon
                          points="-3.6,-2.5 3.2,0 -3.6,2.5 -1.7,0"
                          fill={style.arrowFill}
                          stroke={style.arrowStroke}
                          strokeWidth="0.85"
                          transform={`translate(0, ${isResistor ? -12 : 17}) rotate(${angleDeg})`}
                        />
                      ) : (
                        <g key={`${comp.id}-cflow-${flowMode}-${xStart}-${viewMode}`}>
                          <polygon
                            points="-3.8,-2.7 3.4,0 -3.8,2.7 -1.8,0"
                            fill={style.arrowFill}
                            stroke={style.arrowStroke}
                            strokeWidth="0.9"
                            strokeLinejoin="round"
                          />
                          <animateMotion
                            dur={`${durSec}s`}
                            repeatCount="indefinite"
                            rotate="auto"
                            calcMode="linear"
                          >
                            <mpath href={`#${flowPathId}`} />
                          </animateMotion>
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* Component Label */}
                {comp.label && (
                  <text
                    x="0"
                    y={comp.kind === 'multimeter' ? '-39' : '40'}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8.5"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {comp.label}
                  </text>
                )}

                {/* Interactive Component Pins */}
                {pins.map((pin) => {
                  const nodeId = `comp:${comp.id}:${pin.id}`;
                  const isStart = wireStart === nodeId;
                  const isMeterPos = comp.kind === 'multimeter' && pin.id === 'pos';
                  const isMeterNeg = comp.kind === 'multimeter' && pin.id === 'neg';
                  return (
                    <g
                      key={pin.id}
                      className="cursor-crosshair"
                      onClick={(e) => handlePinClick(nodeId, e)}
                      onPointerDown={(e) => {
                        if (!wiringToolActive) e.stopPropagation();
                      }}
                    >
                      <circle
                        cx={pin.dx}
                        cy={pin.dy}
                        r={isStart ? 6.5 : 5}
                        fill={
                          isStart
                            ? '#f59e0b'
                            : isMeterPos
                              ? '#dc2626'
                              : isMeterNeg
                                ? '#1e293b'
                                : '#0f172a'
                        }
                        stroke={
                          isStart
                            ? '#fef08a'
                            : isMeterPos
                              ? '#fca5a5'
                              : isMeterNeg
                                ? '#94a3b8'
                                : '#22d3ee'
                        }
                        strokeWidth={isStart ? 2.2 : 1.3}
                      />
                      <text
                        x={pin.dx}
                        y={pin.dy + 13}
                        textAnchor="middle"
                        fill={isMeterPos ? '#ef4444' : '#64748b'}
                        fontSize="7"
                        fontWeight={isMeterPos || isMeterNeg ? '700' : undefined}
                        fontFamily="monospace"
                      >
                        {pin.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ================= JUMPER WIRES LAYER ================= */}
          {circuit.wires.map((wire) => {
            const p1 = pinCoords.get(wire.from);
            const p2 = pinCoords.get(wire.to);
            if (!p1 || !p2) return null;
            const hasValidWaypoints =
              Boolean(wire.waypoints && wire.waypoints.length >= 2) &&
              Math.hypot(wire.waypoints![0].x - p1.x, wire.waypoints![0].y - p1.y) < 1.5 &&
              Math.hypot(
                wire.waypoints![wire.waypoints!.length - 1].x - p2.x,
                wire.waypoints![wire.waypoints!.length - 1].y - p2.y,
              ) < 1.5;
            const d = hasValidWaypoints
              ? buildRoundedOrthogonalPath(
                  wire.waypoints!,
                  viewMode === 'schematic' ? 4 : 7,
                )
              : buildWirePath(p1.x, p1.y, p2.x, p2.y);
            const isHovered = hoveredWireId === wire.id;
            const activeAnim = wireAnims[wire.id];
            const wireFlow = running && currentFlowEnabled ? currentFlowMap.wires[wire.id] : undefined;
            const effectiveFlowDir: 1 | -1 = wireFlow
              ? flowMode === 'electrons'
                ? (wireFlow.direction === 1 ? -1 : 1)
                : wireFlow.direction
              : 1;
            const dFlow = wireFlow
              ? effectiveFlowDir === 1
                ? d
                : hasValidWaypoints
                  ? buildRoundedOrthogonalPath(
                      [...wire.waypoints!].reverse(),
                      viewMode === 'schematic' ? 4 : 7,
                    )
                  : buildWirePath(p2.x, p2.y, p1.x, p1.y)
              : d;
            const flowStyle = wireFlow
              ? getCurrentFlowPalette(wireFlow.category, flowMode)
              : null;
            const flowPathId = `wire-flow-${wire.id}`;
            const approxWireLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const chevronCount = approxWireLen > 230 ? 4 : approxWireLen > 120 ? 3 : 2;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - (viewMode === 'schematic' ? 14 : 26);
            // Static midpoint & angle for reduced-motion directional chevron fallback
            const staticMid = (() => {
              if (!wireFlow) return { x: midX, y: midY, deg: 0 };
              const startPt = effectiveFlowDir === 1 ? p1 : p2;
              const endPt = effectiveFlowDir === 1 ? p2 : p1;
              if (hasValidWaypoints && wire.waypoints!.length >= 2) {
                const pts = effectiveFlowDir === 1 ? wire.waypoints! : [...wire.waypoints!].reverse();
                const segIdx = Math.floor((pts.length - 1) / 2);
                const a = pts[segIdx];
                const b = pts[Math.min(pts.length - 1, segIdx + 1)];
                return {
                  x: (a.x + b.x) / 2,
                  y: (a.y + b.y) / 2,
                  deg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
                };
              }
              if (viewMode === 'schematic') {
                const sx = Math.round((startPt.x + endPt.x) / 2);
                return {
                  x: sx,
                  y: (startPt.y + endPt.y) / 2,
                  deg: endPt.y >= startPt.y ? 90 : -90,
                };
              }
              const dx = Math.abs(endPt.x - startPt.x);
              const lift = Math.min(85, Math.max(24, dx * 0.28));
              const c1x = startPt.x + (endPt.x >= startPt.x ? dx * 0.25 : -dx * 0.25);
              const c1y = startPt.y - lift;
              const c2x = endPt.x - (endPt.x >= startPt.x ? dx * 0.25 : -dx * 0.25);
              const c2y = endPt.y - lift;
              // Cubic Bezier midpoint & tangent at t = 0.5
              const bx = 0.125 * startPt.x + 0.375 * c1x + 0.375 * c2x + 0.125 * endPt.x;
              const by = 0.125 * startPt.y + 0.375 * c1y + 0.375 * c2y + 0.125 * endPt.y;
              const tx = 0.75 * (endPt.x - startPt.x + c2x - c1x);
              const ty = 0.75 * (endPt.y - startPt.y + c2y - c1y);
              return {
                x: bx,
                y: by,
                deg: (Math.atan2(ty, tx) * 180) / Math.PI,
              };
            })();
            const isSelectedWire = selectedWireId === wire.id;
            const isDimmedByFilter = Boolean(
              colorFilterHex && wire.color.toLowerCase() !== colorFilterHex.toLowerCase(),
            );
            const isLightStroke = isLightWireHex(wire.color);
            const baseWireWidth =
              isHovered || isSelectedWire
                ? viewMode === 'schematic'
                  ? 3.0
                  : 4.0
                : viewMode === 'schematic'
                  ? 2.2
                  : 3.2;
            return (
              <g
                key={wire.id}
                className="cursor-pointer group"
                opacity={isDimmedByFilter ? 0.16 : 1}
                onPointerEnter={() => setHoveredWireId(wire.id)}
                onPointerLeave={() => setHoveredWireId((prev) => (prev === wire.id ? null : prev))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    handleRecolorWire(wire.id, wireColor);
                    return;
                  }
                  soundEngine.playSelect();
                  setSelectedCompId(null);
                  setSelectedWireId((prev) => (prev === wire.id ? null : wire.id));
                }}
              >
                {/* Wider invisible hit target */}
                <path d={d} fill="none" stroke="transparent" strokeWidth="12" strokeLinejoin="round" />
                {/* Hover / Selected inspection highlight halo */}
                {(isHovered || isSelectedWire) && (
                  <path
                    d={d}
                    fill="none"
                    stroke={isSelectedWire ? '#00878F' : '#22d3ee'}
                    strokeOpacity={isSelectedWire ? '0.85' : '0.65'}
                    strokeWidth={viewMode === 'schematic' ? 6.5 : 8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Subtle energized glow halo along wires carrying active current */}
                {wireFlow && flowStyle && (
                  <path
                    d={dFlow}
                    fill="none"
                    stroke={flowStyle.glow}
                    strokeOpacity={wireFlow.category === 'overload' ? '0.45' : '0.24'}
                    strokeWidth={viewMode === 'schematic' ? 5.6 : 6.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="none"
                    data-export-exclude="true"
                  />
                )}
                {/* Color-coded establishment glow halo when wire is freshly connected */}
                {activeAnim && (
                  <path
                    d={d}
                    pathLength={1}
                    fill="none"
                    stroke={activeAnim.glowColor}
                    strokeWidth={viewMode === 'schematic' ? 7 : 8.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#wire-pulse-glow)"
                    className="wire-halo-fade"
                    data-export-exclude="true"
                    pointerEvents="none"
                  />
                )}
                {/* Subtle shadow (or slate contrast casing for light/white jumper wires) */}
                <path
                  d={d}
                  pathLength={activeAnim ? 1 : undefined}
                  fill="none"
                  stroke={isLightStroke ? '#475569' : '#000000'}
                  strokeOpacity={isLightStroke ? '0.7' : '0.22'}
                  strokeWidth={isLightStroke ? baseWireWidth + 1.8 : 5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={activeAnim ? 'wire-draw-in' : undefined}
                />
                {/* Main wire (animates smoothly from start pin to end pin on connection) */}
                <path
                  d={d}
                  pathLength={activeAnim ? 1 : undefined}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth={baseWireWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={activeAnim ? 'wire-draw-in' : undefined}
                />
                {/* Live Electric Current Flow Stream + Directional Chevrons while Simulation Runs */}
                {wireFlow && flowStyle && (
                  <g data-export-exclude="true" pointerEvents="none">
                    {/* Oriented reference path for exact curve-following directional chevrons */}
                    <path id={flowPathId} d={dFlow} fill="none" stroke="none" />
                    {!reducedMotion && (
                      <path
                        d={dFlow}
                        pathLength={100}
                        fill="none"
                        stroke={flowStyle.core}
                        strokeOpacity={wireFlow.category === 'signal' ? '0.68' : '0.78'}
                        strokeWidth={viewMode === 'schematic' ? 1.5 : 1.9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="current-flow-stream"
                        style={{
                          animationDuration: `${Math.max(0.4, wireFlow.durationSec * 0.55).toFixed(2)}s`,
                        }}
                      />
                    )}
                    {reducedMotion ? (
                      <g transform={`translate(${staticMid.x}, ${staticMid.y}) rotate(${staticMid.deg})`}>
                        <polygon
                          points="-4.6,-3.4 4.2,0 -4.6,3.4 -2.2,0"
                          fill={flowStyle.arrowFill}
                          stroke={flowStyle.arrowStroke}
                          strokeWidth="1.05"
                          strokeLinejoin="round"
                        />
                      </g>
                    ) : (
                      Array.from({ length: chevronCount }).map((_, idx) => {
                        const beginOffset = -((idx / chevronCount) * wireFlow.durationSec);
                        return (
                          <g
                            key={`${wire.id}-ch-${idx}-${effectiveFlowDir}-${wireFlow.durationSec}-${viewMode}-${hasValidWaypoints ? 'wp' : 'cv'}`}
                          >
                            <polygon
                              points="-4.4,-3.2 4.0,0 -4.4,3.2 -2.1,0"
                              fill={flowStyle.arrowFill}
                              stroke={flowStyle.arrowStroke}
                              strokeWidth="0.95"
                              strokeLinejoin="round"
                            />
                            <animateMotion
                              dur={`${wireFlow.durationSec}s`}
                              begin={`${beginOffset.toFixed(2)}s`}
                              repeatCount="indefinite"
                              rotate="auto"
                              calcMode="linear"
                            >
                              <mpath href={`#${flowPathId}`} />
                            </animateMotion>
                          </g>
                        );
                      })
                    )}
                  </g>
                )}
                {/* Luminous color-coded continuity pulse wave gliding along the new circuit path */}
                {activeAnim && (
                  <g data-export-exclude="true" pointerEvents="none">
                    <path
                      d={d}
                      pathLength={1}
                      fill="none"
                      stroke={activeAnim.glowColor}
                      strokeWidth={viewMode === 'schematic' ? 4.4 : 5.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#wire-pulse-glow)"
                      className="wire-energy-pulse"
                    />
                    <path
                      d={d}
                      pathLength={1}
                      fill="none"
                      stroke={activeAnim.coreColor}
                      strokeWidth={viewMode === 'schematic' ? 1.8 : 2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="wire-energy-core"
                    />
                    {/* Concentric snap-lock ripples at source & destination pins */}
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r="5.5"
                      fill="none"
                      stroke={activeAnim.ringColor}
                      strokeWidth="2"
                      className="wire-pin-ripple"
                    />
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r="5.5"
                      fill="none"
                      stroke={activeAnim.ringColor}
                      strokeWidth="2"
                      className="wire-pin-ripple"
                      style={{ animationDelay: '0.2s' }}
                    />
                    {/* Compact color-coded connection-established tag */}
                    <g transform={`translate(${Math.max(54, Math.min(BASE_W - 54, midX))}, ${Math.max(20, midY)})`}>
                      <g className="wire-badge-pop">
                        <rect
                          x="-40"
                          y="-9"
                          width="80"
                          height="17"
                          rx="8.5"
                          fill="#0f172a"
                          fillOpacity="0.9"
                          stroke={activeAnim.ringColor}
                          strokeWidth="1.1"
                        />
                        <circle cx="-29" cy="-0.5" r="3" fill={activeAnim.glowColor} />
                        <text
                          x="4"
                          y="2.5"
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="7.4"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {activeAnim.tag}
                        </text>
                      </g>
                    </g>
                  </g>
                )}
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={isHovered ? 4.4 : 3.2}
                  fill={wire.color}
                  stroke={isHovered || activeAnim ? '#ffffff' : wireFlow && flowStyle ? flowStyle.arrowFill : 'none'}
                  strokeWidth={isHovered || activeAnim ? 1.2 : wireFlow ? 0.9 : 0}
                />
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r={isHovered ? 4.4 : 3.2}
                  fill={wire.color}
                  stroke={isHovered || activeAnim ? '#ffffff' : wireFlow && flowStyle ? flowStyle.arrowFill : 'none'}
                  strokeWidth={isHovered || activeAnim ? 1.2 : wireFlow ? 0.9 : 0}
                />
              </g>
            );
          })}

          {/* ================= TOP-LAYER COMPONENT OVERLOAD INDICATORS ================= */}
          {overloadedEntries.length > 0 && (
            <g>
              {overloadedEntries.map(({ comp, overload }) => {
                const offset = comp.kind.startsWith('resistor-') ? -34 : -50;
                const placeBelow = comp.y + offset < 24;
                const badgeX = Math.max(66, Math.min(BASE_W - 66, comp.x));
                const badgeY = placeBelow ? comp.y + 58 : comp.y + offset;
                const overloadTitle = tLoc(translations.simulator.componentOverload, lang);
                const readingText = `${overload.measuredLabel} > ${overload.ratedMaxLabel}`;
                return (
                  <g
                    key={`ov-badge-${comp.id}`}
                    transform={`translate(${badgeX}, ${badgeY})`}
                    className="cursor-pointer"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      soundEngine.playSelect();
                      setSelectedCompId(comp.id);
                    }}
                  >
                    {/* Callout pointer toward affected component */}
                    {placeBelow ? (
                      <polygon
                        points="-5,-13 5,-13 0,-19"
                        fill="#dc2626"
                        stroke="#fecaca"
                        strokeWidth="0.7"
                      />
                    ) : (
                      <polygon
                        points="-5,15 5,15 0,21"
                        fill="#dc2626"
                        stroke="#fecaca"
                        strokeWidth="0.7"
                      />
                    )}
                    {/* High-contrast 'Component Overload' Badge */}
                    <rect
                      x="-60"
                      y="-13"
                      width="120"
                      height="28"
                      rx="6"
                      fill="#dc2626"
                      stroke="#fecaca"
                      strokeWidth="1.25"
                    >
                      <animate
                        attributeName="stroke-opacity"
                        values="1;0.4;1"
                        dur="0.85s"
                        repeatCount="indefinite"
                      />
                    </rect>
                    {/* Warning Triangle Icon */}
                    <polygon points="-50,-7 -55,3 -45,3" fill="#fef08a" />
                    <text
                      x="-50"
                      y="1.5"
                      textAnchor="middle"
                      fill="#991b1b"
                      fontSize="7"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      !
                    </text>
                    {/* Explicit "Component Overload" Title */}
                    <text
                      x="6"
                      y="-2"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7.4"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      {overloadTitle}
                    </text>
                    {/* Live Measured vs Rated Limit Readout */}
                    <text
                      x="6"
                      y="9.5"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="6.9"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {readingText}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Active click-and-drag grid-snapped wire drawing preview (Wiring Tool) */}
          {dragWire && (() => {
            const pts = buildDragWireWaypoints(dragWire);
            const previewD = buildRoundedOrthogonalPath(pts, viewMode === 'schematic' ? 4 : 6);
            const targetPt = dragWire.targetNodeId ? pinCoords.get(dragWire.targetNodeId) : null;
            const endPt = targetPt ?? dragWire.cursorSnapped;
            const badgeText = dragWire.targetNodeId
              ? `${formatNodeLabel(dragWire.fromNodeId)} → ${formatNodeLabel(dragWire.targetNodeId)}`
              : `${Math.round(endPt.x)}, ${Math.round(endPt.y)}`;
            const badgeW = Math.max(76, Math.min(220, badgeText.length * 5.6 + 18));
            const badgeX = Math.max(badgeW / 2 + 8, Math.min(BASE_W - badgeW / 2 - 8, endPt.x));
            const badgeY = endPt.y < 36 ? endPt.y + 22 : endPt.y - 18;
            return (
              <g data-export-exclude="true" pointerEvents="none">
                {/* Snapped Grid Crosshairs while routing freely */}
                {!targetPt && (
                  <g stroke="#00878F" strokeOpacity="0.45" strokeWidth="0.9" strokeDasharray="3 3">
                    <line x1={endPt.x} y1="16" x2={endPt.x} y2="384" />
                    <line x1="16" y1={endPt.y} x2="754" y2={endPt.y} />
                  </g>
                )}
                {/* Soft wire glow + animated dashed path */}
                <path
                  d={previewD}
                  fill="none"
                  stroke={targetPt ? '#10b981' : wireColor}
                  strokeOpacity="0.28"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={previewD}
                  fill="none"
                  stroke={wireColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={targetPt ? undefined : '6 4'}
                >
                  {!targetPt && !reducedMotion && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="20;0"
                      dur="0.55s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>
                {/* Crisp snapped grid corner dots */}
                {pts.slice(1, -1).map((pt, idx) => (
                  <circle
                    key={`dw-c-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="2.4"
                    fill="#ffffff"
                    stroke={wireColor}
                    strokeWidth="1.5"
                  />
                ))}
                {/* Source pin anchor ring */}
                <circle
                  cx={dragWire.startPt.x}
                  cy={dragWire.startPt.y}
                  r="6.8"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                />
                {/* Magnetic target lock ring or snapped cursor dot */}
                {targetPt ? (
                  <g>
                    <circle
                      cx={targetPt.x}
                      cy={targetPt.y}
                      r="8.5"
                      fill="#10b981"
                      fillOpacity="0.22"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <circle cx={targetPt.x} cy={targetPt.y} r="3.4" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                  </g>
                ) : (
                  <circle
                    cx={endPt.x}
                    cy={endPt.y}
                    r="3.2"
                    fill="#00878F"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                )}
                {/* Floating endpoint / snapped grid readout pill */}
                <g transform={`translate(${badgeX}, ${badgeY})`}>
                  <rect
                    x={-badgeW / 2}
                    y="-9"
                    width={badgeW}
                    height="17"
                    rx="4.5"
                    fill="#0f172a"
                    fillOpacity="0.92"
                    stroke={targetPt ? '#10b981' : '#00878F'}
                    strokeWidth="1.1"
                  />
                  <text
                    x="0"
                    y="2.6"
                    textAnchor="middle"
                    fill={targetPt ? '#6ee7b7' : '#e2e8f0'}
                    fontSize="7.8"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {badgeText}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Active rubber-band wire preview while click-to-wire */}
          {!dragWire && wireStart && cursorPt && pinCoords.has(wireStart) && (() => {
            const p1 = pinCoords.get(wireStart)!;
            const previewD = buildWirePath(p1.x, p1.y, cursorPt.x, cursorPt.y);
            return (
              <g data-export-exclude="true" pointerEvents="none">
                <path
                  d={previewD}
                  fill="none"
                  stroke={wireColor}
                  strokeOpacity="0.28"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                />
                <path
                  d={previewD}
                  fill="none"
                  stroke={wireColor}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray="6 5"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="22;0"
                    dur="0.65s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            );
          })()}

          {/* ================= DRAG-AND-DROP BREADBOARD TARGET & LIVE GHOST PREVIEW ================= */}
          {(activeDragKind || dropPreview) && (
            <g data-export-exclude="true" pointerEvents="none">
              {/* Highlighted Breadboard Drop Zone */}
              <rect
                x="353"
                y="46"
                width="386"
                height="324"
                rx="12"
                fill="#00878F"
                fillOpacity={dropPreview ? '0.075' : '0.04'}
                stroke="#00878F"
                strokeWidth="2"
                strokeDasharray="7 5"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;24"
                  dur="1.1s"
                  repeatCount="indefinite"
                />
              </rect>

              {/* Idle prompt when dragging starts before cursor enters the breadboard */}
              {activeDragKind && !dropPreview && (
                <g transform="translate(546, 208)">
                  <rect
                    x="-104"
                    y="-15"
                    width="208"
                    height="30"
                    rx="8"
                    fill="#0f172a"
                    fillOpacity="0.88"
                    stroke="#00878F"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {tLoc(translations.simulator.dropOnBreadboard, lang)}
                  </text>
                </g>
              )}

              {/* Live Snapped Alignment Crosshairs + Ghost Component Silhouette */}
              {dropPreview && (() => {
                const ghostPins = COMPONENT_PINS[dropPreview.kind] || [];
                const ghostKind = dropPreview.kind;
                return (
                  <g>
                    <line
                      x1={dropPreview.x}
                      y1="52"
                      x2={dropPreview.x}
                      y2="364"
                      stroke="#00878F"
                      strokeWidth="1.1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.7"
                    />
                    <line
                      x1="358"
                      y1={dropPreview.y}
                      x2="734"
                      y2={dropPreview.y}
                      stroke="#00878F"
                      strokeWidth="1.1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.7"
                    />

                    <g transform={`translate(${dropPreview.x}, ${dropPreview.y})`}>
                      {/* Snapped Target Halo */}
                      <rect
                        x="-40"
                        y="-34"
                        width="80"
                        height="68"
                        rx="8"
                        fill="#00878F"
                        fillOpacity="0.1"
                        stroke="#00878F"
                        strokeWidth="1.6"
                        strokeDasharray="4 3"
                      />

                      {/* Translucent Component Ghost Silhouette */}
                      <g opacity="0.78">
                        {isLedKind(ghostKind) && (() => {
                          const pal = getLedFill(ghostKind);
                          return (
                            <g>
                              <line x1="-10" y1="8" x2="-10" y2="26" stroke="#94a3b8" strokeWidth="2.4" />
                              <line x1="10" y1="8" x2="10" y2="26" stroke="#94a3b8" strokeWidth="2.4" />
                              <path
                                d="M -14 8 L -14 -10 A 14 14 0 0 1 14 -10 L 14 8 Z"
                                fill={pal.on}
                                stroke="#0f172a"
                                strokeWidth="1.2"
                              />
                              <rect x="-16" y="5" width="32" height="5" rx="2" fill={pal.off} />
                            </g>
                          );
                        })()}
                        {ghostKind.startsWith('resistor-') && (() => {
                          const bands = getResistorBands(ghostKind);
                          return (
                            <g>
                              <line x1="-26" y1="0" x2="26" y2="0" stroke="#94a3b8" strokeWidth="2.4" />
                              <rect x="-18" y="-7" width="36" height="14" rx="5" fill="#f5deb3" stroke="#b45309" strokeWidth="1.2" />
                              <rect x="-12" y="-7" width="4" height="14" fill={bands[0]} />
                              <rect x="-5" y="-7" width="4" height="14" fill={bands[1]} />
                              <rect x="2" y="-7" width="4" height="14" fill={bands[2]} />
                              <rect x="10" y="-7" width="3" height="14" fill={bands[3]} />
                            </g>
                          );
                        })()}
                        {ghostKind === 'button' && (
                          <g>
                            <rect x="-20" y="-18" width="40" height="36" rx="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.4" />
                            <circle cx="0" cy="0" r="11" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.4" />
                          </g>
                        )}
                        {ghostKind === 'potentiometer' && (
                          <g>
                            <rect x="-24" y="-22" width="48" height="44" rx="6" fill="#0369a1" stroke="#0c4a6e" strokeWidth="1.4" />
                            <circle cx="0" cy="0" r="15" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.4" />
                            <line x1="0" y1="0" x2="0" y2="-13" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                          </g>
                        )}
                        {ghostKind === 'ldr' && (
                          <g>
                            <circle cx="0" cy="-2" r="18" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                            <path d="M -10 -7 Q 0 -12 10 -7 Q 0 -2 -10 3 Q 0 8 10 3" fill="none" stroke="#b45309" strokeWidth="2" />
                          </g>
                        )}
                        {ghostKind === 'ultrasonic' && (
                          <g>
                            <rect x="-42" y="-22" width="84" height="40" rx="5" fill="#0d9488" stroke="#115e59" strokeWidth="1.4" />
                            <circle cx="-21" cy="-2" r="13" fill="#cbd5e1" stroke="#475569" strokeWidth="1.6" />
                            <circle cx="21" cy="-2" r="13" fill="#cbd5e1" stroke="#475569" strokeWidth="1.6" />
                          </g>
                        )}
                        {ghostKind === 'servo' && (
                          <g>
                            <rect x="-32" y="-16" width="64" height="36" rx="4" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.4" />
                            <circle cx="10" cy="2" r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.4" />
                            <rect x="-4" y="-22" width="8" height="26" rx="4" fill="#f8fafc" stroke="#475569" strokeWidth="1.2" transform="translate(10, 2)" />
                          </g>
                        )}
                        {ghostKind === 'buzzer' && (
                          <g>
                            <circle cx="0" cy="-2" r="19" fill="#1e293b" stroke="#64748b" strokeWidth="1.6" />
                            <circle cx="0" cy="-2" r="6" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.2" />
                          </g>
                        )}
                        {ghostKind === 'temp-sensor' && (
                          <g>
                            <path d="M -16 6 L -16 -8 A 16 14 0 0 1 16 -8 L 16 6 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.4" />
                          </g>
                        )}
                        {ghostKind === 'multimeter' && (
                          <g>
                            <rect x="-36" y="-34" width="72" height="58" rx="7" fill="#eab308" stroke="#a16207" strokeWidth="1.4" />
                            <rect x="-32" y="-30" width="64" height="50" rx="4.5" fill="#0f172a" />
                            <rect x="-28" y="-26" width="56" height="23" rx="2.5" fill="#a7f3d0" />
                            <text x="0" y="-11" textAnchor="middle" fill="#064e3b" fontSize="9.5" fontWeight="800" fontFamily="monospace">
                              0.00 V
                            </text>
                          </g>
                        )}
                      </g>

                      {/* Preview Pin Alignment Dots */}
                      {ghostPins.map((pin) => (
                        <circle
                          key={pin.id}
                          cx={pin.dx}
                          cy={pin.dy}
                          r="3.2"
                          fill="#22c6cf"
                          stroke="#0f172a"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Snapped Coordinate Pill */}
                      <g transform="translate(0, -45)">
                        <rect
                          x="-64"
                          y="-9"
                          width="128"
                          height="16"
                          rx="4"
                          fill="#0f172a"
                          fillOpacity="0.92"
                          stroke="#22c6cf"
                          strokeWidth="0.9"
                        />
                        <text
                          x="0"
                          y="2"
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="7.6"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {`${ghostKind.toUpperCase()} (${dropPreview.x},${dropPreview.y})`}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Quiet bottom hint bar + live hovered wire / node endpoint inspector */}
        <div className="pointer-events-none absolute bottom-2 start-3 end-3 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span
            className={cn(
              'truncate',
              wiringToolActive && 'text-[#00878F] dark:text-[#22c6cf] font-medium',
            )}
          >
            {wiringToolActive
              ? tLoc(translations.simulator.wiringToolActiveHint, lang)
              : tLoc(translations.simulator.wiringHint, lang)}
          </span>
          {!hoveredWireId && hoverNodeId && (wiringToolActive || wireStart || dragWire) && (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 text-cyan-200 font-mono text-[10px] border border-[#00878F]/50 shadow-sm tabular-nums">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: wireColor }}
              />
              <span>{formatNodeLabel(hoverNodeId)}</span>
            </span>
          )}
          {hoveredWireId && (() => {
            const wire = circuit.wires.find((w) => w.id === hoveredWireId);
            if (!wire) return null;
            const wf = running && currentFlowEnabled ? currentFlowMap.wires[wire.id] : undefined;
            const effDir = wf
              ? flowMode === 'electrons'
                ? (wf.direction === 1 ? -1 : 1)
                : wf.direction
              : 0;
            return (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-100 font-mono text-[10px] border border-cyan-500/40 shadow-sm tabular-nums">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: wire.color }}
                />
                <span>{formatNodeLabel(wire.from)}</span>
                <span
                  className={
                    wf
                      ? wf.category === 'overload'
                        ? 'text-rose-400 font-bold'
                        : flowMode === 'electrons'
                          ? 'text-cyan-300 font-bold'
                          : 'text-amber-300 font-bold'
                      : 'text-cyan-400'
                  }
                >
                  {effDir === 1 ? '→' : effDir === -1 ? '←' : '⇄'}
                </span>
                <span>{formatNodeLabel(wire.to)}</span>
                {wf && (
                  <span className="text-amber-300 font-semibold ps-1 border-s border-slate-700">
                    {wf.currentMa} mA
                  </span>
                )}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Interactive Live Input Controls Bar (for Potentiometer, LDR, HC-SR04, TMP36, Pushbutton) */}
      {interactiveInputs.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
          {interactiveInputs.map((comp) => {
            if (comp.kind === 'button') {
              return (
                <button
                  key={comp.id}
                  type="button"
                  onPointerDown={() => {
                    soundEngine.playSelect();
                    updateComponentValue(comp.id, 1);
                  }}
                  onPointerUp={() => updateComponentValue(comp.id, 0)}
                  onPointerLeave={() => updateComponentValue(comp.id, 0)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                    comp.value === 1
                      ? 'bg-[#00878F] text-white border-[#00878F]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
                  )}
                >
                  {comp.label || 'Pushbutton'}: {comp.value === 1 ? 'PRESSED' : 'HOLD TO PRESS'}
                </button>
              );
            }
            if (comp.kind === 'multimeter') {
              const mode = getMultimeterModeFromValue(comp.value);
              const reading = multimeterReadings[comp.id];
              const isFuse = reading?.warning === 'fuse-overload';
              const isLiveWarn = reading?.warning === 'live-circuit';
              const statusHint = isFuse
                ? tLoc(translations.simulator.multimeterFuseWarn, lang)
                : isLiveWarn
                  ? tLoc(translations.simulator.multimeterLiveWarn, lang)
                  : !reading?.connected
                    ? tLoc(translations.simulator.multimeterProbesHint, lang)
                    : reading.warning === 'idle'
                      ? tLoc(translations.simulator.multimeterIdleHint, lang)
                      : null;

              return (
                <div
                  key={comp.id}
                  className="flex flex-wrap items-center gap-2 text-xs rounded-lg border border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {comp.label || 'DMM'}
                    </span>
                  </div>

                  {/* Mode Selector Buttons */}
                  <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                    {(
                      [
                        { id: 'voltage' as const, short: 'V', title: translations.simulator.multimeterVoltage },
                        { id: 'current' as const, short: 'mA', title: translations.simulator.multimeterCurrent },
                        { id: 'resistance' as const, short: 'Ω', title: translations.simulator.multimeterResistance },
                      ]
                    ).map((m) => {
                      const active = mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={active}
                          title={tLoc(m.title, lang)}
                          onClick={() => {
                            soundEngine.playSelect();
                            updateComponentValue(comp.id, getMultimeterValueFromMode(m.id));
                          }}
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors whitespace-nowrap cursor-pointer',
                            active
                              ? 'bg-[#00878F] text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                          )}
                        >
                          {m.short}
                        </button>
                      );
                    })}
                  </div>

                  {/* Crisp Tabular LCD Readout */}
                  <span
                    className={cn(
                      'font-mono tabular-nums text-xs font-extrabold px-2 py-0.5 rounded border whitespace-nowrap',
                      isFuse
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                        : isLiveWarn
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/45'
                          : reading?.connected && reading.warning === 'none'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/35'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                    )}
                  >
                    {reading?.displayText ?? '0.00 V'}
                  </span>

                  {/* Probed Node Endpoints or Actionable Hint */}
                  {reading?.posTarget && reading?.negTarget ? (
                    <span className="font-mono text-[10.5px] text-slate-600 dark:text-slate-300 flex items-center gap-1 whitespace-nowrap">
                      <span className="text-rose-600 dark:text-rose-400 font-bold">+</span>
                      <span>{formatNodeLabel(reading.posTarget)}</span>
                      <span className="opacity-50">↔</span>
                      <span className="text-slate-500 dark:text-slate-400 font-bold">−</span>
                      <span>{formatNodeLabel(reading.negTarget)}</span>
                    </span>
                  ) : null}

                  {statusHint && (
                    <span
                      className={cn(
                        'text-[11px] font-medium',
                        isFuse
                          ? 'text-rose-600 dark:text-rose-400'
                          : isLiveWarn
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {statusHint}
                    </span>
                  )}
                </div>
              );
            }
            const cfg =
              comp.kind === 'ultrasonic'
                ? { min: 2, max: 200, unit: 'cm' }
                : comp.kind === 'temp-sensor'
                  ? { min: -10, max: 65, unit: '°C' }
                  : { min: 0, max: 1023, unit: '' };
            return (
              <div key={comp.id} className="flex items-center gap-2 text-xs">
                <Cpu className="w-3.5 h-3.5 text-[#00878F] shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {comp.label || comp.kind}
                </span>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  value={comp.value ?? cfg.min}
                  onChange={(e) => updateComponentValue(comp.id, Number(e.target.value))}
                  className="w-28 accent-[#00878F] cursor-pointer"
                />
                <span className="font-mono tabular-nums font-semibold text-[#00878F] dark:text-[#22c6cf] w-14">
                  {comp.value ?? cfg.min}
                  {cfg.unit}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Component Palette Bar (click to drop onto breadboard) */}
      {!compactPalette && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap me-1">
              {tLoc(translations.simulator.components, lang)}:
            </span>
            {PALETTE_COMPONENTS.map((item) => (
              <button
                key={item.kind}
                type="button"
                draggable
                title={tLoc(translations.simulator.dragPartTooltip, lang)}
                onDragStart={(e) => {
                  setPaletteDragKind(item.kind);
                  e.dataTransfer.setData(ARDUNOLAB_COMPONENT_MIME, item.kind);
                  e.dataTransfer.setData('text/plain', item.kind);
                  e.dataTransfer.effectAllowed = 'copy';
                  soundEngine.playSelect();
                }}
                onDragEnd={() => {
                  setPaletteDragKind(null);
                  setDropPreview(null);
                }}
                onClick={() => handleAddComponent(item.kind)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#00878F] hover:text-[#00878F] transition-colors whitespace-nowrap shrink-0 cursor-grab active:cursor-grabbing"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.swatch }}
                />
                <span>{tLoc(item.name, lang)}</span>
                <Plus className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Smart Context-Aware Hover Tooltip (Portal-rendered so it never clips) */}
      {smartTooltipsEnabled && (
        <SmartComponentTooltip
          lang={lang}
          target={tooltipTarget}
          circuit={circuit}
          componentPower={componentPower}
          pinValues={pinValues}
          servoAngles={servoAngles}
          buzzerTone={buzzerTone}
          running={running}
          ledD13On={ledD13On}
          multimeterReadings={multimeterReadings}
        />
      )}
    </div>
  );
}
