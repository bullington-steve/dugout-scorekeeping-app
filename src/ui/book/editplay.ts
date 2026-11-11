/*
 * Edit Play (SPEC §2): from a Book box or a play-by-play line. Results in
 * three labeled rows (Hit, On Base, Out); a small field for balls in play
 * that opens the full field to move the ball; a line for every runner
 * (stayed, advanced, scored, or out) and who gets each RBI; Delete This
 * Play with a second tap. Saving re-scores everything after it, on saved
 * games too, and season stats follow.
 */
import type { App } from '../../app/app.ts';
import { deleteEvent, replaceEvent } from '../../engine/edit.ts';
import { replay, type GameState, type Play } from '../../engine/replay.ts';
import type { Dest, GameEvent, Loc, PaEvent, Pos, Result, RunnerKey } from '../../engine/types.ts';
import { describePlay, POSITION_NAMES } from '../../engine/words.ts';
import { usesField } from '../../game/field.ts';
import type { SavedGame } from '../../store/model.ts';
import { announce } from '../announce.ts';
import { h, setAttr, setDimmed, setText, svg } from '../dom.ts';
import { drawField, pickSpot } from '../game/fieldsheet.ts';
import { openSheet } from '../sheet.ts';

const ROWS: { title: string; keys: { r: Result; code: string; word: string }[] }[] = [
  {
    title: 'Hit',
    keys: [
      { r: '1B', code: '1B', word: 'Single' },
      { r: '2B', code: '2B', word: 'Double' },
      { r: '3B', code: '3B', word: 'Triple' },
      { r: 'HR', code: 'HR', word: 'Home Run' },
    ],
  },
  {
    title: 'On Base',
    keys: [
      { r: 'BB', code: 'BB', word: 'Walk' },
      { r: 'E', code: 'E', word: 'Error' },
      { r: 'FC', code: 'FC', word: 'Fld Choice' },
    ],
  },
  {
    title: 'Out',
    keys: [
      { r: 'K', code: 'K', word: 'Swinging' },
      { r: 'KL', code: 'ꓘ', word: 'Looking' },
      { r: 'GO', code: 'GO', word: 'Grounder' },
      { r: 'F', code: 'F', word: 'Fly Out' },
      { r: 'L', code: 'L', word: 'Line Out' },
      { r: 'P', code: 'P', word: 'Pop Out' },
      { r: 'FBO', code: 'FBO', word: 'Foul Out' },
      { r: 'SF', code: 'SF', word: 'Sac Fly' },
      { r: 'DP', code: 'DP', word: 'Dbl Play' },
      { r: 'TP', code: 'TP', word: 'Tpl Play' },
      { r: 'HRO', code: 'HRO', word: 'HR Out' },
    ],
  },
];

const HALF = (p: Play) => `${p.half === 'top' ? 'Top' : 'Bottom'} of the ${p.inning}${['th', 'st', 'nd', 'rd'][p.inning % 10 > 3 || [11, 12, 13].includes(p.inning % 100) ? 0 : p.inning % 10]}`;

interface Draft {
  result: Result;
  fielder?: Pos;
  loc?: Loc;
  ip?: boolean;
  bbTo?: 1 | 2;
  adv: Partial<Record<RunnerKey, Dest>>;
  rbi: Partial<Record<RunnerKey, string | null>>;
}

/** Where each runner (and the batter) ended on a play, from the state after it. */
function outcome(play: Play, after: GameState): Map<RunnerKey, Dest> {
  const out = new Map<RunnerKey, Dest>();
  const keys: RunnerKey[] = ['B', 1, 2, 3];
  for (const k of keys) {
    const player = k === 'B' ? play.batter : play.basesBefore[k - 1];
    if (!player) continue;
    if (play.runs.some((r) => r.from === k)) out.set(k, 4);
    else if (play.outsOn.includes(player)) out.set(k, 0);
    else {
      const at = after.bases.findIndex((b) => b?.player === player || b?.batter === player);
      out.set(k, (at >= 0 ? at + 1 : k === 'B' ? 0 : k) as Dest);
    }
  }
  return out;
}

