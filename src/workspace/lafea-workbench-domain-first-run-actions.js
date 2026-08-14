/** Authoritative domain-first execution action for the canonical workbench orchestrator. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { executeLafeaContinuumAuthoritativeWorkbenchRun } from './lafea-continuum-authoritative-workbench-run.js';
import {
  registerLafeaContinuumDomainFirstLifecycleProducerBatch,
} from './lafea-continuum-domain-first-lifecycle-producers.js';

export function createLafeaWorkbenchDomainFirstRunActions(context) {
  const c = requireContext(context);
  let sequence = 0;

  function run(stageId) {
    try {
      const before = c.readStageState(stageId);
      if (before.preparationProjection?.state !== 'CURRENT_PASS'
        || before.preparationProjection?.usableForAuthorization !== true
        || !before.retainedContinuumPreflightEvidence) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_NOT_CURRENT_PASS');
      }
      const preflight = before.retainedContinuumPreflightEvidence;
      const authority = c.source.ensureRunAuthority(stageId, 'RUN_CALCULATION/SOURCE_AUTHORITY');
      sequence += 1;
      const transaction = runTransaction(stageId, sequence, preflight);
      c.domainFirstExecution.retain(stageId, runningExecution(transaction));
      c.clearOrchestratorDiagnostic();
      c.publish();

      const outcome = executeLafeaContinuumAuthoritativeWorkbenchRun(c, stageId);
      if (outcome.compiled.sourceAuthority.sourceHash !== authority.sourceHash) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_SOURCE_AUTHORITY_MISMATCH');
      }
      if (preflight.solverModelHash !== outcome.compiled.solverModel.solverModelHash) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_SOLVER_MODEL_STALE');
      }
      if (outcome.execution.status !== 'QUALIFIED' || !outcome.lifecycleBatch) {
        throw c.storeError(outcome.execution.diagnostics?.[0]?.code
          ?? 'LAFEA_CONTINUUM_AUTHORITATIVE_CALCULATION_REJECTED');
      }
      assertParents(transaction.parents, c.readStageState(stageId), outcome.execution, c);
      const runtimeSolverDiagnostics = runtimeDiagnostics(outcome.execution);
      c.domainFirstExecution.retain(stageId, freeze({
        ...outcome.execution, runTransaction: transaction, runtimeSolverDiagnostics,
      }));

      const predicted = registerLafeaContinuumDomainFirstLifecycleProducerBatch(
        c.readStageState(stageId).lifecycle, outcome.lifecycleBatch,
      );
      for (let index = 0; index < outcome.lifecycleBatch.records.length; index += 1) {
        c.invokeRetained('registerLifecycleArtifact', [
          outcome.lifecycleBatch.records[index],
          outcome.lifecycleBatch.registrations[index].registrationId,
        ]);
        if (c.getRetainedState().status === 'FAILED') {
          throw c.storeError(c.getRetainedState().diagnostics?.[0]?.code
            ?? 'LAFEA_CONTINUUM_DOMAIN_FIRST_REGISTRATION_REJECTED');
        }
      }
      verifyPublication(c.getRetainedState().stages[stageId]?.lifecycle,
        predicted, outcome.lifecycleBatch.records, c);
      assertParents(transaction.parents, c.readStageState(stageId), outcome.execution, c);
      c.domainFirstExecution.retain(stageId, freeze({
        ...outcome.execution,
        runTransaction: transaction,
        runtimeSolverDiagnostics,
        runTransactionReceipt: transactionReceipt(transaction, outcome.execution, runtimeSolverDiagnostics),
      }));
      c.clearOrchestratorDiagnostic();
    } catch (error) {
      c.domainFirstExecution.clear(stageId);
      c.failOrchestrator(error, 'LAFEA_CONTINUUM_AUTHORITATIVE_RUN_REJECTED');
    }
    return c.publish();
  }

  return Object.freeze({ run });
}

function runTransaction(stageId, startSequence, p) {
  const parents = freeze({ sourceHash: p.sourceHash, analysisDomainHash: p.analysisDomainHash,
    analysisGeometryHash: p.analysisGeometryHash, meshHash: p.meshHash,
    meshProfileHash: p.meshProfileHash, solverModelHash: p.solverModelHash });
  const solverConfigHash = canonicalLafeaSha256({ schema: 'lafea-solver-configuration-binding/v1',
    compilerId: p.compilerId, compilerRevision: p.compilerRevision,
    solverModelHash: p.solverModelHash, requestedCaseIds: p.requestedCaseIds });
  const basis = { schema: 'lafea-run-transaction/v1', stageId, startSequence, status: 'RUNNING',
    parents, solverConfigHash, preflightHash: p.semanticHash,
    executionRoute: 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL', releaseQualified: false };
  const transactionHash = canonicalLafeaSha256({ schema: 'lafea-run-transaction-hash-input/v1', transaction: basis });
  return freeze({ ...basis, transactionHash,
    transactionId: `LAFEA-TX-${String(startSequence).padStart(6, '0')}-${transactionHash.slice(7, 19).toUpperCase()}` });
}

function runningExecution(tx) {
  return freeze({ schema: 'lafea-domain-first-workbench-execution/v1', stageId: tx.stageId,
    status: 'RUNNING', route: tx.executionRoute, ...tx.parents, compiledExecutionHash: null,
    runTransaction: tx, runtimeSolverDiagnostics: null, diagnostics: [], releaseQualified: false });
}

function transactionReceipt(tx, execution, runtime) {
  const body = { schema: 'lafea-run-transaction-receipt/v1', stageId: tx.stageId,
    transactionId: tx.transactionId, transactionHash: tx.transactionHash,
    startSequence: tx.startSequence, completionSequence: tx.startSequence, status: 'COMPLETED',
    parents: tx.parents, solverConfigHash: tx.solverConfigHash, preflightHash: tx.preflightHash,
    executionRoute: tx.executionRoute, executionHash: execution.compiledExecutionHash,
    runtimeDiagnosticsHash: runtime.semanticHash, reasonCode: null, releaseQualified: false };
  return freeze({ ...body, semanticHash: canonicalLafeaSha256({
    schema: 'lafea-run-transaction-receipt-hash-input/v1', receipt: body,
  }) });
}

function runtimeDiagnostics(execution) {
  const result = execution.result;
  const loadCases = (result.loadCaseResults ?? []).map((row) => {
    const s = row.solverEvidence ?? {}, free = row.freeDofResiduals ?? [], reactions = row.reactions ?? [];
    const finite = free.map((x) => x?.value).filter(Number.isFinite).map(Math.abs);
    return freeze({ loadCaseId: row.loadCaseId ?? null, dofCount: free.length + reactions.length,
      freeDofCount: free.length, constrainedDofCount: reactions.length, reactionCount: reactions.length,
      method: s.method ?? null, preconditioner: s.preconditioner ?? null,
      iterations: Number.isInteger(s.iterations) ? s.iterations : null,
      iterationLimit: Number.isInteger(s.iterationLimit) ? s.iterationLimit : null,
      initialResidualInfinity: number(s.initialResidualInfinity), finalResidualInfinity: number(s.finalResidualInfinity),
      convergenceTarget: number(s.convergenceTarget), residualTolerance: number(s.residualTolerance),
      pivotRatio: number(s.pivotRatio), freeDofResidualInfinity: finite.length ? Math.max(...finite) : null,
      accepted: s.accepted === true && row.equilibrium?.accepted === true, equilibrium: row.equilibrium ?? null });
  });
  const body = { schema: 'lafea-runtime-solver-diagnostics/v1', stageId: execution.stageId,
    executionHash: execution.compiledExecutionHash, solverModelHash: execution.solverModelHash,
    storageRoute: result.meshEvidence?.globalStiffnessStorage
      ?? (Array.isArray(result.meshEvidence?.globalStiffnessMatrix) ? 'DENSE' : null),
    loadCases, methods: [...new Set(loadCases.map((x) => x.method).filter(Boolean))].sort(),
    terminationState: 'CONVERGED', progressPolicy: 'REAL_MILESTONES_ONLY_NO_PERCENTAGE', releaseQualified: false };
  return freeze({ ...body, semanticHash: canonicalLafeaSha256({
    schema: 'lafea-runtime-solver-diagnostics-hash-input/v1', diagnostics: body,
  }) });
}

function assertParents(expected, stage, execution, c) {
  const actual = { sourceHash: stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null,
    analysisDomainHash: stage.analysisDomainProjection?.analysisDomainHash ?? null,
    analysisGeometryHash: stage.analysisGeometryProjection?.analysisGeometryHash ?? null,
    meshHash: stage.analysisMeshCustodyProjection?.meshHash ?? null,
    meshProfileHash: stage.retainedAnalysisMeshEvidenceV2?.meshProfileHash
      ?? stage.retainedAnalysisMeshProfile?.semanticHash ?? null,
    solverModelHash: stage.retainedContinuumPreflightEvidence?.solverModelHash ?? null };
  for (const key of Object.keys(expected)) {
    if (actual[key] !== expected[key] || execution[key] !== expected[key]) {
      throw c.storeError(`LAFEA_RUN_TRANSACTION_PARENT_STALE:${key}`);
    }
  }
}

function verifyPublication(current, predicted, records, c) {
  for (const record of records) {
    if (current?.artifacts?.[record.kind]?.artifactHash !== predicted.artifacts[record.kind].artifactHash
      || current?.artifacts?.[record.kind]?.status !== 'CURRENT') {
      throw c.storeError('LAFEA_CONTINUUM_DOMAIN_FIRST_PUBLICATION_DIVERGED');
    }
  }
}
function number(value) { return Number.isFinite(value) ? value : null; }
function requireContext(value) {
  const functions = ['readStageState', 'invokeRetained', 'getRetainedState', 'publish',
    'clearOrchestratorDiagnostic', 'failOrchestrator', 'storeError'];
  if (!value || functions.some((name) => typeof value[name] !== 'function')
    || !value.source || !value.domainFirstExecution) {
    throw new TypeError('LAFEA_DOMAIN_FIRST_RUN_ACTION_CONTEXT_INVALID');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
