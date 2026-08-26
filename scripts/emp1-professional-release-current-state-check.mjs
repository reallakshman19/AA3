#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256,
  EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION,
  EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION,
} from '../src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requireRelease = process.argv.slice(2).includes('--require-release');
const unknown = process.argv.slice(2).filter((value) => value !== '--require-release');
if (unknown.length) throw gateError(`EMP1_RELEASE_CURRENT_STATE_UNKNOWN_ARGUMENT:${unknown[0]}`);

const current = await readJson('validation/emp1/release/emp1-professional-release-current-state-v1.json');
const frozenReadinessBuffer = await readBuffer('validation/emp1/release/emp1-professional-release-readiness-v1.json');
const frozenReadiness = JSON.parse(frozenReadinessBuffer.toString('utf8'));
const profile = await readJson('validation/emp1/release/emp1-wrc537-gamma5-bounded-release-profile-v1.json');
const p0 = await readJson('validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json');
const caux = await readJson('validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json');
const sourceLedger = await readJson('validation/emp1/wrc537-2013/source-ledger.json');
const authorization = await readJson('validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json');
const disposition = await readJson('validation/emp1/wrc537-2013/gamma5-zero-dp-post-promotion-owner-override-disposition-v1.json');

const candidateQualification = '9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7';
const physicalOracle = '60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18';
const expectedBlockers = [
  'P0_SOURCE_SEMANTICS_NOT_READY',
  'CAUX_DIRECT_PDF_REOBSERVATION_NOT_RUN',
  'PR_D_EVIDENCE_01_TO_10_NOT_GENERATED',
  'PR_F_EVIDENCE_11_TO_12_NOT_GENERATED',
  'ISSUE_54_PRE_STEP_EXECUTION_BLOCKER',
  'PRODUCTION_BUILD_NOT_RUN',
  'CHROMIUM_NOT_RUN',
  'RELEASE_REPLAY_NOT_RUN',
  'DEPLOYMENT_EVIDENCE_NOT_RUN',
];

assert.equal(current.schema, 'emp1-professional-release-current-state/v1');
assert.equal(current.issue, 1389);
assert.equal(current.releaseProfileId, profile.releaseProfileId);
assert.equal(current.currentStateSemanticHash,
  semanticHash(current, ['currentStateSemanticHash', 'status']));
assert.equal(current.status,
  'POST_SEQUENCE_STATE_RECONCILED_RELEASE_REMAINS_BLOCKED_FAIL_CLOSED');
assert.equal(current.reconciliationBasis.mainSha,
  '4c7b5c7e4d4ee1a2144d1764fd15e93813719a19');
assert.equal(current.reconciliationBasis.mainTreeSha,
  '182e5da09af1076b6dd382474ff1638da0d7862b');
assert.equal(current.reconciliationBasis.artifactMayNotClaimContainingCommitAsBasis, true);

// PR-H readiness is intentionally a frozen pre-authorization snapshot.
assert.equal(current.frozenReadinessContract.path,
  'validation/emp1/release/emp1-professional-release-readiness-v1.json');
assert.equal(gitBlobSha(frozenReadinessBuffer), current.frozenReadinessContract.gitBlobSha);
assert.equal(frozenReadiness.schema, 'emp1-professional-release-readiness/v1');
assert.equal(frozenReadiness.currentStateAtFreeze.mainSha,
  current.frozenReadinessContract.freezeMainSha);
assert.equal(frozenReadiness.currentStateAtFreeze.boundedAuthorizationPrE, 'NOT_EXECUTED');
assert.equal(frozenReadiness.authority.productionRouteAuthorized, false);
assert.equal(frozenReadiness.authority.registryRegistered, false);
assert.equal(frozenReadiness.authority.engineeringUseAuthorized, false);
assert.equal(frozenReadiness.authority.globalEmp1CRouteAuthority, false);
assert.equal(frozenReadiness.authority.codeComplianceAuthorized, false);
assert.equal(frozenReadiness.authority.releaseQualified, false);
assert.equal(frozenReadiness.releaseReady, false);
assert.equal(frozenReadiness.state, 'BLOCKED_FAIL_CLOSED');
assert.equal(current.authorityBoundary.frozenReadinessSnapshotMayBeRewrittenAsCurrent, false);

// Release definition remains frozen and non-authorizing in place.
assert.equal(profile.definitionState, 'FROZEN_BEFORE_PRODUCTION_AUTHORIZATION');
assert.equal(profile.releaseAuthority.engineeringUseAuthorized, false);
assert.equal(profile.releaseAuthority.productionUseAuthorized, false);
assert.equal(profile.releaseAuthority.deploymentAuthorized, false);
assert.equal(profile.releaseAuthority.globalEmp1CRouteAuthority, false);
assert.equal(profile.releaseAuthority.releaseQualified, false);
assert.equal(profile.codeCompliance.authorized, false);
assert.equal(profile.productionObservationUsedToChooseDefinition, false);

