/*
 * The two pictures to share (SPEC §15). Drawn on a canvas in fixed picture
 * colors (they look the same whatever the iPhone's appearance), and in the
 * app's own type: Alfa Slab One titles, Barlow Condensed numbers, and the
 * scorekeeper's hand for the Book.
 *
 * - Recap: phone-shaped. Final (or the inning), the date and park, both
 *   teams with our colors, a WIN / LOSS / TIE badge, the line score with
 *   R H E, and Stars of the Game.
 * - Scorecard: the line score on a green board, then our Book page: each
 *   at-bat's code in pencil, outs circled in red pen, runs in highlighter,
 *   and AB R H RBI.
 */
import { bookNames, bookPage, rowTotals } from '../../app/book.ts';
import type { Recap } from '../../share/recap.ts';
import type { Opponent, SavedGame, Team } from '../../store/model.ts';
import { badgeColors } from '../palette.ts';
import { markOutline } from '../teammark.ts';
import { PICTURE } from '../picture.ts';

const TITLE = '"Alfa Slab One", Georgia, serif';
const BOARD = '"Barlow Condensed", "Arial Narrow", sans-serif';
const HAND = '"Steve Hand", "Kalam", cursive';
const BODY = '-apple-system, "Helvetica Neue", Helvetica, sans-serif';

async function fontsReady(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(`40px ${TITLE}`), document.fonts.load(`700 40px ${BOARD}`), document.fonts.load(`40px ${HAND}`)]);
  } catch {
    // Fallback faces are fine.
  }
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function fit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, font: (size: number) => string, size: number): void {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > max && s > 12) ctx.font = font((s -= 2));
  ctx.fillText(text, x, y);
}

/** The line score on a green board, with R H E. */
function lineScore(ctx: CanvasRenderingContext2D, r: Recap, x: number, y: number, w: number): number {
  const rowH = 64;
  const h = rowH * 3 + 28;
  ctx.fillStyle = PICTURE.boardGreen;
  ctx.strokeStyle = PICTURE.boardFrameMetal;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
  const nameW = 150;
  const totW = 64 * 3;
  const innW = Math.min(64, (w - nameW - totW - 40) / r.innings);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `700 30px ${BOARD}`;
  ctx.fillStyle = PICTURE.boardGold;
  for (let i = 0; i < r.innings; i++) ctx.fillText(String(i + 1), x + 20 + nameW + innW * (i + 0.5), y + 14 + rowH / 2);
  ['R', 'H', 'E'].forEach((k, i) => ctx.fillText(k, x + w - 20 - totW + 64 * (i + 0.5), y + 14 + rowH / 2));
  r.lines.forEach((l, row) => {
    const cy = y + 14 + rowH * (row + 1.5);
    ctx.textAlign = 'left';
    ctx.fillStyle = PICTURE.boardInk;
    fit(ctx, l.abbr, x + 24, cy, nameW - 16, (s) => `700 ${s}px ${BOARD}`, 40);
    ctx.textAlign = 'center';
    ctx.font = `700 38px ${BOARD}`;
    l.innings.forEach((v, i) => {
      ctx.fillStyle = PICTURE.boardInk;
      // x only for a home half that wasn't needed; an inning still being played is blank.
      ctx.fillText(v === null ? (r.final ? 'x' : '') : String(v), x + 20 + nameW + innW * (i + 0.5), cy);
    });
    [l.r, l.h, l.e].forEach((v, i) => {
      ctx.fillStyle = i === 0 ? PICTURE.boardBulb : PICTURE.boardInk;
      ctx.fillText(String(v), x + w - 20 - totW + 64 * (i + 0.5), cy);
    });
  });
  return h;
}

