/*
 * Settings and Game Settings (SPEC §11). Each item opens its own screen;
 * ✕ or Done returns. Game Settings (the gear during a game) edits this
 * game only.
 */
import type { App } from '../app/app.ts';
import { HELP } from '../content/help.ts';
import { WHATS_NEW } from '../content/whats-new.ts';
import { switchHomeAway } from '../engine/edit.ts';
import { cloneRules, deleteRuleSet, ruleSetById } from '../engine/rules.ts';
import { APP_VERSION } from '../version.ts';
import { openBackup } from './backup.ts';
import { INK_NAMES } from './book/book.ts';
import { group, infoRow, linkRow, segmented, shortDate, switchRow, textField } from './controls.ts';
import { rulesEditor } from './rules.ts';
import { openEditTeam } from './team/editteam.ts';
import { h } from './dom.ts';
import { LAYOUT_NAMES, currentLayout } from './layout.ts';
import { confirm, openSheet, choose } from './sheet.ts';
import { setTapRings } from './taps.ts';
import { awakeMethod } from './awake.ts';
import { openSounds } from './sound/sounds.ts';
import { discordTile, openDiscord } from './share/share.ts';
import { inSafariTab } from './platform.ts';
import { openHomeScreenGuide } from './welcome/homescreen.ts';
import { TOURS, openTutorials } from './welcome/tours.ts';
import { openWelcome } from './welcome/welcome.ts';

const MODES = [
  { value: 'dugout' as const, label: 'Dugout Mode' },
  { value: 'scorekeeper' as const, label: 'Scorekeeper Mode' },
];

/** "Diamond Dogs · 11 players". */
function teamSummary(app: App): string {
  const t = app.team;
  if (!t) return 'Set up your team’s name and colors.';
  const n = t.players.filter((p) => !p.reserve).length;
  return `${t.name} · ${n} ${n === 1 ? 'player' : 'players'}`;
}

/** "Dugout Mode · 7 innings · Fort Collins: 2+ HR Division". */
function defaultsSummary(app: App): string {
  const d = app.data.defaults;
  const rules = ruleSetById(d.ruleSetId, app.data.ruleSets)?.name ?? 'custom rules';
  return [d.mode === 'dugout' ? 'Dugout Mode' : 'Scorekeeper Mode', `${d.innings} innings`, rules].join(' · ');
}

