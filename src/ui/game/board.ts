/*
 * The field scoreboard (SPEC §5): one framed board, built once and updated
 * in place. Colors come from the fixed FIELD_BOARD set (the same by day and
 * by night, like the real thing). Bases are 44-point buttons, read by
 * VoiceOver in order first to third.
 */
import type { BoardView } from '../../app/view.ts';
import { h, setAttr, setText } from '../dom.ts';
import { BulbText } from './bulbs.ts';

const BASE_NAMES = ['First base', 'Second base', 'Third base'] as const;

export class Board {
  readonly el: HTMLElement;
  private readonly spoken = h('p', { class: 'sk-visually-hidden' });
  private readonly spot = h('span', { class: 'gm-spot' });
  private readonly batter = h('span', { class: 'gm-batter' });
  private readonly pos = h('span', { class: 'gm-pos' });
  private readonly line = h('span', { class: 'gm-line' });
  private readonly teams: Record<'away' | 'home', { box: HTMLElement; name: HTMLElement; runs: BulbText; hr: HTMLElement }>;
  private readonly inning = new BulbText(2, 'gm-inning-bulbs');
  private readonly minutes = new BulbText(2, 'gm-time-bulbs');
  private readonly lastBulbs = new BulbText(4, 'gm-last-bulbs');
  private readonly timeBox = h('div', { class: 'gm-time' });
  private readonly arrows = { top: h('span', { class: 'gm-arrow gm-arrow-up' }), bottom: h('span', { class: 'gm-arrow gm-arrow-down' }) };
  private readonly outLamps = [h('span', { class: 'gm-lamp gm-out' }), h('span', { class: 'gm-lamp gm-out' })];
  private readonly ballBox = h('div', { class: 'gm-count gm-balls' });
  private readonly strikeBox = h('div', { class: 'gm-count gm-strikes' });
  readonly bases: HTMLButtonElement[];
  private readonly nextLabel = h('span', { class: 'gm-next-label' });
  private readonly nextText = h('span', { class: 'gm-next-text' });

  constructor(onBase: (i: 0 | 1 | 2) => void) {
    const team = (side: 'away' | 'home') => {
      const name = h('div', { class: 'gm-name' });
      const runs = new BulbText(2, 'gm-runs');
      const hr = h('div', { class: 'gm-hr', 'aria-hidden': 'true' });
      const box = h('div', { class: `gm-team gm-${side}` }, name, runs.el, hr);
      return { box, name, runs, hr };
    };
    this.teams = { away: team('away'), home: team('home') };

    this.bases = BASE_NAMES.map((label, i) => {
      const b = h('button', { type: 'button', class: `gm-base gm-base-${i + 1}`, 'aria-label': `${label}, empty` }, h('span', { class: 'gm-bag' }));
      b.addEventListener('click', () => {
        if (b.classList.contains('on')) onBase(i as 0 | 1 | 2);
      });
      return b;
    });
    const diamond = h(
      'div',
      { class: 'gm-diamond' },
      h('span', { class: 'gm-plate', 'aria-hidden': 'true' }),
      // VoiceOver order: first, second, third.
      ...this.bases,
    );

    this.timeBox.append(h('span', { class: 'gm-cap', 'aria-hidden': 'true' }, 'TIME'), this.minutes.el, this.lastBulbs.el);
    const mid = h(
      'div',
      { class: 'gm-mid' },
      this.timeBox,
      h(
        'div',
        { class: 'gm-inning' },
        h('span', { class: 'gm-cap', 'aria-hidden': 'true' }, 'INNING'),
        h('div', { class: 'gm-inning-row' }, h('div', { class: 'gm-arrows', 'aria-hidden': 'true' }, this.arrows.top, this.arrows.bottom), this.inning.el),
      ),
      h('div', { class: 'gm-outs', 'aria-hidden': 'true' }, h('span', { class: 'gm-cap' }, 'OUT'), ...this.outLamps),
    );

    this.el = h(
      'section',
      { class: 'gm-board', 'aria-label': 'Scoreboard' },
      this.spoken,
      h('div', { class: 'gm-top' }, h('p', { class: 'gm-who' }, this.spot, this.batter, this.pos), this.line),
      h('div', { class: 'gm-score', 'aria-hidden': 'true' }, this.teams.away.box, mid, this.teams.home.box),
      h('div', { class: 'gm-field' }, this.ballBox, diamond, this.strikeBox),
      h('p', { class: 'gm-next' }, this.nextLabel, this.nextText),
    );
  }

  update(v: BoardView, teamColor: string): void {
    setText(this.spoken, v.spoken);
    setText(this.spot, v.top.spot);
    setText(this.batter, v.top.name);
    setText(this.pos, v.top.pos);
    setText(this.line, v.top.line);
    this.el.style.setProperty('--team', teamColor);

    for (const side of ['away', 'home'] as const) {
      const t = v[side];
      const box = this.teams[side];
      setText(box.name, t.abbr);
      box.box.classList.toggle('us', t.us);
      box.runs.set(String(t.runs));
      if (box.hr.childElementCount !== t.hrLamps) {
        box.hr.replaceChildren(...Array.from({ length: t.hrLamps }, () => h('span', { class: 'gm-lamp gm-hrlamp' })));
      }
      [...box.hr.children].forEach((lamp, i) => lamp.classList.toggle('on', i < t.hrUsed));
    }

    this.inning.set(String(v.inning));
    this.arrows.top.classList.toggle('on', v.half === 'top');
    this.arrows.bottom.classList.toggle('on', v.half === 'bottom');
    this.outLamps.forEach((l, i) => l.classList.toggle('on', i < v.outs));
    this.timeBox.hidden = v.time === null;
    const last = v.time === 'LAST';
    this.minutes.el.style.display = last ? 'none' : '';
    this.lastBulbs.el.style.display = last ? '' : 'none';
    if (last) this.lastBulbs.set('LAST');
    else if (v.time) this.minutes.set(v.time);

    this.el.classList.toggle('gm-has-count', v.count.show);
    const lamps = (box: HTMLElement, n: number, lit: number, cls: string, cap: string) => {
      if (box.childElementCount !== n + 1) {
        box.replaceChildren(h('span', { class: 'gm-cap' }, cap), ...Array.from({ length: n }, () => h('span', { class: `gm-lamp ${cls}` })));
      }
      [...box.children].slice(1).forEach((l, i) => l.classList.toggle('on', i < lit));
      setAttr(box, 'aria-label', `${lit} ${cap === 'BALL' ? (lit === 1 ? 'ball' : 'balls') : lit === 1 ? 'strike' : 'strikes'}`);
    };
    this.ballBox.hidden = !v.count.show;
    this.strikeBox.hidden = !v.count.show;
    if (v.count.show) {
      lamps(this.ballBox, v.count.ballLamps, v.count.balls, 'gm-ball', 'BALL');
      lamps(this.strikeBox, v.count.strikeLamps, v.count.strikes, 'gm-strike', 'STRIKE');
    }

    v.bases.forEach((b, i) => {
      const btn = this.bases[i]!;
      btn.classList.toggle('on', b.occupied);
      setAttr(btn, 'aria-disabled', b.occupied ? null : 'true');
      const label = b.occupied
        ? `${BASE_NAMES[i]}, ${b.name}${b.tiebreak ? ', tiebreak runner' : ''}. Runner choices.`
        : `${BASE_NAMES[i]}, empty`;
      setAttr(btn, 'aria-label', label);
    });

    setText(this.nextLabel, v.next.label);
    setText(this.nextText, v.next.text);
  }
}
