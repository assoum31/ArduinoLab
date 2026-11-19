import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { BlockType, CodeBlock } from '../../types/arduino';
import {
  BLOCK_CATEGORIES,
  createDefaultBlock,
  getBlockCategory,
} from '../../engine/blocklyBridge';
import { tLoc, translations, type Language } from '../../i18n/translations';
import { soundEngine } from '../../utils/sound';
import { cn } from '../../lib/utils';

const DIGITAL_PINS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
const PWM_PINS = ['3', '5', '6', '9', '10', '11'];
const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

const TOOLBOX_ITEMS: Array<{
  type: BlockType;
  defaultSection: 'setup' | 'loop';
  label: { ar: string; en: string; fr: string };
}> = [
  { type: 'pinMode', defaultSection: 'setup', label: { ar: 'pinMode (تهيئة منفذ)', en: 'pinMode(pin, mode)', fr: 'pinMode(broche, mode)' } },
  { type: 'digitalWrite', defaultSection: 'loop', label: { ar: 'digitalWrite (مخرج رقمي)', en: 'digitalWrite(pin, HIGH/LOW)', fr: 'digitalWrite(broche, état)' } },
  { type: 'analogWrite', defaultSection: 'loop', label: { ar: 'analogWrite (سطوع PWM)', en: 'analogWrite(pin, 0–255)', fr: 'analogWrite(broche, PWM)' } },
  { type: 'delay', defaultSection: 'loop', label: { ar: 'delay (انتظار ms)', en: 'delay(ms)', fr: 'delay(ms)' } },
  { type: 'setVarAnalogRead', defaultSection: 'loop', label: { ar: 'analogRead (قراءة حساس)', en: 'var = analogRead(A0)', fr: 'var = analogRead(A0)' } },
  { type: 'setVarDigitalRead', defaultSection: 'loop', label: { ar: 'digitalRead (قراءة زر)', en: 'var = digitalRead(2)', fr: 'var = digitalRead(2)' } },
  { type: 'setVarMap', defaultSection: 'loop', label: { ar: 'map() (تحويل مدى)', en: 'var = map(0..1023 → 0..255)', fr: 'var = map()' } },
  { type: 'ifAnalogCompare', defaultSection: 'loop', label: { ar: 'if / else (شرط ذكي)', en: 'if (val < threshold) else', fr: 'si (val < seuil) sinon' } },
  { type: 'tone', defaultSection: 'loop', label: { ar: 'tone (نغمة جرس)', en: 'tone(pin, Hz, ms)', fr: 'tone(broche, Hz)' } },
  { type: 'noTone', defaultSection: 'loop', label: { ar: 'noTone (إيقاف الصوت)', en: 'noTone(pin)', fr: 'noTone(broche)' } },
  { type: 'servoAttach', defaultSection: 'setup', label: { ar: 'Servo.attach (ربط سيرفو)', en: 'myServo.attach(pin)', fr: 'myServo.attach()' } },
  { type: 'servoWrite', defaultSection: 'loop', label: { ar: 'Servo.write (زاوية سيرفو)', en: 'myServo.write(angle)', fr: 'myServo.write(angle)' } },
  { type: 'serialBegin', defaultSection: 'setup', label: { ar: 'Serial.begin (بدء التسلسلي)', en: 'Serial.begin(9600)', fr: 'Serial.begin(9600)' } },
  { type: 'serialPrint', defaultSection: 'loop', label: { ar: 'Serial.println (طباعة)', en: 'Serial.println(val)', fr: 'Serial.println(val)' } },
];

interface BlocklyEditorProps {
  lang: Language;
  blocks: CodeBlock[];
  onChangeBlocks: (next: CodeBlock[]) => void;
}

