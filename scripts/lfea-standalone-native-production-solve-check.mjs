import assert from 'node:assert/strict';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';

let preFlight = prepareLinearPipingInputXmlPreFlight(createLinearPipingInputXmlIntake({
  fileName: 'standalone-native-production-solve.xml',
  content: fixtureXml(),
}, {
  requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
  requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
}));
if (preFlight.status === 'BLOCK') throw new Error('Native production solve fixture unexpectedly BLOCKED.');
if (!preFlight.solveAuthorized) {
  preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
    approverIdentity: 'STANDALONE-NATIVE-PRODUCTION-SOLVE-TEST',
    reason: 'Test-only acceptance of the complete retained conditional limitation set.',
  });
}

const authority = createLfeaNativeExecutionAuthority();
const state = authority.run(preFlight, { requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID] });
const batch = state.execution;
assert.equal(state.currentness, 'CURRENT');
assert.equal(batch.schema, 'fea-inputxml-linear-raw-execution-batch/v1');
assert.deepEqual(batch.requestedCaseIds, [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID]);
assert.equal(batch.caseExecutions.length, 1);
const caseExecution = batch.caseExecutions[0];
assert.equal(caseExecution.caseId, LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID);
assert.equal(caseExecution.solverProfileSemanticHash, preFlight.preparation.stiffnessPreflight.solverProfileSemanticHash);
assert.equal(caseExecution.frameElementProfileSemanticHash, preFlight.preparation.stiffnessPreflight.frameElementProfileSemanticHash);
assert.ok(['QUALIFIED', 'CONDITIONAL'].includes(caseExecution.executionStatus),
  `Raw solver execution must be qualified/conditional, got ${caseExecution.executionStatus}.`);
assert.equal(caseExecution.execution.physicalLoadCaseHash, caseExecution.physicalLoadCaseHash);
assert.equal(caseExecution.execution.mechanicalModelSemanticHash, preFlight.preparation.modelSemanticHash);
assert.equal(authority.getCurrentQualifiedExecution(), batch);

console.log(JSON.stringify({
  check: 'lfea-standalone-native-production-solve',
  status: 'PASS',
  caseId: caseExecution.caseId,
  executionStatus: caseExecution.executionStatus,
  executionHash: caseExecution.executionHash,
  modelSemanticHash: batch.modelSemanticHash,
  stiffnessStateHash: batch.stiffnessStateHash,
  loadStateHash: batch.loadStateHash,
}));

function fixtureXml() {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    <UNITS>
      <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
      <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
      <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
      <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    </UNITS>
    <PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-PROD-SOLVE">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
