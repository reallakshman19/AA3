#!/usr/bin/env node
/** Fail-closed receipt check for real BM4_L E75 native-vs-inactive-candidate K. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const input = process.argv[2];
assert.ok(input, 'Usage: node scripts/lfea-bm4l-e75-matrix-evidence-check.mjs <receipt.json>');
const record = JSON.parse(readFileSync(input,'utf8'));
assert.equal(record.schema, 'lfea-bm4l-native-e75-reducer-assembly-forensic/v1');
assert.equal(record.sourceSegmentId,'ACCDB.E75');
assert.equal(record.status,'PASS_CANDIDATE_GLOBAL_MATRIX_AND_LOADS_CONSISTENT_BUT_NOT_PRODUCTION_AUTHORIZED');
assert.equal(record.currentProductionReducerExactMechanics,false);
assert.equal(record.counterfactualReducerExactMechanics,true);
assert.equal(record.activeSolverIsUnchanged,true);
assert.equal(record.sourceReferenceCaesarParityReSolvedWithCandidate,false);
assert.equal(record.globalCaesarNumericalParityClaimed,false);
assert.ok(record.globalMatrixMaxRelativeDifference>1e-9);
assert.ok(record.localMatrixMaxRelativeDifference>1e-9);
assert.ok(record.nativeGlobalConsistencyRelative<=1e-12);
assert.ok(record.candidateGlobalConsistencyRelative<=1e-12);
assert.ok(record.candidateLoadConsistencyRelative.gravity<=1e-12);
assert.ok(record.candidateLoadConsistencyRelative.thermal<=1e-12);
assert.ok(Math.abs(record.coordinateRightHandedness-1)<=1e-10);
assert.ok(record.maximumAxisNonorthogonality<=1e-10);
for (const label of ['native','counterfactual']) {
  assert.equal(record[label].localStiffness.length,144);
  assert.equal(record[label].globalStiffness.length,144);
  assert.equal(record[label].equivalentLoadVector.local.length,12);
  assert.equal(record[label].equivalentLoadVector.global.length,12);
  assert.equal(record[label].initialStrainLoadVector.local.length,12);
  assert.equal(record[label].initialStrainLoadVector.global.length,12);
}
console.log('BM4L_E75_ASSEMBLY_RESULT '+JSON.stringify({
  status:record.status, sourceElementId:record.sourceSegmentId,
  nativeElementId:record.elementId,
  localXAxis:record.axisX,
  alignmentWithGlobalX:record.frameLocalXAxisAlignmentWithGlobalX,
  lengthM:record.fromToLengthM,
  rigidOffsetsPresent:!record.noLocalOffsetAdded,
  baselineGlobalSelfConsistency:record.nativeGlobalConsistencyRelative,
  candidateGlobalSelfConsistency:record.candidateGlobalConsistencyRelative,
  candidateLoadsGlobalSelfConsistency:record.candidateLoadConsistencyRelative,
  localMatrixRelativeChange:record.localMatrixMaxRelativeDifference,
  globalMatrixRelativeChange:record.globalMatrixMaxRelativeDifference,
  topChangedStiffnessEntries:record.largestGlobalMatrixChanges.slice(0,6),
  productionFlagChanged:false,
  numericalCaesarParityQualified:false,
}));
