/*
 * The Team tab (SPEC §9–10): the team card (badge, name, colors, player
 * count, Edit Team, Switch Team, Add Team), the roster, reserves with Text,
 * and the season's schedule.
 */
import type { App } from '../../app/app.ts';
import { defaultAbbr } from '../../store/model.ts';
import { h } from '../dom.ts';
import { teamColor, titleCaseColor } from '../palette.ts';
import { choose, openSheet } from '../sheet.ts';
import { linkRow, textField } from '../controls.ts';
import { duesDetail, openDepthChart, openDues } from './tools.ts';
import { whenText } from '../when.ts';
import { openEditTeam, teamBadge } from './editteam.ts';
import { avatar, openPlayerEditor, positionsText } from './player.ts';
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
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'Team'));
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
    const others = app.data.teams.filter((t) => t.id !== team.id);
    const switchBtn = h('button', { type: 'button', class: 'sk-key', hidden: others.length === 0 }, 'Switch Team');
    switchBtn.addEventListener('click', async () => {
      const id = await choose('Switch Team', others.map((t) => ({ label: t.name, value: t.id })));
      if (id) app.switchTeam(id);
    });
    const addTeam = h('button', { type: 'button', class: 'sk-key' }, 'Add Team');
    addTeam.addEventListener('click', () => {
      let name = '';
      openSheet({
        title: 'Add Team',
        body: [textField('Team Name', '', (v) => (name = v), { autocapitalize: 'words' }), h('p', { class: 'sk-row-note' }, 'Each team keeps its own roster, colors, games, seasons, and schedule.')],
        cancel: 'Cancel',
        done: { label: 'Add Team', onClick: () => void app.addTeam(name) },
      });
    });

    const card = h(
      'section',
      { class: 'sk-card tm-head', 'aria-label': team.name },
      h('div', { class: 'tm-head-top' }, teamBadge(team.abbr || defaultAbbr(team.name), team.colors.primary, team.colors.secondary), h('h2', { class: 'tm-name' }, team.name)),
      h(
        'p',
        { class: 'tm-head-line' },
        h('span', { class: 'tm-dots' }, dot(team.colors.primary), dot(team.colors.secondary)),
        h('span', {}, `${titleCaseColor(team.colors.primary)} and ${titleCaseColor(team.colors.secondary)} · ${roster.length} ${roster.length === 1 ? 'player' : 'players'}`),
      ),
      h('div', { class: 'tm-head-actions' }, edit, switchBtn, addTeam),
    );

    const row = (p: (typeof team.players)[number]) => {
      const b = h(
        'button',
        { type: 'button', class: 'sk-row tm-player' },
        avatar(p),
        h('span', { class: 'tm-player-main' }, h('span', { class: 'sk-row-label' }, p.name), h('span', { class: 'tm-player-sub' }, [p.number ? `#${p.number}` : '', positionsText(p), p.bats ? `Bats ${p.bats}` : ''].filter(Boolean).join(' · '))),
        p.walkup ? h('span', { class: 'tm-walkup', 'aria-label': 'Has a walk-up song' }, '♪') : null,
      );
      b.addEventListener('click', () => openPlayerCard(app, p));
      return b;
    };
    const addPlayer = h('button', { type: 'button', class: 'sk-key' }, '+ Add Player');
    addPlayer.addEventListener('click', () => void openPlayerEditor(app));
    const addReserve = h('button', { type: 'button', class: 'sk-key' }, '+ Add Reserve');
    addReserve.addEventListener('click', () => void openPlayerEditor(app, undefined, { reserve: true }));

    const next = app.upNext();
    const ask = next ? `Can you sub ${whenText(next.date, next.time)} vs ${next.opponent}?` : 'Can you sub for our next game?';
    const reserveRow = (p: (typeof team.players)[number]) => {
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
      header,
      card,
      h('section', { class: 'tm-section', 'aria-labelledby': 'tm-roster' }, h('h2', { id: 'tm-roster', class: 'sk-label' }, 'Roster'), h('div', { class: 'sk-stack' }, ...roster.map(row), addPlayer)),
      h('section', { class: 'tm-section', 'aria-labelledby': 'tm-reserves' }, h('h2', { id: 'tm-reserves', class: 'sk-label' }, 'Reserves'), h('div', { class: 'sk-stack' }, ...reserves.map(reserveRow), addReserve)),
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
