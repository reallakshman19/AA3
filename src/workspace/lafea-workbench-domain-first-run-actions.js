import { canonicalLafeaSha256 as hash } from './lafea-canonical-sha256.js';
import { executeLafeaContinuumAuthoritativeWorkbenchRun as execute } from './lafea-continuum-authoritative-workbench-run.js';
import { registerLafeaContinuumDomainFirstLifecycleProducerBatch as predict } from './lafea-continuum-domain-first-lifecycle-producers.js';

const PARENTS = ['sourceHash', 'analysisDomainHash', 'analysisGeometryHash', 'meshHash', 'meshProfileHash', 'solverModelHash'];

export function createLafeaWorkbenchDomainFirstRunActions(c) {
  requireContext(c); let sequence = 0;
  function run(stageId) {
    try {
      const before = c.readStageState(stageId), p = before.retainedContinuumPreflightEvidence;
      if (before.preparationProjection?.state !== 'CURRENT_PASS'
        || before.preparationProjection?.usableForAuthorization !== true || !p) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_NOT_CURRENT_PASS');
      }
      const authority = c.source.ensureRunAuthority(stageId, 'RUN_CALCULATION/SOURCE_AUTHORITY');
      const parents = Object.fromEntries(PARENTS.map((key) => [key, p[key]]));
      const txBasis = { schema: 'lafea-run-transaction/v1', stageId, startSequence: ++sequence,
        status: 'RUNNING', parents, preflightHash: p.semanticHash,
        solverConfigHash: hash({ schema: 'lafea-solver-configuration-binding/v1', compilerId: p.compilerId,
          compilerRevision: p.compilerRevision, solverModelHash: p.solverModelHash, requestedCaseIds: p.requestedCaseIds }) };
      const transactionHash = hash({ schema: 'lafea-run-transaction-hash-input/v1', transaction: txBasis });
      const tx = freeze({ ...txBasis, transactionHash,
        transactionId: `LAFEA-TX-${sequence}-${transactionHash.slice(7, 19).toUpperCase()}` });
      c.domainFirstExecution.retain(stageId, freeze({ schema: 'lafea-domain-first-workbench-execution/v1',
        stageId, status: 'RUNNING', route: 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL', ...parents,
        compiledExecutionHash: null, runTransaction: tx, releaseQualified: false }));
      c.clearOrchestratorDiagnostic(); c.publish();

      const outcome = execute(c, stageId);
      if (outcome.compiled.sourceAuthority.sourceHash !== authority.sourceHash) throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_SOURCE_AUTHORITY_MISMATCH');
      if (p.solverModelHash !== outcome.compiled.solverModel.solverModelHash) throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_SOLVER_MODEL_STALE');
      if (outcome.execution.status !== 'QUALIFIED' || !outcome.lifecycleBatch) throw c.storeError(outcome.execution.diagnostics?.[0]?.code ?? 'LAFEA_CONTINUUM_AUTHORITATIVE_CALCULATION_REJECTED');
      assertParents(parents, c.readStageState(stageId), outcome.execution, c);
      const runtime = runtimeDiagnostics(outcome.execution);
      c.domainFirstExecution.retain(stageId, freeze({ ...outcome.execution, runTransaction: tx, runtimeSolverDiagnostics: runtime }));

      const expected = predict(c.readStageState(stageId).lifecycle, outcome.lifecycleBatch);
      for (let i = 0; i < outcome.lifecycleBatch.records.length; i += 1) {
        c.invokeRetained('registerLifecycleArtifact', [outcome.lifecycleBatch.records[i], outcome.lifecycleBatch.registrations[i].registrationId]);
        if (c.getRetainedState().status === 'FAILED') throw c.storeError(c.getRetainedState().diagnostics?.[0]?.code ?? 'LAFEA_CONTINUUM_DOMAIN_FIRST_REGISTRATION_REJECTED');
      }
      verify(c.getRetainedState().stages[stageId]?.lifecycle, expected, outcome.lifecycleBatch.records, c);
      assertParents(parents, c.readStageState(stageId), outcome.execution, c);
      const receiptBasis = { schema: 'lafea-run-transaction-receipt/v1', transactionId: tx.transactionId,
        transactionHash, startSequence: sequence, completionSequence: sequence, status: 'COMPLETED',
        executionHash: outcome.execution.compiledExecutionHash, runtimeDiagnosticsHash: runtime.semanticHash,
        releaseQualified: false };
      c.domainFirstExecution.retain(stageId, freeze({ ...outcome.execution, runTransaction: tx,
        runtimeSolverDiagnostics: runtime, runTransactionReceipt: freeze({ ...receiptBasis,
          semanticHash: hash({ schema: 'lafea-run-transaction-receipt-hash-input/v1', receipt: receiptBasis }) }) }));
      c.clearOrchestratorDiagnostic();
    } catch (error) { c.domainFirstExecution.clear(stageId); c.failOrchestrator(error, 'LAFEA_CONTINUUM_AUTHORITATIVE_RUN_REJECTED'); }
    return c.publish();
  }
  return Object.freeze({ run });
}

