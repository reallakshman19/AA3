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
import { LAFEA_SHELL_MIDSURFACE_STAGES } from './lafea-shell-midsurface-contract.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceFrameAtUvAny,
  shellMidsurfaceKind,
  shellMidsurfaceParameterGeometry,
  shellMidsurfacePoint3dAny,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import { curvedShellGeometryBounds } from './lafea-shell-curved-midsurface-contract.js';
import { curvedHoleShellGeometryBounds } from './lafea-shell-curved-hole-midsurface-contract.js';
import { periodicCylindricalShellGeometryBounds } from './lafea-shell-periodic-midsurface-contract.js';

export const LAFEA_SHELL_MESH_PLAN_SCHEMA = 'lafea-shell-mesh-plan/v1';
export const LAFEA_SHELL_MESH_OUTPUT_SCHEMA = 'lafea-shell-mesh-output/v1';
export const LAFEA_SHELL_MESH_PRODUCER_SCOPE =
  'PLANAR_SINGLE_PATCH_STRAIGHT_BOUNDARY_WITH_NON_NESTED_HOLES_CST_DKT_TRI3_V2';
export const LAFEA_SHELL_CURVED_MESH_PLAN_SCHEMA = 'lafea-shell-curved-mesh-plan/v1';
export const LAFEA_SHELL_CURVED_MESH_OUTPUT_SCHEMA = 'lafea-shell-curved-mesh-output/v1';
export const LAFEA_SHELL_CURVED_MESH_PRODUCER_SCOPE =
  'CYLINDRICAL_SINGLE_RECTANGULAR_PATCH_CST_DKT_TRI3_V1';
export const LAFEA_SHELL_CURVED_MESH_STRATEGY = 'CYLINDRICAL_SHELL_MIDSURFACE_TRIANGULATION';
export const LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_SCHEMA = 'lafea-shell-curved-hole-mesh-plan/v1';
export const LAFEA_SHELL_CURVED_HOLE_MESH_OUTPUT_SCHEMA = 'lafea-shell-curved-hole-mesh-output/v1';
export const LAFEA_SHELL_CURVED_HOLE_MESH_PRODUCER_SCOPE =
  'CYLINDRICAL_SINGLE_RECTANGULAR_PATCH_WITH_NON_NESTED_HOLES_CST_DKT_TRI3_V1';
export const LAFEA_SHELL_CURVED_HOLE_MESH_STRATEGY = 'CYLINDRICAL_SHELL_HOLE_MIDSURFACE_TRIANGULATION';
export const LAFEA_SHELL_PERIODIC_MESH_PLAN_SCHEMA = 'lafea-shell-periodic-mesh-plan/v1';
export const LAFEA_SHELL_PERIODIC_MESH_OUTPUT_SCHEMA = 'lafea-shell-periodic-mesh-output/v1';
export const LAFEA_SHELL_PERIODIC_MESH_PRODUCER_SCOPE =
  'CYLINDRICAL_FULL_U_PERIODIC_SINGLE_PATCH_CST_DKT_TRI3_V1';
export const LAFEA_SHELL_PERIODIC_MESH_STRATEGY = 'CYLINDRICAL_SHELL_PERIODIC_SEAM_TRIANGULATION';
export const LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES = 15;
export const LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT =
  Math.cos((15 * Math.PI) / 180);
export const LAFEA_SHELL_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';
export const LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT = 2;

/**
 * Deterministic external shell mesher. The local-shell solver remains a pure
 * solver and continues to declare NO_AUTOMATIC_OR_ADAPTIVE_MESHING; this
 * producer executes before canonical shell-model assembly.
 *
 * Planar, cylindrical-hole-free, cylindrical-hole-bearing and full-cylinder
 * periodic parents retain separate plan schemas. That avoids changing the
 * semantic bytes of already-qualified parent/plan contracts when a new scope
 * is added.
 */
export function planLafeaShellAnalysisMesh({ midsurfaceEvidence: evidenceValue, meshProfile: profileValue }) {
  const midsurfaceEvidence = validateLafeaAnyShellMidsurfaceEvidence(evidenceValue);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(profileValue);
  const kind = shellMidsurfaceKind(midsurfaceEvidence);
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC) {
    return planPeriodicShellAnalysisMesh(midsurfaceEvidence, meshProfile);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return planCurvedHoleShellAnalysisMesh(midsurfaceEvidence, meshProfile);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return planCurvedShellAnalysisMesh(midsurfaceEvidence, meshProfile);
  }
  return planPlanarShellAnalysisMesh(midsurfaceEvidence, meshProfile);
}

