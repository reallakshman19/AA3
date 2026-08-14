/**
 * V3 mesh identity primitives.
 *
 * This module is deliberately additive. It does not change v1/v2 evidence or
 * custody semantics. The v3 numerical content identity excludes meshIdentity,
 * while the artifact identity retains it for exact provenance/audit use.
 */
import {
  canonicalLafeaAnalysisMesh,
} from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_ANALYSIS_MESH_NUMERICAL_CONTENT_V3_SCHEMA =
  'lafea-analysis-mesh-numerical-content/v3';
export const LAFEA_ANALYSIS_MESH_IDENTITY_V3_SCHEMA =
  'lafea-analysis-mesh-identity/v3';

/**
 * Return the exact canonical numerical mesh record used for v3 content
 * addressing. Node/element IDs remain part of exact execution identity;
 * meshIdentity does not.
 */
export function canonicalLafeaAnalysisMeshNumericalContentV3(value) {
  const mesh = canonicalLafeaAnalysisMesh(value);
  return freeze({
    schema: LAFEA_ANALYSIS_MESH_NUMERICAL_CONTENT_V3_SCHEMA,
    nodes: mesh.nodes,
    elements: mesh.elements,
  });
}

/**
 * Exact numerical execution identity. This is the mesh hash a future v3
 * solver authorization should bind to.
 */
export function lafeaAnalysisMeshContentHashV3(value) {
  return canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-content-hash-input/v3',
    mesh: canonicalLafeaAnalysisMeshNumericalContentV3(value),
  });
}

/**
 * Exact canonical artifact identity, including meshIdentity. This is useful
 * for provenance/export integrity, but must not be used as numerical solver
 * identity merely because a label changed.
 */
export function lafeaAnalysisMeshArtifactHashV3(value) {
  return canonicalLafeaSha256({
    schema: 'lafea-analysis-mesh-artifact-hash-input/v3',
    mesh: canonicalLafeaAnalysisMesh(value),
  });
}

/**
 * Bundle the separated v3 identities without granting engineering authority.
 */
export function createLafeaAnalysisMeshIdentityV3(value) {
  const mesh = canonicalLafeaAnalysisMesh(value);
  const numericalContent = canonicalLafeaAnalysisMeshNumericalContentV3(mesh);
  return freeze({
    schema: LAFEA_ANALYSIS_MESH_IDENTITY_V3_SCHEMA,
    meshIdentity: mesh.meshIdentity,
    meshContentHash: canonicalLafeaSha256({
      schema: 'lafea-analysis-mesh-content-hash-input/v3',
      mesh: numericalContent,
    }),
    meshArtifactHash: canonicalLafeaSha256({
      schema: 'lafea-analysis-mesh-artifact-hash-input/v3',
      mesh,
    }),
    engineeringAuthority: false,
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
