import type { LocalizedText } from '../i18n/translations';
import type { CircuitState, CodeBlock } from '../types/arduino';
import { arduinoCppToBlocks } from '../engine/blocklyBridge';

export type TemplateDifficulty = 'beginner' | 'easy';

export interface StarterTemplate {
  id: string;
  difficulty: TemplateDifficulty;
  estMinutes: number;
  accentColor: string;
  concept: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  pinsUsed: string[];
  code: string;
  blocks: CodeBlock[];
  circuit: CircuitState;
}

const RAW_STARTER_TEMPLATES: Array<Omit<StarterTemplate, 'blocks'>> = [
  {
    id: 'tpl-traffic-light',
    difficulty: 'beginner',
    estMinutes: 3,
    accentColor: '#ef4444',
    concept: {
      ar: 'المخارج الرقمية والتوقيت',
      en: 'Digital Output & Timing',
      fr: 'Sorties Numériques & Timing',
    },
    title: {
      ar: 'إشارة مرور LED (أحمر · أصفر · أخضر)',
      en: 'LED Traffic Light',
      fr: 'Feu Tricolore LED',
    },
    description: {
      ar: 'قالب أساسي جاهز بـ 3 مصابيح LED ومقاومات حماية 220Ω تحاكي دورة إشارة مرور حقيقية بتوقيت منظم.',
      en: 'Pre-wired 3-LED traffic signal (Red, Yellow, Green) with 220Ω protection resistors cycling through realistic signal phases.',
      fr: 'Feu tricolore précâblé (Rouge, Jaune, Vert) avec résistances 220Ω enchaînant les phases de circulation.',
    },
    pinsUsed: ['D12', 'D11', 'D10', 'GND'],
    code: `// Starter Template: LED Traffic Light
// Pins: Red=12, Yellow=11, Green=10

void setup() {
  pinMode(12, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(10, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // GO: Green light
  digitalWrite(10, HIGH);
  digitalWrite(11, LOW);
  digitalWrite(12, LOW);
  Serial.println("GREEN - GO");
  delay(1500);

  // CAUTION: Yellow light
  digitalWrite(10, LOW);
  digitalWrite(11, HIGH);
  Serial.println("YELLOW - WAIT");
  delay(700);

  // STOP: Red light
  digitalWrite(11, LOW);
  digitalWrite(12, HIGH);
  Serial.println("RED - STOP");
  delay(1500);
}`,
    circuit: {
      components: [
        { id: 'tl-r1', kind: 'resistor-220', x: 450, y: 110, label: '220Ω' },
        { id: 'tl-l1', kind: 'led-red', x: 555, y: 110, label: 'RED D12' },
        { id: 'tl-r2', kind: 'resistor-220', x: 450, y: 195, label: '220Ω' },
        { id: 'tl-l2', kind: 'led-yellow', x: 555, y: 195, label: 'YEL D11' },
        { id: 'tl-r3', kind: 'resistor-220', x: 450, y: 280, label: '220Ω' },
        { id: 'tl-l3', kind: 'led-green', x: 555, y: 280, label: 'GRN D10' },
      ],
      wires: [
        { id: 'tlw1', from: 'arduino:D12', to: 'comp:tl-r1:a', color: '#ef4444' },
        { id: 'tlw2', from: 'comp:tl-r1:b', to: 'comp:tl-l1:anode', color: '#ef4444' },
        { id: 'tlw3', from: 'comp:tl-l1:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tlw4', from: 'arduino:D11', to: 'comp:tl-r2:a', color: '#eab308' },
        { id: 'tlw5', from: 'comp:tl-r2:b', to: 'comp:tl-l2:anode', color: '#eab308' },
        { id: 'tlw6', from: 'comp:tl-l2:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tlw7', from: 'arduino:D10', to: 'comp:tl-r3:a', color: '#22c55e' },
        { id: 'tlw8', from: 'comp:tl-r3:b', to: 'comp:tl-l3:anode', color: '#22c55e' },
        { id: 'tlw9', from: 'comp:tl-l3:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'tpl-pot-servo',
    difficulty: 'beginner',
    estMinutes: 3,
    accentColor: '#2563eb',
    concept: {
      ar: 'قراءة تناظرية + تحكم سيرفو',
      en: 'Analog Mapping & Servo',
      fr: 'Lecture Analogique & Servo',
    },
    title: {
      ar: 'التحكم بسيرفو عبر المقاومة المتغيرة',
      en: 'Potentiometer Servo Control',
      fr: 'Contrôle Servo par Potentiomètre',
    },
    description: {
      ar: 'وصّل مقاومة متغيرة 10kΩ على المنفذ A0 لتحويل دوران المقبض فورياً إلى زاوية دقيقة بين 0° و 180° على محرك SG90.',
      en: 'Map a 10kΩ potentiometer on A0 directly to an SG90 micro servo on D9 (0° to 180°) with real-time Serial angle readout.',
      fr: 'Convertissez un potentiomètre 10kΩ sur A0 en angle précis (0° à 180°) pour un servomoteur SG90 sur D9.',
    },
    pinsUsed: ['A0', 'D9', '5V', 'GND'],
    code: `// Starter Template: Potentiometer Servo Control
#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  int potVal = analogRead(A0);
  int angle = map(potVal, 0, 1023, 0, 180);
  myServo.write(angle);
  Serial.println(angle);
  delay(80);
}`,
    circuit: {
      components: [
        { id: 'tps-pot', kind: 'potentiometer', x: 465, y: 245, label: 'DIAL A0', value: 512 },
        { id: 'tps-srv', kind: 'servo', x: 630, y: 170, label: 'SG90 D9' },
      ],
      wires: [
        { id: 'tpsw1', from: 'arduino:5V', to: 'comp:tps-pot:vcc', color: '#ef4444' },
        { id: 'tpsw2', from: 'arduino:A0', to: 'comp:tps-pot:sig', color: '#eab308' },
        { id: 'tpsw3', from: 'comp:tps-pot:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'tpsw4', from: 'arduino:5V', to: 'comp:tps-srv:vcc', color: '#ef4444' },
        { id: 'tpsw5', from: 'arduino:D9', to: 'comp:tps-srv:sig', color: '#3b82f6' },
        { id: 'tpsw6', from: 'comp:tps-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'tpl-button-led',
    difficulty: 'beginner',
    estMinutes: 2,
    accentColor: '#3b82f6',
    concept: {
      ar: 'المدخل الرقمي INPUT_PULLUP',
      en: 'Digital Input & Pull-Up',
      fr: 'Entrée Numérique Pull-Up',
    },
    title: {
      ar: 'مفتاح إضاءة بزر ضاغط',
      en: 'Pushbutton LED Switch',
      fr: 'Interrupteur LED à Bouton',
    },
    description: {
      ar: 'تعلّم قراءة الزر الضاغط على D2 باستخدام المقاومة الداخلية INPUT_PULLUP لتشغيل مصباح LED أزرق فورياً عند الضغط.',
      en: 'Read a tactile pushbutton on D2 using Arduino’s internal pull-up resistor to light a protected Blue LED on D13.',
      fr: 'Lisez un bouton-poussoir sur D2 avec INPUT_PULLUP pour allumer une LED bleue protégée sur D13.',
    },
    pinsUsed: ['D2', 'D13', 'GND'],
    code: `// Starter Template: Pushbutton LED Switch
// Hold the pushbutton while running to light the LED!

void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int pressed = digitalRead(2);
  if (pressed == LOW) {
    digitalWrite(13, HIGH);
    Serial.println("BUTTON PRESSED -> LED ON");
  } else {
    digitalWrite(13, LOW);
  }
  delay(80);
}`,
    circuit: {
      components: [
        { id: 'tbl-btn', kind: 'button', x: 465, y: 245, label: 'BTN D2', value: 0 },
        { id: 'tbl-res', kind: 'resistor-220', x: 465, y: 125, label: '220Ω' },
        { id: 'tbl-led', kind: 'led-blue', x: 600, y: 125, label: 'BLUE D13' },
      ],
      wires: [
        { id: 'tblw1', from: 'arduino:D2', to: 'comp:tbl-btn:a', color: '#eab308' },
        { id: 'tblw2', from: 'comp:tbl-btn:b', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tblw3', from: 'arduino:D13', to: 'comp:tbl-res:a', color: '#3b82f6' },
        { id: 'tblw4', from: 'comp:tbl-res:b', to: 'comp:tbl-led:anode', color: '#3b82f6' },
        { id: 'tblw5', from: 'comp:tbl-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'tpl-pwm-dimmer',
    difficulty: 'beginner',
    estMinutes: 3,
    accentColor: '#22c55e',
    concept: {
      ar: 'تعديل عرض النبضة PWM',
      en: 'PWM Brightness Dimming',
      fr: 'Gradateur de Luminosité PWM',
    },
    title: {
      ar: 'مُعتّم إضاءة LED متدرج (PWM)',
      en: 'Potentiometer PWM LED Dimmer',
      fr: 'Variateur LED PWM',
    },
    description: {
      ar: 'تحكم بسلاسة في سطوع مصباح LED أخضر على منفذ PWM (~D9) باستخدام المقاومة المتغيرة من 0 إلى 255.',
      en: 'Smoothly dim a Green LED on PWM pin ~D9 from 0% to 100% brightness using analogWrite() and a 10kΩ dial.',
      fr: 'Faites varier la luminosité d’une LED verte sur la broche PWM ~D9 de 0 à 255 avec un potentiomètre.',
    },
    pinsUsed: ['A0', '~D9', '5V', 'GND'],
    code: `// Starter Template: PWM LED Dimmer
void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  int brightness = map(raw, 0, 1023, 0, 255);
  analogWrite(9, brightness);
  Serial.println(brightness);
  delay(80);
}`,
    circuit: {
      components: [
        { id: 'tpd-pot', kind: 'potentiometer', x: 465, y: 260, label: 'DIMMER A0', value: 640 },
        { id: 'tpd-res', kind: 'resistor-220', x: 465, y: 125, label: '220Ω' },
        { id: 'tpd-led', kind: 'led-green', x: 600, y: 125, label: 'PWM ~D9' },
      ],
      wires: [
        { id: 'tpdw1', from: 'arduino:5V', to: 'comp:tpd-pot:vcc', color: '#ef4444' },
        { id: 'tpdw2', from: 'arduino:A0', to: 'comp:tpd-pot:sig', color: '#eab308' },
        { id: 'tpdw3', from: 'comp:tpd-pot:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'tpdw4', from: 'arduino:D9', to: 'comp:tpd-res:a', color: '#22c55e' },
        { id: 'tpdw5', from: 'comp:tpd-res:b', to: 'comp:tpd-led:anode', color: '#22c55e' },
        { id: 'tpdw6', from: 'comp:tpd-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'tpl-night-light',
    difficulty: 'easy',
    estMinutes: 4,
    accentColor: '#eab308',
    concept: {
      ar: 'حساس الضوء والعتبات الذكية',
      en: 'Light Sensing & Threshold',
      fr: 'Capteur de Lumière & Seuil',
    },
    title: {
      ar: 'مصباح ليلي أوتوماتيكي (LDR)',
      en: 'Smart LDR Auto Night Light',
      fr: 'Veilleuse Automatique LDR',
    },
    description: {
      ar: 'يقرأ حساس الضوء LDR شدة الإضاءة المحيطة، ويضيء المصباح تلقائياً عند حلول الظلام (أقل من 450).',
      en: 'Reads ambient light via an LDR photoresistor on A0 and automatically turns on a warm Yellow LED when it gets dark.',
      fr: 'Mesure la luminosité avec un capteur LDR sur A0 et allume automatiquement la LED jaune dans l’obscurité.',
    },
    pinsUsed: ['A0', 'D11', '5V', 'GND'],
    code: `// Starter Template: Smart LDR Night Light
// Slide the LDR value below 450 to simulate night!

void setup() {
  pinMode(11, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int lightLevel = analogRead(A0);
  Serial.println(lightLevel);
  if (lightLevel < 450) {
    digitalWrite(11, HIGH);
  } else {
    digitalWrite(11, LOW);
  }
  delay(150);
}`,
    circuit: {
      components: [
        { id: 'tnl-ldr', kind: 'ldr', x: 465, y: 260, label: 'LDR A0', value: 320 },
        { id: 'tnl-res', kind: 'resistor-220', x: 465, y: 125, label: '220Ω' },
        { id: 'tnl-led', kind: 'led-yellow', x: 600, y: 125, label: 'LAMP D11' },
      ],
      wires: [
        { id: 'tnlw1', from: 'arduino:5V', to: 'comp:tnl-ldr:vcc', color: '#ef4444' },
        { id: 'tnlw2', from: 'arduino:A0', to: 'comp:tnl-ldr:sig', color: '#eab308' },
        { id: 'tnlw3', from: 'comp:tnl-ldr:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'tnlw4', from: 'arduino:D11', to: 'comp:tnl-res:a', color: '#f97316' },
        { id: 'tnlw5', from: 'comp:tnl-res:b', to: 'comp:tnl-led:anode', color: '#f97316' },
        { id: 'tnlw6', from: 'comp:tnl-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
  {
    id: 'tpl-doorbell-buzzer',
    difficulty: 'easy',
    estMinutes: 4,
    accentColor: '#f97316',
    concept: {
      ar: 'نغمات الجرس الصوتي Piezo',
      en: 'Interactive Audio & Buzzer',
      fr: 'Sonnerie Audio Piezo',
    },
    title: {
      ar: 'جرس باب تفاعلي بنغمتين',
      en: 'Two-Tone Interactive Doorbell',
      fr: 'Sonnette Interactive Bi-Ton',
    },
    description: {
      ar: 'اضغط على الزر الضاغط (D2) لإصدار رنين جرس باب ثنائي النغمة عبر جرس Piezo (D8) مع وميض مؤشر التنبيه.',
      en: 'Press the pushbutton on D2 to ring a pleasant ding-dong chime on the Piezo Buzzer (D8) with a flashing alert LED.',
      fr: 'Appuyez sur le bouton D2 pour déclencher un carillon bi-ton sur le buzzer Piezo (D8) avec témoin LED.',
    },
    pinsUsed: ['D2', 'D8', 'D12', 'GND'],
    code: `// Starter Template: Interactive Two-Tone Doorbell
void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(8, OUTPUT);
  pinMode(12, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(12, HIGH);
    Serial.println("DING-DONG!");
    tone(8, 659, 220);
    delay(240);
    tone(8, 523, 320);
    delay(350);
    noTone(8);
    digitalWrite(12, LOW);
  }
  delay(80);
}`,
    circuit: {
      components: [
        { id: 'tdb-btn', kind: 'button', x: 450, y: 260, label: 'RING D2', value: 0 },
        { id: 'tdb-buz', kind: 'buzzer', x: 615, y: 245, label: 'PIEZO D8' },
        { id: 'tdb-res', kind: 'resistor-220', x: 450, y: 125, label: '220Ω' },
        { id: 'tdb-led', kind: 'led-red', x: 585, y: 125, label: 'ALERT D12' },
      ],
      wires: [
        { id: 'tdbw1', from: 'arduino:D2', to: 'comp:tdb-btn:a', color: '#eab308' },
        { id: 'tdbw2', from: 'comp:tdb-btn:b', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tdbw3', from: 'arduino:D8', to: 'comp:tdb-buz:pos', color: '#f97316' },
        { id: 'tdbw4', from: 'comp:tdb-buz:neg', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tdbw5', from: 'arduino:D12', to: 'comp:tdb-res:a', color: '#ef4444' },
        { id: 'tdbw6', from: 'comp:tdb-res:b', to: 'comp:tdb-led:anode', color: '#ef4444' },
        { id: 'tdbw7', from: 'comp:tdb-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = RAW_STARTER_TEMPLATES.map((tpl) => ({
  ...tpl,
  blocks: arduinoCppToBlocks(tpl.code),
}));
