/*
 * The Defense card (SPEC §9, Game tab → Defense): players down the side,
 * innings across, names pinned to the left. Tap a box for a position or
 * Sit (a taken position swaps the two); tap a name to pin it. Auto-Rotate
 * fills the innings not yet played; Reset clears them; Whiteboard draws the
 * card the way Steve writes it on the dugout whiteboard.
 */
import type { App } from '../../app/app.ts';
import { ordinalWord } from '../../app/view.ts';
import type { DefenseInning, Pos } from '../../engine/types.ts';
import { POSITION_ABBR, POSITION_NAMES } from '../../engine/words.ts';
import { autoRotate, cardInnings, cardPlayers, checkInning, FIELD_ORDER, fullCard, pinsFor, planInnings, playedThrough, playerCounts, resetCard, setSpot, type Spot } from '../../game/defense.ts';
import { stateOf } from '../../stats/games.ts';
import type { SavedGame } from '../../store/model.ts';
import { announce } from '../announce.ts';
import { h, isDimmed, setDimmed } from '../dom.ts';
import { icon } from '../icons.ts';
import { choose, confirm, openSheet } from '../sheet.ts';
import { openWhiteboard } from './whiteboard.ts';

const cap = (s: string) => s.replace(/(^|[\s-])(\w)/g, (_, a: string, b: string) => a + b.toUpperCase());
export const spotAbbr = (s: Spot | undefined): string => (s === undefined || s === 'sit' ? 'Sit' : s === 'EH' ? 'EH' : POSITION_ABBR[s]);
const spotWords = (s: Spot | undefined): string => (s === undefined || s === 'sit' ? 'sitting' : s === 'EH' ? 'extra hitter' : POSITION_NAMES[s]);

/** Short names for the card: first name, plus a last initial when two share it. */
export function shortNames(app: App, ids: string[]): Map<string, string> {
  const full = new Map(ids.map((id) => [id, app.playerName(id)]));
  const first = (id: string) => full.get(id)!.split(/\s+/)[0] ?? '';
  const out = new Map<string, string>();
  for (const id of ids) {
    const f = first(id);
    const twin = ids.some((o) => o !== id && first(o) === f);
    const last = full.get(id)!.split(/\s+/).slice(1).pop();
    out.set(id, twin && last ? `${f} ${last[0]}.` : f);
  }
  return out;
}

