import { WorkspaceState } from '../workspace-state.js';
import { engineeringModelStore } from '../engineering-model-store.js';
import { masterDataController } from '../master-data-controller.js';
import { nonFeaCommonInputStore } from '../non-fea-common-input-store.js';
import {
  getCurrentNonFeaProductDefaultProvider,
} from '../non-fea-common-input-runtime.js';
import {
  ConfiguredEmpiricalMethodControllerV2,
} from '../engineering-loads/configured-empirical-method-controller-v2.js';
import {
  authorizedEmpiricalRuntimeStoreV2,
} from '../engineering-loads/authorized-empirical-runtime-store-v2.js';
import {
  createProductionGovernedEmpiricalProjection,
  rebuildProductionGovernedEmpiricalProjection,
} from '../engineering-loads/production-governed-empirical-projection.js';
import { AuthorizedEnrichmentConsumerController } from './authorized-enrichment-consumer-controller.js';

const governedModelStore = Object.freeze({
  getDataset() {
    const snapshot = WorkspaceState.getSnapshot();
    return snapshot?.status === 'ready' ? snapshot.dataset || null : null;
  },
  getSupportSiteModel() { return engineeringModelStore.getSupportSiteModel(); },
  getRoutePartitionModel() { return engineeringModelStore.getRoutePartitionModel(); },
});

const effectiveProjectDataStore = Object.freeze({
  getProfile() {
    return getCurrentNonFeaProductDefaultProvider().effectiveProfile;
  },
});

const governedConfiguredController = new ConfiguredEmpiricalMethodControllerV2({
  modelStore: governedModelStore,
  profileStore: effectiveProjectDataStore,
  runtimeStore: authorizedEmpiricalRuntimeStoreV2,
});

const governedProjectionProvider = Object.freeze({
  createFromLegacy(runtimePackage, masterData) {
    const dataset = governedModelStore.getDataset();
    const productDefaults = getCurrentNonFeaProductDefaultProvider();
    return createProductionGovernedEmpiricalProjection({
      legacyRuntimePackage: runtimePackage,
      sourceProjectDataSemanticHash: productDefaults.sourceProjectDataSemanticHash,
      dataset,
      effectiveProfile: productDefaults.effectiveProfile,
      supportSiteModel: governedModelStore.getSupportSiteModel(),
      routePartitionModel: governedModelStore.getRoutePartitionModel(),
      masterData,
    });
  },
  rebuild(configuredProjection, masterData) {
    const dataset = governedModelStore.getDataset();
    const effectiveProfile = effectiveProjectDataStore.getProfile();
    return rebuildProductionGovernedEmpiricalProjection({
      configuredProjection,
      dataset,
      effectiveProfile,
      supportSiteModel: governedModelStore.getSupportSiteModel(),
      routePartitionModel: governedModelStore.getRoutePartitionModel(),
      masterData,
    });
  },
});

/** Single production composition root for common-input-bound empirical execution. */
export const authorizedEnrichmentConsumerController = new AuthorizedEnrichmentConsumerController({
  engineeringModelStore,
  masterDataController,
  commonInputStore: nonFeaCommonInputStore,
  governedEmpiricalController: governedConfiguredController,
  governedProjectionProvider,
});
