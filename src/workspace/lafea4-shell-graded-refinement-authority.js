import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
} from './lafea-mesh-producer-registry.js';

export const LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA =
  'lafea4-shell-graded-refinement-command/v1';
export const LAFEA4_GRADED_REFINEMENT_PRODUCER_ID = 'LAFEA4_SHELL_UV_GRADED_REFINER';
export const LAFEA4_GRADED_REFINEMENT_PRODUCER_REVISION = 'BOUNDARY_GRADED_TRI3_V1';
export const LAFEA4_GRADED_REFINEMENT_QUALIFICATION_ID = 'LAFEA4-SHELL-REFINE-Q2';
export const LAFEA4_GRADED_REFINEMENT_QUALIFICATION_REVISION = 'R1';
export const LAFEA4_GRADED_REFINEMENT_PRODUCER_REF =
  `${LAFEA4_GRADED_REFINEMENT_PRODUCER_ID}/${LAFEA4_GRADED_REFINEMENT_PRODUCER_REVISION}/${LAFEA4_GRADED_REFINEMENT_QUALIFICATION_ID}`;

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const INPUT_KEYS = Object.freeze([
  'schema', 'commandId', 'stageId', 'parentMeshArtifactHash', 'parentMeshHash',
  'targetType', 'targetIds', 'targetElementLength', 'lengthUnit', 'reason',
]);

const capabilityCore = Object.freeze({
  schema: 'lafea4-shell-graded-refinement-capability/v1',
  producerId: LAFEA4_GRADED_REFINEMENT_PRODUCER_ID,
  producerRevision: LAFEA4_GRADED_REFINEMENT_PRODUCER_REVISION,
  stageId: 'LAFEA.4',
  elementFamily: SHELL_TRI3,
  generationMode: 'REFINEMENT_REGENERATION',
  executionScope: 'QUALIFICATION_HARNESS_ONLY',
  surfaceKinds: Object.freeze(['CYLINDRICAL', 'CYLINDRICAL_HOLES']),
  transitionPolicy: 'TECH6_GRADED_TRANSITION_PLAN_V1',
  boundaryPolicy: 'SUBDIVIDE_EXACT_UV_BOUNDARY_PRESERVE_PARENT_SEGMENT_ID_V1',
  topologyPolicy: 'CONSTRAINED_DELAUNAY_TRI3_NO_HANGING_NODES_V1',
  geometryPolicy: 'MAP_EVERY_CHILD_NODE_TO_EXACT_MIDSURFACE_V1',
  maximumNodes: LAFEA_MESH_PRODUCER_MAXIMUM_NODES,
  maximumElements: LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS,
  maximumEstimatedDofs: LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS,
  repeatabilityPolicy: 'BYTE_IDENTICAL_CANONICAL_MESH_V1',
  rollbackPolicy: 'QUALIFICATION_ARTIFACT_ONLY_NO_PRODUCT_CUSTODY_MUTATION',
});
export const LAFEA4_GRADED_REFINEMENT_CAPABILITY = freeze({
  ...capabilityCore,
  capabilityHash: canonicalLafeaSha256({
    schema: 'lafea4-shell-graded-refinement-capability-hash-input/v1',
    capability: capabilityCore,
  }),
});

const qualificationCore = Object.freeze({
  schema: 'lafea4-shell-graded-refinement-qualification/v1',
  qualificationId: LAFEA4_GRADED_REFINEMENT_QUALIFICATION_ID,
  qualificationRevision: LAFEA4_GRADED_REFINEMENT_QUALIFICATION_REVISION,
  capabilityHash: LAFEA4_GRADED_REFINEMENT_CAPABILITY.capabilityHash,
  authorizedStageId: 'LAFEA.4',
  authorizedElementFamily: SHELL_TRI3,
  authorizedSurfaceKinds: Object.freeze(['CYLINDRICAL', 'CYLINDRICAL_HOLES']),
  authorizedExecutionScope: 'QUALIFICATION_HARNESS_ONLY',
  qualityAuthority: 'TECH1_RETAINED_MESH_QUALITY_PLUS_TECH6_GRADED_PLAN',
  governanceRef: 'scripts/lafea-tech7-graded-refinement-executor-check.mjs',
  productionBindingAuthorized: false,
  releaseQualified: false,
});
export const LAFEA4_GRADED_REFINEMENT_QUALIFICATION = freeze({
  ...qualificationCore,
  qualificationHash: canonicalLafeaSha256({
    schema: 'lafea4-shell-graded-refinement-qualification-hash-input/v1',
    qualification: qualificationCore,
  }),
});

