/*
 * Import a first-version backup (scorekept-backup-YYYY-MM-DD.json, "v": 2)
 * into the rebuild's data model. Nothing is thrown away: anything the
 * rebuild doesn't use yet is kept in data.legacyV1, and every play the
 * importer can't place is listed in the report.
 *
 * First-version facts (the file format, learned from a real backup in Oct 2026):
 * - games[].ourSide: 0 = we bat first (away), 1 = home.
 * - games[].lineups[side]: [{ pid, name, pos }]; ours is lineups[ourSide].
 * - pa events: { r: result, p: fielder number, loc: [x, y], bb: GB/LD/FB }.
 *   Results use PO (pop out), LO (line out), FO (fly out).
 * - FC: { out: base index (0 = first) } of the runner put out.
 * - run events: { b: base index, a: adv | score | out, rbi: true }.
 * - quick events: { k: run | out | hit | err | hr }.
 * - settings.runRule: [[afterInning, runs]]; hrRule "plus2".
 * - settings.trackCount is ignored: old data had it on (LESSONS 31).
 * - Events have no timestamps; the clock start is clock.start.
 */
import { replay } from '../engine/replay.ts';
import { cloneRules, matchRuleSet, ruleSetById, type HrRule, type RuleSet, type Rules } from '../engine/rules.ts';
import type { Base, BattedType, Dest, GameEvent, LineupPos, Pos, Result, Slot } from '../engine/types.ts';
import { emptyData, newDefaults, type AppData, type Player, type SavedGame, type Season, type Team } from './model.ts';
import { base64ToBytes, type SoundFile } from './sounds.ts';

type Obj = Record<string, unknown>;

export interface ImportedGameReport {
  team: string;
  id: string;
  date: string;
  opponent: string;
  us: number;
  them: number;
  result: 'W' | 'L' | 'T' | null;
  reason: string | null;
  /** Plays the engine couldn't apply, with why. */
  refused: string[];
  warnings: string[];
}

export interface ImportReport {
  teams: { name: string; players: number; games: number; seasons: string[] }[];
  games: ImportedGameReport[];
  warnings: string[];
}

const POS: Record<string, Pos> = {
  P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9, LCF: 10, RCF: 11, SF: 12,
};

const RESULTS: Record<string, Result> = {
  '1B': '1B', '2B': '2B', '3B': '3B', HR: 'HR', BB: 'BB', E: 'E', FC: 'FC',
  K: 'K', KS: 'K', KL: 'KL', KC: 'KL', GO: 'GO', FO: 'F', F: 'F', LO: 'L', L: 'L', PO: 'P', P: 'P',
  SF: 'SF', DP: 'DP', TP: 'TP', HRO: 'HRO', FBO: 'FBO', FOUL: 'FBO',
};

const BATTED: Record<string, BattedType> = { GB: 'ground', LD: 'line', FB: 'fly', PU: 'pop', PO: 'pop' };

const QUICK: Record<string, 'run' | 'out' | 'hit' | 'error' | 'hr'> = {
  run: 'run', out: 'out', hit: 'hit', err: 'error', error: 'error', hr: 'hr',
};

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown, d = ''): string => (typeof x === 'string' ? x : d);
const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);

export function isV1Backup(o: Obj): boolean {
  return typeof o.v === 'number' && (isObj(o.team) || Array.isArray(o.teams)) && Array.isArray(o.games);
}

function position(x: unknown): LineupPos | undefined {
  const s = str(x).toUpperCase();
  if (s === 'EH') return 'EH';
  return POS[s];
}

