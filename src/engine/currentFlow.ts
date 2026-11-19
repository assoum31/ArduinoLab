import type {
  CircuitState,
  ComponentPowerState,
  PlacedComponent,
} from '../types/arduino';
import { isLedKind, isResistorKind } from './arduinoSim';

export type CurrentFlowMode = 'conventional' | 'electrons';
export type FlowCategory = 'power' | 'signal' | 'overload';

export interface WireCurrentFlow {
  wireId: string;
  active: boolean;
  /** +1 means conventional current flows wire.from -> wire.to; -1 means wire.to -> wire.from */
  direction: 1 | -1;
  /** Estimated current magnitude in milliamps (mA) */
  currentMa: number;
  /** Higher node potential in Volts */
  highVoltageV: number;
  /** Visual classification for color & speed styling */
  category: FlowCategory;
  /** Suggested animation cycle duration in seconds (faster = higher current) */
  durationSec: number;
}

export interface ComponentCurrentFlow {
  componentId: string;
  active: boolean;
  /** Local SVG start/end coordinates (relative to component center) in conventional + -> - direction */
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  currentMa: number;
  category: FlowCategory;
}

export interface CircuitCurrentFlowMap {
  wires: Record<string, WireCurrentFlow>;
  components: Record<string, ComponentCurrentFlow>;
  activeWireCount: number;
  totalCurrentMa: number;
}

interface ConductanceBranch {
  a: string;
  b: string;
  ohms: number;
}

function getResistorOhms(kind: PlacedComponent['kind']): number {
  if (kind === 'resistor-1k') return 1000;
  if (kind === 'resistor-10k') return 10000;
  return 220;
}

function clampDuration(currentMa: number, category: FlowCategory): number {
  if (category === 'overload') return 0.55;
  if (category === 'signal') return 1.85;
  // Smooth log scale: 1 mA -> ~2.1s, 13 mA -> ~1.25s, 40+ mA -> ~0.8s
  const norm = Math.min(1, Math.max(0, Math.log10(Math.max(0.5, currentMa) + 1) / 1.75));
  return Number((2.25 - norm * 1.4).toFixed(2));
}

/**
 * Dense Gaussian elimination with partial pivoting for small circuit nodal matrices (typically N <= 60).
 */
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
    if (maxAbs < 1e-12) continue;

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
    x[i] = Math.abs(diag) > 1e-12 ? sum / diag : 0;
  }
  return x;
}

/**
 * Computes physically grounded conventional current (+ -> -) directions and magnitudes
 * across every wire and conducting component while the simulation is running.
 *
 * Uses Nodal Analysis where every wire carries a tiny physical resistance (0.25 Ω) so
 * exact potential drops reveal current direction even along multi-wire series chains and
 * regardless of the order in which the user connected the wire endpoints.
 */