export function produceLafeaShellAnalysisMesh(input) {
  const midsurfaceEvidence = validateLafeaAnyShellMidsurfaceEvidence(input.midsurfaceEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const plan = input.plan ?? planLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile });
  if (plan.schema === LAFEA_SHELL_PERIODIC_MESH_PLAN_SCHEMA) {
    return producePeriodicShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile);
  }
  if (plan.schema === LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_SCHEMA) {
    return produceCurvedHoleShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile);
  }
  if (plan.schema === LAFEA_SHELL_CURVED_MESH_PLAN_SCHEMA) {
    return produceCurvedShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile);
  }
  return producePlanarShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile);
}

function planPlanarShellAnalysisMesh(midsurfaceEvidence, meshProfile) {
  const stageId = shellStage(midsurfaceEvidence.stageId);
  requireShellProfile(meshProfile);
  requireProducerBinding(stageId);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();

  const ligament = shellHoleLigamentQualification(midsurfaceEvidence.geometry);
  if (ligament && meshProfile.fields.globalTargetSize > ligament.maximumQualifiedTargetElementLength + 1e-12) {
    fail('LAFEA_SHELL_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT');
  }

  const generated2d = generateLafeaAnalysisMesh(
    buildLafeaMeshTopology(shellMidsurfaceParameterGeometry(midsurfaceEvidence)),
    {
      targetElementLength: meshProfile.fields.globalTargetSize,
      curvatureToleranceDegrees: 15,
      elementFamily: 'T3',
    },
  );
  const mesh = mapParameterMeshToShell(generated2d.mesh, midsurfaceEvidence.geometry, stageId);
  const estimatedDofs = estimateLafeaMeshDofs(stageId, mesh.nodes.length);
  const resourceDisposition = resourceDispositionFor(mesh, estimatedDofs);

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
    minimumMaterialLigament: ligament?.minimumMaterialLigament ?? null,
    maximumQualifiedTargetElementLength: ligament?.maximumQualifiedTargetElementLength ?? null,
    minimumElementsAcrossLigament: ligament ? LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT : null,
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

function planCurvedShellAnalysisMesh(midsurfaceEvidence, meshProfile) {
  const stageId = shellStage(midsurfaceEvidence.stageId);
  requireShellProfile(meshProfile);
  requireProducerBinding(stageId);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const geometry = midsurfaceEvidence.geometry;
  const bounds = curvedShellGeometryBounds(geometry);
  const curvatureTargetElementLength = geometry.surface.radius
    * (LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180);
  const effectiveTargetElementLength = Math.min(
    meshProfile.fields.globalTargetSize,
    curvatureTargetElementLength,
  );

  const generated2d = generateLafeaAnalysisMesh(
    buildLafeaMeshTopology(shellMidsurfaceParameterGeometry(midsurfaceEvidence)),
    {
      targetElementLength: effectiveTargetElementLength,
      curvatureToleranceDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
      elementFamily: 'T3',
    },
  );
  const mesh = mapParameterMeshToShell(generated2d.mesh, geometry, stageId);
  const curvedGeometry = curvedFacetQualification(generated2d.mesh, mesh, geometry);
  if (curvedGeometry.minimumFacetDirectorAlignment
      < LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT - 1e-12) {
    fail('LAFEA_SHELL_CURVED_FACET_DIRECTOR_ALIGNMENT_BLOCKED');
  }
  const estimatedDofs = estimateLafeaMeshDofs(stageId, mesh.nodes.length);
  const resourceDisposition = resourceDispositionFor(mesh, estimatedDofs);

  const core = {
    schema: LAFEA_SHELL_CURVED_MESH_PLAN_SCHEMA,
    stageId,
    generationMode: 'AUTOMATIC_MESH',
    strategy: LAFEA_SHELL_CURVED_MESH_STRATEGY,
    scope: LAFEA_SHELL_CURVED_MESH_PRODUCER_SCOPE,
    sourceHash: midsurfaceEvidence.sourceHash,
    analysisDomainHash: midsurfaceEvidence.analysisDomainHash,
    analysisGeometryHash: midsurfaceEvidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: LAFEA_SHELL_ELEMENT,
    requestedTargetElementLength: meshProfile.fields.globalTargetSize,
    effectiveTargetElementLength,
    curvatureTargetElementLength,
    curvatureTargetAngleDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
    radius: geometry.surface.radius,
    angularSpanDegrees: bounds.angularSpanDegrees,
    axialSpan: bounds.axialSpan,
    minimumFacetDirectorAlignment: curvedGeometry.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: curvedGeometry.maximumFacetNormalDeviationDegrees,
    requiredMinimumFacetDirectorAlignment: LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT,
    lengthUnit: geometry.lengthUnit,
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
      schema: 'lafea-shell-curved-mesh-plan-hash-input/v1', plan: core,
    }),
  });
}