export function createLafea4GradedRefinementCommand(value) {
  exact(value, INPUT_KEYS);
  if (value.schema !== LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA_INVALID');
  }
  if (value.stageId !== 'LAFEA.4') fail('LAFEA4_GRADED_REFINEMENT_COMMAND_STAGE_INVALID');
  if (!['NODE', 'ELEMENT'].includes(value.targetType)) {
    fail('LAFEA4_GRADED_REFINEMENT_TARGET_TYPE_INVALID');
  }
  const input = Object.freeze({
    schema: LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
    commandId: text(value.commandId, 'COMMAND_ID'),
    stageId: 'LAFEA.4',
    parentMeshArtifactHash: sha(value.parentMeshArtifactHash, 'PARENT_ARTIFACT_HASH'),
    parentMeshHash: sha(value.parentMeshHash, 'PARENT_MESH_HASH'),
    targetType: value.targetType,
    targetIds: ids(value.targetIds),
    targetElementLength: positive(value.targetElementLength),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    reason: text(value.reason, 'REASON'),
  });
  return freeze({
    ...input,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-graded-refinement-command-hash-input/v1', command: input,
    }),
    status: 'QUALIFICATION_ONLY_READY',
    executionScope: 'QUALIFICATION_HARNESS_ONLY',
    executionAuthorized: true,
    productionBindingAuthorized: false,
    capabilityHash: LAFEA4_GRADED_REFINEMENT_CAPABILITY.capabilityHash,
    qualificationHash: LAFEA4_GRADED_REFINEMENT_QUALIFICATION.qualificationHash,
  });
}

export function validateLafea4GradedRefinementCommand(value) {
  if (!value || value.schema !== LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA4_GRADED_REFINEMENT_COMMAND_REQUIRED');
  }
  const {
    semanticHash, status, executionScope, executionAuthorized, productionBindingAuthorized,
    capabilityHash, qualificationHash, ...input
  } = value;
  const rebuilt = createLafea4GradedRefinementCommand(input);
  if (rebuilt.semanticHash !== semanticHash
    || rebuilt.status !== status
    || rebuilt.executionScope !== executionScope
    || rebuilt.executionAuthorized !== executionAuthorized
    || rebuilt.productionBindingAuthorized !== productionBindingAuthorized
    || rebuilt.capabilityHash !== capabilityHash
    || rebuilt.qualificationHash !== qualificationHash) {
    fail('LAFEA4_GRADED_REFINEMENT_COMMAND_TAMPERED');
  }
  return rebuilt;
}

function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    fail('LAFEA4_GRADED_REFINEMENT_COMMAND_KEYS_INVALID');
  }
}
function ids(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    fail('LAFEA4_GRADED_REFINEMENT_TARGET_IDS_INVALID');
  }
  const rows = value.map((id) => text(id, 'TARGET_ID')).sort((a, b) => a.localeCompare(b));
  if (new Set(rows).size !== rows.length) fail('LAFEA4_GRADED_REFINEMENT_TARGET_IDS_DUPLICATE');
  return Object.freeze(rows);
}
function positive(value) {
  if (!Number.isFinite(value) || value <= 0) fail('LAFEA4_GRADED_REFINEMENT_TARGET_LENGTH_INVALID');
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA4_GRADED_REFINEMENT_${field}_INVALID`);
  return out;
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA4_GRADED_REFINEMENT_${field}_INVALID`);
  return value.trim();
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
