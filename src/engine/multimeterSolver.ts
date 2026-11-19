import type {
  CircuitState,
  ComponentPowerState,
  PlacedComponent,
} from '../types/arduino';
import { isLedKind, isResistorKind } from './arduinoSim';

export type MultimeterMode = 'voltage' | 'current' | 'resistance';

export interface MultimeterReading {
  componentId: string;
  mode: MultimeterMode;
  connected: boolean;
  /** Formatted LCD string (e.g. "5.00 V", "13.2 mA", "220.0 Ω", "OL", "LIVE!", "FUSE!") */
  displayText: string;
  /** Compact unit label shown on LCD corner ("DC V", "DC mA", "Ω") */
  unitBadge: string;
  /** Numeric SI value when applicable (Volts, mA, or Ohms) */
  numericValue: number | null;
  /** Warning state if measuring Ω on live rails or over-current fuse trip in mA mode */
  warning: 'none' | 'open' | 'live-circuit' | 'fuse-overload' | 'idle';
  /** Human-readable probed endpoints */
  posTarget: string | null;
  negTarget: string | null;
}

export function getMultimeterModeFromValue(value?: number): MultimeterMode {
  if (value === 1) return 'current';
  if (value === 2) return 'resistance';
  return 'voltage';
}

export function getMultimeterValueFromMode(mode: MultimeterMode): number {
  if (mode === 'current') return 1;
  if (mode === 'resistance') return 2;
  return 0;
}

interface Branch {
  a: string;
  b: string;
  ohms: number;
}

function getResistorOhms(kind: PlacedComponent['kind']): number {
  if (kind === 'resistor-1k') return 1000;
  if (kind === 'resistor-10k') return 10000;
  return 220;
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > maxAbs) {
        maxAbs = v;
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-13) continue;

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / pivot;
      if (Math.abs(factor) < 1e-15) continue;
      M[r][col] = 0;
      for (let c = col + 1; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    const diag = M[i][i];
    x[i] = Math.abs(diag) > 1e-13 ? sum / diag : 0;
  }
  return x;
}

function formatVoltage(volts: number): string {
  const absV = Math.abs(volts);
  if (absV < 0.005) return '0.00 V';
  const sign = volts < 0 ? '-' : '';
  if (absV < 1.0) {
    return `${sign}${Math.round(absV * 1000)} mV`;
  }
  return `${sign}${absV.toFixed(2)} V`;
}

function formatCurrent(ma: number): string {
  const absMa = Math.abs(ma);
  if (absMa < 0.005) return '0.00 mA';
  const sign = ma < 0 ? '-' : '';
  if (absMa < 1.0) {
    return `${sign}${Math.round(absMa * 1000)} µA`;
  }
  if (absMa >= 100) {
    return `${sign}${absMa.toFixed(0)} mA`;
  }
  return `${sign}${absMa.toFixed(1)} mA`;
}

function formatResistance(ohms: number): string {
  if (!Number.isFinite(ohms) || ohms > 9_500_000) return 'OL';
  if (ohms < 0.8) return '0.0 Ω';
  if (ohms < 1000) {
    return ohms >= 100 ? `${ohms.toFixed(1)} Ω` : `${ohms.toFixed(1)} Ω`;
  }
  if (ohms < 1_000_000) {
    const k = ohms / 1000;
    return k >= 100 ? `${k.toFixed(0)} kΩ` : k >= 10 ? `${k.toFixed(1)} kΩ` : `${k.toFixed(2)} kΩ`;
  }
  return `${(ohms / 1_000_000).toFixed(2)} MΩ`;
}

/**
 * Finds the direct wired neighbor of a probe node (e.g. "arduino:D13" or "comp:r1:a").
 */
function findProbeTarget(circuit: CircuitState, probeNode: string): string | null {
  for (const w of circuit.wires) {
    if (w.from === probeNode) return w.to;
    if (w.to === probeNode) return w.from;
  }
  return null;
}

/**
 * Solves live node voltages across the active circuit (when simulation is running).
 * Voltmeters present 10 MΩ; ammeters present a 0.5 Ω precision shunt; ohmmeters present 10 MΩ.
 */
function solveLiveCircuitVoltages(params: {
  circuit: CircuitState;
  pinValues: Record<string, number>;
  pinModes: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
  componentPower: Record<string, ComponentPowerState>;
  buzzerTone: { pin: string; freq: number } | null;
  servoAngles: Record<string, number>;
}): Map<string, number> {
  const { circuit, pinValues, pinModes, componentPower, buzzerTone, servoAngles } = params;
  const nodeSet = new Set<string>();
  const branches: Branch[] = [];
  const fixedVoltages = new Map<string, number>();

  const addBranch = (a: string, b: string, ohms: number) => {
    if (a === b || ohms <= 0) return;
    nodeSet.add(a);
    nodeSet.add(b);
    branches.push({ a, b, ohms });
  };

  const INTERNAL_5V = '__mm:5V';
  const INTERNAL_GND = '__mm:GND';
  fixedVoltages.set(INTERNAL_5V, 5.0);
  fixedVoltages.set(INTERNAL_GND, 0.0);
  nodeSet.add(INTERNAL_5V);
  nodeSet.add(INTERNAL_GND);

  const WIRE_OHMS = 0.25;
  for (const w of circuit.wires) {
    addBranch(w.from, w.to, WIRE_OHMS);
  }

  // Bridge shared breadboard copper rails & 5-hole vertical terminal strips
  const bbStripGroups = new Map<string, string[]>();
  for (const node of nodeSet) {
    let groupKey: string | null = null;
    if (node.startsWith('bb:pos:')) groupKey = 'bb:rail-pos';
    else if (node.startsWith('bb:neg:')) groupKey = 'bb:rail-neg';
    else if (node.startsWith('bb:col:')) {
      const parts = node.split(':');
      if (parts.length >= 4) groupKey = `bb:strip:${parts[2]}:${parts[3]}`;
    }
    if (groupKey) {
      if (!bbStripGroups.has(groupKey)) bbStripGroups.set(groupKey, []);
      bbStripGroups.get(groupKey)!.push(node);
    }
  }
  for (const members of bbStripGroups.values()) {
    for (let i = 1; i < members.length; i++) {
      addBranch(members[0], members[i], 0.05);
    }
  }

  const connectedArduinoPins = new Set<string>();
  for (const node of nodeSet) {
    if (node.startsWith('arduino:')) {
      connectedArduinoPins.add(node.slice('arduino:'.length));
    }
  }

  const activeServoPins = new Set(Object.keys(servoAngles));

  for (const pin of connectedArduinoPins) {
    const node = `arduino:${pin}`;
    if (pin.startsWith('GND')) {
      fixedVoltages.set(node, 0.0);
      continue;
    }
    if (pin === '5V') {
      fixedVoltages.set(node, 5.0);
      continue;
    }
    if (pin === '3.3V') {
      fixedVoltages.set(node, 3.3);
      continue;
    }
    if (pin === 'VIN') {
      fixedVoltages.set(node, 9.0);
      continue;
    }

    const val = pinValues[pin] ?? 0;
    const mode = pinModes[pin];

    if (buzzerTone && buzzerTone.pin === pin) {
      fixedVoltages.set(node, 5.0);
      continue;
    }
    if (activeServoPins.has(pin)) {
      addBranch(INTERNAL_5V, node, 2200);
      continue;
    }
    if (val > 0) {
      fixedVoltages.set(node, (Math.max(0, Math.min(255, val)) / 255) * 5.0);
      continue;
    }
    if (mode === 'INPUT_PULLUP') {
      addBranch(INTERNAL_5V, node, 20000);
      continue;
    }
    if (pin.startsWith('A')) {
      addBranch(node, INTERNAL_GND, 100000);
      continue;
    }
    if (mode === 'OUTPUT') {
      fixedVoltages.set(node, 0.0);
    } else {
      addBranch(node, INTERNAL_GND, 100000);
    }
  }

  for (const comp of circuit.components) {
    const pwr = componentPower[comp.id];
    if (isResistorKind(comp.kind)) {
      addBranch(`comp:${comp.id}:a`, `comp:${comp.id}:b`, getResistorOhms(comp.kind));
    } else if (isLedKind(comp.kind)) {
      if (pwr?.powered) {
        const effOhms = pwr.warnNoResistor || pwr.overload?.reason === 'overcurrent' ? 45 : 155;
        addBranch(`comp:${comp.id}:anode`, `comp:${comp.id}:cathode`, effOhms);
      }
    } else if (comp.kind === 'buzzer') {
      if (pwr?.powered || Boolean(buzzerTone)) {
        addBranch(`comp:${comp.id}:pos`, `comp:${comp.id}:neg`, 180);
      }
    } else if (comp.kind === 'button') {
      if ((comp.value ?? 0) === 1) {
        addBranch(`comp:${comp.id}:a`, `comp:${comp.id}:b`, 10);
      }
    } else if (comp.kind === 'potentiometer') {
      const ratio = Math.max(0.02, Math.min(0.98, (comp.value ?? 512) / 1023));
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:sig`, (1 - ratio) * 10000);
      addBranch(`comp:${comp.id}:sig`, `comp:${comp.id}:gnd`, ratio * 10000);
    } else if (comp.kind === 'ldr') {
      const norm = Math.max(0.05, Math.min(0.95, (comp.value ?? 520) / 1023));
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:sig`, (1 - norm) * 10000);
      addBranch(`comp:${comp.id}:sig`, `comp:${comp.id}:gnd`, norm * 10000);
    } else if (comp.kind === 'temp-sensor') {
      // TMP36 outputs Vout = 0.5V + 0.01 * tempC
      const tempC = comp.value ?? 24;
      const vOut = Math.max(0.1, Math.min(2.0, 0.5 + tempC * 0.01));
      const ratio = Math.max(0.02, Math.min(0.95, vOut / 5.0));
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:sig`, (1 - ratio) * 5000);
      addBranch(`comp:${comp.id}:sig`, `comp:${comp.id}:gnd`, ratio * 5000);
    } else if (comp.kind === 'servo') {
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:gnd`, 140);
      addBranch(`comp:${comp.id}:sig`, `comp:${comp.id}:gnd`, 12000);
    } else if (comp.kind === 'ultrasonic') {
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:gnd`, 330);
    } else if (comp.kind === 'multimeter') {
      const mode = getMultimeterModeFromValue(comp.value);
      const pos = `comp:${comp.id}:pos`;
      const neg = `comp:${comp.id}:neg`;
      if (mode === 'current') {
        addBranch(pos, neg, 0.5); // Precision low-resistance current shunt
      } else {
        addBranch(pos, neg, 10_000_000); // 10 MΩ high-impedance voltmeter input
      }
    }
  }

  const unknownNodes: string[] = [];
  const unknownIndex = new Map<string, number>();
  for (const node of nodeSet) {
    if (!fixedVoltages.has(node)) {
      unknownIndex.set(node, unknownNodes.length);
      unknownNodes.push(node);
    }
  }

  const n = unknownNodes.length;
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const rhs = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) G[i][i] += 1e-10;

  for (const br of branches) {
    const g = 1 / br.ohms;
    const ia = unknownIndex.get(br.a);
    const ib = unknownIndex.get(br.b);
    const vaFixed = fixedVoltages.get(br.a);
    const vbFixed = fixedVoltages.get(br.b);

    if (ia !== undefined && ib !== undefined) {
      G[ia][ia] += g;
      G[ib][ib] += g;
      G[ia][ib] -= g;
      G[ib][ia] -= g;
    } else if (ia !== undefined && vbFixed !== undefined) {
      G[ia][ia] += g;
      rhs[ia] += g * vbFixed;
    } else if (ib !== undefined && vaFixed !== undefined) {
      G[ib][ib] += g;
      rhs[ib] += g * vaFixed;
    }
  }

  const solved = solveLinearSystem(G, rhs);
  const voltages = new Map<string, number>(fixedVoltages);
  if (solved) {
    unknownNodes.forEach((node, idx) => voltages.set(node, solved[idx]));
  }
  return voltages;
}

/**
 * Computes exact passive equivalent resistance (Ω) between two probed nodes
 * by injecting a 1 mA test current into posNode with negNode grounded at 0 V.
 */
function measurePassiveResistanceOhms(
  circuit: CircuitState,
  meterId: string,
  posNode: string,
  negNode: string,
): number {
  const nodeSet = new Set<string>([posNode, negNode]);
  const branches: Branch[] = [];

  const addBranch = (a: string, b: string, ohms: number) => {
    if (a === b || ohms <= 0) return;
    nodeSet.add(a);
    nodeSet.add(b);
    branches.push({ a, b, ohms });
  };

  // All jumper wires (using small 0.1 Ω lead resistance)
  const WIRE_OHMS = 0.1;
  for (const w of circuit.wires) {
    addBranch(w.from, w.to, WIRE_OHMS);
  }

  // Merge common Arduino GND pins so probing via GND1/GND2 behaves as one ground plane
  if (nodeSet.has('arduino:GND1') && nodeSet.has('arduino:GND2')) {
    addBranch('arduino:GND1', 'arduino:GND2', 0.05);
  }

  // Bridge shared breadboard copper rails & 5-hole vertical terminal strips
  const bbStripGroups = new Map<string, string[]>();
  for (const node of nodeSet) {
    let groupKey: string | null = null;
    if (node.startsWith('bb:pos:')) groupKey = 'bb:rail-pos';
    else if (node.startsWith('bb:neg:')) groupKey = 'bb:rail-neg';
    else if (node.startsWith('bb:col:')) {
      const parts = node.split(':');
      if (parts.length >= 4) groupKey = `bb:strip:${parts[2]}:${parts[3]}`;
    }
    if (groupKey) {
      if (!bbStripGroups.has(groupKey)) bbStripGroups.set(groupKey, []);
      bbStripGroups.get(groupKey)!.push(node);
    }
  }
  for (const members of bbStripGroups.values()) {
    for (let i = 1; i < members.length; i++) {
      addBranch(members[0], members[i], 0.05);
    }
  }

  // Passive component resistances
  for (const comp of circuit.components) {
    if (comp.id === meterId) continue;

    if (isResistorKind(comp.kind)) {
      addBranch(`comp:${comp.id}:a`, `comp:${comp.id}:b`, getResistorOhms(comp.kind));
    } else if (comp.kind === 'button') {
      if ((comp.value ?? 0) === 1) {
        addBranch(`comp:${comp.id}:a`, `comp:${comp.id}:b`, 0.2);
      }
    } else if (comp.kind === 'potentiometer') {
      const ratio = Math.max(0.01, Math.min(0.99, (comp.value ?? 512) / 1023));
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:sig`, (1 - ratio) * 10000);
      addBranch(`comp:${comp.id}:sig`, `comp:${comp.id}:gnd`, ratio * 10000);
    } else if (comp.kind === 'ldr') {
      // Bright light (high value) -> lower resistance (~500 Ω); dark (low value) -> high resistance (~50 kΩ)
      const norm = Math.max(0.02, Math.min(0.98, (comp.value ?? 520) / 1023));
      const totalLdr = Math.round(500 + (1 - norm) * 49500);
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:sig`, totalLdr * 0.5);
      addBranch(`comp:${comp.id}:sig`, `comp:${comp.id}:gnd`, totalLdr * 0.5);
    } else if (comp.kind === 'buzzer') {
      addBranch(`comp:${comp.id}:pos`, `comp:${comp.id}:neg`, 180);
    } else if (comp.kind === 'servo') {
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:gnd`, 140);
    } else if (comp.kind === 'ultrasonic') {
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:gnd`, 330);
    } else if (comp.kind === 'temp-sensor') {
      addBranch(`comp:${comp.id}:vcc`, `comp:${comp.id}:gnd`, 5000);
    } else if (comp.kind === 'multimeter') {
      const otherMode = getMultimeterModeFromValue(comp.value);
      if (otherMode === 'current') {
        addBranch(`comp:${comp.id}:pos`, `comp:${comp.id}:neg`, 0.5);
      }
    }
  }

  // Clamp negNode to 0 V and inject I_test = 1 mA (0.001 A) into posNode
  const unknownNodes: string[] = [];
  const unknownIndex = new Map<string, number>();
  for (const node of nodeSet) {
    if (node !== negNode) {
      unknownIndex.set(node, unknownNodes.length);
      unknownNodes.push(node);
    }
  }

  const posIdx = unknownIndex.get(posNode);
  if (posIdx === undefined) return 0;

  const n = unknownNodes.length;
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const rhs = new Array<number>(n).fill(0);

  // Ultra-small leakage (1e-11 S = 100 GΩ) guarantees invertibility on open circuits
  for (let i = 0; i < n; i++) G[i][i] += 1e-11;

  for (const br of branches) {
    const g = 1 / br.ohms;
    const ia = unknownIndex.get(br.a);
    const ib = unknownIndex.get(br.b);
    if (ia !== undefined && ib !== undefined) {
      G[ia][ia] += g;
      G[ib][ib] += g;
      G[ia][ib] -= g;
      G[ib][ia] -= g;
    } else if (ia !== undefined) {
      // br.b === negNode (0 V)
      G[ia][ia] += g;
    } else if (ib !== undefined) {
      // br.a === negNode (0 V)
      G[ib][ib] += g;
    }
  }

  const I_TEST = 0.001; // 1 mA
  rhs[posIdx] += I_TEST;

  const solved = solveLinearSystem(G, rhs);
  if (!solved) return Infinity;

  const vPos = solved[posIdx];
  const rawOhms = vPos / I_TEST;
  if (!Number.isFinite(rawOhms) || rawOhms > 20_000_000) {
    return Infinity;
  }
  // Tare out the 2 probe lead wires (~0.2 Ω total) for clean textbook readings
  return Math.max(0, rawOhms - 0.2);
}

/**
 * Computes real-time readings for every placed Multimeter on the breadboard.
 */
export function computeMultimeterReadings(params: {
  circuit: CircuitState;
  running: boolean;
  pinValues: Record<string, number>;
  pinModes?: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
  componentPower: Record<string, ComponentPowerState>;
  buzzerTone?: { pin: string; freq: number } | null;
  servoAngles?: Record<string, number>;
}): Record<string, MultimeterReading> {
  const {
    circuit,
    running,
    pinValues,
    pinModes = {},
    componentPower,
    buzzerTone = null,
    servoAngles = {},
  } = params;

  const meters = circuit.components.filter((c) => c.kind === 'multimeter');
  if (meters.length === 0) return {};

  const liveVoltages = running
    ? solveLiveCircuitVoltages({
        circuit,
        pinValues,
        pinModes,
        componentPower,
        buzzerTone,
        servoAngles,
      })
    : null;

  const results: Record<string, MultimeterReading> = {};

  for (const meter of meters) {
    const mode = getMultimeterModeFromValue(meter.value);
    const posNode = `comp:${meter.id}:pos`;
    const negNode = `comp:${meter.id}:neg`;
    const posTarget = findProbeTarget(circuit, posNode);
    const negTarget = findProbeTarget(circuit, negNode);
    const connected = Boolean(posTarget && negTarget);

    const unitBadge = mode === 'voltage' ? 'DC V' : mode === 'current' ? 'DC mA' : 'Ω';

    if (!connected) {
      results[meter.id] = {
        componentId: meter.id,
        mode,
        connected: false,
        displayText: mode === 'resistance' ? 'OL' : mode === 'current' ? '0.00 mA' : '0.00 V',
        unitBadge,
        numericValue: null,
        warning: 'open',
        posTarget,
        negTarget,
      };
      continue;
    }

    if (mode === 'voltage') {
      if (!running || !liveVoltages) {
        results[meter.id] = {
          componentId: meter.id,
          mode,
          connected: true,
          displayText: '0.00 V',
          unitBadge,
          numericValue: 0,
          warning: 'idle',
          posTarget,
          negTarget,
        };
        continue;
      }
      const dv = (liveVoltages.get(posNode) ?? 0) - (liveVoltages.get(negNode) ?? 0);
      results[meter.id] = {
        componentId: meter.id,
        mode,
        connected: true,
        displayText: formatVoltage(dv),
        unitBadge,
        numericValue: Math.round(dv * 1000) / 1000,
        warning: 'none',
        posTarget,
        negTarget,
      };
    } else if (mode === 'current') {
      if (!running || !liveVoltages) {
        results[meter.id] = {
          componentId: meter.id,
          mode,
          connected: true,
          displayText: '0.00 mA',
          unitBadge,
          numericValue: 0,
          warning: 'idle',
          posTarget,
          negTarget,
        };
        continue;
      }
      const dv = (liveVoltages.get(posNode) ?? 0) - (liveVoltages.get(negNode) ?? 0);
      const ma = (dv / 0.5) * 1000;
      const fuseTripped = Math.abs(ma) > 400;
      results[meter.id] = {
        componentId: meter.id,
        mode,
        connected: true,
        displayText: fuseTripped ? 'FUSE!' : formatCurrent(ma),
        unitBadge,
        numericValue: fuseTripped ? null : Math.round(ma * 100) / 100,
        warning: fuseTripped ? 'fuse-overload' : 'none',
        posTarget,
        negTarget,
      };
    } else {
      // Resistance (Ω) mode: check if measuring across an energized live voltage when running
      if (running && liveVoltages) {
        const liveDv = Math.abs(
          (liveVoltages.get(posNode) ?? 0) - (liveVoltages.get(negNode) ?? 0),
        );
        if (liveDv > 0.15) {
          results[meter.id] = {
            componentId: meter.id,
            mode,
            connected: true,
            displayText: 'LIVE!',
            unitBadge,
            numericValue: null,
            warning: 'live-circuit',
            posTarget,
            negTarget,
          };
          continue;
        }
      }
      const ohms = measurePassiveResistanceOhms(circuit, meter.id, posNode, negNode);
      const isOpen = !Number.isFinite(ohms) || ohms > 9_500_000;
      results[meter.id] = {
        componentId: meter.id,
        mode,
        connected: true,
        displayText: formatResistance(ohms),
        unitBadge,
        numericValue: isOpen ? null : Math.round(ohms * 10) / 10,
        warning: isOpen ? 'open' : 'none',
        posTarget,
        negTarget,
      };
    }
  }

  return results;
}
