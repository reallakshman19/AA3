import { EVENT_TOPICS } from './event-topics.js';
import { engineeringModelStore } from './engineering-model-store.js';
import { nonFeaCommonInputStore } from './non-fea-common-input-store.js';
import { projectDataStore } from './project-data/project-data-store.js';
import { authorizedEnrichmentConsumerController } from './enrichment/authorized-enrichment-runtime.js';

export const ENGINEERING_MODEL_EVENTS = Object.freeze({
  CALCULATE_REQUESTED: 'engineering-support-loads:calculate-requested',
  CHANGED: 'engineering-support-loads:changed',
  FAILED: 'engineering-support-loads:failed',
});

const PROJECT_DATA_TOPOLOGY_MODEL_PATHS = Object.freeze([
  'topology.supportSiteGroupingToleranceMm',
  'topology.portMatchToleranceMm',
  'topology.autoCarrierCoincidenceToleranceMm',
  'topology.routeJoiningRules',
]);

/** Rebuilds derived contracts and runs loads only on an explicit request. */
export class EngineeringModelController {
  constructor(eventBus, workspaceState, candidateController = authorizedEnrichmentConsumerController) {
    const isAuthorizedConsumer = candidateController
      && typeof candidateController.executeEmpirical === 'function'
      && typeof candidateController.refreshEmpirical === 'function';
    const isLegacyMasterDataDependency = candidateController
      && typeof candidateController.getMasterData === 'function';
    const authorizedConsumerController = isAuthorizedConsumer
      ? candidateController
      : isLegacyMasterDataDependency ? authorizedEnrichmentConsumerController : candidateController;
    if (!authorizedConsumerController
        || typeof authorizedConsumerController.executeEmpirical !== 'function'
        || typeof authorizedConsumerController.refreshEmpirical !== 'function') {
      const error = new TypeError('Engineering model controller requires the authorized empirical consumer.');
      error.code = 'EMPIRICAL_RUNTIME_AUTHORIZED_CONSUMER_REQUIRED';
      throw error;
    }
    this.eventBus = eventBus;
    this.workspaceState = workspaceState;
    this.authorizedConsumerController = authorizedConsumerController;
    this.unsubscribers = [];
    this.datasetId = '';
    this.datasetVersion = null;
    this.lastRebuiltDataset = null;
    this.projectTopologyModelBasis = null;
  }

  init() {
    if (this.unsubscribers.length) return;
    this.projectTopologyModelBasis = projectDataTopologyModelBasis(projectDataStore.getProfile());
    this.unsubscribers = [
      this.eventBus.subscribe(EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, ({ snapshot }) => this.handleSnapshot(snapshot)),
      this.eventBus.subscribe(ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED, () => this.calculate()),
      this.eventBus.subscribe('MASTER_DATA_UPDATED', (event) => this.handleMasterDataChanged(event)),
      this.eventBus.subscribe('MASTER_DATA_CLEARED', (event) => this.handleMasterDataChanged(event)),
      projectDataStore.subscribe((event) => this.handleProjectDataChanged(event)),
    ];
  }

  handleSnapshot(snapshot) {
    const dataset = snapshot?.status === 'ready' ? snapshot.dataset : null;
    if (!dataset) {
      engineeringModelStore.deactivate('NO_ACTIVE_DATASET');
      nonFeaCommonInputStore.markStale('NO_ACTIVE_DATASET', 'sourceDatasetSha256', 'The active dataset was cleared.');
      this.datasetId = '';
      this.datasetVersion = null;
      this.lastRebuiltDataset = null;
      return;
    }
    const distribution = engineeringModelStore.getDistribution();
    let refreshRequired = false;
    if (distribution && distribution.datasetId !== dataset.datasetId) {
      engineeringModelStore.markEmpiricalStale('DATASET_REPLACED', dataset.version || null);
      nonFeaCommonInputStore.markStale('DATASET_REPLACED', 'sourceDatasetSha256', 'A different dataset is active.');
      refreshRequired = true;
    } else if (distribution && distribution.datasetVersion !== (dataset.version || null)) {
      engineeringModelStore.markEmpiricalStale('DATASET_EDITED', dataset.version || null);
      nonFeaCommonInputStore.markStale('DATASET_EDITED', 'sourceModelSemanticHash', 'The active dataset changed after sealing.');
      refreshRequired = true;
    }
    this.datasetId = dataset.datasetId;
    this.datasetVersion = dataset.version || null;
    if (dataset !== this.lastRebuiltDataset) {
      const previousDataset = this.lastRebuiltDataset;
      this.lastRebuiltDataset = dataset;
      try {
        engineeringModelStore.rebuild(dataset);
      } catch (error) {
        this.blockDerivedModels(error, dataset);
        return;
      }
      if (previousDataset !== null) {
        nonFeaCommonInputStore.markStale('DATASET_REBUILT', 'sourceModelSemanticHash', 'The governed dataset models were rebuilt.');
      }
      refreshRequired = true;
    }
    if (refreshRequired) this.authorizedConsumerController.refreshEmpirical();
  }

