import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_PUBLICATION_STATUS,
  createLfeaNativePublicationReadiness,
} from '../src/lfea/native-publication-readiness.js';

const preFlight = {
  preparation: {
    structuralPreparation: { compilation: { schema: 'fea-mechanical-model-compilation/v1' } },
  },
};
const recoveryBatch = {
  schema: 'fea-inputxml-linear-recovery-batch/v1',
  caseRecoveries: [{
    caseId: 'CASE-A',
    recovery: { componentResultants: [] },
  }],
};
const currentResults = { currentness: 'CURRENT', results: recoveryBatch };

const blocked = createLfeaNativePublicationReadiness({
  preFlight,
  resultsState: currentResults,
});
assert.equal(blocked.schema, 'lfea-native-publication-readiness/v1');
assert.equal(blocked.supportActions.status, LFEA_PUBLICATION_STATUS.BLOCKED);
assert.deepEqual(blocked.supportActions.producerChain, [
  'compileLinearPipingInterfaceSet',
  'recoverLinearPipingInterfaceLoads',
  'createLinearPipingSupportActionsPublication',
]);
assert.deepEqual(blocked.supportActions.reasonCodes, [
  'EXPLICIT_PARALLEL_TOLERANCE_REQUIRED',
  'EXPLICIT_UP_GLOBAL_REQUIRED',
  'GOVERNED_INTERFACE_SET_REQUIRED',
  'GOVERNED_LINEAR_PIPING_ANALYSIS_RESULT_REQUIRED',
]);
console.log('LFEA-PUBLICATION-01 PASS current B-3.4 evidence does not fabricate missing support/interface authority');

assert.equal(blocked.b31Code.status, LFEA_PUBLICATION_STATUS.BLOCKED);
assert.deepEqual(blocked.b31Code.producerChain, ['compileLinearPipingB31Application']);
assert.deepEqual(blocked.b31Code.reasonCodes, [
  'COMPONENT_CODE_POINT_RECOVERY_REQUIRED',
  'GOVERNED_B31_CHECK_SET_REQUIRED',
  'GOVERNED_CODE_PROFILE_REQUIRED',
  'GOVERNED_EDITION_DATASET_REQUIRED',
]);
console.log('LFEA-PUBLICATION-02 PASS frame-only B-3.4 recovery cannot be promoted into B31 code authority');

const stale = createLfeaNativePublicationReadiness({
  preFlight,
  resultsState: { currentness: 'STALE', results: recoveryBatch },
});
assert.ok(stale.supportActions.reasonCodes.includes('CURRENT_B3_4_RECOVERY_REQUIRED'));
assert.ok(stale.b31Code.reasonCodes.includes('CURRENT_B3_4_RECOVERY_REQUIRED'));
console.log('LFEA-PUBLICATION-03 PASS stale recovery blocks all downstream engineering publication');

const noModel = createLfeaNativePublicationReadiness({ resultsState: currentResults });
assert.ok(noModel.supportActions.reasonCodes.includes('CURRENT_MECHANICAL_COMPILATION_REQUIRED'));
assert.ok(noModel.b31Code.reasonCodes.includes('CURRENT_MECHANICAL_COMPILATION_REQUIRED'));
console.log('LFEA-PUBLICATION-04 PASS missing governed mechanical compilation remains an explicit blocker');

sourceAndSizeGuards();
console.log('LFEA-PUBLICATION-05 PASS Stage-10 composition is bounded and application code does not re-derive support/B31 quantities');

console.log(JSON.stringify({
  check: 'lfea-standalone-publication-readiness',
  status: 'PASS',
  supportAuthorityFabricated: false,
  b31AuthorityFabricated: false,
  stalePublicationBlocked: true,
  compositionWithinBudget: true,
}));

function sourceAndSizeGuards() {
  const bootstrap = read('src/lfea/bootstrap.js');
  const runtime = read('src/lfea/standalone-runtime.js');
  const api = read('src/lfea/standalone-runtime-api.js');
  const readiness = read('src/lfea/native-publication-readiness.js');
  const resultsView = read('src/lfea/native-results-view.js');
  assert.ok(lineCount(bootstrap) < 80, `bootstrap.js is ${lineCount(bootstrap)} lines`);
  assert.ok(lineCount(runtime) < 300, `standalone-runtime.js is ${lineCount(runtime)} lines`);
  assert.ok(lineCount(api) < 120, `standalone-runtime-api.js is ${lineCount(api)} lines`);
  assert.match(bootstrap, /createLfeaStandaloneRuntime/u);
  assert.doesNotMatch(bootstrap, /LfeaWorkbenchController|createLfeaNativeExecutionAuthority|createLfeaNativeResultsAuthority/u);
  assert.match(readiness, /structuralPreparation/u);
  assert.match(readiness, /compileLinearPipingInterfaceSet/u);
  assert.match(readiness, /recoverLinearPipingInterfaceLoads/u);
  assert.match(readiness, /createLinearPipingSupportActionsPublication/u);
  assert.match(readiness, /compileLinearPipingB31Application/u);
  for (const source of [readiness, resultsView, runtime]) {
    assert.doesNotMatch(source, /forceLocal\s*\.|fAxial\s*=|fLateral\s*=|fVertical\s*=|calculatedStress\s*=|utilization\s*=/u);
    assert.doesNotMatch(source, /localStorage|sessionStorage/u);
  }
  assert.doesNotMatch(readiness, /DEFAULT.*UP|upGlobal\s*:\s*\{\s*x\s*:\s*0/u);
  assert.doesNotMatch(readiness, /parallelTolerance\s*:\s*[0-9]/u);
  assert.match(resultsView, /support-action projections and code-applied quantities are separate engineering authorities/u);
}

function read(file) { return fs.readFileSync(file, 'utf8'); }
function lineCount(source) { return source.split(/\r?\n/u).length; }
