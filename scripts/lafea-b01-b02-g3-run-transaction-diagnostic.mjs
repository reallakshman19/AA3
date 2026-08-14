#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  createLafeaWorkbenchRunTransactionState,
  solverConfigurationHash,
} from '../src/workspace/lafea-workbench-run-transaction-state.js';
import { projectLafeaRuntimeSolverDiagnostics } from '../src/workspace/lafea-runtime-solver-diagnostics.js';

const H = (seed) => `sha256:${seed.repeat(64).slice(0, 64)}`;
const parents = {
  sourceHash: H('1'),
  analysisDomainHash: H('2'),
  analysisGeometryHash: H('3'),
  meshHash: H('4'),
  meshProfileHash: H('5'),
  solverModelHash: H('6'),
};
const preflight = {
  stageId: 'LAFEA.3',
  status: 'PASS',
  executionAuthorized: true,
  ...parents,
  compilerId: 'LAFEA.3/DOMAIN_FIRST_SOLVER_COMPILER',
  compilerRevision: '12B.1',
  requestedCaseIds: ['LC1'],
  semanticHash: H('7'),
};
const currentStage = {
  stageId: 'LAFEA.3',
  sourceAuthority: { sourceHash: parents.sourceHash },
  analysisDomainProjection: { analysisDomainHash: parents.analysisDomainHash },
  analysisGeometryProjection: { analysisGeometryHash: parents.analysisGeometryHash },
  analysisMeshCustodyProjection: { meshHash: parents.meshHash },
  retainedAnalysisMeshEvidenceV2: { meshProfileHash: parents.meshProfileHash },
  retainedContinuumPreflightEvidence: { solverModelHash: parents.solverModelHash },
};
const execution = {
  schema: 'lafea-domain-first-workbench-execution/v1',
  stageId: 'LAFEA.3',
  status: 'QUALIFIED',
  route: 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL',
  ...parents,
  compiledExecutionHash: H('8'),
  result: {
    meshEvidence: { globalStiffnessMatrix: [[1]] },
    loadCaseResults: [{
      loadCaseId: 'LC1',
      solverEvidence: {
        method: 'DETERMINISTIC_CHOLESKY',
        pivotRatio: 0.75,
        accepted: true,
      },
      freeDofResiduals: [{ dofIdentity: 'N1:UX', value: 1e-12 }],
      reactions: [{ dofIdentity: 'N1:UY', value: -10 }],
      equilibrium: { accepted: true, freeDofTolerance: 1e-9 },
    }],
  },
};

const transactions = createLafeaWorkbenchRunTransactionState(['LAFEA.3']);
const first = transactions.begin('LAFEA.3', preflight);
assert.equal(first.status, 'RUNNING');
assert.equal(first.startSequence, 1);
assert.match(first.transactionHash, /^sha256:[0-9a-f]{64}$/u);
assert.equal(first.solverConfigHash, solverConfigurationHash(preflight));

const second = transactions.begin('LAFEA.3', preflight);
assert.equal(second.startSequence, 2);
assert.notEqual(second.transactionId, first.transactionId);
assert.equal(transactions.fields('LAFEA.3').latestRunTransactionReceipt.status, 'SUPERSEDED');
assert.throws(
  () => transactions.assertCurrent('LAFEA.3', first.transactionId, currentStage, execution),
  /LAFEA_RUN_TRANSACTION_SUPERSEDED/,
  'an older transaction must never be able to complete over a newer transaction',
);

const denseDiagnostics = projectLafeaRuntimeSolverDiagnostics(execution);
assert.equal(denseDiagnostics.storageRoute, 'DENSE');
assert.deepEqual(denseDiagnostics.methods, ['DETERMINISTIC_CHOLESKY']);
assert.equal(denseDiagnostics.loadCases[0].freeDofCount, 1);
assert.equal(denseDiagnostics.loadCases[0].constrainedDofCount, 1);
assert.equal(denseDiagnostics.loadCases[0].finalResidualInfinity, null);
assert.equal(denseDiagnostics.loadCases[0].freeDofResidualInfinity, 1e-12);
assert.equal(denseDiagnostics.progressPolicy, 'REAL_MILESTONES_ONLY_NO_PERCENTAGE');
assert.equal(Object.keys(denseDiagnostics).some((key) => /percent/iu.test(key)), false);

