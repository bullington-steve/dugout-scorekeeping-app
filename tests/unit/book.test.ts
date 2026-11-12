/* The Book as data (SPEC §6): boxes, outs circled in order, runs, the footer, and Rare Plays. */
import { describe, expect, it } from 'vitest';
import { bookName, bookPage, completeBook, playByPlay, rarePlaysIn, recentLines } from '../../src/app/book.ts';
import { game, pa, threeOuts } from '../helpers/game.ts';

const name = (k: string) => k;

describe('the Book page', () => {
  it('puts each plate appearance in its batter’s row and inning', () => {
    // p1 singles, p2 Ks (out 1), p3 triples (p1 scores), p4 grounds out 6-3 (out 2), p5 flies out (out 3).
    const g = game({}, [pa('1B', { fielder: 7 }), pa('K'), pa('3B', { fielder: 8 }), pa('GO', { fielder: 6 }), pa('F', { fielder: 9 })]);
    const page = bookPage(g, 'us');
    const box = (slot: number) => page.rows[slot]!.boxes.get(1)![0]!;
    expect(box(0)).toMatchObject({ code: '1B', reached: 4, scored: true, out: null });
    expect(box(1)).toMatchObject({ code: 'K', out: 1, reached: 0 });
    expect(box(2)).toMatchObject({ code: '3B', reached: 3, scored: false, rbi: 1 });
    expect(box(3)).toMatchObject({ code: '6-3', out: 2 });
    expect(box(4)).toMatchObject({ code: 'F9', out: 3 });
    expect(box(0).words).toBe('Inning 1, single to left field, scored.');
    expect(box(2).words).toBe('Inning 1, triple to center field, left on third, 1 RBI.');
    expect(page.innings).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(page.current).toBeNull();
  });

  it('circles a runner put out later in the box of the batter who put them on', () => {
    // p1 walks, p2 grounds into a fielder's choice that gets p1 at second.
    const g = game({}, [pa('BB'), pa('FC', { fcOut: 1, fielder: 6 })]);
    const page = bookPage(g, 'us');
    expect(page.rows[0]!.boxes.get(1)![0]).toMatchObject({ code: 'BB', out: 1, reached: 1 });
    expect(page.rows[1]!.boxes.get(1)![0]).toMatchObject({ code: 'FC6', reached: 1, out: null });
    expect(page.current).toEqual({ inning: 1, slot: 2 });
  });

  it('gives a second box in the same inning when the order comes around', () => {
    const tenSingles = Array.from({ length: 10 }, () => pa('1B'));
    const g = game({}, [...tenSingles, pa('K')]);
    const page = bookPage(g, 'us');
    expect(page.widths.get(1)).toBe(2);
    expect(page.rows[0]!.boxes.get(1)!.map((b) => b.code)).toEqual(['1B', 'K']);
  });

  it('shortens long names and lists the last inning or so of plays', () => {
    expect(bookName('Jordan Kowalski-Smith')).toBe('J. Kowalski-Smith');
    expect(bookName('Maya Ortiz')).toBe('Maya Ortiz');
    const g = game({}, [...threeOuts(), ...threeOuts(), pa('1B')]);
    const lines = playByPlay(g, name);
    expect(lines).toHaveLength(7);
    expect(recentLines(lines).map((l) => `${l.inning}${l.half}`)).toEqual(['1bottom', '1bottom', '1bottom', '2top']);
  });

  it('Complete Book needs a final game and every ball in play placed', () => {
    const at = { x: 0, y: 150 };
    const inning = [pa('GO', { fielder: 6, loc: at }), pa('F', { fielder: 8, loc: at }), pa('K')];
    const events = Array.from({ length: 7 }, () => [...inning, ...inning]).flat();
    expect(completeBook(game({}, events), name)).toEqual({ complete: false, why: 'The game isn’t over yet.' });
    const done = game({ rules: { ...game().setup.rules, allowTie: true, extras: 0 } }, events);
    expect(completeBook(done, name)).toEqual({ complete: true });
    const missing = [...events];
    missing[0] = pa('GO', { fielder: 6 });
    expect(completeBook(game({ rules: done.setup.rules }, missing), name)).toEqual({ complete: false, why: 'No hit location for p1 in the first.' });
  });

  it('finds rare plays: grand slam, cycle, double play, perfect inning', () => {
    const g = game({}, [pa('1B'), pa('1B'), pa('1B'), pa('HR'), pa('K'), pa('K'), pa('K'), pa('GO'), pa('F'), pa('K')]);
    const found = rarePlaysIn(g);
    expect(found.has('slam')).toBe(true);
    expect(found.has('perfect')).toBe(true);
    const dp = game({}, [...threeOuts(), pa('1B'), pa('DP')]);
    expect(rarePlaysIn(dp).has('dp')).toBe(true);
  });
});

describe('the Book row totals', () => {
  it('counts at-bats (not walks or sac flies), runs, hits, and RBI', async () => {
    const { rowTotals } = await import('../../src/app/book.ts');
    const box = (result: string, extra: Record<string, unknown> = {}) => ({ play: 0, event: 0, inning: 1, batter: 'p1', code: result, result, reached: 0, scored: false, out: null, ip: false, tb: false, rbi: 0, words: '', ...extra });
    const row = {
      slot: 0,
      players: ['p1'],
      boxes: new Map([
        [1, [box('1B', { scored: true })]],
        [3, [box('BB')]],
        [5, [box('SF', { rbi: 1 })]],
        [6, [box('HR', { scored: true, rbi: 2 }), box('K')]],
      ]),
    } as unknown as Parameters<typeof rowTotals>[0];
    expect(rowTotals(row)).toEqual({ ab: 3, r: 2, h: 2, rbi: 3 });
  });
});
