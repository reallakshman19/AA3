import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';

export const EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA = 'empirical-v3-calculation-branch-authority/v1';

export const EMPIRICAL_V3_BRANCH_COMMON_AUTHORITY_KINDS = Object.freeze([
  'PROCESS',
  'PIPING_CLASS',
  'MATERIAL_MAPPING',
  'INSULATION',
  'LOAD_PARTICIPATION',
]);

/**
 * Branch authority stores common governed basis once per calculation branch.
 * Component-local NPS/OD/WT/section/flexibility/weight is deliberately absent.
 */
export function sealEmpiricalV3BranchAuthority(input) {
  const normalized = normalizeBranchAuthority(input, false);
  const branchSamenessHash = computeEmpiricalV3BranchSamenessHash(normalized.commonAuthorityRefs);
  const branchIdentityHash = semanticHash({
    runId: normalized.runId,
    branchTopologyRef: normalized.branchTopologyRef,
    componentIds: normalized.componentIds,
  });
  const branchId = `branch:${branchIdentityHash.slice('fnv1a64:'.length)}`;
  const reviewBasisHash = semanticHash({
    branchId,
    branchSamenessHash,
    commonAuthorityRefs: normalized.commonAuthorityRefs,
    riskRefs: normalized.riskRefs,
  });
  const hash = semanticHash(branchSemanticProjection({
    ...normalized,
    branchId,
    branchSamenessHash,
    reviewBasisHash,
  }));
  return deepFreeze({
    ...normalized,
    branchId,
    branchSamenessHash,
    reviewBasisHash,
    semanticHash: hash,
  });
}

export function requireEmpiricalV3BranchAuthority(value) {
  const normalized = normalizeBranchAuthority(value, true);
  const accepted = sealEmpiricalV3BranchAuthority(normalized);
  if (
    value.branchId !== accepted.branchId
    || value.branchSamenessHash !== accepted.branchSamenessHash
    || value.reviewBasisHash !== accepted.reviewBasisHash
    || value.semanticHash !== accepted.semanticHash
  ) {
    throw new Error('Empirical V3 branch authority identity mismatch.');
  }
  return accepted;
}

export function computeEmpiricalV3BranchSamenessHash(commonAuthorityRefs) {
  const normalized = normalizeCommonAuthorityRefs(commonAuthorityRefs);
  return semanticHash({ commonAuthorityRefs: normalized });
}

export function branchSemanticProjection(value) {
  return {
    schema: value.schema,
    runId: value.runId,
    branchId: value.branchId,
    topologyRef: value.topologyRef,
    branchTopologyRef: value.branchTopologyRef,
    componentIds: value.componentIds,
    commonAuthorityRefs: value.commonAuthorityRefs,
    sourceEvidenceRefs: value.sourceEvidenceRefs,
    riskRefs: value.riskRefs,
    branchSamenessHash: value.branchSamenessHash,
    reviewBasisHash: value.reviewBasisHash,
  };
}

function normalizeBranchAuthority(input, sealed) {
  if (!input || typeof input !== 'object') throw new TypeError('Branch authority must be an object.');
  if (input.schema !== EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA}.`);
  }
  return {
    schema: input.schema,
    runId: requireText(input.runId, 'runId'),
    topologyRef: normalizeExactTopologyRef(input.topologyRef),
    branchTopologyRef: normalizeRef(input.branchTopologyRef, 'branchTopologyRef'),
    componentIds: uniqueTexts(input.componentIds, 'componentIds', true),
    commonAuthorityRefs: normalizeCommonAuthorityRefs(input.commonAuthorityRefs),
    sourceEvidenceRefs: normalizeRefs(input.sourceEvidenceRefs ?? [], 'sourceEvidenceRefs'),
    riskRefs: normalizeRefs(input.riskRefs ?? [], 'riskRefs'),
    branchId: sealed ? requireText(input.branchId, 'branchId') : '',
    branchSamenessHash: sealed ? requireText(input.branchSamenessHash, 'branchSamenessHash') : '',
    reviewBasisHash: sealed ? requireText(input.reviewBasisHash, 'reviewBasisHash') : '',
    semanticHash: sealed ? requireText(input.semanticHash, 'semanticHash') : '',
  };
}

function normalizeExactTopologyRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('topologyRef must be an object.');
  const authority = requireText(value.authority, 'topologyRef.authority');
  if (authority !== 'EXACT') throw new Error('Empirical V3 branch authority requires exact topology.');
  if (value.toleranceInferred === true) {
    throw new Error('Tolerance-inferred topology cannot define an Empirical V3 calculation branch.');
  }
  return {
    ref: requireText(value.ref, 'topologyRef.ref'),
    semanticHash: requireText(value.semanticHash, 'topologyRef.semanticHash'),
    authority,
    toleranceInferred: false,
  };
}

function normalizeCommonAuthorityRefs(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('commonAuthorityRefs must contain branch-common authority references.');
  }
  const refs = value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`commonAuthorityRefs[${index}] must be an object.`);
    const kind = requireText(item.kind, `commonAuthorityRefs[${index}].kind`);
    if (!EMPIRICAL_V3_BRANCH_COMMON_AUTHORITY_KINDS.includes(kind)) {
      throw new TypeError(`Unsupported branch-common authority kind: ${kind}.`);
    }
    return {
      kind,
      ref: requireText(item.ref, `commonAuthorityRefs[${index}].ref`),
      semanticHash: requireText(item.semanticHash, `commonAuthorityRefs[${index}].semanticHash`),
    };
  });
  const byKind = new Map();
  for (const ref of refs) {
    if (byKind.has(ref.kind)) throw new Error(`Duplicate branch-common authority kind: ${ref.kind}.`);
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

function uniqueTexts(value, fieldName, requireNonEmpty = false) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  const result = [...new Set(value.map((item, index) => requireText(item, `${fieldName}[${index}]`)))].sort();
  if (requireNonEmpty && result.length === 0) throw new TypeError(`${fieldName} must not be empty.`);
  return result;
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