const completed = transactions.complete(
  'LAFEA.3', second.transactionId, currentStage, execution, denseDiagnostics,
);
assert.equal(completed.status, 'COMPLETED');
assert.equal(completed.startSequence, 2);
assert.equal(completed.completionSequence, 2,
  'superseding the first transaction must remain visible in completion sequencing');
assert.equal(completed.executionHash, execution.compiledExecutionHash);
assert.equal(completed.runtimeDiagnosticsHash, denseDiagnostics.semanticHash);
assert.match(completed.semanticHash, /^sha256:[0-9a-f]{64}$/u);
assert.equal(completed.releaseQualified, false);

const staleTransactions = createLafeaWorkbenchRunTransactionState(['LAFEA.3']);
const stale = staleTransactions.begin('LAFEA.3', preflight);
const changedStage = structuredClone(currentStage);
changedStage.analysisMeshCustodyProjection.meshHash = H('9');
assert.throws(
  () => staleTransactions.assertCurrent('LAFEA.3', stale.transactionId, changedStage, execution),
  /LAFEA_RUN_TRANSACTION_PARENT_STALE:meshHash/,
  'a mesh edit during a transaction must block publication of the old solve',
);
staleTransactions.invalidate('LAFEA.3', 'TEST_PARENT_CHANGED');
assert.equal(staleTransactions.fields('LAFEA.3').latestRunTransactionReceipt.status, 'SUPERSEDED');

const csrDiagnostics = projectLafeaRuntimeSolverDiagnostics({
  ...execution,
  compiledExecutionHash: H('a'),
  result: {
    meshEvidence: { globalStiffnessMatrix: null, globalStiffnessStorage: 'CSR_FULL_SYMMETRIC' },
    loadCaseResults: [{
      loadCaseId: 'LC1',
      solverEvidence: {
        method: 'DETERMINISTIC_JACOBI_PCG',
        preconditioner: 'JACOBI',
        iterationLimit: 1000,
        iterations: 17,
        initialResidualInfinity: 12,
        finalResidualInfinity: 2e-10,
        convergenceTarget: 1e-9,
        residualTolerance: 1e-8,
        accepted: true,
      },
      freeDofResiduals: [{ dofIdentity: 'N1:UX', value: 2e-10 }],
      reactions: [{ dofIdentity: 'N1:UY', value: -10 }],
      equilibrium: { accepted: true, freeDofTolerance: 1e-8 },
    }],
  },
});
assert.equal(csrDiagnostics.storageRoute, 'CSR_FULL_SYMMETRIC');
assert.deepEqual(csrDiagnostics.methods, ['DETERMINISTIC_JACOBI_PCG']);
assert.equal(csrDiagnostics.loadCases[0].preconditioner, 'JACOBI');
assert.equal(csrDiagnostics.loadCases[0].iterations, 17);
assert.equal(csrDiagnostics.loadCases[0].finalResidualInfinity, 2e-10);
assert.equal(csrDiagnostics.terminationState, 'CONVERGED');
assert.equal(csrDiagnostics.releaseQualified, false);

console.log(JSON.stringify({
  schema: 'lafea-b02-g3-run-transaction-diagnostic/v1',
  status: 'PASS',
  completedTransactionId: completed.transactionId,
  denseStorageRoute: denseDiagnostics.storageRoute,
  denseMethod: denseDiagnostics.methods[0],
  csrStorageRoute: csrDiagnostics.storageRoute,
  csrMethod: csrDiagnostics.methods[0],
  staleParentRejected: true,
  olderTransactionCannotOverwriteNewer: true,
  inventedProgressPercentage: false,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}));
