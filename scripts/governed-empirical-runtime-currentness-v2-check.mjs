#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  computeAuthorizedEmpiricalLoadInputSemanticHash,
  requireAuthorizedEmpiricalLoadInput,
} from '../src/workspace/engineering-loads/authorized-empirical-load-input.js';
import {
  AuthorizedEmpiricalRuntimeStoreV2,
} from '../src/workspace/engineering-loads/authorized-empirical-runtime-store-v2.js';
import {
  ConfiguredEmpiricalMethodControllerV2,
} from '../src/workspace/engineering-loads/configured-empirical-method-controller-v2.js';
import {
  EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA,
  EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA,
} from '../src/workspace/engineering-loads/empirical-gravity-method-selection.js';
import {
  GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
  createGovernedEmpiricalRuntimePackageProjectionV2,
} from '../src/workspace/engineering-loads/governed-empirical-runtime-package-v2.js';
import {
  EMPIRICAL_AUTHORIZATION_STATES,
} from '../src/workspace/engineering-loads/authorized-empirical-runtime-store.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';
import {
  NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA,
  NON_FEA_GRAVITY_METHOD_AUTO,
} from '../src/workspace/project-data/non-fea-gravity-method-authority.js';

const HASHES = Object.freeze({
  dataset: '1'.repeat(64),
  lineList: '2'.repeat(64),
  pipingClass: '3'.repeat(64),
  componentWeight: '4'.repeat(64),
});
const AUDIT_HASH_A = 'fnv1a64:aaaaaaaaaaaaaaaa';
const AUDIT_HASH_B = 'fnv1a64:bbbbbbbbbbbbbbbb';

const authorizedInput = makeAuthorizedInput();
const fixture = makeFixture(authorizedInput.projectId);
const profileHash = semanticHash(fixture.profile);
const context = packageContext(fixture, authorizedInput);
const governedV2A = project(governedSelection({
  selectedMethod: EMPIRICAL_LOAD_METHOD,
  selectionState: 'SELECTED_V2_MISSING_COG_FALLBACK',
  projectDataSemanticHash: profileHash,
  componentAuthorityAuditSemanticHash: AUDIT_HASH_A,
}), context);
const governedV2B = project(governedSelection({
  selectedMethod: EMPIRICAL_LOAD_METHOD,
  selectionState: 'SELECTED_V2_MISSING_COG_FALLBACK',
  projectDataSemanticHash: profileHash,
  componentAuthorityAuditSemanticHash: AUDIT_HASH_B,
}), context);
const governedV3 = project(governedSelection({
  selectedMethod: EMPIRICAL_LOAD_COG_METHOD,
  selectionState: 'SELECTED_V3_COG',
  projectDataSemanticHash: profileHash,
  componentAuthorityAuditSemanticHash: AUDIT_HASH_A,
}), context);

assert.equal(
  governedV2A.runtimePackage.semanticHash,
  governedV2B.runtimePackage.semanticHash,
  'Fixture requires identical bare V2 packages so governed currentness is independently falsified.',
);
assert.notEqual(governedV2A.semanticHash, governedV2B.semanticHash);

const runtimeStore = new AuthorizedEmpiricalRuntimeStoreV2();
const configured = runtimeStore.configureGoverned(governedV2A, context.bindings);
assert.equal(configured.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_CURRENT);
assert.equal(configured.calculationEligible, true);
assert.equal(runtimeStore.getGovernedProjection().semanticHash, governedV2A.semanticHash);

const current = runtimeStore.refreshGoverned(context.bindings, governedV2A);
assert.equal(current.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_CURRENT);

const staleSameMethod = runtimeStore.refreshGoverned(context.bindings, governedV2B);
assert.equal(staleSameMethod.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_STALE);
assert.equal(staleSameMethod.calculationEligible, false);
assert.equal(staleSameMethod.reasonCode, 'GOVERNED_PROJECTION_CHANGED');
assert.equal(
  staleSameMethod.details[0].configuredMethod,
  EMPIRICAL_LOAD_METHOD,
);
assert.equal(staleSameMethod.details[0].currentMethod, EMPIRICAL_LOAD_METHOD);
assert.throws(
  () => runtimeStore.requireCurrentPackage(),
  (error) => error?.code === 'EMPIRICAL_RUNTIME_V2_NOT_CALCULATION_ELIGIBLE',
);

runtimeStore.configureGoverned(governedV2A, context.bindings);
const staleMethodChange = runtimeStore.refreshGoverned(context.bindings, governedV3);
assert.equal(staleMethodChange.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_STALE);
assert.equal(staleMethodChange.reasonCode, 'GOVERNED_PROJECTION_CHANGED');
assert.equal(staleMethodChange.details[0].configuredMethod, EMPIRICAL_LOAD_METHOD);
assert.equal(staleMethodChange.details[0].currentMethod, EMPIRICAL_LOAD_COG_METHOD);

