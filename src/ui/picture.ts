/*
 * PICTURE: the one named color set for drawn pictures (the field, and later
 * the Recap and Scorecard images). Fixed in both appearances, like the real
 * thing (CLAUDE.md, Look).
 */
export const PICTURE = {
  foul: '#3d6e37',
  grass: '#4d8a45',
  grassMow: '#559650',
  track: '#9c7650',
  dirt: '#b9875a',
  chalk: '#ffffff',
  fence: '#1f3d2a',
  base: '#f4f1ea',
  label: '#ffffff',
  labelEdge: '#13213d',
  marker: '#ffd23f',
  markerEdge: '#13213d',
  trail: '#ffffff',
  // Spray chart dots: color plus a mark that doesn't need color (SPEC §7).
  dot1B: '#3fbf5a',
  dot2B: '#3b7bff',
  dot3B: '#a35bff',
  dotHR: '#ffc93c',
  dotOut: '#ffffff',
  dotE: '#ff3b3b',
  dotEdge: '#0b1730',
  // The dugout whiteboard: a white board in an aluminum frame, dry-erase markers.
  board: '#f7f7f3',
  boardLine: '#c9ccd3',
  boardFrame: '#b8bec7',
  boardFrameDark: '#7d858f',
  boardFrameHi: '#e9edf2',
  markerBlack: '#1b1e24',
  markerBlue: '#16357a',
  markerRed: '#b3121f',
} as const;
