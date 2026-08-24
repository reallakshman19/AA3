#!/usr/bin/env node

/**
 * Stage S2 of the piping component promotion.
 *
 * Asserts that a re-topologised bend actually represents its arc: every chord
 * node lies on the circle, the chord polyline closes the arc length to within
 * the declared tolerance, and an exact mid-arc station exists because that is
 * where a code stress check reads a bend.
 *
 * Also asserts the two ways this can silently corrupt a model: a span left
 * pointing at a node that no longer exists, and a support attached to a corner
 * node that gets retired. The second is the dangerous one -- an omitted or
 * relocated support changes every reaction downstream of it and still produces
 * a result that looks entirely reasonable.
 *
 * See docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accdbTablesToCanonicalGeometry } from '../src/core/geometry/adapters/accdb-to-canonical-geometry.js';
import {
  BendRetopologyError,
  retopologiseDeclaredBends,
} from '../src/core/linear-piping-analysis-consumer/bend-retopology.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const PROFILE = Object.freeze({ bendChordCount: 4, bendLengthErrorLimit: 0.02 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// --- Profile guards -------------------------------------------------------

assert.throws(() => retopologiseDeclaredBends({ nodes: [], segments: [] }, { bendChordCount: 3, bendLengthErrorLimit: 0.02 }),
  /even for an exact mid-arc station/u, 'An odd chord count has no mid-arc node and must be refused.');
assert.throws(() => retopologiseDeclaredBends({ nodes: [], segments: [] }, { bendChordCount: 4, bendLengthErrorLimit: 0 }),
  /fraction in \(0,1\)/u);

// --- Fail-closed: a bound corner node may not be retired -------------------
// Built rather than found: BM4_L happens to carry no restraint on a corner, and
// the guard that matters most is the one no available model exercises.

const boundCorner = {
  unit: 'm',
  nodes: [
    { id: 'A', x: 0, y: 0, z: 0, restraint: 'FREE', meta: {} },
    // The corner, carrying a support.
    { id: 'T', x: 2, y: 0, z: 0, restraint: 'GUIDE', meta: { restraints: [{ typeLabel: '+Y' }] } },
    { id: 'B', x: 2, y: 2, z: 0, restraint: 'FREE', meta: {} },
  ],
  segments: [
    {
      id: 'S1',
      startNodeId: 'A',
      endNodeId: 'T',
      type: 'BEND',
      meta: {
        bendArcCentre: { x: 1.5, y: 0.5, z: 0 },
        bendComputedRadius: 0.5,
        bendTangentStart: { x: 1.5, y: 0, z: 0 },
        bendTangentEnd: { x: 2, y: 0.5, z: 0 },
        bendTangentBasis: 'ACCDB_CORNER_INTERSECTION_V1',
      },
    },
    { id: 'S2', startNodeId: 'T', endNodeId: 'B', type: 'PIPE', meta: {} },
  ],
};

assert.throws(
  () => retopologiseDeclaredBends(boundCorner, PROFILE),
  (error) => error instanceof BendRetopologyError
    && error.code === 'BEND_RETOPOLOGY_RETIRED_NODE_IS_BOUND'
    && error.data.cornerNodeId === 'T',
  'A corner node carrying a restraint must block rather than be silently retired.',
);

// The same model without the support must succeed, so the guard is proven to
// be firing on the restraint rather than on the geometry.
const freeCorner = {
  ...boundCorner,
  nodes: boundCorner.nodes.map((node) => (node.id === 'T' ? { ...node, restraint: 'FREE', meta: {} } : node)),
};
const freed = retopologiseDeclaredBends(freeCorner, PROFILE);
assert.equal(freed.bends.length, 1);
assert.deepEqual([...freed.retiredNodeIds], ['T']);

// --- Junction corners must block -----------------------------------------
const junction = {
  ...freeCorner,
  segments: [...freeCorner.segments, { id: 'S3', startNodeId: 'T', endNodeId: 'A', type: 'PIPE', meta: {} }],
};
assert.throws(() => retopologiseDeclaredBends(junction, PROFILE),
  (error) => error.code === 'BEND_RETOPOLOGY_AMBIGUOUS_SUCCESSOR',
  'A corner joining more than one other span is a junction and must not be retired.');

// --- Purity ---------------------------------------------------------------
const before = JSON.stringify(freeCorner);
retopologiseDeclaredBends(freeCorner, PROFILE);
assert.equal(JSON.stringify(freeCorner), before, 'Re-topology must not mutate the input geometry.');

// --- Real model -----------------------------------------------------------

let accdbSummary = 'SKIPPED_MODEL_NOT_PRESENT';
if (fs.existsSync(ACCDB)) {
  const MDBReaderModule = await import('mdb-reader');
  const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
  const reader = new MDBReader(fs.readFileSync(ACCDB));
  const names = [
    'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
    'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
    'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
  ];
  const tables = Object.fromEntries(names.map((n) => [n, { rows: reader.getTable(n).getData() }]));
  const source = accdbTablesToCanonicalGeometry(tables, {});
  const result = retopologiseDeclaredBends(source, PROFILE);

  assert.ok(result.bends.length > 0, 'BM4_L must re-topologise at least one bend.');

  const nodes = new Map(result.geometry.nodes.map((node) => [String(node.id), node]));
  const sourceById = new Map(source.segments.map((segment) => [String(segment.id), segment]));
  let worstOffArc = 0;
  for (const bend of result.bends) {
    const meta = sourceById.get(bend.segmentId).meta;
    const radius = meta.bendComputedRadius;

    // Every chord node lies on the arc.
    for (const nodeId of bend.addedNodeIds) {
      const node = nodes.get(nodeId);
      assert.ok(node, `${bend.segmentId}: chord node ${nodeId} is missing.`);
      const offArc = Math.abs(distance(node, meta.bendArcCentre) - radius) / radius;
      worstOffArc = Math.max(worstOffArc, offArc);
      assert.ok(offArc < 1e-9, `${bend.segmentId}: chord node ${nodeId} is off the arc by ${offArc}.`);
    }
    // Chord polyline closes the arc within the declared tolerance.
    assert.ok(bend.lengthErrorFraction <= PROFILE.bendLengthErrorLimit,
      `${bend.segmentId}: chord shortfall ${bend.lengthErrorFraction} exceeds the profile limit.`);
    assert.ok(bend.lengthErrorFraction > 0, `${bend.segmentId}: a chorded arc must be shorter than the arc.`);
    // Exact mid-arc station.
    assert.equal(bend.chordCount % 2, 0, `${bend.segmentId}: chord count must be even.`);
    assert.ok(bend.midArcNodeId && nodes.has(bend.midArcNodeId),
      `${bend.segmentId}: mid-arc station ${bend.midArcNodeId} is missing.`);
  }

  // No span may reference a retired node, and no retired node may be bound.
  const retired = new Set(result.retiredNodeIds);
  const dangling = result.geometry.segments.filter((segment) => retired.has(String(segment.startNodeId))
    || retired.has(String(segment.endNodeId)));
  assert.equal(dangling.length, 0, 'A span still references a retired corner node.');
  for (const nodeId of retired) {
    assert.ok(!nodes.has(nodeId), `Retired node ${nodeId} is still present in the geometry.`);
  }

  // Every produced span traces to exactly one source span.
  for (const segment of result.geometry.segments) {
    const origin = result.spanOrigin.get(String(segment.id));
    assert.ok(origin && sourceById.has(origin),
      `Span ${segment.id} does not trace to a retained source segment.`);
  }

  accdbSummary = {
    sourceNodes: source.nodes.length,
    sourceSegments: source.segments.length,
    analysisNodes: result.geometry.nodes.length,
    analysisSegments: result.geometry.segments.length,
    bends: result.bends.length,
    retiredCornerNodes: result.retiredNodeIds.length,
    worstChordNodeOffArc: Number(worstOffArc.toExponential(3)),
    maxChordShortfall: Number(Math.max(...result.bends.map((b) => b.lengthErrorFraction)).toFixed(6)),
  };
}

// --- Wiring ---------------------------------------------------------------
// Asserted structurally, not end to end. No runnable check in this repository
// drives structural preparation with a model that carries a resolvable arc:
// BM4's InputXML declares internal bend stations and resolves none, and the
// BM4_L ACCDB harness never reaches structural preparation at all. So these
// assert that preparation is wired to the re-topology rather than that a real
// model has been through it. That gap is real and is recorded in the plan.
const preparation = fs.readFileSync(
  path.join(ROOT, 'src/core/linear-piping-analysis-consumer/inputxml-linear-structural-preparation.js'),
  'utf8',
);
assert.match(preparation, /retopologiseDeclaredBends\(\s*\n?\s*analyticalGeometry/u,
  'Structural preparation must re-topologise declared bends before conditioning.');
assert.match(preparation, /conditionGeometry\(\s*\n?\s*retopology\.geometry/u,
  'Conditioning must run on the re-topologised geometry, not the raw projection.');
assert.match(preparation, /requireExplainedConditioning\(/u,
  'Identity conditioning must be replaced by the explained-custody check.');
assert.doesNotMatch(preparation, /^\s*requireIdentityConditioning\(prepared/mu,
  'The identity conditioning assertion must no longer gate preparation.');
assert.doesNotMatch(preparation, /startNodeId: String\(sourceSegment\.startNodeId\)/u,
  'Span endpoints must come from the conditioned segment, not the source segment.');
assert.match(preparation, /startNodeId: String\(segment\.startNodeId\)/u);
assert.match(preparation, /\.B\$\{chordIndex\}/u,
  'Chord element ids must carry the chord ordinal to stay unique.');

console.log(JSON.stringify({
  check: 'lfea-bend-retopology',
  status: 'PASS',
  accdb: accdbSummary,
  preparationWiring: 'ASSERTED_STRUCTURALLY_NOT_END_TO_END',
}));
