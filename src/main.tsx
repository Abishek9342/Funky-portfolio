import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { startScroll } from './scroll';
import { posterMode } from './store';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (posterMode()) document.documentElement.classList.add('poster-mode');
startScroll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
