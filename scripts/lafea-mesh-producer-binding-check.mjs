#!/usr/bin/env node
/**
 * Governed end-to-end qualification for the bound LAFEA analysis-mesh
 * producer. LAFEA.3 retains the continuum mechanics coverage below; LAFEA.4
 * and LAFEA.5 are additionally bound for the explicitly qualified shell
 * midsurface producer scopes.
 */
import assert from 'node:assert/strict';
import './lafea-b02d-probe-stable-polar-mesh-check.mjs';

import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { lafeaMeshCapabilities } from '../src/workspace/lafea-mesh-capabilities.js';
import { requireLafeaStageAnalysisAdapter } from '../src/workspace/lafea-stage-analysis-adapter.js';
import {
  buildLafeaMeshTopology,
  lafeaMeshTopologySupported,
} from '../src/workspace/lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from '../src/workspace/lafea-mesh-producer-engine.js';
import {
  LAFEA_MESH_PRODUCER_REF,
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
  lafeaMeshGenerationConfiguration,
  lafeaMeshProducerBound,
  planLafeaAnalysisMesh,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import {
  createLafeaMeshProducerOutputV2,
  validateLafeaMeshProducerOutputV2,
} from '../src/workspace/lafea-mesh-producer-v2-contracts.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import { buildLafeaDomainFirstMeshCustodyProjection } from '../src/workspace/lafea-domain-first-mesh-custody.js';
import { buildLafeaDiscretizationViewModel } from '../src/workspace/lafea-discretization-view-model.js';
import { createLafeaWorkbenchMeshGenerationState } from '../src/workspace/lafea-workbench-mesh-generation-state.js';
import { mp2SquareWithCircularHole } from './lafea-mp2-domain-geometry-fixtures.mjs';

const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;
const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';

// --- LMB-01: qualification identity and authority boundary ------------------
const capability = lafeaCoreMeshProducerCapability();
const qualification = lafeaCoreMeshProducerQualification();
assert.equal(capability.producerId, 'LAFEA_CORE_MESHER');
assert.equal(capability.producerRevision, 'LAFEA.10.T6Q8.SHELL.POLAR.V10');
assert.equal(qualification.qualificationRevision, 'R11');
assert.deepEqual(capability.generationModes, ['AUTOMATIC_MESH', 'REFINEMENT_REGENERATION']);
assert.equal(capability.supportsLocalRefinement, true);
assert.equal(qualification.localRefinementAuthorized, true);
assert.equal(qualification.capabilityHash, capability.capabilityHash);
assert.ok(qualification.governanceRef.includes('check:lafea-meshing'));

// --- LMB-02: explicit qualified stage/family scope --------------------------
assert.equal(lafeaMeshProducerBound('LAFEA.3'), true);
assert.equal(lafeaMeshProducerBound('LAFEA.4'), true);
assert.equal(lafeaMeshProducerBound('LAFEA.5'), true);
assert.equal(lafeaMeshProducerBound('LAFEA.3', 'NOT_A_FAMILY'), false);
for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const capabilities = lafeaMeshCapabilities(stageId);
  assert.equal(capabilities.automaticMeshProducerQualified, true, stageId);
  assert.equal(capabilities.generationExecutionAuthorized, true, stageId);
  assert.equal(capabilities.manualRefinementQualified, false, stageId);
  assert.deepEqual(capabilities.localRefinementElementFamilies, [], stageId);
  assert.deepEqual(capabilities.allowedElementFamilies, [SHELL_TRI3], stageId);
  assert.ok(capabilities.reasons.includes('QUALIFIED_MESH_PRODUCER_BOUND'), stageId);
  assert.ok(capabilities.reasons.includes('GOVERNED_REFINEMENT_COMMAND_NOT_AVAILABLE'), stageId);
  assert.equal(
    requireLafeaStageAnalysisAdapter(stageId).discretization.qualifiedProducerId,
    LAFEA_MESH_PRODUCER_REF,
    stageId,
  );
}
assert.equal(lafeaMeshCapabilities('LAFEA.3').generationExecutionAuthorized, true);
assert.equal(lafeaMeshCapabilities('LAFEA.3').manualRefinementQualified, true);
assert.deepEqual(lafeaMeshCapabilities('LAFEA.3').localRefinementElementFamilies, ['T3', 'T6']);
assert.equal(
  requireLafeaStageAnalysisAdapter('LAFEA.3').discretization.qualifiedProducerId,
  LAFEA_MESH_PRODUCER_REF,
);

