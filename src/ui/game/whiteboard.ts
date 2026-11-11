/*
 * The Defense card as Steve writes it on the dugout whiteboard (SPEC §9):
 * positions down the side; innings 1 and 5, 2 and 6, 3 and 7 share a column,
 * and 4 stands alone. A picture to save or send to the team.
 */
import type { App } from '../../app/app.ts';
import type { Pos } from '../../engine/types.ts';
import { POSITION_ABBR } from '../../engine/words.ts';
import { cardInnings, cardPlayers, FIELD_ORDER, fullCard, planInnings, whiteboardColumns } from '../../game/defense.ts';
import { shareFile } from '../../store/share.ts';
import type { SavedGame } from '../../store/model.ts';
import { h } from '../dom.ts';
import { PICTURE } from '../picture.ts';
import { openSheet } from '../sheet.ts';
import { shortNames } from './defensecard.ts';

const W = 1080;
const FRAME = 26;
const LABEL_W = 120;
const ROW_H = 64;
const HEAD_H = 70;
const TITLE_H = 84;
const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';

export interface WhiteboardRow {
  label: string;
  cells: string[];
}

/** The words on the board: one row per position played, then who sits. */
export function whiteboardRows(app: App, game: SavedGame): { heads: string[]; rows: WhiteboardRow[] } {
  const players = cardPlayers(game);
  const names = shortNames(app, players);
  const n = Math.max(planInnings(game), Math.min(cardInnings(game), 7));
  const card = fullCard(game, n, players);
  const cols = whiteboardColumns(n);
  const used = FIELD_ORDER.filter((pos) => card.some((inning) => Object.values(inning).includes(pos)));
  const at = (inning: number, pos: Pos) => {
    const c = card[inning - 1]!;
    const id = Object.keys(c).find((p) => c[p] === pos);
    return id ? names.get(id)! : 'Open';
  };
  const sitting = (inning: number) => {
    const c = card[inning - 1]!;
    const who = players.filter((p) => typeof c[p] !== 'number').map((p) => names.get(p)!);
    return who.length ? who.join(', ') : 'No One';
  };
  const join = (parts: string[]) => (parts.length === 2 && parts[0] === parts[1] ? parts[0]! : parts.join(' / '));
  const rows: WhiteboardRow[] = used.map((pos) => ({ label: POSITION_ABBR[pos], cells: cols.map((col) => join(col.map((i) => at(i, pos)))) }));
  rows.push({ label: 'Sit', cells: cols.map((col) => join(col.map(sitting))) });
  return { heads: cols.map((col) => col.join(' · ')), rows };
}

