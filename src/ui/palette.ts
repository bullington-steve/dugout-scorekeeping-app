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
