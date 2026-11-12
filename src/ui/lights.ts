/*
 * Lights (SPEC §14), Scorekeeper Mode only (Dugout Mode coaches aren't
 * watching the screen):
 * - a home run: the Book's lights come on bank by bank and stay lit until the next play;
 * - a walk-off: quick flashes, then all on; the Game board's frame flashes too;
 * - any other win: the Game board's frame glows once;
 * - bases loaded with us batting: a faint, slow heartbeat;
 * - a night game (starting after about sunset in Fort Collins): the lights stay on all game.
 * Reduce Motion: lights simply turn on and off. Only opacity and fill animate.
 */
import type { App } from '../app/app.ts';
import type { GameState } from '../engine/replay.ts';

/** Fort Collins, Colorado. */
const LAT = 40.5853;
const LON = -105.0844;

/** Sunset at Fort Collins on a date (NOAA's sunrise equation), as a time in ms. */
export function sunsetMs(date: Date): number {
  const rad = Math.PI / 180;
  const noonUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const jd = noonUtc / 86_400_000 + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const jStar = n - LON / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = 2451545 + jStar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const decl = Math.asin(Math.sin(lambda * rad) * Math.sin(23.44 * rad));
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(LAT * rad) * Math.sin(decl)) / (Math.cos(LAT * rad) * Math.cos(decl));
  const w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
  return (transit + w / 360 - 2440587.5) * 86_400_000;
}

/** A game that starts within 20 minutes of sunset, or later. */
export function isNightGame(startedAt: number | null): boolean {
  if (!startedAt) return false;
  // The calendar day in Fort Collins (Mountain time), whatever the device's clock says.
  const mt = new Date(startedAt - 7 * 3_600_000);
  return startedAt >= sunsetMs(new Date(mt.getUTCFullYear(), mt.getUTCMonth(), mt.getUTCDate())) - 20 * 60_000;
}

type Show = '' | 'homerun' | 'walkoff' | 'loaded';

function set(show: Show): void {
  const root = document.documentElement;
  if ((root.dataset.lights ?? '') !== show) {
    if (show) root.dataset.lights = show;
    else delete root.dataset.lights;
  }
}

function flashBoard(kind: 'win' | 'walkoff' | 'homerun'): void {
  const board = document.querySelector('.gm-board');
  if (!board) return;
  board.classList.remove('gm-show-win', 'gm-show-walkoff', 'gm-show-homerun');
  void (board as HTMLElement).offsetWidth;
  board.classList.add(`gm-show-${kind}`);
  setTimeout(() => board.classList.remove(`gm-show-${kind}`), 3000);
}

/** Watches each new play and sets the lights. Call on every app change. */
export function lightsWatcher(app: App): () => void {
  let gameId: string | null = null;
  let length = 0;
  let prev: GameState | null = null;
  return () => {
    const g = app.game ?? app.bookGame;
    const s = g ? app.state() : null;
    const root = document.documentElement;
    const night = !!g && isNightGame(g.setup.startedAt);
    if (night) root.dataset.night = '1';
    else delete root.dataset.night;
    if (!g || !app.game || !s) {
      gameId = null;
      prev = null;
      set('');
      return;
    }
    if (g.id !== gameId) {
      gameId = g.id;
      length = g.events.length;
      prev = s;
      set('');
      return;
    }
    const before = prev;
    prev = s;
    const n = g.events.length;
    const changed = n !== length;
    length = n;
    if (!changed || !before) return;
    if (s.mode !== 'scorekeeper') {
      set('');
      return;
    }
    const us = g.setup.us;
    const usBatting = (before.half === 'top' ? 'away' : 'home') === us;
    const play = s.plays[s.plays.length - 1];
    const fresh = play && play.i === n - 1;
    if (s.final && !before.final && s.final.winner === us) {
      const walkoff = usBatting && us === 'home';
      set(walkoff ? 'walkoff' : '');
      flashBoard(walkoff ? 'walkoff' : 'win');
      return;
    }
    if (fresh && usBatting && play.result === 'HR') {
      set('homerun');
      flashBoard('homerun');
      return;
    }
    const nowBatting = (s.half === 'top' ? 'away' : 'home') === us;
    set(nowBatting && s.bases.every(Boolean) ? 'loaded' : '');
  };
}
