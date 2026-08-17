/**
 * Drift guard for the two vendored trees the StagedJSON -> InputXML
 * converter depends on: the Pyodide runtime and the (unmodified, real,
 * already-validated) Python converter files. Adapted from the existing
 * hash-manifest pattern in pcd-vendor-check.mjs. Detects accidental
 * modification/corruption/silent replacement of committed vendored
 * bytes -- not provenance verification against the upstream sources (no
 * network fetch at check time, matching that precedent's own scope).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VENDOR_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../public/vendor');
const manifest = JSON.parse(readFileSync(join(VENDOR_ROOT, 'VENDOR-MANIFEST.json'), 'utf8'));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function assertTreeMatchesManifest(dirName, manifestSection) {
  const dir = join(VENDOR_ROOT, dirName);
  const tree = createHash('sha256');
  const seen = {};
  for (const p of walk(dir)) {
    const rel = relative(dir, p);
    if (rel === 'README.md') continue;
    const bytes = readFileSync(p);
    seen[rel] = createHash('sha256').update(bytes).digest('hex');
    tree.update(rel).update('\0').update(bytes);
  }
  assert.deepEqual(seen, manifestSection.fileHashes, `${dirName}: vendored file set or contents drifted from manifest`);
  assert.equal(tree.digest('hex'), manifestSection.treeSha256, `${dirName}: treeSha256 drifted`);
}

test('vendored pyodide runtime matches manifest hashes (drift guard)', () => {
  assertTreeMatchesManifest('pyodide', manifest.pyodide);
});

test('vendored stagedjson_to_inputxml.py + helpers match manifest hashes (drift guard)', () => {
  assertTreeMatchesManifest('stagedjson-to-inputxml-scripts', manifest.stagedjsonToInputxmlScripts);
});

test('no third-party Python wheels are vendored (the script tree is stdlib-only)', () => {
  const files = Object.keys(manifest.stagedjsonToInputxmlScripts.fileHashes);
  assert.ok(files.every((name) => name.endsWith('.py')), 'Expected only .py files in the vendored script tree.');
});

console.log(JSON.stringify({
  check: 'stagedjson-to-inputxml-vendor',
  status: 'PASS',
}));
