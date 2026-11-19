import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Grid3x3,
  Hand,
  Maximize2,
  Plus,
  Route,
  Trash2,
  Unplug,
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
  autoRouteCircuitWires,
  buildRoundedOrthogonalPath,
} from '../../engine/wireAutoRouter';
import { soundEngine } from '../../utils/sound';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { cn } from '../../lib/utils';

export const WIRE_COLORS = [
  { id: 'red', hex: '#ef4444', label: '5V / Red' },
  { id: 'black', hex: '#1e293b', label: 'GND / Black' },
  { id: 'yellow', hex: '#eab308', label: 'Signal / Yellow' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'green', hex: '#22c55e', label: 'Green' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
];

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

interface BreadboardCanvasProps {
  lang: Language;
  circuit: CircuitState;
  onChangeCircuit: React.Dispatch<React.SetStateAction<CircuitState>>;
  viewMode: 'breadboard' | 'schematic';
  running: boolean;
  ledD13On: boolean;
  pinValues: Record<string, number>;
  servoAngles: Record<string, number>;
  buzzerTone: { pin: string; freq: number } | null;
  componentPower: Record<string, ComponentPowerState>;
  diagnostics: ElectricalDiagnostic[];
  compactPalette?: boolean;
  svgExternalRef?: React.MutableRefObject<SVGSVGElement | null>;
}

export function BreadboardCanvas({
  lang,
  circuit,
  onChangeCircuit,
  viewMode,
  running,
  ledD13On,
  pinValues,
  servoAngles,
  buzzerTone,
  componentPower,
  diagnostics,
  compactPalette = false,
  svgExternalRef,
}: BreadboardCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const [wireColor, setWireColor] = useState('#ef4444');
  const [wireStart, setWireStart] = useState<string | null>(null);
  const [cursorPt, setCursorPt] = useState<{ x: number; y: number } | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

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

  // Build quick lookup map of every connectable pin coordinate
  const buildPinCoordsMap = (components: PlacedComponent[]) => {
    const map = new Map<string, { x: number; y: number }>();
    ARDUINO_PINS.forEach((p) => map.set(`arduino:${p.id}`, { x: p.x, y: p.y }));
    components.forEach((c) => {
      const defs = COMPONENT_PINS[c.kind] || [];
      defs.forEach((d) => {
        map.set(`comp:${c.id}:${d.id}`, { x: c.x + d.dx, y: c.y + d.dy });
      });
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
    return nodeId;
  };

  const handlePinClick = (nodeId: string, e: React.MouseEvent) => {
    if (effectivePanMode) return;
    e.stopPropagation();
    if (!wireStart) {
      setWireStart(nodeId);
      soundEngine.playSelect();
      return;
    }
    if (wireStart === nodeId) {
      setWireStart(null);
      return;
    }
    // Create jumper wire (and auto-route immediately if Auto-Route mode is active)
    const newWire: WireConnection = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: wireStart,
      to: nodeId,
      color: wireColor,
    };
    onChangeCircuit((prev) => {
      const nextWires = [...prev.wires, newWire];
      if (autoRouteStickyRef.current) {
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

  const handleDeleteWire = (wireId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playSelect();
    onChangeCircuit((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
  };

  const handleAddComponent = (kind: ComponentKind) => {
    soundEngine.playSelect();
    const offset = (circuit.components.length % 5) * 28;
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
    const rawX = 465 + offset;
    const rawY = 140 + (circuit.components.length % 3) * 60;
    const snapped = snapCoord(rawX, rawY);
    const comp: PlacedComponent = {
      id: `c-${Date.now().toString(36)}`,
      kind,
      x: snapped.x,
      y: snapped.y,
      label: kind.toUpperCase().replace('-', ' '),
      value: defaultVal,
    };
    onChangeCircuit((prev) => ({
      ...prev,
      components: [...prev.components, comp],
    }));
    setSelectedCompId(comp.id);
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
    if (wireStart) {
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

  // Interactive sensor/input components present on the breadboard
  const interactiveInputs = circuit.components.filter((c) =>
    ['button', 'potentiometer', 'ldr', 'ultrasonic', 'temp-sensor'].includes(c.kind),
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

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0D1424] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Wiring Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
        {/* Wire Color Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {tLoc(translations.simulator.wireColor, lang)}:
          </span>
          <div className="flex items-center gap-1.5">
            {WIRE_COLORS.map((wc) => (
              <button
                key={wc.id}
                type="button"
                title={wc.label}
                onClick={() => {
                  soundEngine.playSelect();
                  setWireColor(wc.hex);
                }}
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition-transform cursor-pointer',
                  wireColor === wc.hex
                    ? 'scale-115 border-[#00878F] ring-2 ring-[#00878F]/40'
                    : 'border-white dark:border-slate-700',
                )}
                style={{ backgroundColor: wc.hex }}
              />
            ))}
          </div>
          {wireStart && (
            <button
              type="button"
              onClick={() => setWireStart(null)}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline ms-1 cursor-pointer"
            >
              Cancel Wire
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
          }
        }}
        className="relative flex-1 min-h-[340px] w-full overflow-hidden select-none focus:outline-none"
        dir="ltr"
      >
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
              setPanMode((p) => !p);
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
            effectivePanMode ? 'cursor-grab active:cursor-grabbing' : '',
          )}
          onPointerDownCapture={handleSvgPointerDownCapture}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerCancel={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
          onDoubleClick={handleSvgDoubleClick}
          onClick={() => {
            setWireStart(null);
            setSelectedCompId(null);
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

              {/* ATmega328P DIP Chip */}
              <rect
                x="118"
                y="165"
                width="76"
                height="168"
                rx="4"
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth="1.5"
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
          {viewMode === 'breadboard' ? (
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
              <line x1="368" y1="62" x2="724" y2="62" stroke="#ef4444" strokeWidth="2" />
              <line x1="368" y1="76" x2="724" y2="76" stroke="#2563eb" strokeWidth="2" />
              <text x="355" y="65" fill="#ef4444" fontSize="11" fontWeight="bold">
                +
              </text>
              <text x="355" y="79" fill="#2563eb" fontSize="12" fontWeight="bold">
                -
              </text>

              {/* Center DIP Valley */}
              <rect x="366" y="200" width="360" height="14" rx="3" fill="#e2e8f0" />

              {/* Breadboard Hole Matrix */}
              {Array.from({ length: 24 }).map((_, col) => {
                const cx = 376 + col * 14.8;
                return (
                  <g key={col}>
                    {[96, 114, 132, 150, 168, 228, 246, 264, 282, 300].map((cy) => (
                      <rect
                        key={cy}
                        x={cx - 2.2}
                        y={cy - 2.2}
                        width="4.4"
                        height="4.4"
                        rx="0.8"
                        fill="#475569"
                        fillOpacity="0.48"
                      />
                    ))}
                  </g>
                );
              })}

              {/* Bottom Power Rail */}
              <line x1="368" y1="336" x2="724" y2="336" stroke="#ef4444" strokeWidth="2" />
              <line x1="368" y1="352" x2="724" y2="352" stroke="#2563eb" strokeWidth="2" />
            </g>
          ) : (
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
                className={effectivePanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-move'}
                onPointerDown={(e) => {
                  if (
                    effectivePanMode ||
                    pinchStateRef.current.active ||
                    activeTouchPointersRef.current.size >= 2
                  ) {
                    return;
                  }
                  e.stopPropagation();
                  setSelectedCompId(comp.id);
                  setDraggingId(comp.id);
                }}
              >
                {isSelected && !pwr?.overload && (
                  <rect
                    x="-42"
                    y="-36"
                    width="84"
                    height="72"
                    rx="8"
                    fill="none"
                    stroke="#00878F"
                    strokeWidth="1.8"
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

                {/* Component Label */}
                {comp.label && (
                  <text
                    x="0"
                    y="40"
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
                  return (
                    <g
                      key={pin.id}
                      className="cursor-crosshair"
                      onClick={(e) => handlePinClick(nodeId, e)}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <circle
                        cx={pin.dx}
                        cy={pin.dy}
                        r={isStart ? 6.5 : 5}
                        fill={isStart ? '#f59e0b' : '#0f172a'}
                        stroke="#22d3ee"
                        strokeWidth={isStart ? 2.2 : 1.3}
                      />
                      <text
                        x={pin.dx}
                        y={pin.dy + 13}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="7"
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
            return (
              <g
                key={wire.id}
                className="cursor-pointer group"
                onPointerEnter={() => setHoveredWireId(wire.id)}
                onPointerLeave={() => setHoveredWireId((prev) => (prev === wire.id ? null : prev))}
                onClick={(e) => handleDeleteWire(wire.id, e)}
              >
                {/* Wider invisible hit target */}
                <path d={d} fill="none" stroke="transparent" strokeWidth="12" strokeLinejoin="round" />
                {/* Hover inspection highlight halo */}
                {isHovered && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#22d3ee"
                    strokeOpacity="0.65"
                    strokeWidth={viewMode === 'schematic' ? 6.5 : 8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Subtle shadow */}
                <path
                  d={d}
                  fill="none"
                  stroke="#000000"
                  strokeOpacity="0.22"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Main wire */}
                <path
                  d={d}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth={
                    isHovered
                      ? viewMode === 'schematic'
                        ? 3.0
                        : 4.0
                      : viewMode === 'schematic'
                        ? 2.2
                        : 3.2
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={isHovered ? 4.4 : 3.2}
                  fill={wire.color}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  strokeWidth={isHovered ? 1.2 : 0}
                />
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r={isHovered ? 4.4 : 3.2}
                  fill={wire.color}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  strokeWidth={isHovered ? 1.2 : 0}
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

          {/* Active rubber-band wire preview while wiring */}
          {wireStart && cursorPt && pinCoords.has(wireStart) && (() => {
            const p1 = pinCoords.get(wireStart)!;
            return (
              <path
                d={buildWirePath(p1.x, p1.y, cursorPt.x, cursorPt.y)}
                fill="none"
                stroke={wireColor}
                strokeWidth="2.8"
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            );
          })()}
        </svg>

        {/* Quiet bottom hint bar + live hovered wire endpoint inspector */}
        <div className="pointer-events-none absolute bottom-2 start-3 end-3 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{tLoc(translations.simulator.wiringHint, lang)}</span>
          {hoveredWireId && (() => {
            const wire = circuit.wires.find((w) => w.id === hoveredWireId);
            if (!wire) return null;
            return (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-100 font-mono text-[10px] border border-cyan-500/40 shadow-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: wire.color }}
                />
                <span>{formatNodeLabel(wire.from)}</span>
                <span className="text-cyan-400">⇄</span>
                <span>{formatNodeLabel(wire.to)}</span>
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
                onClick={() => handleAddComponent(item.kind)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#00878F] hover:text-[#00878F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
    </div>
  );
}
