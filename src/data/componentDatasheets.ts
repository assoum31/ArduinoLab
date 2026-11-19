import type { ComponentKind } from '../types/arduino';
import type { LocalizedText } from '../i18n/translations';

export type ExplorerCategory = 'outputs' | 'passives' | 'inputs' | 'sensors';

export interface ComponentDatasheet {
  kind: ComponentKind;
  category: ExplorerCategory;
  swatch: string;
  partNumber: string;
  packageType: string;
  name: LocalizedText;
  summary: LocalizedText;
  operatingVoltage: string;
  currentRating: string;
  specs: Array<{
    label: LocalizedText;
    value: string;
  }>;
  pinout: Array<{
    pin: string;
    role: 'vcc' | 'gnd' | 'signal' | 'passive';
    desc: LocalizedText;
  }>;
  wiringNote: LocalizedText;
  codeExample: string;
  keywords: string[];
}

export const COMPONENT_DATASHEETS: readonly ComponentDatasheet[] = [
  {
    kind: 'led-red',
    category: 'outputs',
    swatch: '#ef4444',
    partNumber: 'LED-5MM-RD (GaAsP)',
    packageType: 'T-1¾ · 5mm DIP',
    name: { ar: 'LED أحمر 5mm', en: 'Red LED (5mm)', fr: 'LED Rouge (5mm)' },
    summary: {
      ar: 'ثنائي باعث للضوء الأحمر لمؤشرات الحالة والمخارج الرقمية أو PWM.',
      en: 'Standard 5mm diffused red light-emitting diode for digital status indicators and PWM dimming.',
      fr: 'Diode électroluminescente rouge 5mm pour indicateurs numériques et variation PWM.',
    },
    operatingVoltage: '1.8 – 2.2 V (Vf)',
    currentRating: '20 mA max (15 mA typ)',
    specs: [
      { label: { ar: 'الطول الموجي', en: 'Peak Wavelength', fr: 'Longueur d’onde' }, value: '625 – 635 nm' },
      { label: { ar: 'الجهد الأمامي', en: 'Forward Voltage', fr: 'Tension directe' }, value: '2.0 V @ 20 mA' },
      { label: { ar: 'المقاومة الموصى بها (5V)', en: 'Series Resistor (5V)', fr: 'Résistance série (5V)' }, value: '220 Ω (150–330 Ω)' },
      { label: { ar: 'زاوية الإضاءة', en: 'Viewing Angle', fr: 'Angle de vue' }, value: '60° Diffused' },
    ],
    pinout: [
      { pin: '+', role: 'signal', desc: { ar: 'المصعد (Anode) — يتصل بمقاومة ثم المنفذ الرقمي', en: 'Anode — connect via 220Ω resistor to digital pin', fr: 'Anode — vers broche numérique via résistance 220Ω' } },
      { pin: '-', role: 'gnd', desc: { ar: 'المهبط (Cathode) — يتصل بالأرضي GND', en: 'Cathode — connect to GND rail', fr: 'Cathode — vers la masse GND' } },
    ],
    wiringNote: {
      ar: 'ضع دائماً مقاومة 220Ω على التوالي لحماية الـ LED ومنفذ الأردوينو من التيار الزائد.',
      en: 'Always wire a 220Ω current-limiting resistor in series to protect both the LED and Arduino pin.',
      fr: 'Placez toujours une résistance de 220Ω en série pour limiter le courant.',
    },
    codeExample: 'pinMode(13, OUTPUT);\ndigitalWrite(13, HIGH);',
    keywords: ['led', 'red', 'diode', 'light', 'pwm', 'أحمر', 'مصباح', 'rouge'],
  },
  {
    kind: 'led-green',
    category: 'outputs',
    swatch: '#22c55e',
    partNumber: 'LED-5MM-GR (InGaN)',
    packageType: 'T-1¾ · 5mm DIP',
    name: { ar: 'LED أخضر 5mm', en: 'Green LED (5mm)', fr: 'LED Verte (5mm)' },
    summary: {
      ar: 'ثنائي باعث للضوء الأخضر لمؤشرات النجاح وإشارات المرور.',
      en: 'High-efficiency 5mm green LED ideal for traffic lights, status OK feedback, and PWM fades.',
      fr: 'LED verte 5mm haute efficacité idéale pour feux tricolores et indicateurs de statut.',
    },
    operatingVoltage: '2.0 – 2.4 V (Vf)',
    currentRating: '20 mA max',
    specs: [
      { label: { ar: 'الطول الموجي', en: 'Peak Wavelength', fr: 'Longueur d’onde' }, value: '520 – 535 nm' },
      { label: { ar: 'الجهد الأمامي', en: 'Forward Voltage', fr: 'Tension directe' }, value: '2.2 V @ 20 mA' },
      { label: { ar: 'المقاومة الموصى بها (5V)', en: 'Series Resistor (5V)', fr: 'Résistance série (5V)' }, value: '220 Ω' },
      { label: { ar: 'شدة الإضاءة', en: 'Luminous Intensity', fr: 'Intensité lumineuse' }, value: '800 mcd' },
    ],
    pinout: [
      { pin: '+', role: 'signal', desc: { ar: 'المصعد (Anode) — منفذ رقمي أو PWM', en: 'Anode — digital or PWM output via resistor', fr: 'Anode — sortie numérique ou PWM via résistance' } },
      { pin: '-', role: 'gnd', desc: { ar: 'المهبط (Cathode) — الأرضي GND', en: 'Cathode — GND return', fr: 'Cathode — retour GND' } },
    ],
    wiringNote: {
      ar: 'مناسب للتعتيم المتدرج عبر منافذ PWM (~3, ~5, ~6, ~9, ~10, ~11) مع مقاومة 220Ω.',
      en: 'Supports smooth dimming on PWM pins (~3, ~5, ~6, ~9, ~10, ~11) with a 220Ω series resistor.',
      fr: 'Compatible variation lumineuse sur broches PWM avec résistance 220Ω.',
    },
    codeExample: 'analogWrite(9, 180); // PWM brightness',
    keywords: ['led', 'green', 'diode', 'traffic', 'أخضر', 'مصباح', 'verte'],
  },
  {
    kind: 'led-blue',
    category: 'outputs',
    swatch: '#3b82f6',
    partNumber: 'LED-5MM-BL (InGaN)',
    packageType: 'T-1¾ · 5mm DIP',
    name: { ar: 'LED أزرق 5mm', en: 'Blue LED (5mm)', fr: 'LED Bleue (5mm)' },
    summary: {
      ar: 'ثنائي باعث للضوء الأزرق بجهد أمامي أعلى للتطبيقات البصرية والتنبيهات.',
      en: 'Bright 5mm InGaN blue LED with a higher forward voltage drop for telemetry and alarm indicators.',
      fr: 'LED bleue InGaN 5mm lumineuse à tension directe plus élevée pour indicateurs.',
    },
    operatingVoltage: '3.0 – 3.4 V (Vf)',
    currentRating: '20 mA max',
    specs: [
      { label: { ar: 'الطول الموجي', en: 'Peak Wavelength', fr: 'Longueur d’onde' }, value: '465 – 475 nm' },
      { label: { ar: 'الجهد الأمامي', en: 'Forward Voltage', fr: 'Tension directe' }, value: '3.2 V @ 20 mA' },
      { label: { ar: 'المقاومة الموصى بها (5V)', en: 'Series Resistor (5V)', fr: 'Résistance série (5V)' }, value: '100 – 220 Ω' },
      { label: { ar: 'الجهد العكسي الأقصى', en: 'Max Reverse Voltage', fr: 'Tension inverse max' }, value: '5.0 V' },
    ],
    pinout: [
      { pin: '+', role: 'signal', desc: { ar: 'المصعد (Anode) — قطب موجب', en: 'Anode — positive supply via resistor', fr: 'Anode — pôle positif via résistance' } },
      { pin: '-', role: 'gnd', desc: { ar: 'المهبط (Cathode) — الأرضي GND', en: 'Cathode — GND', fr: 'Cathode — masse GND' } },
    ],
    wiringNote: {
      ar: 'تأكد من القطبية الصحيحة؛ عكس القطبين يمنع مرور التيار ولا يضيء الـ LED.',
      en: 'Check polarity carefully — reverse-biasing blocks current so the LED will remain dark.',
      fr: 'Vérifiez la polarité : une inversion bloque le courant.',
    },
    codeExample: 'digitalWrite(10, HIGH);',
    keywords: ['led', 'blue', 'diode', 'أزرق', 'مصباح', 'bleue'],
  },
  {
    kind: 'led-yellow',
    category: 'outputs',
    swatch: '#eab308',
    partNumber: 'LED-5MM-YL (AlInGaP)',
    packageType: 'T-1¾ · 5mm DIP',
    name: { ar: 'LED أصفر 5mm', en: 'Yellow LED (5mm)', fr: 'LED Jaune (5mm)' },
    summary: {
      ar: 'ثنائي باعث للضوء الأصفر لمؤشرات التحذير والانتقال في إشارات المرور.',
      en: 'Amber-yellow 5mm LED suited for caution alerts, standby indicators, and traffic light transitions.',
      fr: 'LED jaune ambrée 5mm pour alertes de prudence et feux de signalisation.',
    },
    operatingVoltage: '1.9 – 2.2 V (Vf)',
    currentRating: '20 mA max',
    specs: [
      { label: { ar: 'الطول الموجي', en: 'Peak Wavelength', fr: 'Longueur d’onde' }, value: '585 – 595 nm' },
      { label: { ar: 'الجهد الأمامي', en: 'Forward Voltage', fr: 'Tension directe' }, value: '2.1 V @ 20 mA' },
      { label: { ar: 'المقاومة الموصى بها (5V)', en: 'Series Resistor (5V)', fr: 'Résistance série (5V)' }, value: '220 Ω' },
      { label: { ar: 'تيار العمل المثالي', en: 'Nominal Current', fr: 'Courant nominal' }, value: '13 mA @ 220 Ω' },
    ],
    pinout: [
      { pin: '+', role: 'signal', desc: { ar: 'المصعد (Anode) — منفذ الإخراج عبر مقاومة', en: 'Anode — output pin via resistor', fr: 'Anode — sortie via résistance' } },
      { pin: '-', role: 'gnd', desc: { ar: 'المهبط (Cathode) — الأرضي GND', en: 'Cathode — GND', fr: 'Cathode — GND' } },
    ],
    wiringNote: {
      ar: 'استخدم مقاومة 220Ω لتثبيت التيار عند ~13mA وإطالة عمر الـ LED.',
      en: 'A 220Ω series resistor sets current near ~13 mA for crisp visibility and long diode life.',
      fr: 'Une résistance de 220Ω fixe le courant autour de 13 mA.',
    },
    codeExample: 'digitalWrite(12, HIGH);',
    keywords: ['led', 'yellow', 'amber', 'traffic', 'أصفر', 'مصباح', 'jaune'],
  },
  {
    kind: 'resistor-220',
    category: 'passives',
    swatch: '#d97706',
    partNumber: 'CFR-25JB-220R',
    packageType: 'Axial · 1/4W Carbon Film',
    name: { ar: 'مقاومة 220Ω', en: '220Ω Resistor', fr: 'Résistance 220Ω' },
    summary: {
      ar: 'مقاومة كربونية قياسية للحد من التيار وحماية مصابيح LED على جهد 5V.',
      en: 'Standard 1/4W current-limiting resistor — the go-to protection resistor for 5V Arduino LEDs.',
      fr: 'Résistance film carbone 1/4W standard pour limiter le courant des LED sous 5V.',
    },
    operatingVoltage: '250 V max working',
    currentRating: '250 mW (1/4 W)',
    specs: [
      { label: { ar: 'القيمة الأومية', en: 'Resistance', fr: 'Résistance' }, value: '220 Ω (±5%)' },
      { label: { ar: 'أشرطة الألوان', en: 'Color Code', fr: 'Code couleurs' }, value: 'Red · Red · Brown · Gold' },
      { label: { ar: 'القدرة الحرارية', en: 'Power Rating', fr: 'Puissance' }, value: '0.25 W @ 70°C' },
      { label: { ar: 'القطبية', en: 'Polarity', fr: 'Polarité' }, value: 'Non-polarized' },
    ],
    pinout: [
      { pin: '1', role: 'passive', desc: { ar: 'الطرف 1 — غير مستقطب', en: 'Terminal 1 — bi-directional', fr: 'Borne 1 — non polarisée' } },
      { pin: '2', role: 'passive', desc: { ar: 'الطرف 2 — غير مستقطب', en: 'Terminal 2 — bi-directional', fr: 'Borne 2 — non polarisée' } },
    ],
    wiringNote: {
      ar: 'لا تمتلك قطبية؛ يمكن توصيلها بين المنفذ الرقمي وقطب LED (+) أو بين (-) وGND.',
      en: 'Non-polarized: works identically on either the anode or cathode side of an LED.',
      fr: 'Non polarisée : se place indifféremment côté anode ou cathode.',
    },
    codeExample: '// Hardware passive: I = (5V - 2V) / 220Ω ≈ 13.6 mA',
    keywords: ['resistor', '220', 'ohm', 'passive', 'مقاومة', 'حماية', 'résistance'],
  },
  {
    kind: 'resistor-1k',
    category: 'passives',
    swatch: '#b45309',
    partNumber: 'CFR-25JB-1K0',
    packageType: 'Axial · 1/4W Carbon Film',
    name: { ar: 'مقاومة 1kΩ', en: '1kΩ Resistor', fr: 'Résistance 1kΩ' },
    summary: {
      ar: 'مقاومة متوسطة القيمة لحماية المداخل وتقسيم الجهد وتيارات القاعدة.',
      en: 'General-purpose 1 kΩ resistor for signal limiting, low-current LEDs, and voltage dividers.',
      fr: 'Résistance polyvalente 1 kΩ pour limitation de signal et ponts diviseurs.',
    },
    operatingVoltage: '250 V max working',
    currentRating: '250 mW (1/4 W)',
    specs: [
      { label: { ar: 'القيمة الأومية', en: 'Resistance', fr: 'Résistance' }, value: '1,000 Ω (±5%)' },
      { label: { ar: 'أشرطة الألوان', en: 'Color Code', fr: 'Code couleurs' }, value: 'Brown · Black · Red · Gold' },
      { label: { ar: 'القدرة الحرارية', en: 'Power Rating', fr: 'Puissance' }, value: '0.25 W' },
      { label: { ar: 'التيار عند 5V', en: 'Current @ 5V', fr: 'Courant @ 5V' }, value: '5.0 mA' },
    ],
    pinout: [
      { pin: '1', role: 'passive', desc: { ar: 'الطرف 1 — غير مستقطب', en: 'Terminal 1 — bi-directional', fr: 'Borne 1 — non polarisée' } },
      { pin: '2', role: 'passive', desc: { ar: 'الطرف 2 — غير مستقطب', en: 'Terminal 2 — bi-directional', fr: 'Borne 2 — non polarisée' } },
    ],
    wiringNote: {
      ar: 'مثالية كحماية للتيار المنخفض أو لبناء مقسمات جهد بسيطة مع الحساسات.',
      en: 'Ideal for input protection, transistor base drive, and simple resistor divider networks.',
      fr: 'Idéale pour la protection d’entrée et les ponts diviseurs.',
    },
    codeExample: '// Voltage divider: Vout = Vin * R2 / (R1 + R2)',
    keywords: ['resistor', '1k', '1000', 'ohm', 'passive', 'مقاومة', 'résistance'],
  },
  {
    kind: 'resistor-10k',
    category: 'passives',
    swatch: '#92400e',
    partNumber: 'CFR-25JB-10K',
    packageType: 'Axial · 1/4W Carbon Film',
    name: { ar: 'مقاومة 10kΩ', en: '10kΩ Resistor', fr: 'Résistance 10kΩ' },
    summary: {
      ar: 'مقاومة سحب قياسية (Pull-up / Pull-down) للأزرار الضاغطة وحساسات LDR.',
      en: 'Classic 10 kΩ pull-up / pull-down resistor for tactile pushbuttons and LDR voltage dividers.',
      fr: 'Résistance classique 10 kΩ pour pull-up / pull-down de boutons et diviseurs LDR.',
    },
    operatingVoltage: '250 V max working',
    currentRating: '250 mW (1/4 W)',
    specs: [
      { label: { ar: 'القيمة الأومية', en: 'Resistance', fr: 'Résistance' }, value: '10,000 Ω (±5%)' },
      { label: { ar: 'أشرطة الألوان', en: 'Color Code', fr: 'Code couleurs' }, value: 'Brown · Black · Orange · Gold' },
      { label: { ar: 'التيار عند 5V', en: 'Current @ 5V', fr: 'Courant @ 5V' }, value: '0.5 mA' },
      { label: { ar: 'الاستخدام الأشهر', en: 'Primary Role', fr: 'Usage principal' }, value: 'Pull-up / Pull-down' },
    ],
    pinout: [
      { pin: '1', role: 'passive', desc: { ar: 'الطرف 1 — غير مستقطب', en: 'Terminal 1 — bi-directional', fr: 'Borne 1 — non polarisée' } },
      { pin: '2', role: 'passive', desc: { ar: 'الطرف 2 — غير مستقطب', en: 'Terminal 2 — bi-directional', fr: 'Borne 2 — non polarisée' } },
    ],
    wiringNote: {
      ar: 'تمنع تذبذب المداخل الرقمية العائمة (Floating Pins) عند توصيلها مع الأزرار.',
      en: 'Prevents floating digital inputs by holding unpressed button pins cleanly at GND or 5V.',
      fr: 'Évite les entrées flottantes en fixant un état logique stable.',
    },
    codeExample: 'pinMode(2, INPUT); // External 10kΩ pull-down',
    keywords: ['resistor', '10k', 'pullup', 'pulldown', 'ohm', 'مقاومة', 'résistance'],
  },
  {
    kind: 'button',
    category: 'inputs',
    swatch: '#64748b',
    partNumber: 'TACT-6X6-SPST',
    packageType: '6×6 mm Tactile Switch',
    name: { ar: 'زر ضاغط لحظي', en: 'Tactile Pushbutton', fr: 'Bouton Poussoir' },
    summary: {
      ar: 'مفتاح ميكانيكي لحظي (Normally Open) لإرسال إشارات إدخال رقمية للأردوينو.',
      en: 'Momentary SPST normally-open tactile switch for digital user input, interrupts, and mode toggles.',
      fr: 'Interrupteur tactile momentané SPST (normalement ouvert) pour entrées numériques.',
    },
    operatingVoltage: '5V Logic (12V max)',
    currentRating: '50 mA max contact',
    specs: [
      { label: { ar: 'نوع التلامس', en: 'Switch Action', fr: 'Type de contact' }, value: 'Momentary SPST-NO' },
      { label: { ar: 'نمط الإدخال الموصى به', en: 'Recommended Mode', fr: 'Mode recommandé' }, value: 'INPUT_PULLUP' },
      { label: { ar: 'زمن الارتداد', en: 'Contact Bounce', fr: 'Rebond contact' }, value: '< 10 ms' },
      { label: { ar: 'العمر الميكانيكي', en: 'Mechanical Life', fr: 'Durée de vie' }, value: '100,000 cycles' },
    ],
    pinout: [
      { pin: 'SIG', role: 'signal', desc: { ar: 'الإشارة — إلى منفذ رقمي مثل D2', en: 'Signal — connect to digital input (e.g. D2)', fr: 'Signal — vers broche numérique (ex. D2)' } },
      { pin: 'GND', role: 'gnd', desc: { ar: 'الأرضي — إلى GND مع INPUT_PULLUP', en: 'Ground — connect to GND for active-LOW', fr: 'Masse — vers GND avec INPUT_PULLUP' } },
    ],
    wiringNote: {
      ar: 'مع INPUT_PULLUP تكون القراءة LOW عند الضغط وHIGH عند الإفلات دون الحاجة لمقاومة خارجية.',
      en: 'With INPUT_PULLUP enabled, digitalRead() returns LOW when pressed and HIGH when released.',
      fr: 'Avec INPUT_PULLUP, digitalRead() renvoie LOW lorsque le bouton est appuyé.',
    },
    codeExample: 'pinMode(2, INPUT_PULLUP);\nif (digitalRead(2) == LOW) { /* pressed */ }',
    keywords: ['button', 'switch', 'tactile', 'input', 'pullup', 'زر', 'مفتاح', 'bouton'],
  },
  {
    kind: 'potentiometer',
    category: 'inputs',
    swatch: '#0284c7',
    partNumber: 'B10K-LIN-ROTARY',
    packageType: '3-Pin Rotary Pot (10kΩ)',
    name: { ar: 'مقاومة متغيرة 10kΩ', en: '10kΩ Potentiometer', fr: 'Potentiomètre 10kΩ' },
    summary: {
      ar: 'مقسّم جهد خطي دوار يخرج جهداً مستمراً بين 0V و5V للمنافذ التماثلية A0–A5.',
      en: 'Linear-taper 10 kΩ rotary voltage divider outputting 0–5 V analog signals to pins A0–A5.',
      fr: 'Diviseur de tension rotatif linéaire 10 kΩ délivrant 0–5 V vers les broches A0–A5.',
    },
    operatingVoltage: '0 – 5 V DC',
    currentRating: '0.5 mA @ 5V (0.2 W max)',
    specs: [
      { label: { ar: 'المقاومة الكلية', en: 'Total Resistance', fr: 'Résistance totale' }, value: '10 kΩ Linear (B-Taper)' },
      { label: { ar: 'مدى قراءة ADC', en: 'Arduino ADC Range', fr: 'Plage ADC Arduino' }, value: '0 – 1023 (10-bit)' },
      { label: { ar: 'زاوية الدوران', en: 'Rotation Angle', fr: 'Angle de rotation' }, value: '270° ± 5°' },
      { label: { ar: 'دقة الجهد', en: 'Step Resolution', fr: 'Résolution' }, value: '4.88 mV / step' },
    ],
    pinout: [
      { pin: '5V', role: 'vcc', desc: { ar: 'الطرف العلوي — تغذية 5V', en: 'Outer track — connect to 5V', fr: 'Borne piste — vers 5V' } },
      { pin: 'SIG', role: 'signal', desc: { ar: 'الماسح الأوسط (Wiper) — إلى منفذ تماثلي A0..A5', en: 'Center wiper — connect to analog pin A0–A5', fr: 'Curseur central — vers entrée analogique A0–A5' } },
      { pin: 'GND', role: 'gnd', desc: { ar: 'الطرف السفلي — الأرضي GND', en: 'Outer track — connect to GND', fr: 'Borne piste — vers GND' } },
    ],
    wiringNote: {
      ar: 'استخدم دالة map(val, 0, 1023, 0, 180) لتحويل القراءة مباشرة لزاوية سيرفو أو سطوع PWM.',
      en: 'Use map(analogRead(A0), 0, 1023, 0, 255) to scale wiper readings for PWM or servo angles.',
      fr: 'Utilisez map() pour convertir la valeur 0–1023 en angle servo ou PWM.',
    },
    codeExample: 'int val = analogRead(A0);\nint angle = map(val, 0, 1023, 0, 180);',
    keywords: ['potentiometer', 'pot', 'knob', 'analog', 'adc', 'a0', 'مقاومة متغيرة', 'potentiomètre'],
  },
  {
    kind: 'ldr',
    category: 'sensors',
    swatch: '#ca8a04',
    partNumber: 'GL5528-LDR-MOD',
    packageType: '5mm CdS Photoresistor',
    name: { ar: 'حساس الضوء LDR', en: 'LDR Light Sensor', fr: 'Capteur Lumière LDR' },
    summary: {
      ar: 'مقاومة ضوئية تتغير قيمتها حسب شدة الإضاءة المحيطة لأنظمة الإنارة التلقائية.',
      en: 'Cadmium-sulfide photoresistor module whose output tracks ambient light intensity for automatic night lights.',
      fr: 'Photorésistance CdS mesurant la luminosité ambiante pour éclairage automatique.',
    },
    operatingVoltage: '3.3 – 5 V DC',
    currentRating: '< 5 mA',
    specs: [
      { label: { ar: 'طيف الحساسية', en: 'Spectral Peak', fr: 'Pic spectral' }, value: '540 nm (Visible)' },
      { label: { ar: 'مقاومة الإضاءة (10 lux)', en: 'Light Resistance', fr: 'Résistance lumière' }, value: '8 – 20 kΩ' },
      { label: { ar: 'مقاومة الظلام', en: 'Dark Resistance', fr: 'Résistance obscurité' }, value: '≥ 1 MΩ' },
      { label: { ar: 'زمن الاستجابة', en: 'Response Time', fr: 'Temps de réponse' }, value: '20 – 30 ms' },
    ],
    pinout: [
      { pin: '5V', role: 'vcc', desc: { ar: 'التغذية الموجبة 5V', en: 'Power supply 5V', fr: 'Alimentation 5V' } },
      { pin: 'SIG', role: 'signal', desc: { ar: 'خرج تماثلي — إلى منفذ A0..A5', en: 'Analog light level output — A0–A5', fr: 'Sortie analogique — broche A0–A5' } },
      { pin: 'GND', role: 'gnd', desc: { ar: 'الأرضي GND', en: 'Ground reference', fr: 'Masse GND' } },
    ],
    wiringNote: {
      ar: 'حرّك منزلق الإضاءة أسفل الرقعة لاختبار عتبة الظلام والضوء مباشرة أثناء المحاكاة.',
      en: 'Adjust the live sensor slider below the breadboard during simulation to test dark/light thresholds.',
      fr: 'Ajustez le curseur sous la plaque pendant la simulation pour tester les seuils.',
    },
    codeExample: 'int light = analogRead(A0);\nif (light < 400) digitalWrite(13, HIGH);',
    keywords: ['ldr', 'light', 'photoresistor', 'sensor', 'lux', 'ضوء', 'حساس', 'lumière'],
  },
  {
    kind: 'ultrasonic',
    category: 'sensors',
    swatch: '#0d9488',
    partNumber: 'HC-SR04',
    packageType: '4-Pin Ultrasonic Module',
    name: { ar: 'حساس المسافة HC-SR04', en: 'HC-SR04 Ultrasonic', fr: 'Capteur HC-SR04' },
    summary: {
      ar: 'حساس موجات فوق صوتية 40kHz يقيس المسافة بدقة من 2 سم حتى 400 سم.',
      en: '40 kHz sonar ranging module measuring non-contact distance from 2 cm to 400 cm via time-of-flight.',
      fr: 'Module sonar 40 kHz mesurant la distance sans contact de 2 cm à 400 cm.',
    },
    operatingVoltage: '5.0 V DC',
    currentRating: '15 mA working (< 2 mA idle)',
    specs: [
      { label: { ar: 'مدى القياس', en: 'Measuring Range', fr: 'Portée' }, value: '2 – 400 cm' },
      { label: { ar: 'دقة القياس', en: 'Ranging Accuracy', fr: 'Précision' }, value: '± 3 mm' },
      { label: { ar: 'التردد الصوتي', en: 'Acoustic Freq', fr: 'Fréquence' }, value: '40 kHz (10 µs TRIG)' },
      { label: { ar: 'زاوية الكشف', en: 'Measuring Angle', fr: 'Angle de mesure' }, value: '15° Cone' },
    ],
    pinout: [
      { pin: 'VCC', role: 'vcc', desc: { ar: 'تغذية 5V مستقرة', en: '5V regulated supply', fr: 'Alimentation 5V' } },
      { pin: 'TRIG', role: 'signal', desc: { ar: 'نبضة إرسال 10µs من منفذ رقمي', en: '10 µs trigger pulse input from digital pin', fr: 'Impulsion TRIG 10 µs depuis broche numérique' } },
      { pin: 'ECHO', role: 'signal', desc: { ar: 'نبضة الاستقبال تُقرأ بـ pulseIn()', en: 'Echo pulse width output — read via pulseIn()', fr: 'Sortie ECHO mesurée avec pulseIn()' } },
      { pin: 'GND', role: 'gnd', desc: { ar: 'الأرضي المشترك GND', en: 'Common GND', fr: 'Masse commune GND' } },
    ],
    wiringNote: {
      ar: 'احسب المسافة بالسنتيمتر بالمعادلة: distance = duration * 0.034 / 2.',
      en: 'Convert echo pulse duration (µs) to centimeters using: cm = duration * 0.034 / 2.',
      fr: 'Convertissez la durée en cm avec : cm = duration * 0.034 / 2.',
    },
    codeExample: 'long dur = pulseIn(echoPin, HIGH);\nint cm = dur * 0.034 / 2;',
    keywords: ['ultrasonic', 'sonar', 'hc-sr04', 'distance', 'radar', 'مسافة', 'سونار', 'ultrason'],
  },
  {
    kind: 'servo',
    category: 'outputs',
    swatch: '#2563eb',
    partNumber: 'SG90-MICRO-9G',
    packageType: '9g Micro Servo · 3-Wire',
    name: { ar: 'محرك سيرفو SG90', en: 'SG90 Micro Servo', fr: 'Servomoteur SG90' },
    summary: {
      ar: 'محرك تحكم زاوي دقيق (0° إلى 180°) للروبوتات والبوابات الذكية والرادار.',
      en: 'Compact 9g geared micro servo with closed-loop 0°–180° angular positioning via 50 Hz PWM pulses.',
      fr: 'Micro-servomoteur 9g à positionnement angulaire précis 0°–180° par signal PWM 50 Hz.',
    },
    operatingVoltage: '4.8 – 6.0 V DC',
    currentRating: '100–250 mA (650 mA stall)',
    specs: [
      { label: { ar: 'نطاق الزاوية', en: 'Rotation Range', fr: 'Course angulaire' }, value: '0° – 180°' },
      { label: { ar: 'عزم الدوران', en: 'Stall Torque', fr: 'Couple de blocage' }, value: '1.8 kg·cm @ 4.8V' },
      { label: { ar: 'عرض نبضة التحكم', en: 'PWM Pulse Width', fr: 'Largeur PWM' }, value: '1.0 – 2.0 ms (50 Hz)' },
      { label: { ar: 'السرعة', en: 'Operating Speed', fr: 'Vitesse' }, value: '0.10 s / 60°' },
    ],
    pinout: [
      { pin: 'GND', role: 'gnd', desc: { ar: 'السلك البني — الأرضي GND', en: 'Brown wire — GND', fr: 'Fil marron — GND' } },
      { pin: '5V', role: 'vcc', desc: { ar: 'السلك الأحمر — تغذية 5V', en: 'Red wire — 5V power', fr: 'Fil rouge — alimentation 5V' } },
      { pin: 'PWM', role: 'signal', desc: { ar: 'السلك البرتقالي — إشارة PWM مثل D9', en: 'Orange wire — PWM control pin (e.g. D9)', fr: 'Fil orange — signal PWM (ex. D9)' } },
    ],
    wiringNote: {
      ar: 'توصيل المنفذ PWM بأحد منافذ ~9 أو ~10 مع مكتبة Servo.h يمنحك حركة زاوية سلسة.',
      en: 'Attach the PWM signal pin to D9 or D10 using Servo.h for smooth, jitter-free rotation.',
      fr: 'Reliez PWM à D9 ou D10 avec la bibliothèque Servo.h.',
    },
    codeExample: '#include <Servo.h>\nServo s; s.attach(9); s.write(90);',
    keywords: ['servo', 'sg90', 'motor', 'pwm', 'angle', 'robot', 'سيرفو', 'محرك', 'servomoteur'],
  },
  {
    kind: 'buzzer',
    category: 'outputs',
    swatch: '#334155',
    partNumber: 'PKM17EPP-PIEZO',
    packageType: '12mm Passive Piezo',
    name: { ar: 'جرس Piezo صوتي', en: 'Piezo Buzzer', fr: 'Buzzer Piezo' },
    summary: {
      ar: 'محوّل صوتي كهرضغطي لتوليد النغمات الموسيقية وصفارات الإنذار عبر tone().',
      en: 'Passive piezoelectric transducer driven by square-wave frequencies via Arduino tone() for alarms and melodies.',
      fr: 'Transducteur piézoélectrique passif piloté par tone() pour alarmes et mélodies.',
    },
    operatingVoltage: '3.0 – 5.0 V Square Wave',
    currentRating: '< 10 mA',
    specs: [
      { label: { ar: 'نطاق التردد', en: 'Frequency Range', fr: 'Plage de fréquence' }, value: '100 Hz – 5 kHz' },
      { label: { ar: 'تردد الرنين', en: 'Resonant Freq', fr: 'Fréquence résonance' }, value: '2.7 kHz ± 300 Hz' },
      { label: { ar: 'مستوى الصوت', en: 'Sound Output', fr: 'Niveau sonore' }, value: '≥ 85 dB @ 10 cm' },
      { label: { ar: 'التحكم البرمجي', en: 'Drive Function', fr: 'Commande' }, value: 'tone(pin, freq, ms)' },
    ],
    pinout: [
      { pin: '+', role: 'signal', desc: { ar: 'القطب الموجب (+) — إلى منفذ رقمي مثل D8', en: 'Positive (+) — connect to digital pin (e.g. D8)', fr: 'Positif (+) — vers broche numérique (ex. D8)' } },
      { pin: '-', role: 'gnd', desc: { ar: 'القطب السالب (-) — إلى الأرضي GND', en: 'Negative (-) — connect to GND', fr: 'Négatif (-) — vers GND' } },
    ],
    wiringNote: {
      ar: 'استخدم noTone(pin) لإيقاف الصوت، وتأكد من تفعيل الصوت في شريط المنصة لسماع النغمات.',
      en: 'Call noTone(pin) to silence continuous tones; audio plays live through the simulator sound engine.',
      fr: 'Appelez noTone(pin) pour couper le son ; l’audio est synthétisé en direct.',
    },
    codeExample: 'tone(8, 440, 300); // A4 note\nnoTone(8);',
    keywords: ['buzzer', 'piezo', 'sound', 'tone', 'alarm', 'speaker', 'جرس', 'صوت', 'alarme'],
  },
  {
    kind: 'temp-sensor',
    category: 'sensors',
    swatch: '#475569',
    partNumber: 'TMP36GZ',
    packageType: 'TO-92 · 3-Pin Linear',
    name: { ar: 'حساس الحرارة TMP36', en: 'TMP36 Temp Sensor', fr: 'Capteur Temp TMP36' },
    summary: {
      ar: 'حساس حرارة خطي يخرج 10mV لكل درجة مئوية مع إزاحة 500mV لقياس الحرارة السالبة.',
      en: 'Precision low-voltage linear temperature sensor outputting 10 mV/°C with a 500 mV offset for sub-zero readings.',
      fr: 'Capteur de température linéaire délivrant 10 mV/°C avec un décalage de 500 mV.',
    },
    operatingVoltage: '2.7 – 5.5 V DC',
    currentRating: '< 50 µA (0.05 mA)',
    specs: [
      { label: { ar: 'نطاق الحرارة', en: 'Temp Range', fr: 'Plage thermique' }, value: '-40°C to +125°C' },
      { label: { ar: 'معامل المقياس', en: 'Scale Factor', fr: 'Sensibilité' }, value: '10 mV / °C' },
      { label: { ar: 'الدقة النموذجية', en: 'Accuracy', fr: 'Précision' }, value: '± 1°C @ 25°C' },
      { label: { ar: 'جهد 25°C', en: 'Output @ 25°C', fr: 'Sortie @ 25°C' }, value: '750 mV' },
    ],
    pinout: [
      { pin: '5V', role: 'vcc', desc: { ar: 'تغذية 5V (الطرف الأيسر)', en: '5V supply (left pin)', fr: 'Alimentation 5V (broche gauche)' } },
      { pin: 'OUT', role: 'signal', desc: { ar: 'خرج الجهد التماثلي — إلى A0..A5', en: 'Linear analog voltage out — A0–A5', fr: 'Sortie analogique linéaire — A0–A5' } },
      { pin: 'GND', role: 'gnd', desc: { ar: 'الأرضي GND (الطرف الأيمن)', en: 'Ground (right pin)', fr: 'Masse GND (broche droite)' } },
    ],
    wiringNote: {
      ar: 'معادلة التحويل الدقيقة: tempC = ((analogRead(A0) * 5.0 / 1024.0) - 0.5) * 100.0.',
      en: 'Convert ADC reading to °C with: tempC = ((analogRead(A0) * 5.0 / 1024.0) - 0.5) * 100.0.',
      fr: 'Conversion en °C : tempC = ((analogRead(A0) * 5.0 / 1024.0) - 0.5) * 100.0.',
    },
    codeExample: 'float v = analogRead(A0) * (5.0 / 1024.0);\nfloat tempC = (v - 0.5) * 100.0;',
    keywords: ['temp', 'temperature', 'tmp36', 'thermal', 'sensor', 'celsius', 'حرارة', 'حساس', 'température'],
  },
];