function planCurvedHoleShellAnalysisMesh(midsurfaceEvidence, meshProfile) {
  const stageId = shellStage(midsurfaceEvidence.stageId);
  requireShellProfile(meshProfile);
  requireProducerBinding(stageId);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const geometry = midsurfaceEvidence.geometry;
  const bounds = curvedHoleShellGeometryBounds(geometry);
  const curvatureTargetElementLength = geometry.surface.radius
    * (LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180);
  const effectiveTargetElementLength = Math.min(
    meshProfile.fields.globalTargetSize,
    curvatureTargetElementLength,
  );
  const ligament = shellHoleLigamentQualification(geometry);
  if (!ligament) fail('LAFEA_SHELL_CURVED_HOLE_LIGAMENT_REQUIRED');
  if (effectiveTargetElementLength > ligament.maximumQualifiedTargetElementLength + 1e-12) {
    fail('LAFEA_SHELL_CURVED_HOLE_TARGET_TOO_COARSE_FOR_LIGAMENT');
  }

  const generated2d = generateLafeaAnalysisMesh(
    buildLafeaMeshTopology(shellMidsurfaceParameterGeometry(midsurfaceEvidence)),
    {
      targetElementLength: effectiveTargetElementLength,
      curvatureToleranceDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
      elementFamily: 'T3',
    },
  );
  const mesh = mapParameterMeshToShell(generated2d.mesh, geometry, stageId);
  const curvedGeometry = curvedFacetQualification(generated2d.mesh, mesh, geometry);
  if (curvedGeometry.minimumFacetDirectorAlignment
      < LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT - 1e-12) {
    fail('LAFEA_SHELL_CURVED_HOLE_FACET_DIRECTOR_ALIGNMENT_BLOCKED');
  }
  const estimatedDofs = estimateLafeaMeshDofs(stageId, mesh.nodes.length);
  const resourceDisposition = resourceDispositionFor(mesh, estimatedDofs);

  const core = {
    schema: LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_SCHEMA,
    stageId,
    generationMode: 'AUTOMATIC_MESH',
    strategy: LAFEA_SHELL_CURVED_HOLE_MESH_STRATEGY,
    scope: LAFEA_SHELL_CURVED_HOLE_MESH_PRODUCER_SCOPE,
    sourceHash: midsurfaceEvidence.sourceHash,
    analysisDomainHash: midsurfaceEvidence.analysisDomainHash,
    analysisGeometryHash: midsurfaceEvidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: LAFEA_SHELL_ELEMENT,
    requestedTargetElementLength: meshProfile.fields.globalTargetSize,
    effectiveTargetElementLength,
    curvatureTargetElementLength,
    curvatureTargetAngleDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
    minimumMaterialLigament: ligament.minimumMaterialLigament,
    maximumQualifiedTargetElementLength: ligament.maximumQualifiedTargetElementLength,
    minimumElementsAcrossLigament: LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT,
    radius: geometry.surface.radius,
    angularSpanDegrees: bounds.angularSpanDegrees,
    axialSpan: bounds.axialSpan,
    holeCount: geometry.loops.filter((row) => row.role === 'HOLE').length,
    minimumFacetDirectorAlignment: curvedGeometry.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: curvedGeometry.maximumFacetNormalDeviationDegrees,
    requiredMinimumFacetDirectorAlignment: LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT,
    lengthUnit: geometry.lengthUnit,
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
      schema: 'lafea-shell-curved-hole-mesh-plan-hash-input/v1', plan: core,
    }),
  });
}

