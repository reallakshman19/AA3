#!/usr/bin/env node
/**
 * End-to-end check for the bound LAFEA.3 analysis-mesh producer:
 * analysis geometry -> intent v2 -> plan v2 -> core mesher -> producer output
 * v2 -> analysis-mesh evidence v2 -> domain-first custody -> discretization
 * view model.
 *
 * Also asserts the negative cases, which are the ones that matter for
 * governance: stages with no bound producer must stay unauthorized, a mesh
 * that fails the profile's quality gates must not clear the gate, a Q8 request
 * must not leak partial T6 recombination, profile-hash inputs must not be
 * overridden after binding, and v2 evidence must round-trip.
 */
import assert from 'node:assert/strict';

import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
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
import {
  validateLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import {
  buildLafeaDomainFirstMeshCustodyProjection,
} from '../src/workspace/lafea-domain-first-mesh-custody.js';
import {
  buildLafeaDiscretizationViewModel,
} from '../src/workspace/lafea-discretization-view-model.js';
import {
  createLafeaWorkbenchMeshGenerationState,
} from '../src/workspace/lafea-workbench-mesh-generation-state.js';

const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;

// --- LMB-01: capability and qualification are self-consistent ----------------
const capability = lafeaCoreMeshProducerCapability();
const qualification = lafeaCoreMeshProducerQualification();
assert.equal(capability.producerId, 'LAFEA_CORE_MESHER');
assert.deepEqual(capability.generationModes, ['AUTOMATIC_MESH']);
assert.equal(capability.supportsLocalRefinement, false,
  'local refinement is not implemented and must not be claimed');
assert.equal(qualification.capabilityHash, capability.capabilityHash);
assert.equal(qualification.localRefinementAuthorized, false);
assert.ok(qualification.governanceRef.includes('check:lafea-meshing'));
assert.ok(qualification.maximumNodes <= capability.maximumNodes);

// --- LMB-02: only LAFEA.3 is bound; other mesh stages stay unauthorized ------
assert.equal(lafeaMeshProducerBound('LAFEA.3'), true);
assert.equal(lafeaMeshProducerBound('LAFEA.4'), false);
assert.equal(lafeaMeshProducerBound('LAFEA.5'), false);
assert.equal(lafeaMeshProducerBound('LAFEA.3', 'NOT_A_FAMILY'), false);

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const capabilities = lafeaMeshCapabilities(stageId);
  assert.equal(capabilities.automaticMeshProducerQualified, false, stageId);
  assert.equal(capabilities.generationExecutionAuthorized, false, stageId);
  assert.ok(capabilities.reasons.includes('QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE'), stageId);
  const adapter = requireLafeaStageAnalysisAdapter(stageId);
  assert.equal(adapter.discretization.generationAuthorized, false, stageId);
  assert.equal(adapter.discretization.qualifiedProducerId, null, stageId);
}

const lafea3Capabilities = lafeaMeshCapabilities('LAFEA.3');
assert.equal(lafea3Capabilities.automaticMeshProducerQualified, true);
assert.equal(lafea3Capabilities.generationExecutionAuthorized, true);
assert.equal(lafea3Capabilities.manualRefinementQualified, false);
assert.equal(
  requireLafeaStageAnalysisAdapter('LAFEA.3').discretization.qualifiedProducerId,
  LAFEA_MESH_PRODUCER_REF,
);

// --- fixtures ---------------------------------------------------------------
function plate(width, height) {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: 'PLATE',
    coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 },
      { vertexId: 'V2', x: width, y: 0 },
      { vertexId: 'V3', x: width, y: height },
      { vertexId: 'V4', x: 0, y: height },
    ],
    segments: [
      { segmentId: 'S1', type: 'LINE', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', type: 'LINE', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', type: 'LINE', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', type: 'LINE', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function pentagon() {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: 'PENTAGON',
    coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 },
      { vertexId: 'V2', x: 100, y: 0 },
      { vertexId: 'V3', x: 140, y: 60 },
      { vertexId: 'V4', x: 70, y: 120 },
      { vertexId: 'V5', x: 0, y: 60 },
    ],
    segments: [
      { segmentId: 'S1', type: 'LINE', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', type: 'LINE', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', type: 'LINE', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', type: 'LINE', startVertexId: 'V4', endVertexId: 'V5' },
      { segmentId: 'S5', type: 'LINE', startVertexId: 'V5', endVertexId: 'V1' },
    ],
    loops: [{
      loopId: 'L_OUTER', role: 'OUTER',
      segmentIds: ['S1', 'S2', 'S3', 'S4', 'S5'],
    }],
  });
}

