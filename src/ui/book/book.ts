/*
 * The Book tab (SPEC §6): the hand-hung board, the scorebook page for either
 * team in Steve's handwriting, the play-by-play, and the scorekeeper's
 * footer (signature, Complete Book, Rare Plays). Draws only while showing.
 */
import { openShare } from '../share/share.ts';
import { openReplay } from './replay.ts';
import type { App } from '../../app/app.ts';
import { bookNames, bookPage, completeBook, gameTimes, playByPlay, rarePlayFirsts, RARE_PLAYS, recentLines, type PlayLine } from '../../app/book.ts';
import { stateOf, resultFor } from '../../stats/games.ts';
import { defenseFor } from '../../stats/index.ts';
import { POSITION_ABBR } from '../../engine/words.ts';
import type { SavedGame } from '../../store/model.ts';
import { segmented } from '../controls.ts';
import { announce } from '../announce.ts';
import { h } from '../dom.ts';
import { icon } from '../icons.ts';
import { choose, openSheet } from '../sheet.ts';
import { openPlayerCard } from '../stats/playercard.ts';
import { dayText, shortDayText } from '../when.ts';
import { BookBoard } from './board.ts';
import { openEditPlay } from './editplay.ts';
import { drawGrid, resizeBoxes } from './grid.ts';

export type BookInk = 'pencil' | 'black' | 'blue';
export const INK_NAMES: Record<BookInk, string> = { pencil: 'Pencil', black: 'Black Pen', blue: 'Blue Pen' };

/** Book Ink applies to the whole app's Book (and later the Scorecard picture). */
export function applyInk(ink: BookInk | undefined): void {
  if (!ink || ink === 'pencil') delete document.documentElement.dataset.ink;
  else document.documentElement.dataset.ink = ink;
}

export async function pickInk(app: App): Promise<void> {
  const now = app.data.prefs.bookInk ?? 'pencil';
  const pick = await choose<BookInk>(
    'Book Ink',
    (['pencil', 'black', 'blue'] as const).map((v) => ({ label: `${INK_NAMES[v]}${v === now ? ' ✓' : ''}`, value: v, kind: v === now ? 'primary' : undefined })),
    'The whole Book is written in one ink. Change it anytime; every game is redrawn. Outs stay in red pen and runs in highlighter.',
  );
  if (!pick) return;
  app.commit((d) => (d.prefs.bookInk = pick));
}

/** "Oct 17 vs Horsetooth Hackers · W 12–7", for the game menu: no weekday, so each fits one line (Steve, Nov 16). */
export function gameLabel(g: SavedGame): string {
  const s = stateOf(g);
  const us = s.score[g.setup.us];
  const them = s.score[g.setup.us === 'away' ? 'home' : 'away'];
  const result = resultFor(g);
  // "Live" rather than "In Progress", so the whole line fits the menu (Book polish, Nov 14).
  const tail = !g.saved && !s.final ? 'Live' : `${result ?? ''} ${us}–${them}`.trim();
  return `${shortDayText(g.date)} ${g.setup.us === 'away' ? 'at' : 'vs'} ${g.opponent} · ${tail}`;
}

/**
 * The Batter column is as wide as the longest Book name at full size, never more than its cap (a
 * quarter of the width, Steve, Nov 20) and never under 60 points: the rest goes to the innings.
 */
function sizeBatterColumn(root: HTMLElement): void {
  const grid = root.querySelector<HTMLElement>('.bk-grid');
  const cell = root.querySelector<HTMLElement>('.bk-grid tbody td.bk-batter');
  if (!grid || !cell) return;
  grid.style.removeProperty('--bk-batter-fit');
  const names = [...root.querySelectorAll<HTMLElement>('.bk-grid tbody .bk-name')];
  for (const el of names) el.style.setProperty('--fit', '1');
  const cs = getComputedStyle(cell);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
  const cap = cell.getBoundingClientRect().width;
  const range = document.createRange();
  let need = 0;
  for (const el of names) {
    range.selectNodeContents(el);
    need = Math.max(need, range.getBoundingClientRect().width);
  }
  const width = Math.min(cap, Math.max(60, Math.ceil(need + pad + 2)));
  grid.style.setProperty('--bk-batter-fit', `${width}px`);
}

/**
 * The inning columns share the width left beside the names (Steve, Nov 20): as many whole columns
 * as fit at 72 points or more, widened to fill it exactly, so an inning never shows as a sliver.
 * A column made by batting around is the same full width. Then each box is redrawn to its width.
 */
function sizeColumns(root: HTMLElement, zoom: BookZoom): void {
  const grid = root.querySelector<HTMLElement>('.bk-grid');
  const wrap = root.querySelector<HTMLElement>('.bk-grid-wrap');
  const num = root.querySelector<HTMLElement>('.bk-grid thead .bk-num');
  const batter = root.querySelector<HTMLElement>('.bk-grid thead .bk-batter');
  if (!grid || !wrap || !num || !batter) return;
  const avail = wrap.clientWidth - num.getBoundingClientRect().width - batter.getBoundingClientRect().width;
  // Page: every inning played fits across (never under a 44-point tap), rows 64 so a name and its
  // line still fit. Normal: today's sizes. Close-up: about 1.5 times, 108-point boxes.
  const min = zoom === 'closeup' ? 108 : zoom === 'page' ? 44 : 72;
  const row = zoom === 'closeup' ? 108 : zoom === 'page' ? 64 : 72;
  let col: number;
  if (zoom === 'page') {
    const played = Math.max(1, Number(grid.dataset.played) || 1);
    col = Math.max(min, Math.min(96, Math.floor((avail / played) * 100) / 100));
  } else {
    const n = Math.max(1, Math.floor(avail / min));
    // Exact, not rounded down, so whole innings land flush with the page's edge.
    col = Math.max(min, Math.floor((avail / n) * 100) / 100);
  }
  grid.style.setProperty('--bk-col', `${col}px`);
  grid.style.setProperty('--bk-row', `${row}px`);
  grid.dataset.zoom = zoom;
  resizeBoxes(root);
}

/** Each name and the line under it on one line: shrink (--fit) until it shows whole. */
function fitNames(root: HTMLElement): void {
  const fit = (el: HTMLElement, min: number) => {
    el.style.setProperty('--fit', '1');
    // Measure again after each step: handwriting doesn't shrink in exact proportion.
    let fit = 1;
    for (let i = 0; i < 4; i++) {
      const need = el.scrollWidth;
      const have = el.clientWidth;
      if (!need || !have || need <= have) return;
      fit = Math.max(min, fit * (have / need) * 0.97);
      el.style.setProperty('--fit', fit.toFixed(3));
      if (fit === min) return;
    }
  };
  // Names never under 12 points (22 × 0.55), the jersey line never under 12 (15 × 0.8).
  root.querySelectorAll<HTMLElement>('.bk-grid .bk-name:not(.bk-name-before)').forEach((el) => fit(el, 0.55));
  root.querySelectorAll<HTMLElement>('.bk-grid .bk-jersey').forEach((el) => fit(el, 0.8));
  // The board's bottom row: H and E get their own row when they'd otherwise wrap by themselves.
  const bottom = root.querySelector<HTMLElement>('.bk-bottom');
  const he = bottom?.querySelector<HTMLElement>('.bk-he');
  if (bottom && he) {
    bottom.classList.remove('bk-two-rows');
    const first = bottom.firstElementChild as HTMLElement | null;
    if (first && he.offsetTop > first.offsetTop + first.offsetHeight / 2) bottom.classList.add('bk-two-rows');
  }
}

/**
 * Scroll so the inning being played is fully in view, keeping as many earlier innings beside it as
 * fit, snapped to an inning's edge so no sliver of a half-hidden inning peeks out beside the names.
 */
function showCurrentInning(wrap: HTMLElement): void {
  const now = wrap.querySelector<HTMLElement>('thead th.bk-current');
  if (!now) return;
  // Measured in fractions of a point (offsetLeft rounds), so a flush fit counts as a fit.
  const base = wrap.getBoundingClientRect().left - wrap.scrollLeft;
  const x = (el: HTMLElement) => el.getBoundingClientRect().left - base;
  // The names' column is sticky (its own position moves as the page scrolls), so the innings start
  // where the first inning column sits on the unscrolled page.
  const first = wrap.querySelector<HTMLElement>('thead th.bk-inning');
  const edge = first ? x(first) : 0;
  const nowLeft = x(now);
  const need = nowLeft + now.getBoundingClientRect().width - wrap.clientWidth - 0.5;
  const stops = [...wrap.querySelectorAll<HTMLElement>('thead th.bk-inning')].map((th) => x(th) - edge).filter((v) => v <= nowLeft - edge + 0.5);
  const fit = stops.filter((v) => v >= need);
  wrap.scrollLeft = Math.max(0, need <= 0 ? 0 : Math.ceil(Math.min(...(fit.length ? fit : [nowLeft - edge]))));
}

/** Scroll the page just enough that the current batter's row sits clear of the tab bar (Steve, Nov 17). */
function showCurrentRow(root: HTMLElement): void {
  const row = root.querySelector<HTMLElement>('.bk-grid tr.bk-row-current');
  if (!row) return;
  const r = row.getBoundingClientRect();
  const bar = document.querySelector<HTMLElement>('.sk-tabbar')?.getBoundingClientRect().top ?? window.innerHeight;
  const bottom = bar - 12;
  if (r.bottom > bottom) window.scrollBy(0, r.bottom - bottom);
  else if (r.top < 8) window.scrollBy(0, r.top - 8);
}

/** The Book's zoom (Steve, Nov 21): a button, never a pinch ("No pinch-zoom" stays). */
export type BookZoom = 'page' | 'normal' | 'closeup';
export const ZOOM_NAMES: Record<BookZoom, string> = { page: 'Page', normal: 'Normal', closeup: 'Close-up' };
const ZOOM_KEY = 'scorekept:book-zoom';

/** The last zoom picked on this device (a view setting: never in backups). */
function savedZoom(): BookZoom {
  try {
    const v = localStorage.getItem(ZOOM_KEY);
    return v === 'page' || v === 'closeup' ? v : 'normal';
  } catch {
    return 'normal';
  }
}

function saveZoom(z: BookZoom): void {
  try {
    localStorage.setItem(ZOOM_KEY, z);
  } catch {
    // A private window: the zoom still works until the app closes.
  }
}

/**
 * Close-up follows the at-bat: the current box in the middle of the page, sideways between the
 * names and the edge, and up and down between the pinned inning row and the tab bar.
 */
function centerCurrent(root: HTMLElement): void {
  const wrap = root.querySelector<HTMLElement>('.bk-grid-wrap');
  const cell = root.querySelector<HTMLElement>('.bk-grid .bk-due') ?? root.querySelector<HTMLElement>('.bk-grid tr.bk-row-current td.bk-cell');
  if (!wrap || !cell) return;
  centerOn(wrap, cell);
}

function centerOn(wrap: HTMLElement, cell: HTMLElement): void {
  const first = wrap.querySelector<HTMLElement>('thead th.bk-inning');
  const head = wrap.querySelector<HTMLElement>('thead');
  if (!first || !head) return;
  const base = wrap.getBoundingClientRect().left - wrap.scrollLeft;
  const edge = first.getBoundingClientRect().left - base;
  const c = cell.getBoundingClientRect();
  const left = c.left - base;
  const visible = wrap.clientWidth - edge;
  wrap.scrollLeft = Math.max(0, left - edge - (visible - c.width) / 2);
  const top = head.getBoundingClientRect().height;
  const bar = document.querySelector<HTMLElement>('.sk-tabbar')?.getBoundingClientRect().top ?? window.innerHeight;
  const r = cell.getBoundingClientRect();
  const mid = top + (bar - top) / 2;
  window.scrollBy(0, r.top + r.height / 2 - mid);
}

