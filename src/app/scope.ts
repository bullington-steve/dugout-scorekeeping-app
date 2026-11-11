/*
 * Which games the Stats tab counts (SPEC §7): one season, All Seasons
 * (career), or All Teams, Lifetime (every team's saved games, matching
 * players by name). Stats stay pure functions of games; this only picks the
 * games and merges per-team results under one key per player.
 */
import { battingCounts, emptyCounts, type BattingCounts } from '../stats/batting.ts';
import { fieldingCounts, playingTime, type FieldingCounts, type PlayingTime } from '../stats/fielding.ts';
import { lineupHistory, sprayDots, type LineupCell, type SprayDot } from '../stats/team.ts';
import type { AppData, Player, SavedGame, Team } from '../store/model.ts';

export type ScopeId = string; // a season id, 'career', or 'lifetime'

export interface Scoped {
  /** Each team's games in scope, newest first. */
  parts: { team: Team; games: SavedGame[] }[];
  /** One key per player: the id for one team, the name across teams. */
  key: (team: Team, id: string) => string;
  name: (key: string) => string;
  player: (key: string) => Player | null;
  lifetime: boolean;
}

export function scoped(data: AppData, active: Team, scope: ScopeId, includeLive: boolean): Scoped {
  const lifetime = scope === 'lifetime';
  const teams = lifetime ? data.teams : [active];
  const parts = teams.map((team) => ({
    team,
    games: team.games
      .filter((g) => g.saved || (includeLive && g.id === team.currentGameId && g.events.length > 0))
      .filter((g) => lifetime || scope === 'career' || g.seasonId === scope)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.setup.startedAt ?? 0) - (a.setup.startedAt ?? 0)),
  }));
  const byKey = new Map<string, Player>();
  const key = (team: Team, id: string) => {
    const p = team.players.find((x) => x.id === id);
    const k = lifetime ? (p?.name ?? id).trim().toLowerCase() : id;
    if (p && !byKey.has(k)) byKey.set(k, p);
    return k;
  };
  for (const { team } of parts) for (const p of team.players) key(team, p.id);
  return {
    parts,
    key,
    name: (k) => byKey.get(k)?.name ?? k,
    player: (k) => byKey.get(k) ?? null,
    lifetime,
  };
}

export function allGames(sc: Scoped): SavedGame[] {
  return sc.parts.flatMap((p) => p.games);
}

function addInto<T extends object>(a: T, b: T): void {
  for (const k of Object.keys(b) as (keyof T)[]) {
    const v = b[k];
    if (typeof v === 'number') (a[k] as number) = ((a[k] as number) ?? 0) + v;
  }
}

export function scopedBatting(sc: Scoped): Map<string, BattingCounts> {
  const out = new Map<string, BattingCounts>();
  for (const { team, games } of sc.parts) {
    const bats = (id: string) => team.players.find((p) => p.id === id)?.bats;
    for (const [id, c] of battingCounts(games, { bats })) {
      const k = sc.key(team, id);
      const into = out.get(k) ?? emptyCounts();
      addInto(into, c);
      out.set(k, into);
    }
  }
  return out;
}

export function scopedFielding(sc: Scoped): Map<string, FieldingCounts> {
  const out = new Map<string, FieldingCounts>();
  for (const { team, games } of sc.parts) {
    for (const [id, c] of fieldingCounts(games)) {
      const k = sc.key(team, id);
      const into = out.get(k) ?? { innings: {}, plays: 0, errors: 0 };
      into.plays += c.plays;
      into.errors += c.errors;
      for (const [pos, n] of Object.entries(c.innings)) {
        const p = Number(pos) as keyof FieldingCounts['innings'];
        into.innings[p] = (into.innings[p] ?? 0) + (n ?? 0);
      }
      out.set(k, into);
    }
  }
  return out;
}

export function scopedPlayingTime(sc: Scoped): Map<string, PlayingTime> {
  const out = new Map<string, PlayingTime>();
  for (const { team, games } of sc.parts) {
    for (const [id, c] of playingTime(games.filter((g) => g.saved))) {
      const k = sc.key(team, id);
      const into = out.get(k) ?? { games: 0, fieldInnings: 0, fairShare: 0 };
      addInto(into, c);
      out.set(k, into);
    }
  }
  return out;
}

export function scopedLineups(sc: Scoped): Map<string, Map<string, LineupCell>> {
  const out = new Map<string, Map<string, LineupCell>>();
  for (const { team, games } of sc.parts) {
    for (const [id, row] of lineupHistory(games)) {
      const k = sc.key(team, id);
      const into = out.get(k) ?? new Map<string, LineupCell>();
      for (const [g, cell] of row) into.set(g, cell);
      out.set(k, into);
    }
  }
  return out;
}

export interface ScopedDot extends SprayDot {
  /** The batter's key (ours) or batting-order name (theirs). */
  who: string;
  team: Team;
}

export function scopedDots(sc: Scoped, side: 'us' | 'them', filter: 'all' | 'hits' | 'outs'): ScopedDot[] {
  return sc.parts.flatMap(({ team, games }) =>
    sprayDots(games, side, filter).map((d) => ({ ...d, team, who: side === 'us' ? sc.key(team, d.play.batter ?? '') : (d.play.batter ?? '') })),
  );
}