function mapPlayer(p: Obj, extras: Record<string, Obj>): Player {
  const known = new Set(['id', 'name', 'num', 'pos', 'alt', 'bats', 'tune', 'photo', 'bday', 'gender', 'phone', 'reserve']);
  const positions = [p.pos, ...(Array.isArray(p.alt) ? p.alt : [])]
    .map(position)
    .filter((x): x is LineupPos => x !== undefined)
    .slice(0, 3);
  const bats = str(p.bats).toUpperCase();
  const player: Player = {
    id: str(p.id) || `v1-${str(p.name)}`,
    name: str(p.name),
    number: str(p.num) || (typeof p.num === 'number' ? String(p.num) : ''),
    positions,
  };
  if (bats === 'R' || bats === 'L' || bats === 'S') player.bats = bats;
  if (str(p.tune)) player.walkup = { tune: str(p.tune) };
  if (str(p.photo)) player.photo = str(p.photo);
  if (/^\d{2}-\d{2}$/.test(str(p.bday))) player.birthday = str(p.bday);
  const g = str(p.gender).toLowerCase();
  if (g === 'm' || g === 'f' || g === 'x') player.gender = g;
  if (str(p.phone)) player.phone = str(p.phone);
  if (p.reserve === true) player.reserve = true;
  const rest: Obj = {};
  for (const [k, v] of Object.entries(p)) if (!known.has(k)) rest[k] = v;
  if (Object.keys(rest).length) extras[player.id] = rest;
  return player;
}

/** First-version game settings → rules. Missing rules come from the Fort Collins default. */
export function mapRules(s: Obj): Rules {
  const r = cloneRules(ruleSetById('fc-2hr', [])!.rules);
  if (num(s.innings)) r.innings = num(s.innings)!;
  if (num(s.timeLimit) !== undefined) r.timeLimit = num(s.timeLimit)!;
  if (s.extras === 'until' || s.extras === -1 || s.extras === null) {
    r.extras = 'untilDecided';
    r.allowTie = false;
  } else if (num(s.extras) !== undefined) r.extras = num(s.extras)!;
  if (typeof s.ties === 'boolean') r.allowTie = s.ties;
  if (Array.isArray(s.runRule)) {
    r.runRule = s.runRule
      .filter((x): x is [number, number] => Array.isArray(x) && x.length === 2)
      .map(([after, runs]) => ({ after, runs }));
  }
  const hr: Record<string, HrRule> = {
    plus2: { kind: 'differential', gap: 2 },
    one: { kind: 'perGame', max: 1 },
    '1': { kind: 'perGame', max: 1 },
    none: { kind: 'unlimited' },
  };
  if (str(s.hrRule) && hr[str(s.hrRule)]) r.hr = hr[str(s.hrRule)]!;
  if (typeof s.courtesy === 'boolean') r.courtesyPerInning = s.courtesy ? 1 : 0;
  if (num(s.innMax) !== undefined) r.runLimit = num(s.innMax)!;
  if (typeof s.tbRunner === 'boolean') r.tbRunner = s.tbRunner;
  if (num(s.walkAt)) r.count.walkAt = num(s.walkAt)!;
  if (num(s.outAt)) r.count.outAt = num(s.outAt)!;
  if (typeof s.startCount === 'boolean') {
    r.count.startBalls = s.startCount ? 1 : 0;
    r.count.startStrikes = s.startCount ? 1 : 0;
  }
  if (typeof s.foulOut === 'boolean') r.count.foulOut = s.foulOut;
  if (typeof s.courtesyFoul === 'boolean') r.count.courtesyFoul = s.courtesyFoul;
  if (typeof s.mixed === 'boolean') r.mixed = s.mixed;
  return r;
}

interface GameContext {
  roster: Map<string, Player>;
  warnings: string[];
}

