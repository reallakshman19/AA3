#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accdbTablesToCanonicalGeometry } from '../src/core/geometry/adapters/accdb-to-canonical-geometry.js';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const tablesPath = args.get('--tables');
if (!tablesPath) throw new TypeError('Usage: node scripts/lfea-bm4l-bend-tangent-source-check.mjs --tables <accdb-tables.json>');

const tables = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
const geometry = accdbTablesToCanonicalGeometry(tables, { source: 'BM4_L.ACCDB:S1_TANGENT_CUSTODY' });
const bends = geometry.segments.filter((segment) => segment.type === 'BEND');

assert.equal(bends.length, 10, `BM4_L must expose exactly 10 bend segments; found ${bends.length}.`);

const tolerance = 1e-9;
const distance = (left, right) => Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
for (const bend of bends) {
  assert.equal(bend.meta.bendTangentBasis, 'ACCDB_CORNER_INTERSECTION_V1', `${bend.id} tangent basis mismatch.`);
  assert.ok(bend.meta.bendTangentStart, `${bend.id} missing bendTangentStart.`);
  assert.ok(bend.meta.bendTangentEnd, `${bend.id} missing bendTangentEnd.`);
  assert.ok(bend.meta.bendArcCentre, `${bend.id} missing bendArcCentre.`);
  assert.ok(bend.meta.bendComputedRadius > 0, `${bend.id} missing positive bendComputedRadius.`);

  const radius = bend.meta.bendComputedRadius;
  const startRadius = distance(bend.meta.bendArcCentre, bend.meta.bendTangentStart);
  const endRadius = distance(bend.meta.bendArcCentre, bend.meta.bendTangentEnd);
  const scale = Math.max(radius, startRadius, endRadius);
  assert.ok(Math.abs(startRadius - radius) / scale <= tolerance,
    `${bend.id} tangent-start radius disagreement exceeds ${tolerance}.`);
  assert.ok(Math.abs(endRadius - radius) / scale <= tolerance,
    `${bend.id} tangent-end radius disagreement exceeds ${tolerance}.`);
  assert.ok(Math.abs(startRadius - endRadius) / scale <= tolerance,
    `${bend.id} tangent points are not equidistant from the resolved centre.`);
}

const bendErrors = geometry.diagnostics.filter((row) => row.severity === 'error' && String(row.code).includes('BEND'));
assert.deepEqual(bendErrors, [], `BM4_L bend geometry produced error diagnostics: ${JSON.stringify(bendErrors)}`);

console.log(JSON.stringify({
  check: 'lfea-bm4l-bend-tangent-source',
  status: 'PASS',
  source: geometry.source,
  bendCount: bends.length,
  tangentBasis: 'ACCDB_CORNER_INTERSECTION_V1',
  relativeTolerance: tolerance,
  bendIds: bends.map((bend) => bend.id),
}));