function planPeriodicShellAnalysisMesh(midsurfaceEvidence, meshProfile) {
  const stageId = shellStage(midsurfaceEvidence.stageId);
  requireShellProfile(meshProfile);
  requireProducerBinding(stageId);
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const geometry = midsurfaceEvidence.geometry;
  const bounds = periodicCylindricalShellGeometryBounds(geometry);
  const curvatureTargetElementLength = geometry.surface.radius
    * (LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES * Math.PI / 180);
  const effectiveTargetElementLength = Math.min(
    meshProfile.fields.globalTargetSize,
    curvatureTargetElementLength,
  );

  const generated2d = generateLafeaAnalysisMesh(
    buildLafeaMeshTopology(shellMidsurfaceParameterGeometry(midsurfaceEvidence)),
    {
      targetElementLength: effectiveTargetElementLength,
      curvatureToleranceDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
      elementFamily: 'T3',
    },
  );
  const periodic = weldPeriodicUSeam(generated2d.mesh, geometry);
  const topology = periodicTopologyQualification(periodic.mesh, geometry);
  const mesh = mapParameterMeshToShell(periodic.mesh, geometry, stageId);
  const curvedGeometry = curvedFacetQualification(periodic.mesh, mesh, geometry);
  if (curvedGeometry.minimumFacetDirectorAlignment
      < LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT - 1e-12) {
    fail('LAFEA_SHELL_PERIODIC_FACET_DIRECTOR_ALIGNMENT_BLOCKED');
  }
  const estimatedDofs = estimateLafeaMeshDofs(stageId, mesh.nodes.length);
  const resourceDisposition = resourceDispositionFor(mesh, estimatedDofs);

  const core = {
    schema: LAFEA_SHELL_PERIODIC_MESH_PLAN_SCHEMA,
    stageId,
    generationMode: 'AUTOMATIC_MESH',
    strategy: LAFEA_SHELL_PERIODIC_MESH_STRATEGY,
    scope: LAFEA_SHELL_PERIODIC_MESH_PRODUCER_SCOPE,
    sourceHash: midsurfaceEvidence.sourceHash,
    analysisDomainHash: midsurfaceEvidence.analysisDomainHash,
    analysisGeometryHash: midsurfaceEvidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: LAFEA_SHELL_ELEMENT,
    requestedTargetElementLength: meshProfile.fields.globalTargetSize,
    effectiveTargetElementLength,
    curvatureTargetElementLength,
    curvatureTargetAngleDegrees: LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
    radius: geometry.surface.radius,
    angularSpanDegrees: bounds.angularSpanDegrees,
    axialSpan: bounds.axialSpan,
    periodicDirection: 'U',
    seamPolicy: 'IDENTIFY_UMIN_UMAX_BY_V_V1',
    seamPairCount: periodic.seamPairCount,
    seamNodeCount: topology.seamNodeCount,
    seamEdgeCount: topology.seamEdgeCount,
    physicalBoundaryLoopCount: topology.physicalBoundaryLoopCount,
    physicalBoundaryEdgeCount: topology.physicalBoundaryEdgeCount,
    eulerCharacteristic: topology.eulerCharacteristic,
    minimumFacetDirectorAlignment: curvedGeometry.minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: curvedGeometry.maximumFacetNormalDeviationDegrees,
    requiredMinimumFacetDirectorAlignment: LAFEA_SHELL_CURVED_MINIMUM_FACET_DIRECTOR_ALIGNMENT,
    lengthUnit: geometry.lengthUnit,
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
      schema: 'lafea-shell-periodic-mesh-plan-hash-input/v1', plan: core,
    }),
  });
}

function producePlanarShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile) {
  requirePlanarPlan(plan, midsurfaceEvidence, meshProfile);
  return produceEvidenceFromPlan(plan, meshProfile, LAFEA_SHELL_MESH_OUTPUT_SCHEMA,
    'lafea-shell-mesh-output-hash-input/v1');
}

function produceCurvedShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile) {
  requireCurvedPlan(plan, midsurfaceEvidence, meshProfile);
  return produceEvidenceFromPlan(plan, meshProfile, LAFEA_SHELL_CURVED_MESH_OUTPUT_SCHEMA,
    'lafea-shell-curved-mesh-output-hash-input/v1');
}

function produceCurvedHoleShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile) {
  requireCurvedHolePlan(plan, midsurfaceEvidence, meshProfile);
  return produceEvidenceFromPlan(plan, meshProfile, LAFEA_SHELL_CURVED_HOLE_MESH_OUTPUT_SCHEMA,
    'lafea-shell-curved-hole-mesh-output-hash-input/v1');
}

function producePeriodicShellAnalysisMesh(plan, midsurfaceEvidence, meshProfile) {
  requirePeriodicPlan(plan, midsurfaceEvidence, meshProfile);
  return produceEvidenceFromPlan(plan, meshProfile, LAFEA_SHELL_PERIODIC_MESH_OUTPUT_SCHEMA,
    'lafea-shell-periodic-mesh-output-hash-input/v1');
}

