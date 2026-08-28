#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import { PROJECT_DATA_REQUIREMENTS } from '../src/workspace/project-data/project-data-fields.js';
import {
  NON_FEA_COMPONENT_COG_FALLBACK,
  requireNonFeaComponentCogFallbackPolicy,
} from '../src/workspace/project-data/non-fea-component-cog-fallback-policy.js';
import {
  LOAD_CALC_STANDARD_DEFAULTS_V1,
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION,
  EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
} from '../src/workspace/engineering-loads/empirical-component-load-authority.js';
import {
  EMPIRICAL_GRAVITY_AUTO,
  createEmpiricalGravityMethodSelection,
} from '../src/workspace/engineering-loads/empirical-gravity-method-selection.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';

const fallbackPath = 'loadCalculation.componentCogFallback';
assert.equal(PROJECT_DATA_REQUIREMENTS.nonFeaPolicy.includes(fallbackPath), true,
  'CoG fallback must remain part of Non-FEA policy readiness.');
assert.equal(PROJECT_DATA_REQUIREMENTS.loadCalcProjectBasis.includes(fallbackPath), false,
  'Selector-only CoG fallback must not become a qualified-case-mass kernel prerequisite.');
assert.equal(PROJECT_DATA_REQUIREMENTS.authorizedGravityLoads.includes(fallbackPath), false,
  'Selector-only CoG fallback must not become an authorized gravity-load kernel prerequisite.');

const empty = createEmptyProjectDataProfile();
const product = createNonFeaProductDefaultProvider({ profile: empty });
const productEntry = product.effectiveProfile.loadCalculation.componentCogFallback;

assert.equal(LOAD_CALC_STANDARD_DEFAULTS_V1.version, 7);
assert.equal(productEntry.value, NON_FEA_COMPONENT_COG_FALLBACK.GEOMETRIC_MIDPOINT);
assert.equal(productEntry.evidence.authority, 'PRODUCT_DEFAULT');
assert.equal(productEntry.evidence.defaultId, 'PD-COMPONENT-COG-FALLBACK');
assert.equal(productEntry.evidence.profileVersion, 7);
assert.ok(productEntry.evidence.defaultSemanticHash);
assert.ok(productEntry.evidence.productDefaultProfileSemanticHash);
assert.ok(product.usageRows.some((row) => row.defaultId === 'PD-COMPONENT-COG-FALLBACK'));

const projectDisabled = replaceProjectDataValue(
  empty,
  fallbackPath,
  NON_FEA_COMPONENT_COG_FALLBACK.DISABLED,
  { source: 'Project CoG fallback policy', authority: 'PROJECT_POLICY' },
  true,
);
const projectProvider = createNonFeaProductDefaultProvider({ profile: projectDisabled });
assert.equal(projectProvider.effectiveProfile.loadCalculation.componentCogFallback.value,
  NON_FEA_COMPONENT_COG_FALLBACK.DISABLED);
assert.equal(projectProvider.effectiveProfile.loadCalculation.componentCogFallback.evidence.authority,
  'PROJECT_POLICY');
assert.equal(projectProvider.usageRows.some((row) => row.defaultId === 'PD-COMPONENT-COG-FALLBACK'), false);
assert.equal(
  projectProvider.shadowedRows.find((row) => row.defaultId === 'PD-COMPONENT-COG-FALLBACK')?.status,
  'SHADOWED_BY_HIGHER_AUTHORITY',
);
assert.notEqual(product.semanticHash, projectProvider.semanticHash,
  'Changing the effective CoG fallback policy must stale the Product/default provider receipt.');

assert.throws(
  () => requireNonFeaComponentCogFallbackPolicy('MIDPOINT_IF_CONVENIENT'),
  /Unsupported component CoG fallback policy/u,
  'Unknown fallback tokens must fail closed rather than degrade to midpoint behavior.',
);

const missingCogRecord = record(
  'VALVE-MISSING',
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK,
);
const productSelection = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentCogFallbackPolicy: productEntry.value,
  componentAuthorityAudit: audit([missingCogRecord]),
});
assert.equal(productSelection.selectedMethod, EMPIRICAL_LOAD_METHOD);
assert.equal(productSelection.selectionState, 'SELECTED_V2_MISSING_COG_FALLBACK');
assert.equal(productSelection.componentCogFallbackPolicy,
  NON_FEA_COMPONENT_COG_FALLBACK.GEOMETRIC_MIDPOINT);
assert.equal(productSelection.policy.missingCogMayFallbackToV2, true);
assert.equal(productSelection.fallbackLedger[0].permittedByPolicy, true);
assert.equal(productSelection.fallbackLedger[0].reasonCode, 'COG_NOT_AVAILABLE');
assert.equal(productSelection.assumptions[0].code, 'GEOMETRIC_MIDPOINT_APPLICATION');

