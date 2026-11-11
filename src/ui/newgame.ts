/*
 * New Game (SPEC §4): which team, Who's Here, the lineup builder, Game
 * Details with the pregame checklist, then the coin toss. Back and Next sit
 * at the top so the keyboard never covers them.
 */
import { localDate, type App } from '../app/app.ts';
import { avgText } from '../app/view.ts';
import { cloneRules, ruleSetById } from '../engine/rules.ts';
import type { LineupPos, Slot } from '../engine/types.ts';
import { mixedRatioProblems } from '../engine/lineup.ts';
import {
  GROUPS,
  addToOrder,
  autoFill,
  countLine,
  duplicatePositions,
  grouped,
  openInfield,
  orderCheck,
  sameAsLastGame,
  strongBats,
  strongNeeded,
  suggestOrder,
  takenPositions,
  type Hitting,
} from '../game/lineup.ts';
import { battingCounts, battingRates } from '../stats/index.ts';
import { defaultAbbr, type Player, type ScheduledGame } from '../store/model.ts';
import { saveBackup } from './backup.ts';
import { group, segmented, switchRow, textField } from './controls.ts';
import { h, setText } from './dom.ts';
import { rulesEditor } from './rules.ts';
import { choose, openSheet } from './sheet.ts';
import { POSITION_OPTIONS, avatar, openPlayerEditor, posLabel, positionsText } from './team/player.ts';
import { dayText } from './when.ts';

type Step = 'who' | 'lineup' | 'details' | 'toss';
const STEPS: { id: Step; title: string }[] = [
  { id: 'who', title: 'Who’s Here' },
  { id: 'lineup', title: 'Lineup' },
  { id: 'details', title: 'Game Details' },
  { id: 'toss', title: 'Coin Toss' },
];

export interface NewGamePrefill {
  schedule?: ScheduledGame;
}

export function openNewGame(app: App, prefill: NewGamePrefill = {}): void {
  const teams = app.data.teams;
  if (teams.length > 1) {
    void (async () => {
      const id = await choose(
        'New Game for Which Team?',
        teams.map((t) => ({ label: t.name, value: t.id, kind: t.id === app.team?.id ? ('primary' as const) : undefined })),
      );
      if (!id) return;
      app.switchTeam(id);
      run(app, prefill);
    })();
    return;
  }
  run(app, prefill);
}

