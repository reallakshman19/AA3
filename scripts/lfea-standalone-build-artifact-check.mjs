import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist-lfea');
const MANIFEST = path.join(DIST, '.vite', 'manifest.json');

assert(fs.existsSync(MANIFEST), 'Standalone LFEA manifest is missing; run the standalone Vite build first.');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const entries = Object.values(manifest).filter((row) => row?.isEntry);
const htmlEntries = entries.filter((row) => typeof row?.src === 'string' && row.src.endsWith('.html'));

assert(htmlEntries.length === 1,
  `Standalone build must contain exactly one HTML entry; found ${htmlEntries.length}.`);
assert(htmlEntries[0].src === 'lfea.html',
  `Standalone build entry must be lfea.html; found ${htmlEntries[0].src}.`);
assert(!Object.values(manifest).some((row) => row?.src === 'index.html' || row?.src === 'analyze.html'),
  'Standalone build must not include the combined or analyzer HTML entry.');

const htmlPath = path.join(DIST, 'lfea.html');
assert(fs.existsSync(htmlPath), 'Standalone lfea.html output is missing.');
const html = fs.readFileSync(htmlPath, 'utf8');
assert(!html.includes('/src/main.js'), 'Standalone output must not reference the combined application entry.');
assert(!html.includes('lafea-consumer-root'), 'Standalone output must not contain a LAFEA application root.');

const javascript = listFiles(DIST).filter((filePath) => filePath.endsWith('.js'));
assert(javascript.length > 0, 'Standalone build emitted no JavaScript assets.');
for (const filePath of javascript) {
  const source = fs.readFileSync(filePath, 'utf8');
  assert(!source.includes('LafeaWorkbenchController'),
    `Standalone asset ${repoRelative(filePath)} contains the LAFEA workbench controller.`);
  assert(!source.includes('lafea-consumer-root'),
    `Standalone asset ${repoRelative(filePath)} contains a LAFEA application root selector.`);
}

console.log(`LFEA standalone build artifact PASS (${javascript.length} JavaScript assets inspected).`);

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
