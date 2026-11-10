// What's New is written in the voice of a ballpark PA announcer or
// scorekeeper, never a changelog. A unit test checks the house rules
// (no emoji, no exclamation points, no em dashes, no changelog words).

export interface WhatsNewEntry {
  version: string;
  headline: string;
  lines: string[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: '2026.11.10-1',
    headline: 'The Lights Come On',
    lines: [
      'Good evening, and welcome to a brand-new ballpark.',
      'The grounds crew is rebuilding ScoreKept from the dirt up: new foundation, fresh chalk, and a scoreboard on the way.',
      'Tonight’s page is small, but it already installs to your Home Screen and follows your iPhone’s light appearance, Dark Mode, and text size.',
      'Scoring returns soon. Your season will make the trip with it.',
    ],
  },
];