export class BookScreen {
  readonly el = h('div', { class: 'bk-screen' });
  private readonly app: App;
  private side: 'us' | 'them' = 'us';
  private shownId: string | null = null;
  private board: BookBoard | null = null;
  // Bring the inning being played into view on the next draw: set when the Book is opened.
  private reveal = false;
  private lastInning: number | null = null;
  private lastSlot: number | null = null;
  private zoom: BookZoom = savedZoom();
  // A tap on the grid waits a moment, so a second tap can make it a double-tap (Normal ↔ Close-up).
  private pendingTap: number | undefined;
  private lastTap = { t: 0, x: 0, y: 0 };

  constructor(app: App) {
    this.app = app;
    addEventListener('scroll', () => this.syncFloat(), { passive: true });
    addEventListener('resize', () => this.syncFloat(), { passive: true });
  }

  /** Change the zoom, remember it on this device, and redraw with the at-bat (or the tapped box) centered. */
  setZoom(z: BookZoom, at?: HTMLElement | null): void {
    this.zoom = z;
    saveZoom(z);
    const key = at?.closest('td') ? this.cellKey(at.closest('td')!) : null;
    this.reveal = true;
    this.update(true);
    if (key) {
      const cell = this.findCell(key);
      const wrap = this.el.querySelector<HTMLElement>('.bk-grid-wrap');
      if (cell && wrap && z === 'closeup') centerOn(wrap, cell);
    }
    announce(`Book zoom: ${ZOOM_NAMES[z]}.`);
  }

  private cellKey(td: HTMLElement): string {
    const tr = td.parentElement!;
    return `${[...tr.parentElement!.children].indexOf(tr)}:${[...tr.children].indexOf(td)}`;
  }

  private findCell(key: string): HTMLElement | null {
    const [r, c] = key.split(':').map(Number);
    return (this.el.querySelector('.bk-grid tbody')?.children[r!]?.children[c!] as HTMLElement | undefined) ?? null;
  }

  /** Taps on the grid go through here: a second tap within 300 ms is a double-tap instead. */
  private gate(fn: () => void): void {
    window.clearTimeout(this.pendingTap);
    this.pendingTap = window.setTimeout(fn, 300);
  }

  /** The pinned inning row: shown once the grid's own inning row scrolls up out of sight. */
  private syncFloat(): void {
    const float = this.el.querySelector<HTMLElement>('.bk-float');
    const wrap = this.el.querySelector<HTMLElement>('.bk-grid-wrap');
    const head = wrap?.querySelector<HTMLElement>('thead');
    if (!float || !wrap || !head || !this.el.isConnected) return;
    const w = wrap.getBoundingClientRect();
    const hd = head.getBoundingClientRect();
    const show = w.width > 0 && hd.top < 0 && w.bottom > hd.height * 2;
    float.hidden = !show;
    if (!show) return;
    float.style.left = `${w.left}px`;
    float.style.width = `${wrap.clientWidth}px`;
    float.scrollLeft = wrap.scrollLeft;
  }

  /** Copy the inning row into the pinned strip, each cell at its measured width. */
  private buildFloat(): void {
    const float = this.el.querySelector<HTMLElement>('.bk-float');
    const grid = this.el.querySelector<HTMLElement>('.bk-grid-wrap .bk-grid');
    const head = grid?.querySelector('thead');
    if (!float || !grid || !head) return;
    const copy = head.cloneNode(true) as HTMLElement;
    const from = [...head.querySelectorAll<HTMLElement>('th')];
    [...copy.querySelectorAll<HTMLElement>('th')].forEach((th, i) => {
      const w = `${from[i]!.getBoundingClientRect().width}px`;
      th.style.boxSizing = 'border-box';
      th.style.width = w;
      th.style.minWidth = w;
      th.style.maxWidth = w;
    });
    const table = h('table', { class: 'bk-float-grid' }, copy);
    table.style.cssText = grid.style.cssText;
    table.style.width = `${grid.getBoundingClientRect().width}px`;
    float.replaceChildren(table);
    this.syncFloat();
  }

