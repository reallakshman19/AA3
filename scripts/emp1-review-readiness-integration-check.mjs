#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EMP1_READINESS_OVERALL,
  projectEmp1Readiness,
} from '../src/core/emp1/emp1-readiness-projection.js';
import {
  createEmp1EngineeringReviewRecord,
  projectEmp1EngineeringReviewState,
} from '../src/core/emp1/emp1-engineering-review-record.js';

const currentProjection = projection();
const baseEvidence = evidence();
const acceptedRecord = createEmp1EngineeringReviewRecord({
  disposition: 'ACCEPTED',
  reviewer: { identity: 'reviewer:integration', role: 'ENGINEER' },
  reviewedAt: '2026-09-01T15:50:00Z',
  basisCode: 'EMP1_ENGINEERING_RESULT_REVIEW',
  evidence: baseEvidence,
});
const rejectedRecord = createEmp1EngineeringReviewRecord({
  disposition: 'REJECTED',
  reviewer: { identity: 'reviewer:integration', role: 'ENGINEER' },
  reviewedAt: '2026-09-01T15:51:00Z',
  basisCode: 'EMP1_ENGINEERING_RESULT_REVIEW',
  evidence: baseEvidence,
});
const acceptedState = projectEmp1EngineeringReviewState({
  reviewRecord: acceptedRecord,
  evidence: baseEvidence,
});
const rejectedState = projectEmp1EngineeringReviewState({
  reviewRecord: rejectedRecord,
  evidence: baseEvidence,
});
const notReviewedState = projectEmp1EngineeringReviewState({ reviewRecord: null });
const staleEvidence = structuredClone(baseEvidence);
staleEvidence.routeAuthorityHash = 'ROUTE-2';
staleEvidence.routeAuthoritySnapshot = { semanticHash: 'ROUTE-2' };
const staleState = projectEmp1EngineeringReviewState({
  reviewRecord: acceptedRecord,
  evidence: staleEvidence,
});

const legacyDefault = projectEmp1Readiness(currentProjection);
assert.equal(legacyDefault.review.state, 'NOT_REVIEWED');
assert.equal(legacyDefault.overall, EMP1_READINESS_OVERALL.READY_FOR_ENGINEERING_REVIEW);
assert.equal(legacyDefault.review.authorityEstablished, false);
assert.equal(legacyDefault.review.authorityEstablishedByProjection, false);

const explicitNotReviewed = projectEmp1Readiness(currentProjection, {
  reviewState: notReviewedState,
});
assert.equal(explicitNotReviewed.review.state, 'NOT_REVIEWED');
assert.equal(explicitNotReviewed.overall, EMP1_READINESS_OVERALL.READY_FOR_ENGINEERING_REVIEW);

const accepted = projectEmp1Readiness(currentProjection, { reviewState: acceptedState });
assert.equal(accepted.review.state, 'REVIEW_ACCEPTED');
assert.equal(accepted.review.current, true);
assert.equal(accepted.review.disposition, 'ACCEPTED');
assert.equal(accepted.review.reviewId, acceptedRecord.reviewId);
assert.equal(accepted.overall, EMP1_READINESS_OVERALL.REVIEW_ACCEPTED);
assert.equal(accepted.release.state, 'NOT_QUALIFIED');
assert.equal(accepted.codeCompliance.state, 'NOT_ASSESSED');
assert.equal(accepted.authorityBoundary.createsReviewAuthority, false);
assert.equal(accepted.authorityBoundary.createsCodeCompliance, false);
assert.equal(accepted.authorityBoundary.createsReleaseAuthority, false);

const rejected = projectEmp1Readiness(currentProjection, { reviewState: rejectedState });
assert.equal(rejected.review.state, 'REVIEW_REJECTED');
assert.equal(rejected.review.current, true);
assert.equal(rejected.review.disposition, 'REJECTED');
assert.equal(rejected.overall, EMP1_READINESS_OVERALL.REVIEW_REJECTED);

const staleReview = projectEmp1Readiness(currentProjection, { reviewState: staleState });
assert.equal(staleReview.review.state, 'REVIEW_STALE');
assert.equal(staleReview.review.current, false);
assert.equal(staleReview.review.disposition, 'ACCEPTED');
assert.deepEqual(staleReview.review.changedBindings, ['routeAuthorityHash']);
assert.equal(staleReview.overall, EMP1_READINESS_OVERALL.REVIEW_STALE);

const sourceStale = projectEmp1Readiness(projection({ cState: 'STALE_INPUT' }), {
  reviewState: acceptedState,
});
assert.equal(sourceStale.review.state, 'REVIEW_ACCEPTED');
assert.equal(sourceStale.overall, EMP1_READINESS_OVERALL.SOURCE_STALE,
  'source/currentness failure must take precedence over a retained accepted review');

const authorityStale = projectEmp1Readiness(projection({ cState: 'STALE_AUTHORITY' }), {
  reviewState: acceptedState,
});
assert.equal(authorityStale.overall, EMP1_READINESS_OVERALL.CALCULATION_STALE,
  'calculation authority staleness must take precedence over review state');

const suspended = projectEmp1Readiness(projection({ cState: 'ROUTE_SUSPENDED' }), {
  reviewState: acceptedState,
});
assert.equal(suspended.overall, EMP1_READINESS_OVERALL.METHOD_BLOCKED,
  'method suspension must take precedence over review state');

