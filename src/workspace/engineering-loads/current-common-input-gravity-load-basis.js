import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import {
  createEvidenceValue,
  projectDataEntry,
} from '../project-data/project-data-contract.js';
import {
  LOAD_CALC_STANDARD_DEFAULTS_V1,
} from '../project-data/non-fea-product-default-profile.js';
import {
  createNonFeaEffectiveValueCandidate,
  resolveNonFeaEffectiveValues,
} from '../project-data/non-fea-effective-value-resolver.js';

export const CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA =
  'current-common-input-gravity-load-basis/v1';

const PRODUCT_DEFAULT_SOURCE = 'Load Calc built-in product default';
const EFFECTIVE_LEDGER_SCHEMA = 'non-fea-effective-value-resolution-ledger/v1';
const EFFECTIVE_ROW_SCHEMA = 'non-fea-effective-value-resolution-row/v1';
const FIELD_DEFINITIONS = freezeDeep([
  {
    fieldId: 'GRAVITY_ACCELERATION',
    projectDataPath: 'loadCalculation.gravityMPerS2',
    unit: 'm/s²',
    defaultId: 'PD-GRAVITY',
    outputKey: 'gravity',
  },
  {
    fieldId: 'LOAD_FACTOR',
    projectDataPath: 'loadCalculation.loadFactor',
    unit: 'ratio',
    defaultId: 'PD-LOAD-FACTOR',
    outputKey: 'loadFactor',
  },
]);

/**
 * Binds the two scalar force multipliers consumed by current Common Input
 * support-load execution to the existing Non-FEA effective-value resolver.
 *
 * The Common Input Project Data profile is already the effective Product-data
 * profile. This adapter does not resolve precedence again: it converts the two
 * approved project-global entries into canonical effective-value candidates,
 * asks the existing resolver to validate/select them, and produces an immutable
 * execution receipt. Legacy approved Project Data without an explicit authority
 * token is migrated visibly to PROJECT_POLICY rather than inventing a new tier.
 *
 * A projected profile carrying the exact receipt binding is returned solely so
 * the legacy scalar statics kernel can consume the same numerical formula
 * without owning authority selection. The source profile is never mutated.
 */
export function createCurrentCommonInputGravityLoadBasis({ commonInput } = {}) {
  const current = requireReadyCommonInputShape(commonInput);
  const profile = current.projectDataProfile;
  const projectId = stringValue(profile.projectId) || 'CURRENT_PROJECT';
  const projectDataProfileSemanticHash = semanticHash(profile);

  const candidates = FIELD_DEFINITIONS.map((definition) => (
    candidateFromProjectDataEntry({ definition, profile, projectId, projectDataProfileSemanticHash })
  ));
  const resolution = resolveNonFeaEffectiveValues({
    candidates,
    projectDataProfileSemanticHash,
  });
  if (resolution.status !== 'RESOLVED' || resolution.summary.resolvedCount !== 2) {
    throw codedError(
      'Current gravity/load-factor effective-value resolution is not fully resolved.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_NOT_RESOLVED',
      resolution.rows.filter((row) => row.status !== 'RESOLVED'),
    );
  }

  const selected = Object.fromEntries(FIELD_DEFINITIONS.map((definition) => {
    const key = `PROJECT|${projectId}|${definition.fieldId}`;
    const row = resolution.rows.find((item) => item.resolutionKey === key);
    if (!row?.selected) {
      throw codedError(
        `Resolved ${definition.fieldId} value is unavailable.`,
        'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_NOT_RESOLVED',
        { resolutionKey: key },
      );
    }
    const value = positiveNumber(row.selected.value, definition.fieldId);
    return [definition.outputKey, freezeDeep({
      fieldId: definition.fieldId,
      projectDataPath: definition.projectDataPath,
      value,
      unit: definition.unit,
      authority: row.selected.authority,
      sourceId: row.selected.sourceId,
      candidateSemanticHash: row.selected.semanticHash,
      resolutionRowSemanticHash: row.semanticHash,
      evidence: clonePlain(row.selected.evidence),
    })];
  }));

  const bindingMaterial = {
    schema: CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA,
    commonInputSemanticHash: requiredHash(current.semanticHash, 'commonInput.semanticHash'),
    commonInputSealSemanticHash: requiredHash(current.seal.semanticHash, 'commonInput.seal.semanticHash'),
    projectDataProfileSemanticHash,
    resolutionLedgerSemanticHash: resolution.semanticHash,
    forceFormula: 'massKg * gravityMPerS2 * loadFactor',
    gravity: selected.gravity,
    loadFactor: selected.loadFactor,
  };
  const bindingSemanticHash = semanticHash(bindingMaterial);
  const projectedProfile = bindBasisIntoProjectedProfile(profile, selected, bindingSemanticHash);
  const material = {
    ...bindingMaterial,
    bindingSemanticHash,
    projectedProfileSemanticHash: semanticHash(projectedProfile),
    resolutionLedger: resolution,
    profile: projectedProfile,
  };
  return requireCurrentCommonInputGravityLoadBasis({
    ...material,
    semanticHash: semanticHash(material),
  }, { commonInput: current });
}

