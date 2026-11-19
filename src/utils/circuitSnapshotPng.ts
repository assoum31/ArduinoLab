import type { CircuitState } from '../types/arduino';
import type { Language } from '../i18n/translations';

export interface CircuitPngSnapshotOptions {
  svgElement: SVGSVGElement | null;
  title: string;
  viewMode: 'breadboard' | 'schematic';
  circuit: CircuitState;
  lang: Language;
  darkMode?: boolean;
  scale?: number;
}

const SVG_BASE_W = 770;
const SVG_BASE_H = 400;

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

function loadSvgAsImage(
  svgEl: SVGSVGElement,
  targetW: number,
  targetH: number,
  backdropFill: string,
): Promise<HTMLImageElement> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  // Normalize to full board frame regardless of current interactive zoom/pan
  clone.setAttribute('viewBox', `0 0 ${SVG_BASE_W} ${SVG_BASE_H}`);
  clone.setAttribute('width', String(targetW));
  clone.setAttribute('height', String(targetH));

  // Exclude transient editing overlays (like drag crosshairs or snap-grid guides)
  clone.querySelectorAll('[data-export-exclude="true"]').forEach((node) => node.remove());

  // Place crisp solid backdrop underneath grid so exported PNG has zero transparent holes
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(SVG_BASE_W));
  bgRect.setAttribute('height', String(SVG_BASE_H));
  bgRect.setAttribute('fill', backdropFill);
  clone.insertBefore(bgRect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize circuit SVG'));
    };
    img.src = url;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const binary = atob(dataUrl.split(',')[1] || '');
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          resolve(new Blob([bytes], { type: 'image/png' }));
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to encode PNG snapshot'));
        }
      },
      'image/png',
      1.0,
    );
  });
}

/**
 * Generates and triggers download of a high-resolution (4x retina, 3200x1820)
 * presentation-ready PNG snapshot of the current breadboard or schematic circuit.
 */
export async function exportCircuitSnapshotPng({
  svgElement,
  title,
  viewMode,
  circuit,
  lang,
  darkMode = false,
  scale = 4,
}: CircuitPngSnapshotOptions): Promise<void> {
  if (!svgElement) {
    throw new Error('Circuit canvas is not ready for export');
  }

  const boardW = SVG_BASE_W * scale; // 3080px at 4x
  const boardH = SVG_BASE_H * scale; // 1600px at 4x
  const padX = 60;
  const headerH = 116;
  const footerH = 68;
  const totalW = boardW + padX * 2;
  const totalH = headerH + boardH + footerH + 24;

  const palette = darkMode
    ? {
        outerBg: '#090f1d',
        boardBg: '#0d1424',
        border: '#1e293b',
        titleText: '#f8fafc',
        mutedText: '#94a3b8',
        accent: '#22c6cf',
        chipBg: '#111c33',
        chipBorder: '#1f3252',
      }
    : {
        outerBg: '#ffffff',
        boardBg: '#f8fafc',
        border: '#cbd5e1',
        titleText: '#0f172a',
        mutedText: '#475569',
        accent: '#00878F',
        chipBg: '#f1f5f9',
        chipBorder: '#cbd5e1',
      };

  const img = await loadSvgAsImage(svgElement, boardW, boardH, palette.boardBg);

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Outer presentation canvas background
  ctx.fillStyle = palette.outerBg;
  ctx.fillRect(0, 0, totalW, totalH);

  // Subtle top accent stripe
  ctx.fillStyle = '#00878F';
  ctx.fillRect(0, 0, totalW, 8);

  const uiFont =
    lang === 'ar'
      ? '"Cairo", "Inter", system-ui, sans-serif'
      : '"Inter", "Cairo", system-ui, sans-serif';
  const monoFont =
    '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';

  // Header metadata: Brand + Circuit Title on left, View Mode & Parts/Wires stats on right
  const cleanTitle = (title || 'Arduino Uno R3 Circuit').trim();
  const isRtlTitle = /[\u0600-\u06FF]/.test(cleanTitle);

  ctx.save();
  ctx.fillStyle = palette.accent;
  ctx.font = `800 26px ${monoFont}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('ARDUNOLAB', padX, 46);

  ctx.fillStyle = palette.mutedText;
  ctx.font = `600 22px ${uiFont}`;
  ctx.fillText('•', padX + 168, 46);

  ctx.fillStyle = palette.titleText;
  ctx.font = `700 32px ${uiFont}`;
  if (isRtlTitle) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText(cleanTitle, padX + 1480, 48, 1280);
  } else {
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillText(cleanTitle, padX + 194, 48, 1550);
  }
  ctx.restore();

  // Right-side summary badge (View Mode · Parts · Wires)
  const modeLabel =
    viewMode === 'schematic'
      ? lang === 'ar'
        ? 'المخطط النظري'
        : lang === 'fr'
          ? 'Schéma'
          : 'Schematic'
      : lang === 'ar'
        ? 'لوحة التجارب'
        : lang === 'fr'
          ? 'Plaque d’essai'
          : 'Breadboard';
  const partsWord = lang === 'ar' ? 'مكونات' : lang === 'fr' ? 'composants' : 'parts';
  const wiresWord = lang === 'ar' ? 'أسلاك' : lang === 'fr' ? 'fils' : 'wires';
  const statsText = `${modeLabel}   |   ${circuit.components.length} ${partsWord}   •   ${circuit.wires.length} ${wiresWord}`;

  ctx.save();
  ctx.font = `600 24px ${uiFont}`;
  const statsW = Math.min(920, ctx.measureText(statsText).width + 48);
  const chipX = totalW - padX - statsW;
  const chipY = 26;
  const chipH = 52;
  drawRoundedRect(ctx, chipX, chipY, statsW, chipH, 12);
  ctx.fillStyle = palette.chipBg;
  ctx.fill();
  ctx.strokeStyle = palette.chipBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = palette.titleText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statsText, chipX + statsW / 2, chipY + chipH / 2 + 1, statsW - 24);
  ctx.restore();

  // Framed High-Resolution Circuit Stage
  ctx.save();
  drawRoundedRect(ctx, padX, headerH, boardW, boardH, 20);
  ctx.clip();
  ctx.drawImage(img, padX, headerH, boardW, boardH);
  ctx.restore();

  drawRoundedRect(ctx, padX, headerH, boardW, boardH, 20);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Subtle bottom caption bar (Board spec + timestamp + resolution)
  const footerY = headerH + boardH + 42;
  const dateStr = new Date().toLocaleString(
    lang === 'ar' ? 'ar-EG' : lang === 'fr' ? 'fr-FR' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' },
  );

  ctx.save();
  ctx.fillStyle = palette.mutedText;
  ctx.font = `500 22px ${monoFont}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`Arduino Uno R3 (ATmega328P)  •  ${totalW}×${totalH} PNG`, padX + 4, footerY);

  ctx.textAlign = 'right';
  ctx.font = `500 22px ${uiFont}`;
  ctx.fillText(dateStr, totalW - padX - 4, footerY);
  ctx.restore();

  // Encode & trigger clean download
  const pngBlob = await canvasToPngBlob(canvas);
  const downloadUrl = URL.createObjectURL(pngBlob);
  const safeBase =
    cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'ardunolab_circuit';

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${safeBase}_${viewMode}_snapshot.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
}
