import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import {
  LFEA_NATIVE_RUN_RELATION,
  createLfeaNativeRunHistory,
} from '../src/lfea/native-run-history.js';

const history = createLfeaNativeRunHistory();
assert.equal(history.getSnapshot().entries.length, 0);
console.log('LFEA-NATIVE-HISTORY-01 PASS empty History has no fabricated run evidence');

const preFlightA = authorizedPreFlight(fixtureXml(1000));
const sourceA = sourceSnapshot(preFlightA, 'a');
const runA = governedRunStates(preFlightA, 'A');
const applicationIdentity = Object.freeze({
  application: 'LFEA', mode: 'STANDALONE', applicationVersion: '0.1.0',
  buildSha: '0123456789abcdef0123456789abcdef01234567', buildTime: '2026-08-11T14:00:00.000Z',
});

assert.throws(
  () => history.archive({
    applicationIdentity, sourceSnapshot: sourceA, preFlight: preFlightA,
    executionState: { ...runA.executionState, currentness: 'STALE' }, resultsState: runA.resultsState,
  }),
  (error) => error?.code === 'LFEA_HISTORY_CURRENT_RAW_REQUIRED',
);
console.log('LFEA-NATIVE-HISTORY-02 PASS stale raw authority cannot enter History as a governed run');

const recordA = history.archive({
  applicationIdentity, sourceSnapshot: sourceA, preFlight: preFlightA,
  executionState: runA.executionState, resultsState: runA.resultsState,
});
assert.equal(recordA.schema, 'lfea-native-run-record/v1');
assert.match(recordA.runId, /^LFEA-RUN-[0-9A-F]+$/u);
assert.equal(Object.isFrozen(recordA), true);
assert.equal(Object.isFrozen(recordA.evidence.rawExecutionBatch), true);
assert.equal(recordA.identity.source.contentSha256, sourceA.contentSha256);
assert.equal(recordA.identity.authority.preFlightSemanticHash, preFlightA.semanticHash);
assert.equal(recordA.identity.authority.authorizationSemanticHash, preFlightA.authorization.semanticHash);
assert.equal(recordA.identity.authority.modelSemanticHash, preFlightA.preparation.modelSemanticHash);
assert.equal(recordA.identity.rawExecution.executionBatchId, runA.raw.executionBatchId);
assert.equal(recordA.identity.recovery.recoveryBatchId, runA.recovery.recoveryBatchId);
assert.equal(recordA.identity.application.buildSha, applicationIdentity.buildSha);
console.log('LFEA-NATIVE-HISTORY-03 PASS immutable run record binds exact source/model/review/raw/recovery/build lineage');

const duplicateA = history.archive({
  applicationIdentity, sourceSnapshot: sourceA, preFlight: preFlightA,
  executionState: runA.executionState, resultsState: runA.resultsState,
});
assert.equal(duplicateA, recordA);
assert.equal(history.getSnapshot().entries.length, 1);
console.log('LFEA-NATIVE-HISTORY-04 PASS identical engineering evidence deduplicates without ambient event identity');

let snapshot = history.getSnapshot({
  sourceSnapshot: sourceA, preFlight: preFlightA,
  executionState: runA.executionState, resultsState: runA.resultsState,
});
assert.equal(snapshot.entries[0].relation, LFEA_NATIVE_RUN_RELATION.CURRENT);
assert.equal(snapshot.selectedRecord, recordA);
console.log('LFEA-NATIVE-HISTORY-05 PASS exact current raw/recovery evidence projects CURRENT');

const executionBeforeSelection = runA.executionState;
const resultsBeforeSelection = runA.resultsState;
history.selectRun(recordA.runId);
assert.equal(runA.executionState, executionBeforeSelection);
assert.equal(runA.resultsState, resultsBeforeSelection);
assert.equal(history.getSelectedRecord(), recordA);
console.log('LFEA-NATIVE-HISTORY-06 PASS History selection is view context only');

const runB = governedRunStates(preFlightA, 'B');
const recordB = history.archive({
  applicationIdentity, sourceSnapshot: sourceA, preFlight: preFlightA,
  executionState: runB.executionState, resultsState: runB.resultsState,
});
snapshot = history.getSnapshot({
  sourceSnapshot: sourceA, preFlight: preFlightA,
  executionState: runB.executionState, resultsState: runB.resultsState,
});
assert.equal(snapshot.entries.find((entry) => entry.runId === recordA.runId).relation, LFEA_NATIVE_RUN_RELATION.HISTORIC);
assert.equal(snapshot.entries.find((entry) => entry.runId === recordB.runId).relation, LFEA_NATIVE_RUN_RELATION.CURRENT);
assert.equal(snapshot.selectedRecord, recordB);
console.log('LFEA-NATIVE-HISTORY-07 PASS superseded evidence on the same governed model projects HISTORIC, not current');

const preFlightB = authorizedPreFlight(fixtureXml(1001));
const sourceB = sourceSnapshot(preFlightB, 'b');
snapshot = history.getSnapshot({
  sourceSnapshot: sourceB, preFlight: preFlightB,
  executionState: { currentness: 'STALE', execution: runB.raw },
  resultsState: { currentness: 'STALE', results: runB.recovery },
});
assert.deepEqual(snapshot.entries.map((entry) => entry.relation), ['STALE', 'STALE']);
assert.equal(snapshot.entries[0].record, recordA);
assert.equal(snapshot.entries[1].record, recordB);
console.log('LFEA-NATIVE-HISTORY-08 PASS model/source movement retains immutable evidence and projects STALE');

