#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateBendSubdivisionConvergence,
} from '../src/core/linear-fea-piping-components/bend-component.js';
import {
  retopologiseDeclaredBends,
  BendRetopologyError,
} from '../src/core/linear-piping-analysis-consumer/bend-retopology.js';

const PROFILE = Object.freeze({
  spanSeedingLimit: Object.freeze({ value: 1e9, source: 'S2 deterministic test fixture' }),
  bendSeedingSegments: Object.freeze({ value: 6, source: 'S2/B3.2 convergence-qualified test fixture' }),
  bendLengthErrorLimit: Object.freeze({ value: 0.02, source: 'S2 deterministic test fixture' }),
});
const TOL = 1e-9;
const CONVERGENCE_POLICIES = Object.freeze({
  bendConvergenceRefinementFactor: Object.freeze({ value: 4, source: 'LFEA-B3.2' }),
  convergenceRelativeTolerance: Object.freeze({ value: 0.01, source: 'LFEA-B3.2' }),
});

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
  assert.equal(chords.length, 6, `${sourceSegmentId} must become six chord spans.`);
  const nodes = new Map(result.geometry.nodes.map((entry) => [String(entry.id), entry]));
  const chainIds = [chords[0].startNodeId, ...chords.map((entry) => entry.endNodeId)];
  for (const id of chainIds) {
    const point = nodes.get(String(id));
    assert.ok(point, `Missing chord node ${id}.`);
    assert.ok(Math.abs(distance(point, centre) - radius) / radius <= TOL,
      `${sourceSegmentId} chord node ${id} is off the declared arc.`);
  }
  const record = result.bendRecords.find((entry) => entry.sourceSegmentId === sourceSegmentId);
  const arcLength = Math.PI * radius / 2;
  const polyline = chords.reduce((sum, entry) => sum + entry.length, 0);
  assert.ok((arcLength - polyline) / arcLength < 0.02,
    `${sourceSegmentId} six-chord polyline must satisfy the 2% arc-length shortfall limit.`);
  assert.equal(chords[2].endNodeId, record.midArcNodeId,
    `${sourceSegmentId} must retain a deterministic mid-arc node.`);
  assert.ok(Math.abs(record.chordChainLength - polyline) / polyline <= TOL,
    `${sourceSegmentId} chord-chain evidence must match the generated polyline.`);
}

const convergenceInput = Object.freeze({
  tangentStart: [0.8, 0, 0],
  tangentEnd: [1, 0.2, 0],
  centre: [0.8, 0.2, 0],
  bendingRigidity: 1,
  planeNormal: [0, 0, 1],
  policies: CONVERGENCE_POLICIES,
});
const fourChordConvergence = evaluateBendSubdivisionConvergence({
  ...convergenceInput,
  elementCount: 4,
});
const sixChordConvergence = evaluateBendSubdivisionConvergence({
  ...convergenceInput,
  elementCount: 6,
});
assert.equal(fourChordConvergence.accepted, false,
  'Four chords must remain rejected: 90-degree compliance does not meet the existing 1% B3.2 convergence criterion.');
assert.ok(fourChordConvergence.displacementRelativeDelta > 0.01,
  'Four-chord rejection must be caused by displacement convergence, not an unrelated check.');
assert.equal(sixChordConvergence.accepted, true,
  'Six chords must satisfy the existing 1% B3.2 convergence criterion against 4x refinement.');
assert.ok(sixChordConvergence.displacementRelativeDelta < fourChordConvergence.displacementRelativeDelta,
  'The six-chord candidate must improve compliance convergence over four chords.');

const productionProfileSource = fs.readFileSync(
  'src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js',
  'utf8',
);
const componentProfileBlock = productionProfileSource.match(
  /export const INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE = Object\.freeze\(\{([\s\S]*?)\n\}\);/u,
)?.[1] ?? '';
assert.ok(componentProfileBlock, 'Production component conditioning profile must exist.');
assert.match(componentProfileBlock, /bendSeedingSegments:\s*\{[\s\S]*?value:\s*6,/u,
  'Production S2 profile must use the convergence-qualified six bend chords.');
assert.match(componentProfileBlock, /bendLengthErrorLimit:\s*\{[\s\S]*?value:\s*0\.02,/u,
  'Production S2 profile must retain the 2% chord-length-error limit.');

const accdbGeometry = {
  schemaVersion: 'canonical-geometry-v1',
  source: 'S2_ACCDB_SYNTHETIC',
  unit: 'm',
  diagnostics: [],
  nodes: [node('A', 0, 0, 0), node('T', 1, 0, 0), node('B', 1, 1, 0)],
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
  'A circular ACCDB working point must not be assigned to one tangent by numerical ordering.');
assert.equal(accdb.nodeRetargeting.T.reason, 'ACCDB_WORKING_POINT_BINDING_REQUIRES_EXPLICIT_AUTHORITY');
assert.ok(!accdb.geometry.nodes.some((entry) => entry.id === 'T'), 'Unbound ACCDB working point must leave structural topology.');
assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E1/S1'
  && entry.startNodeId === 'A' && entry.endNodeId === 'E1/T0'));
assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E2/S1'
  && entry.startNodeId === 'E1/T1' && entry.endNodeId === 'B'));
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
  'A support on a retired working point must BLOCK rather than move to an arbitrary tangent.',
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
  'A nodal load on a retired working point must BLOCK.',
);

const inputXmlGeometry = {
  schemaVersion: 'canonical-geometry-v1',
  source: 'S2_INPUTXML_SYNTHETIC',
  unit: 'm', diagnostics: [],
  nodes: [node('P0', 0.8, 0, 0), node('P1', 1, 0.2, 0)],
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
assert.equal(inputXml.geometry.segments.length, 6,
  'Tangent-to-tangent InputXML bend must be replaced by six chords only; the original straight chord must not survive in parallel.');
assert.ok(inputXml.geometry.segments.every((entry) => entry.meta?.bendChordOf === 'IX-B1'));
assert.ok(!inputXml.geometry.segments.some((entry) => entry.meta?.retopologyRole === 'BEND_INCOMING_STRAIGHT'));
assertArcInvariant(inputXml, 'IX-B1', { x: 0.8, y: 0.2, z: 0 }, 0.2);

const oddProfile = structuredClone(PROFILE);
oddProfile.bendSeedingSegments.value = 5;
assert.throws(
  () => retopologiseDeclaredBends(inputXmlGeometry, oddProfile),
  (error) => error instanceof BendRetopologyError && error.code === 'BEND_RETOPOLOGY_CHORD_COUNT_INVALID',
  'Odd chord counts must be rejected because they cannot retain a unique mid-arc station.',
);

console.log(JSON.stringify({
  check: 'lfea-bend-retopology', status: 'PASS',
  fourChordDisplacementRelativeDelta: fourChordConvergence.displacementRelativeDelta,
  sixChordDisplacementRelativeDelta: sixChordConvergence.displacementRelativeDelta,
  accdbChordCount: accdb.summary.chordCount,
  accdbRetiredNodeCount: accdb.summary.retiredNodeCount,
  inputXmlChordCount: inputXml.summary.chordCount,
  profileChordCount: PROFILE.bendSeedingSegments.value,
  profileLengthErrorLimit: PROFILE.bendLengthErrorLimit.value,
}));
