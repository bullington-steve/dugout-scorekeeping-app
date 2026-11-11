/*
 * Hit location (SPEC §2): the field opens first. Tap where the ball went, a
 * marker drops with a dotted line from home, tap again or drag to move it,
 * then Save. The nearest fielder who's actually playing gets credit. Skip
 * records the play without a spot; Fielder Buttons and Pick the Spot from a
 * List are there for one play (the list is for VoiceOver users).
 */
import type { App } from '../../app/app.ts';
import { battingTeamOf } from '../../app/view.ts';
import type { BattedType, Loc, Pos, Result } from '../../engine/types.ts';
import type { SavedGame } from '../../store/model.ts';
import { POSITION_ABBR } from '../../engine/words.ts';
import {
  BASES,
  FENCE,
  SPOTS,
  TRACK,
  clampToField,
  nearestFielder,
  spotName,
  visiblePositions,
  zoneList,
} from '../../game/field.ts';
import { defenseFor } from '../../stats/games.ts';
import { h, setAttr, setDimmed, setText, svg } from '../dom.ts';
import { PICTURE } from '../picture.ts';
import { openSheet } from '../sheet.ts';

export type Spot = { loc?: Loc; fielder?: Pos };

const HIT_TYPES: { type: BattedType; label: string }[] = [
  { type: 'ground', label: 'Grounder' },
  { type: 'line', label: 'Line Drive' },
  { type: 'fly', label: 'Fly Ball' },
];

const TITLES: Partial<Record<Result, string>> = {
  '1B': 'Single',
  '2B': 'Double',
  '3B': 'Triple',
  HR: 'Home Run',
  E: 'Error',
  FC: 'Fielder’s Choice',
  GO: 'Grounder',
  F: 'Fly Out',
  L: 'Line Out',
  P: 'Pop Out',
  SF: 'Sac Fly',
  DP: 'Double Play',
  TP: 'Triple Play',
  HRO: 'Home Run Out',
  FBO: 'Foul Out',
};

/** For Edit Play and spray charts: a play in any game, with the spot it has now. */
export interface SpotContext {
  game: SavedGame;
  inning: number;
  weField: boolean;
  start?: Loc;
  /** "Save" by default. */
  saveLabel?: string;
  /** Shown above the field: the play, and View Game (spray charts). */
  extra?: Node;
  title?: string;
  /** A button beside the strip that closes the field and does something else (View Game). */
  action?: { label: string; run: () => void };
}

