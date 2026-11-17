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
import { h } from '../dom.ts';
import { icon } from '../icons.ts';
import { choose, openSheet } from '../sheet.ts';
import { openPlayerCard } from '../stats/playercard.ts';
import { dayText, shortDayText } from '../when.ts';
import { BookBoard } from './board.ts';
import { openEditPlay } from './editplay.ts';
import { drawGrid } from './grid.ts';

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
  // Names never under 12 points (30 × 0.4), the jersey line never under 12 (15 × 0.8).
  root.querySelectorAll<HTMLElement>('.bk-grid .bk-name:not(.bk-name-before)').forEach((el) => fit(el, 0.4));
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

export class BookScreen {
  readonly el = h('div', { class: 'bk-screen' });
  private readonly app: App;
  private side: 'us' | 'them' = 'us';
  private shownId: string | null = null;
  private board: BookBoard | null = null;

  constructor(app: App) {
    this.app = app;
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
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-screen-title sk-header-title' }, 'Book'), h('div', { class: 'bk-head-keys' }, share, ink));
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
    const picker = h('div', { class: 'sk-field bk-picker' }, h('label', { for: 'bk-game', class: 'sk-field-label' }, 'Game'), h('div', { class: 'bk-picker-box' }, face, menu));

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
      box: (b) => openEditPlay(app, game.id, b.event),
      name: (id) => {
        const p = team.players.find((x) => x.id === id);
        if (p) openPlayerCard(app, p);
      },
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

    this.el.replaceChildren(header, picker, this.board.el, h('div', { class: 'bk-which' }, which), h('section', { class: 'bk-page', 'aria-label': 'Book Page' }, gridEl, note), pbp, this.footer(game));
    const wrap = this.el.querySelector<HTMLElement>('.bk-grid-wrap');
    if (wrap && scroll !== null && !opened) wrap.scrollLeft = scroll;
    else if (wrap && live) {
      // A live game opens with the inning being played fully in view, keeping as many earlier
      // innings beside it as fit (Steve, Nov 16: in the 4th at 375 points, innings 1 to 4).
      const now = wrap.querySelector<HTMLElement>('thead th.bk-current');
      const pinned = wrap.querySelector<HTMLElement>('thead .bk-batter');
      if (now && pinned) {
        // Snap to an inning's edge, so no sliver of a half-hidden inning peeks out beside the names.
        const edge = pinned.offsetLeft + pinned.offsetWidth;
        const need = now.offsetLeft + now.offsetWidth - wrap.clientWidth + 2;
        const stops = [...wrap.querySelectorAll<HTMLElement>('thead th.bk-inning')].map((th) => th.offsetLeft - edge).filter((x) => x <= now.offsetLeft - edge);
        const fit = stops.filter((x) => x >= need);
        wrap.scrollLeft = Math.max(0, need <= 0 ? 0 : Math.min(...(fit.length ? fit : [now.offsetLeft - edge])));
      }
    }
    fitNames(this.el);
    void document.fonts?.ready.then(() => fitNames(this.el));
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
