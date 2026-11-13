/*
 * Builds the made-up sample season (SPEC §19) into src/content/sample-season.json.
 *
 *   node --experimental-strip-types tools/make-sample.ts
 *
 * The games are played by the hand scorer (tests/sim/hand-scorer.ts), so every
 * play is one a person could tap. Times are stored from each game's first
 * pitch (startedAt 0); the app moves them to real dates when the sample is
 * loaded, so "tonight" is always tonight. Every name here is made up.
 */
import { writeFileSync } from 'node:fs';
import { rng, simulateSeason } from '../tests/sim/hand-scorer.ts';
import { clampToField, FENCE, SPOTS } from '../src/game/field.ts';
import type { GameEvent } from '../src/engine/types.ts';
import { replay } from '../src/engine/replay.ts';
import type { GameRecord } from '../src/engine/types.ts';

export const SAMPLE_SEED = Number(process.env.SAMPLE_SEED ?? 0);

const PLAYERS = [
  { id: 'smp-maya', name: 'Maya Ortiz', number: '7', gender: 'f', rating: 5 },
  { id: 'smp-jordan', name: 'Jordan Lee', number: '12', gender: 'm', rating: 3 },
  { id: 'smp-casey', name: 'Casey Fox', number: '21', gender: 'm', rating: 4 },
  { id: 'smp-sam', name: 'Sam Patel', number: '33', gender: 'm', rating: 4 },
  { id: 'smp-riley', name: 'Riley Moore', number: '4', gender: 'm', rating: 3 },
  { id: 'smp-dani', name: 'Dani Brooks', number: '9', gender: 'f', rating: 4 },
  { id: 'smp-leah', name: 'Leah Chen', number: '15', gender: 'f', rating: 2 },
  { id: 'smp-tara', name: 'Tara Nguyen', number: '3', gender: 'f', rating: 5 },
  { id: 'smp-brooke', name: 'Brooke Adams', number: '18', gender: 'f', rating: 3 },
  { id: 'smp-marcus', name: 'Marcus Hill', number: '25', gender: 'm', rating: 4 },
  { id: 'smp-owen', name: 'Owen Price', number: '8', gender: 'm', rating: 2 },
] as const;

const RESERVE = { id: 'smp-nico', name: 'Nico Alvarez', number: '44', gender: 'm', rating: 3, bats: 'R', reserve: true, phone: '970-555-0142' };

/** Six played games, then tonight's (cut off mid-game). */
const OPPONENTS = [
  'Oak Hollow Owls',
  'Lakeside Lightning',
  'Mill Creek Hornets',
  'Pine Ridge Elk',
  'Lakeside Lightning',
  'Westbrook Bison',
  'Oak Hollow Owls',
];
const UPCOMING = [
  { opponent: 'Harbor City Anchors', park: 'Rolland Moore Park #2', side: 'home' },
  { opponent: 'Mill Creek Hornets', park: 'Fossil Creek Park #1', side: 'away' },
];
const PARKS = ['Rolland Moore Park #3', 'Fossil Creek Park #1', 'Spring Canyon Park #2', 'Rolland Moore Park #2'];

const FIRST = ['Alex', 'Ben', 'Carla', 'Drew', 'Ella', 'Finn', 'Gabe', 'Hana', 'Ivan', 'Jess', 'Kyle', 'Lena', 'Mateo', 'Nora', 'Omar', 'Paige', 'Quinn', 'Rosa', 'Seth', 'Tessa', 'Uma', 'Vic', 'Wes', 'Yara', 'Zack'];
const LAST = ['Archer', 'Baker', 'Castillo', 'Dalton', 'Ellis', 'Fuller', 'Grant', 'Hayes', 'Irwin', 'Jensen', 'Keller', 'Lowe', 'Mendez', 'Nash', 'Olsen', 'Parks', 'Reyes', 'Sutton', 'Tran', 'Vance', 'Walsh', 'Young'];

