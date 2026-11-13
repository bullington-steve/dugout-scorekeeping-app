/*
 * The field scoreboard (SPEC §5), after Steve's scorebug passes (Nov 13):
 * a batter card (big name, position, today, and On Deck under it), the
 * score row with bulb runs in dark housings and HR lamps, the clock and
 * inning in the middle with B, S, O lamps beside them, and thick 3D bases
 * sitting on the board's bottom edge. Built once, updated in place. Colors are the fixed FIELD_BOARD set
 * (the same day and night, like the real thing). Bases are 44-point
 * buttons, read by VoiceOver in order first to third.
 */
import type { BoardView } from '../../app/view.ts';
import { h, setAttr, setText, svg } from '../dom.ts';
import { BulbText } from './bulbs.ts';

const BASE_NAMES = ['First base', 'Second base', 'Third base'] as const;

/**
 * A base seen from the stands, after Steve's photo of real ones (Nov 13): a
 * low, thin bag with rounded edges, two sides in shade, light along the
 * near top edges, the molded grip pattern pressed into the top (a cross
 * splitting it into four squares, each ruled in thirds with its
 * diagonals), and a diamond-shaped shadow cast down and to the right. No
 * glow: a runner's base turns gold.
 */
const TOP = { t: [42, 5], r: [80, 24], b: [42, 43], l: [4, 24] } as const;
const SIDE = 6;

/** A point on the top face: u runs toward first's corner (right), v toward third's (left). */
function onTop(u: number, v: number): string {
  const x = TOP.t[0] + u * (TOP.r[0] - TOP.t[0]) + v * (TOP.l[0] - TOP.t[0]);
  const y = TOP.t[1] + u * (TOP.r[1] - TOP.t[1]) + v * (TOP.l[1] - TOP.t[1]);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

/** The molded pattern as one path: four squares around a cross, each ruled in thirds with both diagonals. */
const MOLD = (() => {
  const d: string[] = [];
  const line = (u1: number, v1: number, u2: number, v2: number) => d.push(`M${onTop(u1, v1)}L${onTop(u2, v2)}`);
  for (const [u0, v0] of [[0.12, 0.12], [0.55, 0.12], [0.12, 0.55], [0.55, 0.55]] as const) {
    const s = 0.33;
    for (const k of [0, 1 / 3, 2 / 3, 1]) {
      line(u0 + s * k, v0, u0 + s * k, v0 + s);
      line(u0, v0 + s * k, u0 + s, v0 + s * k);
    }
    line(u0, v0, u0 + s, v0 + s);
    line(u0 + s, v0, u0, v0 + s);
  }
  return d.join('');
})();

function drawBase(): SVGSVGElement {
  const { t, r, b, l } = TOP;
  const pt = (p: readonly [number, number], dy = 0) => `${p[0]},${p[1] + dy}`;
  return svg(
    'svg',
    { viewBox: '0 0 84 62', class: 'gm-bag', 'aria-hidden': 'true', focusable: 'false' },
    svg('polygon', { points: `${l[0] + 7},${l[1] + 9} ${b[0] + 6},${b[1] + 12} ${r[0] + 4},${r[1] + 9} ${t[0] + 6},${t[1] + 10}`, class: 'gm-bag-shadow' }),
    svg('polygon', { points: `${pt(l)} ${pt(b)} ${pt(b, SIDE)} ${pt(l, SIDE)}`, class: 'gm-bag-side gm-bag-left' }),
    svg('polygon', { points: `${pt(b)} ${pt(r)} ${pt(r, SIDE)} ${pt(b, SIDE)}`, class: 'gm-bag-side gm-bag-right' }),
    svg('polygon', { points: `${pt(t)} ${pt(r)} ${pt(b)} ${pt(l)}`, class: 'gm-bag-top' }),
    svg('path', { d: MOLD, class: 'gm-bag-mold-hi', transform: 'translate(0 0.55)' }),
    svg('path', { d: MOLD, class: 'gm-bag-mold' }),
    svg('polyline', { points: `${l[0] + 1},${l[1]} ${t[0]},${t[1] + 0.6} ${r[0] - 1},${r[1]}`, class: 'gm-bag-hi' }),
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
  /** Today: "2-for-2 · 1B, 3B · 1 RBI", after the position; it gives up room before the name does. */
  private readonly todayText = h('span', { class: 'gm-today-text' });
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
  private readonly deck: HTMLElement;

  /** ♪ Walk-Up on the batter card (SPEC §5): our batter's song, any time. */
  readonly walkup = h('button', { type: 'button', class: 'gm-walkup', hidden: true }, '♪ Walk-Up');

  /** Show ♪ Walk-Up while we bat; it reads Stop while that song plays. */
  setWalkup(show: boolean, playing: boolean): void {
    if (this.walkup.hidden !== !show) this.walkup.hidden = !show;
    const label = playing ? '■ Stop' : '♪ Walk-Up';
    if (this.walkup.textContent !== label) this.walkup.textContent = label;
  }

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
    this.clockBox = h(
      'div',
      { class: 'gm-time' },
      h('span', { class: 'gm-cap' }, 'TIME'),
      this.clockHousing,
      this.lastHousing,
    );
    // B, S, O beside the inning, like a broadcast score bug (Steve, Nov 13): a letter, then its lamps.
    const lampSet = (kind: 'ball' | 'strike' | 'out', cap: string) => {
      const lamps = h('span', { class: 'gm-lampset-lamps' });
      const box = h('div', { class: `gm-lampset gm-lampset-${kind}` }, h('span', { class: 'gm-bso' }, cap), lamps);
      return { box, lamps };
    };
    this.lampSets = { ball: lampSet('ball', 'B'), strike: lampSet('strike', 'S'), out: lampSet('out', 'O') };
    const mid = h(
      'div',
      { class: 'gm-mid' },
      h('div', { class: 'gm-mid-clock' }, this.clockBox, h('div', { class: 'gm-inning' }, housing(this.inning, 'gm-inning-housing'))),
      h('div', { class: 'gm-count' }, this.lampSets.ball.box, this.lampSets.strike.box, this.lampSets.out.box),
    );

    this.bases = BASE_NAMES.map((label, i) => {
      const b = h('button', { type: 'button', class: `gm-base gm-base-${i + 1}`, 'aria-label': `${label}, empty` }, drawBase());
      b.addEventListener('click', () => {
        if (b.classList.contains('on')) onBase(i as 0 | 1 | 2);
      });
      return b;
    });

    this.deck = h('p', { class: 'gm-deck' }, this.deckLabel, this.deckName, this.deckPos);

    this.el = h(
      'section',
      { class: 'gm-board', 'aria-label': 'Scoreboard' },
      this.spoken,
      h('div', { class: 'gm-card' }, h('div', { class: 'gm-card-main' }, h('p', { class: 'gm-who' }, this.spot, this.batter, this.pos, this.todayText), this.deck), this.walkup),
      h('div', { class: 'gm-score', 'aria-hidden': 'true' }, this.teams.away.box, mid, this.teams.home.box),
      // VoiceOver order: first, second, third.
      h('div', { class: 'gm-bases' }, ...this.bases),
    );
  }

  /** Just the clock, once a second: minutes and seconds, then LAST. */
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
    setText(this.todayText, v.top.today);
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
  }
}

function lampsTo(box: HTMLElement, n: number, lit: number, cls: string): void {
  if (box.childElementCount !== n) box.replaceChildren(...Array.from({ length: n }, () => h('span', { class: `gm-lamp ${cls}` })));
  [...box.children].forEach((l, i) => l.classList.toggle('on', i < lit));
}
