import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';

export const ENGINEERING_RISK_FINDING_SCHEMA = 'engineering-risk-finding/v1';
export const ENGINEERING_RISK_SET_SCHEMA = 'engineering-risk-set/v1';

export const ENGINEERING_RISK_CLASSES = Object.freeze([
  'HIGH_BLOCK',
  'HIGH_CONFIRM',
  'MEDIUM',
  'LOW',
]);

const RISK_CLASS_ORDER = Object.freeze({
  HIGH_BLOCK: 0,
  HIGH_CONFIRM: 1,
  MEDIUM: 2,
  LOW: 3,
});

/**
 * Immutable engineering risk record. Presentation state, sort/filter state,
 * camera state and rendered message text are intentionally absent from the
 * semantic projection.
 */
export function sealEngineeringRiskFinding(input) {
  const normalized = normalizeRiskFinding(input, false);
  const hash = semanticHash(riskSemanticProjection(normalized));
  return deepFreeze({
    ...normalized,
    riskId: riskIdFromHash(hash),
    semanticHash: hash,
  });
}

export function requireEngineeringRiskFinding(value) {
  const normalized = normalizeRiskFinding(value, true);
  const expectedHash = semanticHash(riskSemanticProjection(normalized));
  if (normalized.semanticHash !== expectedHash) {
    throw new Error('Engineering risk semantic hash mismatch.');
  }
  if (normalized.riskId !== riskIdFromHash(expectedHash)) {
    throw new Error('Engineering risk ID does not match its semantic hash.');
  }
  return deepFreeze(normalized);
}

export function sealEngineeringRiskSet(input) {
  const runId = requireText(input?.runId, 'runId');
  const risks = requireRiskArray(input?.risks).sort(compareRisks);
  const counts = Object.fromEntries(ENGINEERING_RISK_CLASSES.map((riskClass) => [
    riskClass,
    risks.filter((risk) => risk.riskClass === riskClass).length,
  ]));
  const semanticFields = {
    schema: ENGINEERING_RISK_SET_SCHEMA,
    runId,
    riskRefs: risks.map(riskReference),
    counts,
  };
  const hash = semanticHash(semanticFields);
  return deepFreeze({
    ...semanticFields,
    riskSetId: `risk-set:${hash.slice('fnv1a64:'.length)}`,
    risks,
    semanticHash: hash,
  });
}

export function requireEngineeringRiskSet(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Engineering risk set must be an object.');
  if (value.schema !== ENGINEERING_RISK_SET_SCHEMA) {
    throw new TypeError(`Expected schema ${ENGINEERING_RISK_SET_SCHEMA}.`);
  }
  const accepted = sealEngineeringRiskSet({ runId: value.runId, risks: value.risks });
  if (value.semanticHash !== accepted.semanticHash || value.riskSetId !== accepted.riskSetId) {
    throw new Error('Engineering risk set identity mismatch.');
  }
  if (semanticHash(value.counts) !== semanticHash(accepted.counts)) {
    throw new Error('Engineering risk set counts do not match its risks.');
  }
  return accepted;
}

export function riskSemanticProjection(value) {
  return {
    schema: value.schema,
    riskCode: value.riskCode,
    riskClass: value.riskClass,
    runId: value.runId,
    scope: value.scope,
    reasonCode: value.reasonCode,
    messageParameters: value.messageParameters,
    valueSnapshot: value.valueSnapshot,
    authorityRefs: value.authorityRefs,
    sourceRefs: value.sourceRefs,
    governingDependencyRefs: value.governingDependencyRefs,
  };
}

export function riskReference(value) {
  const risk = requireEngineeringRiskFinding(value);
  return {
    riskId: risk.riskId,
    riskCode: risk.riskCode,
    riskClass: risk.riskClass,
    semanticHash: risk.semanticHash,
  };
}

