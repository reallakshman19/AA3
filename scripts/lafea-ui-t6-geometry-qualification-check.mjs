#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  generateLafeaLugPinholeT6Mesh,
} from '../src/core/lafea-meshing/lug-pinhole-t6.js';
import {
  LAFEA_BUCKET_01_MESH_QUALIFICATION_INPUT_SCHEMA,
  qualifyLafeaBucket01Mesh,
} from '../src/workspace/lafea-bucket-01-mesh-qualification.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-evidence.js';
import {
  LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
  createLafeaT6GeometryQualificationCustody,
} from '../src/workspace/lafea-t6-geometry-qualification-custody.js';
import {
  createLafeaT6GeometryQualificationState,
} from '../src/workspace/lafea-t6-geometry-qualification-state.js';
import {
  buildLafeaT6GeometryQualificationViewModel,
} from '../src/workspace/lafea-t6-geometry-qualification-view.js';

const STAGE_ID = 'LAFEA.3';
const HEAD = 'a'.repeat(40);
const PASS_TOLERANCES = Object.freeze({
  areaRelative: 0.005,
  holeRadiusRelative: 0.001,
  holeCenterOverRadius: 1e-12,
  criticalLigamentRelative: 0.0025,
  perimeterRelative: 0.001,
  boundaryDeviationOverRadius: 0.001,
  midsideOverReference: 1e-12,
  rotationalSymmetryOverReference: 1e-12,
  duplicateNodeDistance: 1e-12,
});

const meshPackage = meshPackageFor('PR1016-T6-L1', 2, 16);
const otherMeshPackage = meshPackageFor('PR1016-T6-L2', 4, 32);
const passEvidence = qualify(meshPackage, PASS_TOLERANCES, '1');
assert.equal(passEvidence.status, 'PASS');

const intake = Object.freeze({
  schema: LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
  stageId: STAGE_ID,
  evidence: passEvidence,
  meshPackage,
});
const custody = createLafeaT6GeometryQualificationCustody(intake);
assert.equal(custody.status, 'PASS');
assert.equal(custody.analysisMeshHash, lafeaAnalysisMeshContentHash(meshPackage.mesh));
assert.equal(custody.declaredMeshPackageHash, passEvidence.meshPackageHash);
assert.notEqual(custody.parentMeshPackageDigest, custody.declaredMeshPackageHash);
assert.equal(custody.authority.currentWorkbenchBindingEstablished, false);
assert.equal(custody.authority.releaseQualified, false);

const state = createLafeaT6GeometryQualificationState([STAGE_ID], {
  currentCandidateHeadSha: HEAD,
});
const currentStage = stageFor(meshPackage);
const registered = state.register(intake, currentStage);
assert.equal(registered.projection.state, 'CURRENT_PASS');
assert.equal(registered.projection.qualified, true);
assert.equal(registered.projection.releaseQualified, false);
assert.equal(registered.projection.meshCustodyState, 'CURRENT_PASS');

const currentView = buildLafeaT6GeometryQualificationViewModel({
  ...currentStage,
  retainedT6GeometryQualification: registered.retained,
  t6GeometryQualificationProjection: registered.projection,
});
assert.equal(currentView.status, 'CURRENT_PASS');
assert.equal(currentView.custody, 'CURRENT_QUALIFIED_DETAIL');
assert.equal(value(currentView.rows, 'Integrated T6 area (model length² basis)'),
  displayNumber(passEvidence.geometry.integratedArea));
assert.equal(value(currentView.rows, 'Hole curved-edge perimeter (model length basis)'),
  displayNumber(passEvidence.geometry.holePerimeter));
assert.equal(value(currentView.rows, 'Maximum boundary deviation (model length basis)'),
  displayNumber(passEvidence.geometry.maximumBoundaryDeviation));
assert.equal(value(currentView.rows, 'Minimum dense Jacobian determinant'),
  displayNumber(passEvidence.validity.minimumDenseJacobian));
assert.ok(currentView.methodSemantics.some((text) => /three-point triangular quadrature/u.test(text)));
assert.ok(currentView.methodSemantics.some((text) => /five-point Gauss-Legendre/u.test(text)));
assert.ok(currentView.methodSemantics.some((text) => /not boundary-deviation samples/u.test(text)));
assert.ok(currentView.methodSemantics.some((text) => /does not carry a unit symbol/u.test(text)));

const staleProjection = state.project(stageFor(otherMeshPackage));
assert.equal(staleProjection.state, 'STALE');
assert.ok(staleProjection.reasons.includes('LAFEA_T6_GEOMETRY_ANALYSIS_MESH_STALE'));
const staleView = buildLafeaT6GeometryQualificationViewModel({
  ...stageFor(otherMeshPackage),
  retainedT6GeometryQualification: state.select(STAGE_ID),
  t6GeometryQualificationProjection: staleProjection,
});
assert.equal(staleView.status, 'STALE');
assert.equal(staleView.custody, 'STALE_RETAINED_EVIDENCE');
assert.equal(value(staleView.rows, 'Integrated T6 area (model length² basis)'), undefined);
assert.equal(staleView.methodSemantics.length, 0);

