import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sinav: resolve(__dirname, 'sinav-deneyimi/index.html'),
        yonetim: resolve(__dirname, 'yonetim/index.html'),
      },
    },
  },
});
