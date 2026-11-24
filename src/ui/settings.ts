/*
 * Settings and Game Settings (SPEC §11). Each item opens its own screen;
 * ✕ or Done returns. Game Settings (the gear during a game) edits this
 * game only.
 */
import type { App } from '../app/app.ts';
import { CREDITS, HELP, PRIVACY } from '../content/help.ts';
import { TUNES } from '../sound/tunes.ts';
import { WHATS_NEW } from '../content/whats-new.ts';
import { switchHomeAway } from '../engine/edit.ts';
import { cloneRules, deleteRuleSet, ruleSetById } from '../engine/rules.ts';
import { APP_VERSION } from '../version.ts';
import { errorLines, readErrors } from '../app/errorlog.ts';
import { openBackup } from './backup.ts';
import { INK_NAMES } from './book/book.ts';
import { editRow, group, groupFooter, linkRow, pickerRow, segmented, shortDate, switchRow, textField } from './controls.ts';
import { rulesEditor } from './rules.ts';
import { openEditTeam } from './team/editteam.ts';
import { patch } from './teammark.ts';
import { colorsText, openOpponentColors } from './opponent.ts';
import { defaultAbbr } from '../store/model.ts';
import { h, setText } from './dom.ts';
import { LAYOUT_NAMES, currentLayout } from './layout.ts';
import { dayText, timeText } from './when.ts';
import { confirm, openSheet, choose } from './sheet.ts';
import { setTapRings } from './taps.ts';
import { awakeMethod } from './awake.ts';
import { openSounds } from './sound/sounds.ts';
import { discordStatus, openDiscord } from './share/share.ts';
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
  const team = app.team;
  // Apple's grouped list in ScoreKept's colors (Steve, Nov 17): each row is a title and its value,
  // grouped by the screen it changes; the few explanations left are short footers.
  const scorer = linkRow('Scorekeeper', () => openScorekeeper(app, () => setScorer()), d.scorerName || 'Not Set');
  const setScorer = () => {
    const v = scorer.querySelector('.sk-row-detail');
    if (v) v.textContent = app.data.scorerName || 'Not Set';
  };
  const sheet = openSheet({
    title: 'Settings',
    full: true,
    body: [
      group(
        'Team',
        (() => {
          // The team's patch, the small mark (Steve, Nov 17).
          const row = linkRow('Your Team', () => openEditTeam(app), undefined, teamSummary(app));
          // Like an iOS row icon (Steve, Nov 24): the title and value start right after it.
          if (app.team) {
            row.prepend(patch(app.team.abbr || defaultAbbr(app.team.name), app.team.colors.primary, app.team.colors.secondary, 44, 30));
            row.classList.add('sk-row-icon');
          }
          return row;
        })(),
        linkRow('Parks & Fields', () => openParks(app), String(d.parks.length)),
        (() => {
          // Its status as the row's value, like every other row (Steve, Nov 24).
          const row: HTMLButtonElement = linkRow('Discord', () => openDiscord(() => setText(row.querySelector('.sk-row-detail')!, discordStatus())), discordStatus());
          return row;
        })(),
        scorer,
      ),
      h(
        'section',
        { class: 'sk-group' },
        h('h3', { class: 'sk-label' }, 'Games'),
        h(
          'div',
          { class: 'sk-group-rows' },
          linkRow('New Game Defaults', () => openDefaults(app), undefined, defaultsSummary(app)),
          linkRow('Sounds & Walk-Up Songs', () => openSounds(app)),
        ),
        h('p', { class: 'sk-field-label sk-group-sub' }, 'Scoreboard Names'),
        segmented(
          'Scoreboard Names',
          [
            { value: 'full', label: 'Full Name' },
            { value: 'first', label: 'First Name Big' },
          ] as const,
          app.data.prefs.batterName ?? 'full',
          (v) => app.commit((d) => (d.prefs.batterName = v)),
        ),
        groupFooter('First Name Big sets the batter’s first name larger on the scoreboard.'),
      ),
      h(
        'section',
        { class: 'sk-group' },
        h('h3', { class: 'sk-label' }, 'Book'),
        h('p', { class: 'sk-field-label sk-group-sub' }, 'Ink'),
        // The same setting as the pencil menu on the Book (one source of truth).
        segmented(
          'Book Ink',
          (['pencil', 'black', 'blue'] as const).map((v) => ({ value: v, label: INK_NAMES[v] })),
          app.data.prefs.bookInk ?? 'pencil',
          (v) => app.commit((d) => (d.prefs.bookInk = v)),
        ),
        groupFooter('Outs stay in red pen; runs in highlighter.'),
        ...(team
          ? [
              h('p', { class: 'sk-field-label sk-group-sub' }, 'Book Names'),
              // Saved with the team, as before (moved here from Edit Team, Steve, Nov 17).
              segmented(
                'Book Names',
                [
                  { value: 'first', label: 'First' },
                  { value: 'last', label: 'Last' },
                ] as const,
                team.bookNames ?? 'first',
                (v) => app.updateTeam((t) => (t.bookNames = v)),
              ),
            ]
          : []),
      ),
      group(
        'Help',
        linkRow('Help & How to Score', openHelp),
        linkRow('What’s New', openWhatsNew, WHATS_NEW[0]?.headline),
        linkRow('Send Feedback', () => openFeedback()),
        linkRow('Privacy', openPrivacy),
        linkRow('About', openAbout),
        linkRow('Tutorials', () => openTutorials(app, close), `${TOURS.filter((t) => d.toursDone[t.id]).length} of ${TOURS.length}`),
        switchRow('Show Where Taps Land', d.prefs.tapRings, (v) => {
          setTapRings(v);
          app.commit((x) => (x.prefs.tapRings = v));
        }),
      ),
      group(
        'Your Data',
        linkRow('Backup & Restore', () => openBackup(app), d.lastBackup ? shortDate(d.lastBackup) : 'Never'),
        linkRow('Run the Welcome Setup Again', () => {
          close();
          openWelcome(app, { again: true });
        }),
        ...(inSafariTab() ? [linkRow('Add to Home Screen', () => openHomeScreenGuide())] : []),
      ),
      linkRow(`Version ${APP_VERSION}`, openWhatsNew),
    ],
    cancel: false,
  });
}