export async function drawRecap(r: Recap, team: Team, when: string, scorer: string, opponent?: Opponent): Promise<HTMLCanvasElement> {
  await fontsReady();
  const W = 1080;
  const H = 1720;
  const [c, ctx] = canvas(W, H);
  const ours = badgeColors(team.colors.primary, team.colors.secondary);
  // A navy night with our color across the top.
  ctx.fillStyle = PICTURE.recapNight;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ours.bg;
  ctx.fillRect(0, 0, W, 22);
  ctx.fillStyle = ours.ring;
  ctx.fillRect(0, 22, W, 8);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PICTURE.recapGold;
  ctx.font = `700 46px ${BOARD}`;
  ctx.fillText(r.status.toUpperCase(), W / 2, 110);
  ctx.fillStyle = PICTURE.recapInk;
  ctx.font = `34px ${BODY}`;
  ctx.fillText([when, r.park].filter(Boolean).join(' · '), W / 2, 162);

  // The two teams, ours in our colors.
  // Our felt pennant on the night block (Steve, Nov 17): the primary felt, the secondary staff stripe,
  // jersey lettering outlined in the secondary, and the outline that always shows on the night.
  const flag = (x: number, y: number, w: number, h: number, abbr: string, colors: { primary: string; secondary: string }) => {
    const ours = badgeColors(colors.primary, colors.secondary);
    const stripe = Math.round(h * 0.16);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = ours.bg;
    ctx.fill();
    ctx.fillStyle = ours.ring;
    ctx.fillRect(x, y, stripe, h);
    // The outline rule (Steve, Nov 17): the secondary when it reaches 3:1 on the navy night, else cream.
    ctx.strokeStyle = markOutline(colors.secondary, 'recap');
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    let size = Math.round(h * 0.42);
    const room = (s: number) => w * (1 - (0.7 * s + 8) / h) - (stripe + 8);
    ctx.font = `700 ${size}px ${BOARD}`;
    while (size > 24 && ctx.measureText(abbr).width > room(size)) {
      size -= 2;
      ctx.font = `700 ${size}px ${BOARD}`;
    }
    const cx = x + (stripe + 8 + w * (1 - (0.7 * size + 8) / h)) / 2;
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.strokeStyle = ours.ring;
    ctx.strokeText(abbr, cx, y + h / 2 + size * 0.35);
    ctx.fillStyle = ours.ink;
    ctx.fillText(abbr, cx, y + h / 2 + size * 0.35);
  };
  // The two teams on the night's blocks, each with its pennant (Steve, Nov 17: opponents get their
  // colors too); an opponent never saved shows its short name instead.
  const block = (l: Recap['us'], y: number, mine: boolean) => {
    ctx.fillStyle = PICTURE.recapBlock;
    ctx.beginPath();
    ctx.roundRect(60, y, W - 120, 200, 24);
    ctx.fill();
    const colors = mine ? team.colors : opponent?.colors;
    const nameX = colors ? 330 : 100;
    if (colors) flag(96, y + 40, 210, 120, l.abbr, colors);
    ctx.fillStyle = PICTURE.recapInk;
    ctx.textAlign = 'left';
    fit(ctx, l.name, nameX, y + 92, colors ? 420 : 620, (s) => `${s}px ${TITLE}`, 56);
    ctx.font = `700 34px ${BOARD}`;
    if (!colors) ctx.fillText(l.abbr, 100, y + 150);
    ctx.textAlign = 'right';
    ctx.font = `700 150px ${BOARD}`;
    ctx.fillText(String(l.r), W - 100, y + 160);
  };
  const first = r.lines[0] === r.us;
  block(r.lines[0], 210, first);
  block(r.lines[1], 430, !first);

  // WIN / LOSS / TIE.
  if (r.result) {
    const word = { W: 'WIN', L: 'LOSS', T: 'TIE' }[r.result];
    ctx.fillStyle = r.result === 'W' ? PICTURE.recapWin : r.result === 'L' ? PICTURE.recapLoss : PICTURE.recapTie;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 130, 655, 260, 78, 39);
    ctx.fill();
    ctx.fillStyle = PICTURE.recapBadgeInk;
    ctx.textAlign = 'center';
    ctx.font = `700 52px ${BOARD}`;
    ctx.fillText(word, W / 2, 712);
  }

  const lsY = 770;
  const lsH = lineScore(ctx, r, 60, lsY, W - 120);

  // Stars of the Game.
  let y = lsY + lsH + 80;
  ctx.textAlign = 'left';
  ctx.fillStyle = PICTURE.recapGold;
  ctx.font = `44px ${TITLE}`;
  ctx.fillText('Stars of the Game', 60, y);
  y += 30;
  r.stars.forEach((s, i) => {
    y += i === 0 ? 110 : 130;
    if (i === 0) {
      ctx.fillStyle = PICTURE.recapGold;
      ctx.beginPath();
      ctx.roundRect(60, y - 60, 120, 56, 28);
      ctx.fill();
      ctx.fillStyle = PICTURE.recapBadgeInk;
      ctx.textAlign = 'center';
      ctx.font = `700 36px ${BOARD}`;
      ctx.fillText('MVP', 120, y - 20);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = PICTURE.recapInk;
    fit(ctx, s.name, i === 0 ? 200 : 60, y - 18, W - 260, (n) => `700 ${n}px ${BODY}`, i === 0 ? 48 : 40);
    ctx.fillStyle = PICTURE.recapSub;
    fit(ctx, s.line, i === 0 ? 200 : 60, y + 30, W - 260, (n) => `${n}px ${BODY}`, 34);
  });
  if (!r.stars.length) {
    ctx.fillStyle = PICTURE.recapSub;
    ctx.font = `34px ${BODY}`;
    ctx.fillText('The bats are just warming up.', 60, y + 90);
  }

  ctx.fillStyle = PICTURE.recapSub;
  ctx.textAlign = 'center';
  ctx.font = `30px ${BODY}`;
  ctx.fillText(scorer ? `Kept by ${scorer} · ScoreKept` : 'Kept in ScoreKept', W / 2, H - 50);
  return c;
}

