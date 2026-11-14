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
 * near top edges, and a diamond-shaped shadow cast down and to the right.
 * The top is plain rubber (cleanup pass, Nov 14: the molded grip read as a
 * waffle at this size). No glow: a runner's base turns gold.
 */
const TOP = { t: [42, 5], r: [80, 24], b: [42, 43], l: [4, 24] } as const;
const SIDE = 6;

let bagCount = 0;

/**
 * A base after Steve's photos (Nov 13): light falling across the top from
 * the upper left (brighter near third, a touch grayer toward first), and the
 * near top edges rounding off in a soft band. Plain rubber, nothing more.
 */
function drawBase(): SVGSVGElement {
  const { t, r, b, l } = TOP;
  const pt = (p: readonly [number, number], dy = 0) => `${p[0]},${p[1] + dy}`;
  const id = `gm-bag-light-${++bagCount}`;
  return svg(
    'svg',
    { viewBox: '0 0 84 62', class: 'gm-bag', 'aria-hidden': 'true', focusable: 'false' },
    svg(
      'defs',
      {},
      svg(
        'linearGradient',
        { id, x1: '0', y1: '0', x2: '1', y2: '1' },
        svg('stop', { offset: '0', class: 'gm-bag-light-a' }),
        svg('stop', { offset: '0.55', class: 'gm-bag-light-b' }),
        svg('stop', { offset: '1', class: 'gm-bag-light-c' }),
      ),
    ),
    svg('polygon', { points: `${l[0] + 7},${l[1] + 9} ${b[0] + 6},${b[1] + 12} ${r[0] + 4},${r[1] + 9} ${t[0] + 6},${t[1] + 10}`, class: 'gm-bag-shadow' }),
    svg('polygon', { points: `${pt(l)} ${pt(t)} ${pt(r)} ${pt(r, SIDE)} ${pt(b, SIDE)} ${pt(l, SIDE)}`, class: 'gm-bag-outline' }),
    svg('polygon', { points: `${pt(l)} ${pt(b)} ${pt(b, SIDE)} ${pt(l, SIDE)}`, class: 'gm-bag-side gm-bag-left' }),
    svg('polygon', { points: `${pt(b)} ${pt(r)} ${pt(r, SIDE)} ${pt(b, SIDE)}`, class: 'gm-bag-side gm-bag-right' }),
    svg('polygon', { points: `${pt(t)} ${pt(r)} ${pt(b)} ${pt(l)}`, class: 'gm-bag-top' }),
    svg('polygon', { points: `${pt(t)} ${pt(r)} ${pt(b)} ${pt(l)}`, class: 'gm-bag-light', fill: `url(#${id})` }),
    // The near edges round over: a soft shaded band just inside them.
    svg('polyline', { points: `${l[0] + 2.2},${l[1] + 0.2} ${b[0]},${b[1] - 1.3} ${r[0] - 2.2},${r[1] + 0.2}`, class: 'gm-bag-bevel' }),
    svg('polyline', { points: `${l[0] + 1},${l[1]} ${t[0]},${t[1] + 0.6} ${r[0] - 1},${r[1]}`, class: 'gm-bag-hi' }),
  );
}

/**
 * Home plate at the same angle as the bases (cleanup pass, Nov 14): the pentagon seen from the
 * stands, its point toward us at the corner of the base paths, with a thin edge showing below
 * the two front sides, light from the upper left like the bases.
 */