function theirOrders(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let n = 0;
  for (const team of new Set([...OPPONENTS, ...UPCOMING.map((u) => u.opponent)])) {
    out[team] = Array.from({ length: 10 }, () => {
      n += 1;
      return `${FIRST[(n * 7) % FIRST.length]} ${LAST[(n * 5) % LAST.length]}`;
    });
  }
  return out;
}

/** Where tonight's game stops: our team batting in the 4th, a runner on, fewer than two outs. */
function cutPoint(game: GameRecord): number | null {
  const start = game.setup.startedAt!;
  const limit = game.setup.rules.timeLimit * 60_000;
  for (let i = 1; i < game.events.length; i++) {
    const s = replay({ ...game, events: game.events.slice(0, i) }, { now: game.events[i - 1]!.at });
    const usBatting = (s.half === 'top') === (game.setup.us === 'away');
    const elapsed = game.events[i - 1]!.at! - start;
    if (s.final) return null;
    if (s.inning === 4 && usBatting && s.outs < 2 && s.bases.some(Boolean) && s.count.balls + s.count.strikes > 0 && elapsed < limit - 15 * 60_000) {
      return i;
    }
  }
  return null;
}

/** Did our team send more batters than its lineup holds in one half-inning, before the cut? */
function batsAround(game: GameRecord, cut: number): boolean {
  const lineup = game.setup.lineups.us.length;
  const trips = new Map<string, number>();
  let prev = replay({ ...game, events: [] });
  for (let i = 1; i <= cut; i++) {
    const s = replay({ ...game, events: game.events.slice(0, i) }, { now: game.events[i - 1]!.at });
    // A trip to the plate ended for us when our next batter moved on during our half.
    const ourHalf = (prev.half === 'top') === (game.setup.us === 'away');
    if (ourHalf && s.nextSlot.us !== prev.nextSlot.us) {
      const k = `${prev.inning}`;
      trips.set(k, (trips.get(k) ?? 0) + 1);
    }
    prev = s;
  }
  return [...trips.values()].some((n) => n > lineup);
}

function attempt(seed: number) {
  const roster = PLAYERS.map((p) => p.id);
  const season = simulateSeason(seed, OPPONENTS.length, {
    roster,
    ruleSetId: 'fc-2hr',
    mode: 'scorekeeper',
    count: true,
    hitLocation: true,
    opponents: OPPONENTS,
    theirOrders: theirOrders(),
    defenseCard: true,
  });
  const played = season.games.slice(0, -1);
  const tonight = season.games[season.games.length - 1]!;
  const results = played.map((g) => {
    const s = replay(g);
    const usScore = s.score[g.setup.us];
    const them = s.score[g.setup.us === 'away' ? 'home' : 'away'];
    return usScore > them ? 'W' : usScore < them ? 'L' : 'T';
  });
  const wins = results.filter((r) => r === 'W').length;
  // A believable record: more wins than losses, but not unbeaten, and no ties.
  if (wins < 3 || wins > 5 || wins <= results.filter((r) => r === 'L').length || results.includes('T')) return null;
  const cut = cutPoint(tonight);
  if (cut === null) return null;
  const s = replay({ ...tonight, events: tonight.events.slice(0, cut) }, { now: tonight.events[cut - 1]!.at });
  if (s.score.away + s.score.home < 3) return null;
  // Steve (Nov 13): tonight's game shows an inning where we bat around, so the Book's side-by-side boxes show.
  if (!batsAround(tonight, cut)) return null;
  return { season, played, tonight, cut };
}

/** Times from each game's first pitch. */
const jitter = rng(4242);

/**
 * The simulator drops balls anywhere; a real scorer taps near the fielder who
 * made the play. Put each ball near its fielder (home runs just over the
 * fence in that direction) so the charts and the Book's ball lines read true.
 */
