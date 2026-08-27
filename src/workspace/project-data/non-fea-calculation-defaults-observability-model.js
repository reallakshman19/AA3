import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';

export const NON_FEA_CALCULATION_DEFAULTS_OBSERVABILITY_SCHEMA =
  'non-fea-calculation-defaults-observability/v1';
export const NON_FEA_CONFIGURED_DEFAULT_USAGE_LEDGER_SCHEMA =
  'non-fea-configured-default-usage-ledger/v1';
export const NON_FEA_PRODUCT_DEFAULT_PROVIDER_SCHEMA =
  'non-fea-product-default-provider/v1';
export const NON_FEA_COMMON_CHECK_REPORT_SCHEMA =
  'pre-fea-piping-check-report/v1';

const COVERAGE_REQUIREMENTS = freezeDeep({
  MASS_COVERAGE: 'Mass / content',
  FLEXURAL_COVERAGE: 'Flexural properties',
  SECTION_COVERAGE: 'Pipe section',
});

/**
 * Read-only engineer-facing projection of existing Issue #1321 evidence.
 *
 * This model deliberately does not resolve values, rank defaults or determine
 * coverage. It consumes the already-authored configured-default usage ledger,
 * Product-default provider receipts and canonical Common Input checker report.
 */
export function createCalculationDefaultsObservability({
  configuredDefaultUsageLedger,
  productDefaultProvider,
  report,
} = {}) {
  requireSchema(configuredDefaultUsageLedger, NON_FEA_CONFIGURED_DEFAULT_USAGE_LEDGER_SCHEMA,
    'Configured-default usage ledger');
  requireSchema(productDefaultProvider, NON_FEA_PRODUCT_DEFAULT_PROVIDER_SCHEMA,
    'Product-default provider');
  requireSchema(report, NON_FEA_COMMON_CHECK_REPORT_SCHEMA, 'Common Input checker report');
  if (!Array.isArray(configuredDefaultUsageLedger.rows)) {
    throw new TypeError('Configured-default usage ledger rows are required.');
  }
  if (!Array.isArray(productDefaultProvider.usageRows)
      || !Array.isArray(productDefaultProvider.shadowedRows)) {
    throw new TypeError('Product-default provider usage/shadowed rows are required.');
  }
  if (!Array.isArray(report.methodRows) || !Array.isArray(report.blockers)) {
    throw new TypeError('Common Input checker report methodRows/blockers are required.');
  }

  const configuredUsage = configuredUsageSummary(configuredDefaultUsageLedger.rows);
  const productUsage = productUsageSummary(productDefaultProvider);
  const coverage = coverageSummary(report.methodRows);
  const exceptions = exceptionSummary(report.blockers);
  const readyMethodIds = textArray(report.readyMethodIds);
  const blockedMethodIds = textArray(report.blockedMethodIds);
  const base = {
    schema: NON_FEA_CALCULATION_DEFAULTS_OBSERVABILITY_SCHEMA,
    bindings: {
      configuredDefaultUsageLedgerSemanticHash: nullableText(configuredDefaultUsageLedger.semanticHash),
      productDefaultProviderSemanticHash: nullableText(productDefaultProvider.semanticHash),
      checkerReportSemanticHash: nullableText(report.semanticHash),
    },
    package: {
      state: requiredText(report.packageState, 'Checker package state'),
      methodCount: report.methodRows.length,
      readyMethodCount: readyMethodIds.length,
      blockedMethodCount: blockedMethodIds.length,
      readyMethodIds,
      blockedMethodIds,
      blockerCount: report.blockers.length,
    },
    configuredUsage,
    productUsage,
    coverage,
    exceptions,
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

function configuredUsageSummary(rows) {
  const normalized = rows.map((row, index) => {
    if (!isRecord(row)) throw new TypeError(`Configured-default usage row ${index} must be an object.`);
    return freezeDeep({
      defaultId: requiredText(row.defaultId, `Configured-default usage row ${index} defaultId`),
      fieldId: requiredText(row.fieldId, `Configured-default usage row ${index} fieldId`),
      methodId: requiredText(row.methodId, `Configured-default usage row ${index} methodId`),
      targetId: requiredText(row.targetId, `Configured-default usage row ${index} targetId`),
      reason: nullableText(row.reason),
    });
  });
  const groups = groupBy(normalized, (row) => `${row.defaultId}|${row.fieldId}`);
  const defaults = [...groups.values()].map((group) => {
    const first = group[0];
    const targetIds = unique(group.map((row) => row.targetId));
    const methodIds = unique(group.map((row) => row.methodId));
    return freezeDeep({
      defaultId: first.defaultId,
      fieldId: first.fieldId,
      receiptCount: group.length,
      targetCount: targetIds.length,
      methodCount: methodIds.length,
      targetIds,
      methodIds,
      reasons: unique(group.map((row) => row.reason).filter(Boolean)),
    });
  }).sort((left, right) => compareText(`${left.fieldId}|${left.defaultId}`, `${right.fieldId}|${right.defaultId}`));
  const targetKeys = unique(normalized.map((row) => `${row.fieldId}|${row.targetId}`));
  return freezeDeep({
    receiptCount: normalized.length,
    selectedTargetFieldCount: targetKeys.length,
    configuredDefaultCount: defaults.length,
    affectedTargetCount: unique(normalized.map((row) => row.targetId)).length,
    defaults,
  });
}

function productUsageSummary(provider) {
  const applied = provider.usageRows.map((row, index) => {
    if (!isRecord(row)) throw new TypeError(`Product-default usage row ${index} must be an object.`);
    return freezeDeep({
      defaultId: requiredText(row.defaultId, `Product-default usage row ${index} defaultId`),
      projectDataPath: requiredText(row.projectDataPath, `Product-default usage row ${index} projectDataPath`),
      value: clonePlain(row.value),
      unit: nullableText(row.unit),
      basis: nullableText(row.basis),
      authority: requiredText(row.authority || 'PRODUCT_DEFAULT', `Product-default usage row ${index} authority`),
      defaultSemanticHash: nullableText(row.defaultSemanticHash),
    });
  }).sort((left, right) => compareText(left.projectDataPath, right.projectDataPath));
  const shadowed = provider.shadowedRows.map((row, index) => {
    if (!isRecord(row)) throw new TypeError(`Product-default shadow row ${index} must be an object.`);
    return freezeDeep({
      defaultId: requiredText(row.defaultId, `Product-default shadow row ${index} defaultId`),
      projectDataPath: requiredText(row.projectDataPath, `Product-default shadow row ${index} projectDataPath`),
      status: nullableText(row.status) || 'SHADOWED',
      existingAuthority: nullableText(row.existingAuthority),
      existingSource: nullableText(row.existingSource),
      defaultSemanticHash: nullableText(row.defaultSemanticHash),
    });
  }).sort((left, right) => compareText(left.projectDataPath, right.projectDataPath));
  return freezeDeep({
    profileId: nullableText(provider.profileId),
    profileVersion: Number.isInteger(provider.profileVersion) ? provider.profileVersion : null,
    appliedCount: applied.length,
    shadowedCount: shadowed.length,
    applied,
    shadowed,
  });
}

function coverageSummary(methodRows) {
  const byRequirement = new Map();
  methodRows.forEach((methodRow, methodIndex) => {
    if (!isRecord(methodRow) || !Array.isArray(methodRow.requirements)) {
      throw new TypeError(`Checker method row ${methodIndex} requires a requirements array.`);
    }
    const methodId = requiredText(methodRow.methodId, `Checker method row ${methodIndex} methodId`);
    methodRow.requirements.forEach((requirement) => {
      const requirementId = stringValue(requirement?.requirementId);
      if (!Object.hasOwn(COVERAGE_REQUIREMENTS, requirementId)) return;
      const normalized = normalizeCoverageRequirement(requirement, methodId);
      const previous = byRequirement.get(requirementId);
      if (!previous) {
        byRequirement.set(requirementId, { row: normalized, methodIds: [methodId] });
        return;
      }
      if (coverageFingerprint(previous.row) !== coverageFingerprint(normalized)) {
        throw new TypeError(`Checker coverage ${requirementId} is inconsistent across requested methods.`);
      }
      previous.methodIds.push(methodId);
    });
  });
  const rows = Object.keys(COVERAGE_REQUIREMENTS).map((requirementId) => {
    const entry = byRequirement.get(requirementId);
    if (!entry) return freezeDeep({
      requirementId,
      label: COVERAGE_REQUIREMENTS[requirementId],
      present: false,
      state: 'NOT_REQUESTED',
      code: null,
      total: null,
      covered: null,
      missing: [],
      ready: null,
      coveragePercent: null,
      methodIds: [],
      message: 'Coverage requirement is not part of the currently requested method set.',
    });
    const row = entry.row;
    return freezeDeep({
      ...row,
      label: COVERAGE_REQUIREMENTS[requirementId],
      methodIds: unique(entry.methodIds),
    });
  });
  return freezeDeep({
    requestedCount: rows.filter((row) => row.present).length,
    readyCount: rows.filter((row) => row.present && row.ready === true).length,
    incompleteCount: rows.filter((row) => row.present && row.ready === false).length,
    rows,
  });
}

function normalizeCoverageRequirement(requirement, methodId) {
  if (!isRecord(requirement) || !isRecord(requirement.details)) {
    throw new TypeError(`Coverage requirement for ${methodId} must carry checker details.`);
  }
  const details = requirement.details;
  const total = nonnegativeInteger(details.total, `${requirement.requirementId}.total`);
  const covered = nonnegativeInteger(details.covered, `${requirement.requirementId}.covered`);
  const missing = textArray(details.missing);
  const ready = details.ready === true;
  if (covered > total) throw new TypeError(`${requirement.requirementId} covered count exceeds total.`);
  if (ready !== (missing.length === 0)) {
    throw new TypeError(`${requirement.requirementId} ready flag disagrees with missing evidence.`);
  }
  const coveragePercent = total === 0 ? 100 : Number(((covered / total) * 100).toFixed(1));
  return freezeDeep({
    requirementId: requiredText(requirement.requirementId, 'Coverage requirement ID'),
    present: true,
    state: requiredText(requirement.state, 'Coverage requirement state'),
    code: nullableText(requirement.code),
    total,
    covered,
    missing,
    ready,
    coveragePercent,
    message: nullableText(requirement.message),
  });
}

function exceptionSummary(blockers) {
  const normalized = blockers.map((row, index) => {
    if (!isRecord(row)) throw new TypeError(`Checker blocker ${index} must be an object.`);
    return freezeDeep({
      methodId: nullableText(row.methodId),
      code: requiredText(row.code, `Checker blocker ${index} code`),
      path: nullableText(row.path) || 'unknown',
      message: nullableText(row.message) || 'Required evidence is blocked.',
    });
  });
  const groups = groupBy(normalized, (row) => `${row.code}|${row.path}|${row.message}`);
  const rows = [...groups.values()].map((group) => freezeDeep({
    code: group[0].code,
    path: group[0].path,
    message: group[0].message,
    occurrenceCount: group.length,
    methodIds: unique(group.map((row) => row.methodId).filter(Boolean)),
  })).sort((left, right) => compareText(`${left.code}|${left.path}`, `${right.code}|${right.path}`));
  return freezeDeep({
    blockerReceiptCount: normalized.length,
    exceptionGroupCount: rows.length,
    rows,
  });
}

function coverageFingerprint(row) {
  return semanticHash({
    requirementId: row.requirementId,
    state: row.state,
    code: row.code,
    total: row.total,
    covered: row.covered,
    missing: row.missing,
    ready: row.ready,
  });
}

function requireSchema(value, schema, label) {
  if (!isRecord(value) || value.schema !== schema) throw new TypeError(`${label} must be ${schema}.`);
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}
function nullableText(value) {
  const text = stringValue(value);
  return text || null;
}
function textArray(value) {
  if (!Array.isArray(value)) return [];
  return unique(value.map(stringValue).filter(Boolean));
}
function nonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer.`);
  return value;
}
function unique(values) {
  return [...new Set(values)].sort(compareText);
}
function groupBy(rows, keyFn) {
  const result = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    const group = result.get(key) || [];
    group.push(row);
    result.set(key, group);
  });
  return result;
}
function clonePlain(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}
function compareText(left, right) {
  return String(left).localeCompare(String(right));
}
