import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertTriangle,
  Cable,
  Cpu,
  Flame,
  Lightbulb,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  CircuitState,
  ComponentPowerState,
  PlacedComponent,
} from '../../types/arduino';
import { COMPONENT_PINS, isLedKind } from '../../engine/arduinoSim';
import {
  getMultimeterModeFromValue,
  type MultimeterReading,
} from '../../engine/multimeterSolver';
import { COMPONENT_DATASHEETS } from '../../data/componentDatasheets';
import { tLoc, translations, type Language, type LocalizedText } from '../../i18n/translations';
import { cn } from '../../lib/utils';

export type SmartTooltipTarget =
  | { kind: 'component'; compId: string; clientX: number; clientY: number }
  | { kind: 'arduino'; clientX: number; clientY: number };

interface SmartComponentTooltipProps {
  lang: Language;
  target: SmartTooltipTarget | null;
  circuit: CircuitState;
  componentPower: Record<string, ComponentPowerState>;
  pinValues: Record<string, number>;
  servoAngles: Record<string, number>;
  buzzerTone: { pin: string; freq: number } | null;
  running: boolean;
  ledD13On: boolean;
  multimeterReadings?: Record<string, MultimeterReading>;
}

interface PinConnectionSummary {
  pinId: string;
  pinLabel: string;
  peers: string[];
}

interface SmartRoleInsight {
  title: string;
  subtitle: string;
  swatch: string;
  roleBadge: string;
  roleExplanation: string;
  liveStatus: string;
  statusTone: 'teal' | 'emerald' | 'amber' | 'rose' | 'slate';
  metrics: Array<{ label: string; value: string }>;
  connections: PinConnectionSummary[];
  safetyAlert?: { level: 'error' | 'warning'; text: string };
  proTip?: string;
}

const PWM_PINS = new Set(['D3', 'D5', 'D6', 'D9', 'D10', 'D11']);

function loc(text: LocalizedText, lang: Language): string {
  return tLoc(text, lang);
}

function formatPeerNode(nodeId: string, components: PlacedComponent[], lang: Language): string {
  if (nodeId.startsWith('arduino:')) {
    return nodeId.slice('arduino:'.length);
  }
  if (nodeId.startsWith('comp:')) {
    const [, compId, pinId] = nodeId.split(':');
    const peer = components.find((c) => c.id === compId);
    if (!peer) return pinId || nodeId;
    const sheet = COMPONENT_DATASHEETS.find((d) => d.kind === peer.kind);
    const shortName = sheet ? loc(sheet.name, lang) : peer.label || peer.kind;
    return `${shortName} (${pinId})`;
  }
  return nodeId;
}

function buildAdjacency(circuit: CircuitState): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const w of circuit.wires) {
    if (!adj.has(w.from)) adj.set(w.from, new Set());
    if (!adj.has(w.to)) adj.set(w.to, new Set());
    adj.get(w.from)!.add(w.to);
    adj.get(w.to)!.add(w.from);
  }
  return adj;
}

/**
 * Inspects direct wires + 1-hop passive neighbors (e.g. series resistors) to infer
 * what Arduino pins and companion parts a component collaborates with in this exact circuit.
 */
function inspectCircuitContext(comp: PlacedComponent, circuit: CircuitState, lang: Language) {
  const adj = buildAdjacency(circuit);
  const pins = COMPONENT_PINS[comp.kind] || [];

  const connections: PinConnectionSummary[] = [];
  const connectedArduinoPins = new Set<string>();
  const neighborComponents = new Map<string, PlacedComponent>();

  const collectFromNode = (nodeId: string, depth: number) => {
    const peers = adj.get(nodeId);
    if (!peers) return;
    for (const peer of peers) {
      if (peer.startsWith('arduino:')) {
        connectedArduinoPins.add(peer.slice('arduino:'.length));
      } else if (peer.startsWith('comp:')) {
        const [, peerCompId] = peer.split(':');
        if (peerCompId === comp.id) continue;
        const peerComp = circuit.components.find((c) => c.id === peerCompId);
        if (peerComp) {
          neighborComponents.set(peerComp.id, peerComp);
          // Traverse across a series resistor to discover the driving Arduino pin / target part
          if (depth === 0 && peerComp.kind.startsWith('resistor-')) {
            const resPins = COMPONENT_PINS[peerComp.kind] || [];
            for (const rp of resPins) {
              collectFromNode(`comp:${peerComp.id}:${rp.id}`, 1);
            }
          }
        }
      }
    }
  };

  for (const p of pins) {
    const nodeId = `comp:${comp.id}:${p.id}`;
    const directPeers = Array.from(adj.get(nodeId) || []);
    connections.push({
      pinId: p.id,
      pinLabel: p.label,
      peers: directPeers.map((peer) => formatPeerNode(peer, circuit.components, lang)),
    });
    collectFromNode(nodeId, 0);
  }

  const arduinoList = Array.from(connectedArduinoPins);
  const signalPins = arduinoList.filter(
    (p) => !['5V', '3.3V', 'VIN', 'GND1', 'GND2', 'GND3'].includes(p),
  );
  const analogPins = signalPins.filter((p) => p.startsWith('A'));
  const digitalPins = signalPins.filter((p) => p.startsWith('D'));
  const hasGnd = arduinoList.some((p) => p.startsWith('GND'));
  const hasPowerRail = arduinoList.some((p) => p === '5V' || p === '3.3V' || p === 'VIN');
  const neighbors = Array.from(neighborComponents.values());
  const isWired = connections.some((c) => c.peers.length > 0);

  return {
    connections,
    signalPins,
    analogPins,
    digitalPins,
    hasGnd,
    hasPowerRail,
    neighbors,
    isWired,
  };
}

