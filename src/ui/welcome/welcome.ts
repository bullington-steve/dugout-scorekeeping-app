/*
 * First launch (SPEC §12): the intro (PLAY BALL!), the welcome screen, and
 * setup. Each is a full-screen layer over the app; the app underneath is
 * already running, so leaving at any point lands somewhere real.
 */
import type { App } from '../../app/app.ts';
import { BUILT_IN_RULE_SETS } from '../../engine/rules.ts';
import { defaultAbbr, newId, type Player } from '../../store/model.ts';
import { APP_VERSION } from '../../version.ts';
import { announce } from '../announce.ts';
import { openBackup } from '../backup.ts';
import { INK_NAMES } from '../book/book.ts';
import { selectField, switchRow, textField } from '../controls.ts';
import { h, setAttr } from '../dom.ts';
import { icon } from '../icons.ts';
import { BulbText } from '../game/bulbs.ts';
import { drawBase } from '../game/board.ts';
import { goTo } from '../nav.ts';
import { openNewGame } from '../newgame.ts';
import { reduceMotion } from '../platform.ts';
import { loadSample } from '../sample.ts';
import { colorGroups, scorebugPreview } from '../team/editteam.ts';
import { POSITION_OPTIONS } from '../team/player.ts';
import { startTour } from './tours.ts';
import { prepareIntroSounds } from './sounds.ts';

/** The app behind a full-screen layer is out of reach: no taps, and VoiceOver skips it. */
export function coverApp(covered: boolean): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.inert = covered;
  if (covered) app.setAttribute('aria-hidden', 'true');
  else app.removeAttribute('aria-hidden');
}