function run(app: App, prefill: NewGamePrefill): void {
  const team = app.ensureTeam();
  const d = app.data.defaults;
  const sched = prefill.schedule;
  const choice = {
    opponent: sched?.opponent ?? '',
    abbr: '',
    date: sched?.date ?? localDate(Date.now()),
    park: sched?.park ?? app.data.parks[0] ?? '',
    mode: d.mode,
    ruleSetId: d.ruleSetId,
    rules: cloneRules(ruleSetById(d.ruleSetId, app.data.ruleSets)?.rules ?? d.rules),
    count: d.balls,
    hitLocation: d.hitLocation,
    theirOrder: '',
  };
  const roster = () => team.players.filter((p) => !p.reserve);
  const here = new Set(roster().map((p) => p.id));
  let order: Slot[] = [];
  let step: Step = 'who';

  // Season hitting, for the groups and Suggest Order.
  const seasonGames = team.games.filter((g) => g.saved && g.seasonId === team.currentSeasonId);
  const counts = battingCounts(seasonGames);
  const hitting = (id: string): Hitting => {
    const c = counts.get(id);
    const r = c ? battingRates(c) : null;
    return { ops: c && c.PA ? r!.OPS : null, avg: c && c.AB ? r!.AVG : null };
  };
  const byId = (id: string) => team.players.find((p) => p.id === id);
  const last = app.lastGame();

  const stepTitle = h('p', { class: 'ng-step', 'aria-live': 'polite' });
  const back = h('button', { type: 'button', class: 'sk-key' }, 'Back');
  const next = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Next');
  const nav = h('div', { class: 'ng-nav' }, back, stepTitle, next);
  const content = h('div', { class: 'ng-content' });

  const go = (s: Step) => {
    step = s;
    const i = STEPS.findIndex((x) => x.id === s);
    setText(stepTitle, `${i + 1} of ${STEPS.length} · ${STEPS[i]!.title}`);
    back.hidden = i === 0;
    next.hidden = i === STEPS.length - 1;
    content.replaceChildren(...render());
    sheet.body.scrollTop = 0;
  };
  back.addEventListener('click', () => go(STEPS[Math.max(0, STEPS.findIndex((x) => x.id === step) - 1)]!.id));
  next.addEventListener('click', () => go(STEPS[Math.min(STEPS.length - 1, STEPS.findIndex((x) => x.id === step) + 1)]!.id));

  // ---- Who's Here ----------------------------------------------------------------
  const whoStep = (): Node[] => {
    const count = h('p', { class: 'ng-count', 'aria-live': 'polite' });
    const refresh = () => setText(count, `${[...here].filter((id) => byId(id) && !byId(id)!.reserve).length} of ${roster().length} Here`);
    const rows = roster().map((p) => {
      const b = h('button', { type: 'button', class: 'sk-row ng-player', 'aria-pressed': String(here.has(p.id)) }, avatar(p), h('span', { class: 'tm-player-main' }, h('span', { class: 'sk-row-label' }, p.name), h('span', { class: 'tm-player-sub' }, positionsText(p))), h('span', { class: 'ng-here', 'aria-hidden': 'true' }));
      const paint = () => {
        b.setAttribute('aria-pressed', String(here.has(p.id)));
        setText(b.lastElementChild!, here.has(p.id) ? '✓ Here' : 'Out');
      };
      paint();
      b.addEventListener('click', () => {
        if (here.has(p.id)) {
          here.delete(p.id);
          order = order.filter((s) => s.player !== p.id);
        } else here.add(p.id);
        paint();
        refresh();
      });
      return b;
    });
    refresh();
    const all = h('button', { type: 'button', class: 'sk-key' }, 'Everyone’s Here');
    all.addEventListener('click', () => {
      for (const p of roster()) here.add(p.id);
      go('who');
    });
    const reserves = team.players.filter((p) => p.reserve && !here.has(p.id));
    const reserveRows = reserves.map((p) => {
      const b = h('button', { type: 'button', class: 'sk-row' }, h('span', { class: 'sk-row-label' }, `Add ${p.name}`), h('span', { class: 'sk-row-detail' }, 'Reserve'));
      b.addEventListener('click', () => {
        here.add(p.id);
        go('who');
      });
      return b;
    });
    const hereReserves = team.players.filter((p) => p.reserve && here.has(p.id)).map((p) => h('p', { class: 'sk-row-note' }, `${p.name} (reserve) is here.`));
    if (!roster().length) {
      const add = h('button', { type: 'button', class: 'sk-key sk-primary' }, '+ Add Player');
      add.addEventListener('click', async () => {
        const p = await openPlayerEditor(app);
        if (p) here.add(p.id);
        go('who');
      });
      const fillIns = h('button', { type: 'button', class: 'sk-key' }, 'Start With Ten Fill-In Players');
      fillIns.addEventListener('click', () => {
        for (let n = 1; n <= 10; n++) {
          const p: Player = { id: `${Date.now().toString(36)}${n}`, name: `Player ${n}`, number: '', positions: [] };
          team.players.push(p);
          here.add(p.id);
        }
        app.updateTeam(() => undefined);
        go('who');
      });
      return [h('p', { class: 'sh-message' }, 'No players yet. Add your team, bring it in from a backup, or start with fill-ins and rename them later.'), add, fillIns];
    }
    return [count, h('div', { class: 'ng-who' }, ...rows), all, ...hereReserves, ...(reserveRows.length ? [h('h3', { class: 'sk-label' }, 'Reserves'), ...reserveRows] : [])];
  };

  // ---- Lineup -----------------------------------------------------------------------
  const lineupStep = (): Node[] => {
    const present = team.players.filter((p) => here.has(p.id));
    const groups = grouped(present, hitting);
    const badges = new Map<string, HTMLElement>();
    const paintBadges = () => {
      for (const [id, badge] of badges) {
        const i = order.findIndex((s) => s.player === id);
        setText(badge, i >= 0 ? ordinal(i + 1) : '+');
        badge.classList.toggle('ng-in', i >= 0);
      }
    };
    const groupEls = GROUPS.filter((g) => groups.get(g)!.length).map((g) =>
      h(
        'section',
        { class: 'ng-group', 'aria-label': g },
        h('h3', { class: 'sk-label' }, g),
        ...groups.get(g)!.map((p) => {
          const hit = hitting(p.id);
          const badge = h('span', { class: 'ng-badge', 'aria-hidden': 'true' }, '+');
          badges.set(p.id, badge);
          const b = h(
            'button',
            { type: 'button', class: 'sk-row ng-pick', 'aria-label': `${p.name}, ${positionsText(p) || 'no position'}` },
            avatar(p, 32),
            h('span', { class: 'ng-pick-name' }, p.name),
            h('span', { class: 'ng-pick-stats' }, `${positionsText(p)} · ${avgText(hit.avg)} · ${hit.ops === null ? '.000' : hit.ops.toFixed(3).replace(/^0/, '')} OPS${p.rating ? ` · ${'★'.repeat(p.rating)}` : ''}`),
            badge,
          );
          b.addEventListener('click', () => {
            order = order.some((s) => s.player === p.id) ? order.filter((s) => s.player !== p.id) : addToOrder(order, p);
            paintBadges();
            drawOrder();
          });
          return b;
        }),
      ),
    );

    const orderList = h('ol', { class: 'ng-order', 'aria-label': 'Batting Order' });
    const strip = h('div', { class: 'ng-strip', 'aria-label': 'Who Plays Where' });
    const countEl = h('p', { class: 'ng-count' });
    const checks = h('ul', { class: 'ng-checks', 'aria-live': 'polite' });

    const drawOrder = () => {
      orderList.replaceChildren(...order.map((slot, i) => orderRow(slot, i)));
      const taken = takenPositions(order);
      const open = new Set(openInfield(order));
      strip.replaceChildren(
        ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const)
          .filter((p) => taken.has(p) || p <= 6)
          .map((p) => {
            const who = order.find((s) => s.pos === p);
            return h('span', { class: `ng-chip${open.has(p) ? ' ng-open' : ''}` }, `${posLabel(p)} ${who ? initials(byId(who.player)?.name ?? '') : '–'}`);
          }),
      );
      setText(countEl, countLine(order));
      const strong = strongBats(present, hitting);
      const problems: string[] = [];
      if (order.length && order.length < 8) problems.push(`${order.length} batting. Fort Collins needs at least 8 to start.`);
      const dup = duplicatePositions(order);
      if (dup.length) problems.push(`Two players at ${dup.map(posLabel).join(', ')}: fix that to start.`);
      problems.push(...orderCheck(order.map((s) => ({ id: s.player, strong: strong.has(s.player), side: byId(s.player)?.bats }))));
      if (choice.rules.mixed) {
        const g = (id: string) => byId(id)?.gender;
        for (const pr of mixedRatioProblems(order.map((s) => s.player), order.filter((s) => typeof s.pos === 'number').map((s) => s.player), g)) {
          problems.push(pr.where === 'batting' ? `Mixed League: ${pr.men} men to ${pr.others} women and non-male players in the batting order.` : `Mixed League: ${pr.men} men to ${pr.others} women and non-male players on defense.`);
        }
      }
      checks.replaceChildren(...problems.map((t) => h('li', {}, t)));
      setText(suggestNote, strongLine(strong.size, order.length));
    };

    const orderRow = (slot: Slot, i: number): HTMLElement => {
      const p = byId(slot.player);
      const taken = takenPositions(order, i);
      const select = h(
        'select',
        { class: 'sk-input ng-pos', 'aria-label': `Position for ${p?.name ?? 'player'}` },
        ...POSITION_OPTIONS.filter((o) => o.value !== '').map((o) => {
          const pos: LineupPos = o.value === 'EH' ? 'EH' : (Number(o.value) as LineupPos);
          const isTaken = pos !== 'EH' && taken.has(pos);
          return h('option', { value: o.value, selected: slot.pos === pos, disabled: isTaken }, isTaken ? `${o.label} (taken)` : o.label);
        }),
      );
      select.addEventListener('change', () => {
        slot.pos = select.value === 'EH' ? 'EH' : (Number(select.value) as LineupPos);
        drawOrder();
      });
      const handle = h('span', { class: 'ng-handle', role: 'button', 'aria-label': `Move ${p?.name ?? 'player'}`, tabindex: '0' }, '☰');
      const name = h('button', { type: 'button', class: 'ng-order-name' }, `${i + 1}. ${p?.name ?? slot.player}`);
      name.addEventListener('click', () => void moveMenu(i));
      handle.addEventListener('click', () => {
        // Letting go after a drag isn't a tap.
        if (handle.dataset.dragged) return void delete handle.dataset.dragged;
        void moveMenu(i);
      });
      dragToReorder(handle, orderList, i, (to) => {
        const [moved] = order.splice(i, 1);
        order.splice(to, 0, moved!);
        paintBadges();
        drawOrder();
      });
      return h('li', { class: 'ng-order-row' }, handle, name, select);
    };

    const moveMenu = async (i: number) => {
      const p = byId(order[i]!.player);
      const action = await choose(p?.name ?? 'Batter', [
        ...(i > 0 ? [{ label: 'Move Up', value: 'up' as const }, { label: 'Move to Top', value: 'top' as const }] : []),
        ...(i < order.length - 1 ? [{ label: 'Move Down', value: 'down' as const }] : []),
        { label: 'Take Out of the Order', value: 'remove' as const, kind: 'out' as const },
      ]);
      if (!action) return;
      const [moved] = order.splice(i, 1);
      if (action === 'up') order.splice(i - 1, 0, moved!);
      else if (action === 'top') order.unshift(moved!);
      else if (action === 'down') order.splice(i + 1, 0, moved!);
      paintBadges();
      drawOrder();
    };

    const fill = h('button', { type: 'button', class: 'sk-key' }, 'Auto-Fill');
    fill.addEventListener('click', () => {
      order = autoFill(last?.setup.lineups.us ?? [], present);
      paintBadges();
      drawOrder();
    });
    const same = h('button', { type: 'button', class: 'sk-key', hidden: !last }, 'Same as Last Game');
    same.addEventListener('click', () => {
      order = sameAsLastGame(last?.setup.lineups.us ?? [], here);
      paintBadges();
      drawOrder();
    });
    const suggest = h('button', { type: 'button', class: 'sk-key' }, 'Suggest Order');
    const suggestNote = h('p', { class: 'sk-row-note' });
    suggest.addEventListener('click', () => {
      if (!order.length) order = autoFill(last?.setup.lineups.us ?? [], present);
      const strong = strongBats(present, hitting);
      const ids = suggestOrder(order.map((s) => ({ id: s.player, strong: strong.has(s.player), side: byId(s.player)?.bats })));
      order = ids.map((id) => order.find((s) => s.player === id)!);
      paintBadges();
      drawOrder();
    });
    const newPlayer = h('button', { type: 'button', class: 'sk-key' }, '+ New Player');
    newPlayer.addEventListener('click', async () => {
      const p = await openPlayerEditor(app);
      if (!p) return;
      here.add(p.id);
      order = addToOrder(order, p);
      go('lineup');
    });

    const absent = roster().filter((p) => !here.has(p.id));
    const absentRows = absent.map((p) => {
      const b = h('button', { type: 'button', class: 'sk-row' }, h('span', { class: 'sk-row-label' }, p.name), h('span', { class: 'sk-row-detail' }, 'Add Back'));
      b.addEventListener('click', () => {
        here.add(p.id);
        go('lineup');
      });
      return b;
    });

    drawOrder();
    paintBadges();
    return [
      h('p', { class: 'sk-row-note' }, 'Tap players to add them to the batting order. Drag ☰ to reorder, or tap a name to move it.'),
      ...groupEls,
      h('div', { class: 'ng-tools' }, fill, same, suggest, newPlayer),
      suggestNote,
      h('h3', { class: 'sk-label' }, 'Batting Order'),
      orderList,
      strip,
      countEl,
      checks,
      ...(absentRows.length ? [h('h3', { class: 'sk-label' }, 'Not Here'), ...absentRows] : []),
    ];
  };

  // ---- Game Details -------------------------------------------------------------------
  const detailsStep = (): Node[] => {
    const parks = h('datalist', { id: 'ng-parks' }, ...app.data.parks.map((p) => h('option', { value: p })));
    const opponents = [...new Set(team.games.map((g) => g.opponent).filter(Boolean))];
    const oppList = h('datalist', { id: 'ng-opponents' }, ...opponents.map((o) => h('option', { value: o })));
    const abbrField = textField('Short Name', choice.abbr, (v) => (choice.abbr = v.toUpperCase()), { maxlength: '5', autocapitalize: 'characters', placeholder: defaultAbbr(choice.opponent) || 'Up to 5 letters' });
    const abbrInput = abbrField.querySelector('input')!;
    const theirOrder = h('textarea', { class: 'sk-input ng-their', rows: '6', 'aria-label': 'Their Batting Order', placeholder: 'One name per line' });
    theirOrder.value = choice.theirOrder;
    theirOrder.addEventListener('input', () => {
      // Pasting "1. Smith" lists: drop the numbering.
      const cleaned = theirOrder.value.replace(/^\s*\d+[.)]\s*/gm, '');
      if (cleaned !== theirOrder.value) theirOrder.value = cleaned;
      choice.theirOrder = theirOrder.value;
    });
    const sameTheirs = h('button', { type: 'button', class: 'sk-key' }, 'Same as Last Time');
    sameTheirs.addEventListener('click', () => {
      const prev = app.lastGame(choice.opponent);
      if (!prev) return;
      choice.theirOrder = prev.setup.lineups.them.map((s) => s.player).join('\n');
      theirOrder.value = choice.theirOrder;
    });
    const theirBox = h('div', { class: 'sk-stack', hidden: choice.mode !== 'scorekeeper' }, h('p', { class: 'sk-field-label' }, 'Their Batting Order'), theirOrder, sameTheirs);

    const lastBackup = app.data.lastBackup;
    const backupOld = !lastBackup || Date.now() - lastBackup > 7 * 24 * 3600_000;
    const backUp = h('button', { type: 'button', class: 'sk-key' }, 'Back Up Now');
    backUp.addEventListener('click', () => void saveBackup(app).then(() => go('details')));
    const item = (ok: 'ok' | 'warn' | 'opt', label: string, note: string) =>
      h('li', { class: `ng-check-${ok}` }, h('span', { class: 'ng-mark', 'aria-hidden': 'true' }, ok === 'ok' ? '✓' : ok === 'warn' ? '!' : '•'), h('span', {}, h('strong', {}, label), ` ${note}`));
    const dup = duplicatePositions(order);
    const checklist = h(
      'ul',
      { class: 'ng-checklist', 'aria-label': 'Pregame Checklist' },
      item(choice.opponent.trim() ? 'ok' : 'warn', 'Opponent', choice.opponent.trim() || 'Add the opponent’s name.'),
      item(order.length >= 8 && !dup.length ? 'ok' : 'warn', 'Lineup', order.length ? `${order.length} batting${dup.length ? '; two players share a position' : ''}.` : 'The batting order is empty: go back to Lineup.'),
      item('ok', 'Game Settings', `${choice.mode === 'dugout' ? 'Dugout Mode' : 'Scorekeeper Mode'} · ${ruleSetById(choice.ruleSetId, app.data.ruleSets)?.name ?? 'Custom'}.`),
      item(backupOld ? 'warn' : 'ok', 'Backup', lastBackup ? `Last backup ${dayText(localDate(lastBackup))}.` : 'No backup yet.'),
    );

    return [
      group(
        'Game Details',
        textField('Opponent', choice.opponent, (v) => {
          choice.opponent = v;
          abbrInput.placeholder = defaultAbbr(v) || 'Up to 5 letters';
        }, { list: 'ng-opponents', autocapitalize: 'words', placeholder: 'Oak Hollow Sluggers' }),
        abbrField,
        textField('Date', choice.date, (v) => (choice.date = v), { type: 'date' }),
        textField('Park & Field', choice.park, (v) => (choice.park = v), { list: 'ng-parks', autocapitalize: 'words', placeholder: 'Rolland Moore Park #3' }),
        oppList,
        parks,
      ),
      group(
        'Scoring',
        segmented(
          'Mode',
          [
            { value: 'dugout', label: 'Dugout Mode' },
            { value: 'scorekeeper', label: 'Scorekeeper Mode' },
          ],
          choice.mode,
          (v) => {
            choice.mode = v;
            theirBox.hidden = v !== 'scorekeeper';
          },
        ),
        switchRow('Balls and Strikes', choice.count, (v) => (choice.count = v)),
        switchRow('Hit Location', choice.hitLocation, (v) => (choice.hitLocation = v)),
        theirBox,
      ),
      h(
        'details',
        { class: 'sk-details ng-rules' },
        h('summary', {}, 'League Rules'),
        rulesEditor(app, {
          rules: choice.rules,
          ruleSetId: choice.ruleSetId,
          onChange: (r, id) => {
            choice.rules = r;
            choice.ruleSetId = id;
          },
        }),
      ),
      h('h3', { class: 'sk-label' }, 'Pregame Checklist'),
      checklist,
      ...(backupOld ? [backUp] : []),
    ];
  };

  // ---- Coin toss --------------------------------------------------------------------------
  const tossStep = (): Node[] => {
    const dup = duplicatePositions(order);
    const blocked = !order.length ? 'Add players to the batting order first.' : dup.length ? `Two players at ${dup.map(posLabel).join(', ')}: fix that in Lineup first.` : '';
    const visitors = h('button', { type: 'button', class: 'sk-key sk-primary ng-toss' }, 'We’re Visitors (Bat First)');
    const home = h('button', { type: 'button', class: 'sk-key sk-primary ng-toss' }, 'We’re Home (Bat Second)');
    const start = (us: 'home' | 'away') => {
      if (blocked) return;
      app.startGame({
        opponent: choice.opponent,
        opponentAbbr: choice.abbr,
        us,
        mode: choice.mode,
        rules: choice.rules,
        ruleSetId: choice.ruleSetId,
        count: choice.count,
        hitLocation: choice.hitLocation,
        lineup: order,
        present: [...here],
        park: choice.park.trim(),
        date: choice.date,
        theirOrder: choice.mode === 'scorekeeper' ? choice.theirOrder.split('\n').map((x) => x.trim()).filter(Boolean) : [],
        ...(sched ? { scheduleId: sched.id } : {}),
      });
      sheet.close();
    };
    visitors.addEventListener('click', () => start('away'));
    home.addEventListener('click', () => start('home'));
    for (const b of [visitors, home]) if (blocked) b.setAttribute('aria-disabled', 'true');
    return [
      h('p', { class: 'sh-message' }, `${team.name} vs ${choice.opponent.trim() || 'Opponent'}${choice.park ? ` · ${choice.park}` : ''}`),
      ...(sched?.side ? [h('p', { class: 'ng-reminder' }, sched.side === 'home' ? 'The schedule has you at home.' : 'The schedule has you as visitors.')] : []),
      ...(blocked ? [h('p', { class: 'ng-blocked', role: 'status' }, blocked)] : []),
      h('p', { class: 'sk-row-note' }, 'The game and its clock start when you tap one.'),
      visitors,
      home,
    ];
  };

  const render = (): Node[] => {
    if (step === 'who') return whoStep();
    if (step === 'lineup') return lineupStep();
    if (step === 'details') return detailsStep();
    return tossStep();
  };

  const sheet = openSheet({ title: 'New Game', full: true, className: 'ng-sheet', body: [nav, content], cancel: 'Cancel' });
  go('who');
}