export async function drawScorecard(r: Recap, game: SavedGame, team: Team, when: string, scorer: string): Promise<HTMLCanvasElement> {
  await fontsReady();
  const page = bookPage(game, 'us');
  const cols = page.innings.reduce((n, i) => n + (page.widths.get(i) ?? 1), 0);
  const W = Math.max(1400, 360 + cols * 110 + 4 * 70 + 60);
  const rowH = 96;
  const top = 360;
  const H = top + 80 + rowH * page.rows.length + 120;
  const [c, ctx] = canvas(W, H);
  // A scorebook page: cream paper, faint rules.
  ctx.fillStyle = PICTURE.bookPaper;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = PICTURE.bookInkNavy;
  fit(ctx, `${team.name} vs ${game.opponent}`, W / 2, 64, W - 80, (s) => `${s}px ${TITLE}`, 44);
  ctx.font = `30px ${BODY}`;
  ctx.fillText([when, r.park, r.status].filter(Boolean).join(' · '), W / 2, 108);
  lineScore(ctx, r, 40, 140, Math.min(W - 80, 1100));

  // The grid.
  const x0 = 40;
  const numW = 60;
  const nameW = 300;
  const boxW = 110;
  const gridTop = top + 40;
  ctx.strokeStyle = PICTURE.bookRule;
  ctx.lineWidth = 2;
  ctx.font = `700 30px ${BOARD}`;
  ctx.fillStyle = PICTURE.bookInkNavy;
  ctx.textBaseline = 'middle';
  let x = x0 + numW + nameW;
  for (const n of page.innings) {
    const span = page.widths.get(n) ?? 1;
    ctx.fillText(String(n), x + (boxW * span) / 2, gridTop);
    x += boxW * span;
  }
  ['AB', 'R', 'H', 'RBI'].forEach((k, i) => ctx.fillText(k, x + 70 * (i + 0.5), gridTop));
  const pencil = PICTURE.bookPencil;
  const ends: [number, number][] = [];
  // Names the way the Book writes them (Steve, Nov 17).
  const labels = bookNames(new Map(team.players.map((p) => [p.id, p.name])), team.bookNames ?? 'first');
  page.rows.forEach((row, ri) => {
    const y = gridTop + 30 + ri * rowH;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x + 280, y);
    ctx.stroke();
    ctx.fillStyle = PICTURE.bookInkNavy;
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${BOARD}`;
    ctx.fillText(String(row.slot + 1), x0 + numW / 2, y + rowH / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = pencil;
    const who = row.players.map((p) => labels.get(p) ?? team.players.find((q) => q.id === p)?.name ?? p).join(' / ');
    fit(ctx, who, x0 + numW + 8, y + rowH / 2, nameW - 16, (s) => `${s}px ${HAND}`, 36);
    let bx = x0 + numW + nameW;
    for (const n of page.innings) {
      const span = page.widths.get(n) ?? 1;
      const boxes = row.boxes.get(n) ?? [];
      for (let k = 0; k < span; k++) {
        const b = boxes[k];
        ctx.strokeStyle = PICTURE.bookRule;
        ctx.strokeRect(bx, y, boxW, rowH);
        if (b) {
          const cx = bx + boxW / 2;
          const cy = y + rowH / 2;
          if (b.scored) {
            ctx.fillStyle = PICTURE.bookHighlight;
            ctx.fillRect(bx + 6, y + 6, boxW - 12, rowH - 12);
          }
          ctx.fillStyle = pencil;
          ctx.textAlign = 'center';
          fit(ctx, b.code, cx, cy, boxW - 20, (s) => `${s}px ${HAND}`, 40);
          // End of the half-inning: drawn after every box, centered on this box's corner (below).
          if (b.halfEnd) ends.push([bx + boxW, y + rowH]);
          if (b.out) {
            const ox = bx + boxW - 20;
            ctx.strokeStyle = PICTURE.bookRedPen;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ox, y + rowH - 20, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = PICTURE.bookRedPen;
            ctx.font = `22px ${HAND}`;
            ctx.fillText(String(b.out), ox, y + rowH - 19);
            ctx.lineWidth = 2;
          }
        }
        bx += boxW;
      }
    }
    const t = rowTotals(row);
    ctx.fillStyle = pencil;
    ctx.textAlign = 'center';
    ctx.font = `36px ${HAND}`;
    [t.ab, t.r, t.h, t.rbi].forEach((v, i) => ctx.fillText(String(v), bx + 70 * (i + 0.5), y + rowH / 2));
  });
  // Half-inning slashes (as in the Book): a short, light pencil tick through the corner where the inning stopped; drawn last, over the box lines.
  for (const [cx, cy] of ends) {
    const k = boxW / 60;
    ctx.save();
    ctx.strokeStyle = pencil;
    ctx.lineWidth = 1.8 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 11 * k, cy + 11 * k);
    ctx.lineTo(cx + 11 * k, cy - 11 * k);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = PICTURE.bookInkNavy;
  ctx.textAlign = 'right';
  ctx.font = `30px ${HAND}`;
  ctx.fillText(scorer ? `Scored by ${scorer}` : 'ScoreKept', W - 40, H - 40);
  return c;
}

// ---- the player card (Steve, Nov 25) ----------------------------------------------------------

export interface CardPicture {
  name: string;
  number: string;
  line: string;
  /** Headline rows: a label ("Fall 2026", "Career") and six cells. */
  headlines: { label: string; cells: [string, string][] }[];
  /** The Seasons table: column heads and one row per season (and Career). */
  table: { heads: string[]; rows: string[][] };
  positions: { name: string; innings: number }[];
  /** The spray chart's field, already marked (its colors are its own attributes). */
  field: SVGSVGElement | null;
}

/** A section label: navy words underlined in red, like the card's own. */
function cardLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.font = `700 17px ${BOARD}`;
  ctx.fillStyle = PICTURE.cardInk;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
  ctx.fillStyle = PICTURE.cardRed;
  ctx.fillRect(x, y + 5, ctx.measureText(text).width, 2.5);
}

async function svgImage(el: SVGSVGElement): Promise<HTMLImageElement | null> {
  const copy = el.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * The player card as a picture to share: the light card as it looks in the app (the navy band with
 * the jersey patch and the name, the headline rows, the Seasons table, By Position, and the spray
 * chart), 393 points wide at 2×.
 */
export async function drawPlayerCard(c: CardPicture): Promise<HTMLCanvasElement> {
  await fontsReady();
  const W = 393;
  const pad = 20;
  const field = c.field ? await svgImage(c.field) : null;
  const fieldH = field ? Math.round(((W - 2 * pad) * 350) / 450) : 0;
  const tableH = c.table.rows.length ? 40 + 30 * (c.table.rows.length + 1) : 0;
  const posH = c.positions.length ? 40 + 30 * Math.min(6, c.positions.length) : 0;
  const H = 120 + c.headlines.length * 92 + tableH + posH + (field ? 44 + fieldH : 0) + 36;
  const scale = 2;
  const [cv, ctx] = canvas(W * scale, H * scale);
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';
  // Paper and the navy band.
  ctx.fillStyle = PICTURE.cardPaper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PICTURE.cardBand;
  ctx.fillRect(0, 0, W, 110);
  // The jersey patch: the number alone, like the jersey itself.
  if (c.number) {
    ctx.fillStyle = PICTURE.cardPatch;
    ctx.beginPath();
    ctx.roundRect(pad, 24, 64, 64, 10);
    ctx.fill();
    ctx.fillStyle = PICTURE.cardBand;
    ctx.textAlign = 'center';
    fit(ctx, c.number, pad + 32, 70, 56, (s) => `700 ${s}px ${BOARD}`, 38);
  }
  const nx = c.number ? pad + 80 : pad;
  ctx.textAlign = 'left';
  ctx.fillStyle = PICTURE.cardBandInk;
  fit(ctx, c.name, nx, 58, W - nx - pad, (s) => `700 ${s}px ${BOARD}`, 32);
  ctx.fillStyle = PICTURE.cardBandSub;
  fit(ctx, c.line, nx, 84, W - nx - pad, (s) => `600 ${s}px ${BOARD}`, 17);
  let y = 110 + 14;
  // Headline rows.
  for (const hl of c.headlines) {
    cardLabel(ctx, hl.label, pad, y + 18);
    const cw = (W - 2 * pad) / hl.cells.length;
    hl.cells.forEach(([k, v], i) => {
      const cx = pad + cw * i + cw / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = PICTURE.cardMuted;
      ctx.font = `600 15px ${BOARD}`;
      ctx.fillText(k, cx, y + 46);
      ctx.fillStyle = PICTURE.cardInk;
      fit(ctx, v, cx, y + 76, cw - 4, (s) => `700 ${s}px ${BOARD}`, 28);
    });
    y += 92;
  }
  // The Seasons table.
  if (c.table.rows.length) {
    cardLabel(ctx, 'Seasons', pad, y + 18);
    y += 40;
    const first = 86;
    const cw = (W - 2 * pad - first) / c.table.heads.length;
    const row = (cells: string[], bold: boolean, muted: boolean) => {
      ctx.font = `${bold ? 700 : 600} 15px ${BOARD}`;
      cells.forEach((t, i) => {
        ctx.fillStyle = muted ? PICTURE.cardMuted : PICTURE.cardInk;
        ctx.textAlign = i === 0 ? 'left' : 'center';
        const x = i === 0 ? pad : pad + first + cw * (i - 1) + cw / 2;
        if (i === 0) fit(ctx, t, x, y + 20, first - 6, (s) => `${bold ? 700 : 600} ${s}px ${BOARD}`, 15);
        else ctx.fillText(t, x, y + 20);
      });
      ctx.fillStyle = PICTURE.cardRule;
      ctx.fillRect(pad, y + 28, W - 2 * pad, 1);
      y += 30;
    };
    row(['Season', ...c.table.heads], true, true);
    for (const r of c.table.rows) row(r, r[0] === 'Career', false);
  }
  // By Position: solid ink bars.
  if (c.positions.length) {
    y += 10;
    cardLabel(ctx, 'By Position', pad, y + 18);
    y += 40;
    const most = Math.max(...c.positions.map((p) => p.innings), 1);
    for (const p of c.positions.slice(0, 6)) {
      ctx.textAlign = 'left';
      ctx.fillStyle = PICTURE.cardInk;
      ctx.font = `600 16px ${BOARD}`;
      ctx.fillText(p.name, pad, y + 20);
      ctx.textAlign = 'right';
      ctx.fillText(`${p.innings} inn`, W - pad, y + 20);
      const bx = pad + 44;
      const bw = W - 2 * pad - 44 - 64;
      ctx.beginPath();
      ctx.roundRect(bx, y + 10, Math.max(6, (bw * p.innings) / most), 8, 4);
      ctx.fill();
      ctx.fillStyle = PICTURE.cardRule;
      ctx.fillRect(pad, y + 28, W - 2 * pad, 1);
      y += 30;
    }
  }
  // The spray chart.
  if (field) {
    y += 10;
    cardLabel(ctx, 'Spray Chart', pad, y + 18);
    y += 34;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, y, W - 2 * pad, fieldH, 10);
    ctx.clip();
    ctx.drawImage(field, pad, y, W - 2 * pad, fieldH);
    ctx.restore();
    y += fieldH;
  }
  // A small credit line.
  ctx.textAlign = 'right';
  ctx.fillStyle = PICTURE.cardMuted;
  ctx.font = `600 13px ${BOARD}`;
  ctx.fillText('ScoreKept', W - pad, H - 12);
  return cv;
}