runtimeStore.configureGoverned(governedV2A, context.bindings);
const staleMissingReceipt = runtimeStore.refreshGoverned(context.bindings, null);
assert.equal(staleMissingReceipt.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_STALE);
assert.equal(staleMissingReceipt.reasonCode, 'GOVERNED_PROJECTION_CURRENTNESS_REQUIRED');

runtimeStore.configureGoverned(governedV2A, context.bindings);
const staleLegacyRefresh = runtimeStore.refresh(context.bindings);
assert.equal(staleLegacyRefresh.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_STALE);
assert.equal(staleLegacyRefresh.reasonCode, 'GOVERNED_PROJECTION_CURRENTNESS_REQUIRED');

const bareStore = new AuthorizedEmpiricalRuntimeStoreV2();
const bareConfigured = bareStore.configure(governedV2A.runtimePackage, context.bindings);
assert.equal(bareConfigured.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_CURRENT);
assert.equal(bareStore.getGovernedProjection(), null);
assert.equal(
  bareStore.refresh(context.bindings).state,
  EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_CURRENT,
  'Existing bare-V2 refresh semantics must remain unchanged.',
);

let calculateCalls = 0;
const modelStore = {
  getDataset: () => fixture.dataset,
  getSupportSiteModel: () => fixture.supportSiteModel,
  getRoutePartitionModel: () => fixture.routePartitionModel,
};
const profileStore = { getProfile: () => fixture.profile };
const supportLoadStore = {
  calculateAuthorizedV2: () => {
    calculateCalls += 1;
    throw new Error('Calculation should not be reached by stale-currentness checks.');
  },
  markStale: () => null,
  clear: () => null,
};
const controllerStore = new AuthorizedEmpiricalRuntimeStoreV2();
const controller = new ConfiguredEmpiricalMethodControllerV2({
  modelStore,
  profileStore,
  supportLoadStore,
  runtimeStore: controllerStore,
});
const controllerConfigured = controller.configureGoverned(governedV2A, fixture.masterData);
assert.equal(controllerConfigured.state, EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_CURRENT);
assert.equal(controller.getGovernedProjection().semanticHash, governedV2A.semanticHash);
assert.equal(
  controller.refreshGoverned(governedV2A, fixture.masterData).state,
  EMPIRICAL_AUTHORIZATION_STATES.AUTHORIZED_CURRENT,
);
assert.throws(
  () => controller.executeGoverned(governedV2B, fixture.masterData),
  (error) => error?.code === 'EMPIRICAL_RUNTIME_V2_NOT_CALCULATION_ELIGIBLE',
  'Changed governed receipt must block before V2 execution is called.',
);
assert.equal(calculateCalls, 0);

controller.configureGoverned(governedV2A, fixture.masterData);
assert.throws(
  () => controller.execute(fixture.masterData),
  (error) => error?.code === 'EMPIRICAL_RUNTIME_V2_NOT_CALCULATION_ELIGIBLE',
  'Legacy execute must not bypass governed currentness after governed configuration.',
);
assert.equal(calculateCalls, 0);

console.log(JSON.stringify({
  check: 'governed-empirical-runtime-currentness-v2',
  status: 'PASS',
  sameBarePackageDifferentGovernedReceiptStales: true,
  methodChangeStales: true,
  missingCurrentReceiptStales: true,
  legacyRefreshCannotBypassGovernedMode: true,
  legacyExecuteCannotBypassGovernedMode: true,
  bareV2CompatibilityPreserved: true,
  staleExecutionBlockedBeforeCalculation: calculateCalls === 0,
  productionEngineeringModelStoreCutover: false,
}, null, 2));

function project(governedSelectionValue, packageContextValue) {
  return createGovernedEmpiricalRuntimePackageProjectionV2({
    schema: GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
    governedSelection: governedSelectionValue,
    packageContext: packageContextValue,
  });
}

