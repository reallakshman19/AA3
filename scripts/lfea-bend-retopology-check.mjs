#!/usr/bin/env node

import assert from 'node:assert/strict';
import { retopologiseDeclaredBends, BendRetopologyError } from '../src/core/linear-piping-analysis-consumer/bend-retopology.js';
import { INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js';

const PROFILE = INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE;
const TOL = 1e-9;

function node(id, x, y, z, restraint = 'FREE', meta = {}) {
  return { id, x, y, z, restraint, meta };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function assertArcInvariant(result, sourceSegmentId, centre, radius) {
  const chords = result.geometry.segments
    .filter((segment) => segment.meta?.bendChordOf === sourceSegmentId)
    .sort((a, b) => a.meta.bendChordIndex - b.meta.bendChordIndex);
  assert.equal(chords.length, 4, `${sourceSegmentId} must become four chord spans.`);
  const nodes = new Map(result.geometry.nodes.map((entry) => [String(entry.id), entry]));
  const chainIds = [chords[0].startNodeId, ...chords.map((entry) => entry.endNodeId)];
  for (const id of chainIds) {
    const point = nodes.get(String(id));
    assert.ok(point, `Missing chord node ${id}.`);
    assert.ok(Math.abs(distance(point, centre) - radius) / radius <= TOL,
      `${sourceSegmentId} chord node ${id} is off the declared arc.`);
  }
  const arcLength = Math.PI * radius / 2;
  const polyline = chords.reduce((sum, entry) => sum + entry.length, 0);
  assert.ok((arcLength - polyline) / arcLength < 0.02,
    `${sourceSegmentId} four-chord polyline must satisfy the 2% arc-length shortfall limit.`);
  assert.equal(chords[1].endNodeId, result.bendRecords.find((entry) => entry.sourceSegmentId === sourceSegmentId).midArcNodeId,
    `${sourceSegmentId} must retain a deterministic mid-arc node.`);
}

const accdbGeometry = {
  schemaVersion: 'canonical-geometry-v1',
  source: 'S2_ACCDB_SYNTHETIC',
  unit: 'm',
  diagnostics: [],
  nodes: [
    node('A', 0, 0, 0),
    node('T', 1, 0, 0),
    node('B', 1, 1, 0),
  ],
  segments: [
    {
      id: 'E1', startNodeId: 'A', endNodeId: 'T', type: 'BEND', length: 1,
      sourceComponentUid: 'SRC-E1',
      meta: {
        bendTangentBasis: 'ACCDB_CORNER_INTERSECTION_V1',
        bendTangentStart: { x: 0.8, y: 0, z: 0 },
        bendTangentEnd: { x: 1, y: 0.2, z: 0 },
        bendArcCentre: { x: 0.8, y: 0.2, z: 0 },
        bendComputedRadius: 0.2,
        analysis: {},
      },
    },
    {
      id: 'E2', startNodeId: 'T', endNodeId: 'B', type: 'PIPE', length: 1,
      sourceComponentUid: 'SRC-E2', meta: { analysis: {} },
    },
  ],
};

const accdb = retopologiseDeclaredBends(accdbGeometry, PROFILE);
assert.deepEqual(accdb.retiredNodeIds, ['T']);
assert.equal(accdb.nodeRetargeting.T.nearestNodeId, null,
  'A circular ACCDB working point is equidistant from its two tangents and must not be guessed onto one side.');
assert.equal(accdb.nodeRetargeting.T.reason, 'AMBIGUOUS_NEAREST_RETAINED_NODE');
assert.ok(!accdb.geometry.nodes.some((entry) => entry.id === 'T'), 'Unbound ACCDB working point must leave structural topology.');
assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E1/S1'
  && entry.startNodeId === 'A' && entry.endNodeId === 'E1/T0'),
'ACCDB incoming source span must be shortened to the first tangent.');
assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E2/S1'
  && entry.startNodeId === 'E1/T1' && entry.endNodeId === 'B'),
