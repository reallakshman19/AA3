import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_COMPARISON_STATUS,
  compareLfeaNativeRunRecords,
  compareQuantityPair,
  extractLfeaComparableQuantities,
} from '../src/lfea/native-run-comparison.js';

const runA = runRecord('A', { displacement: 0.01, reaction: 100, actionScale: 1 });
const runB = runRecord('B', { displacement: 0.015, reaction: 125, actionScale: 1.2 });
const comparison = compareLfeaNativeRunRecords(runA, runB);
assert.equal(comparison.schema, 'lfea-native-run-comparison/v1');
assert.equal(comparison.rowCount, 26);
assert.equal(comparison.comparableCount, 26);
assert.equal(comparison.incompatibleCount, 0);
assert.equal(Object.isFrozen(comparison), true);
const displacement = comparison.rows.find((row) => row.left?.quantityId === 'B3.3_NODE_DISPLACEMENT_UX');
assert.equal(displacement.status, LFEA_COMPARISON_STATUS.COMPARABLE);
assert.ok(Math.abs(displacement.delta - 0.005) < 1e-12);
assert.ok(Math.abs(displacement.absoluteDelta - 0.005) < 1e-12);
console.log('LFEA-NATIVE-COMPARE-01 PASS compatible retained quantities produce signed and absolute deltas');

const quantities = extractLfeaComparableQuantities(runA);
assert.equal(quantities.length, 26);
assert.equal(quantities.find((row) => row.quantityId === 'B3.3_NODE_REACTION_UX').signConvention,
  'SUPPORT_ACTION_ON_STRUCTURE_R_EQ_KU_MINUS_F_V1');
const localAction = quantities.find((row) => row.quantityId === 'B3.4_ELEMENT_END_FX'
  && row.stationIdentity === 'END:I' && row.basisId.startsWith('ELEMENT_LOCAL_AXES:'));
assert.equal(localAction.signConvention, 'FRAME_END_ACTION_ON_ELEMENT_V1');
assert.equal(localAction.unit, 'N');
console.log('LFEA-NATIVE-COMPARE-02 PASS extracted quantities retain governed basis, units, sign convention, entity, end, case, and authority');

const changedAxis = runRecord('C', {
  displacement: 0.02, reaction: 90, actionScale: 0.9, localAxisHash: 'fnv1a64:bbbbbbbbbbbbbbbb',
});
const axisComparison = compareLfeaNativeRunRecords(runA, changedAxis);
assert.equal(axisComparison.rowCount, 26);
assert.equal(axisComparison.comparableCount, 14);
assert.equal(axisComparison.incompatibleCount, 12);
for (const row of axisComparison.rows.filter((entry) => entry.status === LFEA_COMPARISON_STATUS.NOT_DIRECTLY_COMPARABLE)) {
  assert.deepEqual(row.reasonCodes, ['BASIS_MISMATCH']);
  assert.equal(row.delta, null);
}
console.log('LFEA-NATIVE-COMPARE-03 PASS changed local-axis identity blocks local deltas while compatible global quantities remain comparable');

const changedCaseIdentity = runRecord('D', {
  displacement: 0.02, reaction: 90, actionScale: 0.9, physicalLoadCaseHash: 'fnv1a64:cccccccccccccccc',
});
const caseComparison = compareLfeaNativeRunRecords(runA, changedCaseIdentity);
assert.equal(caseComparison.comparableCount, 0);
assert.equal(caseComparison.incompatibleCount, 26);
assert.ok(caseComparison.rows.every((row) => row.reasonCodes.includes('PHYSICAL_CASE_MISMATCH')));
assert.ok(caseComparison.rows.every((row) => row.delta === null));
console.log('LFEA-NATIVE-COMPARE-04 PASS changed physical-case identity never produces a numeric delta');

const differentCaseId = runRecord('E', {
  displacement: 0.02, reaction: 90, actionScale: 0.9, caseId: 'CASE-B',
});
const idComparison = compareLfeaNativeRunRecords(runA, differentCaseId);
assert.equal(idComparison.comparableCount, 0);
assert.equal(idComparison.rowCount, 52);
assert.ok(idComparison.rows.every((row) => row.reasonCodes.some((code) => code.startsWith('QUANTITY_MISSING_'))));
console.log('LFEA-NATIVE-COMPARE-05 PASS different case IDs are not silently paired by field name');

