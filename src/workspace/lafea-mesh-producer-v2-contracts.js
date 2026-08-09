/**
 * Domain-first (v2) mesh plan and producer-output contracts.
 *
 * These mirror the v1 pair exactly, with one substitution: the domain-first
 * LAFEA.3 route has no compiled canonical model, so `canonicalModelHash` is
 * replaced by `analysisDomainHash` as the parent. Everything else — exact-key
 * rejection, hash reconstruction, qualification limit enforcement — is the
 * same discipline, because these records feed the same custody boundary.
 *
 * A plan still never carries engineering authority; the mesh content it
 * describes only becomes authoritative through analysis-mesh evidence v2.
 */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  canonicalLafeaAnalysisMesh,
  lafeaAnalysisMeshContentHash,
} from './lafea-analysis-mesh-contract.js';
import { validateLafeaMeshProducerQualification } from './lafea-mesh-producer-contract.js';
import { createLafeaMeshGenerationIntentV2 } from './lafea-domain-first-requests.js';

export const LAFEA_MESH_PLAN_V2_SCHEMA = 'lafea-mesh-plan/v2';
export const LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA = 'lafea-mesh-producer-output/v2';
export const LAFEA_MESH_PLAN_V2_RESOURCE_DISPOSITIONS = Object.freeze([
  'WITHIN_LIMITS', 'WARNING', 'BLOCK',
]);

const PLAN_KEYS = Object.freeze([
  'schema', 'stageId', 'intentHash', 'capabilityHash', 'qualificationHash',
  'producerId', 'producerRevision', 'sourceHash', 'analysisDomainHash',
  'analysisGeometryHash', 'meshProfileHash', 'elementFamily', 'estimatedNodes',
  'estimatedElements', 'estimatedDofs', 'characteristicLengthMin',
  'characteristicLengthMedian', 'characteristicLengthMax', 'refinementFeatureIds',
  'resourceDisposition',
]);
const OUTPUT_KEYS = Object.freeze([
  'schema', 'stageId', 'intentHash', 'planHash', 'capabilityHash', 'qualificationHash',
  'producerId', 'producerRevision', 'sourceHash', 'analysisDomainHash',
  'analysisGeometryHash', 'meshProfileHash', 'elementFamily', 'mesh',
]);
const INTENT_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'analysisDomainHash', 'analysisGeometryHash',
  'meshProfileHash', 'targetElementLength', 'lengthUnit', 'elementFamily',
  'curvatureToleranceDegrees', 'growthLimit', 'maximumNodes', 'maximumElements',
  'maximumEstimatedDofs', 'refinementFeatureIds', 'allowT3Fallback',
  'stageAdapterId', 'stageAdapterRevision',
]);

