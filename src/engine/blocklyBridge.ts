import type { BlockType, CodeBlock } from '../types/arduino';

export interface BlockCategoryMeta {
  id: string;
  color: string;
  border: string;
  label: { ar: string; en: string; fr: string };
}

export const BLOCK_CATEGORIES: BlockCategoryMeta[] = [
  {
    id: 'digital',
    color: 'bg-teal-600 text-white',
    border: 'border-teal-500/40',
    label: { ar: 'منافذ رقمية', en: 'Digital I/O', fr: 'E/S Numériques' },
  },
  {
    id: 'analog',
    color: 'bg-indigo-600 text-white',
    border: 'border-indigo-500/40',
    label: { ar: 'تناظري و PWM', en: 'Analog & PWM', fr: 'Analogique & PWM' },
  },
  {
    id: 'control',
    color: 'bg-amber-600 text-white',
    border: 'border-amber-500/40',
    label: { ar: 'الوقت والتحكم', en: 'Timing & Logic', fr: 'Temps & Logique' },
  },
  {
    id: 'actuators',
    color: 'bg-rose-600 text-white',
    border: 'border-rose-500/40',
    label: { ar: 'المشغلات والصوت', en: 'Actuators & Sound', fr: 'Actionneurs & Son' },
  },
  {
    id: 'serial',
    color: 'bg-sky-600 text-white',
    border: 'border-sky-500/40',
    label: { ar: 'الاتصال التسلسلي', en: 'Serial Comms', fr: 'Port Série' },
  },
];

export function getBlockCategory(type: BlockType): string {
  switch (type) {
    case 'pinMode':
    case 'digitalWrite':
    case 'setVarDigitalRead':
      return 'digital';
    case 'analogWrite':
    case 'setVarAnalogRead':
    case 'setVarMap':
      return 'analog';
    case 'delay':
    case 'ifAnalogCompare':
    case 'comment':
      return 'control';
    case 'tone':
    case 'noTone':
    case 'servoAttach':
    case 'servoWrite':
      return 'actuators';
    case 'serialBegin':
    case 'serialPrint':
      return 'serial';
  }
}

export function createDefaultBlock(
  type: BlockType,
  section: 'setup' | 'loop',
): CodeBlock {
  const id = `blk-${Math.random().toString(36).slice(2, 9)}`;
  switch (type) {
    case 'pinMode':
      return { id, section, type, params: { pin: '13', mode: 'OUTPUT' } };
    case 'digitalWrite':
      return { id, section, type, params: { pin: '13', state: 'HIGH' } };
    case 'analogWrite':
      return { id, section, type, params: { pin: '9', value: 180 } };
    case 'delay':
      return { id, section, type, params: { ms: 500 } };
    case 'serialBegin':
      return { id, section, type, params: { baud: 9600 } };
    case 'serialPrint':
      return { id, section, type, params: { expr: '"Hello ArdunoLab!"' } };
    case 'tone':
      return { id, section, type, params: { pin: '8', freq: 440, duration: 250 } };
    case 'noTone':
      return { id, section, type, params: { pin: '8' } };
    case 'servoAttach':
      return { id, section, type, params: { pin: '9' } };
    case 'servoWrite':
      return { id, section, type, params: { angle: 90 } };
    case 'setVarAnalogRead':
      return { id, section, type, params: { varName: 'sensorVal', pin: 'A0' } };
    case 'setVarDigitalRead':
      return { id, section, type, params: { varName: 'btnState', pin: '2' } };
    case 'setVarMap':
      return {
        id,
        section,
        type,
        params: {
          varName: 'pwmVal',
          source: 'sensorVal',
          inMin: 0,
          inMax: 1023,
          outMin: 0,
          outMax: 255,
        },
      };
    case 'ifAnalogCompare':
      return {
        id,
        section,
        type,
        params: {
          varName: 'sensorVal',
          op: '<',
          threshold: 500,
          thenPin: '13',
          thenState: 'HIGH',
          elseState: 'LOW',
        },
      };
    case 'comment':
      return { id, section, type, params: { text: 'Step note' } };
  }
}

