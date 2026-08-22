#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_GEOMETRY_REVIEW_SCHEMA,
  buildLfeaGeometryReview,
} from '../src/workspace/lfea-model-review/lfea-geometry-review.js';
import { projectLfeaGeometryReviewNodes } from '../src/workspace/lfea-model-review/lfea-geometry-review-svg.js';

const sourceGeometry = Object.freeze({
  unit: 'm',
  nodes: Object.freeze([
    Object.freeze({ id: '10', x: 0, y: 0, z: 0 }),
    Object.freeze({ id: '20', x: 1, y: 0, z: 0.25 }),
    Object.freeze({ id: '30', x: 2, y: 0.5, z: 0.25 }),
  ]),
  segments: Object.freeze([
    Object.freeze({ id: 'S1', startNodeId: '10', endNodeId: '20', type: 'BEND', sourceComponentUid: 'PIPINGELEMENT[0]' }),
    Object.freeze({ id: 'S2', startNodeId: '20', endNodeId: '30', type: 'PIPE', sourceComponentUid: 'PIPINGELEMENT[1]' }),
  ]),
});
const analysisGeometry = Object.freeze({
  unit: 'm',
  nodes: Object.freeze([
    Object.freeze({ id: '10', x: 0, y: 0, z: 0 }),
    Object.freeze({ id: '20', x: 1, y: 0, z: 0 }),
    Object.freeze({ id: '30', x: 2, y: 0.5, z: 0.25 }),
  ]),
  segments: Object.freeze([
    Object.freeze({
      id: 'S1', startNodeId: '10', endNodeId: '20', type: 'PIPE', sourceComponentUid: 'PIPINGELEMENT[0]',
      meta: Object.freeze({ inputXmlSourceType: 'BEND', analysisApproximation: 'GENERIC_APPROX_BEND_STRAIGHT_CHORD' }),
    }),
    Object.freeze({ id: 'S2', startNodeId: '20', endNodeId: '30', type: 'PIPE', sourceComponentUid: 'PIPINGELEMENT[1]' }),
  ]),
});
const preFlight = Object.freeze({
  semanticHash: 'PF-SEMANTIC-1',
  diagnostics: Object.freeze({
    sourceAuthority: Object.freeze({
      sourceBundleSemanticHash: 'SOURCE-SEMANTIC-1',
      sourceBundleEvidenceHash: 'SOURCE-EVIDENCE-1',
    }),
    sourceBundle: Object.freeze({ sourceKind: 'INPUTXML', geometry: sourceGeometry }),
  }),
  preparation: Object.freeze({
    structuralPreparation: Object.freeze({
      semanticHash: 'STRUCT-SEMANTIC-1',
      evidenceHash: 'STRUCT-EVIDENCE-1',
      conditionedTopology: Object.freeze({ geometry: analysisGeometry }),
    }),
  }),
});
const engineeringState = Object.freeze({
  revision: 4,
  source: Object.freeze({ kind: 'INPUTXML', fileName: 'model.xml', preparationOwner: 'INPUTXML' }),
  analysis: Object.freeze({ result: Object.freeze({ semanticHash: 'RESULT-1' }) }),
});

const beforePreFlight = JSON.stringify(preFlight);
const beforeSession = JSON.stringify(engineeringState);
const source = buildLfeaGeometryReview(preFlight, engineeringState, 'SOURCE');
const analysis = buildLfeaGeometryReview(preFlight, engineeringState, 'ANALYSIS');

assert.equal(source.schema, LFEA_GEOMETRY_REVIEW_SCHEMA);
assert.equal(source.selectedRepresentation, 'SOURCE');
assert.equal(source.selected.available, true);
assert.equal(source.selected.objectPath, 'preFlight.diagnostics.sourceBundle.geometry');
assert.equal(source.selected.semanticHash, 'SOURCE-SEMANTIC-1');
assert.equal(source.selected.evidenceHash, 'SOURCE-EVIDENCE-1');
assert.equal(source.selected.segments[0].type, 'BEND');
assert.equal(source.selected.nodes.find((row) => row.nodeId === '20').z, 0.25);

assert.equal(analysis.selectedRepresentation, 'ANALYSIS');
assert.equal(analysis.selected.available, true);
assert.equal(analysis.selected.objectPath, 'preFlight.preparation.structuralPreparation.conditionedTopology.geometry');
assert.equal(analysis.selected.semanticHash, 'STRUCT-SEMANTIC-1');
assert.equal(analysis.selected.segments[0].type, 'PIPE');
assert.equal(analysis.selected.segments[0].sourceType, 'BEND');
assert.equal(analysis.selected.segments[0].declaredApproximation, 'GENERIC_APPROX_BEND_STRAIGHT_CHORD');
assert.equal(analysis.selected.nodes.find((row) => row.nodeId === '20').z, 0);
assert.notDeepEqual(source.selected.nodes, analysis.selected.nodes,
  'Source/imported and analysis representations must remain distinguishable when governed records differ.');
