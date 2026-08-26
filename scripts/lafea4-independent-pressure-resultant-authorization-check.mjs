#!/usr/bin/env node
import assert from 'node:assert/strict';

import { PROFILE_KINDS, canonicalProfile } from '../src/core/lafea-profile-contract/index.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { createLafeaMockDocument } from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';

const STAGE_ID = 'LAFEA.4';
const SHELL_ROUTE = 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';
const PRESSURE_CASE_ID = 'PRESSURE';
const PRESSURE_SENSE = 'ALONG_ELEMENT_NORMAL';

const source = await createLafeaMockDocument(STAGE_ID);
const normalized = requireLafeaStageComposition(STAGE_ID).normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalized,
  'IMPLEMENTATION-AUTHORIZATION-GATE/LAFEA4',
);
const parent = createLafeaSimulatedShellMidsurfaceEvidence(
  STAGE_ID,
  authority.sourceHash,
  normalized,
);
assert.equal(parent.qualification, 'PASS');
assert.equal(parent.geometry.surface.kind, 'CYLINDER');

const profile = shellProfile(15);
const store = createLafeaWorkbenchOrchestratorStore({
  initialStage: STAGE_ID,
  initialDocument: normalized,
  initialSourceHash: authority.sourceHash,
});

try {
  store.registerShellMidsurfaceEvidence(parent, STAGE_ID);
  store.bindAnalysisMeshProfile(profile, STAGE_ID);
  const generated = store.generateAnalysisMesh({}, STAGE_ID);
  assert.equal(generated?.evidence?.qualification, 'PASS');
  assert.equal(generated.evidence.quality.shellOrientationTopology?.qualification, 'PASS');
  store.run();

  const stage = store.getState().stages[STAGE_ID];
  assert.equal(stage.execution?.status, 'QUALIFIED');
  assert.equal(stage.execution?.route, SHELL_ROUTE);
  assert.equal(stage.execution?.meshHash, generated.evidence.meshHash);
  assert.equal(stage.lifecycle.artifacts.RECOVERY?.status, 'CURRENT');
  assert.equal(stage.lifecycle.artifacts.RECOVERY?.qualification, 'PASS');

  const loadCase = stage.execution.result.loadCaseResults.find(
    (row) => row.loadCaseId === PRESSURE_CASE_ID,
  );
  assert.ok(loadCase);
  assert.equal(loadCase.forceEquilibrium.qualification.accepted, true);
  assert.equal(loadCase.momentEquilibrium.qualification.accepted, true);

  const sourceCase = normalized.loadCases.find((row) => row.loadCaseId === PRESSURE_CASE_ID);
  assert.ok(sourceCase);
  assert.equal(sourceCase.nodalLoads.length, 0);
  assert.equal(sourceCase.pressureLoads.length, normalized.elements.length);
  const pressureValues = [...new Set(sourceCase.pressureLoads.map((row) => row.pressure))];
  const pressureSenses = [...new Set(sourceCase.pressureLoads.map((row) => row.sense))];
  assert.equal(pressureValues.length, 1);
  assert.deepEqual(pressureSenses, [PRESSURE_SENSE]);
  const pressure = pressureValues[0];

  const retained = generated.evidence.mesh;
  const nodeById = new Map(retained.nodes.map((row) => [row.nodeId, [row.x, row.y, row.z]]));
  let independentForce = [0, 0, 0];
  let independentMoment = [0, 0, 0];
  let minimumParentNormalAlignment = 1;
  const contributions = retained.elements.map((element) => {
    assert.equal(element.nodeIds.length, 3);
    const points = element.nodeIds.map((nodeId) => {
      const point = nodeById.get(nodeId);
      assert.ok(point, `retained shell node ${nodeId} must exist`);
      return point;
    });
    const ab = subtract3(points[1], points[0]);
    const ac = subtract3(points[2], points[0]);
    const areaVector2 = cross3(ab, ac);
    const areaVector2Magnitude = Math.hypot(...areaVector2);
    assert.ok(areaVector2Magnitude > 0, `${element.elementId} must have positive area`);
    const area = areaVector2Magnitude / 2;
    const rawUnitNormal = areaVector2.map((value) => value / areaVector2Magnitude);
    const centroid = [0, 1, 2].map(
      (axis) => (points[0][axis] + points[1][axis] + points[2][axis]) / 3,
    );
    const radialMagnitude = Math.hypot(centroid[1], centroid[2]);
    assert.ok(radialMagnitude > 0);
    const analyticalParentNormal = [0, centroid[1] / radialMagnitude, centroid[2] / radialMagnitude];
    const parentNormalAlignment = dot3(rawUnitNormal, analyticalParentNormal);
    minimumParentNormalAlignment = Math.min(minimumParentNormalAlignment, parentNormalAlignment);
    assert.ok(
      parentNormalAlignment > 0,
      `${element.elementId} retained normal must align with cylindrical outward parent normal`,
    );

    const signedUnitNormal = rawUnitNormal;
    const totalForce = signedUnitNormal.map((value) => pressure * area * value);
    const momentAboutOrigin = cross3(centroid, totalForce);
    independentForce = add3(independentForce, totalForce);
    independentMoment = add3(independentMoment, momentAboutOrigin);
    return Object.freeze({
      elementId: element.elementId,
      nodeIds: [...element.nodeIds],
      coordinates: points,
      area,
      rawUnitNormal,
      analyticalParentNormal,
      parentNormalAlignment,
      centroid,
      pressure,
      pressureSense: PRESSURE_SENSE,
      totalForce,
      momentAboutOrigin,
    });
  });

  const radius = parent.geometry.surface.radius;
  const u = parent.geometry.vertices.map((row) => row.u);
  const v = parent.geometry.vertices.map((row) => row.v);
  const angularSpan = (Math.max(...u) - Math.min(...u)) / radius;
  const axialLength = Math.max(...v) - Math.min(...v);
  const analyticalForceZ = pressure * radius * axialLength * 2 * Math.sin(angularSpan / 2);
  const analyticalForce = [0, 0, analyticalForceZ];
  const analyticalMoment = [0, -analyticalForceZ * axialLength / 2, 0];

  vectorClose(independentForce, analyticalForce, 2e-10, 1e-7);
  vectorClose(independentMoment, analyticalMoment, 2e-10, 1e-6);
  vectorClose(loadCase.appliedLoadEvidence.appliedForce, independentForce, 2e-10, 1e-7);
  vectorClose(loadCase.appliedLoadEvidence.appliedMomentAboutOrigin, independentMoment, 2e-10, 1e-6);
  assert.equal(
    loadCase.appliedLoadEvidence.contributions.length,
    retained.elements.length,
    'production pressure evidence must cover every retained shell element',
  );

  const body = Object.freeze({
    schema: 'lafea4-independent-pressure-resultant-authorization-addendum/v1',
    status: 'PASS',
    calculationAuthority: Object.freeze({
      productionLoadAssemblerUsedForIndependentSum: false,
      arithmetic: 'SUM_RETAINED_TRI3_P_A_N_AND_CENTROID_CROSS_FORCE',
      pressureSense: PRESSURE_SENSE,
      releaseAuthorityGranted: false,
    }),
    source: Object.freeze({
      modelIdentity: normalized.modelIdentity,
      loadCaseId: PRESSURE_CASE_ID,
      radius,
      axialLength,
      angularSpanRadians: angularSpan,
      angularSpanDegrees: angularSpan * 180 / Math.PI,
      pressure,
    }),
    independentRetainedFacetResultant: Object.freeze({
      force: independentForce,
      momentAboutOrigin: independentMoment,
      contributionCount: contributions.length,
      minimumParentNormalAlignment,
      contributionsHash: canonicalLafeaSha256({
        schema: 'lafea4-independent-pressure-facet-contributions/v1',
        contributions,
      }),
      contributions,
    }),
    analyticalCylinder: Object.freeze({
      force: analyticalForce,
      momentAboutOrigin: analyticalMoment,
    }),
    productionEvidence: Object.freeze({
      appliedForce: loadCase.appliedLoadEvidence.appliedForce,
      appliedMomentAboutOrigin: loadCase.appliedLoadEvidence.appliedMomentAboutOrigin,
      pressureContributionCount: loadCase.appliedLoadEvidence.contributions.length,
      forceEquilibriumAccepted: loadCase.forceEquilibrium.qualification.accepted,
      momentEquilibriumAccepted: loadCase.momentEquilibrium.qualification.accepted,
      reactions: structuredClone(loadCase.reactions),
    }),
    trace: Object.freeze({
      sourceHash: authority.sourceHash,
      retainedMeshHash: generated.evidence.meshHash,
      retainedMeshArtifactHash: generated.evidence.artifactHash,
      solverModelHash: stage.execution.solverModelHash,
      compiledExecutionHash: stage.execution.compiledExecutionHash,
      recoveryArtifactHash: stage.lifecycle.artifacts.RECOVERY.artifactHash,
    }),
    forcePassMomentFailFalsifier: Object.freeze({
      first: 'COMPARE_PRODUCTION_APPLIED_MOMENT_TO_INDEPENDENT_SUM_CENTROID_CROSS_P_A_N',
      second: 'COMPARE_REACTION_FORCE_TRANSPORT_AND_TANGENT_MOMENTS_TO_NEGATIVE_INDEPENDENT_RESULTANT',
      third: 'CHECK_RETAINED_NORMAL_DOT_ANALYTICAL_PARENT_NORMAL_PER_ELEMENT',
    }),
  });
  const evidence = Object.freeze({
    ...body,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-independent-pressure-resultant-authorization-addendum-hash-input/v1',
      evidence: body,
    }),
  });
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  store.destroy();
}

function shellProfile(target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `IMPLEMENTATION_AUTHORIZATION_LAFEA4_${target}`,
    sourceRevision: 'IMPLEMENTATION-AUTHORIZATION-GATE/V1',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 3,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function vectorClose(actual, expected, relative, absolute) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => closeRelative(value, expected[index], relative, absolute));
}

function closeRelative(actual, expected, relative = 1e-8, absolute = 1e-10) {
  const tolerance = Math.max(absolute, relative * Math.max(1, Math.abs(expected)));
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`,
  );
}

function subtract3(a, b) { return a.map((value, index) => value - b[index]); }
function add3(a, b) { return a.map((value, index) => value + b[index]); }
function dot3(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
