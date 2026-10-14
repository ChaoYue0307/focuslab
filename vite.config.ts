import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Emits precache.json (every built JS/CSS file) so the service worker can cache lazy chunks up front for offline use. */
function precacheManifest(): Plugin {
  return {
    name: 'focuslab-precache',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => /\.(js|css)$/.test(f));
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
    },
  };
}

// Relative base so the build works on GitHub Pages (/focuslab/) and any static host.
export default defineConfig({
  base: './',
  plugins: [react(), precacheManifest()],
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node' },
} as any);
