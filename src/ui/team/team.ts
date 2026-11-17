/*
 * The Team tab (SPEC §9–10): the team card (badge, name, colors, player
 * count, Edit Team, Switch Team, Add Team), the roster, reserves with Text,
 * and the season's schedule.
 */
import type { App } from '../../app/app.ts';
import { defaultAbbr } from '../../store/model.ts';
import { h } from '../dom.ts';
import { icon } from '../icons.ts';
import { teamColor, titleCaseColor } from '../palette.ts';
import { openSheet } from '../sheet.ts';
import { linkRow, textField } from '../controls.ts';
import { duesDetail, openDepthChart, openDues } from './tools.ts';
import { whenText } from '../when.ts';
import { openEditTeam, teamBadge } from './editteam.ts';
import { avatar, openPlayerEditor, positionsText } from './player.ts';
import type { Player } from '../../store/model.ts';
import { openPlayerCard } from '../stats/playercard.ts';
import { openNewSeason, openScheduleEntry, pickSeason, scheduleRow } from './schedule.ts';

export class TeamScreen {
  readonly el = h('div', { class: 'tm-screen' });
  private readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  update(): void {
    const app = this.app;
    const team = app.team;
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-screen-title sk-header-title' }, 'Team'));
    if (!team) {
      const start = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Set Up My Team');
      start.addEventListener('click', () => {
        app.ensureTeam();
        openEditTeam(app);
      });
      this.el.replaceChildren(header, h('section', { class: 'sk-card sk-stack' }, h('h2', { class: 'tm-name' }, 'No Team Yet'), h('p', { class: 'sk-row-note' }, 'Set up your team, or bring it in with Settings, Backup & Restore.'), start));
      return;
    }

    const roster = team.players.filter((p) => !p.reserve);
    const reserves = team.players.filter((p) => p.reserve);
    const dot = (c: string) => {
      const s = h('span', { class: 'tm-dot', 'aria-hidden': 'true' });
      s.style.setProperty('--swatch', teamColor(c));
      return s;
    };
    const edit = h('button', { type: 'button', class: 'sk-key' }, 'Edit Team');
    edit.addEventListener('click', () => openEditTeam(app));
    // A roster card (Steve, Nov 16): Add Team is the + in the header; with two or more teams, the
    // team's name opens the iPhone's own menu to switch.
    const addTeam = h('button', { type: 'button', class: 'bk-icon-key', 'aria-label': 'Add Team' }, icon('plus'));
    addTeam.addEventListener('click', () => {
      let name = '';
      const field = textField('Team Name', '', (v) => (name = v), { autocapitalize: 'words' });
      openSheet({
        title: 'Add Team',
        body: [field, h('p', { class: 'sk-row-note' }, 'Each team keeps its own roster, colors, games, seasons, and schedule.')],
        cancel: 'Cancel',
        // Read the field itself at the tap, so a name typed a moment before always counts.
        done: { label: 'Add Team', onClick: () => void app.addTeam(field.querySelector('input')?.value || name) },
      });
    });
    const header2 = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-screen-title sk-header-title' }, 'Team'), h('div', { class: 'bk-head-keys' }, addTeam));

    const multi = app.data.teams.length > 1;
    let nameEl: HTMLElement = h('h2', { class: 'tm-name' }, team.name);
    if (multi) {
      const menu = h(
        'select',
        { class: 'bk-menu-native', 'aria-label': `Switch Team, ${team.name}` },
        ...app.data.teams.map((t) => h('option', { value: t.id, selected: t.id === team.id }, t.name)),
      );
      menu.addEventListener('change', () => {
        if (menu.value !== team.id) app.switchTeam(menu.value);
      });
      nameEl = h('div', { class: 'tm-name-switch' }, h('h2', { class: 'tm-name' }, team.name, h('span', { class: 'tm-name-chev', 'aria-hidden': 'true' }, '⌄')), menu);
    }

    const card = h(
      'section',
      { class: 'tm-head', 'aria-label': team.name },
      h('div', { class: 'tm-head-top' }, teamBadge(team.abbr || defaultAbbr(team.name), team.colors.primary, team.colors.secondary), nameEl),
      h(
        'p',
        { class: 'tm-head-line' },
        h('span', { class: 'tm-dots' }, dot(team.colors.primary), dot(team.colors.secondary)),
        h('span', {}, `${titleCaseColor(team.colors.primary)} and ${titleCaseColor(team.colors.secondary)} · ${roster.length} ${roster.length === 1 ? 'player' : 'players'}`),
      ),
      h('div', { class: 'tm-head-actions' }, edit),
    );

    // One ruled row per player: the jersey number once, in its block (a photo or initials when
    // there's no number), the name, and positions and bats under it.
    const block = (p: Player) => (p.number ? h('span', { class: 'tm-num', 'aria-hidden': 'true' }, p.number) : avatar(p));
    const row = (p: Player) => {
      const b = h(
        'button',
        { type: 'button', class: 'tm-player', 'aria-label': `${p.name}${p.number ? `, number ${p.number}` : ''}` },
        block(p),
        h('span', { class: 'tm-player-main' }, h('span', { class: 'tm-player-name' }, p.name), h('span', { class: 'tm-player-sub' }, [positionsText(p), p.bats ? `Bats ${p.bats}` : ''].filter(Boolean).join(' · '))),
        h('span', { class: 'tm-player-end', 'aria-hidden': 'true' }, p.walkup ? h('span', { class: 'tm-walkup' }, '♪') : null, '›'),
      );
      b.addEventListener('click', () => openPlayerCard(app, p));
      return b;
    };
    const sheetHead = h('div', { class: 'tm-sheet-head', 'aria-hidden': 'true' }, h('span', {}, 'No.'), h('span', {}, 'Player · Positions · Bats'));
    const addPlayer = h('button', { type: 'button', class: 'sk-key' }, '+ Add Player');
    addPlayer.addEventListener('click', () => void openPlayerEditor(app));
    const addReserve = h('button', { type: 'button', class: 'sk-key' }, '+ Add Reserve');
    addReserve.addEventListener('click', () => void openPlayerEditor(app, undefined, { reserve: true }));

    const next = app.upNext();
    const ask = next ? `Can you sub ${whenText(next.date, next.time)} vs ${next.opponent}?` : 'Can you sub for our next game?';
    const reserveRow = (p: Player) => {
      const parts: Node[] = [row(p)];
      if (p.phone) {
        const text = h('a', { class: 'sk-key tm-text', href: `sms:${p.phone.replace(/[^\d+]/g, '')}&body=${encodeURIComponent(ask)}` }, 'Text');
        parts.push(text);
      }
      return h('div', { class: 'tm-reserve' }, ...parts);
    };

    const season = team.seasons.find((s) => s.id === team.currentSeasonId);
    const seasonBtn = h('button', { type: 'button', class: 'sk-row' }, h('span', { class: 'sk-row-label' }, season?.name ?? 'No Season Yet'), h('span', { class: 'sk-row-detail' }, team.seasons.length > 1 ? 'Change' : ''));
    seasonBtn.addEventListener('click', () => void pickSeason(app));
    const newSeason = h('button', { type: 'button', class: 'sk-key' }, 'New Season');
    newSeason.addEventListener('click', () => openNewSeason(app));
    const addGame = h('button', { type: 'button', class: 'sk-key' }, '+ Add a Game');
    addGame.addEventListener('click', () => openScheduleEntry(app));
    const schedule = team.schedule.filter((x) => x.seasonId === team.currentSeasonId);

    this.el.replaceChildren(
      header2,
      card,
      h('section', { class: 'tm-sheet', 'aria-labelledby': 'tm-roster' }, h('h2', { id: 'tm-roster', class: 'sk-visually-hidden' }, 'Roster'), sheetHead, ...roster.map(row), h('div', { class: 'tm-sheet-foot' }, addPlayer)),
      h('section', { class: 'tm-sheet', 'aria-labelledby': 'tm-reserves' }, h('h2', { id: 'tm-reserves', class: 'tm-sheet-head tm-sheet-title' }, 'Reserves'), ...reserves.map(reserveRow), h('div', { class: 'tm-sheet-foot' }, addReserve)),
      h(
        'section',
        { class: 'tm-section', 'aria-labelledby': 'tm-tools' },
        h('h2', { id: 'tm-tools', class: 'sk-label' }, 'Team Tools'),
        h('div', { class: 'sk-stack' }, linkRow('Depth Chart', () => openDepthChart(app)), linkRow('Dues', () => openDues(app, () => this.update()), duesDetail(app))),
      ),
      h(
        'section',
        { class: 'tm-section', 'aria-labelledby': 'tm-season' },
        h('h2', { id: 'tm-season', class: 'sk-label' }, 'Season and Schedule'),
        h('div', { class: 'sk-stack' }, seasonBtn, ...schedule.map((e) => scheduleRow(app, e)), addGame, newSeason),
      ),
    );
  }
}
