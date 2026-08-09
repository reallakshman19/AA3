import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import { buildLafeaMeshTopology } from './lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from './lafea-mesh-producer-engine.js';
import {
  LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
  LAFEA_MESH_PRODUCER_REF,
  lafeaMeshProducerBound,
} from './lafea-mesh-producer-registry.js';
import {
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
} from './lafea-mesh-producer-binding.js';
import {
  LAFEA_SHELL_MIDSURFACE_STAGES,
  shellMidsurfacePoint3d,
  validateLafeaShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-contract.js';

export const LAFEA_SHELL_MESH_PLAN_SCHEMA = 'lafea-shell-mesh-plan/v1';
export const LAFEA_SHELL_MESH_OUTPUT_SCHEMA = 'lafea-shell-mesh-output/v1';
export const LAFEA_SHELL_MESH_PRODUCER_SCOPE =
  'PLANAR_SINGLE_PATCH_STRAIGHT_BOUNDARY_WITH_NON_NESTED_HOLES_CST_DKT_TRI3_V2';
export const LAFEA_SHELL_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';

/**
 * Deterministic external shell mesher. The local-shell solver remains a pure
 * solver and continues to declare NO_AUTOMATIC_OR_ADAPTIVE_MESHING; this
 * producer executes before canonical shell-model assembly.
 */
export function planLafeaShellAnalysisMesh({ midsurfaceEvidence: evidenceValue, meshProfile: profileValue }) {
  const midsurfaceEvidence = validateLafeaShellMidsurfaceEvidence(evidenceValue);
  const stageId = shellStage(midsurfaceEvidence.stageId);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(profileValue);
  requireShellProfile(meshProfile);
  if (!lafeaMeshProducerBound(stageId, LAFEA_SHELL_ELEMENT)) {
    fail('LAFEA_SHELL_MESH_PRODUCER_NOT_BOUND');
  }
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  requireScope(capability.scopes, stageId);
  requireScope(qualification.authorizedScopes, stageId);

  const triangleQualityRefinementFloor = meshProfile.fields.scaledJacobianBlock;
  const generated2d = generateLafeaAnalysisMesh(
    buildLafeaMeshTopology(toPlanarAnalysisGeometry(midsurfaceEvidence.geometry)),
    {
      targetElementLength: meshProfile.fields.globalTargetSize,
      curvatureToleranceDegrees: 15,
      elementFamily: 'T3',
      minimumTriangleScaledJacobian: triangleQualityRefinementFloor,
    },
  );
  const mesh = mapPlanarMeshToShell(generated2d.mesh, midsurfaceEvidence.geometry, stageId);
  const estimatedDofs = estimateLafeaMeshDofs(stageId, mesh.nodes.length);
  const resourceDisposition = mesh.nodes.length > LAFEA_MESH_PRODUCER_MAXIMUM_NODES
    || mesh.elements.length > LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS
    || estimatedDofs > LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS
    ? 'BLOCK' : 'WITHIN_LIMITS';

  const core = {
    schema: LAFEA_SHELL_MESH_PLAN_SCHEMA,
    stageId,
    generationMode: 'AUTOMATIC_MESH',
    scope: LAFEA_SHELL_MESH_PRODUCER_SCOPE,
    sourceHash: midsurfaceEvidence.sourceHash,
    analysisDomainHash: midsurfaceEvidence.analysisDomainHash,
    analysisGeometryHash: midsurfaceEvidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: LAFEA_SHELL_ELEMENT,
    targetElementLength: meshProfile.fields.globalTargetSize,
    triangleQualityRefinementFloor,
    lengthUnit: midsurfaceEvidence.geometry.lengthUnit,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs,
    characteristicLengthMin: generated2d.characteristicLengthMin,
    characteristicLengthMedian: generated2d.characteristicLengthMedian,
    characteristicLengthMax: generated2d.characteristicLengthMax,
    resourceDisposition,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerRef: LAFEA_MESH_PRODUCER_REF,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    repeatabilityPolicy: capability.repeatabilityPolicy,
    midsurfaceEvidenceHash: midsurfaceEvidence.semanticHash,
  };
  return freeze({
    ...core,
    mesh,
    planHash: canonicalLafeaSha256({
      schema: 'lafea-shell-mesh-plan-hash-input/v1', plan: core,
    }),
  });
}

export function produceLafeaShellAnalysisMesh(input) {
  const midsurfaceEvidence = validateLafeaShellMidsurfaceEvidence(input.midsurfaceEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const plan = input.plan ?? planLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile });
  requirePlan(plan, midsurfaceEvidence, meshProfile);
  if (plan.resourceDisposition === 'BLOCK') fail('LAFEA_SHELL_MESH_RESOURCE_LIMIT_EXCEEDED');

  const meshHash = canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-content-hash-input/v1',
    mesh: plan.mesh,
  });
  const outputCore = {
    schema: LAFEA_SHELL_MESH_OUTPUT_SCHEMA,
    stageId: plan.stageId,
    planHash: plan.planHash,
    capabilityHash: plan.capabilityHash,
    qualificationHash: plan.qualificationHash,
    producerId: plan.producerId,
    producerRevision: plan.producerRevision,
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfileHash: plan.meshProfileHash,
    elementFamily: LAFEA_SHELL_ELEMENT,
    meshHash,
    mesh: plan.mesh,
    lifecycleAuthority: false,
  };
  const output = freeze({
    ...outputCore,
    outputHash: canonicalLafeaSha256({
      schema: 'lafea-shell-mesh-output-hash-input/v1', output: outputCore,
    }),
  });

  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: plan.stageId,
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfile,
    mesh: plan.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: plan.stageId,
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: plan.producerRef,
      sourceHash: plan.sourceHash,
      analysisDomainHash: plan.analysisDomainHash,
      analysisGeometryHash: plan.analysisGeometryHash,
      meshProfileHash: plan.meshProfileHash,
      meshHash,
      capabilityHash: plan.capabilityHash,
      qualificationHash: plan.qualificationHash,
      planHash: plan.planHash,
    },
  });
  if (evidence.qualification !== 'PASS') fail('LAFEA_SHELL_MESH_QUALITY_BLOCKED');
  return freeze({ plan, output, evidence });
}

