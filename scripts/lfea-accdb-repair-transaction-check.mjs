#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  previewAccdbNodeCoordinateEdit,
  replayAccdbCoordinateDraft,
  ACCDB_COORDINATE_DRAFT_SCHEMA,
} from '../src/core/linear-piping-analysis-consumer/accdb-coordinate-overrides.js';
import { createLinearPipingAccdbIntake, createLinearPipingAccdbSession, prepareLinearPipingAccdbPreFlight } from '../src/workspace/linear-piping-accdb-intake.js';
import { resolveLfeaAccdbFindingTargets, sourceElementForSegment } from '../src/workspace/lfea-diagnostics/lfea-accdb-finding-locator.js';

const sourceIdentity = 'ORIGINAL-SHA';
const nodal = (from, to, a, b) => ({
  FROM_NODE: from, TO_NODE: to,
  FROM_NODE_X: a, FROM_NODE_Y: 0, FROM_NODE_Z: 0,
  TO_NODE_X: b, TO_NODE_Y: 0, TO_NODE_Z: 0,
});
const element = (id, from, to, dx) => ({
  ELEMENTID: id, FROM_NODE: from, TO_NODE: to,
  DELTA_X: dx, DELTA_Y: 0, DELTA_Z: 0,
});
const tables = {
  INPUT_UNITS: { rows: [{ LENGTH: 'MM' }] },
  INPUT_NODAL_COORDINATES: { rows: [nodal(10, 20, 0, 1000), nodal(20, 30, 1000, 2000)] },
  INPUT_BASIC_ELEMENT_DATA: { rows: [element(1, 10, 20, 1000), element(2, 20, 30, 1000)] },
};
const original = JSON.stringify(tables);
const request = (overrides = {}) => ({
  nodeId: 20, axis: 'X', value: 1200, unit: 'mm',
  sourceIdentity, expectedSourceIdentity: sourceIdentity,
  revision: 0, expectedRevision: 0,
  ...overrides,
});
const preview = previewAccdbNodeCoordinateEdit(tables, request());
assert.equal(preview.changed, true);
assert.equal(preview.before, 1000);
assert.equal(preview.after, 1200);
assert.equal(preview.affectedElementIds.length, 2);
assert.deepEqual(preview.tables.INPUT_NODAL_COORDINATES.rows.map((r) => [r.TO_NODE_X, r.FROM_NODE_X]),
  [[1200, 0], [2000, 1200]]);
assert.deepEqual(preview.tables.INPUT_BASIC_ELEMENT_DATA.rows.map((r) => r.DELTA_X), [1200, 800]);
assert.equal(JSON.stringify(tables), original, 'source tables must remain byte-independent');
assert.notEqual(createLinearPipingAccdbIntake(tables, { fileName: 'demo.ACCDB' }).contentSha256,
  createLinearPipingAccdbIntake(preview.tables, { fileName: 'demo.ACCDB' }).contentSha256,
  'the exact consumed preparation intake identity must change');
const noop = previewAccdbNodeCoordinateEdit(tables, request({ value: 1000 }));
assert.equal(noop.changed, false);
assert.equal(noop.tables, tables);
for (const bad of [
  { value: 'NaN' }, { unit: 'in' }, { expectedRevision: 1 },
  { expectedSourceIdentity: 'DIFFERENT' }, { nodeId: 500 },
  { value: 2000 },
]) {
  assert.throws(() => previewAccdbNodeCoordinateEdit(tables, request(bad)),
    undefined, 'a bad edit cannot commit');
}
const conflicting = structuredClone(tables);
conflicting.INPUT_NODAL_COORDINATES.rows[1].FROM_NODE_X = 1400;
assert.throws(() => previewAccdbNodeCoordinateEdit(conflicting, request()), /inconsistent/i);
const draft = {
  schema: ACCDB_COORDINATE_DRAFT_SCHEMA, sourceIdentity,
  approver: 'Qualified reviewer', reason: 'Source coordinate error confirmed against reference',
  edits: [{ nodeId: '20', axis: 'X', value: 1200, unit: 'mm' },
    { nodeId: '20', axis: 'X', value: 1250, unit: 'mm' }],
};
const replay = replayAccdbCoordinateDraft(tables, draft, sourceIdentity);
assert.equal(replay.tables.INPUT_NODAL_COORDINATES.rows[0].TO_NODE_X, 1250);
assert.equal(replay.disclosures.length, 2);
assert.equal(replayAccdbCoordinateDraft(tables, { ...draft, edits: draft.edits.slice(0, 1) }, sourceIdentity)
  .tables.INPUT_NODAL_COORDINATES.rows[0].TO_NODE_X, 1200, 'undo must reconstruct from original');
