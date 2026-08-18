/**
 * Governed LAFEA.4/.5 retained-shell-mesh -> solver-model compiler.
 *
 * This compiler is intentionally bounded. It only transfers mechanics that can
 * be proved from current source authority without inventing geometric sets.
 *
 * LAFEA.4 authority:
 *  - one material and one uniform thickness over the source shell;
 *  - nodal director/tangent bases reconstructed from the retained midsurface;
 *  - global translations only when one identical value covers every source node;
 *  - local R1/R2 prescriptions only when the whole-surface value is exactly zero;
 *  - no nodal-force remapping;
 *  - pressure only when one identical pressure/sense covers every source element.
 *
 * LAFEA.5 authority:
 *  - no remeshing and no mechanics interpolation;
 *  - retained mesh must exactly equal the caller-authored shellTemplate mesh;
 *  - trunnion workflow remains load-distribution and shell-solve authority.
 */
import {
  createCanonicalLocalShellModel,
  validateCanonicalLocalShellModel,
} from '../core/local-shell/index.js';
import {
  canonicalShellTemplateSemanticHash,
  createCanonicalTrunnionFootprintModel,
  createCanonicalTrunnionFootprintSource,
  validateCanonicalTrunnionFootprintModel,
} from '../core/local-trunnion-footprint/index.js';
import {
  lafeaAnalysisMeshContentHash,
} from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceFrameAtPoint3dAny,
  shellMidsurfaceKind,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import { sourceAuthorityDocument } from './lafea-source-authority.js';
import {
  createLafea4ShellSolverCompanionCustody,
} from './lafea4-shell-solver-companion-custody.js';

export const LAFEA_SHELL_SOLVER_MODEL_SCHEMA = 'lafea-shell-solver-model/v1';
export const LAFEA_SHELL_SOLVER_COMPILER_ID = 'LAFEA.4-5/RETAINED_SHELL_MESH_SOLVER_COMPILER';
export const LAFEA_SHELL_SOLVER_COMPILER_REVISION = '1.1.0';
export const LAFEA_SHELL_SOLVER_MODEL_BINDING_SCHEMA = 'lafea-shell-solver-model-binding/v1';

const SHELL_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'R1', 'R2']);
const LOCAL_ROTATION_DOFS = new Set(['R1', 'R2']);
const STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);

export function compileLafeaShellSolverModel(options) {
  const stageId = requireStage(options?.stageId);
  const source = sourceAuthorityDocument(requireRecord(
    options?.source, 'LAFEA_SHELL_SOLVER_SOURCE_REQUIRED',
  ));
  const sourceHash = requireHash(
    options?.sourceHash, 'LAFEA_SHELL_SOLVER_SOURCE_HASH_REQUIRED',
  );
  const expectedSourceHash = canonicalLafeaSha256({
    schema: 'lafea-source-authority-payload/v1',
    stageId,
    source,
  });
  if (sourceHash !== expectedSourceHash) fail('LAFEA_SHELL_SOLVER_SOURCE_AUTHORITY_MISMATCH');

  const parent = validateLafeaAnyShellMidsurfaceEvidence(options?.midsurfaceEvidence);
  const meshEvidence = validateLafeaAnalysisMeshEvidenceV2(options?.meshEvidence);
  requireParentChain(stageId, sourceHash, parent, meshEvidence);
  const parentNormalCustody = createLafea4ShellSolverCompanionCustody({
    stageId,
    meshEvidence,
    midsurfaceEvidence: parent,
  });

  const compiled = stageId === 'LAFEA.4'
    ? compileLafea4(source, parent, meshEvidence)
    : compileLafea5(source, parent, meshEvidence);

  const parents = freeze({
    sourceHash,
    analysisDomainHash: parent.analysisDomainHash,
    analysisGeometryHash: parent.analysisGeometryHash,
    midsurfaceEvidenceHash: parent.semanticHash,
    meshArtifactHash: meshEvidence.artifactHash,
    meshHash: meshEvidence.meshHash,
    meshProfileHash: meshEvidence.meshProfileHash,
    parentNormalCompanionHash: parentNormalCustody.parentNormalCompanionHash,
  });
  const base = freeze({
    schema: LAFEA_SHELL_SOLVER_MODEL_SCHEMA,
    stageId,
    compilerId: LAFEA_SHELL_SOLVER_COMPILER_ID,
    compilerRevision: LAFEA_SHELL_SOLVER_COMPILER_REVISION,
    status: 'COMPILED',
    mappingMode: compiled.mappingMode,
    parents,
    parentNormalCustody,
    canonicalInputHash: compiled.canonicalInputHash,
    kernelModelHash: compiled.kernelModelHash,
    transferEvidence: compiled.transferEvidence,
    executionAuthorized: true,
    releaseQualified: false,
  });
  const solverModelHash = canonicalLafeaSha256({
    schema: 'lafea-shell-solver-model-hash-input/v1',
    model: base,
  });
  const solverModelBindingHash = canonicalLafeaSha256({
    schema: LAFEA_SHELL_SOLVER_MODEL_BINDING_SCHEMA,
    stageId,
    sourceHash,
    meshHash: meshEvidence.meshHash,
    parentNormalCompanionHash: parentNormalCustody.parentNormalCompanionHash,
    parentNormalAuthorizationEffect: parentNormalCustody.authorizationEffect,
    solverModelHash,
    kernelModelHash: compiled.kernelModelHash,
    mappingMode: compiled.mappingMode,
  });
  return freeze({
    ...base,
    solverModelHash,
    solverModelBindingHash,
    canonicalInput: compiled.canonicalInput,
    canonicalShellModel: compiled.canonicalShellModel ?? null,
    canonicalWorkflowModel: compiled.canonicalWorkflowModel ?? null,
  });
}

