/*
 * Everything the app saves, in one document. See docs/SPEC.md §9–11, §16.
 * Multiple teams from day one: each team keeps its own roster, games,
 * seasons, and schedule. Discord links are NOT here: they live in their own
 * device-only key so backups can never include them.
 */
import { DEFAULT_RULE_SET_ID, defaultRules, type RuleSet, type Rules } from '../engine/rules.ts';
import type { GameRecord, LineupPos } from '../engine/types.ts';

/** Bump when the shape changes, and add a migration in storage.ts. */
export const SCHEMA_VERSION = 5;

export type BatsSide = 'R' | 'L' | 'S';

export interface Walkup {
  /** A built-in or library tune id. */
  tune?: string;
  /** A song file in the sound store (IndexedDB). */
  fileId?: string;
  /** Seconds. */
  start?: number;
  length?: number;
  /** 0–1. */
  volume?: number;
  /** A library pick plays even when the player has a file; Use File switches back. */
  useFile?: boolean;
}

export interface Player {
  id: string;
  name: string;
  number: string;
  /** Main, 2nd, and 3rd positions. */
  positions: LineupPos[];
  bats?: BatsSide;
  /** Square JPEG data URL under 60 KB. */
  photo?: string;
  walkup?: Walkup;
  /** Month and day only: "MM-DD". */
  birthday?: string;
  /** For the Mixed League ratio check. */
  gender?: 'm' | 'f' | 'x';
  /** Hitter rating 1–5. */
  rating?: number;
  bench?: 'first' | 'normal' | 'last';
  limitedMobility?: boolean;
  reserve?: boolean;
  phone?: string;
}

/** Moments that can have a sound (SPEC §13). */
export type SoundMoment = 'hit' | 'walk' | 'run' | 'homerun' | 'strikeout' | 'bigout' | 'sideRetired' | 'tie' | 'takeLead' | 'rally' | 'win' | 'otherOut';

export interface AudioPrefs {
  /** Play Walk-Up Songs Automatically. */
  autoWalkup?: boolean;
  pack?: 'classic' | 'little' | 'big' | 'quiet';
  /** Kept so older saves still read; ignored since the Hammond became the only voice (2026.11.12-15). */
  voice?: 'hammond' | 'calliope' | 'pipe';
  echo?: 'off' | 'gym' | 'ballpark' | 'stadium';
  /** The Leslie speaker effect (swirl, chorus, tube warmth); on unless turned off. */
  leslie?: boolean;
  crowd?: boolean;
  /** Sounds for the other team's plays too. */
  bothTeams?: boolean;
  /** PA Announcer: "Now batting…" before walk-ups. */
  announce?: boolean;
  /** Umpire Calls: "Strike two!" */
  umpire?: boolean;
  /** Music between innings, from the Between Innings album. */
  betweenInnings?: boolean;
  /** Key Clicks: a short click for each scoring key, made to match its material (off unless turned on). */
  keyClicks?: boolean;
  /** Per-moment picks that differ from the pack: a tune id, or 'none'. */
  pick?: Partial<Record<SoundMoment, string>>;
}

export interface Season {
  id: string;
  /** "Fall 2026". */
  name: string;
  /** First day, YYYY-MM-DD. */
  start?: string;
}

/** The weather at the field when the game got going (Open-Meteo, from the iPhone's location). */
export interface GameWeather {
  /** Degrees Fahrenheit, whole. */
  tempF: number;
  /** "Clear", "Partly Cloudy", "Rain"; empty when unknown. */
  sky: string;
  windMph?: number;
  /** When it was read (ms). */
  at: number;
}

/**
 * A team we play, saved with its colors (schema 3, Steve, Nov 17: the first building block of league
 * parity). Games keep their own copy of the name and short name, as written that day.
 */
export interface Opponent {
  id: string;
  name: string;
  abbr: string;
  /** Palette names; Silver and Navy until set. */
  colors: { primary: string; secondary: string };
}

