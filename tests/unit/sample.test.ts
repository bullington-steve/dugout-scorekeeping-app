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
    expect(played.filter((g) => g.opponent === 'Horsetooth Hackers')).toHaveLength(2);
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

  it('dates the past games on the Sundays before today, and two Sundays ahead on the schedule (Steve, Nov 23)', () => {
    const today = localDate(NOW);
    const played = team.games.filter((g) => g.saved).map((g) => g.date);
    // Rec leagues play on a fixed day, so the sample does too: every finished game on a Sunday, a week apart.
    const day = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getDay();
    expect(played.every((d) => day(d) === 0 && d < today)).toBe(true);
    const ms = played.map((d) => new Date(`${d}T12:00:00`).getTime());
    for (let i = 1; i < ms.length; i++) expect(Math.round((ms[i]! - ms[i - 1]!) / 86_400_000)).toBe(7);
    const upcoming = team.schedule.filter((e) => !e.gameId);
    expect(upcoming).toHaveLength(2);
    expect(upcoming.every((e) => e.date > today && day(e.date) === 0)).toBe(true);
    expect([...played].sort()).toEqual(played);
    expect(upcoming.map((x) => x.opponent)).toEqual(['Spring Creek Mudhens', 'Old Town Alley Cats']);
    expect(team.schedule.filter((x) => x.gameId)).toHaveLength(7);
    expect(team.seasons).toHaveLength(1);
    expect(team.games.every((g) => g.seasonId === team.seasons[0]!.id)).toBe(true);
  });

  it('keeps every game on a Sunday whatever day it is today, Sunday included', () => {
    for (let d = 0; d < 7; d++) {
      const now = new Date(2026, 10, 22 + d, 19, 15).getTime();
      const t = sampleTeam(sample, now);
      const day = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getDay();
      const today = localDate(now);
      expect(t.games.filter((g) => g.saved).every((g) => day(g.date) === 0 && g.date < today), `today ${today}`).toBe(true);
      expect(t.schedule.filter((e) => !e.gameId).every((e) => day(e.date) === 0 && e.date > today), `today ${today}`).toBe(true);
    }
  });

  it('loads only on a device with nothing of its own, and Clear Sample Data starts fresh', () => {
    const kv = new MemoryKV();
    const app = new App(new Store(kv), () => NOW);
    expect(app.loadSample(sampleTeam(sample, NOW))).toBe(true);
    expect(app.data.sample).toBe(true);
    expect(app.game?.opponent).toBe('Poudre River Rats');
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
