#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  NON_FEA_COMPONENT_COG_FALLBACK,
} from '../src/workspace/project-data/non-fea-component-cog-fallback-policy.js';
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

function audit(records) {
  const sorted = [...records].sort((a, b) => a.entityId.localeCompare(b.entityId));
  const base = {
    schema: EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
    datasetId: 'AUTO-SEL',
    datasetVersion: 1,
    sourceDatasetHash: 'sha256:test',
    sharedModelSemanticHash: 'fnv1a64:1111111111111111',
    routePartitionModelSemanticHash: 'fnv1a64:2222222222222222',
    projectDataProfileSemanticHash: 'fnv1a64:3333333333333333',
    toleranceMm: 1,
    status: sorted.every((row) => row.integrationEligible) ? 'READY_FOR_INTEGRATION_DESIGN' : 'BLOCKED',
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

function select(
  records,
  requestedMethod = EMPIRICAL_GRAVITY_AUTO,
  componentCogFallbackPolicy = NON_FEA_COMPONENT_COG_FALLBACK.GEOMETRIC_MIDPOINT,
) {
  return createEmpiricalGravityMethodSelection({
    requestedMethod,
    componentCogFallbackPolicy,
    componentAuthorityAudit: audit(records),
  });
}

function checkAllCogUsesV3() {
  const result = select([
    record('ELBOW-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
  ]);
  assert.equal(result.selectedMethod, EMPIRICAL_LOAD_COG_METHOD);
  assert.equal(result.selectionState, 'SELECTED_V3_COG');
  assert.equal(result.fallbackLedger.length, 0);
  assert.equal(result.componentCogFallbackPolicy,
    NON_FEA_COMPONENT_COG_FALLBACK.GEOMETRIC_MIDPOINT);
}

function checkMissingCogFallsBackOnlyToV2() {
  const result = select([
    record('ELBOW-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK),
  ]);
  assert.equal(result.selectedMethod, EMPIRICAL_LOAD_METHOD);
  assert.equal(result.selectionState, 'SELECTED_V2_MISSING_COG_FALLBACK');
  assert.equal(result.fallbackLedger.length, 1);
  assert.equal(result.fallbackLedger[0].reasonCode, 'COG_NOT_AVAILABLE');
  assert.equal(result.fallbackLedger[0].permittedByPolicy, true);
  assert.equal(result.fallbackLedger[0].componentCogFallbackPolicy,
    NON_FEA_COMPONENT_COG_FALLBACK.GEOMETRIC_MIDPOINT);
  assert.deepEqual(result.fallbackLedger[0].affectedEntityIds, ['VALVE-1']);
  assert.equal(result.assumptions[0].code, 'GEOMETRIC_MIDPOINT_APPLICATION');
  assert.equal(result.policy.missingCogMayFallbackToV2, true);
}

function checkDisabledPolicyStopsAutoFallback() {
  const result = select([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK),
  ], EMPIRICAL_GRAVITY_AUTO, NON_FEA_COMPONENT_COG_FALLBACK.DISABLED);
  assert.equal(result.selectedMethod, null);
  assert.equal(result.selectionState, 'COG_FALLBACK_DISABLED_BY_POLICY');
  assert.equal(result.policy.componentCogFallback, NON_FEA_COMPONENT_COG_FALLBACK.DISABLED);
  assert.equal(result.policy.missingCogMayFallbackToV2, false);
  assert.deepEqual(result.fallbackLedger, [{
    fromMethod: EMPIRICAL_LOAD_COG_METHOD,
    toMethod: EMPIRICAL_LOAD_METHOD,
    reasonCode: 'COG_FALLBACK_DISABLED_BY_POLICY',
    affectedEntityIds: ['VALVE-1'],
    permittedByPolicy: false,
    componentCogFallbackPolicy: NON_FEA_COMPONENT_COG_FALLBACK.DISABLED,
  }]);
}

function checkExplicitV2RemainsExplicitWhenAutoFallbackDisabled() {
  const result = select([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK),
  ], EMPIRICAL_LOAD_METHOD, NON_FEA_COMPONENT_COG_FALLBACK.DISABLED);
  assert.equal(result.selectedMethod, EMPIRICAL_LOAD_METHOD);
  assert.equal(result.selectionState, 'EXPLICIT_V2_SELECTED');
  assert.equal(result.fallbackLedger.length, 0,
    'explicit V2 is not an AUTO fallback and must not emit an AUTO fallback receipt');
  assert.equal(result.assumptions[0].code, 'GEOMETRIC_MIDPOINT_APPLICATION');
}

function checkUnresolvedPolicyCannotSilentlyFallback() {
  const result = createEmpiricalGravityMethodSelection({
    requestedMethod: EMPIRICAL_GRAVITY_AUTO,
    componentAuthorityAudit: audit([
      record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.MIDPOINT_FALLBACK),
    ]),
  });
  assert.equal(result.selectedMethod, null);
  assert.equal(result.selectionState, 'COG_FALLBACK_POLICY_REQUIRED');
  assert.equal(result.policy.missingCogMayFallbackToV2, false);
  assert.equal(result.fallbackLedger[0].reasonCode, 'COG_FALLBACK_POLICY_REQUIRED');
  assert.equal(result.fallbackLedger[0].permittedByPolicy, false);
}

function checkKnownOffRouteCogCannotDisappearIntoV2() {
  const result = select([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.OFF_ROUTE, {
      candidateChainageMm: null,
      blockers: [{ code: 'EMPIRICAL_COMPONENT_COG_OFF_ROUTE' }],
    }),
  ]);
  assert.equal(result.selectedMethod, null);
  assert.equal(result.selectionState, 'EXCEPTION_POLICY_REQUIRED');
  assert.equal(result.fallbackLedger[0].permittedByPolicy, false);
  assert.equal(result.fallbackLedger[0].reasonCode,
    'KNOWN_ECCENTRICITY_OR_UNQUALIFIED_COMPONENT_EVIDENCE');
  const v2 = result.candidates.find((row) => row.methodId === EMPIRICAL_LOAD_METHOD);
  assert.equal(v2.inputState, 'FALLBACK_PROHIBITED_BY_KNOWN_EVIDENCE');
}

