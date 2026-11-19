import { jsPDF } from 'jspdf';
import type {
  CircuitState,
  ElectricalDiagnostic,
  SerialEntry,
} from '../types/arduino';
import { COMPONENT_PINS } from '../engine/arduinoSim';
import { PALETTE_COMPONENTS } from '../components/simulator/BreadboardCanvas';
import { tLoc, type Language } from '../i18n/translations';

export interface LabReportOptions {
  lang: Language;
  title: string;
  studentName: string;
  courseName: string;
  notes: string;
  viewMode: 'breadboard' | 'schematic';
  circuit: CircuitState;
  code: string;
  diagnostics: ElectricalDiagnostic[];
  serialLog: SerialEntry[];
  includeSerialLog: boolean;
  svgElement: SVGSVGElement | null;
}

// High-DPI A4 Canvas dimensions (200 DPI: 210mm x 297mm)
const PAGE_W = 1654;
const PAGE_H = 2339;
const MARGIN_X = 96;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const REPORT_LABELS = {
  reportSubtitle: {
    ar: 'تقرير مخبري لتصميم ومحاكاة دوائر الأردوينو',
    en: 'Arduino Electronics & Embedded Lab Report',
    fr: 'Rapport de Laboratoire Électronique Arduino',
  },
  experiment: { ar: 'عنوان التجربة', en: 'Experiment Title', fr: 'Titre du TP' },
  student: { ar: 'اسم الطالب', en: 'Student Name', fr: 'Étudiant' },
  course: { ar: 'المادة / الأستاذ', en: 'Course / Instructor', fr: 'Cours / Enseignant' },
  date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
  hardware: { ar: 'اللوحة والنمط', en: 'Board & View', fr: 'Carte & Vue' },
  status: { ar: 'فحص الدائرة الكهربائي', en: 'Electrical Verification', fr: 'Vérification Électrique' },
  sectionCircuit: { ar: '1. مخطط الدائرة والتوصيل', en: '1. Circuit & Wiring Diagram', fr: '1. Schéma du Circuit & Câblage' },
  sectionBom: { ar: '2. قائمة المكونات (BOM)', en: '2. Bill of Materials (BOM)', fr: '2. Nomenclature (BOM)' },
  sectionWiring: { ar: '3. جدول التوصيلات بين المنافذ', en: '3. Pin-to-Pin Wiring Schedule', fr: '3. Tableau de Câblage' },
  sectionNotes: { ar: '4. ملاحظات الطالب والاستنتاجات', en: '4. Lab Observations & Conclusions', fr: '4. Observations & Conclusions' },
  sectionCode: { ar: '5. الكود البرمجي للأردوينو (Arduino C++ / .ino)', en: '5. Arduino C++ Firmware Listing (.ino)', fr: '5. Code Source Arduino C++ (.ino)' },
  sectionSerial: { ar: '6. مخرجات المراقب التسلسلي (Serial Monitor)', en: '6. Serial Monitor Capture (9600 baud)', fr: '6. Sortie Moniteur Série (9600 bauds)' },
  compCol: { ar: 'المكون', en: 'Component', fr: 'Composant' },
  qtyCol: { ar: 'العدد', en: 'Qty', fr: 'Qté' },
  detailCol: { ar: 'القيمة / التسمية', en: 'Value / Label', fr: 'Valeur / Label' },
  fromCol: { ar: 'من المنفذ', en: 'From Pin', fr: 'Broche Source' },
  toCol: { ar: 'إلى المنفذ', en: 'To Pin', fr: 'Broche Cible' },
  noWires: { ar: 'لا توجد أسلاك موصّلة حالياً', en: 'No jumper wires connected', fr: 'Aucun fil connecté' },
  signatureLine: {
    ar: 'توقيع الطالب: ______________________     تقييم الأستاذ: ______________________',
    en: 'Student Signature: ______________________     Instructor Review: ______________________',
    fr: 'Signature Étudiant : ______________________     Validation Enseignant : ______________________',
  },
  pageWord: { ar: 'صفحة', en: 'Page', fr: 'Page' },
};

