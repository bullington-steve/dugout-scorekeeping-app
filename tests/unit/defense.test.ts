import { describe, expect, it } from 'vitest';
import type { GameRecord, LineupPos, Pos } from '../../src/engine/types.ts';
import { autoRotate, checkInning, fullCard, hungarian, pinsFor, playedThrough, playerCounts, resetCard, setSpot, whiteboardColumns } from '../../src/game/defense.ts';
import type { Player } from '../../src/store/model.ts';
import { game, quietInning, THEIRS } from '../helpers/game.ts';

const FOUR: LineupPos[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 9];

/** Twelve here, ten in the field: two sit each inning. */
function twelve(extra: Partial<GameRecord & { pins?: string[]; plan?: number }> = {}, roster: Partial<Player>[] = []): { g: GameRecord & { pins?: string[]; plan?: number }; players: Player[] } {
  const ids = Array.from({ length: 12 }, (_, n) => `p${n + 1}`);
  const players: Player[] = ids.map((id, n) => ({ id, name: `Player ${n + 1}`, number: String(n + 1), positions: [FOUR[n] ?? 7], ...roster[n] }));
  const g = game({
    lineups: {
      us: ids.map((player, n) => ({ player, pos: FOUR[n] ?? 'EH' })),
      them: THEIRS.map((player) => ({ player })),
    },
  });
  return { g: { ...g, ...extra }, players };
}

describe('Defense card', () => {
  it('inning 1 comes from the lineup and later innings copy forward', () => {
    const { g } = twelve();
    const card = fullCard(g, 3);
    expect(card[0]!.p1).toBe(1);
    expect(card[0]!.p11).toBe('EH');
    expect(card[2]).toEqual(card[0]);
  });

  it('picking a taken position swaps the two players', () => {
    const { g } = twelve();
    const defense = setSpot(g, 2, 'p3', 6);
    const two = fullCard({ ...g, defense }, 2)[1]!;
    expect(two.p3).toBe(6);
    expect(two.p6).toBe(3);
    // Inning 1 is untouched, and later innings copy the change.
    expect(fullCard({ ...g, defense }, 1)[0]!.p3).toBe(3);
    expect(fullCard({ ...g, defense }, 4)[3]!.p3).toBe(6);
  });

  it('flags innings missing a pitcher, catcher, or infielder', () => {
    const { g } = twelve();
    const defense = setSpot(g, 1, 'p1', 'sit');
    expect(checkInning(fullCard({ ...g, defense }, 1)[0]!).missing).toEqual([1]);
    expect(checkInning(fullCard(g, 1)[0]!).missing).toEqual([]);
  });

  it('P and C start pinned', () => {
    const { g } = twelve();
    expect(pinsFor(g)).toEqual(['p1', 'p2']);
  });

  it('Auto-Rotate: nobody sits twice until every unpinned player has sat once', () => {
    const { g, players } = twelve({ plan: 7 });
    const { defense } = autoRotate(g, players);
    const card = fullCard({ ...g, defense }, 7);
    // Ten unpinned players, two sit an inning: innings 1–5 sit everyone once.
    const unpinned = players.map((p) => p.id).filter((p) => p !== 'p1' && p !== 'p2');
    const sitsBy5 = unpinned.map((p) => playerCounts(card.slice(0, 5), p).sit);
    expect(sitsBy5.every((n) => n === 1)).toBe(true);
    // Pinned players never move.
    for (const inning of card) {
      expect(inning.p1).toBe(1);
      expect(inning.p2).toBe(2);
    }
    // Every inning is complete, with ten in the field.
    for (const inning of card) {
      expect(checkInning(inning).missing).toEqual([]);
      expect(Object.values(inning).filter((s) => typeof s === 'number').length).toBe(10);
    }
    // No back-to-back sits.
    for (const p of unpinned) for (let i = 1; i < 7; i++) expect(card[i]![p] === 'sit' && card[i - 1]![p] === 'sit').toBe(false);
  });

  it('Sits First go first and Sits Last go last', () => {
    const roster: Partial<Player>[] = [];
    roster[3] = { bench: 'last' };
    roster[4] = { bench: 'first' };
    const { g, players } = twelve({ plan: 7 }, roster);
    const card = fullCard({ ...g, defense: autoRotate(g, players).defense }, 7);
    // Inning 1 is the lineup (p11 and p12 are EH). Inning 2 sits the next two: p5 (Sits First) is one.
    expect(card[1]!.p5).toBe('sit');
    const firstSit = (p: string) => card.findIndex((x) => x[p] === 'sit');
    expect(firstSit('p4')).toBeGreaterThanOrEqual(firstSit('p5'));
    expect(firstSit('p4')).toBe(Math.max(...['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'].map(firstSit)));
  });

  it('fielders go back to their main position and limited mobility plays right field', () => {
    const roster: Partial<Player>[] = [];
    roster[10] = { positions: [6, 4] };
    roster[11] = { positions: [3], limitedMobility: true };
    const { g, players } = twelve({ plan: 7 }, roster);
    const card = fullCard({ ...g, defense: autoRotate(g, players).defense }, 7);
    for (const inning of card.slice(1)) {
      if (inning.p12 !== 'sit') expect(inning.p12).toBe(9);
      if (inning.p6 !== 'sit') expect(inning.p6).toBe(6);
    }
  });

  it('never changes innings already played, and Reset clears only the rest', () => {
    const { g, players } = twelve({ plan: 7 });
    const played = { ...g, events: [...quietInning(), ...quietInning()], defense: [] as GameRecord['defense'] };
    played.defense = setSpot(played, 2, 'p3', 'sit');
    expect(playedThrough(played)).toBe(2);
    const before = fullCard(played, 2);
    const after = autoRotate(played, players).defense;
    expect(fullCard({ ...played, defense: after }, 2)).toEqual(before);
    expect(after.length).toBe(7);
    expect(resetCard({ ...played, defense: after }).length).toBe(2);
  });

  it('short-handed: P, C, and the infield fill first, and it says so', () => {
    const ids = Array.from({ length: 8 }, (_, n) => `p${n + 1}`);
    const players: Player[] = ids.map((id, n) => ({ id, name: id, number: '', positions: [FOUR[n] as Pos] }));
    const g = { ...game({ lineups: { us: ids.map((player, n) => ({ player, pos: FOUR[n] })), them: THEIRS.map((player) => ({ player })) } }), plan: 3 };
    const { defense, notes } = autoRotate(g, players);
    const card = fullCard({ ...g, defense }, 3);
    expect(checkInning(card[2]!).missing).toEqual([]);
    expect(notes[0]).toMatch(/Only 8 here/);
  });

  it('assignment picks the cheapest seating', () => {
    expect(hungarian([[4, 1, 3], [2, 0, 5], [3, 2, 2]])).toEqual([1, 0, 2]);
  });

  it('whiteboard columns: 1 and 5, 2 and 6, 3 and 7, then 4 alone', () => {
    expect(whiteboardColumns(7)).toEqual([[1, 5], [2, 6], [3, 7], [4]]);
    expect(whiteboardColumns(5)).toEqual([[1, 5], [2], [3], [4]]);
    expect(whiteboardColumns(9)).toEqual([[1, 5], [2, 6], [3, 7], [4], [8], [9]]);
  });
});
