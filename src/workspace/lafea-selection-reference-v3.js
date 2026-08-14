/** Typed engineering-selection references. IDs are never meaningful without their authority namespace. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SELECTION_REFERENCE_V3_SCHEMA = 'lafea-selection-reference/v3';
export const LAFEA_SELECTION_KINDS_V3 = Object.freeze([
  'GEOMETRY_FEATURE', 'MESH_NODE', 'MESH_ELEMENT', 'INTEGRATION_POINT',
  'PHYSICAL_REGION', 'RESULT_PROBE',
]);
const STAGES = Object.freeze(['LAFEA.3', 'LAFEA.4', 'LAFEA.5']);
const TOP_KEYS = Object.freeze(['schema', 'kind', 'stageId', 'locator']);

export function createLafeaSelectionReferenceV3(value) {
  exact(value, TOP_KEYS, 'LAFEA_SELECTION_V3_KEYS_INVALID');
  const kind = enumValue(value.kind, LAFEA_SELECTION_KINDS_V3, 'KIND');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_SELECTION_REFERENCE_V3_SCHEMA, 'SCHEMA'),
    kind,
    stageId: enumValue(value.stageId, STAGES, 'STAGE_ID'),
    locator: locator(kind, value.locator),
  });
  return freeze({
    ...record,
    selectionHash: canonicalLafeaSha256({
      schema: 'lafea-selection-reference-hash-input/v3', selection: record,
    }),
    engineeringAuthority: false,
  });
}

export function validateLafeaSelectionReferenceV3(value) {
  const { selectionHash, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaSelectionReferenceV3(input);
  if (selectionHash !== rebuilt.selectionHash) fail('LAFEA_SELECTION_V3_HASH_INVALID');
  if (engineeringAuthority !== false) fail('LAFEA_SELECTION_V3_AUTHORITY_INVALID');
  return rebuilt;
}

export function classifyLafeaSelectionTransitionV3(selectionValue, context) {
  const selection = validateLafeaSelectionReferenceV3(selectionValue);
  const nextStageId = enumValue(context?.stageId, STAGES, 'NEXT_STAGE_ID');
  if (nextStageId !== selection.stageId) return 'INVALIDATE_STAGE_CHANGED';
  if (selection.kind === 'MESH_NODE' || selection.kind === 'MESH_ELEMENT'
    || selection.kind === 'INTEGRATION_POINT') {
    const nextMeshContentHash = sha256(context?.meshContentHash, 'NEXT_MESH_CONTENT_HASH');
    return nextMeshContentHash === selection.locator.meshContentHash
      ? 'PRESERVE_EXACT_MESH'
      : 'INVALIDATE_MESH_CHANGED';
  }
  if (selection.kind === 'GEOMETRY_FEATURE' || selection.kind === 'PHYSICAL_REGION') {
    const nextGeometryHash = sha256(context?.analysisGeometryHash, 'NEXT_ANALYSIS_GEOMETRY_HASH');
    return nextGeometryHash === selection.locator.analysisGeometryHash
      ? 'PRESERVE_EXACT_GEOMETRY'
      : 'TRANSFORM_REQUIRES_PROVEN_ANCESTRY';
  }
  return 'TRANSFORM_REQUIRES_PROVEN_PHYSICAL_PROBE_ANCESTRY';
}

function locator(kind, value) {
  if (kind === 'GEOMETRY_FEATURE') return geometryFeature(value);
  if (kind === 'MESH_NODE') return meshEntity(value, 'nodeId', 'NODE_ID');
  if (kind === 'MESH_ELEMENT') return meshEntity(value, 'elementId', 'ELEMENT_ID');
  if (kind === 'INTEGRATION_POINT') {
    exact(value, ['meshContentHash', 'elementId', 'integrationPointId'], 'LAFEA_SELECTION_V3_INTEGRATION_POINT_KEYS_INVALID');
    return freeze({
      meshContentHash: sha256(value.meshContentHash, 'MESH_CONTENT_HASH'),
      elementId: text(value.elementId, 'ELEMENT_ID'),
      integrationPointId: text(value.integrationPointId, 'INTEGRATION_POINT_ID'),
    });
  }
  if (kind === 'PHYSICAL_REGION') {
    exact(value, ['analysisGeometryHash', 'regionHash'], 'LAFEA_SELECTION_V3_PHYSICAL_REGION_KEYS_INVALID');
    return freeze({
      analysisGeometryHash: sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
      regionHash: sha256(value.regionHash, 'REGION_HASH'),
    });
  }
  exact(value, ['responseFunctionalHash', 'probeId', 'physicalLocatorHash'], 'LAFEA_SELECTION_V3_RESULT_PROBE_KEYS_INVALID');
  return freeze({
    responseFunctionalHash: sha256(value.responseFunctionalHash, 'RESPONSE_FUNCTIONAL_HASH'),
    probeId: text(value.probeId, 'PROBE_ID'),
    physicalLocatorHash: sha256(value.physicalLocatorHash, 'PHYSICAL_LOCATOR_HASH'),
  });
}
function geometryFeature(value) {
  exact(value, ['analysisGeometryHash', 'featureId'], 'LAFEA_SELECTION_V3_GEOMETRY_FEATURE_KEYS_INVALID');
  return freeze({
    analysisGeometryHash: sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    featureId: text(value.featureId, 'FEATURE_ID'),
  });
}
function meshEntity(value, idKey, idField) {
  exact(value, ['meshContentHash', idKey], `LAFEA_SELECTION_V3_${idField}_KEYS_INVALID`);
  return freeze({
    meshContentHash: sha256(value.meshContentHash, 'MESH_CONTENT_HASH'),
    [idKey]: text(value[idKey], idField),
  });
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SELECTION_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_SELECTION_V3_${field}_INVALID`);
  return value;
}
function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_SELECTION_V3_${field}_INVALID`);
  return out;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_SELECTION_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
