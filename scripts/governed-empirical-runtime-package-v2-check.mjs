#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  computeAuthorizedEmpiricalLoadInputSemanticHash,
  requireAuthorizedEmpiricalLoadInput,
} from '../src/workspace/engineering-loads/authorized-empirical-load-input.js';
import {
  EMPIRICAL_GOVERNED_GRAVITY_METHOD_SELECTION_SCHEMA,
  EMPIRICAL_GRAVITY_METHOD_SELECTION_SCHEMA,
} from '../src/workspace/engineering-loads/empirical-gravity-method-selection.js';
import {
  GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
  computeGovernedEmpiricalRuntimePackageProjectionV2SemanticHash,
  createGovernedEmpiricalRuntimePackageProjectionV2,
  requireGovernedEmpiricalRuntimePackageProjectionV2,
} from '../src/workspace/engineering-loads/governed-empirical-runtime-package-v2.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';
import {
  NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA,
  NON_FEA_GRAVITY_METHOD_AUTO,
} from '../src/workspace/project-data/non-fea-gravity-method-authority.js';

const PROFILE_HASH = 'fnv1a64:4444444444444444';
const ALT_PROFILE_HASH = 'fnv1a64:bbbbbbbbbbbbbbbb';
const AUDIT_HASH_A = 'fnv1a64:cccccccccccccccc';
const AUDIT_HASH_B = 'fnv1a64:dddddddddddddddd';
const context = packageContext(PROFILE_HASH);

const governedV2 = governedSelection({
  selectedMethod: EMPIRICAL_LOAD_METHOD,
  selectionState: 'SELECTED_V2_MISSING_COG_FALLBACK',
  projectDataSemanticHash: PROFILE_HASH,
  componentAuthorityAuditSemanticHash: AUDIT_HASH_A,
});
const governedV3 = governedSelection({
  selectedMethod: EMPIRICAL_LOAD_COG_METHOD,
  selectionState: 'SELECTED_V3_COG',
  projectDataSemanticHash: PROFILE_HASH,
  componentAuthorityAuditSemanticHash: AUDIT_HASH_A,
});

const projectionV2 = project(governedV2);
const projectionV3 = project(governedV3);
assert.equal(projectionV2.runtimePackage.method, EMPIRICAL_LOAD_METHOD);
assert.equal(projectionV3.runtimePackage.method, EMPIRICAL_LOAD_COG_METHOD);
assert.notEqual(projectionV2.runtimePackage.method, NON_FEA_GRAVITY_METHOD_AUTO,
  'AUTO must be resolved before the runtime-package boundary.');
assert.notEqual(projectionV3.runtimePackage.method, NON_FEA_GRAVITY_METHOD_AUTO,
  'AUTO must be resolved before the runtime-package boundary.');
assert.equal(projectionV2.governedSelection.semanticHash, governedV2.semanticHash);
assert.equal(Object.isFrozen(projectionV2), true);
assert.equal(Object.isFrozen(projectionV2.runtimePackage), true);
assert.equal(Object.hasOwn(projectionV2, 'calculationEligible'), false,
  'Projection receipt must not create calculation eligibility.');
assert.equal(Object.hasOwn(projectionV2, 'authorizationStatus'), false,
  'Projection receipt must not create authorization state.');

const sameMethodDifferentSelectionEvidence = project(governedSelection({
  selectedMethod: EMPIRICAL_LOAD_METHOD,
  selectionState: 'SELECTED_V2_MISSING_COG_FALLBACK',
  projectDataSemanticHash: PROFILE_HASH,
  componentAuthorityAuditSemanticHash: AUDIT_HASH_B,
}));
assert.equal(
  sameMethodDifferentSelectionEvidence.runtimePackage.semanticHash,
  projectionV2.runtimePackage.semanticHash,
  'Bare V2 package can remain identical when bound profile/package context and selected method are unchanged.',
);
assert.notEqual(
  sameMethodDifferentSelectionEvidence.semanticHash,
  projectionV2.semanticHash,
  'Governed projection receipt must retain changed selection evidence beyond the bare package.',
);

assert.throws(
  () => project(governedSelection({
    selectedMethod: EMPIRICAL_LOAD_METHOD,
    selectionState: 'SELECTED_V2_MISSING_COG_FALLBACK',
    projectDataSemanticHash: ALT_PROFILE_HASH,
    componentAuthorityAuditSemanticHash: AUDIT_HASH_A,
  })),
  (error) => error?.code === 'EMPIRICAL_GOVERNED_RUNTIME_PROFILE_BINDING_MISMATCH',
  'Governed method authority and runtime package must bind the same effective Project Data profile.',
);

assert.throws(
  () => project(governedSelection({
    selectedMethod: null,
    selectionState: 'EXCEPTION_POLICY_REQUIRED',
    projectDataSemanticHash: PROFILE_HASH,
    componentAuthorityAuditSemanticHash: AUDIT_HASH_A,
  })),
  (error) => error?.code === 'EMPIRICAL_GOVERNED_RUNTIME_SELECTION_NOT_EXECUTABLE',
  'A blocked/null governed selection must never produce an executable runtime package.',
);