function renderBlockLine(b: CodeBlock): string {
  const p = b.params;
  switch (b.type) {
    case 'pinMode':
      return `  pinMode(${p.pin}, ${p.mode});`;
    case 'digitalWrite':
      return `  digitalWrite(${p.pin}, ${p.state});`;
    case 'analogWrite':
      return `  analogWrite(${p.pin}, ${p.value});`;
    case 'delay':
      return `  delay(${p.ms});`;
    case 'serialBegin':
      return `  Serial.begin(${p.baud});`;
    case 'serialPrint':
      return `  Serial.println(${p.expr});`;
    case 'tone':
      return p.duration && Number(p.duration) > 0
        ? `  tone(${p.pin}, ${p.freq}, ${p.duration});`
        : `  tone(${p.pin}, ${p.freq});`;
    case 'noTone':
      return `  noTone(${p.pin});`;
    case 'servoAttach':
      return `  myServo.attach(${p.pin});`;
    case 'servoWrite':
      return `  myServo.write(${p.angle});`;
    case 'setVarAnalogRead':
      return `  int ${p.varName} = analogRead(${p.pin});`;
    case 'setVarDigitalRead':
      return `  int ${p.varName} = digitalRead(${p.pin});`;
    case 'setVarMap':
      return `  int ${p.varName} = map(${p.source}, ${p.inMin}, ${p.inMax}, ${p.outMin}, ${p.outMax});`;
    case 'ifAnalogCompare':
      return [
        `  if (${p.varName} ${p.op} ${p.threshold}) {`,
        `    digitalWrite(${p.thenPin}, ${p.thenState});`,
        `  } else {`,
        `    digitalWrite(${p.thenPin}, ${p.elseState});`,
        `  }`,
      ].join('\n');
    case 'comment':
      return `  // ${p.text}`;
  }
}

export function blocksToArduinoCpp(blocks: CodeBlock[]): string {
  const usesServo = blocks.some(
    (b) => b.type === 'servoAttach' || b.type === 'servoWrite',
  );
  const setupBlocks = blocks.filter((b) => b.section === 'setup');
  const loopBlocks = blocks.filter((b) => b.section === 'loop');

  const lines: string[] = [];
  if (usesServo) {
    lines.push('#include <Servo.h>');
    lines.push('Servo myServo;');
    lines.push('');
  }

  lines.push('void setup() {');
  if (setupBlocks.length === 0) {
    lines.push('  // Setup initialization');
  } else {
    setupBlocks.forEach((b) => lines.push(renderBlockLine(b)));
  }
  lines.push('}');
  lines.push('');
  lines.push('void loop() {');
  if (loopBlocks.length === 0) {
    lines.push('  // Main loop');
  } else {
    loopBlocks.forEach((b) => lines.push(renderBlockLine(b)));
  }
  lines.push('}');

  return lines.join('\n');
}

/**
 * Bi-directional parser: parses standard Arduino C++ setup()/loop() statements
 * back into interactive visual blocks.
 */
