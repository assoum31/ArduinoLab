import type { LocalizedText } from '../i18n/translations';
import type { CircuitState, CodeBlock } from '../types/arduino';
import { LESSONS } from './lessons';
import { arduinoCppToBlocks } from '../engine/blocklyBridge';

export type ProjectCategory = 'track-1' | 'track-2' | 'track-3' | 'track-4' | 'track-5' | 'bonus';

export interface ReadyProject {
  id: string;
  category: ProjectCategory;
  categoryLabel: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  code: string;
  blocks: CodeBlock[];
  circuit: CircuitState;
  pinsUsed: string[];
}

const BONUS_PROJECTS_RAW: Array<Omit<ReadyProject, 'blocks'>> = [
  {
    id: 'bonus-police-siren',
    category: 'bonus',
    categoryLabel: { ar: 'مشروع إضافي', en: 'Bonus Project', fr: 'Projet Bonus' },
    title: {
      ar: 'صافرة وأضواء سيارة الشرطة (Strobe & Siren)',
      en: 'Police Strobe Lights & Dual-Tone Siren',
      fr: 'Gyrophare & Sirène de Police',
    },
    description: {
      ar: 'تناوب وميض المصباحين الأحمر والأزرق بسرعة عالية مع نغمة صافرة إنذار ثنائية التردد على الجرس.',
      en: 'Alternating high-speed Red & Blue strobe LEDs synchronized with a two-tone Piezo siren.',
      fr: 'LED rouge et bleue alternées à haute vitesse synchronisées avec une sirène bi-ton.',
    },
    pinsUsed: ['D12', 'D11', 'D8'],
    code: `void setup() {
  pinMode(12, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(12, HIGH);
  digitalWrite(11, LOW);
  tone(8, 720, 220);
  Serial.println("RED - 720Hz");
  delay(260);

  digitalWrite(12, LOW);
  digitalWrite(11, HIGH);
  tone(8, 540, 220);
  Serial.println("BLUE - 540Hz");
  delay(260);
}`,
    circuit: {
      components: [
        { id: 'pol-r1', kind: 'resistor-220', x: 470, y: 120, label: '220Ω' },
        { id: 'pol-l1', kind: 'led-red', x: 565, y: 120, label: 'RED D12' },
        { id: 'pol-r2', kind: 'resistor-220', x: 470, y: 210, label: '220Ω' },
        { id: 'pol-l2', kind: 'led-blue', x: 565, y: 210, label: 'BLUE D11' },
        { id: 'pol-buz', kind: 'buzzer', x: 665, y: 165, label: 'SIREN D8' },
      ],
      wires: [
        { id: 'pw-1', from: 'arduino:D12', to: 'comp:pol-r1:a', color: '#ef4444' },
        { id: 'pw-2', from: 'comp:pol-r1:b', to: 'comp:pol-l1:anode', color: '#ef4444' },
        { id: 'pw-3', from: 'comp:pol-l1:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'pw-4', from: 'arduino:D11', to: 'comp:pol-r2:a', color: '#3b82f6' },
        { id: 'pw-5', from: 'comp:pol-r2:b', to: 'comp:pol-l2:anode', color: '#3b82f6' },
        { id: 'pw-6', from: 'comp:pol-l2:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'pw-7', from: 'arduino:D8', to: 'comp:pol-buz:pos', color: '#f59e0b' },
        { id: 'pw-8', from: 'comp:pol-buz:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'bonus-pot-servo',
    category: 'bonus',
    categoryLabel: { ar: 'مشروع إضافي', en: 'Bonus Project', fr: 'Projet Bonus' },
    title: {
      ar: 'توجيه ذراع السيرفو بالمقاومة المتغيرة',
      en: 'Potentiometer Servo Steering Dial',
      fr: 'Direction Servomoteur par Potentiomètre',
    },
    description: {
      ar: 'حرّك مقبض المقاومة المتغيرة (A0) للتحكم اللحظي بزاوية محرك السيرفو SG90 من 0° إلى 180° مع رسم الزاوية حياً.',
      en: 'Turn the 10kΩ potentiometer (A0) to steer an SG90 micro servo interactively from 0° to 180° with live angle plotting.',
      fr: 'Tournez le potentiomètre (A0) pour orienter le servo SG90 en temps réel de 0° à 180° avec tracé en direct.',
    },
    pinsUsed: ['A0', 'D9'],
    code: `#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  int angle = map(raw, 0, 1023, 0, 180);
  myServo.write(angle);
  Serial.println(angle);
  delay(100);
}`,
    circuit: {
      components: [
        { id: 'ps-pot', kind: 'potentiometer', x: 485, y: 265, label: 'DIAL A0', value: 512 },
        { id: 'ps-srv', kind: 'servo', x: 635, y: 185, label: 'SERVO D9' },
      ],
      wires: [
        { id: 'psw1', from: 'arduino:5V', to: 'comp:ps-pot:vcc', color: '#ef4444' },
        { id: 'psw2', from: 'arduino:A0', to: 'comp:ps-pot:sig', color: '#eab308' },
        { id: 'psw3', from: 'comp:ps-pot:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'psw4', from: 'arduino:D9', to: 'comp:ps-srv:sig', color: '#3b82f6' },
        { id: 'psw5', from: 'arduino:5V', to: 'comp:ps-srv:vcc', color: '#ef4444' },
        { id: 'psw6', from: 'comp:ps-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'bonus-auto-gate',
    category: 'bonus',
    categoryLabel: { ar: 'مشروع إضافي', en: 'Bonus Project', fr: 'Projet Bonus' },
    title: {
      ar: 'بوابة مواقف السيارات الأوتوماتيكية',
      en: 'Ultrasonic Automated Parking Gate',
      fr: 'Barrière de Parking Automatique Ultrason',
    },
    description: {
      ar: 'عند اقتراب سيارة لمسافة أقل من 40 سم من حساس HC-SR04، تفتح بوابة السيرفو لزاوية 95° ويضيء المصباح الأخضر تلقائياً.',
      en: 'When a vehicle approaches within 40 cm of the HC-SR04 sonar, the Servo gate lifts to 95° and lights the Green LED.',
      fr: 'Lorsqu’un véhicule s’approche à moins de 40 cm du HC-SR04, la barrière Servo s’ouvre à 95° et allume la LED verte.',
    },
    pinsUsed: ['D7', 'D6', 'D9', 'D12'],
    code: `#include <Servo.h>
Servo myServo;

void setup() {
  pinMode(7, OUTPUT);
  pinMode(6, INPUT);
  pinMode(12, OUTPUT);
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(7, HIGH);
  delay(10);
  digitalWrite(7, LOW);
  int duration = pulseIn(6, HIGH);
  int dist = duration / 58;
  Serial.println(dist);
  if (dist < 40) {
    myServo.write(95);
    digitalWrite(12, HIGH);
  } else {
    myServo.write(5);
    digitalWrite(12, LOW);
  }
  delay(200);
}`,
    circuit: {
      components: [
        { id: 'ag-us', kind: 'ultrasonic', x: 485, y: 280, label: 'HC-SR04', value: 30 },
        { id: 'ag-srv', kind: 'servo', x: 645, y: 270, label: 'GATE D9' },
        { id: 'ag-res', kind: 'resistor-220', x: 485, y: 125, label: '220Ω' },
        { id: 'ag-led', kind: 'led-green', x: 595, y: 125, label: 'OPEN D12' },
      ],
      wires: [
        { id: 'agw1', from: 'arduino:5V', to: 'comp:ag-us:vcc', color: '#ef4444' },
        { id: 'agw2', from: 'arduino:D7', to: 'comp:ag-us:trig', color: '#eab308' },
        { id: 'agw3', from: 'arduino:D6', to: 'comp:ag-us:echo', color: '#3b82f6' },
        { id: 'agw4', from: 'comp:ag-us:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'agw5', from: 'arduino:D9', to: 'comp:ag-srv:sig', color: '#f59e0b' },
        { id: 'agw6', from: 'arduino:5V', to: 'comp:ag-srv:vcc', color: '#ef4444' },
        { id: 'agw7', from: 'comp:ag-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'agw8', from: 'arduino:D12', to: 'comp:ag-res:a', color: '#22c55e' },
        { id: 'agw9', from: 'comp:ag-res:b', to: 'comp:ag-led:anode', color: '#22c55e' },
        { id: 'agw10', from: 'comp:ag-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
];

const TRACK_LABELS: Record<1 | 2 | 3 | 4 | 5, LocalizedText> = {
  1: { ar: 'المحطة 1 · رقمي', en: 'Station 1 · Digital', fr: 'Étape 1 · Numérique' },
  2: { ar: 'المحطة 2 · تناظري', en: 'Station 2 · Analog & PWM', fr: 'Étape 2 · Analogique' },
  3: { ar: 'المحطة 3 · مشغلات', en: 'Station 3 · Actuators', fr: 'Étape 3 · Actionneurs' },
  4: { ar: 'المحطة 4 · حساسات', en: 'Station 4 · Sensors', fr: 'Étape 4 · Capteurs' },
  5: { ar: 'المحطة 5 · التخرج', en: 'Station 5 · Capstone', fr: 'Étape 5 · Projets Finaux' },
};

export const ALL_READY_PROJECTS: ReadyProject[] = [
  ...LESSONS.map((lesson) => ({
    id: lesson.id,
    category: `track-${lesson.track}` as ProjectCategory,
    categoryLabel: TRACK_LABELS[lesson.track],
    title: lesson.title,
    description: lesson.summary,
    code: lesson.code,
    blocks: lesson.blocks,
    circuit: lesson.circuit,
    pinsUsed: lesson.pinoutNotes.map((p) => p.pin),
  })),
  ...BONUS_PROJECTS_RAW.map((p) => ({
    ...p,
    blocks: arduinoCppToBlocks(p.code),
  })),
];
