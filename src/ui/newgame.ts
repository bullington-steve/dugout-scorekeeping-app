/*
 * New Game, the simple version for Phase 3: opponent, mode, rules, count,
 * hit location, who's here, then the coin toss. The batting order follows
 * the roster; the full lineup builder (drag, groups, Auto-Fill) is Phase 4.
 * See docs/SPEC.md §4.
 */
import { quickLineup, type App } from '../app/app.ts';
import { allRuleSets, cloneRules, ruleSetById } from '../engine/rules.ts';
import { openBackup } from './backup.ts';
import { group, segmented, selectField, switchRow, textField } from './controls.ts';
import { h, setAttr, setText } from './dom.ts';
import { openSheet } from './sheet.ts';

export function openNewGame(app: App): void {
  const d = app.data.defaults;
  const choice = {
    opponent: '',
    abbr: '',
    mode: d.mode,
    ruleSetId: d.ruleSetId,
    rules: cloneRules(d.rules),
    count: d.balls,
    hitLocation: d.hitLocation,
  };
  const team = app.team;
  const players = (team?.players ?? []).filter((p) => !p.reserve);
  const here = new Set(players.map((p) => p.id));

  const count = h('p', { class: 'sk-row-note', 'aria-live': 'polite' });
  const refreshCount = () => {
    const n = here.size;
    setText(count, `${n} of ${players.length} here.${n < 8 ? ' Fort Collins needs at least 8 to start.' : ''}`);
  };

  const whoParts: Node[] = [];
  if (players.length) {
    refreshCount();
    whoParts.push(
      count,
      h(
        'div',
        { class: 'ng-who' },
        ...players.map((p) => {
          const b = h('button', { type: 'button', class: 'sk-row ng-player', 'aria-pressed': 'true' }, h('span', { class: 'ng-check', 'aria-hidden': 'true' }, '✓'), h('span', { class: 'sk-row-label' }, p.name));
          b.addEventListener('click', () => {
            if (here.has(p.id)) here.delete(p.id);
            else here.add(p.id);
            setAttr(b, 'aria-pressed', String(here.has(p.id)));
            refreshCount();
          });
          return b;
        }),
      ),
      h('p', { class: 'sk-row-note' }, 'The batting order follows the roster order.'),
    );
  } else {
    const restore = h('button', { type: 'button', class: 'sk-key' }, 'Restore from Backup');
    restore.addEventListener('click', () => {
      sheet.close();
      openBackup(app);
    });
    whoParts.push(h('p', { class: 'sh-message' }, 'No team yet. Bring yours in from a backup, or start with ten fill-in players and rename them later.'), restore);
  }

  const sets = allRuleSets(app.data.ruleSets);
  const visitors = h('button', { type: 'button', class: 'sk-key sk-primary ng-toss' }, 'We’re Visitors (Bat First)');
  const home = h('button', { type: 'button', class: 'sk-key sk-primary ng-toss' }, 'We’re Home (Bat Second)');
  const start = (us: 'home' | 'away') => {
    const t = app.ensureTeam();
    const roster = t.players.filter((p) => !p.reserve);
    const present = players.length ? here : new Set(roster.map((p) => p.id));
    app.startGame({
      opponent: choice.opponent,
      opponentAbbr: choice.abbr,
      us,
      mode: choice.mode,
      rules: choice.rules,
      count: choice.count,
      hitLocation: choice.hitLocation,
      lineup: quickLineup(roster, present),
      present: [...present],
    });
    sheet.close();
  };
  visitors.addEventListener('click', () => start('away'));
  home.addEventListener('click', () => start('home'));

  const sheet = openSheet({
    title: 'New Game',
    full: true,
    body: [
      group(
        'Game Details',
        textField('Opponent', '', (v) => (choice.opponent = v), { placeholder: 'Oak Hollow Sluggers', autocapitalize: 'words' }),
        textField('Short Name', '', (v) => (choice.abbr = v), { placeholder: 'Up to 5 letters', maxlength: '5', autocapitalize: 'characters' }),
        segmented(
          'Mode',
          [
            { value: 'dugout', label: 'Dugout Mode' },
            { value: 'scorekeeper', label: 'Scorekeeper Mode' },
          ],
          choice.mode,
          (v) => (choice.mode = v),
        ),
        selectField(
          'Rule Set',
          sets.map((s) => ({ value: s.id, label: s.name })),
          choice.ruleSetId,
          (id) => {
            const set = ruleSetById(id, app.data.ruleSets);
            if (!set) return;
            choice.ruleSetId = id;
            choice.rules = cloneRules(set.rules);
          },
        ),
        switchRow('Balls and Strikes', choice.count, (v) => (choice.count = v)),
        switchRow('Hit Location', choice.hitLocation, (v) => (choice.hitLocation = v)),
      ),
      group('Who’s Here', ...whoParts),
      group('Coin Toss', h('p', { class: 'sk-row-note' }, 'The game and its clock start when you tap one.'), visitors, home),
    ],
    cancel: 'Cancel',
  });
}
