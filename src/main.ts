import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './ui/game/game.css';
import './ui/book/book.css';
import './ui/stats/stats.css';
import './ui/welcome/welcome.css';
import './ui/sound/sound.css';
import { App } from './app/app.ts';
import { requestPersistence, Store, type KV } from './store/storage.ts';
import { mountApp } from './ui/shell.ts';

/** localStorage, or a stand-in that reports every save as failed if it's unavailable. */
function storage(): KV {
  try {
    const probe = '__scorekept_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {
        throw new Error('storage unavailable');
      },
      removeItem: () => undefined,
      key: () => null,
      length: 0,
    };
  }
}

const root = document.getElementById('app');
if (root) {
  const app = new App(new Store(storage()));
  mountApp(root, app);
  void requestPersistence();
}
