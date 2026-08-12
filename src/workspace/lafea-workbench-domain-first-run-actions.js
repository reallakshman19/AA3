/** Authoritative domain-first execution action for the canonical workbench orchestrator. */
import { executeLafeaContinuumAuthoritativeWorkbenchRun } from './lafea-continuum-authoritative-workbench-run.js';
import {
  registerLafeaContinuumDomainFirstLifecycleProducerBatch,
} from './lafea-continuum-domain-first-lifecycle-producers.js';

export function createLafeaWorkbenchDomainFirstRunActions(context) {
  const c = requireContext(context);

  function run(stageId) {
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
      const outcome = executeLafeaContinuumAuthoritativeWorkbenchRun(c, stageId);
      if (outcome.compiled.sourceAuthority.sourceHash !== authority.sourceHash) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_SOURCE_AUTHORITY_MISMATCH');
      }
      if (preflight.solverModelHash !== outcome.compiled.solverModel.solverModelHash) {
        throw c.storeError('LAFEA_CONTINUUM_AUTHORITATIVE_PREFLIGHT_SOLVER_MODEL_STALE');
      }
      c.domainFirstExecution.retain(stageId, outcome.execution);
      if (outcome.execution.status !== 'QUALIFIED' || !outcome.lifecycleBatch) {
        const code = outcome.execution.diagnostics?.[0]?.code
          ?? 'LAFEA_CONTINUUM_AUTHORITATIVE_CALCULATION_REJECTED';
        throw c.storeError(code);
      }

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
      c.clearOrchestratorDiagnostic();
    } catch (error) {
      c.domainFirstExecution.clear(stageId);
      c.failOrchestrator(error, 'LAFEA_CONTINUUM_AUTHORITATIVE_RUN_REJECTED');
    }
    return c.publish();
  }

  return Object.freeze({ run });
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
