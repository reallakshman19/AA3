import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import {
  createEvidenceValue,
  projectDataEntry,
} from '../project-data/project-data-contract.js';

export const AUTHORIZED_EMPIRICAL_SUPPORT_CAPABILITY_BINDING_SCHEMA =
  'authorized-empirical-support-capability-binding/v1';

const SUPPORT_CAPABILITY_PATH = 'topology.supportTypeCapabilities';

/**
 * Expands governed support capability DEFAULT only for support kinds that are
 * actually present in the execution support-site model. Exact support-kind
 * rules always win. The source profile is never mutated.
 *
 * Missing exact + missing DEFAULT is retained as an explicit unresolved,
 * non-bearing resolution; no synthetic vertical capacity is invented.
 */
export function bindAuthorizedEmpiricalSupportCapabilities({
  profile,
  supportSiteModel,
} = {}) {
  const entry = projectDataEntry(profile, SUPPORT_CAPABILITY_PATH);
  requireApprovedEntry(entry);
  const capabilities = entry.value;
  if (!isRecord(capabilities)) {
    throw codedError(
      'Support capability policy must be an object keyed by support kind.',
      'EMPIRICAL_SUPPORT_CAPABILITY_POLICY_INVALID',
      { projectDataPath: SUPPORT_CAPABILITY_PATH },
    );
  }
  if (!supportSiteModel || !Array.isArray(supportSiteModel.sites)) {
    throw codedError(
      'Support capability binding requires a support-site model.',
      'EMPIRICAL_SUPPORT_CAPABILITY_SITE_MODEL_INVALID',
    );
  }

  const projectedCapabilities = clonePlain(capabilities);
  const rows = [];
  for (const site of supportSiteModel.sites) {
    for (let assemblyIndex = 0; assemblyIndex < (site.assemblies || []).length; assemblyIndex += 1) {
      const assembly = site.assemblies[assemblyIndex];
      for (let memberIndex = 0; memberIndex < (assembly.members || []).length; memberIndex += 1) {
        const member = assembly.members[memberIndex];
        const sourceType = stringValue(member?.sourceType);
        const resolution = resolveSupportCapability(capabilities, sourceType);
        if (sourceType && resolution.selector === 'DEFAULT') {
          projectedCapabilities[sourceType] = clonePlain(resolution.rule);
        }
        rows.push(freezeDeep({
          supportSiteId: stringValue(site.siteId),
          assemblyIndex,
          memberIndex,
          sourceType: sourceType || null,
          selector: resolution.selector,
          resolutionAuthority: resolution.resolutionAuthority,
          fallbackUsed: resolution.fallbackUsed,
          vertical: resolution.vertical,
          ruleSemanticHash: resolution.rule ? semanticHash(resolution.rule) : null,
        }));
      }
    }
  }

  const bindingMaterial = {
    schema: AUTHORIZED_EMPIRICAL_SUPPORT_CAPABILITY_BINDING_SCHEMA,
    projectDataPath: SUPPORT_CAPABILITY_PATH,
    sourceProfileSemanticHash: semanticHash(profile),
    sourceEntrySemanticHash: semanticHash(entry),
    sourceAuthority: stringValue(entry.evidence?.authority) || 'PROJECT_POLICY',
    source: stringValue(entry.evidence?.source),
    rows: rows.sort(bindingOrder),
  };
  const bindingSemanticHash = semanticHash(bindingMaterial);
  const projectedProfile = clonePlain(profile);
  projectedProfile.topology.supportTypeCapabilities = createEvidenceValue(
    projectedCapabilities,
    {
      ...clonePlain(entry.evidence),
      supportCapabilityBindingSchema: AUTHORIZED_EMPIRICAL_SUPPORT_CAPABILITY_BINDING_SCHEMA,
      supportCapabilityBindingSemanticHash: bindingSemanticHash,
      sourceSupportCapabilityEntrySemanticHash: bindingMaterial.sourceEntrySemanticHash,
    },
    true,
  );
  const frozenProfile = freezeDeep(projectedProfile);
  return freezeDeep({
    ...bindingMaterial,
    bindingSemanticHash,
    projectedProfileSemanticHash: semanticHash(frozenProfile),
    profile: frozenProfile,
    semanticHash: semanticHash({
      ...bindingMaterial,
      bindingSemanticHash,
      projectedProfileSemanticHash: semanticHash(frozenProfile),
    }),
  });
}

