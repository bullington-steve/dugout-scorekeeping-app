/*
 * The app's own contact address (Steve, Nov 25): ScoreKept's public mailbox, never anyone's personal
 * one. Email It opens Mail with the note already written; nothing leaves the iPhone until the user
 * taps Send in Mail.
 */
export const CONTACT_EMAIL = 'ScoreKeptApp@gmail.com';

/** Mail links stay well under what Mail and Safari accept, so a long error log is trimmed from the end. */
const MAX_BODY = 1800;

/** A mailto: link to ScoreKept with the subject and body filled in (RFC 6068: %20 for spaces, CRLF line breaks). */
export function mailtoUrl(subject: string, body: string): string {
  let text = body;
  if (text.length > MAX_BODY) text = `${text.slice(0, MAX_BODY).replace(/\n[^\n]*$/, '')}\n…`;
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'));
  return `mailto:${CONTACT_EMAIL}?subject=${enc(subject)}&body=${enc(text)}`;
}
