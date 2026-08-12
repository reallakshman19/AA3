import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BM4L_L13_STATE_TRACE_REVIEW_STATUS,
  reviewBm4lL13StateTraceEvidence,
} from '../src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-engineering-review.js';

const traceContract = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-state-trace-contract.json');
const reviewContract = readJson('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-state-trace-review-contract.json');

const inputArg = process.argv.find((arg) => arg.startsWith('--input='));
if (inputArg) {
  const inputPath = inputArg.slice('--input='.length);
  if (!inputPath) throw new Error('--input requires a JSON path');
  const trace = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const review = reviewBm4lL13StateTraceEvidence(trace, reviewContract);
  console.log(JSON.stringify(review, null, 2));
  process.exit(review.status === BM4L_L13_STATE_TRACE_REVIEW_STATUS.READY_FOR_ENGINEERING_JUDGMENT ? 0 : 2);
}

assert.equal(reviewContract.schema, 'm047-bm4l-l13-state-trace-review-contract/v1');
assert.equal(reviewContract.sourceStage.pr, 1079);
assert.equal(reviewContract.sourceStage.head, '69ad5414ef8932f0be12b224ee544d0b67f9c985');
assert.equal(reviewContract.knownControls.coefficientOfFriction, 0.3);
assert.equal(reviewContract.knownControls.frictionNormalForceVariation, 0.15);
assert.equal(reviewContract.knownControls.frictionAngleVariationDeg, 15);
assert.equal(reviewContract.authorityFirewall.reviewMayAuthorizeProductionMechanics, false);
assert.equal(reviewContract.authorityFirewall.reviewMayAuthorizeL13Rescore, false);

const frictionKeys = traceContract.friction.nodeIds.map((node) => `FRICTION:${node}`);
const gapKeys = traceContract.positiveGapRows.map((row) => row.restraintKey);
const trace = {
  schema: 'm047-bm4l-l13-state-trace/v1',
  source: {
    benchmarkId: 'BM4_L',
    caseId: 'L13',
    capturedFromProduct: true,
    captureMode: 'INCORE_SOLVER_AND_ACTIVE_BOUNDARY_CONDITIONS',
    finalResponseUsedToSelectState: false,
  },
  product: { name: 'CAESAR II', version: '14.00.00.0910', build: '231113' },
  inputCustody: {
    accdbSha256: traceContract.inputCustody.accdbSha256,
    traceFileName: 'synthetic-authority-firewall-capture.zip',
    traceSha256: 'c'.repeat(64),
  },
  iterations: [
    makeIteration(1, false, 2, {
      sliding: false,
      normalN: 1000,
      frictionN: 100,
      direction: null,
      firstTransitionReferenceDirectionGlobal: null,
      gapClosed: false,
      stateEvents: [],
    }),
    makeIteration(2, false, 1, {
      sliding: true,
      normalN: 1000,
      frictionN: 300,
      direction: [1, 0, 0],
      firstTransitionReferenceDirectionGlobal: [1, 0, 0],
      gapClosed: true,
      stateEvents: [
        {
          ordinal: 1,
          restraintKey: gapKeys[0],
          eventType: 'CONTACT_STATE_CHANGE',
          from: 'OPEN',
          to: 'CLOSED',
        },
        {
          ordinal: 2,
          restraintKey: 'FRICTION:20030',
          eventType: 'FRICTION_STATE_CHANGE',
          from: 'STICK',
          to: 'SLIDING',
        },
      ],
    }),
    makeIteration(3, true, 0, {
      sliding: true,
      normalN: 1200,
      frictionN: 360,
      direction: [0, 1, 0],
      firstTransitionReferenceDirectionGlobal: null,
      gapClosed: true,
      stateEvents: [],
    }),
  ],
};

const review = reviewBm4lL13StateTraceEvidence(trace, reviewContract);
assert.equal(review.status, BM4L_L13_STATE_TRACE_REVIEW_STATUS.READY_FOR_ENGINEERING_JUDGMENT);
assert.deepEqual(review.blockerCodes, []);
assert.equal(review.observations.firstSlideTransitions.length, 1);
const firstSlide = review.observations.firstSlideTransitions[0];
assert.equal(firstSlide.restraintKey, 'FRICTION:20030');
assert.equal(firstSlide.transitionIteration, 2);
assert.ok(Math.abs(firstSlide.priorLimitRatio - (1 / 3)) < 1e-12);
assert.equal(firstSlide.currentLimitRatio, 1);
assert.equal(firstSlide.currentSlidingForceResidualUsingPriorNormalN, 0);
assert.equal(firstSlide.currentSlidingForceResidualUsingCurrentNormalN, 0);
assert.equal(firstSlide.productObservedReferenceDirectionPresent, true);
assert.ok(Math.abs(firstSlide.firstTransitionDirectionChangeDeg) < 1e-12);

assert.equal(review.observations.slidingNormalForcePairs.length, 1);
const normalPair = review.observations.slidingNormalForcePairs[0];
assert.equal(normalPair.restraintKey, 'FRICTION:20030');
assert.equal(normalPair.iteration, 3);
assert.ok(Math.abs(normalPair.normalForceRelativeChange - 0.2) < 1e-12);
assert.equal(normalPair.thresholdExceeded, true);
assert.ok(Math.abs(normalPair.frictionResistanceRelativeChange - 0.2) < 1e-12);
assert.equal(normalPair.currentSlidingForceResidualUsingPriorNormalN, 60);
assert.equal(normalPair.currentSlidingForceResidualUsingCurrentNormalN, 0);

