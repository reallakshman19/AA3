/**
 * Normalize and resolve layered CAESAR configuration authority.
 *
 * v1 records preserve the historical high-to-low declaration used by the
 * existing non-friction benchmarks. v2 records make precedence explicit in
 * the owner-governed low-to-high form:
 * overall/global < individual file < load case < model input.
 */

import { deepFreeze } from '../shared-piping-model/immutable.js';

export const CAESAR_CONFIGURATION_AUTHORITY_SCHEMA =
  'caesar-configuration-authority/v1';
export const CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA =
  'caesar-configuration-authority/v2';

// Compatibility constant for frozen v1 profiles.
export const CAESAR_CONFIGURATION_PRECEDENCE = Object.freeze([
  'LOAD_CASE_SETTING',
  'INDIVIDUAL_FILE_SETTING',
  'MODEL_INPUT',
  'OVERALL_GLOBAL_DEFAULT',
]);

// M047 Stage 2 authority: lowest -> highest.
export const CAESAR_CONFIGURATION_PRECEDENCE_LOW_TO_HIGH = Object.freeze([
  'OVERALL_GLOBAL_DEFAULT',
  'INDIVIDUAL_FILE_SETTING',
  'LOAD_CASE_SETTING',
  'MODEL_INPUT',
]);

/** Validate and freeze one reusable CAESAR configuration authority record. */
export function normalizeCaesarConfigurationAuthority(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('configurationAuthority must be an object.');
  }
  const schema = nonempty(input.schema, 'configurationAuthority.schema');
  const expectedPrecedence = schema === CAESAR_CONFIGURATION_AUTHORITY_SCHEMA
    ? CAESAR_CONFIGURATION_PRECEDENCE
    : schema === CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA
      ? CAESAR_CONFIGURATION_PRECEDENCE_LOW_TO_HIGH
      : null;
  if (expectedPrecedence === null) {
    throw new TypeError(`Unsupported configurationAuthority schema ${String(input.schema)}.`);
  }
  const precedence = stringArray(input.precedence, 'configurationAuthority.precedence');
  if (!sameStrings(precedence, expectedPrecedence)) {
    throw new TypeError(
      `configurationAuthority.precedence must be ${expectedPrecedence.join(' < ')} for ${schema}.`,
    );
  }
  const layers = input.layers;
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) {
    throw new TypeError('configurationAuthority.layers must be an object.');
  }
  const normalized = {
    schema,
    caesarVersion: nonempty(input.caesarVersion, 'configurationAuthority.caesarVersion'),
    precedence,
    layers: {
      overallGlobalDefault: normalizeLayer(
        layers.overallGlobalDefault,
        'configurationAuthority.layers.overallGlobalDefault',
      ),
      modelInput: normalizeLayer(
        layers.modelInput,
        'configurationAuthority.layers.modelInput',
      ),
      individualFile: normalizeLayer(
        layers.individualFile,
        'configurationAuthority.layers.individualFile',
      ),
      loadCase: normalizeLoadCaseLayer(
        layers.loadCase,
        'configurationAuthority.layers.loadCase',
      ),
    },
    unresolvedSettings: normalizeUnresolved(input.unresolvedSettings),
  };
  return deepFreeze(normalized);
}

/** Resolve one effective setting using the authority record's declared schema. */
export function resolveCaesarConfigurationSetting(authorityInput, settingInput, caseIdInput) {
  const trace = resolveCaesarConfigurationSettingTrace(authorityInput, settingInput, caseIdInput);
  const resolved = trace.applied[trace.applied.length - 1];
  if (!resolved) {
    throw new TypeError(
      `CAESAR setting ${trace.setting}${trace.caseId === null ? '' : ` for ${trace.caseId}`} has no declared authority value.`,
    );
  }
  return deepFreeze({
    setting: trace.setting,
    caseId: trace.caseId,
    level: resolved.level,
    value: resolved.value,
    source: resolved.source,
  });
}