function buildComponentInsight(
  comp: PlacedComponent,
  circuit: CircuitState,
  pwr: ComponentPowerState | undefined,
  pinValues: Record<string, number>,
  servoAngles: Record<string, number>,
  buzzerTone: { pin: string; freq: number } | null,
  running: boolean,
  lang: Language,
  meterReading?: MultimeterReading,
): SmartRoleInsight {
  const sheet = COMPONENT_DATASHEETS.find((d) => d.kind === comp.kind);
  const ctx = inspectCircuitContext(comp, circuit, lang);
  const title = sheet ? loc(sheet.name, lang) : comp.label || comp.kind;
  const subtitle = sheet
    ? `${sheet.partNumber} · ${sheet.operatingVoltage}`
    : comp.kind.toUpperCase();
  const swatch = sheet?.swatch || '#00878F';

  const metrics: Array<{ label: string; value: string }> = [];
  let roleBadge = loc({ ar: 'مكون إلكتروني', en: 'Circuit Part', fr: 'Composant' }, lang);
  let roleExplanation = sheet ? loc(sheet.summary, lang) : '';
  let liveStatus = running
    ? loc({ ar: 'نشط', en: 'Active', fr: 'Actif' }, lang)
    : loc({ ar: 'جاهز للمحاكاة', en: 'Ready', fr: 'Prêt' }, lang);
  let statusTone: SmartRoleInsight['statusTone'] = ctx.isWired ? 'teal' : 'slate';
  let safetyAlert: SmartRoleInsight['safetyAlert'];
  let proTip: string | undefined = sheet ? loc(sheet.wiringNote, lang) : undefined;

  if (pwr?.overload) {
    safetyAlert = {
      level: 'error',
      text: `${loc(pwr.overload.summary, lang)} (${pwr.overload.measuredLabel} > ${pwr.overload.ratedMaxLabel})`,
    };
    statusTone = 'rose';
    liveStatus = loc(translations.simulator.overloadShort, lang);
  } else if (pwr?.warnNoResistor) {
    safetyAlert = {
      level: 'warning',
      text: loc(translations.simulator.noResistorWarn, lang),
    };
    statusTone = 'amber';
  }

  // ---------- 1. LEDs ----------
  if (isLedKind(comp.kind)) {
    roleBadge = loc({ ar: 'مخرج ضوئي (LED)', en: 'Visual Output', fr: 'Sortie Lumineuse' }, lang);
    const drivePin = ctx.digitalPins[0] || ctx.analogPins[0];
    const hasResistor = ctx.neighbors.some((n) => n.kind.startsWith('resistor-'));
    const isPwm = drivePin ? PWM_PINS.has(drivePin) : false;

    if (drivePin) {
      roleExplanation = loc(
        {
          ar: hasResistor
            ? `يعمل كمؤشر ضوئي محكوم عبر المنفذ ${drivePin}${isPwm ? ' (يدعم التعتيم PWM)' : ''} ومَحمي بمقاومة تحديد تيار على التوالي.`
            : `يعمل كمؤشر ضوئي متصل مباشرة بالمنفذ ${drivePin} — يُنصح بإضافة مقاومة 220Ω على التوالي لحمايته من التيار الزائد.`,
          en: hasResistor
            ? `Acts as a status indicator driven by pin ${drivePin}${isPwm ? ' (PWM dimming capable)' : ''}, protected in series by a current-limiting resistor.`
            : `Acts as a visual output wired directly to pin ${drivePin} — add a 220Ω series resistor to limit current safely.`,
          fr: hasResistor
            ? `Indicateur lumineux piloté par la broche ${drivePin}${isPwm ? ' (variation PWM)' : ''}, protégé en série par une résistance.`
            : `Sortie visuelle câblée directement sur ${drivePin} — ajoutez une résistance de 220Ω en série pour limiter le courant.`,
        },
        lang,
      );
    } else if (ctx.hasPowerRail) {
      roleExplanation = loc(
        {
          ar: 'يعمل كمصباح مؤشر طاقة متصل مباشرة بخط التغذية لعرض حالة توفر الجهد في الدائرة.',
          en: 'Wired directly to a power rail as a constant power-on indicator for the circuit.',
          fr: 'Câblé directement sur un rail d’alimentation comme témoin de mise sous tension.',
        },
        lang,
      );
    } else {
      roleExplanation = loc(
        {
          ar: 'غير موصول بعد — وصّل القطب الموجب (+) بمنفذ رقمي عبر مقاومة 220Ω والقطب السالب (-) بالأرضي GND.',
          en: 'Not wired yet — connect Anode (+) through a 220Ω resistor to a digital pin and Cathode (-) to GND.',
          fr: 'Non câblé — reliez l’anode (+) via une résistance 220Ω à une broche numérique et la cathode (-) à GND.',
        },
        lang,
      );
    }

    const brightPct = Math.round((running ? pwr?.brightness ?? 0 : 0) * 100);
    if (!pwr?.overload) {
      liveStatus =
        brightPct > 0
          ? loc(
              {
                ar: `مضيء (${brightPct}%)`,
                en: `LIT (${brightPct}%)`,
                fr: `ALLUMÉ (${brightPct}%)`,
              },
              lang,
            )
          : loc({ ar: 'منطفئ (0%)', en: 'OFF (0%)', fr: 'ÉTEINT (0%)' }, lang);
      statusTone = brightPct > 0 ? 'emerald' : ctx.isWired ? 'slate' : 'slate';
    }
    if (pwr?.voltageV !== undefined) {
      metrics.push({
        label: loc({ ar: 'الجهد', en: 'Voltage', fr: 'Tension' }, lang),
        value: `${pwr.voltageV.toFixed(2)} V`,
      });
    }
    if (pwr?.currentMa !== undefined) {
      metrics.push({
        label: loc({ ar: 'التيار', en: 'Current', fr: 'Courant' }, lang),
        value: `${pwr.currentMa.toFixed(1)} mA`,
      });
    }
  }
  // ---------- 2. Resistors ----------
  else if (comp.kind.startsWith('resistor-')) {
    const ohms =
      comp.kind === 'resistor-10k' ? '10 kΩ' : comp.kind === 'resistor-1k' ? '1 kΩ' : '220 Ω';
    const hasLedNeighbor = ctx.neighbors.some((n) => isLedKind(n.kind));
    const hasInputNeighbor = ctx.neighbors.some((n) =>
      ['button', 'ldr', 'temp-sensor'].includes(n.kind),
    );

    if (hasLedNeighbor) {
      roleBadge = loc(
        { ar: 'مقاومة حماية LED', en: 'Current Limiter', fr: 'Limiteur de Courant' },
        lang,
      );
      roleExplanation = loc(
        {
          ar: `تحدّ هذه المقاومة (${ohms}) من شدة التيار المار إلى الـ LED المتصل بها، مما يمنع احتراقه ويحمي منفذ الأردوينو.`,
          en: `This ${ohms} series resistor limits current flowing into the connected LED, preventing thermal burnout and protecting the Arduino pin.`,
          fr: `Cette résistance série de ${ohms} limite le courant traversant la LED connectée pour éviter sa destruction.`,
        },
        lang,
      );
    } else if (hasInputNeighbor) {
      roleBadge = loc(
        { ar: 'مقسّم جهد / سحب', en: 'Pull / Divider', fr: 'Diviseur / Pull' },
        lang,
      );
      roleExplanation = loc(
        {
          ar: `تعمل هذه المقاومة (${ohms}) كمقسّم جهد أو مقاومة سحب (Pull-down/up) لتثبيت إشارة الزر أو الحساس ومنع القراءات العشوائية.`,
          en: `Acts as a ${ohms} pull-down/voltage-divider resistor with the connected button or sensor to stabilize readings and avoid floating noise.`,
          fr: `Agit comme résistance de tirage ou pont diviseur (${ohms}) avec le bouton/capteur pour stabiliser le signal.`,
        },
        lang,
      );
    } else {
      roleBadge = loc(
        { ar: `مقاومة ثابتة (${ohms})`, en: `Fixed Resistor (${ohms})`, fr: `Résistance (${ohms})` },
        lang,
      );
      roleExplanation = loc(
        {
          ar: `تقاوم مرور التيار الكهربائي بقيمة ${ohms} لخفض الجهد أو حماية المكونات الحساسة حسب قانون أوم (V = I × R).`,
          en: `Opposes electric current by ${ohms} to limit current flow or divide voltage across this branch (Ohm’s Law: V = I × R).`,
          fr: `Limite le courant électrique de ${ohms} ou divise la tension dans cette branche (Loi d’Ohm : V = I × R).`,
        },
        lang,
      );
    }

    metrics.push({
      label: loc({ ar: 'القيمة', en: 'Value', fr: 'Valeur' }, lang),
      value: ohms,
    });
    if (pwr?.powerMw !== undefined && pwr.powerMw > 0.1) {
      metrics.push({
        label: loc({ ar: 'القدرة', en: 'Power', fr: 'Puissance' }, lang),
        value: `${pwr.powerMw.toFixed(1)} mW`,
      });
    } else {
      metrics.push({
        label: loc({ ar: 'الحد الأقصى', en: 'Rating', fr: 'Max' }, lang),
        value: '250 mW (¼W)',
      });
    }
  }
  // ---------- 3. Pushbutton ----------
  else if (comp.kind === 'button') {
    const pressed = comp.value === 1;
    const pin = ctx.digitalPins[0] || ctx.analogPins[0];
    roleBadge = loc({ ar: 'مدخل رقمي (زر)', en: 'Digital Input', fr: 'Entrée Numérique' }, lang);
    roleExplanation = pin
      ? loc(
          {
            ar: `يرسل إشارة تحكم رقمية إلى المنفذ ${pin} عند الضغط عليه، ليقوم الكود بتشغيل إجراء محدد عبر digitalRead().`,
            en: `Sends a tactile digital trigger to pin ${pin} when pressed so your sketch can react via digitalRead().`,
            fr: `Envoie un déclenchement numérique sur la broche ${pin} lorsqu’il est pressé (lu via digitalRead()).`,
          },
          lang,
        )
      : loc(
          {
            ar: 'مفتاح لحظي يغلق المسار الكهربائي عند الضغط عليه — وصّله بمنفذ رقمي و GND أو 5V مع مقاومة سحب.',
            en: 'Momentary switch that closes the path while held — wire to a digital pin and GND/5V.',
            fr: 'Interrupteur momentané fermant le circuit à la pression — reliez-le à une broche numérique et GND/5V.',
          },
          lang,
        );
    liveStatus = pressed
      ? loc({ ar: 'مضغوط (HIGH)', en: 'PRESSED', fr: 'PRESSÉ' }, lang)
      : loc({ ar: 'محرر (IDLE)', en: 'RELEASED', fr: 'RELÂCHÉ' }, lang);
    statusTone = pressed ? 'emerald' : 'slate';
    metrics.push({
      label: loc({ ar: 'الحالة', en: 'Contact', fr: 'Contact' }, lang),
      value: pressed ? 'CLOSED' : 'OPEN',
    });
  }
  // ---------- 4. Potentiometer ----------
  else if (comp.kind === 'potentiometer') {
    const val = comp.value ?? 512;
    const volts = (val / 1023) * 5;
    const aPin = ctx.analogPins[0] || ctx.signalPins[0];
    roleBadge = loc({ ar: 'مدخل تماثلي متغير', en: 'Analog Control', fr: 'Contrôle Analogique' }, lang);
    roleExplanation = aPin
      ? loc(
          {
            ar: `يعمل كمقسّم جهد متغير يغذي المنفذ ${aPin} بجهد سلس بين 0V و 5V للتحكم في السطوع أو زاوية السيرفو أو السرعة.`,
            en: `Acts as a tunable voltage divider feeding pin ${aPin} a smooth 0–5V signal to control brightness, servo angle, or timing.`,
            fr: `Agit comme diviseur de tension variable envoyant 0–5V sur ${aPin} pour régler luminosité, angle ou vitesse.`,
          },
          lang,
        )
      : loc(
          {
            ar: 'مقاومة متغيرة 10kΩ تقسّم الجهد بين 5V و GND — وصّل الرجل الوسطى (SIG) بأحد منافذ A0–A5.',
            en: '10kΩ rotary divider between 5V and GND — wire the center wiper (SIG) to an analog pin A0–A5.',
            fr: 'Diviseur rotatif 10kΩ entre 5V et GND — reliez la broche centrale (SIG) à A0–A5.',
          },
          lang,
        );
    liveStatus = `${volts.toFixed(2)} V`;
    statusTone = 'teal';
    metrics.push(
      { label: 'ADC', value: `${val} / 1023` },
      { label: loc({ ar: 'الجهد', en: 'Output', fr: 'Sortie' }, lang), value: `${volts.toFixed(2)} V` },
    );
  }
  // ---------- 5. LDR Photoresistor ----------
  else if (comp.kind === 'ldr') {
    const val = comp.value ?? 520;
    const volts = (val / 1023) * 5;
    const aPin = ctx.analogPins[0] || ctx.signalPins[0];
    roleBadge = loc({ ar: 'حساس إضاءة (LDR)', en: 'Light Sensor', fr: 'Capteur de Lumière' }, lang);
    roleExplanation = aPin
      ? loc(
          {
            ar: `يقيس شدة الإضاءة المحيطة ويرسل قراءة تماثلية إلى المنفذ ${aPin} (تقل مقاومته كلما زاد الضوء) لأتمتة الإضاءة الليلية.`,
            en: `Senses ambient light intensity and feeds an analog reading to pin ${aPin} (resistance drops in bright light) for automated lighting.`,
            fr: `Mesure la luminosité ambiante et transmet un signal analogique vers ${aPin} pour automatiser l’éclairage.`,
          },
          lang,
        )
      : loc(
          {
            ar: 'مقاومة ضوئية تتغير قيمتها بتغير شدة الضوء — وصّلها مع مقاومة 10kΩ إلى منفذ تماثلي A0–A5.',
            en: 'Light-dependent resistor whose resistance drops in bright light — wire with a 10kΩ divider to A0–A5.',
            fr: 'Photorésistance dont la valeur baisse avec la lumière — câbler en pont diviseur vers A0–A5.',
          },
          lang,
        );
    liveStatus =
      val >= 650
        ? loc({ ar: 'إضاءة قوية', en: 'Bright', fr: 'Lumineux' }, lang)
        : val <= 320
          ? loc({ ar: 'إضاءة خافتة', en: 'Dark', fr: 'Sombre' }, lang)
          : loc({ ar: 'إضاءة متوسطة', en: 'Ambient', fr: 'Ambiant' }, lang);
    statusTone = 'amber';
    metrics.push(
      { label: loc({ ar: 'الشدة', en: 'Level', fr: 'Niveau' }, lang), value: `${val} / 1023` },
      { label: loc({ ar: 'الجهد', en: 'Voltage', fr: 'Tension' }, lang), value: `${volts.toFixed(2)} V` },
    );
  }
  // ---------- 6. HC-SR04 Ultrasonic ----------
  else if (comp.kind === 'ultrasonic') {
    const cm = comp.value ?? 45;
    const echoUs = Math.round(cm * 58);
    roleBadge = loc({ ar: 'حساس مسافة بالموجات', en: 'Distance Sonar', fr: 'Sonar Distance' }, lang);
    roleExplanation =
      ctx.digitalPins.length > 0
        ? loc(
            {
              ar: `يُرسل نبضات فوق صوتية (40kHz) عبر منافذ ${ctx.digitalPins.join(' / ')} لحساب المسافة حتى العائق بدقة بالسنتيمتر.`,
              en: `Emits 40kHz ultrasonic pulses via ${ctx.digitalPins.join(' / ')} and times the echo return to calculate obstacle distance in cm.`,
              fr: `Émet des impulsions ultrasonores 40kHz via ${ctx.digitalPins.join(' / ')} pour mesurer la distance d’un obstacle en cm.`,
            },
            lang,
          )
        : loc(
            {
              ar: 'حساس مسافة فوق صوتي يقيس الأبعاد بين 2cm و 200cm — وصّل VCC (5V) و GND و TRIG و ECHO.',
              en: 'Ultrasonic rangefinder measuring 2–200 cm — connect VCC (5V), GND, TRIG, and ECHO pins.',
              fr: 'Télémètre ultrasonore (2–200 cm) — reliez VCC (5V), GND, TRIG et ECHO.',
            },
            lang,
          );
    liveStatus = `${cm} cm`;
    statusTone = cm < 20 ? 'amber' : 'teal';
    metrics.push(
      { label: loc({ ar: 'المسافة', en: 'Distance', fr: 'Distance' }, lang), value: `${cm} cm` },
      { label: loc({ ar: 'زمن الصدى', en: 'Echo Time', fr: 'Écho' }, lang), value: `${echoUs} µs` },
    );
  }
  // ---------- 7. Micro Servo ----------
  else if (comp.kind === 'servo') {
    const sigPin = ctx.digitalPins[0] || ctx.signalPins[0];
    const angle =
      (sigPin && typeof servoAngles[sigPin] === 'number'
        ? servoAngles[sigPin]
        : Object.values(servoAngles)[0]) ?? 90;
    roleBadge = loc({ ar: 'محرك زاوي (Servo)', en: 'Rotary Actuator', fr: 'Actionneur Servo' }, lang);
    roleExplanation = sigPin
      ? loc(
          {
            ar: `يستقبل إشارة نبضات PWM من المنفذ ${sigPin} لتحريك الذراع بدقة إلى أي زاوية بين 0° و 180° عبر مكتبة Servo.`,
            en: `Receives 50Hz PWM control pulses from pin ${sigPin} to position its horn accurately between 0° and 180°.`,
            fr: `Reçoit des impulsions PWM depuis la broche ${sigPin} pour orienter son bras entre 0° et 180°.`,
          },
          lang,
        )
      : loc(
          {
            ar: 'محرك سيرفو دقيق الزاوية (0°–180°) — وصّل SIG بمنفذ PWM مثل D9 و VCC بـ 5V و GND بالأرضي.',
            en: 'Precision 0°–180° micro servo — wire SIG to a PWM pin (e.g. D9), VCC to 5V, and GND.',
            fr: 'Micro-servo 0°–180° — reliez SIG à une broche PWM (ex. D9), VCC à 5V et GND.',
          },
          lang,
        );
    liveStatus = `${Math.round(angle)}°`;
    statusTone = running ? 'emerald' : 'teal';
    metrics.push({
      label: loc({ ar: 'الزاوية الحالية', en: 'Shaft Angle', fr: 'Angle Actuel' }, lang),
      value: `${Math.round(angle)}°`,
    });
  }
  // ---------- 8. Piezo Buzzer ----------
  else if (comp.kind === 'buzzer') {
    const sigPin = ctx.digitalPins[0] || ctx.signalPins[0];
    const active = running && Boolean(buzzerTone);
    roleBadge = loc({ ar: 'مخرج صوتي (Buzzer)', en: 'Audio Alert', fr: 'Alerte Sonore' }, lang);
    roleExplanation = sigPin
      ? loc(
          {
            ar: `يحوّل الإشارة الترددية القادمة من المنفذ ${sigPin} (عبر الدالة tone) إلى نغمات وتنبيهات صوتية مسموعة.`,
            en: `Converts oscillating square-wave signals from pin ${sigPin} (via tone()) into audible alarms or melodies.`,
            fr: `Convertit le signal oscillant de la broche ${sigPin} (via tone()) en bips ou mélodies audibles.`,
          },
          lang,
        )
      : loc(
          {
            ar: 'جرس بيزو لإصدار الإنذارات والنغمات — وصّل القطب الموجب (+) بمنفذ رقمي والسالب (-) بالأرضي GND.',
            en: 'Piezo buzzer for audio alerts — wire (+) to a digital pin and (-) to GND.',
            fr: 'Buzzer piézo pour alertes sonores — reliez (+) à une broche numérique et (-) à GND.',
          },
          lang,
        );
    liveStatus = active && buzzerTone ? `${buzzerTone.freq} Hz` : loc({ ar: 'صامت', en: 'Silent', fr: 'Muet' }, lang);
    statusTone = active ? 'amber' : 'slate';
    if (active && buzzerTone) {
      metrics.push({
        label: loc({ ar: 'التردد', en: 'Frequency', fr: 'Fréquence' }, lang),
        value: `${buzzerTone.freq} Hz`,
      });
    }
  }
  // ---------- 9. TMP36 Temperature Sensor ----------
  else if (comp.kind === 'temp-sensor') {
    const tempC = comp.value ?? 25;
    const outMv = Math.round(tempC * 10 + 500);
    const aPin = ctx.analogPins[0] || ctx.signalPins[0];
    roleBadge = loc({ ar: 'حساس حرارة (TMP36)', en: 'Temp Sensor', fr: 'Capteur Temp.' }, lang);
    roleExplanation = aPin
      ? loc(
          {
            ar: `يولّد جهداً تماثلياً خطياً (10mV لكل درجة مئوية) ويرسله للمنفذ ${aPin} لمراقبة الحرارة في الدائرة.`,
            en: `Outputs a linear analog voltage (10 mV/°C with 500 mV offset) to pin ${aPin} for real-time thermal monitoring.`,
            fr: `Génère une tension analogique linéaire (10 mV/°C) vers ${aPin} pour surveiller la température.`,
          },
          lang,
        )
      : loc(
          {
            ar: 'حساس حرارة تماثلي دقيق — وصّل VCC بـ 5V و VOUT بمنفذ تماثلي (A0–A5) و GND بالأرضي.',
            en: 'Precision analog temperature sensor — wire VCC to 5V, VOUT to A0–A5, and GND.',
            fr: 'Capteur thermique analogique — reliez VCC à 5V, VOUT à A0–A5 et GND.',
          },
          lang,
        );
    liveStatus = `${tempC}°C`;
    statusTone = tempC >= 40 ? 'amber' : 'teal';
    metrics.push(
      { label: loc({ ar: 'الحرارة', en: 'Temp', fr: 'Temp.' }, lang), value: `${tempC} °C` },
      { label: 'VOUT', value: `${outMv} mV` },
    );
  }
  // ---------- 10. Virtual Digital Multimeter ----------
  else if (comp.kind === 'multimeter') {
    const mode = meterReading?.mode ?? getMultimeterModeFromValue(comp.value);
    const modeTitle =
      mode === 'voltage'
        ? loc({ ar: 'فولتميتر (DC V)', en: 'Voltmeter (DC V)', fr: 'Voltmètre (DC V)' }, lang)
        : mode === 'current'
          ? loc({ ar: 'أميتر (DC mA)', en: 'Ammeter (DC mA)', fr: 'Ampèremètre (DC mA)' }, lang)
          : loc({ ar: 'أوميتر (Ω)', en: 'Ohmmeter (Ω)', fr: 'Ohmmètre (Ω)' }, lang);

    roleBadge = modeTitle;
    if (mode === 'voltage') {
      roleExplanation = loc(
        {
          ar: 'يقيس فرق الجهد (VΩ+ − COM) بممانعة عالية 10MΩ دون التأثير على الدائرة — يُوصل بالتوازي عبر النقطتين المراد قياسهما.',
          en: 'Measures electric potential difference (VΩ+ − COM) with 10 MΩ input impedance — connect in parallel across any two nodes.',
          fr: 'Mesure la différence de potentiel (VΩ+ − COM) avec 10 MΩ d’impédance — branchement en parallèle entre deux points.',
        },
        lang,
      );
    } else if (mode === 'current') {
      roleExplanation = loc(
        {
          ar: 'يقيس شدة التيار المار عبر مقاومة تحويلة دقيقة 0.5Ω — يُوصل على التوالي داخل المسار الكهربائي (محمي بفيوز 400mA).',
          en: 'Measures current through a 0.5 Ω shunt resistor — wire in series inside a circuit branch (protected by a 400 mA fuse).',
          fr: 'Mesure l’intensité via un shunt de 0,5 Ω — branchez en série dans la branche du circuit (fusible 400 mA).',
        },
        lang,
      );
    } else {
      roleExplanation = loc(
        {
          ar: 'يحسب المقاومة المكافئة (Ω) بين المجسّين بحقن تيار اختبار داخلي — أوقف المحاكاة قبل قياس مقاومة دائرة مغذاة.',
          en: 'Measures equivalent passive resistance (Ω) between the two probes using a test current — stop simulation before probing powered rails.',
          fr: 'Mesure la résistance équivalente (Ω) entre les deux sondes — arrêtez la simulation avant de tester un circuit alimenté.',
        },
        lang,
      );
    }

    if (meterReading) {
      liveStatus = meterReading.displayText;
      if (meterReading.warning === 'fuse-overload') {
        statusTone = 'rose';
        safetyAlert = {
          level: 'error',
          text: loc(translations.simulator.multimeterFuseWarn, lang),
        };
      } else if (meterReading.warning === 'live-circuit') {
        statusTone = 'amber';
        safetyAlert = {
          level: 'warning',
          text: loc(translations.simulator.multimeterLiveWarn, lang),
        };
      } else if (meterReading.connected) {
        statusTone = meterReading.warning === 'idle' ? 'slate' : 'emerald';
      } else {
        statusTone = 'slate';
      }
      metrics.push(
        {
          label: loc({ ar: 'الوضع', en: 'Mode', fr: 'Mode' }, lang),
          value: meterReading.unitBadge,
        },
        {
          label: loc({ ar: 'القراءة', en: 'Reading', fr: 'Mesure' }, lang),
          value: meterReading.displayText,
        },
      );
    }
  }

  // Add digital pin live state if relevant and no duplicate metrics yet
  const firstDigital = ctx.digitalPins[0];
  if (firstDigital && running && typeof pinValues[firstDigital] === 'number' && metrics.length < 3) {
    const pv = pinValues[firstDigital];
    metrics.push({
      label: firstDigital,
      value: pv > 1 ? `PWM ${pv}` : pv >= 1 ? 'HIGH (5V)' : 'LOW (0V)',
    });
  }

  return {
    title,
    subtitle,
    swatch,
    roleBadge,
    roleExplanation,
    liveStatus,
    statusTone,
    metrics,
    connections: ctx.connections,
    safetyAlert,
    proTip,
  };
}

