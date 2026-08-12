import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist-lafea');
const MANIFEST = path.join(DIST, '.vite', 'manifest.json');

assert(fs.existsSync(MANIFEST),
  'Standalone LAFEA manifest is missing; run the standalone Vite build first.');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const entries = Object.values(manifest).filter((row) => row?.isEntry);
const htmlEntries = entries.filter((row) => typeof row?.src === 'string' && row.src.endsWith('.html'));

assert(htmlEntries.length === 1,
  `Standalone LAFEA build must contain exactly one HTML entry; found ${htmlEntries.length}.`);
assert(htmlEntries[0].src === 'lafea.html',
  `Standalone LAFEA build entry must be lafea.html; found ${htmlEntries[0].src}.`);
assert(!Object.values(manifest).some((row) => ['index.html', 'analyze.html', 'lfea.html'].includes(row?.src)),
  'Standalone LAFEA build must not include combined, analyzer, or LFEA HTML entries.');

const htmlPath = path.join(DIST, 'lafea.html');
assert(fs.existsSync(htmlPath), 'Standalone lafea.html output is missing.');
const html = fs.readFileSync(htmlPath, 'utf8');
assert(!html.includes('/src/main.js'), 'Standalone output must not reference the combined application entry.');
assert(!html.includes('/src/lfea/'), 'Standalone output must not reference the LFEA application entry.');

const javascript = listFiles(DIST).filter((filePath) => filePath.endsWith('.js'));
assert(javascript.length > 0, 'Standalone LAFEA build emitted no JavaScript assets.');
for (const filePath of javascript) {
  const relative = repoRelative(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  assert(!/(?:^|[-_.])lfea(?:[-_.]|$)/iu.test(path.basename(filePath)),
    `Standalone LAFEA asset ${relative} has an LFEA-owned chunk name.`);
  for (const forbidden of [
    'LfeaWorkbenchController',
    'bootstrapAnalysisWorkspace',
    'AnalysisWorkspace',
    '/src/lfea/',
    'linear-piping-',
    'shared-piping-model',
    'FeaBenchmarkPanel',
    'createLafeaMockDocument',
    'advanced-mock-data',
  ]) {
    assert(!source.includes(forbidden),
      `Standalone LAFEA asset ${relative} contains forbidden runtime marker ${forbidden}.`);
  }
}

console.log(JSON.stringify({
  schema: 'lafea-standalone-build-artifact-check/v1',
  status: 'PASS',
  roadmap: 'A16',
  htmlEntry: 'lafea.html',
  javascriptAssetsInspected: javascript.length,
  lfeaRuntimeChunkPresent: false,
  combinedWorkspaceChunkPresent: false,
  compatibilityProviderChunkPresent: false,
}));

function listFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(filePath));
    else result.push(filePath);
  }
  return result;
}

function repoRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
