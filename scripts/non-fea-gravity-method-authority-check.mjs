#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  LOAD_CALC_STANDARD_DEFAULTS_V1,
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  NON_FEA_GRAVITY_METHOD_AUTO,
  NON_FEA_GRAVITY_METHOD_V2,
  NON_FEA_GRAVITY_METHOD_V3_COG,
  createNonFeaGravityMethodAuthority,
} from '../src/workspace/project-data/non-fea-gravity-method-authority.js';
import {
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION,
  EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
} from '../src/workspace/engineering-loads/empirical-component-load-authority.js';
import {
  createGovernedEmpiricalGravityMethodSelection,
  requireGovernedEmpiricalGravityMethodSelection,
} from '../src/workspace/engineering-loads/empirical-gravity-method-selection.js';

const rawEmpty = createEmptyProjectDataProfile();
const rawAuthority = createNonFeaGravityMethodAuthority(rawEmpty);
assert.equal(rawAuthority.state, 'BLOCKED');
assert.equal(rawAuthority.requestedMethod, null);
assert.ok(rawAuthority.blockers.some((row) => row.code === 'GRAVITY_METHOD_NOT_APPROVED'));

const productProvider = createNonFeaProductDefaultProvider({ profile: rawEmpty });
const productEntry = productProvider.effectiveProfile.loadCalculation.gravityMethod;
assert.equal(productEntry.value, NON_FEA_GRAVITY_METHOD_AUTO);
assert.equal(productEntry.evidence.authority, 'PRODUCT_DEFAULT');
assert.equal(productEntry.evidence.defaultId, 'PD-GRAVITY-METHOD');
assert.equal(productEntry.evidence.profileVersion, LOAD_CALC_STANDARD_DEFAULTS_V1.version);
assert.ok(productProvider.usageRows.some((row) => row.defaultId === 'PD-GRAVITY-METHOD'));

const productAuthority = createNonFeaGravityMethodAuthority(productProvider.effectiveProfile);
assert.equal(productAuthority.state, 'READY');
assert.equal(productAuthority.requestedMethod, NON_FEA_GRAVITY_METHOD_AUTO);
assert.equal(productAuthority.effectiveAuthority, 'PRODUCT_DEFAULT');
assert.equal(productAuthority.provenance.defaultId, 'PD-GRAVITY-METHOD');
assert.equal(productAuthority.provenance.profileId, LOAD_CALC_STANDARD_DEFAULTS_V1.profileId);
assert.equal(productAuthority.provenance.profileVersion, LOAD_CALC_STANDARD_DEFAULTS_V1.version);
assert.equal(productAuthority.projectDataSemanticHash, semanticHash(productProvider.effectiveProfile));

const explicitV2Profile = replaceProjectDataValue(
  rawEmpty,
  'loadCalculation.gravityMethod',
  NON_FEA_GRAVITY_METHOD_V2,
  { source: 'Project gravity method basis', authority: 'PROJECT_CONFIGURED_DEFAULT' },
  true,
);
const explicitV2Provider = createNonFeaProductDefaultProvider({ profile: explicitV2Profile });
const explicitV2Authority = createNonFeaGravityMethodAuthority(explicitV2Provider.effectiveProfile);
assert.equal(explicitV2Authority.state, 'READY');
assert.equal(explicitV2Authority.requestedMethod, NON_FEA_GRAVITY_METHOD_V2);
assert.equal(explicitV2Authority.effectiveAuthority, 'PROJECT_CONFIGURED_DEFAULT');
assert.ok(explicitV2Provider.shadowedRows.some((row) => row.defaultId === 'PD-GRAVITY-METHOD'));
assert.equal(explicitV2Provider.usageRows.some((row) => row.defaultId === 'PD-GRAVITY-METHOD'), false);

const explicitV3Profile = replaceProjectDataValue(
  rawEmpty,
  'loadCalculation.gravityMethod',
  NON_FEA_GRAVITY_METHOD_V3_COG,
  { source: 'Project gravity method basis', authority: 'PROJECT_CONFIGURED_DEFAULT' },
  true,
);
const explicitV3Provider = createNonFeaProductDefaultProvider({ profile: explicitV3Profile });
const explicitV3Authority = createNonFeaGravityMethodAuthority(explicitV3Provider.effectiveProfile);
assert.equal(explicitV3Authority.state, 'READY');
assert.equal(explicitV3Authority.requestedMethod, NON_FEA_GRAVITY_METHOD_V3_COG);