export function requireCurrentCommonInputGravityLoadBasis(value, { commonInput = null } = {}) {
  if (!isRecord(value) || value.schema !== CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA) {
    throw codedError(
      `Expected ${CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA}.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_INVALID',
    );
  }
  const material = { ...value };
  delete material.semanticHash;
  if (requiredHash(value.semanticHash, 'semanticHash') !== semanticHash(material)) {
    throw codedError(
      'Current Common Input gravity/load basis semantic hash is stale.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_HASH_MISMATCH',
    );
  }
  for (const key of [
    'commonInputSemanticHash', 'commonInputSealSemanticHash',
    'projectDataProfileSemanticHash', 'resolutionLedgerSemanticHash',
    'bindingSemanticHash', 'projectedProfileSemanticHash',
  ]) requiredHash(value[key], key);
  if (value.forceFormula !== 'massKg * gravityMPerS2 * loadFactor') {
    throw codedError(
      'Current Common Input gravity/load basis force formula was altered.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_INVALID',
    );
  }
  requireSelectedValue(value.gravity, FIELD_DEFINITIONS[0]);
  requireSelectedValue(value.loadFactor, FIELD_DEFINITIONS[1]);
  validateResolutionLedger(value);
  validateBindingSemanticHash(value);
  if (!isRecord(value.profile) || semanticHash(value.profile) !== value.projectedProfileSemanticHash) {
    throw codedError(
      'Current Common Input gravity/load basis projected profile hash is stale.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_PROJECTED_PROFILE_MISMATCH',
    );
  }
  validateProjectedProfileBinding(value);

  if (commonInput !== null) {
    const current = requireReadyCommonInputShape(commonInput);
    if (value.commonInputSemanticHash !== current.semanticHash
        || value.commonInputSealSemanticHash !== current.seal.semanticHash
        || value.projectDataProfileSemanticHash !== semanticHash(current.projectDataProfile)) {
      throw codedError(
        'Current gravity/load basis does not bind the supplied Common Input snapshot.',
        'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_COMMON_INPUT_MISMATCH',
        {
          expectedCommonInputSemanticHash: current.semanticHash,
          actualCommonInputSemanticHash: value.commonInputSemanticHash,
        },
      );
    }
  }
  return freezeDeep(value);
}

function candidateFromProjectDataEntry({
  definition,
  profile,
  projectId,
  projectDataProfileSemanticHash,
}) {
  const entry = projectDataEntry(profile, definition.projectDataPath);
  if (!entry || entry.approved !== true || !isRecord(entry.evidence)
      || !stringValue(entry.evidence.source)) {
    throw codedError(
      `${definition.fieldId} requires approved effective Project Data evidence.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_AUTHORITY_INVALID',
      { fieldId: definition.fieldId, projectDataPath: definition.projectDataPath },
    );
  }
  const value = positiveNumber(entry.value, definition.fieldId);
  const declaredAuthority = stringValue(entry.evidence.authority);
  const authority = declaredAuthority || 'PROJECT_POLICY';
  if (authority !== 'PROJECT_POLICY' && authority !== 'PRODUCT_DEFAULT') {
    throw codedError(
      `${definition.fieldId} has unsupported effective authority ${authority}.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_AUTHORITY_INVALID',
      { fieldId: definition.fieldId, authority },
    );
  }
  if (authority === 'PRODUCT_DEFAULT') {
    requireExactProductDefault(definition, entry);
  }
  const evidence = {
    source: stringValue(entry.evidence.source),
    basis: stringValue(entry.evidence.basis) || null,
    projectDataPath: definition.projectDataPath,
    projectDataProfileSemanticHash,
    projectDataEntrySemanticHash: semanticHash(entry),
    projectDataEvidence: clonePlain(entry.evidence),
    authorityMigration: declaredAuthority ? null : {
      from: 'PROJECT_DATA_APPROVED',
      to: 'PROJECT_POLICY',
      reason: 'Legacy approved project-owned scalar field had no explicit authority token.',
    },
  };
  if (authority === 'PRODUCT_DEFAULT') {
    evidence.defaultId = entry.evidence.defaultId;
    evidence.defaultSemanticHash = entry.evidence.defaultSemanticHash;
    evidence.productDefaultProfileSemanticHash = entry.evidence.productDefaultProfileSemanticHash;
    evidence.profileId = entry.evidence.profileId;
    evidence.profileVersion = entry.evidence.profileVersion;
  }
  return createNonFeaEffectiveValueCandidate({
    candidateId: `current-common-input:${projectDataProfileSemanticHash}:${definition.fieldId}`,
    targetKind: 'PROJECT',
    targetId: projectId,
    fieldId: definition.fieldId,
    value,
    unit: definition.unit,
    authority,
    sourceId: stringValue(entry.evidence.defaultId)
      || stringValue(entry.evidence.source),
    evidence,
  });
}

function requireExactProductDefault(definition, entry) {
  const profile = LOAD_CALC_STANDARD_DEFAULTS_V1;
  const matches = (profile.defaults || []).filter((row) => (
    row.defaultId === definition.defaultId
    && row.projectDataPath === definition.projectDataPath
  ));
  const row = matches.length === 1 ? matches[0] : null;
  const evidence = entry.evidence;
  const profileHash = semanticHash(profile);
  if (!row
      || evidence.source !== PRODUCT_DEFAULT_SOURCE
      || evidence.basis !== row.basis
      || evidence.defaultId !== row.defaultId
      || evidence.defaultSemanticHash !== row.semanticHash
      || evidence.profileId !== profile.profileId
      || evidence.profileVersion !== profile.version
      || evidence.productDefaultProfileSemanticHash !== profileHash
      || semanticHash(entry.value) !== semanticHash(row.value)) {
    throw codedError(
      `${definition.fieldId} Product-default evidence does not match the authorized catalog row.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_PRODUCT_DEFAULT_MISMATCH',
      { fieldId: definition.fieldId, defaultId: definition.defaultId },
    );
  }
}

