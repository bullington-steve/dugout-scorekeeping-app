/*
 * The scoring pad (SPEC §2, §5): Batter Reaches, Batter Out, the count row,
 * Dugout Mode quick buttons, and the Final banner. Built once; update()
 * only changes labels and dimming, never rebuilds under the finger.
 * Labels never wrap; buttons keep their one-line labels when dimmed.
 */
import type { PadView } from '../../app/view.ts';
import type { PitchEvent, QuickEvent, Result } from '../../engine/types.ts';
import { announce } from '../announce.ts';
import { h, isDimmed, setAttr, setDimmed, setText } from '../dom.ts';

export interface PadHandlers {
  result: (r: Result) => void;
  pitch: (p: PitchEvent['pitch']) => void;
  quick: (k: QuickEvent['kind']) => void;
  endHalf: () => void;
  saveToSeason: () => void;
  anotherInning: () => void;
}

interface KeyDef {
  r: Result;
  label: string;
  name: string;
  kind: 'hit' | 'out';
}

const REACHES: KeyDef[] = [
  { r: '1B', label: '1B', name: 'Single', kind: 'hit' },
  { r: '2B', label: '2B', name: 'Double', kind: 'hit' },
  { r: '3B', label: '3B', name: 'Triple', kind: 'hit' },
  { r: 'HR', label: 'HR', name: 'Home Run', kind: 'hit' },
  { r: 'BB', label: 'BB', name: 'Walk', kind: 'hit' },
  { r: 'E', label: 'E', name: 'Error', kind: 'hit' },
  { r: 'FC', label: 'FC', name: 'Fielder’s Choice: Runner Out, Batter Safe', kind: 'hit' },
];

const OUTS: KeyDef[] = [
  { r: 'K', label: 'K', name: 'Strikeout Swinging', kind: 'out' },
  { r: 'KL', label: 'K', name: 'Strikeout Looking', kind: 'out' },
  { r: 'GO', label: 'Grounder', name: 'Grounder', kind: 'out' },
  { r: 'F', label: 'Fly Out', name: 'Fly Out', kind: 'out' },
  { r: 'L', label: 'Line Out', name: 'Line Out', kind: 'out' },
  { r: 'P', label: 'Pop Out', name: 'Pop Out', kind: 'out' },
  { r: 'FBO', label: 'Foul Out', name: 'Foul Out', kind: 'out' },
  { r: 'SF', label: 'Sac Fly', name: 'Sac Fly', kind: 'out' },
  { r: 'DP', label: 'Dbl Play', name: 'Double Play', kind: 'out' },
  { r: 'TP', label: 'Tpl Play', name: 'Triple Play', kind: 'out' },
  { r: 'HRO', label: 'HRO', name: 'Home Run Out, Over the Limit', kind: 'out' },
];

const PITCHES: { p: PitchEvent['pitch']; label: string; name: string }[] = [
  { p: 'ball', label: 'Ball', name: 'Ball' },
  { p: 'look', label: 'Look', name: 'Called Strike' },
  { p: 'swing', label: 'Swing', name: 'Swinging Strike' },
  { p: 'foul', label: 'Foul', name: 'Foul Ball' },
];

const QUICK: { k: QuickEvent['kind']; label: string; kind: 'hit' | 'out' | 'key' }[] = [
  { k: 'run', label: '+1 Run', kind: 'hit' },
  { k: 'out', label: '+1 Out', kind: 'out' },
  { k: 'hit', label: '+ Hit', kind: 'key' },
  { k: 'error', label: '+ Our Error', kind: 'key' },
  { k: 'hr', label: '+ Their HR', kind: 'key' },
];

export class Pad {
  readonly el: HTMLElement;
  private readonly keys = new Map<Result, HTMLButtonElement>();
  private readonly hrSub = h('span', { class: 'gm-key-sub' });
  private readonly countRow: HTMLElement;
  private readonly scoring: HTMLElement;
  private readonly quick: HTMLElement;
  readonly final: HTMLElement;
  readonly finalHeadline = h('p', { class: 'gm-final-headline' });
  private readonly hint = h('p', { class: 'gm-hint', 'aria-hidden': 'true' });
  private hintTimer = 0;