const invalidProfile = replaceProjectDataValue(
  rawEmpty,
  'loadCalculation.gravityMethod',
  'BOGUS',
  { source: 'Invalid explicit project request', authority: 'PROJECT_CONFIGURED_DEFAULT' },
  true,
);
const invalidProvider = createNonFeaProductDefaultProvider({ profile: invalidProfile });
const invalidAuthority = createNonFeaGravityMethodAuthority(invalidProvider.effectiveProfile);
assert.equal(invalidAuthority.state, 'BLOCKED');
assert.ok(invalidAuthority.blockers.some((row) => row.code === 'GRAVITY_METHOD_UNKNOWN'));
assert.ok(invalidProvider.shadowedRows.some((row) => row.defaultId === 'PD-GRAVITY-METHOD'));
assert.equal(invalidProvider.usageRows.some((row) => row.defaultId === 'PD-GRAVITY-METHOD'), false,
  'An invalid explicit request must never be silently repaired by Product AUTO.');

const malformedProductProfile = structuredClone(rawEmpty);
malformedProductProfile.loadCalculation.gravityMethod = {
  value: NON_FEA_GRAVITY_METHOD_AUTO,
  evidence: {
    source: 'Forged product request',
    authority: 'PRODUCT_DEFAULT',
    defaultId: 'PD-GRAVITY-METHOD',
  },
  approved: true,
};
const malformedProductAuthority = createNonFeaGravityMethodAuthority(malformedProductProfile);
assert.equal(malformedProductAuthority.state, 'BLOCKED');
assert.ok(malformedProductAuthority.blockers.some(
  (row) => row.code === 'GRAVITY_METHOD_PRODUCT_DEFAULT_EVIDENCE_INVALID',
));

const governedV3 = createGovernedEmpiricalGravityMethodSelection({
  gravityMethodAuthority: productAuthority,
  componentAuthorityAudit: audit([
    record('ELBOW-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
  ], productAuthority.projectDataSemanticHash),
});
assert.equal(governedV3.selection.requestedMethod, NON_FEA_GRAVITY_METHOD_AUTO);
assert.equal(governedV3.selection.selectedMethod, NON_FEA_GRAVITY_METHOD_V3_COG);
assert.equal(governedV3.selection.selectionState, 'SELECTED_V3_COG');
assert.equal(governedV3.gravityMethodAuthority.semanticHash, productAuthority.semanticHash);
assert.equal(
  governedV3.componentAuthorityAuditProjectDataProfileSemanticHash,
  productAuthority.projectDataSemanticHash,
);
requireGovernedEmpiricalGravityMethodSelection(governedV3);

const tamperedGoverned = structuredClone(governedV3);
tamperedGoverned.componentAuthorityAuditProjectDataProfileSemanticHash =
  'fnv1a64:aaaaaaaaaaaaaaaa';
const { semanticHash: _tamperedHash, ...tamperedBase } = tamperedGoverned;
tamperedGoverned.semanticHash = semanticHash(tamperedBase);
assert.throws(
  () => requireGovernedEmpiricalGravityMethodSelection(tamperedGoverned),
  (error) => error?.code === 'EMPIRICAL_GRAVITY_METHOD_AUTHORITY_PROFILE_MISMATCH',
  'Rehydration must reject a governed selector whose retained audit-profile binding changed.',
);

const governedV2Fallback = createGovernedEmpiricalGravityMethodSelection({
  gravityMethodAuthority: productAuthority,
  componentAuthorityAudit: audit([
    record('ELBOW-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK),
  ], productAuthority.projectDataSemanticHash),
});
assert.equal(governedV2Fallback.selection.selectedMethod, NON_FEA_GRAVITY_METHOD_V2);
assert.equal(governedV2Fallback.selection.selectionState, 'SELECTED_V2_MISSING_COG_FALLBACK');
assert.equal(governedV2Fallback.selection.fallbackLedger[0].permittedByPolicy, true);

const governedBlockedFallback = createGovernedEmpiricalGravityMethodSelection({
  gravityMethodAuthority: productAuthority,
  componentAuthorityAudit: audit([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.OFF_ROUTE, {
      candidateChainageMm: null,
      blockers: [{ code: 'EMPIRICAL_COMPONENT_COG_OFF_ROUTE' }],
    }),
  ], productAuthority.projectDataSemanticHash),
});
assert.equal(governedBlockedFallback.selection.selectedMethod, null);
assert.equal(governedBlockedFallback.selection.selectionState, 'EXCEPTION_POLICY_REQUIRED');
assert.equal(governedBlockedFallback.selection.fallbackLedger[0].permittedByPolicy, false);

const explicitV2Selection = createGovernedEmpiricalGravityMethodSelection({
  gravityMethodAuthority: explicitV2Authority,
  componentAuthorityAudit: audit([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK),
  ], explicitV2Authority.projectDataSemanticHash),
});
assert.equal(explicitV2Selection.selection.requestedMethod, NON_FEA_GRAVITY_METHOD_V2);
assert.equal(explicitV2Selection.selection.selectedMethod, NON_FEA_GRAVITY_METHOD_V2);
assert.equal(explicitV2Selection.selection.selectionState, 'EXPLICIT_V2_SELECTED');