function bindBasisIntoProjectedProfile(profile, selected, bindingSemanticHash) {
  const projected = clonePlain(profile);
  for (const definition of FIELD_DEFINITIONS) {
    const selection = selected[definition.outputKey];
    const [groupKey, fieldKey] = definition.projectDataPath.split('.');
    const original = projectDataEntry(profile, definition.projectDataPath);
    projected[groupKey][fieldKey] = createEvidenceValue(
      selection.value,
      {
        ...clonePlain(original.evidence),
        effectiveExecutionAuthority: selection.authority,
        effectiveExecutionCandidateSemanticHash: selection.candidateSemanticHash,
        effectiveExecutionResolutionRowSemanticHash: selection.resolutionRowSemanticHash,
        gravityLoadBasisSchema: CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA,
        gravityLoadBasisBindingSemanticHash: bindingSemanticHash,
      },
      true,
    );
  }
  return freezeDeep(projected);
}

function validateResolutionLedger(value) {
  const ledger = value.resolutionLedger;
  if (!isRecord(ledger)
      || ledger.schema !== EFFECTIVE_LEDGER_SCHEMA
      || ledger.status !== 'RESOLVED'
      || !Array.isArray(ledger.rows)
      || ledger.rows.length !== FIELD_DEFINITIONS.length) {
    throw codedError(
      'Current gravity/load basis effective-value ledger is invalid.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_LEDGER_INVALID',
    );
  }
  const ledgerMaterial = { ...ledger };
  delete ledgerMaterial.semanticHash;
  if (requiredHash(ledger.semanticHash, 'resolutionLedger.semanticHash') !== semanticHash(ledgerMaterial)
      || ledger.semanticHash !== value.resolutionLedgerSemanticHash) {
    throw codedError(
      'Current gravity/load basis effective-value ledger hash is stale.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_LEDGER_HASH_MISMATCH',
    );
  }
  const projectId = ledger.rows[0]?.targetId;
  for (const definition of FIELD_DEFINITIONS) {
    const selectedProjection = value[definition.outputKey];
    const key = `PROJECT|${projectId}|${definition.fieldId}`;
    const row = ledger.rows.find((item) => item.resolutionKey === key);
    if (!isRecord(row)
        || row.schema !== EFFECTIVE_ROW_SCHEMA
        || row.status !== 'RESOLVED'
        || !isRecord(row.selected)) {
      throw codedError(
        `Current gravity/load basis ledger row is invalid for ${definition.fieldId}.`,
        'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_LEDGER_INVALID',
      );
    }
    const rowMaterial = { ...row };
    delete rowMaterial.semanticHash;
    const candidateMaterial = { ...row.selected };
    delete candidateMaterial.semanticHash;
    if (requiredHash(row.semanticHash, `${definition.fieldId}.resolutionRowSemanticHash`) !== semanticHash(rowMaterial)
        || requiredHash(row.selected.semanticHash, `${definition.fieldId}.candidateSemanticHash`) !== semanticHash(candidateMaterial)
        || row.semanticHash !== selectedProjection.resolutionRowSemanticHash
        || row.selected.semanticHash !== selectedProjection.candidateSemanticHash
        || row.selected.fieldId !== selectedProjection.fieldId
        || row.selected.value !== selectedProjection.value
        || row.selected.unit !== selectedProjection.unit
        || row.selected.authority !== selectedProjection.authority
        || row.selected.sourceId !== selectedProjection.sourceId
        || semanticHash(row.selected.evidence) !== semanticHash(selectedProjection.evidence)) {
      throw codedError(
        `Current gravity/load basis selected-value ledger custody is inconsistent for ${definition.fieldId}.`,
        'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_LEDGER_BINDING_MISMATCH',
      );
    }
  }
}

