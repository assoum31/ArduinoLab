import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import type { AnalogPinId, AnalogPinTelemetry } from '../../engine/arduinoSim';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

const ANALOG_PINS: AnalogPinId[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

const CHANNEL_COLORS: Record<AnalogPinId, string> = {
  A0: '#22d3ee', // Cyan
  A1: '#fbbf24', // Amber
  A2: '#34d399', // Emerald
  A3: '#a78bfa', // Violet
  A4: '#fb7185', // Rose
  A5: '#38bdf8', // Sky
};

const TIMEBASE_OPTIONS = [50, 100, 250, 500] as const; // ms/div across 10 horizontal divisions
const VOLTS_DIV_OPTIONS = [0.5, 1.0, 2.0] as const; // V/div across 5 vertical divisions
const MAX_SAMPLES = 240;

interface OscilloscopePanelProps {
  lang: Language;
  running: boolean;
  telemetry: Record<AnalogPinId, AnalogPinTelemetry>;
  onClose?: () => void;
}

export function OscilloscopePanel({
  lang,
  running,
  telemetry,
  onClose,
}: OscilloscopePanelProps) {
  const [enabledChannels, setEnabledChannels] = useState<Record<AnalogPinId, boolean>>({
    A0: true,
    A1: false,
    A2: false,
    A3: false,
    A4: false,
    A5: false,
  });
  const [focusedPin, setFocusedPin] = useState<AnalogPinId>('A0');
  const [frozen, setFrozen] = useState(false);
  const [msPerDiv, setMsPerDiv] = useState<(typeof TIMEBASE_OPTIONS)[number]>(100);
  const [voltsPerDiv, setVoltsPerDiv] = useState<(typeof VOLTS_DIV_OPTIONS)[number]>(1.0);
  const [triggerMode, setTriggerMode] = useState<'auto' | 'rising'>('auto');
  const [hoverInfo, setHoverInfo] = useState<{
    sampleIndex: number;
    relX: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  const runningRef = useRef(running);
  runningRef.current = running;

  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  const enabledRef = useRef(enabledChannels);
  enabledRef.current = enabledChannels;

  const focusedRef = useRef(focusedPin);
  focusedRef.current = focusedPin;

  const msPerDivRef = useRef(msPerDiv);
  msPerDivRef.current = msPerDiv;

  const voltsPerDivRef = useRef(voltsPerDiv);
  voltsPerDivRef.current = voltsPerDiv;

  const triggerModeRef = useRef(triggerMode);
  triggerModeRef.current = triggerMode;

  const hoverRef = useRef(hoverInfo);
  hoverRef.current = hoverInfo;

  // Rolling ring buffers per channel (in Volts)
  const buffersRef = useRef<Record<AnalogPinId, number[]>>({
    A0: [],
    A1: [],
    A2: [],
    A3: [],
    A4: [],
    A5: [],
  });

  // Live summary metrics updated ~6 times/sec for crisp tabular readout without React churn
  const [metrics, setMetrics] = useState<{
    vNow: number;
    vMin: number;
    vMax: number;
    vAvg: number;
    vPp: number;
    adc: number;
  }>({ vNow: 0, vMin: 0, vMax: 0, vAvg: 0, vPp: 0, adc: 0 });

  // Auto-enable newly wired analog pins when user loads a circuit or connects a sensor
  const connectedSig = useMemo(
    () =>
      ANALOG_PINS.filter((p) => telemetry[p]?.connected).join(','),
    [telemetry],
  );

  const prevConnectedSigRef = useRef<string>('');
  useEffect(() => {
    if (connectedSig === prevConnectedSigRef.current) return;
    prevConnectedSigRef.current = connectedSig;
    const connectedPins = connectedSig
      ? (connectedSig.split(',') as AnalogPinId[])
      : [];
    if (connectedPins.length > 0) {
      setEnabledChannels((prev) => {
        const next = { ...prev };
        for (const p of connectedPins) {
          next[p] = true;
        }
        return next;
      });
      setFocusedPin((prev) =>
        connectedPins.includes(prev) ? prev : connectedPins[0],
      );
      // Automatically expand vertical scale if a connected pin exceeds 5.5V (e.g. VIN 9V)
      const maxConnV = Math.max(
        ...connectedPins.map((p) => telemetry[p]?.voltage ?? 0),
      );
      if (maxConnV > 5.2) {
        setVoltsPerDiv(2.0);
      }
    }
  }, [connectedSig, telemetry]);

  const handleClearBuffers = () => {
    soundEngine.playSelect();
    for (const p of ANALOG_PINS) {
      buffersRef.current[p] = [];
    }
    setMetrics({ vNow: 0, vMin: 0, vMax: 0, vAvg: 0, vPp: 0, adc: 0 });
  };

  const toggleChannel = (pin: AnalogPinId) => {
    soundEngine.playSelect();
    setEnabledChannels((prev) => {
      const nextVal = !prev[pin];
      const next = { ...prev, [pin]: nextVal };
      if (nextVal) {
        setFocusedPin(pin);
      } else {
        const fallback = ANALOG_PINS.find((p) => next[p]);
        if (fallback) setFocusedPin(fallback);
      }
      return next;
    });
  };

  // Real-time sampling + 60fps Phosphor Oscilloscope Canvas Loop
  useEffect(() => {
    let rafId = 0;
    let lastSampleTs = performance.now();
    let lastMetricTs = 0;

    const sampleIntervalMs = () => {
      // 10 horizontal divisions across MAX_SAMPLES => msPerSample = (msPerDiv * 10) / MAX_SAMPLES
      return Math.max(12, Math.round((msPerDivRef.current * 10) / MAX_SAMPLES));
    };

    const tick = (now: number) => {
      const dt = now - lastSampleTs;
      const stepMs = sampleIntervalMs();

      if (!frozenRef.current && dt >= stepMs) {
        const steps = Math.min(4, Math.floor(dt / stepMs));
        lastSampleTs = now;
        const currentTelemetry = telemetryRef.current;
        const isSimRunning = runningRef.current;

        for (let s = 0; s < steps; s++) {
          const tSec = (now + s * stepMs) / 1000;
          for (const pin of ANALOG_PINS) {
            const info = currentTelemetry[pin];
            let v = 0;
            if (info?.connected) {
              if (typeof info.pwmDuty === 'number' && isSimRunning) {
                // Synthesize real-time PWM square wave scaled cleanly to oscilloscope sweep
                const phase = (tSec * 4.5) % 1;
                v = phase < info.pwmDuty ? 5.0 : 0.0;
              } else {
                // Realistic 10-bit ADC micro-ripple (±6 mV) when live so active trace feels alive
                const ripple =
                  isSimRunning && info.voltage > 0.02
                    ? Math.sin(tSec * 19 + pin.charCodeAt(1)) * 0.008 +
                      (Math.random() - 0.5) * 0.008
                    : 0;
                v = Math.max(0, info.voltage + ripple);
              }
            } else {
              // Unconnected floating analog input: tiny 50Hz mains hum pickup (~0.04V)
              v = isSimRunning
                ? Math.max(
                    0,
                    0.04 +
                      Math.sin(tSec * 14 + pin.charCodeAt(1) * 1.7) * 0.025 +
                      (Math.random() - 0.5) * 0.01,
                  )
                : 0;
            }

            const buf = buffersRef.current[pin];
            buf.push(v);
            if (buf.length > MAX_SAMPLES) {
              buf.shift();
            }
          }
        }
      }

      // Render high-DPI oscilloscope canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const targetW = Math.max(320, Math.round(rect.width * dpr));
        const targetH = Math.max(120, Math.round(rect.height * dpr));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const w = rect.width || 600;
          const h = rect.height || 150;

          // Deep CRT / bench oscilloscope chassis background
          ctx.fillStyle = '#070d19';
          ctx.fillRect(0, 0, w, h);

          const padL = 34;
          const padR = 10;
          const padT = 10;
          const padB = 18;
          const plotW = Math.max(40, w - padL - padR);
          const plotH = Math.max(40, h - padT - padB);
          const maxV = voltsPerDivRef.current * 5; // 5 vertical divisions

          const vToY = (volts: number) => {
            const clamped = Math.max(0, Math.min(maxV, volts));
            return padT + plotH - (clamped / maxV) * plotH;
          };

          // Graticule grid: 10 horizontal x 5 vertical divisions
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
          ctx.lineWidth = 1;
          for (let i = 0; i <= 5; i++) {
            const y = padT + (plotH / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + plotW, y);
            ctx.stroke();

            // Left voltage axis scale ticks
            const labelV = maxV - i * voltsPerDivRef.current;
            ctx.fillStyle = '#64748b';
            ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${labelV.toFixed(1)}V`, padL - 5, y);
          }

          for (let i = 0; i <= 10; i++) {
            const x = padL + (plotW / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, padT);
            ctx.lineTo(x, padT + plotH);
            ctx.stroke();
          }

          // Center crosshair subtle ticks
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          const midY = padT + plotH / 2;
          ctx.beginPath();
          ctx.moveTo(padL, midY);
          ctx.lineTo(padL + plotW, midY);
          ctx.stroke();

          // Rising-edge trigger reference line (2.5V or half full scale)
          const trigV = Math.min(2.5, maxV * 0.5);
          if (triggerModeRef.current === 'rising') {
            const trigY = vToY(trigV);
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padL, trigY);
            ctx.lineTo(padL + plotW, trigY);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`TRIG ↑ ${trigV.toFixed(1)}V`, padL + 4, trigY - 5);
            ctx.restore();
          }

          // Compute optional rising-edge trigger offset on focused channel
          let triggerShift = 0;
          if (triggerModeRef.current === 'rising') {
            const fBuf = buffersRef.current[focusedRef.current];
            if (fBuf.length > 20) {
              for (let i = Math.floor(fBuf.length * 0.35); i < fBuf.length - 1; i++) {
                if (fBuf[i - 1] < trigV && fBuf[i] >= trigV) {
                  triggerShift = Math.max(0, i - Math.floor(fBuf.length * 0.2));
                  break;
                }
              }
            }
          }

          // Draw active analog channel waveforms
          const activePins = ANALOG_PINS.filter((p) => enabledRef.current[p]);
          for (const pin of activePins) {
            const rawBuf = buffersRef.current[pin];
            if (rawBuf.length < 2) continue;
            const buf =
              triggerShift > 0 && rawBuf.length - triggerShift > 24
                ? rawBuf.slice(triggerShift)
                : rawBuf;
            const color = CHANNEL_COLORS[pin];
            const isFocused = pin === focusedRef.current;

            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < buf.length; i++) {
              const x = padL + (i / (MAX_SAMPLES - 1)) * plotW;
              const y = vToY(buf[i]);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = isFocused ? 2.2 : 1.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = isFocused ? 7 : 3;
            ctx.stroke();

            // Live beam head dot
            const lastIdx = buf.length - 1;
            const headX = padL + (lastIdx / (MAX_SAMPLES - 1)) * plotW;
            const headY = vToY(buf[lastIdx]);
            ctx.beginPath();
            ctx.arc(headX, headY, isFocused ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
          }

          // Interactive Hover Cursor Inspection Crosshair
          const hover = hoverRef.current;
          if (hover) {
            const cx = padL + hover.relX * plotW;
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, padT);
            ctx.lineTo(cx, padT + plotH);
            ctx.stroke();
            ctx.restore();

            const fPin = focusedRef.current;
            const fBuf = buffersRef.current[fPin];
            if (fBuf.length > 0) {
              const idx = Math.max(
                0,
                Math.min(fBuf.length - 1, Math.round(hover.relX * (MAX_SAMPLES - 1))),
              );
              const val = fBuf[idx] ?? 0;
              const cy = vToY(val);
              ctx.beginPath();
              ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
              ctx.fillStyle = CHANNEL_COLORS[fPin];
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Crisp cursor readout chip
              const adcAtCursor = Math.min(1023, Math.round((val / 5.0) * 1023));
              const tip = `${fPin}: ${val.toFixed(2)}V (ADC ${adcAtCursor})`;
              ctx.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, monospace';
              const tw = ctx.measureText(tip).width + 12;
              const bx = Math.min(padL + plotW - tw - 4, Math.max(padL + 4, cx + 8));
              const by = Math.max(padT + 4, cy - 22);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
              ctx.fillRect(bx, by, tw, 18);
              ctx.strokeStyle = CHANNEL_COLORS[fPin];
              ctx.lineWidth = 1;
              ctx.strokeRect(bx, by, tw, 18);
              ctx.fillStyle = '#f8fafc';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(tip, bx + 6, by + 9);
            }
          }

          // Bottom timebase caption inside graticule footer
          ctx.fillStyle = '#64748b';
          ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(
            `${msPerDivRef.current}ms/div  ·  ${voltsPerDivRef.current.toFixed(1)}V/div  ·  0–${maxV.toFixed(1)}V`,
            padL + 2,
            h - 3,
          );

          ctx.textAlign = 'right';
          ctx.fillStyle = frozenRef.current ? '#fbbf24' : '#34d399';
          ctx.fillText(
            frozenRef.current ? '● HOLD' : '● LIVE',
            padL + plotW - 2,
            h - 3,
          );

          ctx.restore();
        }
      }

      // Periodically refresh numeric statistics bar for focused channel
      if (now - lastMetricTs > 150) {
        lastMetricTs = now;
        const fPin = focusedRef.current;
        const fBuf = buffersRef.current[fPin];
        const info = telemetryRef.current[fPin];
        if (fBuf.length > 0) {
          let min = Infinity;
          let max = -Infinity;
          let sum = 0;
          for (let i = 0; i < fBuf.length; i++) {
            const v = fBuf[i];
            if (v < min) min = v;
            if (v > max) max = v;
            sum += v;
          }
          const vNow = fBuf[fBuf.length - 1];
          setMetrics({
            vNow,
            vMin: min,
            vMax: max,
            vAvg: sum / fBuf.length,
            vPp: Math.max(0, max - min),
            adc: info?.connected
              ? info.adc
              : Math.min(1023, Math.round((vNow / 5.0) * 1023)),
          });
        } else {
          setMetrics({
            vNow: info?.voltage ?? 0,
            vMin: info?.voltage ?? 0,
            vMax: info?.voltage ?? 0,
            vAvg: info?.voltage ?? 0,
            vPp: 0,
            adc: info?.adc ?? 0,
          });
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const focusedInfo = telemetry[focusedPin];
  const anyConnected = ANALOG_PINS.some((p) => telemetry[p]?.connected);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
      {/* Instrument Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf] shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {tLoc(translations.simulator.oscilloscopeTitle, lang)}
          </span>
          <span
            className={cn(
              'hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold',
              frozen
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                frozen ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse',
              )}
            />
            {frozen
              ? tLoc(translations.simulator.scopeFreeze, lang)
              : tLoc(translations.simulator.scopeLive, lang)}
          </span>
        </div>

        {/* Bench Controls: Timebase, Volts/Div, Trigger, Hold/Live, Clear */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <select
            value={msPerDiv}
            onChange={(e) => setMsPerDiv(Number(e.target.value) as (typeof TIMEBASE_OPTIONS)[number])}
            aria-label="Timebase ms per division"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {TIMEBASE_OPTIONS.map((ms) => (
              <option key={ms} value={ms}>
                {ms} ms/div
              </option>
            ))}
          </select>

          <select
            value={voltsPerDiv}
            onChange={(e) =>
              setVoltsPerDiv(Number(e.target.value) as (typeof VOLTS_DIV_OPTIONS)[number])
            }
            aria-label="Volts per division"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {VOLTS_DIV_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v.toFixed(1)} V/div
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setTriggerMode((m) => (m === 'auto' ? 'rising' : 'auto'));
            }}
            className={cn(
              'px-2 py-0.5 rounded border text-[11px] font-mono font-semibold transition-colors cursor-pointer',
              triggerMode === 'rising'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#00878F]',
            )}
          >
            {triggerMode === 'rising'
              ? tLoc(translations.simulator.scopeTriggerRise, lang)
              : tLoc(translations.simulator.scopeTriggerAuto, lang)}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              setFrozen((f) => !f);
            }}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer',
              frozen
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#00878F]',
            )}
          >
            {frozen ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>
              {frozen
                ? tLoc(translations.simulator.scopeLive, lang)
                : tLoc(translations.simulator.scopeFreeze, lang)}
            </span>
          </button>

          <button
            type="button"
            onClick={handleClearBuffers}
            title={tLoc(translations.simulator.clear, lang)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide Oscilloscope"
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Channel Probe Toggles (A0..A5) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0d1424]">
        <div className="flex flex-wrap items-center gap-1">
          {ANALOG_PINS.map((pin) => {
            const active = enabledChannels[pin];
            const info = telemetry[pin];
            const color = CHANNEL_COLORS[pin];
            const isFocus = focusedPin === pin && active;
            return (
              <button
                key={pin}
                type="button"
                onClick={() => toggleChannel(pin)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEnabledChannels((prev) => ({ ...prev, [pin]: true }));
                  setFocusedPin(pin);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold transition-all cursor-pointer',
                  active
                    ? 'bg-slate-900 text-white border-slate-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200',
                  isFocus && 'ring-1 ring-[#22d3ee]',
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: active ? color : 'transparent',
                    border: `1.5px solid ${color}`,
                  }}
                />
                <span>{pin}</span>
                {info?.connected && (
                  <span className="text-[10px] opacity-80 font-sans">
                    {info.sourceLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Focused Channel Live Numeric Readout Strip */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono tabular-nums text-[11px]"
          dir="ltr"
        >
          <span
            className="font-bold"
            style={{ color: CHANNEL_COLORS[focusedPin] }}
          >
            {focusedPin}: {metrics.vNow.toFixed(2)}V
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            ADC <strong className="text-slate-800 dark:text-slate-200">{metrics.adc}</strong>
          </span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
            Vpp <strong className="text-slate-800 dark:text-slate-200">{metrics.vPp.toFixed(2)}V</strong>
          </span>
          <span className="hidden md:inline text-slate-500 dark:text-slate-400">
            Avg <strong className="text-slate-800 dark:text-slate-200">{metrics.vAvg.toFixed(2)}V</strong>
          </span>
          <span className="hidden lg:inline text-slate-500 dark:text-slate-400">
            {metrics.vMin.toFixed(2)}–{metrics.vMax.toFixed(2)}V
          </span>
        </div>
      </div>

      {/* Live Phosphor Waveform Canvas */}
      <div
        className="relative h-40 sm:h-44 w-full bg-[#070d19] select-none"
        dir="ltr"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const padL = 34;
          const padR = 10;
          const plotW = Math.max(40, rect.width - padL - padR);
          const relX = Math.max(0, Math.min(1, (e.clientX - rect.left - padL) / plotW));
          setHoverInfo({
            sampleIndex: Math.round(relX * (MAX_SAMPLES - 1)),
            relX,
          });
        }}
        onPointerLeave={() => setHoverInfo(null)}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

        {!anyConnected && (
          <div className="pointer-events-none absolute top-2 right-3 max-w-[75%] px-2 py-1 rounded bg-slate-900/85 border border-slate-700/70 text-[10px] text-slate-300">
            {focusedInfo && !focusedInfo.connected
              ? tLoc(translations.simulator.scopeHint, lang)
              : null}
          </div>
        )}
      </div>
    </div>
  );
}
