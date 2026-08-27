import { deepFreeze, semanticHash } from '../../core/shared-piping-model/index.js';
import { WorkspaceState } from '../workspace-state.js';
import { engineeringModelStore } from '../engineering-model-store.js';
import { masterDataController } from '../master-data-controller.js';
import {
  sealCurrentReadyNonFeaCalculationSnapshot,
} from '../non-fea-common-input-runtime.js';
import {
  createNonFeaGravityMethodAuthority,
} from '../project-data/non-fea-gravity-method-authority.js';
import {
  authorizeCurrentNonFeaEmpiricalRun,
} from './non-fea-empirical-run-authorization-runtime.js';
import {
  auditEmpiricalComponentLoadAuthority,
} from './empirical-component-load-authority.js';
import {
  createCurrentCommonInputExplicitMomentRetention,
  requireCurrentCommonInputExplicitMomentRetention,
} from './current-common-input-explicit-moment-retention.js';
import {
  evaluateGovernedEmpiricalGravityMethodSelection,
} from './empirical-gravity-method-selection.js';
import {
  createCurrentCommonInputEmpiricalMassProjection,
} from './current-common-input-empirical-mass-projection.js';
import {
  calculateCurrentCommonInputEmpiricalSupportLoads,
  requireCurrentCommonInputEmpiricalSupportLoadExecution,
} from './current-common-input-empirical-support-load-execution.js';
import { engineeringSupportLoadStore } from './engineering-support-load-store.js';

export const CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA =
  'current-common-input-empirical-run-runtime/v1';

const FIXED_POLICY = Object.freeze({
  routineProductRun: true,
  runControllerRouted: false,
  legacyExplicitAuthorityConsumed: false,
  legacyPublicationOrHandoffAuthorityAsserted: false,
  methodSelectedBeforeExecution: true,
  postFailureMethodFallbackAllowed: false,
  massRecompositionPerformed: false,
  staticsMechanicsChanged: false,
});

/**
 * Assembles the fully current routine Common Input empirical execution chain.
 * This is a runtime coordinator, not a Run-button router. Every authority and
 * numerical seam already exists independently; this function orders them and
 * records the resulting execution only after all upstream gates pass.
 *
 * Source-explicit component moments are retained before method selection as a
 * separate support/civil demand. That retention can permit V2 vertical-reaction
 * execution, but the retained moment is never distributed into reactions and
 * the raw support-load statics/equilibrium calculation is unchanged.
 *
 * Method selection occurs exactly once before mass projection/statics. A failed
 * selected method is never caught and retried through a lower-fidelity method.
 */