function mapGame(g: Obj, ctx: GameContext, teamName: string): { game: SavedGame; report: ImportedGameReport } {
  const warnings: string[] = [];
  const settings = isObj(g.settings) ? g.settings : {};
  const ourSide = num(g.ourSide) === 1 ? 1 : 0;
  const lineups = Array.isArray(g.lineups) ? g.lineups : [[], []];
  const ourRows = (Array.isArray(lineups[ourSide]) ? lineups[ourSide] : []) as Obj[];
  const theirRows = (Array.isArray(lineups[1 - ourSide]) ? lineups[1 - ourSide] : []) as Obj[];

  const us: Slot[] = ourRows.map((row) => {
    let id = str(row.pid);
    if (!id || !ctx.roster.has(id)) {
      const name = str(row.name) || 'Fill-in';
      id = id || `v1-${name}`;
      if (!ctx.roster.has(id)) {
        ctx.roster.set(id, { id, name, number: '', positions: [] });
        warnings.push(`${name} was in the lineup but not on the roster; added to the roster`);
      }
    }
    const pos = position(row.pos);
    return pos === undefined ? { player: id } : { player: id, pos };
  });
  let them: Slot[] = theirRows.map((row) => ({ player: str(row.name) || 'Batter' }));
  if (!them.length && str(g.oppOrder)) {
    them = str(g.oppOrder)
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((player) => ({ player }));
  }

  const rules = mapRules(settings);
  const game: SavedGame = {
    id: str(g.id) || `v1-game-${Math.random().toString(36).slice(2)}`,
    setup: {
      us: ourSide === 0 ? 'away' : 'home',
      mode: settings.mode === 'scorekeeper' ? 'scorekeeper' : 'dugout',
      rules,
      count: settings.balls === true,
      hitLocation: settings.askHits !== false && settings.hitField !== false,
      startedAt: isObj(g.clock) && num(g.clock.start) !== undefined ? num(g.clock.start)! : null,
      lineups: { us, them },
    },
    events: [],
    seasonId: str(g.seasonId) || null,
    date: str(g.date),
    opponent: str(g.opponent),
    opponentAbbr: str(g.opponentAbbr) || str(g.opponent).slice(0, 5).toUpperCase(),
    park: str(g.park),
    saved: g.done === true,
    ruleSetId: matchRuleSet(rules, []),
    imported: 'v1',
  };
  if (str(g.scorer)) game.scorer = str(g.scorer);

  /** The batter of the plate appearance that just happened (for "Scored on the play, RBI"). */
  const lastBatter = (): string | null => {
    const s = replay(game);
    for (let i = s.plays.length - 1; i >= 0; i--) {
      const p = s.plays[i]!;
      if (p.inning !== s.inning || p.half !== s.half) return null;
      if (p.t === 'pa') return p.batter ?? null;
    }
    return null;
  };

  const raw = Array.isArray(g.events) ? (g.events as unknown[]) : [];
  raw.forEach((e, n) => {
    if (!isObj(e)) {
      warnings.push(`play ${n + 1} is damaged; skipped`);
      return;
    }
    const at = num(e.at);
    const stamp = <T extends GameEvent>(ev: T): T => (at !== undefined ? { ...ev, at } : ev);
    switch (e.t) {
      case 'pa': {
        const result = RESULTS[str(e.r).toUpperCase()];
        if (!result) {
          warnings.push(`play ${n + 1}: unknown result "${str(e.r)}"; skipped`);
          return;
        }
        const ev: Extract<GameEvent, { t: 'pa' }> = { t: 'pa', result };
        const fielder = num(e.p);
        if (fielder && fielder >= 1 && fielder <= 12) ev.fielder = fielder as Pos;
        if (Array.isArray(e.loc) && e.loc.length === 2 && typeof e.loc[0] === 'number' && typeof e.loc[1] === 'number') {
          ev.loc = { x: e.loc[0], y: e.loc[1], v1: true };
          const type = BATTED[str(e.bb).toUpperCase()];
          if (type) ev.loc.type = type;
        }
        if (e.ip === true || str(e.r).toUpperCase() === 'IPHR') ev.ip = true;
        if (result === 'FC') {
          const out = num(e.out);
          ev.fcOut = out !== undefined && out >= 0 && out <= 2 ? ((out + 1) as Base) : null;
        }
        if (result === 'BB' && (e.to2 === true || e.bbTo === 2)) ev.bbTo = 2;
        game.events.push(stamp(ev));
        return;
      }
      case 'run': {
        const b = num(e.b);
        if (b === undefined || b < 0 || b > 2) {
          warnings.push(`play ${n + 1}: runner with no base; skipped`);
          return;
        }
        const from = (b + 1) as Base;
        const action = str(e.a);
        if (action === 'adv' || action === 'steal' || action === 'sb') {
          // Steals load as plain advances (LESSONS 32).
          game.events.push(stamp({ t: 'runner', from, to: Math.min(4, from + 1) as Dest }));
        } else if (action === 'score') {
          const rbi = e.rbi === true ? lastBatter() : typeof e.rbi === 'string' ? e.rbi : null;
          if (e.rbi === true && !rbi) warnings.push(`play ${n + 1}: RBI with no batter to credit; kept the run, no RBI`);
          game.events.push(stamp({ t: 'runner', from, to: 4, rbi }));
        } else if (action === 'out') {
          game.events.push(stamp({ t: 'runner', from, to: 0 }));
        } else if (action === 'cr' || action === 'courtesy') {
          const player = str(e.pid) || str(e.cr);
          if (player) game.events.push(stamp({ t: 'courtesy', base: from, player }));
          else warnings.push(`play ${n + 1}: courtesy runner with no name; skipped`);
        } else warnings.push(`play ${n + 1}: unknown runner action "${action}"; skipped`);
        return;
      }
      case 'quick': {
        const kind = QUICK[str(e.k)];
        if (kind) game.events.push(stamp({ t: 'quick', kind }));
        else warnings.push(`play ${n + 1}: unknown quick button "${str(e.k)}"; skipped`);
        return;
      }
      case 'sub': {
        const slot = num(e.slot);
        const player = str(e.pid);
        if (slot !== undefined && player) game.events.push(stamp({ t: 'sub', team: 'us', slot, player }));
        else warnings.push(`play ${n + 1}: substitution without a slot or player; skipped`);
        return;
      }
      case 'end':
        game.events.push(stamp({ t: 'end' }));
        return;
      case 'endHalf':
        game.events.push(stamp({ t: 'endHalf' }));
        return;
      case 'extra':
      case 'addInning':
        game.events.push(stamp({ t: 'extend' }));
        return;
      default:
        warnings.push(`play ${n + 1}: unknown kind "${str(e.t)}"; skipped`);
    }
  });

  const s = replay(game);
  const ours = game.setup.us;
  const theirs = ours === 'home' ? 'away' : 'home';
  const result = s.final ? (s.final.winner === null ? 'T' : s.final.winner === ours ? 'W' : 'L') : null;
  if (game.saved && !s.final) warnings.push('saved to the season but not finished by the rules; kept as played');
  return {
    game,
    report: {
      team: teamName,
      id: game.id,
      date: game.date,
      opponent: game.opponent,
      us: s.score[ours],
      them: s.score[theirs],
      result,
      reason: s.final?.reason ?? null,
      refused: s.issues.map((x) => `play ${x.i + 1}: ${x.why}`),
      warnings,
    },
  };
}

function mapTeam(source: Obj, index: number, report: ImportReport, extras: Record<string, Obj>): Team {
  const t = isObj(source.team) ? source.team : {};
  const name = str(t.name) || 'My Team';
  const roster = new Map<string, Player>();
  for (const p of Array.isArray(t.players) ? t.players : []) {
    if (!isObj(p)) continue;
    const player = mapPlayer(p, extras);
    roster.set(player.id, player);
  }
  const ctx: GameContext = { roster, warnings: report.warnings };
  const games: SavedGame[] = [];
  for (const g of Array.isArray(source.games) ? source.games : []) {
    if (!isObj(g)) continue;
    const { game, report: r } = mapGame(g, ctx, name);
    games.push(game);
    report.games.push(r);
  }
  const seasons: Season[] = (Array.isArray(source.seasons) ? source.seasons : [])
    .filter(isObj)
    .map((x) => ({ id: str(x.id), name: str(x.name), ...(str(x.start) ? { start: str(x.start) } : {}) }));
  const colors = isObj(t.colors) ? t.colors : {};
  const team: Team = {
    id: str(t.id) || `v1-team-${index}`,
    name,
    abbr: str(t.abbr) || name.slice(0, 3).toUpperCase(),
    colors: { primary: str(colors.primary, 'navy').toLowerCase(), secondary: str(colors.secondary, 'red').toLowerCase() },
    players: [...roster.values()],
    games,
    seasons,
    currentSeasonId: str(source.currentSeasonId) || null,
    currentGameId: str(source.currentId) || null,
    schedule: [],
  };
  if (str(t.look)) team.look = str(t.look);
  report.teams.push({ name, players: team.players.length, games: games.length, seasons: seasons.map((x) => x.name) });
  return team;
}

