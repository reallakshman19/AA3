import {
  validateSettingsApplyFailed,
  validateSettingsApplyRequested,
  validateSettingsChanged,
  validateSettingsProposalChanged,
  validateSettingsResetRequested,
  SETTINGS_EVENTS,
} from '../core/settings-authority/index.js';
import {
  validateApplicationViewChanged,
  validateApplicationViewChangeFailed,
  validateApplicationViewChangeRequested,
  validateWorkspaceConsumerContextChanged,
} from '../core/workspace-consumers/event-contracts.js';

export const APPLICATION_EVENTS = Object.freeze({
  CHANGE_REQUESTED: 'applicationView:changeRequested',
  CHANGED: 'applicationView:changed',
  CHANGE_FAILED: 'applicationView:changeFailed',
  CONTEXT_CHANGED: 'workspaceConsumerContext:changed',
});

export { SETTINGS_EVENTS };

export const EVENT_TOPICS = Object.freeze({
  DATASET_LOAD_REQUESTED: 'dataset:loadRequested',
  NATIVE_MODEL_CREATE_REQUESTED: 'nativeModel:createRequested',
  DATASET_CLEAR_REQUESTED: 'dataset:clearRequested',
  DATASET_LOADED: 'dataset:loaded',
  DATASET_LOAD_FAILED: 'dataset:loadFailed',
  DATASET_CLEARED: 'dataset:cleared',
  WORKSPACE_SNAPSHOT_CHANGED: 'workspace:snapshotChanged',
  VIEWPORT_SELECTION_REQUESTED: 'viewport:selectionRequested',
  VIEWPORT_ENTITY_SELECTED: 'viewport:entitySelected',
  TOPOLOGY_EDIT_3D_MODE_CHANGED: 'topologyEdit3d:modeChanged',
  TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED: 'topologyEdit3d:lfeaSourceChanged',
  LFEA_SUPPORT_ACTIONS_PUBLISHED: 'lfea:supportActionsPublished',
  LOAD_CALC_SUBTAB_REQUESTED: 'loadCalc:subtabRequested',
  ANALYSIS_CAPABILITIES_CHANGED: 'analysis:capabilitiesChanged',
  ANALYSIS_SESSION_OPEN_REQUESTED: 'analysis:sessionOpenRequested',
  ANALYSIS_SESSION_OVERRIDE_REQUESTED: 'analysis:sessionOverrideRequested',
  ANALYSIS_SESSION_RESET_REQUESTED: 'analysis:sessionResetRequested',
  ANALYSIS_SESSION_CLOSE_REQUESTED: 'analysis:sessionCloseRequested',
  ANALYSIS_SESSION_CHANGED: 'analysis:sessionChanged',
  ANALYSIS_REQUESTED: 'analysis:requested',
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETED: 'analysis:completed',
  ANALYSIS_FAILED: 'analysis:failed',
  ANALYSIS_LEDGER_CHANGED: 'analysis:ledgerChanged',
  ANALYSIS_LEDGER_ACTIVE_REQUESTED: 'analysis:ledgerActiveRequested',
  ANALYSIS_LEDGER_COMPARISON_REQUESTED: 'analysis:ledgerComparisonRequested',
  ANALYSIS_LEDGER_COMPARISON_RESET_REQUESTED: 'analysis:ledgerComparisonResetRequested',
  ANALYSIS_LEDGER_CLEAR_REQUESTED: 'analysis:ledgerClearRequested',
  ANALYSIS_LEDGER_FAILED: 'analysis:ledgerFailed',
  ANALYSIS_EXPORT_REQUESTED: 'analysis:exportRequested',
  ANALYSIS_EXPORT_COMPLETED: 'analysis:exportCompleted',
  ANALYSIS_EXPORT_FAILED: 'analysis:exportFailed',
  ...APPLICATION_EVENTS,
  ...SETTINGS_EVENTS,
});

export function assertEventPayload(topic, payload) {
  PAYLOAD_VALIDATORS.get(topic)?.(payload);
}