function produceEvidenceFromPlan(plan, meshProfile, outputSchema, outputHashSchema) {
  if (plan.resourceDisposition === 'BLOCK') fail('LAFEA_SHELL_MESH_RESOURCE_LIMIT_EXCEEDED');
  const meshHash = canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-content-hash-input/v1',
    mesh: plan.mesh,
  });
  const outputCore = {
    schema: outputSchema,
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
  };
  const output = freeze({
    ...outputCore,
    outputHash: canonicalLafeaSha256({ schema: outputHashSchema, output: outputCore }),
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

function mapParameterMeshToShell(mesh2d, shellGeometry, stageId) {
  return freeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `${LAFEA_MESH_PRODUCER_REF}:${stageId}:${shellGeometry.geometryId}:SHELL`,
    nodes: mesh2d.nodes.map((node) => ({
      nodeId: node.nodeId,
      ...shellMidsurfacePoint3dAny(shellGeometry, node.x, node.y),
    })),
    elements: mesh2d.elements.map((element) => ({
      elementId: element.elementId,
      elementType: LAFEA_SHELL_ELEMENT,
      nodeIds: [...element.nodeIds.slice(0, 3)],
    })),
  });
}

function curvedFacetQualification(mesh2d, mesh3d, geometry) {
  const uvById = new Map(mesh2d.nodes.map((node) => [node.nodeId, { u: node.x, v: node.y }]));
  const pointById = new Map(mesh3d.nodes.map((node) => [node.nodeId, node]));
  let minimumFacetDirectorAlignment = 1;
  for (const element of mesh3d.elements) {
    const points = element.nodeIds.map((nodeId) => pointById.get(nodeId));
    const normal = normalizedCross(subtract3(points[1], points[0]), subtract3(points[2], points[0]));
    for (const nodeId of element.nodeIds) {
      const uv = uvById.get(nodeId);
      if (!uv) fail('LAFEA_SHELL_CURVED_FACET_UV_NODE_MISSING');
      const frame = shellMidsurfaceFrameAtUvAny(geometry, uv.u, uv.v);
      minimumFacetDirectorAlignment = Math.min(
        minimumFacetDirectorAlignment,
        dot3(normal, frame.director),
      );
    }
  }
  const clamped = Math.max(-1, Math.min(1, minimumFacetDirectorAlignment));
  return freeze({
    minimumFacetDirectorAlignment,
    maximumFacetNormalDeviationDegrees: Math.acos(clamped) * 180 / Math.PI,
  });
}

function weldPeriodicUSeam(mesh2d, geometry) {
  const bounds = periodicCylindricalShellGeometryBounds(geometry);
  const tolerance = Math.max(1e-9, (bounds.uMax - bounds.uMin) * 1e-10);
  const left = mesh2d.nodes
    .filter((node) => Math.abs(node.x - bounds.uMin) <= tolerance)
    .sort((a, b) => a.y - b.y || a.nodeId.localeCompare(b.nodeId));
  const right = mesh2d.nodes
    .filter((node) => Math.abs(node.x - bounds.uMax) <= tolerance)
    .sort((a, b) => a.y - b.y || a.nodeId.localeCompare(b.nodeId));
  if (left.length < 2 || left.length !== right.length) {
    fail('LAFEA_SHELL_PERIODIC_SEAM_STATION_COUNT_MISMATCH');
  }
  const replacement = new Map();
  for (let index = 0; index < left.length; index += 1) {
    if (Math.abs(left[index].y - right[index].y) > tolerance) {
      fail('LAFEA_SHELL_PERIODIC_SEAM_STATION_MISMATCH');
    }
    replacement.set(right[index].nodeId, left[index].nodeId);
  }
  const nodes = mesh2d.nodes.filter((node) => !replacement.has(node.nodeId));
  const elements = mesh2d.elements.map((element) => {
    const nodeIds = element.nodeIds.map((nodeId) => replacement.get(nodeId) ?? nodeId);
    if (new Set(nodeIds).size !== nodeIds.length) {
      fail('LAFEA_SHELL_PERIODIC_SEAM_WELD_DEGENERATE_ELEMENT');
    }
    return freeze({ ...element, nodeIds: freeze(nodeIds) });
  });
  if (nodes.some((node) => Math.abs(node.x - bounds.uMax) <= tolerance)) {
    fail('LAFEA_SHELL_PERIODIC_DUPLICATE_SEAM_DOF_REMAINS');
  }
  return freeze({
    mesh: freeze({ ...mesh2d, nodes: freeze(nodes), elements: freeze(elements) }),
    seamPairCount: left.length,
  });
}