const readyToCalculate = projectEmp1Readiness(projection({ cState: 'READY_TO_RUN' }), {
  reviewState: acceptedState,
});
assert.equal(readyToCalculate.overall, EMP1_READINESS_OVERALL.READY_TO_CALCULATE,
  'a retained review must not make an uncalculated transaction review-ready');

const existingRelease = projectEmp1Readiness(projection({ releaseQualified: true }), {
  reviewState: acceptedState,
});
assert.equal(existingRelease.overall, EMP1_READINESS_OVERALL.REVIEW_ACCEPTED);
assert.equal(existingRelease.release.state, 'QUALIFIED_BY_EXISTING_RELEASE_BOUNDARY');
assert.equal(existingRelease.release.authorityEstablishedByProjection, false);

assert.throws(
  () => projectEmp1Readiness(currentProjection, {
    reviewState: { ...acceptedState, schema: 'wrong' },
  }),
  (error) => error?.code === 'EMP1_READINESS_REVIEW_STATE_INVALID',
);
assert.throws(
  () => projectEmp1Readiness(currentProjection, {
    reviewState: { ...acceptedState, current: false },
  }),
  (error) => error?.code === 'EMP1_READINESS_REVIEW_STATE_INCONSISTENT',
);
assert.throws(
  () => projectEmp1Readiness(currentProjection, {
    reviewState: { ...staleState, changedBindings: [] },
  }),
  (error) => error?.code === 'EMP1_READINESS_REVIEW_STATE_INCONSISTENT',
);

const readinessSource = readFileSync(
  new URL('../src/core/emp1/emp1-readiness-projection.js', import.meta.url),
  'utf8',
);
assert.equal(readinessSource.includes('semanticHash('), false,
  'readiness must not create/reconstruct review or engineering hashes');
assert.equal(readinessSource.includes('projectEmp1EngineeringReviewState('), false,
  'readiness must consume, not recreate, review currentness');
assert.equal(readinessSource.includes('bindEmp1EngineeringReviewEvidence('), false,
  'readiness must not re-evaluate review evidence bindings');
assert.equal(readinessSource.includes("from './emp1-engineering-review-record.js'"), false,
  'readiness stays schema-composition only and must not become the review producer');
assert.equal(readinessSource.includes('releaseQualified: true'), false,
  'review composition must not create release qualification');

console.log(JSON.stringify({
  schema: 'emp1-review-readiness-integration-check/v1',
  status: 'PASS_REVIEW_STATE_COMPOSED_WITHOUT_REEVALUATION',
  defaultOverall: legacyDefault.overall,
  acceptedOverall: accepted.overall,
  rejectedOverall: rejected.overall,
  staleOverall: staleReview.overall,
  sourceStalePrecedence: sourceStale.overall,
  authorityStalePrecedence: authorityStale.overall,
  methodBlockedPrecedence: suspended.overall,
  reviewAuthorityCreatedByReadiness: false,
  codeComplianceCreatedByReadiness: false,
  releaseAuthorityCreatedByReadiness: false,
}, null, 2));

function projection({ cState = 'CALCULATED_CURRENT', releaseQualified = false } = {}) {
  const calculated = cState === 'CALCULATED_CURRENT';
  const stale = cState === 'STALE_INPUT' || cState === 'STALE_AUTHORITY';
  const ready = cState === 'READY_TO_RUN';
  const suspended = cState === 'ROUTE_SUSPENDED';
  return {
    schema: 'emp1-product-projection/v1',
    product: { productId: 'EMP.1' },
    custody: {},
    qualificationBoundary: {
      emp1CProductionAuthority: suspended ? 'NOT_AUTHORIZED' : 'BOUNDED_ROUTE_ONLY',
      passIsCodeCompliance: false,
      releaseQualified,
    },
    steps: [
      {
        shortId: 'A', stepId: 'EMP.1.A', state: 'CALCULATED', documentLoaded: true,
        resultAvailable: true, retainedResultAvailable: true, blockers: [],
      },
      {
        shortId: 'B', stepId: 'EMP.1.B', state: 'CALCULATED', documentLoaded: true,
        resultAvailable: true, retainedResultAvailable: true, blockers: [],
      },
      {
        shortId: 'C', stepId: 'EMP.1.C', state: cState, documentLoaded: true,
        resultAvailable: calculated,
        retainedResultAvailable: calculated || stale,
        runAuthorized: !suspended,
        blockers: suspended ? ['EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED']
          : stale ? ['EMP1_WORKBENCH_RETAINED_C_STALE'] : ready ? [] : [],
      },
    ],
  };
}

function evidence() {
  const parents = {
    sourceHash: 'SOURCE-1',
    loadTransferResultHash: 'A-1',
    sectionScreeningResultHash: 'B-1',
    localCorrelationResultHash: 'C-1',
  };
  return {
    sourceHash: 'SOURCE-1',
    routeAuthorityHash: 'ROUTE-1',
    routeAuthoritySnapshot: { semanticHash: 'ROUTE-1' },
    result: {
      productId: 'EMP.1',
      loadTransfer: { resultHash: 'A-1' },
      sectionScreening: { resultHash: 'B-1' },
      localCorrelation: { resultHash: 'C-1' },
      assessment: {
        schema: 'emp1-assessment/v1',
        productId: 'EMP.1',
        decision: 'PASS',
        reasons: [],
        parents,
        authority: {
          wrcEngineeringUseAuthorizedByScaffold: false,
          codeComplianceProduced: false,
          releaseQualified: false,
        },
        interpretation: {
          passIsCodeCompliance: false,
          releaseQualified: false,
          localCorrelationRequiredWhenScreeningEscalates: true,
        },
      },
    },
  };
}
