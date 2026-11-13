/*
 * The tab bar tucks away while you scroll down a long tab (Steve's pick,
 * Nov 13, after Apple Music): it folds into one circle showing the tab
 * you're on, and while a game is going a mini scorebug rides beside it
 * (score, inning, outs, runners). Tap the circle, or scroll back up, for the
 * whole bar; tap the scorebug for the Game tab. The Game tab never tucks
 * (its screen never scrolls), and neither does the sideways rail.
 */
import type { App } from '../app/app.ts';
import { boardView, ordinalWord } from '../app/view.ts';
import { h, setAttr, setText, svg } from './dom.ts';
import { tabIcon } from './icons.ts';
import { currentLayout } from './layout.ts';
import type { TabId } from './nav.ts';

export interface Tuck {
  readonly el: HTMLElement;
  /** Redraw the scorebug and the circle's icon. */
  update(tab: TabId): void;
  /** Bring the whole bar back. */
  open(): void;
}

export function mountTuck(app: App, bar: HTMLElement, label: (tab: TabId) => string, goGame: () => void): Tuck {
  let tab: TabId = 'game';
  const circle = h('button', { type: 'button', class: 'sk-tuck-tab' });
  const icons = new Map<TabId, SVGSVGElement>();
  for (const id of ['game', 'book', 'stats', 'scout', 'team'] as const) {
    const i = tabIcon(id);
    i.classList.add('sk-tuck-icon');
    icons.set(id, i);
    circle.append(i);
  }

  const away = h('span', { class: 'sk-bug-team' });
  const awayRuns = h('span', { class: 'sk-bug-runs' });
  const home = h('span', { class: 'sk-bug-team' });
  const homeRuns = h('span', { class: 'sk-bug-runs' });
  const bags = [0, 1, 2].map(() => svg('path', { class: 'sk-bug-bag' }));
  // First on the right, second on top, third on the left, as seen from home.
  bags[0]!.setAttribute('d', 'M18 9.5 21 12.5 18 15.5 15 12.5Z');
  bags[1]!.setAttribute('d', 'M12 3.5 15 6.5 12 9.5 9 6.5Z');
  bags[2]!.setAttribute('d', 'M6 9.5 9 12.5 6 15.5 3 12.5Z');
  const inning = h('span', { class: 'sk-bug-inning' });
  const outs = [0, 1].map(() => h('span', { class: 'sk-bug-out' }));
  const bug = h(
    'button',
    { type: 'button', class: 'sk-tuck-bug' },
    away,
    awayRuns,
    home,
    homeRuns,
    svg('svg', { viewBox: '0 0 24 19', class: 'sk-bug-bases', 'aria-hidden': 'true', focusable: 'false' }, ...bags),
    inning,
    h('span', { class: 'sk-bug-outs' }, ...outs),
  );
  [away, awayRuns, home, homeRuns, inning].forEach((x) => x.setAttribute('aria-hidden', 'true'));

  const el = h('div', { class: 'sk-tuck' }, circle, bug);

  const tucked = () => bar.classList.contains('tucked');
  const set = (on: boolean) => {
    if (tucked() === on) return;
    bar.classList.toggle('tucked', on);
    // While tucked, the five tabs are out of reach; the circle brings them back.
    const list = bar.querySelector('.sk-tablist');
    if (list) list.toggleAttribute('inert', on);
    el.toggleAttribute('inert', !on);
  };
  el.toggleAttribute('inert', true);

  circle.addEventListener('click', () => set(false));
  bug.addEventListener('click', () => {
    set(false);
    goGame();
  });

  // The bottom bar tucks (iPhone and iPad upright); the sideways rail stays put.
  const canTuck = () => tab !== 'game' && (currentLayout() === 'phone' || currentLayout() === 'tablet');
  // Only a finger (or a trackpad) tucks the bar: a jump the app or VoiceOver makes to show
  // something doesn't, so the tabs stay where they were.
  let touched = Number.NEGATIVE_INFINITY;
  const touch = () => (touched = performance.now());
  window.addEventListener('touchmove', touch, { passive: true });
  window.addEventListener('wheel', touch, { passive: true });
  let last = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const byHand = performance.now() - touched < 500;
      if (!canTuck()) set(false);
      else if (byHand && y > last + 4 && y > 40) set(true);
      else if (y < last - 4 || y < 20) set(false);
      last = y;
    },
    { passive: true },
  );

  return {
    el,
    open: () => set(false),
    update(next: TabId) {
      tab = next;
      if (!canTuck()) set(false);
      for (const [id, i] of icons) i.classList.toggle('on', id === next);
      setAttr(circle, 'aria-label', `${label(next)} tab. Show All Tabs`);
      const game = app.game;
      const team = app.team;
      const s = app.state();
      const live = !!(game && team && s && !s.final);
      bug.hidden = !live;
      el.classList.toggle('sk-tuck-solo', !live);
      if (!live) return;
      const v = boardView(team!, game!, s!, Date.now());
      setText(away, v.away.abbr);
      setText(awayRuns, String(v.away.runs));
      setText(home, v.home.abbr);
      setText(homeRuns, String(v.home.runs));
      setText(inning, `${v.half === 'top' ? '▲' : '▼'}${v.inning}`);
      v.bases.forEach((b, i) => bags[i]!.classList.toggle('on', b.occupied));
      outs.forEach((o, i) => o.classList.toggle('on', i < v.outs));
      const on = v.bases.map((b, i) => (b.occupied ? ['first', 'second', 'third'][i] : null)).filter(Boolean);
      setAttr(
        bug,
        'aria-label',
        `${v.away.name} ${v.away.runs}, ${v.home.name} ${v.home.runs}, ${v.half === 'top' ? 'top' : 'bottom'} of the ${ordinalWord(v.inning)}, ${v.outs} ${v.outs === 1 ? 'out' : 'outs'}${on.length ? `, runners on ${on.join(' and ')}` : ''}. Go to the Game tab.`,
      );
    },
  };
}