function meshProfileFor(continuumElement, globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: 'CHECK_MESH_PROFILE',
    sourceRevision: 'R1',
    semanticHash: undefined,
    fields: {
      continuumElement,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function stageFor(geometry) {
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH,
    applicationRef: 'CHECK',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'R1', materialRef: 'MAT_A' },
    physicalCases: [{ caseId: 'C1' }],
    attachments: [],
  }, geometry);
  const evidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1',
    stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'CHECK_GEOMETRY_PRODUCER',
    profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  const projection = {
    state: 'CURRENT_PASS',
    analysisDomainHash: domain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
  };
  return {
    stageId: 'LAFEA.3',
    document: {},
    domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisGeometryEvidence: evidence,
    analysisDomainProjection: projection,
    analysisGeometryProjection: projection,
  };
}

// --- LMB-03: geometry adapts to the core topology ---------------------------
const geometry = plate(200, 120);
const adapter = buildLafeaMeshTopology(geometry);
assert.equal(adapter.topology.regions.length, 1);
assert.equal(adapter.holeLoopIds.length, 0);
assert.equal(lafeaMeshTopologySupported(adapter), true);
assert.equal(adapter.analysisGeometryHash, geometry.semanticHash);

// --- LMB-04: the mapped strategy is used for a four-sided Q8 region ----------
const mapped = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(mapped.strategy, 'MAPPED_TRANSFINITE');
assert.ok(mapped.elementCount > 0 && mapped.nodeCount > 0);
assert.equal(mapped.estimatedDofs, mapped.nodeCount * 2);
assert.ok(mapped.characteristicLengthMax <= 30 + 1e-9,
  `mapped characteristic length ${mapped.characteristicLengthMax} must respect the target`);

const unstructured = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'T6',
});
assert.equal(unstructured.strategy, 'CONSTRAINED_DELAUNAY');
assert.equal(unstructured.strategyReason, 'UNSTRUCTURED_ELEMENT_FAMILY_REQUESTED');

// --- LMB-05: partial Q8 recombination is rejected truthfully -----------------
// Five boundary corners produce three triangles. Pair recombination can consume
// at most two of them, so at least one true T6 remains. A uniform-Q8 request
// must fail here, before plan/output/evidence can misrepresent that topology.
const pentagonAdapter = buildLafeaMeshTopology(pentagon());
assert.throws(
  () => generateLafeaAnalysisMesh(pentagonAdapter, {
    targetElementLength: 200, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
  }),
  (error) => error?.code === 'LAFEA_MESH_ENGINE_Q8_FULL_RECOMBINATION_REQUIRED',
);

// --- LMB-06: determinism / BYTE_IDENTICAL_CANONICAL_MESH_V1 -----------------
const replay = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
assert.equal(JSON.stringify(replay.mesh), JSON.stringify(mapped.mesh),
  'the declared repeatability policy requires a byte-identical replay');

// --- LMB-07: the curvature tolerance is the only curvature control ----------
const arcGeometry = createLafeaAnalysisGeometry({
  schema: 'lafea-analysis-geometry/v1',
  stageId: 'LAFEA.3',
  geometryId: 'QUADRANT',
  coordinateSystemId: 'GLOBAL',
  lengthUnit: 'mm',
  orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
  vertices: [
    { vertexId: 'V1', x: 0, y: 0 },
    { vertexId: 'V2', x: 50, y: 0 },
    { vertexId: 'V3', x: 0, y: 50 },
  ],
  segments: [
    { segmentId: 'S1', type: 'LINE', startVertexId: 'V1', endVertexId: 'V2' },
    {
      segmentId: 'S2', type: 'CIRCULAR_ARC', startVertexId: 'V2', endVertexId: 'V3',
      centerX: 0, centerY: 0, radius: 50, sweep: 'CCW',
    },
    { segmentId: 'S3', type: 'LINE', startVertexId: 'V3', endVertexId: 'V1' },
  ],
  loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
});
const arcAdapter = buildLafeaMeshTopology(arcGeometry);
const arcMesh = generateLafeaAnalysisMesh(arcAdapter, {
  targetElementLength: 40, curvatureToleranceDegrees: 30, elementFamily: 'T6',
});
assert.equal(arcMesh.boundarySegmentCount, 7,
  'the declared angular tolerance must be the exact binding curvature control');

