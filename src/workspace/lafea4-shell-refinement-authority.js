import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
} from './lafea-mesh-producer-registry.js';

export const LAFEA4_SHELL_REFINEMENT_CAPABILITY_SCHEMA =
  'lafea4-shell-refinement-capability/v1';
export const LAFEA4_SHELL_REFINEMENT_QUALIFICATION_SCHEMA =
  'lafea4-shell-refinement-qualification/v1';
export const LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA =
  'lafea4-shell-retained-refinement-command/v1';
export const LAFEA4_SHELL_REFINEMENT_PRODUCER_ID = 'LAFEA4_SHELL_UV_LOCAL_REFINER';
export const LAFEA4_SHELL_REFINEMENT_PRODUCER_REVISION = 'UV_TRI3_NONPERIODIC_V1';
export const LAFEA4_SHELL_REFINEMENT_QUALIFICATION_ID = 'LAFEA4-SHELL-REFINE-Q1';
export const LAFEA4_SHELL_REFINEMENT_QUALIFICATION_REVISION = 'R1';
export const LAFEA4_SHELL_REFINEMENT_PRODUCER_REF =
  `${LAFEA4_SHELL_REFINEMENT_PRODUCER_ID}/${LAFEA4_SHELL_REFINEMENT_PRODUCER_REVISION}/${LAFEA4_SHELL_REFINEMENT_QUALIFICATION_ID}`;

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const COMMAND_KEYS = Object.freeze([
  'schema', 'commandId', 'stageId', 'parentMeshArtifactHash', 'parentMeshHash',
  'kind', 'targetType', 'targetIds', 'targetElementLength', 'lengthUnit', 'reason',
]);

const capabilityCore = Object.freeze({
  schema: LAFEA4_SHELL_REFINEMENT_CAPABILITY_SCHEMA,
  producerId: LAFEA4_SHELL_REFINEMENT_PRODUCER_ID,
  producerRevision: LAFEA4_SHELL_REFINEMENT_PRODUCER_REVISION,
  stageId: 'LAFEA.4',
  elementFamily: SHELL_TRI3,
  generationMode: 'REFINEMENT_REGENERATION',
  executionScope: 'QUALIFICATION_HARNESS_ONLY',
  surfaceKinds: Object.freeze(['CYLINDRICAL', 'CYLINDRICAL_HOLES']),
  boundaryPolicy: 'PRESERVE_PARENT_BOUNDARY_EDGES_EXACTLY_V1',
  topologyPolicy: 'CONFORMING_TRI3_NO_HANGING_NODES_V1',
  geometryPolicy: 'REFINE_IN_UV_MAP_TO_EXACT_MIDSURFACE_V1',
  transitionPolicy: 'TARGET_RATIO_BOUNDED_BY_ADJACENT_SIZE_POLICY_V1',
  maximumNodes: LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
  maximumElements: LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  maximumEstimatedDofs: LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  repeatabilityPolicy: 'BYTE_IDENTICAL_CANONICAL_MESH_V1',
  rollbackPolicy: 'NO_CUSTODY_MUTATION_UNTIL_FULL_EVIDENCE_ACCEPTED',
});

export const LAFEA4_SHELL_REFINEMENT_CAPABILITY = freeze({
  ...capabilityCore,
  capabilityHash: canonicalLafeaSha256({
    schema: 'lafea4-shell-refinement-capability-hash-input/v1',
    capability: capabilityCore,
  }),
});

const qualificationCore = Object.freeze({
  schema: LAFEA4_SHELL_REFINEMENT_QUALIFICATION_SCHEMA,
  qualificationId: LAFEA4_SHELL_REFINEMENT_QUALIFICATION_ID,
  qualificationRevision: LAFEA4_SHELL_REFINEMENT_QUALIFICATION_REVISION,
  capabilityHash: LAFEA4_SHELL_REFINEMENT_CAPABILITY.capabilityHash,
  authorizedStageId: 'LAFEA.4',
  authorizedElementFamily: SHELL_TRI3,
  authorizedSurfaceKinds: Object.freeze(['CYLINDRICAL', 'CYLINDRICAL_HOLES']),
  authorizedGenerationMode: 'REFINEMENT_REGENERATION',
  authorizedExecutionScope: 'QUALIFICATION_HARNESS_ONLY',
  qualityAuthority: 'LAFEA4_STAGE_QUALIFIED_MESH_POLICY_PLUS_ADJACENT_SIZE_GATE',
  governanceRef: 'scripts/lafea-tech5-shell-local-refinement-check.mjs',
  invalidationPolicy: 'INVALIDATE_ON_REFINER_REVISION_OR_QUALITY_POLICY_CHANGE',
  productionBindingAuthorized: false,
  releaseQualified: false,
});