export function openSettings(app: App): void {
  const d = app.data;
  const close = () => sheet.close();
  const sheet = openSheet({
    title: 'Settings',
    full: true,
    body: [
      group(
        'Team',
        linkRow('Your Team', () => openEditTeam(app), undefined, teamSummary(app)),
        linkRow('Parks & Fields', () => openParks(app), String(d.parks.length), 'Parks you’ve played at, ready to pick in New Game.'),
        (() => {
          const row = linkRow('Discord', () => openDiscord(), undefined, 'Post the weekly Who’s In? poll and game recaps to your team’s channels.');
          row.prepend(discordTile());
          return row;
        })(),
        textField('Scorekeeper Name', d.scorerName, (v) => app.commit((x) => (x.scorerName = v)), { placeholder: 'Your name', autocapitalize: 'words' }),
      ),
      group(
        'Games',
        linkRow('New Game Defaults', () => openDefaults(app), undefined, defaultsSummary(app)),
        linkRow('Sounds & Walk-Up Songs', () => openSounds(app), undefined, 'Game sounds, situation sounds, between-innings music, and walk-ups.'),
      ),
      group(
        'Book',
        segmented(
          'Book Ink',
          (['pencil', 'black', 'blue'] as const).map((v) => ({ value: v, label: INK_NAMES[v] })),
          app.data.prefs.bookInk ?? 'pencil',
          (v) => app.commit((d) => (d.prefs.bookInk = v)),
        ),
        h('p', { class: 'sk-row-note' }, 'The whole Book is written in one ink, and changing it redraws every game. Outs stay in red pen and runs in highlighter.'),
      ),
      group(
        'Help',
        linkRow('Help & How to Score', openHelp, undefined, 'Starting a game, every scoring button, the Book, the Defense card, and keeping your data safe.'),
        linkRow('What’s New', openWhatsNew, undefined, WHATS_NEW[0]?.headline),
        linkRow('Tutorials', () => openTutorials(app, close), undefined, `${TOURS.filter((t) => d.toursDone[t.id]).length} of ${TOURS.length} finished. Short walk-throughs that light up the real buttons.`),
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
      group(
        'Your Data',
        linkRow('Backup & Restore', () => openBackup(app), undefined, d.lastBackup ? `Last backup ${shortDate(d.lastBackup)}.` : 'No backup yet. Save one after every game.'),
        linkRow('Run the Welcome Setup Again', () => {
          close();
          openWelcome(app, { again: true });
        }, undefined, 'The welcome screen and setup, with your team as it is.'),
        ...(inSafariTab() ? [linkRow('Add to Home Screen', () => openHomeScreenGuide(), undefined, 'Safari can clear a website’s data after a week. On the Home Screen it’s kept.')] : []),
      ),
      linkRow(`Version ${APP_VERSION}`, openWhatsNew),
    ],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

function openDefaults(app: App): void {
  const d = app.data.defaults;
  openSheet({
    title: 'New Game Defaults',
    full: true,
    body: [
      segmented('Mode', MODES, d.mode, (v) => app.commit((x) => (x.defaults.mode = v))),
      switchRow('Hit Location', d.hitLocation, (v) => app.commit((x) => (x.defaults.hitLocation = v)), 'Tap the field after each ball in play. Fielding and spray charts count only these plays.'),
      switchRow('Fielder Buttons', d.fielderButtons, (v) => app.commit((x) => (x.defaults.fielderButtons = v)), 'Use numbered fielder buttons instead of the field.'),
      switchRow('Balls and Strikes', d.balls, (v) => app.commit((x) => (x.defaults.balls = v)), 'Off: one tap per batter. On: a row of Ball, Look, Swing, and Foul.'),
      switchRow(
        'Keep the Screen On During Games',
        d.keepAwake,
        (v) => app.commit((x) => (x.defaults.keepAwake = v)),
        awakeMethod() === 'wake-lock'
          ? 'Only while a game is in progress. This iPhone keeps the screen on by itself.'
          : 'Only while a game is in progress. This iPhone needs a tiny silent video playing to stay on; it starts with your first tap in a game.',
      ),
      h('h3', { class: 'sk-label' }, 'League Rules'),
      rulesEditor(app, {
        rules: d.rules,
        ruleSetId: d.ruleSetId,
        onChange: (rules, id) =>
          app.commit((x) => {
            x.defaults.rules = cloneRules(rules);
            x.defaults.ruleSetId = id;
            x.defaults.innings = rules.innings;
          }),
      }),
      ...savedSetRows(app),
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
  const started = game.setup.startedAt ? new Date(game.setup.startedAt) : null;
  const hhmm = started ? `${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')}` : '';
  const parks = h('datalist', { id: 'gs-parks' }, ...app.data.parks.map((p) => h('option', { value: p })));
  const parts: Node[] = [
    group(
      'This Game',
      textField('Opponent', game.opponent, (v) => app.updateGame((g) => (g.opponent = v.trim() || g.opponent)), { autocapitalize: 'words' }),
      textField('Short Name', game.opponentAbbr, (v) => app.updateGame((g) => (g.opponentAbbr = v.trim().toUpperCase().slice(0, 5) || g.opponentAbbr)), { maxlength: '5', autocapitalize: 'characters' }),
      textField('Park & Field', game.park, (v) => app.updateGame((g) => (g.park = v.trim())), { list: 'gs-parks', autocapitalize: 'words' }),
      parks,
      textField('Date', game.date, (v) => app.updateGame((g) => (g.date = v || g.date)), { type: 'date' }),
      segmented('Mode', MODES, s.mode, (v) => app.setMode(v)),
      switchRow('Balls and Strikes', game.setup.count, (v) => app.updateGame((g) => (g.setup.count = v))),
      switchRow('Hit Location', game.setup.hitLocation, (v) => app.updateGame((g) => (g.setup.hitLocation = v))),
      infoRow('Screen Layout', LAYOUT_NAMES[currentLayout()]),
    ),
    group(
      'Game Clock',
      textField('Clock Started At', hhmm, (v) => {
        if (!started || !/^\d{2}:\d{2}$/.test(v)) return;
        const [hh, mm] = v.split(':').map(Number) as [number, number];
        const t = new Date(started);
        t.setHours(hh, mm, 0, 0);
        app.updateGame((g) => (g.setup.startedAt = t.getTime()));
      }, { type: 'time' }),
      h('p', { class: 'sk-row-note' }, 'The clock started at the coin toss. Undo never resets it.'),
    ),
    h(
      'details',
      { class: 'sk-details' },
      h('summary', {}, 'League Rules for This Game'),
      rulesEditor(app, {
        rules: game.setup.rules,
        ruleSetId: game.ruleSetId ?? 'custom',
        onChange: (rules, id) =>
          app.updateGame((g) => {
            g.setup.rules = rules;
            g.ruleSetId = id;
          }),
      }),
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

/** Saved rule sets, each with a quiet Delete (built-ins can't be deleted). */
function savedSetRows(app: App): Node[] {
  if (!app.data.ruleSets.length) return [];
  return [
    h('h3', { class: 'sk-label' }, 'Your Rule Sets'),
    ...app.data.ruleSets.map((set) => {
      const del = h('button', { type: 'button', class: 'sk-quiet-danger', 'aria-label': `Delete ${set.name}` }, 'Delete');
      const row = h('div', { class: 'sk-row' }, h('span', { class: 'sk-row-label' }, set.name), del);
      del.addEventListener('click', async () => {
        if (!(await confirm('Delete This Rule Set?', `${set.name} goes away. Games played with it keep their rules.`, 'Delete'))) return;
        app.commit((d) => (d.ruleSets = deleteRuleSet(d.ruleSets, set.id)));
        row.remove();
      });
      return row;
    }),
  ];
}

/** Parks & Fields: past entries, most recent first, each deletable. */
function openParks(app: App): void {
  const list = h('div', { class: 'sk-stack' });
  const draw = () =>
    list.replaceChildren(
      ...(app.data.parks.length
        ? app.data.parks.map((park) => {
            const del = h('button', { type: 'button', class: 'sk-quiet-danger', 'aria-label': `Delete ${park}` }, 'Delete');
            del.addEventListener('click', async () => {
              if (!(await confirm('Delete This Park?', `${park} comes off the list. Games played there keep it.`, 'Delete'))) return;
              app.deletePark(park);
              draw();
            });
            return h('div', { class: 'sk-row' }, h('span', { class: 'sk-row-label' }, park), del);
          })
        : [h('p', { class: 'sk-row-note' }, 'Parks you type in New Game show up here.')]),
    );
  draw();
  openSheet({ title: 'Parks & Fields', body: list, done: { label: 'Done', onClick: () => undefined }, cancel: false });
}
