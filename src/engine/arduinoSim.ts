import type {
  CircuitState,
  ComponentKind,
  ComponentOverloadInfo,
  ComponentPinDef,
  ComponentPowerState,
  ElectricalDiagnostic,
  PlacedComponent,
} from '../types/arduino';

export const COMPONENT_PINS: Record<ComponentKind, ComponentPinDef[]> = {
  'led-red': [
    { id: 'anode', label: '+', dx: -10, dy: 26, role: 'anode' },
    { id: 'cathode', label: '-', dx: 10, dy: 26, role: 'cathode' },
  ],
  'led-green': [
    { id: 'anode', label: '+', dx: -10, dy: 26, role: 'anode' },
    { id: 'cathode', label: '-', dx: 10, dy: 26, role: 'cathode' },
  ],
  'led-blue': [
    { id: 'anode', label: '+', dx: -10, dy: 26, role: 'anode' },
    { id: 'cathode', label: '-', dx: 10, dy: 26, role: 'cathode' },
  ],
  'led-yellow': [
    { id: 'anode', label: '+', dx: -10, dy: 26, role: 'anode' },
    { id: 'cathode', label: '-', dx: 10, dy: 26, role: 'cathode' },
  ],
  'resistor-220': [
    { id: 'a', label: '1', dx: -26, dy: 0, role: 'terminal' },
    { id: 'b', label: '2', dx: 26, dy: 0, role: 'terminal' },
  ],
  'resistor-1k': [
    { id: 'a', label: '1', dx: -26, dy: 0, role: 'terminal' },
    { id: 'b', label: '2', dx: 26, dy: 0, role: 'terminal' },
  ],
  'resistor-10k': [
    { id: 'a', label: '1', dx: -26, dy: 0, role: 'terminal' },
    { id: 'b', label: '2', dx: 26, dy: 0, role: 'terminal' },
  ],
  button: [
    { id: 'a', label: 'SIG', dx: -16, dy: 22, role: 'signal' },
    { id: 'b', label: 'GND', dx: 16, dy: 22, role: 'gnd' },
  ],
  potentiometer: [
    { id: 'vcc', label: '5V', dx: -18, dy: 26, role: 'vcc' },
    { id: 'sig', label: 'SIG', dx: 0, dy: 26, role: 'signal' },
    { id: 'gnd', label: 'GND', dx: 18, dy: 26, role: 'gnd' },
  ],
  ldr: [
    { id: 'vcc', label: '5V', dx: -14, dy: 24, role: 'vcc' },
    { id: 'sig', label: 'SIG', dx: 0, dy: 24, role: 'signal' },
    { id: 'gnd', label: 'GND', dx: 14, dy: 24, role: 'gnd' },
  ],
  ultrasonic: [
    { id: 'vcc', label: 'VCC', dx: -27, dy: 24, role: 'vcc' },
    { id: 'trig', label: 'TRIG', dx: -9, dy: 24, role: 'trig' },
    { id: 'echo', label: 'ECHO', dx: 9, dy: 24, role: 'echo' },
    { id: 'gnd', label: 'GND', dx: 27, dy: 24, role: 'gnd' },
  ],
  servo: [
    { id: 'gnd', label: 'GND', dx: -16, dy: 26, role: 'gnd' },
    { id: 'vcc', label: '5V', dx: 0, dy: 26, role: 'vcc' },
    { id: 'sig', label: 'PWM', dx: 16, dy: 26, role: 'signal' },
  ],
  buzzer: [
    { id: 'pos', label: '+', dx: -12, dy: 24, role: 'signal' },
    { id: 'neg', label: '-', dx: 12, dy: 24, role: 'gnd' },
  ],
  'temp-sensor': [
    { id: 'vcc', label: '5V', dx: -16, dy: 24, role: 'vcc' },
    { id: 'sig', label: 'OUT', dx: 0, dy: 24, role: 'signal' },
    { id: 'gnd', label: 'GND', dx: 16, dy: 24, role: 'gnd' },
  ],
  multimeter: [
    { id: 'pos', label: 'VΩ+', dx: -16, dy: 30, role: 'vcc' },
    { id: 'neg', label: 'COM', dx: 16, dy: 30, role: 'gnd' },
  ],
};

export function isLedKind(kind: ComponentKind): boolean {
  return kind.startsWith('led-');
}

export function isResistorKind(kind: ComponentKind): boolean {
  return kind.startsWith('resistor-');
}

function getResistorOhms(kind: ComponentKind): number {
  if (kind === 'resistor-1k') return 1000;
  if (kind === 'resistor-10k') return 10000;
  return 220;
}

function getLedForwardVoltage(kind: ComponentKind): number {
  if (kind === 'led-blue') return 3.0;
  if (kind === 'led-green') return 2.2;
  return 2.0; // red & yellow
}

function isPowerRailPin(pin: string): boolean {
  return pin === '5V' || pin === '3.3V' || pin === 'VIN';
}

function getPinNominalVoltage(pin: string): number {
  if (pin === 'VIN') return 9.0;
  if (pin === '5V') return 5.0;
  if (pin === '3.3V') return 3.3;
  return 5.0; // Arduino Uno R3 Digital/Analog I/O peak logic HIGH voltage
}

function getPinLiveVoltage(pin: string, pinValues: Record<string, number>): number {
  if (pin === 'VIN') return 9.0;
  if (pin === '5V') return 5.0;
  if (pin === '3.3V') return 3.3;
  const val = pinValues[pin] ?? 0;
  return (Math.max(0, Math.min(255, val)) / 255) * 5.0;
}

export type AnalogPinId = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';

export interface AnalogPinTelemetry {
  pin: AnalogPinId;
  voltage: number;
  adc: number;
  connected: boolean;
  sourceLabel: string;
  pwmDuty?: number;
}

/**
 * Union-Find electrical connectivity, Ohm's Law current/power estimator,
 * and Component Overload analyzer.
 * Traces jumper wires, series resistors, and detects short circuits,
 * over-voltage (e.g. VIN 9V on 5V parts), over-current (unprotected LEDs / I/O pin overload),
 * resistor thermal dissipation (> 250 mW), and reverse polarity.
 */
