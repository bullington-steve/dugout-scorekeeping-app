/*
 * Tours (SPEC §12): a spotlight that dims everything but one feature, outlined
 * in gold, with a card: Skip, Back, Next, and "The Basics · 3 of 9". Tours
 * switch tabs themselves and skip any step whose feature isn't on screen
 * (no game in progress, nothing scored yet). Finished tours get a ✓ in
 * Settings, Tutorials. Sounds and Walk-Ups comes with the sound update.
 */
import type { App } from '../../app/app.ts';
import { h } from '../dom.ts';
import { goTo, type TabId } from '../nav.ts';
import { openSheet } from '../sheet.ts';

interface TourStep {
  tab?: TabId;
  /** What to light up; the step is skipped when it isn't on screen. */
  target: string;
  title: string;
  text: string;
}

interface Tour {
  id: string;
  name: string;
  about: string;
  steps: TourStep[];
}

export const TOURS: Tour[] = [
  {
    id: 'basics',
    name: 'The Basics',
    about: 'The five tabs and where everything lives.',
    steps: [
      { tab: 'game', target: '#tabbtn-game', title: 'Game', text: 'Score the game here: the scoreboard on top, the scoring buttons under it.' },
      { tab: 'game', target: '.gm-new', title: 'New Game', text: 'Start a game: who’s here, the batting order, and your league’s rules.' },
      { tab: 'game', target: '.gm-board', title: 'The Scoreboard', text: 'The score, the inning, the outs, and who’s up. Tap a lit base to move a runner.' },
      { tab: 'game', target: '.gm-strip', title: 'Undo, Lineups, Defense', text: 'Undo takes back the last tap. Lineups handles subs; Defense is the whole field, inning by inning.' },
      { tab: 'book', target: '#tabbtn-book', title: 'The Book', text: 'Every at-bat, written in a scorekeeper’s hand. Tap any box to change a play.' },
      { tab: 'stats', target: '#tabbtn-stats', title: 'Stats', text: 'The season: record, leaders, every batting table, spray charts, and playing time.' },
      { tab: 'scout', target: '#tabbtn-scout', title: 'Scout', text: 'Every team you’ve played, and where they hit the ball.' },
      { tab: 'team', target: '#tabbtn-team', title: 'Team', text: 'Your roster, reserves, schedule, depth chart, and dues.' },
      { tab: 'game', target: '.gm-gear', title: 'Settings', text: 'Backups, rules, your Book ink, Help, and these tutorials. During a game it opens that game’s settings.' },
    ],
  },
  {
    id: 'starting',
    name: 'Starting a Game',
    about: 'Who’s here, the order, and the coin toss.',
    steps: [
      { tab: 'game', target: '.gm-upnext', title: 'Up Next', text: 'Your next scheduled game. Start This Game fills in the opponent and the park.' },
      { tab: 'game', target: '.gm-new', title: 'New Game', text: 'Check who’s here, tap players into the batting order, then Game Details. Auto-Fill and Suggest Order do it for you.' },
      { tab: 'team', target: '#tm-season', title: 'Your Schedule', text: 'Add the season’s games here and they show up as Up Next.' },
    ],
  },
  {
    id: 'scoring',
    name: 'Scoring a Game',
    about: 'The buttons, runners, and fixing mistakes.',
    steps: [
      { tab: 'game', target: '.gm-board', title: 'The Scoreboard', text: 'Bases light up yellow with a runner. Tap one to advance, score, or put out that runner.' },
      { tab: 'game', target: '.gm-pad', title: 'Scoring Buttons', text: 'Green when the batter reaches, red when the batter’s out. The big code is what you’d write in the book.' },
      { tab: 'game', target: '.gm-strip', title: 'Fixing Mistakes', text: 'Undo takes back the last tap. To change an older play, tap its box in the Book.' },
      { tab: 'game', target: '.gm-gear', title: 'Game Settings', text: 'Switch modes, turn the count or hit location on or off, or End Game Now.' },
    ],
  },
  {
    id: 'stats',
    name: 'Stats and the Book',
    about: 'Reading the season and the scorebook.',
    steps: [
      { tab: 'stats', target: '.st-scope', title: 'Pick a Season', text: 'One season, or All Seasons. Every number follows.' },
      { tab: 'stats', target: '.st-sections', title: 'Sections', text: 'Overview, Batting, Charts, Lineups, and Innings. Tap a name anywhere for the player card.' },
      { tab: 'book', target: '.bk-ink', title: 'Book Ink', text: 'Pencil, black pen, or blue pen. The whole Book changes at once.' },
      { tab: 'scout', target: '.sc-screen', title: 'Scout', text: 'Where each opponent hits the ball, as a team and hitter by hitter.' },
    ],
  },
];