function checkExplicitMomentCannotFallback() {
  const result = select([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE, {
      explicitMoment: { magnitudeNm: 250, axis: 'Z' },
      blockers: [{ code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED' }],
    }),
  ]);
  assert.equal(result.selectedMethod, null);
  assert.equal(result.exceptions[0].explicitMomentNm, 250);
}

function checkExplicitV2StillCannotEraseKnownEccentricity() {
  const result = select([
    record('VALVE-1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.AMBIGUOUS, {
      candidateChainageMm: null,
      blockers: [{ code: 'EMPIRICAL_COMPONENT_COG_ROUTE_AMBIGUOUS' }],
    }),
  ], EMPIRICAL_LOAD_METHOD);
  assert.equal(result.selectedMethod, null);
  assert.equal(result.selectionState, 'EXPLICIT_V2_FALLBACK_PROHIBITED_BY_KNOWN_EVIDENCE');
}

function checkBeamContactRemainsSeparateRestrictedFamily() {
  const result = select([]);
  assert.equal(result.selectedMethod, EMPIRICAL_LOAD_METHOD);
  const beam = result.candidates.find((row) => row.methodId === 'EMPIRICAL_BEAM_CONTACT_V1');
  assert.equal(beam.applicability, 'SEPARATE_RESTRICTED_MECHANICS_FAMILY');
  assert.equal(beam.selected, false);
  assert.match(beam.reason, /planarity/);
}

checkAllCogUsesV3();
checkMissingCogFallsBackOnlyToV2();
checkDisabledPolicyStopsAutoFallback();
checkExplicitV2RemainsExplicitWhenAutoFallbackDisabled();
checkUnresolvedPolicyCannotSilentlyFallback();
checkKnownOffRouteCogCannotDisappearIntoV2();
checkExplicitMomentCannotFallback();
checkExplicitV2StillCannotEraseKnownEccentricity();
checkBeamContactRemainsSeparateRestrictedFamily();

console.log('Empirical gravity method-selection check: PASS');
