import type { LocalizedText } from '../i18n/translations';

export interface BoardPartSpec {
  id: string;
  category: 'mcu' | 'power' | 'io' | 'clock' | 'interface' | 'indicator';
  name: LocalizedText;
  subtitle: LocalizedText;
  voltage: string;
  specs: LocalizedText[];
  description: LocalizedText;
  focusCamera: [number, number, number];
  focusTarget: [number, number, number];
}

export const BOARD_PARTS: Record<string, BoardPartSpec> = {
  atmega328p: {
    id: 'atmega328p',
    category: 'mcu',
    name: {
      ar: 'المتحكم الدقيق ATmega328P',
      en: 'ATmega328P Microcontroller',
      fr: 'Microcontrôleur ATmega328P',
    },
    subtitle: {
      ar: 'العقل المدبر للوحة — معمارية 8-bit AVR',
      en: 'Brain of the Uno R3 — 8-bit AVR DIP-28',
      fr: 'Cerveau de la Uno R3 — 8-bit AVR DIP-28',
    },
    voltage: '5V DC (1.8V–5.5V)',
    specs: [
      { ar: 'ذاكرة Flash: 32 كيلوبايت (0.5 KB للـ Bootloader)', en: 'Flash Memory: 32 KB (0.5 KB bootloader)', fr: 'Mémoire Flash : 32 Ko (0,5 Ko bootloader)' },
      { ar: 'ذاكرة SRAM: 2 كيلوبايت | EEPROM: 1 كيلوبايت', en: 'SRAM: 2 KB | EEPROM: 1 KB', fr: 'SRAM : 2 Ko | EEPROM : 1 Ko' },
      { ar: 'سرعة المعالجة: 16 ميجاهرتز (16 MIPS)', en: 'Clock Speed: 16 MHz (up to 16 MIPS)', fr: 'Fréquence : 16 MHz (16 MIPS)' },
    ],
    description: {
      ar: 'ينفذ تعليمات كود C++ المترجم سطراً بسطر داخل دالتي setup() و loop() ويتحكم بجميع المنافذ الرقمية والتناظرية.',
      en: 'Executes your compiled Arduino C++ firmware inside setup() and loop(), managing all digital, PWM, and ADC peripherals.',
      fr: 'Exécute votre programme C++ compilé dans setup() et loop(), contrôlant toutes les broches numériques, PWM et analogiques.',
    },
    focusCamera: [1.2, 3.6, 2.8],
    focusTarget: [0.55, 0.25, 0.55],
  },
  crystal: {
    id: 'crystal',
    category: 'clock',
    name: {
      ar: 'مذبذب الكريستال 16MHz',
      en: '16 MHz Quartz Crystal Oscillator',
      fr: 'Oscillateur Quartz 16 MHz',
    },
    subtitle: {
      ar: 'نبض الساعة المرجعي الدقيق',
      en: 'Precision Master Clock Reference',
      fr: 'Référence d’horloge principale',
    },
    voltage: '5V CMOS Clock',
    specs: [
      { ar: 'التردد: 16,000,000 نبضة في الثانية', en: 'Frequency: 16,000,000 cycles/second', fr: 'Fréquence : 16 000 000 cycles/seconde' },
      { ar: 'يغذي مؤقتات delay() و millis() و PWM', en: 'Drives delay(), millis(), and hardware PWM timers', fr: 'Pilote delay(), millis() et les timers PWM' },
    ],
    description: {
      ar: 'يوفر إشارة تزامن بالغة الدقة لمعالج ATmega328P لضمان دقة التوقيت والاتصال التسلسلي UART.',
      en: 'Generates an accurate 16 MHz heartbeat so timing functions like delay(), millis(), and Serial baud rates remain exact.',
      fr: 'Génère une impulsion précise à 16 MHz garantissant la fiabilité de delay(), millis() et des débits série.',
    },
    focusCamera: [-0.8, 3.2, 2.2],
    focusTarget: [-0.85, 0.22, 0.35],
  },
  regulator: {
    id: 'regulator',
    category: 'power',
    name: {
      ar: 'منظم الجهد 5V (NCP1117)',
      en: '5V Linear Voltage Regulator (NCP1117)',
      fr: 'Régulateur de tension 5V (NCP1117)',
    },
    subtitle: {
      ar: 'تثبيت الطاقة الداخلة من منفذ DC',
      en: 'Stabilizes External 7–12V DC Power',
      fr: 'Stabilise l’alimentation externe 7–12V DC',
    },
    voltage: 'Input 7–12V → Output 5.0V',
    specs: [
      { ar: 'تيار أقصى مستمر: 800mA مع حماية حرارية', en: 'Max current: ~800 mA with thermal shutdown', fr: 'Courant max : ~800 mA avec protection thermique' },
      { ar: 'مقترن بمكثفات تنعيم 47µF لمنع التشويش', en: 'Paired with dual 47µF electrolytic filter caps', fr: 'Associé à deux condensateurs de filtrage 47µF' },
    ],
    description: {
      ar: 'يحوّل الجهد القادم من المحول الخارجي (7–12 فولت) إلى 5 فولت مستقرة لحماية المعالج والمكونات الحساسة.',
      en: 'Steps down external 7–12V DC input from the barrel jack or VIN pin into a clean, regulated 5V rail for the board.',
      fr: 'Abaisse la tension externe (7–12V) en un rail 5V propre et stabilisé pour protéger le microcontrôleur.',
    },
    focusCamera: [-2.4, 3.1, 2.4],
    focusTarget: [-1.85, 0.25, 0.85],
  },
  reset: {
    id: 'reset',
    category: 'interface',
    name: {
      ar: 'زر إعادة التشغيل (Reset)',
      en: 'Hardware Reset Pushbutton',
      fr: 'Bouton de réinitialisation (Reset)',
    },
    subtitle: {
      ar: 'إعادة تشغيل البرنامج من البداية',
      en: 'Restarts Sketch Execution from setup()',
      fr: 'Redémarre le programme depuis setup()',
    },
    voltage: 'Active LOW (Pull-up 10kΩ)',
    specs: [
      { ar: 'متصل بدبوس RESET على المعالج', en: 'Pulls ATmega328P Pin 1 (RESET) to GND when pressed', fr: 'Relie la broche RESET à GND lors de l’appui' },
      { ar: 'لا يمسح الكود المخزن في ذاكرة Flash', en: 'Preserves Flash sketch memory; clears RAM', fr: 'Conserve le code en Flash ; efface la RAM' },
    ],
    description: {
      ar: 'عند الضغط عليه يعيد تصفير المتغيرات وتشغيل دالة setup() فوراً دون الحاجة لفصل الطاقة.',
      en: 'Momentarily pulls the microcontroller RESET line LOW, restarting your sketch cleanly from setup() without unplugging USB.',
      fr: 'Met temporairement la ligne RESET à LOW pour redémarrer votre programme proprement sans débrancher l’USB.',
    },
    focusCamera: [-2.8, 3.0, -2.0],
    focusTarget: [-2.3, 0.3, -1.25],
  },
  usb: {
    id: 'usb',
    category: 'interface',
    name: {
      ar: 'منفذ USB Type-B',
      en: 'USB Type-B Programming & Power Port',
      fr: 'Port USB Type-B (Programmation & Alim)',
    },
    subtitle: {
      ar: 'رفع الكود والاتصال التسلسلي وتغذية 5V',
      en: 'Firmware Upload, Serial Monitor & 5V Supply',
      fr: 'Téléversement, Moniteur Série & 5V',
    },
    voltage: '5V DC (500mA Fuse Protected)',
    specs: [
      { ar: 'محمي بفيوز حراري قابل للاستعادة 500mA', en: '500 mA resettable polyfuse overcurrent protection', fr: 'Fusible réarmable 500 mA contre les surintensités' },
      { ar: 'يعمل عبر شريحة ATmega16U2 كجسر USB-to-Serial', en: 'Bridged via ATmega16U2 USB-to-UART converter', fr: 'Pont USB-UART via puce ATmega16U2' },
    ],
    description: {
      ar: 'يربط اللوحة بالحاسوب لرفع أكواد Arduino IDE واستقبال بيانات المراقب التسلسلي وتوفير طاقة 5V مباشرة.',
      en: 'Connects the Uno R3 to your computer for uploading .ino sketches, streaming Serial Monitor data, and supplying regulated 5V.',
      fr: 'Relie la carte à votre PC pour téléverser les croquis .ino, utiliser le moniteur série et alimenter en 5V.',
    },
    focusCamera: [-4.1, 2.8, -1.2],
    focusTarget: [-2.6, 0.45, -0.75],
  },
  barrel: {
    id: 'barrel',
    category: 'power',
    name: {
      ar: 'منفذ الطاقة الخارجي (DC Barrel Jack)',
      en: 'DC Barrel Power Jack (2.1mm Center-Positive)',
      fr: 'Prise d’alimentation DC (2,1 mm)',
    },
    subtitle: {
      ar: 'تشغيل مستقل عبر بطارية أو محول جداري',
      en: 'Standalone Battery or Wall Adapter Input',
      fr: 'Alimentation autonome par batterie ou adaptateur',
    },
    voltage: '7–12V DC Recommended',
    specs: [
      { ar: 'القطب الداخلي موجب (+) والخارجي سالب (-)', en: '2.1mm center-positive polarity with diode guard', fr: 'Polarité centre positif avec diode de protection' },
      { ar: 'الحدود المسموحة: 6V إلى 20V (الأمثل 9V)', en: 'Limits: 6–20V (9V DC recommended)', fr: 'Limites : 6–20V (9V DC recommandé)' },
    ],
    description: {
      ar: 'يسمح بتشغيل مشاريعك بشكل مستقل بدون حاسوب باستخدام بطارية 9V أو محول طاقة خارجي.',
      en: 'Powers your Arduino project standalone without a computer using a 9V battery pack or external DC adapter.',
      fr: 'Permet de faire fonctionner vos projets de façon autonome sans ordinateur via une pile 9V ou un adaptateur.',
    },
    focusCamera: [-4.0, 2.8, 2.1],
    focusTarget: [-2.55, 0.4, 1.05],
  },
  digital: {
    id: 'digital',
    category: 'io',
    name: {
      ar: 'المنافذ الرقمية (D0 – D13) ومنافذ PWM (~)',
      en: 'Digital I/O Pins (D0–D13) & PWM (~)',
      fr: 'Broches Numériques (D0–D13) & PWM (~)',
    },
    subtitle: {
      ar: '14 منفذاً رقمياً منها 6 تدعم تعديل عرض النبضة PWM',
      en: '14 Digital Pins — 6 Hardware PWM Channels (~3, ~5, ~6, ~9, ~10, ~11)',
      fr: '14 Broches Numériques — 6 Canaux PWM (~3, ~5, ~6, ~9, ~10, ~11)',
    },
    voltage: '5V Logic (20mA recommended / 40mA max)',
    specs: [
      { ar: 'منافذ PWM (~): D3, D5, D6, D9, D10, D11 (8-bit: 0–255)', en: 'PWM (~): D3, D5, D6, D9, D10, D11 (0–255 duty cycle)', fr: 'PWM (~) : D3, D5, D6, D9, D10, D11 (0–255)' },
      { ar: 'D0 (RX) و D1 (TX) للاتصال التسلسلي UART', en: 'D0 (RX) & D1 (TX) for hardware Serial UART', fr: 'D0 (RX) & D1 (TX) pour la liaison série UART' },
      { ar: 'D13 متصل بمصباح L المدمج على اللوحة', en: 'D13 drives the built-in amber LED (L)', fr: 'D13 pilote la LED ambre intégrée (L)' },
    ],
    description: {
      ar: 'تقرأ وتكتب إشارات رقمية (HIGH = 5V / LOW = 0V)، والمنافذ المعلّمة بـ (~) تولّد إشارات PWM لتدريج الإضاءة وتحريك السيرفو.',
      en: 'Read and write binary HIGH (5V) / LOW (0V) signals. Pins marked with (~) output hardware PWM waves for dimming LEDs and controlling motors.',
      fr: 'Lisent et écrivent des états logiques HIGH (5V) / LOW (0V). Les broches marquées (~) génèrent des signaux PWM.',
    },
    focusCamera: [0.4, 3.8, -3.6],
    focusTarget: [0.4, 0.35, -1.55],
  },
  analog: {
    id: 'analog',
    category: 'io',
    name: {
      ar: 'المداخل التناظرية (A0 – A5)',
      en: 'Analog Input Pins (A0–A5)',
      fr: 'Entrées Analogiques (A0–A5)',
    },
    subtitle: {
      ar: 'محول ADC بدقة 10-bit (قيم من 0 إلى 1023)',
      en: '6 Channels with 10-bit ADC (0–1023 Resolution)',
      fr: '6 Canaux CAN 10 bits (Résolution 0–1023)',
    },
    voltage: '0V – 5V Analog Reference',
    specs: [
      { ar: 'الدقة: 4.88 مللي فولت لكل خطوة (5V / 1024)', en: 'Resolution: 4.88 mV per step (5V / 1024)', fr: 'Résolution : 4,88 mV par pas (5V / 1024)' },
      { ar: 'A4 (SDA) و A5 (SCL) تدعمان بروتوكول I2C', en: 'A4 (SDA) & A5 (SCL) double as hardware I2C bus', fr: 'A4 (SDA) & A5 (SCL) servent aussi de bus I2C' },
    ],
    description: {
      ar: 'تحول الإشارات التناظرية المستمرة من الحساسات (المقاومة المتغيرة، LDR، حساس الحرارة) إلى أرقام دقيقة يقرؤها البرنامج عبر analogRead().',
      en: 'Convert continuous sensor voltages (potentiometers, LDRs, temperature sensors) into 0–1023 integers via analogRead().',
      fr: 'Convertissent les tensions continues des capteurs (potentiomètre, LDR, température) en valeurs 0–1023 via analogRead().',
    },
    focusCamera: [1.8, 3.5, 3.5],
    focusTarget: [1.65, 0.35, 1.55],
  },
  power: {
    id: 'power',
    category: 'power',
    name: {
      ar: 'منافذ الطاقة (3.3V, 5V, GND, VIN)',
      en: 'Power Rail Header (3.3V, 5V, GND, VIN)',
      fr: 'Connecteur d’alimentation (3.3V, 5V, GND, VIN)',
    },
    subtitle: {
      ar: 'تغذية المكونات والحساسات على لوحة التجارب',
      en: 'Regulated Supply Rails for Breadboard Circuits',
      fr: 'Rails de tension régulés pour vos circuits',
    },
    voltage: '5V / 3.3V / 0V (GND) / VIN',
    specs: [
      { ar: '5V: مصدر رئيسي لمعظم الحساسات والمشغلات', en: '5V: Primary regulated rail for sensors & LEDs', fr: '5V : Rail principal régulé pour capteurs et LED' },
      { ar: '3.3V: مصدر منخفض الجهد (حد أقصى 50mA)', en: '3.3V: Low-voltage rail (50 mA max)', fr: '3.3V : Rail basse tension (50 mA max)' },
      { ar: 'GND: المرجع الأرضي المشترك (0V) لإغلاق أي دائرة', en: 'GND: Common 0V ground return for every circuit', fr: 'GND : Masse commune (0V) indispensable à tout circuit' },
    ],
    description: {
      ar: 'توفر الطاقة اللازمة لتشغيل الحساسات واللوحة، ولا تنسَ دائماً إغلاق مسار التيار بالعودة إلى منفذ GND.',
      en: 'Distributes clean 5V and 3.3V power to your breadboard components. Every circuit must share a GND return path.',
      fr: 'Distribue les tensions 5V et 3.3V vers votre plaque d’essai. Tout circuit doit partager une masse GND.',
    },
    focusCamera: [-0.3, 3.5, 3.5],
    focusTarget: [-0.1, 0.35, 1.55],
  },
  led13: {
    id: 'led13',
    category: 'indicator',
    name: {
      ar: 'المصباح المدمج L (D13) ومؤشرات الحالة',
      en: 'Built-in LED (L / D13) & Status Indicators',
      fr: 'LED intégrée (L / D13) & Voyants d’état',
    },
    subtitle: {
      ar: 'اختبار فوري للمنافذ بدون أسلاك خارجية',
      en: 'Instant Hardware Feedback on Pin 13',
      fr: 'Retour visuel instantané sur la broche 13',
    },
    voltage: '5V Buffered via Op-Amp',
    specs: [
      { ar: 'ON (أخضر): يؤكد وصول الطاقة للوحة', en: 'ON (Green): Confirms regulated 5V board power', fr: 'ON (Vert) : Confirme l’alimentation 5V' },
      { ar: 'L (كهرماني): يتبع حالة المنفذ الرقمي D13', en: 'L (Amber): Mirrors Digital Pin 13 state', fr: 'L (Ambre) : Reflète l’état de la broche D13' },
      { ar: 'TX / RX: تومض عند تبادل البيانات عبر USB', en: 'TX / RX: Flicker during Serial UART traffic', fr: 'TX / RX : Clignotent lors des échanges série' },
    ],
    description: {
      ar: 'مثالي لتجربة برنامج Blink الأول، حيث يضيء مباشرة عند كتابة digitalWrite(13, HIGH).',
      en: 'Ideal for running your first Blink sketch right out of the box—lights up immediately when D13 is set HIGH.',
      fr: 'Idéal pour tester votre premier programme Blink dès la mise sous tension grâce à digitalWrite(13, HIGH).',
    },
    focusCamera: [-0.2, 3.2, -2.5],
    focusTarget: [-0.15, 0.25, -0.8],
  },
};
