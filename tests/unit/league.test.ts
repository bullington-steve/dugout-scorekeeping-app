/* Each team remembers its own league rules (schema 4, Steve, Nov 24). */
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/app.ts';
import { ruleSetById } from '../../src/engine/rules.ts';
import { Store } from '../../src/store/storage.ts';
import { MemoryKV } from './../helpers/kv.ts';

const NOW = new Date(2026, 10, 24, 18, 30).getTime();

describe('each team keeps its own league rules', () => {
  it('a Summer and a Fall team each start New Game on the rules they last played, and it survives a reload', () => {
    const kv = new MemoryKV();
    const app = new App(new Store(kv), () => NOW);
    const fall = app.addTeam('Fall Dogs');
    const basic = ruleSetById('basic', [])!;
    app.startGame({ opponent: 'Rats', us: 'away', mode: 'dugout', rules: basic.rules, ruleSetId: 'basic', count: false, hitLocation: false, lineup: [], present: [] });
    expect(app.leagueFor().ruleSetId).toBe('basic');
    // A new team starts on the New Game Defaults, not on Fall's rules.
    const summer = app.addTeam('Summer Dogs');
    expect(app.leagueFor().ruleSetId).toBe(app.data.defaults.ruleSetId);
    expect(app.data.defaults.ruleSetId).not.toBe('basic');
    // Setting Summer's rules outside a game leaves Fall alone.
    const rec = ruleSetById('fc-rec', [])!;
    app.setLeague('fc-rec', rec.rules);
    expect(app.leagueFor().ruleSetId).toBe('fc-rec');
    app.switchTeam(fall.id);
    expect(app.leagueFor().ruleSetId).toBe('basic');
    // After a reload each still knows its own.
    const again = new App(new Store(kv), () => NOW);
    expect(again.leagueFor(again.data.teams.find((t) => t.id === fall.id)!).ruleSetId).toBe('basic');
    expect(again.leagueFor(again.data.teams.find((t) => t.id === summer.id)!).ruleSetId).toBe('fc-rec');
  });
});