const PAYLOAD_VALIDATORS = new Map([
  [EVENT_TOPICS.DATASET_LOAD_REQUESTED, validateDatasetLoadRequested],
  [EVENT_TOPICS.NATIVE_MODEL_CREATE_REQUESTED, validateNativeModelCreateRequested],
  [EVENT_TOPICS.DATASET_CLEAR_REQUESTED, validateOptionalEmptyPayload],
  [EVENT_TOPICS.DATASET_LOADED, validateDatasetLoaded],
  [EVENT_TOPICS.DATASET_LOAD_FAILED, validateDatasetLoadFailed],
  [EVENT_TOPICS.DATASET_CLEARED, validateDatasetCleared],
  [EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, validateSnapshotChanged],
  [EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, validateSelectionRequested],
  [EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED, validateEntitySelected],
  [EVENT_TOPICS.TOPOLOGY_EDIT_3D_MODE_CHANGED, validateTopologyEdit3dModeChanged],
  [EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED, validateTopologyEditLfeaSourceChanged],
  [EVENT_TOPICS.LFEA_SUPPORT_ACTIONS_PUBLISHED, validateLfeaSupportActionsPublished],
  [EVENT_TOPICS.LOAD_CALC_SUBTAB_REQUESTED, validateLoadCalcSubtabRequested],
  [EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED, validateCapabilitiesChanged],
  [EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED, validateSessionOpenRequested],
  [EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED, validateSessionOverrideRequested],
  [EVENT_TOPICS.ANALYSIS_SESSION_RESET_REQUESTED, validateSessionIdentity],
  [EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_SESSION_CHANGED, validateSessionChanged],
  [EVENT_TOPICS.ANALYSIS_REQUESTED, validateAnalysisRequested],
  [EVENT_TOPICS.ANALYSIS_STARTED, validateAnalysisLifecycle],
  [EVENT_TOPICS.ANALYSIS_COMPLETED, validateAnalysisCompleted],
  [EVENT_TOPICS.ANALYSIS_FAILED, validateAnalysisFailed],
  [EVENT_TOPICS.ANALYSIS_LEDGER_CHANGED, validateLedgerChanged],
  [EVENT_TOPICS.ANALYSIS_LEDGER_ACTIVE_REQUESTED, validateLedgerEntryRequest],
  [EVENT_TOPICS.ANALYSIS_LEDGER_COMPARISON_REQUESTED, validateComparisonRequest],
  [EVENT_TOPICS.ANALYSIS_LEDGER_COMPARISON_RESET_REQUESTED, validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_LEDGER_CLEAR_REQUESTED, validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_LEDGER_FAILED, validateFailure],
  [EVENT_TOPICS.ANALYSIS_EXPORT_REQUESTED, validateExportRequested],
  [EVENT_TOPICS.ANALYSIS_EXPORT_COMPLETED, validateExportCompleted],
  [EVENT_TOPICS.ANALYSIS_EXPORT_FAILED, validateFailure],
  [APPLICATION_EVENTS.CHANGE_REQUESTED, validateApplicationViewChangeRequested],
  [APPLICATION_EVENTS.CHANGED, validateApplicationViewChanged],
  [APPLICATION_EVENTS.CHANGE_FAILED, validateApplicationViewChangeFailed],
  [APPLICATION_EVENTS.CONTEXT_CHANGED, validateWorkspaceConsumerContextChanged],
  [SETTINGS_EVENTS.PROPOSAL_CHANGED, validateSettingsProposalChanged],
  [SETTINGS_EVENTS.APPLY_REQUESTED, validateSettingsApplyRequested],
  [SETTINGS_EVENTS.CHANGED, validateSettingsChanged],
  [SETTINGS_EVENTS.APPLY_FAILED, validateSettingsApplyFailed],
  [SETTINGS_EVENTS.RESET_REQUESTED, validateSettingsResetRequested],
]);

const SELECTION_SOURCES = new Set([
  'tree', 'viewport', 'api', 'sequential-sketcher', 'table', 'sketcher',
  'topology-table', 'load-table', 'topology-edit-3d',
]);
const EXPORT_FORMATS = new Set(['json', 'csv', 'markdown']);
const SUPPORT_ACTION_TRIAD_STATUSES = new Set(['RESOLVED', 'BLOCKED_AXIS_DEGENERATE']);

function validateDatasetLoadRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOAD_REQUESTED);
  if (!(isRecord(payload.rawPackage) || Array.isArray(payload.rawPackage))) {
    throw new TypeError('dataset:loadRequested payload.rawPackage must be an object or array.');
  }
  if (payload.sourceName !== undefined && typeof payload.sourceName !== 'string') {
    throw new TypeError('dataset:loadRequested payload.sourceName must be a string.');
  }
  if (payload.sourceBytes !== undefined && payload.sourceBytes !== null
    && !(payload.sourceBytes instanceof Uint8Array)) {
    throw new TypeError('dataset:loadRequested payload.sourceBytes must be Uint8Array.');
  }
  if (payload.sourceSha256 !== undefined && payload.sourceSha256 !== ''
    && !/^[a-f0-9]{64}$/iu.test(payload.sourceSha256)) {
    throw new TypeError('dataset:loadRequested payload.sourceSha256 must be SHA-256.');
  }
}

function validateNativeModelCreateRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.NATIVE_MODEL_CREATE_REQUESTED);
  assertNonEmptyString(payload.modelKey, 'modelKey', EVENT_TOPICS.NATIVE_MODEL_CREATE_REQUESTED);
  assertNonEmptyString(payload.documentId, 'documentId', EVENT_TOPICS.NATIVE_MODEL_CREATE_REQUESTED);
  assertNonEmptyString(payload.revision, 'revision', EVENT_TOPICS.NATIVE_MODEL_CREATE_REQUESTED);
}

function validateOptionalEmptyPayload(payload) {
  if (payload !== undefined && !isRecord(payload)) {
    throw new TypeError('Event payload must be omitted or an object.');
  }
}

function validateDatasetLoaded(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOADED);
  assertNonEmptyString(payload.datasetId, 'datasetId', EVENT_TOPICS.DATASET_LOADED);
  assertNonNegativeInteger(payload.nodeCount, 'nodeCount', EVENT_TOPICS.DATASET_LOADED);
}

function validateDatasetLoadFailed(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOAD_FAILED);
  assertNonEmptyString(payload.message, 'message', EVENT_TOPICS.DATASET_LOAD_FAILED);
  if (payload.sourceName !== undefined && typeof payload.sourceName !== 'string') {
    throw new TypeError('dataset:loadFailed payload.sourceName must be a string.');
  }
}

function validateDatasetCleared(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_CLEARED);
  assertNonNegativeInteger(payload.version, 'version', EVENT_TOPICS.DATASET_CLEARED);
}

function validateSnapshotChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED);
  if (!isRecord(payload.snapshot)) {
    throw new TypeError('workspace:snapshotChanged payload.snapshot must be an object.');
  }
}

function validateSelectionRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED);
  assertNonEmptyString(payload.entityId, 'entityId', EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED);
  validateSelectionSource(payload.source, EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED);
}

function validateEntitySelected(payload) {
  assertRecord(payload, EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
  assertNonEmptyString(payload.entityId, 'entityId', EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
  if (payload.type !== undefined && !['pipe', 'support'].includes(payload.type)) {
    throw new TypeError("viewport:entitySelected payload.type must be 'pipe' or 'support'.");
  }
  if (payload.properties !== undefined && !isRecord(payload.properties)) {
    throw new TypeError('viewport:entitySelected payload.properties must be an object.');
  }
  if (payload.source !== undefined) validateSelectionSource(payload.source, EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
}

function validateTopologyEdit3dModeChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.TOPOLOGY_EDIT_3D_MODE_CHANGED);
  if (typeof payload.active !== 'boolean') {
    throw new TypeError('topologyEdit3d:modeChanged payload.active must be a boolean.');
  }
}

function validateTopologyEditLfeaSourceChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED);
  assertNonEmptyString(payload.sourceSemanticHash, 'sourceSemanticHash', EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED);
  assertNonNegativeInteger(payload.modelVersion, 'modelVersion', EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED);
}

