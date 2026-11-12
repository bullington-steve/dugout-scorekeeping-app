/*
 * The interface icon set: one stroke weight (--icon-stroke), drawn from the
 * game's own things. No generic tech symbols (CLAUDE.md, Look).
 */
import { svg } from './dom.ts';

const PATHS: Record<string, string[]> = {
  // A diamond with its bases.
  game: ['M12 3.5 20.5 12 12 20.5 3.5 12Z', 'M12 2.2l1.6 1.6-1.6 1.6-1.6-1.6Z', 'M20.7 10.4l1.6 1.6-1.6 1.6-1.6-1.6Z', 'M3.3 10.4l1.6 1.6-1.6 1.6-1.6-1.6Z'],
  // An open scorebook.
  book: ['M12 6.5C9.5 4.8 6.3 4.5 3 5.2v13c3.3-.7 6.5-.4 9 1.3 2.5-1.7 5.7-2 9-1.3v-13c-3.3-.7-6.5-.4-9 1.3Z', 'M12 6.5v13'],
  // A spray chart: the foul lines, the infield arc, and where balls landed (Steve, Nov 12).
  stats: ['M12 21.5 2.5 12', 'M12 21.5 21.5 12', 'M8 17.5A5.5 5.5 0 0 1 16 17.5', 'M4.4 8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0', 'M10.4 3.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0', 'M17.4 7.2a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0', 'M14.4 11.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0'],
  // Binoculars for scouting.
  scout: ['M6.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M17.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M10 15.5h4', 'M4 13.5 6.2 6h3.3l.5 6.5', 'M20 13.5 17.8 6h-3.3l-.5 6.5'],
  // A jersey.
  team: ['M8.5 3.5 4 6 2.5 10.5 6 12v8.5h12V12l3.5-1.5L20 6l-4.5-2.5c-.5 1.6-1.9 2.5-3.5 2.5s-3-.9-3.5-2.5Z'],
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

export function icon(name: keyof typeof PATHS, size = 24): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', width: size, height: size, class: 'sk-icon', 'aria-hidden': 'true', focusable: 'false' },
    ...(PATHS[name] ?? []).map((d) => svg('path', { d })),
  );
}
