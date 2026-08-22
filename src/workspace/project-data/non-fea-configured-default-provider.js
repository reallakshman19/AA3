import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import {
  createNonFeaEnrichmentRecord,
  listNonFeaEnrichmentFields,
} from '../../core/non-fea-enrichment/index.js';
import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import {
  NON_FEA_METHOD_IDS,
  validateConfiguredDefaultsPolicy,
} from './non-fea-field-registry.js';

export const NON_FEA_CONFIGURED_DEFAULT_PROVIDER_SCHEMA = 'non-fea-configured-default-evidence-provider/v1';
export const NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE = 'ISSUE_1321_SCOPE_PRECEDENCE_V1';

const SCOPE_KEYS = Object.freeze([
  'entityIds',
  'posIds',
  'lineIds',
  'branchIds',
  'systemIds',
  'zoneIds',
  'pipingClasses',
  'componentTypes',
  'nominalBoreMm',
  'supportKinds',
]);

const ENRICHMENT_FIELD_BY_ID = new Map(
  listNonFeaEnrichmentFields().map((definition) => [definition.fieldId, definition]),
);

/**
 * Compiles approved Project Data configured defaults into ephemeral exact
 * ENTITY evidence records consumed by the existing common field resolver.
 *
 * Project Data remains the authority store. No record is written to the user
 * enrichment sidecar, no geometry/proximity matching is permitted, and a POS
 * scope only matches an explicit governed POS identifier carried by the model.
 *
 * Matching defaults are ranked by the Issue #1321 scope policy rather than by
 * raw scope-key count. This prevents a broad multi-key system/zone declaration
 * from outranking an exact line, POS, or entity declaration merely because the
 * broad declaration contains more keys.
 */
export function createNonFeaConfiguredDefaultProvider({
  profile,
  sourceModel,
  requestedMethods = NON_FEA_METHOD_IDS,
} = {}) {
  if (!isRecord(profile)) throw new TypeError('Configured-default provider requires a Project Data profile.');
  if (!isRecord(sourceModel)) throw new TypeError('Configured-default provider requires a shared piping model.');
  const methods = normalizeRequestedMethods(requestedMethods);
  const entry = profile?.qualificationPolicy?.configuredDefaults;
  const policy = entry?.value ?? null;
  const blockers = [];
  const records = [];

  if (policy === null) return providerResult(profile, null, methods, records, blockers);

  const audit = validateConfiguredDefaultsPolicy(policy);
  if (!audit.valid) {
    audit.errors.forEach((row) => blockers.push(issue(row.code, row.path, row.message)));
    return providerResult(profile, policy, methods, records, blockers);
  }
  if (entry?.approved !== true || !isRecord(entry?.evidence) || !stringValue(entry.evidence.source)) {
    blockers.push(issue(
      'CONFIGURED_DEFAULT_AUTHORITY_NOT_APPROVED',
      'qualificationPolicy.configuredDefaults',
      'Configured defaults require approved Project Data authority with source evidence.',
    ));
    return providerResult(profile, policy, methods, records, blockers);
  }

  const candidatesByTargetField = new Map();
  for (const configured of policy.defaults) {
    const field = ENRICHMENT_FIELD_BY_ID.get(configured.fieldId);
    if (!field) continue; // Project-level defaults are consumed by their owning Project Data path, not entity enrichment.
    const allowedMethods = configured.allowedMethods.filter((methodId) => methods.includes(methodId));
    if (!allowedMethods.length) continue;
    const scopeAudit = normalizeScope(configured.scope, configured.defaultId);
    if (scopeAudit.blocker) {
      blockers.push(scopeAudit.blocker);
      continue;
    }
    const targets = targetInventory(sourceModel, field.targetKind)
      .filter((target) => scopeMatches(scopeAudit.scope, target.identity));
    if (!targets.length) {
      blockers.push(issue(
        'CONFIGURED_DEFAULT_SCOPE_UNMATCHED',
        configured.defaultId,
        `Configured default ${configured.defaultId} did not match an exact governed ${field.targetKind.toLowerCase()} identity.`,
      ));
      continue;
    }
    const scopePriority = configuredDefaultScopePriority(scopeAudit.scope);
    targets.forEach((target) => {
      const key = `${field.targetKind}|${target.targetId}|${configured.fieldId}`;
      const list = candidatesByTargetField.get(key) || [];
      list.push({ configured, field, target, scope: scopeAudit.scope, scopePriority, allowedMethods });
      candidatesByTargetField.set(key, list);
    });
  }

  [...candidatesByTargetField.entries()].sort(([left], [right]) => left.localeCompare(right)).forEach(([key, candidates]) => {
    const best = candidates.reduce((winner, candidate) => (
      compareScopePriority(candidate.scopePriority, winner.scopePriority) > 0
        ? candidate
        : winner
    ));
    const finalists = candidates.filter((row) => (
      compareScopePriority(row.scopePriority, best.scopePriority) === 0
    ));
    const fingerprints = new Set(finalists.map((row) => valueFingerprint(row.configured)));
    if (fingerprints.size > 1) {
      blockers.push(issue(
        'CONFIGURED_DEFAULT_SCOPE_CONFLICT',
        key,
        `Equally ranked configured defaults conflict: ${finalists.map((row) => row.configured.defaultId).sort().join(', ')}.`,
      ));
      return;
    }
    const selected = [...finalists].sort((left, right) => left.configured.defaultId.localeCompare(right.configured.defaultId))[0];
    records.push(createProviderRecord(selected, profile, entry.evidence, policy));
  });

  return providerResult(profile, policy, methods, records, blockers);
}