/**
 * Return every applied authority layer in resolution order. For v2 this is
 * the governed low-to-high order and the final entry is the effective value.
 * For v1, the trace is normalized low-to-high even though its stored
 * precedence declaration is historical high-to-low.
 */
export function resolveCaesarConfigurationSettingTrace(authorityInput, settingInput, caseIdInput) {
  const authority = normalizeCaesarConfigurationAuthority(authorityInput);
  const setting = nonempty(settingInput, 'setting');
  const caseId = caseIdInput === null ? null : nonempty(caseIdInput, 'caseId');
  const unresolved = authority.unresolvedSettings.find((entry) =>
    entry.setting === setting && (entry.caseId === null || entry.caseId === caseId));
  if (unresolved) {
    throw new TypeError(
      `CAESAR setting ${setting}${caseId === null ? '' : ` for ${caseId}`} is unresolved: ${unresolved.reason}`,
    );
  }
  const candidates = lowToHighCandidates(authority, setting, caseId);
  const applied = candidates
    .filter((entry) => entry.value !== undefined)
    .map((entry) => deepFreeze({ ...entry }));
  return deepFreeze({ setting, caseId, schema: authority.schema, applied });
}

function lowToHighCandidates(authority, setting, caseId) {
  const byLevel = {
    OVERALL_GLOBAL_DEFAULT: {
      level: 'OVERALL_GLOBAL_DEFAULT',
      value: authority.layers.overallGlobalDefault.settings[setting],
      source: authority.layers.overallGlobalDefault.source,
    },
    INDIVIDUAL_FILE_SETTING: {
      level: 'INDIVIDUAL_FILE_SETTING',
      value: authority.layers.individualFile.settings[setting],
      source: authority.layers.individualFile.source,
    },
    LOAD_CASE_SETTING: {
      level: 'LOAD_CASE_SETTING',
      value: caseId === null ? undefined : authority.layers.loadCase.cases[caseId]?.[setting],
      source: authority.layers.loadCase.source,
    },
    MODEL_INPUT: {
      level: 'MODEL_INPUT',
      value: authority.layers.modelInput.settings[setting],
      source: authority.layers.modelInput.source,
    },
  };
  const order = authority.schema === CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA
    ? authority.precedence
    : [...authority.precedence].reverse();
  return order.map((level) => byLevel[level]);
}

/**
 * Migrate a frozen v1 authority record to Stage 2 friction semantics without
 * mutating the original non-friction profile. Case-level COEFFICIENT_OF_FRICTION_MU
 * entries are removed and replaced by the supplied FRICTION_MULTIPLIER map;
 * model-input mu remains a distinct highest-authority quantity.
 */
export function migrateCaesarFrictionAuthorityV1ToV2(authorityInput, frictionMultipliersInput) {
  const authority = normalizeCaesarConfigurationAuthority(authorityInput);
  if (authority.schema !== CAESAR_CONFIGURATION_AUTHORITY_SCHEMA) {
    throw new TypeError('Friction authority migration requires a v1 source authority.');
  }
  const multipliers = frictionMultipliersInput;
  if (!multipliers || typeof multipliers !== 'object' || Array.isArray(multipliers)) {
    throw new TypeError('frictionMultipliers must be an object keyed by primitive case ID.');
  }
  const modelMu = authority.layers.modelInput.settings.COEFFICIENT_OF_FRICTION_MU;
  if (!Number.isFinite(Number(modelMu)) || Number(modelMu) < 0) {
    throw new TypeError('Model input must declare a finite nonnegative COEFFICIENT_OF_FRICTION_MU.');
  }
  const cases = {};
  for (const caseId of Object.keys(authority.layers.loadCase.cases).sort(compareText)) {
    const source = authority.layers.loadCase.cases[caseId];
    const migrated = Object.fromEntries(Object.entries(source)
      .filter(([setting]) => setting !== 'COEFFICIENT_OF_FRICTION_MU'));
    if (Object.prototype.hasOwnProperty.call(multipliers, caseId)) {
      migrated.FRICTION_MULTIPLIER = finiteNonnegativeSetting(
        multipliers[caseId],
        `frictionMultipliers.${caseId}`,
      );
    }
    cases[caseId] = migrated;
  }
  const unknown = Object.keys(multipliers).filter((caseId) => !(caseId in cases));
  if (unknown.length > 0) {
    throw new TypeError(`Friction multiplier cases are not declared by the authority: ${unknown.join(', ')}.`);
  }
  return normalizeCaesarConfigurationAuthority({
    schema: CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA,
    caesarVersion: authority.caesarVersion,
    precedence: [...CAESAR_CONFIGURATION_PRECEDENCE_LOW_TO_HIGH],
    layers: {
      overallGlobalDefault: authority.layers.overallGlobalDefault,
      individualFile: authority.layers.individualFile,
      loadCase: {
        source: authority.layers.loadCase.source,
        cases,
      },
      modelInput: authority.layers.modelInput,
    },
    unresolvedSettings: authority.unresolvedSettings,
  });
}

