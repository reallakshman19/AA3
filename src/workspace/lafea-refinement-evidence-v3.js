/**
 * Reproducible refinement targeting and parent->child ancestry evidence.
 * These contracts do not enable refinement; current v3 adapter capabilities
 * keep refinement execution disabled until separately qualified.
 */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_REFINEMENT_SELECTOR_V3_SCHEMA = 'lafea-refinement-selector/v3';
export const LAFEA_REFINEMENT_REQUEST_V3_SCHEMA = 'lafea-refinement-request/v3';
export const LAFEA_REFINEMENT_ANCESTRY_V3_SCHEMA = 'lafea-refinement-ancestry/v3';
const STAGES = Object.freeze(['LAFEA.3', 'LAFEA.4', 'LAFEA.5']);
const SELECTOR_KEYS = Object.freeze([
  'schema', 'stageId', 'analysisGeometryHash', 'selectorKind', 'featureHash',
  'physicalRegionHash', 'errorIndicatorFieldHash', 'selectorPolicyHash',
]);
const REQUEST_KEYS = Object.freeze([
  'schema', 'stageId', 'parentMeshContentHash', 'parentEvidenceHash',
  'meshDependencyHash', 'selectorHash', 'targetElementLength', 'lengthUnit',
  'refinementMode',
]);
const ANCESTRY_KEYS = Object.freeze([
  'schema', 'stageId', 'parentMeshContentHash', 'parentEvidenceHash',
  'childMeshContentHash', 'childMeshDependencyHash', 'selectorHash',
  'parentToChildMappingHash', 'replacedParentRegionHash', 'childCoverageHash',
  'boundaryTransferHash', 'loadBcTransferHash', 'materialPropertyTransferHash',
  'selectedFeatureContinuityHash', 'conformityPolicyHash', 'hangingNodePolicy',
]);

export function createLafeaRefinementSelectorV3(value) {
  exact(value, SELECTOR_KEYS, 'LAFEA_REFINEMENT_V3_SELECTOR_KEYS_INVALID');
  const selectorKind = enumValue(value.selectorKind, [
    'MANUAL_GEOMETRY_REGION', 'MANUAL_PHYSICAL_REGION', 'ADAPTIVE_ERROR_INDICATOR_REGION',
  ], 'SELECTOR_KIND');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_REFINEMENT_SELECTOR_V3_SCHEMA, 'SELECTOR_SCHEMA'),
    stageId: stage(value.stageId),
    analysisGeometryHash: sha(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    selectorKind,
    featureHash: optionalSha(value.featureHash, 'FEATURE_HASH'),
    physicalRegionHash: sha(value.physicalRegionHash, 'PHYSICAL_REGION_HASH'),
    errorIndicatorFieldHash: optionalSha(value.errorIndicatorFieldHash, 'ERROR_INDICATOR_FIELD_HASH'),
    selectorPolicyHash: sha(value.selectorPolicyHash, 'SELECTOR_POLICY_HASH'),
  });
  if (selectorKind === 'MANUAL_GEOMETRY_REGION' && record.featureHash === null) {
    fail('LAFEA_REFINEMENT_V3_GEOMETRY_FEATURE_REQUIRED');
  }
  if (selectorKind !== 'MANUAL_GEOMETRY_REGION' && record.featureHash !== null) {
    fail('LAFEA_REFINEMENT_V3_FEATURE_HASH_NOT_APPLICABLE');
  }
  const adaptive = selectorKind === 'ADAPTIVE_ERROR_INDICATOR_REGION';
  if (adaptive !== (record.errorIndicatorFieldHash !== null)) {
    fail('LAFEA_REFINEMENT_V3_ERROR_INDICATOR_BINDING_INVALID');
  }
  return freeze({
    ...record,
    selectorHash: canonicalLafeaSha256({
      schema: 'lafea-refinement-selector-hash-input/v3', selector: record,
    }),
    engineeringAuthority: false,
  });
}

