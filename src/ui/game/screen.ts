/*
 * The Game tab (SPEC §5): header, field scoreboard, scoring pad, and the
 * Undo / Lineups / Defense strip within thumb reach. Between games: No Game
 * in Progress and New Game.
 */
import type { App } from '../../app/app.ts';
import { battingTeamOf, boardView, finalText, ordinalWord, padView } from '../../app/view.ts';
import type { GameState } from '../../engine/replay.ts';
import { POSITION_ABBR, describePlay } from '../../engine/words.ts';
import { defenseFor, recordText, teamRecord } from '../../stats/index.ts';
import { announce } from '../announce.ts';
import { h, setDimmed, setText } from '../dom.ts';
import { icon } from '../icons.ts';
import { openBackup } from '../backup.ts';
import { openGameSettings, openSettings } from '../settings.ts';
import { openNewGame } from '../newgame.ts';
import { teamColor } from '../palette.ts';
import { openSheet } from '../sheet.ts';
import { Board } from './board.ts';
import { recordResult, runnerChoices } from './flows.ts';
import { Pad } from './pad.ts';

export class GameScreen {
  readonly el: HTMLElement;
  private readonly app: App;
  private readonly board: Board;
  private readonly pad: Pad;
  private readonly live: HTMLElement;
  private readonly idle: HTMLElement;
  private readonly idleTeam = h('p', { class: 'gm-idle-team' });
  private readonly restoreBtn: HTMLButtonElement;
  private readonly undoBtn: HTMLButtonElement;
  /** iPad only: the last four plays. */
  private readonly lastPlays = h('ol', { class: 'gm-last-list' });
  private seen: { id: string; plays: number; half: string; final: boolean } | null = null;