function drawPlate(): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 13', class: 'gm-plate', 'aria-hidden': 'true', focusable: 'false' },
    svg('path', { d: 'M2 6.5 L12 11.5 L12 12.8 L2 7.8Z', class: 'gm-plate-side gm-plate-left' }),
    svg('path', { d: 'M22 6.5 L12 11.5 L12 12.8 L22 7.8Z', class: 'gm-plate-side gm-plate-right' }),
    svg('path', { d: 'M2 1.5 H22 V6.5 L12 11.5 L2 6.5Z', class: 'gm-plate-top' }),
    svg('path', { d: 'M2.6 2 H21.4', class: 'gm-plate-hi' }),
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
  private readonly who = h('p', { class: 'gm-who' }, this.spot, this.batter, this.pos, this.todayText);
  private readonly teams: Record<'away' | 'home', { box: HTMLElement; name: HTMLElement; runs: BulbText; hr: HTMLElement; lamps: HTMLElement }>;
  /** The inning number alone in the bulbs; the half shows on the arrows beside it (Nov 14). */
  private readonly inning = new BulbText('00', 'gm-inning-bulbs');
  private readonly arrowTop = h('span', { class: 'gm-arrow gm-arrow-top' }, '▲');
  private readonly arrowBottom = h('span', { class: 'gm-arrow gm-arrow-bottom' }, '▼');
  /** What just went in, in words (Nov 14): every tap confirmed without opening the Book. */
  private readonly lastText = h('span', { class: 'gm-last-text' });
  private readonly lastLine = h('p', { class: 'gm-lastplay', 'aria-hidden': 'true' }, h('span', { class: 'gm-last-label' }, 'Last'), this.lastText);
  private readonly tags: HTMLElement[] = [0, 1, 2].map((i) => h('span', { class: `gm-tag gm-tag-${i + 1}`, 'aria-hidden': 'true' }));
  private readonly clock = new BulbText('00:00', 'gm-clock-bulbs');
  /** TIME, or LAST INN once time's up (the bulbs then read 0:00, so they never look like a glitch). */
  private readonly timeCap = h('span', { class: 'gm-cap' }, 'Time');
  private readonly clockBox: HTMLElement;
  private readonly clockHousing: HTMLElement;
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
      const name = h('span', { class: 'gm-name' });
      // The at-bat lamp: a socket beside each name, lit for the team batting, with AT BAT beside it (Nov 14).
      const atBat = h('span', { class: 'gm-atbat' }, 'At Bat');
      const nameRow = h('div', { class: 'gm-name-row' }, h('span', { class: 'gm-lamp gm-atbat-lamp' }), name, atBat);
      const runs = new BulbText('00', 'gm-runs');
      const lamps = h('span', { class: 'gm-hr-lamps' });
      const hr = h('div', { class: 'gm-hr' }, h('span', { class: 'gm-cap' }, 'HR'), lamps);
      const box = h('div', { class: `gm-team gm-${side}` }, nameRow, housing(runs, 'gm-runs-housing'), hr);
      return { box, name, runs, hr, lamps };
    };
    this.teams = { away: team('away'), home: team('home') };

    this.clockHousing = housing(this.clock, 'gm-clock-housing');
    this.clockBox = h('div', { class: 'gm-time' }, this.timeCap, this.clockHousing);
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
      h('div', { class: 'gm-mid-clock' }, this.clockBox, h('div', { class: 'gm-inning' }, h('span', { class: 'gm-cap' }, 'Inning'), h('div', { class: 'gm-inning-row' }, h('span', { class: 'gm-arrows' }, this.arrowTop, this.arrowBottom), housing(this.inning, 'gm-inning-housing')))),
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
      h('div', { class: 'gm-card' }, h('div', { class: 'gm-card-main' }, this.who, this.deck), this.walkup, this.lastLine),
      h('div', { class: 'gm-score', 'aria-hidden': 'true' }, this.teams.away.box, mid, this.teams.home.box),
      // A diamond inside the board (Steve, Nov 14): second at the top, third and first to the sides,
      // home plate at the bottom, chalk lines between, and each runner's name beside their base.
      // VoiceOver order: first, second, third.
      h(
        'div',
        { class: 'gm-bases' },
        h('span', { class: 'gm-paths', 'aria-hidden': 'true' }),
        drawPlate(),
        ...this.bases,
        ...this.tags,
      ),
    );
  }

  /** The last play in words, or nothing before the first one. */
  setLast(text: string): void {
    setText(this.lastText, text);
    // Before the first play the line keeps its space, empty, so the pad never shifts.
    this.lastLine.classList.toggle('gm-lastplay-empty', !text);
  }

  /** Just the clock, once a second: minutes and seconds, then 0:00 under LAST INN. */
  setClock(time: string | null): void {
    this.clockBox.hidden = time === null;
    const last = time === 'LAST';
    this.clockBox.classList.toggle('gm-time-up', last);
    setText(this.timeCap, last ? 'Last Inn' : 'Time');
    if (last) this.clock.set('0:00');
    else if (time) this.clock.set(time);
  }

  update(v: BoardView, teamColor: string): void {
    setText(this.spoken, v.spoken);
    setText(this.spot, v.top.spot ? `${v.top.spot}.` : '');
    setText(this.batter, v.top.name);
    setText(this.pos, v.top.pos);
    // The full line when it fits beside the name; else without the codes, so it never trails off.
    setText(this.todayText, v.top.today);
    setAttr(this.todayText, 'data-full', v.top.today || null);
    if (this.todayText.scrollWidth > this.todayText.clientWidth + 1) setText(this.todayText, v.top.todayShort);
    // Still too long beside a long name: leave it off rather than trail off ("1-F…"); the name wins.
    if (this.todayText.scrollWidth > this.todayText.clientWidth + 1) setText(this.todayText, '');
    this.el.style.setProperty('--team', teamColor);

    for (const side of ['away', 'home'] as const) {
      const t = v[side];
      const box = this.teams[side];
      setText(box.name, t.abbr);
      box.box.classList.toggle('us', t.us);
      // The at-bat lamp lights, with AT BAT beside the name: a lamp and words, not color alone.
      box.box.classList.toggle('batting', (side === 'away') === (v.half === 'top') && !v.final);
      box.runs.set(String(t.runs));
      box.hr.hidden = t.hrLamps === 0;
      lampsTo(box.lamps, t.hrLamps, t.hrUsed, 'gm-hrlamp');
    }

    this.inning.set(String(v.inning).padStart(2, ' '));
    this.arrowTop.classList.toggle('on', v.half === 'top' && !v.final);
    this.arrowBottom.classList.toggle('on', v.half === 'bottom' && !v.final);
    // An unlit arrow is a bulb that's off, not words to read; the lit one passes contrast.
    setAttr(this.arrowTop, 'data-contrast-skip', this.arrowTop.classList.contains('on') ? null : '');
    setAttr(this.arrowBottom, 'data-contrast-skip', this.arrowBottom.classList.contains('on') ? null : '');
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
      // The runner's name beside the base: first name and last initial, so it fits.
      setText(this.tags[i]!, b.occupied ? shortName(b.name) : '');
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
    // Names come through whole (Steve, Nov 13): a long one shrinks to fit before it would be cut off.
    fitText(this.who, this.batter, 0.62);
    // On Deck never drops under 12 points.
    fitText(this.deck, this.deckName, 0.8);
  }
}

/** Shrink a line's text (through --fit) until `name` shows whole, down to `min`. */
function fitText(line: HTMLElement, name: HTMLElement, min: number): void {
  line.style.setProperty('--fit', '1');
  const need = name.scrollWidth;
  const have = name.clientWidth;
  if (!need || !have || need <= have + 1) return;
  line.style.setProperty('--fit', Math.max(min, (have / need) * 0.98).toFixed(3));
}

function lampsTo(box: HTMLElement, n: number, lit: number, cls: string): void {
  if (box.childElementCount !== n) box.replaceChildren(...Array.from({ length: n }, () => h('span', { class: `gm-lamp ${cls}` })));
  [...box.children].forEach((l, i) => l.classList.toggle('on', i < lit));
}

/** "Becca Lindqvist" → "Becca L."; one name stays as it is. */
function shortName(name: string): string {
  // "Travis Pruitt Jr." is Travis P.: a Jr., Sr., or numeral isn't the last name.
  const parts = name.trim().split(/\s+/).filter((w, i) => i === 0 || !/^(jr|sr|ii|iii|iv)\.?$/i.test(w));
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)![0]}.` : name;
}
