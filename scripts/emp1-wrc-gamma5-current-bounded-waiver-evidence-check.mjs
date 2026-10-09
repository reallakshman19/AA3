#!/usr/bin/env node
/**
 * Independent CURRENT-STATE bounded WRC gamma5/zero-dp evidence.
 *
 * Historical pre-authorization PR-D 01..10 source/replay receipts were
 * explicitly waived, NEVER run or backfilled. The old exact-head predecessor
 * chain remains unqualified; do not interpret this as those missing receipts.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
  emp1CBoundedRoute,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import { evaluateEmp1CQualificationState } from '../src/core/emp1/emp1-c-qualification-state.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const owner = read('validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json');
const disposition = read(
  'validation/emp1/wrc537-2013/gamma5-zero-dp-post-promotion-owner-override-disposition-v1.json');
const frozen = read('validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json');
const candidate = read('validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
const hash = (value) => createHash('sha256').update(canonical(value)).digest('hex');

// Both archived objects retain byte-independent semantic identity; neither
// historical status may be silently rewritten into a successful observation.
assert.equal(hash(frozen.semanticPayload), frozen.semanticHash);
assert.equal(hash(candidate.semanticPayload), candidate.qualificationRecordSha256);
assert.equal(candidate.status, 'CANDIDATE_PENDING_EXECUTABLE_PRODUCTION_REOBSERVATION');
assert.equal(candidate.engineeringAuthority, false);
assert.equal(candidate.reobservation.currentProductionCandidateObserved, false);
assert.equal(candidate.authorization.boundedRouteRegistrationAllowed, false);
assert.equal(owner.schema, 'emp1-wrc537-gamma5-bounded-route-owner-override-authorization/v1');
assert.equal(owner.standardEvidenceContract.satisfied, false);
assert.equal(owner.standardEvidenceContract.githubWorkflowExecution, 'SKIPPED_BY_EXPLICIT_OWNER_DIRECTION');
assert.equal(owner.standardEvidenceContract.files01Through10, 'NOT_GENERATED');
assert.equal(owner.standardEvidenceContract.numericalQualification, 'NOT_RUN_NOT_CLAIMED');
assert.equal(owner.standardEvidenceContract.standardPostPromotionGateCompatible, false);
assert.equal(owner.postPromotionQualification.required, true);
assert.equal(owner.postPromotionQualification.completed, false);
assert.equal(owner.postPromotionQualification.currentExecutionState, 'NOT_RUN');
assert.equal(owner.authorityBoundary.globalEmp1CRouteAuthority, false);
assert.equal(owner.authorityBoundary.codeComplianceAuthorized, false);
assert.equal(owner.authorityBoundary.releaseQualified, false);
assert.equal(disposition.dispositionIsNumericalQualification, false);
assert.equal(disposition.standardPostPromotionGate.passClaimed, false);
assert.equal(disposition.standardFiles11And12CreationPolicy.substituteHandAuthoredFilesAllowed, false);
assert.equal(owner.authorizedIdentity.qualificationRecordSha256, candidate.qualificationRecordSha256);
assert.equal(owner.authorizedIdentity.postAuthorityOracleSemanticHash, frozen.semanticHash);

// Different authorized SOURCE state: 12 approved mutations are independently
// documented by owner record, not inferred from the old candidate flags.
assert.equal(owner.approvedSemanticMutationCount, 12);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, true);
assert.deepEqual(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS, []);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  candidate.qualificationRecordSha256);
assert.equal(EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
  candidate.qualificationRecordSha256);
const route = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
assert.ok(route);
assert.equal(route.registered, true);
assert.equal(route.engineeringUseAuthorized, true);
assert.equal(route.runtimeEligibilityRequired, true);
assert.equal(route.globalEmp1CRouteAuthority, false);
assert.equal(route.releaseQualified, false);
assert.equal(route.method.routeRequalificationRequired, false);
assert.equal(route.scope.interpolationAllowed, false);
assert.equal(route.scope.nonUnityStressConcentrationAuthorized, false);
assert.equal(route.scope.offAxisLongitudinalMomentMaximumAuthorized, false);
const global = evaluateEmp1CQualificationState();
assert.equal(global.engineeringUseAuthorized, false);
assert.equal(global.runAuthorized, false);

console.log(JSON.stringify({
  check: 'emp1-current-bounded-route-post-waiver-source-evidence',
  status: 'PASS_CURRENT_BOUNDED_SOURCE_IDENTITY_HISTORICAL_STANDARD_GATE_REMAINS_OPEN',
  candidateQualificationRecordSha256: candidate.qualificationRecordSha256,
  frozenOracleSemanticHash: frozen.semanticHash,
  historicalEvidenceWaived: true,
  historicalFiles01Through10Present: false,
  historicalPostPromotionGateCompleted: false,
  currentBoundedSourceAuthorized: true,
  currentBoundedRuntimeEligibilityRequired: true,
  globalEmp1CUseAuthorized: false,
  codeComplianceAuthorized: false,
  releaseQualified: false,
  numericalQualificationClaimedByThisSourceEvidenceCheck: false,
}, null, 2));