export function BlocklyEditor({
  lang,
  blocks,
  onChangeBlocks,
}: BlocklyEditorProps) {
  const addBlock = (type: BlockType, section: 'setup' | 'loop') => {
    soundEngine.playSelect();
    onChangeBlocks([...blocks, createDefaultBlock(type, section)]);
  };

  const updateParam = (id: string, key: string, value: string | number) => {
    onChangeBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, params: { ...b.params, [key]: value } } : b,
      ),
    );
  };

  const removeBlock = (id: string) => {
    soundEngine.playSelect();
    onChangeBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const target = blocks.find((b) => b.id === id);
    if (!target) return;
    const sameSection = blocks.filter((b) => b.section === target.section);
    const idx = sameSection.findIndex((b) => b.id === id);
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= sameSection.length) return;

    const swapped = [...sameSection];
    [swapped[idx], swapped[nextIdx]] = [swapped[nextIdx], swapped[idx]];
    const otherSection = blocks.filter((b) => b.section !== target.section);
    soundEngine.playSelect();
    onChangeBlocks(
      target.section === 'setup'
        ? [...swapped, ...otherSection]
        : [...otherSection, ...swapped],
    );
  };

  const getCategoryStyle = (type: BlockType) => {
    const catId = getBlockCategory(type);
    return (
      BLOCK_CATEGORIES.find((c) => c.id === catId) || BLOCK_CATEGORIES[0]
    );
  };

  const renderBlockRow = (b: CodeBlock) => {
    const cat = getCategoryStyle(b.type);
    const inputCls =
      'bg-black/25 text-white border border-white/25 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-white';

    return (
      <div
        key={b.id}
        dir="ltr"
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg shadow-xs text-xs font-medium',
          cat.color,
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 font-mono">
          {b.type === 'pinMode' && (
            <>
              <span>pinMode(</span>
              <select
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={inputCls}
              >
                {DIGITAL_PINS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">
                    {p}
                  </option>
                ))}
              </select>
              <span>,</span>
              <select
                value={String(b.params.mode)}
                onChange={(e) => updateParam(b.id, 'mode', e.target.value)}
                className={inputCls}
              >
                <option value="OUTPUT" className="text-slate-900">OUTPUT</option>
                <option value="INPUT" className="text-slate-900">INPUT</option>
                <option value="INPUT_PULLUP" className="text-slate-900">INPUT_PULLUP</option>
              </select>
              <span>)</span>
            </>
          )}

          {b.type === 'digitalWrite' && (
            <>
              <span>digitalWrite(</span>
              <select
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={inputCls}
              >
                {DIGITAL_PINS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">
                    {p}
                  </option>
                ))}
              </select>
              <span>,</span>
              <select
                value={String(b.params.state)}
                onChange={(e) => updateParam(b.id, 'state', e.target.value)}
                className={inputCls}
              >
                <option value="HIGH" className="text-slate-900">HIGH</option>
                <option value="LOW" className="text-slate-900">LOW</option>
              </select>
              <span>)</span>
            </>
          )}

          {b.type === 'analogWrite' && (
            <>
              <span>analogWrite(</span>
              <select
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={inputCls}
              >
                {PWM_PINS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">
                    ~{p}
                  </option>
                ))}
              </select>
              <span>,</span>
              <input
                type="text"
                value={String(b.params.value)}
                onChange={(e) => updateParam(b.id, 'value', e.target.value)}
                className={cn(inputCls, 'w-16')}
              />
              <span>)</span>
            </>
          )}

          {b.type === 'delay' && (
            <>
              <span>delay(</span>
              <input
                type="number"
                min={10}
                max={5000}
                step={50}
                value={Number(b.params.ms)}
                onChange={(e) => updateParam(b.id, 'ms', Number(e.target.value))}
                className={cn(inputCls, 'w-16')}
              />
              <span>ms)</span>
            </>
          )}

          {b.type === 'serialBegin' && (
            <>
              <span>Serial.begin(</span>
              <select
                value={String(b.params.baud)}
                onChange={(e) => updateParam(b.id, 'baud', Number(e.target.value))}
                className={inputCls}
              >
                <option value="9600" className="text-slate-900">9600</option>
                <option value="57600" className="text-slate-900">57600</option>
                <option value="115200" className="text-slate-900">115200</option>
              </select>
              <span>)</span>
            </>
          )}

          {b.type === 'serialPrint' && (
            <>
              <span>Serial.println(</span>
              <input
                type="text"
                value={String(b.params.expr)}
                onChange={(e) => updateParam(b.id, 'expr', e.target.value)}
                className={cn(inputCls, 'w-32')}
              />
              <span>)</span>
            </>
          )}

          {b.type === 'tone' && (
            <>
              <span>tone(pin</span>
              <input
                type="text"
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={cn(inputCls, 'w-10')}
              />
              <span>, Hz</span>
              <input
                type="number"
                value={Number(b.params.freq)}
                onChange={(e) => updateParam(b.id, 'freq', Number(e.target.value))}
                className={cn(inputCls, 'w-16')}
              />
              <span>, ms</span>
              <input
                type="number"
                value={Number(b.params.duration ?? 200)}
                onChange={(e) => updateParam(b.id, 'duration', Number(e.target.value))}
                className={cn(inputCls, 'w-14')}
              />
              <span>)</span>
            </>
          )}

          {b.type === 'noTone' && (
            <>
              <span>noTone(pin</span>
              <input
                type="text"
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={cn(inputCls, 'w-10')}
              />
              <span>)</span>
            </>
          )}

          {b.type === 'servoAttach' && (
            <>
              <span>myServo.attach(</span>
              <select
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={inputCls}
              >
                {PWM_PINS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">
                    {p}
                  </option>
                ))}
              </select>
              <span>)</span>
            </>
          )}

          {b.type === 'servoWrite' && (
            <>
              <span>myServo.write(</span>
              <input
                type="number"
                min={0}
                max={180}
                value={Number(b.params.angle)}
                onChange={(e) => updateParam(b.id, 'angle', Number(e.target.value))}
                className={cn(inputCls, 'w-14')}
              />
              <span>°)</span>
            </>
          )}

          {b.type === 'setVarAnalogRead' && (
            <>
              <span>int</span>
              <input
                type="text"
                value={String(b.params.varName)}
                onChange={(e) => updateParam(b.id, 'varName', e.target.value)}
                className={cn(inputCls, 'w-20')}
              />
              <span>= analogRead(</span>
              <select
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={inputCls}
              >
                {ANALOG_PINS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">
                    {p}
                  </option>
                ))}
              </select>
              <span>)</span>
            </>
          )}

          {b.type === 'setVarDigitalRead' && (
            <>
              <span>int</span>
              <input
                type="text"
                value={String(b.params.varName)}
                onChange={(e) => updateParam(b.id, 'varName', e.target.value)}
                className={cn(inputCls, 'w-20')}
              />
              <span>= digitalRead(</span>
              <select
                value={String(b.params.pin)}
                onChange={(e) => updateParam(b.id, 'pin', e.target.value)}
                className={inputCls}
              >
                {DIGITAL_PINS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">
                    {p}
                  </option>
                ))}
              </select>
              <span>)</span>
            </>
          )}

          {b.type === 'setVarMap' && (
            <>
              <span>int</span>
              <input
                type="text"
                value={String(b.params.varName)}
                onChange={(e) => updateParam(b.id, 'varName', e.target.value)}
                className={cn(inputCls, 'w-16')}
              />
              <span>= map(</span>
              <input
                type="text"
                value={String(b.params.source)}
                onChange={(e) => updateParam(b.id, 'source', e.target.value)}
                className={cn(inputCls, 'w-16')}
              />
              <span>, 0, 1023, 0, 255)</span>
            </>
          )}

          {b.type === 'ifAnalogCompare' && (
            <>
              <span>if (</span>
              <input
                type="text"
                value={String(b.params.varName)}
                onChange={(e) => updateParam(b.id, 'varName', e.target.value)}
                className={cn(inputCls, 'w-16')}
              />
              <select
                value={String(b.params.op)}
                onChange={(e) => updateParam(b.id, 'op', e.target.value)}
                className={inputCls}
              >
                {['<', '>', '==', '<=', '>='].map((op) => (
                  <option key={op} value={op} className="text-slate-900">
                    {op}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={Number(b.params.threshold)}
                onChange={(e) => updateParam(b.id, 'threshold', Number(e.target.value))}
                className={cn(inputCls, 'w-14')}
              />
              <span>) → D</span>
              <input
                type="text"
                value={String(b.params.thenPin)}
                onChange={(e) => updateParam(b.id, 'thenPin', e.target.value)}
                className={cn(inputCls, 'w-10')}
              />
              <span>=</span>
              <select
                value={String(b.params.thenState)}
                onChange={(e) => updateParam(b.id, 'thenState', e.target.value)}
                className={inputCls}
              >
                <option value="HIGH" className="text-slate-900">HIGH</option>
                <option value="LOW" className="text-slate-900">LOW</option>
              </select>
            </>
          )}

          {b.type === 'comment' && (
            <>
              <span>//</span>
              <input
                type="text"
                value={String(b.params.text)}
                onChange={(e) => updateParam(b.id, 'text', e.target.value)}
                className={cn(inputCls, 'w-44')}
              />
            </>
          )}
        </div>

        {/* Reorder & Remove */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => moveBlock(b.id, -1)}
            aria-label="Move up"
            className="p-1 rounded hover:bg-white/20 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => moveBlock(b.id, 1)}
            aria-label="Move down"
            className="p-1 rounded hover:bg-white/20 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeBlock(b.id)}
            aria-label="Remove block"
            className="p-1 rounded hover:bg-white/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const setupBlocks = blocks.filter((b) => b.section === 'setup');
  const loopBlocks = blocks.filter((b) => b.section === 'loop');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F172A] overflow-hidden">
      {/* Compact Categorized Block Toolbox */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
        <div className="flex flex-wrap gap-1.5">
          {TOOLBOX_ITEMS.map((item) => {
            const cat = getCategoryStyle(item.type);
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => addBlock(item.type, item.defaultSection)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0',
                  cat.color,
                )}
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span>{tLoc(item.label, lang)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Block Workspace: setup() and loop() containers */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* setup() stack */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 space-y-2">
          <div className="text-xs font-bold text-[#00878F] dark:text-[#22c6cf] flex items-center justify-between">
            <span>{tLoc(translations.simulator.setupSection, lang)}</span>
            <span className="font-mono text-[11px] opacity-70">{setupBlocks.length}</span>
          </div>
          {setupBlocks.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
              pinMode() / Serial.begin()
            </div>
          ) : (
            <div className="space-y-1.5">{setupBlocks.map(renderBlockRow)}</div>
          )}
        </div>

        {/* loop() stack */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 space-y-2">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>{tLoc(translations.simulator.loopSection, lang)}</span>
            <span className="font-mono text-[11px] opacity-70">{loopBlocks.length}</span>
          </div>
          {loopBlocks.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
              digitalWrite() / analogWrite() / delay()
            </div>
          ) : (
            <div className="space-y-1.5">{loopBlocks.map(renderBlockRow)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