export function projectLafeaShellSolverModelBinding(stageValue) {
  const stage = requireRecord(stageValue, 'LAFEA_SHELL_SOLVER_STAGE_REQUIRED');
  if (stage.shellMidsurfaceProfileActive !== true) {
    return freeze({
      schema: LAFEA_SHELL_SOLVER_MODEL_BINDING_SCHEMA,
      stageId: stage.stageId ?? null,
      state: 'NOT_APPLICABLE',
      usableForRun: true,
      reasons: [],
      meshHash: null,
      parentNormalCompanionHash: null,
      parentNormalAuthorizationEffect: 'NOT_APPLICABLE',
      parentNormalCandidateQualification: null,
      solverModelHash: null,
      solverModelBindingHash: null,
      mappingMode: null,
    });
  }
  if (!stage.document || !stage.retainedShellMidsurfaceEvidence
    || !stage.retainedAnalysisMeshEvidenceV2) {
    return bindingResult(stage.stageId, 'ABSENT', false, [
      !stage.document ? 'SHELL_SOLVER_SOURCE_ABSENT' : null,
      !stage.retainedShellMidsurfaceEvidence ? 'SHELL_SOLVER_MIDSURFACE_PARENT_ABSENT' : null,
      !stage.retainedAnalysisMeshEvidenceV2 ? 'SHELL_SOLVER_RETAINED_MESH_ABSENT' : null,
    ]);
  }
  const sourceHash = stage.sourceAuthority?.sourceHash
    ?? stage.lifecycle?.source?.sourceHash
    ?? null;
  if (!sourceHash) {
    return bindingResult(stage.stageId, 'ABSENT', false, [
      'SHELL_SOLVER_SOURCE_AUTHORITY_ABSENT',
    ]);
  }
  try {
    const compiled = compileLafeaShellSolverModel({
      stageId: stage.stageId,
      sourceHash,
      source: stage.document,
      midsurfaceEvidence: stage.retainedShellMidsurfaceEvidence,
      meshEvidence: stage.retainedAnalysisMeshEvidenceV2,
    });
    return freeze({
      schema: LAFEA_SHELL_SOLVER_MODEL_BINDING_SCHEMA,
      stageId: stage.stageId,
      state: 'CURRENT_PASS',
      usableForRun: true,
      reasons: [],
      meshHash: compiled.parents.meshHash,
      parentNormalCompanionHash: compiled.parents.parentNormalCompanionHash,
      parentNormalAuthorizationEffect: compiled.parentNormalCustody.authorizationEffect,
      parentNormalCandidateQualification:
        compiled.parentNormalCustody.companionCandidateQualification,
      solverModelHash: compiled.solverModelHash,
      solverModelBindingHash: compiled.solverModelBindingHash,
      kernelModelHash: compiled.kernelModelHash,
      mappingMode: compiled.mappingMode,
      compilerId: compiled.compilerId,
      compilerRevision: compiled.compilerRevision,
    });
  } catch (error) {
    return bindingResult(stage.stageId, 'BLOCKED', false, [
      typeof error?.code === 'string'
        ? error.code
        : 'LAFEA_SHELL_SOLVER_MODEL_COMPILATION_REJECTED',
    ], stage.retainedAnalysisMeshEvidenceV2?.meshHash ?? null);
  }
}