function fontStack(lang: Language, mono = false): string {
  if (mono) {
    return '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  }
  return lang === 'ar'
    ? '"Cairo", "Inter", system-ui, sans-serif'
    : '"Inter", "Cairo", system-ui, sans-serif';
}

function createA4Canvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d')!;
  // Crisp white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return { canvas, ctx };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTextAligned(
  ctx: CanvasRenderingContext2D,
  text: string,
  xLeft: number,
  xRight: number,
  y: number,
  isRtl: boolean,
  maxWidth?: number,
) {
  ctx.save();
  ctx.direction = isRtl ? 'rtl' : 'ltr';
  ctx.textAlign = isRtl ? 'right' : 'left';
  const anchorX = isRtl ? xRight : xLeft;
  if (maxWidth) {
    ctx.fillText(text, anchorX, y, maxWidth);
  } else {
    ctx.fillText(text, anchorX, y);
  }
  ctx.restore();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split('\n');
  const result: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      result.push('');
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${line} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        result.push(line);
        line = words[i];
      }
    }
    result.push(line);
  }
  return result;
}

function formatNodeName(nodeId: string, circuit: CircuitState): string {
  if (nodeId.startsWith('arduino:')) {
    return `UNO ${nodeId.slice(8)}`;
  }
  if (nodeId.startsWith('comp:')) {
    const [, compId, pinId] = nodeId.split(':');
    const comp = circuit.components.find((c) => c.id === compId);
    const pinDef = comp
      ? (COMPONENT_PINS[comp.kind] || []).find((p) => p.id === pinId)
      : undefined;
    const compName = comp?.label || comp?.kind || compId;
    return `${compName} (${pinDef?.label || pinId})`;
  }
  return nodeId;
}