  constructor(app: App) {
    this.app = app;
    this.board = new Board((i) => void runnerChoices(app, i));
    this.pad = new Pad({
      result: (r) => void recordResult(app, r),
      pitch: (p) => app.addEvent({ t: 'pitch', pitch: p }),
      quick: (k) => app.addEvent({ t: 'quick', kind: k }),
      endHalf: () => app.addEvent({ t: 'endHalf' }),
      saveToSeason: () => this.saveToSeason(),
      anotherInning: () => app.addEvent({ t: 'extend' }),
    });

    const gear = h('button', { type: 'button', class: 'sk-pill gm-gear', 'aria-label': 'Settings' }, icon('gear'));
    gear.addEventListener('click', () => (app.game ? openGameSettings(app) : openSettings(app)));
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'ScoreKept'), gear);

    const stripKey = (name: 'undo' | 'lineup' | 'defense', label: string, fn: () => void) => {
      const b = h('button', { type: 'button', class: 'sk-key gm-strip-key' }, icon(name, 20), h('span', {}, label));
      b.addEventListener('click', fn);
      return b;
    };
    this.undoBtn = stripKey('undo', 'Undo', () => {
      if (this.undoBtn.getAttribute('aria-disabled') === 'true') return;
      app.undo();
    });
    const strip = h(
      'nav',
      { class: 'gm-strip', 'aria-label': 'Game Tools' },
      this.undoBtn,
      stripKey('lineup', 'Lineups', () => this.openLineups()),
      stripKey('defense', 'Defense', () => this.openDefense()),
    );

    const last = h('section', { class: 'gm-last sk-card', 'aria-labelledby': 'gm-last-title' }, h('h2', { id: 'gm-last-title', class: 'sk-label' }, 'Last Plays'), this.lastPlays);
    this.live = h('div', { class: 'gm-live' }, this.board.el, this.pad.el, strip, last);

    const newGame = h('button', { type: 'button', class: 'sk-key sk-primary gm-new' }, 'New Game');
    newGame.addEventListener('click', () => openNewGame(app));
    this.restoreBtn = h('button', { type: 'button', class: 'sk-key gm-restore' }, 'Restore from Backup');
    this.restoreBtn.addEventListener('click', () => openBackup(app));
    this.idle = h(
      'section',
      { class: 'gm-idle sk-card', 'aria-labelledby': 'gm-idle-title' },
      h('h2', { id: 'gm-idle-title', class: 'gm-idle-title' }, 'No Game in Progress'),
      this.idleTeam,
      newGame,
      this.restoreBtn,
    );

    this.el = h('div', { class: 'gm-screen' }, header, this.live, this.idle);
  }

  update(): void {
    const app = this.app;
    const team = app.team;
    const game = app.game;
    const s = app.state();
    if (!team || !game || !s) {
      this.live.hidden = true;
      this.idle.hidden = false;
      this.restoreBtn.hidden = app.data.teams.length > 0;
      if (team) {
        const season = team.seasons.find((x) => x.id === team.currentSeasonId);
        const games = team.games.filter((g) => g.saved && g.seasonId === team.currentSeasonId);
        setText(this.idleTeam, [team.name, season?.name, games.length ? recordText(teamRecord(games)) : ''].filter(Boolean).join(' · '));
      } else setText(this.idleTeam, 'Start a game, or bring in your team from a backup.');
      this.seen = null;
      return;
    }
    this.live.hidden = false;
    this.idle.hidden = true;
    const now = Date.now();
    this.board.update(boardView(team, game, s, now), teamColor(team.colors.primary));
    this.pad.update(padView(game, s), finalText(game, team, s).headline);
    setDimmed(this.undoBtn, game.events.length ? undefined : 'Nothing to undo');
    const name = (k: string) => app.playerName(k);
    const recent = s.plays.filter((p) => p.t === 'pa' || p.t === 'runner' || p.t === 'quick').slice(-4).reverse();
    this.lastPlays.replaceChildren(...recent.map((p) => h('li', {}, describePlay(p, name))));
    this.announceChanges(game.id, s);
  }

  /** Read new plays, side changes, and finals aloud (VoiceOver live region). */
  private announceChanges(id: string, s: GameState): void {
    const half = `${s.inning}${s.half}`;
    const prev = this.seen;
    this.seen = { id, plays: s.plays.length, half, final: !!s.final };
    if (!prev || prev.id !== id) return;
    if (s.plays.length < prev.plays) return announce('Undone.');
    const name = (k: string) => this.app.playerName(k);
    const lines = s.plays.slice(prev.plays).map((p) => describePlay(p, name)).filter(Boolean);
    if (s.final && !prev.final) lines.push(finalText(this.app.game!, this.app.team!, s).headline);
    else if (half !== prev.half) lines.push(`Side retired. ${s.half === 'top' ? 'Top' : 'Bottom'} of the ${ordinalWord(s.inning)}.`);
    if (lines.length) announce(lines.join(' '));
  }

  private saveToSeason(): void {
    const app = this.app;
    const game = app.game;
    const team = app.team;
    const s = app.state();
    if (!game || !team || !s) return;
    const text = finalText(game, team, s);
    const res = s.final?.winner === null ? 'T' : s.final?.winner === game.setup.us ? 'W' : 'L';
    app.saveToSeason();
    const backUp = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Back Up Now');
    const sheet = openSheet({
      title: 'Saved to Season',
      body: [
        h('p', { class: 'gm-saved-result' }, `${res} ${text.score} vs ${game.opponent}`),
        h('p', { class: 'sh-message' }, 'A backup keeps this season safe if anything happens to this iPhone.'),
        backUp,
      ],
      done: { label: 'Done', onClick: () => undefined },
      cancel: false,
    });
    backUp.addEventListener('click', () => {
      sheet.close();
      openBackup(app);
    });
  }

  private openLineups(): void {
    const app = this.app;
    const game = app.game;
    const s = app.state();
    if (!game || !s) return;
    const batting = battingTeamOf(game, s);
    const list = (team: 'us' | 'them') =>
      h(
        'ol',
        { class: 'sh-list' },
        ...s.lineups[team].map((slot, i) => {
          const up = batting === team && s.nextSlot[team] === i && !s.final;
          const nm = team === 'us' ? app.playerName(slot.player) : slot.player;
          return h('li', { class: up ? 'sh-current' : '' }, `${nm}${up ? ' · At Bat' : ''}`);
        }),
      );
    const parts: Node[] = [h('h3', { class: 'sk-label' }, app.team?.name ?? 'Us'), list('us')];
    if (s.mode === 'scorekeeper') parts.push(h('h3', { class: 'sk-label' }, game.opponent), list('them'));
    openSheet({ title: 'Lineups', body: parts, done: { label: 'Done', onClick: () => undefined }, cancel: false });
  }

  private openDefense(): void {
    const app = this.app;
    const game = app.game;
    const s = app.state();
    if (!game || !s) return;
    const card = defenseFor(game, s.inning);
    const rows = Object.entries(card)
      .filter(([, pos]) => typeof pos === 'number')
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .map(([p, pos]) => h('li', {}, `${POSITION_ABBR[pos as 1]} · ${app.playerName(p)}`));
    const sitting = Object.entries(card)
      .filter(([, pos]) => pos === 'sit')
      .map(([p]) => app.playerName(p));
    openSheet({
      title: `Defense, ${ordinalWord(s.inning).replace(/^./, (c) => c.toUpperCase())} Inning`,
      body: [
        h('ul', { class: 'sh-list' }, ...rows),
        sitting.length ? h('p', { class: 'sh-message' }, `Sitting: ${sitting.join(', ')}`) : document.createTextNode(''),
      ],
      done: { label: 'Done', onClick: () => undefined },
      cancel: false,
    });
  }
}