function toPlanarAnalysisGeometry(shellGeometry) {
  const vertices = shellGeometry.vertices.map((row) => ({
    vertexId: row.vertexId, x: row.u, y: row.v,
  }));
  const segments = shellGeometry.segments.map((row) => ({
    segmentId: row.segmentId,
    type: 'LINE',
    startVertexId: row.startVertexId,
    endVertexId: row.endVertexId,
  }));
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: `${shellGeometry.geometryId}:PARAMETRIC`,
    coordinateSystemId: 'SHELL_MIDSURFACE_UV',
    lengthUnit: shellGeometry.lengthUnit,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices,
    segments,
    loops: shellGeometry.loops.map((row) => ({
      loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds],
    })),
  });
}

function mapPlanarMeshToShell(mesh2d, shellGeometry, stageId) {
  return freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `${LAFEA_MESH_PRODUCER_REF}:${stageId}:${shellGeometry.geometryId}:SHELL`,
    nodes: mesh2d.nodes.map((node) => ({
      nodeId: node.nodeId,
      ...shellMidsurfacePoint3d(shellGeometry, node.x, node.y),
    })),
    elements: mesh2d.elements.map((element) => ({
      elementId: element.elementId,
      elementType: LAFEA_SHELL_ELEMENT,
      nodeIds: [...element.nodeIds.slice(0, 3)],
    })),
  });
}

function requireShellProfile(profile) {
  if (profile.fields.shellElement !== LAFEA_SHELL_ELEMENT) {
    fail('LAFEA_SHELL_MESH_PROFILE_ELEMENT_FAMILY_INVALID');
  }
  if (!(profile.fields.globalTargetSize > 0)) fail('LAFEA_SHELL_MESH_PROFILE_TARGET_INVALID');
}
function requireScope(scopes, stageId) {
  if (!scopes.some((row) => row.stageId === stageId
    && row.elementFamilies.includes(LAFEA_SHELL_ELEMENT))) {
    fail('LAFEA_SHELL_MESH_QUALIFICATION_SCOPE_MISSING');
  }
}
function requirePlan(plan, evidence, profile) {
  if (!plan || plan.schema !== LAFEA_SHELL_MESH_PLAN_SCHEMA
    || plan.stageId !== evidence.stageId
    || plan.sourceHash !== evidence.sourceHash
    || plan.analysisDomainHash !== evidence.analysisDomainHash
    || plan.analysisGeometryHash !== evidence.analysisGeometryHash
    || plan.meshProfileHash !== profile.semanticHash
    || plan.elementFamily !== LAFEA_SHELL_ELEMENT
    || plan.triangleQualityRefinementFloor !== profile.fields.scaledJacobianBlock
    || plan.midsurfaceEvidenceHash !== evidence.semanticHash) {
    fail('LAFEA_SHELL_MESH_PLAN_PARENT_MISMATCH');
  }
  const { mesh, planHash, ...core } = plan;
  if (planHash !== canonicalLafeaSha256({
    schema: 'lafea-shell-mesh-plan-hash-input/v1', plan: core,
  })) fail('LAFEA_SHELL_MESH_PLAN_HASH_INVALID');
  if (!mesh || mesh.elements.some((row) => row.elementType !== LAFEA_SHELL_ELEMENT)) {
    fail('LAFEA_SHELL_MESH_PLAN_MESH_INVALID');
  }
}
function shellStage(value) {
  if (!LAFEA_SHELL_MIDSURFACE_STAGES.includes(value)) fail('LAFEA_SHELL_MESH_STAGE_INVALID');
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }