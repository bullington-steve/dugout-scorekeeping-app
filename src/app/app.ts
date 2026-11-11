/*
 * The app's state and every change to it. Screens read from here and call
 * these methods; each change saves right away and tells the screens to
 * update. No DOM here, so it can be tested on its own.
 */
import { replay, type GameState } from '../engine/replay.ts';
import { cloneRules, matchRuleSet, type Rules } from '../engine/rules.ts';
import type { GameEvent, LineupPos, Slot } from '../engine/types.ts';
import { emptyData, newId, newTeam, type AppData, type Player, type SavedGame, type ScheduledGame, type Season, type Team } from '../store/model.ts';
import type { LoadResult, SaveResult, Store } from '../store/storage.ts';

export type Listener = () => void;

export interface NewGameOptions {
  opponent: string;
  opponentAbbr?: string;
  /** Their batting order (Scorekeeper Mode), one name per row. */
  theirOrder?: string[];
  ruleSetId?: string;
  date?: string;
  scheduleId?: string;
  us: 'home' | 'away';
  mode: 'dugout' | 'scorekeeper';
  rules: Rules;
  count: boolean;
  hitLocation: boolean;
  lineup: Slot[];
  present: string[];
  park?: string;
}

export class App {
  data: AppData;
  load: LoadResult;
  /** The last save that failed, until one succeeds. */
  saveProblem: Extract<SaveResult, { ok: false }> | null = null;
  private readonly store: Store;
  private readonly listeners = new Set<Listener>();
  private readonly now: () => number;
  private version = 0;
  private cache: { key: string; state: GameState } | null = null;

  constructor(store: Store, now: () => number = () => Date.now()) {
    this.store = store;
    this.now = now;
    this.load = store.load();
    this.data = this.load.data;
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  /** Change the data, save it, and update the screens. */
  commit(change: (d: AppData) => void): SaveResult {
    change(this.data);
    this.version += 1;
    const result = this.store.save(this.data);
    this.saveProblem = result.ok ? null : result;
    this.emit();
    return result;
  }

  get readOnly(): boolean {
    return this.store.isReadOnly;
  }

  // ---- what's on screen ----------------------------------------------------------------

  get team(): Team | null {
    const d = this.data;
    return d.teams.find((t) => t.id === d.activeTeamId) ?? d.teams[0] ?? null;
  }

  get game(): SavedGame | null {
    const t = this.team;
    if (!t || !t.currentGameId) return null;
    return t.games.find((g) => g.id === t.currentGameId) ?? null;
  }

  /** The current game's state, replayed (cached until something changes). */
  state(now: number = this.now()): GameState | null {
    const g = this.game;
    if (!g) return null;
    // The clock matters between taps, so the minute is part of the key.
    const key = `${this.version}:${g.id}:${Math.floor(now / 15_000)}`;
    if (this.cache?.key !== key) this.cache = { key, state: replay(g, { now }) };
    return this.cache.state;
  }

  playerName(id: string): string {
    return this.team?.players.find((p) => p.id === id)?.name ?? id;
  }

  // ---- scoring ------------------------------------------------------------------------------

  addEvent(ev: GameEvent): SaveResult | null {
    const g = this.game;
    if (!g) return null;
    return this.commit(() => {
      g.events.push({ ...ev, at: this.now() } as GameEvent);
    });
  }

  undo(): SaveResult | null {
    const g = this.game;
    if (!g || g.events.length === 0) return null;
    return this.commit(() => {
      g.events.pop();
    });
  }

  /** Change this game's settings (mode, count, hit location). */
  updateGame(change: (g: SavedGame) => void): SaveResult | null {
    const g = this.game;
    if (!g) return null;
    return this.commit(() => change(g));
  }

  /** Dugout and Scorekeeper Mode can switch mid-game: the switch is a play of its own. */
  setMode(mode: 'dugout' | 'scorekeeper'): SaveResult | null {
    const g = this.game;
    const s = this.state();
    if (!g || !s || s.mode === mode) return null;
    if (g.events.length === 0) return this.updateGame((x) => (x.setup.mode = mode));
    return this.addEvent({ t: 'mode', mode });
  }

  /**
   * Save to Season. When time ran out between innings, record that, so the
   * saved result never depends on the time it's opened (SPEC §3).
   */
  saveToSeason(): SaveResult | null {
    const g = this.game;
    const t = this.team;
    const s = this.state();
    if (!g || !t || !s?.final) return null;
    const ended = replay(g);
    return this.commit(() => {
      if (!ended.final && s.final?.reason === 'time') g.events.push({ t: 'end', reason: 'time', at: this.now() });
      g.saved = true;
      t.currentGameId = null;
    });
  }

  deleteCurrentGame(): SaveResult | null {
    const g = this.game;
    const t = this.team;
    if (!g || !t) return null;
    return this.commit(() => {
      t.games = t.games.filter((x) => x.id !== g.id);
      t.currentGameId = null;
    });
  }

  // ---- teams and games -----------------------------------------------------------------------

  /** A team to put a game on: the active one, or a new one with ten fill-in players. */
  ensureTeam(): Team {
    const existing = this.team;
    if (existing) return existing;
    const team = newTeam(newId(), 'My Team');
    team.abbr = 'US';
    this.commit((d) => {
      d.teams.push(team);
      d.activeTeamId = team.id;
    });
    return team;
  }

  startGame(opts: NewGameOptions): SavedGame {
    const team = this.ensureTeam();
    const now = this.now();
    const date = localDate(now);
    const season = seasonFor(team, date);
    const opponent = opts.opponent.trim() || 'Opponent';
    const game: SavedGame = {
      id: newId(),
      setup: {
        us: opts.us,
        mode: opts.mode,
        rules: cloneRules(opts.rules),
        count: opts.count,
        hitLocation: opts.hitLocation,
        startedAt: now,
        lineups: { us: opts.lineup, them: (opts.theirOrder ?? []).map((player) => ({ player })) },
      },
      events: [],
      present: opts.present,
      seasonId: season.id,
      date: opts.date ?? date,
      opponent,
      opponentAbbr: (opts.opponentAbbr || defaultShortName(opponent)).slice(0, 5).toUpperCase(),
      park: opts.park ?? '',
      saved: false,
      ruleSetId: opts.ruleSetId ?? matchRuleSet(opts.rules, this.data.ruleSets),
      ...(opts.scheduleId ? { scheduleId: opts.scheduleId } : {}),
    };
    this.commit((d) => {
      if (game.park) d.parks = [game.park, ...d.parks.filter((p) => p !== game.park)];
      if (opts.scheduleId) {
        const entry = team.schedule.find((x) => x.id === opts.scheduleId);
        if (entry) entry.gameId = game.id;
      }
      if (!team.seasons.some((x) => x.id === season.id)) team.seasons.push(season);
      team.currentSeasonId = season.id;
      team.games.push(game);
      team.currentGameId = game.id;
    });
    return game;
  }

  // ---- teams, players, seasons, schedule ------------------------------------------------

  updateTeam(change: (t: Team) => void): SaveResult | null {
    const t = this.team;
    if (!t) return null;
    return this.commit(() => change(t));
  }

  addTeam(name: string): Team {
    const team = newTeam(newId(), name.trim() || 'New Team');
    this.commit((d) => {
      d.teams.push(team);
      d.activeTeamId = team.id;
    });
    return team;
  }

  switchTeam(id: string): void {
    this.commit((d) => {
      if (d.teams.some((t) => t.id === id)) d.activeTeamId = id;
    });
  }

  /** Add or update a player (by id). */
  savePlayer(player: Player): void {
    const team = this.ensureTeam();
    this.commit(() => {
      const i = team.players.findIndex((p) => p.id === player.id);
      if (i >= 0) team.players[i] = player;
      else team.players.push(player);
    });
  }

  /** Remove a player from the roster. Their saved games keep their plays. */
  deletePlayer(id: string): void {
    this.updateTeam((t) => {
      t.players = t.players.filter((p) => p.id !== id);
    });
  }

  /** New Season: refused mid-game or when that season already exists. */
  newSeason(name: string): { ok: true; season: Season } | { ok: false; why: 'mid-game' | 'exists' } {
    const team = this.ensureTeam();
    if (team.currentGameId) return { ok: false, why: 'mid-game' };
    if (team.seasons.some((s) => s.name === name)) return { ok: false, why: 'exists' };
    const season: Season = { id: newId(), name, start: localDate(this.now()) };
    this.commit(() => {
      team.seasons.push(season);
      team.currentSeasonId = season.id;
    });
    return { ok: true, season };
  }

  setSeason(id: string): void {
    this.updateTeam((t) => {
      if (t.seasons.some((s) => s.id === id)) t.currentSeasonId = id;
    });
  }

  /** Add or update a schedule entry. */
  saveScheduled(entry: ScheduledGame): void {
    this.updateTeam((t) => {
      const i = t.schedule.findIndex((x) => x.id === entry.id);
      if (i >= 0) t.schedule[i] = entry;
      else t.schedule.push(entry);
      t.schedule.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    });
  }

  deleteScheduled(id: string): void {
    this.updateTeam((t) => {
      t.schedule = t.schedule.filter((x) => x.id !== id);
    });
  }

  deletePark(name: string): void {
    this.commit((d) => {
      d.parks = d.parks.filter((p) => p !== name);
    });
  }

  /** The next scheduled game that hasn't been played (Up Next). */
  upNext(): ScheduledGame | null {
    const t = this.team;
    if (!t) return null;
    const today = localDate(this.now());
    return t.schedule.find((x) => x.date >= today && !t.games.some((g) => g.id === x.gameId && g.saved)) ?? null;
  }

  /** The most recent saved game (for Same as Last Game), optionally against one opponent. */
  lastGame(opponent?: string): SavedGame | null {
    const t = this.team;
    if (!t) return null;
    const games = t.games.filter((g) => g.saved && (!opponent || g.opponent.toLowerCase() === opponent.trim().toLowerCase()));
    return games.sort((a, b) => b.date.localeCompare(a.date))[games.length ? 0 : 0] ?? null;
  }

  // ---- any game, saved or in progress (Book, Stats) ------------------------------------------

  /** The game the Book shows when it isn't the one in progress (View from Stats). Not saved. */
  viewingId: string | null = null;

  findGame(id: string | null | undefined): SavedGame | null {
    if (!id) return null;
    for (const t of this.data.teams) {
      const g = t.games.find((x) => x.id === id);
      if (g) return g;
    }
    return null;
  }

  /** The game the Book opens to: the one being viewed, else the game in progress, else the latest saved. */
  get bookGame(): SavedGame | null {
    const t = this.team;
    if (!t) return null;
    const viewing = t.games.find((g) => g.id === this.viewingId);
    if (viewing) return viewing;
    if (this.game) return this.game;
    return [...t.games].sort((a, b) => b.date.localeCompare(a.date) || (b.setup.startedAt ?? 0) - (a.setup.startedAt ?? 0))[0] ?? null;
  }

  view(id: string | null): void {
    this.viewingId = id;
    this.emit();
  }

  /** Edit Play and friends on any game; saved games re-score and stats follow. */
  editGame(id: string, change: (g: SavedGame) => void): SaveResult | null {
    const g = this.findGame(id);
    if (!g) return null;
    return this.commit(() => change(g));
  }

  /** Delete a game from the season (quiet button, confirmed). */
  deleteGame(id: string): void {
    this.updateTeam((t) => {
      t.games = t.games.filter((g) => g.id !== id);
      if (t.currentGameId === id) t.currentGameId = null;
      for (const x of t.schedule) if (x.gameId === id) delete x.gameId;
    });
    if (this.viewingId === id) this.viewingId = null;
  }

  /** Resume a game that was never saved to the season. */
  resumeGame(id: string): void {
    this.updateTeam((t) => {
      const g = t.games.find((x) => x.id === id);
      if (g && !g.saved) t.currentGameId = id;
    });
  }

  /** Look Around with Sample Data: only on a device with nothing of its own yet. */
  loadSample(team: Team): boolean {
    if (!this.isEmpty) return false;
    this.commit((d) => {
      d.teams = [team];
      d.activeTeamId = team.id;
      d.sample = true;
      d.parks = [...new Set(team.games.map((g) => g.park).filter(Boolean))];
    });
    return true;
  }

  /** Clear Sample Data: back to a fresh start, keeping New Game defaults and saved rule sets. */
  clearSample(): void {
    this.commit((d) => {
      const keep = { defaults: d.defaults, ruleSets: d.ruleSets, prefs: d.prefs, scorerName: d.scorerName, lastBackup: d.lastBackup };
      Object.assign(d, emptyData(), keep);
    });
  }

  /** Nothing saved yet: no players, no games, no schedule. */
  get isEmpty(): boolean {
    return this.data.teams.every((t) => !t.players.length && !t.games.length && !t.schedule.length);
  }

  /** Restore from Backup: replace everything. */
  replaceData(data: AppData): SaveResult {
    return this.commit((d) => {
      Object.assign(d, emptyData(), data);
    });
  }

  markBackedUp(): void {
    this.commit((d) => {
      d.lastBackup = this.now();
    });
  }
}

/** A lineup from the roster: everyone here, in roster order, each at their first free position. */
export function quickLineup(players: readonly Player[], here: ReadonlySet<string>): Slot[] {
  const taken = new Set<LineupPos>();
  return players
    .filter((p) => here.has(p.id))
    .map((p) => {
      const pos = p.positions.find((x) => x !== 'EH' && !taken.has(x)) ?? 'EH';
      if (pos !== 'EH') taken.add(pos);
      return { player: p.id, pos };
    });
}

/** "Oak Hollow Sluggers" → SLU. */
export function defaultShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[words.length - 1] ?? '').slice(0, 3).toUpperCase();
}

export function localDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The season a date belongs to: Spring (Jan–May), Summer (Jun–Aug), Fall (Sep–Dec). */
export function seasonFor(team: Team, date: string): Season {
  const [y, m] = date.split('-').map(Number) as [number, number];
  const term = m <= 5 ? 'Spring' : m <= 8 ? 'Summer' : 'Fall';
  const name = `${term} ${y}`;
  return team.seasons.find((s) => s.name === name) ?? { id: newId(), name, start: date };
}
