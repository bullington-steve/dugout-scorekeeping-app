/*
 * The app shell: banners, five tabs (Game, Book, Stats, Scout, Team) in a
 * floating glass tab bar, and the live region. See docs/SPEC.md §17.
 */
import { sampleBar } from './sample.ts';
import type { App } from '../app/app.ts';
import { mountAnnouncer } from './announce.ts';
import { openBackup, saveBackup } from './backup.ts';
import { h, setText } from './dom.ts';
import { updateFits, watchFits } from './fits.ts';
import { GameScreen } from './game/screen.ts';
import { TeamScreen } from './team/team.ts';
import { icon } from './icons.ts';
import { watchKeyboard, watchLayout } from './layout.ts';
import { mountTapRings, setTapRings } from './taps.ts';

import { BookScreen } from './book/book.ts';
import { ScoutScreen } from './scout/scout.ts';
import { StatsScreen } from './stats/stats.ts';
import { onNavigate, type TabId } from './nav.ts';
const TABS: { id: TabId; label: string; icon: 'game' | 'book' | 'stats' | 'scout' | 'team' }[] = [
  { id: 'game', label: 'Game', icon: 'game' },
  { id: 'book', label: 'Book', icon: 'book' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'scout', label: 'Scout', icon: 'scout' },
  { id: 'team', label: 'Team', icon: 'team' },
];


export function mountApp(root: HTMLElement, app: App): void {
  root.className = 'sk-app';
  root.replaceChildren();

  const banner = h('div', { class: 'sk-banner', role: 'alert', hidden: true });
  const panels = new Map<TabId, HTMLElement>();
  const tabButtons = new Map<TabId, HTMLButtonElement>();
  const game = new GameScreen(app);

  const teamScreen = new TeamScreen(app);
  const book = new BookScreen(app);
  const stats = new StatsScreen(app);
  const scout = new ScoutScreen(app);
  const panelContent: Record<TabId, Node> = {
    game: game.el,
    book: book.el,
    stats: stats.el,
    scout: scout.el,
    team: teamScreen.el,
  };

  const sample = sampleBar(app);
  const main = h('main', { class: 'sk-main' }, sample);
  const bar = h('nav', { class: 'sk-tabbar', 'aria-label': 'Sections' }, h('div', { class: 'sk-tablist', role: 'tablist' }));
  for (const t of TABS) {
    const panel = h('section', { id: `tab-${t.id}`, class: 'sk-panel', role: 'tabpanel', 'aria-labelledby': `tabbtn-${t.id}` }, panelContent[t.id]);
    panels.set(t.id, panel);
    main.append(panel);
    const b = h('button', { type: 'button', id: `tabbtn-${t.id}`, class: 'sk-tab', role: 'tab', 'aria-controls': `tab-${t.id}` }, icon(t.icon), h('span', { class: 'sk-tab-label' }, t.label));
    b.addEventListener('click', () => select(t.id));
    tabButtons.set(t.id, b);
    bar.firstElementChild!.append(b);
  }

  let current: TabId = 'game';
  function select(id: TabId): void {
    current = id;
    document.documentElement.dataset.tab = id;
    for (const [tid, panel] of panels) panel.hidden = tid !== id;
    for (const [tid, b] of tabButtons) {
      b.setAttribute('aria-selected', String(tid === id));
      b.tabIndex = tid === id ? 0 : -1;
    }
    try {
      sessionStorage.setItem('scorekept:tab', id);
    } catch {
      // A remembered tab is only a convenience.
    }
    if (id === 'book') book.update(true);
    if (id === 'stats') stats.update(true);
    if (id === 'scout') scout.update(true);
    updateFits();
  }
  onNavigate((tab) => select(tab));

  root.append(banner, main, bar);
  mountAnnouncer(root);
  mountTapRings();
  setTapRings(app.data.prefs.tapRings);
  watchLayout(() => update());
  watchKeyboard();
  watchFits(main, () => current === 'game' && !!app.game);

  function update(): void {
    game.update();
    renderBanner(banner, app);
    sample.hidden = !app.data.sample;
    teamScreen.update();
    book.update(current === 'book');
    stats.update(current === 'stats');
    scout.update(current === 'scout');
    updateFits();
  }

  app.on(update);
  let start: TabId = 'game';
  try {
    const saved = sessionStorage.getItem('scorekept:tab') as TabId | null;
    if (saved && panels.has(saved)) start = saved;
  } catch {
    // Fine: start on Game.
  }
  select(start);
  update();
  // The game clock ticks once a second, only while the Game tab is showing.
  setInterval(() => {
    if (current === 'game' && app.game?.setup.rules.timeLimit && !document.hidden) game.tick();
  }, 1000);
}


/** Loud when a save failed; informative when saved data was set aside or is newer. */
function renderBanner(banner: HTMLElement, app: App): void {
  let text = '';
  let action: { label: string; run: () => void } | null = null;
  if (app.saveProblem) {
    text =
      app.saveProblem.error === 'full'
        ? 'This iPhone is out of space for ScoreKept, so your last change wasn’t saved. Save a backup now.'
        : app.saveProblem.error === 'readonly'
          ? 'Your saved data is from a newer ScoreKept, so this one won’t change it. Close the app fully and reopen it to update.'
          : 'Your last change couldn’t be saved. Save a backup now to keep your season.';
    action = { label: 'Save Backup', run: () => void saveBackup(app) };
  } else if (app.load.status === 'quarantined') {
    text = 'Your saved data couldn’t be read, so it was set aside instead of being lost. You can restore a backup.';
    action = { label: 'Backup & Restore', run: () => openBackup(app) };
  } else if (app.load.status === 'newer') {
    text = 'Your saved data is from a newer ScoreKept. Close the app fully and reopen it to update.';
  }
  banner.hidden = !text;
  if (!text) return;
  const btn = action ? h('button', { type: 'button', class: 'sk-key sk-banner-action' }, action.label) : null;
  if (btn && action) btn.addEventListener('click', action.run);
  banner.replaceChildren(h('p', { class: 'sk-banner-text' }, text), ...(btn ? [btn] : []));
}
