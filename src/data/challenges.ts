import type { ChallengeData } from '../types/arduino';
import { analyzeCircuit } from '../engine/arduinoSim';
import { arduinoCppToBlocks } from '../engine/blocklyBridge';

function makeChallenge(
  c: Omit<ChallengeData, 'initialBlocks'>,
): ChallengeData {
  return {
    ...c,
    initialBlocks: arduinoCppToBlocks(c.initialCode),
  };
}

export const CHALLENGES: ChallengeData[] = [
  // MODE A: WIRING CHALLENGES
  makeChallenge({
    id: 'wire-missing-gnd',
    mode: 'wiring',
    xp: 100,
    difficulty: 'beginner',
    title: {
      ar: 'أصلح الأرضي المفقود (Missing GND)',
      en: 'Fix the Missing GND Return Path',
      fr: 'Réparer la masse (GND) manquante',
    },
    description: {
      ar: 'المصباح الأحمر متصل بالمنفذ D13 عبر مقاومة 220Ω، لكن الدائرة مفتوحة ولا يضيء المصباح! وصّل الطرف السالب (-) للمصباح بمنفذ GND على لوحة الأردوينو.',
      en: 'The Red LED is wired to D13 through a 220Ω resistor, but the circuit is open! Connect the LED cathode (-) to any GND pin on the Arduino.',
      fr: 'La LED rouge est reliée à D13 via 220Ω, mais le circuit est ouvert ! Reliez la cathode (-) de la LED à une broche GND.',
    },
    hint: {
      ar: 'انقر على الطرف السالب (-) للمصباح الأحمر ثم انقر على منفذ GND في لوحة الأردوينو (اختر السلك الأسود).',
      en: 'Click the (-) pin on the Red LED, then click GND on the Arduino board.',
      fr: 'Cliquez sur la broche (-) de la LED rouge puis sur GND sur la carte Arduino.',
    },
    initialCode: `void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(500);
}`,
    initialCircuit: {
      components: [
        { id: 'c-res1', kind: 'resistor-220', x: 510, y: 165, label: '220Ω' },
        { id: 'c-led1', kind: 'led-red', x: 635, y: 165, label: 'RED LED' },
      ],
      wires: [
        { id: 'cw-1', from: 'arduino:D13', to: 'comp:c-res1:a', color: '#ef4444' },
        { id: 'cw-2', from: 'comp:c-res1:b', to: 'comp:c-led1:anode', color: '#f59e0b' },
      ],
    },
    evaluate: (_code, circuit) => {
      const analysis = analyzeCircuit(circuit, { D13: 255 });
      const ledPower = analysis.componentPower['c-led1'];
      const noShort = !analysis.diagnostics.some((d) => d.code === 'SHORT_CIRCUIT');
      const hasGnd = Boolean(ledPower?.powered);
      const protectedLed = !ledPower?.warnNoResistor;
      return [
        {
          id: 'no-short',
          label: { ar: 'لا يوجد قصر دائرة (5V ↔ GND)', en: 'No 5V-to-GND short circuit', fr: 'Aucun court-circuit 5V-GND' },
          passed: noShort,
        },
        {
          id: 'led-powered',
          label: { ar: 'المصباح الأحمر مغلق الدائرة مع GND ومضاء عبر D13', en: 'Red LED has closed GND return path & lights on D13', fr: 'LED rouge reliée à GND et alimentée par D13' },
          passed: hasGnd,
        },
        {
          id: 'resistor-safe',
          label: { ar: 'مقاومة الحماية 220Ω متصلة على التوالي', en: '220Ω current-limiting resistor in series', fr: 'Résistance de protection 220Ω en série' },
          passed: hasGnd && protectedLed,
        },
      ];
    },
  }),

  makeChallenge({
    id: 'wire-add-resistor',
    mode: 'wiring',
    xp: 120,
    difficulty: 'intermediate',
    title: {
      ar: 'احمِ المصباح بمقاومة 220Ω',
      en: 'Add Missing 220Ω Protection Resistor',
      fr: 'Ajouter la Résistance de Protection 220Ω',
    },
    description: {
      ar: 'المصباح الأخضر متصل مباشرة بالمنفذ D9 بدون مقاومة حماية مما يعرضه للاحتراق! احذف السلك المباشر من D9 ومرّر الإشارة عبر المقاومة 220Ω الموجودة على اللوحة.',
      en: 'The Green LED is wired directly to D9 without a protection resistor! Click the direct D9 wire to remove it, then route D9 → 220Ω Resistor → LED Anode (+).',
      fr: 'La LED verte est reliée directement à D9 sans résistance ! Supprimez ce fil direct puis passez par la résistance 220Ω.',
    },
    hint: {
      ar: 'انقر على السلك الأخضر المباشر بين D9 والـ LED لحذفه، ثم وصّل D9 إلى طرف المقاومة (1) والطرف (2) إلى موجب LED (+).',
      en: 'Click the direct green wire from D9 to delete it, then wire D9 → Resistor pin 1 and Resistor pin 2 → LED (+).',
      fr: 'Cliquez sur le fil vert direct pour le supprimer, puis reliez D9 → Résistance → LED (+).',
    },
    initialCode: `void setup() {
  pinMode(9, OUTPUT);
}
void loop() {
  analogWrite(9, 220);
  delay(200);
}`,
    initialCircuit: {
      components: [
        { id: 'c-res2', kind: 'resistor-220', x: 505, y: 155, label: '220Ω' },
        { id: 'c-led2', kind: 'led-green', x: 645, y: 225, label: 'GREEN LED' },
      ],
      wires: [
        { id: 'bad-direct', from: 'arduino:D9', to: 'comp:c-led2:anode', color: '#22c55e' },
        { id: 'ok-gnd', from: 'comp:c-led2:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (_code, circuit) => {
      const analysis = analyzeCircuit(circuit, { D9: 220 });
      const led = analysis.componentPower['c-led2'];
      const hasResistorWarning = analysis.diagnostics.some(
        (d) => d.code === 'LED_NO_RESISTOR',
      );
      return [
        {
          id: 'powered',
          label: { ar: 'المصباح الأخضر يعمل عبر المنفذ D9', en: 'Green LED receives signal from D9', fr: 'La LED verte reçoit le signal de D9' },
          passed: Boolean(led?.powered),
        },
        {
          id: 'protected',
          label: { ar: 'التيار محمي عبر مقاومة 220Ω (لا توجد تحذيرات)', en: 'Current limited by 220Ω resistor (zero protection warnings)', fr: 'Courant limité par résistance 220Ω (zéro alerte)' },
          passed: Boolean(led?.powered) && !hasResistorWarning,
        },
      ];
    },
  }),

  makeChallenge({
    id: 'wire-buzzer-servo',
    mode: 'wiring',
    xp: 140,
    difficulty: 'intermediate',
    title: {
      ar: 'توصيل الجرس والمصباح على منفذين مختلفين',
      en: 'Wire Buzzer (D8) & Protected Blue LED (D11)',
      fr: 'Câbler Buzzer (D8) & LED Bleue Protégée (D11)',
    },
    description: {
      ar: 'أكمل توصيل دائرة الإنذار: وصّل الجرس (Buzzer) بين D8 و GND، والمصباح الأزرق عبر المقاومة 220Ω بين D11 و GND.',
      en: 'Complete the alarm circuit: wire the Piezo Buzzer between D8 and GND, and wire the Blue LED through the 220Ω resistor between D11 and GND.',
      fr: 'Terminez l’alarme : reliez le Buzzer entre D8 et GND, et la LED bleue via 220Ω entre D11 et GND.',
    },
    hint: {
      ar: 'تأكد من توصيل: D8 → Buzzer (+) و Buzzer (-) → GND، وكذلك D11 → المقاومة → LED (+) و LED (-) → GND.',
      en: 'Connect D8 → Buzzer (+), Buzzer (-) → GND, and D11 → 220Ω → LED (+), LED (-) → GND.',
      fr: 'Reliez D8 → Buzzer (+), Buzzer (-) → GND, et D11 → 220Ω → LED (+), LED (-) → GND.',
    },
    initialCode: `void setup() {
  pinMode(11, OUTPUT);
  pinMode(8, OUTPUT);
}
void loop() {
  digitalWrite(11, HIGH);
  tone(8, 600, 200);
  delay(400);
}`,
    initialCircuit: {
      components: [
        { id: 'c-res3', kind: 'resistor-220', x: 500, y: 125, label: '220Ω' },
        { id: 'c-led3', kind: 'led-blue', x: 635, y: 125, label: 'BLUE D11' },
        { id: 'c-buz3', kind: 'buzzer', x: 575, y: 270, label: 'BUZZER D8' },
      ],
      wires: [
        { id: 'w-init-1', from: 'comp:c-led3:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (_code, circuit) => {
      const aLed = analyzeCircuit(circuit, { D11: 255 });
      const aBuz = analyzeCircuit(circuit, { D8: 255 });
      return [
        {
          id: 'led-ok',
          label: { ar: 'المصباح الأزرق متصل بـ D11 عبر المقاومة 220Ω', en: 'Blue LED driven by D11 through 220Ω resistor', fr: 'LED bleue pilotée par D11 via 220Ω' },
          passed: Boolean(aLed.componentPower['c-led3']?.powered) && !aLed.componentPower['c-led3']?.warnNoResistor,
        },
        {
          id: 'buz-ok',
          label: { ar: 'الجرس متصل بالمنفذ D8 والأرضي GND', en: 'Piezo Buzzer wired to D8 and GND', fr: 'Buzzer piezo relié à D8 et GND' },
          passed: Boolean(aBuz.componentPower['c-buz3']?.powered),
        },
      ];
    },
  }),

  // MODE B: DEBUG CHALLENGES
  makeChallenge({
    id: 'debug-pinmode-semicolon',
    mode: 'debug',
    xp: 110,
    difficulty: 'beginner',
    title: {
      ar: 'أصلح أخطاء كود Blink التركيبية والمنطقية',
      en: 'Fix Blink Syntax & pinMode Direction Bug',
      fr: 'Corriger les bugs de syntaxe & pinMode dans Blink',
    },
    description: {
      ar: 'هذا الكود به خطآن شائعان: تم ضبط المنفذ 13 كـ INPUT بدلاً من OUTPUT، وهناك فاصلة منقوطة مفقودة في نهاية سطر digitalWrite!',
      en: 'This sketch has two classic bugs: pin 13 is configured as INPUT instead of OUTPUT, and a semicolon (;) is missing on digitalWrite.',
      fr: 'Ce code contient deux bugs classiques : la broche 13 est configurée en INPUT au lieu de OUTPUT et il manque un point-virgule (;).',
    },
    hint: {
      ar: 'غيّر INPUT إلى OUTPUT في السطر 2، وأضف الفاصلة المنقوطة ; بعد digitalWrite(13, HIGH).',
      en: 'Change INPUT to OUTPUT in setup(), and add a semicolon ; at the end of digitalWrite(13, HIGH).',
      fr: 'Remplacez INPUT par OUTPUT et ajoutez le point-virgule ; après digitalWrite(13, HIGH).',
    },
    initialCode: `void setup() {
  pinMode(13, INPUT);
}

void loop() {
  digitalWrite(13, HIGH)
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`,
    initialCircuit: {
      components: [
        { id: 'd-r1', kind: 'resistor-220', x: 520, y: 155, label: '220Ω' },
        { id: 'd-l1', kind: 'led-red', x: 640, y: 155, label: 'LED D13' },
      ],
      wires: [
        { id: 'dw1', from: 'arduino:D13', to: 'comp:d-r1:a', color: '#ef4444' },
        { id: 'dw2', from: 'comp:d-r1:b', to: 'comp:d-l1:anode', color: '#ef4444' },
        { id: 'dw3', from: 'comp:d-l1:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (code) => {
      const hasOutput = /pinMode\s*\(\s*(13|LED_BUILTIN)\s*,\s*OUTPUT\s*\)\s*;/.test(code);
      const hasHighSemi = /digitalWrite\s*\(\s*(13|LED_BUILTIN)\s*,\s*HIGH\s*\)\s*;/.test(code);
      const hasLowSemi = /digitalWrite\s*\(\s*(13|LED_BUILTIN)\s*,\s*LOW\s*\)\s*;/.test(code);
      const hasDelay = /delay\s*\(\s*\d+\s*\)\s*;/.test(code);
      return [
        {
          id: 'pin-output',
          label: { ar: 'تهيئة المنفذ 13 كمخرج OUTPUT', en: 'Pin 13 configured as OUTPUT', fr: 'Broche 13 configurée en OUTPUT' },
          passed: hasOutput,
        },
        {
          id: 'high-semi',
          label: { ar: 'صحة الفاصلة المنقوطة في digitalWrite(13, HIGH);', en: 'Valid semicolon on digitalWrite(13, HIGH);', fr: 'Point-virgule valide sur digitalWrite(13, HIGH);' },
          passed: hasHighSemi,
        },
        {
          id: 'toggle',
          label: { ar: 'تبديل الحالة إلى LOW مع delay()', en: 'Toggles back to LOW with delay()', fr: 'Passe à LOW avec delay()' },
          passed: hasLowSemi && hasDelay,
        },
      ];
    },
  }),

  makeChallenge({
    id: 'debug-pwm-pin',
    mode: 'debug',
    xp: 130,
    difficulty: 'intermediate',
    title: {
      ar: 'أصلح منفذ PWM ومدى السطوع',
      en: 'Debug PWM Pin & Out-of-Range Duty Cycle',
      fr: 'Déboguer la broche PWM et la plage de valeurs',
    },
    description: {
      ar: 'المبرمج حاول استخدام analogWrite على المنفذ D13 (لا يدعم PWM في Uno R3) وبقيمة 500 تتجاوز الحد الأقصى 255! عدّل الكود لاستخدام منفذ PWM صالح (D9) وقيمة بين 1 و 255.',
      en: 'The sketch calls analogWrite on Pin 13 (non-PWM on Uno R3) with value 500 (exceeds 8-bit max 255). Fix both to use PWM pin 9 and a valid brightness (1–255).',
      fr: 'Le code appelle analogWrite sur la broche 13 (non PWM) avec la valeur 500 (> 255). Corrigez vers la broche 9 et une valeur entre 1 et 255.',
    },
    hint: {
      ar: 'استبدل 13 بـ 9 في pinMode و analogWrite، واجعل قيمة السطوع مثلاً 180 (أقل من أو تساوي 255).',
      en: 'Use pin 9 in pinMode(9, OUTPUT) and analogWrite(9, 180) where 1 <= value <= 255.',
      fr: 'Utilisez la broche 9 et une valeur comprise entre 1 et 255 (ex: 180).',
    },
    initialCode: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  analogWrite(13, 500);
  delay(300);
}`,
    initialCircuit: {
      components: [
        { id: 'd-r2', kind: 'resistor-220', x: 520, y: 155, label: '220Ω' },
        { id: 'd-l2', kind: 'led-blue', x: 640, y: 155, label: 'PWM D9' },
      ],
      wires: [
        { id: 'dw21', from: 'arduino:D9', to: 'comp:d-r2:a', color: '#3b82f6' },
        { id: 'dw22', from: 'comp:d-r2:b', to: 'comp:d-l2:anode', color: '#3b82f6' },
        { id: 'dw23', from: 'comp:d-l2:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (code) => {
      const pinModeOk = /pinMode\s*\(\s*9\s*,\s*OUTPUT\s*\)\s*;/.test(code);
      const pwmMatch = code.match(/analogWrite\s*\(\s*9\s*,\s*(\d+)\s*\)\s*;/);
      const val = pwmMatch ? Number(pwmMatch[1]) : -1;
      return [
        {
          id: 'pwm-pin',
          label: { ar: 'استخدام منفذ PWM صالح (D9)', en: 'Uses hardware PWM pin 9', fr: 'Utilise la broche PWM 9' },
          passed: pinModeOk && Boolean(pwmMatch),
        },
        {
          id: 'pwm-range',
          label: { ar: 'قيمة PWM ضمن المدى الصحيح (1 – 255)', en: 'PWM value within valid 8-bit range (1–255)', fr: 'Valeur PWM valide (1–255)' },
          passed: val >= 1 && val <= 255,
        },
      ];
    },
  }),

  makeChallenge({
    id: 'debug-serial-missing',
    mode: 'debug',
    xp: 120,
    difficulty: 'intermediate',
    title: {
      ar: 'أصلح تهيئة المراقب التسلسلي ومنفذ الحساس',
      en: 'Fix Serial Initialization & Analog Sensor Pin',
      fr: 'Corriger Serial.begin() & la broche analogique',
    },
    description: {
      ar: 'الكود يطبع قراءة المقاومة المتغيرة لكنه نسي تهيئة Serial.begin(9600); في setup()، كما يقرأ من المنفذ الخطأ A5 بدلاً من A0 الموصول بالمقاومة المتغيرة.',
      en: 'The sketch prints sensor data without calling Serial.begin(9600) in setup(), and reads A5 instead of A0 where the potentiometer is wired.',
      fr: 'Le code oublie Serial.begin(9600) dans setup() et lit A5 au lieu de A0.',
    },
    hint: {
      ar: 'أضف Serial.begin(9600); داخل setup() وغيّر analogRead(A5) إلى analogRead(A0).',
      en: 'Add Serial.begin(9600); inside setup() and change analogRead(A5) to analogRead(A0).',
      fr: 'Ajoutez Serial.begin(9600); dans setup() et changez analogRead(A5) en analogRead(A0).',
    },
    initialCode: `void setup() {
  // Missing Serial initialization
}

void loop() {
  int val = analogRead(A5);
  Serial.println(val);
  delay(200);
}`,
    initialCircuit: {
      components: [
        { id: 'd-pot', kind: 'potentiometer', x: 550, y: 245, label: 'POT A0', value: 512 },
      ],
      wires: [
        { id: 'dp1', from: 'arduino:5V', to: 'comp:d-pot:vcc', color: '#ef4444' },
        { id: 'dp2', from: 'arduino:A0', to: 'comp:d-pot:sig', color: '#eab308' },
        { id: 'dp3', from: 'comp:d-pot:gnd', to: 'arduino:GND2', color: '#1e293b' },
      ],
    },
    evaluate: (code) => {
      const hasSerialBegin = /Serial\.begin\s*\(\s*(9600|115200|57600)\s*\)\s*;/.test(code);
      const readsA0 = /analogRead\s*\(\s*A0\s*\)/.test(code);
      const prints = /Serial\.println\s*\(/.test(code);
      return [
        {
          id: 'serial-begin',
          label: { ar: 'تهيئة الاتصال التسلسلي عبر Serial.begin(9600);', en: 'Serial initialized with Serial.begin(9600);', fr: 'Port série initialisé avec Serial.begin(9600);' },
          passed: hasSerialBegin,
        },
        {
          id: 'read-a0',
          label: { ar: 'قراءة المقاومة المتغيرة من المنفذ الصحيح A0', en: 'Reads potentiometer on Pin A0', fr: 'Lit le potentiomètre sur A0' },
          passed: readsA0,
        },
        {
          id: 'prints',
          label: { ar: 'طباعة القيمة عبر Serial.println()', en: 'Prints sensor value via Serial.println()', fr: 'Affiche la valeur via Serial.println()' },
          passed: prints,
        },
      ];
    },
  }),

  // MODE C: CODE COMPLETION CHALLENGES
  makeChallenge({
    id: 'code-fast-blink-serial',
    mode: 'code',
    xp: 140,
    difficulty: 'beginner',
    title: {
      ar: 'وميض سريع 250ms مع رسالة تسلسلية',
      en: 'Fast 250ms Blink + Serial Telemetry',
      fr: 'Clignotement Rapide 250ms + Moniteur Série',
    },
    description: {
      ar: 'أكمل الكود (أو ركّب البلوكات) بحيث يومض المصباح على D13 بزمن 250ms (تشغيل ثم إطفاء) ويطبع "BLINK" على المراقب التسلسلي بسرعة 9600.',
      en: 'Complete the sketch so Pin 13 blinks every 250ms (HIGH then LOW) and prints "BLINK" to Serial at 9600 baud.',
      fr: 'Complétez le code pour faire clignoter la broche 13 toutes les 250 ms et afficher "BLINK" sur Serial à 9600 bauds.',
    },
    hint: {
      ar: 'أضف Serial.begin(9600); في setup()، وفي loop() أضف digitalWrite(13, HIGH); و Serial.println("BLINK"); و delay(250); ثم LOW و delay(250);.',
      en: 'Use Serial.begin(9600), digitalWrite(13, HIGH), Serial.println("BLINK"), delay(250), digitalWrite(13, LOW), delay(250).',
      fr: 'Utilisez Serial.begin(9600), digitalWrite(13, HIGH), Serial.println("BLINK"), delay(250), digitalWrite(13, LOW).',
    },
    initialCode: `void setup() {
  pinMode(13, OUTPUT);
  // Add Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  // Print "BLINK" and add 250ms blink cycle
}`,
    initialCircuit: {
      components: [
        { id: 'cc-r1', kind: 'resistor-220', x: 520, y: 155, label: '220Ω' },
        { id: 'cc-l1', kind: 'led-yellow', x: 640, y: 155, label: 'LED D13' },
      ],
      wires: [
        { id: 'ccw1', from: 'arduino:D13', to: 'comp:cc-r1:a', color: '#eab308' },
        { id: 'ccw2', from: 'comp:cc-r1:b', to: 'comp:cc-l1:anode', color: '#eab308' },
        { id: 'ccw3', from: 'comp:cc-l1:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (code) => {
      return [
        {
          id: 'serial-init',
          label: { ar: 'تفعيل Serial.begin(9600)', en: 'Serial.begin(9600) configured', fr: 'Serial.begin(9600) configuré' },
          passed: /Serial\.begin\s*\(\s*9600\s*\)\s*;/.test(code),
        },
        {
          id: 'blink-cycle',
          label: { ar: 'تشغيل وإطفاء D13 (HIGH ثم LOW)', en: 'Toggles Pin 13 HIGH and LOW', fr: 'Bascule la broche 13 HIGH et LOW' },
          passed:
            /digitalWrite\s*\(\s*(13|LED_BUILTIN)\s*,\s*HIGH\s*\)\s*;/.test(code) &&
            /digitalWrite\s*\(\s*(13|LED_BUILTIN)\s*,\s*LOW\s*\)\s*;/.test(code),
        },
        {
          id: 'delay-250',
          label: { ar: 'استخدام توقيت delay(250)', en: 'Uses 250ms delay(250)', fr: 'Utilise un délai de 250ms' },
          passed: /delay\s*\(\s*250\s*\)\s*;/.test(code),
        },
        {
          id: 'print-blink',
          label: { ar: 'طباعة النص "BLINK" عبر Serial', en: 'Prints "BLINK" to Serial Monitor', fr: 'Affiche "BLINK" sur le moniteur série' },
          passed: /Serial\.print(?:ln)?\s*\(\s*"BLINK"\s*\)\s*;/.test(code),
        },
      ];
    },
  }),

  makeChallenge({
    id: 'code-servo-and-pwm',
    mode: 'code',
    xp: 160,
    difficulty: 'intermediate',
    title: {
      ar: 'توجيه السيرفو إلى 90° وتدريج LED إلى 180',
      en: 'Center Servo at 90° & Set LED PWM to 180',
      fr: 'Centrer le Servo à 90° & PWM LED à 180',
    },
    description: {
      ar: 'أكمل البرنامج لربط محرك السيرفو بالمنفذ 9 وتحريكه للزاوية 90 درجة، وضبط سطوع المصباح الأخضر على المنفذ 11 إلى قيمة PWM تساوي 180.',
      en: 'Attach the Servo to Pin 9, command it to 90°, and drive the Green LED on PWM Pin 11 at brightness 180.',
      fr: 'Attachez le Servo à la broche 9, placez-le à 90° et réglez la LED verte (broche 11) en PWM à 180.',
    },
    hint: {
      ar: 'استخدم myServo.attach(9); و pinMode(11, OUTPUT); في setup()، ثم myServo.write(90); و analogWrite(11, 180); في loop().',
      en: 'Call myServo.attach(9) & pinMode(11, OUTPUT) in setup(), then myServo.write(90) & analogWrite(11, 180) in loop().',
      fr: 'Appelez myServo.attach(9) et pinMode(11, OUTPUT) dans setup(), puis myServo.write(90) et analogWrite(11, 180).',
    },
    initialCode: `#include <Servo.h>
Servo myServo;

void setup() {
  // Attach servo to pin 9 & configure pin 11
}

void loop() {
  // Move servo to 90 deg and set pin 11 PWM to 180
  delay(200);
}`,
    initialCircuit: {
      components: [
        { id: 'cs-srv', kind: 'servo', x: 590, y: 265, label: 'SG90 D9' },
        { id: 'cs-res', kind: 'resistor-220', x: 495, y: 125, label: '220Ω' },
        { id: 'cs-led', kind: 'led-green', x: 625, y: 125, label: 'PWM D11' },
      ],
      wires: [
        { id: 'csw1', from: 'arduino:D9', to: 'comp:cs-srv:sig', color: '#f59e0b' },
        { id: 'csw2', from: 'arduino:5V', to: 'comp:cs-srv:vcc', color: '#ef4444' },
        { id: 'csw3', from: 'comp:cs-srv:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'csw4', from: 'arduino:D11', to: 'comp:cs-res:a', color: '#22c55e' },
        { id: 'csw5', from: 'comp:cs-res:b', to: 'comp:cs-led:anode', color: '#22c55e' },
        { id: 'csw6', from: 'comp:cs-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (code) => {
      return [
        {
          id: 'servo-attach',
          label: { ar: 'ربط السيرفو بالمنفذ 9 عبر myServo.attach(9)', en: 'Servo attached to Pin 9', fr: 'Servo attaché à la broche 9' },
          passed: /\.attach\s*\(\s*9\s*\)\s*;/.test(code),
        },
        {
          id: 'servo-90',
          label: { ar: 'توجيه السيرفو إلى الزاوية 90°', en: 'Servo commanded to 90 degrees', fr: 'Servo positionné à 90°' },
          passed: /\.write\s*\(\s*90\s*\)\s*;/.test(code),
        },
        {
          id: 'pwm-180',
          label: { ar: 'ضبط سطوع المنفذ 11 إلى analogWrite(11, 180)', en: 'Pin 11 PWM driven to 180', fr: 'Broche 11 en PWM à 180' },
          passed: /analogWrite\s*\(\s*11\s*,\s*180\s*\)\s*;/.test(code),
        },
      ];
    },
  }),

  makeChallenge({
    id: 'code-smart-threshold',
    mode: 'code',
    xp: 200,
    difficulty: 'advanced',
    title: {
      ar: 'منطق الإنذار الذكي عند الظلام (< 400)',
      en: 'Smart Darkness Alarm Logic (< 400)',
      fr: 'Logique d’Alarme Obscurité (< 400)',
    },
    description: {
      ar: 'اقرأ حساس الضوء LDR من A0؛ إذا كانت القيمة أقل من 400 شغّل المصباح على D12 وأطلق نغمة على الجرس D8، وإلا أطفئ المصباح وأوقف الصوت بـ noTone(8).',
      en: 'Read the LDR on A0; when reading < 400 turn D12 HIGH and sound tone() on D8, else set D12 LOW and call noTone(8).',
      fr: 'Lisez la LDR sur A0 ; si la valeur < 400 allumez D12 et activez tone() sur D8, sinon éteignez D12 et appelez noTone(8).',
    },
    hint: {
      ar: 'استخدم: int light = analogRead(A0); ثم if (light < 400) { digitalWrite(12, HIGH); tone(8, 700, 150); } else { digitalWrite(12, LOW); noTone(8); }',
      en: 'Use analogRead(A0), if (... < 400) with digitalWrite(12, HIGH) and tone(8, ...), plus an else block with digitalWrite(12, LOW) and noTone(8).',
      fr: 'Utilisez analogRead(A0), if (... < 400) avec digitalWrite(12, HIGH) et tone(8, ...), et else avec digitalWrite(12, LOW) et noTone(8).',
    },
    initialCode: `void setup() {
  pinMode(12, OUTPUT);
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(A0);
  // Write if (light < 400) alarm logic here
  delay(200);
}`,
    initialCircuit: {
      components: [
        { id: 'ct-ldr', kind: 'ldr', x: 485, y: 270, label: 'LDR A0', value: 280 },
        { id: 'ct-res', kind: 'resistor-220', x: 485, y: 125, label: '220Ω' },
        { id: 'ct-led', kind: 'led-red', x: 585, y: 125, label: 'ALARM D12' },
        { id: 'ct-buz', kind: 'buzzer', x: 660, y: 255, label: 'BUZZER D8' },
      ],
      wires: [
        { id: 'ctw1', from: 'arduino:5V', to: 'comp:ct-ldr:vcc', color: '#ef4444' },
        { id: 'ctw2', from: 'arduino:A0', to: 'comp:ct-ldr:sig', color: '#eab308' },
        { id: 'ctw3', from: 'comp:ct-ldr:gnd', to: 'arduino:GND2', color: '#1e293b' },
        { id: 'ctw4', from: 'arduino:D12', to: 'comp:ct-res:a', color: '#ef4444' },
        { id: 'ctw5', from: 'comp:ct-res:b', to: 'comp:ct-led:anode', color: '#ef4444' },
        { id: 'ctw6', from: 'comp:ct-led:cathode', to: 'arduino:GND1', color: '#1e293b' },
        { id: 'ctw7', from: 'arduino:D8', to: 'comp:ct-buz:pos', color: '#f59e0b' },
        { id: 'ctw8', from: 'comp:ct-buz:neg', to: 'arduino:GND1', color: '#1e293b' },
      ],
    },
    evaluate: (code) => {
      return [
        {
          id: 'reads-ldr',
          label: { ar: 'قراءة حساس الضوء عبر analogRead(A0)', en: 'Reads LDR sensor via analogRead(A0)', fr: 'Lit la LDR via analogRead(A0)' },
          passed: /analogRead\s*\(\s*A0\s*\)/.test(code),
        },
        {
          id: 'threshold-check',
          label: { ar: 'شرط المقارنة مع العتبة (< 400)', en: 'Threshold comparison (< 400)', fr: 'Comparaison au seuil (< 400)' },
          passed: /if\s*\([^)]*<\s*400[^)]*\)/.test(code),
        },
        {
          id: 'alarm-on',
          label: { ar: 'تشغيل LED (D12) والجرس tone(8, ...)', en: 'Activates D12 LED and tone(8, ...)', fr: 'Active la LED D12 et tone(8, ...)' },
          passed:
            /digitalWrite\s*\(\s*12\s*,\s*HIGH\s*\)\s*;/.test(code) &&
            /tone\s*\(\s*8\s*,/.test(code),
        },
        {
          id: 'alarm-off',
          label: { ar: 'إطفاء LED وإيقاف الصوت بـ noTone(8)', en: 'Deactivates D12 LOW and calls noTone(8)', fr: 'Éteint D12 et appelle noTone(8)' },
          passed:
            /digitalWrite\s*\(\s*12\s*,\s*LOW\s*\)\s*;/.test(code) &&
            /noTone\s*\(\s*8\s*\)\s*;/.test(code),
        },
      ];
    },
  }),
];
