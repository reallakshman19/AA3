import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildBm4lL13StateTraceCaptureTemplate,
  sealBm4lL13StateTraceCapture,
} from '../src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-capture.js';
import {
  BM4L_L13_STATE_TRACE_EVIDENCE_STATUS,
  assessBm4lL13StateTraceEvidence,
} from '../src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-evidence-gate.js';

const contract = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-state-trace-contract.json', import.meta.url),
  'utf8',
));
validateContract(contract);

const inputArg = process.argv.find((arg) => arg.startsWith('--input='));
if (inputArg) {
  const inputPath = inputArg.slice('--input='.length);
  if (!inputPath) throw new Error('--input requires a JSON path');
  const evidence = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const assessment = assessBm4lL13StateTraceEvidence(evidence);
  console.log(JSON.stringify(assessment, null, 2));
  process.exit(assessment.status === BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.READY_FOR_ENGINEERING_REVIEW ? 0 : 2);
}

const frictionKeys = contract.friction.nodeIds.map((node) => `FRICTION:${node}`);
const gapKeys = contract.positiveGapRows.map((row) => row.restraintKey);

const worksheet = buildBm4lL13StateTraceCaptureTemplate(contract, { iterationCount: 3 });
assert.equal(worksheet.source.capturedFromProduct, false);
assert.equal(worksheet.iterations.length, 3);
assert.equal(worksheet.iterations[0].restraints.length, 32);
assert.deepEqual(
  worksheet.iterations[0].restraints.slice(0, 26).map((row) => row.restraintKey),
  frictionKeys,
);
assert.deepEqual(
  worksheet.iterations[0].restraints.slice(26).map((row) => row.restraintKey),
  gapKeys,
);
assert.equal(worksheet.iterations[0].restraints[0].firstTransitionReferenceDirectionGlobal, null);
assert.deepEqual(worksheet.iterations[0].stateEvents, []);
assert.equal(worksheet.inputCustody.traceSha256, null);

const sealedWorksheet = sealBm4lL13StateTraceCapture(worksheet, {
  traceFileName: 'bm4l-l13-incore-active-boundary-capture.zip',
  traceSha256: 'b'.repeat(64),
});
assert.equal(sealedWorksheet.source.capturedFromProduct, true);
assert.equal(sealedWorksheet.inputCustody.traceFileName, 'bm4l-l13-incore-active-boundary-capture.zip');
assert.equal(sealedWorksheet.inputCustody.traceSha256, 'b'.repeat(64));
const blockedUnfilledWorksheet = assessBm4lL13StateTraceEvidence(sealedWorksheet);
assert.equal(blockedUnfilledWorksheet.status, BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(blockedUnfilledWorksheet.blockerCodes.includes('ITERATION_CONVERGENCE_FLAG_REQUIRED'));
assert.equal(blockedUnfilledWorksheet.authority.productionMechanicsAuthorized, false);
assert.equal(blockedUnfilledWorksheet.authority.l13RescoreAuthorized, false);

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
    accdbSha256: contract.inputCustody.accdbSha256,
    traceFileName: 'bm4l-l13-state-trace.json',
    traceSha256: 'a'.repeat(64),
  },
  iterations: [
    makeIteration(1, false, 2, {
      gapClosed: false,
      slidingNode: null,
      stateEvents: [],
    }),
    makeIteration(2, true, 0, {
      gapClosed: true,
      slidingNode: '20090',
      firstTransitionReferenceDirectionGlobal: [0, 1, 0],
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
          restraintKey: 'FRICTION:20090',
          eventType: 'FRICTION_STATE_CHANGE',
          from: 'STICK',
          to: 'SLIDING',
        },
      ],
    }),
  ],
};

const ready = assessBm4lL13StateTraceEvidence(trace);
assert.equal(ready.status, BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.READY_FOR_ENGINEERING_REVIEW);
assert.deepEqual(ready.blockerCodes, []);
assert.equal(ready.custody.iterationCount, 2);
assert.equal(ready.custody.frictionSiteCountRequired, 26);
assert.equal(ready.custody.gapRowCountRequired, 6);
assert.equal(ready.transitions.contactStateChanges.length, 1);
assert.equal(ready.transitions.contactStateChanges[0].restraintKey, gapKeys[0]);
assert.equal(ready.transitions.frictionStateChanges.length, 1);
assert.equal(ready.transitions.frictionStateChanges[0].restraintKey, 'FRICTION:20090');
assert.equal(ready.transitions.frictionStateChanges[0].to, 'SLIDING');
assert.equal(ready.transitions.perIterationFrictionUpdates.length, 26);
assert.equal(ready.transitions.subIterationStateEvents.length, 2);
assert.deepEqual(
  ready.transitions.subIterationStateEvents.map((event) => [event.ordinal, event.eventType]),
  [[1, 'CONTACT_STATE_CHANGE'], [2, 'FRICTION_STATE_CHANGE']],
);
const slideUpdate = ready.transitions.perIterationFrictionUpdates
  .find((row) => row.restraintKey === 'FRICTION:20090');