const blockedEvidence = qualify(meshPackage, {
  ...PASS_TOLERANCES,
  areaRelative: 1e-20,
}, '2');
assert.equal(blockedEvidence.status, 'BLOCKED');
assert.ok(blockedEvidence.reasons.includes('AREA_ERROR_EXCEEDS_TOLERANCE'));
const blockedState = createLafeaT6GeometryQualificationState([STAGE_ID], {
  currentCandidateHeadSha: HEAD,
});
const blocked = blockedState.register({
  schema: LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
  stageId: STAGE_ID,
  evidence: blockedEvidence,
  meshPackage,
}, currentStage);
assert.equal(blocked.projection.state, 'CURRENT_BLOCK');
assert.equal(blocked.projection.qualified, false);
assert.equal(blocked.projection.blocked, true);
assert.equal(blocked.projection.releaseQualified, false);
const blockedView = buildLafeaT6GeometryQualificationViewModel({
  ...currentStage,
  retainedT6GeometryQualification: blocked.retained,
  t6GeometryQualificationProjection: blocked.projection,
});
assert.equal(blockedView.custody, 'CURRENT_BLOCKED_DETAIL');
assert.ok(blockedView.reasons.includes('AREA_ERROR_EXCEEDS_TOLERANCE'));

const tampered = structuredClone(passEvidence);
tampered.geometry.areaRelativeError = 0;
assert.throws(() => createLafeaT6GeometryQualificationCustody({
  schema: LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
  stageId: STAGE_ID,
  evidence: tampered,
  meshPackage,
}));
assert.throws(() => createLafeaT6GeometryQualificationCustody({
  schema: LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
  stageId: STAGE_ID,
  evidence: passEvidence,
  meshPackage: otherMeshPackage,
}));
assert.throws(() => createLafeaT6GeometryQualificationState([STAGE_ID], {
  currentCandidateHeadSha: 'b'.repeat(40),
}).register(intake, currentStage));
assert.throws(() => createLafeaT6GeometryQualificationState([STAGE_ID], {
  currentCandidateHeadSha: null,
}).register(intake, currentStage));

const apiSource = source('../src/workspace/lafea-workbench-orchestrator-api.js');
const controllerSource = source('../src/workspace/lafea-workbench-controller.js');
const publicSource = source('../src/workspace/lafea-workbench.js');
for (const name of [
  'registerT6GeometryQualification',
  'selectRetainedT6GeometryQualification',
  'buildT6GeometryQualificationProjection',
  'exportT6GeometryQualification',
]) {
  assert.match(apiSource, new RegExp(name, 'u'));
  assert.match(controllerSource, new RegExp(name, 'u'));
}
for (const name of [
  'LAFEA_T6_GEOMETRY_QUALIFICATION_CUSTODY_SCHEMA',
  'LAFEA_T6_GEOMETRY_QUALIFICATION_PROJECTION_SCHEMA',
  'createLafeaT6GeometryQualificationCustody',
  'projectLafeaT6GeometryQualification',
]) {
  assert.match(publicSource, new RegExp(name, 'u'));
}

console.log(JSON.stringify({
  check: 'lafea-ui-t6-geometry-qualification',
  status: 'PASS',
  exactParentRebuildValidated: true,
  exactHeadAndCurrentMeshRequired: true,
  meshReplacementProjectsStale: true,
  blockedEvidencePreserved: true,
  staleMetricsSuppressed: true,
  numericalMethodsExplicit: true,
  releaseAuthorityPromoted: false,
  githubActionsWorkflowAdded: false,
}));

function meshPackageFor(meshIdentity, radialDivisions, circumferentialDivisions) {
  return generateLafeaLugPinholeT6Mesh({
    schema: 'lafea-lug-pinhole-t6-mesh-spec/v1',
    meshIdentity,
    center: { x: 2, y: -1 },
    holeRadius: 1,
    outerRadius: 3,
    radialDivisions,
    circumferentialDivisions,
    startAngleDegrees: 11,
  });
}
function qualify(parent, tolerances, hashDigit) {
  return qualifyLafeaBucket01Mesh({
    schema: LAFEA_BUCKET_01_MESH_QUALIFICATION_INPUT_SCHEMA,
    exactHeadSha: HEAD,
    meshPackageHash: `sha256:${hashDigit.repeat(64)}`,
    qualificationProfileHash: `sha256:${'f'.repeat(64)}`,
    meshPackage: parent,
    tolerances,
  });
}
function stageFor(parent) {
  return {
    stageId: STAGE_ID,
    domainFirstProfileActive: false,
    shellMidsurfaceProfileActive: false,
    analysisMeshCustodyProjection: { canView: true, state: 'CURRENT_PASS' },
    retainedAnalysisMeshEvidence: {
      mesh: parent.mesh,
      meshHash: lafeaAnalysisMeshContentHash(parent.mesh),
    },
  };
}
function value(rows, label) { return rows.find((row) => row.label === label)?.value; }
function displayNumber(numberValue) { return Number(numberValue.toPrecision(8)).toString(); }
function source(relative) { return readFileSync(new URL(relative, import.meta.url), 'utf8'); }
