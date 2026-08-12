import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { manualChunk } from './vite.config.js';

const buildTime = new Date().toISOString();

/** Dedicated standalone LAFEA build target. */
export default defineConfig({
  base: '/Advanced_Analysis/',
  plugins: [],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    outDir: 'dist-lafea',
    emptyOutDir: true,
    modulePreload: false,
    manifest: true,
    rollupOptions: {
      input: {
        lafea: fileURLToPath(new URL('./lafea.html', import.meta.url)),
      },
      output: {
        manualChunks: manualChunk,
        onlyExplicitManualChunks: false,
      },
    },
  },
});
