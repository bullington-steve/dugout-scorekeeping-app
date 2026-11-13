/*
 * The interface icon set: one stroke weight (--icon-stroke), drawn from the
 * game's own things. No generic tech symbols (CLAUDE.md, Look).
 */
import { svg } from './dom.ts';

const PATHS: Record<string, string[]> = {
  // The tabs (Steve's pick, Nov 13: outline to fill). A diamond with the infield inside.
  game: ['M12 4.2 19.8 12 12 19.8 4.2 12Z', 'M12 15.2 8.8 12 12 8.8 15.2 12Z'],
  // An open scorebook.
  book: ['M12 6.6C9.6 5 6.6 4.7 3.5 5.3v12.9c3.1-.6 6.1-.3 8.5 1.3 2.4-1.6 5.4-1.9 8.5-1.3V5.3c-3.1-.6-6.1-.3-8.5 1.3Z', 'M12 6.6v12.9'],
  // Three bars, short to tall, on a base line (Steve, Nov 13: the spray chart didn't read).
  stats: ['M3.5 20.5h17', 'M5.5 13.5h3.4v7H5.5Z', 'M10.3 9h3.4v11.5h-3.4Z', 'M15.1 4.5h3.4v16h-3.4Z'],
  // Binoculars for scouting.
  scout: ['M6.8 19.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z', 'M17.2 19.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z', 'M10.4 15.4h3.2', 'M4 14 6.3 6.2h3.3l.6 6.6', 'M20 14l-2.3-7.8h-3.3l-.6 6.6'],
  // A jersey.
  team: ['M8.6 3.8 4.4 6 3 10.3l3.2 1.4v8.5h11.6v-8.5l3.2-1.4L19.6 6l-4.2-2.2c-.5 1.5-1.8 2.4-3.4 2.4s-2.9-.9-3.4-2.4Z'],
  // Settings gear: eight even teeth around a round hub (redrawn Nov 12; the old one had lopsided teeth).
  gear: ['M9.84 4.92 L9.84 2.65 L14.16 2.65 L14.16 4.92 A7.4 7.4 0 0 1 15.47 5.47 L17.09 3.86 L20.14 6.91 L18.53 8.53 A7.4 7.4 0 0 1 19.08 9.84 L21.35 9.84 L21.35 14.16 L19.08 14.16 A7.4 7.4 0 0 1 18.53 15.47 L20.14 17.09 L17.09 20.14 L15.47 18.53 A7.4 7.4 0 0 1 14.16 19.08 L14.16 21.35 L9.84 21.35 L9.84 19.08 A7.4 7.4 0 0 1 8.53 18.53 L6.91 20.14 L3.86 17.09 L5.47 15.47 A7.4 7.4 0 0 1 4.92 14.16 L2.65 14.16 L2.65 9.84 L4.92 9.84 A7.4 7.4 0 0 1 5.47 8.53 L3.86 6.91 L6.91 3.86 L8.53 5.47 A7.4 7.4 0 0 1 9.84 4.92Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  // Undo: a curved arrow back.
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  // Lineups: a lineup card.
  lineup: ['M5 3.5h14v17H5Z', 'M8 8h8', 'M8 12h8', 'M8 16h5'],
  // Defense: the field fan, with the infield diamond.
  defense: ['M12 20.5 3.5 12A12 12 0 0 1 20.5 12Z', 'M12 20.5 8 16.5 12 12.5l4 4Z'],
  // Music: two beamed notes (Steve, Nov 12: the keyboard didn't read as the Organ).
  organ: ['M9 17V6l11-2.5v11', 'M9 9.5l11-2.5', 'M4.4 17a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0Z', 'M15.4 14.5a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0Z'],
  // A ballpark PA horn (the speaker), and with a slash for sound off.
  speaker: ['M4 9.5h3.5L13 5v14l-5.5-4.5H4Z', 'M16 9.5a3.5 3.5 0 0 1 0 5', 'M18.5 7a7 7 0 0 1 0 10'],
  speakerOff: ['M4 9.5h3.5L13 5v14l-5.5-4.5H4Z', 'M16.5 9.5l4 5', 'M20.5 9.5l-4 5'],
  // A pushpin, the kind that holds a lineup card to the dugout board.
  pin: ['M9 3.5h6', 'M10 3.5v5.5L7 13h10l-3-4V3.5', 'M12 13v7.5'],
};

/**
 * Solid versions of the tab icons, for the tab you're on: `fill` paths are
 * filled, `cut` lines are drawn in the bar's own color over them.
 */
const SOLID: Record<string, { fill: string[]; cut: string[] }> = {
  game: { fill: ['M12 4.2 19.8 12 12 19.8 4.2 12Z'], cut: ['M12 15.2 8.8 12 12 8.8 15.2 12Z'] },
  book: {
    fill: ['M12 6.6C9.6 5 6.6 4.7 3.5 5.3v12.9c3.1-.6 6.1-.3 8.5 1.3 2.4-1.6 5.4-1.9 8.5-1.3V5.3c-3.1-.6-6.1-.3-8.5 1.3Z'],
    cut: ['M12 7.2v11.6', 'M6 9h3.5', 'M6 12h3.5', 'M14.5 9H18', 'M14.5 12H18'],
  },
  stats: { fill: ['M5.5 13.5h3.4v7H5.5Z', 'M10.3 9h3.4v11.5h-3.4Z', 'M15.1 4.5h3.4v16h-3.4Z', 'M3.5 20.5h17'], cut: [] },
  scout: {
    fill: ['M6.8 19.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z', 'M17.2 19.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z', 'M4 14 6.3 6.2h3.3l.6 6.6Z', 'M20 14l-2.3-7.8h-3.3l-.6 6.6Z', 'M10.4 15.4h3.2'],
    cut: ['M5.6 14.4a1.4 1.4 0 0 1 1.4-1.2', 'M16 14.4a1.4 1.4 0 0 1 1.4-1.2'],
  },
  team: {
    fill: ['M8.6 3.8 4.4 6 3 10.3l3.2 1.4v8.5h11.6v-8.5l3.2-1.4L19.6 6l-4.2-2.2c-.5 1.5-1.8 2.4-3.4 2.4s-2.9-.9-3.4-2.4Z'],
    cut: ['M10.4 11.5h3.2l-2 5.5'],
  },
};

export function icon(name: keyof typeof PATHS, size = 24): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', width: size, height: size, class: 'sk-icon', 'aria-hidden': 'true', focusable: 'false' },
    ...(PATHS[name] ?? []).map((d) => svg('path', { d })),
  );
}

/** A tab icon in both forms: the outline, and the solid one shown while that tab is open. */
export function tabIcon(name: 'game' | 'book' | 'stats' | 'scout' | 'team', size = 24): SVGSVGElement {
  const solid = SOLID[name]!;
  return svg(
    'svg',
    { viewBox: '0 0 24 24', width: size, height: size, class: 'sk-icon sk-tab-icon', 'aria-hidden': 'true', focusable: 'false' },
    svg('g', { class: 'sk-icon-line' }, ...(PATHS[name] ?? []).map((d) => svg('path', { d }))),
    svg('g', { class: 'sk-icon-solid' }, ...solid.fill.map((d) => svg('path', { d, class: 'sk-icon-fill' })), ...solid.cut.map((d) => svg('path', { d, class: 'sk-icon-cut' }))),
  );
}