function finiteNonnegativeSetting(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${field} must be finite and nonnegative.`);
  return number;
}

function normalizeLayer(input, field) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`${field} must be an object.`);
  }
  return {
    source: nonempty(input.source, `${field}.source`),
    settings: normalizeSettings(input.settings, `${field}.settings`),
  };
}

function normalizeLoadCaseLayer(input, field) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`${field} must be an object.`);
  }
  if (!input.cases || typeof input.cases !== 'object' || Array.isArray(input.cases)) {
    throw new TypeError(`${field}.cases must be an object.`);
  }
  const cases = {};
  for (const caseId of Object.keys(input.cases).sort(compareText)) {
    cases[nonempty(caseId, `${field}.caseId`)] = normalizeSettings(
      input.cases[caseId],
      `${field}.cases.${caseId}`,
    );
  }
  return { source: nonempty(input.source, `${field}.source`), cases };
}

function normalizeSettings(input, field) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`${field} must be an object.`);
  }
  const settings = {};
  for (const key of Object.keys(input).sort(compareText)) {
    settings[nonempty(key, `${field}.key`)] = normalizeSettingValue(input[key], `${field}.${key}`);
  }
  return settings;
}

function normalizeSettingValue(value, field) {
  if (typeof value === 'string') return nonempty(value, field);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value).sort(compareText);
    if (!sameStrings(keys, ['unit', 'value'])) {
      throw new TypeError(`${field} measurement must contain exactly unit and value.`);
    }
    const number = Number(value.value);
    if (!Number.isFinite(number)) throw new TypeError(`${field}.value must be finite.`);
    return { value: number, unit: nonempty(value.unit, `${field}.unit`) };
  }
  throw new TypeError(`${field} must be a finite number, boolean, nonempty string, or measurement.`);
}

function normalizeUnresolved(input) {
  if (!Array.isArray(input)) throw new TypeError('configurationAuthority.unresolvedSettings must be an array.');
  const identities = new Set();
  return input.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(`configurationAuthority.unresolvedSettings[${index}] must be an object.`);
    }
    const setting = nonempty(entry.setting, `configurationAuthority.unresolvedSettings[${index}].setting`);
    const caseId = entry.caseId === null ? null : nonempty(
      entry.caseId,
      `configurationAuthority.unresolvedSettings[${index}].caseId`,
    );
    const identity = `${setting}|${caseId ?? '*'}`;
    if (identities.has(identity)) throw new TypeError(`Duplicate unresolved CAESAR setting ${identity}.`);
    identities.add(identity);
    return {
      setting,
      caseId,
      reason: nonempty(entry.reason, `configurationAuthority.unresolvedSettings[${index}].reason`),
    };
  }).sort((left, right) => compareText(
    `${left.setting}|${left.caseId ?? '*'}`,
    `${right.setting}|${right.caseId ?? '*'}`,
  ));
}

function stringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field} must be a nonempty array.`);
  return value.map((entry, index) => nonempty(entry, `${field}[${index}]`));
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} must be nonempty.`);
  return text;
}

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}