import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlainRecord, stringValue } from '../src/core/shared-piping-model/immutable.js';
import { indexWorkspaceSourcePackage } from '../src/workspace/staged-model-index.js';

const SCHEMA = 'inputxml-managed-stage/v1';
const ALIASES = Object.freeze({
  lineId: ['LINE_ID', 'LINE_NO', 'LINE_NUMBER', 'LINENO', 'LINE', 'LINEKEY'],
  branchId: ['BRANCH_ID', 'BRANCH'],
  systemId: ['SYSTEM_ID', 'SYSTEM'],
  zoneId: ['ZONE_ID', 'ZONE'],
});

function normalizeKey(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

// Independent oracle: exact generic identity-search code removed from production.
function legacyFirstSourceValue(item, aliases) {
  const wanted = new Set(aliases.map(normalizeKey));
  for (const root of [item, item.sourceAttributes, item.attributes, item.enrichedAttributes]) {
    const found = legacyFindValue(root, wanted, 0);
    if (found) return stringValue(found);
  }
  return '';
}

function legacyFindValue(value, wanted, depth) {
  if (!isPlainRecord(value) || depth > 4) return null;
  for (const [key, child] of Object.entries(value)) {
    if (wanted.has(normalizeKey(key))) return child;
  }
  for (const child of Object.values(value)) {
    const found = legacyFindValue(child, wanted, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function legacyIdentity(item, parent = null) {
  return Object.fromEntries(Object.entries(ALIASES).map(([field, aliases]) => [
    field,
    legacyFirstSourceValue(item, aliases) || parent?.[field] || '',
  ]));
}

function expectedRows(objects) {
  const rows = new Map();
  const visit = (item, parentIdentity = null) => {
    const identity = legacyIdentity(item, parentIdentity);
    rows.set(item.id, identity);
    for (const child of item.children || []) visit(child, identity);
  };
  objects.forEach((item) => visit(item));
  return rows;
}

function productionRows(objects) {
  const model = indexWorkspaceSourcePackage({ schema: SCHEMA, objects }, SCHEMA).model;
  return new Map(model.nodes.map((node) => [node.sourceEntityId, {
    lineId: node.lineId,
    branchId: node.branchId,
    systemId: node.systemId,
    zoneId: node.zoneId,
  }]));
}

test('optimized generic identity extraction matches the removed legacy algorithm', () => {
  const objects = [{
    id: 'ROOT-A',
    type: 'OBJECT',
    LINE_ID: 'LINE-A',
    directSystem: 'not-an-alias',
    first: { SYSTEM_ID: 'SYS-A', nested: { ZONE_ID: 'ZONE-A' } },
    second: { SYSTEM: 'SYS-LATER', ZONE: 'ZONE-LATER' },
    attributes: { BRANCH_ID: 'BR-A' },
    children: [{
      id: 'A-1',
      type: 'PIPE',
      LINE_ID: '',
      attributes: { LINE_NO: 'LINE-A1', BRANCH: 'BR-A1' },
      deep: { x: { y: { z: { SYSTEM: 'SYS-A1' } } } },
    }, {
      id: 'A-2',
      type: 'PIPE',
      SYSTEM_ID: 0,
      sourceAttributes: { SYSTEM: 'SYS-A2-FALLBACK' },
      ZONE_ID: false,
      enrichedAttributes: { ZONE: 'ZONE-A2-FALLBACK' },
    }, {
      id: 'A-3',
      type: 'PIPE',
      LINE_ID: { nonScalar: true },
      attributes: { LINE_NO: 'MUST-NOT-BE-SEEN' },
    }, {
      id: 'A-4',
      type: 'PIPE',
      depth1: { depth2: { depth3: { depth4: { BRANCH_ID: 'BR-DEPTH4', child: { LINE_ID: 'TOO-DEEP' } } } } },
    }],
  }, {
    id: 'ROOT-B',
    type: 'OBJECT',
    sourceAttributes: { LINE_NUMBER: 'LINE-B', SYSTEM: 'SYS-B' },
    enrichedAttributes: { BRANCH: 'BR-B', ZONE: 'ZONE-B' },
    children: [{ id: 'B-1', type: 'PIPE' }],
  }];

  const expected = expectedRows(objects);
  const actual = productionRows(objects);
  assert.equal(actual.size, expected.size);
  for (const [sourceEntityId, identity] of expected) {
    assert.deepEqual(actual.get(sourceEntityId), identity, `identity mismatch for ${sourceEntityId}`);
  }
});