export function executeCurrentCommonInputEmpiricalRun({
  authorizedAt = new Date().toISOString(),
  snapshotProvider = sealCurrentReadyNonFeaCalculationSnapshot,
  authorizationProvider = authorizeCurrentNonFeaEmpiricalRun,
  gravityMethodAuthorityProvider = createNonFeaGravityMethodAuthority,
  componentAuthorityAuditProvider = auditEmpiricalComponentLoadAuthority,
  explicitMomentRetentionProvider = createCurrentCommonInputExplicitMomentRetention,
  methodSelectionProvider = evaluateGovernedEmpiricalGravityMethodSelection,
  massProjectionProvider = createCurrentCommonInputEmpiricalMassProjection,
  supportExecutionProvider = calculateCurrentCommonInputEmpiricalSupportLoads,
  workspaceState = WorkspaceState,
  modelStore = engineeringModelStore,
  masterDataProvider = () => masterDataController.getMasterData(),
  executionStore = engineeringSupportLoadStore,
} = {}) {
  requireDependencies({
    snapshotProvider,
    authorizationProvider,
    gravityMethodAuthorityProvider,
    componentAuthorityAuditProvider,
    explicitMomentRetentionProvider,
    methodSelectionProvider,
    massProjectionProvider,
    supportExecutionProvider,
    workspaceState,
    modelStore,
    masterDataProvider,
    executionStore,
  });

  const snapshot = snapshotProvider();
  const commonInput = requireReadySnapshot(snapshot);
  const context = requireCurrentExecutionContext({ workspaceState, modelStore, masterDataProvider });

  const authorization = authorizationProvider(snapshot, { authorizedAt });
  const decision = requireSemanticReceipt(
    authorization?.decision,
    'routine Run authorization decision',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_AUTHORIZATION_INVALID',
  );
  const methodAuthorization = requireSemanticReceipt(
    authorization?.methodAuthorization,
    'method-currentness authorization receipt',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_AUTHORIZATION_INVALID',
  );

  const gravityMethodAuthority = requireSemanticReceipt(
    gravityMethodAuthorityProvider(commonInput.projectDataProfile),
    'gravity-method authority',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_AUTHORITY_INVALID',
  );
  const componentAuthorityAudit = requireSemanticReceipt(
    componentAuthorityAuditProvider({
      dataset: context.dataset,
      profile: commonInput.projectDataProfile,
      routePartitionModel: context.routePartitionModel,
    }),
    'component-load authority audit',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_COMPONENT_AUTHORITY_AUDIT_INVALID',
  );
  const explicitMomentRetention = requireCurrentCommonInputExplicitMomentRetention(
    explicitMomentRetentionProvider({ componentAuthorityAudit }),
  );
  if (explicitMomentRetention.componentLoadAuthorityAuditSemanticHash
      !== componentAuthorityAudit.semanticHash) {
    fail(
      'Routine Run explicit-moment retention does not bind the current component-load authority audit.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_EXPLICIT_MOMENT_RETENTION_AUDIT_MISMATCH',
      {
        expected: componentAuthorityAudit.semanticHash,
        actual: explicitMomentRetention.componentLoadAuthorityAuditSemanticHash || null,
      },
    );
  }

  const governedSelection = requireSemanticReceipt(
    methodSelectionProvider({
      gravityMethodAuthority,
      dataset: context.dataset,
      profile: commonInput.projectDataProfile,
      routePartitionModel: context.routePartitionModel,
      explicitMomentRetention,
    }),
    'governed gravity-method selection',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_SELECTION_INVALID',
  );
  const selectedMethod = requiredText(
    governedSelection?.selection?.selectedMethod,
    'governedSelection.selection.selectedMethod',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_NOT_SELECTED',
  );
  if (governedSelection?.selection?.explicitMomentRetentionSemanticHash
      !== explicitMomentRetention.semanticHash) {
    fail(
      'Governed method selection did not retain the exact current explicit-moment custody receipt.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_EXPLICIT_MOMENT_SELECTION_BINDING_MISMATCH',
      {
        expected: explicitMomentRetention.semanticHash,
        actual: governedSelection?.selection?.explicitMomentRetentionSemanticHash || null,
      },
    );
  }

  const massProjection = requireSemanticReceipt(
    massProjectionProvider({ snapshot, runAuthorization: decision }),
    'current Common Input mass projection',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_MASS_PROJECTION_INVALID',
  );
  const rawSupportExecution = requireSemanticReceipt(
    supportExecutionProvider({
      snapshot,
      runAuthorization: decision,
      massProjection,
      method: selectedMethod,
      dataset: context.dataset,
      supportSiteModel: context.supportSiteModel,
      routePartitionModel: context.routePartitionModel,
      masterData: context.masterData,
    }),
    'current Common Input support-load execution',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_SUPPORT_EXECUTION_INVALID',
  );
  if (rawSupportExecution.executedMethod !== selectedMethod
      || rawSupportExecution.distribution?.method !== selectedMethod) {
    fail(
      'Current Common Input support execution did not preserve the preselected empirical method.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_EXECUTED_METHOD_MISMATCH',
      {
        selectedMethod,
        executedMethod: rawSupportExecution.executedMethod || null,
        distributionMethod: rawSupportExecution.distribution?.method || null,
      },
    );
  }
  const supportExecution = bindExplicitMomentRetentionToSupportExecution(
    rawSupportExecution,
    explicitMomentRetention,
  );

  const recorded = executionStore.recordCurrentCommonInputExecution(supportExecution);
  if (recorded?.semanticHash !== supportExecution.semanticHash) {
    fail(
      'Current Common Input execution store did not retain the exact support execution receipt.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RECORD_MISMATCH',
      {
        expected: supportExecution.semanticHash,
        actual: recorded?.semanticHash || null,
      },
    );
  }

  const material = {
    schema: CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA,
    commonInputSemanticHash: requireSemanticHash(commonInput.semanticHash, 'commonInput.semanticHash'),
    commonInputSealSemanticHash: requireSemanticHash(
      commonInput.seal?.semanticHash,
      'commonInput.seal.semanticHash',
    ),
    runAuthorizationSemanticHash: decision.semanticHash,
    methodAuthorizationSemanticHash: methodAuthorization.semanticHash,
    gravityMethodAuthoritySemanticHash: gravityMethodAuthority.semanticHash,
    componentAuthorityAuditSemanticHash: componentAuthorityAudit.semanticHash,
    explicitMomentRetentionSemanticHash: explicitMomentRetention.semanticHash,
    governedSelectionSemanticHash: governedSelection.semanticHash,
    massProjectionSemanticHash: massProjection.semanticHash,
    supportExecutionSemanticHash: supportExecution.semanticHash,
    selectedMethod,
    resultStatus: supportExecution.resultStatus,
    distributionSemanticHash: semanticHash(supportExecution.distribution),
    policy: deepFreeze({ ...FIXED_POLICY }),
    explicitMomentRetention,
    supportExecution,
  };
  return requireCurrentCommonInputEmpiricalRunRuntime({
    ...material,
    semanticHash: semanticHash(material),
  });
}