export interface SavedGame extends GameRecord {
  seasonId: string | null;
  /** YYYY-MM-DD. */
  date: string;
  /** The saved opponent this game was against (schema 3). */
  opponentId?: string;
  opponent: string;
  /** Up to 6 letters. */
  opponentAbbr: string;
  park: string;
  /** Saved to Season (Final banner) or still in progress. */
  saved: boolean;
  /** The rule set picked for this game, or 'custom'. */
  ruleSetId?: string;
  /** "Scored by" name in Scorekeeper Mode. */
  scorer?: string;
  /** The weather at the field, read once the game got going. */
  weather?: GameWeather;
  /** Where this game came from, when imported. */
  imported?: 'v1';
  /** The schedule entry this game was started from. */
  scheduleId?: string;
  /** Defense card pins: players who stay put. Missing = whoever starts at P and C. */
  pins?: string[];
  /** Defense card: innings Auto-Rotate plans for. Missing = 7, capped at the game's innings. */
  plan?: number;
}

/** Dues for one season (or for the team, with no season). Money in cents. */
export interface Dues {
  /** The league fee, in cents. */
  fee: number;
  /** Players who don't pay (a sponsor, the manager). */
  exempt: string[];
  /** Paid so far, in cents, by player id. */
  paid: Record<string, number>;
}

export interface ScheduledGame {
  id: string;
  seasonId: string;
  date: string;
  /** "18:30", or empty when not set. */
  time: string;
  opponent: string;
  /** The saved opponent (schema 3). */
  opponentId?: string;
  park: string;
  side: 'home' | 'away' | null;
  /** Filled in once the game is started from the schedule. */
  gameId?: string;
}

export interface Team {
  id: string;
  name: string;
  abbr: string;
  /** Palette names: "navy", "red", "silver"… */
  colors: { primary: string; secondary: string };
  /** Big League Colors preset label, dropped when a color is changed by hand. */
  look?: string;
  players: Player[];
  games: SavedGame[];
  seasons: Season[];
  currentSeasonId: string | null;
  /** The game in progress, if any. */
  currentGameId: string | null;
  schedule: ScheduledGame[];
  /** Dues by season id ("" with no season). */
  dues?: Record<string, Dues>;
  /**
   * How the Book names players (schema 2, Steve, Nov 17): 'first' (softball, "Cody") or 'last'
   * (a baseball scorebook's "Wendt"). Every team since schema 2 has it; softball teams start on 'first'.
   */
  bookNames: 'first' | 'last';
  /** The teams we play, with their colors (schema 3). */
  opponents: Opponent[];
  /**
   * The league rules this team plays by (schema 4, Steve, Nov 24): each team remembers its own, so a
   * Summer team and a Fall team each start a New Game on the right rules. Updated when a game starts.
   */
  league: TeamLeague;
  /** Suggest Order's style, the last one picked for this team (schema 5, Steve, Nov 24). */
  lineupStyle: 'spread' | 'traditional' | 'bestFirst';
}

export interface TeamLeague {
  ruleSetId: string;
  rules: Rules;
}

export interface NewGameDefaults {
  mode: 'dugout' | 'scorekeeper';
  hitLocation: boolean;
  /** Fielder Buttons instead of the field. */
  fielderButtons: boolean;
  innings: number;
  ruleSetId: string;
  rules: Rules;
  /** Balls and Strikes (a new key, off by default: LESSONS 31). */
  balls: boolean;
  keepAwake: boolean;
}

export interface AppData {
  schemaVersion: number;
  teams: Team[];
  activeTeamId: string | null;
  /** Saved rule sets (built-ins are in code). */
  ruleSets: RuleSet[];
  defaults: NewGameDefaults;
  /** Parks & Fields, most recent first. */
  parks: string[];
  scorerName: string;
  onboarded: boolean;
  toursDone: Record<string, boolean>;
  lastBackup: number | null;
  /** Sample season loaded (Look Around with Sample Data First). */
  sample: boolean;
  prefs: {
    /** Sound answer from setup; null until asked. */
    sound: boolean | null;
    /** Show Where Taps Land. */
    tapRings: boolean;
    /** Book Ink: what the Book is written in. Missing = pencil. */
    bookInk?: 'pencil' | 'black' | 'blue';
    /** Game board, Batter’s Name: the full name one size, or first name biggest. Missing = full (Master Spec, Nov 14). */
    batterName?: 'first' | 'full';
    /** Stats: Include Today's Game in Progress. Missing = on. */
    includeLive?: boolean;
    /** Sounds & Walk-Up Songs (SPEC §13). Missing = the defaults in src/sound/settings.ts. */
    audio?: AudioPrefs;
  };
  /** Anything from a first-version backup the rebuild doesn't use yet, kept so nothing is lost. */
  legacyV1?: Record<string, unknown>;
}