const changedMethod = runRecord('F', {
  displacement: 0.02, reaction: 90, actionScale: 0.9, solverProfileHash: 'fnv1a64:dddddddddddddddd',
});
const methodComparison = compareLfeaNativeRunRecords(runA, changedMethod);
assert.equal(methodComparison.comparableCount, 0);
assert.ok(methodComparison.rows.every((row) => row.reasonCodes.includes('METHOD_IDENTITY_MISMATCH')));
console.log('LFEA-NATIVE-COMPARE-06 PASS solver/method identity change blocks direct comparison');

const changedFrameMethod = runRecord('F2', {
  displacement: 0.02,
  reaction: 90,
  actionScale: 0.9,
  frameElementProfileHash: 'fnv1a64:ffffffffffffffff',
});
const frameMethodComparison = compareLfeaNativeRunRecords(runA, changedFrameMethod);
assert.equal(frameMethodComparison.comparableCount, 0);
assert.ok(frameMethodComparison.rows.every((row) => row.reasonCodes.includes('METHOD_IDENTITY_MISMATCH')));
console.log('LFEA-NATIVE-COMPARE-06B PASS frame-element formulation profile participates in method compatibility');

const changedRecoveryMethod = runRecord('F3', {
  displacement: 0.02,
  reaction: 90,
  actionScale: 0.9,
  recoveryProfileHash: 'fnv1a64:9999999999999999',
});
const recoveryMethodComparison = compareLfeaNativeRunRecords(runA, changedRecoveryMethod);
assert.equal(recoveryMethodComparison.comparableCount, 2);
assert.equal(recoveryMethodComparison.incompatibleCount, 24);
assert.ok(recoveryMethodComparison.rows
  .filter((row) => row.left?.resultAuthority === 'RECOVERED_B3.4_ELEMENT_ACTION')
  .every((row) => row.reasonCodes.includes('METHOD_IDENTITY_MISMATCH')));
console.log('LFEA-NATIVE-COMPARE-06C PASS recovery-profile changes block recovered deltas without blocking unchanged raw quantities');

const missingAxis = runRecord('G', {
  displacement: 0.02, reaction: 90, actionScale: 0.9, localAxisHash: null,
});
const unavailableBasis = compareLfeaNativeRunRecords(missingAxis, missingAxisWithId('H'));
const localUnavailableRows = unavailableBasis.rows.filter((row) => row.left?.basisId.endsWith(':UNAVAILABLE'));
assert.equal(localUnavailableRows.length, 12);
assert.ok(localUnavailableRows.every((row) => row.reasonCodes.includes('BASIS_UNAVAILABLE')));
assert.ok(localUnavailableRows.every((row) => row.delta === null));
console.log('LFEA-NATIVE-COMPARE-07 PASS unavailable local-axis evidence cannot become comparable by matching absence');

const reference = quantities.find((row) => row.quantityId === 'B3.3_NODE_REACTION_UX');
const mutations = [
  ['quantityId', 'OTHER', 'QUANTITY_ID_MISMATCH'],
  ['dimension', 'LENGTH', 'DIMENSION_MISMATCH'],
  ['unit', 'kN', 'UNIT_MISMATCH'],
  ['basisId', 'OTHER_BASIS', 'BASIS_MISMATCH'],
  ['signConvention', 'OTHER_SIGN', 'SIGN_CONVENTION_MISMATCH'],
  ['entityIdentity', 'NODE:N-OTHER', 'ENTITY_IDENTITY_MISMATCH'],
  ['stationIdentity', 'UY', 'STATION_IDENTITY_MISMATCH'],
  ['physicalLoadCaseHash', 'fnv1a64:eeeeeeeeeeeeeeee', 'PHYSICAL_CASE_MISMATCH'],
  ['resultAuthority', 'OTHER_AUTHORITY', 'RESULT_AUTHORITY_MISMATCH'],
  ['methodIdentity', 'OTHER_METHOD', 'METHOD_IDENTITY_MISMATCH'],
];
for (const [field, value, reason] of mutations) {
  const row = compareQuantityPair(reference, Object.freeze({ ...reference, [field]: value }));
  assert.equal(row.status, LFEA_COMPARISON_STATUS.NOT_DIRECTLY_COMPARABLE, field);
  assert.ok(row.reasonCodes.includes(reason), `${field} missing ${reason}`);
  assert.equal(row.delta, null);
}
const unavailableValue = compareQuantityPair(reference, Object.freeze({ ...reference, value: null }));
assert.ok(unavailableValue.reasonCodes.includes('VALUE_UNAVAILABLE'));
assert.equal(unavailableValue.delta, null);
const unavailableMethod = compareQuantityPair(reference, Object.freeze({ ...reference, methodIdentity: 'B3.3:UNAVAILABLE:x:y' }));
assert.ok(unavailableMethod.reasonCodes.includes('METHOD_IDENTITY_UNAVAILABLE'));
assert.equal(unavailableMethod.delta, null);
console.log('LFEA-NATIVE-COMPARE-08 PASS every semantic tuple dimension and unavailable value/method fails closed independently');