assert.ok(slideUpdate.normalForceRelativeChange > 0.19);
assert.ok(slideUpdate.frictionResistanceRelativeChange > 2.5);
assert.equal(slideUpdate.directionChangeDeg, null);
assert.equal(ready.authority.stateTraceMeasurementAuthorized, true);
assert.equal(ready.authority.engineeringReviewRequired, true);
assert.equal(ready.authority.productionMechanicsAuthorized, false);
assert.equal(ready.authority.l13RescoreAuthorized, false);

const finalOnly = structuredClone(trace);
finalOnly.iterations = [finalOnly.iterations[1]];
finalOnly.iterations[0].iteration = 1;
const blockedFinalOnly = assessBm4lL13StateTraceEvidence(finalOnly);
assert.equal(blockedFinalOnly.status, BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(blockedFinalOnly.blockerCodes.includes('MULTI_ITERATION_TRACE_REQUIRED'));

const fitted = structuredClone(trace);
fitted.source.finalResponseUsedToSelectState = true;
const blockedFitted = assessBm4lL13StateTraceEvidence(fitted);
assert.equal(blockedFitted.status, BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(blockedFitted.blockerCodes.includes('FINAL_RESPONSE_STATE_SELECTION_PROHIBITED'));

const incomplete = structuredClone(trace);
incomplete.iterations[0].restraints = incomplete.iterations[0].restraints
  .filter((row) => row.restraintKey !== 'FRICTION:20250');
const blockedIncomplete = assessBm4lL13StateTraceEvidence(incomplete);
assert.ok(blockedIncomplete.blockerCodes.includes('ALL_26_FRICTION_SITES_REQUIRED_EACH_ITERATION'));

const badEventOrder = structuredClone(trace);
badEventOrder.iterations[1].stateEvents[1].ordinal = 1;
const blockedBadEventOrder = assessBm4lL13StateTraceEvidence(badEventOrder);
assert.ok(blockedBadEventOrder.blockerCodes.includes('STATE_EVENTS_MUST_BE_STRICTLY_ORDERED'));
assert.ok(blockedBadEventOrder.blockerCodes.includes('DUPLICATE_STATE_EVENT_ORDINAL'));

const badReferenceDirection = structuredClone(trace);
const slidingRow = badReferenceDirection.iterations[1].restraints
  .find((row) => row.restraintKey === 'FRICTION:20090');
slidingRow.firstTransitionReferenceDirectionGlobal = [2, 0, 0];
const blockedBadReference = assessBm4lL13StateTraceEvidence(badReferenceDirection);
assert.ok(blockedBadReference.blockerCodes.includes('FIRST_TRANSITION_REFERENCE_DIRECTION_MUST_BE_UNIT_VECTOR'));

console.log('PASS M047 BM4_L F2.7b exact-build L13 state-trace evidence gate');
console.log('PASS deterministic 26-friction + 6-gap capture worksheet and raw-capture sealing firewall');
console.log('PASS optional exact-product first-transition direction and ordered sub-iteration state-event validation');
console.log('historical L13 remains 1719/1914 = 89.81191222570533%');
console.log('passing trace authorizes engineering review only; production mechanics/rescore remain false');
console.log('ingest product trace with: node scripts/lfea-m047-bm4l-l13-state-trace-evidence-check.mjs --input=<trace.json>');

function validateContract(value) {
  assert.equal(value.schema, 'm047-bm4l-l13-state-trace-contract/v1');
  assert.equal(value.product.version, '14.00.00.0910');
  assert.equal(value.product.build, '231113');
  assert.equal(value.friction.siteCount, 26);
  assert.equal(value.positiveGapRows.length, 6);
  assert.equal(value.inputCustody.governedRows, 1914);
  assert.equal(value.inputCustody.historicalDiagnosticPass, 1719);
  assert.equal(value.inputCustody.historicalDiagnosticFail, 195);
  assert.equal(value.optionalProductObservedEvidence.firstTransitionReferenceDirectionGlobal.type, 'UNIT_VECTOR3_OR_NULL');
  assert.deepEqual(
    value.optionalProductObservedEvidence.stateEvents.eventTypes,
    ['CONTACT_STATE_CHANGE', 'FRICTION_STATE_CHANGE'],
  );
  assert.equal(value.authorityFirewall.gateMayAuthorizeProductionMechanics, false);
  assert.equal(value.authorityFirewall.gateMayAuthorizeL13Rescore, false);
}

function makeIteration(iteration, converged, unconvergedRestraintCount, options) {
  const restraints = frictionKeys.map((key) => {
    const node = key.split(':')[1];
    const sliding = node === options.slidingNode;
    return {
      restraintKey: key,
      contactState: 'ACTIVE',
      frictionState: sliding ? 'SLIDING' : 'STICK',
      normalReactionN: sliding ? 1200 : 1000,
      frictionResistanceN: sliding ? 360 : 100,
      frictionDirectionGlobal: sliding ? [1, 0, 0] : null,
      firstTransitionReferenceDirectionGlobal: sliding
        ? (options.firstTransitionReferenceDirectionGlobal ?? null)
        : null,
    };
  });
  for (const [index, key] of gapKeys.entries()) {
    restraints.push({
      restraintKey: key,
      contactState: options.gapClosed && index === 0 ? 'CLOSED' : 'OPEN',
      frictionState: 'NOT_APPLICABLE',
    });
  }
  return {
    iteration,
    converged,
    unconvergedRestraintCount,
    restraints,
    stateEvents: options.stateEvents ?? [],
  };
}