function layer(cls: string, label: string, ...children: Node[]): HTMLElement {
  const el = h('div', { class: `wl-layer ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, ...children);
  document.body.append(el);
  document.documentElement.classList.add('sheet-open');
  coverApp(true);
  return el;
}

function closeLayer(el: HTMLElement): void {
  el.remove();
  if (!document.querySelector('.wl-layer')) coverApp(false);
  if (!document.querySelector('.wl-layer, .sh-layer')) document.documentElement.classList.remove('sheet-open');
}

/** The app's own Home Screen icon, the Board Green diamond (Steve, Nov 25: it replaces the old book mark). */
function appIcon(): HTMLElement {
  return h('img', { class: 'wl-icon', src: `${import.meta.env.BASE_URL}icons/icon-192.png`, alt: '', width: '104', height: '104', 'aria-hidden': 'true' });
}

// ---- intro -----------------------------------------------------------------------------------

/**
 * PLAY BALL!: a tap (so iOS will play sound), the bat and the crowd, the runner rounding a little
 * scoreboard's bases, then the welcome. With Reduce Motion the same screen stands still, and the
 * tap plays the bat crack and goes straight to the welcome (Steve, Nov 25).
 */
export function playIntro(app: App, then: () => void): void {
  const still = reduceMotion();
  const sounds = prepareIntroSounds();
  // A little board in the painted-sign frame: the real bases, and R and H in bulbs (Steve, Nov 25).
  const base = (name: string) => h('span', { class: `gm-base wl-base wl-base-${name}`, 'aria-hidden': 'true' }, drawBase());
  const bases = { first: base('first'), second: base('second'), third: base('third'), home: base('home') };
  const runs = new BulbText('0', 'wl-bulbs');
  const hits = new BulbText('0', 'wl-bulbs');
  runs.set('4');
  hits.set('6');
  const board = h(
    'div',
    { class: 'wl-mini', 'aria-hidden': 'true' },
    h('div', { class: 'wl-diamond' }, bases.second, bases.third, bases.first, bases.home),
    h(
      'div',
      { class: 'wl-count' },
      h('span', { class: 'wl-count-label' }, 'R'),
      h('span', { class: 'gm-housing' }, runs.el),
      h('span', { class: 'wl-count-label' }, 'H'),
      h('span', { class: 'gm-housing' }, hits.el),
    ),
  );
  const play = h('button', { type: 'button', class: 'wl-play' }, 'PLAY BALL!');
  const mark = appIcon();
  const el = layer('wl-intro', 'ScoreKept', h('div', { class: 'wl-intro-top' }, mark, h('h1', { class: 'sk-wordmark wl-name' }, 'ScoreKept')), h('div', { class: 'wl-intro-side' }, board, play));
  play.focus();

  const leave = () => {
    el.classList.add('wl-leaving');
    setTimeout(
      () => {
        closeLayer(el);
        then();
      },
      still ? 0 : 350,
    );
  };
  play.addEventListener('click', async () => {
    play.disabled = true;
    (await sounds).play();
    if (still) {
      // No motion: the bat crack, then the welcome.
      leave();
      return;
    }
    mark.classList.add('wl-hop');
    const order = [bases.first, bases.second, bases.third, bases.home];
    order.forEach((b, i) => {
      setTimeout(() => {
        for (const o of order) o.classList.remove('on');
        b.classList.add('on');
        if (i === 0) hits.set('7');
        if (i === 3) runs.set('5');
      }, 300 + i * 800);
    });
    setTimeout(() => {
      for (const o of order) o.classList.remove('on');
    }, 300 + 4 * 800);
    setTimeout(leave, 300 + 4 * 800 + 700);
  });
  void app;
}

// ---- welcome ---------------------------------------------------------------------------------

export function openWelcome(app: App, opts: { again?: boolean } = {}): void {
  // One plain line instead of pills that looked tappable (Steve, Nov 25).
  const features = 'Live Scoring · The Book · Season Stats · Spray Charts · Walk-Up Songs · Defense Card';
  const setUp = h('button', { type: 'button', class: 'sk-key sk-primary wl-big' }, 'Set Up My Team');
  const look = h('button', { type: 'button', class: 'sk-key wl-big', hidden: !app.isEmpty }, 'Look Around with Sample Data First');
  // Tool buttons, not underlined links (Steve, Nov 25).
  const restore = h('button', { type: 'button', class: 'sk-key wl-big' }, 'Restore from Backup');
  const later = h('button', { type: 'button', class: 'sk-key wl-big', hidden: !opts.again }, 'Close');
  const note = h('p', { class: 'wl-note' }, 'Setup takes about a minute, or do it later. Change anything anytime in Settings ', h('span', { class: 'wl-gear', role: 'img', 'aria-label': 'Settings' }, icon('gear', 18)), '.');
  const el = layer(
    'wl-welcome',
    'Welcome to ScoreKept',
    h(
      'div',
      { class: 'wl-welcome-inner' },
      appIcon(),
      h('h1', { class: 'sk-wordmark wl-name' }, 'ScoreKept'),
      h('p', { class: 'wl-headline' }, 'Your dugout scorebook.'),
      h('p', { class: 'wl-features' }, features),
      h('div', { class: 'wl-actions' }, setUp, look, note, restore, later),
      h('p', { class: 'wl-version' }, `Version ${APP_VERSION}`),
    ),
  );
  const finish = () => {
    app.commit((d) => (d.onboarded = true));
    closeLayer(el);
  };
  setUp.addEventListener('click', () => {
    closeLayer(el);
    openSetup(app);
  });
  look.addEventListener('click', async () => {
    finish();
    goTo('game');
    await loadSample(app);
  });
  restore.addEventListener('click', () => {
    finish();
    openBackup(app);
  });
  later.addEventListener('click', () => closeLayer(el));
  setUp.focus();
}

// ---- setup -----------------------------------------------------------------------------------

interface Step {
  title: string;
  body: () => Node[];
  /** Runs when leaving the step forward; false keeps you on it. */
  leave?: () => boolean;
}

export function openSetup(app: App): void {
  const team = app.ensureTeam();
  if (team.name === 'My Team' && !team.players.length) app.updateTeam((t) => ((t.name = ''), (t.abbr = '')));
  const preview = scorebugPreview(app);
  const start = { action: 'team' as 'team' | 'game' };

  // Players typed in this setup (added to the roster when you move on).
  const draft: { name: string; number: string; pos: string }[] = [{ name: '', number: '', pos: '' }];

  const steps: Step[] = [
    {
      title: 'Name Your Team',
      body: () => [
        preview.el,
        textField('Team Name', app.team?.name ?? '', (v) => {
          app.updateTeam((t) => (t.name = v.trim()));
          preview.draw();
        }, { autocapitalize: 'words', placeholder: 'Diamond Dogs' }),
        textField('Short Name', app.team?.abbr ?? '', (v) => {
          app.updateTeam((t) => (t.abbr = v.trim().toUpperCase().slice(0, 6)));
          preview.draw();
        }, { maxlength: '6', autocapitalize: 'characters', placeholder: 'DOGS' }),
        h('p', { class: 'sk-row-note' }, 'Up to six letters, for the scoreboard. You can change it later in Settings.'),
      ],
      leave: () => {
        app.updateTeam((t) => {
          if (!t.name) t.name = 'My Team';
          if (!t.abbr) t.abbr = defaultAbbr(t.name) || 'US';
        });
        return true;
      },
    },
    { title: 'Pick Your Colors', body: () => [h('p', { class: 'sk-row-note' }, 'Close to your uniforms is perfect.'), preview.el, ...colorGroups(app, preview.draw, true)] },
    {
      title: 'How Do You Score?',
      body: () => {
        const card = (mode: 'dugout' | 'scorekeeper', name: string, text: string) => {
          const b = h('button', { type: 'button', class: 'wl-mode', 'aria-pressed': String(app.data.defaults.mode === mode) }, h('span', { class: 'wl-mode-name' }, name), h('span', { class: 'wl-mode-text' }, text));
          b.addEventListener('click', () => {
            app.commit((d) => (d.defaults.mode = mode));
            for (const o of b.parentElement!.children) setAttr(o, 'aria-pressed', String(o === b));
          });
          return b;
        };
        return [
          h(
            'div',
            { class: 'wl-modes' },
            card('dugout', 'Dugout Mode', 'Score your team’s at-bats play by play. The other team’s half is a few quick taps: runs, outs, and hits.'),
            card('scorekeeper', 'Scorekeeper Mode', 'Score every play for both teams, like the official book.'),
          ),
          switchRow('Hit Location', app.data.defaults.hitLocation, (v) => app.commit((d) => (d.defaults.hitLocation = v)), 'Tap the field where each ball went. It powers spray charts and fielding stats.'),
        ];
      },
    },
    {
      title: 'League Rules',
      body: () => [
        selectField(
          'Rule Set',
          BUILT_IN_RULE_SETS.map((r) => ({ value: r.id, label: r.name })),
          app.data.defaults.ruleSetId,
          (id) => {
            const set = BUILT_IN_RULE_SETS.find((r) => r.id === id);
            if (set) app.setLeague(id, set.rules);
          },
        ),
        h('p', { class: 'sk-row-note' }, 'Innings, the time limit, the run rule, home runs, and the count. Each team keeps its own. Change any of it in Settings, New Game Defaults, or for one game in Game Settings.'),
      ],
    },
    {
      title: 'Your Book Ink',
      body: () => {
        const sample = h('p', { class: 'wl-ink-sample' }, '6-3  F8  1B  Jess Kowalczyk');
        const pick = (v: 'pencil' | 'black' | 'blue') => {
          const b = h('button', { type: 'button', class: 'sk-seg', 'aria-pressed': String((app.data.prefs.bookInk ?? 'pencil') === v) }, INK_NAMES[v]);
          b.addEventListener('click', () => {
            app.commit((d) => (d.prefs.bookInk = v));
            document.documentElement.dataset.ink = v;
            for (const o of b.parentElement!.children) setAttr(o, 'aria-pressed', String(o === b));
          });
          return b;
        };
        return [
          h('div', { class: 'sk-segmented', role: 'group', 'aria-label': 'Book Ink' }, pick('pencil'), pick('black'), pick('blue')),
          h('div', { class: 'wl-ink-page' }, sample),
          h('p', { class: 'sk-row-note' }, 'The Book is written in the scorekeeper’s own hand. Outs stay in red pen and runs in highlighter. Change it anytime with ✎ on the Book.'),
        ];
      },
    },
    {
      title: 'Add Your Players',
      body: () => {
        const list = h('div', { class: 'wl-players' });
        const row = (p: (typeof draft)[number], i: number) => {
          const name = textField('Name', p.name, (v) => (p.name = v), { autocapitalize: 'words', enterkeyhint: 'next', placeholder: i === 0 ? 'Jess Kowalczyk' : '' });
          const input = name.querySelector('input')!;
          input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (i === draft.length - 1) addRow();
            (list.children[i + 1]?.querySelector('input') as HTMLInputElement | null)?.focus();
          });
          return h(
            'div',
            { class: 'wl-player' },
            name,
            textField('No.', p.number, (v) => (p.number = v), { inputmode: 'numeric', maxlength: '3' }),
            selectField('Position', POSITION_OPTIONS, p.pos, (v) => (p.pos = v)),
          );
        };
        const addRow = () => {
          draft.push({ name: '', number: '', pos: '' });
          list.append(row(draft[draft.length - 1]!, draft.length - 1));
        };
        list.append(...draft.map(row));
        const more = h('button', { type: 'button', class: 'sk-key' }, '+ Add Player');
        more.addEventListener('click', () => {
          addRow();
          (list.lastElementChild?.querySelector('input') as HTMLInputElement | null)?.focus();
        });
        const have = app.team?.players.length ?? 0;
        return [
          h('p', { class: 'sk-row-note' }, have ? `${have} already on the roster. Add anyone else here, or later on the Team tab.` : 'Name, number, and main position. Press Return to add the next player. Add the rest anytime on the Team tab.'),
          list,
          more,
          switchRow('Walk-Up Songs and Ballpark Sounds', app.data.prefs.sound !== false, (v) => app.commit((d) => (d.prefs.sound = v)), 'The ballpark organ, game sounds, and each player’s walk-up. Turn them off anytime with the speaker on the Game tab.'),
        ];
      },
      leave: () => {
        const add: Player[] = draft
          .filter((p) => p.name.trim())
          .map((p) => ({
            id: newId(),
            name: p.name.trim(),
            number: p.number.trim(),
            positions: p.pos ? [p.pos === 'EH' ? 'EH' : (Number(p.pos) as Player['positions'][number])] : [],
          }));
        if (add.length) app.updateTeam((t) => t.players.push(...add));
        draft.splice(0, draft.length, { name: '', number: '', pos: '' });
        if (app.data.prefs.sound === null) app.commit((d) => (d.prefs.sound = true));
        return true;
      },
    },
    {
      title: 'Ready to Play Ball',
      body: () => {
        const t = app.team;
        const n = t?.players.filter((p) => !p.reserve).length ?? 0;
        const rules = BUILT_IN_RULE_SETS.find((r) => r.id === app.data.defaults.ruleSetId)?.name ?? 'Your own rules';
        const startGame = h('button', { type: 'button', class: 'sk-key sk-primary wl-big' }, 'Start a Game');
        const myTeam = h('button', { type: 'button', class: 'sk-key wl-big' }, 'Go to My Team');
        startGame.addEventListener('click', () => {
          start.action = 'game';
          done();
        });
        myTeam.addEventListener('click', () => {
          start.action = 'team';
          done();
        });
        return [
          preview.el,
          h(
            'ul',
            { class: 'wl-summary' },
            h('li', {}, `${t?.name ?? 'Your team'} · ${n} ${n === 1 ? 'player' : 'players'}`),
            h('li', {}, app.data.defaults.mode === 'dugout' ? 'Dugout Mode' : 'Scorekeeper Mode'),
            h('li', {}, rules),
            h('li', {}, `The Book in ${INK_NAMES[app.data.prefs.bookInk ?? 'pencil'].toLowerCase()}`),
          ),
          startGame,
          myTeam,
          h('p', { class: 'wl-tip' }, h('strong', {}, 'Tip: '), 'Keep ScoreKept on your Home Screen, and save a backup after every game (Settings, Backup & Restore). Your season lives only on this iPhone.'),
        ];
      },
    },
  ];

  let at = 0;
  const title = h('h2', { class: 'wl-step-title', tabindex: '-1' });
  const count = h('p', { class: 'wl-step-count' });
  const bar = h('div', { class: 'wl-progress', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(steps.length) }, h('span', { class: 'wl-progress-fill' }));
  const back = h('button', { type: 'button', class: 'sk-key wl-nav' }, 'Back');
  const next = h('button', { type: 'button', class: 'sk-key sk-primary wl-nav' }, 'Next');
  const skip = h('button', { type: 'button', class: 'sk-key wl-skip' }, 'Skip Setup');
  const body = h('div', { class: 'wl-step-body' });
  const el = layer('wl-setup', 'Setup', h('div', { class: 'wl-setup-top' }, h('div', { class: 'wl-setup-nav' }, back, h('div', { class: 'wl-setup-mid' }, count, bar), next), skip), h('div', { class: 'wl-step' }, title, body));

  function show(): void {
    const s = steps[at]!;
    title.textContent = s.title;
    count.textContent = `Step ${at + 1} of ${steps.length}`;
    bar.setAttribute('aria-valuenow', String(at + 1));
    (bar.firstElementChild as HTMLElement).style.width = `${((at + 1) / steps.length) * 100}%`;
    back.style.visibility = at === 0 ? 'hidden' : 'visible';
    next.hidden = at === steps.length - 1;
    body.replaceChildren(...s.body());
    body.scrollTop = 0;
    title.focus({ preventScroll: true });
  }
  back.addEventListener('click', () => {
    if (at > 0) at -= 1;
    show();
  });
  next.addEventListener('click', () => {
    if (steps[at]!.leave?.() === false) return;
    if (at < steps.length - 1) at += 1;
    show();
  });
  skip.addEventListener('click', () => {
    steps[at]!.leave?.();
    steps[0]!.leave?.();
    finish(false);
  });

  function finish(tour: boolean): void {
    app.commit((d) => (d.onboarded = true));
    closeLayer(el);
    const go = () => {
      if (start.action === 'game') {
        goTo('game');
        openNewGame(app);
      } else goTo('team');
    };
    if (tour) startTour(app, 'basics', go);
    else {
      goTo('team');
      announce('Setup skipped. Your team is on the Team tab.');
    }
  }
  function done(): void {
    finish(true);
  }
  show();
}
