#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION,
  EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
} from '../src/workspace/engineering-loads/empirical-component-load-authority.js';
import {
  createCurrentCommonInputExplicitMomentRetention,
} from '../src/workspace/engineering-loads/current-common-input-explicit-moment-retention.js';
import {
  EMPIRICAL_GRAVITY_AUTO,
  createEmpiricalGravityMethodSelection,
} from '../src/workspace/engineering-loads/empirical-gravity-method-selection.js';
import {
  EMPIRICAL_LOAD_COG_METHOD,
  EMPIRICAL_LOAD_METHOD,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';
import {
  renderEngineeringLoadPane,
} from '../src/workspace/load-calc-current-system-view.js';

const explicitRecord = record('VALVE-M1', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE, {
  explicitMoment: {
    magnitudeNm: 250,
    axis: 'Z',
    magnitudeEvidence: { source: 'SOURCE-MOMENT', field: 'MZ' },
    axisEvidence: { source: 'SOURCE-MOMENT', basis: 'SOURCE_DECLARED' },
  },
  blockers: [{ code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED' }],
});
const explicitAudit = audit([explicitRecord]);
const retention = createCurrentCommonInputExplicitMomentRetention({
  componentAuthorityAudit: explicitAudit,
});

assert.equal(retention.status, 'RETAINED');
assert.equal(retention.records.length, 1);
assert.equal(retention.records[0].demandKind, 'SOURCE_EXPLICIT_POINT_MOMENT');
assert.equal(retention.records[0].entityId, 'VALVE-M1');
assert.equal(retention.records[0].routeId, 'R1');
assert.equal(retention.records[0].applicationChainageMm, 1000);
assert.equal(retention.records[0].axis, 'Z');
assert.equal(retention.records[0].magnitudeNm, 250);
assert.equal(retention.records[0].verticalReactionDistribution, 'NOT_PERFORMED');
assert.equal(retention.numericalVerticalReactionMethodChanged, false);
assert.equal(retention.verticalReactionDistributionPerformed, false);
assert.equal(retention.summary.allUnsupportedExplicitMomentsRetained, true);

const withoutRetention = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentAuthorityAudit: explicitAudit,
});
assert.equal(withoutRetention.selectedMethod, null,
  'source explicit moment must remain fail-closed without exact retention custody');
assert.equal(withoutRetention.selectionState, 'EXCEPTION_POLICY_REQUIRED');

const autoWithRetention = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentAuthorityAudit: explicitAudit,
  explicitMomentRetention: retention,
});
assert.equal(autoWithRetention.selectedMethod, EMPIRICAL_LOAD_METHOD);
assert.equal(autoWithRetention.selectionState,
  'SELECTED_V2_EXPLICIT_MOMENT_RETAINED_SEPARATELY');
assert.equal(autoWithRetention.explicitMomentRetentionSemanticHash, retention.semanticHash);
assert.equal(autoWithRetention.retainedDemandLedger.length, 1);
assert.equal(autoWithRetention.retainedDemandLedger[0].verticalReactionDistribution,
  'NOT_PERFORMED');
assert.deepEqual(autoWithRetention.fallbackLedger, [{
  fromMethod: EMPIRICAL_LOAD_COG_METHOD,
  toMethod: EMPIRICAL_LOAD_METHOD,
  reasonCode: 'EXPLICIT_COMPONENT_MOMENT_RETAINED_SEPARATELY',
  affectedEntityIds: ['VALVE-M1'],
  permittedByPolicy: true,
  retentionSemanticHash: retention.semanticHash,
}]);

const explicitV2 = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_LOAD_METHOD,
  componentAuthorityAudit: explicitAudit,
  explicitMomentRetention: retention,
});
assert.equal(explicitV2.selectedMethod, EMPIRICAL_LOAD_METHOD);
assert.equal(explicitV2.selectionState,
  'EXPLICIT_V2_SELECTED_WITH_SEPARATE_MOMENT_DEMAND');

const explicitV3 = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_LOAD_COG_METHOD,
  componentAuthorityAudit: explicitAudit,
  explicitMomentRetention: retention,
});
assert.equal(explicitV3.selectedMethod, null,
  'explicit V3 must not silently downgrade because a source moment was retained');
