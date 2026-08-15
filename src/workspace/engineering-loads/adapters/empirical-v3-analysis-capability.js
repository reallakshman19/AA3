import {
  createSolverResultContract,
  ENGINEERING_LEVEL,
} from '../../../core/solvers/certification/solverResultContract.js';
import { createInputField } from '../../analysis-input-evidence.js';
import { WORKSPACE_ANALYSIS_TARGET_ID } from '../../analysis-context.js';
import {
  executeEmpiricalV3LiveSourceBoundRun,
} from './empirical-v3-live-run-orchestration.js';

export const EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID = 'empirical-v3-source-bound-rom';
export const EMPIRICAL_V3_ANALYSIS_METHOD_ID = 'EMPIRICAL_V3_SOURCE_BOUND_THERMAL_ROM';

let preparedExecution = null;

export function setEmpiricalV3GovernedPreparedExecution(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Prepared V3 governed execution is required.');
  for (const key of ['packageValue', 'currentAuthorization', 'romInput', 'dependency']) {
    if (!value[key] || typeof value[key] !== 'object') throw new TypeError(`Prepared V3 execution ${key} is required.`);
  }
  if (!value.packageValue.runId || !value.authorizationSemanticHash || !value.datasetId) {
    throw new TypeError('Prepared V3 execution identity is incomplete.');
  }
  if (!Number.isInteger(value.workspaceVersion) || value.workspaceVersion < 0) {
    throw new TypeError('Prepared V3 execution workspaceVersion is invalid.');
  }
  preparedExecution = Object.freeze({
    packageValue: value.packageValue,
    currentAuthorization: value.currentAuthorization,
    romInput: value.romInput,
    auditMetadata: value.auditMetadata ?? null,
    dependency: value.dependency,
    authorizationSemanticHash: String(value.authorizationSemanticHash),
    datasetId: String(value.datasetId),
    workspaceVersion: value.workspaceVersion,
  });
  return preparedExecution;
}

export function clearEmpiricalV3GovernedPreparedExecution() {
  preparedExecution = null;
}

export function getEmpiricalV3GovernedPreparedExecution() {
  return preparedExecution;
}

export const empiricalV3AnalysisCapability = createEmpiricalV3AnalysisCapability({
  getPreparedExecution: getEmpiricalV3GovernedPreparedExecution,
});

/**
 * Wraps the already-qualified V3 execution bridge in the repository's governed
 * AnalysisCoordinator capability boundary. This module does not resolve source
 * authority, seal calculation authorization, or solve/recompute mechanics.
 */
export function createEmpiricalV3AnalysisCapability({ getPreparedExecution } = {}) {
  if (typeof getPreparedExecution !== 'function') {
    throw new TypeError('Empirical V3 analysis capability requires getPreparedExecution().');
  }

  return Object.freeze({
    id: EMPIRICAL_V3_ANALYSIS_CAPABILITY_ID,
    label: 'Empirical Calc V3 — source-bound ROM',
    description: 'Runs a current sealed Empirical V3 source-bound ROM request through the governed analysis lifecycle.',
    engineeringLevel: ENGINEERING_LEVEL.QUALIFIED_ANALYTICAL,
    manifest: Object.freeze({
      solverId: 'empirical-v3-authorized-source-bound-rom',
      solverVersion: '1.0.0',
      methodId: EMPIRICAL_V3_ANALYSIS_METHOD_ID,
      methodVersion: '1',
      codeBasis: ['Qualified Empirical Calc V3 analytical flexibility / force-method ROM'],
      assumptions: [
        'Engineering scope and input authority are owned by the current sealed Empirical V3 safety package and exact ROM execution request.',
        'The workspace analysis session is lifecycle/readiness custody only and does not replace branch/component/risk authority.',
      ],
      limitations: [
        'Current browser capability is the qualified straight source-bound thermal ROM path.',
        'Mixed straight/elbow browser execution remains disabled pending separate browser qualification.',
        'Weight, pressure thrust, Bourdon, gap/contact and friction mechanics are outside this capability.',
      ],
    }),

    applicability(context) {
      return context?.targetId === WORKSPACE_ANALYSIS_TARGET_ID
        ? { applicable: true, reason: '' }
        : { applicable: false, reason: 'Empirical Calc V3 is a workspace-scoped coupled analysis, not a single-entity analysis.' };
    },

    evaluate(context) {
      return readinessFor(context, getPreparedExecution());
    },

    inspect(context) {
      const prepared = getPreparedExecution();
      return {
        fields: inspectionFields(prepared),
        readiness: readinessFor(context, prepared),
      };
    },

    execute(context) {
      const prepared = requirePreparedExecution(context, getPreparedExecution());
      let liveResult;
      try {
        liveResult = executeEmpiricalV3LiveSourceBoundRun({
          packageValue: prepared.packageValue,
          currentAuthorization: prepared.currentAuthorization,
          romInput: prepared.romInput,
          auditMetadata: prepared.auditMetadata,
        });
      } catch (error) {
        if (error?.empiricalV3EngineeringEvent) {
          error.details = {
            ...(error.details && typeof error.details === 'object' ? error.details : {}),
            empiricalV3EngineeringEvent: error.empiricalV3EngineeringEvent,
          };
        }
        throw error;
      }

      return createSolverResultContract({
        moduleId: 'empirical-v3-governed-analysis',
        methodId: EMPIRICAL_V3_ANALYSIS_METHOD_ID,
        formulaIds: formulaIds(liveResult.evidence?.formulaTrace),
        unitSystem: Object.freeze({ length: 'm', force: 'N', stress: 'Pa', moment: 'N·m' }),
        engineeringLevel: ENGINEERING_LEVEL.QUALIFIED_ANALYTICAL,
        status: 'CALCULATED',
        input: Object.freeze({
          runId: prepared.packageValue.runId,
          calculationAuthorizationSemanticHash: prepared.authorizationSemanticHash,
          executionRequestSemanticHash: prepared.dependency.semanticHash,
          datasetId: prepared.datasetId,
          workspaceVersion: prepared.workspaceVersion,
        }),
        results: liveResult,
        warnings: [],
        meta: {
          analysisSessionId: context.analysisSession?.sessionId || '',
          analysisTargetId: context.targetId,
          runId: prepared.packageValue.runId,
          calculationAuthorizationSemanticHash: prepared.authorizationSemanticHash,
          executionRequestSemanticHash: prepared.dependency.semanticHash,
        },
        summary: {
          runId: prepared.packageValue.runId,
          evidenceId: liveResult.evidence?.evidenceId || '',
          workflowState: liveResult.nextPackage?.workflow?.state || '',
        },
      });
    },
  });
}