export function computeCircuitCurrentFlow(params: {
  circuit: CircuitState;
  running: boolean;
  pinValues: Record<string, number>;
  pinModes?: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
  componentPower: Record<string, ComponentPowerState>;
  buzzerTone?: { pin: string; freq: number } | null;
  servoAngles?: Record<string, number>;
}): CircuitCurrentFlowMap {
  const {
    circuit,
    running,
    pinValues,
    pinModes = {},
    componentPower,
    buzzerTone = null,
    servoAngles = {},
  } = params;

  const empty: CircuitCurrentFlowMap = {
    wires: {},
    components: {},
    activeWireCount: 0,
    totalCurrentMa: 0,
  };

  if (!running || circuit.wires.length === 0) {
    return empty;
  }

  const nodeSet = new Set<string>();
  const branches: ConductanceBranch[] = [];
  const fixedVoltages = new Map<string, number>();

  const addNode = (id: string) => {
    nodeSet.add(id);
  };

  const addBranch = (a: string, b: string, ohms: number) => {
    if (a === b || ohms <= 0) return;
    addNode(a);
    addNode(b);
    branches.push({ a, b, ohms });
  };

  // Virtual internal Arduino supply nodes for pull-ups / analog sensing
  const INTERNAL_5V = '__internal:5V';
  const INTERNAL_GND = '__internal:GND';
  fixedVoltages.set(INTERNAL_5V, 5.0);
  fixedVoltages.set(INTERNAL_GND, 0.0);
  addNode(INTERNAL_5V);
  addNode(INTERNAL_GND);

  // 1. Add every jumper wire with a tiny physical wire resistance (0.25 Ω)
  const WIRE_OHMS = 0.25;
  for (const w of circuit.wires) {
    addBranch(w.from, w.to, WIRE_OHMS);
  }

  // 1b. Bridge shared internal breadboard copper rails & 5-hole vertical terminal strips
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

  // Track which Arduino pins are touched by the circuit
  const connectedArduinoPins = new Set<string>();
  for (const node of nodeSet) {
    if (node.startsWith('arduino:')) {
      connectedArduinoPins.add(node.slice('arduino:'.length));
    }
  }

  // 2. Assign Dirichlet boundary voltages / Norton impedances to Arduino pins
  const activeServoPins = new Set(Object.keys(servoAngles));
  const signalPins = new Set<string>();

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
      // Servo PWM control pulse output (high-impedance control signal)
      addBranch(INTERNAL_5V, node, 2200);
      signalPins.add(node);
      continue;
    }

    if (val > 0) {
      const volts = (Math.max(0, Math.min(255, val)) / 255) * 5.0;
      fixedVoltages.set(node, volts);
      continue;
    }

    if (mode === 'INPUT_PULLUP') {
      // ATmega328P internal ~20kΩ pull-up resistor to 5V
      addBranch(INTERNAL_5V, node, 20000);
      signalPins.add(node);
      continue;
    }

    if (pin.startsWith('A')) {
      // Analog ADC sense pin: high-impedance input (~60kΩ reference load for visible signal flow)
      addBranch(node, INTERNAL_GND, 60000);
      signalPins.add(node);
      continue;
    }

    if (mode === 'OUTPUT') {
      // Driven LOW output pin can sink current (e.g., active-low LED)
      fixedVoltages.set(node, 0.0);
    } else {
      // Digital INPUT pin (or unspecified idle pin): gentle pull-down sense path
      addBranch(node, INTERNAL_GND, 50000);
      signalPins.add(node);
    }
  }

  // 3. Add internal conducting paths for placed components
  const signalNodes = new Set<string>(signalPins);

  for (const comp of circuit.components) {
    const pwr = componentPower[comp.id];

    if (isResistorKind(comp.kind)) {
      addBranch(`comp:${comp.id}:a`, `comp:${comp.id}:b`, getResistorOhms(comp.kind));
    } else if (isLedKind(comp.kind)) {
      const anode = `comp:${comp.id}:anode`;
      const cathode = `comp:${comp.id}:cathode`;
      // Diode conducts forward anode -> cathode only when forward-powered
      if (pwr?.powered) {
        // Approximate forward conduction resistance (smaller if overloaded/unprotected)
        const effOhms = pwr.warnNoResistor || pwr.overload?.reason === 'overcurrent' ? 45 : 155;
        addBranch(anode, cathode, effOhms);
      }
    } else if (comp.kind === 'buzzer') {
      const pos = `comp:${comp.id}:pos`;
      const neg = `comp:${comp.id}:neg`;
      if (pwr?.powered || Boolean(buzzerTone)) {
        addBranch(pos, neg, 180);
      }
    } else if (comp.kind === 'button') {
      const a = `comp:${comp.id}:a`;
      const b = `comp:${comp.id}:b`;
      // Closed switch when pressed, open circuit when released
      if ((comp.value ?? 0) === 1) {
        addBranch(a, b, 10);
      }
    } else if (comp.kind === 'potentiometer') {
      const vcc = `comp:${comp.id}:vcc`;
      const sig = `comp:${comp.id}:sig`;
      const gnd = `comp:${comp.id}:gnd`;
      const ratio = Math.max(0.05, Math.min(0.95, (comp.value ?? 512) / 1023));
      // Voltage divider: vcc --[R_top]-- sig --[R_bot]-- gnd (total 10kΩ)
      addBranch(vcc, sig, (1 - ratio) * 10000);
      addBranch(sig, gnd, ratio * 10000);
      signalNodes.add(sig);
    } else if (comp.kind === 'ldr' || comp.kind === 'temp-sensor') {
      const vcc = `comp:${comp.id}:vcc`;
      const sig = `comp:${comp.id}:sig`;
      const gnd = `comp:${comp.id}:gnd`;
      const norm =
        comp.kind === 'temp-sensor'
          ? Math.max(0.1, Math.min(0.9, ((comp.value ?? 24) + 10) / 80))
          : Math.max(0.08, Math.min(0.92, (comp.value ?? 520) / 1023));
      addBranch(vcc, sig, (1 - norm) * 6000);
      addBranch(sig, gnd, norm * 6000);
      signalNodes.add(sig);
    } else if (comp.kind === 'servo') {
      const vcc = `comp:${comp.id}:vcc`;
      const gnd = `comp:${comp.id}:gnd`;
      const sig = `comp:${comp.id}:sig`;
      addBranch(vcc, gnd, 140); // Motor supply rail draw (~35 mA)
      addBranch(sig, gnd, 12000); // Control PWM sense input
      signalNodes.add(sig);
    } else if (comp.kind === 'ultrasonic') {
      const vcc = `comp:${comp.id}:vcc`;
      const gnd = `comp:${comp.id}:gnd`;
      const trig = `comp:${comp.id}:trig`;
      const echo = `comp:${comp.id}:echo`;
      addBranch(vcc, gnd, 330); // HC-SR04 quiescent/active supply (~15 mA)
      if (pwr?.powered) {
        addBranch(trig, gnd, 15000);
        addBranch(vcc, echo, 8000);
        signalNodes.add(trig);
        signalNodes.add(echo);
      }
    } else if (comp.kind === 'multimeter') {
      const pos = `comp:${comp.id}:pos`;
      const neg = `comp:${comp.id}:neg`;
      if ((comp.value ?? 0) === 1) {
        // Ammeter mode: 0.5 Ω shunt conducts series current cleanly
        addBranch(pos, neg, 0.5);
      }
    }
  }

  // 4. Build linear Nodal Analysis system G * V = I for unknown (non-fixed) nodes
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

  // Tiny grounding leakage conductance (1 GΩ) ensures floating islands stay non-singular
  for (let i = 0; i < n; i++) {
    G[i][i] += 1e-9;
  }

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
  if (!solved) return empty;

  const voltages = new Map<string, number>(fixedVoltages);
  unknownNodes.forEach((node, idx) => {
    voltages.set(node, solved[idx]);
  });

  // 5. Evaluate directed current for every jumper wire
  const wiresMap: Record<string, WireCurrentFlow> = {};
  let activeWireCount = 0;
  let maxSourceCurrentMa = 0;

  // Map component IDs with overload for immediate fault highlighting
  const overloadedCompIds = new Set<string>();
  for (const [cid, state] of Object.entries(componentPower)) {
    if (state?.overload) overloadedCompIds.add(cid);
  }

  for (const w of circuit.wires) {
    const vFrom = voltages.get(w.from) ?? 0;
    const vTo = voltages.get(w.to) ?? 0;
    const dv = vFrom - vTo;
    const signedMa = (dv / WIRE_OHMS) * 1000;
    const absMa = Math.abs(signedMa);

    // Threshold: ignore numerical noise (< 0.015 mA = 15 µA)
    if (absMa < 0.015) {
      continue;
    }

    const direction: 1 | -1 = signedMa >= 0 ? 1 : -1;
    const highVoltageV = Math.max(vFrom, vTo);

    const touchesOverload =
      (w.from.startsWith('comp:') && overloadedCompIds.has(w.from.split(':')[1])) ||
      (w.to.startsWith('comp:') && overloadedCompIds.has(w.to.split(':')[1]));

    const touchesSignal = signalNodes.has(w.from) || signalNodes.has(w.to);

    let category: FlowCategory = 'power';
    if (absMa > 45 || touchesOverload) {
      category = 'overload';
    } else if (touchesSignal && absMa < 1.5) {
      category = 'signal';
    }

    const displayMa =
      absMa >= 1000 ? 999 : absMa >= 10 ? Math.round(absMa * 10) / 10 : Math.round(absMa * 100) / 100;

    wiresMap[w.id] = {
      wireId: w.id,
      active: true,
      direction,
      currentMa: displayMa,
      highVoltageV: Math.round(highVoltageV * 10) / 10,
      category,
      durationSec: clampDuration(absMa, category),
    };
    activeWireCount++;

    // Track total supply current leaving Arduino power/output pins (avoid double counting series wires)
    if (
      (w.from.startsWith('arduino:') && !w.from.startsWith('arduino:GND') && direction === 1) ||
      (w.to.startsWith('arduino:') && !w.to.startsWith('arduino:GND') && direction === -1)
    ) {
      maxSourceCurrentMa += Math.min(absMa, 500);
    }
  }

  // 6. Compute internal flow arrows across active Resistors & LEDs for seamless closed-loop visual continuity
  const componentsMap: Record<string, ComponentCurrentFlow> = {};

  for (const comp of circuit.components) {
    const pwr = componentPower[comp.id];

    if (isResistorKind(comp.kind)) {
      const va = voltages.get(`comp:${comp.id}:a`) ?? 0;
      const vb = voltages.get(`comp:${comp.id}:b`) ?? 0;
      const dv = va - vb;
      const ohms = getResistorOhms(comp.kind);
      const ma = (Math.abs(dv) / ohms) * 1000;
      if (ma >= 0.04) {
        const leftToRight = dv >= 0;
        const category: FlowCategory =
          pwr?.overload || ma > 45 ? 'overload' : ma < 1.2 ? 'signal' : 'power';
        componentsMap[comp.id] = {
          componentId: comp.id,
          active: true,
          fromX: leftToRight ? -24 : 24,
          fromY: 0,
          toX: leftToRight ? 24 : -24,
          toY: 0,
          currentMa: Math.round(ma * 10) / 10,
          category,
        };
      }
    } else if (isLedKind(comp.kind) && pwr?.powered) {
      const va = voltages.get(`comp:${comp.id}:anode`) ?? 0;
      const vc = voltages.get(`comp:${comp.id}:cathode`) ?? 0;
      if (va > vc + 0.05) {
        const ma = pwr.currentMa ?? 13;
        const category: FlowCategory = pwr.overload || pwr.warnNoResistor ? 'overload' : 'power';
        componentsMap[comp.id] = {
          componentId: comp.id,
          active: true,
          fromX: -10,
          fromY: 22,
          toX: 10,
          toY: 22,
          currentMa: ma,
          category,
        };
      }
    } else if (comp.kind === 'multimeter' && (comp.value ?? 0) === 1) {
      const vPos = voltages.get(`comp:${comp.id}:pos`) ?? 0;
      const vNeg = voltages.get(`comp:${comp.id}:neg`) ?? 0;
      const dv = vPos - vNeg;
      const ma = (Math.abs(dv) / 0.5) * 1000;
      if (ma >= 0.04) {
        const posToNeg = dv >= 0;
        const category: FlowCategory =
          pwr?.overload || ma > 45 ? 'overload' : ma < 1.2 ? 'signal' : 'power';
        componentsMap[comp.id] = {
          componentId: comp.id,
          active: true,
          fromX: posToNeg ? -16 : 16,
          fromY: 28,
          toX: posToNeg ? 16 : -16,
          toY: 28,
          currentMa: Math.round(ma * 10) / 10,
          category,
        };
      }
    }
  }

  return {
    wires: wiresMap,
    components: componentsMap,
    activeWireCount,
    totalCurrentMa: Math.round(maxSourceCurrentMa * 10) / 10,
  };
}
