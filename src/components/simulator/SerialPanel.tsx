import { useEffect, useRef, useState } from 'react';
import { Activity, Send, Terminal, Trash2 } from 'lucide-react';
import type { SerialEntry } from '../../types/arduino';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { cn } from '../../lib/utils';

interface SerialPanelProps {
  lang: Language;
  entries: SerialEntry[];
  plotData: number[];
  onClear: () => void;
  onSendInput: (text: string) => void;
}

export function SerialPanel({
  lang,
  entries,
  plotData,
  onClear,
  onSendInput,
}: SerialPanelProps) {
  const [tab, setTab] = useState<'monitor' | 'plotter'>('monitor');
  const [baud, setBaud] = useState('9600');
  const [inputText, setInputText] = useState('');
  const logRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  // Dynamic Real-Time Serial Plotter Canvas Rendering
  useEffect(() => {
    if (tab !== 'plotter') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark lab background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    // Subtle coordinate gridlines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const x = (width / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (plotData.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText('Waiting for numeric Serial.println(...) telemetry...', 16, height / 2);
      return;
    }

    const minVal = Math.min(...plotData);
    const maxVal = Math.max(...plotData);
    const span = Math.max(10, maxVal - minVal);
    const padTop = 16;
    const padBot = 16;
    const usableH = height - padTop - padBot;

    const toY = (v: number) =>
      height - padBot - ((v - minVal) / span) * usableH;

    // Area fill under curve
    ctx.beginPath();
    plotData.forEach((v, idx) => {
      const x = (idx / Math.max(1, plotData.length - 1)) * width;
      const y = toY(v);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(0, 165, 174, 0.35)');
    grad.addColorStop(1, 'rgba(0, 165, 174, 0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp signal line
    ctx.beginPath();
    plotData.forEach((v, idx) => {
      const x = (idx / Math.max(1, plotData.length - 1)) * width;
      const y = toY(v);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Latest point highlight
    const lastVal = plotData[plotData.length - 1];
    const lastY = toY(lastVal);
    ctx.beginPath();
    ctx.arc(width - 4, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`MAX ${maxVal}`, 8, 13);
    ctx.fillText(`MIN ${minVal}`, 8, height - 5);
  }, [tab, plotData]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendInput(inputText.trim());
    setInputText('');
  };

  const latest = plotData.length > 0 ? plotData[plotData.length - 1] : null;

  return (
    <div className="flex flex-col h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
      {/* Header Tabs & Controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('monitor')}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer',
              tab === 'monitor'
                ? 'bg-[#00878F] text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{tLoc(translations.simulator.serialMonitor, lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('plotter')}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer',
              tab === 'plotter'
                ? 'bg-[#00878F] text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{tLoc(translations.simulator.serialPlotter, lang)}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {tab === 'plotter' && latest !== null && (
            <span className="font-mono tabular-nums text-[#00878F] dark:text-[#22c6cf] font-semibold">
              VAL: {latest}
            </span>
          )}
          <select
            value={baud}
            onChange={(e) => setBaud(e.target.value)}
            aria-label="Baud rate"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300"
          >
            <option value="9600">9600 baud</option>
            <option value="57600">57600 baud</option>
            <option value="115200">115200 baud</option>
          </select>
          <button
            type="button"
            onClick={onClear}
            title={tLoc(translations.simulator.clear, lang)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {tab === 'monitor' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b1120] text-slate-200" dir="ltr">
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs space-y-0.5"
          >
            {entries.length === 0 ? (
              <div className="text-slate-500 italic">
                Serial ready at {baud} baud. Start simulation to stream output...
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex items-baseline gap-2">
                  <span className="text-slate-500 tabular-nums shrink-0">
                    {entry.timestamp}
                  </span>
                  <span
                    className={
                      entry.direction === 'tx'
                        ? 'text-amber-400'
                        : 'text-teal-300'
                    }
                  >
                    {entry.direction === 'tx' ? '→ ' : ''}
                    {entry.text}
                  </span>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-2.5 py-1.5 border-t border-slate-800 bg-[#111827]"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send serial input..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00878F]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-semibold cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>{tLoc(translations.simulator.send, lang)}</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 bg-[#0b1120] p-1">
          <canvas
            ref={canvasRef}
            width={640}
            height={140}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
}
