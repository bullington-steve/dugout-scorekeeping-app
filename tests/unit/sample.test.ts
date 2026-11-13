/* The sample season (SPEC §19): believable, dated around today, and every game replays cleanly. */
import { describe, expect, it } from 'vitest';
import { App, localDate } from '../../src/app/app.ts';
import { sampleTeam, type SampleSeason } from '../../src/app/sample.ts';
import json from '../../src/content/sample-season.json';
import { replay } from '../../src/engine/replay.ts';
import { resultFor } from '../../src/stats/index.ts';
import { Store } from '../../src/store/storage.ts';
import { MemoryKV } from '../helpers/kv.ts';

const sample = json as unknown as SampleSeason;
const NOW = new Date(2026, 9, 17, 19, 15).getTime();

describe('the sample season', () => {
  const team = sampleTeam(sample, NOW);

  it('is the Diamond Dogs: eleven players and a reserve, all made up', () => {
    expect(team.name).toBe('Diamond Dogs');
    expect(team.abbr).toBe('DOGS');
    expect(team.players.filter((p) => !p.reserve)).toHaveLength(11);
    expect(team.players.filter((p) => p.reserve)).toHaveLength(1);
    expect(team.players.every((p) => p.id.startsWith('smp-'))).toBe(true);
  });

  it('has six games played, each final and clean, with a winning (not perfect) record', () => {
    const played = team.games.filter((g) => g.saved);
    expect(played).toHaveLength(6);
    for (const g of played) {
      const s = replay(g);
      expect(s.final, g.opponent).not.toBeNull();
      expect(s.issues, g.opponent).toEqual([]);
    }
    const results = played.map((g) => resultFor(g));
    const wins = results.filter((r) => r === 'W').length;
    expect(wins).toBeGreaterThan(results.filter((r) => r === 'L').length);
    expect(results).toContain('L');
    expect(played.filter((g) => g.opponent === 'Lakeside Lightning')).toHaveLength(2);
  });

  it('has tonight’s game in progress: the 4th inning, today, clock still running', () => {
    const tonight = team.games.find((g) => g.id === team.currentGameId)!;
    expect(tonight.saved).toBe(false);
    expect(tonight.date).toBe(localDate(NOW));
    const s = replay(tonight, { now: NOW });
    expect(s.final).toBeNull();
    expect(s.issues).toEqual([]);
    expect(s.inning).toBe(4);
    expect(s.timeLast).toBeNull();
    expect(s.deadline).toBeGreaterThan(NOW + 10 * 60_000);
  });

  it('dates the past weekly before today, and two games ahead on the schedule', () => {
    const dates = team.games.filter((g) => g.saved).map((g) => g.date);
    expect([...dates].sort()).toEqual(dates);
    expect(dates.every((d) => d < localDate(NOW))).toBe(true);
    const ahead = team.schedule.filter((x) => x.date > localDate(NOW));
    expect(ahead.map((x) => x.opponent)).toEqual(['Harbor City Anchors', 'Mill Creek Hornets']);
    expect(team.schedule.filter((x) => x.gameId)).toHaveLength(7);
    expect(team.seasons).toHaveLength(1);
    expect(team.games.every((g) => g.seasonId === team.seasons[0]!.id)).toBe(true);
  });

  it('loads only on a device with nothing of its own, and Clear Sample Data starts fresh', () => {
    const kv = new MemoryKV();
    const app = new App(new Store(kv), () => NOW);
    expect(app.loadSample(sampleTeam(sample, NOW))).toBe(true);
    expect(app.data.sample).toBe(true);
    expect(app.game?.opponent).toBe('Oak Hollow Owls');
    expect(app.loadSample(sampleTeam(sample, NOW))).toBe(false);
    // It survives a reload.
    const again = new App(new Store(kv), () => NOW);
    expect(again.team?.name).toBe('Diamond Dogs');
    again.clearSample();
    expect(again.data.sample).toBe(false);
    expect(again.data.teams).toEqual([]);
    expect(again.isEmpty).toBe(true);
  });
});
