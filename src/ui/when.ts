/* Dates and times on screen (CLAUDE.md, Words): "Sat, Oct 17", "6:30 PM"; the year only when it isn't this year. */
export function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function dayText(iso: string, now = new Date()): string {
  const d = dateFromIso(iso);
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function timeText(hhmm: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Sat, Nov 7 at 6:30 PM" (polls and texts say "at", never "@"). */
export function whenText(iso: string, hhmm: string): string {
  const t = timeText(hhmm);
  return t ? `${dayText(iso)} at ${t}` : dayText(iso);
}
