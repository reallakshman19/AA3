#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import baseConfig from '../vite.config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let profile = null;

const profilePlugin = {
  name: 'lafea-main-bundle-module-profile',
  generateBundle(_options, bundle) {
    const chunks = Object.values(bundle).filter((entry) => entry?.type === 'chunk');
    const main = chunks.find((chunk) => chunk.isEntry && chunk.name === 'main')
      ?? chunks.find((chunk) => chunk.isEntry && /(^|\/)main(?:-|\.|$)/u.test(chunk.fileName));
    if (!main) {
      throw new Error('LAFEA_BUNDLE_PROFILE_MAIN_ENTRY_NOT_FOUND');
    }
    const modules = Object.entries(main.modules)
      .map(([id, meta]) => ({
        id: normalize(id),
        renderedLength: Number(meta.renderedLength ?? 0),
        originalLength: Number(meta.originalLength ?? 0),
      }))
      .sort((a, b) => b.renderedLength - a.renderedLength || a.id.localeCompare(b.id));
    profile = {
      schema: 'lafea-main-bundle-module-profile/v1',
      mainFileName: main.fileName,
      mainModuleCount: modules.length,
      renderedModuleBytes: modules.reduce((sum, row) => sum + row.renderedLength, 0),
      topModules: modules.slice(0, 60),
      largeModulesOver10KiB: modules.filter((row) => row.renderedLength >= 10 * 1024),
    };
  },
};

await build({
  ...baseConfig,
  configFile: false,
  plugins: [...(baseConfig.plugins ?? []), profilePlugin],
  build: {
    ...baseConfig.build,
    write: false,
    emptyOutDir: false,
  },
});

if (!profile) throw new Error('LAFEA_BUNDLE_PROFILE_NOT_CAPTURED');
process.stdout.write(`${JSON.stringify(profile, null, 2)}\n`);

function normalize(value) {
  return String(value)
    .replaceAll('\\', '/')
    .replace(`${ROOT.replaceAll('\\', '/')}/`, '');
}
