import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EMP1_ENGINEERING_REVIEW_RECORD_SCHEMA,
  EMP1_ENGINEERING_REVIEW_STATES,
  bindEmp1EngineeringReviewEvidence,
  createEmp1EngineeringReviewRecord,
  isEmp1EngineeringReviewCurrent,
  projectEmp1EngineeringReviewState,
  requireEmp1EngineeringReviewRecord,
} from '../src/core/emp1/emp1-engineering-review-record.js';

const baseEvidence = evidence();
const binding = bindEmp1EngineeringReviewEvidence(baseEvidence);
assert.equal(binding.sourceHash, 'SOURCE-1');
assert.equal(binding.loadTransferResultHash, 'A-1');
assert.equal(binding.sectionScreeningResultHash, 'B-1');
assert.equal(binding.localCorrelationResultHash, 'C-1');
assert.equal(binding.routeAuthorityHash, 'ROUTE-1');
assert.match(binding.assessmentSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(Object.isFrozen(binding), true);

const accepted = createEmp1EngineeringReviewRecord({
  disposition: 'ACCEPTED',
  reviewer: { identity: 'reviewer:alice', role: 'ENGINEER' },
  reviewedAt: '2026-09-01T15:30:00Z',
  basisCode: 'EMP1_ENGINEERING_RESULT_REVIEW',
  comment: 'Reviewed bounded calculation evidence and limitations.',
  evidence: baseEvidence,
});
assert.equal(accepted.schema, EMP1_ENGINEERING_REVIEW_RECORD_SCHEMA);
assert.equal(accepted.disposition, 'ACCEPTED');
assert.equal(accepted.reviewer.identity, 'reviewer:alice');
assert.equal(accepted.interpretation.engineeringReviewAttestation, true);
assert.equal(accepted.interpretation.cryptographicSignature, false);
assert.equal(accepted.interpretation.professionalDigitalSeal, false);
assert.equal(accepted.interpretation.acceptanceIsCodeCompliance, false);
assert.equal(accepted.interpretation.acceptanceIsReleaseQualification, false);
assert.equal(accepted.interpretation.acceptanceCreatesMethodAuthority, false);
assert.equal(accepted.interpretation.acceptanceCreatesApplicabilityAuthority, false);
assert.equal(accepted.interpretation.acceptanceCreatesNumericalAuthority, false);
assert.match(accepted.reviewId, /^emp1-engineering-review:[0-9a-f]{16}$/u);
assert.match(accepted.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(Object.isFrozen(accepted), true);
assert.equal(Object.isFrozen(accepted.evidenceBinding), true);
assert.equal(Object.isFrozen(accepted.reviewer), true);

const required = requireEmp1EngineeringReviewRecord(accepted);
assert.equal(required.semanticHash, accepted.semanticHash);
assert.equal(required.reviewId, accepted.reviewId);

const currentAccepted = projectEmp1EngineeringReviewState({
  reviewRecord: accepted,
  evidence: baseEvidence,
});
assert.equal(currentAccepted.state, EMP1_ENGINEERING_REVIEW_STATES.ACCEPTED);
assert.equal(currentAccepted.reviewed, true);
assert.equal(currentAccepted.current, true);
assert.deepEqual(currentAccepted.changedBindings, []);
assert.equal(currentAccepted.authorityBoundary.reviewStateOnly, true);
assert.equal(currentAccepted.authorityBoundary.createsSourceAuthority, false);
assert.equal(currentAccepted.authorityBoundary.createsMethodAuthority, false);
assert.equal(currentAccepted.authorityBoundary.createsApplicabilityAuthority, false);
assert.equal(currentAccepted.authorityBoundary.createsNumericalAuthority, false);
assert.equal(currentAccepted.authorityBoundary.createsCodeCompliance, false);
assert.equal(currentAccepted.authorityBoundary.createsReleaseAuthority, false);
assert.equal(currentAccepted.authorityBoundary.createsCryptographicSeal, false);
assert.equal(isEmp1EngineeringReviewCurrent(accepted, baseEvidence), true);

const rejected = createEmp1EngineeringReviewRecord({
  disposition: 'REJECTED',
  reviewer: { identity: 'reviewer:bob' },
  reviewedAt: '2026-09-01T15:31:00Z',
  basisCode: 'EMP1_ENGINEERING_RESULT_REVIEW',
  comment: 'Evidence requires correction before acceptance.',
  evidence: baseEvidence,
});
const currentRejected = projectEmp1EngineeringReviewState({
  reviewRecord: rejected,
  evidence: baseEvidence,
});
assert.equal(currentRejected.state, EMP1_ENGINEERING_REVIEW_STATES.REJECTED);
assert.equal(currentRejected.current, true);

const notReviewed = projectEmp1EngineeringReviewState({ reviewRecord: null });
assert.equal(notReviewed.state, EMP1_ENGINEERING_REVIEW_STATES.NOT_REVIEWED);
assert.equal(notReviewed.reviewed, false);
assert.equal(notReviewed.current, false);

assertStale(accepted, changedEvidence(baseEvidence, (next) => {
  next.sourceHash = 'SOURCE-2';
  next.result.assessment.parents.sourceHash = 'SOURCE-2';
}), 'sourceHash');
assertStale(accepted, changedEvidence(baseEvidence, (next) => {
  next.result.loadTransfer.resultHash = 'A-2';
  next.result.assessment.parents.loadTransferResultHash = 'A-2';
}), 'loadTransferResultHash');
assertStale(accepted, changedEvidence(baseEvidence, (next) => {
  next.result.sectionScreening.resultHash = 'B-2';
  next.result.assessment.parents.sectionScreeningResultHash = 'B-2';
}), 'sectionScreeningResultHash');
assertStale(accepted, changedEvidence(baseEvidence, (next) => {
  next.result.localCorrelation.resultHash = 'C-2';
  next.result.assessment.parents.localCorrelationResultHash = 'C-2';
}), 'localCorrelationResultHash');
assertStale(accepted, changedEvidence(baseEvidence, (next) => {
  next.result.assessment.reasons = ['ENGINEERING_EVIDENCE_CHANGED'];
}), 'assessmentSemanticHash');
assertStale(accepted, changedEvidence(baseEvidence, (next) => {
  next.routeAuthorityHash = 'ROUTE-2';
  next.routeAuthoritySnapshot.semanticHash = 'ROUTE-2';
}), 'routeAuthorityHash');

assert.throws(
  () => requireEmp1EngineeringReviewRecord({ ...accepted, disposition: 'REJECTED' }),
  /EMP1_ENGINEERING_REVIEW_RECORD_IDENTITY_MISMATCH/u,
);
assert.throws(
  () => createEmp1EngineeringReviewRecord({
    disposition: 'APPROVED',
    reviewer: { identity: 'reviewer:test' },
    reviewedAt: '2026-09-01T15:32:00Z',
    basisCode: 'TEST',
    evidence: baseEvidence,
  }),
  /EMP1_ENGINEERING_REVIEW_DISPOSITION_UNSUPPORTED/u,
);
assert.throws(
  () => bindEmp1EngineeringReviewEvidence(changedEvidence(baseEvidence, (next) => {
    next.result.loadTransfer.resultHash = 'A-MISMATCH';
  })),
  /ASSESSMENT_PARENT_MISMATCH/u,
);
assert.throws(
  () => bindEmp1EngineeringReviewEvidence(changedEvidence(baseEvidence, (next) => {
    next.routeAuthorityHash = 'ROUTE-MISMATCH';
  })),
  /EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_HASH_MISMATCH/u,
);
assert.throws(
  () => bindEmp1EngineeringReviewEvidence(changedEvidence(baseEvidence, (next) => {
    delete next.routeAuthoritySnapshot;
  })),
  /EMP1_ENGINEERING_REVIEW_ROUTE_AUTHORITY_SNAPSHOT_REQUIRED/u,
);
assert.throws(
  () => createEmp1EngineeringReviewRecord({
    disposition: 'ACCEPTED',
    reviewer: {},
    reviewedAt: '2026-09-01T15:32:00Z',
    basisCode: 'TEST',
    evidence: baseEvidence,
  }),
  /EMP1_ENGINEERING_REVIEW_REVIEWER_IDENTITY_REQUIRED/u,
);

const source = readFileSync(
  new URL('../src/core/emp1/emp1-engineering-review-record.js', import.meta.url),
  'utf8',
);
assert.equal(source.includes("from '../shared-primitives/canonical-json.js'"), true);
assert.equal(source.includes('runEmp1('), false);
assert.equal(source.includes('emp1-wrc'), false);
assert.equal(source.includes('evaluateEmp1Wrc537'), false);
assert.equal(source.includes('reconstructResultHashes'), false);
assert.equal(source.includes('releaseQualified: true'), false);
assert.equal(source.includes('codeComplianceProduced: true'), false);
assert.equal(source.includes('professionalDigitalSeal: true'), false);
assert.equal(source.includes('createsReleaseAuthority: true'), false);
assert.equal(source.includes('createsCodeCompliance: true'), false);

console.log(JSON.stringify({
  schema: 'emp1-engineering-review-record-check/v1',
  status: 'PASS_IMMUTABLE_HASH_BOUND_ENGINEERING_REVIEW_ATTESTATION',
  acceptedState: currentAccepted.state,
  rejectedState: currentRejected.state,
  notReviewedState: notReviewed.state,
  staleState: EMP1_ENGINEERING_REVIEW_STATES.STALE,
  boundIdentities: [
    'sourceHash',
    'loadTransferResultHash',
    'sectionScreeningResultHash',
    'localCorrelationResultHash',
    'assessmentSemanticHash',
    'routeAuthorityHash',
  ],
  routeAuthoritySnapshotRequired: true,
  reviewAcceptanceCreatesCodeCompliance: false,
  reviewAcceptanceCreatesReleaseQualification: false,
  cryptographicSealClaimed: false,
}, null, 2));

function assertStale(reviewRecord, nextEvidence, changedBinding) {
  const projected = projectEmp1EngineeringReviewState({
    reviewRecord,
    evidence: nextEvidence,
  });
  assert.equal(projected.state, EMP1_ENGINEERING_REVIEW_STATES.STALE);
  assert.equal(projected.current, false);
  assert.equal(projected.disposition, reviewRecord.disposition);
  assert.equal(projected.changedBindings.includes(changedBinding), true);
  assert.equal(isEmp1EngineeringReviewCurrent(reviewRecord, nextEvidence), false);
}

function evidence() {
  return {
    sourceHash: 'SOURCE-1',
    routeAuthorityHash: 'ROUTE-1',
    routeAuthoritySnapshot: {
      schema: 'emp1-workbench-route-authority-snapshot/v1',
      semanticHash: 'ROUTE-1',
    },
    result: {
      productId: 'EMP.1',
      loadTransfer: { qualification: 'PASS', resultHash: 'A-1', reasons: [] },
      sectionScreening: {
        qualification: 'PASS', decision: 'ESCALATE', resultHash: 'B-1', reasons: [],
      },
      localCorrelation: {
        qualification: 'PASS', decision: 'PASS', state: 'CALCULATED', resultHash: 'C-1', reasons: [],
      },
      assessment: {
        schema: 'emp1-assessment/v1',
        productId: 'EMP.1',
        decision: 'PASS',
        reasons: [],
        parents: {
          sourceHash: 'SOURCE-1',
          loadTransferResultHash: 'A-1',
          sectionScreeningResultHash: 'B-1',
          localCorrelationResultHash: 'C-1',
        },
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

function changedEvidence(value, mutate) {
  const next = structuredClone(value);
  mutate(next);
  return next;
}
