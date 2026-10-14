import { useSyncExternalStore } from 'react';

const getHash = () => (typeof location === 'undefined' ? '/' : location.hash.replace(/^#/, '') || '/');

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

/** Current route path, e.g. "/train/sart?mode=assessment". */
export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const hash = useSyncExternalStore(subscribe, getHash, () => '/');
  const [path, qs] = hash.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs || '') };
}

export function navigate(to: string) {
  if (getHash() === to) return;
  location.hash = to;
  window.scrollTo({ top: 0 });
}