sourceGuards();
console.log('LFEA-NATIVE-COMPARE-09 PASS Compare is a production view consumer with no support/code derivation, storage, EventBus, generic ledger, or LAFEA coupling');

console.log(JSON.stringify({
  check: 'lfea-standalone-native-comparison',
  status: 'PASS',
  semanticTuple: true,
  compatibleDeltas: true,
  incompatibleReasons: true,
  falseZeroPrevented: true,
}));

function runRecord(id, options) {
  const caseId = options.caseId ?? 'CASE-A';
  const physicalLoadCaseHash = options.physicalLoadCaseHash ?? 'fnv1a64:1111111111111111';
  const solverProfileHash = options.solverProfileHash ?? 'fnv1a64:2222222222222222';
  const frameElementProfileHash = options.frameElementProfileHash ?? 'fnv1a64:4444444444444444';
  const recoveryProfileHash = options.recoveryProfileHash ?? 'fnv1a64:3333333333333333';
  const localAxisHash = options.localAxisHash === undefined ? 'fnv1a64:aaaaaaaaaaaaaaaa' : options.localAxisHash;
  const action = actionPair(options.actionScale);
  return Object.freeze({
    schema: 'lfea-native-run-record/v1',
    runId: `LFEA-RUN-${id}`,
    evidence: Object.freeze({
      rawExecutionBatch: Object.freeze({
        requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
        caseExecutions: Object.freeze([Object.freeze({
          caseId,
          physicalLoadCaseHash,
          frameElementProfileSemanticHash: frameElementProfileHash,
          solverProfileSemanticHash: solverProfileHash,
          elementLedger: Object.freeze([Object.freeze({
            elementId: 'E-000001',
            localAxisResultSemanticHash: localAxisHash,
          })]),
          execution: Object.freeze({
            displacement: Object.freeze([Object.freeze({ nodeId: 'N-000001', dof: 'UX', value: options.displacement })]),
            reactions: Object.freeze([Object.freeze({ nodeId: 'N-000001', dof: 'UX', value: options.reaction })]),
          }),
        })]),
      }),
      recoveryBatch: Object.freeze({
        recoveryProfileSemanticHash: recoveryProfileHash,
        caseRecoveries: Object.freeze([Object.freeze({
          caseId,
          physicalLoadCaseHash,
          recovery: Object.freeze({
            elementActions: Object.freeze([Object.freeze({
              elementId: 'E-000001', local: action, global: action,
            })]),
          }),
        })]),
      }),
    }),
  });
}

function missingAxisWithId(id) {
  return runRecord(id, { displacement: 0.03, reaction: 80, actionScale: 0.8, localAxisHash: null });
}

function actionPair(scale) {
  const values = (factor) => Object.freeze({
    fx: 10 * factor, fy: 20 * factor, fz: 30 * factor,
    mx: 40 * factor, my: 50 * factor, mz: 60 * factor,
  });
  return Object.freeze({ I: values(scale), J: values(-scale) });
}

function sourceGuards() {
  const engine = fs.readFileSync('src/lfea/native-run-comparison.js', 'utf8');
  const controller = fs.readFileSync('src/lfea/native-comparison-controller.js', 'utf8');
  const view = fs.readFileSync('src/lfea/native-comparison-view.js', 'utf8');
  const bootstrap = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
  const runtime = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
  const api = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');
  const layout = fs.readFileSync('src/lfea/standalone-layout.js', 'utf8');
  for (const source of [engine, controller, view]) {
    assert.doesNotMatch(source, /AnalysisLedger|analysis-ledger|EventBus|localStorage|sessionStorage|lafea-linear-solve/u);
  }
  assert.doesNotMatch(engine, /support.?action|B31|utilization|allowable/iu);
  assert.doesNotMatch(view, /innerHTML|insertAdjacentHTML|outerHTML/u);
  assert.match(view, /Deltas are produced only when quantity, dimension, unit, basis/u);
  assert.match(bootstrap, /createLfeaStandaloneRuntime/u);
  assert.match(runtime, /compareHistoryRuns/u);
  assert.match(runtime, /assertAuthorityUnchanged/u);
  assert.match(api, /compareNativeRuns/u);
  assert.match(layout, /id: 'compare', label: 'Compare', state: 'available'/u);
}
