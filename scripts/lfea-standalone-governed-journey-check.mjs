import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
  requireLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaGovernedJourneyProjection } from '../src/lfea/governed-journey-projection.js';

const empty = createLfeaGovernedJourneyProjection();
assert.equal(empty.source.status, 'EMPTY');
assert.equal(empty.review.readyToReview, false);
assert.equal(empty.analysis.readyForExecutionHandoff, false);
assert.equal(empty.analysis.nativeExecutionConnected, true);
assert.equal(empty.analysis.readyToRun, false);
console.log('LFEA-STANDALONE-JOURNEY-01 PASS executor connection does not fabricate source/run authority');

const intake = createLinearPipingInputXmlIntake({
  fileName: 'standalone-governed-journey.xml',
  content: fixtureXml(),
}, {
  requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
  requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
});
let preFlight = requireLinearPipingInputXmlPreFlight(prepareLinearPipingInputXmlPreFlight(intake));
let snapshot = sourceSnapshot(preFlight);
let projection = createLfeaGovernedJourneyProjection({ sourceSnapshot: snapshot, preFlight });

assert.equal(projection.source.fileName, 'standalone-governed-journey.xml');
assert.match(projection.source.contentSha256, /^[0-9a-f]{64}$/u);
assert.equal(projection.source.sourceUnit, 'mm');
assert.equal(projection.review.findings.length, preFlight.preparation.findings.length);
assert.equal(projection.model.nodeCount, preFlight.sourceSummary.nodeCount);
assert.equal(projection.model.elementCount, preFlight.sourceSummary.elementCount);
assert.equal(projection.model.modelSemanticHash, preFlight.preparation.modelSemanticHash);
assert.equal(projection.model.stiffnessStateHash, preFlight.preparation.stiffnessStateHash);
assert.equal(projection.model.loadStateHash, preFlight.preparation.loadStateHash);
assert.ok(projection.model.physicalCases.some((row) => row.caseId === LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID));
assert.equal(projection.analysis.nativeExecutionConnected, true);
assert.equal(projection.analysis.readyToRun, preFlight.solveAuthorized);
console.log('LFEA-STANDALONE-JOURNEY-02 PASS source/model authority projects without re-derivation and run readiness follows authorization');

if (preFlight.status === 'WARN' && !preFlight.solveAuthorized) {
  assert.equal(projection.review.status, 'REVIEW_REQUIRED');
  assert.equal(projection.analysis.readyForExecutionHandoff, false);
  assert.equal(projection.analysis.readyToRun, false);
  preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
    approverIdentity: 'STANDALONE-QUALIFICATION-ENGINEER',
    reason: 'Reviewed and accepted the complete retained conditional limitation set.',
  });
  snapshot = sourceSnapshot(preFlight);
  projection = createLfeaGovernedJourneyProjection({ sourceSnapshot: snapshot, preFlight });
}

if (preFlight.status !== 'BLOCK') {
  assert.equal(preFlight.solveAuthorized, true);
  assert.equal(projection.review.solveAuthorized, true);
  assert.equal(projection.analysis.readyForExecutionHandoff, true);
  assert.equal(projection.analysis.readyToRun, true);
  assert.deepEqual(projection.analysis.authorizedPhysicalCaseIds, [...preFlight.authorization.authorizedPhysicalCaseIds]);
  assert.match(projection.analysis.authorizationSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
}
console.log('LFEA-STANDALONE-JOURNEY-03 PASS reviewed authorization controls exact connected case execution eligibility');

const cleared = createLfeaGovernedJourneyProjection({
  sourceSnapshot: { sourceStatus: 'EMPTY', preFlightStatus: 'NOT_PREPARED' }, preFlight: null,
});
assert.equal(cleared.model.modelSemanticHash, null);
assert.equal(cleared.analysis.authorizationSemanticHash, null);
assert.equal(cleared.analysis.readyToRun, false);
console.log('LFEA-STANDALONE-JOURNEY-04 PASS cleared source retains no current run authority');

const bootstrapSource = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
const runtimeSource = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
const apiSource = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');
const projectionSource = fs.readFileSync('src/lfea/governed-journey-projection.js', 'utf8');
const viewSource = fs.readFileSync('src/lfea/governed-journey-view.js', 'utf8');
const intakeSource = fs.readFileSync('src/workspace/linear-piping-inputxml-intake.js', 'utf8');
const preFlightSource = fs.readFileSync('src/workspace/linear-piping-inputxml-prefea.js', 'utf8');
assert.doesNotMatch(bootstrapSource, /compileSolverExecution|solveLinearPipingModel|runLinearPipingAnalysis\(/u);
assert.doesNotMatch(projectionSource, /solveInputXmlLinearAnalysis|authorizeInputXmlLinearSolve|prepareInputXmlLinearPreFea/u);
assert.doesNotMatch(viewSource, /solveInputXmlLinearAnalysis|authorizeInputXmlLinearSolve|prepareInputXmlLinearPreFea/u);
assert.doesNotMatch(viewSource, /innerHTML|insertAdjacentHTML|outerHTML/u);
assert.doesNotMatch(intakeSource, /linear-piping-analysis-consumer\/index\.js/u);
assert.doesNotMatch(preFlightSource, /linear-piping-analysis-consumer\/index\.js/u);
assert.match(bootstrapSource, /createLfeaStandaloneRuntime/u);
assert.match(runtimeSource, /createLfeaNativeExecutionAuthority/u);
assert.match(runtimeSource, /executeNativeAnalysis/u);
assert.match(apiSource, /runNativeAnalysis/u);
console.log('LFEA-STANDALONE-JOURNEY-05 PASS standalone bootstrap delegates to LFEA runtime, which owns execution authority and exposes only governed native run API');

console.log(JSON.stringify({
  check: 'lfea-standalone-governed-journey', status: 'PASS', sourceCustodyProjected: true,
  modelIdentityProjected: true, reviewAuthorizationProjected: true, broadConsumerBarrelUsedByNativeSourcePath: false,
  nativeExecutionConnected: true, readyToRunRequiresAuthorization: true,
}));

function sourceSnapshot(record) {
  return {
    sourceStatus: record.status, fileName: record.sourceSummary.fileName, contentSha256: record.sourceSummary.contentSha256,
    unitDeclared: record.sourceSummary.unitDeclared, sourceUnit: record.sourceSummary.sourceUnit, unitAuthority: record.sourceSummary.unitAuthority,
    requestedProfileId: record.preparation.requestedProfileId, requestedCaseIds: record.preparation.requestedCaseIds,
    nodeCount: record.sourceSummary.nodeCount, elementCount: record.sourceSummary.elementCount, preFlightStatus: record.status,
    preFlightSemanticHash: record.semanticHash, preFlightSolveAuthorized: record.solveAuthorized,
    authorizationSemanticHash: record.authorization?.semanticHash ?? null,
  };
}
function fixtureXml() {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input"><UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/><MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/>
    <STRESS LABEL="MPA" FACTOR="0.006894757293168"/><PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/><IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    </UNITS><PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-JOURNEY"><PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106" MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
      <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/></PIPINGELEMENT></PIPINGMODEL></CAESARII>`;
}
