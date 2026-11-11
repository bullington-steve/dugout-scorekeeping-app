import { describe, expect, it } from 'vitest';
import { depthChart, duesSummary, money, parseMoney } from '../../src/app/teamtools.ts';
import { newTeam, type Player } from '../../src/store/model.ts';

const p = (id: string, positions: Player['positions'], extra: Partial<Player> = {}): Player => ({ id, name: `${id} Smith`, number: '', positions, ...extra });

describe('depth chart', () => {
  it('lists main positions first, flags thin spots, and keeps reserves apart', () => {
    const rows = depthChart([p('Ann', [6, 4]), p('Bo', [4]), p('Cy', [2]), p('Di', [2], { reserve: true })]);
    const second = rows.find((r) => r.pos === 4)!;
    expect(second.players.map((x) => [x.player.id, x.rank])).toEqual([
      ['Bo', 0],
      ['Ann', 1],
    ]);
    expect(second.thin).toBe(false);
    const catcher = rows.find((r) => r.pos === 2)!;
    expect(catcher.thin).toBe(true);
    expect(catcher.reserves.map((x) => x.id)).toEqual(['Di']);
    // The core positions show even when nobody lists them; LCF and SF only when someone does.
    expect(rows.find((r) => r.pos === 1)?.players).toEqual([]);
    expect(rows.some((r) => r.pos === 10)).toBe(false);
  });
});

describe('dues', () => {
  it('splits the fee across payers, leaving out anyone exempt', () => {
    const team = newTeam('t', 'Diamond Dogs');
    team.players = Array.from({ length: 11 }, (_, n) => p(`p${n}`, []));
    team.players.push(p('res', [], { reserve: true }));
    team.dues = { '': { fee: 59100, exempt: ['p0'], paid: { p1: 5910, p2: 3000 } } };
    const s = duesSummary(team);
    expect([s.payers, s.share]).toEqual([10, 5910]);
    expect(money(s.share)).toBe('$59.10');
    expect(s.collected).toBe(8910);
    expect(s.toGo).toBe(59100 - 8910);
    expect(s.lines.find((l) => l.player.id === 'p2')?.owes).toBe(2910);
    expect(s.lines.find((l) => l.player.id === 'p0')?.owes).toBe(0);
    expect(s.lines.some((l) => l.player.id === 'res')).toBe(false);
  });

  it('rounds each share up to the cent so the fee is covered', () => {
    const team = newTeam('t', 'Dogs');
    team.players = Array.from({ length: 7 }, (_, n) => p(`p${n}`, []));
    team.dues = { '': { fee: 60000, exempt: [], paid: {} } };
    expect(duesSummary(team).share).toBe(8572);
  });

  it('reads money the way people type it', () => {
    expect(parseMoney('59.10')).toBe(5910);
    expect(parseMoney('$1,250')).toBe(125000);
    expect(parseMoney('.5')).toBe(50);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('5.123')).toBeNull();
    expect(money(125000)).toBe('$1,250.00');
  });
});