assert.equal(JSON.stringify(preFlight), beforePreFlight,
  'Geometry review must not mutate pre-flight records.');
assert.equal(JSON.stringify(engineeringState), beforeSession,
  'Changing display representation must not mutate or invalidate the engineering session.');
assert.equal(source.sessionRevision, analysis.sessionRevision);
assert.equal(source.preFlightSemanticHash, analysis.preFlightSemanticHash);

const accdb = buildLfeaGeometryReview(preFlight, {
  ...engineeringState,
  source: { ...engineeringState.source, kind: 'ACCDB', fileName: 'model.accdb', preparationOwner: 'ACCDB' },
}, 'SOURCE');
assert.equal(accdb.selected.available, true);
assert.match(accdb.selected.authority, /ACCDB importer canonical geometry/u);
assert.equal(accdb.selected.objectPath, 'preFlight.diagnostics.sourceBundle.geometry');

const stagedState = {
  ...engineeringState,
  source: { ...engineeringState.source, kind: 'STAGED_JSON', fileName: 'plant.sjson', preparationOwner: 'INPUTXML' },
};
const stagedSource = buildLfeaGeometryReview(preFlight, stagedState, 'SOURCE');
assert.equal(stagedSource.selected.available, false);
assert.equal(stagedSource.selected.nodes.length, 0);
assert.equal(stagedSource.selected.segments.length, 0);
assert.match(stagedSource.selected.unavailableReason, /derived InputXML geometry is not substituted/iu);
const stagedAnalysis = buildLfeaGeometryReview(preFlight, stagedState, 'ANALYSIS');
assert.equal(stagedAnalysis.selected.available, true,
  'StagedJSON may use its derived InputXML preparation for analysis without relabelling that as original source geometry.');
assert.equal(stagedAnalysis.selected.objectPath,
  'preFlight.preparation.structuralPreparation.conditionedTopology.geometry');

const projected = projectLfeaGeometryReviewNodes(source.selected.nodes);
assert.equal(projected.length, source.selected.nodes.length);
assert.deepEqual(
  projected.map((row) => [row.sourceX, row.sourceY, row.sourceZ]),
  source.selected.nodes.map((row) => [row.x, row.y, row.z]),
  'Isometric projection must retain the exact source coordinates as display metadata.',
);
assert.deepEqual(projected, projectLfeaGeometryReviewNodes(source.selected.nodes),
  'Display projection must be deterministic.');

assert.throws(() => buildLfeaGeometryReview(preFlight, engineeringState, 'CANONICAL'), /Unknown LFEA geometry representation/u);
assert.equal(buildLfeaGeometryReview(null, engineeringState, 'SOURCE').selected.available, false);

const projectionSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-geometry-review.js', 'utf8');
const rendererSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-geometry-review-svg.js', 'utf8');
const panelSource = fs.readFileSync('src/workspace/lfea-model-review/lfea-model-review-panel.js', 'utf8');

for (const [name, text] of [['projection', projectionSource], ['renderer', rendererSource]]) {
  assert.doesNotMatch(text, /bindLfeaNodeEditor|onMoveNode|conditionGeometry|compileMechanicalModel|solveAuthorized|\.setSource\(|\.clearSource\(/u,
    `${name} must remain a read-only presentation consumer.`);
}
assert.match(rendererSource, /createLfeaViewport/u,
  'The piping geometry viewer should reuse only the existing pure LFEA viewport primitive.');
assert.match(rendererSource, /setAttribute\('role', 'img'\)/u);
assert.match(rendererSource, /dataset\.objectPath = descriptor\.objectPath/u,
  'Rendered SVG must disclose the exact object that supplied the representation.');
assert.doesNotMatch(rendererSource, /lfea-workbench-svg|polygon/u,
  'Piping centerline review must not silently reuse the editable polygon workbench renderer.');
assert.match(panelSource, /Imported \/ Source/u);
assert.match(panelSource, /'Analysis'/u);
assert.match(panelSource, /getLfeaEngineeringSessionState/u,
  'Model Review must consume the existing read-only engineering-session accessor.');
assert.doesNotMatch(panelSource, /bindLfeaNodeEditor|onMoveNode|conditionGeometry|solveAuthorized/u);

console.log(JSON.stringify({
  check: 'lfea-ui-geometry-review',
  status: 'PASS',
  sourceObject: source.selected.objectPath,
  analysisObject: analysis.selected.objectPath,
  representationsDiffer: true,
  stagedJsonSourceGeometry: 'UNAVAILABLE_NOT_SUBSTITUTED',
  displayProjectionMutatesSession: false,
  rendererEditable: false,
}));
