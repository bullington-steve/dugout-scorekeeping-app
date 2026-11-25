/* CSV export and Directions (Steve, Nov 25). */
import { describe, expect, it } from 'vitest';
import { battingCsv, csv, gamesCsv } from '../../src/share/csv.ts';
import { directionsUrl, placeName } from '../../src/share/maps.ts';
import { emptyCounts } from '../../src/stats/batting.ts';

describe('CSV export', () => {
  it('quotes commas, quotes, and line breaks, and starts with a byte-order mark for Excel', () => {
    const text = csv([['Name', 'Note'], ['Pruitt, Travis Jr.', 'said "two"'], ['Bodø', 'a\nb']]);
    expect(text.startsWith('﻿')).toBe(true);
    expect(text).toBe('﻿Name,Note\r\n"Pruitt, Travis Jr.","said ""two"""\r\nBodø,"a\nb"\r\n');
  });

  it('batting: a header and one row per batter by name, with rates to three places', () => {
    const c = { ...emptyCounts(), G: 2, PA: 5, AB: 4, H: 2, '1B': 1, HR: 1, RBI: 3, BB: 1, R: 2, TB: 5 };
    const rows = battingCsv([
      { name: 'Wendt, Cody', number: '4', c },
      { name: 'Dorsey, Moose', number: '12', c: emptyCounts() },
    ]).replace('﻿', '').trim().split('\r\n');
    expect(rows[0]).toBe('Player,No.,G,PA,AB,R,H,1B,2B,3B,HR,RBI,BB,K,SF,AVG,OBP,SLG,OPS');
    expect(rows[1]!.startsWith('"Dorsey, Moose",12,0,0,0')).toBe(true);
    expect(rows[2]).toBe('"Wendt, Cody",4,2,5,4,2,2,1,0,0,1,3,1,0,0,0.500,0.600,1.250,1.850');
  });

  it('games: oldest first, with the date as YYYY-MM-DD so a spreadsheet sorts it', () => {
    const rows = gamesCsv([
      { date: '2026-11-22', opponent: 'Hackers', side: 'Away', park: 'Fossil Creek Park #1', result: 'W', runsFor: 2, runsAgainst: 1 },
      { date: '2026-11-08', opponent: 'Two Left Mitts', side: 'Home', park: '', result: 'L', runsFor: 0, runsAgainst: 3 },
    ]).replace('﻿', '').trim().split('\r\n');
    expect(rows).toEqual(['Date,Opponent,Home or Away,Park,Result,Runs For,Runs Against', '2026-11-08,Two Left Mitts,Home,,L,0,3', '2026-11-22,Hackers,Away,Fossil Creek Park #1,W,2,1']);
  });
});

describe('Directions', () => {
  it('drops the field number and opens Apple Maps directions to the park', () => {
    expect(placeName('Rolland Moore Park #3')).toBe('Rolland Moore Park');
    expect(placeName('Spring Canyon Park, Field 2')).toBe('Spring Canyon Park');
    expect(placeName('Edora Park')).toBe('Edora Park');
    expect(directionsUrl('Rolland Moore Park #3')).toBe('https://maps.apple.com/?daddr=Rolland%20Moore%20Park&dirflg=d');
  });
});
