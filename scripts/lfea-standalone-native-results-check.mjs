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
import { createLfeaNativeResultsAuthority } from '../src/lfea/native-results-authority.js';
import {
  INPUTXML_PRODUCTION_RECOVERY_PROFILE_SOURCE,
  inputXmlProductionRecoveryProfile,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-recovery-profile.js';

const preFlightA = authorizedPreFlight(fixtureXml(1000));
const executionAuthority = createLfeaNativeExecutionAuthority();
const resultsAuthority = createLfeaNativeResultsAuthority();

assert.throws(
  () => resultsAuthority.recover(preFlightA, executionAuthority.getState()),
  (error) => error?.code === 'LFEA_NATIVE_RESULTS_CURRENT_EXECUTION_REQUIRED',
);
console.log('LFEA-NATIVE-RESULTS-01 PASS recovery cannot bypass CURRENT raw execution authority');

const executionState = executionAuthority.run(preFlightA, {
  requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
});
assert.equal(executionState.currentness, 'CURRENT');
assert.ok(['QUALIFIED', 'CONDITIONAL'].includes(executionState.execution.status));

const resultsState = resultsAuthority.recover(preFlightA, executionState);
const batch = resultsState.results;
assert.equal(resultsState.currentness, 'CURRENT');
assert.equal(batch.schema, 'fea-inputxml-linear-recovery-batch/v1');
assert.equal(batch.rawExecutionBatchId, executionState.execution.executionBatchId);
assert.equal(batch.rawExecutionBatchSemanticHash, executionState.execution.semanticHash);
assert.equal(batch.modelSemanticHash, preFlightA.preparation.modelSemanticHash);
assert.equal(batch.stiffnessStateHash, preFlightA.preparation.stiffnessStateHash);
assert.equal(batch.loadStateHash, preFlightA.preparation.loadStateHash);
assert.equal(resultsAuthority.getCurrentResults(), batch);
console.log('LFEA-NATIVE-RESULTS-02 PASS current qualified raw execution creates a lineage-bound recovery batch');

const profile = inputXmlProductionRecoveryProfile();
assert.equal(batch.recoveryProfileSemanticHash, profile.semanticHash);
assert.equal(batch.recoveryProfile.elementForceStationsPerSpan.value, 5);
assert.equal(batch.recoveryProfile.codePointConsistencyTolerance.value, 1e-6);
assert.equal(batch.recoveryProfile.retainLocalAndGlobalActions, true);
assert.equal(batch.recoveryProfile.elementForceStationsPerSpan.source,
  INPUTXML_PRODUCTION_RECOVERY_PROFILE_SOURCE);
assert.doesNotMatch(INPUTXML_PRODUCTION_RECOVERY_PROFILE_SOURCE, /DEFAULT|FIXTURE|MOCK/u);
console.log('LFEA-NATIVE-RESULTS-03 PASS production recovery policy is explicit and traceable');

assert.equal(batch.caseRecoveries.length, 1);
const caseRecovery = batch.caseRecoveries[0];
const rawCase = executionState.execution.caseExecutions[0];
assert.equal(caseRecovery.caseId, LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID);
assert.equal(caseRecovery.executionHash, rawCase.executionHash);
assert.equal(caseRecovery.physicalLoadCaseHash, rawCase.physicalLoadCaseHash);
assert.equal(caseRecovery.recovery.executionHash, rawCase.executionHash);
assert.equal(caseRecovery.recovery.physicalLoadCaseHash, rawCase.physicalLoadCaseHash);
assert.ok(caseRecovery.recovery.elementActions.length > 0);
for (const action of caseRecovery.recovery.elementActions) {
  for (const end of ['I', 'J']) {
    for (const basis of ['local', 'global']) {
      for (const field of ['fx', 'fy', 'fz', 'mx', 'my', 'mz']) {
        assert.equal(Number.isFinite(action[basis][end][field]), true);
      }
    }
  }
}
console.log('LFEA-NATIVE-RESULTS-04 PASS B-3.4 retains distinct local/global recovered element actions');

const tamperedExecution = structuredClone(executionState.execution);
tamperedExecution.caseExecutions[0].elementLedger[0].equivalentLoadHash = 'fnv1a64:0000000000000000';
const tamperedAuthority = createLfeaNativeResultsAuthority();
assert.throws(
  () => tamperedAuthority.recover(preFlightA, {
    currentness: 'CURRENT',
    execution: tamperedExecution,
  }),
  (error) => error?.code === 'INPUTXML_RECOVERY_RAW_BATCH_HASH_MISMATCH',
);
console.log('LFEA-NATIVE-RESULTS-05 PASS tampered raw element custody is rejected before recovery');

const retainedResults = batch;
const preFlightB = authorizedPreFlight(fixtureXml(1001));
executionAuthority.reconcile(preFlightB);
resultsAuthority.reconcile(preFlightB, executionAuthority.getState());
assert.equal(executionAuthority.getState().currentness, 'STALE');
assert.equal(resultsAuthority.getState().currentness, 'STALE');
assert.equal(resultsAuthority.getState().results, retainedResults);
assert.equal(resultsAuthority.getCurrentResults(), null);
assert.throws(
  () => resultsAuthority.recover(preFlightB, executionAuthority.getState()),
  (error) => error?.code === 'LFEA_NATIVE_RESULTS_CURRENT_EXECUTION_REQUIRED',
);
console.log('LFEA-NATIVE-RESULTS-06 PASS stale raw authority preserves evidence but removes current Results');

sourceGuards();
console.log('LFEA-NATIVE-RESULTS-07 PASS Results presentation does not derive support/B31 authority');

console.log(JSON.stringify({
  check: 'lfea-standalone-native-results',
  status: 'PASS',
  rawAndRecoveredAuthoritySeparated: true,
  currentOnlyRecovery: true,
  rawTamperRejected: true,
  staleResultsHiddenFromCurrentAuthority: true,
  canonicalUnitsVisible: true,
  runUiIsProjectionOnly: true,
  recoveryProfileSemanticHash: batch.recoveryProfileSemanticHash,
  recoveryBatchId: batch.recoveryBatchId,
}));

function sourceGuards() {
  const recoverySource = fs.readFileSync(
    'src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js', 'utf8');
  const viewSource = fs.readFileSync('src/lfea/native-results-view.js', 'utf8');
  const journeyViewSource = fs.readFileSync('src/lfea/governed-journey-view.js', 'utf8');
  const layoutSource = fs.readFileSync('src/lfea/standalone-layout.js', 'utf8');
  const bootstrapSource = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
  assert.match(recoverySource, /compileResultRecovery/u);
  assert.match(recoverySource, /requireElementLedgerCustody/u);
  assert.doesNotMatch(recoverySource, /linear-piping-support-action-triad|linear-fea-b31-code-engine|codeStress/u);
  assert.doesNotMatch(viewSource, /compileResultRecovery|linear-piping-support-action-triad|linear-fea-b31-code-engine/u);
  assert.doesNotMatch(viewSource, /innerHTML|insertAdjacentHTML|outerHTML/u);
  assert.match(viewSource, /LINEAR_FEA_UNITS/u);
  assert.match(viewSource, /RAW_B3\.3_DISPLACEMENT/u);
  assert.match(viewSource, /RECOVERED_B3\.4_ELEMENT_ACTION/u);
  assert.match(journeyViewSource, /dataset\.role = 'lfea-native-run'/u);
  assert.match(journeyViewSource, /button\.disabled = !analysis\.readyToRun/u);
  assert.match(layoutSource, /id: 'results', label: 'Results', state: 'available'/u);
  assert.match(bootstrapSource, /onRunNativeAnalysis/u);
  assert.match(bootstrapSource, /resultsAuthority\.recover/u);
}

function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({
    fileName: 'standalone-native-results.xml',
    content,
  }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  if (preFlight.status === 'BLOCK') throw new Error('Native Results fixture unexpectedly BLOCKED.');
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'STANDALONE-NATIVE-RESULTS-TEST',
      reason: 'Test-only acceptance of the complete retained conditional limitation set.',
    });
  }
  return preFlight;
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
    <PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-RESULTS">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="${length}" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