export function resolveSupportCapability(capabilities, sourceType) {
  if (!isRecord(capabilities)) {
    throw codedError('Support capabilities must be an object.', 'EMPIRICAL_SUPPORT_CAPABILITY_POLICY_INVALID');
  }
  const type = stringValue(sourceType);
  if (type && Object.hasOwn(capabilities, type)) {
    const rule = requireCapabilityRule(capabilities[type], type);
    return freezeDeep({
      selector: type,
      resolutionAuthority: 'EXACT_SUPPORT_KIND',
      fallbackUsed: false,
      vertical: rule.vertical === true,
      rule,
    });
  }
  if (Object.hasOwn(capabilities, 'DEFAULT')) {
    const rule = requireCapabilityRule(capabilities.DEFAULT, 'DEFAULT');
    return freezeDeep({
      selector: 'DEFAULT',
      resolutionAuthority: 'GOVERNED_DEFAULT_SUPPORT_KIND',
      fallbackUsed: true,
      vertical: rule.vertical === true,
      rule,
    });
  }
  return freezeDeep({
    selector: null,
    resolutionAuthority: 'UNRESOLVED_NON_BEARING',
    fallbackUsed: false,
    vertical: false,
    rule: null,
  });
}

export function bindAuthorizedEmpiricalSupportCapabilityResult({ distribution, binding } = {}) {
  if (!distribution || typeof distribution !== 'object' || !Array.isArray(distribution.loadCases)) {
    throw codedError('Support-load distribution is required.', 'EMPIRICAL_SUPPORT_CAPABILITY_DISTRIBUTION_INVALID');
  }
  if (!binding || binding.schema !== AUTHORIZED_EMPIRICAL_SUPPORT_CAPABILITY_BINDING_SCHEMA) {
    throw codedError('Support capability binding is required.', 'EMPIRICAL_SUPPORT_CAPABILITY_BINDING_INVALID');
  }
  const rebound = clonePlain(distribution);
  rebound.supportCapabilityAuthority = {
    schema: binding.schema,
    projectDataPath: binding.projectDataPath,
    sourceProfileSemanticHash: binding.sourceProfileSemanticHash,
    sourceEntrySemanticHash: binding.sourceEntrySemanticHash,
    sourceAuthority: binding.sourceAuthority,
    source: binding.source,
    bindingSemanticHash: binding.bindingSemanticHash,
    rows: clonePlain(binding.rows),
  };
  return freezeDeep(rebound);
}

function requireApprovedEntry(entry) {
  if (!entry || entry.approved !== true || !isRecord(entry.evidence) || !stringValue(entry.evidence.source)) {
    throw codedError(
      'Support capability policy requires approved source/project/default evidence.',
      'EMPIRICAL_SUPPORT_CAPABILITY_AUTHORITY_INVALID',
      { projectDataPath: SUPPORT_CAPABILITY_PATH },
    );
  }
}

function requireCapabilityRule(value, selector) {
  if (!isRecord(value)) {
    throw codedError(
      `Support capability ${selector} must be an object.`,
      'EMPIRICAL_SUPPORT_CAPABILITY_RULE_INVALID',
      { selector },
    );
  }
  if (Object.hasOwn(value, 'vertical') && typeof value.vertical !== 'boolean') {
    throw codedError(
      `Support capability ${selector}.vertical must be boolean when supplied.`,
      'EMPIRICAL_SUPPORT_CAPABILITY_VERTICAL_INVALID',
      { selector, value: value.vertical },
    );
  }
  return value;
}

function bindingOrder(left, right) {
  return `${left.supportSiteId}|${left.assemblyIndex}|${left.memberIndex}`
    .localeCompare(`${right.supportSiteId}|${right.assemblyIndex}|${right.memberIndex}`);
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