async function renderCircuitSvgToImage(
  svgEl: SVGSVGElement | null,
): Promise<HTMLImageElement | null> {
  if (!svgEl) return null;
  try {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Always export the complete full-board view regardless of current zoom/pan
    clone.setAttribute('viewBox', '0 0 770 400');
    clone.setAttribute('width', '1540');
    clone.setAttribute('height', '800');

    // Remove snap-grid overlay or transient elements tagged for exclusion
    clone.querySelectorAll('[data-export-exclude="true"]').forEach((n) => n.remove());

    // Insert clean printable light backdrop right behind grid
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', '770');
    bgRect.setAttribute('height', '400');
    bgRect.setAttribute('fill', '#f8fafc');
    clone.insertBefore(bgRect, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

interface SyntaxToken {
  text: string;
  color: string;
  italic?: boolean;
  bold?: boolean;
}

const CPP_KEYWORDS = new Set([
  'void', 'int', 'long', 'float', 'double', 'bool', 'boolean', 'char', 'byte',
  'const', 'unsigned', 'if', 'else', 'for', 'while', 'return', 'true', 'false',
  'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'include', 'define',
]);

const ARDUINO_APIS = new Set([
  'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead',
  'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros', 'map',
  'constrain', 'tone', 'noTone', 'pulseIn', 'Serial', 'begin', 'print',
  'println', 'available', 'read', 'Servo', 'attach', 'write',
]);

function tokenizeCppLine(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const commentIdx = line.indexOf('//');
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

  const regex = /("[^"]*"|'[^']*'|#\w+|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[^\s\w"']|\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(codePart)) !== null) {
    const word = match[0];
    if (word.startsWith('#')) {
      tokens.push({ text: word, color: '#0369a1', bold: true });
    } else if (word.startsWith('"') || word.startsWith("'")) {
      tokens.push({ text: word, color: '#047857' });
    } else if (/^\d/.test(word)) {
      tokens.push({ text: word, color: '#be123c' });
    } else if (CPP_KEYWORDS.has(word)) {
      tokens.push({ text: word, color: '#006d73', bold: true });
    } else if (ARDUINO_APIS.has(word)) {
      tokens.push({ text: word, color: '#6d28d9', bold: true });
    } else {
      tokens.push({ text: word, color: '#1e293b' });
    }
  }

  if (commentPart) {
    tokens.push({ text: commentPart, color: '#64748b', italic: true });
  }
  return tokens;
}

function drawPageHeader(
  ctx: CanvasRenderingContext2D,
  lang: Language,
  reportCode: string,
  dateStr: string,
  subtitle: string,
  isContinuation = false,
) {
  const isRtl = lang === 'ar';
  // Top Arduino Teal Accent Stripe
  ctx.fillStyle = '#00878F';
  ctx.fillRect(0, 0, PAGE_W, 18);

  // Header band background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 18, PAGE_W, isContinuation ? 112 : 148);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, isContinuation ? 130 : 166);
  ctx.lineTo(PAGE_W, isContinuation ? 130 : 166);
  ctx.stroke();

  // Brand Emblem Box
  const emblemSize = isContinuation ? 52 : 64;
  const emblemX = isRtl ? PAGE_W - MARGIN_X - emblemSize : MARGIN_X;
  const emblemY = isContinuation ? 48 : 54;
  drawRoundedRect(ctx, emblemX, emblemY, emblemSize, emblemSize, 14);
  ctx.fillStyle = '#00878F';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${isContinuation ? 32 : 40}px ${fontStack(lang, true)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('∞', emblemX + emblemSize / 2, emblemY + emblemSize / 2 + 2);
  ctx.textBaseline = 'alphabetic';

  // Brand Title & Subtitle
  const textLeft = MARGIN_X + emblemSize + 24;
  const textRight = PAGE_W - MARGIN_X - emblemSize - 24;
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${isContinuation ? 30 : 38}px ${fontStack(lang)}`;
  drawTextAligned(
    ctx,
    lang === 'ar' ? 'أردوينولاب — ArdunoLab' : 'ArdunoLab',
    textLeft,
    textRight,
    isContinuation ? 76 : 86,
    isRtl,
  );

  ctx.fillStyle = '#475569';
  ctx.font = `600 ${isContinuation ? 20 : 22}px ${fontStack(lang)}`;
  drawTextAligned(ctx, subtitle, textLeft, textRight, isContinuation ? 106 : 124, isRtl, 920);

  // Opposite-side Report Code & Date Badge
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = isRtl ? 'left' : 'right';
  const metaX = isRtl ? MARGIN_X : PAGE_W - MARGIN_X;
  ctx.fillStyle = '#00878F';
  ctx.font = `700 21px ${fontStack(lang, true)}`;
  ctx.fillText(reportCode, metaX, isContinuation ? 74 : 84);
  ctx.fillStyle = '#64748b';
  ctx.font = `600 18px ${fontStack(lang, true)}`;
  ctx.fillText(dateStr, metaX, isContinuation ? 104 : 116);
  ctx.restore();
}

function drawPageFooter(
  ctx: CanvasRenderingContext2D,
  lang: Language,
  pageNum: number,
  totalPages: number,
  reportCode: string,
) {
  const y = PAGE_H - 64;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y - 28);
  ctx.lineTo(PAGE_W - MARGIN_X, y - 28);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `600 18px ${fontStack(lang)}`;
  ctx.textAlign = 'left';
  ctx.fillText(`ArdunoLab · Arduino Uno R3 Lab Report · ${reportCode}`, MARGIN_X, y);

  ctx.textAlign = 'right';
  ctx.font = `700 18px ${fontStack(lang, true)}`;
  ctx.fillText(
    `${tLoc(REPORT_LABELS.pageWord, lang)} ${pageNum} / ${totalPages}`,
    PAGE_W - MARGIN_X,
    y,
  );
}

function drawSectionHeading(
  ctx: CanvasRenderingContext2D,
  title: string,
  y: number,
  lang: Language,
) {
  const isRtl = lang === 'ar';
  // Left/right accent bar
  const barX = isRtl ? PAGE_W - MARGIN_X - 8 : MARGIN_X;
  ctx.fillStyle = '#00878F';
  ctx.fillRect(barX, y - 26, 8, 32);

  ctx.fillStyle = '#0f172a';
  ctx.font = `800 25px ${fontStack(lang)}`;
  drawTextAligned(
    ctx,
    title,
    MARGIN_X + 20,
    PAGE_W - MARGIN_X - 20,
    y,
    isRtl,
  );

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y + 14);
  ctx.lineTo(PAGE_W - MARGIN_X, y + 14);
  ctx.stroke();
}

export async function exportLabReportPdf(options: LabReportOptions): Promise<void> {
  const {
    lang,
    title,
    studentName,
    courseName,
    notes,
    viewMode,
    circuit,
    code,
    diagnostics,
    serialLog,
    includeSerialLog,
    svgElement,
  } = options;

  // Ensure web fonts (Cairo / Inter) are settled before drawing on canvas
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const isRtl = lang === 'ar';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const reportCode = `LAB-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const circuitImage = await renderCircuitSvgToImage(svgElement);
  const pages: HTMLCanvasElement[] = [];

  // =========================================================================
  // PAGE 1: COVER METADATA + CIRCUIT DIAGRAM + BOM + WIRING TABLE + NOTES
  // =========================================================================
  const p1 = createA4Canvas();
  const ctx = p1.ctx;
  drawPageHeader(
    ctx,
    lang,
    reportCode,
    dateStr,
    tLoc(REPORT_LABELS.reportSubtitle, lang),
    false,
  );

  // Metadata 2x2 Grid
  let cursorY = 196;
  const cardGap = 20;
  const cardW = (CONTENT_W - cardGap) / 2;
  const cardH = 82;

  const primaryDiag = diagnostics[0];
  const diagLabel = primaryDiag
    ? tLoc(primaryDiag.message, lang)
    : lang === 'ar'
      ? 'الدائرة جاهزة'
      : 'Circuit Ready';
  const diagColor =
    primaryDiag?.severity === 'error'
      ? '#dc2626'
      : primaryDiag?.severity === 'warning'
        ? '#d97706'
        : '#059669';

  const metaCards = [
    {
      label: tLoc(REPORT_LABELS.experiment, lang),
      value: title || 'Arduino Uno R3 Experiment',
      accent: '#0f172a',
    },
    {
      label: tLoc(REPORT_LABELS.student, lang),
      value:
        studentName.trim() +
        (courseName.trim() ? `  ·  ${courseName.trim()}` : ''),
      accent: '#0f172a',
    },
    {
      label: tLoc(REPORT_LABELS.hardware, lang),
      value: `Arduino Uno R3 (ATmega328P)  ·  ${
        viewMode === 'schematic' ? 'IEEE Schematic' : 'Breadboard'
      } (${circuit.components.length} parts, ${circuit.wires.length} wires)`,
      accent: '#006d73',
    },
    {
      label: tLoc(REPORT_LABELS.status, lang),
      value: diagLabel,
      accent: diagColor,
    },
  ];

  metaCards.forEach((card, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN_X + col * (cardW + cardGap);
    const y = cursorY + row * (cardH + 16);

    drawRoundedRect(ctx, x, y, cardW, cardH, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `700 16px ${fontStack(lang)}`;
    drawTextAligned(ctx, card.label, x + 18, x + cardW - 18, y + 28, isRtl, cardW - 36);

    ctx.fillStyle = card.accent;
    ctx.font = `700 20px ${fontStack(lang)}`;
    drawTextAligned(
      ctx,
      card.value || '—',
      x + 18,
      x + cardW - 18,
      y + 60,
      isRtl,
      cardW - 36,
    );
  });

  cursorY += cardH * 2 + 54;

  // Section 1: Circuit & Wiring Diagram
  drawSectionHeading(ctx, tLoc(REPORT_LABELS.sectionCircuit, lang), cursorY, lang);
  cursorY += 32;

  const diagramBoxH = 660;
  drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_W, diagramBoxH, 16);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (circuitImage) {
    const pad = 22;
    const availW = CONTENT_W - pad * 2;
    const availH = diagramBoxH - pad * 2;
    const aspect = 770 / 400;
    let drawW = availW;
    let drawH = drawW / aspect;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * aspect;
    }
    const dx = MARGIN_X + (CONTENT_W - drawW) / 2;
    const dy = cursorY + (diagramBoxH - drawH) / 2;
    ctx.drawImage(circuitImage, dx, dy, drawW, drawH);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = `600 22px ${fontStack(lang)}`;
    ctx.textAlign = 'center';
    ctx.fillText('Circuit diagram unavailable', PAGE_W / 2, cursorY + diagramBoxH / 2);
  }

  cursorY += diagramBoxH + 54;

  // Section 2 & 3 Side-by-Side: BOM (left) + Wiring Schedule (right)
  const colGap = 28;
  const halfW = (CONTENT_W - colGap) / 2;
  const bomX = MARGIN_X;
  const wireX = MARGIN_X + halfW + colGap;

  // Mini headings
  ctx.fillStyle = '#00878F';
  ctx.fillRect(isRtl ? bomX + halfW - 7 : bomX, cursorY - 24, 7, 28);
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 23px ${fontStack(lang)}`;
  drawTextAligned(ctx, tLoc(REPORT_LABELS.sectionBom, lang), bomX + 18, bomX + halfW - 18, cursorY, isRtl);

  ctx.fillStyle = '#00878F';
  ctx.fillRect(isRtl ? wireX + halfW - 7 : wireX, cursorY - 24, 7, 28);
  ctx.fillStyle = '#0f172a';
  drawTextAligned(ctx, tLoc(REPORT_LABELS.sectionWiring, lang), wireX + 18, wireX + halfW - 18, cursorY, isRtl);

  cursorY += 22;

  // Build BOM rows
  const bomCounts = new Map<
    string,
    { name: string; qty: number; details: string[] }
  >();
  bomCounts.set('uno', {
    name: 'Arduino Uno R3',
    qty: 1,
    details: ['ATmega328P · 5V'],
  });
  bomCounts.set('breadboard', {
    name: lang === 'ar' ? 'لوحة تجارب (Breadboard)' : 'Half-Size Breadboard',
    qty: 1,
    details: ['400 tie-points'],
  });

  circuit.components.forEach((c) => {
    const meta = PALETTE_COMPONENTS.find((p) => p.kind === c.kind);
    const labelName = meta ? tLoc(meta.name, lang) : c.kind;
    const entry = bomCounts.get(c.kind) || { name: labelName, qty: 0, details: [] };
    entry.qty += 1;
    if (typeof c.value === 'number' && c.value !== 0) {
      entry.details.push(`${c.label || c.kind}: ${c.value}`);
    } else if (c.label) {
      entry.details.push(c.label);
    }
    bomCounts.set(c.kind, entry);
  });

  const bomRows = Array.from(bomCounts.values()).slice(0, 12);
  const wireRows = circuit.wires.slice(0, 12);
  const maxRows = Math.max(bomRows.length, Math.max(1, wireRows.length));
  const rowH = 38;
  const tableHeaderH = 40;
  const tableH = tableHeaderH + maxRows * rowH + 10;

  // Draw BOM table box
  drawRoundedRect(ctx, bomX, cursorY, halfW, tableH, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Table header strip
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, bomX, cursorY, halfW, tableHeaderH, 10);
  ctx.fill();
  ctx.fillRect(bomX, cursorY + tableHeaderH - 10, halfW, 10);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 16px ${fontStack(lang)}`;
  ctx.textAlign = 'left';
  ctx.fillText(tLoc(REPORT_LABELS.compCol, lang), bomX + 16, cursorY + 26);
  ctx.textAlign = 'center';
  ctx.fillText(tLoc(REPORT_LABELS.qtyCol, lang), bomX + halfW * 0.56, cursorY + 26);
  ctx.textAlign = 'right';
  ctx.fillText(tLoc(REPORT_LABELS.detailCol, lang), bomX + halfW - 16, cursorY + 26);

  bomRows.forEach((row, idx) => {
    const ry = cursorY + tableHeaderH + idx * rowH;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bomX + 2, ry, halfW - 4, rowH);
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = `600 16px ${fontStack(lang)}`;
    ctx.textAlign = 'left';
    ctx.fillText(row.name, bomX + 16, ry + 25, halfW * 0.46);

    ctx.fillStyle = '#00878F';
    ctx.font = `700 16px ${fontStack(lang, true)}`;
    ctx.textAlign = 'center';
    ctx.fillText(`×${row.qty}`, bomX + halfW * 0.56, ry + 25);

    ctx.fillStyle = '#475569';
    ctx.font = `500 14px ${fontStack(lang, true)}`;
    ctx.textAlign = 'right';
    ctx.fillText(row.details.slice(0, 2).join(', ') || '—', bomX + halfW - 16, ry + 25, halfW * 0.36);
  });

  // Draw Wiring Schedule table box
  drawRoundedRect(ctx, wireX, cursorY, halfW, tableH, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, wireX, cursorY, halfW, tableHeaderH, 10);
  ctx.fill();
  ctx.fillRect(wireX, cursorY + tableHeaderH - 10, halfW, 10);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 16px ${fontStack(lang)}`;
  ctx.textAlign = 'left';
  ctx.fillText('#', wireX + 16, cursorY + 26);
  ctx.fillText(tLoc(REPORT_LABELS.fromCol, lang), wireX + 58, cursorY + 26);
  ctx.fillText(tLoc(REPORT_LABELS.toCol, lang), wireX + halfW * 0.52, cursorY + 26);

  if (wireRows.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = `500 16px ${fontStack(lang)}`;
    ctx.textAlign = 'center';
    ctx.fillText(tLoc(REPORT_LABELS.noWires, lang), wireX + halfW / 2, cursorY + tableHeaderH + 28);
  } else {
    wireRows.forEach((w, idx) => {
      const ry = cursorY + tableHeaderH + idx * rowH;
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(wireX + 2, ry, halfW - 4, rowH);
      }
      // Wire color dot
      ctx.beginPath();
      ctx.arc(wireX + 24, ry + 19, 7, 0, Math.PI * 2);
      ctx.fillStyle = w.color;
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = `600 14px ${fontStack(lang, true)}`;
      ctx.textAlign = 'left';
      ctx.fillText(formatNodeName(w.from, circuit), wireX + 46, ry + 24, halfW * 0.42);
      ctx.fillStyle = '#00878F';
      ctx.fillText('→', wireX + halfW * 0.48, ry + 24);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(formatNodeName(w.to, circuit), wireX + halfW * 0.52, ry + 24, halfW * 0.45);
    });
  }

  cursorY += tableH + 46;

  // Section 4: Student Observations & Signature Block (fits remaining Page 1 space)
  const remainingH = PAGE_H - 125 - cursorY;
  if (remainingH >= 170) {
    drawSectionHeading(ctx, tLoc(REPORT_LABELS.sectionNotes, lang), cursorY, lang);
    cursorY += 28;

    const notesBoxH = Math.min(280, remainingH - 64);
    drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_W, notesBoxH, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (notes.trim()) {
      ctx.fillStyle = '#1e293b';
      ctx.font = `500 20px ${fontStack(lang)}`;
      const lines = wrapTextLines(ctx, notes.trim(), CONTENT_W - 48);
      const maxNoteLines = Math.floor((notesBoxH - 28) / 30);
      lines.slice(0, maxNoteLines).forEach((ln, idx) => {
        drawTextAligned(
          ctx,
          ln,
          MARGIN_X + 24,
          PAGE_W - MARGIN_X - 24,
          cursorY + 38 + idx * 30,
          isRtl,
        );
      });
    } else {
      // Printable lined observation area for handwritten lab notes
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      for (let ly = cursorY + 46; ly < cursorY + notesBoxH - 16; ly += 42) {
        ctx.beginPath();
        ctx.moveTo(MARGIN_X + 24, ly);
        ctx.lineTo(PAGE_W - MARGIN_X - 24, ly);
        ctx.stroke();
      }
    }

    // Student & Instructor Signature Line
    ctx.fillStyle = '#475569';
    ctx.font = `600 18px ${fontStack(lang)}`;
    drawTextAligned(
      ctx,
      tLoc(REPORT_LABELS.signatureLine, lang),
      MARGIN_X,
      PAGE_W - MARGIN_X,
      cursorY + notesBoxH + 38,
      isRtl,
    );
  }

  pages.push(p1.canvas);

  // =========================================================================
  // PAGE 2+: AUTO-PAGINATED SYNTAX-HIGHLIGHTED ARDUINO C++ CODE (+ SERIAL LOG)
  // =========================================================================
  const codeLines = (code || '// Empty Arduino sketch').replace(/\r\n/g, '\n').split('\n');
  const lineH = 31;
  const codeTopStart = 216;
  const codeBottomLimit = PAGE_H - 125;
  const maxLinesPerPage = Math.floor((codeBottomLimit - codeTopStart - 36) / lineH);

  let lineCursor = 0;
  let lastCodeCtx: CanvasRenderingContext2D | null = null;
  let lastCodeEndY = codeTopStart;

  while (lineCursor < codeLines.length) {
    const pageObj = createA4Canvas();
    const cctx = pageObj.ctx;
    drawPageHeader(
      cctx,
      lang,
      reportCode,
      dateStr,
      `${title || 'Arduino Sketch'}  ·  ${tLoc(REPORT_LABELS.sectionCode, lang)}`,
      true,
    );

    drawSectionHeading(
      cctx,
      lineCursor === 0
        ? tLoc(REPORT_LABELS.sectionCode, lang)
        : `${tLoc(REPORT_LABELS.sectionCode, lang)} (cont.)`,
      176,
      lang,
    );

    const chunk = codeLines.slice(lineCursor, lineCursor + maxLinesPerPage);
    const boxH = Math.min(codeBottomLimit - codeTopStart, chunk.length * lineH + 40);

    // Code Card Container
    drawRoundedRect(cctx, MARGIN_X, codeTopStart, CONTENT_W, boxH, 14);
    cctx.fillStyle = '#f8fafc';
    cctx.fill();
    cctx.strokeStyle = '#cbd5e1';
    cctx.lineWidth = 1.8;
    cctx.stroke();

    // Line number gutter background
    cctx.fillStyle = '#eef2f6';
    drawRoundedRect(cctx, MARGIN_X, codeTopStart, 82, boxH, 12);
    cctx.fill();
    cctx.fillRect(MARGIN_X + 70, codeTopStart, 12, boxH);
    cctx.strokeStyle = '#cbd5e1';
    cctx.lineWidth = 1.2;
    cctx.beginPath();
    cctx.moveTo(MARGIN_X + 82, codeTopStart);
    cctx.lineTo(MARGIN_X + 82, codeTopStart + boxH);
    cctx.stroke();

    // Draw syntax-highlighted code lines (strictly LTR monospace)
    cctx.direction = 'ltr';
    chunk.forEach((rawLine, idx) => {
      const y = codeTopStart + 30 + idx * lineH;
      const lineNum = lineCursor + idx + 1;

      cctx.fillStyle = '#94a3b8';
      cctx.font = `600 17px ${fontStack(lang, true)}`;
      cctx.textAlign = 'right';
      cctx.fillText(String(lineNum), MARGIN_X + 68, y);

      let drawX = MARGIN_X + 102;
      const maxRight = PAGE_W - MARGIN_X - 20;
      const tokens = tokenizeCppLine(rawLine.replace(/\t/g, '  '));
      cctx.textAlign = 'left';

      for (const tok of tokens) {
        if (drawX >= maxRight) break;
        const style = `${tok.italic ? 'italic ' : ''}${tok.bold ? '700' : '500'} 18px ${fontStack(lang, true)}`;
        cctx.font = style;
        cctx.fillStyle = tok.color;
        const w = cctx.measureText(tok.text).width;
        if (drawX + w > maxRight) {
          cctx.fillText(tok.text, drawX, y, Math.max(20, maxRight - drawX));
          break;
        }
        cctx.fillText(tok.text, drawX, y);
        drawX += w;
      }
    });

    lastCodeCtx = cctx;
    lastCodeEndY = codeTopStart + boxH;
    pages.push(pageObj.canvas);
    lineCursor += chunk.length;
  }

  // Optional Serial Monitor Output Capture on the bottom of last page (if space permits)
  if (includeSerialLog && serialLog.length > 0 && lastCodeCtx) {
    const availH = PAGE_H - 125 - (lastCodeEndY + 56);
    if (availH >= 200) {
      const sY = lastCodeEndY + 52;
      drawSectionHeading(lastCodeCtx, tLoc(REPORT_LABELS.sectionSerial, lang), sY, lang);
      const boxY = sY + 28;
      const logRows = serialLog.slice(-Math.min(12, Math.floor((availH - 70) / 28)));
      const boxH = logRows.length * 28 + 32;

      drawRoundedRect(lastCodeCtx, MARGIN_X, boxY, CONTENT_W, boxH, 12);
      lastCodeCtx.fillStyle = '#0f172a';
      lastCodeCtx.fill();

      lastCodeCtx.direction = 'ltr';
      lastCodeCtx.textAlign = 'left';
      lastCodeCtx.font = `500 16px ${fontStack(lang, true)}`;
      logRows.forEach((entry, idx) => {
        const y = boxY + 28 + idx * 28;
        lastCodeCtx!.fillStyle = '#64748b';
        lastCodeCtx!.fillText(`[${entry.timestamp}]`, MARGIN_X + 20, y);
        lastCodeCtx!.fillStyle = entry.direction === 'tx' ? '#38bdf8' : '#34d399';
        lastCodeCtx!.fillText(
          `${entry.direction === 'tx' ? '>' : '<'} ${entry.text}`,
          MARGIN_X + 148,
          y,
          CONTENT_W - 170,
        );
      });
    }
  }

  // Stamp consistent footers on every page & build final multi-page A4 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((canvas, idx) => {
    const pageCtx = canvas.getContext('2d')!;
    drawPageFooter(pageCtx, lang, idx + 1, pages.length, reportCode);
    const imgData = canvas.toDataURL('image/png');
    if (idx > 0) doc.addPage('a4', 'portrait');
    doc.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const slug = (title || 'ardunolab_circuit')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
  doc.save(`${slug || 'ardunolab'}_lab_report.pdf`);
}
