import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import {
  requireEngineeringRiskSet,
  requireEngineeringRiskFinding,
} from './risk-finding.js';
import {
  requireEngineeringConfirmationReceipt,
  requireCurrentEngineeringConfirmation,
} from './confirmation-receipt.js';

export const EMPIRICAL_V3_CALCULATION_AUTHORIZATION_SCHEMA = 'empirical-v3-calculation-authorization/v1';

/**
 * Seals the only artifact that can authorize the V3 calculation entrypoint.
 * It is derived from current engineering dependencies, the immutable risk set
 * and singular current HIGH_CONFIRM receipts. UI state is intentionally absent.
 */
export function sealEmpiricalV3CalculationAuthorization(input) {
  const normalized = normalizeAuthorizationBasis(input);
  const clearance = evaluateRiskClearance(normalized.riskSet, normalized.confirmations);
  const semanticFields = authorizationSemanticProjection({
    schema: EMPIRICAL_V3_CALCULATION_AUTHORIZATION_SCHEMA,
    runId: normalized.runId,
    policyId: normalized.policyId,
    policyVersion: normalized.policyVersion,
    dependencies: normalized.dependencies,
    riskSetRef: {
      riskSetId: normalized.riskSet.riskSetId,
      semanticHash: normalized.riskSet.semanticHash,
    },
    confirmationRefs: clearance.confirmationRefs,
  });
  const hash = semanticHash(semanticFields);
  return deepFreeze({
    ...semanticFields,
    authorizationId: `calc-auth:${hash.slice('fnv1a64:'.length)}`,
    semanticHash: hash,
  });
}