function compileLafea4(source, parent, meshEvidence) {
  if (parent.stageId !== 'LAFEA.4') fail('LAFEA4_SHELL_SOLVER_PARENT_STAGE_MISMATCH');
  const kind = shellMidsurfaceKind(parent.geometry);
  if (kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH) {
    fail('LAFEA4_SHELL_SOLVER_PARAMETRIC_MIDSURFACE_REQUIRED');
  }
  const canonical = validateCanonicalLocalShellModel(createCanonicalLocalShellModel(source));
  const section = requireUniformSection(canonical);
  const nodes = meshEvidence.mesh.nodes.map((row) =>
    compileLafea4Node(row, parent, meshEvidence.meshHash));
  const elements = meshEvidence.mesh.elements.map((row) => {
    if (row.elementType !== SHELL_ELEMENT) {
      fail('LAFEA4_SHELL_SOLVER_ELEMENT_FAMILY_INVALID');
    }
    return {
      elementId: row.elementId,
      nodeIds: [...row.nodeIds],
      materialId: section.materialId,
      thickness: section.thickness,
      sourceReference: `LAFEA4-COMPILED-MESH:${meshEvidence.meshHash}:${row.elementId}`,
    };
  });
  const constraints = compileWholeSurfaceConstraints(
    canonical, meshEvidence.mesh.nodes, meshEvidence.meshHash,
  );
  const loadCases = compileLafea4LoadCases(
    canonical, meshEvidence.mesh.elements, meshEvidence.meshHash,
  );
  const compiledSource = {
    schema: canonical.schema,
    modelIdentity: canonical.modelIdentity,
    modelVersion: canonical.modelVersion,
    sourceAncestry: [...new Set([
      ...canonical.sourceAncestry,
      `${LAFEA_SHELL_SOLVER_COMPILER_ID}@${LAFEA_SHELL_SOLVER_COMPILER_REVISION}`,
      `retained-mesh:${meshEvidence.meshHash}`,
    ])],
    units: canonical.units,
    formulation: canonical.formulation,
    materials: canonical.materials,
    nodes,
    elements,
    constraints,
    loadCases,
    resultRequests: canonical.resultRequests,
    qualificationProfile: canonical.qualificationProfile,
    limitations: [...new Set([
      ...canonical.limitations,
      'RETAINED_SHELL_MESH_UNIFORM_REGION_COMPILER_V1',
      'NO_GENERAL_NODAL_LOAD_TRANSFER',
      'NO_PARTIAL_BOUNDARY_CONSTRAINT_TRANSFER',
      'NO_NONZERO_LOCAL_ROTATION_CONSTRAINT_TRANSFER',
      'NO_PARTIAL_SURFACE_PRESSURE_TRANSFER',
    ])].sort(),
  };
  const canonicalShellModel = validateCanonicalLocalShellModel(
    createCanonicalLocalShellModel(compiledSource),
  );
  const meshBinding = proveKernelMeshBinding(meshEvidence.mesh, canonicalShellModel);
  const canonicalInputHash = canonicalLafeaSha256({
    schema: 'lafea4-shell-compiler-source-input-hash/v1',
    canonicalInput: canonical,
  });
  return {
    mappingMode: 'PARAMETRIC_MIDSURFACE_UNIFORM_REGION_TRANSFER_V1',
    canonicalInput: canonical,
    canonicalInputHash,
    canonicalShellModel,
    kernelModelHash: canonicalShellModel.semanticHash,
    transferEvidence: freeze({
      schema: 'lafea4-shell-transfer-evidence/v1',
      materialId: section.materialId,
      thickness: section.thickness,
      nodeFrameAuthority: parent.analysisGeometryHash,
      translationConstraintPolicy: 'WHOLE_SURFACE_IDENTICAL_GLOBAL_VALUE_PER_DOF_ONLY',
      localRotationConstraintPolicy: 'WHOLE_SURFACE_ZERO_ONLY',
      nodalLoadPolicy: 'REJECT_NONEMPTY',
      pressurePolicy: 'WHOLE_SURFACE_UNIFORM_PRESSURE_AND_SENSE_ONLY',
      meshBinding,
    }),
  };
}