function buildArduinoInsight(
  circuit: CircuitState,
  pinValues: Record<string, number>,
  running: boolean,
  ledD13On: boolean,
  lang: Language,
): SmartRoleInsight {
  const wiredArduinoPins = new Set<string>();
  for (const w of circuit.wires) {
    if (w.from.startsWith('arduino:')) wiredArduinoPins.add(w.from.slice('arduino:'.length));
    if (w.to.startsWith('arduino:')) wiredArduinoPins.add(w.to.slice('arduino:'.length));
  }
  const activePinList = Array.from(wiredArduinoPins);
  const ioPins = activePinList.filter(
    (p) => !['5V', '3.3V', 'VIN', 'GND1', 'GND2', 'GND3'].includes(p),
  );
  const highPins = Object.entries(pinValues)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);

  return {
    title: 'Arduino UNO R3',
    subtitle: 'ATmega328P · 16 MHz · 5V Logic',
    swatch: '#00878F',
    roleBadge: loc(
      { ar: 'المتحكم الدقيق (العقل)', en: 'Microcontroller Brain', fr: 'Microcontrôleur' },
      lang,
    ),
    roleExplanation: loc(
      {
        ar: `ينفّذ كود Sketch المكتوب لديك، يقرأ الحساسات والمداخل عبر المنافذ الرقمية والتماثلية، ويتحكم في ${circuit.components.length} مكون على لوحة التجارب عبر ${circuit.wires.length} سلك توصيل.`,
        en: `Executes your Arduino sketch, samples connected sensors on digital/analog pins, and drives ${circuit.components.length} breadboard component(s) across ${circuit.wires.length} wire(s).`,
        fr: `Exécute votre programme Arduino, lit les capteurs et pilote ${circuit.components.length} composant(s) via ${circuit.wires.length} fil(s).`,
      },
      lang,
    ),
    liveStatus: running
      ? loc({ ar: 'المحاكاة قيد التشغيل', en: 'SIMULATING', fr: 'EN COURS' }, lang)
      : loc({ ar: 'في وضع الاستعداد', en: 'STANDBY', fr: 'VEILLE' }, lang),
    statusTone: running ? 'emerald' : 'teal',
    metrics: [
      {
        label: loc({ ar: 'المنافذ النشطة', en: 'Wired I/O', fr: 'Broches I/O' }, lang),
        value: ioPins.length > 0 ? ioPins.slice(0, 4).join(', ') : '—',
      },
      {
        label: 'L (D13)',
        value: ledD13On ? 'HIGH' : 'LOW',
      },
    ],
    connections:
      highPins.length > 0 && running
        ? [
            {
              pinId: 'HIGH',
              pinLabel: 'HIGH',
              peers: highPins.slice(0, 5),
            },
          ]
        : [],
    proTip: loc(
      {
        ar: 'مرّر المؤشر فوق أي مكون على لوحة التجارب لمعرفة دوره الدقيق وتوصيلاته في هذه الدائرة.',
        en: 'Hover over any placed component on the breadboard to inspect its exact role and live connections.',
        fr: 'Survolez n’importe quel composant sur la plaque pour voir son rôle exact et ses connexions.',
      },
      lang,
    ),
  };
}

