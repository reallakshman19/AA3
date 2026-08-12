import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID } from '../src/workspace/linear-piping-inputxml-intake.js';
import { createLfeaNativeB31PublicationAuthority } from '../src/lfea/native-b31-publication-authority.js';
import { createLfeaNativeStraightCodeStationAuthority } from '../src/lfea/native-b31-code-stations.js';
import { createLfeaNativeEvidenceDossier } from '../src/lfea/native-evidence-dossier.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';
import { createLfeaNativePublicationReadiness } from '../src/lfea/native-publication-readiness.js';
import { createLfeaNativeResultsAuthority } from '../src/lfea/native-results-authority.js';
import { createLfeaNativeRunHistory } from '../src/lfea/native-run-history.js';
import { createLfeaNativeVerification } from '../src/lfea/native-verification.js';
import {
  authorizedPreFlight,
  b31Input,
  fixtureXml,
  pipeSection,
  targetAuthority,
  wrongMaterialDataset,
} from './lfea-standalone-native-b31-publication-fixtures.mjs';

const preFlight = authorizedPreFlight(fixtureXml(1000));
const executionAuthority = createLfeaNativeExecutionAuthority();
const executionState = executionAuthority.run(preFlight);
const resultsAuthority = createLfeaNativeResultsAuthority();
const resultsState = resultsAuthority.recover(preFlight, executionState);
const baseRecovery = resultsState.results.caseRecoveries[0].recovery;
assert.equal(baseRecovery.componentResultants.length, 0);
console.log('LFEA-B31-PUB-01 PASS base native B-3.4 remains bare-frame recovery');

const sourceSnapshot = Object.freeze({
  fileName: 'native-b31.xml', contentSha256: 'c'.repeat(64), sourceUnit: 'mm',
  preFlightSemanticHash: preFlight.semanticHash,
  authorizationSemanticHash: preFlight.authorization.semanticHash,
});
const applicationIdentity = Object.freeze({
  application: 'LFEA', mode: 'STANDALONE', applicationVersion: '0.1.0',
  buildSha: '0123456789abcdef0123456789abcdef01234567',
  buildTime: '2026-08-12T04:00:00.000Z',
});
const history = createLfeaNativeRunHistory();
history.archive({ applicationIdentity, sourceSnapshot, preFlight, executionState, resultsState });
const historySnapshot = history.getSnapshot({
  sourceSnapshot, preFlight, executionState, resultsState,
});