function mapSounds(raw: unknown, report: ImportReport): SoundFile[] {
  const out: SoundFile[] = [];
  const add = (id: string, x: unknown) => {
    try {
      if (typeof x === 'string') {
        const m = x.match(/^data:([^;]+);base64,(.*)$/s);
        out.push({ id, name: id, type: m?.[1] ?? 'audio/mpeg', bytes: base64ToBytes(m ? m[2]! : x) });
      } else if (isObj(x)) {
        const data = str(x.data) || str(x.base64) || str(x.b64);
        const m = data.match(/^data:([^;]+);base64,(.*)$/s);
        out.push({
          id: str(x.id) || id,
          name: str(x.name) || id,
          type: str(x.type) || m?.[1] || 'audio/mpeg',
          bytes: base64ToBytes(m ? m[2]! : data),
        });
      }
    } catch {
      report.warnings.push(`song file ${id} is damaged; skipped`);
    }
  };
  if (Array.isArray(raw)) raw.forEach((x, n) => add(isObj(x) ? str(x.id) || `sound-${n}` : `sound-${n}`, x));
  else if (isObj(raw)) for (const [id, x] of Object.entries(raw)) add(id, x);
  return out;
}

export function importV1(o: Obj): { data: AppData; sounds: SoundFile[]; report: ImportReport } {
  const report: ImportReport = { teams: [], games: [], warnings: [] };
  const data = emptyData();
  const playerExtras: Record<string, Obj> = {};

  data.teams.push(mapTeam(o, 0, report, playerExtras));
  if (Array.isArray(o.teams)) {
    o.teams.forEach((t, n) => {
      if (isObj(t)) data.teams.push(mapTeam(t, n + 1, report, playerExtras));
    });
  }
  data.activeTeamId = data.teams[0]?.id ?? null;

  const prefs = isObj(o.prefs) ? o.prefs : {};
  const defaults = newDefaults();
  defaults.mode = prefs.mode === 'scorekeeper' ? 'scorekeeper' : 'dugout';
  defaults.hitLocation = prefs.askHits !== false && prefs.hitField !== false;
  defaults.balls = prefs.balls === true;
  defaults.rules = mapRules(prefs);
  defaults.innings = defaults.rules.innings;
  defaults.ruleSetId = matchRuleSet(defaults.rules, []);
  data.defaults = defaults;

  if (Array.isArray(o.ruleSets)) {
    data.ruleSets = o.ruleSets.filter(isObj).map(
      (x, n): RuleSet => ({
        id: str(x.id) || `v1-rules-${n}`,
        name: str(x.name) || `Rule Set ${n + 1}`,
        rules: mapRules(isObj(x.rules) ? x.rules : x),
      }),
    );
  }
  data.parks = (Array.isArray(o.parks) ? o.parks : []).filter((x): x is string => typeof x === 'string');
  data.onboarded = o.onboarded === true;
  data.toursDone = isObj(o.toursDone) ? (Object.fromEntries(Object.entries(o.toursDone).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>) : {};
  data.lastBackup = num(o.lastBackup) ?? null;
  data.sample = o.sample === true;
  data.scorerName = str(prefs.scorer);
  data.prefs = { sound: typeof prefs.sound === 'boolean' ? prefs.sound : null, tapRings: prefs.tapRings === true };

  // Keep everything else, so later phases (sounds, Discord-free prefs, tours) can use it.
  const used = new Set(['v', 'team', 'teams', 'games', 'seasons', 'currentSeasonId', 'currentId', 'ruleSets', 'parks', 'onboarded', 'toursDone', 'lastBackup', 'sample', 'soundFiles', 'discord']);
  const legacy: Obj = { version: o.v };
  for (const [k, v] of Object.entries(o)) if (!used.has(k)) legacy[k] = v;
  if (Object.keys(playerExtras).length) legacy.playerExtras = playerExtras;
  data.legacyV1 = withoutDiscord(legacy) as Obj;

  return { data, sounds: mapSounds(o.soundFiles, report), report };
}

/** Discord links never travel in backups or saved data (SPEC §15). */
function withoutDiscord(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(withoutDiscord);
  if (!isObj(x)) return x;
  const out: Obj = {};
  for (const [k, v] of Object.entries(x)) {
    if (/discord|webhook/i.test(k)) continue;
    if (typeof v === 'string' && /discord(app)?\.com\/api\/webhooks/i.test(v)) continue;
    out[k] = withoutDiscord(v);
  }
  return out;
}
