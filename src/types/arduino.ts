import type { LocalizedText } from '../i18n/translations';

export type ComponentKind =
  | 'led-red'
  | 'led-green'
  | 'led-blue'
  | 'led-yellow'
  | 'resistor-220'
  | 'resistor-1k'
  | 'resistor-10k'
  | 'button'
  | 'potentiometer'
  | 'ldr'
  | 'ultrasonic'
  | 'servo'
  | 'buzzer'
  | 'temp-sensor';

export interface ComponentPinDef {
  id: string;
  label: string;
  dx: number; // offset from component center in SVG units
  dy: number;
  role: 'anode' | 'cathode' | 'signal' | 'vcc' | 'gnd' | 'trig' | 'echo' | 'terminal';
}

export interface PlacedComponent {
  id: string;
  kind: ComponentKind;
  x: number; // SVG canvas coordinate (breadboard zone)
  y: number;
  label?: string;
  value?: number; // For interactive inputs: pot 0..1023, ldr 0..1023, ultrasonic 2..400 cm, temp -40..125 C, button 0|1
}

export interface WireConnection {
  id: string;
  from: string; // e.g., "arduino:D13", "arduino:GND1", "comp:<id>:<pinId>", "bb:col-row"
  to: string;
  color: string;
  waypoints?: Array<{ x: number; y: number }>;
}

export interface CircuitState {
  components: PlacedComponent[];
  wires: WireConnection[];
}

export type BlockType =
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
  | 'setVarAnalogRead'
  | 'setVarDigitalRead'
  | 'setVarMap'
  | 'ifAnalogCompare'
  | 'comment';

export interface CodeBlock {
  id: string;
  section: 'setup' | 'loop';
  type: BlockType;
  params: Record<string, string | number>;
}

export type OverloadReason =
  | 'overvoltage'
  | 'overcurrent'
  | 'overpower'
  | 'reverse-polarity'
  | 'short-circuit';

export interface ComponentOverloadInfo {
  reason: OverloadReason;
  measuredLabel: string;
  ratedMaxLabel: string;
  ratio: number;
  summary: LocalizedText;
  fixHint: LocalizedText;
}

export interface ComponentPowerState {
  powered: boolean;
  brightness: number;
  warnNoResistor: boolean;
  voltageV?: number;
  currentMa?: number;
  powerMw?: number;
  overload?: ComponentOverloadInfo | null;
}

export interface ElectricalDiagnostic {
  severity: 'ok' | 'warning' | 'error';
  code:
    | 'OK'
    | 'SHORT_CIRCUIT'
    | 'LED_NO_RESISTOR'
    | 'MISSING_GND'
    | 'OVER_VOLTAGE'
    | 'OVER_CURRENT'
    | 'THERMAL_OVERLOAD'
    | 'REVERSE_POLARITY';
  componentId?: string;
  message: LocalizedText;
}

export interface SimRuntimeState {
  running: boolean;
  pinModes: Record<string, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
  pinValues: Record<string, number>; // Digital 0|1 or PWM 0..255
  analogValues: Record<string, number>; // A0..A5 -> 0..1023
  servoAngles: Record<string, number>; // pin -> 0..180
  buzzerTone: { pin: string; freq: number } | null;
  ledD13On: boolean;
  txActive: boolean;
  elapsedMs: number;
  diagnostics: ElectricalDiagnostic[];
  componentPower: Record<string, ComponentPowerState>;
}

export interface SerialEntry {
  id: number;
  timestamp: string;
  text: string;
  direction: 'rx' | 'tx';
  numericValue?: number;
}

export interface LessonData {
  id: string;
  number: number;
  track: 1 | 2 | 3 | 4 | 5;
  xp: number;
  title: LocalizedText;
  summary: LocalizedText;
  theory: LocalizedText;
  keyFunctions: string[];
  pinoutNotes: { pin: string; role: LocalizedText }[];
  steps: LocalizedText[];
  code: string;
  blocks: CodeBlock[];
  circuit: CircuitState;
  isCustom?: boolean;
}

export type ChallengeMode = 'wiring' | 'debug' | 'code';

export interface ChallengeCheckResult {
  id: string;
  label: LocalizedText;
  passed: boolean;
}

export interface ChallengeData {
  id: string;
  mode: ChallengeMode;
  xp: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  title: LocalizedText;
  description: LocalizedText;
  hint: LocalizedText;
  initialCode: string;
  initialBlocks: CodeBlock[];
  initialCircuit: CircuitState;
  evaluate: (code: string, circuit: CircuitState) => ChallengeCheckResult[];
}

export interface SavedProject {
  id: number;
  title: string;
  description: string;
  code: string;
  blocksJson: string;
  circuitJson: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id?: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  xp: number;
  rank: string;
  role?: 'student' | 'admin';
  isBanned?: boolean;
  preferredLang: string;
}

export interface CertificateRecord {
  id?: number;
  certificateCode: string;
  recipientName: string;
  issuedBy: string;
  completionPercent: number;
  issuedAt: string;
}

export interface LeaderboardEntry {
  position: number;
  id: number;
  uid: string;
  displayName: string;
  photoUrl?: string | null;
  xp: number;
  rank: string;
  lessonsCompleted: number;
  challengesCompleted: number;
  badgesCount: number;
  hasCertificate: boolean;
}

export interface AdminCustomLesson {
  id: number;
  lessonKey: string;
  stationId: number;
  titleAr: string;
  titleEn: string;
  titleFr: string;
  summaryAr: string;
  summaryEn: string;
  summaryFr: string;
  theoryAr: string;
  theoryEn: string;
  theoryFr: string;
  xp: number;
  code: string;
  published: boolean;
  createdAt: string;
}

export interface PlatformConfig {
  announcementActive: boolean;
  announcementAr: string;
  announcementEn: string;
  announcementFr: string;
  xpMultiplier: number;
  certThreshold: number;
  certIssuerName: string;
  certDirectorName: string;
  customLessons: AdminCustomLesson[];
}

export interface AdminUserSummary {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  xp: number;
  rank: string;
  role: 'student' | 'admin';
  isBanned: boolean;
  lessonsCompleted: number;
  challengesCompleted: number;
  badges: string[];
  projectsCount: number;
  certificate: CertificateRecord | null;
  createdAt: string;
}

