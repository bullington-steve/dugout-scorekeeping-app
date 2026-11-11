/*
 * The field scoreboard (SPEC §5), drawn to match the first build's board
 * (reference/scorebug-and-board-mockups.pdf, page 10): batter card, score
 * row with bulb runs in dark housings and HR lamps, the clock and inning in
 * the middle, BALL / STRIKE / OUT lamps, thick 3D bases, and the on-deck
 * strip. Built once, updated in place. Colors are the fixed FIELD_BOARD set
 * (the same day and night, like the real thing). Bases are 44-point
 * buttons, read by VoiceOver in order first to third.
 */
import type { BoardView } from '../../app/view.ts';
import { h, setAttr, setText, svg } from '../dom.ts';
import { BulbText } from './bulbs.ts';

const BASE_NAMES = ['First base', 'Second base', 'Third base'] as const;

/** A rubber base seen from the stands: top face, two sides, a shadow, one soft glow. */
function drawBase(): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 80 52', class: 'gm-bag', 'aria-hidden': 'true', focusable: 'false' },
    svg('ellipse', { cx: 40, cy: 44, rx: 37, ry: 7.5, class: 'gm-bag-shadow' }),
    svg('ellipse', { cx: 40, cy: 24, rx: 40, ry: 21, class: 'gm-bag-glow' }),
    svg('polygon', { points: '4,22 40,40 40,47 4,29', class: 'gm-bag-side gm-bag-left' }),
    svg('polygon', { points: '40,40 76,22 76,29 40,47', class: 'gm-bag-side gm-bag-right' }),
    svg('polygon', { points: '40,4 76,22 40,40 4,22', class: 'gm-bag-top' }),
    svg('polygon', { points: '40,9.5 65,22 40,34.5 15,22', class: 'gm-bag-edge' }),
  );
}

function housing(b: BulbText, className: string): HTMLElement {
  return h('span', { class: `gm-housing ${className}` }, b.el);
}

export class Board {
  readonly el: HTMLElement;
  private readonly spoken = h('p', { class: 'sk-visually-hidden' });
  private readonly spot = h('span', { class: 'gm-spot' });
  private readonly batter = h('span', { class: 'gm-batter' });
  private readonly pos = h('span', { class: 'gm-pos' });
  private readonly line = h('p', { class: 'gm-line' });
  private readonly teams: Record<'away' | 'home', { box: HTMLElement; name: HTMLElement; runs: BulbText; hr: HTMLElement; lamps: HTMLElement }>;
  private readonly inning = new BulbText('^00', 'gm-inning-bulbs');
  private readonly clock = new BulbText('00:00', 'gm-clock-bulbs');
  private readonly lastBulbs = new BulbText('0000', 'gm-last-bulbs');
  private readonly clockBox: HTMLElement;
  private readonly clockHousing: HTMLElement;
  private readonly lastHousing: HTMLElement;
  private readonly lampSets: Record<'ball' | 'strike' | 'out', { box: HTMLElement; lamps: HTMLElement }>;
  readonly bases: HTMLButtonElement[];
  private readonly deckLabel = h('span', { class: 'gm-deck-label' });
  private readonly deckName = h('span', { class: 'gm-deck-name' });
  private readonly deckPos = h('span', { class: 'gm-deck-pos' });
  private readonly deckHole = h('span', { class: 'gm-hole' });
  private readonly deckLine = h('span', { class: 'gm-deck-line' });
  private readonly deck: HTMLElement;

