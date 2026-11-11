/*
 * Team tools (SPEC §9): the depth chart and dues. Pure functions of the roster.
 */
import type { Pos } from '../engine/types.ts';
import type { Dues, Player, Team } from '../store/model.ts';

/** Positions on the depth chart, in the order a scorebook lists them. */
export const DEPTH_ORDER: Pos[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** Positions always shown, even with nobody listed (the outfield shapes vary). */
const CORE: Pos[] = [1, 2, 3, 4, 5, 6, 7, 9];

export interface DepthRow {
  pos: Pos;
  /** Roster players who list it, main position first, then 2nd, then 3rd. */
  players: { player: Player; rank: number }[];
  reserves: Player[];
  /** One roster option, or none. */
  thin: boolean;
}

export function depthChart(players: Player[]): DepthRow[] {
  const listed = (p: Player, pos: Pos) => p.positions.indexOf(pos);
  const rows: DepthRow[] = [];
  for (const pos of DEPTH_ORDER) {
    const roster = players
      .filter((p) => !p.reserve && listed(p, pos) >= 0)
      .map((player) => ({ player, rank: listed(player, pos) }))
      .sort((a, b) => a.rank - b.rank || a.player.name.localeCompare(b.player.name));
    const reserves = players.filter((p) => p.reserve && listed(p, pos) >= 0);
    if (!roster.length && !reserves.length && !CORE.includes(pos)) continue;
    rows.push({ pos, players: roster, reserves, thin: roster.length <= 1 });
  }
  return rows;
}

/** Dollars and cents from cents: 5910 → "$59.10". */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** "59.10", "$59", "59" → 5910 cents; null when it isn't a number. */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[$,\s]/g, '');
  if (!/^\d*(\.\d{0,2})?$/.test(clean) || clean === '' || clean === '.') return null;
  return Math.round(Number(clean) * 100);
}

export interface DuesLine {
  player: Player;
  exempt: boolean;
  paid: number;
  owes: number;
}

export interface DuesSummary {
  fee: number;
  payers: number;
  /** Each payer's share, rounded up to the cent so the fee is always covered. */
  share: number;
  collected: number;
  toGo: number;
  lines: DuesLine[];
}

export function duesKey(team: Team): string {
  return team.currentSeasonId ?? '';
}

export function emptyDues(): Dues {
  return { fee: 0, exempt: [], paid: {} };
}

export function duesSummary(team: Team, dues: Dues = team.dues?.[duesKey(team)] ?? emptyDues()): DuesSummary {
  const roster = team.players.filter((p) => !p.reserve);
  const exempt = new Set(dues.exempt);
  const payers = roster.filter((p) => !exempt.has(p.id)).length;
  const share = payers ? Math.ceil(dues.fee / payers) : 0;
  const lines = roster.map((player) => {
    const paid = dues.paid[player.id] ?? 0;
    const isExempt = exempt.has(player.id);
    return { player, exempt: isExempt, paid, owes: isExempt ? 0 : Math.max(0, share - paid) };
  });
  const collected = lines.reduce((n, l) => n + l.paid, 0);
  return { fee: dues.fee, payers, share, collected, toGo: Math.max(0, dues.fee - collected), lines };
}