function periodicTopologyQualification(mesh2d, geometry) {
  const bounds = periodicCylindricalShellGeometryBounds(geometry);
  const tolerance = Math.max(1e-9, (bounds.uMax - bounds.uMin) * 1e-10);
  const nodeById = new Map(mesh2d.nodes.map((node) => [node.nodeId, node]));
  const edges = new Map();
  const elementEdges = new Map();
  for (const element of mesh2d.elements) {
    const nodeIds = element.nodeIds.slice(0, 3);
    if (nodeIds.length !== 3 || new Set(nodeIds).size !== 3) {
      fail('LAFEA_SHELL_PERIODIC_TRI3_TOPOLOGY_INVALID');
    }
    const keys = [];
    for (const pair of [[nodeIds[0], nodeIds[1]], [nodeIds[1], nodeIds[2]], [nodeIds[2], nodeIds[0]]]) {
      const key = edgeKey(pair[0], pair[1]);
      const row = edges.get(key) ?? { key, a: pair[0], b: pair[1], incidence: 0, elementIds: [] };
      row.incidence += 1;
      row.elementIds.push(element.elementId);
      edges.set(key, row);
      keys.push(key);
    }
    elementEdges.set(element.elementId, keys);
  }
  if ([...edges.values()].some((edge) => edge.incidence > 2)) {
    fail('LAFEA_SHELL_PERIODIC_NON_MANIFOLD_EDGE');
  }
  const boundary = [...edges.values()].filter((edge) => edge.incidence === 1);
  const lower = [];
  const upper = [];
  for (const edge of boundary) {
    const a = nodeById.get(edge.a);
    const b = nodeById.get(edge.b);
    if (Math.abs(a.y - bounds.vMin) <= tolerance && Math.abs(b.y - bounds.vMin) <= tolerance) {
      lower.push(edge);
    } else if (Math.abs(a.y - bounds.vMax) <= tolerance && Math.abs(b.y - bounds.vMax) <= tolerance) {
      upper.push(edge);
    } else {
      fail('LAFEA_SHELL_PERIODIC_SEAM_REMAINS_PHYSICAL_BOUNDARY');
    }
  }
  if (!closedEdgeLoop(lower) || !closedEdgeLoop(upper)) {
    fail('LAFEA_SHELL_PERIODIC_AXIAL_RIM_NOT_CLOSED');
  }

  const seamNodes = mesh2d.nodes
    .filter((node) => Math.abs(node.x - bounds.uMin) <= tolerance)
    .sort((a, b) => a.y - b.y || a.nodeId.localeCompare(b.nodeId));
  if (seamNodes.length < 2) fail('LAFEA_SHELL_PERIODIC_SEAM_NODE_CHAIN_MISSING');
  let seamEdgeCount = 0;
  for (let index = 0; index < seamNodes.length - 1; index += 1) {
    const edge = edges.get(edgeKey(seamNodes[index].nodeId, seamNodes[index + 1].nodeId));
    if (!edge || edge.incidence !== 2) fail('LAFEA_SHELL_PERIODIC_SEAM_EDGE_NOT_INTERIOR');
    seamEdgeCount += 1;
  }

  const eulerCharacteristic = mesh2d.nodes.length - edges.size + mesh2d.elements.length;
  if (eulerCharacteristic !== 0) fail('LAFEA_SHELL_PERIODIC_EULER_CHARACTERISTIC_INVALID');
  if (!elementsConnected(mesh2d.elements, edges, elementEdges)) {
    fail('LAFEA_SHELL_PERIODIC_ELEMENT_COMPONENT_DISCONNECTED');
  }
  return freeze({
    seamNodeCount: seamNodes.length,
    seamEdgeCount,
    physicalBoundaryLoopCount: 2,
    physicalBoundaryEdgeCount: boundary.length,
    eulerCharacteristic,
  });
}

function closedEdgeLoop(edgeRows) {
  if (edgeRows.length < 3) return false;
  const adjacency = new Map();
  for (const edge of edgeRows) {
    adjacency.set(edge.a, [...(adjacency.get(edge.a) ?? []), edge.b]);
    adjacency.set(edge.b, [...(adjacency.get(edge.b) ?? []), edge.a]);
  }
  if ([...adjacency.values()].some((rows) => rows.length !== 2)) return false;
  const first = adjacency.keys().next().value;
  const seen = new Set([first]);
  const stack = [first];
  while (stack.length) {
    const current = stack.pop();
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
  }
  return seen.size === adjacency.size && edgeRows.length === adjacency.size;
}

function elementsConnected(elements, edges, elementEdges) {
  if (!elements.length) return false;
  const adjacency = new Map(elements.map((element) => [element.elementId, new Set()]));
  for (const edge of edges.values()) {
    if (edge.elementIds.length === 2) {
      adjacency.get(edge.elementIds[0]).add(edge.elementIds[1]);
      adjacency.get(edge.elementIds[1]).add(edge.elementIds[0]);
    }
  }
  const first = elements[0].elementId;
  const seen = new Set([first]);
  const stack = [first];
  while (stack.length) {
    const current = stack.pop();
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
  }
  void elementEdges;
  return seen.size === elements.length;
}