'ACCDB outgoing source span must start at the second tangent.');
assertArcInvariant(accdb, 'E1', { x: 0.8, y: 0.2, z: 0 }, 0.2);
for (const segment of accdb.geometry.segments) {
  assert.ok(accdb.spanOrigin[segment.id], `Every produced span must have source custody: ${segment.id}`);
}

const boundCorner = structuredClone(accdbGeometry);
boundCorner.nodes.find((entry) => entry.id === 'T').restraint = 'GUIDE';
boundCorner.nodes.find((entry) => entry.id === 'T').meta = { restraints: [{ typeLabel: '+Y' }] };
assert.throws(
  () => retopologiseDeclaredBends(boundCorner, PROFILE),
  (error) => error instanceof BendRetopologyError
    && error.code === 'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS'
    && error.data?.sourceNodeId === 'T',
  'A support on an equidistant retired working point must BLOCK rather than move to an arbitrary tangent.',
);

const forceBoundCorner = structuredClone(accdbGeometry);
forceBoundCorner.segments[0].meta.analysis.forcesMoments = [{
  forceMomentNumber: 1,
  nodeId: 'T',
  vectors: [{ number: 1, force: { fx: 1, fy: 0, fz: 0 }, moment: { mx: 0, my: 0, mz: 0 } }],
}];
assert.throws(
  () => retopologiseDeclaredBends(forceBoundCorner, PROFILE),
  (error) => error instanceof BendRetopologyError
    && error.code === 'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS'
    && error.data?.boundKinds?.includes('APPLIED_FORCE_MOMENT'),
  'A nodal load on an ambiguous retired working point must BLOCK.',
);

const inputXmlGeometry = {
  schemaVersion: 'canonical-geometry-v1',
  source: 'S2_INPUTXML_SYNTHETIC',
  unit: 'm',
  diagnostics: [],
  nodes: [
    node('P0', 0.8, 0, 0),
    node('P1', 1, 0.2, 0),
  ],
  segments: [{
    id: 'IX-B1', startNodeId: 'P0', endNodeId: 'P1', type: 'BEND',
    length: Math.hypot(0.2, 0.2), sourceComponentUid: 'SRC-IX-B1',
    meta: {
      bendTangentBasis: 'INPUTXML_TANGENT_TO_TANGENT_V1',
      bendTangentStart: { x: 0.8, y: 0, z: 0 },
      bendTangentEnd: { x: 1, y: 0.2, z: 0 },
      bendArcCentre: { x: 0.8, y: 0.2, z: 0 },
      bendComputedRadius: 0.2,
      analysis: {},
    },
  }],
};
const inputXml = retopologiseDeclaredBends(inputXmlGeometry, PROFILE);
assert.equal(inputXml.retiredNodeIds.length, 0);
assert.equal(inputXml.geometry.segments.length, 4,
  'Tangent-to-tangent InputXML bend must be replaced by four chords only; the original straight chord must not survive in parallel.');
assert.ok(inputXml.geometry.segments.every((entry) => entry.meta?.bendChordOf === 'IX-B1'));
assert.ok(!inputXml.geometry.segments.some((entry) => entry.meta?.retopologyRole === 'BEND_INCOMING_STRAIGHT'));
assertArcInvariant(inputXml, 'IX-B1', { x: 0.8, y: 0.2, z: 0 }, 0.2);

const oddProfile = structuredClone(PROFILE);
oddProfile.bendSeedingSegments.value = 3;
assert.throws(
  () => retopologiseDeclaredBends(inputXmlGeometry, oddProfile),
  (error) => error instanceof BendRetopologyError && error.code === 'BEND_RETOPOLOGY_CHORD_COUNT_INVALID',
  'Odd chord counts must be rejected because they cannot retain a unique mid-arc station.',
);

console.log(JSON.stringify({
  check: 'lfea-bend-retopology',
  status: 'PASS',
  accdbChordCount: accdb.summary.chordCount,
  accdbRetiredNodeCount: accdb.summary.retiredNodeCount,
  inputXmlChordCount: inputXml.summary.chordCount,
  profileChordCount: PROFILE.bendSeedingSegments.value,
  profileLengthErrorLimit: PROFILE.bendLengthErrorLimit.value,
}));