const explicitV3Selection = createGovernedEmpiricalGravityMethodSelection({
  gravityMethodAuthority: explicitV3Authority,
  componentAuthorityAudit: audit([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
  ], explicitV3Authority.projectDataSemanticHash),
});
assert.equal(explicitV3Selection.selection.requestedMethod, NON_FEA_GRAVITY_METHOD_V3_COG);
assert.equal(explicitV3Selection.selection.selectedMethod, NON_FEA_GRAVITY_METHOD_V3_COG);
assert.equal(explicitV3Selection.selection.selectionState, 'EXPLICIT_V3_SELECTED');

assert.throws(
  () => createGovernedEmpiricalGravityMethodSelection({
    gravityMethodAuthority: productAuthority,
    componentAuthorityAudit: audit([], 'fnv1a64:aaaaaaaaaaaaaaaa'),
  }),
  (error) => error?.code === 'EMPIRICAL_GRAVITY_METHOD_AUTHORITY_PROFILE_MISMATCH',
  'A method receipt must not be paired with an audit from a different effective profile.',
);
assert.throws(
  () => createGovernedEmpiricalGravityMethodSelection({
    gravityMethodAuthority: invalidAuthority,
    componentAuthorityAudit: audit([], invalidAuthority.projectDataSemanticHash),
  }),
  (error) => error?.code === 'GRAVITY_METHOD_AUTHORITY_NOT_READY',
);

console.log(JSON.stringify({
  check: 'non-fea-gravity-method-authority',
  status: 'PASS',
  rawEmptyBlocked: true,
  productDefaultRequest: productAuthority.requestedMethod,
  productDefaultId: productAuthority.provenance.defaultId,
  projectV2ShadowsProductAuto: true,
  projectV3ShadowsProductAuto: true,
  invalidExplicitDoesNotFallBack: true,
  malformedProductEvidenceBlocked: true,
  governedAutoSelectsV3WhenQualified: true,
  governedAutoFallsBackToV2OnlyForMissingCog: true,
  governedAutoRefusesKnownEccentricityFallback: true,
  profileHashMismatchBlocked: true,
  rehydrationProfileBindingChecked: true,
  selectionIsNotExecutionAuthorization: governedV3.selection.policy.selectionIsNotExecutionAuthorization,
}, null, 2));

function record(entityId, cogClassification, options = {}) {
  const blockers = options.blockers || [];
  return {
    entityId,
    sourceEntityId: entityId,
    entityType: options.entityType || 'VALVE',
    routeId: 'R1',
    currentMethodPointChainageMm: 1000,
    cogClassification,
    cogEvidence: options.cogEvidence || null,
    projection: options.projection || null,
    candidateChainageMm: options.candidateChainageMm ?? 1000,
    explicitMoment: options.explicitMoment || null,
    integrationEligible: blockers.length === 0,
    integrationDisposition: blockers.length === 0
      ? (cogClassification === EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE
        ? 'COG_CHAINAGE_CANDIDATE_ONLY'
        : 'CURRENT_METHOD_MIDPOINT_PARITY_ONLY')
      : 'BLOCKED_PENDING_POLICY_OR_EVIDENCE',
    blockers,
  };
}

function audit(records, projectDataProfileSemanticHash) {
  const sorted = [...records].sort((left, right) => left.entityId.localeCompare(right.entityId));
  const base = {
    schema: EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
    datasetId: 'GRAVITY-METHOD-AUTHORITY',
    datasetVersion: 1,
    sourceDatasetHash: 'sha256:test',
    sharedModelSemanticHash: 'fnv1a64:1111111111111111',
    routePartitionModelSemanticHash: 'fnv1a64:2222222222222222',
    projectDataProfileSemanticHash,
    toleranceMm: 1,
    status: sorted.every((row) => row.integrationEligible)
      ? 'READY_FOR_INTEGRATION_DESIGN'
      : 'BLOCKED',
    records: sorted,
    blockers: sorted.flatMap((row) => row.blockers.map((blocker) => ({
      ...blocker,
      entityId: row.entityId,
      routeId: row.routeId,
    }))),
    summary: {},
    numericalMethodChanged: false,
  };
  return { ...base, semanticHash: semanticHash(base) };
}
