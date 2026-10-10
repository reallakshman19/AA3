// Focused contract check for the authentic committed fixture, with no Vite or browser runner.
// Import the actual production function after replacing only its Vite asset URL declaration.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';

const fixtureUrl = new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url);
const loaderUrl = new URL('../src/workspace/lfea-bm4l-pinned-accdb.js', import.meta.url);
const bytes = await readFile(fixtureUrl);
const source = await readFile(loaderUrl, 'utf8');
assert.match(source, /^import bm4lAssetUrl from '\.\.\/\.\.\/benchmarks\/LFEA\/BM4\/BM4_L\/BM4_L\.ACCDB\?url';/m);
const assetUrl = '/AA3/assets/BM4_L-fixture-hash.ACCDB';
const testedSource = source.replace(
  /^import bm4lAssetUrl from .*;$/m,
  `const bm4lAssetUrl = ${JSON.stringify(assetUrl)};`,
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(testedSource).toString('base64')}`;
const {
  loadVerifiedBM4LReferenceFile: load,
  BM4L_REFERENCE_BYTE_LENGTH: expectedSize,
  BM4L_REFERENCE_SHA256: expectedHash,
} = await import(moduleUrl);

assert.equal(bytes.byteLength, expectedSize, 'committed fixture length');
assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedHash, 'committed fixture checksum');

let fileCreations = 0;
class FileDouble {
  constructor(parts, name, options) {
    fileCreations += 1;
    this.parts = parts;
    this.name = name;
    this.type = options.type;
  }
}
const browser = {
  cryptoImpl: webcrypto,
  FileImpl: FileDouble,
};
const fetchBytes = (body, { status = 200, interrupted = false, onFetch = () => {} } = {}) =>
  async (url, opts) => {
    assert.equal(url, assetUrl, 'Vite base asset URL');
    assert.equal(opts.credentials, 'same-origin');
    onFetch(opts);
    return {
      ok: status >= 200 && status < 300,
      status,
      arrayBuffer: async () => {
        if (interrupted) throw new Error('Network stream interrupted');
        return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      },
    };
  };
const good = await load({ ...browser, fetchImpl: fetchBytes(bytes) });
assert.equal(good.name, 'BM4_L.ACCDB');
assert.equal(good.type, 'application/vnd.ms-access');
assert.equal(createHash('sha256').update(new Uint8Array(good.parts[0])).digest('hex'), expectedHash);
assert.equal(fileCreations, 1);

async function mustReject(name, overrides, message) {
  const before = fileCreations;
  await assert.rejects(load({ ...browser, ...overrides }), message);
  assert.equal(fileCreations, before, `${name}: no File allowed before successful authentication`);
  console.log(`PASS ${name}`);
}
await mustReject('HTTP 404', { fetchImpl: fetchBytes(bytes, { status: 404 }) }, /HTTP 404/);
await mustReject('HTTP 503', { fetchImpl: fetchBytes(bytes, { status: 503 }) }, /HTTP 503/);
await mustReject('network failure', { fetchImpl: async () => { throw new Error('connection failed'); } }, /connection failed/);
await mustReject('interrupted body', { fetchImpl: fetchBytes(bytes, { interrupted: true }) }, /interrupted/);
await mustReject('truncation', { fetchImpl: fetchBytes(bytes.subarray(0, -1)) }, /size mismatch/);
await mustReject('extra-length binary', { fetchImpl: fetchBytes(Buffer.concat([bytes, Buffer.of(0)])) }, /size mismatch/);
const corrupt = Buffer.from(bytes);
corrupt[600] ^= 1;
await mustReject('one-byte corruption', { fetchImpl: fetchBytes(corrupt) }, /SHA-256 mismatch/);
await mustReject('missing WebCrypto', { cryptoImpl: {}, fetchImpl: async () => { throw new Error('unexpected fetch'); } }, /SHA-256 support/);
await mustReject('missing File support', { FileImpl: null, fetchImpl: async () => { throw new Error('unexpected fetch'); } }, /File support/);
await mustReject('already aborted', { signal: { aborted: true }, fetchImpl: async () => { throw new Error('unexpected fetch'); } }, /cancelled/);
const controller = new AbortController();
await mustReject('abort during fetch', {
  signal: controller.signal,
  fetchImpl: fetchBytes(bytes, { onFetch: () => controller.abort() }),
}, /cancelled/);

console.log('PASS original 5,136,384-byte ACCDB; SHA-256; lazy loader and 11 adverse conditions.');
