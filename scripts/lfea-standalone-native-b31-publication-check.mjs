import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PIPE_SECTION_FORMULATION_ID,
  PIPE_SECTION_PROFILE,
  PIPE_SECTION_REQUEST_SCHEMA,
  computePipeSectionRequestSemanticHash,
  resolvePipeSection,
} from '../src/core/linear-fea-section/index.js';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaNativeB31PublicationAuthority } from '../src/lfea/native-b31-publication-authority.js';
import { createLfeaNativeStraightCodeStationAuthority } from '../src/lfea/native-b31-code-stations.js';
import { createLfeaNativeEvidenceDossier } from '../src/lfea/native-evidence-dossier.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';
import { createLfeaNativePublicationReadiness } from '../src/lfea/native-publication-readiness.js';
import { createLfeaNativeResultsAuthority } from '../src/lfea/native-results-authority.js';
import { createLfeaNativeRunHistory } from '../src/lfea/native-run-history.js';
import { createLfeaNativeVerification } from '../src/lfea/native-verification.js';
import { codeProfile, editionDataset, stressFactorSet } from './lfea-b4.0-code-engine-fixtures.mjs';

const preFlight = authorizedPreFlight(fixtureXml(1000));
const executionAuthority = createLfeaNativeExecutionAuthority();
const executionState = executionAuthority.run(preFlight);
const resultsAuthority = createLfeaNativeResultsAuthority();
const resultsState = resultsAuthority.recover(preFlight, executionState);
const baseRecovery = resultsState.results.caseRecoveries[0].recovery;
assert.equal(baseRecovery.componentResultants.length, 0);
console.log('LFEA-B31-PUB-01 PASS base native B-3.4 remains bare-frame recovery');

const sourceSnapshot = Object.freeze({
  fileName: 'native-b31.xml',
  contentSha256: 'c'.repeat(64),
  sourceUnit: 'mm',
  preFlightSemanticHash: preFlight.semanticHash,
  authorizationSemanticHash: preFlight.authorization.semanticHash,
});
const applicationIdentity = Object.freeze({
  application: 'LFEA',
  mode: 'STANDALONE',
  applicationVersion: '0.1.0',
  buildSha: '0123456789abcdef0123456789abcdef01234567',
  buildTime: '2026-08-12T04:00:00.000Z',
});
const history = createLfeaNativeRunHistory();
history.archive({ applicationIdentity, sourceSnapshot, preFlight, executionState, resultsState });
const historySnapshot = history.getSnapshot({
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
});