function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function shellHoleLigamentQualification(geometry) {
  const holeLoops = geometry.loops.filter((loop) => loop.role === 'HOLE');
  if (!holeLoops.length) return null;
  const outer = geometry.loops.find((loop) => loop.role === 'OUTER');
  const vertexById = new Map(geometry.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const segmentById = new Map(geometry.segments.map((segment) => [segment.segmentId, segment]));
  const loopRows = [outer, ...holeLoops].map((loop) => ({
    loopId: loop.loopId,
    role: loop.role,
    segments: loop.segmentIds.map((segmentId) => segmentById.get(segmentId)),
  }));
  let minimumMaterialLigament = Infinity;
  for (let leftIndex = 0; leftIndex < loopRows.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < loopRows.length; rightIndex += 1) {
      for (const left of loopRows[leftIndex].segments) {
        for (const right of loopRows[rightIndex].segments) {
          minimumMaterialLigament = Math.min(
            minimumMaterialLigament,
            segmentDistance(left, right, vertexById),
          );
        }
      }
    }
  }
  if (!(minimumMaterialLigament > 0) || !Number.isFinite(minimumMaterialLigament)) {
    fail('LAFEA_SHELL_HOLE_MATERIAL_LIGAMENT_INVALID');
  }
  return freeze({
    minimumMaterialLigament,
    maximumQualifiedTargetElementLength:
      minimumMaterialLigament / LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT,
  });
}

function segmentDistance(left, right, vertexById) {
  const a = vertexById.get(left.startVertexId);
  const b = vertexById.get(left.endVertexId);
  const c = vertexById.get(right.startVertexId);
  const d = vertexById.get(right.endVertexId);
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b),
  );
}
function pointSegmentDistance(point, start, end) {
  const dx = end.u - start.u;
  const dy = end.v - start.v;
  const lengthSquared = dx * dx + dy * dy;
  if (!(lengthSquared > 0)) return Math.hypot(point.u - start.u, point.v - start.v);
  const t = Math.max(0, Math.min(1,
    ((point.u - start.u) * dx + (point.v - start.v) * dy) / lengthSquared));
  return Math.hypot(point.u - (start.u + t * dx), point.v - (start.v + t * dy));
}

