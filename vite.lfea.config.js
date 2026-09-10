import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { manualChunk } from './vite.config.js';

const buildTime = new Date().toISOString();

/**
 * Standalone LFEA build target.
 *
 * It deliberately has one HTML input and writes to a separate output directory
 * so separation work can be qualified without changing the legacy combined
 * application build or its release artifacts.
 */
export default defineConfig({
  base: './',
  plugins: [],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    outDir: 'dist-lfea',
    emptyOutDir: true,
    modulePreload: false,
    manifest: true,
    rollupOptions: {
      input: {
        lfea: fileURLToPath(new URL('./lfea.html', import.meta.url)),
      },
      output: {
        manualChunks: manualChunk,
        onlyExplicitManualChunks: false,
      },
    },
  },
});