function visible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !el.closest('[hidden]');
}

/** Run a tour. `then` runs when it ends, finished or skipped. */
export function startTour(app: App, id: string, then: () => void = () => undefined): void {
  const tour = TOURS.find((t) => t.id === id);
  if (!tour) return then();
  const spot = h('div', { class: 'tr-spot', 'aria-hidden': 'true' });
  const title = h('h2', { class: 'tr-title', tabindex: '-1' });
  const text = h('p', { class: 'tr-text' });
  const count = h('p', { class: 'tr-count' });
  const skip = h('button', { type: 'button', class: 'wl-quiet tr-skip' }, 'Skip');
  const back = h('button', { type: 'button', class: 'sk-key' }, 'Back');
  const next = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Next');
  const card = h('div', { class: 'tr-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tr-title' }, count, title, text, h('div', { class: 'tr-keys' }, skip, back, next));
  title.id = 'tr-title';
  const el = h('div', { class: 'tr-layer' }, spot, card);
  document.body.append(el);

  let at = -1;
  let first = -1;
  const steps = tour.steps;
  const total = () => steps.length;

  function place(target: HTMLElement): void {
    target.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    const r = target.getBoundingClientRect();
    const pad = 6;
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
    // The card goes wherever there's more room: below the feature or above it.
    const below = r.bottom + pad + 12;
    const roomBelow = window.innerHeight - below;
    card.classList.toggle('tr-card-above', roomBelow < 220 && r.top > roomBelow);
    if (card.classList.contains('tr-card-above')) {
      card.style.top = '';
      card.style.bottom = `${window.innerHeight - r.top + pad + 12}px`;
    } else {
      card.style.bottom = '';
      card.style.top = `${Math.min(below, window.innerHeight - 200)}px`;
    }
  }

  function go(dir: 1 | -1): void {
    let i = at + dir;
    while (i >= 0 && i < steps.length) {
      const s = steps[i]!;
      if (s.tab) goTo(s.tab);
      const target = document.querySelector(s.target);
      if (visible(target)) {
        at = i;
        title.textContent = s.title;
        text.textContent = s.text;
        count.textContent = `${tour!.name} · ${i + 1} of ${total()}`;
        if (first < 0) first = i;
        back.style.visibility = i > first ? 'visible' : 'hidden';
        next.textContent = steps.slice(i + 1).length ? 'Next' : 'Done';
        place(target);
        title.focus({ preventScroll: true });
        return;
      }
      i += dir;
    }
    if (dir === 1) end(true);
  }

  function end(finished: boolean): void {
    el.remove();
    window.removeEventListener('resize', onResize);
    if (finished) app.commit((d) => (d.toursDone = { ...d.toursDone, [tour!.id]: true }));
    then();
  }
  const onResize = () => {
    const target = document.querySelector(steps[at]?.target ?? '');
    if (visible(target)) place(target);
  };
  window.addEventListener('resize', onResize);
  skip.addEventListener('click', () => end(false));
  back.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') end(false);
  });
  go(1);
}

/** Settings, Tutorials: every tour, with ✓ for the ones finished. */
export function openTutorials(app: App, closeSettings: () => void): void {
  const rows = TOURS.map((t) => {
    const done = app.data.toursDone[t.id];
    const b = h(
      'button',
      { type: 'button', class: 'sk-row sk-row-link sk-row-two' },
      h('span', { class: 'sk-row-text' }, h('span', { class: 'sk-row-label' }, `${t.name}${done ? ' ✓' : ''}`), h('span', { class: 'sk-row-summary' }, t.about)),
      h('span', { class: 'sk-chevron', 'aria-hidden': 'true' }, '›'),
    );
    b.addEventListener('click', () => {
      sheet.close();
      closeSettings();
      startTour(app, t.id);
    });
    return b;
  });
  const sheet = openSheet({
    title: 'Tutorials',
    body: [h('div', { class: 'sk-group-rows' }, ...rows), h('p', { class: 'sk-row-note' }, 'Each one lights up the real buttons and switches tabs for you. Skip anytime.')],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}
