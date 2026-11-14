/*
 * The made-up sample season (SPEC §19): the Diamond Dogs, six games played,
 * tonight's game in the 4th inning, and two more on the schedule. The games
 * come from src/content/sample-season.json (built by tools/make-sample.ts)
 * with times counted from each game's first pitch; this moves them onto real
 * dates so the sample always reads as this week's.
 */
import type { DefenseInning, GameEvent, GameSetup } from '../engine/types.ts';
import { newId, newTeam, type Player, type SavedGame, type ScheduledGame, type Team } from '../store/model.ts';
import { localDate, seasonFor } from './app.ts';

interface SampleGame {
  opponent: string;
  opponentAbbr: string;
  park: string;
  setup: GameSetup;
  events: GameEvent[];
  defense?: (DefenseInning | null)[];
  present?: string[];
}

export interface SampleSeason {
  team: { name: string; abbr: string; colors: { primary: string; secondary: string } };
  players: Player[];
  games: SampleGame[];
  tonight: SampleGame;
  upcoming: { opponent: string; park: string; side: string; theirOrder?: string[] }[];
}

/** 6:30 PM on the day `daysFromToday` away, local time. */
function gameNight(now: number, daysFromToday: number): number {
  const d = new Date(now);
  d.setHours(18, 30, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d.getTime();
}

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function placed(g: SampleGame, start: number, seasonId: string, saved: boolean): SavedGame {
  return {
    id: newId(),
    setup: structuredClone({ ...g.setup, startedAt: start }),
    events: g.events.map((e) => ({ ...e, ...(e.at !== undefined ? { at: e.at + start } : {}) })),
    ...(g.defense ? { defense: structuredClone(g.defense) as DefenseInning[] } : {}),
    ...(g.present ? { present: [...g.present] } : {}),
    seasonId,
    date: localDate(start),
    opponent: g.opponent,
    opponentAbbr: g.opponentAbbr,
    park: g.park,
    saved,
    ruleSetId: 'fc-2hr',
  };
}

/** The sample team, dated around `now`. */
export function sampleTeam(sample: SampleSeason, now: number): Team {
  const team = newTeam(newId(), sample.team.name);
  team.abbr = sample.team.abbr;
  team.colors = { ...sample.team.colors };
  team.players = structuredClone(sample.players);
  const season = seasonFor(team, localDate(now));
  const played = sample.games.map((g, n) => placed(g, gameNight(now, -7 * (sample.games.length - n)), season.id, true));
  // Tonight's game started long enough ago to reach its last play a minute ago.
  const lastAt = sample.tonight.events.reduce((m, e) => Math.max(m, e.at ?? 0), 0);
  const tonight = placed(sample.tonight, now - lastAt - 60_000, season.id, false);
  season.start = played[0]?.date ?? localDate(now);
  const entry = (g: SavedGame): ScheduledGame => ({
    id: newId(),
    seasonId: season.id,
    date: g.date,
    time: hhmm(g.setup.startedAt!),
    opponent: g.opponent,
    park: g.park,
    side: g.setup.us,
    gameId: g.id,
  });
  const upcoming: ScheduledGame[] = sample.upcoming.map((u, n) => ({
    id: newId(),
    seasonId: season.id,
    date: localDate(gameNight(now, 7 * (n + 1))),
    time: '18:30',
    opponent: u.opponent,
    park: u.park,
    side: u.side === 'home' ? 'home' : 'away',
  }));
  // Made-up weather for the sample's games, so the board and the Book show what a real game saves.
  const skies = [[71, 'Clear', 5], [64, 'Partly Cloudy', 9], [58, 'Cloudy', 12], [77, 'Clear', 4], [69, 'Partly Cloudy', 7], [62, 'Clear', 6]] as const;
  played.forEach((g, n) => {
    const [tempF, sky, windMph] = skies[n % skies.length]!;
    g.weather = { tempF, sky, windMph, at: g.setup.startedAt! };
  });
  tonight.weather = { tempF: 68, sky: 'Clear', windMph: 6, at: tonight.setup.startedAt! };
  team.games = [...played, tonight];
  team.seasons = [season];
  team.currentSeasonId = season.id;
  team.currentGameId = tonight.id;
  team.schedule = [...[...played, tonight].map(entry), ...upcoming];
  return team;
}
