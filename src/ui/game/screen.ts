/*
 * The Game tab (SPEC §5): header, field scoreboard, scoring pad, and the
 * Undo / Lineups / Defense strip within thumb reach. Between games: No Game
 * in Progress and New Game.
 */
import type { App } from '../../app/app.ts';
import { battingTeamOf, boardView, clockText, finalText, ordinalWord, padView } from '../../app/view.ts';
import type { GameState } from '../../engine/replay.ts';
import { describePlay } from '../../engine/words.ts';
import { recordText, teamRecord } from '../../stats/index.ts';
import { announce } from '../announce.ts';
import { h, setDimmed, setText } from '../dom.ts';
import { icon } from '../icons.ts';
import { openBackup } from '../backup.ts';
import { openGameSettings, openSettings } from '../settings.ts';
import { openNewGame } from '../newgame.ts';
import { loadSample } from '../sample.ts';
import { teamColor } from '../palette.ts';
import { choose, openSheet } from '../sheet.ts';
import { textField } from '../controls.ts';
import { openPlayerEditor } from '../team/player.ts';
import { whenText } from '../when.ts';
import { Board } from './board.ts';
import { recordResult, runnerChoices } from './flows.ts';
import { Pad } from './pad.ts';
import { audioPrefs } from '../../sound/settings.ts';
import { openOrgan } from '../sound/organ.ts';
import { fadeAll, nowPlaying, onPlaying, playWalkup } from '../sound/player.ts';
import { dueUp } from '../../sound/director.ts';
import { openShare, pollPosted, whoIsIn } from '../share/share.ts';
import { inSafariTab, markSeen, seen } from '../platform.ts';
import { openHomeScreenGuide } from '../welcome/homescreen.ts';
import { openDefenseCard } from './defensecard.ts';

export class GameScreen {
  readonly el: HTMLElement;
  private readonly app: App;
  private readonly board: Board;
  private readonly pad: Pad;
  private readonly live: HTMLElement;
  private readonly idle: HTMLElement;
  private readonly idleTeam = h('p', { class: 'gm-idle-team' });
  private readonly restoreBtn: HTMLButtonElement;
  private readonly sampleBtn: HTMLButtonElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly soundBtn = h('button', { type: 'button', class: 'sk-pill gm-sound', 'aria-pressed': 'true', 'aria-label': 'Sound' });
  private soundShown: boolean | null = null;
  /** Between games: the next scheduled game. */
  private readonly upNext = h('section', { class: 'gm-upnext sk-card', 'aria-label': 'Up Next', hidden: true });
  /** iPad only: the last four plays. */
  private readonly lastPlays = h('ol', { class: 'gm-last-list' });
  private seen: { id: string; plays: number; half: string; final: boolean } | null = null;

