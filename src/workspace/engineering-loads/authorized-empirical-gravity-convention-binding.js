import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, stringValue } from '../dataset-utils.js';
import { projectDataEntry } from '../project-data/project-data-contract.js';

export const AUTHORIZED_EMPIRICAL_GRAVITY_CONVENTION_BINDING_SCHEMA =
  'authorized-empirical-gravity-convention-binding/v1';

export const IMPLEMENTED_GRAVITY_CONVENTIONS = Object.freeze({
  forceOutputConvention: 'POSITIVE_REACTION_OPPOSES_SOURCE_AXIS_GRAVITY',
  momentOutputConvention: 'SIGNED_ROUTE_CHAINAGE_FIRST_MOMENT_NMM',
  analysisBasis: 'ROUTE_CHAINAGE_1D_STATIC_GRAVITY',
  resultSignConvention: 'SOURCE_UP_POSITIVE_SUPPORT_REACTION',
});

const PATHS = Object.freeze({
  forceOutputConvention: 'loadCalculation.forceOutputConvention',
  momentOutputConvention: 'loadCalculation.momentOutputConvention',
  analysisBasis: 'loadCalculation.analysisBasis',
  resultSignConvention: 'loadCalculation.resultSignConvention',
});
const LEGACY_KERNEL_FORCE_CONVENTION = 'positive reaction opposes source-axis gravity';
const LEGACY_KERNEL_MOMENT_REFERENCE = 'PER_ROUTE_CHAINAGE_ORIGIN_WITH_AGGREGATE_DIAGNOSTIC';
const AXIS_GENERAL_MECHANICS_SCOPE = 'SOURCE_AXIS_GENERAL_MM_SCALAR_VERTICAL_GRAVITY';

/**
 * Requires the exact convention set implemented by the current source-axis
 * scalar gravity mechanics. Reaction sign is referenced to the governed source
 * up-axis, while first moments remain signed about route chainage origins.
 */
export function requireAuthorizedEmpiricalGravityConventions(profile) {
  const rows = Object.entries(PATHS).map(([key, path]) => {
    const entry = projectDataEntry(profile, path);
    requireApprovedEntry(entry, path);
    const value = stringValue(entry.value);
    const expected = IMPLEMENTED_GRAVITY_CONVENTIONS[key];
    if (value !== expected) {
      throw codedError(
        `Authorized empirical gravity does not implement ${path}=${value || '<missing>'}; expected ${expected}.`,
        conventionErrorCode(key),
        { projectDataPath: path, requested: value || null, implemented: expected },
      );
    }
    return freezeDeep({
      key,
      projectDataPath: path,
      value,
      sourceAuthority: stringValue(entry.evidence?.authority) || 'PROJECT_POLICY',
      source: stringValue(entry.evidence?.source),
      entrySemanticHash: semanticHash(entry),
    });
  });
  const material = {
    schema: AUTHORIZED_EMPIRICAL_GRAVITY_CONVENTION_BINDING_SCHEMA,
    mechanicsScope: AXIS_GENERAL_MECHANICS_SCOPE,
    conventions: clonePlain(IMPLEMENTED_GRAVITY_CONVENTIONS),
    rows,
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

/** Bind governed convention IDs only after the scalar kernel output proves compatible. */
export function bindAuthorizedEmpiricalGravityConventions({ distribution, profile } = {}) {
  if (!distribution || typeof distribution !== 'object' || !Array.isArray(distribution.loadCases)) {
    throw codedError(
      'A support-load distribution is required for gravity convention binding.',
      'EMPIRICAL_GRAVITY_CONVENTION_DISTRIBUTION_INVALID',
    );
  }
  const authority = requireAuthorizedEmpiricalGravityConventions(profile);
  if (distribution.verticalForceConvention !== LEGACY_KERNEL_FORCE_CONVENTION) {
    throw codedError(
      'Kernel vertical-force convention does not match the governed gravity convention.',
      'EMPIRICAL_GRAVITY_FORCE_KERNEL_CONVENTION_MISMATCH',
      { expected: LEGACY_KERNEL_FORCE_CONVENTION, actual: distribution.verticalForceConvention ?? null },
    );
  }
  const mismatchedMomentCases = distribution.loadCases
    .filter((loadCase) => loadCase?.equilibrium?.momentReference
      && loadCase.equilibrium.momentReference !== LEGACY_KERNEL_MOMENT_REFERENCE)
    .map((loadCase) => ({
      loadCaseId: loadCase.loadCaseId,
      momentReference: loadCase.equilibrium.momentReference,
    }));
  if (mismatchedMomentCases.length > 0) {
    throw codedError(
      'Kernel moment reference does not match the governed route-chainage convention.',
      'EMPIRICAL_GRAVITY_MOMENT_KERNEL_CONVENTION_MISMATCH',
      mismatchedMomentCases,
    );
  }

  const rebound = clonePlain(distribution);
  rebound.forceOutputConvention = authority.conventions.forceOutputConvention;
  rebound.momentOutputConvention = authority.conventions.momentOutputConvention;
  rebound.analysisBasis = authority.conventions.analysisBasis;
  rebound.resultSignConvention = authority.conventions.resultSignConvention;
  rebound.gravityConventionAuthority = authority;
  return freezeDeep(rebound);
}

function requireApprovedEntry(entry, projectDataPath) {
  if (entry?.approved !== true || !entry?.evidence || !stringValue(entry.evidence.source)) {
    throw codedError(
      `Effective ${projectDataPath} requires approved Project/Product evidence.`,
      'EMPIRICAL_GRAVITY_CONVENTION_AUTHORITY_INVALID',
      { projectDataPath },
    );
  }
}

function conventionErrorCode(key) {
  const codes = {
    forceOutputConvention: 'EMPIRICAL_GRAVITY_FORCE_OUTPUT_CONVENTION_UNSUPPORTED',
    momentOutputConvention: 'EMPIRICAL_GRAVITY_MOMENT_OUTPUT_CONVENTION_UNSUPPORTED',
    analysisBasis: 'EMPIRICAL_GRAVITY_ANALYSIS_BASIS_UNSUPPORTED',
    resultSignConvention: 'EMPIRICAL_GRAVITY_RESULT_SIGN_CONVENTION_UNSUPPORTED',
  };
  return codes[key] || 'EMPIRICAL_GRAVITY_CONVENTION_UNSUPPORTED';
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
