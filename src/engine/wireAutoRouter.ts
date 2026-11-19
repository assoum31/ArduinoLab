import type { ComponentKind, PlacedComponent, WireConnection } from '../types/arduino';

export interface WirePoint {
  x: number;
  y: number;
}

interface ObstacleRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  penalty: number;
}

const GRID_STEP = 10;
const GRID_MIN_X = 0;
const GRID_MIN_Y = 0;
const COLS = 78; // 0..770
const ROWS = 41; // 0..400

// Direction vectors: 0=Right, 1=Left, 2=Down, 3=Up
const DIR_DX = [1, -1, 0, 0];
const DIR_DY = [0, 0, 1, -1];

function toCol(x: number): number {
  return Math.max(0, Math.min(COLS - 1, Math.round((x - GRID_MIN_X) / GRID_STEP)));
}

function toRow(y: number): number {
  return Math.max(0, Math.min(ROWS - 1, Math.round((y - GRID_MIN_Y) / GRID_STEP)));
}

function colToX(c: number): number {
  return GRID_MIN_X + c * GRID_STEP;
}

function rowToY(r: number): number {
  return GRID_MIN_Y + r * GRID_STEP;
}

function getComponentBodyRect(comp: PlacedComponent): ObstacleRect {
  const kind: ComponentKind = comp.kind;
  if (kind.startsWith('resistor-')) {
    return { x1: comp.x - 19, y1: comp.y - 10, x2: comp.x + 19, y2: comp.y + 10, penalty: 55 };
  }
  if (kind === 'ultrasonic') {
    return { x1: comp.x - 38, y1: comp.y - 24, x2: comp.x + 38, y2: comp.y + 17, penalty: 70 };
  }
  if (kind === 'servo') {
    return { x1: comp.x - 27, y1: comp.y - 24, x2: comp.x + 27, y2: comp.y + 18, penalty: 70 };
  }
  if (kind === 'potentiometer') {
    return { x1: comp.x - 26, y1: comp.y - 24, x2: comp.x + 26, y2: comp.y + 19, penalty: 65 };
  }
  if (kind === 'button') {
    return { x1: comp.x - 22, y1: comp.y - 20, x2: comp.x + 22, y2: comp.y + 16, penalty: 60 };
  }
  if (kind === 'buzzer' || kind === 'ldr') {
    return { x1: comp.x - 21, y1: comp.y - 22, x2: comp.x + 21, y2: comp.y + 16, penalty: 60 };
  }
  if (kind === 'temp-sensor') {
    return { x1: comp.x - 17, y1: comp.y - 16, x2: comp.x + 17, y2: comp.y + 15, penalty: 60 };
  }
  // LEDs
  return { x1: comp.x - 18, y1: comp.y - 24, x2: comp.x + 18, y2: comp.y + 14, penalty: 60 };
}

/**
 * Pick a clean grid entry/exit anchor right beside a pin so wires depart
 * orthogonally away from PCB silkscreen or component bodies.
 */
function getPinExitCell(
  nodeId: string,
  pt: WirePoint,
): { col: number; row: number } {
  if (nodeId.startsWith('arduino:')) {
    // Left-side Arduino pins (x = 46): exit left into left margin corridor (x = 20)
    if (pt.x < 100) {
      return { col: toCol(pt.x - 22), row: toRow(pt.y) };
    }
    // Right-side Arduino digital header (x = 274): exit right into central routing channel
    return { col: toCol(pt.x + 16), row: toRow(pt.y) };
  }
  if (nodeId.startsWith('comp:')) {
    // Resistor pins (a = left, b = right) exit slightly outward horizontally
    if (nodeId.endsWith(':a')) {
      return { col: toCol(pt.x - 4), row: toRow(pt.y) };
    }
    if (nodeId.endsWith(':b')) {
      return { col: toCol(pt.x + 4), row: toRow(pt.y) };
    }
    // Bottom-mounted component pins: drop slightly downward to clear pin circles cleanly
    return { col: toCol(pt.x), row: toRow(pt.y + 6) };
  }
  return { col: toCol(pt.x), row: toRow(pt.y) };
}

