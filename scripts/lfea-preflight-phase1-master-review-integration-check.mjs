#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createSharedPipingModel } from '../src/core/shared-piping-model/index.js';
import { createLfeaPreflightPhase1MasterAuthority } from '../src/workspace/lfea-preflight-phase1-master-authority.js';
import {
  createLfeaPreflightPhase1ReviewSource,
  getLfeaPreflightPhase1ReviewCell,
  getLfeaPreflightPhase1ReviewLine,
} from '../src/workspace/lfea-preflight-phase1-review-source.js';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../src/workspace/lfea-preflight-phase1-schema.js';

const CAPTURED = Object.freeze({
  lineList: '2026-08-11T08:00:00.000Z',
  pipingClass: '2026-08-11T08:01:00.000Z',
  materialMap: '2026-08-11T08:02:00.000Z',
});
const HASH = Object.freeze({
  lineList: '1'.repeat(64),
  pipingClass: '2'.repeat(64),
  materialMap: '3'.repeat(64),
});

const sharedModel = model('DATASET-A', 6.02);
const masterData = masters();
const authority = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData,
  capturedAtByMaster: CAPTURED,
});
const sourceOnly = createLfeaPreflightPhase1ReviewSource(sharedModel, masterData.lineList.normalizedRows);
const integrated = createLfeaPreflightPhase1ReviewSource(
  sharedModel,
  masterData.lineList.normalizedRows,
  { masterAuthority: authority },
);
const targetId = integrated.lineIndex.targetIds[0];

assert.equal(getLfeaPreflightPhase1ReviewLine(integrated, targetId)?.isolatedLineKeyToken, 'S100');
assert.equal(integrated.datasetIdentity, sourceOnly.datasetIdentity,
  'Master enrichment must not rewrite source-stable dataset identity.');
assert.equal(targetId, sourceOnly.lineIndex.targetIds[0],
  'Master enrichment must not rewrite source-stable target identity.');
assert.notEqual(integrated.engineeringEvidenceHash, sourceOnly.engineeringEvidenceHash);
assert.notEqual(integrated.structuralHash, sourceOnly.structuralHash);
assert.equal(integrated.masterAuthoritySemanticHash, authority.semanticHash);
console.log('P06F-BRIDGE-01 PASS sealed identity.lineId joins authority without changing target identity');

const wall = cell(integrated, targetId, 'piping.wallThicknessMm');
assert.equal(wall.value, 6.02);
assert.equal(wall.status, LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT);
assert.equal(wall.method, 'EXACT_EVIDENCE_AGREEMENT');
assert.deepEqual(wall.evidence.map((entry) => entry.sourceKind), ['SHARED_MODEL', 'PIPING_CLASS']);
assert.equal(wall.evidence[1].method, 'EXACT_PIPING_CLASS_KEY_AND_FIELD');
assert.match(wall.evidence[1].sourceHash, /^2{64}$/u);
console.log('P06F-BRIDGE-02 PASS explicit source and governed piping-class wall agreement retain both evidence records');

const material = cell(integrated, targetId, 'material.materialCode');
assert.equal(material.value, 'A106-B');
assert.equal(material.status, LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT);
assert.equal(material.method, 'EXACT_EVIDENCE_AGREEMENT');
assert.deepEqual(material.evidence.map((entry) => entry.sourceKind), ['MASTER_LINE_LIST', 'MATERIAL_REGISTER']);
assert.equal(material.evidence[1].method, 'EXACT_MATERIAL_CODE_AND_FIELD');
console.log('P06F-BRIDGE-03 PASS Line List and Material Register material identity agreement is sealed, not reconstructed');

for (const [fieldId, expected] of [
  ['piping.nominalBoreIn', 4],
  ['piping.scheduleCode', 'SCH40'],
  ['piping.corrosionAllowanceMm', 1.5],
]) {
  const result = cell(integrated, targetId, fieldId);
  assert.equal(result.value, expected, `${fieldId} value`);
  assert.equal(result.status, LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT, `${fieldId} status`);
  assert.equal(result.evidence.length, 1, `${fieldId} evidence count`);
  assert.equal(result.evidence[0].sourceKind, 'PIPING_CLASS', `${fieldId} source`);
}
assert.equal(cell(integrated, targetId, 'material.densityKgM3').value, null);
assert.equal(cell(integrated, targetId, 'material.densityKgM3').evidence.length, 0);
console.log('P06F-BRIDGE-04 PASS master-only section fields resolve while unavailable mechanical properties remain unavailable');

