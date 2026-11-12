/*
 * The hand scorer check (BUILD_PLAN Phase 1, LESSONS 33): random seasons
 * scored by an independent scorekeeper must match the engine and stats
 * exactly, and the check must catch a planted mistake.
 */
import { describe, expect, it } from 'vitest';
import { replay } from '../../src/engine/replay.ts';
import {
  FORMULAS,
  RATE_NAMES,
  battingCounts,
  battingRates,
  fieldingCounts,
  playingTime,
  stateOf,
  teamRecord,
  type BattingCounts,
  type Formulas,
} from '../../src/stats/index.ts';
import { REQUIRED_COVERAGE, sheetRates, simulateSeason, type Season } from '../sim/hand-scorer.ts';

/** Seeds that, together, cover every play type and rule (checked below). */
export const PERMANENT_SEEDS = [6, 12, 17, 28, 52, 159, 181];
const RANDOM_SEASONS = Number(process.env.HAND_SCORER_SEASONS ?? 40);
const RANDOM_BASE = Number(process.env.HAND_SCORER_BASE ?? 1000);

function mismatches(season: Season, formulas: Formulas = FORMULAS): string[] {
  const bad: string[] = [];
  const bats = (p: string) => season.bats.get(p);
  const engine = battingCounts(season.games, { bats });
  const players = new Set([...engine.keys(), ...season.sheet.batting.keys()]);
  for (const p of players) {
    const mine = season.sheet.batting.get(p);
    const theirs = engine.get(p);
    if (!mine || !theirs) {
      bad.push(`${p}: on only one sheet`);
      continue;
    }
    for (const k of Object.keys(mine) as (keyof BattingCounts)[]) {
      if (mine[k] !== theirs[k]) bad.push(`${p} ${k}: hand ${mine[k]}, app ${theirs[k]}`);
    }
    const handRates = sheetRates(mine);
    const appRates = battingRates(theirs, formulas);
    for (const r of RATE_NAMES) {
      const a = handRates[r] ?? null;
      const b = appRates[r];
      if (a === null || b === null ? a !== b : Math.abs(a - b) > 1e-9) bad.push(`${p} ${r}: hand ${a}, app ${b}`);
    }
  }

  const fielding = fieldingCounts(season.games);
  for (const [p, mine] of season.sheet.fielding) {
    const theirs = fielding.get(p);
    if (!theirs) {
      bad.push(`${p}: fielding missing`);
      continue;
    }
    if (mine.plays !== theirs.plays || mine.errors !== theirs.errors)
      bad.push(`${p} fielding: hand ${mine.plays}/${mine.errors}, app ${theirs.plays}/${theirs.errors}`);
    if (JSON.stringify(sortKeys(mine.innings)) !== JSON.stringify(sortKeys(theirs.innings)))
      bad.push(`${p} innings by position differ`);
  }

  const pt = playingTime(season.games);
  for (const [p, mine] of season.sheet.playing) {
    const theirs = pt.get(p);
    if (!theirs || theirs.games !== mine.games || theirs.fieldInnings !== mine.fieldInnings || Math.abs(theirs.fairShare - mine.fairShare) > 1e-9)
      bad.push(`${p} playing time: hand ${JSON.stringify(mine)}, app ${JSON.stringify(theirs)}`);
  }

  const rec = teamRecord(season.games);
  if (JSON.stringify(rec) !== JSON.stringify(season.sheet.record))
    bad.push(`record: hand ${JSON.stringify(season.sheet.record)}, app ${JSON.stringify(rec)}`);

  season.games.forEach((g, n) => {
    const hand = season.sheet.games[n]!;
    const s = stateOf(g);
    if (s.issues.length) bad.push(`${g.id}: app refused events ${JSON.stringify(s.issues.slice(0, 3))}`);
    if (s.score.away !== hand.score.away || s.score.home !== hand.score.home)
      bad.push(`${g.id} score: hand ${JSON.stringify(hand.score)}, app ${JSON.stringify(s.score)}`);
    if (s.final?.winner !== hand.winner || s.final?.reason !== hand.reason)
      bad.push(`${g.id} final: hand ${hand.winner}/${hand.reason}, app ${JSON.stringify(s.final)}`);
    // The live game, before saving, decides the same thing with the clock.
    const live = replay({ ...g, events: hand.liveEvents }, { now: hand.endNow });
    if (live.final?.winner !== hand.winner || live.final?.reason !== hand.reason)
      bad.push(`${g.id} live final: hand ${hand.winner}/${hand.reason}, app ${JSON.stringify(live.final)}`);
  });
  return bad;
}

function sortKeys(o: Partial<Record<number, number>>): [string, number | undefined][] {
  return Object.entries(o).sort(([a], [b]) => Number(a) - Number(b));
}

describe('hand scorer: permanent seeds', () => {
  const seasons = PERMANENT_SEEDS.map((seed) => ({ seed, season: simulateSeason(seed) }));

  for (const { seed, season } of seasons) {
    it(`seed ${seed} matches the hand-kept sheet exactly`, () => {
      expect(mismatches(season)).toEqual([]);
    });
  }

  it('together they cover every play type and rule', () => {
    const covered = new Set(seasons.flatMap(({ season }) => [...season.coverage]));
    const missing = REQUIRED_COVERAGE.filter((tag) => !covered.has(tag));
    expect(missing).toEqual([]);
  });

  it('bites: a planted OBP mistake (sac flies left out) is caught', () => {
    const broken: Formulas = {
      ...FORMULAS,
      OBP: (c) => (c.AB + c.BB > 0 ? (c.H + c.BB) / (c.AB + c.BB) : null),
    };
    const caught = seasons.flatMap(({ season }) => mismatches(season, broken)).filter((m) => m.includes('OBP'));
    expect(caught.length).toBeGreaterThan(0);
  });

  it('bites: a planted counting mistake (FBO counted as a strikeout) is caught', () => {
    const { season } = seasons.find(({ season }) => season.coverage.has('FBO'))!;
    const tampered: Season = {
      ...season,
      sheet: {
        ...season.sheet,
        batting: new Map(
          [...season.sheet.batting].map(([p, l]) => [p, { ...l, K: l.K + l.FBO }]),
        ),
      },
    };
    expect(mismatches(tampered).some((m) => / K: /.test(m))).toBe(true);
  });
});

describe(`hand scorer: ${RANDOM_SEASONS} random seasons`, () => {
  for (let n = 0; n < RANDOM_SEASONS; n++) {
    const seed = RANDOM_BASE + n;
    it(`seed ${seed}`, () => {
      expect(mismatches(simulateSeason(seed))).toEqual([]);
    });
  }
});