assert.throws(
  () => createGovernedEmpiricalRuntimePackageProjectionV2({
    schema: GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
    governedSelection: governedV2,
    packageContext: { ...context, method: EMPIRICAL_LOAD_COG_METHOD },
  }),
  (error) => error?.code === 'EMPIRICAL_GOVERNED_RUNTIME_PROJECTION_KEYS_INVALID',
  'Caller must not be able to inject or override the selected method in package context.',
);

const fullyRehashedMethodMismatchDraft = {
  ...structuredClone(projectionV3),
  runtimePackage: projectionV2.runtimePackage,
  semanticHash: 'fnv1a64:0000000000000000',
};
const fullyRehashedMethodMismatch = {
  ...fullyRehashedMethodMismatchDraft,
  semanticHash: computeGovernedEmpiricalRuntimePackageProjectionV2SemanticHash(
    fullyRehashedMethodMismatchDraft,
  ),
};
assert.throws(
  () => requireGovernedEmpiricalRuntimePackageProjectionV2(fullyRehashedMethodMismatch),
  (error) => error?.code === 'EMPIRICAL_GOVERNED_RUNTIME_METHOD_MISMATCH',
  'A fully rehashed receipt cannot pair a V3 selection with a V2 package.',
);

const staleSelection = structuredClone(projectionV2);
staleSelection.governedSelection.selection.selectedMethod = EMPIRICAL_LOAD_COG_METHOD;
assert.throws(
  () => requireGovernedEmpiricalRuntimePackageProjectionV2(staleSelection),
  /semantic hash mismatch/i,
  'Nested governed-selection tampering must fail before package use.',
);

console.log(JSON.stringify({
  check: 'governed-empirical-runtime-package-v2',
  status: 'PASS',
  autoResolvedBeforeRuntimeBoundary: true,
  selectedV2SealedExactly: projectionV2.runtimePackage.method,
  selectedV3SealedExactly: projectionV3.runtimePackage.method,
  blockedSelectionCannotPackage: true,
  callerCannotInjectMethod: true,
  selectionEvidenceRetainedBeyondBarePackage: true,
  profileCrossBindingEnforced: true,
  fullyRehashedMethodMismatchBlocked: true,
  nestedSelectionTamperBlocked: true,
  productionControllerCutover: false,
  executionAuthorizationCreated: false,
}, null, 2));

function project(governedSelectionValue) {
  return createGovernedEmpiricalRuntimePackageProjectionV2({
    schema: GOVERNED_EMPIRICAL_RUNTIME_PACKAGE_PROJECTION_V2_SCHEMA,
    governedSelection: governedSelectionValue,
    packageContext: context,
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
    evidenceSource: 'GOVERNED_RUNTIME_PROJECTION_TEST',
    provenance: {
      authority: 'PROJECT_CONFIGURED_DEFAULT',
      source: 'GOVERNED_RUNTIME_PROJECTION_TEST',
      basis: 'Focused projection contract fixture',
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

function packageContext(projectDataProfileSemanticHash) {
  const authorizedInput = makeAuthorizedInput();
  return {
    packageId: 'PACKAGE-GOVERNED-RUNTIME-PROJECTION',
    configuredAt: '2026-08-26T06:20:00.000Z',
    executionId: 'EXECUTION-GOVERNED-RUNTIME-PROJECTION',
    executedAt: '2026-08-26T06:21:00.000Z',
    authorizedInput,
    bindings: {
      projectId: authorizedInput.projectId,
      datasetId: 'DATASET-GOVERNED-RUNTIME-PROJECTION',
      datasetVersion: 1,
      sourceDatasetHash: '1'.repeat(64),
      sharedModelSemanticHash: 'fnv1a64:1111111111111111',
      supportSiteModelSemanticHash: 'fnv1a64:2222222222222222',
      routePartitionModelSemanticHash: 'fnv1a64:3333333333333333',
      projectDataProfileSemanticHash,
      masterSourceHashes: {
        dataset: '1'.repeat(64),
        lineList: '2'.repeat(64),
        pipingClass: '3'.repeat(64),
        componentWeight: '4'.repeat(64),
      },
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
    intakeId: 'INTAKE-GOVERNED-RUNTIME-PROJECTION',
    projectId: 'PROJECT-GOVERNED-RUNTIME-PROJECTION',
    baselineId: 'BASELINE-GOVERNED-RUNTIME-PROJECTION',
    baselineRevision: 1,
    baselineSemanticHash: 'fnv1a64:5555555555555555',
    readinessEvaluationSemanticHash: 'fnv1a64:6666666666666666',
    readinessSemanticHash: 'fnv1a64:7777777777777777',
    handoffSemanticHash: 'fnv1a64:8888888888888888',
    projectionPayloadSemanticHash: 'fnv1a64:9999999999999999',
    adapterVersion: 'empirical-adapter/1.0.0',
    configurationHash: 'fnv1a64:aaaaaaaaaaaaaaaa',
    createdAt: '2026-08-26T06:19:30.000Z',
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
