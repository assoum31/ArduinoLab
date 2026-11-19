import * as THREE from 'three';

export type PcbFinish = 'teal' | 'obsidian' | 'cobalt' | 'emerald';

export interface PcbThemePalette {
  id: PcbFinish;
  label: { ar: string; en: string; fr: string };
  swatch: string;
  maskHex: string;
  edgeHex: number;
  traceLight: string;
  traceDark: string;
  silkscreen: string;
  accentLabel: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export const PCB_FINISHES: Record<PcbFinish, PcbThemePalette> = {
  teal: {
    id: 'teal',
    label: { ar: 'أردوينو كلاسيك', en: 'Classic Teal', fr: 'Teal Classique' },
    swatch: '#007d85',
    maskHex: '#007880',
    edgeHex: 0x00585e,
    traceLight: 'rgba(20, 190, 198, 0.36)',
    traceDark: 'rgba(0, 52, 58, 0.42)',
    silkscreen: '#f8fafc',
    accentLabel: '#fde68a',
    roughness: 0.28,
    clearcoat: 0.92,
    clearcoatRoughness: 0.14,
  },
  obsidian: {
    id: 'obsidian',
    label: { ar: 'أسود مطفي ذهبي', en: 'Matte Black Gold', fr: 'Noir Mat Or' },
    swatch: '#181c26',
    maskHex: '#151922',
    edgeHex: 0x0e1118,
    traceLight: 'rgba(212, 175, 55, 0.26)',
    traceDark: 'rgba(4, 6, 10, 0.65)',
    silkscreen: '#f4d06f',
    accentLabel: '#ffffff',
    roughness: 0.52,
    clearcoat: 0.22,
    clearcoatRoughness: 0.45,
  },
  cobalt: {
    id: 'cobalt',
    label: { ar: 'أزرق هندسي', en: 'Royal Cobalt', fr: 'Bleu Cobalt' },
    swatch: '#174ea6',
    maskHex: '#154799',
    edgeHex: 0x0e326e,
    traceLight: 'rgba(96, 165, 250, 0.34)',
    traceDark: 'rgba(10, 30, 72, 0.45)',
    silkscreen: '#ffffff',
    accentLabel: '#fde047',
    roughness: 0.24,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
  },
  emerald: {
    id: 'emerald',
    label: { ar: 'أخضر كلاسيكي', en: 'Vintage Emerald', fr: 'Émeraude' },
    swatch: '#0f6b43',
    maskHex: '#0d633d',
    edgeHex: 0x09472b,
    traceLight: 'rgba(52, 211, 153, 0.32)',
    traceDark: 'rgba(5, 46, 28, 0.45)',
    silkscreen: '#f8fafc',
    accentLabel: '#fcd34d',
    roughness: 0.3,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
  },
};

function drawCopperTraces(
  ctx: CanvasRenderingContext2D,
  lightStroke: string,
  darkStroke: string,
  padColor: string,
) {
  // Fine FR4 fiberglass weave subtle grid
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 0; y < 768; y += 8) {
    ctx.fillRect(0, y, 1024, 1);
  }
  for (let x = 0; x < 1024; x += 8) {
    ctx.fillRect(x, 0, 1, 768);
  }