export const LAFEA4_SHELL_REFINEMENT_QUALIFICATION = freeze({
  ...qualificationCore,
  qualificationHash: canonicalLafeaSha256({
    schema: 'lafea4-shell-refinement-qualification-hash-input/v1',
    qualification: qualificationCore,
  }),
});

/** Qualification-harness command; it cannot establish product binding. */
export function createLafea4ShellRefinementCommand(value) {
  exact(value, COMMAND_KEYS);
  if (value.schema !== LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA_INVALID');
  }
  if (value.stageId !== 'LAFEA.4') fail('LAFEA4_SHELL_REFINEMENT_COMMAND_STAGE_INVALID');
  if (!['TARGET_LENGTH', 'DISCONTINUITY_ZONE', 'LOAD_ZONE', 'ATTACHMENT_ZONE'].includes(value.kind)) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_KIND_INVALID');
  }
  if (!['NODE', 'ELEMENT'].includes(value.targetType)) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_TARGET_TYPE_INVALID');
  }
  const command = Object.freeze({
    schema: LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
    commandId: text(value.commandId, 'COMMAND_ID'),
    stageId: 'LAFEA.4',
    parentMeshArtifactHash: sha256(value.parentMeshArtifactHash, 'PARENT_MESH_ARTIFACT_HASH'),
    parentMeshHash: sha256(value.parentMeshHash, 'PARENT_MESH_HASH'),
    kind: value.kind,
    targetType: value.targetType,
    targetIds: ids(value.targetIds),
    targetElementLength: positive(value.targetElementLength),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    reason: text(value.reason, 'REASON'),
  });
  return freeze({
    ...command,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-refinement-command-hash-input/v1', command,
    }),
    status: 'QUALIFICATION_ONLY_READY',
    executionScope: 'QUALIFICATION_HARNESS_ONLY',
    executionAuthorized: true,
    productionBindingAuthorized: false,
    capabilityHash: LAFEA4_SHELL_REFINEMENT_CAPABILITY.capabilityHash,
    qualificationHash: LAFEA4_SHELL_REFINEMENT_QUALIFICATION.qualificationHash,
    rollbackPolicy: LAFEA4_SHELL_REFINEMENT_CAPABILITY.rollbackPolicy,
  });
}

export function validateLafea4ShellRefinementCommand(value) {
  if (!value || value.schema !== LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_REQUIRED');
  }
  const {
    semanticHash, status, executionScope, executionAuthorized, productionBindingAuthorized,
    capabilityHash, qualificationHash, rollbackPolicy, ...input
  } = value;
  const rebuilt = createLafea4ShellRefinementCommand(input);
  if (rebuilt.semanticHash !== semanticHash
    || rebuilt.status !== status
    || rebuilt.executionScope !== executionScope
    || rebuilt.executionAuthorized !== executionAuthorized
    || rebuilt.productionBindingAuthorized !== productionBindingAuthorized
    || rebuilt.capabilityHash !== capabilityHash
    || rebuilt.qualificationHash !== qualificationHash
    || rebuilt.rollbackPolicy !== rollbackPolicy) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_TAMPERED');
  }
  return rebuilt;
}

function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    fail('LAFEA4_SHELL_REFINEMENT_COMMAND_KEYS_INVALID');
  }
}
function ids(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail('LAFEA4_SHELL_REFINEMENT_TARGET_IDS_INVALID');
  }
  const out = value.map((item) => text(item, 'TARGET_ID')).sort((a, b) => a.localeCompare(b));
  if (new Set(out).size !== out.length) fail('LAFEA4_SHELL_REFINEMENT_TARGET_IDS_DUPLICATE');
  return Object.freeze(out);
}
function positive(value) {
  if (!Number.isFinite(value) || value <= 0) fail('LAFEA4_SHELL_REFINEMENT_TARGET_LENGTH_INVALID');
  return value;
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA4_SHELL_REFINEMENT_${field}_INVALID`);
  return value.trim();
}
function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA4_SHELL_REFINEMENT_${field}_INVALID`);
  return out;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
