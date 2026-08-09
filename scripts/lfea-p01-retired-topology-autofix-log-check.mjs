#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const retiredPath = 'src/workspace/topology-autofix-log.js';
assert.equal(fs.existsSync(retiredPath), false, 'P-01 retired module must remain absent.');

const files = walk('src').filter((file) => file.endsWith('.js') || file.endsWith('.mjs'));
for (const token of [
  'mountAutofixLog',
  'topology:autofix-accept',
  'topology:autofix-reject',
  'autofix-log-ledger',
]) {
  const owners = files.filter((file) => fs.readFileSync(file, 'utf8').includes(token));
  assert.deepEqual(owners, [], `E_P01_RETIRED_REFERENCE ${token}: ${owners.join(', ')}`);
}

for (const owner of [
  'src/workspace/lfea-topology-review-model.js',
  'src/workspace/lfea-topology-review-from-prefea.js',
  'src/workspace/lfea-topology-review-view.js',
]) {
  assert.equal(fs.existsSync(owner), true, `E_P01_REVIEW_OWNER_MISSING ${owner}`);
}

const guard = fs.readFileSync('scripts/check-enrichment-ui-phase0-antidrift.mjs', 'utf8');
assert.match(guard, /mountAutofixLog/u);
assert.match(guard, /topologyEventRisk/u);

console.log('P01-01 PASS orphan topology autofix log is retired');
console.log('P01-02 PASS no legacy mount symbol, accept/reject event channel or ledger role remains in production source');
console.log('P01-03 PASS governed P-02 topology review owner remains present');
console.log('P01-04 PASS Phase-0 anti-drift still rejects resurrection of the retired autofix UI path');
console.log(JSON.stringify({
  check: 'lfea-p01-retired-topology-autofix-log',
  status: 'PASS',
  retiredPath,
  legacyReferenceCount: 0,
  replacementOwner: 'P02_READ_ONLY_TOPOLOGY_REVIEW',
}));

function walk(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else if (entry.isFile()) out.push(file.replaceAll(path.sep, '/'));
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