function compileLafea5(source, parent, meshEvidence) {
  if (parent.stageId !== 'LAFEA.5'
    || shellMidsurfaceKind(parent) !== LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH) {
    fail('LAFEA5_SHELL_SOLVER_SOURCE_MESH_PARENT_REQUIRED');
  }
  const canonicalSource = createCanonicalTrunnionFootprintSource(source);
  const canonicalWorkflowModel = validateCanonicalTrunnionFootprintModel(
    createCanonicalTrunnionFootprintModel(canonicalSource),
  );
  const templateHash = canonicalShellTemplateSemanticHash(canonicalSource.shellTemplate);
  if (templateHash !== parent.shellTemplateSemanticHash) {
    fail('LAFEA5_SHELL_SOLVER_TEMPLATE_PARENT_STALE');
  }
  const parentMeshHash = lafeaAnalysisMeshContentHash(parent.mesh);
  if (parentMeshHash !== meshEvidence.meshHash
    || canonicalLafeaSha256(parent.mesh) !== canonicalLafeaSha256(meshEvidence.mesh)) {
    fail('LAFEA5_SHELL_SOLVER_RETAINED_MESH_NOT_LOSSLESS_SOURCE_ADOPTION');
  }
  const canonicalInputHash = canonicalLafeaSha256({
    schema: 'lafea5-shell-compiler-source-input-hash/v1',
    canonicalInput: canonicalSource,
  });
  return {
    mappingMode: 'LOSSLESS_TRUNNION_SOURCE_SHELL_BINDING_V1',
    canonicalInput: canonicalSource,
    canonicalInputHash,
    canonicalWorkflowModel,
    kernelModelHash: canonicalWorkflowModel.semanticHash,
    transferEvidence: freeze({
      schema: 'lafea5-shell-transfer-evidence/v1',
      shellTemplateSemanticHash: templateHash,
      sourceMeshHash: parentMeshHash,
      retainedMeshHash: meshEvidence.meshHash,
      nodeCoordinateMutation: false,
      connectivityMutation: false,
      loadTransferAuthority: 'LOCAL_TRUNNION_FOOTPRINT_WORKFLOW',
      shellSolveAuthority: 'LOCAL_SHELL_KERNEL_AFTER_WORKFLOW_DISTRIBUTION',
    }),
  };
}

function requireParentChain(stageId, sourceHash, parent, meshEvidence) {
  if (parent.stageId !== stageId || meshEvidence.stageId !== stageId) {
    fail('LAFEA_SHELL_SOLVER_STAGE_PARENT_MISMATCH');
  }
  if (parent.sourceHash !== sourceHash || meshEvidence.sourceHash !== sourceHash) {
    fail('LAFEA_SHELL_SOLVER_SOURCE_PARENT_STALE');
  }
  if (meshEvidence.analysisDomainHash !== parent.analysisDomainHash) {
    fail('LAFEA_SHELL_SOLVER_DOMAIN_PARENT_STALE');
  }
  if (meshEvidence.analysisGeometryHash !== parent.analysisGeometryHash) {
    fail('LAFEA_SHELL_SOLVER_GEOMETRY_PARENT_STALE');
  }
  if (meshEvidence.status !== 'CURRENT' || meshEvidence.qualification !== 'PASS') {
    fail('LAFEA_SHELL_SOLVER_MESH_NOT_CURRENT_PASS');
  }
  if (meshEvidence.quality?.shellOrientationTopology?.qualification !== 'PASS') {
    fail('LAFEA_SHELL_SOLVER_ORIENTATION_NOT_QUALIFIED');
  }
}