export function openDefenseCard(app: App): void {
  const wrap = h('div', { class: 'df-wrap' });
  const controls = h('div', { class: 'df-controls' });
  const notes = h('p', { class: 'sk-row-note df-notes', 'aria-live': 'polite' });
  const body = [h('p', { class: 'sk-row-note' }, 'Tap a box to pick a position or Sit. Tap a name to pin that player in place.'), controls, notes, wrap];
  const sheet = openSheet({ title: 'Defense', full: true, body, done: { label: 'Done', onClick: () => undefined }, cancel: false, className: 'df-sheet' });

  const game = (): SavedGame | null => app.game;
  const save = (change: (g: SavedGame) => void) => {
    app.updateGame(change);
    render();
  };

  function render(): void {
    const g = game();
    if (!g) {
      sheet.close();
      return;
    }
    const players = cardPlayers(g);
    const names = shortNames(app, players);
    const total = cardInnings(g);
    const plan = planInnings(g);
    const played = playedThrough(g);
    const s = stateOf(g);
    const card = fullCard(g, total, players);
    const pins = new Set(pinsFor(g, players));

    // ---- controls ----
    const minus = h('button', { type: 'button', class: 'sk-key df-step', 'aria-label': 'Plan for fewer innings' }, '−');
    const plus = h('button', { type: 'button', class: 'sk-key df-step', 'aria-label': 'Plan for more innings' }, '+');
    const fewest = Math.max(1, played);
    setDimmed(minus, plan <= fewest ? 'The plan can’t be shorter than the innings already played.' : undefined);
    setDimmed(plus, plan >= total ? `The game has ${total} innings.` : undefined);
    minus.addEventListener('click', () => {
      if (isDimmed(minus)) return void (notes.textContent = minus.dataset.why ?? '');
      save((x) => (x.plan = plan - 1));
    });
    plus.addEventListener('click', () => {
      if (isDimmed(plus)) return void (notes.textContent = plus.dataset.why ?? '');
      save((x) => (x.plan = plan + 1));
    });
    const rotate = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Auto-Rotate');
    rotate.addEventListener('click', () => {
      const result = autoRotate(g, app.team?.players ?? []);
      save((x) => (x.defense = result.defense));
      const from = Math.max(1, played) + 1;
      const msg = from > plan ? 'Every planned inning is already played.' : `Innings ${from}–${plan} are filled in.`;
      notes.textContent = [msg, ...result.notes].join(' ');
      announce(notes.textContent);
    });
    const reset = h('button', { type: 'button', class: 'sk-key' }, 'Reset');
    reset.addEventListener('click', async () => {
      if (!(await confirm('Reset the Defense Card?', 'Innings not played yet go back to copying the inning before them. Innings already played stay.', 'Reset'))) return;
      save((x) => (x.defense = resetCard(x)));
      notes.textContent = 'Innings not played yet are reset.';
    });
    const board = h('button', { type: 'button', class: 'sk-key' }, 'Whiteboard');
    board.addEventListener('click', () => openWhiteboard(app, g));
    controls.replaceChildren(
      h('div', { class: 'df-plan', role: 'group', 'aria-label': `Plan for ${plan} innings` }, minus, h('span', { class: 'df-plan-text', 'aria-hidden': 'true' }, `Plan for ${plan} ${plan === 1 ? 'Inning' : 'Innings'}`), plus),
      h('div', { class: 'df-actions' }, rotate, reset, board),
    );

    // ---- the card ----
    const head = h('tr', {}, h('th', { class: 'df-name', scope: 'col' }, 'Player'));
    for (let i = 1; i <= total; i++) {
      const missing = checkInning(card[i - 1]!).missing;
      const label = [`Inning ${i}`, i <= played ? 'played' : '', i > plan ? 'if needed' : '', missing.length ? `missing ${missing.map((m) => POSITION_NAMES[m]).join(', ')}` : ''].filter(Boolean).join(', ');
      head.append(
        h(
          'th',
          { scope: 'col', class: `df-inning${i === s.inning ? ' df-now' : ''}${i > plan ? ' df-later' : ''}`, 'aria-label': label },
          h('span', { 'aria-hidden': 'true' }, String(i)),
          missing.length ? h('span', { class: 'df-warn', 'aria-hidden': 'true' }, '!') : null,
          i > plan ? h('span', { class: 'df-ifneeded', 'aria-hidden': 'true' }, 'if needed') : null,
        ),
      );
    }
    head.append(h('th', { scope: 'col', class: 'df-count' }, 'Innings'));

    const rows = players.map((p) => {
      const pinned = pins.has(p);
      const nameBtn = h(
        'button',
        { type: 'button', class: 'df-pin', 'aria-pressed': String(pinned), 'aria-label': `${app.playerName(p)}, ${pinned ? 'pinned, stays put' : 'not pinned'}` },
        pinned ? icon('pin', 16) : null,
        h('span', {}, names.get(p)!),
      );
      nameBtn.addEventListener('click', () => {
        const next = new Set(pins);
        if (pinned) next.delete(p);
        else next.add(p);
        save((x) => (x.pins = players.filter((id) => next.has(id))));
        announce(`${app.playerName(p)} ${pinned ? 'unpinned' : 'pinned'}`);
      });
      const tr = h('tr', { class: pinned ? 'df-pinned' : '' }, h('th', { scope: 'row', class: 'df-name' }, nameBtn));
      for (let i = 1; i <= total; i++) {
        const spot = card[i - 1]![p];
        const b = h(
          'button',
          { type: 'button', class: `df-cell${spot === 'sit' || spot === undefined ? ' df-sit' : ''}`, 'aria-label': `${app.playerName(p)}, inning ${i}: ${spotWords(spot)}` },
          spotAbbr(spot),
        );
        b.addEventListener('click', () => void pick(p, i, card[i - 1]!));
        tr.append(h('td', { class: `${i === s.inning ? 'df-now' : ''}${i > plan ? ' df-later' : ''}` }, b));
      }
      const c = playerCounts(card.slice(0, plan), p);
      tr.append(h('td', { class: 'df-count' }, `${c.field} field · ${c.sit} sit`));
      return tr;
    });
    const scrollLeft = wrap.scrollLeft;
    wrap.replaceChildren(h('table', { class: 'df-table' }, h('caption', { class: 'sk-visually-hidden' }, 'Defense card: players down the side, innings across'), h('thead', {}, head), h('tbody', {}, ...rows)));
    wrap.scrollLeft = scrollLeft;
  }

  async function pick(player: string, inning: number, inningCard: DefenseInning): Promise<void> {
    const g = game();
    if (!g) return;
    const holder = (pos: Pos) => Object.keys(inningCard).find((x) => x !== player && inningCard[x] === pos);
    const choices = FIELD_ORDER.filter((pos) => pos !== 12 || Object.values(inningCard).includes(12)).map((pos) => {
      const who = holder(pos);
      return { label: `${POSITION_ABBR[pos]} · ${cap(POSITION_NAMES[pos])}`, value: pos as Spot, sub: who ? `${app.playerName(who)} moves to ${spotAbbr(inningCard[player])}` : undefined };
    });
    choices.push({ label: 'Sit', value: 'sit', sub: undefined });
    const now = inningCard[player];
    const title = `${app.playerName(player)}, ${cap(ordinalWord(inning))} Inning`;
    const spot = await choose(title, choices, `Now: ${spotWords(now)}.`);
    if (spot === null || spot === now) return;
    save((x) => (x.defense = setSpot(x, inning, player, spot)));
  }

  render();
}