function runtimeDiagnostics(execution) {
  const cases = (execution.result.loadCaseResults ?? []).map((row) => {
    const s = row.solverEvidence ?? {}, free = (row.freeDofResiduals ?? []).map((x) => Math.abs(x.value)).filter(Number.isFinite);
    return { loadCaseId: row.loadCaseId, method: s.method ?? null, preconditioner: s.preconditioner ?? null,
      iterations: Number.isInteger(s.iterations) ? s.iterations : null, finalResidualInfinity: finite(s.finalResidualInfinity),
      residualTolerance: finite(s.residualTolerance), freeDofResidualInfinity: free.length ? Math.max(...free) : null,
      reactionCount: row.reactions?.length ?? 0, equilibriumAccepted: row.equilibrium?.accepted === true };
  });
  const body = { schema: 'lafea-runtime-solver-diagnostics/v1', executionHash: execution.compiledExecutionHash,
    storageRoute: execution.result.meshEvidence?.globalStiffnessStorage
      ?? (Array.isArray(execution.result.meshEvidence?.globalStiffnessMatrix) ? 'DENSE' : null),
    loadCases: cases, progressPolicy: 'REAL_MILESTONES_ONLY_NO_PERCENTAGE' };
  return freeze({ ...body, semanticHash: hash({ schema: 'lafea-runtime-solver-diagnostics-hash-input/v1', diagnostics: body }) });
}
function assertParents(expected, stage, execution, c) {
  const now = { sourceHash: stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash,
    analysisDomainHash: stage.analysisDomainProjection?.analysisDomainHash,
    analysisGeometryHash: stage.analysisGeometryProjection?.analysisGeometryHash,
    meshHash: stage.analysisMeshCustodyProjection?.meshHash,
    meshProfileHash: stage.retainedAnalysisMeshEvidenceV2?.meshProfileHash ?? stage.retainedAnalysisMeshProfile?.semanticHash,
    solverModelHash: stage.retainedContinuumPreflightEvidence?.solverModelHash };
  for (const key of PARENTS) if (now[key] !== expected[key] || execution[key] !== expected[key]) throw c.storeError(`LAFEA_RUN_TRANSACTION_PARENT_STALE:${key}`);
}
function verify(current, expected, records, c) {
  for (const record of records) if (current?.artifacts?.[record.kind]?.artifactHash !== expected.artifacts[record.kind].artifactHash
    || current?.artifacts?.[record.kind]?.status !== 'CURRENT') throw c.storeError('LAFEA_CONTINUUM_DOMAIN_FIRST_PUBLICATION_DIVERGED');
}
function finite(value) { return Number.isFinite(value) ? value : null; }
function requireContext(c) { if (!c?.source || !c.domainFirstExecution || typeof c.readStageState !== 'function') throw new TypeError('LAFEA_DOMAIN_FIRST_RUN_ACTION_CONTEXT_INVALID'); }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
