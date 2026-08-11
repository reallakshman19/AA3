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
import { createLfeaNativeRunHistory } from '../src/lfea/native-run-history.js';
import { createLfeaNativePublicationReadiness } from '../src/lfea/native-publication-readiness.js';
import { createLfeaNativeVerification } from '../src/lfea/native-verification.js';
import { createLfeaNativeEvidenceDossier } from '../src/lfea/native-evidence-dossier.js';

const preFlight = authorizedPreFlight(fixtureXml());
const sourceSnapshot = Object.freeze({
  fileName: 'native-verification.xml',
  contentSha256: 'a'.repeat(64),
  sourceUnit: 'mm',
  preFlightSemanticHash: preFlight.semanticHash,
  authorizationSemanticHash: preFlight.authorization.semanticHash,
});
const applicationIdentity = Object.freeze({
  application: 'LFEA',
  mode: 'STANDALONE',
  applicationVersion: '0.1.0',
  buildSha: '0123456789abcdef0123456789abcdef01234567',
  buildTime: '2026-08-11T14:00:00.000Z',
});

const executionAuthority = createLfeaNativeExecutionAuthority();
const executionState = executionAuthority.run(preFlight);
assert.equal(executionState.currentness, 'CURRENT');
const resultsAuthority = createLfeaNativeResultsAuthority();
const resultsState = resultsAuthority.recover(preFlight, executionState);
assert.equal(resultsState.currentness, 'CURRENT');
const history = createLfeaNativeRunHistory();
const currentRecord = history.archive({
  applicationIdentity,
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
});
const historySnapshot = history.getSnapshot({
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
});
const publicationReadiness = createLfeaNativePublicationReadiness({ preFlight, resultsState });
console.log('LFEA-NATIVE-VERIFICATION-01 PASS real governed run/recovery/history evidence prepared');

const verification = createLfeaNativeVerification({
  applicationIdentity,
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
  historySnapshot,
  publicationReadiness,
});
assert.equal(verification.status, 'CURRENT');
assert.equal(verification.runId, currentRecord.runId);
assert.equal(verification.cases.length, executionState.execution.caseExecutions.length);
for (let index = 0; index < verification.cases.length; index += 1) {
  const retained = executionState.execution.caseExecutions[index].execution;
  const projected = verification.cases[index].execution;
  assert.deepEqual(projected.diagnostics, retained.diagnostics);
  assert.equal(projected.executionHash, retained.executionHash);
  assert.equal(projected.executionEvidenceHash, retained.executionEvidenceHash);
  assert.equal(projected.factorization.factorizationHash, retained.factorization.factorizationHash);
  assert.equal(projected.factorization.evidenceHash, retained.factorization.evidenceHash);
  assert.equal(projected.factorization.conditionEstimate, retained.factorization.conditionEstimate);
}
console.log('LFEA-NATIVE-VERIFICATION-02 PASS Verification copies retained solver diagnostics/factorization evidence without recomputation');

assert.equal(verification.source.contentSha256, sourceSnapshot.contentSha256);
assert.equal(verification.authority.preFlightSemanticHash, preFlight.semanticHash);
assert.equal(verification.authority.authorizationSemanticHash, preFlight.authorization.semanticHash);
assert.equal(verification.authority.rawExecutionBatchId, executionState.execution.executionBatchId);
assert.equal(verification.authority.recoveryBatchId, resultsState.results.recoveryBatchId);
assert.equal(verification.application.buildSha, applicationIdentity.buildSha);
assert.equal(verification.publicationReadiness.supportActions.status, 'BLOCKED');
assert.equal(verification.publicationReadiness.b31Code.status, 'BLOCKED');
console.log('LFEA-NATIVE-VERIFICATION-03 PASS exact source/authority/build lineage and downstream blockers are retained');

const dossierA = createLfeaNativeEvidenceDossier(verification);
const dossierB = createLfeaNativeEvidenceDossier(verification);
assert.equal(dossierA.schema, 'lfea-native-evidence-dossier/v1');
assert.equal(dossierA.dossierStatus, 'CURRENT_EVIDENCE_ONLY');
assert.equal(dossierA.engineeringIssueEligible, false);
assert.equal(dossierA.semanticHash, dossierB.semanticHash);
assert.deepEqual(dossierA, dossierB);
assert.ok(dossierA.limitationCodes.includes('SUPPORT_ACTIONS_PUBLICATION_BLOCKED'));
assert.ok(dossierA.limitationCodes.includes('B31_CODE_PUBLICATION_BLOCKED'));
assert.ok(dossierA.limitationCodes.includes('ENGINEERING_ISSUE_NOT_AUTHORIZED_BY_EVIDENCE_DOSSIER'));
console.log('LFEA-NATIVE-VERIFICATION-04 PASS deterministic dossier remains evidence-only with explicit publication limitations');

