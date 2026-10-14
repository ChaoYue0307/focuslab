import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on GitHub Pages (/focuslab/) and any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node' },
} as any);
