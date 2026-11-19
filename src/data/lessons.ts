import type { LessonData } from '../types/arduino';
import { arduinoCppToBlocks } from '../engine/blocklyBridge';

function makeLesson(
  partial: Omit<LessonData, 'blocks'>,
): LessonData {
  return {
    ...partial,
    blocks: arduinoCppToBlocks(partial.code),
  };
}

export const TRACK_META = [
  {
    id: 1 as const,
    badgeId: 'station_1_digital',
    bonusXp: 100,
    accent: '#00878F',
    title: {
      ar: 'المحطة 1: أساسيات الكهرباء والمنافذ الرقمية',
      en: 'Station 1: Electricity & Digital I/O',
      fr: 'Étape 1 : Électricité & E/S Numériques',
    },
    subtitle: {
      ar: 'قانون أوم، المنفذ التسلسلي، إشارات HIGH/LOW، والأزرار الضاغطة',
      en: 'Ohm’s law, Serial Monitor, HIGH/LOW logic, and digital buttons',
      fr: 'Loi d’Ohm, moniteur série, logique HIGH/LOW et boutons',
    },
    badgeName: {
      ar: 'شارة مستكشف الرقميات',
      en: 'Digital Explorer Badge',
      fr: 'Badge Explorateur Numérique',
    },
  },
  {
    id: 2 as const,
    badgeId: 'station_2_analog',
    bonusXp: 100,
    accent: '#f59e0b',
    title: {
      ar: 'المحطة 2: الإشارات التناظرية وتعديل النبضة (PWM)',
      en: 'Station 2: Analog Signals & PWM',
      fr: 'Étape 2 : Analogique & Modulation PWM',
    },
    subtitle: {
      ar: 'تدرج الإضاءة، المقاومة المتغيرة، التحويل map()، وحساس الضوء LDR',
      en: 'LED dimming, potentiometers, map() scaling, and LDR light sensing',
      fr: 'Variation LED, potentiomètres, map() et capteur LDR',
    },
    badgeName: {
      ar: 'شارة مهندس الموجات',
      en: 'Wave Engineer Badge',
      fr: 'Badge Ingénieur Ondes',
    },
  },
  {
    id: 3 as const,
    badgeId: 'station_3_actuators',
    bonusXp: 100,
    accent: '#6366f1',
    title: {
      ar: 'المحطة 3: المحركات والصوت والتحكم الميكانيكي',
      en: 'Station 3: Actuators, Motion & Sound',
      fr: 'Étape 3 : Actionneurs, Mouvement & Son',
    },
    subtitle: {
      ar: 'نغمات الجرس Piezo، محرك السيرفو SG90، والتحكم التفاعلي بالحركة',
      en: 'Piezo buzzer melodies, SG90 servo sweeps, and interactive motion',
      fr: 'Mélodies piezo, servomoteur SG90 et contrôle de mouvement',
    },
    badgeName: {
      ar: 'شارة سيد الحركة والصوت',
      en: 'Motion & Sound Master',
      fr: 'Maître Mouvement & Son',
    },
  },
  {
    id: 4 as const,
    badgeId: 'station_4_sensors',
    bonusXp: 100,
    accent: '#0ea5e9',
    title: {
      ar: 'المحطة 4: الحساسات الذكية والقياس البيئي',
      en: 'Station 4: Smart Sensors & Telemetry',
      fr: 'Étape 4 : Capteurs Intelligents & Télémétrie',
    },
    subtitle: {
      ar: 'الموجات فوق الصوتية HC-SR04، قياس الحرارة TMP36، ومحطات الرصد',
      en: 'Ultrasonic radar, TMP36 thermal sensing, and live environmental logging',
      fr: 'Radar ultrason, capteur thermique TMP36 et station météo',
    },
    badgeName: {
      ar: 'شارة خبير الحساسات',
      en: 'Sensor Specialist Badge',
      fr: 'Badge Spécialiste Capteurs',
    },
  },
  {
    id: 5 as const,
    badgeId: 'station_5_capstone',
    bonusXp: 150,
    accent: '#10b981',
    title: {
      ar: 'المحطة 5: مشاريع التخرج والأنظمة المدمجة',
      en: 'Station 5: Embedded Capstone Mastery',
      fr: 'Étape 5 : Projets Finaux Embarqués',
    },
    subtitle: {
      ar: 'دمج الحساسات والمحركات لبناء الغرفة الذكية ونظام الأمن المتكامل',
      en: 'Integrate sensors and actuators into Smart Room & Security systems',
      fr: 'Intégrez capteurs et actionneurs dans des systèmes complets',
    },
    badgeName: {
      ar: 'شارة خريج الأنظمة المدمجة',
      en: 'Embedded Graduate Badge',
      fr: 'Badge Diplômé Embarqué',
    },
  },
];