export function arduinoCppToBlocks(code: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let seq = 1;
  const nextId = () => `parsed-${seq++}`;

  const extractBody = (fnName: string): string => {
    const regex = new RegExp(`void\\s+${fnName}\\s*\\(\\s*\\)\\s*\\{`);
    const match = regex.exec(code);
    if (!match) return '';
    let idx = match.index + match[0].length;
    let depth = 1;
    let body = '';
    while (idx < code.length && depth > 0) {
      const ch = code[idx];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth > 0) body += ch;
      idx++;
    }
    return body;
  };

  const parseSection = (body: string, section: 'setup' | 'loop') => {
    // Handle simple if (...) { digitalWrite(...); } else { digitalWrite(...); }
    const ifPattern =
      /if\s*\(\s*(\w+)\s*(<=|>=|==|!=|<|>)\s*(-?\d+)\s*\)\s*\{\s*digitalWrite\(\s*([^,\s]+)\s*,\s*(HIGH|LOW)\s*\)\s*;\s*\}\s*else\s*\{\s*digitalWrite\(\s*[^,\s]+\s*,\s*(HIGH|LOW)\s*\)\s*;\s*\}/g;

    const consumedRanges: Array<[number, number]> = [];
    let m: RegExpExecArray | null;
    while ((m = ifPattern.exec(body)) !== null) {
      consumedRanges.push([m.index, m.index + m[0].length]);
      blocks.push({
        id: nextId(),
        section,
        type: 'ifAnalogCompare',
        params: {
          varName: m[1],
          op: m[2],
          threshold: Number(m[3]),
          thenPin: m[4],
          thenState: m[5],
          elseState: m[6],
        },
      });
    }

    let cleaned = body;
    // Remove matched if/else blocks from line-by-line pass
    for (let i = consumedRanges.length - 1; i >= 0; i--) {
      const [start, end] = consumedRanges[i];
      cleaned = cleaned.slice(0, start) + '\n' + cleaned.slice(end);
    }

    const lines = cleaned
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== '{' && l !== '}');

    for (const line of lines) {
      if (line.startsWith('//')) {
        const text = line.replace(/^\/\/\s*/, '').trim();
        if (text && text !== 'Setup initialization' && text !== 'Main loop') {
          blocks.push({ id: nextId(), section, type: 'comment', params: { text } });
        }
        continue;
      }

      let match: RegExpMatchArray | null;

      if ((match = line.match(/^pinMode\(\s*([^,\s]+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)\s*;/))) {
        blocks.push({
          id: nextId(),
          section,
          type: 'pinMode',
          params: { pin: match[1], mode: match[2] },
        });
      } else if (
        (match = line.match(/^digitalWrite\(\s*([^,\s]+)\s*,\s*(HIGH|LOW|!?\w+)\s*\)\s*;/))
      ) {
        blocks.push({
          id: nextId(),
          section,
          type: 'digitalWrite',
          params: { pin: match[1], state: match[2] },
        });
      } else if ((match = line.match(/^analogWrite\(\s*([^,\s]+)\s*,\s*([^)]+)\s*\)\s*;/))) {
        const rawVal = match[2].trim();
        blocks.push({
          id: nextId(),
          section,
          type: 'analogWrite',
          params: { pin: match[1], value: Number.isNaN(Number(rawVal)) ? rawVal : Number(rawVal) },
        });
      } else if ((match = line.match(/^delay\(\s*(\d+)\s*\)\s*;/))) {
        blocks.push({
          id: nextId(),
          section,
          type: 'delay',
          params: { ms: Number(match[1]) },
        });
      } else if ((match = line.match(/^Serial\.begin\(\s*(\d+)\s*\)\s*;/))) {
        blocks.push({
          id: nextId(),
          section,
          type: 'serialBegin',
          params: { baud: Number(match[1]) },
        });
      } else if ((match = line.match(/^Serial\.println\(\s*(.+)\s*\)\s*;/))) {
        blocks.push({
          id: nextId(),
          section,
          type: 'serialPrint',
          params: { expr: match[1].trim() },
        });
      } else if (
        (match = line.match(
          /^tone\(\s*([^,\s]+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)\s*;/,
        ))
      ) {
        blocks.push({
          id: nextId(),
          section,
          type: 'tone',
          params: {
            pin: match[1],
            freq: Number(match[2]),
            duration: match[3] ? Number(match[3]) : 0,
          },
        });
      } else if ((match = line.match(/^noTone\(\s*([^,\s]+)\s*\)\s*;/))) {
        blocks.push({
          id: nextId(),
          section,
          type: 'noTone',
          params: { pin: match[1] },
        });
      } else if ((match = line.match(/^\w+\.attach\(\s*([^,\s]+)\s*\)\s*;/))) {
        blocks.push({
          id: nextId(),
          section,
          type: 'servoAttach',
          params: { pin: match[1] },
        });
      } else if ((match = line.match(/^\w+\.write\(\s*([^)]+)\s*\)\s*;/))) {
        const rawAngle = match[1].trim();
        blocks.push({
          id: nextId(),
          section,
          type: 'servoWrite',
          params: { angle: Number.isNaN(Number(rawAngle)) ? rawAngle : Number(rawAngle) },
        });
      } else if (
        (match = line.match(/^(?:int|float|const\s+int)?\s*(\w+)\s*=\s*analogRead\(\s*([^)\s]+)\s*\)\s*;/))
      ) {
        blocks.push({
          id: nextId(),
          section,
          type: 'setVarAnalogRead',
          params: { varName: match[1], pin: match[2] },
        });
      } else if (
        (match = line.match(/^(?:int|bool)?\s*(\w+)\s*=\s*digitalRead\(\s*([^)\s]+)\s*\)\s*;/))
      ) {
        blocks.push({
          id: nextId(),
          section,
          type: 'setVarDigitalRead',
          params: { varName: match[1], pin: match[2] },
        });
      } else if (
        (match = line.match(
          /^(?:int|float)?\s*(\w+)\s*=\s*map\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*;/,
        ))
      ) {
        blocks.push({
          id: nextId(),
          section,
          type: 'setVarMap',
          params: {
            varName: match[1],
            source: match[2],
            inMin: Number(match[3]),
            inMax: Number(match[4]),
            outMin: Number(match[5]),
            outMax: Number(match[6]),
          },
        });
      }
    }
  };

  parseSection(extractBody('setup'), 'setup');
  parseSection(extractBody('loop'), 'loop');
  return blocks;
}
