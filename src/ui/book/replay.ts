/*
 * Game Replay (Phase 15, Steve's idea): any saved game played back on the
 * field, built only from its saved plays, so every past game replays,
 * imported ones included. Each play draws the ball's line out to where it
 * landed, runners move around the bases (a run heads home, an out fades),
 * the score, inning, and outs tick along, and the play's words show under
 * the field. Back, Play or Pause, Next, and a half-inning picker. Reduce
 * Motion steps without animation; VoiceOver reads each play.
 */
import type { App } from '../../app/app.ts';
import { ordinalWord } from '../../app/view.ts';
import { replay, type GameState, type Play } from '../../engine/replay.ts';
import { describePlay } from '../../engine/words.ts';
import { BASES, SPOTS } from '../../game/field.ts';
import type { SavedGame } from '../../store/model.ts';
import { h, setText, svg } from '../dom.ts';
import { drawField } from '../game/fieldsheet.ts';
import { PICTURE } from '../picture.ts';
import { openSheet } from '../sheet.ts';

/** Where each base sits on the field picture (home at 0,0; up is negative). */
const SPOT_OF = [
  { x: 0, y: 0 },
  { x: BASES.first.x, y: -BASES.first.y },
  { x: BASES.second.x, y: -BASES.second.y },
  { x: BASES.third.x, y: -BASES.third.y },
] as const;

const STEP_MS = 2400;
const MOVE_MS = 600;