  constructor(app: App) {
    this.app = app;
    this.board = new Board((i) => void runnerChoices(app, i));
    this.board.walkup.addEventListener('click', () => {
      const g = app.game;
      const s = app.state();
      const batter = g && s ? dueUp(g, s) : null;
      if (!batter) return;
      if (nowPlaying() === `walkup:${batter}`) fadeAll(200);
      else {
        fadeAll(100);
        void playWalkup(app, batter);
      }
    });
    onPlaying(() => this.syncWalkup());
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
    const organBtn = h('button', { type: 'button', class: 'sk-pill gm-organ', 'aria-label': 'Organ' }, icon('organ'));
    organBtn.addEventListener('click', () => openOrgan(app));
    this.soundBtn.addEventListener('click', () => {
      const on = !audioPrefs(app.data).on;
      if (!on) fadeAll(200);
      app.commit((d) => (d.prefs.sound = on));
      announce(on ? 'Sound on' : 'Sound off');
    });
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'ScoreKept'), h('div', { class: 'gm-head-keys' }, organBtn, this.soundBtn, gear));

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
    this.sampleBtn = h('button', { type: 'button', class: 'sk-key gm-sample' }, 'Look Around with Sample Data');
    this.sampleBtn.addEventListener('click', () => void loadSample(app));
    this.idle = h(
      'section',
      { class: 'gm-idle sk-card', 'aria-labelledby': 'gm-idle-title' },
      h('h2', { id: 'gm-idle-title', class: 'gm-idle-title' }, 'No Game in Progress'),
      this.idleTeam,
      newGame,
      this.restoreBtn,
      this.sampleBtn,
    );

    this.el = h('div', { class: 'gm-screen' }, header, this.live, this.upNext, this.idle);
  }

  private syncWalkup(): void {
    const g = this.app.game;
    const s = this.app.state();
    const batter = g && s ? dueUp(g, s) : null;
    this.board.setWalkup(!!batter, !!batter && nowPlaying() === `walkup:${batter}`);
  }

  update(): void {
    this.syncWalkup();
    const on = audioPrefs(this.app.data).on;
    if (on !== this.soundShown) {
      this.soundShown = on;
      this.soundBtn.replaceChildren(icon(on ? 'speaker' : 'speakerOff'));
      this.soundBtn.setAttribute('aria-pressed', String(on));
    }
    const app = this.app;
    const team = app.team;
    const game = app.game;
    const s = app.state();
    if (!team || !game || !s) {
      this.live.hidden = true;
      this.idle.hidden = false;
      const next = app.upNext();
      this.upNext.hidden = !next;
      if (next) {
        const start = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Start This Game');
        start.addEventListener('click', () => openNewGame(app, { schedule: next }));
        const posted = pollPosted(next.id);
        const poll = h('button', { type: 'button', class: 'sk-key' }, posted ? '✓ Poll Posted' : 'Who’s In? Poll');
        const pollNote = h('p', { class: 'sk-row-note', role: 'status' });
        poll.addEventListener('click', () =>
          void whoIsIn(next, (msg) => {
            if (msg === '✓ Poll Posted') poll.textContent = msg;
            else pollNote.textContent = msg;
          }),
        );
        this.upNext.replaceChildren(
          h('h2', { class: 'sk-label' }, 'Up Next'),
          h('p', { class: 'gm-upnext-when' }, whenText(next.date, next.time)),
          h('p', { class: 'gm-upnext-who' }, `vs ${next.opponent}`),
          next.park ? h('p', { class: 'gm-upnext-park' }, next.park) : document.createTextNode(''),
          h('div', { class: 'gm-upnext-keys' }, start, poll),
          pollNote,
        );
      }
      this.restoreBtn.hidden = app.data.teams.length > 0;
      this.sampleBtn.hidden = !app.isEmpty;
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
    this.upNext.hidden = true;
    const now = Date.now();
    this.board.update(boardView(team, game, s, now), teamColor(team.colors.primary));
    this.pad.update(padView(game, s), finalText(game, team, s).headline);
    setDimmed(this.undoBtn, game.events.length ? undefined : 'Nothing to undo');
    const name = (k: string) => app.playerName(k);
    const recent = s.plays.filter((p) => p.t === 'pa' || p.t === 'runner' || p.t === 'quick').slice(-4).reverse();
    this.lastPlays.replaceChildren(...recent.map((p) => h('li', {}, describePlay(p, name))));
    this.announceChanges(game.id, s);
  }

  /** Once a second: the clock's bulbs only. When the minute rolls over, the whole board (LAST can arrive). */
  tick(): void {
    const game = this.app.game;
    if (!game || this.live.hidden) return;
    const now = Date.now();
    const s = this.app.state(now);
    if (!s) return;
    const time = clockText(game, s, now);
    if (time === 'LAST' && this.lastClock !== 'LAST') this.update();
    else this.board.setClock(time);
    this.lastClock = time;
  }

  private lastClock: string | null = null;

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
    const share = h('button', { type: 'button', class: 'sk-key' }, 'Share Recap');
    share.addEventListener('click', () => {
      sheet.close();
      openShare(app, game);
    });
    const sheet = openSheet({
      title: 'Saved to Season',
      body: [
        h('p', { class: 'gm-saved-result' }, `${res} ${text.score} vs ${game.opponent}`),
        h('p', { class: 'sh-message' }, 'A backup keeps this season safe if anything happens to this iPhone.'),
        backUp,
        share,
      ],
      done: { label: 'Done', onClick: () => undefined },
      cancel: false,
      onClose: () => safariReminder(app),
    });
    backUp.addEventListener('click', () => {
      sheet.close();
      openBackup(app);
    });
  }

  /**
   * Lineups mid-game (SPEC §4): sub slot by slot (recorded as a
   * substitution), late arrivals to the bottom of the order, + New Player
   * onto the bench. The order itself can't be dragged mid-game.
   */
  private openLineups(): void {
    const app = this.app;
    const game = app.game;
    const team = app.team;
    const s = app.state();
    if (!game || !team || !s) return;
    const batting = battingTeamOf(game, s);
    const inOrder = new Set(s.lineups.us.map((x) => x.player));
    const bench = () => team.players.filter((p) => !inOrder.has(p.id) && (game.present?.includes(p.id) || p.reserve !== true));
    const pickFromBench = async (title: string): Promise<string | null> => {
      const choice = await choose(title, [
        ...bench().map((p) => ({ label: p.name, value: p.id })),
        { label: '+ New Player', value: '__new__', kind: 'primary' as const },
      ]);
      if (choice !== '__new__') return choice;
      const p = await openPlayerEditor(app);
      if (!p) return null;
      app.updateGame((g) => (g.present = [...(g.present ?? []), p.id]));
      return p.id;
    };
    const ours = h(
      'ol',
      { class: 'sh-list ln-list' },
      ...s.lineups.us.map((slot, i) => {
        const up = batting === 'us' && s.nextSlot.us === i && !s.final;
        const sub = h('button', { type: 'button', class: 'sk-key ln-sub', 'aria-label': `Substitute for ${app.playerName(slot.player)}` }, 'Sub');
        sub.addEventListener('click', async () => {
          const who = await pickFromBench(`Sub for ${app.playerName(slot.player)}`);
          if (!who) return;
          app.addEvent({ t: 'sub', team: 'us', slot: i, player: who });
          sheet.close();
          this.openLineups();
        });
        return h('li', { class: `ln-row${up ? ' sh-current' : ''}` }, h('span', {}, `${app.playerName(slot.player)}${up ? ' \u00b7 At Bat' : ''}`), sub);
      }),
    );
    const late = h('button', { type: 'button', class: 'sk-key' }, 'Add a Late Arrival');
    late.addEventListener('click', async () => {
      const who = await pickFromBench('Late Arrival');
      if (!who) return;
      app.addEvent({ t: 'addSlot', team: 'us', player: who });
      sheet.close();
      this.openLineups();
    });
    const benchNames = bench().map((p) => p.name);
    const parts: Node[] = [
      h('h3', { class: 'sk-label' }, team.name),
      ours,
      h('p', { class: 'sk-row-note' }, benchNames.length ? `Bench: ${benchNames.join(', ')}.` : 'Nobody on the bench.'),
      late,
      h('p', { class: 'sk-row-note' }, 'Late arrivals bat at the bottom of the order. A sub bats in the replaced player’s spot.'),
    ];
    if (s.mode === 'scorekeeper') {
      let name = '';
      const add = h('button', { type: 'button', class: 'sk-key' }, 'Add a Batter');
      add.addEventListener('click', () => {
        if (!name.trim()) return;
        app.addEvent({ t: 'addSlot', team: 'them', player: name.trim() });
        sheet.close();
        this.openLineups();
      });
      parts.push(
        h('h3', { class: 'sk-label' }, game.opponent),
        h('ol', { class: 'sh-list' }, ...s.lineups.them.map((x, i) => h('li', { class: batting === 'them' && s.nextSlot.them === i ? 'sh-current' : '' }, x.player))),
        textField('Batter’s Name', '', (v) => (name = v), { autocapitalize: 'words' }),
        add,
      );
    }
    const sheet = openSheet({ title: 'Lineups', full: true, body: parts, done: { label: 'Done', onClick: () => undefined }, cancel: false });
  }

  private openDefense(): void {
    if (this.app.game) openDefenseCard(this.app);
  }
}

/**
 * Once, after the first real Save to Season in a Safari tab on iPhone or iPad
 * (SPEC §16, LESSONS 2): Safari can clear a website's data after about a week
 * without a visit, and a Home Screen app is kept.
 */
function safariReminder(app: App): void {
  if (!inSafariTab() || app.data.sample || seen('safari-reminder')) return;
  markSeen('safari-reminder');
  const how = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Show Me How');
  const sheet = openSheet({
    title: 'Keep This Season Safe',
    body: [
      h('p', { class: 'sh-message' }, 'This season lives in Safari, which can clear it after about a week without a visit. On your Home Screen, ScoreKept keeps it. Save a backup first, then add ScoreKept to your Home Screen and restore it there.'),
      how,
    ],
    cancel: 'No Thanks',
  });
  how.addEventListener('click', () => {
    sheet.close();
    openHomeScreenGuide();
  });
}