// --- LMB-08: bound profile is generation authority and reaches CURRENT_PASS --
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
assert.equal(configuration.elementFamily, governedProfile.fields.continuumElement);
assert.equal(configuration.targetElementLength, governedProfile.fields.globalTargetSize);
const planned = planLafeaAnalysisMesh(stage, configuration);
assert.equal(planned.plan.schema, 'lafea-mesh-plan/v2');
assert.equal(planned.plan.engineeringAuthority, false, 'a plan is never authority');
assert.equal(planned.plan.resourceDisposition, 'WITHIN_LIMITS');
assert.equal(planned.readiness.producerContractReady, true);
assert.equal(planned.readiness.executionAuthorized, true);
assert.deepEqual(planned.readiness.reasons, [],
  'a bound producer must not still report REAL_PRODUCER_IMPLEMENTATION_NOT_BOUND');
assert.equal(planned.intent.executionAuthorized, true);
assert.equal(planned.intent.producerRef, LAFEA_MESH_PRODUCER_REF);
assert.equal(planned.intent.elementFamily, governedProfile.fields.continuumElement);
assert.equal(planned.intent.targetElementLength, governedProfile.fields.globalTargetSize);

const produced = produceLafeaAnalysisMeshEvidence(stage, { ...configuration, planned });
assert.equal(produced.output.lifecycleAuthority, false, 'output is never lifecycle authority');
validateLafeaMeshProducerOutputV2(produced.output, {
  capability, qualification, plan: planned.plan, intent: planned.intent,
});
const evidence = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
assert.equal(evidence.schema, 'lafea-analysis-mesh-evidence/v2');
assert.equal(evidence.qualification, 'PASS');
assert.equal(evidence.authority.producerRef, LAFEA_MESH_PRODUCER_REF);
assert.equal(evidence.authority.capabilityHash, capability.capabilityHash);
assert.equal(evidence.authority.qualificationHash, qualification.qualificationHash);
assert.equal(evidence.authority.planHash, planned.plan.planHash);
assert.equal(evidence.releaseQualified, false, 'a mesh never qualifies a release');

const custody = buildLafeaDomainFirstMeshCustodyProjection(stage, evidence);
assert.equal(custody.state, 'CURRENT_PASS');
assert.equal(custody.usableForAdvance, true);
assert.equal(custody.runPolicy, 'ALLOW');
assert.equal(custody.producerRef, LAFEA_MESH_PRODUCER_REF);

// --- LMB-09: v2 producer envelope independently enforces the family ----------
assert.throws(
  () => createLafeaMeshProducerOutputV2({
    schema: 'lafea-mesh-producer-output/v2',
    stageId: planned.plan.stageId,
    intentHash: planned.plan.intentHash,
    planHash: planned.plan.planHash,
    capabilityHash: planned.plan.capabilityHash,
    qualificationHash: planned.plan.qualificationHash,
    producerId: planned.plan.producerId,
    producerRevision: planned.plan.producerRevision,
    sourceHash: planned.plan.sourceHash,
    analysisDomainHash: planned.plan.analysisDomainHash,
    analysisGeometryHash: planned.plan.analysisGeometryHash,
    meshProfileHash: planned.plan.meshProfileHash,
    elementFamily: 'Q8',
    mesh: unstructured.mesh,
  }),
  (error) => error?.code === 'LAFEA_MESH_PRODUCER_OUTPUT_V2_ELEMENT_FAMILY_MISMATCH',
);

// --- LMB-10: v2 evidence is exportable/recoverable without mutation ----------
const recovery = createLafeaWorkbenchMeshGenerationState(['LAFEA.3']);
recovery.bindMeshProfile(evidence.meshProfile, 'LAFEA.3');
const recovered = recovery.recoverEvidence(evidence, 'LAFEA.3');
assert.equal(recovered.changed, true);
assert.deepEqual(recovery.exportEvidence('LAFEA.3'), evidence);
assert.deepEqual(recovery.validateEvidence(recovery.exportEvidence('LAFEA.3')), evidence);
const replayRecovery = recovery.recoverEvidence(evidence, 'LAFEA.3');
assert.equal(replayRecovery.changed, false, 'exact v2 recovery replay must be idempotent');

// --- LMB-11: evidence is tamper-evident -------------------------------------
assert.throws(
  () => validateLafeaAnalysisMeshEvidenceV2({
    ...evidence,
    mesh: { ...evidence.mesh, nodes: evidence.mesh.nodes.slice(1) },
  }),
  (error) => typeof error.code === 'string',
  'a mutated mesh must not validate',
);

