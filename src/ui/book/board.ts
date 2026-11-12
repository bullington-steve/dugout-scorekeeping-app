/*
 * The Book's scoreboard (SPEC §6): a hand-hung field board. The park's name
 * painted across the top, two banks of stadium lights on top, dark hung
 * plates with white numbers for each inning and R H E, short team names
 * (touch and hold for the full name), + to add an inning, and along the
 * bottom AT BAT with the batter's number in bulbs, BALL and STRIKE lamps
 * (count on), OUT lamps, and H and E lamps for the last play.
 */
import type { GameState } from '../../engine/replay.ts';
import type { Side } from '../../engine/types.ts';
import { stateOf } from '../../stats/games.ts';
import type { SavedGame, Team } from '../../store/model.ts';
import { announce } from '../announce.ts';
import { h, setText, svg } from '../dom.ts';
import { BulbText } from '../game/bulbs.ts';

export interface BookBoardHandlers {
  /** + after the last inning; only offered on a game that can still change. */
  addInning: (() => void) | null;
}

/** A bank of six lamps on a short pole, drawn like the real thing: frame, lamps, a little lens light. */
function lightBank(bank: number): SVGSVGElement {
  const lamps: SVGElement[] = [];
  const glows: SVGElement[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = 10 + col * 12;
      const cy = 9 + row * 11;
      // The order the lamps come on in a sweep: bank by bank, left to right.
      const i = bank * 6 + row * 3 + col;
      // One soft glow behind each lamp, drawn once; only its opacity changes (SPEC §14).
      glows.push(svg('circle', { cx, cy, r: 9, class: 'bk-glow', style: `--i: ${i}` }));
      lamps.push(
        svg('circle', { cx, cy, r: 5, class: 'bk-bulb', style: `--i: ${i}`, stroke: 'var(--fb-housing)', 'stroke-width': 1.4 }),
        svg('circle', { cx: cx - 1.6, cy: cy - 1.6, r: 1.5, fill: 'var(--fb-lamp-hi)' }),
      );
    }
  }
  return svg(
    'svg',
    { viewBox: '0 0 44 44', class: 'bk-bank', 'aria-hidden': 'true', focusable: 'false' },
    svg('rect', { x: 19.5, y: 27, width: 5, height: 17, fill: 'var(--fb-pole)' }),
    svg('rect', { x: 0.5, y: 1, width: 43, height: 28, rx: 3, fill: 'var(--fb-lamp-frame)', stroke: 'var(--fb-frame-dark)', 'stroke-width': 1 }),
    ...glows,
    ...lamps,
  );
}

const lamp = (kind: 'ball' | 'strike' | 'out' | 'h' | 'e') => h('span', { class: `bk-lamp bk-lamp-${kind}`, 'aria-hidden': 'true' });

export class BookBoard {
  readonly el: HTMLElement;
  private readonly sign = h('p', { class: 'bk-sign' });
  private readonly line = h('table', { class: 'bk-line' });
  private readonly atBat = new BulbText('00', 'bk-atbat-bulbs');
  private readonly balls = h('span', { class: 'bk-lamps' });
  private readonly strikes = h('span', { class: 'bk-lamps' });
  private readonly outs = h('span', { class: 'bk-lamps' }, lamp('out'), lamp('out'));
  private readonly hLamp = lamp('h');
  private readonly eLamp = lamp('e');
  private readonly countGroup: HTMLElement;
  private readonly words = h('p', { class: 'sk-visually-hidden' });

  private readonly on: BookBoardHandlers;

  constructor(on: BookBoardHandlers) {
    this.on = on;
    this.countGroup = h('span', { class: 'bk-count' }, h('span', { class: 'bk-lamp-label' }, 'Ball'), this.balls, h('span', { class: 'bk-lamp-label' }, 'Strike'), this.strikes);
    this.el = h(
      'section',
      { class: 'bk-board', 'aria-label': 'Book Scoreboard' },
      h('div', { class: 'bk-lights', 'aria-hidden': 'true' }, lightBank(0), lightBank(1)),
      h(
        'div',
        { class: 'bk-face' },
        this.sign,
        h('div', { class: 'bk-line-wrap' }, this.line),
        h(
          'div',
          { class: 'bk-bottom', 'aria-hidden': 'true' },
          h('span', { class: 'bk-atbat' }, h('span', { class: 'bk-lamp-label' }, 'At Bat'), this.atBat.el),
          this.countGroup,
          h('span', { class: 'bk-count' }, h('span', { class: 'bk-lamp-label' }, 'Out'), this.outs),
          h('span', { class: 'bk-count' }, h('span', { class: 'bk-lamp-label' }, 'H'), this.hLamp, h('span', { class: 'bk-lamp-label' }, 'E'), this.eLamp),
        ),
        this.words,
      ),
    );
  }