const disabledAuto = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentCogFallbackPolicy: NON_FEA_COMPONENT_COG_FALLBACK.DISABLED,
  componentAuthorityAudit: audit([missingCogRecord]),
});
assert.equal(disabledAuto.selectedMethod, null);
assert.equal(disabledAuto.selectionState, 'COG_FALLBACK_DISABLED_BY_POLICY');
assert.equal(disabledAuto.policy.missingCogMayFallbackToV2, false);
assert.equal(disabledAuto.fallbackLedger[0].permittedByPolicy, false);
assert.equal(disabledAuto.fallbackLedger[0].reasonCode, 'COG_FALLBACK_DISABLED_BY_POLICY');

const explicitV2 = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_LOAD_METHOD,
  componentCogFallbackPolicy: NON_FEA_COMPONENT_COG_FALLBACK.DISABLED,
  componentAuthorityAudit: audit([missingCogRecord]),
});
assert.equal(explicitV2.selectedMethod, EMPIRICAL_LOAD_METHOD);
assert.equal(explicitV2.selectionState, 'EXPLICIT_V2_SELECTED');
assert.equal(explicitV2.fallbackLedger.length, 0,
  'Explicit V2 must not be misrepresented as an AUTO fallback.');

const exactCog = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentCogFallbackPolicy: NON_FEA_COMPONENT_COG_FALLBACK.DISABLED,
  componentAuthorityAudit: audit([
    record('VALVE-COG', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
  ]),
});
assert.equal(exactCog.selectedMethod, EMPIRICAL_LOAD_COG_METHOD,
  'A disabled fallback policy must not suppress V3 when exact CoG authority exists.');

const offRoute = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentCogFallbackPolicy: NON_FEA_COMPONENT_COG_FALLBACK.GEOMETRIC_MIDPOINT,
  componentAuthorityAudit: audit([
    record('VALVE-OFF', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.OFF_ROUTE, {
      candidateChainageMm: null,
      blockers: [{ code: 'EMPIRICAL_COMPONENT_COG_OFF_ROUTE' }],
    }),
  ]),
});
assert.equal(offRoute.selectedMethod, null,
  'Known off-route CoG evidence must never be erased by the midpoint fallback policy.');
assert.equal(offRoute.selectionState, 'EXCEPTION_POLICY_REQUIRED');
assert.equal(offRoute.fallbackLedger[0].reasonCode,
  'KNOWN_ECCENTRICITY_OR_UNQUALIFIED_COMPONENT_EVIDENCE');
assert.equal(offRoute.fallbackLedger[0].permittedByPolicy, false);

const unresolved = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentAuthorityAudit: audit([missingCogRecord]),
});
assert.equal(unresolved.selectedMethod, null);
assert.equal(unresolved.selectionState, 'COG_FALLBACK_POLICY_REQUIRED');
assert.equal(unresolved.fallbackLedger[0].permittedByPolicy, false);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_COMPONENT_COG_FALLBACK_POLICY',
  productDefault: productEntry.value,
  productDefaultId: productEntry.evidence.defaultId,
  projectOverride: projectProvider.effectiveProfile.loadCalculation.componentCogFallback.value,
  autoProductSelection: productSelection.selectedMethod,
  autoDisabledSelection: disabledAuto.selectedMethod,
  explicitV2Independent: explicitV2.selectedMethod === EMPIRICAL_LOAD_METHOD,
  exactCogStillUsesV3: exactCog.selectedMethod === EMPIRICAL_LOAD_COG_METHOD,
  offRouteStillFailClosed: offRoute.selectedMethod === null,
  policyHashesCalculationBasis: product.semanticHash !== projectProvider.semanticHash,
  kernelPrerequisiteCoupling: false,
}, null, 2));

function record(entityId, cogClassification, options = {}) {
  const blockers = options.blockers || [];
  return {
    entityId,
    sourceEntityId: entityId,
    entityType: 'VALVE',
    routeId: 'R1',
    currentMethodPointChainageMm: 1000,
    cogClassification,
    cogEvidence: null,
    projection: null,
    candidateChainageMm: options.candidateChainageMm ?? 1000,
    explicitMoment: null,
    integrationEligible: blockers.length === 0,
    integrationDisposition: blockers.length === 0
      ? (cogClassification === EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE
        ? 'COG_CHAINAGE_CANDIDATE_ONLY'
        : 'CURRENT_METHOD_MIDPOINT_PARITY_ONLY')
      : 'BLOCKED_PENDING_POLICY_OR_EVIDENCE',
    blockers,
  };
}

function audit(records) {
  const sorted = [...records].sort((left, right) => left.entityId.localeCompare(right.entityId));
  const base = {
    schema: EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
    datasetId: 'COG-POLICY-QUALIFICATION',
    datasetVersion: 1,
    sourceDatasetHash: 'sha256:test',
    sharedModelSemanticHash: 'fnv1a64:1111111111111111',
    routePartitionModelSemanticHash: 'fnv1a64:2222222222222222',
    projectDataProfileSemanticHash: 'fnv1a64:3333333333333333',
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
