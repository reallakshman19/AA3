import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspaceDataset } from '../src/workspace/dataset-adapter.js';

function sourceFixture() {
  return {
    schema: 'inputxml-managed-stage/v1',
    unit: 'mm',
    objects: [{
      id: 'PIPE-1',
      type: 'PIPE',
      sourceAttributes: { ID: 'PIPE-1', SOURCE_ONLY: 'A' },
      attributes: {
        ID: 'PIPE-1',
        NAME: '/PIPE-1',
        LINE_ID: 'LINE-1',
        BORE_MM: 150,
        POS: { x: 0, y: 0, z: 0 },
      },
      enrichedAttributes: { MATERIAL: 'CS', WALL_THICKNESS_MM: 7.11 },
      nativeParams: { role: 'PIPE', outsideDiameterMm: 168.3 },
      diagnostics: [{ code: 'SOURCE_NOTE', message: 'fixture diagnostic', severity: 'INFO' }],
    }],
  };
}

test('normalized entity reuses only the immutable SourcePackageSnapshot evidence subtrees', () => {
  const raw = sourceFixture();
  const rawItem = raw.objects[0];
  const dataset = normalizeWorkspaceDataset(raw, 'fixture.json');
  const snapshotItem = dataset.sourceSnapshot.sourcePackage.objects[0];
  const entity = dataset.entities[0];

  assert.notStrictEqual(snapshotItem, rawItem, 'SourcePackageSnapshot must retain its independent authoritative clone');
  assert.notStrictEqual(snapshotItem.attributes, rawItem.attributes, 'mutable upload attributes must not be shared into the dataset');

  assert.strictEqual(entity.properties.sourceAttributes, snapshotItem.sourceAttributes);
  assert.strictEqual(entity.properties.attributes, snapshotItem.attributes);
  assert.strictEqual(entity.properties.enrichedAttributes, snapshotItem.enrichedAttributes);
  assert.strictEqual(entity.properties.nativeParams, snapshotItem.nativeParams);
  assert.strictEqual(entity.properties.diagnostics, snapshotItem.diagnostics);

  for (const value of [
    snapshotItem,
    entity.properties.sourceAttributes,
    entity.properties.attributes,
    entity.properties.enrichedAttributes,
    entity.properties.nativeParams,
    entity.properties.diagnostics,
  ]) assert.equal(Object.isFrozen(value), true);

  assert.deepEqual(entity.properties.attributes, rawItem.attributes);
  assert.deepEqual(entity.properties.enrichedAttributes, rawItem.enrichedAttributes);
});

test('mutating the original upload after normalization cannot alter normalized evidence', () => {
  const raw = sourceFixture();
  const dataset = normalizeWorkspaceDataset(raw, 'fixture.json');
  const entity = dataset.entities[0];

  raw.objects[0].attributes.LINE_ID = 'MUTATED';
  raw.objects[0].enrichedAttributes.MATERIAL = 'MUTATED';
  raw.objects[0].diagnostics.push({ code: 'MUTATED', message: 'not authoritative' });

  assert.equal(entity.properties.attributes.LINE_ID, 'LINE-1');
  assert.equal(entity.properties.enrichedAttributes.MATERIAL, 'CS');
  assert.equal(entity.properties.diagnostics.length, 1);
  assert.equal(dataset.sourceSnapshot.sourcePackage.objects[0].attributes.LINE_ID, 'LINE-1');
});

test('missing source evidence fields use frozen empty sentinels', () => {
  const raw = {
    schema: 'inputxml-managed-stage/v1',
    unit: 'mm',
    objects: [{ id: 'OBJ-1', type: 'OBJECT' }],
  };
  const dataset = normalizeWorkspaceDataset(raw, 'missing-fields.json');
  const entity = dataset.entities[0];

  assert.deepEqual(entity.properties.sourceAttributes, {});
  assert.deepEqual(entity.properties.attributes, {});
  assert.deepEqual(entity.properties.enrichedAttributes, {});
  assert.deepEqual(entity.properties.nativeParams, {});
  assert.deepEqual(entity.properties.diagnostics, []);
  assert.equal(Object.isFrozen(entity.properties.attributes), true);
  assert.equal(Object.isFrozen(entity.properties.diagnostics), true);
});
