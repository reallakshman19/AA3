#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLafeaControllerRunEvidence } from '../src/workspace/lafea-controller-run-evidence.js';
import {
  createLafeaRunEvidenceDossier,
  validateLafeaRunEvidenceDossier,
} from '../src/workspace/lafea-evidence-dossier.js';
import {
  createLafeaRunHistory,
  projectLafeaRunStageCurrentAuthority,
  validateLafeaRunHistoryEntry,
} from '../src/workspace/lafea-run-history.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
} from '../src/workspace/lafea4-parent-normal-production-gate.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'validation/lafea4-refinement/parent-normal-run-history-current-authority-v1.json'),
  'utf8',
));
assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);
assert.equal(definition.currentTrustRoot, 'NULL');

const BUILD = 'a'.repeat(40);
const resultHash = `sha256:${'3'.repeat(64)}`;
const currentStage = stage({ resultHash, current: true });
const blockedStage = stage({ resultHash, current: false });

const currentAuthority = projectLafeaRunStageCurrentAuthority(currentStage);
assert.equal(currentAuthority.governedRoute, true);
assert.equal(currentAuthority.executionQualified, true);
assert.equal(currentAuthority.currentResultAccepted, true);

const blockedAuthority = projectLafeaRunStageCurrentAuthority(blockedStage);
assert.equal(blockedAuthority.executionQualified, true);
assert.equal(blockedAuthority.currentResultAccepted, false);
assert.deepEqual(blockedAuthority.blockingReasons, [
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
]);

const history = createLafeaRunHistory({ buildSha: BUILD });
const run = history.append(currentStage);
validateLafeaRunHistoryEntry(run);
assert.equal(run.evidence.currentAuthority.currentResultAccepted, true);
assert.equal(history.list()[0].currentResultAcceptedAtCapture, true);
assert.equal(history.list()[0].resultReadyAtCapture, true);

const currentDossier = createLafeaRunEvidenceDossier(run, {
  currentRunId: run.runId,
  currentStage,
});
validateLafeaRunEvidenceDossier(currentDossier);
assert.equal(currentDossier.calculationIdentity.custody, 'CURRENT_RUN_SNAPSHOT');
assert.equal(currentDossier.currentAuthority.live.currentResultAccepted, true);
assert.equal(currentDossier.currentAuthority.liveExecutionMatches, true);
assert.equal(currentDossier.currentAuthority.currentResultAuthorityGrantedByDossier, false);

const unverifiedDossier = createLafeaRunEvidenceDossier(run, {
  currentRunId: run.runId,
});
assert.equal(
  unverifiedDossier.calculationIdentity.custody,
  'LATEST_RUN_SNAPSHOT_AUTHORITY_UNVERIFIED',
);
assert.equal(unverifiedDossier.currentAuthority.live, null);
assert.equal(unverifiedDossier.currentAuthority.liveExecutionMatches, null);

// Same retained execution identity, but current workbench authority has been
// revoked by the future trusted production gate.
const staleDossier = createLafeaRunEvidenceDossier(run, {
  currentRunId: run.runId,
  currentStage: blockedStage,
});
assert.equal(staleDossier.calculationIdentity.custody, 'LATEST_RUN_HISTORIC_NOT_CURRENT');
assert.equal(staleDossier.currentAuthority.live.currentResultAccepted, false);
assert.equal(staleDossier.currentAuthority.liveExecutionMatches, true);
assert.equal(staleDossier.solverResult.executionStatus, 'QUALIFIED');
assert.equal(staleDossier.solverResult.resultHash, resultHash);
assert.equal(staleDossier.release.currentReleaseAuthorityGrantedByDossier, false);

// Even if readiness is current, a different live execution identity cannot
// promote this history entry into current custody.
const replacedExecutionStage = stage({ resultHash: `sha256:${'4'.repeat(64)}`, current: true });
const replacedDossier = createLafeaRunEvidenceDossier(run, {
  currentRunId: run.runId,
  currentStage: replacedExecutionStage,
});
assert.equal(replacedDossier.calculationIdentity.custody, 'LATEST_RUN_HISTORIC_NOT_CURRENT');
assert.equal(replacedDossier.currentAuthority.live.currentResultAccepted, true);
assert.equal(replacedDossier.currentAuthority.liveExecutionMatches, false);

const olderDossier = createLafeaRunEvidenceDossier(run, {
  currentRunId: 'LAFEA-RUN-9999-NOTTHISRUN',
  currentStage: currentStage,
});
assert.equal(olderDossier.calculationIdentity.custody, 'HISTORIC_RUN_SNAPSHOT');

// Controller capture remains append-only after authority revocation, but the
// new entry carries the revocation in its own hashed evidence.
const controller = createLafeaControllerRunEvidence({ buildSha: BUILD });
const currentState = state(currentStage);
const capturedCurrent = controller.capture(currentState);
assert.equal(controller.list()[0].currentResultAcceptedAtCapture, true);
assert.equal(
  controller.dossier(capturedCurrent.runId, currentState).calculationIdentity.custody,
  'CURRENT_RUN_SNAPSHOT',
);

const blockedState = state(blockedStage);
assert.equal(
  controller.dossier(capturedCurrent.runId, blockedState).calculationIdentity.custody,
  'LATEST_RUN_HISTORIC_NOT_CURRENT',
);
const capturedBlocked = controller.capture(blockedState);
assert.ok(capturedBlocked);
assert.equal(capturedBlocked.evidence.currentAuthority.currentResultAccepted, false);
assert.equal(controller.list().at(-1).currentResultAcceptedAtCapture, false);
assert.equal(
  controller.dossier(capturedBlocked.runId, blockedState).calculationIdentity.custody,
  'LATEST_RUN_HISTORIC_NOT_CURRENT',
);

const controllerSource = fs.readFileSync(
  path.join(repoRoot, 'src/lafea-app/standalone-controller.js'),
  'utf8',
);
assert.ok(controllerSource.includes('this.runEvidence.dossier(runId, this.getState())'));
const dossierSource = fs.readFileSync(
  path.join(repoRoot, 'src/workspace/lafea-evidence-dossier.js'),
  'utf8',
);
for (const token of [
  'LATEST_RUN_SNAPSHOT_AUTHORITY_UNVERIFIED',
  'LATEST_RUN_HISTORIC_NOT_CURRENT',
  'liveAuthority?.currentResultAccepted !== true',
  'liveExecutionMatches !== true',
]) assert.ok(dossierSource.includes(token), token);

console.log(JSON.stringify({
  check: 'lafea-tech12j-run-history-current-authority',
  status: 'PASS',
  currentTrustRoot: 'NULL',
  currentExactExecutionCustody: currentDossier.calculationIdentity.custody,
  latestWithoutLiveAuthorityCustody: unverifiedDossier.calculationIdentity.custody,
  latestAfterFutureGateBlockCustody: staleDossier.calculationIdentity.custody,
  replacedLiveExecutionCustody: replacedDossier.calculationIdentity.custody,
  historicalCustody: olderDossier.calculationIdentity.custody,
  blockedExecutionStillArchivable: true,
  blockedCaptureCurrentAuthority: capturedBlocked.evidence.currentAuthority.currentResultAccepted,
  dossierGrantsCurrentResultAuthority: false,
  dossierGrantsReleaseAuthority: false,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));

function state(stageValue) {
  return { activeStageId: stageValue.stageId, stages: { [stageValue.stageId]: stageValue } };
}

function stage({ resultHash: hash, current }) {
  return {
    stageId: 'LAFEA.4',
    shellMidsurfaceProfileActive: true,
    document: {
      modelIdentity: 'TECH12J-SHELL',
      units: { length: 'mm', force: 'N', stress: 'MPa' },
      limitations: ['TECH12J-HISTORIC-EVIDENCE-ONLY'],
    },
    sourceAuthority: { sourceHash: `sha256:${'1'.repeat(64)}` },
    lifecycleBinding: { status: 'CURRENT', currentDocumentDigest: 'fnv1a64:0123456789abcdef' },
    lifecycle: {
      profileId: 'FEA_MESH_RECOVERY_V1',
      source: { sourceHash: `sha256:${'1'.repeat(64)}` },
      artifacts: { EXECUTION: { artifactHash: hash } },
    },
    retainedAnalysisDomain: { units: { length: 'mm', force: 'N', stress: 'MPa' } },
    analysisDomainProjection: { analysisDomainHash: `sha256:${'5'.repeat(64)}` },
    analysisGeometryProjection: {
      analysisGeometryHash: `sha256:${'6'.repeat(64)}`,
      state: 'CURRENT_PASS',
    },
    retainedAnalysisGeometryEvidence: { semanticHash: `sha256:${'7'.repeat(64)}` },
    analysisMeshCustodyProjection: {
      state: current ? 'CURRENT_PASS' : 'CURRENT_BLOCK',
      meshHash: `sha256:${'8'.repeat(64)}`,
      elementFamily: 'CST_DKT_TRI3_THIN_SHELL_V1',
    },
    retainedAnalysisMeshEvidenceV2: {
      qualification: 'PASS',
      mesh: {
        nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }, { nodeId: 'N3' }],
        elements: [{ elementId: 'E1' }],
      },
      quality: { worstStatus: 'OK', warningElementIds: [], blockingElementIds: [], gateResults: [] },
    },
    retainedAnalysisMeshProfile: { fields: { globalTargetSize: 15 } },
    execution: {
      status: 'QUALIFIED',
      route: 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL',
      compiledExecutionHash: hash,
      solverModelHash: `sha256:${'9'.repeat(64)}`,
      result: { loadCaseResults: [{ loadCaseId: 'LC1', totalStrainEnergy: 4.2 }] },
    },
    numericalVerificationProjection: { bindingStatus: 'ABSENT' },
    lifecycleReadiness: {
      calculationState: current
        ? 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT'
        : 'CALCULATION_NOT_ACCEPTED_BY_STAGE_CONTRACT',
      resultReady: current,
      releaseState: 'RELEASE_NOT_QUALIFIED',
      releaseBinding: { bindingStatus: 'ABSENT', releaseQualified: false },
      blockingReasons: current ? [] : [LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE],
    },
  };
}