// Source custody passed; method/application source semantics remain blocked.
assert.equal(sourceLedger.rawPdfSha256, current.sourceState.wrcSourceSha256);
assert.equal(sourceLedger.custodyState, 'VERIFIED');
assert.equal(sourceLedger.qualificationState, 'PASS_SOURCE_CUSTODY');
assert.equal(current.sourceState.wrcSourceCustody, sourceLedger.qualificationState);
assert.equal(p0.state, 'BLOCKED_P0_SOURCE_SEMANTICS');
assert.equal(p0.blockerCount, 9);
assert.equal(p0.gates.length, 9);
assert.ok(p0.gates.every((gate) => String(gate.currentStatus).startsWith('BLOCKED')));
assert.equal(p0.sourceObservation.directPrimaryPageObservationAvailableInCurrentConnectedExecution, false);
assert.equal(current.sourceState.p0SourceSemantics, p0.state);
assert.equal(current.sourceState.p0BlockerCount, p0.blockerCount);
assert.equal(current.sourceState.directPrimaryWrcPageObservationAvailable, false);
assert.equal(caux.source.directPdfPageReobservation, 'NOT_RUN_EXECUTION_ENVIRONMENT');
assert.equal(caux.status,
  'BLOCKED_FINAL_CAUX_SOURCE_QUALIFICATION_DIRECT_PDF_REOBSERVATION_NOT_RUN_REFERENCE_FREEZE_COMPLETE');
assert.equal(current.sourceState.cauxDirectPdfPageReobservation,
  caux.source.directPdfPageReobservation);
assert.equal(current.sourceState.cauxFinalQualification, caux.status);

// Owner override authorization is real bounded source state, not numerical qualification evidence.
assert.equal(authorization.schema,
  'emp1-wrc537-gamma5-bounded-route-owner-override-authorization/v1');
assert.equal(authorization.authorizationChangeApplied, true);
assert.equal(authorization.standardEvidenceContract.satisfied, false);
assert.equal(authorization.standardEvidenceContract.files01Through10, 'NOT_GENERATED');
assert.equal(authorization.standardEvidenceContract.numericalQualification, 'NOT_RUN_NOT_CLAIMED');
assert.equal(authorization.standardEvidenceContract.engineeringPassClaimed, false);
assert.equal(authorization.standardEvidenceContract.standardPostPromotionGateCompatible, false);
assert.equal(authorization.authorizationRecordSemanticHash,
  current.evidenceState.ownerOverrideAuthorizationRecord.semanticHash);
assert.equal(authorization.authorizedIdentity.qualificationRecordSha256, candidateQualification);
assert.equal(authorization.authorizedIdentity.postAuthorityOracleSemanticHash, physicalOracle);
assert.equal(authorization.authorityBoundary.boundedProductionRouteAuthorized, true);
assert.equal(authorization.authorityBoundary.boundedEngineeringUseAuthorized, true);
assert.equal(authorization.authorityBoundary.globalEmp1CRouteAuthority, false);
assert.equal(authorization.authorityBoundary.codeComplianceAuthorized, false);
assert.equal(authorization.authorityBoundary.releaseQualified, false);
assert.equal(current.evidenceState.ownerOverrideAuthorizationRecord.isNumericalPassSubstitute, false);

assert.equal(disposition.schema,
  'emp1-wrc537-gamma5-post-promotion-owner-override-disposition/v1');
assert.equal(disposition.dispositionIsNumericalQualification, false);
assert.equal(disposition.stackedPredecessor.state, 'MERGED_TO_MAIN_BY_SQUASH');
assert.equal(disposition.stackedPredecessor.mergedMainSha,
  '14c648d485cf386f28c6817a068b7eb5da1f7689');
assert.equal(disposition.stackedPredecessor.mergedTreeByteEquivalentToAuditedPrHead, true);
assert.equal(disposition.standardPostPromotionGate.prerequisite08, 'NOT_GENERATED');
assert.equal(disposition.standardPostPromotionGate.prerequisite09, 'NOT_GENERATED');
assert.equal(disposition.standardPostPromotionGate.prerequisite10, 'NOT_GENERATED');
assert.equal(disposition.standardPostPromotionGate.executionState,
  'NOT_RUN_PREDECESSOR_STANDARD_EVIDENCE_CHAIN_ABSENT');
