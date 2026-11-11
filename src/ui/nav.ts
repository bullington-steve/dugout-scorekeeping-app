/* Moving between tabs from inside a screen (View a game from Stats opens the Book). */
export type TabId = 'game' | 'book' | 'stats' | 'scout' | 'team';

let handler: ((tab: TabId) => void) | null = null;

export function onNavigate(fn: (tab: TabId) => void): void {
  handler = fn;
}

export function goTo(tab: TabId): void {
  handler?.(tab);
}