export function createLafeaRefinementRequestV3(value) {
  exact(value, REQUEST_KEYS, 'LAFEA_REFINEMENT_V3_REQUEST_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_REFINEMENT_REQUEST_V3_SCHEMA, 'REQUEST_SCHEMA'),
    stageId: stage(value.stageId),
    parentMeshContentHash: sha(value.parentMeshContentHash, 'PARENT_MESH_CONTENT_HASH'),
    parentEvidenceHash: sha(value.parentEvidenceHash, 'PARENT_EVIDENCE_HASH'),
    meshDependencyHash: sha(value.meshDependencyHash, 'MESH_DEPENDENCY_HASH'),
    selectorHash: sha(value.selectorHash, 'SELECTOR_HASH'),
    targetElementLength: positive(value.targetElementLength, 'TARGET_ELEMENT_LENGTH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    refinementMode: enumValue(value.refinementMode, ['MANUAL_LOCAL', 'ADAPTIVE_SOLUTION_DRIVEN'], 'REFINEMENT_MODE'),
  });
  return freeze({
    ...record,
    requestHash: canonicalLafeaSha256({
      schema: 'lafea-refinement-request-hash-input/v3', request: record,
    }),
    executionAuthorized: false,
    engineeringAuthority: false,
  });
}

export function createLafeaRefinementAncestryV3(value) {
  exact(value, ANCESTRY_KEYS, 'LAFEA_REFINEMENT_V3_ANCESTRY_KEYS_INVALID');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_REFINEMENT_ANCESTRY_V3_SCHEMA, 'ANCESTRY_SCHEMA'),
    stageId: stage(value.stageId),
    parentMeshContentHash: sha(value.parentMeshContentHash, 'PARENT_MESH_CONTENT_HASH'),
    parentEvidenceHash: sha(value.parentEvidenceHash, 'PARENT_EVIDENCE_HASH'),
    childMeshContentHash: sha(value.childMeshContentHash, 'CHILD_MESH_CONTENT_HASH'),
    childMeshDependencyHash: sha(value.childMeshDependencyHash, 'CHILD_MESH_DEPENDENCY_HASH'),
    selectorHash: sha(value.selectorHash, 'SELECTOR_HASH'),
    parentToChildMappingHash: sha(value.parentToChildMappingHash, 'PARENT_TO_CHILD_MAPPING_HASH'),
    replacedParentRegionHash: sha(value.replacedParentRegionHash, 'REPLACED_PARENT_REGION_HASH'),
    childCoverageHash: sha(value.childCoverageHash, 'CHILD_COVERAGE_HASH'),
    boundaryTransferHash: sha(value.boundaryTransferHash, 'BOUNDARY_TRANSFER_HASH'),
    loadBcTransferHash: sha(value.loadBcTransferHash, 'LOAD_BC_TRANSFER_HASH'),
    materialPropertyTransferHash: sha(value.materialPropertyTransferHash, 'MATERIAL_PROPERTY_TRANSFER_HASH'),
    selectedFeatureContinuityHash: sha(value.selectedFeatureContinuityHash, 'SELECTED_FEATURE_CONTINUITY_HASH'),
    conformityPolicyHash: sha(value.conformityPolicyHash, 'CONFORMITY_POLICY_HASH'),
    hangingNodePolicy: exactText(value.hangingNodePolicy, 'FORBIDDEN', 'HANGING_NODE_POLICY'),
  });
  if (record.parentMeshContentHash === record.childMeshContentHash) {
    fail('LAFEA_REFINEMENT_V3_CHILD_MUST_DIFFER_FROM_PARENT');
  }
  return freeze({
    ...record,
    ancestryHash: canonicalLafeaSha256({
      schema: 'lafea-refinement-ancestry-hash-input/v3', ancestry: record,
    }),
    engineeringAuthority: false,
  });
}

function stage(value) { return enumValue(value, STAGES, 'STAGE_ID'); }
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_REFINEMENT_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_REFINEMENT_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_REFINEMENT_V3_${field}_INVALID`);
  return out;
}
function optionalSha(value, field) { return value === null ? null : sha(value, field); }
function positive(value, field) {
  if (!Number.isFinite(value) || value <= 0) fail(`LAFEA_REFINEMENT_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_REFINEMENT_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
