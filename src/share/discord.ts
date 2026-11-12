/*
 * Discord (SPEC §15): two webhook links, one for the Who's In? poll and one
 * for game updates. They're kept on this device only, in their own key, so a
 * backup can never carry them. Posting goes straight from the iPhone to
 * Discord; nothing passes through anyone else.
 */
const KEY = 'scorekept:discord';

export interface DiscordLinks {
  polls?: string;
  game?: string;
}

export function discordLinks(): DiscordLinks {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as DiscordLinks;
  } catch {
    return {};
  }
}

export function saveDiscordLinks(l: DiscordLinks): void {
  try {
    const clean: DiscordLinks = {};
    if (l.polls?.trim()) clean.polls = l.polls.trim();
    if (l.game?.trim()) clean.game = l.game.trim();
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    // Storage unavailable: nothing to keep.
  }
}

/** A Discord webhook link, as Discord's channel settings give it. */
export function isWebhook(url: string): boolean {
  return /^https:\/\/(canary\.|ptb\.)?(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url.trim());
}

export type PostResult = { ok: true } | { ok: false; why: string };

async function post(url: string, body: BodyInit, json: boolean): Promise<PostResult> {
  try {
    const res = await fetch(url, { method: 'POST', body, ...(json ? { headers: { 'Content-Type': 'application/json' } } : {}) });
    if (res.ok) return { ok: true };
    if (res.status === 404 || res.status === 401) return { ok: false, why: 'Discord didn’t recognize that link. Copy it again from the channel’s Integrations, Webhooks.' };
    return { ok: false, why: `Discord said no (${res.status}). Try again in a minute.` };
  } catch {
    return { ok: false, why: 'Couldn’t reach Discord. Check your connection and try again.' };
  }
}

export function postText(url: string, content: string): Promise<PostResult> {
  return post(url, JSON.stringify({ content, allowed_mentions: { parse: [] } }), true);
}

/** A picture with text, as one message. */
export function postPicture(url: string, content: string, png: Blob, name: string): Promise<PostResult> {
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content, allowed_mentions: { parse: [] } }));
  form.append('files[0]', png, name);
  return post(url, form, false);
}

/**
 * A real Discord poll: "Who's in? Sat, Nov 14 at 6:30 PM vs Harbor City
 * Anchors", In or Out, open until game time (at least an hour). Votes can't
 * be read back into the app.
 */
export function postPoll(url: string, question: string, closesAt: number, now = Date.now()): Promise<PostResult> {
  const hours = Math.min(768, Math.max(1, Math.ceil((closesAt - now) / 3_600_000)));
  return post(
    url,
    JSON.stringify({
      poll: {
        question: { text: question.slice(0, 300) },
        answers: [{ poll_media: { text: 'In', emoji: { name: '✅' } } }, { poll_media: { text: 'Out', emoji: { name: '❌' } } }],
        duration: hours,
        allow_multiselect: false,
      },
    }),
    true,
  );
}

/** Polls already posted, by schedule entry (device only). */
export function pollPosted(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem('scorekept:polls') ?? '[]') as string[]).includes(id);
  } catch {
    return false;
  }
}

export function markPollPosted(id: string): void {
  try {
    const list = JSON.parse(localStorage.getItem('scorekept:polls') ?? '[]') as string[];
    localStorage.setItem('scorekept:polls', JSON.stringify([...new Set([...list, id])].slice(-50)));
  } catch {
    // Only a convenience.
  }
}
