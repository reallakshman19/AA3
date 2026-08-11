/**
 * Workspace event topic identifiers.
 *
 * Deliberately dependency-free apart from the two authority contracts whose
 * event names it re-exports. Validators and the dispatcher both import from
 * here, so this module is the root of the event graph and cannot participate
 * in an import cycle.
 */
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
