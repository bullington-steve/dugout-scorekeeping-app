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
  /** Big: the code a scorekeeper writes. */
  label: string;
  /** Small, under the code. */
  word: string;
  name: string;
  kind: 'hit' | 'out';
}

const REACHES: KeyDef[] = [
  { r: '1B', label: '1B', word: 'Single', name: 'Single', kind: 'hit' },
  { r: '2B', label: '2B', word: 'Double', name: 'Double', kind: 'hit' },
  { r: '3B', label: '3B', word: 'Triple', name: 'Triple', kind: 'hit' },
  { r: 'HR', label: 'HR', word: 'Home Run', name: 'Home Run', kind: 'hit' },
  { r: 'BB', label: 'BB', word: 'Walk', name: 'Walk', kind: 'hit' },
  { r: 'E', label: 'E', word: 'Error', name: 'Error', kind: 'hit' },
  { r: 'FC', label: 'FC', word: 'Fld Choice', name: 'Fielder’s Choice: Runner Out, Batter Safe', kind: 'hit' },
];

const OUTS: KeyDef[] = [
  { r: 'K', label: 'K', word: 'Swinging', name: 'Strikeout Swinging', kind: 'out' },
  { r: 'KL', label: 'K', word: 'Looking', name: 'Strikeout Looking', kind: 'out' },
  { r: 'GO', label: 'GO', word: 'Grounder', name: 'Grounder', kind: 'out' },
  { r: 'F', label: 'F', word: 'Fly Out', name: 'Fly Out', kind: 'out' },
  { r: 'L', label: 'L', word: 'Line Out', name: 'Line Out', kind: 'out' },
  { r: 'P', label: 'P', word: 'Pop Out', name: 'Pop Out', kind: 'out' },
  { r: 'FBO', label: 'FBO', word: 'Foul Out', name: 'Foul Out', kind: 'out' },
  { r: 'SF', label: 'SF', word: 'Sac Fly', name: 'Sac Fly', kind: 'out' },
  { r: 'DP', label: 'DP', word: 'Dbl Play', name: 'Double Play', kind: 'out' },
  { r: 'TP', label: 'TP', word: 'Tpl Play', name: 'Triple Play', kind: 'out' },
  { r: 'HRO', label: 'HRO', word: 'HR Out', name: 'Home Run Out, Over the Limit', kind: 'out' },
];

/**
 * The slim pitch row (Steve's Option B, Nov 13): Ball, Strike, Foul. No small words: the board's
 * B, S, O lamps say the count. A key takes on the color of what it would do: Ball turns green when
 * it's ball four, Foul turns red when it's a foul out, and Strike dims at two strikes, because
 * strike three is K or the backwards K, so the pad says how the batter went down.
 */
const PITCHES: { p: PitchEvent['pitch']; word: 'ball' | 'strike' | 'foul'; label: string }[] = [
  { p: 'ball', word: 'ball', label: 'Ball' },
  { p: 'look', word: 'strike', label: 'Strike' },
  { p: 'foul', word: 'foul', label: 'Foul' },
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
  private readonly hrSub = h('span', { class: 'gm-word' }, 'Home Run');
  private readonly pitchKeys = new Map<'ball' | 'strike' | 'foul', HTMLButtonElement>();
  private readonly countRow: HTMLElement;
  private readonly reaches: HTMLElement;
  private readonly scoring: HTMLElement;
  private readonly quick: HTMLElement;
  readonly final: HTMLElement;
  readonly finalHeadline = h('p', { class: 'gm-final-headline' });
  private readonly hint = h('p', { class: 'gm-hint', 'aria-hidden': 'true' });
  private hintTimer = 0;

  constructor(on: PadHandlers) {
    const key = (d: KeyDef, extraClass = '') => {
      const code = d.r === 'KL' ? h('span', { class: 'gm-code' }, h('span', { class: 'gm-backwards' }, 'K')) : h('span', { class: 'gm-code' }, d.label);
      const content: Node[] = [code, d.r === 'HR' ? this.hrSub : h('span', { class: 'gm-word' }, d.word)];
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
        const b = h('button', { type: 'button', class: 'sk-key gm-key gm-pitch', 'aria-label': p.label }, h('span', { class: 'gm-code' }, p.label));
        b.addEventListener('click', () => {
          if (isDimmed(b)) return this.showHint(b.getAttribute('data-why') ?? '');
          on.pitch(p.p);
        });
        this.pitchKeys.set(p.word, b);
        return b;
      }),
    );
    this.reaches = h('div', { class: 'gm-row gm-reaches', role: 'group', 'aria-labelledby': 'gm-reaches-label' }, ...REACHES.map((d) => key(d)));
    const outs = h('div', { class: 'gm-row gm-outs-pad', role: 'group', 'aria-labelledby': 'gm-outs-label' }, ...OUTS.map((d) => key(d, d.r === 'HRO' ? 'gm-wide' : '')));
    // FC takes the last two spots of the four-wide Batter Reaches rows (1B 2B 3B HR / BB E FC).
    this.keys.get('FC')!.classList.add('gm-wide');
    this.scoring = h(
      'div',
      { class: 'gm-scoring' },
      this.countRow,
      // The section names stay for VoiceOver; on screen, green and red say it (Steve, Nov 13).
      h('h3', { id: 'gm-reaches-label', class: 'sk-visually-hidden' }, 'Batter Reaches'),
      this.reaches,
      h('h3', { id: 'gm-outs-label', class: 'sk-visually-hidden' }, 'Batter Out'),
      outs,
    );

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
    // BB stays on the pad either way: with the count on it's the intentional walk (Steve, Nov 13).
    this.reaches.classList.add('gm-seven');
    for (const [p, b] of this.pitchKeys) {
      const word = v.pitchWords[p];
      // VoiceOver also hears what the pitch does ("Walk"); sighted scorers see the color.
      setAttr(b, 'aria-description', word);
      b.classList.toggle('sk-hit', p === 'ball' && word === 'Walk');
      b.classList.toggle('sk-out', p === 'foul' && word === 'Foul Out');
      setDimmed(b, p === 'strike' && word === 'Strikeout' ? 'Strike three: tap K Swinging or K Looking.' : undefined);
    }
    for (const [r, b] of this.keys) setDimmed(b, v.dimmed[r]);
    const hr = this.keys.get('HR')!;
    if (v.hrLeft === Infinity) {
      setText(this.hrSub, 'Home Run');
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