const conflictingAuthority = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData: masters({ wallThickness: 8.18 }),
  capturedAtByMaster: CAPTURED,
});
const wallConflict = createLfeaPreflightPhase1ReviewSource(
  sharedModel,
  masterData.lineList.normalizedRows,
  { masterAuthority: conflictingAuthority },
);
assert.equal(wallConflict.lineIndex.targetIds[0], targetId);
const conflictCell = cell(wallConflict, targetId, 'piping.wallThicknessMm');
assert.equal(conflictCell.value, null);
assert.equal(conflictCell.status, LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT);
assert.equal(conflictCell.evidence.length, 2);
assert.equal(wallConflict.lineIndex.queueCounts.CONFLICTING, 1,
  'Indexed queue status must use the same combined resolver as the lazy cell.');
console.log('P06F-BRIDGE-05 PASS exact source/master disagreement is null-valued conflict in both index and lazy cell');

const ambiguousAuthority = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData: masters({ duplicateSchedule: true }),
  capturedAtByMaster: CAPTURED,
});
const ambiguous = createLfeaPreflightPhase1ReviewSource(
  sharedModel,
  masterData.lineList.normalizedRows,
  { masterAuthority: ambiguousAuthority },
);
const ambiguousWall = cell(ambiguous, targetId, 'piping.wallThicknessMm');
assert.equal(ambiguousWall.value, 6.02,
  'Explicit source wall remains usable when the independent master key is ambiguous.');
assert.equal(ambiguousWall.status, LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT);
assert.equal(ambiguousWall.evidence[1].status, LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS);
const ambiguousSchedule = cell(ambiguous, targetId, 'piping.scheduleCode');
assert.equal(ambiguousSchedule.value, null);
assert.equal(ambiguousSchedule.status, LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS);
console.log('P06F-BRIDGE-06 PASS source-exact survives ambiguous corroboration while master-only schedule remains blocked');

const materialConflictAuthority = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData: masters({ materialCode: 'A106-X' }),
  capturedAtByMaster: CAPTURED,
});
const materialConflict = createLfeaPreflightPhase1ReviewSource(
  sharedModel,
  masterData.lineList.normalizedRows,
  { masterAuthority: materialConflictAuthority },
);
const materialConflictCell = cell(materialConflict, targetId, 'material.materialCode');
assert.equal(materialConflictCell.value, null);
assert.equal(materialConflictCell.status, LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT);
assert.deepEqual(materialConflictCell.evidence.map((entry) => entry.value), ['A106-B', 'A106-X']);
console.log('P06F-BRIDGE-07 PASS material identity disagreement blocks rather than applying source precedence');

const otherModel = model('DATASET-B', 6.02);
assert.throws(
  () => createLfeaPreflightPhase1ReviewSource(
    otherModel,
    masterData.lineList.normalizedRows,
    { masterAuthority: authority },
  ),
  (error) => error?.code === 'E_P06_MASTER_AUTHORITY_SOURCE_MISMATCH',
  'A sealed authority bundle must not be reusable against a different shared model.',
);
console.log('P06F-BRIDGE-08 PASS master authority is cryptographically bound to the current sealed shared model');

for (const fieldId of LFEA_PREFLIGHT_ENGINEERING_FIELDS) {
  const result = cell(integrated, targetId, fieldId);
  if (isBlocked(result.status)) assert.equal(result.value, null, `${fieldId} blocked value invariant`);
  assert.ok(Object.isFrozen(result.evidence), `${fieldId} evidence array must be frozen`);
  for (const evidence of result.evidence) assert.ok(Object.isFrozen(evidence), `${fieldId} evidence row must be frozen`);
}
console.log('P06F-BRIDGE-09 PASS all 40 fields preserve blocked-null and immutable evidence invariants');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-master-review-integration',
  status: 'PASS',
  targetId,
  sourceStableDatasetIdentity: integrated.datasetIdentity,
  masterAuthoritySemanticHash: integrated.masterAuthoritySemanticHash,
  engineeringEvidenceHash: integrated.engineeringEvidenceHash,
  structuralHash: integrated.structuralHash,
  integratedFields: [
    'piping.wallThicknessMm',
    'piping.nominalBoreIn',
    'piping.scheduleCode',
    'piping.corrosionAllowanceMm',
    'material.materialCode',
  ],
}));