assert.equal(explicitV3.selectionState,
  'EXPLICIT_V3_SOURCE_MOMENT_REQUIRES_SEPARATE_V2_DEMAND');

const offRouteAudit = audit([
  record('VALVE-OFF', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.OFF_ROUTE, {
    candidateChainageMm: 1000,
    explicitMoment: explicitRecord.explicitMoment,
    blockers: [
      { code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED' },
      { code: 'EMPIRICAL_COMPONENT_COG_OFF_ROUTE' },
    ],
  }),
]);
const offRouteRetention = createCurrentCommonInputExplicitMomentRetention({
  componentAuthorityAudit: offRouteAudit,
});
assert.equal(offRouteRetention.status, 'RETAINED');
const offRouteSelection = createEmpiricalGravityMethodSelection({
  requestedMethod: EMPIRICAL_GRAVITY_AUTO,
  componentAuthorityAudit: offRouteAudit,
  explicitMomentRetention: offRouteRetention,
});
assert.equal(offRouteSelection.selectedMethod, null,
  'retaining a source moment must not authorize an off-route CoG fallback');
assert.equal(offRouteSelection.fallbackLedger[0].permittedByPolicy, false);

const noMomentRetention = createCurrentCommonInputExplicitMomentRetention({
  componentAuthorityAudit: audit([
    record('VALVE-NONE', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE),
  ]),
});
assert.equal(noMomentRetention.status, 'NOT_APPLICABLE');
assert.equal(noMomentRetention.records.length, 0);

const invalidRetention = createCurrentCommonInputExplicitMomentRetention({
  componentAuthorityAudit: audit([
    record('VALVE-BAD', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE, {
      explicitMoment: { magnitudeNm: 100, axis: '' },
      blockers: [{ code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED' }],
    }),
  ]),
});
assert.equal(invalidRetention.status, 'BLOCKED');
assert.equal(invalidRetention.records.length, 0);
assert.equal(invalidRetention.blockers[0].code,
  'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_INVALID');

const unresolvedLocation = createCurrentCommonInputExplicitMomentRetention({
  componentAuthorityAudit: audit([
    record('VALVE-NO-LOC', EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE, {
      candidateChainageMm: null,
      currentMethodPointChainageMm: null,
      explicitMoment: explicitRecord.explicitMoment,
      blockers: [
        { code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED' },
        { code: 'EMPIRICAL_COMPONENT_ROUTE_CHAINAGE_MISSING' },
      ],
    }),
  ]),
});
assert.equal(unresolvedLocation.status, 'BLOCKED');
assert.equal(unresolvedLocation.records.length, 0,
  'null chainage must never be coerced to a false zero-chainage moment location');
assert.equal(unresolvedLocation.blockers[0].code,
  'CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_LOCATION_UNRESOLVED');

assert.throws(
  () => createEmpiricalGravityMethodSelection({
    requestedMethod: EMPIRICAL_GRAVITY_AUTO,
    componentAuthorityAudit: audit([explicitRecord], 'DIFFERENT-DATASET'),
    explicitMomentRetention: retention,
  }),
  (error) => error?.code === 'EMPIRICAL_GRAVITY_EXPLICIT_MOMENT_RETENTION_AUDIT_MISMATCH',
  'retention from a different authority audit must fail closed',
);

{
  const distribution = {
    status: 'CALCULATED',
    method: EMPIRICAL_LOAD_METHOD,
    freshness: { status: 'CURRENT' },
    blockers: [],
    loadCases: [],
  };
  const execution = {
    requestedMethod: EMPIRICAL_LOAD_METHOD,
    executedMethod: EMPIRICAL_LOAD_METHOD,
    resultStatus: 'CALCULATED_WITH_EXCEPTIONS',
    projectId: 'P-1494',
    datasetId: 'RETENTION-DATASET',
    commonInputSemanticHash: 'fnv1a64:1111111111111111',
    commonInputSealSemanticHash: 'fnv1a64:2222222222222222',
    runAuthorizationSemanticHash: 'fnv1a64:3333333333333333',
    massProjectionSemanticHash: 'fnv1a64:4444444444444444',
    distributionSemanticHash: 'fnv1a64:5555555555555555',
    explicitMomentRetentionSemanticHash: retention.semanticHash,
    explicitMomentRetention: retention,
    semanticHash: 'fnv1a64:6666666666666666',
  };
  const pane = { innerHTML: '' };
  renderEngineeringLoadPane(
    pane,
    distribution,
    { status: 'READY', blockers: [], sites: [] },
    { status: 'READY', blockers: [] },
    null,
    { state: 'NOT_CONFIGURED', calculationEligible: false, details: [] },
    execution,
  );
  assert.match(pane.innerHTML, /Overall result<\/dt><dd>CALCULATED_WITH_EXCEPTIONS/u);
  assert.match(pane.innerHTML, /Vertical reaction distribution<\/dt><dd>CALCULATED/u);
  assert.match(pane.innerHTML, /Retained source-explicit component moments/u);
  assert.match(pane.innerHTML, /VALVE-M1/u);
  assert.match(pane.innerHTML, /250 N·m/u);
  assert.match(pane.innerHTML, /NOT_PERFORMED/u);
  assert.match(pane.innerHTML, /not distributed into vertical reactions/u);
}

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_EXPLICIT_COMPONENT_MOMENT_RETENTION',
  retainedDemandCount: retention.records.length,
  autoSelectedMethod: autoWithRetention.selectedMethod,
  overallFallbackReason: autoWithRetention.fallbackLedger[0].reasonCode,
  verticalReactionDistributionPerformed: retention.verticalReactionDistributionPerformed,
  nullLocationFailsClosed: unresolvedLocation.status === 'BLOCKED',
  presentationSeparatesOverallAndVerticalStatus: true,
  noRetentionFailsClosed: withoutRetention.selectedMethod === null,
  explicitV3StillFailsClosed: explicitV3.selectedMethod === null,
  offRouteStillFailsClosed: offRouteSelection.selectedMethod === null,
}, null, 2));

function record(entityId, cogClassification, options = {}) {
  const blockers = options.blockers || [];
  return {
    entityId,
    sourceEntityId: `SRC-${entityId}`,
    entityType: 'VALVE',
    routeId: hasOwn(options, 'routeId') ? options.routeId : 'R1',
    currentMethodPointChainageMm: hasOwn(options, 'currentMethodPointChainageMm')
      ? options.currentMethodPointChainageMm : 1000,
    cogClassification,
    cogEvidence: options.cogEvidence || null,
    projection: options.projection || null,
    candidateChainageMm: hasOwn(options, 'candidateChainageMm')
      ? options.candidateChainageMm : 1000,
    explicitMoment: options.explicitMoment || null,
    integrationEligible: blockers.length === 0,
    integrationDisposition: blockers.length === 0
      ? 'COG_CHAINAGE_CANDIDATE_ONLY'
      : 'BLOCKED_PENDING_POLICY_OR_EVIDENCE',
    blockers,
  };
}

function audit(records, datasetId = 'RETENTION-DATASET') {
  const sorted = [...records].sort((left, right) => left.entityId.localeCompare(right.entityId));
  const base = {
    schema: EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
    datasetId,
    datasetVersion: 1,
    sourceDatasetHash: 'sha256:retention-test',
    sharedModelSemanticHash: 'fnv1a64:1111111111111111',
    routePartitionModelSemanticHash: 'fnv1a64:2222222222222222',
    projectDataProfileSemanticHash: 'fnv1a64:3333333333333333',
    toleranceMm: 1,
    status: sorted.every((row) => row.integrationEligible)
      ? 'READY_FOR_INTEGRATION_DESIGN' : 'BLOCKED',
    records: sorted,
    blockers: sorted.flatMap((row) => row.blockers.map((item) => ({
      ...item,
      entityId: row.entityId,
      routeId: row.routeId,
    }))),
    summary: {},
    numericalMethodChanged: false,
  };
  return { ...base, semanticHash: semanticHash(base) };
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