function validateBindingSemanticHash(value) {
  const bindingMaterial = {
    schema: CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA,
    commonInputSemanticHash: value.commonInputSemanticHash,
    commonInputSealSemanticHash: value.commonInputSealSemanticHash,
    projectDataProfileSemanticHash: value.projectDataProfileSemanticHash,
    resolutionLedgerSemanticHash: value.resolutionLedgerSemanticHash,
    forceFormula: value.forceFormula,
    gravity: value.gravity,
    loadFactor: value.loadFactor,
  };
  if (value.bindingSemanticHash !== semanticHash(bindingMaterial)) {
    throw codedError(
      'Current gravity/load basis binding semantic hash is stale.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_BINDING_HASH_MISMATCH',
    );
  }
}

function validateProjectedProfileBinding(value) {
  for (const definition of FIELD_DEFINITIONS) {
    const selected = value[definition.outputKey];
    const entry = projectDataEntry(value.profile, definition.projectDataPath);
    if (!entry || entry.approved !== true
        || entry.value !== selected.value
        || entry.evidence?.effectiveExecutionAuthority !== selected.authority
        || entry.evidence?.effectiveExecutionCandidateSemanticHash !== selected.candidateSemanticHash
        || entry.evidence?.effectiveExecutionResolutionRowSemanticHash !== selected.resolutionRowSemanticHash
        || entry.evidence?.gravityLoadBasisSchema !== CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_SCHEMA
        || entry.evidence?.gravityLoadBasisBindingSemanticHash !== value.bindingSemanticHash) {
      throw codedError(
        `Projected profile does not retain exact ${definition.fieldId} execution-basis custody.`,
        'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_PROJECTED_PROFILE_MISMATCH',
        { fieldId: definition.fieldId },
      );
    }
  }
}

function requireSelectedValue(value, definition) {
  if (!isRecord(value)
      || value.fieldId !== definition.fieldId
      || value.projectDataPath !== definition.projectDataPath
      || value.unit !== definition.unit
      || !['PROJECT_POLICY', 'PRODUCT_DEFAULT'].includes(value.authority)
      || !stringValue(value.sourceId)) {
    throw codedError(
      `${definition.fieldId} selected-value custody is invalid.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_INVALID',
    );
  }
  positiveNumber(value.value, definition.fieldId);
  requiredHash(value.candidateSemanticHash, `${definition.fieldId}.candidateSemanticHash`);
  requiredHash(value.resolutionRowSemanticHash, `${definition.fieldId}.resolutionRowSemanticHash`);
}

function requireReadyCommonInputShape(value) {
  if (!isRecord(value)
      || value.packageState !== 'READY'
      || !isRecord(value.projectDataProfile)
      || !isRecord(value.seal)) {
    throw codedError(
      'Gravity/load basis requires a READY sealed Common Input.',
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_COMMON_INPUT_INVALID',
    );
  }
  requiredHash(value.semanticHash, 'commonInput.semanticHash');
  requiredHash(value.seal.semanticHash, 'commonInput.seal.semanticHash');
  return value;
}

function positiveNumber(value, label) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw codedError(
      `${label} must be present and greater than zero.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_VALUE_INVALID',
      { fieldId: label, value },
    );
  }
  const number = Number(value);
  if (!Number.isFinite(number) || !(number > 0)) {
    throw codedError(
      `${label} must be finite and greater than zero.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_VALUE_INVALID',
      { fieldId: label, value },
    );
  }
  return number;
}

function requiredHash(value, label) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw codedError(
      `${label} must be an FNV-1a semantic hash.`,
      'CURRENT_COMMON_INPUT_GRAVITY_LOAD_BASIS_INVALID',
    );
  }
  return value;
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : freezeDeep(clonePlain(details));
  return error;
}
