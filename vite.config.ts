import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'android' && {
      name: 'android-background-music',
      apply: 'build',
      async generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'assets/audio/dunes-at-dusk.m4a',
          source: await readFile(new URL('./src/effects/assets/dunes-at-dusk.m4a', import.meta.url)),
        });
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2020',
  },
  server: {
    host: true,
    port: 5173,
  },
}));