/** Fit text into a width by shrinking it, down to a floor; then wrap to two lines. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, weight = 600): void {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > width && s > 22) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  if (ctx.measureText(text).width <= width) {
    ctx.fillText(text, x, y);
    return;
  }
  const parts = text.split(' / ');
  const lines = parts.length === 2 ? [`${parts[0]} /`, parts[1]!] : [text.slice(0, Math.ceil(text.length / 2)), text.slice(Math.ceil(text.length / 2))];
  ctx.fillText(lines[0]!, x, y - s * 0.5, width);
  ctx.fillText(lines[1]!, x, y + s * 0.5, width);
}

export async function drawWhiteboard(app: App, game: SavedGame): Promise<HTMLCanvasElement> {
  const { heads, rows } = whiteboardRows(app, game);
  const H = FRAME * 2 + TITLE_H + HEAD_H + rows.length * ROW_H + 24;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  try {
    await document.fonts.load(`600 34px "Barlow Condensed"`);
  } catch {
    // The fallback face is fine.
  }

  // Aluminum frame: a light top-left edge, a darker bottom-right, like brushed metal in daylight.
  const metal = ctx.createLinearGradient(0, 0, W, H);
  metal.addColorStop(0, PICTURE.boardFrameHi);
  metal.addColorStop(0.5, PICTURE.boardFrame);
  metal.addColorStop(1, PICTURE.boardFrameDark);
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 14);
  ctx.fill();
  ctx.fillStyle = PICTURE.board;
  ctx.fillRect(FRAME, FRAME, W - FRAME * 2, H - FRAME * 2);
  // A faint shadow where the board meets the frame.
  ctx.fillStyle = PICTURE.boardLine;
  ctx.fillRect(FRAME, FRAME, W - FRAME * 2, 2);
  ctx.fillRect(FRAME, FRAME, 2, H - FRAME * 2);

  const left = FRAME + 18;
  const right = W - FRAME - 18;
  const colW = (right - left - LABEL_W) / heads.length;
  ctx.textBaseline = 'middle';

  // Title.
  ctx.fillStyle = PICTURE.markerBlue;
  ctx.textAlign = 'left';
  const team = app.team?.name ?? 'Defense';
  fitText(ctx, `${team} vs ${game.opponent}`.toUpperCase(), left, FRAME + TITLE_H / 2 + 4, right - left, 44, 700);

  // Inning heads, in red marker.
  let y = FRAME + TITLE_H;
  ctx.fillStyle = PICTURE.markerRed;
  ctx.textAlign = 'center';
  heads.forEach((head, i) => fitText(ctx, head, left + LABEL_W + colW * i + colW / 2, y + HEAD_H / 2, colW - 12, 40, 700));
  ctx.strokeStyle = PICTURE.markerRed;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, y + HEAD_H - 6);
  ctx.lineTo(right, y + HEAD_H - 6);
  ctx.stroke();
  y += HEAD_H;

  // Column rules, in black marker.
  ctx.strokeStyle = PICTURE.markerBlack;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < heads.length; i++) {
    const x = left + LABEL_W + colW * i;
    ctx.moveTo(x, FRAME + TITLE_H + 8);
    ctx.lineTo(x, y + rows.length * ROW_H - 4);
  }
  ctx.stroke();

  rows.forEach((row, r) => {
    const cy = y + r * ROW_H + ROW_H / 2;
    ctx.fillStyle = PICTURE.markerRed;
    ctx.textAlign = 'left';
    fitText(ctx, row.label, left + 4, cy, LABEL_W - 12, 38, 700);
    ctx.fillStyle = PICTURE.markerBlack;
    ctx.textAlign = 'center';
    row.cells.forEach((cell, i) => fitText(ctx, cell, left + LABEL_W + colW * i + colW / 2, cy, colW - 16, 34));
    if (r === rows.length - 2) {
      // A line above the Sit row.
      ctx.strokeStyle = PICTURE.markerBlack;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left, cy + ROW_H / 2);
      ctx.lineTo(right, cy + ROW_H / 2);
      ctx.stroke();
    }
  });
  return canvas;
}

export async function openWhiteboard(app: App, game: SavedGame): Promise<void> {
  const canvas = await drawWhiteboard(app, game);
  const { heads, rows } = whiteboardRows(app, game);
  const img = h('img', { class: 'df-board', src: canvas.toDataURL('image/png'), alt: `Defense whiteboard. Columns: innings ${heads.join(', ')}.` });
  // The same words as a list, for VoiceOver.
  const list = h(
    'div',
    { class: 'sk-visually-hidden' },
    h('ul', {}, ...rows.map((r) => h('li', {}, `${r.label}: ${r.cells.map((c, i) => `innings ${heads[i]}, ${c}`).join('; ')}`))),
  );
  const share = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Share Picture');
  share.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (blob) void shareFile(`defense-${game.date}.png`, blob);
    }, 'image/png');
  });
  openSheet({
    title: 'Whiteboard',
    full: true,
    body: [h('p', { class: 'sk-row-note' }, 'Innings 1 and 5, 2 and 6, and 3 and 7 share a column; 4 stands alone.'), img, list, share],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}
