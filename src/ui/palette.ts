/*
 * Team colors (the 18-color palette in SPEC §9). These are data, not the
 * app's theme: they appear only where they mean "your team" (the score
 * stripe and badge), set as a custom property on that element.
 */
export const TEAM_PALETTE: Record<string, string> = {
  navy: '#13213d',
  'royal blue': '#1d4fb8',
  'columbia blue': '#7fb2e5',
  teal: '#00807f',
  red: '#c8142f',
  cardinal: '#9d2235',
  maroon: '#6b1d2c',
  pink: '#e5739b',
  orange: '#f26b1d',
  gold: '#e3b23c',
  yellow: '#ffd23f',
  'kelly green': '#1f9d48',
  'forest green': '#1d4a2c',
  purple: '#5b2c8a',
  black: '#111111',
  silver: '#b7bcc2',
  white: '#ffffff',
  brown: '#6b4423',
};

export function teamColor(name: string | undefined, fallback = '#13213d'): string {
  if (!name) return fallback;
  const key = name.toLowerCase();
  if (TEAM_PALETTE[key]) return TEAM_PALETTE[key];
  return /^#[0-9a-f]{6}$/i.test(name) ? name : fallback;
}

/** The 18-color palette, in the order the swatch rows show it. */
export const PALETTE_NAMES = [
  'navy', 'royal blue', 'columbia blue', 'teal', 'red', 'cardinal', 'maroon', 'pink', 'orange',
  'gold', 'yellow', 'kelly green', 'forest green', 'purple', 'black', 'silver', 'white', 'brown',
] as const;

export function titleCaseColor(name: string): string {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Big League Colors: 30 presets named by city abbreviation, never team
 * names (two each for Chicago, Los Angeles, and New York).
 */
export const BIG_LEAGUE: { label: string; primary: string; secondary: string }[] = [
  ['ARI Red/Black', 'cardinal', 'black'],
  ['ATL Navy/Red', 'navy', 'red'],
  ['BAL Orange/Black', 'orange', 'black'],
  ['BOS Red/Navy', 'red', 'navy'],
  ['CHI Blue/Red', 'royal blue', 'red'],
  ['CHI White/Black', 'white', 'black'],
  ['CIN Red/White', 'red', 'white'],
  ['CLE Navy/Red', 'navy', 'red'],
  ['COL Purple/Black', 'purple', 'black'],
  ['DET Navy/Orange', 'navy', 'orange'],
  ['HOU Orange/Navy', 'orange', 'navy'],
  ['KC Blue/Gold', 'royal blue', 'gold'],
  ['LA Blue/White', 'royal blue', 'white'],
  ['LA Red/Navy', 'red', 'navy'],
  ['MIA Teal/Black', 'teal', 'black'],
  ['MIL Navy/Gold', 'navy', 'gold'],
  ['MIN Navy/Red', 'navy', 'red'],
  ['NY Navy/White', 'navy', 'white'],
  ['NY Blue/Orange', 'royal blue', 'orange'],
  ['PHI Red/Blue', 'red', 'royal blue'],
  ['PIT Black/Gold', 'black', 'gold'],
  ['SAC Green/Gold', 'forest green', 'gold'],
  ['SD Brown/Gold', 'brown', 'gold'],
  ['SEA Navy/Teal', 'navy', 'teal'],
  ['SF Orange/Black', 'orange', 'black'],
  ['STL Cardinal/Navy', 'cardinal', 'navy'],
  ['TB Navy/Columbia Blue', 'navy', 'columbia blue'],
  ['TEX Blue/Red', 'royal blue', 'red'],
  ['TOR Blue/Columbia Blue', 'royal blue', 'columbia blue'],
  ['WSH Red/Navy', 'red', 'navy'],
].map(([label, primary, secondary]) => ({ label: label!, primary: primary!, secondary: secondary! }));

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/**
 * The team badge: the primary color, unless it's too close to the navy
 * board behind it, then the secondary; text in whichever of white or navy
 * reads better on it.
 */
export function badgeColors(primary: string, secondary: string): { bg: string; ink: string } {
  const navy = TEAM_PALETTE.navy!;
  const p = teamColor(primary);
  const bg = contrastRatio(p, navy) < 1.6 ? teamColor(secondary, p) : p;
  const ink = contrastRatio(bg, '#ffffff') >= contrastRatio(bg, navy) ? '#ffffff' : navy;
  return { bg, ink };
}
