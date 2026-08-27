#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTION_CAPABILITY_PROFILE } from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MANIFEST_PATH = path.join(ROOT, 'validation/lfea/piping-component-promotion/stack-candidate-v1.json');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

assert.equal(manifest.schema, 'lfea-piping-component-promotion-stack-candidate/v1');
assert.equal(manifest.status, 'BLOCKED_NOT_RELEASE_CANDIDATE');
assert.equal(manifest.program, 'LFEA_PIPING_COMPONENT_PROMOTION_S0_S7');
assert.match(manifest.observedMain?.sha ?? '', /^[0-9a-f]{40}$/u);
assert.equal(manifest.observedMain?.classification, 'OBSERVATION_ONLY_NOT_RELEASE_PARENT');
assert.equal(manifest.observedMain?.mustBeRegroundedLive, true);

const stages = new Map(manifest.implementedAncestry.map((row) => [row.stage, row]));
assert.equal(stages.size, 3);
assert.equal(stages.get('S1_S3')?.pr, 1348);
assert.equal(stages.get('S1_S3')?.head, '25543a9e6c0e796d63e89841f63e41a4fd3292cc');
assert.equal(stages.get('S6')?.pr, 1395);
assert.equal(stages.get('S6')?.basePr, 1348);
assert.equal(stages.get('S6')?.baseHead, stages.get('S1_S3')?.head);
assert.equal(stages.get('S6')?.head, '2b4b4762973c84690b636eab8abe918e307d5dab');
assert.equal(stages.get('S7_INTEGRATION')?.pr, 1396);
assert.equal(stages.get('S7_INTEGRATION')?.basePr, 1395);
assert.equal(stages.get('S7_INTEGRATION')?.baseHead, stages.get('S6')?.head);
assert.equal(stages.get('S7_INTEGRATION')?.numericallyInert, true);
for (const row of stages.values()) {
  assert.equal(row.runtimeQualification, 'NOT_RUN_CI_PRE_STEP_INFRASTRUCTURE_FAILURE');
}

assert.equal(manifest.carryForward.sourcePr, 1341);
assert.equal(manifest.carryForward.sourceHead, 'dd2d9d1ba9ede41c82c8d6707181c61f679b5549');
assert.equal(manifest.carryForward.disposition, 'FUNCTIONALLY_SUBSUMED_NOT_CLOSED');
assert.equal(manifest.carryForward.uniqueGuardCarriedToPr, 1396);
assert.equal(manifest.carryForward.ownerControlsAdministrativeClosure, true);

const blocked = new Map(manifest.blockedStages.map((row) => [row.stage, row]));
assert.equal(blocked.size, 2);
assert.equal(blocked.get('S4')?.pr, 1386);
assert.equal(blocked.get('S4')?.engineeringCodeHead, '7e540e6617decd23e3aec432bb08b81ebbd60a5a');
assert.equal(blocked.get('S4')?.livePrHeadMustBeGroundedFromGithub, true);
assert.equal(blocked.get('S4')?.requiredCapabilityState, false);
assert.equal(blocked.get('S4')?.externalEvidenceRequired, true);
assert.equal(blocked.get('S4')?.externalEvidenceIssue, 1402);
assert.equal(blocked.get('S4')?.evidenceScaffold, 'scripts/lfea-s4-reducer-parity-evidence-template.mjs');
assert.equal(blocked.get('S4')?.generatedScaffoldStatus, 'DRAFT_NOT_QUALIFIED');
assert.deepEqual(blocked.get('S4')?.blockers, [
  'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
  'REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED',
  'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
]);

assert.equal(blocked.get('S5')?.pr, 1391);
assert.equal(blocked.get('S5')?.engineeringCodeHead, 'a062068797b1a33b2cbae9fdd390cb0e18ece0df');
assert.equal(blocked.get('S5')?.livePrHeadMustBeGroundedFromGithub, true);
assert.deepEqual(blocked.get('S5')?.requiredCapabilities, {
  pressureBourdon: false,
  pressureStiffening: false,
  pressureAxialThrust: false,
});
assert.equal(blocked.get('S5')?.externalEvidenceRequired, true);
assert.equal(blocked.get('S5')?.externalEvidenceIssue, 1402);
assert.equal(blocked.get('S5')?.evidenceScaffold, 'scripts/lfea-s5-pressure-parity-evidence-template.mjs');
assert.equal(blocked.get('S5')?.generatedScaffoldStatus, 'DRAFT_NOT_QUALIFIED');
assert.equal(blocked.get('S5')?.q5ControlledSelector, 'P1');
assert.equal(blocked.get('S5')?.q5ControlledSelectorMayAuthorizeBm4Nl, false);
assert.deepEqual(blocked.get('S5')?.blockers, [
  'CONTROLLED_BOURDON_PARITY_REQUIRED',
  'CONTROLLED_PRESSURE_STIFFENING_PARITY_REQUIRED',
  'L19_L20_ELBOW_STIFFENING_PRESSURE_SELECTOR_UNRESOLVED',
  'PRESSURE_AXIAL_THRUST_REQUIRES_SEPARATE_AUTHORITY',
]);

assert.equal(PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics, true);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics, true);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics, false);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureBourdon, false);
// Promoted on measured parity, using the element's DECLARED pressure so the
// effective stiffness stays case-independent and the sealed custody check is
// untouched. Improves every case in both pass rate and median error.
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureStiffening, true);
// Promoted on measured CAESAR parity, not on a flag flip: closed-end pressure
// axial strain is implemented in the frame-element kernel and takes BM4_L's
// weight+pressure median error from 63.29% to 7.78%.
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureAxialThrust, true);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureCodeStress, true);

assert.equal(manifest.externalEvidenceGate.issue, 1402);
assert.equal(manifest.externalEvidenceGate.status, 'OPEN_BLOCKING_S4_S5_NUMERICAL_PROMOTION');
assert.equal(manifest.externalEvidenceGate.evidenceCollectionMayProceedWhileCiIssue54Open, true);
assert.equal(manifest.externalEvidenceGate.acceptedEvidenceMayDirectlyAuthorizeProduction, false);

assert.equal(manifest.infrastructureGate.issue, 54);
assert.equal(manifest.infrastructureGate.status, 'OPEN_BLOCKING');
assert.equal(manifest.releaseBoundary.releaseEligible, false);
assert.equal(manifest.releaseBoundary.engineeringQualificationComplete, false);
assert.equal(manifest.releaseBoundary.phase6iHistoricalEvidenceMayCertifyThisTree, false);
assert.equal(manifest.releaseBoundary.newGovernedReleaseCandidateRequiredAfterAnyOwnerAuthorizedMerge, true);

assert.equal(manifest.mergePolicy.mergeAuthority, 'OWNER_ONLY');
assert.equal(manifest.mergePolicy.automaticMergeAuthorized, false);
assert.equal(manifest.mergePolicy.doNotTreatBlockedS4S5AsQualified, true);
assert.equal(manifest.mergePolicy.doNotTreatNotRunAsPass, true);
assert.equal(manifest.mergePolicy.doNotRebaselineBenchmarks, true);
assert.equal(manifest.mergePolicy.doNotWidenOrFitTolerances, true);

console.log('LFEA piping component promotion stack manifest check PASS');
