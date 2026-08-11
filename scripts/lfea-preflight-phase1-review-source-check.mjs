#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../src/workspace/lfea-preflight-phase1-schema.js';
import {
  createLfeaPreflightPhase1ReviewSource,
  getLfeaPreflightPhase1ReviewCell,
} from '../src/workspace/lfea-preflight-phase1-review-source.js';

const sourceText = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-source.js', 'utf8');

assert.match(sourceText, /projectPreflightModel/u);
assert.match(sourceText, /new Uint8Array\(lineCount\)/u);
assert.match(sourceText, /engineeringStatusByField/u);
assert.match(sourceText, /engineeringEvidenceHash/u);
assert.match(sourceText, /getLfeaPreflightPhase1ReviewCell/u);
assert.match(sourceText, /getLfeaPreflightPhase1ReviewComponent/u);
assert.match(sourceText, /getLfeaPreflightPhase1ComponentSourceOrdinal/u);
assert.match(sourceText, /getLfeaPreflightPhase1ComponentParentLineTargetId/u);
assert.doesNotMatch(sourceText, /lineByTargetId\.set[\s\S]{0,1200}\bcells\s*:/u,
  'Lazy line records must not retain 40 cell DTOs per line.');
assert.doesNotMatch(sourceText, /componentByTargetId/u,
  'Lazy source must not retain a second million-entry component-record map.');
console.log('P06B-SOURCE-01 PASS large retained state is typed statuses + indexes + compact source references');

assert.match(sourceText, /BLOCKED_MISSING/u);
assert.match(sourceText, /BLOCKED_AMBIGUOUS/u);
assert.match(sourceText, /BLOCKED_CONFLICT/u);
assert.match(sourceText, /value:\s*null/u);
assert.match(sourceText, /E_P06_BLOCKED_VALUE_NON_NULL/u);
assert.match(sourceText, /DUPLICATE_PRESERVING_KEY_BUCKET/u);
assert.match(sourceText, /NOT_YET_PROJECTED_BY_CURRENT_READ_ONLY_PREFLIGHT/u);
assert.equal(LFEA_PREFLIGHT_ENGINEERING_FIELDS.length, 40);
assert.equal(LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING, 4);
assert.equal(LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS, 5);
assert.equal(LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT, 6);
console.log('P06B-SOURCE-02 PASS unresolved/ambiguous/conflicting engineering values remain explicit and blocked values stay null');

const baselineRow = lineRow();
const baseline = createLfeaPreflightPhase1ReviewSource(sourceModel([8, 8]), [baselineRow]);
assert.equal(baseline.blocked, false);
assert.equal(baseline.targetCount, 1);
const baselineTarget = baseline.lineIndex.targetIds[0];

