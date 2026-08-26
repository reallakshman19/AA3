import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, isRecord, stringValue } from '../dataset-utils.js';

export const NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA =
  'non-fea-gravity-method-authority/v1';
export const NON_FEA_GRAVITY_METHOD_AUTO = 'AUTO';
export const NON_FEA_GRAVITY_METHOD_V2 = 'CHAINAGE_TRIBUTARY_SPAN_V2';
export const NON_FEA_GRAVITY_METHOD_V3_COG = 'CHAINAGE_TRIBUTARY_SPAN_V3_COG';
export const NON_FEA_GRAVITY_METHOD_REQUEST_IDS = Object.freeze([
  NON_FEA_GRAVITY_METHOD_AUTO,
  NON_FEA_GRAVITY_METHOD_V2,
  NON_FEA_GRAVITY_METHOD_V3_COG,
]);

const PRODUCT_DEFAULT_ID = 'PD-GRAVITY-METHOD';

/**
 * Resolves the governed gravity-method request from an effective Project Data
 * profile. Product-default composition is intentionally external to this
 * contract: a raw empty profile remains blocked, while an effective profile may
 * carry hash-bound PRODUCT_DEFAULT evidence for AUTO.
 */
export function createNonFeaGravityMethodAuthority(profile) {
  if (!isRecord(profile)) {
    throw new TypeError('Gravity-method authority requires a Project Data profile.');
  }
  const entry = profile?.loadCalculation?.gravityMethod;
  const blockers = [];
  let requestedMethod = null;
  let provenance = null;

  if (!entry || !Object.hasOwn(entry, 'value')) {
    blockers.push(issue(
      'GRAVITY_METHOD_MISSING',
      'loadCalculation.gravityMethod',
      'Effective gravity-method request is missing.',
    ));
  } else if (
    entry.approved !== true
    || !isRecord(entry.evidence)
    || !stringValue(entry.evidence.source)
  ) {
    blockers.push(issue(
      'GRAVITY_METHOD_NOT_APPROVED',
      'loadCalculation.gravityMethod',
      'Gravity-method request requires approved effective authority evidence.',
    ));
  } else {
    requestedMethod = normalizeMethod(entry.value);
    provenance = authorityProvenance(entry.evidence);
    if (!requestedMethod) {
      blockers.push(issue(
        'GRAVITY_METHOD_EMPTY',
        'loadCalculation.gravityMethod',
        'Gravity-method request cannot be empty.',
      ));
    } else if (!NON_FEA_GRAVITY_METHOD_REQUEST_IDS.includes(requestedMethod)) {
      blockers.push(issue(
        'GRAVITY_METHOD_UNKNOWN',
        'loadCalculation.gravityMethod',
        `Unsupported gravity-method request: ${requestedMethod}.`,
      ));
    }
    if (
      provenance.authority === 'PRODUCT_DEFAULT'
      && !validProductDefaultProvenance(provenance)
    ) {
      blockers.push(issue(
        'GRAVITY_METHOD_PRODUCT_DEFAULT_EVIDENCE_INVALID',
        'loadCalculation.gravityMethod',
        'Product-default gravity method requires bound PD-GRAVITY-METHOD profile provenance.',
      ));
    }
  }

  const ready = blockers.length === 0;
  const base = {
    schema: NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA,
    projectDataRevision: Number.isInteger(profile.revision) ? profile.revision : null,
    projectDataSemanticHash: semanticHash(profile),
    state: ready ? 'READY' : 'BLOCKED',
    requestedMethod: ready ? requestedMethod : null,
    effectiveAuthority: ready ? provenance.authority : null,
    evidenceSource: ready ? provenance.source : null,
    provenance: ready ? provenance : null,
    blockers: blockers.sort(byBlocker),
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

export function requireNonFeaGravityMethodAuthority(value) {
  if (!isRecord(value) || value.schema !== NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA) {
    throw codedError(
      `Expected ${NON_FEA_GRAVITY_METHOD_AUTHORITY_SCHEMA}.`,
      'GRAVITY_METHOD_AUTHORITY_INVALID',
    );
  }
  const { semanticHash: supplied, ...base } = value;
  if (supplied !== semanticHash(base)) {
    throw codedError(
      'Gravity-method authority semantic hash mismatch.',
      'GRAVITY_METHOD_AUTHORITY_HASH_MISMATCH',
    );
  }
  if (!stringValue(value.projectDataSemanticHash)) {
    throw codedError(
      'Gravity-method authority requires an effective Project Data semantic hash.',
      'GRAVITY_METHOD_AUTHORITY_PROFILE_HASH_INVALID',
    );
  }
  if (!['READY', 'BLOCKED'].includes(value.state) || !Array.isArray(value.blockers)) {
    throw codedError(
      'Gravity-method authority state is invalid.',
      'GRAVITY_METHOD_AUTHORITY_STATE_INVALID',
    );
  }
  if (value.state === 'READY') {
    const method = normalizeMethod(value.requestedMethod);
    if (!NON_FEA_GRAVITY_METHOD_REQUEST_IDS.includes(method) || value.blockers.length !== 0) {
      throw codedError(
        'READY gravity-method authority is internally inconsistent.',
        'GRAVITY_METHOD_AUTHORITY_STATE_INVALID',
      );
    }
    if (!isRecord(value.provenance) || value.effectiveAuthority !== value.provenance.authority) {
      throw codedError(
        'READY gravity-method authority provenance is invalid.',
        'GRAVITY_METHOD_AUTHORITY_PROVENANCE_INVALID',
      );
    }
    if (
      value.provenance.authority === 'PRODUCT_DEFAULT'
      && !validProductDefaultProvenance(value.provenance)
    ) {
      throw codedError(
        'READY Product-default gravity-method provenance is invalid.',
        'GRAVITY_METHOD_AUTHORITY_PROVENANCE_INVALID',
      );
    }
  } else if (
    value.requestedMethod !== null
    || value.effectiveAuthority !== null
    || value.evidenceSource !== null
    || value.provenance !== null
    || value.blockers.length === 0
  ) {
    throw codedError(
      'BLOCKED gravity-method authority is internally inconsistent.',
      'GRAVITY_METHOD_AUTHORITY_STATE_INVALID',
    );
  }
  return freezeDeep(structuredClone(value));
}

export function requireReadyNonFeaGravityMethodAuthority(value) {
  const authority = requireNonFeaGravityMethodAuthority(value);
  if (authority.state !== 'READY') {
    const error = codedError(
      'Gravity-method authority is not ready.',
      'GRAVITY_METHOD_AUTHORITY_NOT_READY',
    );
    error.details = authority.blockers;
    throw error;
  }
  return authority;
}

function authorityProvenance(evidence) {
  return freezeDeep({
    authority: stringValue(evidence.authority) || 'PROJECT_DATA_APPROVED',
    source: stringValue(evidence.source),
    basis: stringValue(evidence.basis) || null,
    defaultId: stringValue(evidence.defaultId) || null,
    defaultSemanticHash: stringValue(evidence.defaultSemanticHash) || null,
    profileId: stringValue(evidence.profileId) || null,
    profileVersion: Number.isInteger(evidence.profileVersion) ? evidence.profileVersion : null,
    productDefaultProfileSemanticHash:
      stringValue(evidence.productDefaultProfileSemanticHash) || null,
  });
}

function validProductDefaultProvenance(provenance) {
  return Boolean(
    provenance.defaultId === PRODUCT_DEFAULT_ID
    && provenance.basis
    && provenance.defaultSemanticHash
    && provenance.profileId
    && Number.isInteger(provenance.profileVersion)
    && provenance.profileVersion > 0
    && provenance.productDefaultProfileSemanticHash
  );
}

function normalizeMethod(value) {
  return stringValue(value).toUpperCase();
}

function issue(code, path, message) {
  return freezeDeep({ code, path, message });
}

function byBlocker(left, right) {
  return `${left.code}|${left.path}`.localeCompare(`${right.code}|${right.path}`);
}

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
