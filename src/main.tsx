import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isLang } from './lib/langs';
import { updateSettings } from './lib/store';
import './styles/global.css';

// Shareable language links: ?lang=ja
const urlLang = new URLSearchParams(location.search).get('lang');
if (isLang(urlLang)) updateSettings({ lang: urlLang });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Offline support (only in production builds).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
