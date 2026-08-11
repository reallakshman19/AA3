/**
 * Workspace event bus payload dispatch.
 *
 * Split from a single 406 line module into topic ids, assertion primitives,
 * validators and this dispatcher, each inside the 300 physical line budget.
 * The public surface is unchanged: EVENT_TOPICS, APPLICATION_EVENTS,
 * SETTINGS_EVENTS and assertEventPayload are all still exported from here.
 */
import {
  validateSettingsApplyFailed,
  validateSettingsApplyRequested,
  validateSettingsChanged,
  validateSettingsProposalChanged,
  validateSettingsResetRequested,
} from '../core/settings-authority/index.js';
import {
  validateApplicationViewChanged,
  validateApplicationViewChangeFailed,
  validateApplicationViewChangeRequested,
  validateWorkspaceConsumerContextChanged,
} from '../core/workspace-consumers/event-contracts.js';
import { APPLICATION_EVENTS, EVENT_TOPICS, SETTINGS_EVENTS } from './event-topic-ids.js';
import * as validators from './event-payload-validators.js';

export { APPLICATION_EVENTS, EVENT_TOPICS, SETTINGS_EVENTS };

export function assertEventPayload(topic, payload) {
  PAYLOAD_VALIDATORS.get(topic)?.(payload);
}

const PAYLOAD_VALIDATORS = new Map([
  [EVENT_TOPICS.DATASET_LOAD_REQUESTED, validators.validateDatasetLoadRequested],
  [EVENT_TOPICS.NATIVE_MODEL_CREATE_REQUESTED, validators.validateNativeModelCreateRequested],
  [EVENT_TOPICS.DATASET_CLEAR_REQUESTED, validators.validateOptionalEmptyPayload],
  [EVENT_TOPICS.DATASET_LOADED, validators.validateDatasetLoaded],
  [EVENT_TOPICS.DATASET_LOAD_FAILED, validators.validateDatasetLoadFailed],
  [EVENT_TOPICS.DATASET_CLEARED, validators.validateDatasetCleared],
  [EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, validators.validateSnapshotChanged],
  [EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, validators.validateSelectionRequested],
  [EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED, validators.validateEntitySelected],
  [EVENT_TOPICS.TOPOLOGY_EDIT_3D_MODE_CHANGED, validators.validateTopologyEdit3dModeChanged],
  [EVENT_TOPICS.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED, validators.validateTopologyEditLfeaSourceChanged],
  [EVENT_TOPICS.LFEA_SUPPORT_ACTIONS_PUBLISHED, validators.validateLfeaSupportActionsPublished],
  [EVENT_TOPICS.LOAD_CALC_SUBTAB_REQUESTED, validators.validateLoadCalcSubtabRequested],
  [EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED, validators.validateCapabilitiesChanged],
  [EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED, validators.validateSessionOpenRequested],
  [EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED, validators.validateSessionOverrideRequested],
  [EVENT_TOPICS.ANALYSIS_SESSION_RESET_REQUESTED, validators.validateSessionIdentity],
  [EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, validators.validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_SESSION_CHANGED, validators.validateSessionChanged],
  [EVENT_TOPICS.ANALYSIS_REQUESTED, validators.validateAnalysisRequested],
  [EVENT_TOPICS.ANALYSIS_STARTED, validators.validateAnalysisLifecycle],
  [EVENT_TOPICS.ANALYSIS_COMPLETED, validators.validateAnalysisCompleted],
  [EVENT_TOPICS.ANALYSIS_FAILED, validators.validateAnalysisFailed],
  [EVENT_TOPICS.ANALYSIS_LEDGER_CHANGED, validators.validateLedgerChanged],
  [EVENT_TOPICS.ANALYSIS_LEDGER_ACTIVE_REQUESTED, validators.validateLedgerEntryRequest],
  [EVENT_TOPICS.ANALYSIS_LEDGER_COMPARISON_REQUESTED, validators.validateComparisonRequest],
  [EVENT_TOPICS.ANALYSIS_LEDGER_COMPARISON_RESET_REQUESTED, validators.validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_LEDGER_CLEAR_REQUESTED, validators.validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_LEDGER_FAILED, validators.validateFailure],
  [EVENT_TOPICS.ANALYSIS_EXPORT_REQUESTED, validators.validateExportRequested],
  [EVENT_TOPICS.ANALYSIS_EXPORT_COMPLETED, validators.validateExportCompleted],
  [EVENT_TOPICS.ANALYSIS_EXPORT_FAILED, validators.validateFailure],
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