/**
 * Returns a lexicographic priority vector implementing Issue #1321:
 * entity > POS > line > branch > piping-class+NB > component-type+NB
 * > piping class > component type > support kind > nominal bore
 * > system > zone > project global.
 *
 * Additional exact constraints within the same governing tier are retained in
 * the vector, so a more constrained match can win without allowing a lower
 * tier to leapfrog a higher one.
 */
export function configuredDefaultScopePriority(scopeValue) {
  const scope = isRecord(scopeValue) ? scopeValue : {};
  const has = (key) => Array.isArray(scope[key]) && scope[key].length > 0;
  const pipingClass = has('pipingClasses');
  const componentType = has('componentTypes');
  const nominalBore = has('nominalBoreMm');
  const vector = [
    has('entityIds'),
    has('posIds'),
    has('lineIds'),
    has('branchIds'),
    pipingClass && nominalBore,
    componentType && nominalBore,
    pipingClass,
    componentType,
    has('supportKinds'),
    nominalBore,
    has('systemIds'),
    has('zoneIds'),
    Object.keys(scope).length,
  ].map((value) => (value === true ? 1 : value === false ? 0 : value));
  return freezeDeep(vector);
}

/** Positive means left outranks right; zero means identical effective priority. */
export function compareConfiguredDefaultScopePriority(left, right) {
  return compareScopePriority(left, right);
}

/**
 * Creates usage candidates only for configured defaults that actually won the
 * common field-resolution ledger. Higher-authority source/master/override
 * evidence therefore produces no configured-default usage receipt.
 */
export function createConfiguredDefaultUsageRowsFromResolution({
  resolutionLedger,
  requestedMethods = NON_FEA_METHOD_IDS,
} = {}) {
  if (!isRecord(resolutionLedger) || !Array.isArray(resolutionLedger.rows)) {
    throw new TypeError('Configured-default usage requires a field-resolution ledger.');
  }
  const methods = normalizeRequestedMethods(requestedMethods);
  const rows = [];
  resolutionLedger.rows.forEach((row) => {
    const selected = row?.selected;
    if (selected?.authority !== 'PROJECT_CONFIGURED_DEFAULT') return;
    const defaultId = stringValue(selected.evidence?.defaultId);
    const allowedMethods = Array.isArray(selected.evidence?.allowedMethods)
      ? selected.evidence.allowedMethods.filter((methodId) => methods.includes(methodId))
      : [];
    allowedMethods.forEach((methodId) => rows.push({
      defaultId,
      fieldId: selected.fieldId,
      methodId,
      targetId: selected.targetId,
      reason: `Selected by common field-resolution ledger ${row.resolutionKey}.`,
    }));
  });
  return freezeDeep(rows.sort((left, right) => (
    `${left.fieldId}|${left.methodId}|${left.targetId}|${left.defaultId}`
      .localeCompare(`${right.fieldId}|${right.methodId}|${right.targetId}|${right.defaultId}`)
  )));
}

function createProviderRecord(candidate, profile, policyEvidence, policy) {
  const { configured, target, scope, scopePriority, allowedMethods } = candidate;
  return createNonFeaEnrichmentRecord({
    recordId: `project-default:${configured.defaultId}:${target.targetId}`,
    selectorKind: 'ENTITY',
    selectorKey: target.targetId,
    fieldId: configured.fieldId,
    value: configured.value,
    unit: configured.unit,
    authority: 'PROJECT_CONFIGURED_DEFAULT',
    sourceId: stringValue(policyEvidence.source),
    revision: String(profile.revision),
    evidence: {
      source: 'Project Data configured default',
      defaultId: configured.defaultId,
      basis: configured.basis,
      scope,
      scopePrecedence: NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
      scopePriority,
      allowedMethods,
      projectDataRevision: profile.revision,
      configuredDefaultPolicyHash: semanticHash(policy),
    },
  });
}