function placeBall(e: GameEvent): GameEvent {
  if ((e.t !== 'pa' && e.t !== 'pitch') || !e.loc || !e.fielder) return e;
  const spot = SPOTS[e.fielder];
  const result = e.t === 'pa' ? e.result : 'FBO';
  let x = spot.x + (jitter() - 0.5) * 50;
  let y = spot.y + (jitter() - 0.5) * 50;
  const overFence = e.t === 'pa' && ((e.result === 'HR' && !e.ip) || e.result === 'HRO');
  if (overFence) {
    // Over the fence, in the direction of the outfielder it went over.
    const d = Math.hypot(spot.x, spot.y) || 1;
    const r = FENCE + 12 + jitter() * 25;
    x = (spot.x / d) * r + (jitter() - 0.5) * 30;
    y = (spot.y / d) * r;
  } else if (e.t === 'pa' && e.result === 'HR' && e.ip) {
    // Inside the park: deep, past the outfielder, short of the fence.
    const d = Math.hypot(spot.x, spot.y) || 1;
    const r = FENCE - 18 - jitter() * 20;
    x = (spot.x / d) * r + (jitter() - 0.5) * 30;
    y = (spot.y / d) * r;
  }
  if (result === 'FBO') {
    // Foul ground: outside the lines on the fielder's side.
    y = Math.max(5, y * 0.6);
    x = (spot.x < 0 ? -1 : 1) * (y + 15 + jitter() * 30);
  }
  // A ball over the fence was hit in the air.
  const type = overFence ? 'fly' : e.loc.type;
  return { ...e, loc: { ...clampToField({ x, y }, result), ...(type ? { type } : {}) } };
}

function fromStart(g: GameRecord, events = g.events) {
  const start = g.setup.startedAt!;
  return {
    setup: { ...g.setup, startedAt: 0 },
    events: events.map((e) => placeBall({ ...e, ...(e.at !== undefined ? { at: e.at - start } : {}) } as GameEvent)),
    defense: g.defense,
    present: g.present,
  };
}

/** A player's positions: where they played most, by innings on the Defense card and starts. */
function usualPositions(games: GameRecord[], id: string): (number | 'EH')[] {
  const count = new Map<number, number>();
  for (const g of games) {
    const start = g.setup.lineups.us.find((x) => x.player === id)?.pos;
    if (typeof start === 'number') count.set(start, (count.get(start) ?? 0) + 3);
    for (const inning of g.defense ?? []) {
      const pos = inning?.[id];
      if (typeof pos === 'number') count.set(pos, (count.get(pos) ?? 0) + 1);
    }
  }
  const top = [...count].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([pos]) => pos);
  return top.length ? top : ['EH'];
}

let seed = SAMPLE_SEED;
let found = attempt(seed);
while (!found) found = attempt(++seed);
const { season, played, tonight, cut } = found;

const opponentsOut = theirOrders();
const abbr = (name: string) => (name.split(' ').pop() ?? '').slice(0, 3).toUpperCase();
const sample = {
  seed,
  team: { name: 'Diamond Dogs', abbr: 'DOGS', colors: { primary: 'navy', secondary: 'red' } },
  players: [...PLAYERS.map((p) => ({ ...p, positions: usualPositions(season.games, p.id), bats: season.bats.get(p.id) })), { ...RESERVE, positions: [3, 7] }],
  games: played.map((g, n) => ({
    opponent: OPPONENTS[n]!,
    opponentAbbr: abbr(OPPONENTS[n]!),
    park: PARKS[n % PARKS.length]!,
    ...fromStart(g),
  })),
  tonight: {
    opponent: OPPONENTS[OPPONENTS.length - 1]!,
    opponentAbbr: abbr(OPPONENTS[OPPONENTS.length - 1]!),
    park: PARKS[0]!,
    ...fromStart(tonight, tonight.events.slice(0, cut)),
  },
  upcoming: UPCOMING.map((u) => ({ ...u, theirOrder: opponentsOut[u.opponent] })),
};
const out = new URL('../src/content/sample-season.json', import.meta.url);
writeFileSync(out, JSON.stringify(sample) + '\n');
console.log(`seed ${seed}: ${played.length} games, tonight cut at event ${cut} of ${tonight.events.length}; ${(JSON.stringify(sample).length / 1024).toFixed(0)} KB`);