  /** The Book tab was tapped: show the inning being played (Steve, Nov 17). */
  show(): void {
    this.reveal = true;
    this.update(true);
  }

  update(visible: boolean): void {
    applyInk(this.app.data.prefs.bookInk);
    if (!visible) return;
    const app = this.app;
    const team = app.team;
    const game = app.bookGame;
    // Apple's way (Book handoff, Nov 16): the large title on the left, icon buttons on the right.
    // Share opens the share sheet; the pencil opens the ink choices as the iPhone's own menu.
    const share = h('button', { type: 'button', class: 'bk-icon-key', 'aria-label': 'Share', hidden: !game }, icon('share'));
    share.addEventListener('click', () => game && openShare(app, game));
    const nowInk = app.data.prefs.bookInk ?? 'pencil';
    const inkMenu = h(
      'select',
      { class: 'bk-menu-native', 'aria-label': `Book Ink: ${INK_NAMES[nowInk]}` },
      ...(['pencil', 'black', 'blue'] as const).map((v) => h('option', { value: v, selected: v === nowInk }, INK_NAMES[v])),
    );
    inkMenu.addEventListener('change', () => app.commit((d) => (d.prefs.bookInk = inkMenu.value as BookInk)));
    const ink = h('span', { class: 'bk-icon-key bk-ink-key' }, icon('pen'), inkMenu);
    // The zoom (Steve, Nov 21): a reading glass opening the iPhone's own menu of three sizes.
    const zoomMenu = h(
      'select',
      { class: 'bk-menu-native', 'aria-label': `Book Zoom: ${ZOOM_NAMES[this.zoom]}` },
      ...(['page', 'normal', 'closeup'] as const).map((v) => h('option', { value: v, selected: v === this.zoom }, ZOOM_NAMES[v])),
    );
    zoomMenu.addEventListener('change', () => this.setZoom(zoomMenu.value as BookZoom));
    const zoom = h('span', { class: 'bk-icon-key bk-zoom-key', hidden: !game }, icon('zoom'), zoomMenu);
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-screen-title sk-header-title' }, 'Book'), h('div', { class: 'bk-head-keys' }, zoom, share, ink));
    if (!team || !game) {
      this.el.replaceChildren(header, h('section', { class: 'sk-card sk-soon' }, h('p', {}, 'No games yet. Start one on the Game tab, and the Book fills in as you score.')));
      return;
    }
    const opened = game.id !== this.shownId;
    if (opened) {
      this.shownId = game.id;
      this.side = 'us';
    }
    const grid = this.el.querySelector('.bk-grid-wrap');
    const scroll = grid ? grid.scrollLeft : null;

    // The game menu.
    const games = [...team.games].sort((a, b) => b.date.localeCompare(a.date) || (b.setup.startedAt ?? 0) - (a.setup.startedAt ?? 0));
    // The menu is the iPhone's own picker under a face in the athletic letters, with a LIVE badge
    // on a game still being scored (Book handoff, Nov 16: it mustn't look like a plain web form).
    const menu = h('select', { id: 'bk-game', class: 'bk-menu-native' }, ...games.map((g) => h('option', { value: g.id, selected: g.id === game.id }, gameLabel(g))));
    menu.addEventListener('change', () => app.view(menu.value === team.currentGameId ? null : menu.value));
    const isLive = !game.saved && !stateOf(game).final;
    const face = h(
      'span',
      { class: 'bk-picker-face', 'aria-hidden': 'true' },
      h('span', { class: 'bk-picker-text' }, isLive ? gameLabel(game).replace(/ · Live$/, '') : gameLabel(game)),
      isLive ? h('span', { class: 'bk-live' }, h('span', { class: 'bk-live-lamp' }), 'Live') : null,
      h('span', { class: 'bk-picker-chev' }, '⌄'),
    );
    const picker = h('div', { class: 'sk-field bk-picker' }, h('label', { for: 'bk-game', class: 'sk-visually-hidden' }, 'Game'), h('div', { class: 'bk-picker-box' }, face, menu));

    // The board.
    const live = team.currentGameId === game.id;
    this.board = new BookBoard({ addInning: live ? () => app.addEvent({ t: 'extend' }) : null });
    const s = stateOf(game);
    const battingUs = (s.half === 'top') === (game.setup.us === 'away');
    const due = s.lineups[battingUs ? 'us' : 'them'][s.nextSlot[battingUs ? 'us' : 'them']];
    const number = battingUs ? (team.players.find((p) => p.id === due?.player)?.number ?? '') : String(s.nextSlot.them + 1);
    this.board.update(team, game, number);

    // Which team's page.
    // Labeled like a scorebook's two pages (Steve, Nov 16): "Visitors · RAT" and "Home · DOGS".
    const away = game.setup.us === 'away' ? { value: 'us' as const, label: `Visitors · ${team.abbr}` } : { value: 'them' as const, label: `Visitors · ${game.opponentAbbr}` };
    const home = game.setup.us === 'home' ? { value: 'us' as const, label: `Home · ${team.abbr}` } : { value: 'them' as const, label: `Home · ${game.opponentAbbr}` };
    const which = segmented('Book Page', [away, home], this.side, (v) => {
      this.side = v;
      this.update(true);
    });
    const page = bookPage(game, this.side);
    const name = (k: string) => app.playerName(k);
    const number2 = (k: string) => team.players.find((p) => p.id === k)?.number ?? '';
    // Where each of ours played, inning by inning, for the batter column: the first position, then
    // each move with its inning, the way a scorer jots it ("SS → P (5)", "LF → Sit (4) → LF (6)").
    const lastInning = Math.max(1, stateOf(game).inning);
    const byInning = Array.from({ length: lastInning }, (_, i) => defenseFor(game, i + 1));
    const abbr = (p: (typeof byInning)[number][string] | undefined) => (p === undefined ? '' : p === 'sit' ? 'Sit' : p === 'EH' ? 'EH' : POSITION_ABBR[p]);
    const posOf = (k: string) => {
      const out: string[] = [];
      let prev = '';
      byInning.forEach((d, i) => {
        const now = abbr(d[k]);
        if (!now || now === prev) return;
        out.push(out.length ? `${now} (${i + 1})` : now);
        prev = now;
      });
      return out.join(' → ');
    };
    // Names the way a scorer writes them (Steve, Nov 17): first names by default, with initials on
    // ties across the whole roster (our page) or their lineup (theirs).
    const full = new Map<string, string>();
    if (this.side === 'us') for (const p of team.players) full.set(p.id, p.name);
    for (const r of page.rows) for (const k of r.players) full.set(k, name(k));
    const labels = bookNames(full, team.bookNames ?? 'first');
    const gridEl = drawGrid(page, (k) => labels.get(k) ?? name(k), number2, posOf, {
      box: (b) => this.gate(() => openEditPlay(app, game.id, b.event)),
      name: (id) =>
        this.gate(() => {
          const p = team.players.find((x) => x.id === id);
          if (p) openPlayerCard(app, p);
        }),
    });
    const note = page.untracked ? h('p', { class: 'sk-row-note' }, 'Their half-innings were kept as totals in Dugout Mode, so their page has no boxes for those innings.') : null;

    // Play-by-play.
    const lines = playByPlay(game, name);
    const recent = recentLines(lines);
    const showAll = h('button', { type: 'button', class: 'sk-key' }, 'Show All Plays');
    const watch = h('button', { type: 'button', class: 'sk-key bk-watch' }, 'Watch Replay');
    watch.addEventListener('click', () => openReplay(app, game));
    showAll.addEventListener('click', () => this.openAllPlays(game, lines));
    const pbp = h(
      'section',
      { class: 'sk-card bk-pbp', 'aria-labelledby': 'bk-pbp-title' },
      h('div', { class: 'bk-pbp-head' }, h('h2', { id: 'bk-pbp-title', class: 'sk-label' }, 'Play-by-Play'), lines.length ? watch : null),
      lines.length ? playList(recent, (l) => openEditPlay(app, game.id, l.event)) : h('p', { class: 'sk-row-note' }, 'No plays yet.'),
      lines.length > recent.length ? showAll : null,
    );

    // Page zoom fits every inning played: up to the inning being played, or the last with a box.
    const withBoxes = page.innings.filter((n) => page.rows.some((r) => (r.boxes.get(n) ?? []).length));
    const lastPlayed = (live ? page.current?.inning : undefined) ?? Math.max(1, ...withBoxes);
    const played = page.innings.filter((n) => n <= lastPlayed).reduce((t, n) => t + (page.widths.get(n) ?? 1), 0);
    gridEl.querySelector<HTMLElement>('.bk-grid')!.dataset.played = String(played);
    const float = h('div', { class: 'bk-float', hidden: true, 'aria-hidden': 'true' });

    this.el.replaceChildren(header, picker, this.board.el, h('div', { class: 'bk-which' }, which), h('section', { class: 'bk-page', 'aria-label': 'Book Page' }, gridEl, note), pbp, this.footer(game), float);
    const wrap = this.el.querySelector<HTMLElement>('.bk-grid-wrap');
    wrap?.addEventListener('scroll', () => this.syncFloat(), { passive: true });
    // Double-tap the grid: Normal ↔ Close-up, centered on the box tapped (Steve, Nov 21).
    wrap?.addEventListener(
      'click',
      (e) => {
        const now = performance.now();
        const near = Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 30;
        if (now - this.lastTap.t < 300 && near) {
          this.lastTap = { t: 0, x: 0, y: 0 };
          window.clearTimeout(this.pendingTap);
          e.stopPropagation();
          e.preventDefault();
          this.setZoom(this.zoom === 'closeup' ? 'normal' : 'closeup', e.target as HTMLElement);
          return;
        }
        this.lastTap = { t: now, x: e.clientX, y: e.clientY };
      },
      true,
    );
    // A live game shows the inning being played whenever the Book is opened or the inning changes,
    // however many columns batting around added before it (Steve, Nov 17); otherwise the page stays
    // where you scrolled it.
    const inning = live ? (page.current?.inning ?? null) : null;
    // Close-up follows the at-bat on every draw of a live game.
    const follow = live && this.zoom === 'closeup';
    const bringIn = live && (follow || opened || this.reveal || inning !== this.lastInning);
    // The batter's row comes into view the same way: when the Book opens or the batter changes.
    const slot = live ? (page.current?.slot ?? null) : null;
    const bringRow = visible && live && slot !== null && (follow || opened || this.reveal || slot !== this.lastSlot);
    this.reveal = false;
    this.lastInning = inning;
    this.lastSlot = slot;
    const layout = () => {
      sizeBatterColumn(this.el);
      sizeColumns(this.el, this.zoom);
      fitNames(this.el);
      if (follow) centerCurrent(this.el);
      else {
        if (wrap && bringIn) showCurrentInning(wrap);
        if (bringRow) showCurrentRow(this.el);
      }
      this.buildFloat();
    };
    if (wrap && scroll !== null && !bringIn) wrap.scrollLeft = scroll;
    layout();
    // The handwriting font changes every name's width once it's loaded: measure again.
    void document.fonts?.ready.then(() => {
      if (wrap?.isConnected) layout();
    });
  }