export function analyzeCircuit(
  circuit: CircuitState,
  pinValues: Record<string, number>,
): {
  diagnostics: ElectricalDiagnostic[];
  componentPower: Record<string, ComponentPowerState>;
  pinToComponent: Record<string, PlacedComponent[]>;
  analogPinTelemetry: Record<AnalogPinId, AnalogPinTelemetry>;
  buttonPressedOnPin: (pin: string) => boolean;
  analogValueForPin: (pin: string) => number | null;
  ultrasonicDistanceCm: (trigPin: string, echoPin: string) => number | null;
} {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // Normalize breadboard rails if wired to bb:rail-pos / bb:rail-neg
  const normalizeNode = (node: string): string => {
    if (node.startsWith('arduino:GND')) return 'arduino:GND';
    if (node.startsWith('bb:pos:')) return 'bb:rail-pos';
    if (node.startsWith('bb:neg:')) return 'bb:rail-neg';
    if (node.startsWith('bb:col:')) {
      // bb:col:12:top or bb:col:12:bot share a 5-hole vertical strip
      const parts = node.split(':');
      return `bb:strip:${parts[2]}:${parts[3]}`;
    }
    return node;
  };

  // Direct wire connections (excluding resistors first so we know direct vs resistor-bridged)
  for (const w of circuit.wires) {
    union(normalizeNode(w.from), normalizeNode(w.to));
  }

  // Series Ammeter mode (value === 1): low-impedance current shunt conducts seamlessly in series
  for (const comp of circuit.components) {
    if (comp.kind === 'multimeter' && (comp.value ?? 0) === 1) {
      union(`comp:${comp.id}:pos`, `comp:${comp.id}:neg`);
    }
  }

  // Build resistor-bridged graph separately for LED protection & signal tracing
  const parentWithRes = new Map<string, string>(parent);
  const findRes = (x: string): string => {
    if (!parentWithRes.has(x)) parentWithRes.set(x, x);
    let root = x;
    while (parentWithRes.get(root) !== root) root = parentWithRes.get(root)!;
    let cur = x;
    while (cur !== root) {
      const next = parentWithRes.get(cur)!;
      parentWithRes.set(cur, root);
      cur = next;
    }
    return root;
  };
  const unionRes = (a: string, b: string) => {
    const ra = findRes(a);
    const rb = findRes(b);
    if (ra !== rb) parentWithRes.set(ra, rb);
  };

  for (const w of circuit.wires) {
    unionRes(normalizeNode(w.from), normalizeNode(w.to));
  }
  for (const comp of circuit.components) {
    if (comp.kind === 'multimeter' && (comp.value ?? 0) === 1) {
      unionRes(`comp:${comp.id}:pos`, `comp:${comp.id}:neg`);
    }
  }

  // Build weighted adjacency list of direct nets linked by resistors for Ohm's Law series-R calculation
  const resistorAdj = new Map<string, Array<{ to: string; ohms: number }>>();
  const addResistorEdge = (netA: string, netB: string, ohms: number) => {
    if (netA === netB) return;
    if (!resistorAdj.has(netA)) resistorAdj.set(netA, []);
    if (!resistorAdj.has(netB)) resistorAdj.set(netB, []);
    resistorAdj.get(netA)!.push({ to: netB, ohms });
    resistorAdj.get(netB)!.push({ to: netA, ohms });
  };

  for (const comp of circuit.components) {
    if (isResistorKind(comp.kind)) {
      const aNode = `comp:${comp.id}:a`;
      const bNode = `comp:${comp.id}:b`;
      unionRes(aNode, bNode);
      addResistorEdge(find(aNode), find(bNode), getResistorOhms(comp.kind));
    }
  }

  // Lowest-resistance path between two nodes across direct wires & resistors (0 = direct, Infinity = open)
  const findMinResistanceBetween = (nodeA: string, nodeB: string): number => {
    const start = find(normalizeNode(nodeA));
    const goal = find(normalizeNode(nodeB));
    if (start === goal) return 0;
    if (findRes(normalizeNode(nodeA)) !== findRes(normalizeNode(nodeB))) return Infinity;

    const dist = new Map<string, number>([[start, 0]]);
    const visited = new Set<string>();

    while (true) {
      let cur: string | null = null;
      let best = Infinity;
      for (const [k, d] of dist.entries()) {
        if (!visited.has(k) && d < best) {
          best = d;
          cur = k;
        }
      }
      if (!cur || best === Infinity) break;
      if (cur === goal) return best;
      visited.add(cur);
      const edges = resistorAdj.get(cur);
      if (!edges) continue;
      for (const e of edges) {
        const nd = best + e.ohms;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
        }
      }
    }
    return Infinity;
  };

  const diagnostics: ElectricalDiagnostic[] = [];
  const componentPower: Record<string, ComponentPowerState> = {};
  const pinToComponent: Record<string, PlacedComponent[]> = {};

  // Check 5V / 3.3V / VIN <-> GND direct short circuit
  const net5V = find('arduino:5V');
  const net3V3 = find('arduino:3.3V');
  const netVIN = find('arduino:VIN');
  const netGND = find('arduino:GND');
  const shortedRail =
    netVIN === netGND
      ? 'VIN (9V)'
      : net5V === netGND
        ? '5V'
        : net3V3 === netGND
          ? '3.3V'
          : null;

  if (shortedRail) {
    diagnostics.push({
      severity: 'error',
      code: 'SHORT_CIRCUIT',
      message: {
        ar: `تحذير حرج: يوجد قصر دائرة مباشر بين ${shortedRail} و GND!`,
        en: `Critical Warning: Direct short circuit between ${shortedRail} and GND!`,
        fr: `Alerte critique : Court-circuit direct entre ${shortedRail} et GND !`,
      },
    });
  }

  const allArduinoPins = [
    'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
    'D8', 'D9', 'D10', 'D11', 'D12', 'D13',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
    '5V', '3.3V', 'VIN',
  ];

  // Helper: find which Arduino pins drive a given component pin (through wires or resistor)
  const findConnectedArduinoPins = (
    compPinNode: string,
    throughResistors: boolean,
  ): string[] => {
    const fn = throughResistors ? findRes : find;
    const targetNet = fn(compPinNode);
    const matched: string[] = [];
    for (const p of allArduinoPins) {
      if (fn(`arduino:${p}`) === targetNet) {
        matched.push(p);
      }
    }
    return matched;
  };

  const isConnectedToGnd = (
    compPinNode: string,
    throughResistors: boolean,
  ): boolean => {
    const fn = throughResistors ? findRes : find;
    return fn(compPinNode) === fn('arduino:GND');
  };

  const getDirectRailVoltage = (compPinNode: string): { pin: string; volts: number } | null => {
    const directPins = findConnectedArduinoPins(compPinNode, false);
    if (directPins.includes('VIN')) return { pin: 'VIN', volts: 9.0 };
    if (directPins.includes('5V')) return { pin: '5V', volts: 5.0 };
    if (directPins.includes('3.3V')) return { pin: '3.3V', volts: 3.3 };
    return null;
  };

  const compName = (comp: PlacedComponent) => comp.label || comp.kind;

  for (const comp of circuit.components) {
    if (isLedKind(comp.kind)) {
      const anode = `comp:${comp.id}:anode`;
      const cathode = `comp:${comp.id}:cathode`;
      const gndOk = isConnectedToGnd(cathode, true);
      const directGnd = isConnectedToGnd(cathode, false);
      const drivePinsRes = findConnectedArduinoPins(anode, true);
      const drivePinsDirect = findConnectedArduinoPins(anode, false);

      drivePinsRes.forEach((p) => {
        if (!pinToComponent[p]) pinToComponent[p] = [];
        pinToComponent[p].push(comp);
      });

      const hasResistorInSeries =
        (drivePinsRes.length > 0 && drivePinsDirect.length === 0) ||
        (gndOk && !directGnd);

      let maxDrive = 0;
      let peakSourceV = 0;
      let peakSourcePin: string | null = null;
      let bestSeriesR = Infinity;

      for (const p of drivePinsRes) {
        const nomV = getPinNominalVoltage(p);
        const liveV = getPinLiveVoltage(p, pinValues);
        const drive = isPowerRailPin(p) ? 255 : (pinValues[p] ?? 0);
        if (drive > maxDrive) maxDrive = drive;

        const rAnode = findMinResistanceBetween(`arduino:${p}`, anode);
        const rCathode = gndOk ? findMinResistanceBetween(cathode, 'arduino:GND') : Infinity;
        const totalR = rAnode + rCathode;

        if (nomV > peakSourceV || (nomV === peakSourceV && totalR < bestSeriesR)) {
          peakSourceV = nomV;
          peakSourcePin = p;
          bestSeriesR = totalR;
        } else if (liveV > peakSourceV) {
          peakSourceV = liveV;
          peakSourcePin = p;
          bestSeriesR = totalR;
        }
      }

      const vf = getLedForwardVoltage(comp.kind);
      const maxSafeMa = 20;
      const absMaxMa = 25;
      const powered = gndOk && maxDrive > 0;
      const warnNoResistor =
        gndOk && drivePinsRes.length > 0 && !hasResistorInSeries;

      let estimatedMa = 0;
      let overload: ComponentOverloadInfo | null = null;

      if (gndOk && drivePinsRes.length > 0 && peakSourcePin) {
        const internalOhms = isPowerRailPin(peakSourcePin) ? 12 : 25;
        const effR = bestSeriesR === 0 ? internalOhms : bestSeriesR;
        const deltaV = Math.max(0, peakSourceV - vf);
        estimatedMa = (deltaV / effR) * 1000;

        if (warnNoResistor || estimatedMa > absMaxMa) {
          const measuredMa = Math.max(Math.round(estimatedMa), 30);
          const ratio = Number((measuredMa / maxSafeMa).toFixed(1));
          const isVinUndersized = !warnNoResistor && peakSourcePin === 'VIN';

          overload = {
            reason: 'overcurrent',
            measuredLabel: `${measuredMa} mA`,
            ratedMaxLabel: `${maxSafeMa} mA`,
            ratio,
            summary: {
              ar: isVinUndersized
                ? `تيار زائد (${measuredMa}mA) على ${compName(comp)} عبر VIN (9V) — الحد الأقصى ${maxSafeMa}mA`
                : `حمل زائد (${measuredMa}mA) على ${compName(comp)} بدون مقاومة حماية — الحد ${maxSafeMa}mA`,
              en: isVinUndersized
                ? `Over-current (${measuredMa} mA) on ${compName(comp)} from VIN (9V) — rated max ${maxSafeMa} mA`
                : `Over-current (${measuredMa} mA) on ${compName(comp)} with no limiting resistor — rated max ${maxSafeMa} mA`,
              fr: isVinUndersized
                ? `Surintensité (${measuredMa} mA) sur ${compName(comp)} via VIN (9V) — max ${maxSafeMa} mA`
                : `Surintensité (${measuredMa} mA) sur ${compName(comp)} sans résistance — max ${maxSafeMa} mA`,
            },
            fixHint: {
              ar: isVinUndersized
                ? 'استخدم مقاومة 1kΩ مع منفذ VIN (9V) أو انقل التغذية إلى 5V مع مقاومة 220Ω.'
                : 'أضف مقاومة 220Ω على التوالي مع المصباح لتحديد التيار إلى ~13mA.',
              en: isVinUndersized
                ? 'Use a 1kΩ resistor on VIN (9V), or move power to 5V with a 220Ω resistor.'
                : 'Insert a 220Ω resistor in series with the LED to limit current to ~13 mA.',
              fr: isVinUndersized
                ? 'Utilisez une résistance de 1kΩ sur VIN (9V) ou alimentez en 5V avec 220Ω.'
                : 'Ajoutez une résistance de 220Ω en série avec la LED pour limiter à ~13 mA.',
            },
          };
        }
      } else {
        // Check reverse-breakdown over-voltage (cathode directly on VIN 9V, anode on GND)
        const revRail = getDirectRailVoltage(cathode);
        const anodeOnGnd = isConnectedToGnd(anode, true);
        if (revRail && revRail.volts > 5.0 && anodeOnGnd) {
          overload = {
            reason: 'reverse-polarity',
            measuredLabel: `-${revRail.volts.toFixed(1)} V`,
            ratedMaxLabel: '5.0 V rev',
            ratio: Number((revRail.volts / 5.0).toFixed(1)),
            summary: {
              ar: `قطبية معكوسة بجهد ${revRail.volts.toFixed(1)}V على ${compName(comp)} يتجاوز جهد الانهيار العكسي (5V)`,
              en: `Reverse breakdown (${revRail.volts.toFixed(1)} V) on ${compName(comp)} exceeds 5.0 V max reverse rating`,
              fr: `Tension inverse (${revRail.volts.toFixed(1)} V) sur ${compName(comp)} dépasse la limite de 5.0 V`,
            },
            fixHint: {
              ar: 'اقلب أطراف المصباح (+ للجهد و - للأرضي GND) وأضف مقاومة حماية على التوالي.',
              en: 'Swap LED leads (+ to signal/5V, - to GND) and add a series protection resistor.',
              fr: 'Inversez les broches de la LED (+ vers 5V/signal, - vers GND) avec une résistance série.',
            },
          };
        }
      }

      componentPower[comp.id] = {
        powered,
        brightness: powered ? Math.min(1, maxDrive / 255) : 0,
        warnNoResistor,
        voltageV: peakSourceV || undefined,
        currentMa: estimatedMa > 0 ? Math.round(estimatedMa * 10) / 10 : undefined,
        overload,
      };

      if (overload) {
        diagnostics.push({
          severity: 'error',
          code: warnNoResistor ? 'LED_NO_RESISTOR' : overload.reason === 'reverse-polarity' ? 'REVERSE_POLARITY' : 'OVER_CURRENT',
          componentId: comp.id,
          message: overload.summary,
        });
      } else if (drivePinsRes.length > 0 && !gndOk) {
        diagnostics.push({
          severity: 'warning',
          code: 'MISSING_GND',
          componentId: comp.id,
          message: {
            ar: `المصباح (${compName(comp)}) غير موصول بالأرضي GND`,
            en: `LED (${compName(comp)}) is missing a GND connection`,
            fr: `La LED (${compName(comp)}) n'est pas reliée à GND`,
          },
        });
      }
    } else if (isResistorKind(comp.kind)) {
      const aNode = `comp:${comp.id}:a`;
      const bNode = `comp:${comp.id}:b`;
      const ohms = getResistorOhms(comp.kind);
      const railA = getDirectRailVoltage(aNode);
      const railB = getDirectRailVoltage(bNode);
      const gndA = isConnectedToGnd(aNode, false);
      const gndB = isConnectedToGnd(bNode, false);

      let voltageV = 0;
      if (railA && gndB) voltageV = railA.volts;
      else if (railB && gndA) voltageV = railB.volts;

      const currentMa = voltageV > 0 ? (voltageV / ohms) * 1000 : 0;
      const powerMw = voltageV > 0 ? ((voltageV * voltageV) / ohms) * 1000 : 0;
      const ratedMw = 250; // Standard 1/4W (0.25W) axial resistor

      let overload: ComponentOverloadInfo | null = null;
      if (powerMw > ratedMw) {
        const roundedMw = Math.round(powerMw);
        overload = {
          reason: 'overpower',
          measuredLabel: `${roundedMw} mW`,
          ratedMaxLabel: `${ratedMw} mW`,
          ratio: Number((roundedMw / ratedMw).toFixed(1)),
          summary: {
            ar: `حمل حراري زائد (${roundedMw}mW) على المقاومة ${compName(comp)} — قدرتها القصوى ${ratedMw}mW (ربع واط)`,
            en: `Thermal overload (${roundedMw} mW) on resistor ${compName(comp)} — exceeds ${ratedMw} mW (1/4W) rating`,
            fr: `Surcharge thermique (${roundedMw} mW) sur la résistance ${compName(comp)} — limite ${ratedMw} mW (1/4W)`,
          },
          fixHint: {
            ar: 'استخدم مقاومة ذات قيمة أعلى (1kΩ أو 10kΩ) أو خفّض جهد المصدر من VIN (9V) إلى 5V.',
            en: 'Use a higher resistance (1kΩ or 10kΩ) or lower supply voltage from VIN (9V) to 5V.',
            fr: 'Utilisez une résistance plus élevée (1kΩ ou 10kΩ) ou passez de VIN (9V) à 5V.',
          },
        };
        diagnostics.push({
          severity: 'error',
          code: 'THERMAL_OVERLOAD',
          componentId: comp.id,
          message: overload.summary,
        });
      }

      componentPower[comp.id] = {
        powered: voltageV > 0,
        brightness: 0,
        warnNoResistor: false,
        voltageV: voltageV || undefined,
        currentMa: currentMa > 0 ? Math.round(currentMa * 10) / 10 : undefined,
        powerMw: powerMw > 0 ? Math.round(powerMw) : undefined,
        overload,
      };
    } else if (comp.kind === 'buzzer') {
      const pos = `comp:${comp.id}:pos`;
      const neg = `comp:${comp.id}:neg`;
      const gndOk = isConnectedToGnd(neg, true);
      const pins = findConnectedArduinoPins(pos, true);
      pins.forEach((p) => {
        if (!pinToComponent[p]) pinToComponent[p] = [];
        pinToComponent[p].push(comp);
      });

      const posRail = getDirectRailVoltage(pos);
      const negRail = getDirectRailVoltage(neg);
      const posOnGnd = isConnectedToGnd(pos, false);

      let overload: ComponentOverloadInfo | null = null;
      if (posRail && posRail.volts > 5.5) {
        overload = {
          reason: 'overvoltage',
          measuredLabel: `${posRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '5.5 V',
          ratio: Number((posRail.volts / 5.5).toFixed(1)),
          summary: {
            ar: `تجاوز جهد (${posRail.volts.toFixed(1)}V) على الجرس ${compName(comp)} — الجهد الأقصى 5.5V`,
            en: `Over-voltage (${posRail.volts.toFixed(1)} V) on buzzer ${compName(comp)} — rated max 5.5 V`,
            fr: `Surtension (${posRail.volts.toFixed(1)} V) sur le buzzer ${compName(comp)} — max 5.5 V`,
          },
          fixHint: {
            ar: 'انقل الطرف الموجب (+) للجرس من VIN (9V) إلى منفذ رقمي (مثل D8) أو 5V.',
            en: 'Move the buzzer positive (+) pin from VIN (9V) to a digital pin (e.g. D8) or 5V.',
            fr: 'Déplacez la broche (+) du buzzer de VIN (9V) vers une broche numérique (ex. D8) ou 5V.',
          },
        };
      } else if (negRail && posOnGnd) {
        overload = {
          reason: 'reverse-polarity',
          measuredLabel: `-${negRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '+ / -',
          ratio: 2.0,
          summary: {
            ar: `قطبية معكوسة على الجرس ${compName(comp)} (الطرف السالب موصول بـ ${negRail.pin})`,
            en: `Reverse polarity on buzzer ${compName(comp)} (negative lead wired to ${negRail.pin})`,
            fr: `Polarité inversée sur le buzzer ${compName(comp)} (borne - reliée à ${negRail.pin})`,
          },
          fixHint: {
            ar: 'وصّل الطرف الموجب (+) بالإشارة والطرف السالب (-) بالأرضي GND.',
            en: 'Connect the positive (+) pin to signal/5V and negative (-) pin to GND.',
            fr: 'Reliez la broche (+) au signal/5V et la broche (-) à GND.',
          },
        };
      }

      const active = gndOk && pins.some((p) => (pinValues[p] ?? 0) > 0);
      componentPower[comp.id] = {
        powered: active,
        brightness: active ? 1 : 0,
        warnNoResistor: false,
        voltageV: posRail?.volts ?? (active ? 5.0 : undefined),
        overload,
      };

      if (overload) {
        diagnostics.push({
          severity: 'error',
          code: overload.reason === 'reverse-polarity' ? 'REVERSE_POLARITY' : 'OVER_VOLTAGE',
          componentId: comp.id,
          message: overload.summary,
        });
      } else if (pins.length > 0 && !gndOk) {
        diagnostics.push({
          severity: 'warning',
          code: 'MISSING_GND',
          componentId: comp.id,
          message: {
            ar: 'الجرس (Piezo Buzzer) يحتاج لتوصيل الطرف السالب بـ GND',
            en: 'Piezo Buzzer negative terminal is missing GND',
            fr: 'Le buzzer piezo nécessite une connexion GND',
          },
        });
      }
    } else if (comp.kind === 'servo') {
      const sig = `comp:${comp.id}:sig`;
      const vcc = `comp:${comp.id}:vcc`;
      const gnd = `comp:${comp.id}:gnd`;
      const sigPins = findConnectedArduinoPins(sig, true);
      sigPins.forEach((p) => {
        if (!pinToComponent[p]) pinToComponent[p] = [];
        pinToComponent[p].push(comp);
      });
      const gndOk = isConnectedToGnd(gnd, true);
      const vccRail = getDirectRailVoltage(vcc);
      const gndRail = getDirectRailVoltage(gnd);
      const vccOnGnd = isConnectedToGnd(vcc, false);
      const vccDirectPins = findConnectedArduinoPins(vcc, false);
      const vccIoPin = vccDirectPins.find((p) => !isPowerRailPin(p));

      let overload: ComponentOverloadInfo | null = null;
      if (vccRail && vccRail.volts > 6.0) {
        overload = {
          reason: 'overvoltage',
          measuredLabel: `${vccRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '6.0 V',
          ratio: Number((vccRail.volts / 6.0).toFixed(1)),
          summary: {
            ar: `تجاوز جهد (${vccRail.volts.toFixed(1)}V) على محرك السيرفو ${compName(comp)} — الحد الأقصى 6.0V`,
            en: `Over-voltage (${vccRail.volts.toFixed(1)} V) on SG90 Servo ${compName(comp)} — rated max 6.0 V`,
            fr: `Surtension (${vccRail.volts.toFixed(1)} V) sur le Servo SG90 ${compName(comp)} — max 6.0 V`,
          },
          fixHint: {
            ar: 'انقل سلك تغذية السيرفو (5V) من منفذ VIN (9V) إلى منفذ 5V المنظّم.',
            en: 'Move the Servo VCC wire from VIN (9V) to the regulated 5V pin.',
            fr: 'Déplacez le fil VCC du servo de VIN (9V) vers la broche 5V régulée.',
          },
        };
      } else if (gndRail && vccOnGnd) {
        overload = {
          reason: 'reverse-polarity',
          measuredLabel: `-${gndRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '+5V / GND',
          ratio: 2.0,
          summary: {
            ar: `قطبية تغذية معكوسة على السيرفو ${compName(comp)} (VCC و GND مقلوبان)`,
            en: `Reverse power polarity on Servo ${compName(comp)} (VCC & GND swapped)`,
            fr: `Polarité inversée sur le Servo ${compName(comp)} (VCC et GND inversés)`,
          },
          fixHint: {
            ar: 'وصّل طرف 5V للسيرفو بمنفذ 5V وطرف GND بالأرضي GND.',
            en: 'Wire Servo 5V pin to Arduino 5V and Servo GND pin to Arduino GND.',
            fr: 'Reliez la broche 5V du servo à 5V et GND à GND.',
          },
        };
      } else if (vccIoPin && !vccRail) {
        overload = {
          reason: 'overcurrent',
          measuredLabel: '250 mA',
          ratedMaxLabel: '40 mA I/O',
          ratio: 6.3,
          summary: {
            ar: `تيار زائد: تغذية السيرفو ${compName(comp)} من المنفذ الرقمي ${vccIoPin} (~250mA > حد المنفذ 40mA)`,
            en: `Over-current: Servo ${compName(comp)} VCC powered from I/O pin ${vccIoPin} (~250 mA exceeds 40 mA pin max)`,
            fr: `Surintensité : VCC du Servo ${compName(comp)} sur broche ${vccIoPin} (~250 mA > limite 40 mA)`,
          },
          fixHint: {
            ar: `انقل سلك تغذية السيرفو (VCC) من ${vccIoPin} إلى منفذ الطاقة 5V، واستخدم المنفذ الرقمي للإشارة PWM فقط.`,
            en: `Move Servo VCC from ${vccIoPin} to the 5V power rail; only connect the PWM signal pin to a digital I/O.`,
            fr: `Déplacez VCC de ${vccIoPin} vers 5V ; utilisez les broches numériques uniquement pour le signal PWM.`,
          },
        };
      }

      componentPower[comp.id] = {
        powered: gndOk && sigPins.length > 0 && !overload,
        brightness: gndOk ? 1 : 0,
        warnNoResistor: false,
        voltageV: vccRail?.volts ?? 5.0,
        currentMa: vccIoPin ? 250 : undefined,
        overload,
      };

      if (overload) {
        diagnostics.push({
          severity: 'error',
          code:
            overload.reason === 'overcurrent'
              ? 'OVER_CURRENT'
              : overload.reason === 'reverse-polarity'
                ? 'REVERSE_POLARITY'
                : 'OVER_VOLTAGE',
          componentId: comp.id,
          message: overload.summary,
        });
      }
    } else if (
      comp.kind === 'potentiometer' ||
      comp.kind === 'ldr' ||
      comp.kind === 'temp-sensor'
    ) {
      const vcc = `comp:${comp.id}:vcc`;
      const sig = `comp:${comp.id}:sig`;
      const gnd = `comp:${comp.id}:gnd`;
      const pins = findConnectedArduinoPins(sig, true);
      pins.forEach((p) => {
        if (!pinToComponent[p]) pinToComponent[p] = [];
        pinToComponent[p].push(comp);
      });

      const vccRail = getDirectRailVoltage(vcc);
      const gndRail = getDirectRailVoltage(gnd);
      const vccOnGnd = isConnectedToGnd(vcc, false);
      const maxV = comp.kind === 'temp-sensor' ? 5.5 : 5.0;

      let overload: ComponentOverloadInfo | null = null;
      if (vccRail && vccRail.volts > maxV) {
        overload = {
          reason: 'overvoltage',
          measuredLabel: `${vccRail.volts.toFixed(1)} V`,
          ratedMaxLabel: `${maxV.toFixed(1)} V`,
          ratio: Number((vccRail.volts / maxV).toFixed(1)),
          summary: {
            ar: `تجاوز جهد (${vccRail.volts.toFixed(1)}V) على ${compName(comp)} — الجهد الأقصى المسموح ${maxV.toFixed(1)}V`,
            en: `Over-voltage (${vccRail.volts.toFixed(1)} V) on ${compName(comp)} — exceeds ${maxV.toFixed(1)} V max rating`,
            fr: `Surtension (${vccRail.volts.toFixed(1)} V) sur ${compName(comp)} — dépasse la limite de ${maxV.toFixed(1)} V`,
          },
          fixHint: {
            ar: 'انقل سلك التغذية (5V) من VIN (9V) إلى منفذ 5V أو 3.3V لحماية الحساس ومدخل ADC.',
            en: 'Move the supply wire from VIN (9V) to 5V or 3.3V to protect the sensor and Arduino ADC pin.',
            fr: 'Déplacez le fil d’alimentation de VIN (9V) vers 5V ou 3.3V pour protéger le capteur et l’ADC.',
          },
        };
      } else if (comp.kind === 'temp-sensor' && gndRail && vccOnGnd) {
        overload = {
          reason: 'reverse-polarity',
          measuredLabel: `-${gndRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '+5V / GND',
          ratio: 2.0,
          summary: {
            ar: `قطبية معكوسة على حساس الحرارة TMP36 (${compName(comp)}) — يسبب سخونة فورية وتلف الشريحة!`,
            en: `Reverse polarity on TMP36 (${compName(comp)}) — causes immediate overheating and IC damage!`,
            fr: `Polarité inversée sur TMP36 (${compName(comp)}) — risque de surchauffe immédiate !`,
          },
          fixHint: {
            ar: 'اعكس سلكي التغذية: وصّل 5V إلى 5V و GND إلى GND.',
            en: 'Swap power wires: connect 5V pin to Arduino 5V and GND pin to Arduino GND.',
            fr: 'Inversez les fils d’alimentation : 5V vers 5V et GND vers GND.',
          },
        };
      }

      componentPower[comp.id] = {
        powered: pins.length > 0,
        brightness: 1,
        warnNoResistor: false,
        voltageV: vccRail?.volts ?? 5.0,
        overload,
      };

      if (overload) {
        diagnostics.push({
          severity: 'error',
          code: overload.reason === 'reverse-polarity' ? 'REVERSE_POLARITY' : 'OVER_VOLTAGE',
          componentId: comp.id,
          message: overload.summary,
        });
      }
    } else if (comp.kind === 'button') {
      const a = `comp:${comp.id}:a`;
      const b = `comp:${comp.id}:b`;
      const pins = [
        ...findConnectedArduinoPins(a, true),
        ...findConnectedArduinoPins(b, true),
      ];
      pins.forEach((p) => {
        if (!pinToComponent[p]) pinToComponent[p] = [];
        pinToComponent[p].push(comp);
      });

      const railA = getDirectRailVoltage(a);
      const railB = getDirectRailVoltage(b);
      const gndA = isConnectedToGnd(a, false);
      const gndB = isConnectedToGnd(b, false);
      const directShortAcrossButton = (railA && gndB) || (railB && gndA);

      let overload: ComponentOverloadInfo | null = null;
      if (directShortAcrossButton) {
        const rail = railA || railB!;
        overload = {
          reason: 'short-circuit',
          measuredLabel: `${rail.pin} ↔ GND`,
          ratedMaxLabel: '50 mA max',
          ratio: 10,
          summary: {
            ar: `قصر دائرة عبر الزر (${compName(comp)}): موصول مباشرة بين ${rail.pin} و GND بدون مقاومة!`,
            en: `Dead short across button (${compName(comp)}): wired directly between ${rail.pin} and GND with no resistor!`,
            fr: `Court-circuit sur le bouton (${compName(comp)}) : câblé directement entre ${rail.pin} et GND !`,
          },
          fixHint: {
            ar: 'وصّل الزر بين منفذ رقمي (مع INPUT_PULLUP) و GND، أو أضف مقاومة 10kΩ على التوالي.',
            en: 'Wire the button between a digital pin (with INPUT_PULLUP) and GND, or add a 10kΩ pull-down resistor.',
            fr: 'Reliez le bouton entre une broche numérique (INPUT_PULLUP) et GND, ou ajoutez une résistance 10kΩ.',
          },
        };
        diagnostics.push({
          severity: 'error',
          code: 'SHORT_CIRCUIT',
          componentId: comp.id,
          message: overload.summary,
        });
      }

      componentPower[comp.id] = {
        powered: (comp.value ?? 0) > 0,
        brightness: (comp.value ?? 0) > 0 ? 1 : 0,
        warnNoResistor: false,
        overload,
      };
    } else if (comp.kind === 'ultrasonic') {
      const vcc = `comp:${comp.id}:vcc`;
      const gnd = `comp:${comp.id}:gnd`;
      const trigPins = findConnectedArduinoPins(`comp:${comp.id}:trig`, true);
      const echoPins = findConnectedArduinoPins(`comp:${comp.id}:echo`, true);
      [...trigPins, ...echoPins].forEach((p) => {
        if (!pinToComponent[p]) pinToComponent[p] = [];
        pinToComponent[p].push(comp);
      });

      const vccRail = getDirectRailVoltage(vcc);
      const gndRail = getDirectRailVoltage(gnd);
      const vccOnGnd = isConnectedToGnd(vcc, false);

      let overload: ComponentOverloadInfo | null = null;
      if (vccRail && vccRail.volts > 5.5) {
        overload = {
          reason: 'overvoltage',
          measuredLabel: `${vccRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '5.5 V',
          ratio: Number((vccRail.volts / 5.5).toFixed(1)),
          summary: {
            ar: `تجاوز جهد (${vccRail.volts.toFixed(1)}V) على حساس HC-SR04 (${compName(comp)}) — الحد الأقصى 5.5V`,
            en: `Over-voltage (${vccRail.volts.toFixed(1)} V) on HC-SR04 (${compName(comp)}) — rated max 5.5 V`,
            fr: `Surtension (${vccRail.volts.toFixed(1)} V) sur HC-SR04 (${compName(comp)}) — max 5.5 V`,
          },
          fixHint: {
            ar: 'انقل طرف VCC للحساس من VIN (9V) إلى منفذ 5V المنظّم.',
            en: 'Move HC-SR04 VCC wire from VIN (9V) to the regulated 5V pin.',
            fr: 'Déplacez le fil VCC du HC-SR04 de VIN (9V) vers la broche 5V.',
          },
        };
      } else if (gndRail && vccOnGnd) {
        overload = {
          reason: 'reverse-polarity',
          measuredLabel: `-${gndRail.volts.toFixed(1)} V`,
          ratedMaxLabel: '+5V / GND',
          ratio: 2.0,
          summary: {
            ar: `قطبية معكوسة على حساس المسافة HC-SR04 (${compName(comp)})`,
            en: `Reverse power polarity on HC-SR04 (${compName(comp)}) (VCC & GND swapped)`,
            fr: `Polarité inversée sur le HC-SR04 (${compName(comp)}) (VCC et GND inversés)`,
          },
          fixHint: {
            ar: 'وصّل طرف VCC إلى 5V وطرف GND إلى GND.',
            en: 'Connect VCC to Arduino 5V and GND to Arduino GND.',
            fr: 'Reliez VCC à 5V et GND à GND.',
          },
        };
      }

      componentPower[comp.id] = {
        powered: trigPins.length > 0 && echoPins.length > 0 && !overload,
        brightness: 1,
        warnNoResistor: false,
        voltageV: vccRail?.volts ?? 5.0,
        overload,
      };

      if (overload) {
        diagnostics.push({
          severity: 'error',
          code: overload.reason === 'reverse-polarity' ? 'REVERSE_POLARITY' : 'OVER_VOLTAGE',
          componentId: comp.id,
          message: overload.summary,
        });
      }
    } else if (comp.kind === 'multimeter') {
      const pos = `comp:${comp.id}:pos`;
      const neg = `comp:${comp.id}:neg`;
      const hasPosWire = circuit.wires.some((w) => w.from === pos || w.to === pos);
      const hasNegWire = circuit.wires.some((w) => w.from === neg || w.to === neg);
      const isAmmeter = (comp.value ?? 0) === 1;

      let overload: ComponentOverloadInfo | null = null;
      if (isAmmeter && hasPosWire && hasNegWire && shortedRail) {
        // Check if this ammeter is on the shorted rail path
        const meterNet = find(pos);
        if (meterNet === netGND) {
          overload = {
            reason: 'overcurrent',
            measuredLabel: '> 400 mA',
            ratedMaxLabel: '400 mA fuse',
            ratio: 5.0,
            summary: {
              ar: `احتراق فيوز الأميتر (${compName(comp)}): موصول بالتوازي مباشرة بين ${shortedRail} و GND!`,
              en: `Ammeter fuse blown (${compName(comp)}): connected directly across ${shortedRail} and GND!`,
              fr: `Fusible grillé (${compName(comp)}) : ampèremètre branché directement entre ${shortedRail} et GND !`,
            },
            fixHint: {
              ar: 'لقياس التيار (mA) يجب توصيل جهاز القياس على التوالي مع الحمل (مقاومة/LED)، أو التحويل إلى وضع الجهد (V).',
              en: 'To measure current (mA), wire the multimeter in series with a load (resistor/LED), or switch to Voltage (V) mode.',
              fr: 'Pour mesurer le courant (mA), branchez le multimètre en série avec une charge ou passez en mode Tension (V).',
            },
          };
          diagnostics.push({
            severity: 'error',
            code: 'OVER_CURRENT',
            componentId: comp.id,
            message: overload.summary,
          });
        }
      }

      componentPower[comp.id] = {
        powered: hasPosWire && hasNegWire,
        brightness: hasPosWire && hasNegWire ? 1 : 0,
        warnNoResistor: false,
        overload,
      };
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      severity: 'ok',
      code: 'OK',
      message: {
        ar: 'الدائرة سليمة كهربائياً وجاهزة للتشغيل',
        en: 'Circuit verified — ready for simulation',
        fr: 'Circuit vérifié — prêt pour la simulation',
      },
    });
  }

  const buttonPressedOnPin = (pin: string): boolean => {
    const comps = pinToComponent[pin] || [];
    return comps.some((c) => c.kind === 'button' && (c.value ?? 0) === 1);
  };

  const analogValueForPin = (pin: string): number | null => {
    const comps = pinToComponent[pin] || [];
    for (const c of comps) {
      if (c.kind === 'potentiometer') return Math.round(c.value ?? 512);
      if (c.kind === 'ldr') return Math.round(c.value ?? 620);
      if (c.kind === 'temp-sensor') {
        // TMP36: 10mV/°C + 500mV offset -> analogRead on 5V ADC (1024 steps)
        const tempC = c.value ?? 24;
        const volts = 0.5 + tempC * 0.01;
        return Math.max(0, Math.min(1023, Math.round((volts / 5.0) * 1023)));
      }
    }
    return null;
  };

  const ultrasonicDistanceCm = (trigPin: string, echoPin: string): number | null => {
    const comps = [
      ...(pinToComponent[trigPin] || []),
      ...(pinToComponent[echoPin] || []),
    ];
    const sensor = comps.find((c) => c.kind === 'ultrasonic');
    return sensor ? Math.round(sensor.value ?? 45) : null;
  };

  const ANALOG_PINS: AnalogPinId[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  const PWM_PINS = new Set(['D3', 'D5', 'D6', 'D9', 'D10', 'D11']);
  const DIGITAL_PINS = [
    'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
    'D8', 'D9', 'D10', 'D11', 'D12', 'D13',
  ];

  const analogPinTelemetry = {} as Record<AnalogPinId, AnalogPinTelemetry>;

  for (const pin of ANALOG_PINS) {
    const comps = pinToComponent[pin] || [];
    const analogSensor = comps.find(
      (c) =>
        c.kind === 'potentiometer' ||
        c.kind === 'ldr' ||
        c.kind === 'temp-sensor',
    );

    if (analogSensor) {
      if (analogSensor.kind === 'temp-sensor') {
        const tempC = analogSensor.value ?? 24;
        const voltage = Math.max(0, 0.5 + tempC * 0.01);
        const adc = Math.max(0, Math.min(1023, Math.round((voltage / 5.0) * 1023)));
        analogPinTelemetry[pin] = {
          pin,
          voltage,
          adc,
          connected: true,
          sourceLabel: analogSensor.label || 'TMP36',
        };
      } else {
        const rawAdc = Math.max(
          0,
          Math.min(1023, Math.round(analogSensor.value ?? (analogSensor.kind === 'ldr' ? 620 : 512))),
        );
        const supplyV = componentPower[analogSensor.id]?.voltageV ?? 5.0;
        const voltage = (rawAdc / 1023) * supplyV;
        const adc = Math.max(0, Math.min(1023, Math.round((voltage / 5.0) * 1023)));
        analogPinTelemetry[pin] = {
          pin,
          voltage,
          adc,
          connected: true,
          sourceLabel: analogSensor.label || (analogSensor.kind === 'ldr' ? 'LDR' : 'POT'),
        };
      }
      continue;
    }

    const pinNode = `arduino:${pin}`;
    const pinNetRes = findRes(pinNode);

    // Check if jumpered to a digital/PWM pin
    let matchedDigital: string | null = null;
    for (const dPin of DIGITAL_PINS) {
      if (findRes(`arduino:${dPin}`) === pinNetRes) {
        matchedDigital = dPin;
        break;
      }
    }

    if (matchedDigital) {
      const val = pinValues[matchedDigital] ?? 0;
      const isPwm = PWM_PINS.has(matchedDigital) && val > 0 && val < 255;
      const voltage = (Math.max(0, Math.min(255, val)) / 255) * 5.0;
      analogPinTelemetry[pin] = {
        pin,
        voltage,
        adc: Math.round((voltage / 5.0) * 1023),
        connected: true,
        sourceLabel: isPwm ? `${matchedDigital} PWM` : matchedDigital,
        pwmDuty: isPwm ? val / 255 : undefined,
      };
      continue;
    }

    // Check direct power rails or GND
    if (pinNetRes === findRes('arduino:VIN')) {
      analogPinTelemetry[pin] = {
        pin,
        voltage: 9.0,
        adc: 1023,
        connected: true,
        sourceLabel: 'VIN 9V',
      };
      continue;
    }
    if (pinNetRes === findRes('arduino:5V')) {
      analogPinTelemetry[pin] = {
        pin,
        voltage: 5.0,
        adc: 1023,
        connected: true,
        sourceLabel: '5V',
      };
      continue;
    }
    if (pinNetRes === findRes('arduino:3.3V')) {
      analogPinTelemetry[pin] = {
        pin,
        voltage: 3.3,
        adc: Math.round((3.3 / 5.0) * 1023),
        connected: true,
        sourceLabel: '3.3V',
      };
      continue;
    }

    const btn = comps.find((c) => c.kind === 'button');
    if (btn) {
      const pressed = (btn.value ?? 0) === 1;
      const voltage = pressed ? 0.0 : 5.0;
      analogPinTelemetry[pin] = {
        pin,
        voltage,
        adc: pressed ? 0 : 1023,
        connected: true,
        sourceLabel: btn.label || 'BTN',
      };
      continue;
    }

    if (pinNetRes === findRes('arduino:GND')) {
      analogPinTelemetry[pin] = {
        pin,
        voltage: 0.0,
        adc: 0,
        connected: true,
        sourceLabel: 'GND',
      };
      continue;
    }

    // Check if pin itself is driven via digitalWrite/analogWrite
    if ((pinValues[pin] ?? 0) > 0) {
      const val = pinValues[pin];
      const voltage = (Math.max(0, Math.min(255, val)) / 255) * 5.0;
      analogPinTelemetry[pin] = {
        pin,
        voltage,
        adc: Math.round((voltage / 5.0) * 1023),
        connected: true,
        sourceLabel: 'OUT',
      };
      continue;
    }

    analogPinTelemetry[pin] = {
      pin,
      voltage: 0,
      adc: 0,
      connected: false,
      sourceLabel: 'NC',
    };
  }

  return {
    diagnostics,
    componentPower,
    pinToComponent,
    analogPinTelemetry,
    buttonPressedOnPin,
    analogValueForPin,
    ultrasonicDistanceCm,
  };
}

/**
 * Cooperative Arduino C++ interpreter.
 * Evaluates variables, expressions, pinMode, digitalWrite, analogWrite,
 * digitalRead, analogRead, map, constrain, pulseIn, tone/noTone, Servo,
 * Serial.print/println, if/else, and simple for-loops with non-blocking delay().
 */

export interface SimCallbacks {
  getCircuit: () => CircuitState;
  onStateChange: (patch: {
    pinModes: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
    pinValues: Record<string, number>;
    servoAngles: Record<string, number>;
    buzzerTone: { pin: string; freq: number } | null;
    ledD13On: boolean;
  }) => void;
  onSerialOut: (text: string, numericValue?: number) => void;
  onBuzzerTone: (freq: number, durationMs?: number) => void;
  onBuzzerStop: () => void;
  getSerialInput: () => string | null;
}

interface ParsedStatement {
  kind:
    | 'pinMode'
    | 'digitalWrite'
    | 'analogWrite'
    | 'delay'
    | 'serialBegin'
    | 'serialPrint'
    | 'tone'
    | 'noTone'
    | 'servoAttach'
    | 'servoWrite'
    | 'assign'
    | 'if'
    | 'for';
  raw?: string;
  args?: string[];
  varName?: string;
  expr?: string;
  condition?: string;
  thenBody?: ParsedStatement[];
  elseBody?: ParsedStatement[];
  forInit?: { varName: string; start: string; cond: string; step: string };
  forBody?: ParsedStatement[];
}

function normalizePinName(raw: string, vars: Record<string, number | string>): string {
  const trimmed = raw.trim();
  if (trimmed === 'LED_BUILTIN') return 'D13';
  if (/^A[0-5]$/.test(trimmed)) return trimmed;
  if (/^D\d+$/.test(trimmed)) return trimmed;
  if (vars[trimmed] !== undefined) {
    const val = String(vars[trimmed]);
    if (/^A[0-5]$/.test(val)) return val;
    if (/^\d+$/.test(val)) return `D${val}`;
    return val;
  }
  if (/^\d+$/.test(trimmed)) return `D${trimmed}`;
  return trimmed;
}

function splitTopLevelArgs(str: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"' && str[i - 1] !== '\\') {
      inQuote = !inQuote;
      cur += ch;
    } else if (!inQuote && (ch === '(' || ch === '[')) {
      depth++;
      cur += ch;
    } else if (!inQuote && (ch === ')' || ch === ']')) {
      depth--;
      cur += ch;
    } else if (!inQuote && depth === 0 && ch === ',') {
      args.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim().length > 0) args.push(cur.trim());
  return args;
}

function parseBlockStatements(src: string): ParsedStatement[] {
  const stmts: ParsedStatement[] = [];
  let i = 0;
  const len = src.length;

  const skipWsAndComments = () => {
    while (i < len) {
      if (/\s/.test(src[i])) {
        i++;
      } else if (src.slice(i, i + 2) === '//') {
        while (i < len && src[i] !== '\n') i++;
      } else if (src.slice(i, i + 2) === '/*') {
        i += 2;
        while (i < len && src.slice(i, i + 2) !== '*/') i++;
        i += 2;
      } else {
        break;
      }
    }
  };

  const readBalanced = (openCh: string, closeCh: string): string => {
    if (src[i] !== openCh) return '';
    i++;
    let depth = 1;
    let out = '';
    let inQuote = false;
    while (i < len && depth > 0) {
      const ch = src[i];
      if (ch === '"' && src[i - 1] !== '\\') inQuote = !inQuote;
      if (!inQuote) {
        if (ch === openCh) depth++;
        else if (ch === closeCh) depth--;
      }
      if (depth > 0) out += ch;
      i++;
    }
    return out;
  };

  while (i < len) {
    skipWsAndComments();
    if (i >= len) break;

    // if (...) { ... } [else if ... | else { ... }]
    if (src.slice(i).startsWith('if') && !/\w/.test(src[i + 2] || '')) {
      i += 2;
      skipWsAndComments();
      const condition = readBalanced('(', ')');
      skipWsAndComments();
      let thenSrc = '';
      if (src[i] === '{') {
        thenSrc = readBalanced('{', '}');
      } else {
        const semi = src.indexOf(';', i);
        thenSrc = semi >= 0 ? src.slice(i, semi + 1) : '';
        i = semi >= 0 ? semi + 1 : len;
      }
      skipWsAndComments();
      let elseBody: ParsedStatement[] = [];
      if (src.slice(i).startsWith('else') && !/\w/.test(src[i + 4] || '')) {
        i += 4;
        skipWsAndComments();
        if (src[i] === '{') {
          const elseSrc = readBalanced('{', '}');
          elseBody = parseBlockStatements(elseSrc);
        } else if (src.slice(i).startsWith('if') && !/\w/.test(src[i + 2] || '')) {
          // Handle else if recursively by consuming just one statement
          const rest = src.slice(i);
          const sub = parseBlockStatements(rest);
          if (sub.length > 0) {
            elseBody = [sub[0]];
            // advance past entire else-if chain safely
            i = len;
          }
        }
      }
      stmts.push({
        kind: 'if',
        condition,
        thenBody: parseBlockStatements(thenSrc),
        elseBody,
      });
      continue;
    }

    // for (int pos = 0; pos <= 180; pos += 10) { ... }
    if (src.slice(i).startsWith('for') && !/\w/.test(src[i + 3] || '')) {
      i += 3;
      skipWsAndComments();
      const header = readBalanced('(', ')');
      skipWsAndComments();
      const bodySrc = src[i] === '{' ? readBalanced('{', '}') : '';
      const parts = header.split(';').map((s) => s.trim());
      if (parts.length === 3) {
        const initMatch = parts[0].match(/(?:int|float)?\s*(\w+)\s*=\s*(.+)/);
        if (initMatch) {
          stmts.push({
            kind: 'for',
            forInit: {
              varName: initMatch[1],
              start: initMatch[2],
              cond: parts[1],
              step: parts[2],
            },
            forBody: parseBlockStatements(bodySrc),
          });
        }
      }
      continue;
    }

    // Standard statement ending in ';'
    let stmtStr = '';
    let inQuote = false;
    while (i < len) {
      const ch = src[i];
      if (ch === '"' && src[i - 1] !== '\\') inQuote = !inQuote;
      if (!inQuote && ch === ';') {
        i++;
        break;
      }
      stmtStr += ch;
      i++;
    }
    const clean = stmtStr.trim();
    if (!clean) continue;

    let m: RegExpMatchArray | null;
    if ((m = clean.match(/^pinMode\((.*)\)$/))) {
      stmts.push({ kind: 'pinMode', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^digitalWrite\((.*)\)$/))) {
      stmts.push({ kind: 'digitalWrite', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^analogWrite\((.*)\)$/))) {
      stmts.push({ kind: 'analogWrite', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^delay\((.*)\)$/))) {
      stmts.push({ kind: 'delay', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^delayMicroseconds\((.*)\)$/))) {
      stmts.push({ kind: 'delay', args: ['1'] });
    } else if ((m = clean.match(/^Serial\.begin\((.*)\)$/))) {
      stmts.push({ kind: 'serialBegin', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^Serial\.(?:println|print)\((.*)\)$/))) {
      stmts.push({ kind: 'serialPrint', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^tone\((.*)\)$/))) {
      stmts.push({ kind: 'tone', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^noTone\((.*)\)$/))) {
      stmts.push({ kind: 'noTone', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^\w+\.attach\((.*)\)$/))) {
      stmts.push({ kind: 'servoAttach', args: splitTopLevelArgs(m[1]) });
    } else if ((m = clean.match(/^\w+\.write\((.*)\)$/))) {
      stmts.push({ kind: 'servoWrite', args: splitTopLevelArgs(m[1]) });
    } else if (
      (m = clean.match(
        /^(?:const\s+)?(?:unsigned\s+)?(?:int|long|float|double|bool|byte)?\s*(\w+)\s*=\s*(.+)$/,
      ))
    ) {
      stmts.push({ kind: 'assign', varName: m[1], expr: m[2].trim() });
    } else if ((m = clean.match(/^(\w+)\s*(\+=|-=)\s*(.+)$/))) {
      stmts.push({
        kind: 'assign',
        varName: m[1],
        expr: `${m[1]} ${m[2] === '+=' ? '+' : '-'} (${m[3]})`,
      });
    } else if ((m = clean.match(/^(\w+)(\+\+|--)$/))) {
      stmts.push({
        kind: 'assign',
        varName: m[1],
        expr: `${m[1]} ${m[2] === '++' ? '+' : '-'} 1`,
      });
    }
  }
  return stmts;
}

export class ArduinoSimulatorRunner {
  private timer: number | null = null;
  private running = false;
  private startTime = 0;
  private vars: Record<string, number | string> = {};
  private pinModes: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'> = {};
  private pinValues: Record<string, number> = {};
  private servoPins: string[] = [];
  private servoAngles: Record<string, number> = {};
  private buzzerTone: { pin: string; freq: number } | null = null;
  private setupStmts: ParsedStatement[] = [];
  private loopStmts: ParsedStatement[] = [];
  private queue: Array<{ stmt: ParsedStatement }> = [];
  private callbacks: SimCallbacks;

  constructor(callbacks: SimCallbacks) {
    this.callbacks = callbacks;
  }

  private extractGlobalsAndFunctions(code: string) {
    this.vars = {
      HIGH: 1,
      LOW: 0,
      OUTPUT: 1,
      INPUT: 0,
      INPUT_PULLUP: 2,
      LED_BUILTIN: 13,
    };

    // #define NAME VALUE
    const defRegex = /#define\s+(\w+)\s+([^\n]+)/g;
    let m: RegExpExecArray | null;
    while ((m = defRegex.exec(code)) !== null) {
      const val = m[2].trim();
      this.vars[m[1]] = Number.isNaN(Number(val)) ? val : Number(val);
    }

    // Top-level const int / int / float before setup()
    const setupIdx = code.search(/void\s+setup\s*\(/);
    const header = setupIdx >= 0 ? code.slice(0, setupIdx) : '';
    const globalVarRegex =
      /(?:const\s+)?(?:unsigned\s+)?(?:int|long|float|double|bool)\s+(\w+)\s*=\s*([^;]+);/g;
    while ((m = globalVarRegex.exec(header)) !== null) {
      const val = m[2].trim();
      if (/^A[0-5]$/.test(val)) {
        this.vars[m[1]] = val;
      } else {
        const num = Number(val);
        this.vars[m[1]] = Number.isNaN(num) ? val : num;
      }
    }

    const extractBody = (fnName: string): string => {
      const regex = new RegExp(`void\\s+${fnName}\\s*\\(\\s*\\)\\s*\\{`);
      const match = regex.exec(code);
      if (!match) return '';
      let idx = match.index + match[0].length;
      let depth = 1;
      let body = '';
      while (idx < code.length && depth > 0) {
        const ch = code[idx];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth > 0) body += ch;
        idx++;
      }
      return body;
    };

    this.setupStmts = parseBlockStatements(extractBody('setup'));
    this.loopStmts = parseBlockStatements(extractBody('loop'));
  }

  private evalExpr(rawExpr: string): number | string {
    const expr = rawExpr.trim();
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1);
    }

    const circuit = this.callbacks.getCircuit();
    const analysis = analyzeCircuit(circuit, this.pinValues);

    // Built-in function calls inside expressions
    const digitalReadMatch = expr.match(/^digitalRead\(\s*([^)]+)\s*\)$/);
    if (digitalReadMatch) {
      const pin = normalizePinName(digitalReadMatch[1], this.vars);
      const pressed = analysis.buttonPressedOnPin(pin);
      if (this.pinModes[pin] === 'INPUT_PULLUP') {
        return pressed ? 0 : 1;
      }
      return pressed ? 1 : (this.pinValues[pin] ? 1 : 0);
    }

    const analogReadMatch = expr.match(/^analogRead\(\s*([^)]+)\s*\)$/);
    if (analogReadMatch) {
      const pin = normalizePinName(analogReadMatch[1], this.vars);
      const fromSensor = analysis.analogValueForPin(pin);
      if (fromSensor !== null) return fromSensor;
      return 512;
    }

    const pulseInMatch = expr.match(/^pulseIn\(\s*([^,]+)\s*,\s*HIGH\s*\)$/);
    if (pulseInMatch) {
      const echoPin = normalizePinName(pulseInMatch[1], this.vars);
      const dist = analysis.ultrasonicDistanceCm(echoPin, echoPin) ?? 45;
      // duration (us) = distance_cm / 0.01715
      return Math.round(dist * 58.3);
    }

    const mapMatch = expr.match(/^map\((.*)\)$/);
    if (mapMatch) {
      const args = splitTopLevelArgs(mapMatch[1]).map((a) =>
        Number(this.evalExpr(a)),
      );
      if (args.length === 5 && args[2] !== args[1]) {
        const [x, inMin, inMax, outMin, outMax] = args;
        return Math.round(((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
      }
      return 0;
    }

    const constrainMatch = expr.match(/^constrain\((.*)\)$/);
    if (constrainMatch) {
      const args = splitTopLevelArgs(constrainMatch[1]).map((a) =>
        Number(this.evalExpr(a)),
      );
      if (args.length === 3) {
        return Math.max(args[1], Math.min(args[2], args[0]));
      }
      return 0;
    }

    if (expr === 'millis()') {
      return Date.now() - this.startTime;
    }

    // String concatenation with +
    if (expr.includes('"') && expr.includes('+')) {
      return expr
        .split('+')
        .map((part) => String(this.evalExpr(part)))
        .join('');
    }

    // Safe arithmetic / comparison evaluator substituting variables & inline functions
    let substituted = expr
      .replace(/millis\(\)/g, String(Date.now() - this.startTime))
      .replace(/analogRead\(\s*([^)]+)\s*\)/g, (_m, p) => {
        const pin = normalizePinName(p, this.vars);
        return String(analysis.analogValueForPin(pin) ?? 512);
      })
      .replace(/digitalRead\(\s*([^)]+)\s*\)/g, (_m, p) => {
        const pin = normalizePinName(p, this.vars);
        const pressed = analysis.buttonPressedOnPin(pin);
        return String(
          this.pinModes[pin] === 'INPUT_PULLUP' ? (pressed ? 0 : 1) : pressed ? 1 : 0,
        );
      })
      .replace(/\b([A-Za-z_]\w*)\b/g, (token) => {
        if (token === 'true') return '1';
        if (token === 'false') return '0';
        if (this.vars[token] !== undefined) {
          const val = this.vars[token];
          return typeof val === 'number' ? String(val) : `"${val}"`;
        }
        return token;
      });

    // Only evaluate safe math/comparison characters
    if (/^[0-9\s+\-*/%().<>=!&|]+$/.test(substituted)) {
      try {
        const res = Function(`"use strict"; return (${substituted});`)();
        if (typeof res === 'boolean') return res ? 1 : 0;
        if (typeof res === 'number' && Number.isFinite(res)) {
          return Math.round(res * 100) / 100;
        }
      } catch {
        return 0;
      }
    }

    return substituted.replace(/^"|"$/g, '');
  }

  private emitState() {
    this.callbacks.onStateChange({
      pinModes: { ...this.pinModes },
      pinValues: { ...this.pinValues },
      servoAngles: { ...this.servoAngles },
      buzzerTone: this.buzzerTone,
      ledD13On: (this.pinValues['D13'] ?? 0) > 0,
    });
  }

  start(code: string) {
    this.stop();
    this.running = true;
    this.startTime = Date.now();
    this.pinModes = {};
    this.pinValues = {};
    this.servoPins = [];
    this.servoAngles = {};
    this.buzzerTone = null;
    this.extractGlobalsAndFunctions(code);

    this.queue = this.setupStmts.map((stmt) => ({ stmt }));
    if (this.loopStmts.length > 0) {
      this.queue.push(...this.loopStmts.map((stmt) => ({ stmt })));
    }
    this.emitState();
    this.step();
  }

  stop() {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.pinValues = {};
    this.buzzerTone = null;
    this.callbacks.onBuzzerStop();
    this.emitState();
  }

  private step = () => {
    if (!this.running) return;

    let ops = 0;
    const MAX_OPS_PER_TICK = 40;

    while (this.running && ops < MAX_OPS_PER_TICK) {
      if (this.queue.length === 0) {
        if (this.loopStmts.length === 0) {
          this.timer = window.setTimeout(this.step, 120);
          return;
        }
        this.queue = this.loopStmts.map((stmt) => ({ stmt }));
        // Small yield between loop() iterations to keep UI silky 60fps
        this.emitState();
        this.timer = window.setTimeout(this.step, 55);
        return;
      }

      const next = this.queue.shift()!;
      ops++;
      const stmt = next.stmt;

      switch (stmt.kind) {
        case 'pinMode': {
          const [rawPin, rawMode] = stmt.args || [];
          if (rawPin && rawMode) {
            const pin = normalizePinName(rawPin, this.vars);
            const mode =
              rawMode.trim() === 'INPUT_PULLUP'
                ? 'INPUT_PULLUP'
                : rawMode.trim() === 'INPUT'
                  ? 'INPUT'
                  : 'OUTPUT';
            this.pinModes[pin] = mode;
          }
          break;
        }
        case 'digitalWrite': {
          const [rawPin, rawVal] = stmt.args || [];
          if (rawPin && rawVal !== undefined) {
            const pin = normalizePinName(rawPin, this.vars);
            const val = Number(this.evalExpr(rawVal));
            this.pinValues[pin] = val > 0 ? 255 : 0;
            this.emitState();
          }
          break;
        }
        case 'analogWrite': {
          const [rawPin, rawVal] = stmt.args || [];
          if (rawPin && rawVal !== undefined) {
            const pin = normalizePinName(rawPin, this.vars);
            const val = Math.max(0, Math.min(255, Math.round(Number(this.evalExpr(rawVal)) || 0)));
            this.pinValues[pin] = val;
            this.emitState();
          }
          break;
        }
        case 'delay': {
          const ms = Math.max(
            15,
            Math.min(5000, Number(this.evalExpr(stmt.args?.[0] || '100')) || 100),
          );
          this.emitState();
          this.timer = window.setTimeout(this.step, ms);
          return;
        }
        case 'serialBegin': {
          break;
        }
        case 'serialPrint': {
          const rawArg = stmt.args?.[0] ?? '';
          const evaluated = this.evalExpr(rawArg);
          const strVal = String(evaluated);
          const maybeNum =
            typeof evaluated === 'number'
              ? evaluated
              : (() => {
                  const m = strVal.match(/-?\d+(\.\d+)?/);
                  return m ? Number(m[0]) : undefined;
                })();
          this.callbacks.onSerialOut(strVal, maybeNum);
          break;
        }
        case 'tone': {
          const [rawPin, rawFreq, rawDur] = stmt.args || [];
          if (rawPin && rawFreq) {
            const pin = normalizePinName(rawPin, this.vars);
            const freq = Number(this.evalExpr(rawFreq)) || 440;
            const dur = rawDur ? Number(this.evalExpr(rawDur)) : undefined;
            this.pinValues[pin] = 255;
            this.buzzerTone = { pin, freq };
            this.callbacks.onBuzzerTone(freq, dur);
            this.emitState();
          }
          break;
        }
        case 'noTone': {
          const rawPin = stmt.args?.[0];
          if (rawPin) {
            const pin = normalizePinName(rawPin, this.vars);
            this.pinValues[pin] = 0;
          }
          this.buzzerTone = null;
          this.callbacks.onBuzzerStop();
          this.emitState();
          break;
        }
        case 'servoAttach': {
          const rawPin = stmt.args?.[0];
          if (rawPin) {
            const pin = normalizePinName(rawPin, this.vars);
            if (!this.servoPins.includes(pin)) this.servoPins.push(pin);
            this.servoAngles[pin] = this.servoAngles[pin] ?? 90;
            this.emitState();
          }
          break;
        }
        case 'servoWrite': {
          const rawAngle = stmt.args?.[0] ?? '90';
          const angle = Math.max(
            0,
            Math.min(180, Math.round(Number(this.evalExpr(rawAngle)) || 0)),
          );
          const pins = this.servoPins.length > 0 ? this.servoPins : ['D9'];
          pins.forEach((p) => {
            this.servoAngles[p] = angle;
          });
          this.emitState();
          break;
        }
        case 'assign': {
          if (stmt.varName && stmt.expr !== undefined) {
            this.vars[stmt.varName] = this.evalExpr(stmt.expr);
          }
          break;
        }
        case 'if': {
          const truthy = Number(this.evalExpr(stmt.condition || '0')) !== 0;
          const branch = truthy ? stmt.thenBody || [] : stmt.elseBody || [];
          if (branch.length > 0) {
            this.queue.unshift(...branch.map((s) => ({ stmt: s })));
          }
          break;
        }
        case 'for': {
          if (stmt.forInit && stmt.forBody) {
            const { varName, start, cond, step } = stmt.forInit;
            let cur = Number(this.evalExpr(start)) || 0;
            const unrolled: ParsedStatement[] = [];
            let guard = 0;
            this.vars[varName] = cur;
            while (Number(this.evalExpr(cond)) !== 0 && guard < 36) {
              const snapshotVal = cur;
              unrolled.push({
                kind: 'assign',
                varName,
                expr: String(snapshotVal),
              });
              unrolled.push(...stmt.forBody);
              // compute next value
              const incMatch = step.match(/\+=\s*(\d+)/);
              const decMatch = step.match(/-=\s*(\d+)/);
              if (incMatch) cur += Number(incMatch[1]);
              else if (decMatch) cur -= Number(decMatch[1]);
              else if (step.includes('--')) cur -= 1;
              else cur += 1;
              this.vars[varName] = cur;
              guard++;
            }
            if (unrolled.length > 0) {
              this.queue.unshift(...unrolled.map((s) => ({ stmt: s })));
            }
          }
          break;
        }
      }
    }

    this.emitState();
    this.timer = window.setTimeout(this.step, 16);
  };
}
