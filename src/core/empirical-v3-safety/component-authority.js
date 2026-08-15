import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3BranchAuthority } from './branch-authority.js';

export const EMPIRICAL_V3_COMPONENT_AUTHORITY_SCHEMA = 'empirical-v3-component-authority/v1';

export const EMPIRICAL_V3_COMPONENT_LOCAL_AUTHORITY_KINDS = Object.freeze([
  'IDENTITY',
  'GEOMETRY',
  'NPS',
  'OD',
  'WT',
  'SECTION',
  'MATERIAL_AT_TEMPERATURE',
  'FLEXIBILITY',
  'WEIGHT',
  'COG',
]);

/**
 * Component authority owns component-local engineering resolution only.
 * Branch-common process/class/material-mapping/insulation is referenced through
 * branchRef and must not be copied into localAuthorityRefs.
 */
export function sealEmpiricalV3ComponentAuthority(input) {
  const normalized = normalizeComponentAuthority(input, false);
  const hash = semanticHash(componentSemanticProjection(normalized));
  return deepFreeze({
    ...normalized,
    semanticHash: hash,
  });
}

export function requireEmpiricalV3ComponentAuthority(value) {
  const normalized = normalizeComponentAuthority(value, true);
  const expectedHash = semanticHash(componentSemanticProjection(normalized));
  if (normalized.semanticHash !== expectedHash) {
    throw new Error('Empirical V3 component authority semantic hash mismatch.');
  }
  return deepFreeze(normalized);
}

export function componentSemanticProjection(value) {
  return {
    schema: value.schema,
    runId: value.runId,
    branchRef: value.branchRef,
    componentId: value.componentId,
    componentType: value.componentType,
    topologyComponentRef: value.topologyComponentRef,
    localAuthorityRefs: value.localAuthorityRefs,
    sourceEvidenceRefs: value.sourceEvidenceRefs,
    riskRefs: value.riskRefs,
  };
}

export function componentRefForAuthorization(value) {
  const component = requireEmpiricalV3ComponentAuthority(value);
  return {
    kind: 'COMPONENT',
    ref: component.componentId,
    semanticHash: component.semanticHash,
  };
}

export function bindComponentToBranch(input, branchValue) {
  const branch = requireEmpiricalV3BranchAuthority(branchValue);
  const componentId = requireText(input?.componentId, 'componentId');
  if (!branch.componentIds.includes(componentId)) {
    throw new Error(`Component ${componentId} is not a member of branch ${branch.branchId}.`);
  }
  return sealEmpiricalV3ComponentAuthority({
    ...input,
    schema: EMPIRICAL_V3_COMPONENT_AUTHORITY_SCHEMA,
    runId: branch.runId,
    branchRef: {
      branchId: branch.branchId,
      semanticHash: branch.semanticHash,
      reviewBasisHash: branch.reviewBasisHash,
    },
    componentId,
  });
}

function normalizeComponentAuthority(input, sealed) {
  if (!input || typeof input !== 'object') throw new TypeError('Component authority must be an object.');
  if (input.schema !== EMPIRICAL_V3_COMPONENT_AUTHORITY_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_COMPONENT_AUTHORITY_SCHEMA}.`);
  }
  return {
    schema: input.schema,
    runId: requireText(input.runId, 'runId'),
    branchRef: normalizeBranchRef(input.branchRef),
    componentId: requireText(input.componentId, 'componentId'),
    componentType: requireText(input.componentType, 'componentType'),
    topologyComponentRef: normalizeRef(input.topologyComponentRef, 'topologyComponentRef'),
    localAuthorityRefs: normalizeLocalAuthorityRefs(input.localAuthorityRefs),
    sourceEvidenceRefs: normalizeRefs(input.sourceEvidenceRefs ?? [], 'sourceEvidenceRefs'),
    riskRefs: normalizeRefs(input.riskRefs ?? [], 'riskRefs'),
    semanticHash: sealed ? requireText(input.semanticHash, 'semanticHash') : '',
  };
}

function normalizeBranchRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('branchRef must be an object.');
  return {
    branchId: requireText(value.branchId, 'branchRef.branchId'),
    semanticHash: requireText(value.semanticHash, 'branchRef.semanticHash'),
    reviewBasisHash: requireText(value.reviewBasisHash, 'branchRef.reviewBasisHash'),
  };
}

function normalizeLocalAuthorityRefs(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('localAuthorityRefs must contain component-local authority references.');
  }
  const refs = value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`localAuthorityRefs[${index}] must be an object.`);
    const kind = requireText(item.kind, `localAuthorityRefs[${index}].kind`);
    if (!EMPIRICAL_V3_COMPONENT_LOCAL_AUTHORITY_KINDS.includes(kind)) {
      throw new TypeError(`Unsupported component-local authority kind: ${kind}.`);
    }
    return {
      kind,
      ref: requireText(item.ref, `localAuthorityRefs[${index}].ref`),
      semanticHash: requireText(item.semanticHash, `localAuthorityRefs[${index}].semanticHash`),
    };
  });
  const byKind = new Map();
  for (const ref of refs) {
    if (byKind.has(ref.kind)) throw new Error(`Duplicate component-local authority kind: ${ref.kind}.`);
    byKind.set(ref.kind, ref);
  }
  return [...byKind.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}

function normalizeRef(value, fieldName) {
  if (!value || typeof value !== 'object') throw new TypeError(`${fieldName} must be an object.`);
  return {
    ref: requireText(value.ref, `${fieldName}.ref`),
    semanticHash: requireText(value.semanticHash, `${fieldName}.semanticHash`),
  };
}

function normalizeRefs(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  const refs = value.map((item, index) => normalizeRef(item, `${fieldName}[${index}]`));
  const map = new Map();
  for (const ref of refs) map.set(`${ref.ref}\u0000${ref.semanticHash}`, ref);
  return [...map.values()].sort((a, b) => (
    a.ref.localeCompare(b.ref) || a.semanticHash.localeCompare(b.semanticHash)
  ));
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
