import { semanticHash } from '../empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../shared-primitives/immutable.js';
import { requireEmpiricalV3BranchAuthority } from './branch-authority.js';
import { requireEmpiricalV3ComponentAuthority } from './component-authority.js';
import { requireEngineeringRiskSet } from './risk-finding.js';
import { requireEngineeringConfirmationReceipt } from './confirmation-receipt.js';
import { requireEmpiricalV3CalculationAuthorization } from './calculation-authorization.js';
import { requireEmpiricalV3WorkflowProjection } from './workflow-state.js';

export const EMPIRICAL_V3_SAFETY_PRESENTATION_PACKAGE_SCHEMA =
  'empirical-v3-safety-presentation-package/v1';

/** Presentation envelope over already-governed records; no reclassification/authorization. */
export function sealEmpiricalV3SafetyPresentationPackage(input) {
  const runId = requireText(input?.runId, 'runId');
  const workflow = requireEmpiricalV3WorkflowProjection(input?.workflow);
  const branches = requireBranches(input?.branches, runId);
  const components = requireComponents(input?.components, runId, branches);
  const riskSet = requireEngineeringRiskSet(input?.riskSet);
  if (riskSet.runId !== runId) throw new Error('Safety package risk set belongs to another run.');
  const confirmations = requireConfirmations(input?.confirmations ?? [], riskSet);
  const calculationAuthorization = normalizeAuthorization(input?.calculationAuthorization, runId);
  requireWorkflowAuthorizationConsistency(workflow, calculationAuthorization);
  const records = normalizeRecords(input?.records ?? []);
  const semanticMaterial = {
    schema: EMPIRICAL_V3_SAFETY_PRESENTATION_PACKAGE_SCHEMA,
    runId,
    workflowRef: {
      state: workflow.state,
      semanticHash: workflow.semanticHash,
      calculationAuthorizationRef: workflow.calculationAuthorizationRef,
    },
    branchRefs: branches.map(referenceRecord),
    componentRefs: components.map(referenceRecord),
    riskSetRef: { ref: riskSet.riskSetId, semanticHash: riskSet.semanticHash },
    confirmationRefs: confirmations.map((receipt) => ({
      ref: receipt.receiptId,
      semanticHash: receipt.semanticHash,
      evidenceHash: receipt.evidenceHash,
    })),
    calculationAuthorizationRef: calculationAuthorization
      ? { ref: calculationAuthorization.authorizationId, semanticHash: calculationAuthorization.semanticHash }
      : null,
    recordRefs: records.map((entry) => ({
      ref: entry.ref,
      semanticHash: entry.semanticHash,
      evidenceHash: entry.evidenceHash,
      kind: entry.kind,
    })),
  };
  const packageHash = semanticHash(semanticMaterial);
  return deepFreeze({
    ...semanticMaterial,
    workflow,
    branches,
    components,
    riskSet,
    confirmations,
    calculationAuthorization,
    records,
    semanticHash: packageHash,
  });
}

export function requireEmpiricalV3SafetyPresentationPackage(value) {
  if (!value || value.schema !== EMPIRICAL_V3_SAFETY_PRESENTATION_PACKAGE_SCHEMA) {
    throw new TypeError(`Expected schema ${EMPIRICAL_V3_SAFETY_PRESENTATION_PACKAGE_SCHEMA}.`);
  }
  const accepted = sealEmpiricalV3SafetyPresentationPackage(value);
  if (value.semanticHash !== accepted.semanticHash) throw new Error('Empirical V3 safety presentation package hash mismatch.');
  return accepted;
}

export function findEmpiricalV3PresentationRecord(packageValue, ref) {
  const value = requireEmpiricalV3SafetyPresentationPackage(packageValue);
  return value.records.find((entry) => entry.ref === ref) ?? null;
}

function requireBranches(value, runId) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('branches must be a nonempty array.');
  const rows = value.map(requireEmpiricalV3BranchAuthority);
  if (rows.some((row) => row.runId !== runId)) throw new Error('Safety package branch belongs to another run.');
  requireUnique(rows.map((row) => row.branchId), 'branchId');
  return rows.sort((a, b) => a.branchId.localeCompare(b.branchId));
}
function requireComponents(value, runId, branches) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('components must be a nonempty array.');
  const branchHashes = new Map(branches.map((branch) => [branch.branchId, branch.semanticHash]));
  const rows = value.map(requireEmpiricalV3ComponentAuthority);
  for (const row of rows) {
    if (row.runId !== runId) throw new Error(`Component ${row.componentId} belongs to another run.`);
    if (branchHashes.get(row.branchRef.branchId) !== row.branchRef.semanticHash) {
      throw new Error(`Component ${row.componentId} references a stale or missing branch.`);
    }
  }
  requireUnique(rows.map((row) => row.componentId), 'componentId');
  return rows.sort((a, b) => a.componentId.localeCompare(b.componentId));
}
function requireConfirmations(value, riskSet) {
  if (!Array.isArray(value)) throw new TypeError('confirmations must be an array.');
  const riskIds = new Set(riskSet.risks.map((risk) => risk.riskId));
  const rows = value.map(requireEngineeringConfirmationReceipt);
  for (const receipt of rows) {
    if (!riskIds.has(receipt.riskRef.riskId)) throw new Error(`Confirmation ${receipt.receiptId} is outside the current risk set.`);
  }
  requireUnique(rows.map((row) => row.receiptId), 'receiptId');
  return rows.sort((a, b) => a.receiptId.localeCompare(b.receiptId));
}
function normalizeAuthorization(value, runId) {
  if (value === null || value === undefined) return null;
  const authorization = requireEmpiricalV3CalculationAuthorization(value);
  if (authorization.runId !== runId) throw new Error('Calculation authorization belongs to another run.');
  return authorization;
}
function requireWorkflowAuthorizationConsistency(workflow, authorization) {
  if (!workflow.canRunCalculation) return;
  if (!authorization || authorization.semanticHash !== workflow.calculationAuthorizationRef) {
    throw new Error('Workflow authorization reference does not match the supplied sealed authorization.');
  }
}
function normalizeRecords(value) {
  if (!Array.isArray(value)) throw new TypeError('records must be an array.');
  const rows = value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new TypeError(`records[${index}] must be an object.`);
    const record = cloneJson(entry.record);
    const semanticHashValue = requireText(entry.semanticHash, `records[${index}].semanticHash`);
    if (record.semanticHash && record.semanticHash !== semanticHashValue) throw new Error(`records[${index}] semantic hash does not match its record.`);
    return {
      ref: requireText(entry.ref, `records[${index}].ref`),
      kind: requireText(entry.kind, `records[${index}].kind`),
      semanticHash: semanticHashValue,
      evidenceHash: optionalText(entry.evidenceHash ?? record.evidenceHash),
      record,
    };
  });
  requireUnique(rows.map((row) => `${row.kind}\u0000${row.ref}`), 'record ref');
  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref));
}
function referenceRecord(value) { return { ref: value.branchId ?? value.componentId, semanticHash: value.semanticHash }; }
function cloneJson(value) { if (!value || typeof value !== 'object') throw new TypeError('Presentation record must be an object.'); return JSON.parse(JSON.stringify(value)); }
function requireUnique(values, label) { if (new Set(values).size !== values.length) throw new Error(`Safety package contains duplicate ${label}.`); }
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) { const text = String(value ?? '').trim(); if (!text) throw new TypeError(`${fieldName} is required.`); return text; }
