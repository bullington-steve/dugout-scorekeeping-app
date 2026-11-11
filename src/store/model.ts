/*
 * Everything the app saves, in one document. See docs/SPEC.md §9–11, §16.
 * Multiple teams from day one: each team keeps its own roster, games,
 * seasons, and schedule. Discord links are NOT here: they live in their own
 * device-only key so backups can never include them.
 */
import { DEFAULT_RULE_SET_ID, defaultRules, type RuleSet, type Rules } from '../engine/rules.ts';
import type { GameRecord, LineupPos } from '../engine/types.ts';

/** Bump when the shape changes, and add a migration in storage.ts. */
export const SCHEMA_VERSION = 1;

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

export interface Season {
  id: string;
  /** "Fall 2026". */
  name: string;
  /** First day, YYYY-MM-DD. */
  start?: string;
}

export interface SavedGame extends GameRecord {
  seasonId: string | null;
  /** YYYY-MM-DD. */
  date: string;
  opponent: string;
  /** Up to 5 letters. */
  opponentAbbr: string;
  park: string;
  /** Saved to Season (Final banner) or still in progress. */
  saved: boolean;
  /** The rule set picked for this game, or 'custom'. */
  ruleSetId?: string;
  /** "Scored by" name in Scorekeeper Mode. */
  scorer?: string;
  /** Where this game came from, when imported. */
  imported?: 'v1';
  /** The schedule entry this game was started from. */
  scheduleId?: string;
}

export interface ScheduledGame {
  id: string;
  seasonId: string;
  date: string;
  /** "18:30", or empty when not set. */
  time: string;
  opponent: string;
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
    /** Stats: Include Today's Game in Progress. Missing = on. */
    includeLive?: boolean;
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

export function newTeam(id: string, name: string): Team {
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
  };
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
