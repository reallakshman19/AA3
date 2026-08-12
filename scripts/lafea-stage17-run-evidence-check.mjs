#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createLafeaRunEvidenceDossier, validateLafeaRunEvidenceDossier } from '../src/workspace/lafea-evidence-dossier.js';
import { createLafeaControllerRunEvidence } from '../src/workspace/lafea-controller-run-evidence.js';
import { compareLafeaRunHistoryEntries } from '../src/workspace/lafea-run-comparison.js';
import { createLafeaRunHistory, validateLafeaRunHistoryEntry } from '../src/workspace/lafea-run-history.js';

const BUILD = 'a'.repeat(40);
const history = createLafeaRunHistory({ buildSha: BUILD });
const currentAuthority = stage({ meshDigit: '7', resultDigit: '2', energy: 10, target: 20 });
const run1 = history.append(currentAuthority);
const frozenAuthority = JSON.stringify(currentAuthority);
const run2 = history.append(stage({ meshDigit: '8', resultDigit: '3', energy: 9, target: 10 }));

assert.equal(Object.isFrozen(run1), true);
assert.equal(history.list().length, 2);
assert.equal(history.get(run1.runId), run1);
validateLafeaRunHistoryEntry(run1);
const tampered = structuredClone(run1);
tampered.evidence.execution.resultHash = `sha256:${'f'.repeat(64)}`;
assert.throws(() => validateLafeaRunHistoryEntry(tampered), /LAFEA_RUN_HISTORY_EVIDENCE_HASH_INVALID/u);

const comparison = compareLafeaRunHistoryEntries(run1, run2);
assert.equal(comparison.status, 'COMPARABLE');
assert.equal(comparison.mesh.elementCount.delta, 1);
assert.ok(comparison.quantities.some((row) =>
  row.status === 'COMPARABLE' && row.quantityId === 'TOTAL_STRAIN_ENERGY' && row.delta === -1));

const incompatible = compareLafeaRunHistoryEntries(
  history.append(stage({ meshDigit: '9', resultDigit: '4', energy: 8, target: 5, vonMisesMode: 'ELEMENT' })),
  history.append(stage({ meshDigit: 'a', resultDigit: '5', energy: 7, target: 2.5, vonMisesMode: 'INTEGRATION_POINT' })),
);
const vm = incompatible.quantities.find((row) => row.quantityId === 'VON_MISES');
assert.equal(vm.status, 'NON_COMPARABLE');
assert.equal(vm.reason, 'QUANTITY_INTERPRETATION_MISMATCH');

const dossier = createLafeaRunEvidenceDossier(run1, { currentRunId: run2.runId });
assert.equal(dossier.calculationIdentity.custody, 'HISTORIC_RUN_SNAPSHOT');
assert.equal(dossier.release.currentReleaseAuthorityGrantedByDossier, false);
assert.equal(dossier.release.releaseQualified, false);
assert.ok(dossier.trace.some((row) => row.kind === 'ANALYSIS_MESH' && row.hash === run1.evidence.mesh.meshHash));
validateLafeaRunEvidenceDossier(dossier);

const controllerEvidence = createLafeaControllerRunEvidence({ buildSha: BUILD });
const state = { activeStageId: 'LAFEA.3', stages: { 'LAFEA.3': currentAuthority } };
const captured = controllerEvidence.capture(state);
assert.equal(controllerEvidence.list().length, 1);
const beforeHistoricRead = JSON.stringify(currentAuthority);
controllerEvidence.get(captured.runId);
controllerEvidence.dossier(captured.runId);
assert.equal(JSON.stringify(currentAuthority), beforeHistoricRead);
assert.equal(JSON.stringify(currentAuthority), frozenAuthority);

const otherBuild = createLafeaRunHistory({ buildSha: 'b'.repeat(40) })
  .append(stage({ meshDigit: '7', resultDigit: '2', energy: 10, target: 20 }));
const buildComparison = compareLafeaRunHistoryEntries(run1, otherBuild);
assert.equal(buildComparison.identity.build.same, false);

console.log(JSON.stringify({
  schema: 'lafea-stage17-run-evidence-check/v1',
  status: 'PASS',
  roadmapPrerequisites: ['A11', 'A12', 'A13'],
  appendOnlyHistory: true,
  historicReadCannotPromoteAuthority: true,
  exactSemanticQuantityComparison: true,
  incompatibleInterpretationNonComparable: true,
  buildIdentityDifferenceVisible: true,
  dossierTraceableToRetainedHashes: true,
  dossierPromotesReleaseAuthority: false,
}));

function stage({ meshDigit, resultDigit, energy, target, vonMisesMode = null }) {
  const quantities = vonMisesMode === 'ELEMENT'
    ? { vonMisesStress: [{ elementId: 'E1', value: 120 }], integrationPointResults: [] }
    : vonMisesMode === 'INTEGRATION_POINT'
      ? { vonMisesStress: [], integrationPointResults: [{ elementId: 'E1', integrationPointId: 'IP1', stress: [1, 2, 3], vonMisesStress: 120 }] }
      : { vonMisesStress: [], integrationPointResults: [] };
  return {
    stageId: 'LAFEA.3',
    document: { units: { length: 'mm', force: 'N', stress: 'MPa' }, limitations: ['TEST_LIMITATION'] },
    sourceAuthority: { sourceHash: `sha256:${'1'.repeat(64)}` },
    lifecycleBinding: { status: 'CURRENT', currentDocumentDigest: 'fnv1a64:0123456789abcdef' },
    lifecycle: {
      profileId: 'FEA_MESH_RECOVERY_V1', source: { sourceHash: `sha256:${'1'.repeat(64)}` },
      artifacts: { EXECUTION: { artifactHash: `sha256:${resultDigit.repeat(64)}` } },
    },
    retainedAnalysisDomain: { units: { length: 'mm', force: 'N', stress: 'MPa' } },
    analysisDomainProjection: { analysisDomainHash: `sha256:${'3'.repeat(64)}` },
    analysisGeometryProjection: { analysisGeometryHash: `sha256:${'4'.repeat(64)}`, state: 'CURRENT_PASS' },
    retainedAnalysisGeometryEvidence: { semanticHash: `sha256:${'5'.repeat(64)}` },
    analysisMeshCustodyProjection: { meshHash: `sha256:${meshDigit.repeat(64)}`, elementFamily: 'T6' },
    retainedAnalysisMeshEvidenceV2: {
      mesh: { nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }], elements: Array.from({ length: meshDigit === '7' ? 1 : 2 }, (_, index) => ({ elementId: `E${index + 1}` })) },
      quality: { worstStatus: 'OK', warningElementIds: [], blockingElementIds: [], gateResults: [] },
    },
    retainedAnalysisMeshProfile: { fields: { globalTargetSize: target } },
    t6GeometryQualificationProjection: { state: 'CURRENT_PASS' },
    execution: {
      status: 'QUALIFIED', route: 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL',
      compiledExecutionHash: `sha256:${resultDigit.repeat(64)}`,
      solverModelHash: `sha256:${'6'.repeat(64)}`,
      result: {
        loadCaseResults: [{
          loadCaseId: 'L1', totalStrainEnergy: energy,
          nodalDisplacements: [{ nodeId: 'N1', component: 'UX', value: energy / 100 }],
          ...quantities,
        }],
      },
    },
    numericalVerificationProjection: { bindingStatus: 'ABSENT' },
    lifecycleReadiness: { releaseBinding: { bindingStatus: 'ABSENT', releaseQualified: false } },
  };
}
