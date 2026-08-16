import { canonicalShellTemplateSemanticHash } from '../core/local-trunnion-footprint/index.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA5_SOURCE_SHELL_PARENT_SCHEMA = 'lafea5-source-shell-parent/v1';
export const LAFEA5_SOURCE_SHELL_ADOPTION_PLAN_SCHEMA = 'lafea5-source-shell-adoption-plan/v1';
export const LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF =
  'LAFEA5_CALLER_AUTHORED_SHELL_TEMPLATE_ADOPTION_V1';
export const LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';

const CAPABILITY = freeze({
  schema: 'lafea5-source-shell-adoption-capability/v1',
  producerRef: LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF,
  stageId: 'LAFEA.5',
  operation: 'LOSSLESS_SOURCE_MESH_ADOPTION',
  topologyMutation: false,
  coordinateMutation: false,
  elementFamily: LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT,
  sourceAuthority: 'CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_ONLY',
});
const QUALIFICATION = freeze({
  schema: 'lafea5-source-shell-adoption-qualification/v1',
  producerRef: LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF,
  invariants: [
    'SOURCE_NODE_IDS_PRESERVED',
    'SOURCE_NODE_COORDINATES_PRESERVED',
    'SOURCE_ELEMENT_IDS_PRESERVED',
    'SOURCE_CONNECTIVITY_PRESERVED',
    'SOURCE_WINDING_ALIGNED_WITH_DECLARED_NODE_DIRECTORS',
    'NO_REMESHING',
    'GOVERNED_MESH_QUALITY_EVALUATED_AT_ADOPTION',
  ],
  releaseAuthority: false,
});
export const LAFEA5_SOURCE_SHELL_ADOPTION_CAPABILITY_HASH = canonicalLafeaSha256(CAPABILITY);
export const LAFEA5_SOURCE_SHELL_ADOPTION_QUALIFICATION_HASH = canonicalLafeaSha256(QUALIFICATION);

export function createLafea5SourceShellParent({ sourceHash, shellTemplate }) {
  requireHash(sourceHash, 'SOURCE_HASH');
  const shellTemplateSemanticHash = canonicalShellTemplateSemanticHash(shellTemplate);
  const lengthUnit = text(shellTemplate?.units?.length);
  const mesh = sourceShellMesh(shellTemplate);
  assertSourceWindingAligned(shellTemplate, mesh);
  const analysisGeometryHash = canonicalLafeaSha256({
    schema: 'lafea5-source-shell-analysis-geometry/v1',
    stageId: 'LAFEA.5',
    lengthUnit,
    nodes: mesh.nodes,
    elements: mesh.elements,
  });
  const analysisDomainHash = canonicalLafeaSha256({
    schema: 'lafea5-source-shell-analysis-domain/v1',
    stageId: 'LAFEA.5',
    sourceHash,
    shellTemplateSemanticHash,
    analysisGeometryHash,
    lengthUnit,
    authority: 'CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_ONLY',
  });
  return freeze({
    schema: LAFEA5_SOURCE_SHELL_PARENT_SCHEMA,
    stageId: 'LAFEA.5',
    sourceHash,
    shellTemplateSemanticHash,
    analysisDomainHash,
    analysisGeometryHash,
    lengthUnit,
    mesh,
    qualification: 'PASS',
    limitations: [
      'LOSSLESS_SOURCE_MESH_ADOPTION_ONLY',
      'SOURCE_WINDING_MUST_ALIGN_WITH_DECLARED_NODE_DIRECTORS',
      'NO_AUTOMATIC_REMESHING',
      'NO_NODE_OR_CONNECTIVITY_MUTATION',
      'NO_LOCAL_OR_ADAPTIVE_REFINEMENT',
    ],
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea5-source-shell-parent-hash-input/v1',
      stageId: 'LAFEA.5', sourceHash, shellTemplateSemanticHash,
      analysisDomainHash, analysisGeometryHash, lengthUnit,
    }),
  });
}