function requireShellProfile(profile) {
  if (profile.fields.shellElement !== LAFEA_SHELL_ELEMENT) {
    fail('LAFEA_SHELL_MESH_PROFILE_ELEMENT_FAMILY_INVALID');
  }
  if (!(profile.fields.globalTargetSize > 0)) fail('LAFEA_SHELL_MESH_PROFILE_TARGET_INVALID');
}
function requireProducerBinding(stageId) {
  if (!lafeaMeshProducerBound(stageId, LAFEA_SHELL_ELEMENT)) {
    fail('LAFEA_SHELL_MESH_PRODUCER_NOT_BOUND');
  }
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  requireScope(capability.scopes, stageId);
  requireScope(qualification.authorizedScopes, stageId);
}
function requireScope(scopes, stageId) {
  if (!scopes.some((row) => row.stageId === stageId
    && row.elementFamilies.includes(LAFEA_SHELL_ELEMENT))) {
    fail('LAFEA_SHELL_MESH_QUALIFICATION_SCOPE_MISSING');
  }
}
function requirePlanarPlan(plan, evidence, profile) {
  if (!plan || plan.schema !== LAFEA_SHELL_MESH_PLAN_SCHEMA
    || plan.stageId !== evidence.stageId
    || plan.sourceHash !== evidence.sourceHash
    || plan.analysisDomainHash !== evidence.analysisDomainHash
    || plan.analysisGeometryHash !== evidence.analysisGeometryHash
    || plan.meshProfileHash !== profile.semanticHash
    || plan.elementFamily !== LAFEA_SHELL_ELEMENT
    || plan.midsurfaceEvidenceHash !== evidence.semanticHash) {
    fail('LAFEA_SHELL_MESH_PLAN_PARENT_MISMATCH');
  }
  requirePlanHashAndMesh(plan, 'lafea-shell-mesh-plan-hash-input/v1');
}
function requireCurvedPlan(plan, evidence, profile) {
  if (!plan || plan.schema !== LAFEA_SHELL_CURVED_MESH_PLAN_SCHEMA
    || plan.stageId !== evidence.stageId
    || plan.sourceHash !== evidence.sourceHash
    || plan.analysisDomainHash !== evidence.analysisDomainHash
    || plan.analysisGeometryHash !== evidence.analysisGeometryHash
    || plan.meshProfileHash !== profile.semanticHash
    || plan.elementFamily !== LAFEA_SHELL_ELEMENT
    || plan.midsurfaceEvidenceHash !== evidence.semanticHash
    || plan.strategy !== LAFEA_SHELL_CURVED_MESH_STRATEGY
    || plan.minimumFacetDirectorAlignment < plan.requiredMinimumFacetDirectorAlignment - 1e-12) {
    fail('LAFEA_SHELL_CURVED_MESH_PLAN_PARENT_OR_GEOMETRY_MISMATCH');
  }
  requirePlanHashAndMesh(plan, 'lafea-shell-curved-mesh-plan-hash-input/v1');
}
function requireCurvedHolePlan(plan, evidence, profile) {
  if (!plan || plan.schema !== LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_SCHEMA
    || plan.stageId !== evidence.stageId
    || plan.sourceHash !== evidence.sourceHash
    || plan.analysisDomainHash !== evidence.analysisDomainHash
    || plan.analysisGeometryHash !== evidence.analysisGeometryHash
    || plan.meshProfileHash !== profile.semanticHash
    || plan.elementFamily !== LAFEA_SHELL_ELEMENT
    || plan.midsurfaceEvidenceHash !== evidence.semanticHash
    || plan.strategy !== LAFEA_SHELL_CURVED_HOLE_MESH_STRATEGY
    || !(plan.holeCount > 0)
    || plan.effectiveTargetElementLength > plan.maximumQualifiedTargetElementLength + 1e-12
    || plan.minimumElementsAcrossLigament !== LAFEA_SHELL_HOLE_MINIMUM_ELEMENTS_ACROSS_LIGAMENT
    || plan.minimumFacetDirectorAlignment < plan.requiredMinimumFacetDirectorAlignment - 1e-12) {
    fail('LAFEA_SHELL_CURVED_HOLE_MESH_PLAN_PARENT_OR_GEOMETRY_MISMATCH');
  }
  requirePlanHashAndMesh(plan, 'lafea-shell-curved-hole-mesh-plan-hash-input/v1');
}
function requirePeriodicPlan(plan, evidence, profile) {
  if (!plan || plan.schema !== LAFEA_SHELL_PERIODIC_MESH_PLAN_SCHEMA
    || plan.stageId !== evidence.stageId
    || plan.sourceHash !== evidence.sourceHash
    || plan.analysisDomainHash !== evidence.analysisDomainHash
    || plan.analysisGeometryHash !== evidence.analysisGeometryHash
    || plan.meshProfileHash !== profile.semanticHash
    || plan.elementFamily !== LAFEA_SHELL_ELEMENT
    || plan.midsurfaceEvidenceHash !== evidence.semanticHash
    || plan.strategy !== LAFEA_SHELL_PERIODIC_MESH_STRATEGY
    || plan.periodicDirection !== 'U'
    || plan.eulerCharacteristic !== 0
    || plan.physicalBoundaryLoopCount !== 2
    || plan.seamPairCount !== plan.seamNodeCount
    || plan.seamEdgeCount !== plan.seamNodeCount - 1
    || plan.minimumFacetDirectorAlignment < plan.requiredMinimumFacetDirectorAlignment - 1e-12) {
    fail('LAFEA_SHELL_PERIODIC_MESH_PLAN_PARENT_OR_TOPOLOGY_MISMATCH');
  }
  requirePlanHashAndMesh(plan, 'lafea-shell-periodic-mesh-plan-hash-input/v1');
}
function requirePlanHashAndMesh(plan, hashSchema) {
  const { mesh, planHash, ...core } = plan;
  if (planHash !== canonicalLafeaSha256({ schema: hashSchema, plan: core })) {
    fail('LAFEA_SHELL_MESH_PLAN_HASH_INVALID');
  }
  if (!mesh || mesh.elements.some((row) => row.elementType !== LAFEA_SHELL_ELEMENT)) {
    fail('LAFEA_SHELL_MESH_PLAN_MESH_INVALID');
  }
}
function resourceDispositionFor(mesh, estimatedDofs) {
  return mesh.nodes.length > LAFEA_MESH_PRODUCER_MAXIMUM_NODES
    || mesh.elements.length > LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS
    || estimatedDofs > LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS
    ? 'BLOCK' : 'WITHIN_LIMITS';
}
function shellStage(value) {
  if (!LAFEA_SHELL_MIDSURFACE_STAGES.includes(value)) fail('LAFEA_SHELL_MESH_STAGE_INVALID');
  return value;
}
function subtract3(left, right) {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}
function cross3(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
function normalizedCross(left, right) {
  const value = cross3(left, right);
  const length = Math.hypot(value.x, value.y, value.z);
  if (!(length > 0)) fail('LAFEA_SHELL_CURVED_DEGENERATE_FACET');
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}
function dot3(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}