  update(team: Team, game: SavedGame, atBatNumber: string): void {
    const s = stateOf(game);
    setText(this.sign, game.park || (game.setup.us === 'home' ? team.name : game.opponent));
    this.drawLine(team, game, s);
    this.atBat.set(s.final ? '' : atBatNumber);
    const r = game.setup.rules.count;
    this.countGroup.hidden = !game.setup.count;
    if (game.setup.count) {
      fillLamps(this.balls, 'ball', r.walkAt - 1, s.final ? 0 : s.count.balls);
      fillLamps(this.strikes, 'strike', r.outAt - 1, s.final ? 0 : s.count.strikes);
    }
    [...this.outs.children].forEach((el, i) => el.toggleAttribute('data-on', !s.final && i < s.outs));
    const last = [...s.plays].reverse().find((p) => p.t === 'pa' || p.t === 'quick');
    const hit = !!last && (['1B', '2B', '3B', 'HR'].includes(last.result ?? '') || last.quick === 'hit' || last.quick === 'hr');
    const err = !!last && (last.result === 'E' || last.quick === 'error');
    this.hLamp.toggleAttribute('data-on', hit);
    this.eLamp.toggleAttribute('data-on', err);
  }

  private drawLine(team: Team, game: SavedGame, s: GameState): void {
    const innings = Math.max(game.setup.rules.innings, s.inning, s.line.away.length, s.line.home.length);
    const names: Record<Side, { abbr: string; name: string }> = {
      [game.setup.us]: { abbr: team.abbr, name: team.name },
      [game.setup.us === 'away' ? 'home' : 'away']: { abbr: game.opponentAbbr, name: game.opponent },
    } as Record<Side, { abbr: string; name: string }>;
    const head = h(
      'tr',
      {},
      h('th', { scope: 'col', class: 'bk-team-col' }, h('span', { class: 'sk-visually-hidden' }, 'Team')),
      ...Array.from({ length: innings }, (_, i) => h('th', { scope: 'col', class: i + 1 === s.inning && !s.final ? 'bk-now' : '' }, String(i + 1))),
      this.plusCell(s),
      h('th', { scope: 'col', class: 'bk-rhe' }, 'R'),
      h('th', { scope: 'col' }, 'H'),
      h('th', { scope: 'col' }, 'E'),
    );
    const row = (side: Side) => {
      const team = names[side];
      const label = h('th', { scope: 'row', class: 'bk-team', 'aria-label': team.name }, team.abbr);
      holdToShow(label, team.name);
      return h(
        'tr',
        {},
        label,
        ...Array.from({ length: innings }, (_, i) => {
          const v = s.line[side][i];
          return h('td', {}, h('span', { class: 'bk-plate' }, v === undefined ? '' : String(v)));
        }),
        h('td', { class: 'bk-plus-gap' }),
        h('td', { class: 'bk-rhe' }, h('span', { class: 'bk-plate' }, String(s.score[side]))),
        h('td', {}, h('span', { class: 'bk-plate' }, String(s.hits[side]))),
        // Errors are charged to the fielding team (the engine counts them that way).
        h('td', {}, h('span', { class: 'bk-plate' }, String(s.errors[side]))),
      );
    };
    this.line.replaceChildren(h('caption', { class: 'sk-visually-hidden' }, 'Line Score'), h('thead', {}, head), h('tbody', {}, row('away'), row('home')));
    setText(
      this.words,
      `${names.away.name} ${s.score.away}, ${names.home.name} ${s.score.home}. ${s.final ? 'Final.' : `${s.half === 'top' ? 'Top' : 'Bottom'} of inning ${s.inning}, ${s.outs} ${s.outs === 1 ? 'out' : 'outs'}.`}`,
    );
  }

  private plusCell(s: GameState): HTMLElement {
    if (!this.on.addInning) return h('th', { scope: 'col', class: 'bk-plus-gap' });
    const add = this.on.addInning;
    const b = h('button', { type: 'button', class: 'bk-plus', 'aria-label': 'Add an Inning' }, '+');
    b.addEventListener('click', () => {
      add();
      announce(s.final ? 'Another inning added. The game goes on.' : 'Another inning added.');
    });
    return h('th', { scope: 'col', class: 'bk-plus-cell' }, b);
  }
}

function fillLamps(el: HTMLElement, kind: 'ball' | 'strike', count: number, lit: number): void {
  if (el.children.length !== count) el.replaceChildren(...Array.from({ length: count }, () => lamp(kind)));
  [...el.children].forEach((c, i) => c.toggleAttribute('data-on', i < lit));
}

/** Touch and hold a short team name to see the full one. */
function holdToShow(el: HTMLElement, full: string): void {
  let timer = 0;
  const tip = h('span', { class: 'bk-tip', role: 'tooltip', hidden: true }, full);
  el.append(tip);
  const hide = () => {
    clearTimeout(timer);
    window.setTimeout(() => (tip.hidden = true), 1200);
  };
  el.addEventListener('pointerdown', () => {
    timer = window.setTimeout(() => (tip.hidden = false), 450);
  });
  el.addEventListener('pointerup', hide);
  el.addEventListener('pointercancel', hide);
  el.addEventListener('pointerleave', hide);
}
