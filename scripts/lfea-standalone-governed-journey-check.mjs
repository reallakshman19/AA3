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
import {
  createLfeaGovernedJourneyProjection,
} from '../src/lfea/governed-journey-projection.js';

const empty = createLfeaGovernedJourneyProjection();
assert.equal(empty.source.status, 'EMPTY');
assert.equal(empty.review.readyToReview, false);
assert.equal(empty.analysis.readyForExecutionHandoff, false);
assert.equal(empty.analysis.nativeExecutionConnected, false);
assert.equal(empty.analysis.readyToRun, false);
console.log('LFEA-STANDALONE-JOURNEY-01 PASS empty application has no fabricated authority');

const intake = createLinearPipingInputXmlIntake({
  fileName: 'standalone-governed-journey.xml',
  content: fixtureXml(),
}, {
  requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
  requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
});

let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
preFlight = requireLinearPipingInputXmlPreFlight(preFlight);
let snapshot = sourceSnapshot(preFlight);
let projection = createLfeaGovernedJourneyProjection({ sourceSnapshot: snapshot, preFlight });

assert.equal(projection.source.fileName, 'standalone-governed-journey.xml');
assert.match(projection.source.contentSha256, /^[0-9a-f]{64}$/u);
assert.equal(projection.source.sourceUnit, 'mm');
assert.equal(projection.model.nodeCount, preFlight.sourceSummary.nodeCount);
assert.equal(projection.model.elementCount, preFlight.sourceSummary.elementCount);
assert.equal(projection.model.modelSemanticHash, preFlight.preparation.modelSemanticHash);
assert.equal(projection.model.stiffnessStateHash, preFlight.preparation.stiffnessStateHash);
assert.equal(projection.model.loadStateHash, preFlight.preparation.loadStateHash);
assert.ok(projection.model.physicalCases.some((row) => row.caseId === LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID));
assert.equal(projection.analysis.nativeExecutionConnected, false);
assert.equal(projection.analysis.readyToRun, false);
console.log('LFEA-STANDALONE-JOURNEY-02 PASS source and compiled model identities project without re-derivation');

if (preFlight.status === 'WARN' && !preFlight.solveAuthorized) {
  assert.equal(projection.review.status, 'REVIEW_REQUIRED');
  assert.equal(projection.analysis.readyForExecutionHandoff, false);
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
  assert.match(projection.analysis.authorizationSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
  assert.equal(projection.analysis.readyToRun, false,
    'Pre-FEA authorization must not be presented as connected native solve execution.');
}
console.log('LFEA-STANDALONE-JOURNEY-03 PASS reviewed authorization is distinct from solver handoff');

const cleared = createLfeaGovernedJourneyProjection({
  sourceSnapshot: { sourceStatus: 'EMPTY', preFlightStatus: 'NOT_PREPARED' },
  preFlight: null,
});
assert.equal(cleared.model.modelSemanticHash, null);
assert.equal(cleared.analysis.authorizationSemanticHash, null);
assert.equal(cleared.analysis.readyForExecutionHandoff, false);
console.log('LFEA-STANDALONE-JOURNEY-04 PASS cleared source does not retain historic current authority');

const bootstrapSource = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
const projectionSource = fs.readFileSync('src/lfea/governed-journey-projection.js', 'utf8');
const viewSource = fs.readFileSync('src/lfea/governed-journey-view.js', 'utf8');
assert.doesNotMatch(bootstrapSource, /solveInputXmlLinearAnalysis|runLinearPipingWorkbenchAnalysis|AnalysisCoordinator/u);
assert.doesNotMatch(projectionSource, /solveInputXmlLinearAnalysis|authorizeInputXmlLinearSolve|prepareInputXmlLinearPreFea/u);
assert.doesNotMatch(viewSource, /solveInputXmlLinearAnalysis|authorizeInputXmlLinearSolve|prepareInputXmlLinearPreFea/u);
assert.doesNotMatch(viewSource, /innerHTML|insertAdjacentHTML|outerHTML/u);
assert.match(bootstrapSource, /LfeaStandaloneInputXmlSourceController/u);
assert.match(bootstrapSource, /readyForExecutionHandoff/u);
console.log('LFEA-STANDALONE-JOURNEY-05 PASS standalone composition projects authority and owns no direct solver bypass');

console.log(JSON.stringify({
  check: 'lfea-standalone-governed-journey',
  status: 'PASS',
  sourceCustodyProjected: true,
  modelIdentityProjected: true,
  reviewAuthorizationProjected: true,
  nativeExecutionConnected: false,
  readyToRun: false,
}));

function sourceSnapshot(preFlightRecord) {
  return {
    sourceStatus: preFlightRecord.status,
    fileName: preFlightRecord.sourceSummary.fileName,
    contentSha256: preFlightRecord.sourceSummary.contentSha256,
    unitDeclared: preFlightRecord.sourceSummary.unitDeclared,
    sourceUnit: preFlightRecord.sourceSummary.sourceUnit,
    unitAuthority: preFlightRecord.sourceSummary.unitAuthority,
    requestedProfileId: preFlightRecord.preparation.requestedProfileId,
    requestedCaseIds: preFlightRecord.preparation.requestedCaseIds,
    nodeCount: preFlightRecord.sourceSummary.nodeCount,
    elementCount: preFlightRecord.sourceSummary.elementCount,
    preFlightStatus: preFlightRecord.status,
    preFlightSemanticHash: preFlightRecord.semanticHash,
    preFlightSolveAuthorized: preFlightRecord.solveAuthorized,
    authorizationSemanticHash: preFlightRecord.authorization?.semanticHash ?? null,
  };
}

function fixtureXml() {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    <UNITS>
      <LENGTH LABEL="MM" FACTOR="25.4"/>
      <FORCE LABEL="N" FACTOR="4.4482216152605"/>
      <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/>
      <STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
      <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/>
      <EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
      <TEMP LABEL="C" FACTOR="0.5555555555555556"/>
      <PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    </UNITS>
    <PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-JOURNEY">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