function validateLfeaSupportActionsPublished(payload) {
  const topic = EVENT_TOPICS.LFEA_SUPPORT_ACTIONS_PUBLISHED;
  assertRecord(payload, topic);
  if (payload.schema !== 'lfea-support-actions-published/v1') {
    throw new TypeError(`${topic} payload.schema must be lfea-support-actions-published/v1.`);
  }
  assertNonEmptyString(payload.sourceSemanticHash, 'sourceSemanticHash', topic);
  assertNonNegativeInteger(payload.modelVersion, 'modelVersion', topic);
  assertNonEmptyString(payload.analysisResultSemanticHash, 'analysisResultSemanticHash', topic);
  assertNonEmptyString(payload.executionHash, 'executionHash', topic);
  assertNonEmptyString(payload.loadCaseId, 'loadCaseId', topic);
  assertNonEmptyString(payload.physicalLoadCaseHash, 'physicalLoadCaseHash', topic);
  if (!isRecord(payload.units)) throw new TypeError(`${topic} payload.units must be an object.`);
  assertNonEmptyString(payload.units.force, 'units.force', topic);
  if (!Array.isArray(payload.actions)) throw new TypeError(`${topic} payload.actions must be an array.`);
  const entityIds = new Set();
  payload.actions.forEach((action, index) => {
    const label = `${topic} payload.actions[${index}]`;
    assertRecord(action, label);
    assertNonEmptyString(action.entityId, 'entityId', label);
    if (entityIds.has(action.entityId)) throw new TypeError(`${label} duplicates entityId ${action.entityId}.`);
    entityIds.add(action.entityId);
    assertNonEmptyString(action.nodeId, 'nodeId', label);
    assertNonEmptyString(action.interfaceId, 'interfaceId', label);
    assertNonEmptyString(action.loadCaseId, 'loadCaseId', label);
    if (action.loadCaseId !== payload.loadCaseId) {
      throw new TypeError(`${label}.loadCaseId must match the publication load case.`);
    }
    assertNonEmptyString(action.triadSemanticHash, 'triadSemanticHash', label);
    assertNonEmptyString(action.recoverySemanticHash, 'recoverySemanticHash', label);
    if (!SUPPORT_ACTION_TRIAD_STATUSES.has(action.triadStatus)) {
      throw new TypeError(`${label}.triadStatus is invalid.`);
    }
    assertFiniteNumber(action.fAxial, 'fAxial', label);
    if (action.triadStatus === 'RESOLVED') {
      if (action.triadReason !== null) throw new TypeError(`${label}.triadReason must be null when resolved.`);
      assertFiniteNumber(action.fLateral, 'fLateral', label);
      assertFiniteNumber(action.fVertical, 'fVertical', label);
    } else {
      if (action.triadReason !== 'AXIAL_PARALLEL_TO_VERTICAL') {
        throw new TypeError(`${label}.triadReason must identify the axial/vertical degeneracy.`);
      }
      if (action.fLateral !== null || action.fVertical !== null) {
        throw new TypeError(`${label} blocked transverse actions must be null.`);
      }
    }
  });
}

function validateLoadCalcSubtabRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.LOAD_CALC_SUBTAB_REQUESTED);
  assertNonEmptyString(payload.tab, 'tab', EVENT_TOPICS.LOAD_CALC_SUBTAB_REQUESTED);
}

function validateCapabilitiesChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
  if (typeof payload.targetId !== 'string') throw new TypeError('analysis:capabilitiesChanged targetId must be a string.');
  if (!Array.isArray(payload.capabilities)) throw new TypeError('analysis:capabilitiesChanged capabilities must be an array.');
  payload.capabilities.forEach((capability) => {
    assertRecord(capability, EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
    assertNonEmptyString(capability.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
    assertNonEmptyString(capability.label, 'label', EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
    if (typeof capability.enabled !== 'boolean') throw new TypeError('Analysis capability enabled must be boolean.');
  });
}

function validateSessionOpenRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED);
  assertNonEmptyString(payload.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED);
  assertNonEmptyString(payload.targetId, 'targetId', EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED);
}

function validateSessionOverrideRequested(payload) {
  validateSessionIdentity(payload);
  assertNonEmptyString(payload.fieldKey, 'fieldKey', EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED);
  if (!['string', 'number'].includes(typeof payload.value) && payload.value !== null) {
    throw new TypeError('analysis:sessionOverrideRequested value must be string, number, or null.');
  }
}

function validateSessionIdentity(payload) {
  assertRecord(payload, 'analysis session event');
  assertNonEmptyString(payload.sessionId, 'sessionId', 'analysis session event');
}

function validateSessionChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
  assertNonNegativeInteger(payload.version, 'version', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
  if (payload.session !== null && !isRecord(payload.session)) {
    throw new TypeError('analysis:sessionChanged session is invalid.');
  }
  if (payload.session) {
    assertNonEmptyString(payload.session.sessionId, 'session.sessionId', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
    assertNonEmptyString(payload.session.analysisType, 'session.analysisType', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
    assertNonEmptyString(payload.session.targetId, 'session.targetId', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
  }
}

function validateAnalysisRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.targetId, 'targetId', EVENT_TOPICS.ANALYSIS_REQUESTED);
  validateOptionalSessionId(payload, EVENT_TOPICS.ANALYSIS_REQUESTED);
}

function validateAnalysisLifecycle(payload) {
  assertRecord(payload, 'analysis lifecycle');
  assertNonEmptyString(payload.requestId, 'requestId', 'analysis lifecycle');
  assertNonEmptyString(payload.analysisType, 'analysisType', 'analysis lifecycle');
  assertNonEmptyString(payload.targetId, 'targetId', 'analysis lifecycle');
  validateOptionalSessionId(payload, 'analysis lifecycle');
}

function validateAnalysisCompleted(payload) {
  validateAnalysisLifecycle(payload);
  if (!isRecord(payload.result)) throw new TypeError('analysis:completed result must be an object.');
}

function validateAnalysisFailed(payload) {
  validateAnalysisLifecycle(payload);
  assertNonEmptyString(payload.code, 'code', EVENT_TOPICS.ANALYSIS_FAILED);
  assertNonEmptyString(payload.message, 'message', EVENT_TOPICS.ANALYSIS_FAILED);
  if (payload.details !== undefined && !isRecord(payload.details)) {
    throw new TypeError('analysis:failed details must be an object.');
  }
}

function validateLedgerChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_LEDGER_CHANGED);
  if (!isRecord(payload.ledger) || payload.ledger.schema !== 'analysis-ledger/v1') {
    throw new TypeError('analysis:ledgerChanged requires analysis-ledger/v1.');
  }
  if (!Array.isArray(payload.ledger.entries)) throw new TypeError('Analysis ledger entries must be an array.');
}

function validateLedgerEntryRequest(payload) {
  assertRecord(payload, 'analysis ledger request');
  assertNonEmptyString(payload.entryId, 'entryId', 'analysis ledger request');
}

function validateComparisonRequest(payload) {
  validateLedgerEntryRequest(payload);
  if (!['left', 'right'].includes(payload.side)) {
    throw new TypeError("analysis:ledgerComparisonRequested side must be 'left' or 'right'.");
  }
}

function validateFailure(payload) {
  assertRecord(payload, 'analysis failure event');
  assertNonEmptyString(payload.code, 'code', 'analysis failure event');
  assertNonEmptyString(payload.message, 'message', 'analysis failure event');
}

function validateExportRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_EXPORT_REQUESTED);
  if (!EXPORT_FORMATS.has(payload.format)) throw new TypeError('analysis:exportRequested format is invalid.');
}

function validateExportCompleted(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_EXPORT_COMPLETED);
  if (!isRecord(payload.artifact) || payload.artifact.schema !== 'analysis-export-artifact/v1') {
    throw new TypeError('analysis:exportCompleted artifact is invalid.');
  }
}

function validateOptionalSessionId(payload, topic) {
  if (payload.sessionId !== undefined && payload.sessionId !== '') {
    assertNonEmptyString(payload.sessionId, 'sessionId', topic);
  }
}

function validateSelectionSource(value, topic) {
  if (!SELECTION_SOURCES.has(value)) {
    throw new TypeError(`${topic} source must be tree, viewport, or api.`);
  }
}

function assertRecord(value, topic) {
  if (!isRecord(value)) throw new TypeError(`${topic} payload must be an object.`);
}

function assertNonEmptyString(value, field, topic) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${topic} payload.${field} must be a non-empty string.`);
  }
}

function assertNonNegativeInteger(value, field, topic) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${topic} payload.${field} must be a non-negative integer.`);
  }
}

function assertFiniteNumber(value, field, topic) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${topic} payload.${field} must be a finite number.`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
