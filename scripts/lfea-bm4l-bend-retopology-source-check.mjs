#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accdbTablesToCanonicalGeometry } from '../src/core/geometry/adapters/accdb-to-canonical-geometry.js';
import { retopologiseDeclaredBends } from '../src/core/linear-piping-analysis-consumer/bend-retopology.js';
import { INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const tablesPath = args.get('--tables');
if (!tablesPath) throw new TypeError('Usage: node scripts/lfea-bm4l-bend-retopology-source-check.mjs --tables <accdb-tables.json>');

const tables = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
const source = accdbTablesToCanonicalGeometry(tables, { source: 'BM4_L.ACCDB:S2_RETOPOLOGY' });
const result = retopologiseDeclaredBends(source, INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE);
const chords = result.geometry.segments.filter((segment) => segment.meta?.bendChordOf);

assert.equal(result.summary.bendCount, 10, `BM4_L must retopologise 10 bends; found ${result.summary.bendCount}.`);
assert.equal(chords.length, 40, `BM4_L must contain 10 x 4 = 40 bend chord spans; found ${chords.length}.`);
assert.equal(result.summary.chordCount, 40);
assert.equal(result.bendRecords.length, 10);

const nodes = new Map(result.geometry.nodes.map((node) => [String(node.id), node]));
for (const bend of result.bendRecords) {
  const bendChords = chords
    .filter((segment) => segment.meta.bendChordOf === bend.sourceSegmentId)
    .sort((left, right) => left.meta.bendChordIndex - right.meta.bendChordIndex);
  assert.equal(bendChords.length, 4, `${bend.sourceSegmentId} did not produce four chords.`);
  assert.equal(bendChords[1].endNodeId, bend.midArcNodeId,
    `${bend.sourceSegmentId} does not retain its mid-arc node at the 2/4 station.`);
  assert.ok(nodes.has(bend.midArcNodeId), `${bend.sourceSegmentId} mid-arc node is missing.`);
  assert.ok(bend.lengthErrorFraction <= INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE.bendLengthErrorLimit.value,
    `${bend.sourceSegmentId} chord-length error exceeds the S2 profile limit.`);
}

for (const segment of result.geometry.segments) {
  const origin = result.spanOrigin[String(segment.id)] ?? null;
  assert.ok(origin, `Produced span ${segment.id} has no retained source origin.`);
}

for (const retired of result.retiredNodeIds) {
  assert.ok(!result.geometry.nodes.some((node) => String(node.id) === retired),
    `Retired working point ${retired} remains in structural geometry.`);
  const target = result.nodeRetargeting[retired];
  assert.ok(target, `Retired working point ${retired} has no retargeting evidence.`);
  if (target.nearestNodeId === null) {
    assert.equal(target.reason, 'AMBIGUOUS_NEAREST_RETAINED_NODE');
  }
}

console.log(JSON.stringify({
  check: 'lfea-bm4l-bend-retopology-source',
  status: 'PASS',
  bendCount: result.summary.bendCount,
  chordCount: result.summary.chordCount,
  retiredNodeCount: result.summary.retiredNodeCount,
  producedSegmentCount: result.summary.producedSegmentCount,
  retiredNodeIds: result.retiredNodeIds,
  ambiguousRetiredNodeIds: result.retiredNodeIds.filter((id) => result.nodeRetargeting[id]?.nearestNodeId === null),
}));