export function newDefaults(): NewGameDefaults {
  return {
    mode: 'dugout',
    hitLocation: true,
    fielderButtons: false,
    innings: 7,
    ruleSetId: DEFAULT_RULE_SET_ID,
    rules: defaultRules(),
    balls: false,
    keepAwake: true,
  };
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    teams: [],
    activeTeamId: null,
    ruleSets: [],
    defaults: newDefaults(),
    parks: [],
    scorerName: '',
    onboarded: false,
    toursDone: {},
    lastBackup: null,
    sample: false,
    prefs: { sound: null, tapRings: false },
  };
}

export function newTeam(id: string, name: string, league: TeamLeague = { ruleSetId: DEFAULT_RULE_SET_ID, rules: defaultRules() }): Team {
  return {
    id,
    name,
    abbr: defaultAbbr(name),
    colors: { primary: 'navy', secondary: 'red' },
    players: [],
    games: [],
    seasons: [],
    currentSeasonId: null,
    currentGameId: null,
    schedule: [],
    bookNames: 'first',
    opponents: [],
    league: { ruleSetId: league.ruleSetId, rules: structuredClone(league.rules) },
    lineupStyle: 'spread',
  };
}

/** Colors an opponent starts with until set: plain and neutral (Steve, Nov 17). */
export const OPPONENT_COLORS = { primary: 'silver', secondary: 'navy' } as const;

const norm = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** The saved opponent with this name, if any (names match ignoring case and extra spaces). */
export function findOpponent(team: Pick<Team, 'opponents'>, name: string): Opponent | undefined {
  const n = norm(name);
  return n ? (team.opponents ?? []).find((o) => norm(o.name) === n) : undefined;
}

/**
 * Give every game and schedule entry a saved opponent: find one by name or make it (Silver and
 * Navy, the game's short name). Used by the schema 3 migration, the first version's importer, and
 * the sample season, so all three come out the same.
 */
export function linkOpponents(team: Team, makeId: () => string): Team {
  team.opponents ??= [];
  const link = (name: unknown, abbr: unknown): string | undefined => {
    // Damaged or older records are left for the checks to report, never guessed at.
    if (typeof name !== 'string' || !name.trim()) return undefined;
    if (typeof abbr !== 'string') abbr = '';
    let o = findOpponent(team, name);
    if (!o) {
      o = { id: makeId(), name: name.trim(), abbr: ((abbr as string) || defaultAbbr(name)).toUpperCase().slice(0, 6), colors: { ...OPPONENT_COLORS } };
      team.opponents.push(o);
    }
    return o.id;
  };
  for (const g of Array.isArray(team.games) ? team.games : []) {
    if (!g || typeof g !== 'object') continue;
    const id = g.opponentId && team.opponents.some((o) => o.id === g.opponentId) ? g.opponentId : link(g.opponent, g.opponentAbbr);
    if (id) g.opponentId = id;
  }
  for (const e of Array.isArray(team.schedule) ? team.schedule : []) {
    if (!e || typeof e !== 'object') continue;
    const id = e.opponentId && team.opponents.some((o) => o.id === e.opponentId) ? e.opponentId : link(e.opponent, '');
    if (id) e.opponentId = id;
  }
  return team;
}

/** Short name: the first three letters of the last word ("Oak Hollow Sluggers" → SLU). */
export function defaultAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[words.length - 1] ?? '').slice(0, 3).toUpperCase();
}

/** Random ids like the first build's: eight lowercase letters and digits. */
export function newId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-2);
}
