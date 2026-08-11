import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';
import { createLfeaGovernedJourneyProjection } from '../src/lfea/governed-journey-projection.js';

const preFlightA = authorizedPreFlight(fixtureXml(1000));
const calls = [];
const authority = createLfeaNativeExecutionAuthority({
  executeAuthorizedCases(input) {
    calls.push(input);
    return Object.freeze({
      schema: 'test-authorized-raw-execution/v1',
      executionBatchId: 'TEST-EXECUTION-A',
      status: 'QUALIFIED',
      requestedCaseIds: Object.freeze([...input.requestedCaseIds]),
    });
  },
});

assert.equal(authority.getState().currentness, 'NONE');
assert.throws(
  () => authority.run(preFlightA, { requestedCaseIds: ['NOT-AUTHORIZED'] }),
  (error) => error?.code === 'PREFEA_AUTHORIZATION_CASE_NOT_AUTHORIZED',
);
assert.equal(calls.length, 0, 'Unauthorized case must fail before runtime construction.');
console.log('LFEA-NATIVE-EXEC-01 PASS unauthorized case cannot reach runtime');

const state = authority.run(preFlightA, { requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID] });
assert.equal(state.currentness, 'CURRENT');
assert.equal(calls.length, 1);
assert.deepEqual(calls[0].requestedCaseIds, [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID]);
assert.equal(authority.getCurrentQualifiedExecution(), state.execution);
const immutableExecution = state.execution;
console.log('LFEA-NATIVE-EXEC-02 PASS sealed authorization reaches executor only through governed gate');

authority.reconcile(preFlightA);
assert.equal(authority.getState().currentness, 'CURRENT');
assert.equal(authority.getState().execution, immutableExecution);
console.log('LFEA-NATIVE-EXEC-03 PASS unchanged parent authority keeps execution current');

const preFlightB = authorizedPreFlight(fixtureXml(1001));
authority.reconcile(preFlightB);
assert.equal(authority.getState().currentness, 'STALE');
assert.equal(authority.getState().execution, immutableExecution, 'Staleness must not mutate retained execution evidence.');
assert.equal(authority.getCurrentExecution(), null);
assert.ok(authority.getState().staleReasonCodes.length > 0);
console.log('LFEA-NATIVE-EXEC-04 PASS source/model parent change makes retained execution stale');

const projection = createLfeaGovernedJourneyProjection({
  sourceSnapshot: sourceSnapshot(preFlightB),
  preFlight: preFlightB,
  executionState: authority.getState(),
});
assert.equal(projection.analysis.nativeExecutionConnected, true);
assert.equal(projection.analysis.readyToRun, true);
assert.equal(projection.analysis.executionCurrentness, 'STALE');
assert.equal(projection.analysis.currentExecutionAvailable, false);
console.log('LFEA-NATIVE-EXEC-05 PASS UI projection never promotes stale execution to current');

authority.reconcile(null);
assert.equal(authority.getState().currentness, 'STALE');
assert.ok(authority.getState().staleReasonCodes.includes('SOURCE_OR_PREFLIGHT_CLEARED'));
assert.equal(authority.getState().execution, immutableExecution);
console.log('LFEA-NATIVE-EXEC-06 PASS source clear retains immutable evidence but removes current authority');

const authoritySource = fs.readFileSync('src/lfea/native-execution-authority.js', 'utf8');
const executorSource = fs.readFileSync('src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js', 'utf8');
const elementSource = fs.readFileSync('src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js', 'utf8');
const bootstrapSource = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
const runtimeSource = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
const apiSource = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');
assert.match(authoritySource, /solveInputXmlLinearAnalysis/u);
assert.doesNotMatch(authoritySource, /compileSolverExecution|solveLinearPipingModel|runLinearPipingAnalysis\(/u);
assert.match(executorSource, /compileSolverExecution/u);
assert.match(executorSource, /solverProfileSemanticHash !== solverProfile\.semanticHash/u);
assert.match(executorSource, /frameElementProfileSemanticHash !== frameProfile\.semanticHash/u);
assert.doesNotMatch(executorSource, /compileResultRecovery|B31|codeStress/u);
assert.match(elementSource, /requireAxisCustody/u);
assert.match(elementSource, /referenceVector: \[\.\.\.element\.localAxes\.y\]/u);
assert.doesNotMatch(bootstrapSource, /compileSolverExecution|solveLinearPipingModel|runLinearPipingAnalysis\(/u);
assert.match(bootstrapSource, /createLfeaStandaloneRuntime/u);
assert.match(runtimeSource, /createLfeaNativeExecutionAuthority/u);
assert.match(runtimeSource, /executeNativeAnalysis/u);
assert.match(apiSource, /runNativeAnalysis/u);
console.log('LFEA-NATIVE-EXEC-07 PASS source guard keeps low-level solver below runtime authorization gate and defers recovery');

console.log(JSON.stringify({
  check: 'lfea-standalone-native-execution',
  status: 'PASS',
  governedGateRequired: true,
  currentStaleAuthoritySeparated: true,
  immutableExecutionRetainedWhenStale: true,
  resultRecoveryDeferred: true,
  historyDeferred: true,
}));

function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({ fileName: 'standalone-native-execution.xml', content }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  if (preFlight.status === 'BLOCK') throw new Error('Native execution fixture unexpectedly BLOCKED.');
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'STANDALONE-NATIVE-EXECUTION-TEST',
      reason: 'Test-only acceptance of the complete retained conditional limitation set.',
    });
  }
  return preFlight;
}

function sourceSnapshot(preFlight) {
  return {
    sourceStatus: preFlight.status,
    fileName: preFlight.sourceSummary.fileName,
    contentSha256: preFlight.sourceSummary.contentSha256,
    sourceUnit: preFlight.sourceSummary.sourceUnit,
    requestedProfileId: preFlight.preparation.requestedProfileId,
    requestedCaseIds: preFlight.preparation.requestedCaseIds,
    preFlightStatus: preFlight.status,
    preFlightSemanticHash: preFlight.semanticHash,
    authorizationSemanticHash: preFlight.authorization?.semanticHash ?? null,
  };
}

function fixtureXml(length) {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    <UNITS>
      <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
      <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
      <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
      <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    </UNITS>
    <PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-NATIVE-EXEC">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="${length}" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