export function openReplay(app: App, game: SavedGame): void {
  const team = app.team;
  if (!team) return;
  const name = (k: string) => app.playerName(k);
  const plays = replay(game).plays.filter((p) => describePlay(p, name));
  const states = new Map<number, GameState>();
  const after = (k: number): GameState => {
    if (k < 0) return replay({ ...game, events: [] });
    let s = states.get(k);
    if (!s) {
      s = replay({ ...game, events: game.events.slice(0, plays[k]!.i + 1) });
      states.set(k, s);
    }
    return s;
  };
  const usAway = game.setup.us === 'away';
  const abbr = { away: usAway ? team.abbr : game.opponentAbbr, home: usAway ? game.opponentAbbr : team.abbr };

  // The field, with layers for the ball's line and the runners.
  const field = drawField([]);
  field.setAttribute('aria-label', 'The field, showing the play');
  field.classList.add('rp-field');
  const ballLayer = svg('g', { class: 'rp-balls' });
  const runnerLayer = svg('g', { class: 'rp-runners' });
  field.append(ballLayer, runnerLayer);

  // The line score above it: both teams, the inning, and the outs.
  const awayRuns = h('span', { class: 'rp-runs' });
  const homeRuns = h('span', { class: 'rp-runs' });
  const inning = h('span', { class: 'rp-inning' });
  const outs = h('span', { class: 'rp-outs' });
  const bug = h(
    'p',
    { class: 'rp-bug', 'aria-hidden': 'true' },
    h('span', { class: 'rp-team' }, abbr.away),
    awayRuns,
    h('span', { class: 'rp-team' }, abbr.home),
    homeRuns,
    inning,
    outs,
  );
  const words = h('p', { class: 'rp-words', 'aria-live': 'polite' });
  const where = h('p', { class: 'rp-where' });

  const back = h('button', { type: 'button', class: 'sk-key' }, 'Back');
  const play = h('button', { type: 'button', class: 'sk-key sk-primary rp-play' }, 'Play');
  const next = h('button', { type: 'button', class: 'sk-key' }, 'Next');
  const halves: { label: string; k: number }[] = [];
  plays.forEach((p, k) => {
    const label = `${p.half === 'top' ? 'Top' : 'Bottom'} of the ${ordinalWord(p.inning)}`;
    if (halves.at(-1)?.label !== label) halves.push({ label, k });
  });
  const pick = h(
    'select',
    { class: 'sk-input rp-pick', id: 'rp-pick', 'aria-label': 'Jump to a Half-Inning' },
    h('option', { value: '-1' }, 'From the First Pitch'),
    ...halves.map((x) => h('option', { value: String(x.k) }, x.label)),
  );

  const dots = new Map<string, SVGGElement>();
  let at = -1;
  let timer = 0;

  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const place = (g: SVGGElement, spot: { x: number; y: number }) => g.setAttribute('transform', `translate(${spot.x} ${spot.y})`);

  function runnerDot(key: string): SVGGElement {
    const label = name(key);
    const g = svg('g', { class: 'rp-runner' }, svg('circle', { r: 16, fill: PICTURE.marker, stroke: PICTURE.markerEdge, 'stroke-width': 2.5 }), svg('text', { y: 5.5, 'text-anchor': 'middle', fill: PICTURE.markerEdge, 'font-size': 15, 'font-weight': 700 }, document.createTextNode(initials(label))));
    place(g, SPOT_OF[0]);
    runnerLayer.append(g);
    return g;
  }

  function drawBall(p: Play | undefined): void {
    ballLayer.replaceChildren();
    if (!p) return;
    const spot = p.loc ?? (p.fielder ? SPOTS[p.fielder] : null);
    if (!spot) return;
    const end = { x: spot.x, y: -spot.y };
    const len = Math.hypot(end.x, end.y);
    const line = svg('line', { x1: 0, y1: 0, x2: end.x, y2: end.y, class: 'rp-ball', stroke: PICTURE.trail, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': String(len), 'stroke-dashoffset': still() ? '0' : String(len) });
    const dot = svg('circle', { cx: end.x, cy: end.y, r: 6, class: 'rp-ball-end', fill: PICTURE.trail, stroke: PICTURE.markerEdge, 'stroke-width': 2 });
    ballLayer.append(line, dot);
    // Draw the line out on the next frame, so the change animates.
    if (!still()) requestAnimationFrame(() => requestAnimationFrame(() => line.setAttribute('stroke-dashoffset', '0')));
  }

  function show(k: number): void {
    at = Math.max(-1, Math.min(plays.length - 1, k));
    const s = after(at);
    const p = at >= 0 ? plays[at] : undefined;
    setText(awayRuns, String(s.score.away));
    setText(homeRuns, String(s.score.home));
    setText(inning, `${s.half === 'top' ? '▲' : '▼'}${s.inning}`);
    setText(outs, `${Math.min(s.outs, 3)} ${s.outs === 1 ? 'Out' : 'Outs'}`);
    setText(where, p ? `${p.half === 'top' ? 'Top' : 'Bottom'} of the ${ordinalWord(p.inning)}, ${p.outsBefore} ${p.outsBefore === 1 ? 'out' : 'outs'}` : 'Before the first pitch');
    setText(words, p ? describePlay(p, name) : 'Tap Play to watch the game from the first pitch, or Next to step through it.');
    drawBall(p);

    // Runners: everyone on base now; anyone who scored heads home, anyone out fades.
    const onBase = new Map<string, number>();
    s.bases.forEach((r, i) => r && onBase.set(r.player, i + 1));
    const scored = new Set((p?.runs ?? []).map((r) => r.player));
    for (const [key, g] of dots) {
      if (onBase.has(key)) continue;
      dots.delete(key);
      if (scored.has(key)) place(g, SPOT_OF[0]);
      g.classList.add('rp-gone');
      setTimeout(() => g.remove(), still() ? 0 : MOVE_MS + 250);
    }
    for (const [key, base] of onBase) {
      let g = dots.get(key);
      if (!g) {
        g = runnerDot(key);
        dots.set(key, g);
        if (!still()) {
          const dot = g;
          requestAnimationFrame(() => requestAnimationFrame(() => place(dot, SPOT_OF[base]!)));
          continue;
        }
      }
      place(g, SPOT_OF[base]!);
    }
    back.toggleAttribute('aria-disabled', at < 0);
    next.toggleAttribute('aria-disabled', at >= plays.length - 1);
    pick.value = String([...halves].reverse().find((x) => x.k <= at)?.k ?? -1);
  }

  const stop = () => {
    clearInterval(timer);
    timer = 0;
    setText(play, 'Play');
  };
  const start = () => {
    if (at >= plays.length - 1) show(-1);
    setText(play, 'Pause');
    show(at + 1);
    timer = window.setInterval(() => {
      if (at >= plays.length - 1) return stop();
      show(at + 1);
    }, STEP_MS);
  };
  play.addEventListener('click', () => (timer ? stop() : start()));
  back.addEventListener('click', () => {
    stop();
    show(at - 1);
  });
  next.addEventListener('click', () => {
    stop();
    show(at + 1);
  });
  pick.addEventListener('change', () => {
    stop();
    // Jump to just before the half starts, then show its first play.
    const k = Number(pick.value);
    for (const g of dots.values()) g.remove();
    dots.clear();
    show(k);
  });

  const date = new Date(`${game.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(game.date.slice(0, 4) === String(new Date().getFullYear()) ? {} : { year: 'numeric' }) });
  openSheet({
    title: 'Game Replay',
    full: true,
    className: 'rp-sheet',
    body: [
      h('p', { class: 'rp-title' }, `${usAway ? `${team.name} at ${game.opponent}` : `${game.opponent} at ${team.name}`}, ${date}`),
      bug,
      h('div', { class: 'rp-stage' }, field),
      where,
      words,
      h('div', { class: 'rp-keys' }, back, play, next),
      pick,
    ],
    cancel: false,
    done: { label: 'Done', onClick: () => stop() },
    onClose: stop,
  });
  show(-1);
}

/** "Casey Fox" → "CF"; one name → its first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts.at(-1)![0]!).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

