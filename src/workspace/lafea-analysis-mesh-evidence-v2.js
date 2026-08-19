/** Domain-first analysis-mesh evidence contract for mesh-applicable LAFEA stages. */
import { qualifyRefinedMeshAdjacentSizeRatio } from '../core/lafea-meshing/refinement-fields.js';
import {
  LAFEA_ANALYSIS_MESH_FEA_STAGES,
  LAFEA_ANALYSIS_MESH_SCHEMA,
  canonicalLafeaAnalysisMesh,
  canonicalLafeaAnalysisMeshProfile,
  lafeaAnalysisMeshContentHash,
  qualifyLafeaAnalysisMesh,
  requireLafeaAnalysisMeshElementFamily,
  requireLafeaAnalysisMeshQualifiedQualityPolicy,
} from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA = 'lafea-analysis-mesh-intake/v2';
export const LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA = 'lafea-analysis-mesh-authority/v2';
export const LAFEA_ANALYSIS_MESH_EVIDENCE_V2_SCHEMA = 'lafea-analysis-mesh-evidence/v2';
export const LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE = 'DOMAIN_FIRST_STAGE_AUTHORIZED_ANALYSIS_MESH';

const INTAKE_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'analysisDomainHash', 'analysisGeometryHash',
  'meshProfile', 'mesh', 'authority',
]);
const AUTHORITY_KEYS = Object.freeze([
  'schema', 'stageId', 'authorityRole', 'status', 'producerRef', 'sourceHash',
  'analysisDomainHash', 'analysisGeometryHash', 'meshProfileHash', 'meshHash',
  'capabilityHash', 'qualificationHash', 'planHash',
]);

export function createLafeaAnalysisMeshEvidenceV2(value) {
  exact(value, INTAKE_KEYS, 'LAFEA_ANALYSIS_MESH_V2_INTAKE_KEYS_INVALID');
  if (value.schema !== LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA) {
    fail('LAFEA_ANALYSIS_MESH_V2_SCHEMA_INVALID');
  }
  const stageId = stage(value.stageId);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(value.meshProfile);
  requireLafeaAnalysisMeshQualifiedQualityPolicy(stageId, meshProfile);
  const mesh = canonicalLafeaAnalysisMesh(value.mesh);
  if (mesh.schema !== LAFEA_ANALYSIS_MESH_SCHEMA) fail('LAFEA_ANALYSIS_MESH_V2_MESH_SCHEMA_INVALID');
  requireLafeaAnalysisMeshElementFamily(stageId, meshProfile, mesh.elements);
  enforceLafea3RefinementAdjacency(stageId, mesh, meshProfile);
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  const sourceHash = sha256(value.sourceHash, 'SOURCE_HASH');
  const analysisDomainHash = sha256(value.analysisDomainHash, 'ANALYSIS_DOMAIN_HASH');
  const analysisGeometryHash = sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH');
  const authority = validateAuthority(value.authority, {
    stageId,
    sourceHash, analysisDomainHash, analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash, meshHash,
  });
  const quality = qualifyLafeaAnalysisMesh(stageId, mesh, meshProfile);
  const blocked = quality.worstStatus === 'BLOCK';
  const core = {
    schema: LAFEA_ANALYSIS_MESH_EVIDENCE_V2_SCHEMA,
    stageId,
    sourceHash, analysisDomainHash, analysisGeometryHash,
    meshProfile, mesh, authority, meshHash,
    meshProfileHash: meshProfile.semanticHash,
    quality,
    status: blocked ? 'BLOCKED' : 'CURRENT',
    qualification: blocked ? 'BLOCK' : 'PASS',
  };
  return freeze({
    ...core,
    artifactHash: canonicalLafeaSha256({
      schema: 'lafea-analysis-mesh-artifact-hash-input/v2', evidence: core,
    }),
    releaseQualified: false,
  });
}

export function validateLafeaAnalysisMeshEvidenceV2(value) {
  if (!value || value.schema !== LAFEA_ANALYSIS_MESH_EVIDENCE_V2_SCHEMA) {
    fail('LAFEA_ANALYSIS_MESH_V2_EVIDENCE_SCHEMA_INVALID');
  }
  const rebuilt = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    analysisDomainHash: value.analysisDomainHash,
    analysisGeometryHash: value.analysisGeometryHash,
    meshProfile: value.meshProfile,
    mesh: value.mesh,
    authority: value.authority,
  });
  if (canonicalLafeaSha256(rebuilt) !== canonicalLafeaSha256(value)) {
    fail('LAFEA_ANALYSIS_MESH_V2_EVIDENCE_TAMPERED');
  }
  return rebuilt;
}

function enforceLafea3RefinementAdjacency(stageId, mesh, meshProfile) {
  if (stageId !== 'LAFEA.3' || !mesh.meshIdentity.includes(':LOCAL_REFINEMENT:')) return;
  const result = qualifyRefinedMeshAdjacentSizeRatio(
    mesh,
    meshProfile.fields.adjacentSizeRatioMax,
  );
  console.log(JSON.stringify({
    diagnostic: 'LAFEA3_SQRT_GRADED_ADJACENCY_BEFORE_CUSTODY',
    meshIdentity: mesh.meshIdentity,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    adjacency: result,
  }, null, 2));
  if (result.qualification !== 'PASS') {
    fail('LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK');
  }
}

function validateAuthority(value, expected) {
  exact(value, AUTHORITY_KEYS, 'LAFEA_ANALYSIS_MESH_V2_AUTHORITY_KEYS_INVALID');
  const stageId = stage(value.stageId);
  if (value.schema !== LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA
    || value.authorityRole !== LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE
    || value.status !== 'ACCEPTED_BY_STAGE_CONTRACT') {
    fail('LAFEA_ANALYSIS_MESH_V2_AUTHORITY_INVALID');
  }
  const canonical = freeze({
    schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
    stageId,
    authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
    status: 'ACCEPTED_BY_STAGE_CONTRACT',
    producerRef: text(value.producerRef, 'PRODUCER_REF'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    analysisDomainHash: sha256(value.analysisDomainHash, 'ANALYSIS_DOMAIN_HASH'),
    analysisGeometryHash: sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    meshHash: sha256(value.meshHash, 'MESH_HASH'),
    capabilityHash: sha256(value.capabilityHash, 'CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    planHash: sha256(value.planHash, 'PLAN_HASH'),
  });
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (canonical[key] !== expectedValue) fail('LAFEA_ANALYSIS_MESH_V2_AUTHORITY_PARENT_MISMATCH');
  }
  return canonical;
}

function stage(value) {
  if (!LAFEA_ANALYSIS_MESH_FEA_STAGES.includes(value)) {
    fail('LAFEA_ANALYSIS_MESH_V2_STAGE_INVALID');
  }
  return value;
}
function exact(value, keys, code) { if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code); }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_ANALYSIS_MESH_V2_${field}_INVALID`); return value.trim(); }
function sha256(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_ANALYSIS_MESH_V2_${field}_INVALID`); return out; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }