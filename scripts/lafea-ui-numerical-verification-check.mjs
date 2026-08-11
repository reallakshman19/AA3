#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA,
  evaluateLafeaBucket01Convergence,
} from '../src/workspace/lafea-bucket-01-convergence.js';
import {
  LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA,
  createLafeaWorkbenchVerificationState,
  projectLafeaWorkbenchVerificationBinding,
} from '../src/workspace/lafea-workbench-verification-state.js';
import {
  LAFEA_NUMERICAL_VERIFICATION_VIEW_SCHEMA,
  buildLafeaNumericalVerificationViewModel,
} from '../src/workspace/lafea-numerical-verification-view.js';

const STAGE_ID = 'LAFEA.3';
const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;
const DOCUMENT_DIGEST = 'fnv1a64:0123456789abcdef';
const baseInput = {
  schema: LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA,
  quantityId: 'SIGMA_YY',
  samplingAuthority: 'FIXED_PHYSICAL_PROBE',
  locationId: 'KIRSCH_THETA_90_R_OVER_R_1_05',
  locationDefinitionHash: `sha256:${'b'.repeat(64)}`,
  units: 'MPa',
  meshSizes: [0.4, 0.2, 0.1],
  observations: [10.16, 10.04, 10.01],
  gciTolerance: 0.005,
  minimumObservedOrder: 1.5,
  asymptoticRatioBounds: { minimum: 0.85, maximum: 1.15 },
};
const passEvidence = evaluateLafeaBucket01Convergence(baseInput);
assert.equal(passEvidence.status, 'PASS');

const hashOnly = projectLafeaWorkbenchVerificationBinding(
  stageWithConvergence(passEvidence.semanticHash),
  null,
);
assert.equal(hashOnly.bindingStatus, 'HASH_ONLY');
assert.deepEqual(hashOnly.reasons, ['CONVERGENCE_DETAIL_EVIDENCE_NOT_RETAINED']);

const state = createLafeaWorkbenchVerificationState([STAGE_ID]);
const registered = state.register(passEvidence, stageWithConvergence(passEvidence.semanticHash));
assert.equal(registered.projection.bindingStatus, 'CURRENT');
assert.equal(registered.projection.method, 'BUCKET_01_GCI');

const currentView = buildLafeaNumericalVerificationViewModel({
  ...stageWithConvergence(passEvidence.semanticHash),
  numericalVerificationProjection: registered.projection,
  ...meshEvidenceFields(),
});
assert.equal(currentView.schema, LAFEA_NUMERICAL_VERIFICATION_VIEW_SCHEMA);
assert.equal(currentView.convergence.custody, 'LIFECYCLE_QUALIFIED_DETAIL');
assert.equal(currentView.convergence.method, 'BUCKET_01_GCI_RICHARDSON');
assert.equal(value(currentView.convergence.rows, 'Observed order'), '2');
assert.equal(value(currentView.convergence.rows, 'Richardson extrapolation (MPa)'), '10');
assert.notEqual(value(currentView.convergence.rows, 'Fine-grid GCI'), 'N/A');
assert.equal(currentView.meshQuality.extendedGeometryEvidenceAvailable, false);
assert.match(currentView.meshQuality.note, /Area, curved perimeter, boundary deviation/u);
assert.match(value(currentView.meshQuality.rows, 'ASPECT_RATIO'), /OK/u);
assert.match(value(currentView.meshQuality.rows, 'SCALED_JACOBIAN'), /OK/u);

const nearZeroEvidence = evaluateLafeaBucket01Convergence({
  ...baseInput,
  observations: [4e-12, 1e-12, 0.25e-12],
});
assert.equal(nearZeroEvidence.status, 'BLOCKED');
assert.ok(nearZeroEvidence.reasons.includes('FINE_OBSERVATION_NEAR_ZERO_FOR_RELATIVE_GCI'));
const diagnosticStage = stageWithoutConvergence();
const diagnostic = createLafeaWorkbenchVerificationState([STAGE_ID]).register({
  schema: LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA,
  stageId: STAGE_ID,
  sourceHash: SOURCE_HASH,
  documentRevisionDigest: DOCUMENT_DIGEST,
  evidence: nearZeroEvidence,
}, diagnosticStage);
assert.equal(diagnostic.projection.bindingStatus, 'DIAGNOSTIC');
const diagnosticView = buildLafeaNumericalVerificationViewModel({
  ...diagnosticStage,
  numericalVerificationProjection: diagnostic.projection,
  analysisMeshCustodyProjection: { canView: false },
});
assert.equal(diagnosticView.convergence.custody, 'SOURCE_BOUND_DIAGNOSTIC');
assert.equal(diagnosticView.convergence.nearZeroRelativeGci, true);
assert.match(value(diagnosticView.convergence.rows, 'Fine-grid GCI'), /N\/A — near-zero/u);
assert.match(diagnosticView.convergence.note, /not a qualified lifecycle CONVERGENCE artifact/u);
assert.match(diagnosticView.convergence.note, /Relative GCI is not applicable/u);

assert.throws(() => createLafeaWorkbenchVerificationState([STAGE_ID]).register({
  schema: LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA,
  stageId: STAGE_ID,
  sourceHash: `sha256:${'c'.repeat(64)}`,
  documentRevisionDigest: DOCUMENT_DIGEST,
  evidence: nearZeroEvidence,
}, diagnosticStage));

console.log(JSON.stringify({
  check: 'lafea-ui-numerical-verification',
  status: 'PASS',
  qualifiedGciDetailSupported: true,
  hashOnlyStateExplicit: true,
  nearZeroRelativeGciIsNA: true,
  blockedEvidenceUsesSourceBoundDiagnosticCustody: true,
  meshQualitySeparatedFromExtendedT6GeometryQualification: true,
  githubActionsWorkflowAdded: false,
}));

function stageWithConvergence(artifactHash) {
  return {
    ...stageWithoutConvergence(),
    lifecycle: {
      source: { sourceHash: SOURCE_HASH },
      artifacts: {
        CONVERGENCE: { status: 'CURRENT', qualification: 'PASS', artifactHash },
      },
    },
  };
}
function stageWithoutConvergence() {
  return {
    stageId: STAGE_ID,
    lifecycle: { source: { sourceHash: SOURCE_HASH }, artifacts: {} },
    lifecycleBinding: { status: 'CURRENT', currentDocumentDigest: DOCUMENT_DIGEST },
    sourceAuthority: { sourceHash: SOURCE_HASH },
  };
}
function meshEvidenceFields() {
  return {
    domainFirstProfileActive: false,
    shellMidsurfaceProfileActive: false,
    analysisMeshCustodyProjection: { canView: true, state: 'CURRENT_PASS' },
    retainedAnalysisMeshEvidence: {
      mesh: {
        nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }, { nodeId: 'N3' }],
        elements: [{ elementId: 'E1' }],
      },
      quality: {
        elementCount: 1,
        worstStatus: 'OK',
        warningElementIds: [],
        blockingElementIds: [],
        gateResults: [
          { metric: 'ASPECT_RATIO', value: 1.5, warningThreshold: 4, blockingThreshold: 8, status: 'OK' },
          { metric: 'SCALED_JACOBIAN', value: 0.9, warningThreshold: 0.4, blockingThreshold: 0.2, status: 'OK' },
        ],
      },
    },
  };
}
function value(rows, label) { return rows.find((row) => row.label === label)?.value; }
