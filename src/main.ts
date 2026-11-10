import './styles/tokens.css';
import './styles/base.css';
import { renderHello } from './ui/hello.ts';

const root = document.getElementById('app');
if (root) renderHello(root);
