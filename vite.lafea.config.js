import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const buildTime = new Date().toISOString();

/** Dedicated standalone LAFEA build target with graph-owned chunking. */
export default defineConfig({
  base: './',
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
    },
  },
});
