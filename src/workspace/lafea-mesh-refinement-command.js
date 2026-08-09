/** Governed refinement command contracts. V1 is retained as non-executable history. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { lafeaMeshCapabilities } from './lafea-mesh-capabilities.js';

export const LAFEA_MESH_REFINEMENT_COMMAND_SCHEMA = 'lafea-mesh-refinement-command/v1';
export const LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA =
  'lafea-retained-mesh-refinement-command/v2';
export const LAFEA_MESH_REFINEMENT_KINDS = Object.freeze([
  'TARGET_LENGTH', 'DISCONTINUITY_ZONE', 'RESTRAINT_ZONE', 'LOAD_ZONE',
  'ATTACHMENT_ZONE', 'BEND_ZONE', 'TEE_ZONE', 'REDUCER_ZONE', 'RIGID_BOUNDARY_ZONE',
]);
export const LAFEA_RETAINED_MESH_REFINEMENT_TARGET_TYPES = Object.freeze([
  'NODE', 'ELEMENT',
]);

const V1_KEYS = Object.freeze([
  'schema', 'commandId', 'stageId', 'expectedGenerationIntentHash', 'kind',
  'entityIds', 'targetElementLength', 'lengthUnit', 'reason',
]);
const V2_KEYS = Object.freeze([
  'schema', 'commandId', 'stageId', 'parentMeshArtifactHash', 'parentMeshHash',
  'kind', 'targetType', 'targetIds', 'targetElementLength', 'lengthUnit', 'reason',
]);

/**
 * Historical source-entity refinement request. It deliberately remains
 * non-executable because source entity identity is not generated-mesh identity.
 */
export function createLafeaMeshRefinementCommand(value) {
  exact(value, V1_KEYS);
  if (value.schema !== LAFEA_MESH_REFINEMENT_COMMAND_SCHEMA) {
    throw error('LAFEA_MESH_REFINEMENT_COMMAND_SCHEMA_INVALID');
  }
  const capabilities = lafeaMeshCapabilities(value.stageId);
  if (!capabilities.applicable) throw error('LAFEA_MESH_REFINEMENT_NOT_APPLICABLE');
  if (!LAFEA_MESH_REFINEMENT_KINDS.includes(value.kind)) {
    throw error('LAFEA_MESH_REFINEMENT_KIND_INVALID');
  }
  const command = {
    schema: LAFEA_MESH_REFINEMENT_COMMAND_SCHEMA,
    commandId: text(value.commandId, 'COMMAND_ID'),
    stageId: value.stageId,
    expectedGenerationIntentHash: text(value.expectedGenerationIntentHash, 'EXPECTED_INTENT_HASH'),
    kind: value.kind,
    entityIds: ids(value.entityIds, 'ENTITY_IDS'),
    targetElementLength: positive(value.targetElementLength),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    reason: text(value.reason, 'REASON'),
  };
  return freeze({
    ...command,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-refinement-command-hash-input/v1', command,
    }),
    status: 'UNEXECUTABLE_COMMAND',
    executionAuthorized: false,
    rollbackPolicy: 'NO_MUTATION_WITHOUT_QUALIFIED_PRODUCER',
    limitation: 'SOURCE_ENTITY_IDS_ARE_NOT_RETAINED_ANALYSIS_MESH_IDS',
  });
}

/**
 * Executable retained-mesh refinement request. The parent artifact and mesh
 * hashes make the selected canonical node/element IDs meaningful and stale-safe.
 */
export function createLafeaRetainedMeshRefinementCommand(value) {
  exact(value, V2_KEYS);
  if (value.schema !== LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA) {
    throw error('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA_INVALID');
  }
  const capabilities = lafeaMeshCapabilities(value.stageId);
  if (!capabilities.applicable) throw error('LAFEA_MESH_REFINEMENT_NOT_APPLICABLE');
  if (!LAFEA_MESH_REFINEMENT_KINDS.includes(value.kind)) {
    throw error('LAFEA_MESH_REFINEMENT_KIND_INVALID');
  }
  if (!LAFEA_RETAINED_MESH_REFINEMENT_TARGET_TYPES.includes(value.targetType)) {
    throw error('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_TYPE_INVALID');
  }
  const command = {
    schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
    commandId: text(value.commandId, 'COMMAND_ID'),
    stageId: value.stageId,
    parentMeshArtifactHash: sha256(value.parentMeshArtifactHash, 'PARENT_MESH_ARTIFACT_HASH'),
    parentMeshHash: sha256(value.parentMeshHash, 'PARENT_MESH_HASH'),
    kind: value.kind,
    targetType: value.targetType,
    targetIds: ids(value.targetIds, 'TARGET_IDS'),
    targetElementLength: positive(value.targetElementLength),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    reason: text(value.reason, 'REASON'),
  };
  const authorized = capabilities.manualRefinementQualified === true;
  return freeze({
    ...command,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-retained-mesh-refinement-command-hash-input/v2', command,
    }),
    status: authorized ? 'READY' : 'UNEXECUTABLE_COMMAND',
    executionAuthorized: authorized,
    rollbackPolicy: 'NO_CUSTODY_MUTATION_UNTIL_FULL_EVIDENCE_ACCEPTED',
  });
}

function ids(value, label) {
  if (!Array.isArray(value) || !value.length) throw error(`LAFEA_MESH_REFINEMENT_${label}_REQUIRED`);
  if (value.length > 64) throw error(`LAFEA_MESH_REFINEMENT_${label}_LIMIT_EXCEEDED`);
  const result = value.map((id) => text(id, 'ENTITY_ID')).sort((a, b) => a.localeCompare(b));
  if (new Set(result).size !== result.length) throw error(`LAFEA_MESH_REFINEMENT_${label}_DUPLICATE`);
  return result;
}
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw error('LAFEA_MESH_REFINEMENT_COMMAND_KEYS_INVALID');
  }
}
function positive(value) {
  if (!Number.isFinite(value) || value <= 0) throw error('LAFEA_MESH_REFINEMENT_TARGET_LENGTH_INVALID');
  return value;
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw error(`LAFEA_MESH_REFINEMENT_${label}_INVALID`);
  return value.trim();
}
function sha256(value, label) {
  const out = text(value, label);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) throw error(`LAFEA_MESH_REFINEMENT_${label}_INVALID`);
  return out;
}
function error(code) { const value = new TypeError(code); value.code = code; return value; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