function plate(width, height) {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3', geometryId: 'PLATE', coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: width, y: 0 },
      { vertexId: 'V3', x: width, y: height }, { vertexId: 'V4', x: 0, y: height },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'),
      line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function splitSidePlate() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3', geometryId: 'SPLIT-SIDE-PLATE', coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'VS', x: 73, y: 0 },
      { vertexId: 'V2', x: 200, y: 0 }, { vertexId: 'V3', x: 200, y: 120 },
      { vertexId: 'V4', x: 0, y: 120 },
    ],
    segments: [
      line('S1A', 'V1', 'VS'), line('S1B', 'VS', 'V2'), line('S2', 'V2', 'V3'),
      line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1A', 'S1B', 'S2', 'S3', 'S4'] }],
  });
}

function filletedPlate() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3', geometryId: 'FILLETED-PLATE', coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: 200, y: 0 },
      { vertexId: 'VF1', x: 200, y: 100 }, { vertexId: 'VF2', x: 180, y: 120 },
      { vertexId: 'V4', x: 0, y: 120 },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'VF1'),
      arc('SF', 'VF1', 'VF2', 180, 100, 20, 'CCW'),
      line('S3', 'VF2', 'V4'), line('S4', 'V4', 'V1'),
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'SF', 'S3', 'S4'] }],
  });
}

function pentagon() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3', geometryId: 'PENTAGON', coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: 100, y: 0 },
      { vertexId: 'V3', x: 140, y: 60 }, { vertexId: 'V4', x: 70, y: 120 },
      { vertexId: 'V5', x: 0, y: 60 },
    ],
    segments: [
      line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'), line('S3', 'V3', 'V4'),
      line('S4', 'V4', 'V5'), line('S5', 'V5', 'V1'),
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4', 'S5'] }],
  });
}

function meshProfileFor(continuumElement, globalTargetSize) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `CHECK_${continuumElement}_${globalTargetSize}`,
    sourceRevision: 'R4', semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement,
      shellElement: SHELL_TRI3,
      globalTargetSize,
    },
  });
}

function stageFor(geometry) {
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: 'LAFEA.3', sourceHash: SOURCE_HASH, applicationRef: 'CHECK',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'R1', materialRef: 'MAT_A' },
    physicalCases: [{ caseId: 'C1' }], attachments: [],
  }, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH, analysisDomain: domain, geometry,
    producerRef: 'CHECK_GEOMETRY_PRODUCER', profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return {
    stageId: 'LAFEA.3', document: {}, domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash },
  };
}

// --- LMB-03: hole-free geometry and mapped Q8 remain unchanged --------------
const geometry = plate(200, 120);
const adapter = buildLafeaMeshTopology(geometry);
assert.equal(adapter.holeLoopIds.length, 0);
assert.equal(lafeaMeshTopologySupported(adapter), true);
const mapped = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(mapped.strategy, 'MAPPED_TRANSFINITE');
assert.equal(mapped.holeCount, 0);
assert.ok(mapped.characteristicLengthMax <= 30 + 1e-9);

