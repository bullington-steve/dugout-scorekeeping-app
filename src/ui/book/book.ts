/*
 * The Book tab (SPEC §6): the hand-hung board, the scorebook page for either
 * team in Steve's handwriting, the play-by-play, and the scorekeeper's
 * footer (signature, Complete Book, Rare Plays). Draws only while showing.
 */
import { openShare } from '../share/share.ts';
import { openReplay } from './replay.ts';
import type { App } from '../../app/app.ts';
import { bookPage, completeBook, gameTimes, playByPlay, rarePlayFirsts, RARE_PLAYS, recentLines, type PlayLine } from '../../app/book.ts';
import { stateOf, resultFor } from '../../stats/games.ts';
import type { SavedGame } from '../../store/model.ts';
import { segmented } from '../controls.ts';
import { h } from '../dom.ts';
import { choose, openSheet } from '../sheet.ts';
import { openPlayerCard } from '../stats/playercard.ts';
import { dayText } from '../when.ts';
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

/** "Sat, Oct 17 vs Lakeside Lightning · W 12–7", for the game menu. */
export function gameLabel(g: SavedGame): string {
  const s = stateOf(g);
  const us = s.score[g.setup.us];
  const them = s.score[g.setup.us === 'away' ? 'home' : 'away'];
  const result = resultFor(g);
  const tail = !g.saved && !s.final ? 'In Progress' : `${result ?? ''} ${us}–${them}`.trim();
  return `${dayText(g.date)} ${g.setup.us === 'away' ? 'at' : 'vs'} ${g.opponent} · ${tail}`;
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
    const ink = h('button', { type: 'button', class: 'sk-pill bk-ink', 'aria-label': `Book Ink: ${INK_NAMES[app.data.prefs.bookInk ?? 'pencil']}` }, `✎ ${INK_NAMES[app.data.prefs.bookInk ?? 'pencil']}`);
    ink.addEventListener('click', () => void pickInk(app));
    const share = h('button', { type: 'button', class: 'sk-pill bk-share', hidden: !game }, 'Share');
    share.addEventListener('click', () => game && openShare(app, game));
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'Book'), h('div', { class: 'bk-head-keys' }, share, ink));
    if (!team || !game) {
      this.el.replaceChildren(header, h('section', { class: 'sk-card sk-soon' }, h('p', {}, 'No games yet. Start one on the Game tab, and the Book fills in as you score.')));
      return;
    }
    if (game.id !== this.shownId) {
      this.shownId = game.id;
      this.side = 'us';
    }
    const grid = this.el.querySelector('.bk-grid-wrap');
    const scroll = grid ? grid.scrollLeft : null;

    // The game menu.
    const games = [...team.games].sort((a, b) => b.date.localeCompare(a.date) || (b.setup.startedAt ?? 0) - (a.setup.startedAt ?? 0));
    const menu = h('select', { id: 'bk-game', class: 'sk-input' }, ...games.map((g) => h('option', { value: g.id, selected: g.id === game.id }, gameLabel(g))));
    menu.addEventListener('change', () => app.view(menu.value === team.currentGameId ? null : menu.value));
    const picker = h('div', { class: 'sk-field bk-picker' }, h('label', { for: 'bk-game', class: 'sk-field-label' }, 'Game'), menu);

    // The board.
    const live = team.currentGameId === game.id;
    this.board = new BookBoard({ addInning: live ? () => app.addEvent({ t: 'extend' }) : null });
    const s = stateOf(game);
    const battingUs = (s.half === 'top') === (game.setup.us === 'away');
    const due = s.lineups[battingUs ? 'us' : 'them'][s.nextSlot[battingUs ? 'us' : 'them']];
    const number = battingUs ? (team.players.find((p) => p.id === due?.player)?.number ?? '') : String(s.nextSlot.them + 1);
    this.board.update(team, game, number);

    // Which team's page.
    const away = game.setup.us === 'away' ? { value: 'us' as const, label: team.abbr } : { value: 'them' as const, label: game.opponentAbbr };
    const home = game.setup.us === 'home' ? { value: 'us' as const, label: team.abbr } : { value: 'them' as const, label: game.opponentAbbr };
    const which = segmented('Book Page', [away, home], this.side, (v) => {
      this.side = v;
      this.update(true);
    });
    const page = bookPage(game, this.side);
    const name = (k: string) => app.playerName(k);
    const number2 = (k: string) => team.players.find((p) => p.id === k)?.number ?? '';
    const gridEl = drawGrid(page, name, number2, {
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
    if (scroll !== null) {
      const again = this.el.querySelector('.bk-grid-wrap');
      if (again) again.scrollLeft = scroll;
    }
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
    const sheet = openSheet({ title: 'All Plays', body: [h('div', { class: 'bk-all', tabindex: '0', role: 'region', 'aria-label': 'All Plays' }, ...groups)], cancel: false, done: { label: 'Done', onClick: () => undefined } });
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
          times.end === null
            ? `First pitch ${clock(times.start)}`
            : `First pitch ${clock(times.start)} · Final ${clock(times.end)} · ${times.minutes} ${times.minutes === 1 ? 'minute' : 'minutes'}`,
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
          return h(
            'li',
            { class: first ? 'bk-rare-done' : '' },
            h('span', { class: 'bk-check', 'aria-hidden': 'true' }, first ? '✓' : ''),
            h('span', { class: 'bk-rare-name' }, r.name),
            h('span', { class: 'bk-rare-when' }, first ? `${dayText(first.date)} vs ${first.opponent}` : r.about),
            h('span', { class: 'sk-visually-hidden' }, first ? ', done.' : ', not yet.'),
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