assert.equal(disposition.standardPostPromotionGate.standardReceipt11, 'NOT_GENERATED');
assert.equal(disposition.standardPostPromotionGate.standardFalsifier12, 'NOT_GENERATED');
assert.equal(disposition.standardPostPromotionGate.passClaimed, false);
assert.equal(disposition.standardPostPromotionGate.gateWeakenedOrModified, false);
assert.equal(disposition.dispositionSemanticHash,
  current.evidenceState.ownerOverridePostPromotionDisposition.semanticHash);
assert.equal(current.evidenceState.ownerOverridePostPromotionDisposition.isNumericalQualification, false);

// Current merged runtime authority is bounded only.
const route = EMP1_C_BOUNDED_PRODUCTION_ROUTES.find(
  (entry) => entry.routeId === EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
);
assert.ok(route, 'EMP1_RELEASE_CURRENT_STATE_BOUNDED_ROUTE_REQUIRED');
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED, true);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_QUALIFICATION_SHA256, candidateQualification);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_METHOD_QUALIFICATION.productionUseAuthorized, true);
assert.equal(EMP1_WRC537_GAMMA5_ZERO_DP_BENCHMARK_QUALIFICATION.benchmarkHash, physicalOracle);
assert.equal(EMP1_C_WRC537_GAMMA5_ZERO_DP_QUALIFICATION_SHA256, candidateQualification);
assert.equal(route.registered, true);
assert.equal(route.engineeringUseAuthorized, true);
assert.deepEqual([...route.suspensionReasons], []);
assert.equal(route.globalEmp1CRouteAuthority, false);
assert.equal(route.releaseQualified, false);
assert.equal(route.method.routeRequalificationRequired, false);
assert.equal(current.runtimeAuthority.boundedProductionRouteAuthorized, true);
assert.equal(current.runtimeAuthority.registryRegistered, true);
assert.equal(current.runtimeAuthority.boundedEngineeringUseAuthorized, true);
assert.equal(current.runtimeAuthority.globalEmp1CRouteAuthority, false);
assert.equal(current.runtimeAuthority.codeComplianceAuthorized, false);
assert.equal(current.runtimeAuthority.releaseQualified, false);
assert.equal(current.runtimeAuthority.deploymentAuthorized, false);

assert.equal(current.sequenceStatus.recommendedPrAThroughHDelivered, true);
assert.equal(current.sequenceStatus.definitionOfDoneComplete, false);
assert.equal(current.sequenceStatus.professionalReleaseReady, false);
assert.equal(current.sequenceStatus.issueMayBeClosed, false);
assert.equal(current.evidenceState.standardPreAuthorization01To10, 'NOT_GENERATED');
assert.equal(current.evidenceState.standardPostPromotion11To12, 'NOT_GENERATED');
assert.equal(current.evidenceState.prDNumericalQualification, 'NOT_RUN_NOT_CLAIMED');
assert.equal(current.evidenceState.postPromotionNumericalQualification, 'NOT_RUN_NOT_CLAIMED');
assert.deepEqual(current.currentBlockers, expectedBlockers);
assert.equal(current.releaseReady, false);
assert.equal(current.state, 'BLOCKED_FAIL_CLOSED_POST_SEQUENCE');
assert.equal(current.authorityBoundary.boundedRouteAuthorizationIsProfessionalRelease, false);
assert.equal(current.authorityBoundary.ownerWorkflowSkipIsNumericalQualification, false);
assert.equal(current.authorityBoundary.ownerOverrideRecordsMaySubstituteForStandardEvidence, false);
assert.equal(current.authorityBoundary.releaseMayProceedWithCurrentBlockers, false);

const result = {
  schema: 'emp1-professional-release-current-state-check/v1',
  status: 'PASS_POST_SEQUENCE_RELEASE_STATE_RECONCILED_FAIL_CLOSED',
  reconciliationBasis: current.reconciliationBasis,
  currentStateSemanticHash: current.currentStateSemanticHash,
  phaseAThroughHDelivered: true,
  boundedRuntimeAuthority: {
    productionRouteAuthorized: true,
    registryRegistered: true,
    engineeringUseAuthorized: true,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
  blockers: expectedBlockers,
  releaseReady: false,
};
console.log(JSON.stringify(result, null, 2));
if (requireRelease) process.exit(2);

async function readBuffer(path) {
  return readFile(resolve(root, path));
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.byteLength}\0`, 'utf8');
  return createHash('sha1').update(header).update(buffer).digest('hex');
}
function semanticHash(value, excluded) {
  const omitted = new Set(excluded);
  const payload = Object.fromEntries(
    Object.entries(value).filter(([key]) => !omitted.has(key)),
  );
  return createHash('sha256').update(JSON.stringify(sortValue(payload)), 'utf8').digest('hex');
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function gateError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