export function validateLafea5SourceShellParent(value) {
  if (!value || value.schema !== LAFEA5_SOURCE_SHELL_PARENT_SCHEMA
    || value.stageId !== 'LAFEA.5' || value.qualification !== 'PASS') {
    fail('LAFEA5_SOURCE_SHELL_PARENT_INVALID');
  }
  requireHash(value.sourceHash, 'SOURCE_HASH');
  requireHash(value.shellTemplateSemanticHash, 'SHELL_TEMPLATE_HASH');
  requireHash(value.analysisDomainHash, 'ANALYSIS_DOMAIN_HASH');
  requireHash(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH');
  const lengthUnit = text(value.lengthUnit);
  const mesh = sourceMeshCanonical(value.mesh);
  const geometryHash = canonicalLafeaSha256({
    schema: 'lafea5-source-shell-analysis-geometry/v1',
    stageId: 'LAFEA.5', lengthUnit, nodes: mesh.nodes, elements: mesh.elements,
  });
  if (geometryHash !== value.analysisGeometryHash) fail('LAFEA5_SOURCE_SHELL_GEOMETRY_HASH_INVALID');
  const domainHash = canonicalLafeaSha256({
    schema: 'lafea5-source-shell-analysis-domain/v1',
    stageId: 'LAFEA.5',
    sourceHash: value.sourceHash,
    shellTemplateSemanticHash: value.shellTemplateSemanticHash,
    analysisGeometryHash: value.analysisGeometryHash,
    lengthUnit,
    authority: 'CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_ONLY',
  });
  if (domainHash !== value.analysisDomainHash) fail('LAFEA5_SOURCE_SHELL_DOMAIN_HASH_INVALID');
  const semanticHash = canonicalLafeaSha256({
    schema: 'lafea5-source-shell-parent-hash-input/v1',
    stageId: 'LAFEA.5', sourceHash: value.sourceHash,
    shellTemplateSemanticHash: value.shellTemplateSemanticHash,
    analysisDomainHash: value.analysisDomainHash,
    analysisGeometryHash: value.analysisGeometryHash,
    lengthUnit,
  });
  if (semanticHash !== value.semanticHash) fail('LAFEA5_SOURCE_SHELL_PARENT_HASH_INVALID');
  return freeze({ ...value, lengthUnit, mesh });
}

export function planLafea5SourceShellMeshAdoption({ parent: parentValue, meshProfile: profileValue }) {
  const parent = validateLafea5SourceShellParent(parentValue);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(profileValue);
  if (meshProfile.fields.shellElement !== LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT_PROFILE_MISMATCH');
  }
  const core = {
    schema: LAFEA5_SOURCE_SHELL_ADOPTION_PLAN_SCHEMA,
    stageId: 'LAFEA.5',
    generationMode: 'SOURCE_MESH_ADOPTION',
    strategy: 'LOSSLESS_CALLER_AUTHORED_SHELL_TEMPLATE_ADOPTION',
    scope: 'CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_SOURCE_MESH_V1',
    sourceHash: parent.sourceHash,
    analysisDomainHash: parent.analysisDomainHash,
    analysisGeometryHash: parent.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily: LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT,
    lengthUnit: parent.lengthUnit,
    nodeCount: parent.mesh.nodes.length,
    elementCount: parent.mesh.elements.length,
    estimatedDofs: parent.mesh.nodes.length * 5,
    characteristicLengthMin: null,
    characteristicLengthMedian: null,
    characteristicLengthMax: null,
    resourceDisposition: 'WITHIN_LIMITS',
    sourceShellParentHash: parent.semanticHash,
    sourceShellTemplateHash: parent.shellTemplateSemanticHash,
    midsurfaceEvidenceHash: parent.semanticHash,
    producerRef: LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF,
    capabilityHash: LAFEA5_SOURCE_SHELL_ADOPTION_CAPABILITY_HASH,
    qualificationHash: LAFEA5_SOURCE_SHELL_ADOPTION_QUALIFICATION_HASH,
    topologyMutation: false,
    coordinateMutation: false,
  };
  return freeze({
    ...core,
    mesh: parent.mesh,
    planHash: canonicalLafeaSha256({ schema: 'lafea5-source-shell-adoption-plan-hash-input/v1', plan: core }),
  });
}

export function produceLafea5SourceShellMeshAdoption(input) {
  const parent = validateLafea5SourceShellParent(input.parent);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const plan = input.plan ?? planLafea5SourceShellMeshAdoption({ parent, meshProfile });
  if (plan.schema !== LAFEA5_SOURCE_SHELL_ADOPTION_PLAN_SCHEMA
    || plan.sourceShellParentHash !== parent.semanticHash
    || plan.meshProfileHash !== meshProfile.semanticHash) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_PLAN_PARENT_MISMATCH');
  }
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.5',
    sourceHash: parent.sourceHash,
    analysisDomainHash: parent.analysisDomainHash,
    analysisGeometryHash: parent.analysisGeometryHash,
    meshProfile,
    mesh: parent.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.5',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF,
      sourceHash: parent.sourceHash,
      analysisDomainHash: parent.analysisDomainHash,
      analysisGeometryHash: parent.analysisGeometryHash,
      meshProfileHash: meshProfile.semanticHash,
      meshHash: canonicalLafeaSha256({
        schema: 'lafea-analysis-mesh-content-hash-input/v1', mesh: parent.mesh,
      }),
      capabilityHash: LAFEA5_SOURCE_SHELL_ADOPTION_CAPABILITY_HASH,
      qualificationHash: LAFEA5_SOURCE_SHELL_ADOPTION_QUALIFICATION_HASH,
      planHash: plan.planHash,
    },
  });
  assertIdentityPreserved(parent.mesh, evidence.mesh);
  return freeze({ plan, evidence });
}

