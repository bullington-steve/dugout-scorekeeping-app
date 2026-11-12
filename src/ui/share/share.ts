/*
 * Share Recap (SPEC §15): the Recap or Scorecard picture, Share Picture,
 * Share Text and Copy Text, and Post to Discord. Picture and text are
 * separate buttons because iOS drops the text when both go together.
 */
import type { App } from '../../app/app.ts';
import { discordLinks, isWebhook, markPollPosted, pollPosted, postPicture, postPoll, postText, saveDiscordLinks } from '../../share/discord.ts';
import { recapOf, recapText } from '../../share/recap.ts';
import type { SavedGame, ScheduledGame } from '../../store/model.ts';
import { shareFile } from '../../store/share.ts';
import { segmented, textField } from '../controls.ts';
import { h, setText } from '../dom.ts';
import { openSheet } from '../sheet.ts';
import { dayText, whenText } from '../when.ts';
import { drawRecap, drawScorecard } from './pictures.ts';

function toBlob(c: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openShare(app: App, game: SavedGame): void {
  const team = app.team;
  if (!team) return;
  const r = recapOf(game, team);
  const when = dayText(game.date);
  const text = recapText(r, when);
  const scorer = game.scorer ?? app.data.scorerName;
  let kind: 'recap' | 'scorecard' = 'recap';
  let picture: HTMLCanvasElement | null = null;
  const img = h('img', { class: 'sr-picture', alt: '' });
  const status = h('p', { class: 'sh-status', role: 'status' });
  const draw = async () => {
    picture = kind === 'recap' ? await drawRecap(r, team, when, scorer) : await drawScorecard(r, game, team, when, scorer);
    img.src = picture.toDataURL('image/png');
    img.alt =
      kind === 'recap'
        ? `Recap picture: ${r.status}, ${r.us.name} ${r.us.r}, ${r.them.name} ${r.them.r}${r.stars[0] ? `. Game MVP ${r.stars[0].name}, ${r.stars[0].line}` : ''}.`
        : `Scorecard picture: the line score and ${team.name}’s Book page.`;
  };
  void draw();
  const file = () => `scorekept-${kind}-${game.date}.png`;

  const sharePic = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Share Picture');
  sharePic.addEventListener('click', async () => {
    if (!picture) await draw();
    const blob = picture ? await toBlob(picture) : null;
    if (blob) await shareFile(file(), blob);
  });
  const shareText = h('button', { type: 'button', class: 'sk-key' }, 'Share Text');
  shareText.addEventListener('click', async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text });
        return;
      } catch {
        // Cancelled or refused: fall through to copying.
      }
    }
    setText(status, (await copy(text)) ? 'Copied. Paste it anywhere.' : 'Couldn’t copy here.');
  });
  const copyText = h('button', { type: 'button', class: 'sk-key' }, 'Copy Text');
  copyText.addEventListener('click', async () => setText(status, (await copy(text)) ? 'Copied. Paste it anywhere.' : 'Couldn’t copy here.'));
  const discord = h('button', { type: 'button', class: 'sk-key', hidden: !discordLinks().game }, 'Post to Discord');
  discord.addEventListener('click', async () => {
    const url = discordLinks().game;
    if (!url) return;
    if (!picture) await draw();
    const blob = picture ? await toBlob(picture) : null;
    setText(status, 'Posting…');
    const res = blob ? await postPicture(url, text, blob, file()) : await postText(url, text);
    setText(status, res.ok ? 'Posted to your game channel.' : res.why);
  });

  openSheet({
    title: 'Share Recap',
    full: true,
    body: [
      segmented(
        'Picture',
        [
          { value: 'recap', label: 'Recap' },
          { value: 'scorecard', label: 'Scorecard' },
        ],
        kind,
        (v) => {
          kind = v;
          void draw();
        },
      ),
      img,
      h('div', { class: 'sr-keys' }, sharePic, shareText, copyText, discord),
      status,
      h('details', { class: 'sk-details' }, h('summary', {}, 'The Text'), h('pre', { class: 'sr-text' }, text)),
    ],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
}

/** The Discord mark, unchanged: white on Blurple, with clear space around it (Discord’s brand guidelines). */
export function discordTile(): HTMLElement {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute(
    'd',
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  );
  s.append(p);
  return h('span', { class: 'sr-discord' }, s);
}

/** Settings, Discord: the two links, Save & Test. */
export function openDiscord(): void {
  const links = discordLinks();
  let polls = links.polls ?? '';
  let game = links.game ?? '';
  const status = h('p', { class: 'sh-status', role: 'status' });
  const test = h('button', { type: 'button', class: 'sk-key sk-primary' }, 'Save & Test');
  test.addEventListener('click', async () => {
    const bad = [polls, game].filter((u) => u.trim() && !isWebhook(u));
    if (bad.length) {
      setText(status, 'That doesn’t look like a Discord webhook link. In Discord: the channel’s settings, Integrations, Webhooks, New Webhook, Copy Webhook URL.');
      return;
    }
    saveDiscordLinks({ polls, game });
    const results: string[] = [];
    for (const [label, url] of [
      ['Polls', polls],
      ['Game updates', game],
    ] as const) {
      if (!url.trim()) continue;
      const res = await postText(url.trim(), '⚾ ScoreKept is connected');
      results.push(res.ok ? `${label}: connected ✓` : `${label}: ${res.why}`);
    }
    setText(status, results.length ? results.join(' ') : 'Saved. Add a link to post.');
  });
  openSheet({
    title: 'Discord',
    full: true,
    body: [
      h('div', { class: 'sr-discord-head' }, discordTile(), h('p', { class: 'sk-row-note' }, 'Post the weekly Who’s In? poll and game recaps to your team’s channels. In Discord, open each channel’s settings, then Integrations, Webhooks, New Webhook, and Copy Webhook URL.')),
      textField('Polls Channel', polls, (v) => (polls = v), { inputmode: 'url', autocapitalize: 'off', placeholder: 'https://discord.com/api/webhooks/…' }),
      textField('Game Updates Channel', game, (v) => (game = v), { inputmode: 'url', autocapitalize: 'off', placeholder: 'https://discord.com/api/webhooks/…' }),
      test,
      status,
      h('p', { class: 'sk-row-note' }, 'These links stay on this iPhone. They’re never in a backup, so add them again on a new device.'),
    ],
    done: { label: 'Done', onClick: () => saveDiscordLinks({ polls, game }) },
    cancel: false,
  });
}

/** Who's In? Poll for a scheduled game: a real Discord poll, or text to copy. */
export async function whoIsIn(entry: ScheduledGame, done: (msg: string) => void): Promise<void> {
  const question = `Who’s in? ${whenText(entry.date, entry.time)} vs ${entry.opponent}`;
  const url = discordLinks().polls;
  if (!url) {
    done((await copy(`${question}\n✅ In\n❌ Out`)) ? 'Poll text copied. Paste it in your team chat.' : question);
    return;
  }
  const [y, m, d] = entry.date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = (entry.time || '18:00').split(':').map(Number) as [number, number];
  const res = await postPoll(url, question, new Date(y, m - 1, d, hh, mm).getTime());
  if (res.ok) markPollPosted(entry.id);
  done(res.ok ? '✓ Poll Posted' : res.why);
}

export { pollPosted };
