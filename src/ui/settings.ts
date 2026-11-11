/*
 * Settings and Game Settings (SPEC §11). Each item opens its own screen;
 * ✕ or Done returns. Game Settings (the gear during a game) edits this
 * game only.
 */
import type { App } from '../app/app.ts';
import { HELP } from '../content/help.ts';
import { WHATS_NEW } from '../content/whats-new.ts';
import { switchHomeAway } from '../engine/edit.ts';
import { allRuleSets, cloneRules, ruleSetById } from '../engine/rules.ts';
import { APP_VERSION } from '../version.ts';
import { openBackup } from './backup.ts';
import { group, infoRow, linkRow, segmented, selectField, switchRow, textField } from './controls.ts';
import { h } from './dom.ts';
import { LAYOUT_NAMES, currentLayout } from './layout.ts';
import { confirm, openSheet, choose } from './sheet.ts';
import { setTapRings } from './taps.ts';

const MODES = [
  { value: 'dugout' as const, label: 'Dugout Mode' },
  { value: 'scorekeeper' as const, label: 'Scorekeeper Mode' },
];

export function openSettings(app: App): void {
  const d = app.data;
  openSheet({
    title: 'Settings',
    full: true,
    body: [
      group(
        'Team',
        textField('Scorekeeper Name', d.scorerName, (v) => app.commit((x) => (x.scorerName = v)), { placeholder: 'Your name', autocapitalize: 'words' }),
      ),
      group('Games', linkRow('New Game Defaults', () => openDefaults(app))),
      group(
        'Help',
        linkRow('Help & How to Score', openHelp),
        linkRow('What’s New', openWhatsNew),
        switchRow(
          'Show Where Taps Land',
          d.prefs.tapRings,
          (v) => {
            setTapRings(v);
            app.commit((x) => (x.prefs.tapRings = v));
          },
          'Draws a ring where each tap lands, to check taps on your iPhone.',
        ),
      ),
      group('Your Data', linkRow('Backup & Restore', () => openBackup(app))),
      linkRow(`Version ${APP_VERSION}`, openWhatsNew),
    ],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

function openDefaults(app: App): void {
  const d = app.data.defaults;
  const sets = allRuleSets(app.data.ruleSets);
  openSheet({
    title: 'New Game Defaults',
    body: [
      segmented('Mode', MODES, d.mode, (v) => app.commit((x) => (x.defaults.mode = v))),
      switchRow('Hit Location', d.hitLocation, (v) => app.commit((x) => (x.defaults.hitLocation = v)), 'Tap the field after each ball in play. Fielding and spray charts count only these plays.'),
      switchRow('Fielder Buttons', d.fielderButtons, (v) => app.commit((x) => (x.defaults.fielderButtons = v)), 'Use numbered fielder buttons instead of the field.'),
      switchRow('Balls and Strikes', d.balls, (v) => app.commit((x) => (x.defaults.balls = v)), 'Off: one tap per batter. On: a row of Ball, Look, Swing, and Foul.'),
      selectField(
        'Rule Set',
        sets.map((s) => ({ value: s.id, label: s.name })),
        d.ruleSetId,
        (id) =>
          app.commit((x) => {
            const set = ruleSetById(id, x.ruleSets);
            if (!set) return;
            x.defaults.ruleSetId = id;
            x.defaults.rules = cloneRules(set.rules);
            x.defaults.innings = set.rules.innings;
          }),
      ),
    ],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

export function openHelp(): void {
  openSheet({
    title: 'Help & How to Score',
    full: true,
    body: HELP.map((s) => h('details', { class: 'sk-details' }, h('summary', {}, s.title), ...s.paragraphs.map((p) => h('p', {}, p)))),
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

export function openWhatsNew(): void {
  openSheet({
    title: 'What’s New',
    full: true,
    body: WHATS_NEW.map((e) =>
      h('section', { class: 'sk-news' }, h('h3', { class: 'sk-news-head' }, e.headline), h('p', { class: 'sk-row-note' }, `Version ${e.version}`), ...e.lines.map((l) => h('p', {}, l))),
    ),
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

export function openGameSettings(app: App): void {
  const game = app.game;
  const s = app.state();
  if (!game || !s) return openSettings(app);
  const set = ruleSetById(game.ruleSetId ?? '', app.data.ruleSets);
  const parts: Node[] = [
    group(
      'This Game',
      infoRow('Opponent', game.opponent),
      segmented('Mode', MODES, s.mode, (v) => app.setMode(v)),
      switchRow('Balls and Strikes', game.setup.count, (v) => app.updateGame((g) => (g.setup.count = v))),
      switchRow('Hit Location', game.setup.hitLocation, (v) => app.updateGame((g) => (g.setup.hitLocation = v))),
      infoRow('Rules', set?.name ?? 'Custom'),
      game.setup.startedAt && game.setup.rules.timeLimit
        ? infoRow('Game Clock', `${game.setup.rules.timeLimit} minutes from ${new Date(game.setup.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`)
        : document.createTextNode(''),
      infoRow('Screen Layout', LAYOUT_NAMES[currentLayout()]),
    ),
  ];

  const swap = h('button', { type: 'button', class: 'sk-key' }, game.setup.us === 'away' ? 'Switch to Home' : 'Switch to Visitors');
  const end = h('button', { type: 'button', class: 'sk-key' }, 'End Game Now');
  const del = h('button', { type: 'button', class: 'sk-quiet-danger' }, 'Delete Game');
  const all = h('button', { type: 'button', class: 'sk-key' }, 'All Settings');
  parts.push(h('div', { class: 'sk-stack' }, swap, end, all, del));

  const sheet = openSheet({ title: 'Game Settings', full: true, body: parts, done: { label: 'Done', onClick: () => undefined }, cancel: false });
  swap.addEventListener('click', async () => {
    const result = switchHomeAway(game);
    if (!result.ok) {
      await choose('Switch at the End of an Inning', [{ label: 'OK', value: true }], 'Halfway through an inning, the other half hasn’t happened yet. Switch home and away when this inning ends.');
      return;
    }
    if (!(await confirm('Switch Home and Away?', 'Every play moves to the other half of its inning. Stats stay with the right team.', 'Switch', false))) return;
    app.updateGame((g) => {
      g.setup = result.game.setup;
      g.events = result.game.events;
    });
    sheet.close();
  });
  end.addEventListener('click', async () => {
    if (!(await confirm('End Game Now?', 'The game ends with the score as it is.', 'End Game'))) return;
    app.addEvent({ t: 'end' });
    sheet.close();
  });
  del.addEventListener('click', async () => {
    if (!(await confirm('Delete This Game?', 'Every play in this game will be deleted. This can’t be undone.', 'Delete Game'))) return;
    app.deleteCurrentGame();
    sheet.close();
  });
  all.addEventListener('click', () => {
    sheet.close();
    openSettings(app);
  });
}