export function openEditPlay(app: App, gameId: string, eventIndex: number): void {
  const game = app.findGame(gameId);
  if (!game) return;
  const full = replay(game);
  const original = full.plays.find((p) => p.i === eventIndex && p.t === 'pa');
  if (!original || !original.result || !original.batter) return;
  const name = (k: string) => app.playerName(k);

  const draft: Draft = {
    result: original.converted ? 'HR' : original.result,
    ...(original.fielder ? { fielder: original.fielder } : {}),
    ...(original.loc ? { loc: original.loc } : {}),
    ...(original.ip ? { ip: true } : {}),
    ...(original.bbTo ? { bbTo: original.bbTo } : {}),
    adv: {},
    rbi: {},
  };
  const ev = game.events[eventIndex];
  if (ev?.t === 'pa') {
    draft.adv = { ...(ev.adv ?? {}) };
    draft.rbi = { ...(ev.rbi ?? {}) };
  }

  const candidate = (): PaEvent => ({
    t: 'pa',
    result: draft.result,
    ...(draft.fielder ? { fielder: draft.fielder } : {}),
    ...(draft.loc ? { loc: draft.loc } : {}),
    ...(draft.ip && draft.result === 'HR' ? { ip: true } : {}),
    ...(draft.bbTo && draft.result === 'BB' ? { bbTo: draft.bbTo } : {}),
    ...(Object.keys(draft.adv).length ? { adv: { ...draft.adv } } : {}),
    ...(Object.keys(draft.rbi).length ? { rbi: { ...draft.rbi } } : {}),
  });
  /** The play as it would be, replayed with everything before it. */
  const preview = () => {
    const events = [...game.events.slice(0, eventIndex), { ...candidate(), at: game.events[eventIndex]?.at } as GameEvent];
    const s = replay({ ...game, events });
    const play = s.plays[s.plays.length - 1];
    return { s, play, problem: s.issues.find((x) => x.i === eventIndex)?.why ?? null };
  };

  // ---- results ----
  const resultKeys = new Map<Result, HTMLButtonElement>();
  const resultRows = ROWS.map((row) =>
    h(
      'div',
      { class: 'ep-row' },
      h('p', { class: 'ep-row-title', id: `ep-${row.title.replace(' ', '')}` }, row.title),
      h(
        'div',
        { class: 'ep-keys', role: 'group', 'aria-labelledby': `ep-${row.title.replace(' ', '')}` },
        ...row.keys.map((k) => {
          const b = h(
            'button',
            { type: 'button', class: `sk-key gm-key ep-key ${row.title === 'Out' ? 'sk-out' : 'sk-hit'}`, 'aria-pressed': 'false', 'aria-label': k.word === 'Fld Choice' ? 'Fielder’s Choice' : k.word },
            h('span', { class: 'gm-code' }, k.r === 'KL' ? h('span', { class: 'gm-backwards' }, 'K') : k.code),
            h('span', { class: 'gm-word' }, k.word),
          );
          b.addEventListener('click', () => {
            draft.result = k.r;
            if (!usesField(k.r)) {
              delete draft.loc;
              delete draft.fielder;
            }
            draft.adv = {};
            draft.rbi = {};
            refresh();
          });
          resultKeys.set(k.r, b);
          return b;
        }),
      ),
    ),
  );

  // ---- the small field ----
  const where = h('p', { class: 'ep-where' });
  const mini = h('button', { type: 'button', class: 'ep-mini', 'aria-label': 'Where the Ball Went. Opens the field.' });
  mini.addEventListener('click', async () => {
    const weField = original.team === 'them';
    const spot = await pickSpot(app, draft.result, { game, inning: original.inning, weField, ...(draft.loc ? { start: draft.loc } : {}), saveLabel: 'Use This Spot' });
    if (!spot || spot === 'skip') {
      if (spot === 'skip') {
        delete draft.loc;
        delete draft.fielder;
      }
    } else {
      if (spot.loc) draft.loc = spot.loc;
      else delete draft.loc;
      if (spot.fielder) draft.fielder = spot.fielder;
    }
    refresh();
  });
  const fieldBlock = h('div', { class: 'ep-field' }, mini, where);

  // ---- runners and RBI ----
  const runners = h('div', { class: 'ep-runners' });
  const problem = h('p', { class: 'ep-problem', role: 'status' });
  const summary = h('p', { class: 'ep-summary', 'aria-live': 'polite' });

  const refresh = () => {
    for (const [r, b] of resultKeys) setAttr(b, 'aria-pressed', String(r === draft.result));
    fieldBlock.hidden = !usesField(draft.result);
    mini.replaceChildren(miniField(draft.loc));
    setText(where, draft.fielder ? `Fielded by the ${POSITION_NAMES[draft.fielder]}.` : 'No spot yet. Tap the field to place the ball.');
    const p = preview();
    setText(problem, p.problem ?? '');
    setDimmed(save, p.problem ?? undefined);
    if (!p.play) return;
    setText(summary, describePlay(p.play, name));
    const ends = outcome(p.play, p.s);
    const lines: HTMLElement[] = [];
    for (const [k, dest] of ends) {
      const player = k === 'B' ? p.play.batter! : p.play.basesBefore[k - 1]!;
      const startAt = k === 'B' ? 0 : k;
      const options: { value: Dest; label: string }[] = [];
      if (k !== 'B') options.push({ value: k, label: `Stayed at ${['', 'First', 'Second', 'Third'][k]}` });
      for (const b of [1, 2, 3] as const) if (b > startAt) options.push({ value: b, label: `${k === 'B' ? 'Safe at' : 'Advanced to'} ${['', 'First', 'Second', 'Third'][b]}` });
      options.push({ value: 4, label: 'Scored' }, { value: 0, label: 'Out' });
      const id = `ep-runner-${k}`;
      const select = h('select', { id, class: 'sk-input' }, ...options.map((o) => h('option', { value: String(o.value), selected: o.value === dest }, o.label)));
      select.addEventListener('change', () => {
        draft.adv = { ...draft.adv, [k]: Number(select.value) as Dest };
        refresh();
      });
      const label = k === 'B' ? `${name(player)} (batter)` : `${name(player)} (on ${['', 'first', 'second', 'third'][k]})`;
      const row = h('div', { class: 'sk-field ep-runner' }, h('label', { for: id, class: 'sk-field-label' }, label), select);
      const run = p.play.runs.find((r) => r.from === k);
      if (run) {
        const rid = `ep-rbi-${k}`;
        const batters = [...new Set([p.play.batter!, ...p.s.lineups[p.play.team].map((x) => x.player)])];
        const rbi = h(
          'select',
          { id: rid, class: 'sk-input' },
          ...batters.map((b) => h('option', { value: b, selected: run.rbi === b }, `RBI to ${name(b)}`)),
          h('option', { value: '', selected: run.rbi === null }, 'No RBI'),
        );
        rbi.addEventListener('change', () => {
          draft.rbi = { ...draft.rbi, [k]: rbi.value || null };
          refresh();
        });
        row.append(h('label', { for: rid, class: 'sk-field-label' }, 'RBI'), rbi);
      }
      lines.push(row);
    }
    runners.replaceChildren(h('p', { class: 'ep-row-title' }, 'Runners'), ...lines);
  };

  const save = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Save');
  const del = h('button', { type: 'button', class: 'sk-quiet-danger ep-delete' }, 'Delete This Play');
  let armed = false;
  del.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      setText(del, 'Tap Again to Delete This Play');
      return;
    }
    app.editGame(game.id, (g: SavedGame) => (g.events = deleteEvent(g.events, eventIndex)));
    announce('Play deleted. Everything after it is re-scored.');
    sheet.close();
  });
  save.addEventListener('click', () => {
    if (save.getAttribute('aria-disabled') === 'true') return;
    app.editGame(game.id, (g: SavedGame) => (g.events = replaceEvent(g.events, eventIndex, candidate())));
    announce('Play saved. Everything after it is re-scored.');
    sheet.close();
  });

  const sheet = openSheet({
    title: 'Edit Play',
    className: 'ep-sheet',
    body: [
      h('p', { class: 'ep-context' }, `${HALF(original)} · ${name(original.batter)}`),
      summary,
      ...resultRows,
      fieldBlock,
      runners,
      problem,
      h('div', { class: 'ep-actions' }, save, del),
    ],
  });
  refresh();
}

/** A small, not-to-scale field with the ball's spot. */
function miniField(loc: Loc | undefined): SVGSVGElement {
  const field = drawField([]);
  field.removeAttribute('role');
  field.setAttribute('aria-hidden', 'true');
  field.classList.add('ep-mini-field');
  if (loc) field.append(svg('circle', { cx: loc.x, cy: -loc.y, r: 12, class: 'ep-mini-ball' }));
  return field;
}