function requireUniformSection(canonical) {
  const materialIds = [...new Set(canonical.elements.map((row) => row.materialId))];
  const thicknesses = [...new Set(canonical.elements.map((row) => row.thickness))];
  if (materialIds.length !== 1 || canonical.materials.length !== 1
    || canonical.materials[0].materialId !== materialIds[0]) {
    fail('LAFEA4_SHELL_SOLVER_MATERIAL_REGION_MAPPING_REQUIRED');
  }
  if (thicknesses.length !== 1 || !(thicknesses[0] > 0)) {
    fail('LAFEA4_SHELL_SOLVER_THICKNESS_REGION_MAPPING_REQUIRED');
  }
  return { materialId: materialIds[0], thickness: thicknesses[0] };
}

function compileLafea4Node(row, parent, meshHash) {
  const frame = shellMidsurfaceFrameAtPoint3dAny(parent.geometry, row);
  return {
    nodeId: row.nodeId,
    position: [row.x, row.y, row.z],
    director: vectorArray(frame.director),
    rotationBasis1: vectorArray(frame.rotationBasis1),
    rotationBasis2: vectorArray(frame.rotationBasis2),
    sourceReference: `LAFEA4-COMPILED-FRAME:${parent.analysisGeometryHash}:${meshHash}:${row.nodeId}`,
  };
}

function compileWholeSurfaceConstraints(canonical, targetNodes, meshHash) {
  const sourceNodeIds = new Set(canonical.nodes.map((row) => row.nodeId));
  const output = [];
  for (const dof of DOFS) {
    const rows = canonical.constraints.filter((row) => row.dof === dof);
    if (rows.length === 0) continue;
    if (rows.length !== canonical.nodes.length
      || new Set(rows.map((row) => row.nodeId)).size !== canonical.nodes.length
      || rows.some((row) => !sourceNodeIds.has(row.nodeId))) {
      fail('LAFEA4_SHELL_SOLVER_CONSTRAINT_MAPPING_REQUIRED');
    }
    const values = [...new Set(rows.map((row) => canonicalNumber(row.value)))];
    if (values.length !== 1) fail('LAFEA4_SHELL_SOLVER_CONSTRAINT_MAPPING_REQUIRED');
    const value = values[0];
    if (LOCAL_ROTATION_DOFS.has(dof) && value !== 0) {
      fail('LAFEA4_SHELL_SOLVER_NONZERO_LOCAL_ROTATION_MAPPING_REQUIRED');
    }
    for (const node of targetNodes) {
      output.push({
        constraintId: `LAFEA4-MESH-${node.nodeId}-${dof}`,
        nodeId: node.nodeId,
        dof,
        value,
        sourceReference: `LAFEA4-COMPILED-WHOLE-SURFACE-DOF:${meshHash}:${dof}`,
      });
    }
  }
  return output;
}

function compileLafea4LoadCases(canonical, targetElements, meshHash) {
  return canonical.loadCases.map((loadCase) => {
    if (loadCase.nodalLoads.length) fail('LAFEA4_SHELL_SOLVER_NODAL_LOAD_MAPPING_REQUIRED');
    const pressureLoads = loadCase.pressureLoads.length
      ? compileWholeSurfacePressure(canonical, loadCase, targetElements, meshHash)
      : [];
    return {
      loadCaseId: loadCase.loadCaseId,
      nodalLoads: [],
      pressureLoads,
      sourceReference: `LAFEA4-COMPILED-LOAD-CASE:${meshHash}:${loadCase.loadCaseId}`,
    };
  });
}

