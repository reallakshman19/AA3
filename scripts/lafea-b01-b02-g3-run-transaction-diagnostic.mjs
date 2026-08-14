#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createLafeaWorkbenchRunTransactionState } from '../src/workspace/lafea-workbench-run-transaction-state.js';
import { projectLafeaRuntimeSolverDiagnostics } from '../src/workspace/lafea-runtime-solver-diagnostics.js';
const H = (c) => `sha256:${c.repeat(64).slice(0, 64)}`;
const p = { stageId: 'LAFEA.3', status: 'PASS', executionAuthorized: true,
  sourceHash: H('1'), analysisDomainHash: H('2'), analysisGeometryHash: H('3'), meshHash: H('4'),
  meshProfileHash: H('5'), solverModelHash: H('6'), compilerId: 'C', compilerRevision: '1',
  requestedCaseIds: ['LC1'], semanticHash: H('7') };
const stage = { sourceAuthority: { sourceHash: p.sourceHash },
  analysisDomainProjection: { analysisDomainHash: p.analysisDomainHash },
  analysisGeometryProjection: { analysisGeometryHash: p.analysisGeometryHash },
  analysisMeshCustodyProjection: { meshHash: p.meshHash }, retainedAnalysisMeshEvidenceV2: { meshProfileHash: p.meshProfileHash },
  retainedContinuumPreflightEvidence: { solverModelHash: p.solverModelHash } };
const execution = { stageId: 'LAFEA.3', status: 'QUALIFIED', sourceHash: p.sourceHash,
  analysisDomainHash: p.analysisDomainHash, analysisGeometryHash: p.analysisGeometryHash, meshHash: p.meshHash,
  meshProfileHash: p.meshProfileHash, solverModelHash: p.solverModelHash, compiledExecutionHash: H('8'),
  result: { meshEvidence: { globalStiffnessStorage: 'CSR_FULL_SYMMETRIC' }, loadCaseResults: [{ loadCaseId: 'LC1',
    solverEvidence: { method: 'DETERMINISTIC_JACOBI_PCG', preconditioner: 'JACOBI', iterations: 17,
      iterationLimit: 1000, initialResidualInfinity: 12, finalResidualInfinity: 2e-10,
      convergenceTarget: 1e-9, residualTolerance: 1e-8, accepted: true },
    freeDofResiduals: [{ value: 2e-10 }], reactions: [{ value: -10 }], equilibrium: { accepted: true } }] } };
const tx = createLafeaWorkbenchRunTransactionState(['LAFEA.3']);
const first = tx.begin('LAFEA.3', p), second = tx.begin('LAFEA.3', p);
assert.equal(tx.fields('LAFEA.3').latestRunTransactionReceipt.status, 'SUPERSEDED');
assert.throws(() => tx.assertCurrent('LAFEA.3', first.transactionId, stage, execution), /SUPERSEDED/);
const runtime = projectLafeaRuntimeSolverDiagnostics(execution);
assert.equal(runtime.storageRoute, 'CSR_FULL_SYMMETRIC');
assert.deepEqual(runtime.methods, ['DETERMINISTIC_JACOBI_PCG']);
assert.equal(runtime.loadCases[0].iterations, 17);
assert.equal(runtime.loadCases[0].freeDofResidualInfinity, 2e-10);
assert.equal(runtime.progressPolicy, 'REAL_MILESTONES_ONLY_NO_PERCENTAGE');
const receipt = tx.complete('LAFEA.3', second.transactionId, stage, execution, runtime);
assert.equal(receipt.status, 'COMPLETED'); assert.equal(receipt.executionHash, execution.compiledExecutionHash);
const stale = createLafeaWorkbenchRunTransactionState(['LAFEA.3']); const old = stale.begin('LAFEA.3', p);
const changed = structuredClone(stage); changed.analysisMeshCustodyProjection.meshHash = H('9');
assert.throws(() => stale.assertCurrent('LAFEA.3', old.transactionId, changed, execution), /PARENT_STALE:meshHash/);
console.log(JSON.stringify({ schema: 'lafea-b02-g3-run-transaction-diagnostic/v1', status: 'PASS',
  olderTransactionCannotOverwriteNewer: true, staleParentRejected: true, storageRoute: runtime.storageRoute,
  method: runtime.methods[0], inventedProgressPercentage: false, releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false }));
