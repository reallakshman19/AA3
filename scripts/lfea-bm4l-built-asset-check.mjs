#!/usr/bin/env node
// Build artifact custody: emit only the original tracked ACCDB as a Vite-managed
// hashed asset. The filename string may occur in JS; the 5 MB body must not.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const original = readFileSync('benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const expectedDigest = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const expectedSize = 5_136_384;
assert.equal(original.length, expectedSize, 'Original benchmark length changed');
assert.equal(digest(original), expectedDigest, 'Original benchmark bytes changed');

const assetDir = 'dist/assets';
const all = readdirSync(assetDir);
const emitted = all.filter((name) => /^BM4_L-[A-Za-z0-9_-]+\.ACCDB$/u.test(name));
assert.equal(emitted.length, 1, 'Vite must emit exactly one hashed BM4_L.ACCDB asset');
const [assetName] = emitted;
const emittedBytes = readFileSync(join(assetDir, assetName));
assert.equal(emittedBytes.length, expectedSize, 'Vite-emitted reference size differs');
assert.equal(digest(emittedBytes), expectedDigest, 'Vite-emitted reference content differs');

const jsFiles = all.filter((name) => name.endsWith('.js'));
assert.ok(jsFiles.some((name) => readFileSync(join(assetDir, name), 'utf8')
  .includes(`/AA3/assets/${assetName}`)), 'The Vite browser bundle must point to the /AA3/ hashed asset');
console.log(JSON.stringify({
  result: 'PASS', source: 'original BM4_L.ACCDB', emitted: `/AA3/assets/${assetName}`,
  bytes: expectedSize, sha256: expectedDigest, independentlyEmitted: true,
}, null, 2));
