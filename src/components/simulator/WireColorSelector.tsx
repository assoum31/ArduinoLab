import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Eye, Palette, Sparkles, X } from 'lucide-react';
import type { WireConnection } from '../../types/arduino';
import { tLoc, translations, type Language, type LocalizedText } from '../../i18n/translations';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

export interface WireColorOption {
  id: string;
  hex: string;
  label: string;
  name: LocalizedText;
  role: LocalizedText;
  shortcut: string;
  isLight?: boolean;
}

export const WIRE_COLORS: WireColorOption[] = [
  {
    id: 'red',
    hex: '#ef4444',
    label: '5V / Red',
    name: { ar: 'أحمر', en: 'Red', fr: 'Rouge' },
    role: { ar: 'طاقة +5V', en: '+5V Power', fr: 'Alim +5V' },
    shortcut: '1',
  },
  {
    id: 'black',
    hex: '#1e293b',
    label: 'GND / Black',
    name: { ar: 'أسود', en: 'Black', fr: 'Noir' },
    role: { ar: 'أرضي GND', en: 'GND Ground', fr: 'Masse GND' },
    shortcut: '2',
  },
  {
    id: 'green',
    hex: '#22c55e',
    label: 'Digital / Green',
    name: { ar: 'أخضر', en: 'Green', fr: 'Vert' },
    role: { ar: 'رقمي I/O', en: 'Digital I/O', fr: 'Numérique' },
    shortcut: '3',
  },
  {
    id: 'yellow',
    hex: '#eab308',
    label: 'PWM / Yellow',
    name: { ar: 'أصفر', en: 'Yellow', fr: 'Jaune' },
    role: { ar: 'إشارة / PWM', en: 'PWM / Signal', fr: 'Signal / PWM' },
    shortcut: '4',
  },
  {
    id: 'blue',
    hex: '#3b82f6',
    label: 'Analog / Blue',
    name: { ar: 'أزرق', en: 'Blue', fr: 'Bleu' },
    role: { ar: 'تماثلي / بيانات', en: 'Analog / Data', fr: 'Analogique' },
    shortcut: '5',
  },
  {
    id: 'orange',
    hex: '#f97316',
    label: '3.3V / Orange',
    name: { ar: 'برتقالي', en: 'Orange', fr: 'Orange' },
    role: { ar: '3.3V / ساعة', en: '3.3V / Clock', fr: '3.3V / Horloge' },
    shortcut: '6',
  },
  {
    id: 'purple',
    hex: '#a855f7',
    label: 'I2C / Purple',
    name: { ar: 'بنفسجي', en: 'Purple', fr: 'Violet' },
    role: { ar: 'ناقل I2C / SPI', en: 'I2C / Bus', fr: 'Bus I2C' },
    shortcut: '7',
  },
  {
    id: 'cyan',
    hex: '#06b6d4',
    label: 'Sensor / Cyan',
    name: { ar: 'سماوي', en: 'Cyan', fr: 'Cyan' },
    role: { ar: 'حساس / RX-TX', en: 'Sensor / UART', fr: 'Capteur / UART' },
    shortcut: '8',
  },
  {
    id: 'white',
    hex: '#e2e8f0',
    label: 'Aux / White',
    name: { ar: 'أبيض', en: 'White', fr: 'Blanc' },
    role: { ar: 'مرجعي / إضافي', en: 'Aux / Ref', fr: 'Aux / Réf' },
    shortcut: '9',
    isLight: true,
  },
];

const PWM_PIN_IDS = new Set(['D3', 'D5', 'D6', 'D9', 'D10', 'D11']);

/**
 * Determines whether a hex color is bright enough to need dark checkmarks & a subtle wire outline.
 */
export function isLightWireHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
}

/**
 * Recommends a standard electronics wire color based on the starting pin/rail role.
 */
export function getSmartWireColorForNode(nodeId: string): string | null {
  if (nodeId.startsWith('arduino:')) {
    const pin = nodeId.slice('arduino:'.length);
    if (pin === '5V' || pin === 'VIN') return '#ef4444'; // Red
    if (pin.startsWith('GND')) return '#1e293b'; // Black
    if (pin === '3.3V') return '#f97316'; // Orange
    if (pin.startsWith('A')) return '#3b82f6'; // Blue
    if (PWM_PIN_IDS.has(pin)) return '#eab308'; // Yellow
    if (pin.startsWith('D')) return '#22c55e'; // Green
  }
  if (nodeId.startsWith('bb:pos:')) return '#ef4444';
  if (nodeId.startsWith('bb:neg:')) return '#1e293b';
  if (nodeId.startsWith('comp:')) {
    const pinId = nodeId.split(':')[2] ?? '';
    if (pinId === 'vcc' || pinId === 'anode' || pinId === 'pos') return '#ef4444';
    if (pinId === 'gnd' || pinId === 'cathode' || pinId === 'neg') return '#1e293b';
    if (pinId === 'sig' || pinId === 'trig' || pinId === 'echo') return '#eab308';
  }
  return null;
}

