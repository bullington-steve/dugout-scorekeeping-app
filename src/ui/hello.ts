import './hello.css';
import { APP_VERSION } from '../version.ts';
import { WHATS_NEW } from '../content/whats-new.ts';

// Phase 0 placeholder screen: proves the app builds, installs, and follows
// the device. Replaced by the real app shell in Phase 3.
export function renderHello(root: HTMLElement): void {
  root.className = 'hello';
  root.replaceChildren();

  const header = el('header', 'hello-header');
  const icon = document.createElement('img');
  icon.className = 'hello-icon';
  icon.src = './icons/icon-192.png';
  icon.alt = '';
  icon.width = 72;
  icon.height = 72;
  const title = el('h1', 'sk-wordmark hello-title', 'ScoreKept');
  header.append(icon, title);

  const lede = el('p', 'hello-lede', 'Your dugout scorebook.');
  const note = el(
    'p',
    'hello-note',
    'Under construction. The grounds crew is rebuilding the field before the first pitch.',
  );

  const news = el('section', 'hello-card');
  news.setAttribute('aria-labelledby', 'hello-news');
  const newsLabel = el('h2', 'sk-label', 'What’s New');
  newsLabel.id = 'hello-news';
  news.append(newsLabel);
  const latest = WHATS_NEW[0];
  if (latest) {
    news.append(el('h3', 'hello-headline', latest.headline));
    for (const line of latest.lines) news.append(el('p', 'hello-line', line));
  }

  const version = el('p', 'hello-version', `Version ${APP_VERSION}`);
  version.dataset.testid = 'version';

  root.append(header, lede, note, news, version);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
