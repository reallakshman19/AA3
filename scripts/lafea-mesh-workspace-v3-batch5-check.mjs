#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_MESH_TRANSFER_EVIDENCE_V3_SCHEMA,
  createLafeaMeshTransferEvidenceV3,
  requireLafeaMeshTransferForTargetV3,
} from '../src/workspace/lafea-mesh-transfer-evidence-v3.js';
import {
  LAFEA_FOOTPRINT_TRANSFER_QUALIFICATION_V3_SCHEMA,
  qualifyLafeaFootprintTransferV3,
} from '../src/workspace/lafea-footprint-transfer-qualification-v3.js';
import {
  LAFEA_SOLVER_AUTHORIZATION_SNAPSHOT_V3_SCHEMA,
  createLafeaSolverAuthorizationSnapshotV3,
  assertLafeaSolverDispatchSnapshotCurrentV3,
} from '../src/workspace/lafea-solver-authorization-snapshot-v3.js';
import {
  LAFEA_MESH_RECOVERY_ASSESSMENT_V3_SCHEMA,
  createLafeaMeshRecoveryAssessmentV3,
} from '../src/workspace/lafea-mesh-recovery-assessment-v3.js';

const transfer = createLafeaMeshTransferEvidenceV3({
  schema: LAFEA_MESH_TRANSFER_EVIDENCE_V3_SCHEMA,
  sourceStageId: 'LAFEA.4', targetStageId: 'LAFEA.5',
  sourceMeshEvidenceHash: hash('E4'), sourceMeshContentHash: hash('M'),
  targetMeshDependencyHash: hash('D5'), transferPolicyHash: hash('TRANSFER_POLICY'),
  capabilityHash: hash('CAPABILITY'), qualificationHash: hash('QUALIFICATION'),
  targetAdapterId: 'LAFEA_MESH_ADAPTER:LAFEA.5:V3', targetAdapterRevision: '3',
});
assert.doesNotThrow(() => requireLafeaMeshTransferForTargetV3(transfer, {
  sourceMeshContentHash: hash('M'), targetMeshDependencyHash: hash('D5'),
}));
assert.throws(() => requireLafeaMeshTransferForTargetV3(transfer, {
  targetMeshDependencyHash: hash('FORGED-D5'),
}));

const conservationInput = {
  schema: LAFEA_FOOTPRINT_TRANSFER_QUALIFICATION_V3_SCHEMA,
  stageId: 'LAFEA.5', hostMeshContentHash: hash('M'), footprintHash: hash('FOOTPRINT'),
  transferOperatorHash: hash('SUBCELL-OPERATOR'), lengthUnit: 'm', forceUnit: 'N',
  momentUnit: 'N*m', signConvention: 'RIGHT_HANDED', referencePoint: [0, 0, 0],
  targetResultantForce: [100, 0, 0], targetResultantMoment: [0, 0, 20],
  discreteResultantForce: [100, 0, 0], discreteResultantMoment: [0, 0, 20],
  footprintMeasure: 2, mappedFootprintMeasure: 2, outsideHostMeasure: 0,
  forceAbsTolerance: 1e-9, forceRelTolerance: 1e-9,
  momentAbsTolerance: 1e-9, momentRelTolerance: 1e-9, supportAbsTolerance: 1e-12,
};
assert.equal(qualifyLafeaFootprintTransferV3(conservationInput).qualification, 'PASS');
assert.equal(qualifyLafeaFootprintTransferV3({
  ...conservationInput, discreteResultantMoment: [0, 0, 18],
}).qualification, 'BLOCK');

const snapshot = createLafeaSolverAuthorizationSnapshotV3({
  schema: LAFEA_SOLVER_AUTHORIZATION_SNAPSHOT_V3_SCHEMA,
  stageId: 'LAFEA.5', workspaceStateHash: hash('WORKSPACE'), meshContentHash: hash('M'),
  meshAuthorityHash: hash('MESH_AUTHORITY'), meshDependencyHash: hash('D5'),
  materialSectionHash: hash('MATERIAL'), loadBcHash: hash('LOAD_BC'),
  solverCapabilityHash: hash('SOLVER_CAPABILITY'), solverQualificationHash: hash('SOLVER_QUALIFICATION'),
  authorityReceiptHash: hash('AUTHORITY_RECEIPT'), concurrencyVersion: 7,
});
const { authorizationHash, engineeringAuthority, executionAuthorized, ...current } = snapshot;
assert.doesNotThrow(() => assertLafeaSolverDispatchSnapshotCurrentV3(snapshot, current));
assert.throws(() => assertLafeaSolverDispatchSnapshotCurrentV3(snapshot, {
  ...current, meshContentHash: hash('M2'),
}));

const recovered = createLafeaMeshRecoveryAssessmentV3({
  schema: LAFEA_MESH_RECOVERY_ASSESSMENT_V3_SCHEMA,
  stageId: 'LAFEA.4', importedMeshContentHash: hash('M'),
  historicalEvidenceHash: hash('E-OLD'), historicalQualificationHash: hash('Q1'),
  historicalStatus: 'PASS', currentMeshDependencyHash: hash('D'),
  currentQualificationHash: hash('Q2'), currentStatus: 'BLOCK', currentAuthorityReceiptHash: null,
});
assert.equal(recovered.historicalStatus, 'PASS');
assert.equal(recovered.eligibleForAuthorityPromotion, false);
assert.equal(recovered.engineeringAuthority, false);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch5',
  status: 'PASS',
  forgedCrossStageTransferRejected: true,
  forceMomentConservationGated: true,
  dispatchMeshRaceRejected: true,
  historicalValidityPreservedWithoutCurrentAuthority: true,
}));

function hash(value) {
  return canonicalLafeaSha256({ schema: 'lafea-mesh-workspace-v3-batch5-fixture/v1', value });
}