const mismatchedSource = { ...sourceA, authorizationSemanticHash: 'fnv1a64:0000000000000000' };
assert.throws(
  () => history.archive({
    applicationIdentity, sourceSnapshot: mismatchedSource, preFlight: preFlightA,
    executionState: runA.executionState, resultsState: runA.resultsState,
  }),
  (error) => error?.code === 'LFEA_HISTORY_SOURCE_PREFLIGHT_MISMATCH',
);
console.log('LFEA-NATIVE-HISTORY-09 PASS source snapshot cannot be laundered across pre-flight/authorization identity');

snapshot = history.getSnapshot({ preFlight: null });
assert.deepEqual(snapshot.entries.map((entry) => entry.relation), ['STALE', 'STALE']);
console.log('LFEA-NATIVE-HISTORY-10 PASS clearing current source authority does not erase historic evidence');

sourceGuards();
console.log('LFEA-NATIVE-HISTORY-11 PASS History is LFEA-owned, read-only, non-persistent, and not LAFEA-coupled');

console.log(JSON.stringify({
  check: 'lfea-standalone-native-history',
  status: 'PASS',
  retainedRuns: history.getSnapshot().entries.length,
  immutableEvidence: true,
  deterministicDeduplication: true,
  currentHistoricStaleProjection: true,
  selectionIsViewContextOnly: true,
}));

function governedRunStates(preFlight, label) {
  const rawHash = semanticHash({ kind: 'raw', label, preparation: preFlight.preparation.semanticHash });
  const raw = Object.freeze({
    schema: 'fea-inputxml-linear-raw-execution-batch/v1',
    executionBatchId: `IXRUN-${label}`,
    semanticHash: rawHash,
    status: 'QUALIFIED',
    preparationSemanticHash: preFlight.preparation.semanticHash,
    authorizationSemanticHash: preFlight.authorization.semanticHash,
    sourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    modelSemanticHash: preFlight.preparation.modelSemanticHash,
    stiffnessStateHash: preFlight.preparation.stiffnessStateHash,
    loadStateHash: preFlight.preparation.loadStateHash,
    requestedCaseIds: Object.freeze([LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID]),
    frameElementProfileSemanticHash: `fnv1a64:frame-${label}`,
    solverProfileSemanticHash: `fnv1a64:solver-${label}`,
  });
  const recovery = Object.freeze({
    schema: 'fea-inputxml-linear-recovery-batch/v1',
    recoveryBatchId: `IXREC-${label}`,
    semanticHash: semanticHash({ kind: 'recovery', label, rawHash }),
    status: 'QUALIFIED',
    rawExecutionBatchId: raw.executionBatchId,
    rawExecutionBatchSemanticHash: raw.semanticHash,
    preparationSemanticHash: preFlight.preparation.semanticHash,
    modelSemanticHash: preFlight.preparation.modelSemanticHash,
    stiffnessStateHash: preFlight.preparation.stiffnessStateHash,
    loadStateHash: preFlight.preparation.loadStateHash,
    requestedCaseIds: raw.requestedCaseIds,
    recoveryProfileSemanticHash: `fnv1a64:recovery-${label}`,
  });
  return {
    raw,
    recovery,
    executionState: Object.freeze({ currentness: 'CURRENT', execution: raw }),
    resultsState: Object.freeze({ currentness: 'CURRENT', results: recovery }),
  };
}

function sourceSnapshot(preFlight, fill) {
  return Object.freeze({
    contentSha256: fill.repeat(64),
    fileName: `history-${fill}.xml`,
    sourceUnit: 'mm',
    preFlightSemanticHash: preFlight.semanticHash,
    authorizationSemanticHash: preFlight.authorization.semanticHash,
  });
}

function sourceGuards() {
  const historySource = fs.readFileSync('src/lfea/native-run-history.js', 'utf8');
  const viewSource = fs.readFileSync('src/lfea/native-history-view.js', 'utf8');
  const bootstrapSource = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
  const runtimeSource = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
  const apiSource = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');
  const layoutSource = fs.readFileSync('src/lfea/standalone-layout.js', 'utf8');
  assert.doesNotMatch(historySource, /AnalysisLedger|analysis-ledger-store|EventBus|localStorage|sessionStorage|lafea-linear-solve/u);
  assert.doesNotMatch(viewSource, /innerHTML|insertAdjacentHTML|outerHTML|localStorage|sessionStorage/u);
  assert.match(viewSource, /changes this view only/u);
  assert.match(bootstrapSource, /createLfeaStandaloneRuntime/u);
  assert.match(runtimeSource, /createLfeaNativeRunHistory/u);
  assert.match(runtimeSource, /archiveCurrentRun/u);
  assert.match(apiSource, /selectNativeRun/u);
  assert.match(layoutSource, /id: 'history', label: 'History', state: 'available'/u);
}

function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({
    fileName: 'standalone-native-history.xml',
    content,
  }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  if (preFlight.status === 'BLOCK') throw new Error('Native History fixture unexpectedly BLOCKED.');
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'STANDALONE-NATIVE-HISTORY-TEST',
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
    <PIPINGMODEL xmlns="" JOBNAME="LFEA-STANDALONE-HISTORY">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="${length}" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