export function SmartComponentTooltip({
  lang,
  target,
  circuit,
  componentPower,
  pinValues,
  servoAngles,
  buzzerTone,
  running,
  ledD13On,
  multimeterReadings,
}: SmartComponentTooltipProps) {
  const insight = useMemo<SmartRoleInsight | null>(() => {
    if (!target) return null;
    if (target.kind === 'arduino') {
      return buildArduinoInsight(circuit, pinValues, running, ledD13On, lang);
    }
    const comp = circuit.components.find((c) => c.id === target.compId);
    if (!comp) return null;
    return buildComponentInsight(
      comp,
      circuit,
      componentPower[comp.id],
      pinValues,
      servoAngles,
      buzzerTone,
      running,
      lang,
      multimeterReadings?.[comp.id],
    );
  }, [target, circuit, componentPower, pinValues, servoAngles, buzzerTone, running, ledD13On, lang, multimeterReadings]);

  if (!target || !insight || typeof document === 'undefined') return null;

  // Smart viewport-clamped positioning (never clips off-screen)
  const CARD_W = 304;
  const CARD_EST_H = 268;
  const OFFSET = 18;
  const MARGIN = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isRtl = lang === 'ar';

  let left = isRtl ? target.clientX - CARD_W - OFFSET : target.clientX + OFFSET;
  if (left < MARGIN) {
    left = Math.min(vw - CARD_W - MARGIN, target.clientX + OFFSET);
  } else if (left + CARD_W > vw - MARGIN) {
    left = Math.max(MARGIN, target.clientX - CARD_W - OFFSET);
  }

  let top = target.clientY - 28;
  if (top + CARD_EST_H > vh - MARGIN) {
    top = Math.max(MARGIN, vh - CARD_EST_H - MARGIN);
  }
  if (top < MARGIN) {
    top = MARGIN;
  }

  const toneClass = {
    teal: 'bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] border-[#00878F]/30',
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35',
    slate: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/25',
  }[insight.statusTone];

  return createPortal(
    <div
      role="tooltip"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ top, left, width: CARD_W }}
      className="fixed z-[90] pointer-events-none rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 animate-in fade-in duration-100"
    >
      {/* Accent Top Bar */}
      <div className="h-1 w-full" style={{ backgroundColor: insight.swatch }} />

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2 bg-slate-50/80 dark:bg-slate-900/70">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/50 dark:ring-slate-800"
              style={{ backgroundColor: insight.swatch }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00878F] dark:text-[#22c6cf] truncate">
              {insight.roleBadge}
            </span>
          </div>
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
            {insight.title}
          </h4>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {insight.subtitle}
          </p>
        </div>

        <span
          className={cn(
            'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono',
            toneClass,
          )}
        >
          {insight.statusTone === 'rose' ? (
            <Flame className="w-3 h-3 shrink-0" />
          ) : insight.statusTone === 'emerald' ? (
            <Zap className="w-3 h-3 shrink-0" />
          ) : (
            <Activity className="w-3 h-3 shrink-0" />
          )}
          <span>{insight.liveStatus}</span>
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 text-[11px]">
        {/* Smart Context-Aware Role Explanation */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3 h-3 text-[#00878F]" />
            <span>{loc(translations.simulator.circuitRole, lang)}</span>
          </div>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
            {insight.roleExplanation}
          </p>
        </div>

        {/* Safety / Overload Callout */}
        {insight.safetyAlert && (
          <div
            className={cn(
              'rounded-lg px-2.5 py-1.5 border flex items-start gap-1.5 text-[10.5px] font-semibold leading-snug',
              insight.safetyAlert.level === 'error'
                ? 'bg-rose-500/12 border-rose-500/35 text-rose-700 dark:text-rose-300'
                : 'bg-amber-500/12 border-amber-500/35 text-amber-800 dark:text-amber-300',
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{insight.safetyAlert.text}</span>
          </div>
        )}

        {/* Live Electrical Metrics */}
        {insight.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {insight.metrics.slice(0, 4).map((m, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2 py-1"
              >
                <div className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">
                  {m.label}
                </div>
                <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white truncate tabular-nums">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Pin Connections in This Circuit */}
        {insight.connections.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Cable className="w-3 h-3 text-[#00878F]" />
              <span>{loc(translations.simulator.liveConnections, lang)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {insight.connections.map((c) => {
                const wired = c.peers.length > 0;
                return (
                  <span
                    key={c.pinId}
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[10px]',
                      wired
                        ? 'bg-[#00878F]/10 border-[#00878F]/30 text-slate-800 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-400',
                    )}
                  >
                    <strong className="text-[#00878F] dark:text-[#22c6cf]">{c.pinLabel}</strong>
                    <span>→</span>
                    <span className="truncate max-w-[140px]">
                      {wired
                        ? c.peers.join(', ')
                        : loc(translations.simulator.unwiredPin, lang)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Engineering Tip Footer */}
        {insight.proTip && !insight.safetyAlert && (
          <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800 flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            {target.kind === 'arduino' ? (
              <Cpu className="w-3 h-3 text-[#00878F] shrink-0 mt-0.5" />
            ) : (
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
            )}
            <span>{insight.proTip}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
