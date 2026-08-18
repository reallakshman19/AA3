import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isNonFeaP0ObservabilityEnabled,
  measureNonFeaP0AsyncStage,
  measureNonFeaP0Stage,
  readNonFeaP0OperationCounts,
  readNonFeaP0StageDurations,
  recordNonFeaP0Duration,
  resetNonFeaP0OperationCounts,
} from '../src/workspace/non-fea-p0-observability.js';

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');

test.afterEach(() => {
  performance.clearMeasures();
  resetNonFeaP0OperationCounts();
  if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation);
  else delete globalThis.location;
});

test('P0 observability is disabled unless the explicit query authority is present', () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { search: '' },
  });
  let callCount = 0;
  const result = measureNonFeaP0Stage('FIT', () => {
    callCount += 1;
    return 17;
  });
  assert.equal(result, 17);
  assert.equal(callCount, 1);
  assert.equal(isNonFeaP0ObservabilityEnabled(), false);
  assert.deepEqual(readNonFeaP0StageDurations(), {});
  assert.deepEqual(readNonFeaP0OperationCounts(), {});
});

test('P0 observability records deterministic aggregate stage durations and counts when enabled', () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { search: '?nonFeaP0Evidence=1' },
  });
  assert.equal(isNonFeaP0ObservabilityEnabled(), true);
  recordNonFeaP0Duration('GPU_SCENE_INSTALL', 2.5);
  recordNonFeaP0Duration('GPU_SCENE_INSTALL', 1.25);
  const value = measureNonFeaP0Stage('FIT', () => 'done');
  assert.equal(value, 'done');
  const totals = readNonFeaP0StageDurations();
  assert.equal(totals.GPU_SCENE_INSTALL, 3.75);
  assert.ok(Number.isFinite(totals.FIT));
  assert.ok(totals.FIT >= 0);
  assert.deepEqual(readNonFeaP0OperationCounts(), { FIT: 1 });
});

test('P0 async observability measures resolved work and counts each attempted stage once', async () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { search: '?nonFeaP0Evidence=1' },
  });
  let settled = false;
  const value = await measureNonFeaP0AsyncStage('SJSON_FILE_READ', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    settled = true;
    return 23;
  });
  assert.equal(value, 23);
  assert.equal(settled, true);
  assert.equal(readNonFeaP0OperationCounts().SJSON_FILE_READ, 1);
  assert.ok(readNonFeaP0StageDurations().SJSON_FILE_READ >= 0);

  await assert.rejects(
    () => measureNonFeaP0AsyncStage('SJSON_SHA256', async () => {
      throw new Error('fixture failure');
    }),
    /fixture failure/u,
  );
  assert.equal(readNonFeaP0OperationCounts().SJSON_SHA256, 1,
    'failed attempts remain observable as one attempted operation');
  assert.ok(readNonFeaP0StageDurations().SJSON_SHA256 >= 0);
});

test('P0 observability rejects malformed evidence input', async () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { search: '?nonFeaP0Evidence=1' },
  });
  assert.throws(() => recordNonFeaP0Duration('bad stage', 1), /stage ID/u);
  assert.throws(() => recordNonFeaP0Duration('FIT', Number.NaN), /duration/u);
  assert.throws(() => measureNonFeaP0Stage('FIT', null), /callback/u);
  await assert.rejects(
    () => measureNonFeaP0AsyncStage('FIT', null),
    /callback/u,
  );
});
