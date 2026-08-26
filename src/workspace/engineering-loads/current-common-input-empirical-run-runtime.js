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
  evaluateGovernedEmpiricalGravityMethodSelection,
} from './empirical-gravity-method-selection.js';
import {
  createCurrentCommonInputEmpiricalMassProjection,
} from './current-common-input-empirical-mass-projection.js';
import {
  calculateCurrentCommonInputEmpiricalSupportLoads,
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
 * records the resulting #1475 execution only after all upstream gates pass.
 *
 * Method selection occurs exactly once before mass projection/statics. A failed
 * selected method is never caught and retried through a lower-fidelity method.
 */
export function executeCurrentCommonInputEmpiricalRun({
  authorizedAt = new Date().toISOString(),
  snapshotProvider = sealCurrentReadyNonFeaCalculationSnapshot,
  authorizationProvider = authorizeCurrentNonFeaEmpiricalRun,
  gravityMethodAuthorityProvider = createNonFeaGravityMethodAuthority,
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
  const governedSelection = requireSemanticReceipt(
    methodSelectionProvider({
      gravityMethodAuthority,
      dataset: context.dataset,
      profile: commonInput.projectDataProfile,
      routePartitionModel: context.routePartitionModel,
    }),
    'governed gravity-method selection',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_SELECTION_INVALID',
  );
  const selectedMethod = requiredText(
    governedSelection?.selection?.selectedMethod,
    'governedSelection.selection.selectedMethod',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_NOT_SELECTED',
  );

  const massProjection = requireSemanticReceipt(
    massProjectionProvider({ snapshot, runAuthorization: decision }),
    'current Common Input mass projection',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_MASS_PROJECTION_INVALID',
  );
  const supportExecution = requireSemanticReceipt(
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
  if (supportExecution.executedMethod !== selectedMethod
      || supportExecution.distribution?.method !== selectedMethod) {
    fail(
      'Current Common Input support execution did not preserve the preselected empirical method.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_EXECUTED_METHOD_MISMATCH',
      {
        selectedMethod,
        executedMethod: supportExecution.executedMethod || null,
        distributionMethod: supportExecution.distribution?.method || null,
      },
    );
  }

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
    governedSelectionSemanticHash: governedSelection.semanticHash,
    massProjectionSemanticHash: massProjection.semanticHash,
    supportExecutionSemanticHash: supportExecution.semanticHash,
    selectedMethod,
    distributionSemanticHash: semanticHash(supportExecution.distribution),
    policy: deepFreeze({ ...FIXED_POLICY }),
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
    'gravityMethodAuthoritySemanticHash', 'governedSelectionSemanticHash',
    'massProjectionSemanticHash', 'supportExecutionSemanticHash',
    'distributionSemanticHash', 'semanticHash',
  ]) requireSemanticHash(value[key], key);
  const selectedMethod = requiredText(
    value.selectedMethod,
    'selectedMethod',
    'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_INVALID',
  );
  if (!isRecord(value.supportExecution)
      || value.supportExecution.semanticHash !== value.supportExecutionSemanticHash
      || value.supportExecution.executedMethod !== selectedMethod
      || value.supportExecution.distribution?.method !== selectedMethod
      || semanticHash(value.supportExecution.distribution) !== value.distributionSemanticHash) {
    fail(
      'Current Common Input empirical Run runtime support-execution binding is inconsistent.',
      'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_SUPPORT_EXECUTION_BINDING_MISMATCH',
    );
  }
  return deepFreeze(value);
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
