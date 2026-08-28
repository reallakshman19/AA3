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
// An ACCDB working point is bound onto the arc, not discarded.
//
// This fixture used to assert the opposite: node T retired, retargeting
// refused as ACCDB_WORKING_POINT_BINDING_REQUIRES_EXPLICIT_AUTHORITY. Retiring
// it loses whatever the source attached there -- BM4_L hangs real applied
// forces on bend working points -- and caesar-accdb-linear-solve.js does not
// discard them either: it binds TO_NODE to the far tangent. Production now
// matches that, so T survives, repositioned from the corner intersection onto
// the tangent it actually sits on, and the spans stay continuous through it.
assert.deepEqual(accdb.retiredNodeIds, [],
  'A bindable ACCDB working point must not be retired.');
assert.equal(accdb.nodeRetargeting.T, undefined,
  'A bound working point needs no retargeting record.');

const workingPoint = accdb.geometry.nodes.find((entry) => String(entry.id) === 'T');
assert.ok(workingPoint, 'The ACCDB working point must survive retopology.');
assert.equal(workingPoint.meta.bendWorkingPointOf, 'E1');
assert.equal(workingPoint.meta.bendArcRole, 'END_WORKING_POINT');
// Repositioned onto the bend's far tangent (1, 0.2, 0), not left at the corner
// intersection (1, 0, 0) it was declared at.
for (const [axis, expected] of [['x', 1], ['y', 0.2], ['z', 0]]) {
  assert.ok(Math.abs(workingPoint[axis] - expected) <= TOL,
    `working point ${axis} is ${workingPoint[axis]}, expected ${expected}`);
}

assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E1.S1'
  && entry.startNodeId === 'A' && entry.endNodeId === 'E1.T0'),
'The incoming straight must run from the source node to the near tangent.');
assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E1.B6'
  && entry.endNodeId === 'T'),
'The final arc chord must land on the bound working point.');
assert.ok(accdb.geometry.segments.some((entry) => entry.id === 'E2'
  && entry.startNodeId === 'T' && entry.endNodeId === 'B'),
'The following span must still start at the working point, unbroken.');
assertArcInvariant(accdb, 'E1', { x: 0.8, y: 0.2, z: 0 }, 0.2);
for (const segment of accdb.geometry.segments) {
  assert.ok(accdb.spanOrigin[segment.id], `Every produced span must have source custody: ${segment.id}`);
}

// A restrained or loaded working point is BOUND, not blocked.
//
// These two cases used to assert a BLOCK, on the reasoning that a support must
// not silently move to "an arbitrary tangent". The tangent is not arbitrary. In
// CAESAR a bend element runs to the far tangent weld point; the corner
// intersection is how the geometry is entered, not where the pipe ends. The
// benchmark solver says the same thing in code -- setAnalysisPosition is called
// with canMove true for exactly the last point of a bend definition and false
// for every other -- so the working point is the one node it is legitimate to
// move onto the arc.
//
// Blocking instead was not the safe choice it looked like: BM4_L hangs real
// applied forces on bend working points, so a BLOCK there refuses the model
// outright rather than analysing it the way CAESAR does.
//
// The fail-closed path still exists for the case that genuinely is ambiguous --
// a RETIRED node carrying bound entities with no qualified target still raises
// BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS from collectRetopologyBindingBlockers.
// A bindable working point simply never becomes one.
const boundCorner = structuredClone(accdbGeometry);
boundCorner.nodes.find((entry) => entry.id === 'T').restraint = 'GUIDE';
boundCorner.nodes.find((entry) => entry.id === 'T').meta = { restraints: [{ typeLabel: '+Y' }] };
const boundCornerResult = retopologiseDeclaredBends(boundCorner, PROFILE);
assert.deepEqual(boundCornerResult.retiredNodeIds, [],
  'A restrained working point must be bound onto the tangent, not retired.');
const restrainedPoint = boundCornerResult.geometry.nodes.find((entry) => String(entry.id) === 'T');
assert.equal(restrainedPoint.restraint, 'GUIDE',
  'The restraint must travel with the node it was declared on.');
assert.ok(Math.abs(restrainedPoint.y - 0.2) <= TOL,
  'The restrained working point must sit on the tangent the bend actually ends at.');

const forceBoundCorner = structuredClone(accdbGeometry);
forceBoundCorner.segments[0].meta.analysis.forcesMoments = [{
  forceMomentNumber: 1,
  nodeId: 'T',
  vectors: [{ number: 1, force: { fx: 1, fy: 0, fz: 0 }, moment: { mx: 0, my: 0, mz: 0 } }],
}];
const forceBoundResult = retopologiseDeclaredBends(forceBoundCorner, PROFILE);
assert.deepEqual(forceBoundResult.retiredNodeIds, [],
  'A loaded working point must be bound rather than refused.');
assert.ok(forceBoundResult.geometry.nodes.some((entry) => String(entry.id) === 'T'),
  'The node carrying the applied load must survive so the load has somewhere to act.');

const inputXmlGeometry = {
  schemaVersion: 'canonical-geometry-v1',
  source: 'S2_INPUTXML_SYNTHETIC',
  unit: 'm', diagnostics: [],
  // A tangent-to-tangent bend needs its incoming run present. The InputXML
  // adapter already requires a unique predecessor before it will accept an arc
  // centre, so a lone bend is a state the adapter never emits; the fixture
  // carries the predecessor rather than asking retopology to infer a direction
  // from nothing.
  nodes: [node('PM1', 0, 0, 0), node('P0', 0.8, 0, 0), node('P1', 1, 0.2, 0)],
  segments: [{
    id: 'IX-S0', startNodeId: 'PM1', endNodeId: 'P0', type: 'PIPE',
    length: 0.8, sourceComponentUid: 'SRC-IX-S0', meta: { analysis: {} },
  }, {
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
// Stated as the property rather than a total, so adding the predecessor run to
// the fixture does not silently change what is being asserted: the bend is
// REPLACED by its chords, not shadowed by them.
const inputXmlChords = inputXml.geometry.segments
  .filter((entry) => entry.meta?.bendChordOf === 'IX-B1');
assert.equal(inputXmlChords.length, 6,
  'A tangent-to-tangent InputXML bend must produce exactly six arc chords.');
assert.ok(!inputXml.geometry.segments.some((entry) => entry.id === 'IX-B1'),
  'The original straight chord must not survive in parallel with its own arc.');
assert.ok(inputXml.geometry.segments.some((entry) => entry.id === 'IX-S0'),
  'The predecessor run is not part of the bend and must be left alone.');
// Everything the bend produced is a chord of it -- the predecessor run is not
// its output and is excluded rather than counted as a stray.
assert.ok(inputXml.geometry.segments
  .filter((entry) => entry.id !== 'IX-S0')
  .every((entry) => entry.meta?.bendChordOf === 'IX-B1'),
'A tangent-to-tangent bend must leave nothing behind but its own chords.');
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