  // Realistic 45-degree routed PCB copper buses from Digital pins to ATmega328P
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = lightStroke;
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 18; i++) {
    const startX = 225 + i * 41.5;
    ctx.beginPath();
    ctx.moveTo(startX, 44);
    ctx.lineTo(startX, 140 + (i % 4) * 14);
    ctx.lineTo(Math.min(860, startX + 35), 205 + (i % 5) * 18);
    ctx.lineTo(Math.min(860, startX + 35), 425);
    ctx.stroke();

    // Gold/copper via drill ring along trace
    ctx.fillStyle = padColor;
    ctx.beginPath();
    ctx.arc(startX, 132 + (i % 3) * 16, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0f18';
    ctx.beginPath();
    ctx.arc(startX, 132 + (i % 3) * 16, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom analog/power copper traces
  ctx.strokeStyle = darkStroke;
  ctx.lineWidth = 4;
  for (let i = 0; i < 14; i++) {
    const startX = 315 + i * 42;
    ctx.beginPath();
    ctx.moveTo(startX, 725);
    ctx.lineTo(startX, 600 - (i % 3) * 15);
    ctx.lineTo(startX - 28, 540);
    ctx.stroke();
  }

  // Ground plane pour hatch near USB & Regulator
  ctx.strokeStyle = lightStroke;
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(95 + i * 24, 380);
    ctx.lineTo(150 + i * 24, 490);
    ctx.stroke();
  }
}

export function createPcbAlbedoTexture(
  finish: PcbFinish,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const palette = PCB_FINISHES[finish];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Base solder mask
  ctx.fillStyle = palette.maskHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle radial sheen variation across PCB
  const grad = ctx.createLinearGradient(0, 0, 1024, 768);
  grad.addColorStop(0, 'rgba(255,255,255,0.06)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 768);

  const padColor = finish === 'cobalt' ? '#dbe2ea' : '#e5c158';
  drawCopperTraces(ctx, palette.traceLight, palette.traceDark, padColor);

  // Crisp silkscreen outer outline
  ctx.strokeStyle = palette.silkscreen;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(22, 22, 978, 724);
  ctx.globalAlpha = 1;

  // Brand Silkscreen Typography + Infinity Emblem
  ctx.fillStyle = palette.silkscreen;
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('ARDUINO', 310, 300);

  // Iconic UNO boxed reverse silkscreen badge
  ctx.fillStyle = palette.silkscreen;
  ctx.fillRect(546, 250, 152, 68);
  ctx.fillStyle = palette.maskHex;
  ctx.font = '900 50px sans-serif';
  ctx.fillText('UNO', 562, 302);

  // Small infinity circle icon next to ARDUINO
  ctx.strokeStyle = palette.silkscreen;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(265, 285, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = palette.silkscreen;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('∞', 265, 294);
  ctx.textAlign = 'left';

  ctx.font = 'bold 19px monospace';
  ctx.fillStyle = palette.silkscreen;
  ctx.globalAlpha = 0.92;
  ctx.fillText('R3  ·  ATmega328P  ·  16MHz', 312, 338);
  ctx.font = '700 17px monospace';
  ctx.fillText('DIGITAL (PWM ~)', 470, 128);
  ctx.fillText('POWER', 392, 646);
  ctx.fillText('ANALOG IN', 686, 646);
  ctx.globalAlpha = 1;

  // Top Digital Pin Labels
  const digitalLabels = [
    'SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8',
    '7', '~6', '~5', '4', '~3', '2', 'TX1', 'RX0',
  ];
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  digitalLabels.forEach((lbl, idx) => {
    const x = 226 + idx * 41.5;
    ctx.fillStyle = lbl.startsWith('~') ? palette.accentLabel : palette.silkscreen;
    ctx.fillText(lbl, x, 92);
  });

  // Bottom Power & Analog Labels
  const powerLabels = ['NC', 'IOREF', 'RST', '3.3V', '5V', 'GND', 'GND', 'VIN'];
  powerLabels.forEach((lbl, idx) => {
    const x = 315 + idx * 41;
    ctx.fillStyle = lbl === '5V' || lbl === '3.3V' ? '#fca5a5' : palette.silkscreen;
    ctx.fillText(lbl, x, 692);
  });

  const analogLabels = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  analogLabels.forEach((lbl, idx) => {
    const x = 678 + idx * 43;
    ctx.fillStyle = '#bae6fd';
    ctx.fillText(lbl, x, 692);
  });

  // SMD LED & ICSP silkscreen labels
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.silkscreen;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('L', 404, 212);
  ctx.fillText('TX', 404, 260);
  ctx.fillText('RX', 404, 300);
  ctx.fillText('ON', 820, 224);
  ctx.fillText('PWM D9', 770, 290);
  ctx.font = 'bold 14px monospace';
  ctx.fillText('ICSP', 882, 430);
  ctx.fillText('16U2', 202, 232);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

// Linear-space copper trace relief bump map so light catches traces under clearcoat
export function createPcbBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#707070';
  ctx.fillRect(0, 0, 1024, 768);

  // Subtle FR4 fiberglass micro-bump weave
  ctx.fillStyle = '#7a7a7a';
  for (let y = 0; y < 768; y += 6) {
    ctx.fillRect(0, y, 1024, 2);
  }
  for (let x = 0; x < 1024; x += 6) {
    ctx.fillRect(x, 0, 2, 768);
  }

  // Raised copper trace relief
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 18; i++) {
    const startX = 225 + i * 41.5;
    ctx.beginPath();
    ctx.moveTo(startX, 44);
    ctx.lineTo(startX, 140 + (i % 4) * 14);
    ctx.lineTo(Math.min(860, startX + 35), 205 + (i % 5) * 18);
    ctx.lineTo(Math.min(860, startX + 35), 425);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const startX = 315 + i * 42;
    ctx.beginPath();
    ctx.moveTo(startX, 725);
    ctx.lineTo(startX, 600 - (i % 3) * 15);
    ctx.lineTo(startX - 28, 540);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

// Brushed stainless/aluminum directional grain roughness texture
export function createBrushedMetalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#484848';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const v = 52 + Math.floor(Math.sin(y * 1.7) * 18 + ((y * 37) % 24));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 256, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

// Laser-etched ATmega328P DIP-28 epoxy top texture
export function createMcuTopTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Matte black molded epoxy compound with subtle speckle
  ctx.fillStyle = '#181c24';
  ctx.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 650; i++) {
    const x = (i * 73) % 512;
    const y = (i * 41) % 160;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Pin-1 circular dimple on left
  ctx.fillStyle = '#0d1016';
  ctx.beginPath();
  ctx.arc(46, 118, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Laser-etched crisp markings
  ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('ATMEL  2418', 110, 56);
  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
  ctx.fillText('ATMEGA328P-PU', 110, 98);
  ctx.font = '600 16px monospace';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
  ctx.fillText('35473D · 8-BIT AVR RISC', 110, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

// Anti-Static ESD Cutting Mat Texture beneath the Uno R3
export function createEsdMatTexture(
  isDark: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isDark ? '#0e1726' : '#dfe7ef';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle rubber micro-grain
  ctx.strokeStyle = isDark
    ? 'rgba(0, 135, 143, 0.16)'
    : 'rgba(0, 110, 120, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Major 128px centimeter grid lines
  ctx.strokeStyle = isDark
    ? 'rgba(34, 198, 207, 0.28)'
    : 'rgba(0, 135, 143, 0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Border frame & ESD workbench markings
  ctx.strokeStyle = isDark
    ? 'rgba(34, 198, 207, 0.42)'
    : 'rgba(0, 135, 143, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 928, 928);

  ctx.fillStyle = isDark
    ? 'rgba(148, 163, 184, 0.45)'
    : 'rgba(51, 65, 85, 0.55)';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('ARDUNOLAB · ESD SAFE WORKBENCH · 10mm GRID', 72, 86);
  ctx.fillText('ARDUINO UNO R3 · 68.6mm × 53.4mm', 72, 956);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

// Builds the authentic notched Arduino Uno R3 beveled PCB geometry with exact UVs
export function createUnoPcbGeometry(): THREE.ExtrudeGeometry {
  const hw = 2.8;
  const hh = 1.925;
  const shape = new THREE.Shape();

  // Iconic Uno R3 silhouette with angled right-edge notch
  shape.moveTo(-hw + 0.08, -hh);
  shape.lineTo(hw - 0.14, -hh);
  shape.lineTo(hw, -hh + 0.16);
  shape.lineTo(hw, -0.55);
  shape.lineTo(hw - 0.18, -0.35);
  shape.lineTo(hw - 0.18, 0.85);
  shape.lineTo(hw, 1.05);
  shape.lineTo(hw, hh - 0.14);
  shape.lineTo(hw - 0.14, hh);
  shape.lineTo(-hw + 0.08, hh);
  shape.lineTo(-hw, hh - 0.08);
  shape.lineTo(-hw, -hh + 0.08);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
    curveSegments: 6,
  });

  // Normalize top/bottom UVs to [0..1] matching exact 1024x768 silkscreen layout
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x + hw) / (hw * 2);
    const v = (y + hh) / (hh * 2);
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;

  // Rotate so board lies flat in XZ plane with top surface facing +Y
  geo.rotateX(-Math.PI / 2);
  // Center vertically so PCB rests symmetrically around Y=0 (top at Y ≈ +0.078)
  geo.translate(0, -0.06, 0);
  geo.computeVertexNormals();
  return geo;
}