const target = targetAuthority(preFlight);
const input = b31Input(preFlight, target);
const authority = createLfeaNativeB31PublicationAuthority();
assert.throws(
  () => authority.stage(preFlight, {
    ...input,
    editionDataset: editionDataset({ materialId: 'WRONG-MATERIAL-FIXTURE' }),
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_EDITION_MATERIAL_MISMATCH',
);
assert.throws(
  () => authority.stage(preFlight, {
    ...input,
    checks: [{ ...input.checks[0], category: 'OCCASIONAL' }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_CATEGORY_UNSUPPORTED',
);
const tooThick = pipeSection(
  'SEC-NATIVE-B31-TOO-THICK',
  target.nominalSection.dimensions.outerDiameter,
  target.nominalSection.dimensions.wallThickness * 1.01,
);
assert.throws(
  () => authority.stage(preFlight, {
    ...input,
    checks: [{ ...input.checks[0], sustainedSectionResolution: tooThick }],
  }),
  (error) => error?.code === 'LFEA_NATIVE_B31_SUSTAINED_SECTION_WALL_INVALID',
);
console.log('LFEA-B31-PUB-02 PASS material mismatch, unsupported category and invalid sustained wall fail before review');

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
assert.equal(reviewed.authorityCurrentness, 'CURRENT');
assert.equal(reviewed.authorization.b31AuthoritySemanticHash, staged.authority.semanticHash);
const readinessAuthority = authority.readinessAuthority(preFlight, executionState, resultsState);
const readiness = createLfeaNativePublicationReadiness({
  preFlight,
  resultsState,
  b31Authority: readinessAuthority,
});
assert.equal(readiness.b31Code.status, 'READY');
assert.ok(readinessAuthority.codeRecoveryByCase[LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID]);
console.log('LFEA-B31-PUB-04 PASS reviewed exact-straight authority produces governed code-point readiness');

const beforePublishVerification = createLfeaNativeVerification({
  applicationIdentity,
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
  historySnapshot,
  publicationReadiness: readiness,
  b31PublicationState: authority.getState(),
});
const beforePublishDossier = createLfeaNativeEvidenceDossier(beforePublishVerification);
assert.ok(beforePublishDossier.limitationCodes.includes('B31_CODE_NOT_PUBLISHED'));
assert.equal(beforePublishDossier.engineeringIssueEligible, false);
console.log('LFEA-B31-PUB-05 PASS reviewed/READY B31 authority is not dossier publication evidence before publish');

const derived = readinessAuthority.codeRecoveryByCase[LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID];
const augmented = derived.augmentedRecovery;
const component = augmented.componentResultants[0];
const pointI = component.codePoints.find((row) => row.stationId === `${target.elementId}.I`);
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
assert.ok(Number.isFinite(codeResult.calculatedStress));
assert.ok(Number.isFinite(codeResult.allowableStress));
assert.ok(Number.isFinite(codeResult.utilization));
console.log('LFEA-B31-PUB-07 PASS existing governed B31 compiler publishes sealed sustained straight-pipe result');

const publishedVerification = createLfeaNativeVerification({
  applicationIdentity,
  sourceSnapshot,
  preFlight,
  executionState,
  resultsState,
  historySnapshot,
  publicationReadiness: readiness,
  b31PublicationState: published,
});
assert.equal(publishedVerification.b31Publication.status, 'CURRENT');
assert.equal(publishedVerification.b31Publication.authoritySemanticHash, staged.authority.semanticHash);
assert.equal(publishedVerification.b31Publication.authorizationSemanticHash, reviewed.authorization.semanticHash);
assert.equal(publishedVerification.b31Publication.applicationSemanticHash, published.application.semanticHash);
assert.equal(publishedVerification.b31Publication.codeResults[0].semanticHash, codeResult.semanticHash);
const publishedDossier = createLfeaNativeEvidenceDossier(publishedVerification);
assert.equal(publishedDossier.engineeringIssueEligible, false);
assert.equal(publishedDossier.limitationCodes.includes('B31_CODE_NOT_PUBLISHED'), false);
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
  check: 'lfea-standalone-native-b31-publication',
  status: 'PASS',
  straightPipeOnly: true,
  sustainedOnly: true,
  explicitSustainedSection: true,
  secondSolve: false,
  secondB34Recovery: false,
  reviewRequired: true,
  baseRecoveryImmutable: true,
  evidenceOnlyDossier: true,
  codeData: 'FIXTURE-NOT-ASME',
}));

function targetAuthority(record) {
  const structural = record.preparation.structuralPreparation;
  const binding = structural.segmentBindings.find((row) => row.componentKind === 'STRAIGHT_PIPE');
  assert.ok(binding);
  const material = structural.materialResolutions
    .find((row) => row.semanticHash === binding.materialResolutionSemanticHash);
  const nominalSection = structural.sectionResolutions
    .find((row) => row.semanticHash === binding.analysisSectionSemanticHash);
  assert.ok(material);
  assert.ok(nominalSection);
  return {
    elementId: binding.elementId,
    materialId: material.materialState.materialId,
    nominalSection,
  };
}
function b31Input(record, target) {
  const caseId = LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID;
  return {
    parentSourceBundleSemanticHash: record.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: record.preparation.modelSemanticHash,
    codeProfile: codeProfile(),
    editionDataset: editionDataset({ materialId: target.materialId }),
    checks: [{
      checkId: 'B31-SUS-NATIVE-STRAIGHT-I',
      category: 'SUSTAINED',
      elementId: target.elementId,
      end: 'I',
      combinationId: caseId,
      actionSource: { kind: 'SINGLE_CASE', caseId },
      evaluationCaseId: caseId,
      stressFactorSet: stressFactorSet({
        factorSetId: 'SF-NATIVE-STRAIGHT-FIXTURE',
        componentId: target.elementId,
      }),
      sectionBasisReason: 'Qualification source has no retained allowance applied here; reviewer explicitly selects the sealed nominal B-2.3 section as sustained basis.',
      sustainedSectionResolution: target.nominalSection,
      pressureStressContribution: { value: 0, source: 'FIXTURE-NATIVE-B31-NOT-ASME' },
      coldTemperature: null,
      sustainedStress: null,
      occasionalCategoryId: null,
    }],
  };
}
function pipeSection(sectionStateId, outerDiameter, wallThickness) {
  const base = {
    schema: PIPE_SECTION_REQUEST_SCHEMA,
    sectionStateId,
    formulationId: PIPE_SECTION_FORMULATION_ID,
    outerDiameter,
    wallThickness,
    sourceEvidence: {
      sourceId: 'LFEA-NATIVE-B31-QUALIFICATION',
      sourceRevision: '00',
      sourceSemanticHash: 'fnv1a64:bbbbbbbbbbbbbbbb',
    },
  };
  return resolvePipeSection({
    request: { ...base, semanticHash: computePipeSectionRequestSemanticHash(base) },
    profile: PIPE_SECTION_PROFILE,
  });
}
function sourceGuards() {
  const authority = read('src/lfea/native-b31-publication-authority.js');
  const contract = read('src/lfea/native-b31-authority-contract.js');
  const checks = read('src/lfea/native-b31-application-checks.js');
  const chain = read('src/lfea/native-b31-case-chain.js');
  const stations = read('src/lfea/native-b31-code-stations.js');
  const resultView = read('src/lfea/native-b31-results-view.js');
  const runtime = read('src/lfea/standalone-runtime.js');
  const api = read('src/lfea/standalone-runtime-api.js');
  assert.doesNotMatch(`${authority}\n${chain}`, /compileSolverExecution|compileResultRecovery/u);
  assert.match(chain, /recoverComponentCodePoint/u);
  assert.match(authority, /compileLinearPipingB31Application/u);
  assert.match(contract, /sustainedSectionResolution/u);
  assert.match(checks, /EDITION_MATERIAL_MISMATCH/u);
  assert.match(checks, /SUSTAINED_SECTION_WALL_INVALID/u);
  assert.match(stations, /IMPLEMENTED_EXACTLY/u);
  assert.match(stations, /STRAIGHT_PIPE/u);
  assert.doesNotMatch(resultView, /calculatedStress\s*=|utilization\s*=|compileCodeResult/u);
  assert.ok(lines(runtime) < 300, `standalone runtime is ${lines(runtime)} lines`);
  assert.ok(lines(api) < 120, `standalone runtime API is ${lines(api)} lines`);
  for (const source of [authority, contract, checks, chain, stations]) {
    assert.ok(lines(source) < 300, `native B31 module exceeds 299 lines (${lines(source)})`);
  }
}
function read(path) { return fs.readFileSync(path, 'utf8'); }
function lines(source) { return source.split(/\r?\n/u).length; }
function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({ fileName: 'native-b31.xml', content }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let record = prepareLinearPipingInputXmlPreFlight(intake);
  if (record.status === 'BLOCK') throw new Error('Native B31 qualification fixture unexpectedly BLOCKED.');
  if (!record.solveAuthorized) {
    record = authorizeLinearPipingInputXmlPreFlight(record, {
      approverIdentity: 'LFEA-NATIVE-B31-QUALIFICATION',
      reason: 'Test-only acceptance of the complete retained conditional limitation set.',
    });
  }
  return record;
}
function fixtureXml(length) {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input"><UNITS>
  <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
  <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
  <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
  <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS><PIPINGMODEL xmlns="" JOBNAME="LFEA-NATIVE-B31">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="${length}" DELTA_Y="0" DELTA_Z="0"
  DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
  MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
  <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
  </PIPINGELEMENT></PIPINGMODEL></CAESARII>`;
}
