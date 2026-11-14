/*
 * PA Announcer and Umpire Calls (SPEC §13), in Safari's own voice. Fixed
 * lines written in advance; nothing generated. An Enhanced voice downloaded
 * in iPhone Settings sounds much better.
 */

/** Say a line; resolves when it's done (or right away if speech isn't available). */
export function say(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1;
    const en = synth.getVoices().filter((v) => v.lang.startsWith('en-US'));
    u.voice = en.find((v) => /enhanced|premium/i.test(v.name)) ?? en[0] ?? null;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // Safari sometimes never fires onend: don't hold the music hostage.
    setTimeout(finish, 600 + text.length * 90);
    synth.speak(u);
  });
}

export function hush(): void {
  window.speechSynthesis?.cancel();
}

const NUMBER = ['zero', 'one', 'two', 'three', 'four'];

/** "Now batting, number 7, Jess Kowalczyk." */
export function nowBatting(name: string, number: string): string {
  return number ? `Now batting, number ${number}, ${name}.` : `Now batting, ${name}.`;
}

/** What the umpire says for a pitch or the end of an at-bat. For a walk or strikeout, `count` is the league's number (Fort Collins: ball three, strike two). */
export function umpireCall(kind: 'ball' | 'strike' | 'foul' | 'walk' | 'strikeout', count: number): string {
  switch (kind) {
    case 'ball':
      return `Ball ${NUMBER[count] ?? count}.`;
    case 'strike':
      return `Strike ${NUMBER[count] ?? count}!`;
    case 'foul':
      return 'Foul ball!';
    case 'walk':
      return `Ball ${NUMBER[count] ?? count}. Take your base.`;
    case 'strikeout':
      return `Strike ${NUMBER[count] ?? count}! You’re out!`;
  }
}