/** Park & Field taps through to its own screen: type one, or pick a park you've played at. */
function openParkPicker(app: App, current: string, pick: (park: string) => void): void {
  const sheet = openSheet({
    title: 'Park & Field',
    body: [
      textField('Park & Field', current, (v) => pick(v.trim()), { autocapitalize: 'words', placeholder: 'Rolland Moore Park #3' }),
      ...(app.data.parks.length
        ? [
            group(
              'Parks You’ve Played At',
              ...app.data.parks.map((park) =>
                linkRow(park, () => {
                  pick(park);
                  sheet.close();
                }),
              ),
            ),
          ]
        : []),
    ],
    cancel: false,
  });
}

/** The scorekeeper's name, in its own screen like the other rows (Steve, Nov 17). */
function openScorekeeper(app: App, done: () => void): void {
  openSheet({
    title: 'Scorekeeper',
    body: [
      textField('Scorekeeper Name', app.data.scorerName, (v) => app.commit((x) => (x.scorerName = v)), { placeholder: 'Your name', autocapitalize: 'words' }),
      groupFooter('Signs the Book and the shared pictures.'),
    ],
    cancel: false,
    onClose: done,
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
    cancel: false,
  });
}

export function openHelp(): void {
  openSheet({
    title: 'Help & How to Score',
    full: true,
    body: HELP.map((s) =>
      h(
        'details',
        { class: 'sk-details' },
        h('summary', {}, s.title),
        ...s.paragraphs.map((p) => h('p', {}, p)),
        s.link ? h('p', {}, 'Further reading: ', h('a', { class: 'sk-help-link', href: s.link.href, target: '_blank', rel: 'noopener' }, s.link.label)) : null,
      ),
    ),
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
    cancel: false,
  });
}