export function requireCurrentCommonInputEmpiricalRunRuntime(value) {
  if (!isRecord(value) || value.schema !== CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA) {
    fail(
      `Expected ${CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA}.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_INVALID',
    );
  }
  const material = { ...value };
  delete material.semanticHash;
  if (value.semanticHash !== semanticHash(material)) {
    fail(
      'Current Common Input empirical Run runtime semantic hash is stale.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_HASH_MISMATCH',
    );
  }
  requireFixedPolicy(value.policy);
  for (const key of [
    'commonInputSemanticHash', 'commonInputSealSemanticHash',
    'runAuthorizationSemanticHash', 'methodAuthorizationSemanticHash',
    'gravityMethodAuthoritySemanticHash', 'componentAuthorityAuditSemanticHash',
    'explicitMomentRetentionSemanticHash', 'governedSelectionSemanticHash',
    'massProjectionSemanticHash', 'supportExecutionSemanticHash',
    'distributionSemanticHash', 'semanticHash',
  ]) requireSemanticHash(value[key], key);
  const selectedMethod = requiredText(
    value.selectedMethod,
    'selectedMethod',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_INVALID',
  );
  const retention = requireCurrentCommonInputExplicitMomentRetention(value.explicitMomentRetention);
  const supportExecution = requireCurrentCommonInputEmpiricalSupportLoadExecution(
    value.supportExecution,
  );
  if (retention.semanticHash !== value.explicitMomentRetentionSemanticHash
      || supportExecution.explicitMomentRetentionSemanticHash !== retention.semanticHash
      || supportExecution.explicitMomentRetention?.semanticHash !== retention.semanticHash
      || supportExecution.resultStatus !== value.resultStatus
      || supportExecution.semanticHash !== value.supportExecutionSemanticHash
      || supportExecution.executedMethod !== selectedMethod
      || supportExecution.distribution?.method !== selectedMethod
      || semanticHash(supportExecution.distribution) !== value.distributionSemanticHash) {
    fail(
      'Current Common Input empirical Run runtime support/moment execution binding is inconsistent.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_SUPPORT_EXECUTION_BINDING_MISMATCH',
    );
  }
  return deepFreeze(value);
}

function bindExplicitMomentRetentionToSupportExecution(value, retentionValue) {
  const execution = requireCurrentCommonInputEmpiricalSupportLoadExecution(value);
  const retention = requireCurrentCommonInputExplicitMomentRetention(retentionValue);
  const baseStatus = requiredResultStatus(execution.distribution?.status);
  const hasRetainedDemand = retention.status === 'RETAINED' && retention.records.length > 0;
  const resultStatus = hasRetainedDemand && baseStatus === 'CALCULATED'
    ? 'CALCULATED_WITH_EXCEPTIONS'
    : baseStatus;
  const material = { ...execution };
  delete material.semanticHash;
  const bound = {
    ...material,
    resultStatus,
    explicitMomentRetentionSemanticHash: retention.semanticHash,
    explicitMomentRetention: retention,
  };
  return requireCurrentCommonInputEmpiricalSupportLoadExecution({
    ...bound,
    semanticHash: semanticHash(bound),
  });
}

function requireCurrentExecutionContext({ workspaceState, modelStore, masterDataProvider }) {
  const workspace = workspaceState.getSnapshot();
  const dataset = workspace?.status === 'ready' ? workspace.dataset : null;
  if (!isRecord(dataset) || !Array.isArray(dataset.entities) || !isRecord(dataset.sharedModel)) {
    fail(
      'Routine Common Input execution requires the current active workspace dataset.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_ACTIVE_DATASET_REQUIRED',
    );
  }
  const supportSiteModel = modelStore.getSupportSiteModel();
  const routePartitionModel = modelStore.getRoutePartitionModel();
  if (!isRecord(supportSiteModel) || !isRecord(routePartitionModel)) {
    fail(
      'Routine Common Input execution requires current support-site and route-partition models.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_ENGINEERING_MODELS_REQUIRED',
    );
  }
  const masterData = masterDataProvider();
  if (!isRecord(masterData)) {
    fail(
      'Routine Common Input execution requires the current master-data context.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_MASTER_DATA_REQUIRED',
    );
  }
  return { dataset, supportSiteModel, routePartitionModel, masterData };
}

function requireReadySnapshot(snapshot) {
  const commonInput = snapshot?.commonInput;
  if (!isRecord(commonInput)
      || snapshot?.staleness?.stale !== false
      || snapshot?.error
      || commonInput.packageState !== 'READY'
      || !Array.isArray(commonInput.sealedMethodIds)
      || commonInput.sealedMethodIds.length === 0
      || !Array.isArray(commonInput.blockedMethodIds)
      || commonInput.blockedMethodIds.length !== 0
      || !isRecord(commonInput.projectDataProfile)
      || !isRecord(commonInput.seal)) {
    fail(
      'Routine empirical execution requires an error-free fully READY current Common Input seal.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_COMMON_INPUT_NOT_READY',
    );
  }
  return commonInput;
}

function requireDependencies(value) {
  for (const key of [
    'snapshotProvider', 'authorizationProvider', 'gravityMethodAuthorityProvider',
    'componentAuthorityAuditProvider', 'explicitMomentRetentionProvider',
    'methodSelectionProvider', 'massProjectionProvider', 'supportExecutionProvider',
    'masterDataProvider',
  ]) {
    if (typeof value[key] !== 'function') {
      fail(
        `Current Common Input empirical Run runtime requires ${key}.`,
        'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_DEPENDENCY_INVALID',
        { key },
      );
    }
  }
  if (!value.workspaceState || typeof value.workspaceState.getSnapshot !== 'function') {
    fail(
      'Current Common Input empirical Run runtime requires workspaceState.getSnapshot().',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_DEPENDENCY_INVALID',
      { key: 'workspaceState' },
    );
  }
  if (!value.modelStore
      || typeof value.modelStore.getSupportSiteModel !== 'function'
      || typeof value.modelStore.getRoutePartitionModel !== 'function') {
    fail(
      'Current Common Input empirical Run runtime requires current engineering-model getters.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_DEPENDENCY_INVALID',
      { key: 'modelStore' },
    );
  }
  if (!value.executionStore
      || typeof value.executionStore.recordCurrentCommonInputExecution !== 'function') {
    fail(
      'Current Common Input empirical Run runtime requires current execution-store custody.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_DEPENDENCY_INVALID',
      { key: 'executionStore' },
    );
  }
}

function requireSemanticReceipt(value, label, code) {
  if (!isRecord(value)) fail(`${label} must be an object.`, code);
  requireSemanticHash(value.semanticHash, `${label}.semanticHash`, code);
  return value;
}

function requireSemanticHash(value, label, code = 'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_INVALID') {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    fail(`${label} must be an FNV-1a semantic hash.`, code);
  }
  return value;
}

function requiredText(value, label, code) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(`${label} must be a non-empty trimmed string.`, code);
  }
  return value;
}

function requiredResultStatus(value) {
  const status = requiredText(
    value,
    'distribution.status',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RESULT_STATUS_INVALID',
  );
  if (!['CALCULATED', 'CALCULATED_WITH_EXCEPTIONS', 'FAILED', 'BLOCKED'].includes(status)) {
    fail(
      `Unsupported current-system result status ${status}.`,
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RESULT_STATUS_INVALID',
    );
  }
  return status;
}

function requireFixedPolicy(value) {
  if (!isRecord(value)
      || JSON.stringify(Object.keys(value).sort(ascii)) !== JSON.stringify(Object.keys(FIXED_POLICY).sort(ascii))
      || Object.entries(FIXED_POLICY).some(([key, expected]) => value[key] !== expected)) {
    fail(
      'Current Common Input empirical Run runtime policy was altered.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_POLICY_INVALID',
    );
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : deepFreeze(structuredClone(details));
  throw error;
}