const staleVerification = createLfeaNativeVerification({
  applicationIdentity,
  sourceSnapshot,
  preFlight,
  executionState: Object.freeze({ ...executionState, currentness: 'STALE' }),
  resultsState,
  historySnapshot,
  publicationReadiness,
});
assert.equal(staleVerification.status, 'BLOCKED');
assert.ok(staleVerification.reasonCodes.includes('CURRENT_RAW_EXECUTION_REQUIRED'));
assert.throws(
  () => createLfeaNativeEvidenceDossier(staleVerification),
  (error) => error?.code === 'LFEA_DOSSIER_CURRENT_RUN_REQUIRED',
);
console.log('LFEA-NATIVE-VERIFICATION-05 PASS stale execution cannot issue a current dossier');

const historicSelectedSnapshot = Object.freeze({
  ...historySnapshot,
  selectedRunId: 'LFEA-RUN-HISTORIC',
  selectedRecord: Object.freeze({ runId: 'LFEA-RUN-HISTORIC' }),
  entries: Object.freeze([
    Object.freeze({ runId: 'LFEA-RUN-HISTORIC', relation: 'HISTORIC', record: Object.freeze({ runId: 'LFEA-RUN-HISTORIC' }) }),
    ...historySnapshot.entries,
  ]),
});
const selectedHistoricVerification = createLfeaNativeVerification({
  applicationIdentity,
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
  historySnapshot: historicSelectedSnapshot,
  publicationReadiness,
});
assert.equal(selectedHistoricVerification.runId, currentRecord.runId);
assert.notEqual(selectedHistoricVerification.runId, historicSelectedSnapshot.selectedRunId);
console.log('LFEA-NATIVE-VERIFICATION-06 PASS historic selection cannot redirect dossier authority away from the actual CURRENT run');

sourceGuards();
console.log('LFEA-NATIVE-VERIFICATION-07 PASS Verification/Dossier are read-only evidence consumers and remain separate from the element-FEA workbench');

console.log(JSON.stringify({
  check: 'lfea-standalone-native-verification',
  status: 'PASS',
  retainedDiagnosticsOnly: true,
  currentOnlyDossier: true,
  engineeringIssueEligible: false,
  deterministicDossier: true,
}));

function sourceGuards() {
  const verificationSource = fs.readFileSync('src/lfea/native-verification.js', 'utf8');
  const dossierSource = fs.readFileSync('src/lfea/native-evidence-dossier.js', 'utf8');
  const viewSource = fs.readFileSync('src/lfea/native-verification-view.js', 'utf8');
  const layoutSource = fs.readFileSync('src/lfea/standalone-layout.js', 'utf8');
  const runtimeSource = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
  for (const source of [verificationSource, dossierSource, viewSource]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage|EventBus|AnalysisLedger|analysis-ledger|lafea-linear-solve/u);
    assert.doesNotMatch(source, /fAxial\s*=|fLateral\s*=|fVertical\s*=|calculatedStress\s*=|utilization\s*=/u);
  }
  assert.match(verificationSource, /requireSolverExecution/u);
  assert.match(viewSource, /does not recalculate residuals, equilibrium, condition estimates/u);
  assert.match(viewSource, /does not grant engineering issue or project release authority/u);
  assert.match(layoutSource, /lfea-native-verification-root/u);
  assert.match(layoutSource, /Independent element-FEA verification workbench below/u);
  assert.match(runtimeSource, /Evidence dossier creation/u);
  assert.ok(lineCount(verificationSource) < 300);
  assert.ok(lineCount(dossierSource) < 300);
  assert.ok(lineCount(viewSource) < 300);
  assert.ok(lineCount(runtimeSource) < 300);
}
function lineCount(source) { return source.split(/\r?\n/u).length; }

function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({
    fileName: 'standalone-native-verification.xml',
    content,
  }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  if (preFlight.status === 'BLOCK') throw new Error('Verification fixture unexpectedly BLOCKED.');
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'STANDALONE-NATIVE-VERIFICATION-TEST',
      reason: 'Test-only acceptance of the complete retained conditional limitation set.',
    });
  }
  return preFlight;
}

function fixtureXml() {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    <UNITS>
      <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
      <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
      <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
      <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    </UNITS>
    <PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-VERIFICATION">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