function governedSelection({
  selectedMethod,
  selectionState,
  projectDataSemanticHash,
  componentAuthorityAuditSemanticHash,
}) {
  const authorityBase = {
    schema: NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA,
    projectDataRevision: 1,
    projectDataSemanticHash,
    state: 'READY',
    requestedMethod: NON_FEA_GRAVITY_METHOD_AUTO,
    effectiveAuthority: 'PROJECT_CONFIGURED_DEFAULT',
    evidenceSource: 'GOVERNED_CURRENTNESS_TEST',
    provenance: {
      authority: 'PROJECT_CONFIGURED_DEFAULT',
      source: 'GOVERNED_CURRENTNESS_TEST',
      basis: 'Focused governed-currentness fixture',
      defaultId: null,
      defaultSemanticHash: null,
      profileId: null,
      profileVersion: null,
      productDefaultProfileSemanticHash: null,
    },
    blockers: [],
  };
  const authority = {
    ...authorityBase,
    semanticHash: semanticHash(authorityBase),
  };
  const selectionBase = {
    schema: EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA,
    requestedMethod: NON_FEA_GRAVITY_METHOD_AUTO,
    selectedMethod,
    selectionState,
    componentAuthorityAuditSemanticHash,
    candidates: [],
    fallbackLedger: [],
    assumptions: [],
    exceptions: [],
    policy: {
      highestFidelityQualifiedMethodFirst: true,
      missingCogMayFallbackToV2: true,
      knownOffRouteCogMayFallbackToV2: false,
      ambiguousCogMayFallbackToV2: false,
      invalidCogEvidenceMayFallbackToV2: false,
      explicitMomentMayFallbackToV2: false,
      beamContactIsSeparateMechanicsFamily: true,
      selectionIsNotExecutionAuthorization: true,
    },
  };
  const selection = {
    ...selectionBase,
    semanticHash: semanticHash(selectionBase),
  };
  const governedBase = {
    schema: EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA,
    gravityMethodAuthority: authority,
    componentAuthorityAuditProjectDataProfileSemanticHash: projectDataSemanticHash,
    selection,
  };
  return {
    ...governedBase,
    semanticHash: semanticHash(governedBase),
  };
}

function packageContext(value, input) {
  return {
    packageId: 'PACKAGE-GOVERNED-CURRENTNESS',
    configuredAt: '2026-08-26T07:10:00.000Z',
    executionId: 'EXECUTION-GOVERNED-CURRENTNESS',
    executedAt: '2026-08-26T07:11:00.000Z',
    authorizedInput: input,
    bindings: currentBindings(value, input),
  };
}

function currentBindings(value, input) {
  return {
    projectId: input.projectId,
    datasetId: value.dataset.datasetId,
    datasetVersion: value.dataset.version,
    sourceDatasetHash: value.dataset.sourceSha256,
    sharedModelSemanticHash: semanticHash(value.dataset.sharedModel),
    supportSiteModelSemanticHash: semanticHash(value.supportSiteModel),
    routePartitionModelSemanticHash: semanticHash(value.routePartitionModel),
    projectDataProfileSemanticHash: semanticHash(value.profile),
    masterSourceHashes: {
      dataset: HASHES.dataset,
      lineList: HASHES.lineList,
      pipingClass: HASHES.pipingClass,
      componentWeight: HASHES.componentWeight,
    },
  };
}

function makeFixture(projectId) {
  return {
    profile: {
      schema: 'project-data-profile/v1',
      projectId,
      revision: 1,
      updatedAt: '2026-08-26T07:09:00.000Z',
      loadCalculation: {
        gravityMethod: {
          value: 'AUTO',
          evidence: { source: 'GOVERNED_CURRENTNESS_TEST' },
          approved: true,
        },
      },
    },
    dataset: {
      datasetId: 'DATASET-GOVERNED-CURRENTNESS',
      version: 1,
      sourceSha256: HASHES.dataset,
      sharedModel: { schema: 'shared-piping-model/v1', entities: [] },
    },
    supportSiteModel: { schema: 'support-site-model/v1', sites: [] },
    routePartitionModel: { schema: 'route-partition-model/v1', routes: [], edges: [] },
    masterData: {
      lineList: { sourceHash: HASHES.lineList },
      pipingClass: { sourceHash: HASHES.pipingClass },
      weight: { sourceHash: HASHES.componentWeight },
    },
  };
}

function makeAuthorizedInput() {
  const overlay = {
    pipeSectionProperties: {},
    materialDensitiesKgPerM3: {},
    operatingFluidDensitiesKgPerM3: {},
    hydroFluidDensitiesKgPerM3: {},
    insulationDensitiesKgPerM3: {},
    componentWeightsKg: {},
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'INTAKE-GOVERNED-CURRENTNESS',
    projectId: 'PROJECT-GOVERNED-CURRENTNESS',
    baselineId: 'BASELINE-GOVERNED-CURRENTNESS',
    baselineRevision: 1,
    baselineSemanticHash: 'fnv1a64:1111111111111111',
    readinessEvaluationSemanticHash: 'fnv1a64:2222222222222222',
    readinessSemanticHash: 'fnv1a64:3333333333333333',
    handoffSemanticHash: 'fnv1a64:4444444444444444',
    projectionPayloadSemanticHash: 'fnv1a64:5555555555555555',
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: 'fnv1a64:6666666666666666',
    createdAt: '2026-08-26T07:08:30.000Z',
    lineBindings: [],
    componentBindings: [],
    loadCalculationOverlay: overlay,
    overlaySemanticHash: semanticHash(overlay),
    summary: {
      lineCount: 0,
      componentCount: 0,
      materialCodeCount: 0,
      insulationCodeCount: 0,
      componentCatalogCount: 0,
    },
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return requireAuthorizedEmpiricalLoadInput({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadInputSemanticHash(draft),
  });
}