export function requireEmpiricalV3CalculationAuthorization(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Calculation authorization must be an object.');
  if (value.schema !== EMPIRICAL_V3_CALCULATION_AUTHORIZATION_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_CALCULATION_AUTHORIZATION_SCHEMA}.`);
  }
  const normalized = {
    schema: value.schema,
    runId: requireText(value.runId, 'runId'),
    policyId: requireText(value.policyId, 'policyId'),
    policyVersion: requireText(value.policyVersion, 'policyVersion'),
    dependencies: normalizeDependencies(value.dependencies),
    riskSetRef: normalizeRiskSetRef(value.riskSetRef),
    confirmationRefs: normalizeConfirmationRefs(value.confirmationRefs),
    authorizationId: requireText(value.authorizationId, 'authorizationId'),
    semanticHash: requireText(value.semanticHash, 'semanticHash'),
  };
  const expectedHash = semanticHash(authorizationSemanticProjection(normalized));
  const expectedId = `calc-auth:${expectedHash.slice('fnv1a64:'.length)}`;
  if (normalized.semanticHash !== expectedHash || normalized.authorizationId !== expectedId) {
    throw new Error('Calculation authorization identity mismatch.');
  }
  return deepFreeze(normalized);
}

export function authorizationSemanticProjection(value) {
  return {
    schema: value.schema,
    runId: value.runId,
    policyId: value.policyId,
    policyVersion: value.policyVersion,
    dependencies: value.dependencies,
    riskSetRef: value.riskSetRef,
    confirmationRefs: value.confirmationRefs,
  };
}

export function evaluateRiskClearance(riskSetValue, confirmationValues = []) {
  const riskSet = requireEngineeringRiskSet(riskSetValue);
  if (!Array.isArray(confirmationValues)) throw new TypeError('confirmations must be an array.');
  const confirmations = confirmationValues.map(requireEngineeringConfirmationReceipt);
  const risksById = new Map(riskSet.risks.map((risk) => [risk.riskId, risk]));

  if (riskSet.counts.HIGH_BLOCK > 0) {
    throw new Error(`Calculation blocked by ${riskSet.counts.HIGH_BLOCK} HIGH_BLOCK risk(s).`);
  }

  const receiptsByRisk = new Map();
  for (const receipt of confirmations) {
    const risk = risksById.get(receipt.riskRef.riskId);
    if (!risk) throw new Error(`Confirmation ${receipt.receiptId} does not belong to the current risk set.`);
    if (risk.riskClass !== 'HIGH_CONFIRM') {
      throw new Error(`Confirmation ${receipt.receiptId} targets non-confirmable ${risk.riskClass} risk.`);
    }
    requireCurrentEngineeringConfirmation(receipt, risk);
    if (receiptsByRisk.has(risk.riskId)) {
      throw new Error(`Risk ${risk.riskId} has multiple active confirmation receipts.`);
    }
    receiptsByRisk.set(risk.riskId, receipt);
  }

  const highConfirmRisks = riskSet.risks.filter((risk) => risk.riskClass === 'HIGH_CONFIRM');
  const missing = highConfirmRisks.filter((risk) => !receiptsByRisk.has(risk.riskId));
  if (missing.length > 0) {
    throw new Error(`Calculation has ${missing.length} pending HIGH_CONFIRM risk(s).`);
  }

  return deepFreeze({
    highBlockCount: 0,
    highConfirmCount: highConfirmRisks.length,
    confirmationRefs: highConfirmRisks
      .map((risk) => confirmationReference(receiptsByRisk.get(risk.riskId), risk))
      .sort((a, b) => a.riskId.localeCompare(b.riskId)),
  });
}

/**
 * Revalidates a sealed authorization against the current domain records.
 * Any run, policy, dependency, risk-set or confirmation identity change makes
 * the authorization stale even if the user remains on a Results screen.
 */
export function assessEmpiricalV3CalculationAuthorizationCurrent(value, current) {
  const authorization = requireEmpiricalV3CalculationAuthorization(value);
  const runId = requireText(current?.runId, 'current.runId');
  const policyId = requireText(current?.policyId, 'current.policyId');
  const policyVersion = requireText(current?.policyVersion, 'current.policyVersion');
  const riskSet = requireEngineeringRiskSet(current?.riskSet);
  const confirmations = Array.isArray(current?.confirmations)
    ? current.confirmations.map(requireEngineeringConfirmationReceipt)
    : [];
  const dependencies = normalizeDependencies(current?.dependencies);
  const reasons = [];

  if (runId !== authorization.runId) reasons.push('RUN_ID_CHANGED');
  if (policyId !== authorization.policyId || policyVersion !== authorization.policyVersion) {
    reasons.push('RISK_POLICY_CHANGED');
  }
  if (riskSet.runId !== runId) reasons.push('RISK_SET_RUN_MISMATCH');
  if (semanticHash(dependencies) !== semanticHash(authorization.dependencies)) {
    reasons.push('DEPENDENCY_IDENTITY_CHANGED');
  }
  if (riskSet.semanticHash !== authorization.riskSetRef.semanticHash) {
    reasons.push('RISK_SET_CHANGED');
  }

  try {
    const clearance = evaluateRiskClearance(riskSet, confirmations);
    if (semanticHash(clearance.confirmationRefs) !== semanticHash(authorization.confirmationRefs)) {
      reasons.push('CONFIRMATION_IDENTITY_CHANGED');
    }
  } catch {
    reasons.push('RISK_CLEARANCE_INVALID');
  }

  return deepFreeze({
    current: reasons.length === 0,
    reasons: [...new Set(reasons)].sort(),
  });
}

function normalizeAuthorizationBasis(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Authorization basis must be an object.');
  const runId = requireText(input.runId, 'runId');
  const riskSet = requireEngineeringRiskSet(input.riskSet);
  if (riskSet.runId !== runId) throw new Error('Authorization runId must match the current risk set runId.');
  return {
    runId,
    policyId: requireText(input.policyId, 'policyId'),
    policyVersion: requireText(input.policyVersion, 'policyVersion'),
    dependencies: normalizeDependencies(input.dependencies),
    riskSet,
    confirmations: Array.isArray(input.confirmations)
      ? input.confirmations.map(requireEngineeringConfirmationReceipt)
      : [],
  };
}

function normalizeDependencies(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('dependencies must contain at least one governed dependency.');
  }
  const dependencies = value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`dependencies[${index}] must be an object.`);
    return {
      kind: requireText(item.kind, `dependencies[${index}].kind`),
      ref: requireText(item.ref, `dependencies[${index}].ref`),
      semanticHash: requireText(item.semanticHash, `dependencies[${index}].semanticHash`),
    };
  });
  const keyed = new Map();
  for (const dependency of dependencies) {
    const key = `${dependency.kind}\u0000${dependency.ref}`;
    const existing = keyed.get(key);
    if (existing && existing.semanticHash !== dependency.semanticHash) {
      throw new Error(`Conflicting dependency identities for ${dependency.kind}:${dependency.ref}.`);
    }
    keyed.set(key, dependency);
  }
  return [...keyed.values()].sort((a, b) => (
    a.kind.localeCompare(b.kind)
    || a.ref.localeCompare(b.ref)
    || a.semanticHash.localeCompare(b.semanticHash)
  ));
}

function confirmationReference(receiptValue, riskValue) {
  const receipt = requireEngineeringConfirmationReceipt(receiptValue);
  const risk = requireEngineeringRiskFinding(riskValue);
  return {
    riskId: risk.riskId,
    riskSemanticHash: risk.semanticHash,
    receiptId: receipt.receiptId,
    receiptSemanticHash: receipt.semanticHash,
  };
}

function normalizeRiskSetRef(value) {
  if (!value || typeof value !== 'object') throw new TypeError('riskSetRef must be an object.');
  return {
    riskSetId: requireText(value.riskSetId, 'riskSetRef.riskSetId'),
    semanticHash: requireText(value.semanticHash, 'riskSetRef.semanticHash'),
  };
}

function normalizeConfirmationRefs(value) {
  if (!Array.isArray(value)) throw new TypeError('confirmationRefs must be an array.');
  return value.map((item, index) => ({
    riskId: requireText(item?.riskId, `confirmationRefs[${index}].riskId`),
    riskSemanticHash: requireText(item?.riskSemanticHash, `confirmationRefs[${index}].riskSemanticHash`),
    receiptId: requireText(item?.receiptId, `confirmationRefs[${index}].receiptId`),
    receiptSemanticHash: requireText(item?.receiptSemanticHash, `confirmationRefs[${index}].receiptSemanticHash`),
  })).sort((a, b) => a.riskId.localeCompare(b.riskId));
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