// --- LMB-12: a stale parent invalidates retained evidence -------------------
const staleCustody = buildLafeaDomainFirstMeshCustodyProjection({
  ...stage,
  sourceAuthority: { stageId: 'LAFEA.3', sourceHash: `sha256:${'b'.repeat(64)}` },
}, evidence);
assert.equal(staleCustody.state, 'STALE');
assert.equal(staleCustody.usableForAdvance, false);
assert.ok(staleCustody.staleReasons.includes('ANALYSIS_MESH_V2_SOURCE_PARENT_STALE'));

// --- LMB-13: a mesh that fails its quality gates does not clear the gate ----
const blockingConfiguration = lafeaMeshGenerationConfiguration(meshProfileFor('T6', 15));
const blockingProduced = produceLafeaAnalysisMeshEvidence(stage, blockingConfiguration);
assert.equal(blockingProduced.evidence.qualification, 'BLOCK');
const blockedCustody = buildLafeaDomainFirstMeshCustodyProjection(
  stage, blockingProduced.evidence,
);
assert.equal(blockedCustody.state, 'CURRENT_BLOCK');
assert.equal(blockedCustody.usableForAdvance, false);
assert.equal(blockedCustody.advancePolicy, 'DENY');

// --- LMB-14: the discretization view model surfaces generation --------------
const generatedStage = {
  ...stage,
  retainedAnalysisMeshEvidenceV2: evidence,
  retainedAnalysisMeshProfile: configuration.meshProfile,
  analysisMeshProfileHash: configuration.meshProfileHash,
  lastAnalysisMeshPlan: {
    schema: 'lafea-analysis-mesh-plan-summary/v1',
    stageId: 'LAFEA.3',
    elementFamily: planned.plan.elementFamily,
    strategy: planned.generated.strategy,
    strategyReason: planned.generated.strategyReason,
    nodeCount: planned.plan.estimatedNodes,
    elementCount: planned.plan.estimatedElements,
    estimatedDofs: planned.plan.estimatedDofs,
    boundarySegmentCount: planned.generated.boundarySegmentCount,
    characteristicLengthMin: planned.plan.characteristicLengthMin,
    characteristicLengthMedian: planned.plan.characteristicLengthMedian,
    characteristicLengthMax: planned.plan.characteristicLengthMax,
    resourceDisposition: planned.plan.resourceDisposition,
    intentHash: planned.intent.semanticHash,
    planHash: planned.plan.planHash,
    capabilityHash: planned.capabilityHash,
    qualificationHash: planned.qualificationHash,
    producerRef: planned.producerRef,
  },
  analysisMeshCustodyProjection: custody,
};
const viewModel = buildLafeaDiscretizationViewModel(generatedStage);
assert.equal(viewModel.generation.producerQualified, true);
assert.equal(viewModel.generation.available, true);
assert.equal(viewModel.actions.automaticMeshEnabled, true);
assert.equal(viewModel.actions.canGenerateMesh, true);
assert.equal(viewModel.actions.canAdvance, true);
assert.equal(viewModel.preview.producerQualified, true);
assert.equal(viewModel.preview.proposedMesh, 'MAPPED_TRANSFINITE');
assert.equal(viewModel.preview.proposedNodeCount, planned.plan.estimatedNodes);
assert.equal(viewModel.evidence.present, true);
assert.equal(viewModel.evidence.producerRef, LAFEA_MESH_PRODUCER_REF);
const automatic = viewModel.configuration.modes.find((row) => row.mode === 'AUTOMATIC_MESH');
assert.equal(automatic.enabled, true);
assert.equal(automatic.reason, null);
const refinement = viewModel.configuration.modes.find((row) => row.mode === 'MANUAL_REFINEMENT');
assert.equal(refinement.enabled, false,
  'manual refinement is not qualified and must stay disabled');

// --- LMB-15: without a bound profile UI stays in explicit binding state ------
const unboundViewModel = buildLafeaDiscretizationViewModel({
  ...stage,
  analysisMeshCustodyProjection: buildLafeaDomainFirstMeshCustodyProjection(stage, null),
});
assert.equal(unboundViewModel.generation.available, false);
assert.equal(unboundViewModel.generation.meshProfileBound, false);
assert.equal(unboundViewModel.generation.unavailableReason,
  'ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
assert.equal(unboundViewModel.actions.canGenerateMesh, false);

console.log('LAFEA mesh-producer binding check PASS (LMB-01..LMB-15)');
