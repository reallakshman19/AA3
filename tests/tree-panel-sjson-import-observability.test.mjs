import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import { EVENT_TOPICS } from '../src/workspace/event-topics.js';
import {
  readNonFeaP0OperationCounts,
  readNonFeaP0StageDurations,
  resetNonFeaP0OperationCounts,
} from '../src/workspace/non-fea-p0-observability.js';
import { handleTreeChange } from '../src/workspace/tree-panel-events.js';

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
const REQUIRED_STAGES = Object.freeze([
  'SJSON_FILE_READ',
  'SJSON_DECODE',
  'SJSON_PARSE',
  'SJSON_SHA256',
]);

test.afterEach(() => {
  performance.clearMeasures();
  resetNonFeaP0OperationCounts();
  if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation);
  else delete globalThis.location;
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  else delete globalThis.crypto;
});

test('normal SJSON file import measures read/decode/parse/SHA exactly once', async () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { search: '?nonFeaP0Evidence=1' },
  });
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  });

  const rawPackage = { schema: 'fixture/v1', objects: [{ id: 'A' }] };
  const bytes = new TextEncoder().encode(JSON.stringify(rawPackage));
  let arrayBufferCalls = 0;
  const file = {
    name: 'fixture.sjson',
    async arrayBuffer() {
      arrayBufferCalls += 1;
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
  const published = [];
  const fileElement = { files: [file], value: 'fixture.sjson' };
  const panel = {
    fileElement,
    clearError() {},
    statusElement: { textContent: '' },
    eventBus: {
      publish(topic, payload) { published.push({ topic, payload }); },
    },
  };

  await handleTreeChange(panel, { target: fileElement });

  assert.equal(arrayBufferCalls, 1);
  assert.equal(published.length, 1);
  assert.equal(published[0].topic, EVENT_TOPICS.DATASET_LOAD_REQUESTED);
  assert.deepEqual(published[0].payload.rawPackage, rawPackage);
  assert.equal(published[0].payload.sourceName, 'fixture.sjson');
  assert.match(published[0].payload.sourceSha256, /^[0-9a-f]{64}$/u);
  assert.equal(fileElement.value, '');

  const counts = readNonFeaP0OperationCounts();
  REQUIRED_STAGES.forEach((stageId) => assert.equal(counts[stageId], 1, stageId));
  assert.deepEqual(
    Object.fromEntries(REQUIRED_STAGES.map((stageId) => [stageId, counts[stageId]])),
    {
      SJSON_FILE_READ: 1,
      SJSON_DECODE: 1,
      SJSON_PARSE: 1,
      SJSON_SHA256: 1,
    },
  );
  const durations = readNonFeaP0StageDurations();
  REQUIRED_STAGES.forEach((stageId) => {
    assert.ok(Number.isFinite(durations[stageId]), `${stageId} duration missing`);
    assert.ok(durations[stageId] >= 0, `${stageId} duration negative`);
  });
});

test('normal SJSON import remains uninstrumented when evidence mode is disabled', async () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { search: '' },
  });
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  });

  const bytes = new TextEncoder().encode('{"schema":"fixture/v1","objects":[]}');
  const file = {
    name: 'fixture.sjson',
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
  const published = [];
  const fileElement = { files: [file], value: 'fixture.sjson' };
  const panel = {
    fileElement,
    clearError() {},
    statusElement: { textContent: '' },
    eventBus: {
      publish(topic, payload) { published.push({ topic, payload }); },
    },
  };

  await handleTreeChange(panel, { target: fileElement });
  assert.equal(published[0].topic, EVENT_TOPICS.DATASET_LOAD_REQUESTED);
  assert.deepEqual(readNonFeaP0OperationCounts(), {});
  assert.deepEqual(readNonFeaP0StageDurations(), {});
});