// --- LMB-04: P1-7 logical side chains preserve feature vertices ------------
const splitGeometry = splitSidePlate();
const splitAdapter = buildLafeaMeshTopology(splitGeometry);
const splitMapped = generateLafeaAnalysisMesh(splitAdapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(splitMapped.strategy, 'MAPPED_TRANSFINITE');
assert.equal(splitMapped.strategyReason, 'FOUR_SIDED_REGION_MAPPED');
assert.ok(splitMapped.mesh.nodes.some((node) => node.x === 73 && node.y === 0));
const splitReplay = generateLafeaAnalysisMesh(splitAdapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(JSON.stringify(splitReplay.mesh), JSON.stringify(splitMapped.mesh));
const splitProduced = produceLafeaAnalysisMeshEvidence(
  stageFor(splitGeometry),
  lafeaMeshGenerationConfiguration(meshProfileFor('Q8', 30)),
);
assert.equal(splitProduced.evidence.qualification, 'PASS');
assert.equal(splitProduced.evidence.quality.blockingElementIds.length, 0);

// --- LMB-05: a filleted-away corner is not falsely mapped ------------------
const filletGeometry = filletedPlate();
const filletAdapter = buildLafeaMeshTopology(filletGeometry);
// Not mappable, so this takes the unstructured path. Recombination cannot pair
// every triangle here, so uniform Q8 comes from centroid subdivision rather
// than being rejected — still all-Q8, never a relabelled T6.
const filletQ8 = generateLafeaAnalysisMesh(filletAdapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(filletQ8.strategy, 'QUAD_SUBDIVISION');
assert.equal(filletQ8.strategyReason, 'UNIFORM_Q8_BY_CENTROID_SUBDIVISION');
assert.ok(filletQ8.mesh.elements.every((element) => element.elementType === 'Q8'),
  'centroid subdivision must be all-quad by construction');
assert.equal(filletQ8.elementCount % 3, 0,
  'each triangle contributes exactly three quads');
assert.equal(
  JSON.stringify(generateLafeaAnalysisMesh(filletAdapter, {
    targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
  }).mesh),
  JSON.stringify(filletQ8.mesh),
  'subdivision must replay byte-identically',
);
const filletT6 = produceLafeaAnalysisMeshEvidence(
  stageFor(filletGeometry),
  lafeaMeshGenerationConfiguration(meshProfileFor('T6', 15)),
);
assert.equal(filletT6.planned.generated.strategy, 'CONSTRAINED_DELAUNAY');
assert.equal(filletT6.evidence.qualification, 'PASS');
assert.equal(filletT6.evidence.quality.blockingElementIds.length, 0);

// --- LMB-06: refined unstructured T6 has true interior vertices -------------
const unstructured = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'T6',
});
assert.equal(unstructured.strategy, 'CONSTRAINED_DELAUNAY');
assert.equal(unstructured.strategyReason, 'UNSTRUCTURED_INTERIOR_REFINEMENT');
assert.ok(unstructured.interiorPointCount > 0);

// --- LMB-07: true five-corner topology is uniform Q8 by subdivision --------
// A pentagon cannot be a logical quadrilateral and cannot fully recombine, so
// it exercises the subdivision path. The uniform-Q8 guarantee is preserved by
// construction, not by relabelling triangles.
const pentagonQ8 = generateLafeaAnalysisMesh(buildLafeaMeshTopology(pentagon()), {
  targetElementLength: 200, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(pentagonQ8.strategy, 'QUAD_SUBDIVISION');
assert.ok(pentagonQ8.mesh.elements.every((element) => element.elementType === 'Q8'));
assert.equal(pentagonQ8.elementCount % 3, 0);

// --- LMB-08: deterministic replay ------------------------------------------
const replay = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'T6',
});
assert.equal(JSON.stringify(replay.mesh), JSON.stringify(unstructured.mesh));
assert.equal(replay.interiorPointCount, unstructured.interiorPointCount);

// --- LMB-09: profile is the generation source of truth ----------------------
const stage = stageFor(geometry);
const governedProfile = meshProfileFor('Q8', 30);
assert.throws(
  () => lafeaMeshGenerationConfiguration(governedProfile, { elementFamily: 'T6' }),
  (error) => error?.code === 'LAFEA_MESH_GENERATION_PROFILE_ELEMENT_FAMILY_OVERRIDE_MISMATCH',
);
assert.throws(
  () => lafeaMeshGenerationConfiguration(governedProfile, { targetElementLength: 25 }),
  (error) => error?.code === 'LAFEA_MESH_GENERATION_PROFILE_TARGET_LENGTH_OVERRIDE_MISMATCH',
);
const configuration = lafeaMeshGenerationConfiguration(governedProfile);
const planned = planLafeaAnalysisMesh(stage, configuration);
assert.equal(planned.plan.engineeringAuthority, false);
assert.equal(planned.plan.resourceDisposition, 'WITHIN_LIMITS');
assert.equal(planned.readiness.executionAuthorized, true);
assert.equal(planned.intent.producerRef, LAFEA_MESH_PRODUCER_REF);
const produced = produceLafeaAnalysisMeshEvidence(stage, { ...configuration, planned });
assert.equal(produced.output.lifecycleAuthority, false);
validateLafeaMeshProducerOutputV2(produced.output, {
  capability, qualification, plan: planned.plan, intent: planned.intent,
});
const evidence = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
assert.equal(evidence.qualification, 'PASS');
assert.equal(evidence.releaseQualified, false);
const custody = buildLafeaDomainFirstMeshCustodyProjection(stage, evidence);
assert.equal(custody.state, 'CURRENT_PASS');
assert.equal(custody.runPolicy, 'ALLOW');

// --- LMB-10: v2 envelope independently enforces element family --------------
assert.throws(
  () => createLafeaMeshProducerOutputV2({
    schema: 'lafea-mesh-producer-output/v2', stageId: planned.plan.stageId,
    intentHash: planned.plan.intentHash, planHash: planned.plan.planHash,
    capabilityHash: planned.plan.capabilityHash, qualificationHash: planned.plan.qualificationHash,
    producerId: planned.plan.producerId, producerRevision: planned.plan.producerRevision,
    sourceHash: planned.plan.sourceHash, analysisDomainHash: planned.plan.analysisDomainHash,
    analysisGeometryHash: planned.plan.analysisGeometryHash,
    meshProfileHash: planned.plan.meshProfileHash, elementFamily: 'Q8', mesh: unstructured.mesh,
  }),
  (error) => error?.code === 'LAFEA_MESH_PRODUCER_OUTPUT_V2_ELEMENT_FAMILY_MISMATCH',
);

// --- LMB-11: evidence round-trip, tamper and stale custody ------------------
const recovery = createLafeaWorkbenchMeshGenerationState(['LAFEA.3']);
recovery.bindMeshProfile(evidence.meshProfile, 'LAFEA.3');
assert.equal(recovery.recoverEvidence(evidence, 'LAFEA.3').changed, true);
assert.deepEqual(recovery.exportEvidence('LAFEA.3'), evidence);
assert.equal(recovery.recoverEvidence(evidence, 'LAFEA.3').changed, false);
assert.throws(() => validateLafeaAnalysisMeshEvidenceV2({
  ...evidence, mesh: { ...evidence.mesh, nodes: evidence.mesh.nodes.slice(1) },
}));
const stale = buildLafeaDomainFirstMeshCustodyProjection({
  ...stage,
  sourceAuthority: { stageId: 'LAFEA.3', sourceHash: `sha256:${'b'.repeat(64)}` },
}, evidence);
assert.equal(stale.state, 'STALE');
assert.equal(stale.usableForAdvance, false);

// --- LMB-12: P1-5 target ladder stays quality-qualified --------------------
const refinementLadder = [60, 30, 15, 8].map((targetElementLength) => {
  const result = produceLafeaAnalysisMeshEvidence(
    stage,
    lafeaMeshGenerationConfiguration(meshProfileFor('T6', targetElementLength)),
  );
  return {
    targetElementLength,
    interiorPointCount: result.planned.generated.interiorPointCount,
    elementCount: result.evidence.mesh.elements.length,
    qualification: result.evidence.qualification,
    blockingElementCount: result.evidence.quality.blockingElementIds.length,
  };
});
for (const row of refinementLadder) {
  assert.ok(row.interiorPointCount > 0);
  assert.equal(row.qualification, 'PASS', `target ${row.targetElementLength}`);
  assert.equal(row.blockingElementCount, 0, `target ${row.targetElementLength}`);
}
for (let index = 1; index < refinementLadder.length; index += 1) {
  assert.ok(refinementLadder[index].interiorPointCount > refinementLadder[index - 1].interiorPointCount);
  assert.ok(refinementLadder[index].elementCount > refinementLadder[index - 1].elementCount);
}

// --- LMB-13: canonical MP2 square-with-circular-hole is meshable ------------
const holeGeometry = createLafeaAnalysisGeometry(mp2SquareWithCircularHole());
const holeAdapter = buildLafeaMeshTopology(holeGeometry);
assert.equal(holeAdapter.holeLoopIds.length, 1);
assert.equal(lafeaMeshTopologySupported(holeAdapter), true);
const holeEngine = generateLafeaAnalysisMesh(holeAdapter, {
  targetElementLength: 1.5, curvatureToleranceDegrees: 15, elementFamily: 'T6',
});
assert.equal(holeEngine.strategy, 'CONSTRAINED_DELAUNAY');
assert.equal(holeEngine.strategyReason, 'MULTIPLY_CONNECTED_REGION_CONSTRAINED');
assert.equal(holeEngine.holeCount, 1);
assert.ok(holeEngine.elementCount > 0);
assertHoleIsEmpty(holeEngine.mesh, 5, 5, 1);
const circularBoundaryNodes = holeEngine.mesh.nodes.filter((node) =>
  Math.abs(Math.hypot(node.x - 5, node.y - 5) - 1) <= 1e-10);
assert.ok(circularBoundaryNodes.length >= 48,
  `expected analytic corner+midside nodes on circular hole, got ${circularBoundaryNodes.length}`);
const holeReplay = generateLafeaAnalysisMesh(holeAdapter, {
  targetElementLength: 1.5, curvatureToleranceDegrees: 15, elementFamily: 'T6',
});
assert.equal(JSON.stringify(holeReplay.mesh), JSON.stringify(holeEngine.mesh));

// --- LMB-14: canonical hole reaches evidence CURRENT_PASS -------------------
const holeStage = stageFor(holeGeometry);
const holeProduced = produceLafeaAnalysisMeshEvidence(
  holeStage,
  lafeaMeshGenerationConfiguration(meshProfileFor('T6', 1.5)),
);
assert.equal(holeProduced.planned.generated.holeCount, 1);
assert.equal(holeProduced.evidence.qualification, 'PASS');
assert.equal(holeProduced.evidence.quality.blockingElementIds.length, 0);
const holeCustody = buildLafeaDomainFirstMeshCustodyProjection(holeStage, holeProduced.evidence);
assert.equal(holeCustody.state, 'CURRENT_PASS');
assert.equal(holeCustody.usableForRun, true);

// --- LMB-15: Q8 hole request never silently degrades to mixed family --------
// A multiply-connected region is served by subdivision, so Q8 is available
// here too — but the uniform-family guarantee still holds absolutely, and the
// curved hole boundary keeps its analytic midside positions rather than being
// replaced by a finer polyline.
const holeQ8 = generateLafeaAnalysisMesh(holeAdapter, {
  targetElementLength: 1.5, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(holeQ8.strategy, 'QUAD_SUBDIVISION');
assert.ok(holeQ8.mesh.elements.every((element) => element.elementType === 'Q8'));
assert.equal(holeQ8.holeCount, 1);
const onHoleArc = holeQ8.mesh.nodes.filter((node) => Math.abs(
  Math.hypot(node.x - 5, node.y - 5) - 1,
) < 1e-9);
assert.ok(onHoleArc.length > 0,
  'subdivided nodes on the hole boundary must lie on the true arc, not its chord');

// --- LMB-16: Discretization remains truthful for a retained Q8 mesh --------
const generatedStage = {
  ...stage,
  retainedAnalysisMeshEvidenceV2: evidence,
  retainedAnalysisMeshProfile: configuration.meshProfile,
  analysisMeshProfileHash: configuration.meshProfileHash,
  lastAnalysisMeshPlan: {
    schema: 'lafea-analysis-mesh-plan-summary/v1', stageId: 'LAFEA.3',
    generationMode: 'AUTOMATIC_MESH',
    elementFamily: planned.plan.elementFamily, strategy: planned.generated.strategy,
    strategyReason: planned.generated.strategyReason, nodeCount: planned.plan.estimatedNodes,
    elementCount: planned.plan.estimatedElements, estimatedDofs: planned.plan.estimatedDofs,
    boundarySegmentCount: planned.generated.boundarySegmentCount,
    characteristicLengthMin: planned.plan.characteristicLengthMin,
    characteristicLengthMedian: planned.plan.characteristicLengthMedian,
    characteristicLengthMax: planned.plan.characteristicLengthMax,
    resourceDisposition: planned.plan.resourceDisposition, intentHash: planned.intent.semanticHash,
    planHash: planned.plan.planHash, capabilityHash: planned.capabilityHash,
    qualificationHash: planned.qualificationHash, producerRef: planned.producerRef,
  },
  analysisMeshCustodyProjection: custody,
};
const viewModel = buildLafeaDiscretizationViewModel(generatedStage);
assert.equal(viewModel.generation.available, true);
assert.equal(viewModel.actions.canGenerateMesh, true);
assert.equal(viewModel.actions.canAdvance, true);
assert.equal(viewModel.evidence.producerRef, LAFEA_MESH_PRODUCER_REF);
assert.equal(viewModel.evidence.elementFamily, 'Q8');
const manualMode = viewModel.configuration.modes.find((row) => row.mode === 'MANUAL_REFINEMENT');
assert.equal(manualMode.enabled, false);
assert.equal(manualMode.reason, 'Q8_LOCAL_REFINEMENT_NOT_QUALIFIED');
assert.equal(viewModel.actions.manualRefinementEnabled, false);
assert.equal(viewModel.actions.canRefineMesh, false);

// --- LMB-17: unbound profile remains explicit and fail-closed ---------------
const unboundViewModel = buildLafeaDiscretizationViewModel({
  ...stage,
  analysisMeshCustodyProjection: buildLafeaDomainFirstMeshCustodyProjection(stage, null),
});
assert.equal(unboundViewModel.generation.available, false);
assert.equal(unboundViewModel.generation.unavailableReason, 'ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
assert.equal(unboundViewModel.actions.canGenerateMesh, false);

function assertHoleIsEmpty(mesh, centerX, centerY, radius) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  for (const node of mesh.nodes) {
    const radial = Math.hypot(node.x - centerX, node.y - centerY);
    assert.ok(radial >= radius - 1e-10,
      `mesh node ${node.nodeId} lies inside circular hole: r=${radial}`);
  }
  for (const element of mesh.elements) {
    const corners = element.nodeIds.slice(0, 3).map((nodeId) => nodeById.get(nodeId));
    const centroid = {
      x: corners.reduce((sum, node) => sum + node.x, 0) / 3,
      y: corners.reduce((sum, node) => sum + node.y, 0) / 3,
    };
    const radial = Math.hypot(centroid.x - centerX, centroid.y - centerY);
    assert.ok(radial >= radius - 1e-10,
      `element ${element.elementId} centroid lies inside circular hole: r=${radial}`);
  }
}

function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}

function arc(segmentId, startVertexId, endVertexId, centerX, centerY, radius, sweep) {
  return { segmentId, type: 'CIRCULAR_ARC', startVertexId, endVertexId, centerX, centerY, radius, sweep };
}

console.log('LAFEA mesh-producer binding check PASS (P0 + P1-5 + P1-6 holes + P1-7 logical mapped chains + P2-8 planar/cylindrical/curved-hole/periodic shell automatic generation binding + P2-9 retained local refinement authority + B02D registered probe-stable polar V10)');