function readinessFor(context, prepared) {
  if (context?.targetId !== WORKSPACE_ANALYSIS_TARGET_ID) {
    return { enabled: false, reason: 'V3 requires the workspace analysis target.', missing: ['workspaceAnalysisTarget'] };
  }
  if (!prepared) {
    return { enabled: false, reason: 'No current sealed Empirical V3 execution request is prepared.', missing: ['preparedExecution'] };
  }
  if (prepared.datasetId !== context.dataset?.datasetId) {
    return { enabled: false, reason: 'Prepared V3 execution belongs to another dataset.', missing: ['currentDataset'] };
  }
  if (prepared.workspaceVersion !== context.version) {
    return { enabled: false, reason: 'Prepared V3 execution is stale against the active workspace version.', missing: ['currentWorkspaceVersion'] };
  }
  if (!prepared.packageValue?.workflow?.canRunCalculation || !prepared.packageValue?.calculationAuthorization) {
    return { enabled: false, reason: 'Prepared V3 package is not CALCULATION_AUTHORIZED.', missing: ['calculationAuthorization'] };
  }
  if (prepared.authorizationSemanticHash !== prepared.packageValue.calculationAuthorization.semanticHash) {
    return { enabled: false, reason: 'Prepared V3 calculation authorization identity is stale.', missing: ['currentCalculationAuthorization'] };
  }
  const authorized = prepared.packageValue.calculationAuthorization.dependencies?.some((row) => (
    row.kind === prepared.dependency?.kind
    && row.ref === prepared.dependency?.ref
    && row.semanticHash === prepared.dependency?.semanticHash
  ));
  if (!authorized) {
    return { enabled: false, reason: 'Prepared V3 execution request is not present in the sealed calculation authorization.', missing: ['authorizedExecutionRequest'] };
  }
  return { enabled: true, reason: '', missing: [] };
}

function requirePreparedExecution(context, prepared) {
  const readiness = readinessFor(context, prepared);
  if (!readiness.enabled) {
    const error = new Error(readiness.reason || 'Empirical V3 governed execution is not ready.');
    error.code = 'EMP_V3_GOVERNED_EXECUTION_NOT_READY';
    error.details = { missing: readiness.missing };
    throw error;
  }
  return prepared;
}

function inspectionFields(prepared) {
  return [
    field('runId', 'V3 run', prepared?.packageValue?.runId, 'empiricalV3.package.runId'),
    field('calculationAuthorization', 'Calculation authorization', prepared?.authorizationSemanticHash, 'empiricalV3.calculationAuthorization.semanticHash'),
    field('executionRequest', 'ROM execution request', prepared?.dependency?.semanticHash, 'empiricalV3.executionRequest.semanticHash'),
    field('datasetId', 'Dataset', prepared?.datasetId, 'workspace.dataset.datasetId'),
    field('workspaceVersion', 'Workspace version', prepared?.workspaceVersion == null ? null : String(prepared.workspaceVersion), 'workspace.version'),
  ];
}

function field(key, label, value, sourcePath) {
  return createInputField({
    key,
    label,
    kind: 'string',
    required: true,
    editable: false,
    value: value ?? null,
    source: value == null || value === '' ? 'missing' : 'source',
    sourcePath,
  });
}

function formulaIds(trace) {
  const ids = (Array.isArray(trace) ? trace : [])
    .map((item) => typeof item === 'string' ? item : item?.formulaId)
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
  return ids.length ? [...new Set(ids)] : [EMPIRICAL_V3_ANALYSIS_METHOD_ID];
}