function normalizeRiskFinding(input, sealed) {
  if (!input || typeof input !== 'object') throw new TypeError('Engineering risk finding must be an object.');
  const riskClass = requireEnum(input.riskClass, ENGINEERING_RISK_CLASSES, 'riskClass');
  return {
    schema: requireSchema(input.schema),
    riskId: sealed ? requireText(input.riskId, 'riskId') : '',
    riskCode: requireText(input.riskCode, 'riskCode'),
    riskClass,
    runId: requireText(input.runId, 'runId'),
    scope: normalizeScope(input.scope),
    reasonCode: requireText(input.reasonCode, 'reasonCode'),
    messageParameters: normalizeJsonRecord(input.messageParameters ?? {}, 'messageParameters'),
    valueSnapshot: normalizeValueSnapshot(input.valueSnapshot),
    authorityRefs: normalizeRefs(input.authorityRefs ?? [], 'authorityRefs'),
    sourceRefs: normalizeRefs(input.sourceRefs ?? [], 'sourceRefs'),
    governingDependencyRefs: normalizeRefs(
      input.governingDependencyRefs ?? [],
      'governingDependencyRefs',
      true,
    ),
    semanticHash: sealed ? requireText(input.semanticHash, 'semanticHash') : '',
  };
}

function normalizeScope(value) {
  const record = value && typeof value === 'object' ? value : {};
  return {
    branchId: optionalText(record.branchId),
    entityIds: uniqueTexts(record.entityIds ?? [], 'scope.entityIds'),
    quantityIds: uniqueTexts(record.quantityIds ?? [], 'scope.quantityIds'),
  };
}

function normalizeValueSnapshot(value) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object') throw new TypeError('valueSnapshot must be an object or null.');
  return {
    value: value.value === null ? null : requireFinite(value.value, 'valueSnapshot.value'),
    unit: requireText(value.unit, 'valueSnapshot.unit'),
    authorityClass: requireText(value.authorityClass, 'valueSnapshot.authorityClass'),
  };
}

function normalizeRefs(value, fieldName, requireHash = false) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  const refs = value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`${fieldName}[${index}] must be an object.`);
    const ref = requireText(item.ref, `${fieldName}[${index}].ref`);
    const semanticHashValue = optionalText(item.semanticHash);
    if (requireHash && !semanticHashValue) {
      throw new TypeError(`${fieldName}[${index}].semanticHash is required.`);
    }
    return { ref, semanticHash: semanticHashValue };
  });
  const byIdentity = new Map();
  for (const ref of refs) {
    const key = `${ref.ref}\u0000${ref.semanticHash ?? ''}`;
    byIdentity.set(key, ref);
  }
  return [...byIdentity.values()].sort((a, b) => (
    a.ref.localeCompare(b.ref) || String(a.semanticHash ?? '').localeCompare(String(b.semanticHash ?? ''))
  ));
}

function compareRisks(a, b) {
  return RISK_CLASS_ORDER[a.riskClass] - RISK_CLASS_ORDER[b.riskClass]
    || a.riskCode.localeCompare(b.riskCode)
    || a.riskId.localeCompare(b.riskId);
}

function riskIdFromHash(hash) {
  return `risk:${hash.slice('fnv1a64:'.length)}`;
}

function requireRiskArray(value) {
  if (!Array.isArray(value)) throw new TypeError('risks must be an array.');
  const risks = value.map(requireEngineeringRiskFinding);
  if (new Set(risks.map((risk) => risk.riskId)).size !== risks.length) {
    throw new Error('Engineering risk set contains duplicate risk identities.');
  }
  return risks;
}

function normalizeJsonRecord(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object.`);
  }
  const normalized = JSON.parse(JSON.stringify(value));
  semanticHash(normalized);
  return normalized;
}

function uniqueTexts(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  return [...new Set(value.map((item, index) => requireText(item, `${fieldName}[${index}]`)))].sort();
}

function requireSchema(value) {
  if (value !== ENGINEERING_RISK_FINDING_SCHEMA) {
    throw new TypeError(`Expected schema ${ENGINEERING_RISK_FINDING_SCHEMA}.`);
  }
  return value;
}

function requireEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) throw new TypeError(`${fieldName} is invalid.`);
  return value;
}

function requireFinite(value, fieldName) {
  if (!Number.isFinite(value)) throw new TypeError(`${fieldName} must be finite.`);
  return Object.is(value, -0) ? 0 : value;
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}
