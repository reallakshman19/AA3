import test from 'node:test';
import assert from 'node:assert/strict';
import { indexWorkspaceSourcePackage } from '../src/workspace/staged-model-index.js';

const SCHEMA = 'inputxml-managed-stage/v1';

function index(objects) {
  return indexWorkspaceSourcePackage({ schema: SCHEMA, objects }, SCHEMA).model;
}

function nodeById(model, sourceEntityId) {
  return model.nodes.find((node) => node.sourceEntityId === sourceEntityId);
}

test('combined identity search preserves direct/nested/root precedence and inheritance', () => {
  const model = index([{
    id: 'PARENT',
    type: 'OBJECT',
    LINE_ID: 'LINE-DIRECT',
    nestedFirst: { SYSTEM_ID: 'SYS-FIRST' },
    nestedSecond: { SYSTEM: 'SYS-SECOND' },
    attributes: { BRANCH_ID: 'BR-ATTR', ZONE_ID: 'ZONE-PARENT' },
    children: [{
      id: 'CHILD',
      type: 'PIPE',
      LINE_ID: '',
      attributes: { LINE_NO: 'LINE-ATTR-FALLBACK', BRANCH: 'BR-CHILD' },
      nested: { ZONE_ID: 'ZONE-CHILD' },
    }, {
      id: 'INHERIT',
      type: 'PIPE',
    }],
  }]);

  const parent = nodeById(model, 'PARENT');
  assert.equal(parent.lineId, 'LINE-DIRECT');
  assert.equal(parent.branchId, 'BR-ATTR');
  assert.equal(parent.systemId, 'SYS-FIRST');
  assert.equal(parent.zoneId, 'ZONE-PARENT');

  const child = nodeById(model, 'CHILD');
  assert.equal(child.lineId, 'LINE-ATTR-FALLBACK', 'falsy direct match must retry at the next legacy root');
  assert.equal(child.branchId, 'BR-CHILD');
  assert.equal(child.systemId, 'SYS-FIRST', 'missing child identity must inherit parent identity');
  assert.equal(child.zoneId, 'ZONE-CHILD');

  const inherited = nodeById(model, 'INHERIT');
  assert.equal(inherited.lineId, 'LINE-DIRECT');
  assert.equal(inherited.branchId, 'BR-ATTR');
  assert.equal(inherited.systemId, 'SYS-FIRST');
  assert.equal(inherited.zoneId, 'ZONE-PARENT');
});

test('combined identity search retains depth-four boundary', () => {
  const model = index([{
    id: 'DEPTH',
    type: 'PIPE',
    a: { b: { c: { d: { LINE_ID: 'AT-DEPTH-4', deeper: { ZONE_ID: 'TOO-DEEP' } } } } },
  }]);
  const node = nodeById(model, 'DEPTH');
  assert.equal(node.lineId, 'AT-DEPTH-4');
  assert.equal(node.zoneId, '');
});

test('truthy first match retains first-match stop and stringification', () => {
  const model = index([{
    id: 'ROOT',
    type: 'OBJECT',
    ZONE_ID: 'PARENT-ZONE',
    children: [{
      id: 'OBJECT-MATCH',
      type: 'PIPE',
      ZONE_ID: { not: 'a scalar identity' },
      attributes: { ZONE: 'LATER-ZONE' },
    }],
  }]);
  const child = nodeById(model, 'OBJECT-MATCH');
  assert.equal(child.zoneId, '[object Object]', 'truthy non-string first match must stop later-root search and retain legacy stringValue semantics');
});

test('branch source-name identity override remains authoritative', () => {
  const branchName = '/ASIM-1885-6"-S8811951-91261M7-HC-01/B2';
  const model = index([{
    id: 'BRANCH-1',
    type: 'BRANCH',
    name: branchName,
    LINE_ID: 'SHOULD-NOT-WIN',
    BRANCH_ID: 'SHOULD-NOT-WIN',
  }]);
  const branch = nodeById(model, 'BRANCH-1');
  assert.equal(branch.branchId, branchName);
  assert.notEqual(branch.lineId, 'SHOULD-NOT-WIN');
  assert.ok(branch.lineId, 'branch parser must continue to provide a source line identity');
});