interface WireColorSelectorProps {
  lang: Language;
  wireColor: string;
  onSelectColor: (hex: string) => void;
  autoColorByPin: boolean;
  onToggleAutoColor: () => void;
  wires: WireConnection[];
  colorFilterHex: string | null;
  onChangeColorFilter: (hex: string | null) => void;
  wiringToolActive: boolean;
}

export function WireColorSelector({
  lang,
  wireColor,
  onSelectColor,
  autoColorByPin,
  onToggleAutoColor,
  wires,
  colorFilterHex,
  onChangeColorFilter,
  wiringToolActive,
}: WireColorSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activePreset = useMemo(
    () => WIRE_COLORS.find((wc) => wc.hex.toLowerCase() === wireColor.toLowerCase()) ?? null,
    [wireColor],
  );

  // Count placed wires grouped by color for instant circuit-debugging isolation
  const wireColorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of wires) {
      const key = w.color.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([hex, count]) => {
        const preset = WIRE_COLORS.find((wc) => wc.hex.toLowerCase() === hex);
        return {
          hex,
          count,
          label: preset ? tLoc(preset.name, lang) : hex.toUpperCase(),
          role: preset ? tLoc(preset.role, lang) : '',
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [wires, lang]);

  const activeName = activePreset
    ? tLoc(activePreset.name, lang)
    : wireColor.toUpperCase();
  const activeRole = activePreset ? tLoc(activePreset.role, lang) : tLoc(translations.simulator.wireColorCustom, lang);

  // First 6 core electronics colors inline for zero-click friction, full 9 + custom in popover
  const quickSwatches = WIRE_COLORS.slice(0, 6);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5">
      {/* Quick-access jumper color swatches */}
      <div
        role="radiogroup"
        aria-label={tLoc(translations.simulator.wireColor, lang)}
        className="flex items-center gap-1"
      >
        {quickSwatches.map((wc) => {
          const selected = wireColor.toLowerCase() === wc.hex.toLowerCase();
          const light = isLightWireHex(wc.hex);
          return (
            <button
              key={wc.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${tLoc(wc.name, lang)} — ${tLoc(wc.role, lang)} (${wc.shortcut})`}
              title={`${tLoc(wc.name, lang)} · ${tLoc(wc.role, lang)} (${wc.shortcut})`}
              onClick={() => {
                soundEngine.playSelect();
                onSelectColor(wc.hex);
              }}
              className={cn(
                'relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
                selected
                  ? 'scale-115 border-[#00878F] ring-2 ring-[#00878F]/35 z-10'
                  : 'border-white dark:border-slate-700 hover:scale-110',
              )}
              style={{ backgroundColor: wc.hex }}
            >
              {selected && (
                <Check
                  className={cn(
                    'w-2.5 h-2.5 stroke-[3]',
                    light ? 'text-slate-900' : 'text-white',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable Color-Selector & Debug Filter Popover Trigger */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          soundEngine.playSelect();
          setOpen((v) => !v);
        }}
        title={tLoc(translations.simulator.wireColorPaletteTooltip, lang)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F]',
          open || colorFilterHex
            ? 'bg-[#00878F]/10 border-[#00878F] text-[#00878F] dark:text-[#22c6cf]'
            : wiringToolActive
              ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:border-[#00878F]'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#00878F]',
        )}
      >
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-slate-400/60"
          style={{ backgroundColor: wireColor }}
        />
        <span className="hidden md:inline max-w-[110px] truncate">{activeName}</span>
        {colorFilterHex && <Eye className="w-3 h-3 text-[#00878F] dark:text-[#22c6cf] shrink-0" />}
        <ChevronDown
          className={cn('w-3 h-3 opacity-70 transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>

      {/* Active Color Filter quick clear button */}
      {colorFilterHex && (
        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            onChangeColorFilter(null);
          }}
          title={tLoc(translations.simulator.wireColorShowAll, lang)}
          className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-slate-400/60 shrink-0"
            style={{ backgroundColor: colorFilterHex }}
          />
          <X className="w-3 h-3 shrink-0" />
        </button>
      )}

      {/* Color-Selector Popover */}
      {open && (
        <div
          role="dialog"
          aria-label={tLoc(translations.simulator.wireColor, lang)}
          className="absolute top-full start-0 mt-2 z-40 w-[308px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-xl p-3 text-slate-900 dark:text-slate-100"
        >
          {/* Header with active wire color summary */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Palette className="w-4 h-4 text-[#00878F] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">
                  {tLoc(translations.simulator.wireColor, lang)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activeName} · {activeRole}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 9 Standard Electronics Jumper Colors with Roles & Shortcuts */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {WIRE_COLORS.map((wc) => {
              const selected = wireColor.toLowerCase() === wc.hex.toLowerCase();
              const light = isLightWireHex(wc.hex);
              return (
                <button
                  key={wc.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    onSelectColor(wc.hex);
                  }}
                  className={cn(
                    'flex flex-col items-start gap-1 p-1.5 rounded-lg border text-start transition-colors cursor-pointer',
                    selected
                      ? 'border-[#00878F] bg-[#00878F]/10 dark:bg-[#00878F]/15'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/70 dark:bg-slate-900/50',
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        'flex items-center justify-center w-4 h-4 rounded-full border shrink-0',
                        light ? 'border-slate-400' : 'border-black/15 dark:border-white/20',
                      )}
                      style={{ backgroundColor: wc.hex }}
                    >
                      {selected && (
                        <Check
                          className={cn(
                            'w-2.5 h-2.5 stroke-[3]',
                            light ? 'text-slate-900' : 'text-white',
                          )}
                        />
                      )}
                    </span>
                    <kbd className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                      {wc.shortcut}
                    </kbd>
                  </div>
                  <div className="w-full min-w-0">
                    <div className="text-[11px] font-semibold leading-tight truncate">
                      {tLoc(wc.name, lang)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                      {tLoc(wc.role, lang)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center justify-between gap-2 py-2 border-t border-slate-200 dark:border-slate-800">
            <label
              htmlFor="ardunolab-custom-wire-color"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {tLoc(translations.simulator.wireColorCustom, lang)}
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 uppercase">
                {wireColor}
              </span>
              <input
                id="ardunolab-custom-wire-color"
                type="color"
                value={wireColor}
                onChange={(e) => onSelectColor(e.target.value)}
                className="w-7 h-6 rounded border border-slate-300 dark:border-slate-600 bg-transparent cursor-pointer p-0.5"
              />
            </div>
          </div>

          {/* Smart Auto-Color by Pin Role Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={autoColorByPin}
            onClick={() => {
              soundEngine.playSelect();
              onToggleAutoColor();
            }}
            className="w-full flex items-center justify-between gap-2 py-2 border-t border-slate-200 dark:border-slate-800 text-start cursor-pointer group"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-[#00878F] shrink-0" />
                <span className="truncate">
                  {tLoc(translations.simulator.wireColorAutoByPin, lang)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {tLoc(translations.simulator.wireColorAutoByPinDesc, lang)}
              </p>
            </div>
            <span
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                autoColorByPin ? 'bg-[#00878F]' : 'bg-slate-300 dark:bg-slate-700',
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform',
                  autoColorByPin ? 'translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-0.5 rtl:-translate-x-0.5',
                )}
              />
            </span>
          </button>

          {/* Circuit Debugging: Isolate / Highlight Wires by Color */}
          {wireColorCounts.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {tLoc(translations.simulator.wireColorDebugFilter, lang)}
                </span>
                {colorFilterHex && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSelect();
                      onChangeColorFilter(null);
                    }}
                    className="text-[11px] font-semibold text-[#00878F] dark:text-[#22c6cf] hover:underline cursor-pointer"
                  >
                    {tLoc(translations.simulator.wireColorShowAll, lang)}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {wireColorCounts.map((item) => {
                  const isFiltered = colorFilterHex?.toLowerCase() === item.hex;
                  return (
                    <button
                      key={item.hex}
                      type="button"
                      aria-pressed={isFiltered}
                      onClick={() => {
                        soundEngine.playSelect();
                        onChangeColorFilter(isFiltered ? null : item.hex);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer',
                        isFiltered
                          ? 'bg-[#00878F] text-white border-[#00878F]'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#00878F]',
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-400/60 shrink-0"
                        style={{ backgroundColor: item.hex }}
                      />
                      <span>{item.label}</span>
                      <span className="font-mono tabular-nums opacity-75">({item.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hotkey reference footer */}
          <p className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            {tLoc(translations.simulator.wireColorHotkeyHint, lang)}
          </p>
        </div>
      )}
    </div>
  );
}