const target = targetAuthority(preFlight);
const input = b31Input(preFlight, target);
const authority = createLfeaNativeB31PublicationAuthority();
assert.throws(
  () => authority.stage(preFlight, { ...input, editionDataset: wrongMaterialDataset() }),
  (error) => error?.code === 'LFEA_NATIVE_B31_EDITION_MATERIAL_MISMATCH',
);
assert.throws(
  () => authority.stage(preFlight, {
    ...input, checks: [{ ...input.checks[0], category: 'OCCASIONAL' }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_CATEGORY_UNSUPPORTED',
);
assert.throws(
  () => authority.stage(preFlight, {
    ...input, checks: [{ ...input.checks[0], pressureStressContribution: null }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_PRESSURE_STRESS_REQUIRED',
);
assert.throws(
  () => authority.stage(preFlight, {
    ...input, checks: [{ ...input.checks[0], combinationId: 'NOT-THE-PHYSICAL-CASE' }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_COMBINATION_CASE_MISMATCH',
);
const thermalCase = preFlight.preparation.physicalPreparation.physicalCases
  .find((row) => row.caseRole === 'WEIGHT_TEMPERATURE');
assert.ok(thermalCase, 'Fixture must expose a thermal physical case for sustained-role rejection.');
assert.throws(
  () => authority.stage(preFlight, {
    ...input,
    checks: [{
      ...input.checks[0],
      combinationId: thermalCase.caseId,
      actionSource: { kind: 'SINGLE_CASE', caseId: thermalCase.caseId },
      evaluationCaseId: thermalCase.caseId,
    }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_SUSTAINED_CASE_ROLE_INVALID',
);
const tooThick = pipeSection(
  'SEC-NATIVE-B31-TOO-THICK',
  target.nominalSection.dimensions.outerDiameter,
  target.nominalSection.dimensions.wallThickness * 1.01,
);
assert.throws(
  () => authority.stage(preFlight, {
    ...input, checks: [{ ...input.checks[0], sustainedSectionResolution: tooThick }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_SUSTAINED_SECTION_WALL_INVALID',
);
console.log('LFEA-B31-PUB-02 PASS material/category/pressure/case-role/section custody fails before review');

const staged = authority.stage(preFlight, input);
assert.equal(staged.authorityCurrentness, 'REVIEW_REQUIRED');
assert.equal(staged.publicationCurrentness, 'NONE');
assert.equal(staged.authority.codeStationAuthority.components.length, 1);
assert.equal(staged.authority.checks[0].sustainedSectionResolution.semanticHash,
  target.nominalSection.semanticHash);
assert.throws(
  () => authority.publish(preFlight, executionState, resultsState),
  (error) => error?.code === 'LFEA_NATIVE_B31_REVIEW_REQUIRED',
);
assert.throws(
  () => authority.authorize(preFlight, {
    reviewerIdentity: 'B31-QUALIFICATION-REVIEWER',
    reason: 'Reject deliberately wrong authority identity.',
    acceptedAuthoritySemanticHash: 'fnv1a64:0000000000000000',
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_REVIEW_AUTHORITY_MISMATCH',
);
console.log('LFEA-B31-PUB-03 PASS sustained section is explicit; stage is review-only and bypasses fail closed');

const reviewed = authority.authorize(preFlight, {
  reviewerIdentity: 'B31-QUALIFICATION-REVIEWER',
  reason: 'Accept the exact fictional qualification code package for orchestration testing only.',
  acceptedAuthoritySemanticHash: staged.authority.semanticHash,
});
const readinessAuthority = authority.readinessAuthority(preFlight, executionState, resultsState);
const readiness = createLfeaNativePublicationReadiness({
  preFlight, resultsState, b31Authority: readinessAuthority,
});
assert.equal(reviewed.authorityCurrentness, 'CURRENT');
assert.equal(readiness.b31Code.status, 'READY');
assert.ok(readinessAuthority.codeRecoveryByCase[LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID]);
console.log('LFEA-B31-PUB-04 PASS reviewed exact-straight authority produces governed code-point readiness');

const beforeVerification = createLfeaNativeVerification({
  applicationIdentity, sourceSnapshot, preFlight, executionState, resultsState,
  historySnapshot, publicationReadiness: readiness, b31PublicationState: authority.getState(),
});
const beforeDossier = createLfeaNativeEvidenceDossier(beforeVerification);
assert.ok(beforeDossier.limitationCodes.includes('B31_CODE_NOT_PUBLISHED'));
assert.equal(beforeDossier.engineeringIssueEligible, false);
console.log('LFEA-B31-PUB-05 PASS reviewed/READY B31 authority is not publication evidence before publish');

const derived = readinessAuthority.codeRecoveryByCase[LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID];
const pointI = derived.augmentedRecovery.componentResultants[0].codePoints
  .find((row) => row.stationId === `${target.elementId}.I`);
const baseAction = baseRecovery.elementActions.find((row) => row.elementId === target.elementId);
assert.deepEqual(pointI.local, baseAction.local.I);
assert.equal(derived.parentBaseRecoverySemanticHash, baseRecovery.semanticHash);
assert.strictEqual(resultsAuthority.getState(), resultsState);
assert.equal(resultsState.results.caseRecoveries[0].recovery.componentResultants.length, 0);
console.log('LFEA-B31-PUB-06 PASS code point is retained B-3.4 end action; base Results are not rewritten/recovered');

const published = authority.publish(preFlight, executionState, resultsState);
assert.equal(published.publicationCurrentness, 'CURRENT');
assert.equal(published.application.schema, 'linear-piping-b31-application/v1');
assert.equal(published.application.results.length, 1);
const codeResult = published.application.results[0].codeResult;
assert.equal(codeResult.componentId, target.elementId);
assert.equal(codeResult.codePointId, `${target.elementId}.I`);
assert.equal(codeResult.category, 'SUSTAINED');
for (const field of ['calculatedStress', 'allowableStress', 'utilization']) {
  assert.ok(Number.isFinite(codeResult[field]), `${field} must be finite`);
}
console.log('LFEA-B31-PUB-07 PASS existing governed B31 compiler publishes sealed sustained straight-pipe result');

const afterVerification = createLfeaNativeVerification({
  applicationIdentity, sourceSnapshot, preFlight, executionState, resultsState,
  historySnapshot, publicationReadiness: readiness, b31PublicationState: published,
});
assert.equal(afterVerification.b31Publication.status, 'CURRENT');
assert.equal(afterVerification.b31Publication.authoritySemanticHash, staged.authority.semanticHash);
assert.equal(afterVerification.b31Publication.authorizationSemanticHash, reviewed.authorization.semanticHash);
assert.equal(afterVerification.b31Publication.applicationSemanticHash, published.application.semanticHash);
assert.equal(afterVerification.b31Publication.codeResults[0].semanticHash, codeResult.semanticHash);
const afterDossier = createLfeaNativeEvidenceDossier(afterVerification);
assert.equal(afterDossier.engineeringIssueEligible, false);
assert.equal(afterDossier.limitationCodes.includes('B31_CODE_NOT_PUBLISHED'), false);
console.log('LFEA-B31-PUB-08 PASS Verification/Dossier retain exact B31 lineage without granting issue authority');

const fakePreFlight = structuredClone(preFlight);
fakePreFlight.preparation.structuralPreparation.segmentBindings[0].componentKind = 'BEND';
assert.throws(
  () => createLfeaNativeStraightCodeStationAuthority(fakePreFlight, staged.authority.checks),
  (error) => error?.code === 'LFEA_NATIVE_B31_TARGET_NOT_EXACT_STRAIGHT_PIPE',
);
console.log('LFEA-B31-PUB-09 PASS fitting/approximate semantics cannot enter first native B31 population');

const moved = authorizedPreFlight(fixtureXml(1200));
const stale = authority.reconcile(moved, executionState, resultsState);
assert.equal(stale.authorityCurrentness, 'STALE');
assert.equal(stale.publicationCurrentness, 'STALE');
assert.equal(authority.getCurrentApplication(), null);
authority.reconcile(preFlight, executionState, resultsState);
assert.equal(authority.getState().authorityCurrentness, 'STALE');
console.log('LFEA-B31-PUB-10 PASS source/model movement is sticky-stale and cannot reactivate code authority');

sourceGuards();
console.log('LFEA-B31-PUB-11 PASS B31 composition retains layer ownership and source-size guards');
console.log(JSON.stringify({
  check: 'lfea-standalone-native-b31-publication', status: 'PASS',
  straightPipeOnly: true, sustainedOnly: true, explicitSustainedSection: true,
  explicitPressureStress: true, sustainedCaseRolesOnly: true,
  secondSolve: false, secondB34Recovery: false, reviewRequired: true,
  baseRecoveryImmutable: true, evidenceOnlyDossier: true, codeData: 'FIXTURE-NOT-ASME',
}));

function sourceGuards() {
  const paths = [
    'src/lfea/native-b31-publication-authority.js',
    'src/lfea/native-b31-authority-contract.js',
    'src/lfea/native-b31-application-checks.js',
    'src/lfea/native-b31-case-chain.js',
    'src/lfea/native-b31-code-stations.js',
  ];
  const [authoritySource, contract, checks, chain, stations] = paths.map(read);
  const resultView = read('src/lfea/native-b31-results-view.js');
  const runtime = read('src/lfea/standalone-runtime.js');
  const api = read('src/lfea/standalone-runtime-api.js');
  assert.doesNotMatch(`${authoritySource}\n${chain}`, /compileSolverExecution|compileResultRecovery/u);
  assert.match(chain, /recoverComponentCodePoint/u);
  assert.match(chain, /LFEA_NATIVE_B31_CURRENT_CASE_EXECUTION_REQUIRED/u);
  assert.match(authoritySource, /compileLinearPipingB31Application/u);
  assert.match(contract, /LFEA_NATIVE_B31_PRESSURE_STRESS_REQUIRED/u);
  assert.match(contract, /LFEA_NATIVE_B31_SUSTAINED_CASE_ROLE_INVALID/u);
  assert.match(checks, /EDITION_MATERIAL_MISMATCH/u);
  assert.match(checks, /SUSTAINED_SECTION_WALL_INVALID/u);
  assert.match(stations, /IMPLEMENTED_EXACTLY/u);
  assert.match(stations, /STRAIGHT_PIPE/u);
  assert.doesNotMatch(resultView, /calculatedStress\s*=|utilization\s*=|compileCodeResult/u);
  for (const source of [...paths.map(read), runtime]) {
    assert.ok(lines(source) < 300, `native B31/runtime module exceeds 299 lines (${lines(source)})`);
  }
  assert.ok(lines(api) < 120, `standalone runtime API is ${lines(api)} lines`);
}
function read(path) { return fs.readFileSync(path, 'utf8'); }
function lines(source) { return source.split(/\r?\n/u).length; }