export const LESSONS: LessonData[] = [
  // STATION 1 — FUNDAMENTALS & DIGITAL I/O
  makeLesson({
    id: 'lesson-0',
    number: 0,
    track: 1,
    xp: 50,
    title: {
      ar: 'مدخل للكهرباء، قانون أوم، والمراقب التسلسلي',
      en: 'Electricity Basics, Ohm’s Law & Serial Monitor',
      fr: 'Bases Électriques, Loi d’Ohm & Moniteur Série',
    },
    summary: {
      ar: 'ابدأ من الصفر: افهم الجهد (5V)، الأرضي (GND)، دور المقاومة، وتواصل مع الأردوينو عبر Serial Monitor.',
      en: 'Start from scratch: understand 5V, GND, resistor protection, and print live diagnostics to the Serial Monitor.',
      fr: 'Démarrez de zéro : comprenez 5V, GND, le rôle des résistances et communiquez via le moniteur série.',
    },
    theory: {
      ar: 'تعمل لوحة Arduino Uno بجهد 5 فولت. لتشغيل أي قطعة إلكترونية يجب توفر مسار مغلق من الموجب (5V أو منفذ رقمي) إلى السالب الأرضي (GND). وبحسب قانون أوم (V = I × R) نضع مقاومة 220Ω لحماية الـ LED من التيار الزائد. نستخدم Serial.begin(9600) لفتح قناة تواصل مع الحاسوب.',
      en: 'Arduino Uno operates at 5V logic. Every circuit needs a closed loop returning to Ground (GND). By Ohm’s Law (V = I × R), a 220Ω resistor safely limits current through an LED. Serial.begin(9600) opens live text telemetry to your computer.',
      fr: 'L’Arduino Uno fonctionne en 5V. Tout circuit nécessite un retour à la masse (GND). Selon la loi d’Ohm (V = I × R), une résistance 220Ω protège la LED. Serial.begin(9600) ouvre la console série.',
    },
    keyFunctions: ['Serial.begin(9600)', 'Serial.println()', '5V / GND', 'V = I × R'],
    pinoutNotes: [
      { pin: '5V / GND', role: { ar: 'مصدر التغذية الرئيسي والمرجع الأرضي للدائرة', en: 'Regulated 5V power rail and Ground reference', fr: 'Alimentation 5V et masse GND' } },
      { pin: 'D13', role: { ar: 'منفذ رقمي متصل بمصباح الاختبار L على اللوحة', en: 'Digital pin linked to built-in board LED L', fr: 'Broche numérique liée à la LED interne L' } },
    ],
    steps: [
      { ar: 'افتح المحاكي وشاهد نافذة المراقب التسلسلي (Serial Monitor) في الأسفل.', en: 'Open the Simulator and inspect the Serial Monitor panel below.', fr: 'Ouvrez le simulateur et observez le moniteur série.' },
      { ar: 'اضغط تشغيل المحاكاة لتقرأ رسالة الترحيب وحالة المنفذ كل ثانية.', en: 'Start Simulation to see live status messages printed every second.', fr: 'Lancez la simulation pour lire les messages toutes les secondes.' },
    ],
    code: `void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  Serial.println("Welcome to ArdunoLab Roadmap!");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("Circuit Power: 5V ACTIVE");
  delay(800);
  digitalWrite(13, LOW);
  Serial.println("Circuit Power: 0V IDLE");
  delay(800);
}`,
    circuit: {
      components: [
        { id: 'r0', kind: 'resistor-220', x: 515, y: 150, label: '220Ω' },
        { id: 'led0', kind: 'led-green', x: 635, y: 150, label: 'POWER OK' },
      ],
      wires: [
        { id: 'w0-1', from: 'arduino:D13', to: 'comp:r0:a', color: '#22c55e' },
        { id: 'w0-2', from: 'comp:r0:b', to: 'comp:led0:anode', color: '#22c55e' },
        { id: 'w0-3', from: 'comp:led0:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-1',
    number: 1,
    track: 1,
    xp: 50,
    title: {
      ar: 'وميض الـ LED وفهم هيكل الكود',
      en: 'Blink LED & Sketch Structure',
      fr: 'Clignotement LED & Structure du Code',
    },
    summary: {
      ar: 'تعلّم كيف تعمل دالتا setup() و loop() لتشغيل أول مصباح LED مع مقاومة حماية 220Ω.',
      en: 'Master setup() and loop() to blink your first external LED safely with a 220Ω resistor.',
      fr: 'Maîtrisez setup() et loop() pour faire clignoter votre première LED avec une résistance 220Ω.',
    },
    theory: {
      ar: 'كل برنامج أردوينو يتكوّن من دالتين رئيسيتين: setup() التي تُنفّذ مرة واحدة عند التشغيل لتهيئة المنافذ عبر pinMode()، ودالة loop() التي تتكرر بلا توقف. نستخدم مقاومة 220Ω على التوالي مع الـ LED لتحديد التيار وحمايته من الاحتراق.',
      en: 'Every Arduino sketch has two core functions: setup() runs once on boot to configure pin directions via pinMode(), and loop() repeats forever. Always place a 220Ω resistor in series with an LED to limit current safely.',
      fr: 'Chaque programme Arduino comporte deux fonctions clés : setup() exécutée une fois au démarrage pour configurer les broches avec pinMode(), et loop() qui se répète en continu. Une résistance 220Ω protège la LED.',
    },
    keyFunctions: ['pinMode(13, OUTPUT)', 'digitalWrite(13, HIGH)', 'delay(500)'],
    pinoutNotes: [
      { pin: 'D13', role: { ar: 'مخرج رقمي عبر مقاومة 220Ω إلى موجب LED', en: 'Digital output via 220Ω resistor to LED Anode (+)', fr: 'Sortie numérique via résistance 220Ω vers Anode (+)' } },
      { pin: 'GND', role: { ar: 'طرف السالب (-) للمصباح لإغلاق الدائرة', en: 'LED Cathode (-) return to Ground', fr: 'Cathode (-) vers la masse GND' } },
    ],
    steps: [
      { ar: 'وصّل المنفذ D13 بأحد طرفي المقاومة 220Ω.', en: 'Connect Pin D13 to terminal 1 of the 220Ω resistor.', fr: 'Reliez la broche D13 à la résistance 220Ω.' },
      { ar: 'وصّل الطرف الثاني للمقاومة بموجب (+) المصباح الأحمر.', en: 'Connect resistor terminal 2 to the Red LED Anode (+).', fr: 'Reliez l’autre côté à l’anode (+) de la LED rouge.' },
      { ar: 'أغلق الدائرة بتوصيل سالب (-) المصباح بمنفذ GND واضغط تشغيل.', en: 'Wire LED Cathode (-) to GND and click Start Simulation.', fr: 'Reliez la cathode (-) à GND et démarrez la simulation.' },
    ],
    code: `void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(500);
}`,
    circuit: {
      components: [
        { id: 'res-1', kind: 'resistor-220', x: 520, y: 150, label: '220Ω' },
        { id: 'led-1', kind: 'led-red', x: 640, y: 150, label: 'LED D13' },
      ],
      wires: [
        { id: 'w1', from: 'arduino:D13', to: 'comp:res-1:a', color: '#ef4444' },
        { id: 'w2', from: 'comp:res-1:b', to: 'comp:led-1:anode', color: '#f59e0b' },
        { id: 'w3', from: 'comp:led-1:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-2',
    number: 2,
    track: 1,
    xp: 75,
    title: {
      ar: 'نظام إشارات المرور المتتابع',
      en: 'Traffic Light State Machine',
      fr: 'Système de Feux de Circulation',
    },
    summary: {
      ar: 'تحكّم بثلاثة مصابيح (أحمر، أصفر، أخضر) بتسلسل زمني منضبط كما في الشوارع الحقيقية.',
      en: 'Coordinate three colored LEDs (Red, Yellow, Green) with timed transitions.',
      fr: 'Coordonnez trois LED (Rouge, Jaune, Verte) avec une séquence temporelle précise.',
    },
    theory: {
      ar: 'يتيح الأردوينو التحكم المتزامن بعدة مخارج رقمية. نخصص لكل مصباح منفذاً مستقلاً (D11 للأحمر، D10 للأصفر، D9 للأخضر) مع مقاومة حماية لكل منها وأرضي مشترك GND.',
      en: 'Arduino can orchestrate multiple digital outputs simultaneously. Each LED gets its own pin (D11 Red, D10 Yellow, D9 Green) and protective resistor sharing a common GND bus.',
      fr: 'Arduino pilote plusieurs sorties numériques à la fois. Chaque LED dispose de sa broche (D11, D10, D9) et de sa résistance sur une masse GND commune.',
    },
    keyFunctions: ['pinMode(11, OUTPUT)', 'digitalWrite(10, HIGH)', 'delay(1200)'],
    pinoutNotes: [
      { pin: 'D11', role: { ar: 'مصباح التوقف الأحمر', en: 'Red Stop LED', fr: 'LED Rouge (Arrêt)' } },
      { pin: 'D10', role: { ar: 'مصباح الاستعداد الأصفر', en: 'Yellow Caution LED', fr: 'LED Jaune (Attention)' } },
      { pin: 'D9', role: { ar: 'مصباح الانطلاق الأخضر', en: 'Green Go LED', fr: 'LED Verte (Passage)' } },
    ],
    steps: [
      { ar: 'هيّئ المنافذ 11 و 10 و 9 كمخارج OUTPUT داخل setup().', en: 'Configure pins 11, 10, and 9 as OUTPUT in setup().', fr: 'Configurez les broches 11, 10 et 9 en OUTPUT.' },
      { ar: 'شغّل الأخضر أولاً ثم الأصفر ثم الأحمر بالتتابع.', en: 'Cycle Green → Yellow → Red in sequence inside loop().', fr: 'Alternez Vert → Jaune → Rouge dans loop().' },
    ],
    code: `void setup() {
  pinMode(11, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(9, HIGH);
  digitalWrite(10, LOW);
  digitalWrite(11, LOW);
  Serial.println("GO - GREEN");
  delay(1200);

  digitalWrite(9, LOW);
  digitalWrite(10, HIGH);
  Serial.println("WAIT - YELLOW");
  delay(600);

  digitalWrite(10, LOW);
  digitalWrite(11, HIGH);
  Serial.println("STOP - RED");
  delay(1200);
}`,
    circuit: {
      components: [
        { id: 'r-red', kind: 'resistor-220', x: 470, y: 120, label: '220Ω' },
        { id: 'l-red', kind: 'led-red', x: 560, y: 120, label: 'RED' },
        { id: 'r-yel', kind: 'resistor-220', x: 470, y: 215, label: '220Ω' },
        { id: 'l-yel', kind: 'led-yellow', x: 560, y: 215, label: 'YEL' },
        { id: 'r-grn', kind: 'resistor-220', x: 470, y: 310, label: '220Ω' },
        { id: 'l-grn', kind: 'led-green', x: 560, y: 310, label: 'GRN' },
      ],
      wires: [
        { id: 'tw1', from: 'arduino:D11', to: 'comp:r-red:a', color: '#ef4444' },
        { id: 'tw2', from: 'comp:r-red:b', to: 'comp:l-red:anode', color: '#ef4444' },
        { id: 'tw3', from: 'comp:l-red:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tw4', from: 'arduino:D10', to: 'comp:r-yel:a', color: '#eab308' },
        { id: 'tw5', from: 'comp:r-yel:b', to: 'comp:l-yel:anode', color: '#eab308' },
        { id: 'tw6', from: 'comp:l-yel:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'tw7', from: 'arduino:D9', to: 'comp:r-grn:a', color: '#22c55e' },
        { id: 'tw8', from: 'comp:r-grn:b', to: 'comp:l-grn:anode', color: '#22c55e' },
        { id: 'tw9', from: 'comp:l-grn:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-3',
    number: 3,
    track: 1,
    xp: 75,
    title: {
      ar: 'الزر الضاغط ومقاومة السحب INPUT_PULLUP',
      en: 'Pushbutton & Internal INPUT_PULLUP',
      fr: 'Bouton Poussoir & Résistance INPUT_PULLUP',
    },
    summary: {
      ar: 'اقرأ حالة زر ضاغط دون تشويش كهربائي باستخدام مقاومة السحب الداخلية للمعالج.',
      en: 'Read tactile pushbutton presses cleanly using the ATmega328P internal pull-up resistor.',
      fr: 'Lisez l’état d’un bouton poussoir sans parasites grâce à INPUT_PULLUP.',
    },
    theory: {
      ar: 'عند تفعيل INPUT_PULLUP يربط المعالج المنفذ داخلياً بجهد 5V عبر مقاومة 20kΩ، فتكون القراءة HIGH افتراضياً، وتصبح LOW لحظة الضغط على الزر الموصول بـ GND.',
      en: 'Enabling INPUT_PULLUP activates an internal ~20kΩ pull-up resistor to 5V. The pin reads HIGH while unpressed and drops cleanly to LOW when the button connects it to GND.',
      fr: 'INPUT_PULLUP active une résistance interne vers 5V : la broche lit HIGH au repos et passe à LOW lorsque le bouton relie la broche à GND.',
    },
    keyFunctions: ['pinMode(2, INPUT_PULLUP)', 'digitalRead(2)', 'if (btnState == 0)'],
    pinoutNotes: [
      { pin: 'D2', role: { ar: 'مدخل الزر الضاغط (INPUT_PULLUP)', en: 'Button signal input (INPUT_PULLUP)', fr: 'Entrée bouton (INPUT_PULLUP)' } },
      { pin: 'D13', role: { ar: 'مصباح الاستجابة الأزرق', en: 'Blue indicator LED', fr: 'LED témoin bleue' } },
    ],
    steps: [
      { ar: 'اضغط تشغيل المحاكاة ثم انقر مع الاستمرار على الزر الضاغط على اللوحة.', en: 'Start simulation, then press and hold the Pushbutton on the breadboard.', fr: 'Lancez la simulation puis maintenez le bouton poussoir enfoncé.' },
      { ar: 'لاحظ إضاءة المصباح الأزرق وطباعة الحالة في المراقب التسلسلي.', en: 'Watch the Blue LED ignite and observe live state updates in Serial Monitor.', fr: 'Observez la LED bleue s’allumer et le moniteur série se mettre à jour.' },
    ],
    code: `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int btnState = digitalRead(2);
  if (btnState == 0) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
  delay(80);
}`,
    circuit: {
      components: [
        { id: 'btn-1', kind: 'button', x: 500, y: 260, label: 'BTN D2', value: 0 },
        { id: 'res-b', kind: 'resistor-220', x: 520, y: 135, label: '220Ω' },
        { id: 'led-b', kind: 'led-blue', x: 640, y: 135, label: 'LED D13' },
      ],
      wires: [
        { id: 'bw1', from: 'arduino:D2', to: 'comp:btn-1:a', color: '#3b82f6' },
        { id: 'bw2', from: 'comp:btn-1:b', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'bw3', from: 'arduino:D13', to: 'comp:res-b:a', color: '#06b6d4' },
        { id: 'bw4', from: 'comp:res-b:b', to: 'comp:led-b:anode', color: '#06b6d4' },
        { id: 'bw5', from: 'comp:led-b:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  // TRACK 2
  makeLesson({
    id: 'lesson-4',
    number: 4,
    track: 2,
    xp: 80,
    title: {
      ar: 'تدريج الإضاءة بإشارة PWM (LED Fading)',
      en: 'LED Breathing Fade with PWM',
      fr: 'Variation d’Intensité LED par PWM',
    },
    summary: {
      ar: 'استخدم دالة analogWrite() على المنفذ D9 (~) لتغيير سطوع المصباح بسلاسة بين 0 و 255.',
      en: 'Use analogWrite() on PWM Pin D9 (~) to smoothly ramp brightness between 0 and 255.',
      fr: 'Utilisez analogWrite() sur la broche PWM D9 (~) pour faire varier la luminosité de 0 à 255.',
    },
    theory: {
      ar: 'المنافذ المعلّمة بالرمز (~) مثل D9 تدعم تقنية تعديل عرض النبضة (PWM). بتغيير نسبة التشغيل بين 0 (إطفاء) و 255 (سطوع كامل)، ترى العين البشرية تدرجاً ناعماً في الإضاءة.',
      en: 'Pins marked (~) like D9 generate Pulse Width Modulation (PWM). Varying the duty cycle from 0 (0% power) to 255 (100% power) creates smooth perceived dimming.',
      fr: 'Les broches marquées (~) comme D9 génèrent un signal PWM. Faire varier le rapport cyclique de 0 à 255 module la luminosité.',
    },
    keyFunctions: ['analogWrite(9, val)', 'for (int i = 0; i <= 255; i += 25)', 'Serial.println(val)'],
    pinoutNotes: [
      { pin: 'D9 (~)', role: { ar: 'مخرج PWM للتحكم في سطوع المصباح', en: 'Hardware PWM output for dimming', fr: 'Sortie PWM pour gradation' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وراقب تدرج توهج المصباح الأزرق.', en: 'Start simulation and watch the Blue LED smoothly breathe.', fr: 'Démarrez et observez la LED bleue respirer en douceur.' },
      { ar: 'افتح تبويب الراسم البياني (Serial Plotter) لرؤية موجة PWM المثلثية.', en: 'Switch to Serial Plotter to visualize the live PWM triangle wave.', fr: 'Ouvrez le Traceur Série pour voir la courbe PWM en direct.' },
    ],
    code: `void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  for (int b = 0; b <= 255; b += 25) {
    analogWrite(9, b);
    Serial.println(b);
    delay(90);
  }
  for (int b = 255; b >= 0; b -= 25) {
    analogWrite(9, b);
    Serial.println(b);
    delay(90);
  }
}`,
    circuit: {
      components: [
        { id: 'res-pwm', kind: 'resistor-220', x: 510, y: 165, label: '220Ω' },
        { id: 'led-pwm', kind: 'led-blue', x: 635, y: 165, label: 'PWM D9' },
      ],
      wires: [
        { id: 'pw1', from: 'arduino:D9', to: 'comp:res-pwm:a', color: '#3b82f6' },
        { id: 'pw2', from: 'comp:res-pwm:b', to: 'comp:led-pwm:anode', color: '#3b82f6' },
        { id: 'pw3', from: 'comp:led-pwm:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-5',
    number: 5,
    track: 2,
    xp: 90,
    title: {
      ar: 'المقاومة المتغيرة ودالة التحويل map()',
      en: 'Potentiometer Dimmer & map()',
      fr: 'Potentiomètre & Fonction map()',
    },
    summary: {
      ar: 'اقرأ الجهد المتغير عبر A0 (من 0 إلى 1023) وحوّله بدالة map() للتحكم الفوري في سطوع الـ LED.',
      en: 'Read analog voltage on A0 (0–1023) and scale it with map() to dim an LED interactively.',
      fr: 'Lisez la tension analogique sur A0 (0–1023) et convertissez-la avec map() pour varier une LED.',
    },
    theory: {
      ar: 'يعطي المحول التناظري ADC قراءة بين 0 و 1023، بينما يحتاج analogWrite() قيماً بين 0 و 255. دالة map(val, 0, 1023, 0, 255) تقوم بهذا التحويل الرياضي تلقائياً.',
      en: 'Arduino’s 10-bit ADC outputs 0–1023 while 8-bit PWM expects 0–255. map(val, 0, 1023, 0, 255) linearly scales the sensor reading to exact LED brightness.',
      fr: 'Le CAN 10 bits donne 0–1023 tandis que le PWM 8 bits attend 0–255. La fonction map() assure cette conversion linéaire.',
    },
    keyFunctions: ['analogRead(A0)', 'map(sensorVal, 0, 1023, 0, 255)', 'analogWrite(9, pwmVal)'],
    pinoutNotes: [
      { pin: 'A0', role: { ar: 'طرف الإشارة الأوسط للمقاومة المتغيرة', en: 'Potentiometer wiper signal', fr: 'Curseur du potentiomètre' } },
      { pin: 'D9 (~)', role: { ar: 'مخرج PWM إلى المصباح الأخضر', en: 'PWM output driving Green LED', fr: 'Sortie PWM vers LED verte' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وحرّك شريط المقاومة المتغيرة (Potentiometer) على اللوحة.', en: 'Start simulation and drag the Potentiometer dial slider on the breadboard.', fr: 'Lancez la simulation et glissez le curseur du potentiomètre.' },
      { ar: 'تابع تغير سطوع المصباح الأخضر والمنحنى المباشر في الراسم البياني.', en: 'Observe live LED dimming and real-time curves in the Serial Plotter.', fr: 'Observez la luminosité et les courbes dans le Traceur Série.' },
    ],
    code: `void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int sensorVal = analogRead(A0);
  int pwmVal = map(sensorVal, 0, 1023, 0, 255);
  analogWrite(9, pwmVal);
  Serial.println(pwmVal);
  delay(120);
}`,
    circuit: {
      components: [
        { id: 'pot-1', kind: 'potentiometer', x: 500, y: 280, label: 'POT 10kΩ', value: 620 },
        { id: 'res-p', kind: 'resistor-220', x: 520, y: 130, label: '220Ω' },
        { id: 'led-p', kind: 'led-green', x: 645, y: 130, label: 'DIM LED' },
      ],
      wires: [
        { id: 'potw1', from: 'arduino:5V', to: 'comp:pot-1:vcc', color: '#ef4444' },
        { id: 'potw2', from: 'arduino:A0', to: 'comp:pot-1:sig', color: '#eab308' },
        { id: 'potw3', from: 'comp:pot-1:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'potw4', from: 'arduino:D9', to: 'comp:res-p:a', color: '#22c55e' },
        { id: 'potw5', from: 'comp:res-p:b', to: 'comp:led-p:anode', color: '#22c55e' },
        { id: 'potw6', from: 'comp:led-p:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-6',
    number: 6,
    track: 2,
    xp: 95,
    title: {
      ar: 'إنارة الشوارع الذكية بحساس الضوء (LDR)',
      en: 'Smart Night Light with LDR Photoresistor',
      fr: 'Éclairage Intelligent avec Capteur LDR',
    },
    summary: {
      ar: 'اجعل المصباح يضيء تلقائياً عندما يحلّ الظلام عبر مقارنة قراءة حساس الضوء بعتبة ذكية.',
      en: 'Automatically illuminate a street lamp when ambient light drops below a threshold.',
      fr: 'Allumez automatiquement une lampe dès que la luminosité ambiante passe sous un seuil.',
    },
    theory: {
      ar: 'تتغير مقاومة حساس LDR بحسب شدة الإضاءة المحيطة. عند توصيله كمجزئ جهد على A1 وقراءة قيمته بـ analogRead()، نقارن القراءة بعتبة (مثلاً 450) لتشغيل الإضاءة تلقائياً في الظلام.',
      en: 'An LDR photoresistor changes resistance with ambient light. Wired as a voltage divider into A1, an if/else threshold activates the night LED automatically at dusk.',
      fr: 'Une photorésistance LDR fait varier sa résistance selon la lumière. Une condition if/else sur A1 allume la LED automatiquement dans l’obscurité.',
    },
    keyFunctions: ['analogRead(A1)', 'if (lightLevel < 450)', 'digitalWrite(12, HIGH)'],
    pinoutNotes: [
      { pin: 'A1', role: { ar: 'قراءة شدة الإضاءة من حساس LDR', en: 'Ambient light reading from LDR', fr: 'Mesure de lumière du capteur LDR' } },
      { pin: 'D12', role: { ar: 'مصباح الإضاءة الليلية الأصفر', en: 'Yellow street-lamp LED', fr: 'LED jaune d’éclairage nocturne' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة ثم اخفض شريط الإضاءة على حساس LDR إلى أقل من 450.', en: 'Start simulation and slide the LDR light level below 450.', fr: 'Démarrez et baissez le niveau lumineux du LDR sous 450.' },
      { ar: 'تحقق من إضاءة المصباح تلقائياً وانطفائه عند عودة الضوء.', en: 'Confirm the yellow lamp switches ON in darkness and OFF in bright light.', fr: 'Vérifiez que la LED s’allume dans le noir et s’éteint au jour.' },
    ],
    code: `void setup() {
  pinMode(12, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int lightLevel = analogRead(A1);
  Serial.println(lightLevel);
  if (lightLevel < 450) {
    digitalWrite(12, HIGH);
  } else {
    digitalWrite(12, LOW);
  }
  delay(150);
}`,
    circuit: {
      components: [
        { id: 'ldr-1', kind: 'ldr', x: 500, y: 275, label: 'LDR', value: 320 },
        { id: 'res-ldr', kind: 'resistor-220', x: 520, y: 130, label: '220Ω' },
        { id: 'led-ldr', kind: 'led-yellow', x: 645, y: 130, label: 'LAMP' },
      ],
      wires: [
        { id: 'lw1', from: 'arduino:5V', to: 'comp:ldr-1:vcc', color: '#ef4444' },
        { id: 'lw2', from: 'arduino:A1', to: 'comp:ldr-1:sig', color: '#eab308' },
        { id: 'lw3', from: 'comp:ldr-1:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'lw4', from: 'arduino:D12', to: 'comp:res-ldr:a', color: '#f59e0b' },
        { id: 'lw5', from: 'comp:res-ldr:b', to: 'comp:led-ldr:anode', color: '#f59e0b' },
        { id: 'lw6', from: 'comp:led-ldr:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  // TRACK 3
  makeLesson({
    id: 'lesson-7',
    number: 7,
    track: 3,
    xp: 100,
    title: {
      ar: 'عزف النغمات والإنذار بالجرس Piezo Buzzer',
      en: 'Piezo Buzzer Melodies & tone()',
      fr: 'Mélodies Buzzer Piezo & tone()',
    },
    summary: {
      ar: 'ولّد ترددات موسيقية ونغمات إنذار حقيقية باستخدام دالتي tone() و noTone().',
      en: 'Synthesize musical frequencies and security alerts using tone() and noTone().',
      fr: 'Générez des fréquences musicales et alarmes sonores avec tone() et noTone().',
    },
    theory: {
      ar: 'تولّد دالة tone(pin, frequency, duration) موجة مربعة بالتردد المطلوب بالهرتز (Hz) لتحريك الغشاء الكهرضغطي داخل الـ Buzzer وإصدار صوت مسموع.',
      en: 'tone(pin, frequency, duration) generates a square wave at the chosen pitch in Hertz (Hz), vibrating the piezo disc to emit crisp musical notes.',
      fr: 'tone(pin, freq, dur) génère une onde carrée en Hertz faisant vibrer la pastille piézoélectrique.',
    },
    keyFunctions: ['tone(8, 523, 220)', 'tone(8, 659, 220)', 'noTone(8)'],
    pinoutNotes: [
      { pin: 'D8', role: { ar: 'الطرف الموجب (+) للجرس الصوتي', en: 'Piezo Buzzer positive (+) signal', fr: 'Signal positif (+) du buzzer' } },
      { pin: 'GND', role: { ar: 'الطرف السالب (-) للجرس', en: 'Piezo negative (-) return', fr: 'Retour négatif (-) GND' } },
    ],
    steps: [
      { ar: 'تأكد من تفعيل الصوت في الشريط العلوي ثم اضغط تشغيل المحاكاة.', en: 'Ensure audio is unmuted in the top bar and click Start Simulation.', fr: 'Assurez-vous que le son est activé puis lancez la simulation.' },
      { ar: 'استمع لتتابع النغمات الموسيقية (C5 - E5 - G5 - C6) مع نبض الموجات الصوتية.', en: 'Listen to the synthesized C-major arpeggio and watch the acoustic rings pulse.', fr: 'Écoutez l’arpège synthétisé et observez les ondes sonores.' },
    ],
    code: `void setup() {
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  tone(8, 523, 220);
  Serial.println(523);
  delay(300);
  tone(8, 659, 220);
  Serial.println(659);
  delay(300);
  tone(8, 784, 220);
  Serial.println(784);
  delay(300);
  tone(8, 1046, 300);
  Serial.println(1046);
  delay(650);
  noTone(8);
  delay(350);
}`,
    circuit: {
      components: [
        { id: 'buz-1', kind: 'buzzer', x: 560, y: 195, label: 'PIEZO D8' },
      ],
      wires: [
        { id: 'bzw1', from: 'arduino:D8', to: 'comp:buz-1:pos', color: '#ef4444' },
        { id: 'bzw2', from: 'comp:buz-1:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-8',
    number: 8,
    track: 3,
    xp: 110,
    title: {
      ar: 'محرك السيرفو SG90 ومسح الرادار',
      en: 'SG90 Servo Motor Radar Sweep',
      fr: 'Balayage Radar par Servomoteur SG90',
    },
    summary: {
      ar: 'حرّك ذراع محرك السيرفو بدقة زاوية من 0° إلى 180° باستخدام مكتبة Servo.h.',
      en: 'Command precise angular positioning from 0° to 180° using the Servo.h library.',
      fr: 'Pilotez précisément l’angle d’un servomoteur de 0° à 180° avec Servo.h.',
    },
    theory: {
      ar: 'يستقبل محرك السيرفو SG90 نبضات تحكم كل 20ms تحدد الزاوية المستهدفة بين 0° و 180°. تسهل مكتبة Servo.h ذلك عبر دالتي attach(pin) و write(angle).',
      en: 'The SG90 micro servo translates 50 Hz control pulses into exact horn angles (0°–180°). Servo.h abstracts pulse timing into myServo.attach(pin) and myServo.write(angle).',
      fr: 'Le micro-servo SG90 traduit des impulsions en angles précis (0°–180°) grâce à myServo.attach() et myServo.write().',
    },
    keyFunctions: ['#include <Servo.h>', 'myServo.attach(9)', 'myServo.write(angle)'],
    pinoutNotes: [
      { pin: 'D9 (~)', role: { ar: 'سلك الإشارة البرتقالي (PWM) للسيرفو', en: 'Servo orange PWM signal wire', fr: 'Fil signal PWM du servo' } },
      { pin: '5V / GND', role: { ar: 'تغذية المحرك بجهد 5V وأرضي مشترك', en: '5V power rail and GND', fr: 'Alimentation 5V et GND' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وشاهد ذراع السيرفو يمسح بانتظام من 0° إلى 180° ذهاباً وإياباً.', en: 'Run simulation to watch the SG90 horn sweep smoothly between 0° and 180°.', fr: 'Lancez la simulation pour voir le bras du servo balayer de 0° à 180°.' },
    ],
    code: `#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  for (int pos = 0; pos <= 180; pos += 30) {
    myServo.write(pos);
    Serial.println(pos);
    delay(260);
  }
  for (int pos = 180; pos >= 0; pos -= 30) {
    myServo.write(pos);
    Serial.println(pos);
    delay(260);
  }
}`,
    circuit: {
      components: [
        { id: 'srv-1', kind: 'servo', x: 575, y: 205, label: 'SG90 D9' },
      ],
      wires: [
        { id: 'sw1', from: 'arduino:D9', to: 'comp:srv-1:sig', color: '#f59e0b' },
        { id: 'sw2', from: 'arduino:5V', to: 'comp:srv-1:vcc', color: '#ef4444' },
        { id: 'sw3', from: 'comp:srv-1:gnd', to: 'arduino:GND2', color: '#1e293b' },
      ],
    },
  }),

  // TRACK 4
  makeLesson({
    id: 'lesson-9',
    number: 9,
    track: 4,
    xp: 125,
    title: {
      ar: 'حساس ركن السيارة بالموجات فوق الصوتية HC-SR04',
      en: 'HC-SR04 Ultrasonic Parking Sensor',
      fr: 'Radar de Recul Ultrason HC-SR04',
    },
    summary: {
      ar: 'قس المسافة بالسنتيمتر وأطلق إنذاراً ضوئياً وصوتياً عند اقتراب العائق لأقل من 35 سم.',
      en: 'Measure distance in centimeters and trigger LED + Buzzer warnings under 35 cm.',
      fr: 'Mesurez la distance en cm et déclenchez une alerte LED + buzzer sous 35 cm.',
    },
    theory: {
      ar: 'يرسل حساس HC-SR04 نبضة صوتية عبر TRIG ويقيس زمن ارتداد الصدى عبر pulseIn(ECHO, HIGH). المسافة بالسنتيمتر = (الزمن × 0.0343) / 2.',
      en: 'The HC-SR04 fires an ultrasonic burst on TRIG and times the echo return using pulseIn(ECHO, HIGH). Distance (cm) = duration * 0.01715.',
      fr: 'Le HC-SR04 émet une onde ultrason sur TRIG et mesure l’écho via pulseIn(ECHO, HIGH). Distance (cm) = durée * 0,01715.',
    },
    keyFunctions: ['pulseIn(6, HIGH)', 'distance = duration * 0.01715', 'tone(8, 880, 150)'],
    pinoutNotes: [
      { pin: 'D7 / D6', role: { ar: 'TRIG (إرسال) على D7 و ECHO (استقبال) على D6', en: 'TRIG on D7, ECHO on D6', fr: 'TRIG sur D7, ECHO sur D6' } },
      { pin: 'D13 / D8', role: { ar: 'مصباح التحذير الأحمر وجرس التنبيه', en: 'Red warning LED & alert buzzer', fr: 'LED rouge et buzzer d’alerte' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وحرّك شريط المسافة على حساس HC-SR04 لتقريب العائق.', en: 'Start simulation and move the HC-SR04 target distance slider closer than 35 cm.', fr: 'Démarrez et rapprochez la cible du capteur HC-SR04 sous 35 cm.' },
      { ar: 'شاهد التنبيه الأحمر وصوت الإنذار ومنحنى المسافة في الراسم البياني.', en: 'Observe the Red LED alert, audible warning beep, and live distance graph.', fr: 'Observez l’alerte rouge, le bip sonore et la courbe de distance.' },
    ],
    code: `void setup() {
  pinMode(7, OUTPUT);
  pinMode(6, INPUT);
  pinMode(13, OUTPUT);
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(7, HIGH);
  delay(10);
  digitalWrite(7, LOW);
  int duration = pulseIn(6, HIGH);
  int distance = duration / 58;
  Serial.println(distance);
  if (distance < 35) {
    digitalWrite(13, HIGH);
    tone(8, 880, 140);
  } else {
    digitalWrite(13, LOW);
    noTone(8);
  }
  delay(220);
}`,
    circuit: {
      components: [
        { id: 'us-1', kind: 'ultrasonic', x: 520, y: 280, label: 'HC-SR04', value: 28 },
        { id: 'r-us', kind: 'resistor-220', x: 465, y: 120, label: '220Ω' },
        { id: 'l-us', kind: 'led-red', x: 550, y: 120, label: 'ALERT' },
        { id: 'b-us', kind: 'buzzer', x: 660, y: 145, label: 'BEEP' },
      ],
      wires: [
        { id: 'uw1', from: 'arduino:5V', to: 'comp:us-1:vcc', color: '#ef4444' },
        { id: 'uw2', from: 'arduino:D7', to: 'comp:us-1:trig', color: '#eab308' },
        { id: 'uw3', from: 'arduino:D6', to: 'comp:us-1:echo', color: '#3b82f6' },
        { id: 'uw4', from: 'comp:us-1:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'uw5', from: 'arduino:D13', to: 'comp:r-us:a', color: '#ef4444' },
        { id: 'uw6', from: 'comp:r-us:b', to: 'comp:l-us:anode', color: '#ef4444' },
        { id: 'uw7', from: 'comp:l-us:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'uw8', from: 'arduino:D8', to: 'comp:b-us:pos', color: '#f59e0b' },
        { id: 'uw9', from: 'comp:b-us:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-10',
    number: 10,
    track: 4,
    xp: 125,
    title: {
      ar: 'مراقب درجة الحرارة والبيئة (TMP36)',
      en: 'Environmental Temperature Monitor',
      fr: 'Moniteur de Température (TMP36)',
    },
    summary: {
      ar: 'حوّل إشارة حساس الحرارة TMP36 إلى درجة مئوية (°C) وارسمها حياً مع إنذار حرارة مرتفعة.',
      en: 'Convert TMP36 analog voltage into Celsius (°C) with live plotting and overheat LED alert.',
      fr: 'Convertissez la tension du TMP36 en °C avec graphique en direct et alerte surchauffe.',
    },
    theory: {
      ar: 'ينتج حساس TMP36 جهداً خطياً بمعدل 10mV لكل درجة مئوية مع إزاحة 500mV عند الصفر المئوي: TempC = (Voltage - 0.5) × 100.',
      en: 'The TMP36 outputs 10 mV/°C with a 500 mV offset at 0°C. Converting the 10-bit ADC count: tempC = ((raw * 5.0 / 1023.0) - 0.5) * 100.',
      fr: 'Le TMP36 délivre 10 mV/°C avec un décalage de 500 mV à 0°C : tempC = ((raw * 5,0 / 1023) - 0,5) * 100.',
    },
    keyFunctions: ['analogRead(A2)', 'tempC = ((raw * 500) / 1023) - 50', 'Serial.println(tempC)'],
    pinoutNotes: [
      { pin: 'A2', role: { ar: 'مخرج حساس الحرارة TMP36', en: 'TMP36 analog temperature output', fr: 'Sortie analogique TMP36' } },
      { pin: 'D12', role: { ar: 'مصباح إنذار الحرارة المرتفعة (> 32°C)', en: 'High-temp alert LED (> 32°C)', fr: 'LED d’alerte surchauffe (> 32°C)' } },
    ],
    steps: [
      { ar: 'ارفع شريط درجة الحرارة على حساس TMP36 لأعلى من 32°C وشاهد الإنذار.', en: 'Raise the TMP36 slider above 32°C to trigger the overheat indicator.', fr: 'Montez le curseur TMP36 au-dessus de 32°C pour activer l’alerte.' },
    ],
    code: `void setup() {
  pinMode(12, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A2);
  int tempC = ((raw * 500) / 1023) - 50;
  Serial.println(tempC);
  if (tempC > 32) {
    digitalWrite(12, HIGH);
  } else {
    digitalWrite(12, LOW);
  }
  delay(200);
}`,
    circuit: {
      components: [
        { id: 'tmp-1', kind: 'temp-sensor', x: 500, y: 275, label: 'TMP36', value: 35 },
        { id: 'r-tmp', kind: 'resistor-220', x: 520, y: 130, label: '220Ω' },
        { id: 'l-tmp', kind: 'led-red', x: 645, y: 130, label: 'HOT >32°C' },
      ],
      wires: [
        { id: 'tmpw1', from: 'arduino:5V', to: 'comp:tmp-1:vcc', color: '#ef4444' },
        { id: 'tmpw2', from: 'arduino:A2', to: 'comp:tmp-1:sig', color: '#f59e0b' },
        { id: 'tmpw3', from: 'comp:tmp-1:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'tmpw4', from: 'arduino:D12', to: 'comp:r-tmp:a', color: '#ef4444' },
        { id: 'tmpw5', from: 'comp:r-tmp:b', to: 'comp:l-tmp:anode', color: '#ef4444' },
        { id: 'tmpw6', from: 'comp:l-tmp:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-12',
    number: 12,
    track: 3,
    xp: 120,
    title: {
      ar: 'بوابة التحكم بالزر والسيرفو والإنذار الصوتي',
      en: 'Button-Controlled Servo Gate & Audio Alert',
      fr: 'Barrière Servo par Bouton & Alerte Sonore',
    },
    summary: {
      ar: 'اربط زراً ضاغطاً مع محرك سيرفو SG90 وجرس Piezo لفتح وإغلاق بوابة آلية مع تنبيه صوتي.',
      en: 'Combine a pushbutton, SG90 Servo motor, and Piezo buzzer to actuate a motorized gate with audio confirmation.',
      fr: 'Combinez bouton poussoir, servomoteur SG90 et buzzer pour commander une barrière automatisée.',
    },
    theory: {
      ar: 'في الأنظمة المدمجة الحقيقية، غالباً ما يطلق إدخال المستخدم (مثل ضغط زر) سلسلة من الأوامر المتزامنة على عدة مشغلات: تدوير محرك السيرفو إلى 90° وإصدار نغمة تأكيد وإضاءة مؤشر أخضر.',
      en: 'Real embedded systems coordinate multiple actuators from a single input event: pressing the button sweeps the SG90 gate open to 90°, triggers a confirmation tone, and lights the status LED.',
      fr: 'Les systèmes embarqués coordonnent plusieurs actionneurs : un appui sur le bouton ouvre la barrière à 90° et émet un bip de confirmation.',
    },
    keyFunctions: ['digitalRead(2)', 'myServo.write(90)', 'tone(8, 880, 120)'],
    pinoutNotes: [
      { pin: 'D2', role: { ar: 'زر فتح البوابة مع INPUT_PULLUP', en: 'Gate open button (INPUT_PULLUP)', fr: 'Bouton d’ouverture (INPUT_PULLUP)' } },
      { pin: 'D9 (~)', role: { ar: 'إشارة محرك السيرفو SG90', en: 'SG90 Servo PWM signal', fr: 'Signal PWM Servomoteur' } },
      { pin: 'D8', role: { ar: 'جرس التنبيه الصوتي', en: 'Piezo confirmation buzzer', fr: 'Buzzer de confirmation' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة واضغط مطولاً على الزر الضاغط على رقعة العمل.', en: 'Start Simulation and press & hold the pushbutton on the breadboard.', fr: 'Démarrez et maintenez le bouton poussoir enfoncé.' },
      { ar: 'لاحظ ارتفاع ذراع السيرفو وصوت الجرس عند الفتح.', en: 'Watch the Servo arm swing open and hear the audio chime.', fr: 'Observez le bras du servo s’ouvrir avec le bip sonore.' },
    ],
    code: `#include <Servo.h>
Servo gateServo;

void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(8, OUTPUT);
  pinMode(12, OUTPUT);
  gateServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(2) == LOW) {
    gateServo.write(95);
    digitalWrite(12, HIGH);
    tone(8, 880, 120);
    Serial.println("GATE OPEN");
  } else {
    gateServo.write(10);
    digitalWrite(12, LOW);
    noTone(8);
  }
  delay(200);
}`,
    circuit: {
      components: [
        { id: 'g-btn', kind: 'button', x: 455, y: 270, label: 'OPEN BTN', value: 0 },
        { id: 'g-srv', kind: 'servo', x: 620, y: 270, label: 'GATE D9' },
        { id: 'g-res', kind: 'resistor-220', x: 465, y: 120, label: '220Ω' },
        { id: 'g-led', kind: 'led-green', x: 555, y: 120, label: 'OPEN LED' },
        { id: 'g-buz', kind: 'buzzer', x: 665, y: 130, label: 'CHIME' },
      ],
      wires: [
        { id: 'gw1', from: 'arduino:D2', to: 'comp:g-btn:a', color: '#3b82f6' },
        { id: 'gw2', from: 'comp:g-btn:b', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'gw3', from: 'arduino:D9', to: 'comp:g-srv:sig', color: '#eab308' },
        { id: 'gw4', from: 'arduino:5V', to: 'comp:g-srv:vcc', color: '#ef4444' },
        { id: 'gw5', from: 'comp:g-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'gw6', from: 'arduino:D12', to: 'comp:g-res:a', color: '#22c55e' },
        { id: 'gw7', from: 'comp:g-res:b', to: 'comp:g-led:anode', color: '#22c55e' },
        { id: 'gw8', from: 'comp:g-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'gw9', from: 'arduino:D8', to: 'comp:g-buz:pos', color: '#f97316' },
        { id: 'gw10', from: 'comp:g-buz:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-13',
    number: 13,
    track: 4,
    xp: 140,
    title: {
      ar: 'محطة الرصد البيئي (حرارة + إضاءة + رسم بياني)',
      en: 'Environmental Telemetry Station (Temp + Light)',
      fr: 'Station de Télémétrie Environnementale',
    },
    summary: {
      ar: 'اقرأ حساس الحرارة TMP36 وحساس الإضاءة LDR معاً واعرض البيانات الحية على الراسم البياني Serial Plotter.',
      en: 'Sample both TMP36 temperature and LDR ambient light simultaneously and stream live telemetry to the Serial Plotter.',
      fr: 'Lisez simultanément TMP36 et LDR et affichez la télémétrie en direct sur le traceur série.',
    },
    theory: {
      ar: 'تمتلك لوحة Arduino Uno ست قنوات ADC تناظرية (A0 إلى A5) تتيح قراءة عدة حساسات في الدورة الواحدة. يمكننا مقارنة قراءة الحرارة والإضاءة لتفعيل إنذار الطقس الحار أو إرسال القياسات للراسم البياني.',
      en: 'Arduino Uno provides 6 analog ADC channels (A0–A5) to monitor multiple sensors inside one loop(). Combining light and temperature readings builds real-world IoT weather nodes.',
      fr: 'L’Arduino Uno dispose de 6 entrées analogiques (A0–A5) permettant de lire plusieurs capteurs dans la même boucle.',
    },
    keyFunctions: ['analogRead(A0)', 'analogRead(A2)', 'Serial.println()', 'Serial Plotter'],
    pinoutNotes: [
      { pin: 'A0', role: { ar: 'قراءة شدة الإضاءة من LDR', en: 'LDR light level input', fr: 'Entrée luminosité LDR' } },
      { pin: 'A2', role: { ar: 'قراءة جهد حساس الحرارة TMP36', en: 'TMP36 temperature voltage input', fr: 'Entrée tension TMP36' } },
      { pin: 'D11', role: { ar: 'مؤشر تنبيه بيئي LED أزرق', en: 'Environmental alert Blue LED', fr: 'LED bleue d’alerte' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وافتح تبويب «الراسم البياني» (Serial Plotter).', en: 'Start Simulation and switch to the Serial Plotter tab.', fr: 'Lancez la simulation et ouvrez le traceur série.' },
      { ar: 'حرّك شريطي الحرارة والإضاءة أسفل اللوحة وشاهد المنحنى يتغير لحظياً.', en: 'Adjust the Temperature and LDR sliders below the board and watch the live waveform.', fr: 'Ajustez les curseurs de température et lumière pour voir la courbe évoluer.' },
    ],
    code: `void setup() {
  pinMode(11, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int lightVal = analogRead(A0);
  int tempRaw = analogRead(A2);
  int tempC = map(tempRaw, 20, 358, -40, 125);
  Serial.println(tempC);
  if (tempC > 30 || lightVal < 300) {
    digitalWrite(11, HIGH);
  } else {
    digitalWrite(11, LOW);
  }
  delay(250);
}`,
    circuit: {
      components: [
        { id: 'env-ldr', kind: 'ldr', x: 460, y: 280, label: 'LIGHT A0', value: 580 },
        { id: 'env-tmp', kind: 'temp-sensor', x: 590, y: 280, label: 'TMP36 A2', value: 28 },
        { id: 'env-res', kind: 'resistor-220', x: 500, y: 125, label: '220Ω' },
        { id: 'env-led', kind: 'led-blue', x: 625, y: 125, label: 'ALERT D11' },
      ],
      wires: [
        { id: 'ew1', from: 'arduino:5V', to: 'comp:env-ldr:vcc', color: '#ef4444' },
        { id: 'ew2', from: 'arduino:A0', to: 'comp:env-ldr:sig', color: '#eab308' },
        { id: 'ew3', from: 'comp:env-ldr:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'ew4', from: 'arduino:5V', to: 'comp:env-tmp:vcc', color: '#ef4444' },
        { id: 'ew5', from: 'arduino:A2', to: 'comp:env-tmp:sig', color: '#f97316' },
        { id: 'ew6', from: 'comp:env-tmp:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'ew7', from: 'arduino:D11', to: 'comp:env-res:a', color: '#3b82f6' },
        { id: 'ew8', from: 'comp:env-res:b', to: 'comp:env-led:anode', color: '#3b82f6' },
        { id: 'ew9', from: 'comp:env-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  // STATION 5 — CAPSTONE & EMBEDDED MASTERY
  makeLesson({
    id: 'lesson-11',
    number: 11,
    track: 5,
    xp: 180,
    title: {
      ar: 'مشروع الغرفة الذكية التكاملي (Capstone 1)',
      en: 'Smart Room Integrated Capstone',
      fr: 'Projet Final 1 : Salle Intelligente',
    },
    summary: {
      ar: 'ادمج حساس الضوء LDR ومحرك ستارة Servo ومصباح ذكي وجرس تنبيه في نظام أتمتة متكامل.',
      en: 'Combine an LDR sensor, automated Servo blinds, smart lighting LED, and alert buzzer in one system.',
      fr: 'Combinez capteur LDR, store motorisé Servo, éclairage LED et buzzer dans un système complet.',
    },
    theory: {
      ar: 'المشروع الختامي الأول يجمع المهارات السابقة: قراءة تناظرية من LDR لتحديد النهار والليل، فتح وإغلاق الستائر بمحرك Servo، تشغيل الإضاءة التلقائية، وإصدار نغمة تأكيد عند تغيير الوضع.',
      en: 'This capstone unites previous stations: reading ambient light via LDR, actuating motorized window blinds with a Servo, controlling room lighting, and sending live telemetry to Serial.',
      fr: 'Ce projet final réunit les compétences clés : lecture LDR, ouverture de store par servomoteur, éclairage automatique et télémétrie série.',
    },
    keyFunctions: ['analogRead(A0)', 'myServo.write(150)', 'digitalWrite(12, HIGH)', 'tone(8, 660, 120)'],
    pinoutNotes: [
      { pin: 'A0', role: { ar: 'حساس إضاءة الغرفة LDR', en: 'Room ambient light LDR', fr: 'Capteur lumière LDR' } },
      { pin: 'D9 (~)', role: { ar: 'محرك السيرفو لفتح/إغلاق الستائر', en: 'Motorized blinds Servo', fr: 'Servomoteur des stores' } },
      { pin: 'D12 / D8', role: { ar: 'إضاءة الغرفة الذكية وجرس الإشعار', en: 'Room lamp LED & chime buzzer', fr: 'Lampe LED & buzzer' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وجرّب خفض الإضاءة على حساس LDR (وضع الليل) ثم رفعها (وضع النهار).', en: 'Start simulation and slide LDR between night (< 450) and day (>= 450).', fr: 'Lancez la simulation et basculez le LDR entre nuit (< 450) et jour.' },
      { ar: 'شاهد الستائر (Servo) تغلق والمصباح يضيء تلقائياً في وضع الليل.', en: 'Watch the Servo blinds close to 150° and the smart LED switch ON automatically at night.', fr: 'Observez le servo fermer les stores à 150° et la lampe s’allumer.' },
    ],
    code: `#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(9);
  pinMode(12, OUTPUT);
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(A0);
  Serial.println(light);
  if (light < 450) {
    digitalWrite(12, HIGH);
    myServo.write(150);
    tone(8, 520, 100);
  } else {
    digitalWrite(12, LOW);
    myServo.write(20);
    noTone(8);
  }
  delay(350);
}`,
    circuit: {
      components: [
        { id: 'cap-ldr', kind: 'ldr', x: 465, y: 280, label: 'ROOM LDR', value: 310 },
        { id: 'cap-srv', kind: 'servo', x: 630, y: 280, label: 'BLINDS D9' },
        { id: 'cap-res', kind: 'resistor-220', x: 465, y: 120, label: '220Ω' },
        { id: 'cap-led', kind: 'led-yellow', x: 555, y: 120, label: 'ROOM LED' },
        { id: 'cap-buz', kind: 'buzzer', x: 660, y: 135, label: 'CHIME' },
      ],
      wires: [
        { id: 'cw1', from: 'arduino:5V', to: 'comp:cap-ldr:vcc', color: '#ef4444' },
        { id: 'cw2', from: 'arduino:A0', to: 'comp:cap-ldr:sig', color: '#eab308' },
        { id: 'cw3', from: 'comp:cap-ldr:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'cw4', from: 'arduino:D9', to: 'comp:cap-srv:sig', color: '#3b82f6' },
        { id: 'cw5', from: 'arduino:5V', to: 'comp:cap-srv:vcc', color: '#ef4444' },
        { id: 'cw6', from: 'comp:cap-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'cw7', from: 'arduino:D12', to: 'comp:cap-res:a', color: '#f59e0b' },
        { id: 'cw8', from: 'comp:cap-res:b', to: 'comp:cap-led:anode', color: '#f59e0b' },
        { id: 'cw9', from: 'comp:cap-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'cw10', from: 'arduino:D8', to: 'comp:cap-buz:pos', color: '#22c55e' },
        { id: 'cw11', from: 'comp:cap-buz:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),

  makeLesson({
    id: 'lesson-14',
    number: 14,
    track: 5,
    xp: 200,
    title: {
      ar: 'مشروع التخرج النهائي: نظام الأمن الذكي متعدد الحساسات',
      en: 'Graduation Capstone: Multi-Sensor Smart Security',
      fr: 'Projet de Diplôme : Sécurité Multi-Capteurs',
    },
    summary: {
      ar: 'ابْنِ نظام أمان متكامل يراقب الاقتراب بحساس HC-SR04، يغلق القفل الآلي Servo، ويطلق صفارة ومصباح إنذار.',
      en: 'Build a complete graduation security hub using HC-SR04 intrusion detection, Servo deadbolt lock, alarm LED, and siren.',
      fr: 'Construisez un système de sécurité complet avec sonar HC-SR04, verrou Servo, LED d’alarme et sirène.',
    },
    theory: {
      ar: 'يمثل هذا المشروع تتويجاً لخارطة طريق الأردوينو: دمج الاستشعار الدقيق بالسونار، التحكم التلقائي بقفل ميكانيكي Servo، التنبيه المرئي والصوتي المتزامن، وتوثيق كل حدث عبر المنفذ التسلسلي. إتمامه يؤهلك للحصول على شهادة إتمام المسار!',
      en: 'This final graduation capstone brings every skill together: ultrasonic perimeter sensing, automated Servo lock actuation, dual visual/audio alerts, and Serial security logging. Completing it unlocks your Official Graduation Certificate!',
      fr: 'Ce projet final rassemble toutes vos compétences : détection ultrason, verrouillage Servo, alerte visuelle/sonore et journalisation série.',
    },
    keyFunctions: ['pulseIn(6, HIGH)', 'lockServo.write(180)', 'tone(8, 1100, 150)', 'Serial.println()'],
    pinoutNotes: [
      { pin: 'D7 / D6', role: { ar: 'حساس المسافة HC-SR04 (Trig / Echo)', en: 'HC-SR04 perimeter radar (Trig / Echo)', fr: 'Radar HC-SR04 (Trig / Echo)' } },
      { pin: 'D9 (~)', role: { ar: 'قفل الأمان الميكانيكي Servo', en: 'Servo security deadbolt lock', fr: 'Verrou de sécurité Servo' } },
      { pin: 'D13 / D8', role: { ar: 'مصباح إنذار أحمر وصفارة Piezo', en: 'Red alarm LED & Piezo siren', fr: 'LED alarme rouge & sirène Piezo' } },
    ],
    steps: [
      { ar: 'شغّل المحاكاة وقرّب المسافة على حساس HC-SR04 إلى أقل من 35 سم.', en: 'Start Simulation and move the HC-SR04 distance slider below 35 cm.', fr: 'Lancez la simulation et réduisez la distance HC-SR04 sous 35 cm.' },
      { ar: 'راقب إغلاق القفل (Servo -> 160°)، إضاءة الإنذار الأحمر، وتفعيل الصفارة.', en: 'Watch the Servo lock engage to 160°, the red alarm flash, and the siren sound.', fr: 'Observez le verrou Servo passer à 160°, la LED rouge et la sirène.' },
    ],
    code: `#include <Servo.h>
Servo lockServo;

void setup() {
  pinMode(7, OUTPUT);
  pinMode(6, INPUT);
  pinMode(13, OUTPUT);
  pinMode(8, OUTPUT);
  lockServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(7, LOW);
  delayMicroseconds(2);
  digitalWrite(7, HIGH);
  delayMicroseconds(10);
  digitalWrite(7, LOW);

  long duration = pulseIn(6, HIGH);
  int dist = duration * 0.034 / 2;
  Serial.println(dist);

  if (dist > 0 && dist < 35) {
    lockServo.write(160);
    digitalWrite(13, HIGH);
    tone(8, 1100, 150);
    Serial.println("ALERT: INTRUSION LOCKED");
  } else {
    lockServo.write(20);
    digitalWrite(13, LOW);
    noTone(8);
  }
  delay(250);
}`,
    circuit: {
      components: [
        { id: 'sec-us', kind: 'ultrasonic', x: 465, y: 275, label: 'SONAR', value: 25 },
        { id: 'sec-srv', kind: 'servo', x: 635, y: 275, label: 'LOCK D9' },
        { id: 'sec-res', kind: 'resistor-220', x: 465, y: 120, label: '220Ω' },
        { id: 'sec-led', kind: 'led-red', x: 555, y: 120, label: 'ALARM D13' },
        { id: 'sec-buz', kind: 'buzzer', x: 660, y: 130, label: 'SIREN D8' },
      ],
      wires: [
        { id: 'sw1', from: 'arduino:5V', to: 'comp:sec-us:vcc', color: '#ef4444' },
        { id: 'sw2', from: 'arduino:D7', to: 'comp:sec-us:trig', color: '#3b82f6' },
        { id: 'sw3', from: 'arduino:D6', to: 'comp:sec-us:echo', color: '#eab308' },
        { id: 'sw4', from: 'comp:sec-us:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'sw5', from: 'arduino:D9', to: 'comp:sec-srv:sig', color: '#22c55e' },
        { id: 'sw6', from: 'arduino:5V', to: 'comp:sec-srv:vcc', color: '#ef4444' },
        { id: 'sw7', from: 'comp:sec-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'sw8', from: 'arduino:D13', to: 'comp:sec-res:a', color: '#ef4444' },
        { id: 'sw9', from: 'comp:sec-res:b', to: 'comp:sec-led:anode', color: '#ef4444' },
        { id: 'sw10', from: 'comp:sec-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'sw11', from: 'arduino:D8', to: 'comp:sec-buz:pos', color: '#f97316' },
        { id: 'sw12', from: 'comp:sec-buz:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
  }),
];

export const STATION_REQUIREMENTS: Array<{
  stationId: 1 | 2 | 3 | 4 | 5;
  badgeId: string;
  bonusXp: number;
  lessonIds: string[];
}> = TRACK_META.map((tr) => ({
  stationId: tr.id,
  badgeId: tr.badgeId,
  bonusXp: tr.bonusXp,
  lessonIds: LESSONS.filter((l) => l.track === tr.id).map((l) => l.id),
}));