export function openGameSettings(app: App): void {
  const game = app.game;
  const s = app.state();
  if (!game || !s) return openSettings(app);
  const started = game.setup.startedAt ? new Date(game.setup.startedAt) : null;
  const hhmm = started ? `${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')}` : '';
  // One style with Settings (Steve, Nov 17): Apple's grouped rows, typed values edited in the row,
  // pickers tapping through with ›, and no boxed stacked fields.
  const date = h('input', { type: 'date', value: game.date, 'aria-label': 'Date' }) as HTMLInputElement;
  date.addEventListener('change', () => app.updateGame((g) => (g.date = date.value || g.date)));
  const clock = h('input', { type: 'time', value: hhmm, step: '60', 'aria-label': 'Clock Started At' }) as HTMLInputElement;
  clock.addEventListener('change', () => {
    const v = clock.value.slice(0, 5);
    if (!started || !/^\d{2}:\d{2}$/.test(v)) return;
    const [hh, mm] = v.split(':').map(Number) as [number, number];
    const t = new Date(started);
    t.setHours(hh, mm, 0, 0);
    app.updateGame((g) => (g.setup.startedAt = t.getTime()));
  });
  // The opponent is a saved team (Steve, Nov 17): renaming it points the game at the saved opponent
  // with that name, or a new one; its colors open in their own screen.
  const opponentRow = editRow('Opponent', game.opponent, (v) => app.updateGame((g) => (g.opponent = v.trim() || g.opponent)), { autocapitalize: 'words' });
  opponentRow.querySelector('input')?.addEventListener('change', () => {
    app.relinkOpponent(game.id);
    drawColors();
  });
  const colorsRow = linkRow('Opponent Colors', () => {
    const o = app.opponentOf(app.game ?? game);
    if (o) openOpponentColors(app, o.id, drawColors);
  }, app.opponentOf(game) ? colorsText(app.opponentOf(game)!) : 'Not Set');
  const drawColors = () => {
    const o = app.opponentOf(app.game ?? game);
    colorsRow.querySelector('.tm-patch')?.remove();
    const v = colorsRow.querySelector('.sk-row-detail');
    if (v) v.textContent = o ? colorsText(o) : 'Not Set';
    if (o) colorsRow.prepend(patch(o.abbr, o.colors.primary, o.colors.secondary, 44, 30));
  };
  drawColors();
  const parkRow = linkRow('Park & Field', () => openParkPicker(app, game.park, (park) => {
    app.updateGame((g) => (g.park = park));
    const v = parkRow.querySelector('.sk-row-detail');
    if (v) v.textContent = park || 'None';
  }), game.park || 'None');
  const parts: Node[] = [
    group(
      'This Game',
      opponentRow,
      editRow('Short Name', game.opponentAbbr, (v) => app.updateGame((g) => (g.opponentAbbr = v.trim().toUpperCase().slice(0, 6) || g.opponentAbbr)), { maxlength: '6', autocapitalize: 'characters' }),
      colorsRow,
      parkRow,
      pickerRow('Date', game.date ? dayText(game.date) : '', date, (v) => (v ? dayText(v) : '')),
    ),
    h(
      'section',
      { class: 'sk-group' },
      h('h3', { class: 'sk-label' }, 'Mode'),
      segmented('Mode', MODES, s.mode, (v) => app.setMode(v)),
      groupFooter('Dugout Mode keeps the other team’s half-innings as totals; Scorekeeper Mode scores every batter.'),
    ),
    group(
      'Scoring',
      switchRow('Balls and Strikes', game.setup.count, (v) => app.updateGame((g) => (g.setup.count = v))),
      switchRow('Hit Location', game.setup.hitLocation, (v) => app.updateGame((g) => (g.setup.hitLocation = v))),
      // No Screen Layout row until there's a real choice to make (Steve, Nov 24); feedback still names it.
    ),
    h(
      'section',
      { class: 'sk-group' },
      h('h3', { class: 'sk-label' }, 'Game Clock'),
      h('div', { class: 'sk-group-rows' }, pickerRow('Clock Started At', timeText(hhmm), clock, (v) => timeText(v.slice(0, 5)))),
      groupFooter('The clock started at the coin toss. Undo never resets it.'),
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

  const sheet = openSheet({ title: 'Game Settings', full: true, body: parts, cancel: false });
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
  openSheet({ title: 'Parks & Fields', body: list, cancel: false });
}

/**
 * Send Feedback (SPEC §11): write it, then Copy it to paste into a text,
 * email, or Discord. The version and screen layout are added so it's clear
 * what was running, and (beta, Nov 15) the recent error log when there is
 * one. Email It joins when Steve picks an address (BACKLOG).
 */
function openFeedback(): void {
  let note = '';
  const kv = safeStorage();
  const errors = kv ? readErrors(kv) : [];
  let withLog = errors.length > 0;
  const status = h('p', { class: 'sh-status', role: 'status' });
  const box = h('textarea', { id: 'fb-note', class: 'sk-input fb-note', rows: '6', placeholder: 'What happened, or what would help?' });
  box.addEventListener('input', () => (note = box.value));
  const when = (at: number) => `${shortDate(at)} ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  const copy = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Copy');
  copy.addEventListener('click', async () => {
    const log = withLog && errors.length ? `\n\nRecent problems:\n${errorLines(errors, when).join('\n')}` : '';
    const text = `${note.trim()}\n\nScoreKept ${APP_VERSION} · ${LAYOUT_NAMES[currentLayout()]}${log}`;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied. Paste it in a text, an email, or Discord.';
    } catch {
      box.value = text;
      box.select();
      status.textContent = 'Copying isn’t allowed here. The note is selected: copy it from the menu.';
    }
  });
  const count = errors.length === 1 ? 'One problem was' : `${errors.length < 10 ? ['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][errors.length] : errors.length} problems were`;
  const log = errors.length
    ? [
        switchRow('Include Error Log', withLog, (v) => (withLog = v), `${count} noted on this iPhone, the latest ${when(errors[errors.length - 1]!.at)}. Adds what broke and when, to help track it down. No names or scores.`),
        h('details', { class: 'sk-details fb-log' }, h('summary', {}, 'Show the Error Log'), h('ul', {}, ...errorLines(errors, when).map((l) => h('li', {}, l)))),
      ]
    : [h('p', { class: 'sk-row-note' }, 'No problems noted on this iPhone. If something breaks, a short line about it is kept here to add to your note.')];
  openSheet({
    title: 'Send Feedback',
    body: [h('div', { class: 'sk-field' }, h('label', { for: 'fb-note', class: 'sk-field-label' }, 'Your Note'), box), ...log, copy, status],
    cancel: false,
  });
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}


/** About (Steve, Nov 16): the version, the credits, and the way to Privacy. */
function openAbout(): void {
  const privacy = h('button', { type: 'button', class: 'sk-key' }, 'Privacy');
  privacy.addEventListener('click', openPrivacy);
  openSheet({
    title: 'About',
    body: [
      h('p', {}, h('strong', {}, 'ScoreKept'), ` ${APP_VERSION}`),
      h('p', {}, 'A softball scorebook for iPhone and iPad. No account, and everything stays on this iPhone.'),
      ...CREDITS.map((c) => h('section', { class: 'sk-group' }, h('h3', { class: 'sk-label' }, c.title), ...c.lines.map((l) => h('p', {}, l)))),
      // Every tune read from sheet music, with its publisher and the library that holds the scan.
      h(
        'section',
        { class: 'sk-group' },
        h('h3', { class: 'sk-label' }, 'From the Sheet Music'),
        h('ul', { class: 'ab-sheets' }, ...TUNES.filter((t) => t.published).map((t) => h('li', {}, h('strong', {}, t.name), `, ${t.artist}. ${t.published}. ${t.library ?? ''}`.replace(/\. $/, '.')))),
      ),
      privacy,
    ],
    cancel: false,
  });
}

function openPrivacy(): void {
  openSheet({ title: 'Privacy', body: PRIVACY.map((p) => h('p', {}, p)), cancel: false });
}