  constructor(on: PadHandlers) {
    const key = (d: KeyDef, extraClass = '') => {
      const content: (Node | string)[] = d.r === 'KL' ? [h('span', { class: 'gm-backwards' }, 'K')] : [d.label];
      if (d.r === 'HR') content.push(this.hrSub);
      const b = h('button', { type: 'button', class: `sk-key sk-${d.kind} gm-key ${extraClass}`, 'aria-label': d.name }, ...content);
      b.addEventListener('click', () => {
        if (isDimmed(b)) return this.showHint(b.getAttribute('data-why') ?? '');
        on.result(d.r);
      });
      this.keys.set(d.r, b);
      return b;
    };

    this.countRow = h(
      'div',
      { class: 'gm-row gm-count-row', role: 'group', 'aria-label': 'Count' },
      ...PITCHES.map((p) => {
        const b = h('button', { type: 'button', class: 'sk-key gm-key', 'aria-label': p.name }, p.label);
        b.addEventListener('click', () => on.pitch(p.p));
        return b;
      }),
    );
    const reaches = h('div', { class: 'gm-row gm-reaches', role: 'group', 'aria-label': 'Batter Reaches' }, ...REACHES.map((d) => key(d)));
    const outs = h(
      'div',
      { class: 'gm-row gm-outs-pad', role: 'group', 'aria-label': 'Batter Out' },
      ...OUTS.map((d) => key(d, d.r === 'HRO' ? 'gm-wide' : '')),
    );
    this.scoring = h('div', { class: 'gm-scoring' }, this.countRow, reaches, outs);

    const endHalf = h('button', { type: 'button', class: 'sk-key gm-key gm-end-half' }, 'End Their Half-Inning Now');
    endHalf.addEventListener('click', on.endHalf);
    this.quick = h(
      'div',
      { class: 'gm-quick', role: 'group', 'aria-label': 'Their Half' },
      ...QUICK.map((q) => {
        const b = h('button', { type: 'button', class: `sk-key sk-${q.kind} gm-key` }, q.label);
        b.addEventListener('click', () => on.quick(q.k));
        return b;
      }),
      endHalf,
    );

    const save = h('button', { type: 'button', class: 'sk-key sk-primary gm-key' }, 'Save to Season');
    save.addEventListener('click', on.saveToSeason);
    const another = h('button', { type: 'button', class: 'sk-key gm-key' }, 'Play Another Inning');
    another.addEventListener('click', on.anotherInning);
    this.final = h('section', { class: 'gm-final', 'aria-label': 'Final' }, this.finalHeadline, h('div', { class: 'gm-final-actions' }, save, another));

    this.el = h('div', { class: 'gm-pad' }, this.scoring, this.quick, this.final, this.hint);
  }

  update(v: PadView, finalHeadline: string): void {
    this.scoring.hidden = v.mode !== 'pad';
    this.quick.hidden = v.mode !== 'quick';
    this.final.hidden = v.mode !== 'final';
    setText(this.finalHeadline, finalHeadline);
    this.countRow.hidden = !v.countOn;
    // With the count on, walks come from four balls: BB steps aside.
    this.keys.get('BB')!.hidden = v.countOn;
    for (const [r, b] of this.keys) setDimmed(b, v.dimmed[r]);
    const hr = this.keys.get('HR')!;
    if (v.hrLeft === Infinity) {
      setText(this.hrSub, '');
      setAttr(hr, 'aria-label', 'Home Run');
    } else if (v.hrLeft > 0) {
      setText(this.hrSub, `${v.hrLeft} Left`);
      setAttr(hr, 'aria-label', `Home Run, ${v.hrLeft} left`);
    } else {
      setText(this.hrSub, 'Out');
      setAttr(hr, 'aria-label', 'Home Run, over the limit: out');
    }
    hr.classList.toggle('gm-over', v.hrLeft === 0);
  }

  private showHint(text: string): void {
    setText(this.hint, text);
    announce(text);
    clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => setText(this.hint, ''), 3500);
  }
}
