import React, { useMemo, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { tLoc, translations, type Language } from '../../i18n/translations';

interface CodeEditorProps {
  lang: Language;
  code: string;
  onChange: (nextCode: string) => void;
  onSyncToBlocks?: () => void;
  readOnly?: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightArduinoCpp(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const commentIdx = line.indexOf('//');
      const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
      const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

      let html = escapeHtml(codePart);
      // Strings
      html = html.replace(
        /(&quot;|")([^"]*?)(&quot;|")/g,
        '<span class="text-emerald-400">"$2"</span>',
      );
      // Preprocessor directives
      html = html.replace(
        /(#include|#define)\b/g,
        '<span class="text-fuchsia-400 font-semibold">$1</span>',
      );
      // Keywords & Types
      html = html.replace(
        /\b(void|int|float|double|long|unsigned|const|bool|byte|if|else|for|while|return|Servo)\b/g,
        '<span class="text-sky-400 font-semibold">$1</span>',
      );
      // Arduino built-in functions
      html = html.replace(
        /\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|millis|map|constrain|tone|noTone|pulseIn|Serial|begin|println|print|attach|write)\b/g,
        '<span class="text-teal-300">$1</span>',
      );
      // Constants
      html = html.replace(
        /\b(HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP|LED_BUILTIN|A0|A1|A2|A3|A4|A5)\b/g,
        '<span class="text-amber-300 font-semibold">$1</span>',
      );
      // Numbers
      html = html.replace(
        /\b(\d+)\b/g,
        '<span class="text-orange-300">$1</span>',
      );

      if (commentPart) {
        html += `<span class="text-slate-500 italic">${escapeHtml(commentPart)}</span>`;
      }
      return html || '&nbsp;';
    })
    .join('\n');
}

export function CodeEditor({
  lang,
  code,
  onChange,
  onSyncToBlocks,
  readOnly = false,
}: CodeEditorProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lines = useMemo(() => code.split('\n'), [code]);
  const highlighted = useMemo(() => highlightArduinoCpp(code), [code]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const top = e.currentTarget.scrollTop;
    const left = e.currentTarget.scrollLeft;
    if (preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = top;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = code.slice(0, start) + '  ' + code.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1322] text-slate-100 overflow-hidden" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-[#111827] text-xs">
        <span className="font-mono text-slate-400">sketch_ardunolab.ino</span>
        {onSyncToBlocks && (
          <button
            type="button"
            onClick={onSyncToBlocks}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-[#22c6cf] hover:bg-[#00878F]/15 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{tLoc(translations.simulator.syncFromCode, lang)}</span>
          </button>
        )}
      </div>

      <div className="relative flex-1 flex overflow-hidden font-mono text-[length:var(--code-font-size,13px)] leading-6">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-11 shrink-0 py-3 pe-2.5 text-end text-slate-500 bg-[#0b101d] border-e border-slate-800/80 select-none overflow-hidden tabular-nums"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Synchronized Highlight Overlay + Transparent Textarea */}
        <div className="relative flex-1 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 p-3 overflow-hidden whitespace-pre pointer-events-none font-mono text-[length:var(--code-font-size,13px)] leading-6"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <textarea
            value={code}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-teal-400 resize-none focus:outline-none font-mono text-[length:var(--code-font-size,13px)] leading-6 whitespace-pre overflow-auto"
          />
        </div>
      </div>
    </div>
  );
}