function ordinal(n: number): string {
  const s = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `${n}${s}`;
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

/**
 * Drag a row by its ☰ handle with a real finger (pointer events, the
 * handle has touch-action: none). The row follows the finger; it lands
 * where it's let go.
 */
function dragToReorder(handle: HTMLElement, list: HTMLElement, index: number, onDrop: (to: number) => void): void {
  let startY = 0;
  let dragging = false;
  let row: HTMLElement | null = null;
  handle.addEventListener('pointerdown', (e) => {
    row = handle.closest('li');
    if (!row) return;
    dragging = true;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
    row.classList.add('ng-dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging || !row) return;
    row.style.transform = `translateY(${e.clientY - startY}px)`;
  });
  const end = (e: PointerEvent) => {
    if (!dragging || !row) return;
    dragging = false;
    const dy = e.clientY - startY;
    row.style.transform = '';
    row.classList.remove('ng-dragging');
    const rowH = row.getBoundingClientRect().height + 6;
    const count = list.children.length;
    const to = Math.max(0, Math.min(count - 1, index + Math.round(dy / rowH)));
    if (Math.abs(dy) > 8) handle.dataset.dragged = '1';
    if (Math.abs(dy) > 8 && to !== index) {
      e.preventDefault();
      onDrop(to);
    }
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const inWords = (n: number) => SMALL[n] ?? String(n);

/** The note under Suggest Order, in a sentence (numbers one through nine spelled out). */
export function strongLine(strong: number, batting: number): string {
  if (strong === 0) return 'No strong bats yet: rate players 4 or 5 stars, or score a few games so OPS can pick them.';
  const have = `${inWords(strong).replace(/^./, (c) => c.toUpperCase())} strong ${strong === 1 ? 'bat' : 'bats'} (4 or 5 stars, or the best OPS when unrated).`;
  return batting ? `${have} With ${inWords(batting)} batting, you want ${inWords(strongNeeded(batting))}, one every third spot.` : have;
}
