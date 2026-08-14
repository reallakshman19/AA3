/** Authoritative domain-first execution action for the canonical workbench orchestrator. */
import { executeLafeaContinuumAuthoritativeWorkbenchRun } from './lafea-continuum-authoritative-workbench-run.js';
import {
  registerLafeaContinuumDomainFirstLifecycleProducerBatch,
} from './lafea-continuum-domain-first-lifecycle-producers.js';
import {
  LAFEA_DOMAIN_FIRST_EXECUTION_STATE_SCHEMA,
} from './lafea-workbench-domain-first-execution-state.js';
import {
  createLafeaWorkbenchRunTransactionState,
} from './lafea-workbench-run-transaction-state.js';
import { projectLafeaRuntimeSolverDiagnostics } from './lafea-runtime-solver-diagnostics.js';

const STAGE_ID = 'LAFEA.3';

export function createLafeaWorkbenchDomainFirstRunActions(context) {
  const c = requireContext(context);
  const transactions = createLafeaWorkbenchRunTransactionState([STAGE_ID]);

  function run(stageId) {
    let transactionId = null;
    let executionHash = null;
    let runtimeDiagnostics = null;
    try {
      const before = c.readStageState(stageId);
      if (before.preparationProjection?.state !== 'CURRENT_PASS'
        || before.preparationProjection?.usableForAuthorization !== true
        || !before.retainedContinuumPreflightEvidence) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_NOT_CURRENT_PASS');
      }
      const preflight = before.retainedContinuumPreflightEvidence;
      const authority = c.source.ensureRunAuthority(
        stageId, 'RUN_CALCULATION/SOURCE_AUTHORITY',
      );
      const transaction = transactions.begin(stageId, preflight);
      transactionId = transaction.transactionId;
      c.domainFirstExecution.retain(stageId, runningExecution(transaction));
      c.clearOrchestratorDiagnostic();
      c.publish();

      const outcome = executeLafeaContinuumAuthoritativeWorkbenchRun(c, stageId);
      executionHash = outcome.execution.compiledExecutionHash ?? null;
      runtimeDiagnostics = projectLafeaRuntimeSolverDiagnostics(outcome.execution);
      if (outcome.compiled.sourceAuthority.sourceHash !== authority.sourceHash) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_SOURCE_AUTHORITY_MISMATCH');
      }
      if (preflight.solverModelHash !== outcome.compiled.solverModel.solverModelHash) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_SOLVER_MODEL_STALE');
      }
      if (outcome.execution.status !== 'QUALIFIED' || !outcome.lifecycleBatch) {
        const code = outcome.execution.diagnostics?.[0]?.code
          ?? 'LAFEA_CONTINUUM_AUTHORITATIVE_CALCULATION_REJECTED';
        throw c.storeError(code);
      }

      transactions.assertCurrent(
        stageId,
        transactionId,
        c.readStageState(stageId),
        outcome.execution,
      );
      c.domainFirstExecution.retain(stageId, freeze({
        ...outcome.execution,
        runTransaction: transaction,
        runtimeSolverDiagnostics: runtimeDiagnostics,
      }));

      const predicted = registerLafeaContinuumDomainFirstLifecycleProducerBatch(
        c.readStageState(stageId).lifecycle,
        outcome.lifecycleBatch,
      );
      for (let index = 0; index < outcome.lifecycleBatch.records.length; index += 1) {
        c.invokeRetained('registerLifecycleArtifact', [
          outcome.lifecycleBatch.records[index],
          outcome.lifecycleBatch.registrations[index].registrationId,
        ]);
        if (c.getRetainedState().status === 'FAILED') {
          throw c.storeError(
            c.getRetainedState().diagnostics?.[0]?.code
              ?? 'LAFEA_CONTINUUM_DOMAIN_FIRST_REGISTRATION_REJECTED',
          );
        }
      }
      verifyPublication(
        c.getRetainedState().stages[stageId]?.lifecycle,
        predicted,
        outcome.lifecycleBatch.records,
        c,
      );
      const receipt = transactions.complete(
        stageId,
        transactionId,
        c.readStageState(stageId),
        outcome.execution,
        runtimeDiagnostics,
      );
      c.domainFirstExecution.retain(stageId, freeze({
        ...outcome.execution,
        runTransaction: transaction,
        runTransactionReceipt: receipt,
        runtimeSolverDiagnostics: runtimeDiagnostics,
      }));
      c.clearOrchestratorDiagnostic();
    } catch (error) {
      if (transactionId) {
        transactions.reject(
          stageId,
          transactionId,
          typeof error?.code === 'string' ? error.code : 'LAFEA_CONTINUUM_AUTHORITATIVE_RUN_REJECTED',
          executionHash,
          runtimeDiagnostics?.semanticHash ?? null,
        );
      }
      c.domainFirstExecution.clear(stageId);
      c.failOrchestrator(error, 'LAFEA_CONTINUUM_AUTHORITATIVE_RUN_REJECTED');
    }
    return c.publish();
  }

  return Object.freeze({ run });
}

function runningExecution(transaction) {
  return freeze({
    schema: LAFEA_DOMAIN_FIRST_EXECUTION_STATE_SCHEMA,
    stageId: transaction.stageId,
    status: 'RUNNING',
    route: transaction.executionRoute,
    sourceHash: transaction.parents.sourceHash,
    analysisDomainHash: transaction.parents.analysisDomainHash,
    analysisGeometryHash: transaction.parents.analysisGeometryHash,
    meshHash: transaction.parents.meshHash,
    meshProfileHash: transaction.parents.meshProfileHash,
    solverModelHash: transaction.parents.solverModelHash,
    compiledExecutionHash: null,
    runTransaction: transaction,
    runtimeSolverDiagnostics: null,
    diagnostics: [],
    releaseQualified: false,
  });
}

function verifyPublication(current, predicted, records, c) {
  for (const record of records) {
    if (current?.artifacts?.[record.kind]?.artifactHash !== predicted.artifacts[record.kind].artifactHash
      || current?.artifacts?.[record.kind]?.status !== 'CURRENT') {
      throw c.storeError('LAFEA_CONTINUUM_DOMAIN_FIRST_PUBLICATION_DIVERGED');
    }
  }
}

function requireContext(value) {
  const functions = [
    'readStageState', 'invokeRetained', 'getRetainedState', 'publish',
    'clearOrchestratorDiagnostic', 'failOrchestrator', 'storeError',
  ];
  if (!value || typeof value !== 'object'
    || functions.some((name) => typeof value[name] !== 'function')
    || !value.source || !value.domainFirstExecution) {
    throw new TypeError('LAFEA_DOMAIN_FIRST_RUN_ACTION_CONTEXT_INVALID');
  }
  return value;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