function providerResult(profile, policy, requestedMethods, records, blockers) {
  const base = {
    schema: NON_FEA_CONFIGURED_DEFAULT_PROVIDER_SCHEMA,
    projectDataRevision: Number.isInteger(profile?.revision) ? profile.revision : null,
    configuredDefaultPolicyHash: policy ? semanticHash(policy) : null,
    requestedMethods,
    records: [...records].sort((left, right) => left.recordId.localeCompare(right.recordId)),
    blockers: [...blockers].sort((left, right) => `${left.code}|${left.path}`.localeCompare(`${right.code}|${right.path}`)),
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

function targetInventory(sourceModel, targetKind) {
  if (targetKind === 'COMPONENT') {
    return (sourceModel.components || []).map((component) => ({
      targetId: stringValue(component.componentKey),
      identity: componentIdentity(component),
    }));
  }
  return (sourceModel.supports || []).map((support) => ({
    targetId: stringValue(support.supportKey),
    identity: supportIdentity(support),
  }));
}

function componentIdentity(component) {
  return freezeDeep({
    entityIds: textValues(component.componentKey, component.sourceEntityId),
    posIds: textValues(component.posId, component.identity?.posId),
    lineIds: textValues(component.identity?.lineId),
    branchIds: textValues(component.identity?.branchId),
    systemIds: textValues(component.identity?.systemId),
    zoneIds: textValues(component.identity?.zoneId),
    pipingClasses: textValues(component.pipingClass, component.identity?.pipingClass),
    componentTypes: textValues(component.type),
    nominalBoreMm: numberValues(component.nominalBoreMm, component.identity?.nominalBoreMm),
    supportKinds: [],
  });
}

function supportIdentity(support) {
  const supportTypes = Array.isArray(support.supportEvidence?.supportTypes)
    ? support.supportEvidence.supportTypes.map((row) => row?.value)
    : [];
  return freezeDeep({
    entityIds: textValues(support.supportKey, support.sourceEntityId),
    posIds: textValues(support.posId, support.identity?.posId),
    lineIds: textValues(support.identity?.lineId),
    branchIds: textValues(support.identity?.branchId),
    systemIds: textValues(support.identity?.systemId),
    zoneIds: textValues(support.identity?.zoneId),
    pipingClasses: [],
    componentTypes: [],
    nominalBoreMm: [],
    supportKinds: textValues(support.type, ...supportTypes),
  });
}

function normalizeScope(value, defaultId) {
  if (value === undefined || value === null) return { scope: freezeDeep({}), blocker: null };
  if (!isRecord(value)) {
    return { scope: null, blocker: issue('INVALID_CONFIGURED_DEFAULT_SCOPE', defaultId, 'Configured default scope must be an object.') };
  }
  const unknown = Object.keys(value).filter((key) => !SCOPE_KEYS.includes(key));
  if (unknown.length) {
    return { scope: null, blocker: issue('UNKNOWN_CONFIGURED_DEFAULT_SCOPE_KEY', defaultId, `Unknown scope keys: ${unknown.sort().join(', ')}.`) };
  }
  const scope = {};
  for (const key of SCOPE_KEYS) {
    if (!Object.hasOwn(value, key)) continue;
    if (!Array.isArray(value[key]) || value[key].length === 0) {
      return { scope: null, blocker: issue('INVALID_CONFIGURED_DEFAULT_SCOPE', defaultId, `${key} must be a non-empty array.`) };
    }
    if (key === 'nominalBoreMm') {
      const values = [...new Set(value[key].map(Number))];
      if (values.some((item) => !Number.isFinite(item))) {
        return { scope: null, blocker: issue('INVALID_CONFIGURED_DEFAULT_SCOPE', defaultId, 'nominalBoreMm values must be finite numbers.') };
      }
      scope[key] = values.sort((left, right) => left - right);
    } else {
      const values = [...new Set(value[key].map(stringValue).filter(Boolean))].sort();
      if (!values.length) {
        return { scope: null, blocker: issue('INVALID_CONFIGURED_DEFAULT_SCOPE', defaultId, `${key} must contain non-empty exact identifiers.`) };
      }
      scope[key] = values;
    }
  }
  return { scope: freezeDeep(scope), blocker: null };
}

function scopeMatches(scope, identity) {
  return Object.entries(scope).every(([key, expected]) => {
    const actual = identity[key] || [];
    if (key === 'nominalBoreMm') return expected.some((value) => actual.includes(value));
    return expected.some((value) => actual.includes(value));
  });
}

function compareScopePriority(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index] || 0);
    const rightValue = Number(right[index] || 0);
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  return 0;
}

function valueFingerprint(configured) {
  return semanticHash({ value: configured.value, unit: configured.unit });
}

function normalizeRequestedMethods(value) {
  if (!Array.isArray(value)) throw new TypeError('Configured-default requested methods must be an array.');
  const methods = [...new Set(value.map(stringValue).filter(Boolean))].sort();
  methods.forEach((methodId) => {
    if (!NON_FEA_METHOD_IDS.includes(methodId)) throw new TypeError(`Unknown Non-FEA method: ${methodId}.`);
  });
  return freezeDeep(methods);
}

function textValues(...values) {
  return [...new Set(values.map(stringValue).filter(Boolean))].sort();
}

function numberValues(...values) {
  return [...new Set(values.map(Number).filter(Number.isFinite))].sort((left, right) => left - right);
}

function issue(code, path, message) {
  return freezeDeep({ code, path, message });
}