  blockDerivedModels(error, dataset) {
    engineeringModelStore.deactivate('ENGINEERING_MODELS_NOT_READY');
    nonFeaCommonInputStore.markStale(
      'ENGINEERING_MODELS_NOT_READY',
      'sourceModelSemanticHash',
      'Derived support-site or route evidence is not ready for the active dataset.',
    );
    this.authorizedConsumerController.refreshEmpirical();
    this.eventBus.publish(ENGINEERING_MODEL_EVENTS.FAILED, {
      message: error instanceof Error ? error.message : String(error),
      code: error?.code || 'ENGINEERING_MODEL_REBUILD_BLOCKED',
      datasetId: dataset?.datasetId || null,
    });
  }

  handleProjectDataChanged(event = null) {
    const dataset = this.workspaceState.getSnapshot()?.dataset || null;
    const profile = event?.profile || projectDataStore.getProfile();
    const nextTopologyModelBasis = projectDataTopologyModelBasis(profile);
    const topologyModelChanged = this.projectTopologyModelBasis === null
      || this.projectTopologyModelBasis !== nextTopologyModelBasis;
    this.projectTopologyModelBasis = nextTopologyModelBasis;

    engineeringModelStore.markEmpiricalStale('PROJECT_DATA_CHANGED', dataset?.version || null);
    nonFeaCommonInputStore.markStale('PROJECT_DATA_CHANGED', 'projectDataProfileSemanticHash', 'Project Data changed after sealing.');
    if (topologyModelChanged && dataset) {
      try {
        engineeringModelStore.rebuild(dataset);
      } catch (error) {
        this.blockDerivedModels(error, dataset);
        return;
      }
    }
    this.authorizedConsumerController.refreshEmpirical();
    this.eventBus.publish(ENGINEERING_MODEL_EVENTS.CHANGED, {
      reason: 'project-data-changed',
      topologyModelRebuilt: Boolean(topologyModelChanged && dataset),
    });
  }

  handleMasterDataChanged(event = null) {
    const dataset = this.workspaceState.getSnapshot()?.dataset || null;
    engineeringModelStore.markEmpiricalStale('MASTER_DATA_CHANGED', dataset?.version || null);
    nonFeaCommonInputStore.markStale('MASTER_DATA_CHANGED', 'enrichmentSidecarSemanticHash', 'Master data changed after sealing.');
    this.authorizedConsumerController.refreshEmpirical();
    this.eventBus.publish(ENGINEERING_MODEL_EVENTS.CHANGED, {
      reason: 'master-data-changed',
      masterKey: event?.masterKey || null,
    });
  }

  calculate() {
    try {
      const execution = this.authorizedConsumerController.executeEmpirical();
      const distribution = execution.distribution;
      this.eventBus.publish(ENGINEERING_MODEL_EVENTS.CHANGED, { reason: 'calculated', distribution, execution });
      return execution;
    } catch (error) {
      this.eventBus.publish(ENGINEERING_MODEL_EVENTS.FAILED, {
        message: error instanceof Error ? error.message : String(error),
        code: error?.code || 'EMPIRICAL_RUNTIME_EXECUTION_FAILED',
      });
      return null;
    }
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.lastRebuiltDataset = null;
    this.projectTopologyModelBasis = null;
    engineeringModelStore.clear();
  }
}

/**
 * Runtime-only dependency projection for the derived support-site/route models.
 * It is not serialized, hashed into engineering evidence, or used as authority.
 */
export function projectDataTopologyModelBasis(profile) {
  return JSON.stringify(PROJECT_DATA_TOPOLOGY_MODEL_PATHS.map((path) => {
    const [groupKey, fieldKey] = path.split('.');
    return stableRuntimeValue(profile?.[groupKey]?.[fieldKey]?.value ?? null);
  }));
}

function stableRuntimeValue(value) {
  if (Array.isArray(value)) return value.map(stableRuntimeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableRuntimeValue(value[key])]));
}