function cell(source, targetIdValue, fieldId) {
  const ordinal = LFEA_PREFLIGHT_ENGINEERING_FIELDS.indexOf(fieldId);
  assert.notEqual(ordinal, -1, `Unknown qualification field ${fieldId}`);
  return getLfeaPreflightPhase1ReviewCell(source, targetIdValue, ordinal);
}

function model(datasetId, wallThickness) {
  return createSharedPipingModel({
    project: { datasetId, name: datasetId, sourceName: `${datasetId}.json` },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId,
      sourceSchema: 'integration-fixture/v1',
      sourceSemanticHash: `fnv1a64:${datasetId === 'DATASET-A' ? 'aaaaaaaaaaaaaaaa' : 'bbbbbbbbbbbbbbbb'}`,
      sourceByteHash: null,
    },
    components: [{
      componentKey: 'PIPE-100',
      sourceEntityId: 'PIPE-100',
      name: 'Display name intentionally not the line key',
      type: 'PIPE',
      identity: { lineId: 'S100', branchId: 'S100/B1', systemId: '', zoneId: '' },
      boreMm: 100,
      attributes: { SPEC: 'A1', RATING: '150', WT: String(wallThickness) },
      engineeringProperties: { pipingClassCode: 'A1', ratingClassCode: '150', nominalBoreMm: 100 },
      geometry: {
        start: null, end: null, center: null, points: [], branchPoints: [], sources: {},
        sourcePath: '/PIPE-100', ports: [],
      },
      compatibilityEvidence: {},
      sourceReferences: { sourceEntityId: 'PIPE-100' },
      diagnostics: [],
    }],
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
}

function masters(overrides = {}) {
  const wallThickness = overrides.wallThickness ?? 6.02;
  const materialCode = overrides.materialCode ?? 'A106-B';
  const pipingRows = [
    pipingRow(20, 'A1', 100, 4, 'SCH40', wallThickness, 1.5, 'ASTM A106 B'),
  ];
  if (overrides.duplicateSchedule) {
    pipingRows.push(pipingRow(21, 'A1', 100, 4, 'SCH80', 8.56, 1.5, 'ASTM A106 B'));
  }
  return {
    lineList: master('line-list.xlsx', 'LineList', HASH.lineList, {
      lineKey: 'LINE', pipingClass: 'CLASS', convertedBore: 'DN',
    }, [lineRow(10)]),
    pipingClass: master('piping-class.xlsx', 'Class', HASH.pipingClass, {
      pipingClass: 'CLASS', convertedBore: 'DN', nps: 'NPS', schedule: 'SCH',
      wallThickness: 'WT', corrosion: 'CA', materialName: 'MATERIAL',
    }, pipingRows),
    materialMap: master('materials.xlsx', 'Materials', HASH.materialMap, {
      code: 'CODE', material: 'MATERIAL', spec: 'SPEC',
    }, [materialRow(30, materialCode, 'ASTM A106 B', 'ASTM A106')]),
  };
}

function master(fileName, sheetName, sourceHash, fieldMap, normalizedRows) {
  return { fileName, sheetName, sourceHash, byteLength: 4096, fieldMap, normalizedRows, diagnostics: [] };
}

function lineRow(sourceRow) {
  return {
    _sourceRowIndex: sourceRow - 1,
    _sourceRowNumber: sourceRow,
    _sourceSheet: 'LineList',
    lineKey: 'S100',
    lineNoKey: 'S100',
    pipingClass: 'A1',
    rating: '150',
    material: 'A106-B',
    convertedBore: 100,
    p1: 1200,
    hydroPressure: 1800,
    t1: 200,
    t2: 120,
    t3: -20,
    density: 850,
    densityMixed: 850,
    phase: 'LIQUID',
  };
}

function pipingRow(sourceRow, pipingClass, convertedBore, nps, schedule, wallThickness, corrosion, materialName) {
  return {
    _sourceRowIndex: sourceRow - 1,
    _sourceRowNumber: sourceRow,
    _sourceSheet: 'Class',
    pipingClass,
    convertedBore,
    nps,
    schedule,
    wallThickness,
    corrosion,
    materialName,
  };
}

function materialRow(sourceRow, code, material, spec) {
  return {
    _sourceRowIndex: sourceRow - 1,
    _sourceRowNumber: sourceRow,
    _sourceSheet: 'Materials',
    code,
    material,
    spec,
  };
}

function isBlocked(status) {
  return status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    || status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS
    || status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT
    || status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE;
}
