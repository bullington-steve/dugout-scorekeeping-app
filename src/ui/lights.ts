/*
 * Board flashes (SPEC §14), Scorekeeper Mode only (Dugout Mode coaches aren't
 * watching the screen): a home run or a walk-off flashes the Game board's
 * frame, and any other win makes it glow once. Reduce Motion: no animation.
 *
 * The Book's stadium light banks (and the night-game and bases-loaded light
 * shows they carried) came off on Nov 16 (Steve's Book handoff).
 */
import type { App } from '../app/app.ts';
import type { GameState } from '../engine/replay.ts';

function flashBoard(kind: 'win' | 'walkoff' | 'homerun'): void {
  const board = document.querySelector('.gm-board');
  if (!board) return;
  board.classList.remove('gm-show-win', 'gm-show-walkoff', 'gm-show-homerun');
  void (board as HTMLElement).offsetWidth;
  board.classList.add(`gm-show-${kind}`);
  setTimeout(() => board.classList.remove(`gm-show-${kind}`), 3000);
}

/** Watches each new play and flashes the board. Call on every app change. */
export function lightsWatcher(app: App): () => void {
  let gameId: string | null = null;
  let length = 0;
  let prev: GameState | null = null;
  return () => {
    const g = app.game;
    const s = g ? app.state() : null;
    if (!g || !s) {
      gameId = null;
      prev = null;
      return;
    }
    if (g.id !== gameId) {
      gameId = g.id;
      length = g.events.length;
      prev = s;
      return;
    }
    const before = prev;
    prev = s;
    const n = g.events.length;
    const changed = n !== length;
    length = n;
    if (!changed || !before || s.mode !== 'scorekeeper') return;
    const us = g.setup.us;
    const usBatting = (before.half === 'top' ? 'away' : 'home') === us;
    const play = s.plays[s.plays.length - 1];
    const fresh = play && play.i === n - 1;
    if (s.final && !before.final && s.final.winner === us) {
      flashBoard(usBatting && us === 'home' ? 'walkoff' : 'win');
      return;
    }
    if (fresh && usBatting && play.result === 'HR') flashBoard('homerun');
  };
}
