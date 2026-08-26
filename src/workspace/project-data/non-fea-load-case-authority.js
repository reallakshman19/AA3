import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import { LOAD_CALC_STANDARD_DEFAULTS_V1 } from './non-fea-product-default-profile.js';

export const NON_FEA_LOAD_CASE_AUTHORITY_SCHEMA = 'non-fea-load-case-authority/v1';
export const NON_FEA_CANONICAL_LOAD_CASE_IDS = Object.freeze(['EMPTY', 'OPE', 'HYD']);

const ACTIVE_LOAD_CASES_PATH = 'loadCalculation.activeLoadCases';
const ACTIVE_LOAD_CASES_DEFAULT_ID = 'PD-ACTIVE-CASES';
const PRODUCT_DEFAULT_SOURCE = 'Load Calc built-in product default';
const ACTIVE_LOAD_CASES_PRODUCT_DEFAULT = authorizedActiveCasesProductDefault();

/**
 * Resolves the active canonical load-case set from the effective Project Data
 * profile. The effective profile may contain a higher-authority project/source
 * value or the exact hash-bound Product default composed by the authorized
 * Product-default provider. Raw missing, unapproved, empty, unknown, forged,
 * or cross-bound Product-default authority remains fail-closed.
 */
export function createNonFeaLoadCaseAuthority(profile) {
  if (!isRecord(profile)) throw new TypeError('Load-case authority requires a Project Data profile.');
  const entry = profile?.loadCalculation?.activeLoadCases;
  const blockers = [];
  let approvedLoadCases = [];
  let provenance = null;

  if (!entry || !Object.hasOwn(entry, 'value')) {
    blockers.push(issue('ACTIVE_LOAD_CASES_MISSING', ACTIVE_LOAD_CASES_PATH, 'Effective active Load Cases are missing.'));
  } else if (entry.approved !== true || !isRecord(entry.evidence) || !stringValue(entry.evidence.source)) {
    blockers.push(issue('ACTIVE_LOAD_CASES_NOT_APPROVED', ACTIVE_LOAD_CASES_PATH, 'Active Load Cases require approved effective authority evidence.'));
  } else {
    provenance = effectiveAuthorityProvenance(entry.evidence);
    if (provenance.authority === 'PRODUCT_DEFAULT'
        && !validProductDefaultProvenance(provenance, entry.value)) {
      blockers.push(issue(
        'ACTIVE_LOAD_CASES_PRODUCT_DEFAULT_EVIDENCE_INVALID',
        ACTIVE_LOAD_CASES_PATH,
        'Product-default active Load Cases do not match the authorized built-in default/profile provenance.',
      ));
    }
    if (!Array.isArray(entry.value) || entry.value.length === 0) {
      blockers.push(issue('ACTIVE_LOAD_CASES_EMPTY', ACTIVE_LOAD_CASES_PATH, 'At least one active Load Case is required.'));
    } else {
      const supplied = [...new Set(entry.value.map((value) => stringValue(value).toUpperCase()).filter(Boolean))];
      const unsupported = supplied.filter((value) => !NON_FEA_CANONICAL_LOAD_CASE_IDS.includes(value)).sort();
      if (unsupported.length) {
        blockers.push(issue('ACTIVE_LOAD_CASE_UNKNOWN', ACTIVE_LOAD_CASES_PATH, `Unknown canonical Load Cases: ${unsupported.join(', ')}.`));
      }
      approvedLoadCases = NON_FEA_CANONICAL_LOAD_CASE_IDS.filter((value) => supplied.includes(value));
    }
  }

  const ready = blockers.length === 0;
  const base = {
    schema: NON_FEA_LOAD_CASE_AUTHORITY_SCHEMA,
    projectDataRevision: Number.isInteger(profile.revision) ? profile.revision : null,
    state: ready ? 'READY' : 'BLOCKED',
    approvedLoadCases: ready ? approvedLoadCases : [],
    effectiveAuthority: ready ? provenance.authority : null,
    evidenceSource: ready ? provenance.source : null,
    provenance: ready ? provenance : null,
    blockers: blockers.sort((left, right) => `${left.code}|${left.path}`.localeCompare(`${right.code}|${right.path}`)),
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

export function assertRequestedLoadCasesAuthorized(authority, requestedLoadCases) {
  requireAuthority(authority);
  if (!Array.isArray(requestedLoadCases)) throw codedError('Requested Load Cases must be an array.', 'LOAD_CASE_REQUEST_INVALID');
  const supplied = [...new Set(requestedLoadCases.map((value) => stringValue(value).toUpperCase()).filter(Boolean))];
  const unknown = supplied.filter((value) => !NON_FEA_CANONICAL_LOAD_CASE_IDS.includes(value)).sort();
  const unauthorized = supplied.filter((value) => (
    NON_FEA_CANONICAL_LOAD_CASE_IDS.includes(value)
    && !authority.approvedLoadCases.includes(value)
  ));
  const rejected = [...unknown, ...unauthorized];
  if (rejected.length) {
    const error = codedError(
      `Requested Load Cases are outside approved effective authority: ${rejected.join(', ')}.`,
      'LOAD_CASE_NOT_PROJECT_DATA_APPROVED',
    );
    error.details = rejected;
    throw error;
  }
  return freezeDeep(NON_FEA_CANONICAL_LOAD_CASE_IDS.filter((value) => supplied.includes(value)));
}

export function assertEmpiricalCaseConfigurationsAuthorized(authority, caseConfigurations) {
  requireAuthority(authority);
  if (!Array.isArray(caseConfigurations)) throw codedError('Empirical case configurations must be an array.', 'LOAD_CASE_CONFIGURATION_INVALID');
  const primitiveCases = [...new Set(caseConfigurations
    .map((row) => row?.weightPrimitiveCaseId)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => stringValue(value).toUpperCase())
    .filter(Boolean))];
  return assertRequestedLoadCasesAuthorized(authority, primitiveCases);
}

function effectiveAuthorityProvenance(evidence) {
  return freezeDeep({
    authority: stringValue(evidence.authority) || 'PROJECT_DATA_APPROVED',
    source: stringValue(evidence.source),
    basis: stringValue(evidence.basis) || null,
    defaultId: stringValue(evidence.defaultId) || null,
    defaultSemanticHash: stringValue(evidence.defaultSemanticHash) || null,
    profileId: stringValue(evidence.profileId) || null,
    profileVersion: Number.isInteger(evidence.profileVersion) ? evidence.profileVersion : null,
    productDefaultProfileSemanticHash: stringValue(evidence.productDefaultProfileSemanticHash) || null,
  });
}

function validProductDefaultProvenance(provenance, effectiveValue) {
  const expected = ACTIVE_LOAD_CASES_PRODUCT_DEFAULT;
  return Boolean(
    expected
    && provenance.source === PRODUCT_DEFAULT_SOURCE
    && provenance.basis === expected.row.basis
    && provenance.defaultId === expected.row.defaultId
    && provenance.defaultSemanticHash === expected.row.semanticHash
    && provenance.profileId === expected.profileId
    && provenance.profileVersion === expected.profileVersion
    && provenance.productDefaultProfileSemanticHash === expected.profileSemanticHash
    && semanticHash(effectiveValue) === expected.valueSemanticHash
  );
}

/**
 * Resolves the one built-in authority row this module is permitted to trust.
 * If the Product-default catalog itself is malformed, Product-default evidence
 * fails closed rather than accepting a merely well-shaped evidence object.
 */
function authorizedActiveCasesProductDefault() {
  const profile = LOAD_CALC_STANDARD_DEFAULTS_V1;
  if (!isRecord(profile)
      || !stringValue(profile.profileId)
      || !Number.isInteger(profile.version)
      || profile.version < 1
      || !Array.isArray(profile.defaults)) return null;
  const matches = profile.defaults.filter((row) => (
    row?.defaultId === ACTIVE_LOAD_CASES_DEFAULT_ID
    && row?.projectDataPath === ACTIVE_LOAD_CASES_PATH
  ));
  if (matches.length !== 1) return null;
  const row = matches[0];
  if (!stringValue(row.basis) || !stringValue(row.unit) || !Object.hasOwn(row, 'value')) return null;
  const expectedRowHash = semanticHash({
    defaultId: row.defaultId,
    projectDataPath: row.projectDataPath,
    value: row.value,
    unit: row.unit,
    basis: row.basis,
  });
  if (row.semanticHash !== expectedRowHash) return null;
  return freezeDeep({
    row,
    profileId: profile.profileId,
    profileVersion: profile.version,
    profileSemanticHash: semanticHash(profile),
    valueSemanticHash: semanticHash(row.value),
  });
}

function requireAuthority(authority) {
  if (!isRecord(authority) || authority.schema !== NON_FEA_LOAD_CASE_AUTHORITY_SCHEMA) {
    throw codedError(`Expected ${NON_FEA_LOAD_CASE_AUTHORITY_SCHEMA}.`, 'LOAD_CASE_AUTHORITY_INVALID');
  }
  if (authority.state !== 'READY') {
    const error = codedError('Effective Load Case authority is not ready.', 'LOAD_CASE_AUTHORITY_NOT_READY');
    error.details = authority.blockers || [];
    throw error;
  }
}

function issue(code, path, message) {
  return freezeDeep({ code, path, message });
}
function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