/** Simple binary min-heap for fast A* search */
class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(priority: number, state: number): void {
    this.keys.push(priority);
    this.vals.push(state);
    let i = this.keys.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      const tk = this.keys[p];
      const tv = this.vals[p];
      this.keys[p] = this.keys[i];
      this.vals[p] = this.vals[i];
      this.keys[i] = tk;
      this.vals[i] = tv;
      i = p;
    }
  }

  pop(): number {
    const top = this.vals[0];
    const lastK = this.keys.pop()!;
    const lastV = this.vals.pop()!;
    if (this.keys.length > 0) {
      this.keys[0] = lastK;
      this.vals[0] = lastV;
      let i = 0;
      const n = this.keys.length;
      while (true) {
        const l = (i << 1) + 1;
        const r = l + 1;
        let smallest = i;
        if (l < n && this.keys[l] < this.keys[smallest]) smallest = l;
        if (r < n && this.keys[r] < this.keys[smallest]) smallest = r;
        if (smallest === i) break;
        const tk = this.keys[i];
        const tv = this.vals[i];
        this.keys[i] = this.keys[smallest];
        this.vals[i] = this.vals[smallest];
        this.keys[smallest] = tk;
        this.vals[smallest] = tv;
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * Remove redundant collinear points and tiny micro-jogs for crisp PCB traces.
 */
function simplifyOrthogonalPoints(raw: WirePoint[]): WirePoint[] {
  if (raw.length <= 2) return raw;
  const dedup: WirePoint[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const prev = dedup[dedup.length - 1];
    const cur = raw[i];
    if (Math.abs(prev.x - cur.x) > 0.5 || Math.abs(prev.y - cur.y) > 0.5) {
      dedup.push(cur);
    }
  }
  if (dedup.length <= 2) return dedup;

  const out: WirePoint[] = [dedup[0]];
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1];
    const b = dedup[i];
    const c = dedup[i + 1];
    const sameX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5;
    const sameY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5;
    if (!sameX && !sameY) {
      out.push(b);
    }
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}

/**
 * Convert orthogonal waypoints into a smooth SVG path with rounded corners.
 */
export function buildRoundedOrthogonalPath(
  points: WirePoint[],
  cornerRadius = 7,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];

    const v1x = cur.x - prev.x;
    const v1y = cur.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - cur.x;
    const v2y = next.y - cur.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${cur.x} ${cur.y}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 * 0.45, len2 * 0.45);
    const pStartX = cur.x - (v1x / len1) * r;
    const pStartY = cur.y - (v1y / len1) * r;
    const pEndX = cur.x + (v2x / len2) * r;
    const pEndY = cur.y + (v2y / len2) * r;

    d += ` L ${pStartX.toFixed(1)} ${pStartY.toFixed(1)} Q ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}, ${pEndX.toFixed(1)} ${pEndY.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Intelligently auto-route all wires in a circuit using directional A* on an orthogonal
 * routing grid with obstacle avoidance (Arduino PCB + component bodies), automatic lane
 * spreading (anti-overlap), and wire-crossing minimization.
 */
export function autoRouteCircuitWires(
  components: PlacedComponent[],
  wires: WireConnection[],
  pinCoords: Map<string, WirePoint>,
): WireConnection[] {
  if (wires.length === 0) return wires;

  // 1. Build static cell penalty map (Arduino Uno PCB body + placed component bodies + clean corridor bonuses)
  const cellPenalty = new Float32Array(COLS * ROWS);

  // Arduino Uno PCB interior (keeps left-side pins at x=46 and right-side pins at x=274 clear)
  const obstacles: ObstacleRect[] = [
    { x1: 56, y1: 38, x2: 262, y2: 374, penalty: 95 },
    // USB & DC barrel jack on top of Uno
    { x1: 64, y1: 16, x2: 240, y2: 44, penalty: 85 },
  ];

  for (const comp of components) {
    obstacles.push(getComponentBodyRect(comp));
  }

  for (let r = 0; r < ROWS; r++) {
    const y = rowToY(r);
    for (let c = 0; c < COLS; c++) {
      const x = colToX(c);
      let cost = 0;
      for (const obs of obstacles) {
        if (x >= obs.x1 && x <= obs.x2 && y >= obs.y1 && y <= obs.y2) {
          cost = Math.max(cost, obs.penalty);
        }
      }
      // Mild preference for clean breadboard gutters & inter-board bus channel
      if (cost === 0) {
        const inBusChannel = x >= 285 && x <= 350;
        const inTopBottomRail = (y >= 10 && y <= 34) || (y >= 376 && y <= 394);
        const inBreadboardTrench = x >= 355 && x <= 740 && y >= 198 && y <= 218;
        if (inBusChannel || inTopBottomRail || inBreadboardTrench) {
          cost = -0.35;
        }
      }
      cellPenalty[r * COLS + c] = cost;
    }
  }

  // Track horizontal & vertical wire occupancy on every cell to prevent collinear stacking and minimize crossings
  const usedHoriz = new Uint8Array(COLS * ROWS);
  const usedVert = new Uint8Array(COLS * ROWS);

  // 2. Order wires: shorter component-to-component jumps first, then right-header wires, then left-rail wires
  const indexedWires = wires.map((wire, index) => {
    const p1 = pinCoords.get(wire.from);
    const p2 = pinCoords.get(wire.to);
    const dist = p1 && p2 ? Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) : 9999;
    const isLeftSide =
      (p1 && wire.from.startsWith('arduino:') && p1.x < 100) ||
      (p2 && wire.to.startsWith('arduino:') && p2.x < 100);
    return { wire, index, dist, isLeftSide };
  });

  indexedWires.sort((a, b) => {
    if (a.isLeftSide !== b.isLeftSide) return a.isLeftSide ? 1 : -1;
    return a.dist - b.dist;
  });

  const routedByIndex = new Map<number, WirePoint[]>();

  // State space for directional A*: (r * COLS + c) * 4 + dir
  const totalStates = COLS * ROWS * 4;
  const gScore = new Float32Array(totalStates);
  const cameFrom = new Int32Array(totalStates);
  const closed = new Uint8Array(totalStates);

  for (const item of indexedWires) {
    const { wire, index } = item;
    const p1 = pinCoords.get(wire.from);
    const p2 = pinCoords.get(wire.to);
    if (!p1 || !p2) {
      routedByIndex.set(index, []);
      continue;
    }

    const startCell = getPinExitCell(wire.from, p1);
    const goalCell = getPinExitCell(wire.to, p2);

    // If start and goal snap to the same cell, route directly with an L bend
    if (startCell.col === goalCell.col && startCell.row === goalCell.row) {
      const simple = simplifyOrthogonalPoints([
        { x: p1.x, y: p1.y },
        { x: p1.x, y: p2.y },
        { x: p2.x, y: p2.y },
      ]);
      routedByIndex.set(index, simple);
      continue;
    }

    gScore.fill(1e9);
    cameFrom.fill(-1);
    closed.fill(0);

    const heap = new MinHeap();
    const startIdx = startCell.row * COLS + startCell.col;
    const goalIdx = goalCell.row * COLS + goalCell.col;

    // Seed all 4 directions from startCell
    for (let d = 0; d < 4; d++) {
      const st = startIdx * 4 + d;
      gScore[st] = 0;
      const h =
        Math.abs(startCell.col - goalCell.col) + Math.abs(startCell.row - goalCell.row);
      heap.push(h, st);
    }

    let bestGoalState = -1;
    let iterations = 0;
    const MAX_ITER = 12000;

    while (heap.size > 0 && iterations < MAX_ITER) {
      iterations++;
      const curState = heap.pop();
      if (closed[curState]) continue;
      closed[curState] = 1;

      const curCell = curState >> 2;
      const curDir = curState & 3;

      if (curCell === goalIdx) {
        bestGoalState = curState;
        break;
      }

      const cr = Math.floor(curCell / COLS);
      const cc = curCell - cr * COLS;
      const curG = gScore[curState];

      for (let nd = 0; nd < 4; nd++) {
        // Disallow 180-degree reversal
        if ((curDir ^ 1) === nd) continue;

        const nc = cc + DIR_DX[nd];
        const nr = cr + DIR_DY[nd];
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;

        const nCell = nr * COLS + nc;
        const nState = nCell * 4 + nd;
        if (closed[nState]) continue;

        const isHoriz = nd < 2;
        let stepCost = 1.0;

        // Bend penalty encourages clean, low-bend traces
        if (nd !== curDir) {
          stepCost += 4.2;
        }

        // Static obstacle / corridor cost (allow entering start/goal cell freely)
        if (nCell !== goalIdx && nCell !== startIdx) {
          stepCost += cellPenalty[nCell];
        }

        // Dynamic anti-overlap & crossing minimization
        if (isHoriz) {
          if (usedHoriz[nCell] > 0) stepCost += 42 * usedHoriz[nCell];
          if (usedVert[nCell] > 0) stepCost += 12 * usedVert[nCell];
        } else {
          if (usedVert[nCell] > 0) stepCost += 42 * usedVert[nCell];
          if (usedHoriz[nCell] > 0) stepCost += 12 * usedHoriz[nCell];
        }

        const tentativeG = curG + Math.max(0.25, stepCost);
        if (tentativeG < gScore[nState]) {
          gScore[nState] = tentativeG;
          cameFrom[nState] = curState;
          const h = Math.abs(nc - goalCell.col) + Math.abs(nr - goalCell.row);
          heap.push(tentativeG + h * 1.05, nState);
        }
      }
    }

    let finalPoints: WirePoint[];

    if (bestGoalState !== -1) {
      // Reconstruct cell path
      const cellPath: Array<{ c: number; r: number }> = [];
      let st = bestGoalState;
      while (st !== -1) {
        const cell = st >> 2;
        const r = Math.floor(cell / COLS);
        const c = cell - r * COLS;
        cellPath.push({ c, r });
        st = cameFrom[st];
      }
      cellPath.reverse();

      // Mark occupancy on grid so subsequent wires spread into parallel lanes
      for (let i = 1; i < cellPath.length; i++) {
        const prev = cellPath[i - 1];
        const cur = cellPath[i];
        const cellIdx = cur.r * COLS + cur.c;
        if (cur.r === prev.r) {
          usedHoriz[cellIdx] = Math.min(10, usedHoriz[cellIdx] + 1);
          usedHoriz[prev.r * COLS + prev.c] = Math.min(10, usedHoriz[prev.r * COLS + prev.c] + 1);
        } else {
          usedVert[cellIdx] = Math.min(10, usedVert[cellIdx] + 1);
          usedVert[prev.r * COLS + prev.c] = Math.min(10, usedVert[prev.r * COLS + prev.c] + 1);
        }
      }

      // Stitch exact pin coordinates to grid path cleanly using orthogonal connectors
      const raw: WirePoint[] = [{ x: p1.x, y: p1.y }];
      const firstGrid = { x: colToX(cellPath[0].c), y: rowToY(cellPath[0].r) };

      // Depart pin cleanly orthogonally
      if (wire.from.startsWith('arduino:')) {
        raw.push({ x: firstGrid.x, y: p1.y });
      } else {
        raw.push({ x: p1.x, y: firstGrid.y });
      }

      for (const pt of cellPath) {
        raw.push({ x: colToX(pt.c), y: rowToY(pt.r) });
      }

      const lastGrid = {
        x: colToX(cellPath[cellPath.length - 1].c),
        y: rowToY(cellPath[cellPath.length - 1].r),
      };
      if (wire.to.startsWith('arduino:')) {
        raw.push({ x: lastGrid.x, y: p2.y });
      } else {
        raw.push({ x: p2.x, y: lastGrid.y });
      }
      raw.push({ x: p2.x, y: p2.y });

      finalPoints = simplifyOrthogonalPoints(raw);
    } else {
      // Clean orthogonal fallback
      const midX = Math.round((p1.x + p2.x) / 2);
      finalPoints = simplifyOrthogonalPoints([
        { x: p1.x, y: p1.y },
        { x: midX, y: p1.y },
        { x: midX, y: p2.y },
        { x: p2.x, y: p2.y },
      ]);
    }

    routedByIndex.set(index, finalPoints);
  }

  return wires.map((wire, idx) => {
    const pts = routedByIndex.get(idx);
    if (!pts || pts.length < 2) return wire;
    return {
      ...wire,
      waypoints: pts,
    };
  });
}