  private openAllPlays(game: SavedGame, lines: PlayLine[]): void {
    const app = this.app;
    const groups: HTMLElement[] = [];
    let key = '';
    let list: PlayLine[] = [];
    const flush = () => {
      if (!list.length) return;
      const l = list[0]!;
      groups.push(h('h3', { class: 'bk-half' }, `${l.half === 'top' ? 'Top' : 'Bottom'} of Inning ${l.inning}`), playList(list, (x) => {
        sheet.close();
        openEditPlay(app, game.id, x.event);
      }));
      list = [];
    };
    for (const l of lines) {
      const k = `${l.inning}${l.half}`;
      if (k !== key) {
        flush();
        key = k;
      }
      list.push(l);
    }
    flush();
    const sheet = openSheet({ title: 'All Plays', body: [h('div', { class: 'bk-all', tabindex: '0', role: 'region', 'aria-label': 'All Plays' }, ...groups)], cancel: false });
  }

  private footer(game: SavedGame): HTMLElement {
    const app = this.app;
    const team = app.team!;
    const name = (k: string) => app.playerName(k);
    const scorer = game.setup.mode === 'scorekeeper' ? (game.scorer || app.data.scorerName).trim() : '';
    const done = completeBook(game, name);
    const firsts = rarePlayFirsts(team.games);
    const times = gameTimes(game);
    const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const timeLine = times
      ? h(
          'p',
          { class: 'bk-times' },
          // Printed labels, with the times written in by hand (Steve, Nov 16).
          'First pitch ',
          h('span', { class: 'bk-hand' }, clock(times.start)),
          ...(times.end === null
            ? []
            : [' · Final ', h('span', { class: 'bk-hand' }, clock(times.end)), ' · ', h('span', { class: 'bk-hand' }, `${times.minutes} ${times.minutes === 1 ? 'minute' : 'minutes'}`)]),
        )
      : null;
    return h(
      'section',
      { class: 'sk-card bk-footer', 'aria-labelledby': 'bk-footer-title' },
      h('h2', { id: 'bk-footer-title', class: 'sk-label' }, 'Scorekeeper'),
      scorer ? h('p', { class: 'bk-signature' }, h('span', { class: 'bk-signature-label' }, 'Scored by '), h('span', { class: 'bk-hand' }, scorer)) : null,
      timeLine,
      done.complete
        ? h('p', { class: 'bk-stamp', role: 'img', 'aria-label': 'Complete Book: every batter scored and every ball placed.' }, 'Complete Book')
        : h('p', { class: 'sk-row-note bk-incomplete' }, `Not a Complete Book yet: ${done.why}`),
      h('h3', { class: 'bk-rare-title' }, 'Rare Plays'),
      h(
        'ul',
        { class: 'bk-rare' },
        ...RARE_PLAYS.map((r) => {
          const first = firsts.get(r.id);
          // A printed checklist: the ✓ and the date and place are written in by hand, only once it
          // happens (Steve, Nov 16); until then the line is blank, and VoiceOver reads what it is.
          return h(
            'li',
            { class: first ? 'bk-rare-done' : '' },
            h('span', { class: 'bk-check', 'aria-hidden': 'true' }, first ? '✓' : ''),
            h('span', { class: 'bk-rare-name' }, r.name),
            first
              ? h('span', { class: 'bk-rare-when' }, `${dayText(first.date)} · ${first.park.trim() || `vs ${first.opponent}`}`)
              : h('span', { class: 'bk-rare-blank', 'aria-hidden': 'true' }),
            h('span', { class: 'sk-visually-hidden' }, first ? ', done.' : `: ${r.about} Not yet.`),
          );
        }),
      ),
    );
  }
}

function playList(lines: readonly PlayLine[], edit: (l: PlayLine) => void): HTMLElement {
  return h(
    'ol',
    { class: 'bk-plays' },
    ...lines.map((l) => {
      if (!l.editable) return h('li', { class: 'bk-play' }, h('span', { class: 'bk-play-text' }, l.text));
      const b = h('button', { type: 'button', class: 'bk-play bk-play-edit', 'aria-label': `${l.text} Edit Play.` }, h('span', { class: 'bk-play-text' }, l.text), h('span', { class: 'bk-pencil', 'aria-hidden': 'true' }, '✎'));
      b.addEventListener('click', () => edit(l));
      return h('li', {}, b);
    }),
  );
}
