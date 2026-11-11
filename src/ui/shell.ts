/*
 * The app shell: banners, five tabs (Game, Book, Stats, Scout, Team) in a
 * floating glass tab bar, and the live region. See docs/SPEC.md §17.
 */
import type { App } from '../app/app.ts';
import { mountAnnouncer } from './announce.ts';
import { openBackup, saveBackup } from './backup.ts';
import { h, setText } from './dom.ts';
import { updateFits, watchFits } from './fits.ts';
import { GameScreen } from './game/screen.ts';
import { icon } from './icons.ts';
import { watchKeyboard, watchLayout } from './layout.ts';
import { mountTapRings, setTapRings } from './taps.ts';

type TabId = 'game' | 'book' | 'stats' | 'scout' | 'team';
const TABS: { id: TabId; label: string; icon: 'game' | 'book' | 'stats' | 'scout' | 'team' }[] = [
  { id: 'game', label: 'Game', icon: 'game' },
  { id: 'book', label: 'Book', icon: 'book' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'scout', label: 'Scout', icon: 'scout' },
  { id: 'team', label: 'Team', icon: 'team' },
];

const SOON: Record<Exclude<TabId, 'game' | 'team'>, { title: string; text: string }> = {
  book: { title: 'Book', text: 'The scorebook returns soon, written in your own handwriting.' },
  stats: { title: 'Stats', text: 'Season stats, spray charts, lineups, and playing time return soon.' },
  scout: { title: 'Scout', text: 'What to expect from every opponent returns soon.' },
};

export function mountApp(root: HTMLElement, app: App): void {
  root.className = 'sk-app';
  root.replaceChildren();

  const banner = h('div', { class: 'sk-banner', role: 'alert', hidden: true });
  const panels = new Map<TabId, HTMLElement>();
  const tabButtons = new Map<TabId, HTMLButtonElement>();
  const game = new GameScreen(app);

  const teamList = h('ul', { class: 'sh-list tm-roster' });
  const teamName = h('h2', { class: 'tm-name' });
  const panelContent: Record<TabId, Node> = {
    game: game.el,
    book: soon('book'),
    stats: soon('stats'),
    scout: soon('scout'),
    team: h(
      'div',
      {},
      h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'Team')),
      h('section', { class: 'sk-card' }, teamName, teamList, h('p', { class: 'sk-row-note' }, 'Editing players, colors, and seasons returns soon.')),
    ),
  };

  const main = h('main', { class: 'sk-main' });
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
    updateFits();
  }

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
    const team = app.team;
    setText(teamName, team?.name ?? 'No Team Yet');
    teamList.replaceChildren(...(team?.players ?? []).map((p) => h('li', {}, p.number ? `${p.name} · #${p.number}` : p.name)));
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
  // The game clock: refresh the board as the minutes pass.
  setInterval(() => {
    if (app.game?.setup.rules.timeLimit) game.update();
  }, 15_000);
}

function soon(id: keyof typeof SOON): HTMLElement {
  const s = SOON[id];
  return h('div', {}, h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, s.title)), h('section', { class: 'sk-card sk-soon' }, h('p', {}, s.text)));
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