/** Resolves a spot, 'skip' for no spot, or null when cancelled. */
export function pickSpot(app: App, result: Result, ctx?: SpotContext): Promise<Spot | 'skip' | null> {
  const game = ctx?.game ?? app.game!;
  const s = ctx ? null : app.state()!;
  const weField = ctx ? ctx.weField : battingTeamOf(game, s!) === 'them';
  const visible = visiblePositions(defenseFor(game, ctx ? ctx.inning : s!.inning), weField);
  const isHit = result === '1B' || result === '2B' || result === '3B' || result === 'HR' || result === 'E';

  return new Promise((resolve) => {
    let done = false;
    let loc: Loc | null = null;
    let type: BattedType | undefined;
    const finish = (v: Spot | 'skip' | null) => {
      if (done) return;
      done = true;
      resolve(v);
      sheet.close();
    };

    const where = h('p', { class: 'fd-where', 'aria-live': 'polite' }, 'Tap where the ball went.');
    const types = h('div', { class: 'fd-types', role: 'group', 'aria-label': 'Kind of Hit' });
    if (isHit) {
      for (const t of HIT_TYPES) {
        const b = h('button', { type: 'button', class: 'sk-key fd-type', 'aria-pressed': 'false' }, t.label);
        b.addEventListener('click', () => {
          type = t.type;
          for (const other of types.children) setAttr(other, 'aria-pressed', other === b ? 'true' : 'false');
          if (loc) loc = { ...loc, type };
        });
        types.append(b);
      }
    }

    // The field, in feet: x across, y up the middle; drawn with y flipped.
    const field = drawField(visible);
    const marker = svg('g', { class: 'fd-marker', visibility: 'hidden' });
    const trail = svg('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: PICTURE.trail, 'stroke-width': 2.5, 'stroke-dasharray': '6 6' });
    const dot = svg('circle', { r: 9, fill: PICTURE.marker, stroke: PICTURE.markerEdge, 'stroke-width': 3 });
    marker.append(trail, dot);
    field.append(marker);

    const save = h('button', { type: 'button', class: 'sk-key sk-primary fd-save' }, ctx?.saveLabel ?? 'Save');
    setDimmed(save, 'Tap the field first');

    const show = (at: Loc) => {
      loc = at;
      const fielder = nearestFielder(loc, visible);
      setAttr(marker, 'visibility', 'visible');
      setAttr(dot, 'cx', String(loc.x));
      setAttr(dot, 'cy', String(-loc.y));
      setAttr(trail, 'x2', String(loc.x));
      setAttr(trail, 'y2', String(-loc.y));
      setText(where, spotName(fielder));
      setDimmed(save, undefined);
    };
    const place = (clientX: number, clientY: number) => {
      const ctm = field.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      show(clampToField({ x: p.x, y: -p.y, ...(type ? { type } : {}) }, result));
    };
    let dragging = false;
    field.addEventListener('pointerdown', (e) => {
      dragging = true;
      field.setPointerCapture(e.pointerId);
      place(e.clientX, e.clientY);
    });
    field.addEventListener('pointermove', (e) => {
      if (dragging) place(e.clientX, e.clientY);
    });
    const stop = () => (dragging = false);
    field.addEventListener('pointerup', stop);
    field.addEventListener('pointercancel', stop);

    save.addEventListener('click', () => {
      if (!loc) return;
      finish({ loc, fielder: nearestFielder(loc, visible) });
    });

    // Fielder Buttons and the spot list replace the field for this play.
    const alt = h('div', { class: 'fd-alt', hidden: true });
    const showButtons = () => {
      alt.replaceChildren(
        h('p', { class: 'fd-alt-title' }, 'Who Fielded It?'),
        h(
          'div',
          { class: 'fd-fielders' },
          ...visible.map((pos) => {
            const b = h('button', { type: 'button', class: 'sk-key fd-fielder', 'aria-label': spotName(pos) }, `${pos} · ${POSITION_ABBR[pos]}`);
            b.addEventListener('click', () => finish({ fielder: pos }));
            return b;
          }),
        ),
      );
      alt.hidden = false;
      fieldWrap.hidden = true;
    };
    const showList = () => {
      alt.replaceChildren(
        h('p', { class: 'fd-alt-title' }, 'Pick the Spot'),
        h(
          'div',
          { class: 'fd-zones' },
          ...zoneList(visible).map((z) => {
            const b = h('button', { type: 'button', class: 'sk-key fd-zone' }, z.label);
            b.addEventListener('click', () => finish({ loc: { ...z.loc, ...(type ? { type } : {}) }, fielder: z.pos }));
            return b;
          }),
        ),
      );
      alt.hidden = false;
      fieldWrap.hidden = true;
    };

    const skip = h('button', { type: 'button', class: 'sk-key fd-skip' }, 'Skip');
    skip.addEventListener('click', () => finish('skip'));
    const buttons = h('button', { type: 'button', class: 'sk-key' }, 'Fielder Buttons');
    buttons.addEventListener('click', showButtons);
    const list = h('button', { type: 'button', class: 'sk-key' }, 'Pick the Spot from a List');
    list.addEventListener('click', showList);

    const fieldWrap = h('div', { class: 'fd-wrap' }, where, field);
    const action = ctx?.action;
    const actionBtn = action ? h('button', { type: 'button', class: 'sk-key fd-action' }, action.label) : null;
    actionBtn?.addEventListener('click', () => {
      finish(null);
      action!.run();
    });
    const sheet = openSheet({
      title: ctx?.title ?? `${TITLES[result] ?? 'Ball in Play'}: Where Did It Go?`,
      full: true,
      className: 'fd-sheet',
      body: [
        ctx?.extra || actionBtn ? h('div', { class: 'fd-extra' }, ctx?.extra ?? '', actionBtn ?? '') : document.createTextNode(''),
        isHit ? types : document.createTextNode(''),
        fieldWrap,
        alt,
        h('div', { class: 'fd-actions' }, skip, buttons, list),
        h('div', { class: 'fd-save-row' }, save),
      ],
      onClose: () => {
        if (!done) {
          done = true;
          resolve(null);
        }
      },
    });
    if (ctx?.start) {
      type = ctx.start.type;
      for (const b of types.children) setAttr(b, 'aria-pressed', b.textContent === HIT_TYPES.find((t) => t.type === type)?.label ? 'true' : 'false');
      show(ctx.start);
    } else if (app.data.defaults.fielderButtons) showButtons();
  });
}

function fan(radius: number, fill: string): SVGPathElement {
  const a = radius * Math.SQRT1_2;
  return svg('path', { d: `M0 0 L${-a} ${-a} A${radius} ${radius} 0 0 1 ${a} ${-a} Z`, fill });
}

export function drawField(visible: readonly Pos[]): SVGSVGElement {
  const field = svg('svg', {
    // Fair territory, with room past the fence for home runs.
    viewBox: '-225 -325 450 350',
    class: 'fd-field',
    role: 'img',
    'aria-label': 'The field. Tap where the ball went, or use Pick the Spot from a List.',
    'data-contrast-skip': 'true',
  });
  const b = BASES;
  field.append(
    svg('rect', { x: -225, y: -325, width: 450, height: 350, fill: PICTURE.foul }),
    fan(FENCE, PICTURE.track),
    fan(TRACK, PICTURE.grass),
    fan(100, PICTURE.dirt),
    svg('path', {
      d: `M0 0 L${-FENCE * Math.SQRT1_2} ${-FENCE * Math.SQRT1_2} M0 0 L${FENCE * Math.SQRT1_2} ${-FENCE * Math.SQRT1_2}`,
      stroke: PICTURE.chalk,
      'stroke-width': 2,
    }),
    svg('path', {
      d: `M0 0 L${b.first.x} ${-b.first.y} L${b.second.x} ${-b.second.y} L${b.third.x} ${-b.third.y} Z`,
      stroke: PICTURE.chalk,
      'stroke-width': 1.5,
      fill: 'none',
    }),
    svg('path', {
      d: `M${-FENCE * Math.SQRT1_2} ${-FENCE * Math.SQRT1_2} A${FENCE} ${FENCE} 0 0 1 ${FENCE * Math.SQRT1_2} ${-FENCE * Math.SQRT1_2}`,
      stroke: PICTURE.fence,
      'stroke-width': 6,
      fill: 'none',
    }),
    svg('circle', { cx: 0, cy: -46, r: 7, fill: PICTURE.dirt, stroke: PICTURE.chalk, 'stroke-width': 1 }),
  );
  for (const base of [b.first, b.second, b.third]) {
    field.append(svg('rect', { x: base.x - 4, y: -base.y - 4, width: 8, height: 8, fill: PICTURE.base, transform: `rotate(45 ${base.x} ${-base.y})` }));
  }
  field.append(svg('path', { d: 'M-4 0 L4 0 L4 -3 L0 -6 L-4 -3 Z', fill: PICTURE.base }));
  for (const pos of visible) {
    const spot = SPOTS[pos];
    field.append(
      svg(
        'text',
        {
          x: spot.x,
          y: -spot.y + 5,
          'text-anchor': 'middle',
          fill: PICTURE.label,
          stroke: PICTURE.labelEdge,
          'stroke-width': 3,
          'paint-order': 'stroke',
          'font-size': 15,
          'font-weight': 700,
          'aria-hidden': 'true',
        },
        document.createTextNode(POSITION_ABBR[pos]),
      ),
    );
  }
  return field;
}