function compileWholeSurfacePressure(canonical, loadCase, targetElements, meshHash) {
  if (loadCase.pressureLoads.length !== canonical.elements.length
    || new Set(loadCase.pressureLoads.map((row) => row.elementId)).size
      !== canonical.elements.length) {
    fail('LAFEA4_SHELL_SOLVER_PRESSURE_REGION_MAPPING_REQUIRED');
  }
  const sourceElementIds = new Set(canonical.elements.map((row) => row.elementId));
  if (loadCase.pressureLoads.some((row) => !sourceElementIds.has(row.elementId))) {
    fail('LAFEA4_SHELL_SOLVER_PRESSURE_REGION_MAPPING_REQUIRED');
  }
  const signatures = [...new Set(loadCase.pressureLoads.map((row) =>
    `${canonicalNumber(row.pressure)}\u0000${row.sense}`))];
  if (signatures.length !== 1) fail('LAFEA4_SHELL_SOLVER_PRESSURE_REGION_MAPPING_REQUIRED');
  const [pressureText, sense] = signatures[0].split('\u0000');
  const pressure = Number(pressureText);
  return targetElements.map((element) => ({
    pressureLoadId: `LAFEA4-MESH-P-${loadCase.loadCaseId}-${element.elementId}`,
    elementId: element.elementId,
    pressure,
    sense,
    sourceReference: `LAFEA4-COMPILED-WHOLE-SURFACE-PRESSURE:${meshHash}:${loadCase.loadCaseId}`,
  }));
}

function proveKernelMeshBinding(retainedMesh, canonicalShellModel) {
  const nodeById = new Map(canonicalShellModel.nodes.map((row) => [row.nodeId, row]));
  if (nodeById.size !== retainedMesh.nodes.length
    || canonicalShellModel.elements.length !== retainedMesh.elements.length) {
    fail('LAFEA4_SHELL_SOLVER_KERNEL_MESH_COUNT_MISMATCH');
  }
  for (const node of retainedMesh.nodes) {
    const kernel = nodeById.get(node.nodeId);
    if (!kernel || canonicalLafeaSha256(kernel.position)
      !== canonicalLafeaSha256([node.x, node.y, node.z])) {
      fail('LAFEA4_SHELL_SOLVER_KERNEL_NODE_BINDING_MISMATCH');
    }
  }
  const retainedElementById = new Map(
    retainedMesh.elements.map((row) => [row.elementId, row]),
  );
  const elementBindings = canonicalShellModel.elements.map((kernel) => {
    const retained = retainedElementById.get(kernel.elementId);
    if (!retained
      || canonicalLafeaSha256([...kernel.nodeIds].sort())
        !== canonicalLafeaSha256([...retained.nodeIds].sort())) {
      fail('LAFEA4_SHELL_SOLVER_KERNEL_ELEMENT_BINDING_MISMATCH');
    }
    return freeze({
      elementId: kernel.elementId,
      retainedNodeSetHash: canonicalLafeaSha256([...retained.nodeIds].sort()),
      kernelNodeSetHash: canonicalLafeaSha256([...kernel.nodeIds].sort()),
    });
  });
  return freeze({
    retainedMeshHash: lafeaAnalysisMeshContentHash(retainedMesh),
    kernelCanonicalModelHash: canonicalShellModel.semanticHash,
    nodeCount: retainedMesh.nodes.length,
    elementCount: retainedMesh.elements.length,
    elementBindings,
  });
}

function bindingResult(stageId, state, usableForRun, reasons, meshHash = null) {
  return freeze({
    schema: LAFEA_SHELL_SOLVER_MODEL_BINDING_SCHEMA,
    stageId,
    state,
    usableForRun,
    reasons: [...new Set(reasons.filter(Boolean))],
    meshHash,
    parentNormalCompanionHash: null,
    parentNormalAuthorizationEffect: null,
    parentNormalCandidateQualification: null,
    solverModelHash: null,
    solverModelBindingHash: null,
    kernelModelHash: null,
    mappingMode: null,
  });
}

function vectorArray(value) {
  if (Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)) {
    return [...value];
  }
  if (value && Number.isFinite(value.x)
    && Number.isFinite(value.y) && Number.isFinite(value.z)) {
    return [value.x, value.y, value.z];
  }
  fail('LAFEA_SHELL_SOLVER_FRAME_VECTOR_INVALID');
}
function canonicalNumber(value) { return Object.is(value, -0) ? 0 : value; }
function requireStage(value) {
  if (!STAGES.includes(value)) fail('LAFEA_SHELL_SOLVER_STAGE_INVALID');
  return value;
}
function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}
function requireHash(value, code) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(code);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
