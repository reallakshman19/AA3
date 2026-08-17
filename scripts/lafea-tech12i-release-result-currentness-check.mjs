#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT,
  LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA,
  createLafeaWorkbenchReleaseState,
  governLafeaWorkbenchReleaseBindingForResultCurrentness,
} from '../src/workspace/lafea-workbench-release-binding.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = readJson(
  'validation/lafea4-refinement/parent-normal-release-result-currentness-v1.json',
);
const planText = readText('validation/lafea-independent-qualification/plan-v1.json');
const plan = JSON.parse(planText);
assert.equal(`${JSON.stringify(plan, null, 2)}\n`, planText);

assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);
assert.equal(definition.currentTrustRoot, 'NULL');
assert.equal(
  definition.futureTrustedGateRevokesResult.requiredReason,
  LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT,
);

const recordSemanticHash = `sha256:${'1'.repeat(64)}`;
const evidenceHash = `sha256:${'2'.repeat(64)}`;
const currentBinding = Object.freeze({
  schema: LAFEA_WORKBENCH_RELEASE_BINDING_SCHEMA,
  stageId: 'LAFEA.4',
  candidateHeadSha: 'a'.repeat(40),
  bindingStatus: 'CURRENT',
  releaseQualified: true,
  authorityState: 'RELEASE_QUALIFIED',
  recordValidity: 'CURRENT',
  recordId: 'TECH12I-RELEASE',
  semanticHash: recordSemanticHash,
  evidenceHash,
  evidenceAuthorizationStatus: 'AUTHORIZED',
  targetCompatibilityStatus: 'CURRENT',
  targetCompatibilityReasons: [],
  reasons: [],
});

const governedCurrent = governLafeaWorkbenchReleaseBindingForResultCurrentness(
  currentBinding,
  { governedMesh: true, resultReady: true },
);
assert.strictEqual(governedCurrent, currentBinding);
assert.equal(governedCurrent.bindingStatus, 'CURRENT');
assert.equal(governedCurrent.releaseQualified, true);

const governedStale = governLafeaWorkbenchReleaseBindingForResultCurrentness(
  currentBinding,
  { governedMesh: true, resultReady: false },
);
assert.notStrictEqual(governedStale, currentBinding);
assert.equal(governedStale.bindingStatus, definition.futureTrustedGateRevokesResult.releaseBindingStatus);
assert.equal(governedStale.releaseQualified, false);
assert.deepEqual(governedStale.reasons, [LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT]);
assert.equal(governedStale.semanticHash, recordSemanticHash);
assert.equal(governedStale.evidenceHash, evidenceHash);
assert.equal(governedStale.authorityState, 'RELEASE_QUALIFIED');
assert.equal(currentBinding.bindingStatus, 'CURRENT');
assert.equal(currentBinding.releaseQualified, true);
assert.deepEqual(currentBinding.reasons, []);

const nonGoverned = governLafeaWorkbenchReleaseBindingForResultCurrentness(
  currentBinding,
  { governedMesh: false, resultReady: false },
);
assert.strictEqual(nonGoverned, currentBinding);

const absent = Object.freeze({
  ...currentBinding,
  bindingStatus: 'ABSENT',
  releaseQualified: false,
  authorityState: null,
  recordValidity: null,
  recordId: null,
  semanticHash: null,
  evidenceHash: null,
  reasons: ['RELEASE_RECORD_ABSENT'],
});
assert.strictEqual(
  governLafeaWorkbenchReleaseBindingForResultCurrentness(
    absent,
    { governedMesh: true, resultReady: false },
  ),
  absent,
);

// Registration guard must execute before release-record parsing/validation.
const releaseState = createLafeaWorkbenchReleaseState(['LAFEA.4']);
assert.throws(
  () => releaseState.register({}, {
    stageId: 'LAFEA.4',
    shellMidsurfaceProfileActive: true,
    lifecycleReadiness: { resultReady: false },
  }),
  (error) => error?.code === LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT,
);
assert.throws(
  () => releaseState.register({}, {
    stageId: 'LAFEA.4',
    shellMidsurfaceProfileActive: true,
    lifecycleReadiness: { resultReady: true },
  }),
  (error) => error?.code === 'RELEASE_RECORD_INVALID',
);

const readinessSource = readText('src/workspace/lafea-workbench-readiness.js');
for (const token of [
  'const rawReleaseBinding = projectLafeaWorkbenchReleaseBinding(',
  'governLafeaWorkbenchReleaseBindingForResultCurrentness(',
  '{ governedMesh, resultReady }',
  "? 'RELEASE_QUALIFIED'",
  'releaseBlockingReasons: [...releaseBinding.reasons]',
]) assert.ok(readinessSource.includes(token), token);

const releaseSource = readText('src/workspace/lafea-workbench-release-binding.js');
for (const token of [
  'stage.lifecycleReadiness?.resultReady !== true',
  'throw releaseError(LAFEA_RELEASE_GOVERNED_RESULT_NOT_CURRENT)',
  'bindingStatus: \'STALE\'',
  'releaseQualified: false',
]) assert.ok(releaseSource.includes(token), token);

const requiredId = 'TECH12I_RELEASE_RESULT_CURRENTNESS';
const rows = plan.steps.filter((row) => row.id === requiredId);
assert.equal(rows.length, 1);
assert.equal(rows[0].classification, 'ENGINEERING');
assert.equal(rows[0].required, true);
assert.deepEqual(rows[0].args, ['scripts/lafea-tech12i-release-result-currentness-check.mjs']);
const ids = plan.steps.map((row) => row.id);
assert.ok(ids.indexOf('TECH12H_OVERVIEW_RESULT_CURRENTNESS') < ids.indexOf(requiredId));
assert.ok(ids.indexOf(requiredId) < ids.indexOf('TECH7_GRADED_REFINEMENT_EXECUTOR'));

console.log(JSON.stringify({
  check: 'lafea-tech12i-release-result-currentness',
  status: 'PASS',
  currentTrustRoot: 'NULL',
  currentGovernedRelease: {
    bindingStatus: governedCurrent.bindingStatus,
    releaseQualified: governedCurrent.releaseQualified,
  },
  historicalReleaseAfterResultRevocation: {
    bindingStatus: governedStale.bindingStatus,
    releaseQualified: governedStale.releaseQualified,
    reason: governedStale.reasons[0],
    recordSemanticHashPreserved: governedStale.semanticHash === currentBinding.semanticHash,
    evidenceHashPreserved: governedStale.evidenceHash === currentBinding.evidenceHash,
  },
  registrationWithStaleGovernedResultRejected: true,
  nonGovernedCompatibility: true,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function readJson(relative) { return JSON.parse(readText(relative)); }
function readText(relative) { return fs.readFileSync(path.join(repoRoot, relative), 'utf8'); }
