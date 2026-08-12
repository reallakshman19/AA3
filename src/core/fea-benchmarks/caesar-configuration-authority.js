/**
 * Normalize and resolve layered CAESAR configuration authority.
 *
 * Profiles carry raw settings at their original scope. The declaration is
 * written lowest-to-highest authority exactly as governed:
 *
 *   overall/global default < individual-file setting < load-case setting < model input
 *
 * Resolution therefore starts at the global default and lets each higher layer
 * replace it, so the model input is the final authority. The resolver walks the
 * declared array itself rather than a second hard-coded order, which keeps the
 * executed precedence and the published declaration from drifting apart.
 *
 * Unsupported or unresolved settings raise explicit errors; callers never infer
 * an effective value from CASE text.
 */

import { deepFreeze } from '../shared-piping-model/immutable.js';

export const CAESAR_CONFIGURATION_AUTHORITY_SCHEMA =
  'caesar-configuration-authority/v1';

/** Declared authority layers, lowest authority first. */
export const CAESAR_CONFIGURATION_PRECEDENCE = Object.freeze([
  'OVERALL_GLOBAL_DEFAULT',
  'INDIVIDUAL_FILE_SETTING',
  'LOAD_CASE_SETTING',
  'MODEL_INPUT',
]);

export const CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION = 'LOWEST_TO_HIGHEST_AUTHORITY';

const LAYER_BY_LEVEL = Object.freeze({
  OVERALL_GLOBAL_DEFAULT: 'overallGlobalDefault',
  INDIVIDUAL_FILE_SETTING: 'individualFile',
  LOAD_CASE_SETTING: 'loadCase',
  MODEL_INPUT: 'modelInput',
});

/** Validate and freeze one reusable CAESAR configuration authority record. */
export function normalizeCaesarConfigurationAuthority(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('configurationAuthority must be an object.');
  }
  if (input.schema !== CAESAR_CONFIGURATION_AUTHORITY_SCHEMA) {
    throw new TypeError(`Unsupported configurationAuthority schema ${String(input.schema)}.`);
  }
  const precedence = stringArray(input.precedence, 'configurationAuthority.precedence');
  if (!sameStrings(precedence, CAESAR_CONFIGURATION_PRECEDENCE)) {
    throw new TypeError(
      'configurationAuthority.precedence must be declared lowest authority first as '
      + `${CAESAR_CONFIGURATION_PRECEDENCE.join(' < ')}.`,
    );
  }
  if (input.precedenceDirection !== undefined
    && input.precedenceDirection !== CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION) {
    throw new TypeError(
      `configurationAuthority.precedenceDirection must be ${CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION}.`,
    );
  }
  const layers = input.layers;
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) {
    throw new TypeError('configurationAuthority.layers must be an object.');
  }
  const normalized = {
    schema: CAESAR_CONFIGURATION_AUTHORITY_SCHEMA,
    caesarVersion: nonempty(input.caesarVersion, 'configurationAuthority.caesarVersion'),
    precedence,
    precedenceDirection: CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION,
    precedenceSource: input.precedenceSource === undefined || input.precedenceSource === null
      ? null
      : nonempty(input.precedenceSource, 'configurationAuthority.precedenceSource'),
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

/** Resolve one effective setting using the frozen precedence declaration. */
export function resolveCaesarConfigurationSetting(authorityInput, settingInput, caseIdInput) {
  const ledger = resolveCaesarConfigurationLedger(authorityInput, settingInput, caseIdInput);
  if (ledger.resolved === null) {
    throw new TypeError(
      `CAESAR setting ${ledger.setting}${ledger.caseId === null ? '' : ` for ${ledger.caseId}`} has no declared authority value.`,
    );
  }
  return ledger.resolved;
}

/**
 * Resolve one setting and retain every declared layer candidate.
 *
 * The ledger is the per-case resolved-configuration evidence: it shows which
 * layers declared the setting, which layer won, and why, without the caller
 * re-deriving the precedence.
 *
 * @param {Record<string, unknown>} authorityInput Raw configuration authority.
 * @param {string} settingInput Setting name.
 * @param {string|null} caseIdInput Load case, or null for file-level resolution.
 * @returns {Record<string, unknown>} Frozen ledger record; `resolved` is null when undeclared.
 */
export function resolveCaesarConfigurationLedger(authorityInput, settingInput, caseIdInput) {
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
  const candidates = authority.precedence.map((level) => {
    const layer = authority.layers[LAYER_BY_LEVEL[level]];
    const settings = level === 'LOAD_CASE_SETTING'
      ? (caseId === null ? undefined : layer.cases[caseId])
      : layer.settings;
    const declared = settings !== undefined && settings[setting] !== undefined;
    return {
      level,
      source: layer.source,
      applicable: level !== 'LOAD_CASE_SETTING' || caseId !== null,
      declared,
      value: declared ? settings[setting] : null,
    };
  });
  // The declaration is lowest-to-highest authority, so the winner is the last
  // declared candidate in declared order.
  const winner = [...candidates].reverse().find((entry) => entry.declared) ?? null;
  return deepFreeze({
    schema: 'caesar-configuration-resolution-ledger/v1',
    setting,
    caseId,
    precedence: authority.precedence,
    precedenceDirection: CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION,
    candidates,
    resolved: winner === null ? null : {
      setting,
      caseId,
      level: winner.level,
      value: winner.value,
      source: winner.source,
    },
  });
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