assert.throws(() => replayAccdbCoordinateDraft(tables, draft, 'OTHER'), /match/i);
assert.throws(() => replayAccdbCoordinateDraft(tables, { ...draft, approver: '' }, sourceIdentity), /approver/i);

const sourceBundle = {
  elementRecords: [{ sourceFeatureId: 'PIPINGELEMENT[0]', accdbElementId: '17', canonicalSegmentId: 'ACCDB.E17' }],
};
const descriptor = {
  nodes: [{ nodeId: '10' }, { nodeId: '20' }],
  segments: [{ segmentId: 'ACCDB.E17', sourceFeatureId: 'ACCDB-SOURCE-E17' }],
};
const finding = { findingId: 'F1', sourceFeatureIds: ['PIPINGELEMENT[0]'], canonicalEntityIds: [] };
const linked = resolveLfeaAccdbFindingTargets(finding, sourceBundle, descriptor);
assert.deepEqual(linked.segmentIds, ['ACCDB.E17']);
assert.equal(linked.targetStatus, 'EXACT');
assert.equal(sourceElementForSegment(descriptor.segments[0], sourceBundle).accdbElementId, '17');
assert.equal(resolveLfeaAccdbFindingTargets(finding, sourceBundle,
  { ...descriptor, segments: [{ segmentId: 'DERIVED.A', sourceFeatureId: 'UNKNOWN' }] }).targetStatus,
'SOURCE_ONLY_NOT_IN_REPRESENTATION', 'derived topology is not an editable source locator');
assert.equal(resolveLfeaAccdbFindingTargets({ ...finding, sourceFeatureIds: ['UNRESOLVED'] },
  sourceBundle, descriptor).targetStatus, 'UNRESOLVED_PROVENANCE');

// Repeat the transaction on the unaltered, real 96-element CAESAR model, using
// exactly the importer and preflight the browser consumes (not a sketch).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
assert.ok(fs.existsSync(ACCDB), 'The tracked real BM4_L.ACCDB is required: do not substitute a toy fixture.');
const bytes = fs.readFileSync(ACCDB);
const originalBytes = Buffer.from(bytes);
const MDBReaderModule = await import('mdb-reader');
const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
const reader = new MDBReader(bytes);
const names = [
  'INPUT_BASIC_ELEMENT_DATA','INPUT_BENDS','INPUT_CONTROL','INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES','INPUT_OFFSETS','INPUT_REDUCERS','INPUT_RESTRAINTS',
  'INPUT_RIGIDS','INPUT_SIFTEES','INPUT_UNITS',
];
const realTables = Object.fromEntries(names.map((name) => [name, { rows: reader.getTable(name).getData() }]));
const realOriginal = JSON.stringify(realTables);
const realSession = createLinearPipingAccdbSession(realTables, { fileName: 'BM4_L.ACCDB' });
const realBefore = prepareLinearPipingAccdbPreFlight(realSession.intake, realSession.sourceBundle);
assert.ok(realBefore?.preparation?.findings);
const positionRow = realTables.INPUT_NODAL_COORDINATES.rows[0];
const id = positionRow.FROM_NODE;
const coordinate = Number(positionRow.FROM_NODE_X);
const realPreview = previewAccdbNodeCoordinateEdit(realTables, {
  nodeId: id, axis: 'X', value: coordinate + 10,
  unit: String(realSession.sourceBundle.unitSystem.declared.length).trim().toLowerCase().replace(/\.$/u, ''),
  sourceIdentity: realSession.intake.contentSha256,
  expectedSourceIdentity: realSession.intake.contentSha256,
  revision: 0, expectedRevision: 0,
});
assert.ok(realPreview.changed);
const corrected = createLinearPipingAccdbSession(realPreview.tables, { fileName: 'BM4_L.ACCDB' });
const realAfter = prepareLinearPipingAccdbPreFlight(corrected.intake, corrected.sourceBundle);
assert.notEqual(realSession.intake.contentSha256, corrected.intake.contentSha256);
assert.notEqual(realBefore.semanticHash, realAfter.semanticHash,
  'preparation must consume the corrected raw tables');
assert.ok(realAfter?.preparation?.findings?.length);
assert.equal(JSON.stringify(realTables), realOriginal, 'reader tables untouched');
assert.ok(bytes.equals(originalBytes), 'original binary ACCDB buffer untouched');
console.log(JSON.stringify({
  check: 'lfea-accdb-repair-transaction', status: 'PASS', model: 'BM4_L.ACCDB',
  baselineFindings: realBefore.preparation.findings.length,
  correctedFindings: realAfter.preparation.findings.length,
  changedRawCells: realPreview.changes.length,
  sourceHashChanged: true, preparationHashChanged: true,
  originalBytesUnchanged: true, exactFindingLocator: true, undoRedoReplay: true,
}));