  constructor(onBase: (i: 0 | 1 | 2) => void) {
    const team = (side: 'away' | 'home') => {
      const name = h('div', { class: 'gm-name' });
      const runs = new BulbText('00', 'gm-runs');
      const lamps = h('span', { class: 'gm-hr-lamps' });
      const hr = h('div', { class: 'gm-hr' }, h('span', { class: 'gm-cap' }, 'HR'), lamps);
      const box = h('div', { class: `gm-team gm-${side}` }, name, housing(runs, 'gm-runs-housing'), hr);
      return { box, name, runs, hr, lamps };
    };
    this.teams = { away: team('away'), home: team('home') };

    this.clockHousing = housing(this.clock, 'gm-clock-housing');
    this.lastHousing = housing(this.lastBulbs, 'gm-clock-housing gm-last-housing');
    this.clockBox = h('div', { class: 'gm-time' }, h('span', { class: 'gm-cap' }, 'TIME'), this.clockHousing, this.lastHousing);
    const mid = h(
      'div',
      { class: 'gm-mid' },
      this.clockBox,
      h('div', { class: 'gm-inning' }, h('span', { class: 'gm-cap' }, 'INNING'), housing(this.inning, 'gm-inning-housing')),
    );

    const lampSet = (kind: 'ball' | 'strike' | 'out', cap: string) => {
      const lamps = h('span', { class: 'gm-lampset-lamps' });
      const box = h('div', { class: `gm-lampset gm-lampset-${kind}` }, lamps, h('span', { class: 'gm-cap' }, cap));
      return { box, lamps };
    };
    this.lampSets = { ball: lampSet('ball', 'BALL'), strike: lampSet('strike', 'STRIKE'), out: lampSet('out', 'OUT') };

    this.bases = BASE_NAMES.map((label, i) => {
      const b = h('button', { type: 'button', class: `gm-base gm-base-${i + 1}`, 'aria-label': `${label}, empty` }, drawBase());
      b.addEventListener('click', () => {
        if (b.classList.contains('on')) onBase(i as 0 | 1 | 2);
      });
      return b;
    });

    this.deck = h('div', { class: 'gm-deck' }, h('p', { class: 'gm-deck-main' }, this.deckLabel, this.deckName, this.deckPos, this.deckHole, this.deckLine));

    this.el = h(
      'section',
      { class: 'gm-board', 'aria-label': 'Scoreboard' },
      this.spoken,
      h('div', { class: 'gm-card' }, h('p', { class: 'gm-who' }, this.spot, this.batter, this.pos), this.line),
      h('div', { class: 'gm-score', 'aria-hidden': 'true' }, this.teams.away.box, mid, this.teams.home.box),
      h('div', { class: 'gm-lamps', 'aria-hidden': 'true' }, this.lampSets.ball.box, this.lampSets.strike.box, this.lampSets.out.box),
      // VoiceOver order: first, second, third.
      h('div', { class: 'gm-bases' }, ...this.bases),
      this.deck,
    );
  }

  /** Just the clock, once a second. */
  setClock(time: string | null): void {
    this.clockBox.hidden = time === null;
    const last = time === 'LAST';
    this.clockHousing.hidden = last;
    this.lastHousing.hidden = !last;
    if (last) this.lastBulbs.set('LAST');
    else if (time) this.clock.set(time);
  }

  update(v: BoardView, teamColor: string): void {
    setText(this.spoken, v.spoken);
    setText(this.spot, v.top.spot ? `${v.top.spot}.` : '');
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
      box.hr.hidden = t.hrLamps === 0;
      lampsTo(box.lamps, t.hrLamps, t.hrUsed, 'gm-hrlamp');
    }

    this.inning.set(`${v.half === 'top' ? '▲' : '▼'}${String(v.inning).padStart(2, ' ')}`);
    this.setClock(v.time);

    this.lampSets.ball.box.hidden = !v.count.show;
    this.lampSets.strike.box.hidden = !v.count.show;
    if (v.count.show) {
      lampsTo(this.lampSets.ball.lamps, v.count.ballLamps, v.count.balls, 'gm-ball');
      lampsTo(this.lampSets.strike.lamps, v.count.strikeLamps, v.count.strikes, 'gm-strike');
    }
    lampsTo(this.lampSets.out.lamps, 2, v.outs, 'gm-out');

    v.bases.forEach((b, i) => {
      const btn = this.bases[i]!;
      btn.classList.toggle('on', b.occupied);
      setAttr(btn, 'aria-disabled', b.occupied ? null : 'true');
      setAttr(
        btn,
        'aria-label',
        b.occupied ? `${BASE_NAMES[i]}, ${b.name}${b.tiebreak ? ', tiebreak runner' : ''}. Runner choices.` : `${BASE_NAMES[i]}, empty`,
      );
    });

    this.deck.hidden = !v.next.label;
    setText(this.deckLabel, v.next.label);
    setText(this.deckName, v.next.spot ? `${v.next.spot}. ${v.next.name}` : v.next.name);
    setText(this.deckPos, v.next.pos);
    setText(this.deckHole, v.next.hole ? `In the Hole: ${v.next.hole}` : '');
    setText(this.deckLine, v.next.line);
  }
}

function lampsTo(box: HTMLElement, n: number, lit: number, cls: string): void {
  if (box.childElementCount !== n) box.replaceChildren(...Array.from({ length: n }, () => h('span', { class: `gm-lamp ${cls}` })));
  [...box.children].forEach((l, i) => l.classList.toggle('on', i < lit));
}