assertCell(baseline, baselineTarget, 'process.designPressureKpaG', {
  value: 1200,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'process.hydroTestPressureKpaG', {
  value: 1800,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'material.materialCode', {
  value: 'A106-B',
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'contents.operatingDensityKgM3', {
  value: 850,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'contents.gasDensityKgM3', {
  value: 12,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'contents.liquidDensityKgM3', {
  value: 900,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'contents.mixedDensityKgM3', {
  value: 700,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'insulation.thicknessMm', {
  value: 50,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
const designPressure = cell(baseline, baselineTarget, 'process.designPressureKpaG');
assert.match(designPressure.sourceHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(designPressure.candidateCount, 1);
console.log('P06D-SOURCE-01 PASS exact Line List engineering values carry deterministic selected-row provenance');

const noDesignPressureRow = lineRow({ p1: undefined, hydroPressure: 1800 });
const noDesignPressure = createLfeaPreflightPhase1ReviewSource(sourceModel([8]), [noDesignPressureRow]);
const noDesignTarget = noDesignPressure.lineIndex.targetIds[0];
assertCell(noDesignPressure, noDesignTarget, 'process.designPressureKpaG', {
  value: null,
  status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(noDesignPressure, noDesignTarget, 'process.hydroTestPressureKpaG', {
  value: 1800,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
const noOperatingDensityRow = lineRow({ density: undefined, densityMixed: 700 });
const noOperatingDensity = createLfeaPreflightPhase1ReviewSource(sourceModel([8]), [noOperatingDensityRow]);
const noDensityTarget = noOperatingDensity.lineIndex.targetIds[0];
assertCell(noOperatingDensity, noDensityTarget, 'contents.operatingDensityKgM3', {
  value: null,
  status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
  sourceKind: 'MASTER_LINE_LIST',
});
assertCell(noOperatingDensity, noDensityTarget, 'contents.mixedDensityKgM3', {
  value: 700,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'MASTER_LINE_LIST',
});
console.log('P06D-SOURCE-02 PASS design/hydro pressure and operating/mixed density cannot cross-fill one another');

assertCell(baseline, baselineTarget, 'piping.pipingClassCode', {
  value: 'A1',
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'SHARED_MODEL+MASTER_LINE_LIST',
});
assertCell(baseline, baselineTarget, 'piping.ratingClassCode', {
  value: '150',
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'SHARED_MODEL+MASTER_LINE_LIST',
});
const conflict = createLfeaPreflightPhase1ReviewSource(sourceModel([8, 8]), [lineRow({ pipingClass: 'B1' })]);
const conflictTarget = conflict.lineIndex.targetIds[0];
assert.equal(conflictTarget, baselineTarget,
  'Master enrichment changes must not rewrite source-stable target identity.');
assert.notEqual(conflict.structuralHash, baseline.structuralHash,
  'Engineering evidence changes must invalidate the review structural hash.');
assertCell(conflict, conflictTarget, 'piping.pipingClassCode', {
  value: null,
  status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
  sourceKind: 'SHARED_MODEL+MASTER_LINE_LIST',
});
assert.equal(conflict.lineIndex.queueCounts.CONFLICTING, 1);
console.log('P06D-SOURCE-03 PASS class/rating source-master agreement is explicit and disagreement enters the conflict queue');

assertCell(baseline, baselineTarget, 'piping.wallThicknessMm', {
  value: 8,
  status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
  sourceKind: 'SHARED_MODEL',
});
const wallConflict = createLfeaPreflightPhase1ReviewSource(sourceModel([8, 10]), [baselineRow]);
const wallConflictTarget = wallConflict.lineIndex.targetIds[0];
assert.equal(wallConflictTarget, baselineTarget,
  'Wall-thickness evidence changes must not rewrite source-stable target identity.');
assert.notEqual(wallConflict.structuralHash, baseline.structuralHash);
const wallCell = cell(wallConflict, wallConflictTarget, 'piping.wallThicknessMm');
assert.equal(wallCell.value, null);
assert.equal(wallCell.status, LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT);
assert.equal(wallCell.candidateCount, 2);
assert.equal(wallConflict.lineIndex.queueCounts.CONFLICTING, 1);
const wallMissing = createLfeaPreflightPhase1ReviewSource(sourceModel([null]), [baselineRow]);
assertCell(wallMissing, wallMissing.lineIndex.targetIds[0], 'piping.wallThicknessMm', {
  value: null,
  status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
  sourceKind: 'UNRESOLVED',
});
console.log('P06D-SOURCE-04 PASS wall thickness is explicit-source-only; disagreement blocks and missing evidence stays null');

const reorderedSelected = lineRow({ _sourceRowIndex: 1 });
const reordered = createLfeaPreflightPhase1ReviewSource(sourceModel([8, 8]), [
  lineRow({ lineKey: 'S9900001', _sourceRowIndex: 0, _sourceRowNumber: 99 }),
  reorderedSelected,
]);
const reorderedTarget = reordered.lineIndex.targetIds[0];
assert.equal(reorderedTarget, baselineTarget);
assert.equal(
  cell(reordered, reorderedTarget, 'process.designPressureKpaG').sourceHash,
  designPressure.sourceHash,
  'Master row semantic provenance must not depend on transient array ordinal.',
);
assert.equal(reordered.structuralHash, baseline.structuralHash,
  'Moving an unchanged selected master row must not create engineering-evidence drift.');
console.log('P06D-SOURCE-05 PASS selected master-row evidence hash is stable across input ordinal changes');

assertCell(baseline, baselineTarget, 'material.densityKgM3', {
  value: null,
  status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
  sourceKind: 'UNRESOLVED',
});
console.log('P06D-SOURCE-06 PASS unavailable authorities remain unresolved instead of being relabelled as Line List evidence');

assert.doesNotMatch(sourceText, /EventBus|publish\(|dispatchEvent|masterDataController|applyMaster|runLinearPiping|solveInputXml|compileSolver|factorization/u);
assert.doesNotMatch(sourceText, /innerHTML|insertAdjacentHTML|outerHTML|document\.|createElement/u);
assert.doesNotMatch(sourceText, /Date\.now|Math\.random|randomUUID|localeCompare/u);
assert.doesNotMatch(sourceText, /enrichment-ui-phase0/u);
console.log('P06B-SOURCE-03 PASS review source owns no mutation, solver, DOM, clock, entropy, locale, or fixture authority');

const eagerDraft = fs.readFileSync('src/workspace/lfea-preflight-phase1-adapter.js', 'utf8');
assert.doesNotMatch(fs.readFileSync('src/main.js', 'utf8'), /lfea-preflight-phase1-adapter/u);
assert.doesNotMatch(fs.readFileSync('src/workspace/lfea-preflight-ui.js', 'utf8'), /lfea-preflight-phase1-adapter/u);
assert.match(eagerDraft, /createLfeaPreflightPhase1ReviewSource/u);
console.log('P06B-SOURCE-04 PASS earlier eager draft is not live production composition; lazy v2 source remains the production authority seam');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-review-source',
  status: 'PASS',
  engineeringFieldCount: 40,
  eagerCellRetention: false,
  secondComponentRecordMap: false,
  blockedValuesRemainNull: true,
  masterRowProvenance: true,
  fieldCrossFillRejected: true,
  sourceMasterConflictQueue: true,
  explicitWallThicknessOnly: true,
  writeAuthority: false,
  solverAuthority: false,
}));

function cell(source, targetId, fieldId) {
  const fieldOrdinal = LFEA_PREFLIGHT_ENGINEERING_FIELDS.indexOf(fieldId);
  assert.notEqual(fieldOrdinal, -1, `Unknown engineering field in qualification: ${fieldId}`);
  return getLfeaPreflightPhase1ReviewCell(source, targetId, fieldOrdinal);
}

function assertCell(source, targetId, fieldId, expected) {
  const actual = cell(source, targetId, fieldId);
  assert.equal(actual.value, expected.value, `${fieldId} value`);
  assert.equal(actual.status, expected.status, `${fieldId} status`);
  assert.equal(actual.sourceKind, expected.sourceKind, `${fieldId} sourceKind`);
  return actual;
}

function sourceModel(wallThicknesses) {
  return {
    components: wallThicknesses.map((wallThickness, index) => ({
      id: `PIPE-${index + 1}`,
      name: `Pipe ${index + 1}`,
      type: 'PIPE',
      owner: 'S8811951',
      boreMm: 100,
      attributes: {
        SPEC: 'A1',
        RATING: '150',
        ...(wallThickness === null ? {} : { WT: String(wallThickness) }),
      },
    })),
  };
}

function lineRow(overrides = {}) {
  return {
    _sourceRowIndex: 0,
    _sourceRowNumber: 42,
    _sourceSheet: 'Line List',
    lineKey: 'S8811951',
    lineNoKey: 'S8811951',
    pipingClass: 'a1',
    rating: '150',
    material: 'A106-B',
    convertedBore: 100,
    p1: 1200,
    hydroPressure: 1800,
    t1: 200,
    t2: 120,
    t3: -20,
    insThk: 50,
    density: 850,
    densityGas: 12,
    densityLiquid: 900,
    densityMixed: 700,
    phase: 'LIQUID',
    ...overrides,
  };
}