assert.equal(review.observations.slidingDirectionPairs.length, 1);
assert.ok(Math.abs(review.observations.slidingDirectionPairs[0].directionChangeDeg - 90) < 1e-12);
assert.equal(review.observations.slidingDirectionPairs[0].configuredAngleControlAppliesToThisPair, false);
assert.equal(review.observations.subIterationStateEvents.length, 2);

const richOrdering = review.observations.contactFrictionOrdering
  .find((row) => row.nodeId === '20030');
assert.equal(richOrdering.relation, 'CONTACT_SUBITERATION_EVENT_BEFORE_FRICTION_EVENT');
assert.equal(richOrdering.contactEventOrdinal, 1);
assert.equal(richOrdering.frictionEventOrdinal, 2);
assert.equal(richOrdering.subIterationEvidencePresent, true);
assert.equal(review.closure.stickToSlidingTransitionIterationsObserved, true);
assert.equal(review.closure.nextIterationSlidingForceBasisReviewable, true);
assert.equal(review.closure.normalForceUpdateBasisReviewable, true);
assert.equal(review.closure.subsequentSlidingDirectionHistoryReviewable, true);
assert.equal(review.closure.firstSlide15DegreeHandlingReviewable, true);
assert.equal(review.closure.withinIterationCommitOrderingResolved, true);
assert.deepEqual(review.closure.unresolvedEvidence, []);
assert.equal(review.closure.uniqueCaesarStateAlgorithmEstablished, false);
assert.equal(review.authority.productionMechanicsAuthorized, false);
assert.equal(review.authority.l13RescoreAuthorized, false);
assert.equal(review.authority.responseFittingPermitted, false);

const sparseTrace = structuredClone(trace);
const sparseTransitionRow = sparseTrace.iterations[1].restraints
  .find((row) => row.restraintKey === 'FRICTION:20030');
sparseTransitionRow.firstTransitionReferenceDirectionGlobal = null;
sparseTrace.iterations[1].stateEvents = [];
const sparseReview = reviewBm4lL13StateTraceEvidence(sparseTrace, reviewContract);
assert.equal(sparseReview.status, BM4L_L13_STATE_TRACE_REVIEW_STATUS.READY_FOR_ENGINEERING_JUDGMENT);
assert.equal(sparseReview.closure.firstSlide15DegreeHandlingReviewable, false);
assert.equal(sparseReview.closure.withinIterationCommitOrderingResolved, false);
assert.ok(sparseReview.closure.unresolvedEvidence.includes('FIRST_SLIDE_15_DEGREE_REFERENCE_DIRECTION_NOT_CAPTURED'));
assert.ok(sparseReview.closure.unresolvedEvidence.includes('SAME_ITERATION_CONTACT_FRICTION_EVENTS_REQUIRE_SUBITERATION_ORDER_EVIDENCE'));
const sparseOrdering = sparseReview.observations.contactFrictionOrdering
  .find((row) => row.nodeId === '20030');
assert.equal(sparseOrdering.relation, 'SAME_RECORDED_ITERATION_SUBITERATION_ORDER_UNRESOLVED');

const unconverged = structuredClone(trace);
unconverged.iterations.at(-1).converged = false;
const blocked = reviewBm4lL13StateTraceEvidence(unconverged, reviewContract);
assert.equal(blocked.status, BM4L_L13_STATE_TRACE_REVIEW_STATUS.BLOCKED_EVIDENCE);
assert.ok(blocked.blockerCodes.includes('FINAL_CONVERGED_ITERATION_REQUIRED'));
assert.equal(blocked.authority.productionMechanicsAuthorized, false);

console.log('PASS M047 BM4_L F2.8 exact product state-trace engineering review reducer');
console.log('PASS prior-vs-current muN residual pairing, 0.15 threshold evidence, first-transition direction evidence, and ordered sub-iteration state events');
console.log('PASS sparse optional evidence remains reviewable but explicitly unresolved; no mechanics promotion');
console.log('historical L13 remains 1719/1914 = 89.81191222570533%; review cannot rescore');

function makeIteration(iteration, converged, unconvergedRestraintCount, options) {
  const restraints = frictionKeys.map((key) => {
    const target = key === 'FRICTION:20030';
    const sliding = target && options.sliding;
    return {
      restraintKey: key,
      contactState: 'ACTIVE',
      frictionState: sliding ? 'SLIDING' : 'STICK',
      normalReactionN: target ? options.normalN : 1000,
      frictionResistanceN: target ? options.frictionN : 100,
      frictionDirectionGlobal: sliding ? options.direction : null,
      firstTransitionReferenceDirectionGlobal: target
        ? options.firstTransitionReferenceDirectionGlobal
        : null,
    };
  });
  for (const [index, key] of gapKeys.entries()) {
    restraints.push({
      restraintKey: key,
      contactState: index === 0 && options.gapClosed ? 'CLOSED' : 'OPEN',
      frictionState: 'NOT_APPLICABLE',
    });
  }
  return {
    iteration,
    converged,
    unconvergedRestraintCount,
    restraints,
    stateEvents: options.stateEvents,
  };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}