function sourceShellMesh(shellTemplate) {
  if (!shellTemplate || !Array.isArray(shellTemplate.nodes) || !Array.isArray(shellTemplate.elements)) {
    fail('LAFEA5_SOURCE_SHELL_TEMPLATE_MESH_REQUIRED');
  }
  return sourceMeshCanonical({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `LAFEA5-SOURCE-SHELL/${canonicalShellTemplateSemanticHash(shellTemplate)}`,
    nodes: shellTemplate.nodes.map((node) => {
      if (!Array.isArray(node.position) || node.position.length !== 3) {
        fail('LAFEA5_SOURCE_SHELL_NODE_POSITION_INVALID');
      }
      return { nodeId: node.nodeId, x: node.position[0], y: node.position[1], z: node.position[2] };
    }),
    elements: shellTemplate.elements.map((element) => ({
      elementId: element.elementId,
      elementType: LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT,
      nodeIds: [...element.nodeIds],
    })),
  });
}

/**
 * Lossless adoption preserves the caller's connectivity byte-for-byte, so the
 * caller's declared winding must already agree with the shell directors. The
 * local-shell canonicalizer can choose an orientation for solver assembly; it
 * is not authority to silently rewrite source connectivity during adoption.
 */
function assertSourceWindingAligned(shellTemplate, mesh) {
  const sourceNodes = new Map(shellTemplate.nodes.map((node) => [text(node.nodeId), node]));
  const meshNodes = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const minimum = finite(shellTemplate?.qualificationProfile
    ?.elementNormalDirectorAlignment?.minimum);
  if (!(minimum > 0 && minimum <= 1)) fail('LAFEA5_SOURCE_SHELL_DIRECTOR_ALIGNMENT_LIMIT_INVALID');
  for (const element of mesh.elements) {
    const points = element.nodeIds.map((nodeId) => meshNodes.get(nodeId));
    const first = subtract3(points[1], points[0]);
    const second = subtract3(points[2], points[0]);
    const normal = unit3(cross3(first, second), 'ELEMENT_NORMAL');
    for (const nodeId of element.nodeIds) {
      const director = unitArray3(sourceNodes.get(nodeId)?.director, 'NODE_DIRECTOR');
      if (dotArrayObject(director, normal) < minimum - 1e-12) {
        fail('LAFEA5_SOURCE_SHELL_WINDING_DIRECTOR_MISMATCH');
      }
    }
  }
}

function sourceMeshCanonical(mesh) {
  const nodes = [...mesh.nodes].map((row) => freeze({
    nodeId: text(row.nodeId), x: finite(row.x), y: finite(row.y), z: finite(row.z),
  })).sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const nodeIds = new Set(nodes.map((row) => row.nodeId));
  const elements = [...mesh.elements].map((row) => {
    const nodeIdsValue = [...row.nodeIds].map(text);
    if (row.elementType !== LAFEA5_SOURCE_SHELL_ADOPTION_ELEMENT || nodeIdsValue.length !== 3
      || new Set(nodeIdsValue).size !== 3 || nodeIdsValue.some((id) => !nodeIds.has(id))) {
      fail('LAFEA5_SOURCE_SHELL_ELEMENT_INVALID');
    }
    return freeze({ elementId: text(row.elementId), elementType: row.elementType, nodeIds: freeze(nodeIdsValue) });
  }).sort((a, b) => a.elementId.localeCompare(b.elementId));
  return freeze({ schema: 'lafea-analysis-mesh/v1', meshIdentity: text(mesh.meshIdentity), nodes, elements });
}

function assertIdentityPreserved(expected, actual) {
  if (canonicalLafeaSha256(expected) !== canonicalLafeaSha256(actual)) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_NOT_LOSSLESS');
  }
}
function subtract3(left, right) { return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z }; }
function cross3(left, right) { return { x: left.y * right.z - left.z * right.y, y: left.z * right.x - left.x * right.z, z: left.x * right.y - left.y * right.x }; }
function unit3(value, field) { const length = Math.hypot(value.x, value.y, value.z); if (!(length > 0)) fail(`LAFEA5_SOURCE_SHELL_${field}_INVALID`); return { x: value.x / length, y: value.y / length, z: value.z / length }; }
function unitArray3(value, field) { if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) fail(`LAFEA5_SOURCE_SHELL_${field}_INVALID`); const length = Math.hypot(...value); if (!(length > 0)) fail(`LAFEA5_SOURCE_SHELL_${field}_INVALID`); return value.map((item) => item / length); }
function dotArrayObject(array, object) { return array[0] * object.x + array[1] * object.y + array[2] * object.z; }
function text(value) { if (typeof value !== 'string' || !value.trim()) fail('LAFEA5_SOURCE_SHELL_TEXT_INVALID'); return value; }
function finite(value) { if (!Number.isFinite(value)) fail('LAFEA5_SOURCE_SHELL_NUMBER_INVALID'); return Object.is(value, -0) ? 0 : value; }
function requireHash(value, field) { if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(`LAFEA5_SOURCE_SHELL_${field}_INVALID`); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