export function createLafeaMeshPlanV2(value) {
  requireExact(value, PLAN_KEYS, 'LAFEA_MESH_PLAN_V2_KEYS_INVALID');
  if (value.schema !== LAFEA_MESH_PLAN_V2_SCHEMA) fail('LAFEA_MESH_PLAN_V2_SCHEMA_INVALID');
  const record = {
    schema: LAFEA_MESH_PLAN_V2_SCHEMA,
    stageId: exactText(value.stageId, 'LAFEA.3', 'STAGE_ID'),
    intentHash: sha256(value.intentHash, 'INTENT_HASH'),
    capabilityHash: sha256(value.capabilityHash, 'CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    producerId: text(value.producerId, 'PRODUCER_ID'),
    producerRevision: text(value.producerRevision, 'PRODUCER_REVISION'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    analysisDomainHash: sha256(value.analysisDomainHash, 'ANALYSIS_DOMAIN_HASH'),
    analysisGeometryHash: sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    elementFamily: text(value.elementFamily, 'ELEMENT_FAMILY'),
    estimatedNodes: positiveInteger(value.estimatedNodes, 'ESTIMATED_NODES'),
    estimatedElements: positiveInteger(value.estimatedElements, 'ESTIMATED_ELEMENTS'),
    estimatedDofs: positiveInteger(value.estimatedDofs, 'ESTIMATED_DOFS'),
    characteristicLengthMin: positive(value.characteristicLengthMin, 'CHARACTERISTIC_LENGTH_MIN'),
    characteristicLengthMedian: positive(value.characteristicLengthMedian, 'CHARACTERISTIC_LENGTH_MEDIAN'),
    characteristicLengthMax: positive(value.characteristicLengthMax, 'CHARACTERISTIC_LENGTH_MAX'),
    refinementFeatureIds: canonicalIds(value.refinementFeatureIds),
    resourceDisposition: enumValue(
      value.resourceDisposition, LAFEA_MESH_PLAN_V2_RESOURCE_DISPOSITIONS, 'RESOURCE_DISPOSITION',
    ),
  };
  if (!(record.characteristicLengthMin <= record.characteristicLengthMedian
    && record.characteristicLengthMedian <= record.characteristicLengthMax)) {
    fail('LAFEA_MESH_PLAN_V2_CHARACTERISTIC_LENGTH_ORDER_INVALID');
  }
  return freeze({
    ...record,
    planHash: canonicalLafeaSha256({ schema: 'lafea-mesh-plan-hash-input/v2', record }),
    engineeringAuthority: false,
  });
}

export function validateLafeaMeshPlanV2(value, context) {
  const { planHash, engineeringAuthority, ...input } = value || {};
  const rebuilt = createLafeaMeshPlanV2(input);
  if (planHash !== rebuilt.planHash) fail('LAFEA_MESH_PLAN_V2_HASH_INVALID');
  if (engineeringAuthority !== false) fail('LAFEA_MESH_PLAN_V2_AUTHORITY_INVALID');
  const intent = rebuildIntent(context?.intent);
  const qualification = validateLafeaMeshProducerQualification(
    context?.qualification, context?.capability,
  );
  requireMatch(rebuilt.intentHash, intent.semanticHash, 'INTENT_HASH');
  requireMatch(rebuilt.capabilityHash, qualification.capabilityHash, 'CAPABILITY_HASH');
  requireMatch(rebuilt.qualificationHash, qualification.qualificationHash, 'QUALIFICATION_HASH');
  for (const field of [
    'stageId', 'sourceHash', 'analysisDomainHash', 'analysisGeometryHash',
    'meshProfileHash', 'elementFamily',
  ]) {
    requireMatch(rebuilt[field], intent[field], field.toUpperCase());
  }
  if (JSON.stringify(rebuilt.refinementFeatureIds) !== JSON.stringify(intent.refinementFeatureIds)) {
    fail('LAFEA_MESH_PLAN_V2_REFINEMENT_IDS_MISMATCH');
  }
  const exceeds = rebuilt.estimatedNodes > intent.maximumNodes
    || rebuilt.estimatedElements > intent.maximumElements
    || rebuilt.estimatedDofs > intent.maximumEstimatedDofs;
  if (exceeds && rebuilt.resourceDisposition !== 'BLOCK') {
    fail('LAFEA_MESH_PLAN_V2_RESOURCE_DISPOSITION_INVALID');
  }
  return rebuilt;
}

export function createLafeaMeshProducerOutputV2(value) {
  requireExact(value, OUTPUT_KEYS, 'LAFEA_MESH_PRODUCER_OUTPUT_V2_KEYS_INVALID');
  if (value.schema !== LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA) {
    fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA_INVALID');
  }
  const mesh = canonicalLafeaAnalysisMesh(value.mesh);
  const record = {
    schema: LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
    stageId: exactText(value.stageId, 'LAFEA.3', 'STAGE_ID'),
    intentHash: sha256(value.intentHash, 'INTENT_HASH'),
    planHash: sha256(value.planHash, 'PLAN_HASH'),
    capabilityHash: sha256(value.capabilityHash, 'CAPABILITY_HASH'),
    qualificationHash: sha256(value.qualificationHash, 'QUALIFICATION_HASH'),
    producerId: text(value.producerId, 'PRODUCER_ID'),
    producerRevision: text(value.producerRevision, 'PRODUCER_REVISION'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    analysisDomainHash: sha256(value.analysisDomainHash, 'ANALYSIS_DOMAIN_HASH'),
    analysisGeometryHash: sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    elementFamily: text(value.elementFamily, 'ELEMENT_FAMILY'),
    mesh,
  };
  if (mesh.elements.some((element) => element.elementType !== record.elementFamily)) {
    fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_ELEMENT_FAMILY_MISMATCH');
  }
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  return freeze({
    ...record,
    meshHash,
    outputHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-producer-output-hash-input/v2', record, meshHash,
    }),
    lifecycleAuthority: false,
  });
}

export function validateLafeaMeshProducerOutputV2(value, context) {
  const { meshHash, outputHash, lifecycleAuthority, ...input } = value || {};
  const rebuilt = createLafeaMeshProducerOutputV2(input);
  if (meshHash !== rebuilt.meshHash || outputHash !== rebuilt.outputHash) {
    fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_HASH_INVALID');
  }
  if (lifecycleAuthority !== false) fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_AUTHORITY_INVALID');
  const qualification = validateLafeaMeshProducerQualification(
    context?.qualification, context?.capability,
  );
  const plan = validateLafeaMeshPlanV2(context?.plan, context);
  requireMatch(rebuilt.capabilityHash, qualification.capabilityHash, 'CAPABILITY_HASH');
  requireMatch(rebuilt.qualificationHash, qualification.qualificationHash, 'QUALIFICATION_HASH');
  requireMatch(rebuilt.planHash, plan.planHash, 'PLAN_HASH');
  requireMatch(rebuilt.producerId, plan.producerId, 'PRODUCER_ID');
  requireMatch(rebuilt.producerRevision, plan.producerRevision, 'PRODUCER_REVISION');
  for (const field of [
    'stageId', 'sourceHash', 'analysisDomainHash', 'analysisGeometryHash',
    'meshProfileHash', 'elementFamily',
  ]) {
    requireMatch(rebuilt[field], plan[field], field.toUpperCase());
  }
  if (rebuilt.mesh.nodes.length > qualification.maximumNodes) {
    fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_NODE_LIMIT_EXCEEDED');
  }
  if (rebuilt.mesh.elements.length > qualification.maximumElements) {
    fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_ELEMENT_LIMIT_EXCEEDED');
  }
  if (plan.estimatedDofs > qualification.maximumEstimatedDofs) {
    fail('LAFEA_MESH_PRODUCER_OUTPUT_V2_DOF_LIMIT_EXCEEDED');
  }
  return rebuilt;
}

function rebuildIntent(value) {
  const input = Object.fromEntries(INTENT_KEYS.map((key) => [key, value?.[key]]));
  const rebuilt = createLafeaMeshGenerationIntentV2(input);
  if (value?.semanticHash !== rebuilt.semanticHash) fail('LAFEA_MESH_PLAN_V2_INTENT_HASH_INVALID');
  return rebuilt;
}
function requireMatch(actual, expected, field) {
  if (actual !== expected) fail(`LAFEA_MESH_V2_${field}_MISMATCH`);
}
function canonicalIds(value) {
  if (!Array.isArray(value)) fail('LAFEA_MESH_PLAN_V2_REFINEMENT_IDS_INVALID');
  const ids = value.map((id) => text(id, 'REFINEMENT_ID')).sort();
  if (new Set(ids).size !== ids.length) fail('LAFEA_MESH_PLAN_V2_REFINEMENT_IDS_DUPLICATE');
  return ids;
}
function requireExact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_V2_${field}_INVALID`); return value; }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_MESH_V2_${field}_INVALID`); return value; }
function sha256(value, field) { if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(`LAFEA_MESH_V2_${field}_INVALID`); return value; }
function positiveInteger(value, field) { if (!Number.isInteger(value) || value <= 0) fail(`LAFEA_MESH_V2_${field}_INVALID`); return value; }
function positive(value, field) { if (!Number.isFinite(value) || value <= 0) fail(`LAFEA_MESH_V2_${field}_INVALID`); return value; }
function enumValue(value, allowed, field) { if (!allowed.includes(value)) fail(`LAFEA_MESH_V2_${field}_INVALID`); return value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
