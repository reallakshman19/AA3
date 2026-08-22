import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, stringValue } from '../dataset-utils.js';
import { projectDataEntry } from '../project-data/project-data-contract.js';

export const AUTHORIZED_EMPIRICAL_SOURCE_AXIS_BINDING_SCHEMA =
  'authorized-empirical-source-axis-binding/v1';

const SOURCE_AXIS_PATH = 'sourcesAndUnits.sourceUpAxis';
const IMPLEMENTED_GRAVITY_AXIS = 'Z';
const IMPLEMENTED_KERNEL_BASIS = 'Z_UP';

/**
 * Binds the governed source/project up-axis to authorized support-load results.
 *
 * The current gravity statics kernel is scalar vertical mechanics in source
 * Z-up engineering coordinates. The Project Data coordinate transform is a
 * rendering-only boundary and does not rotate the engineering load equations.
 * Therefore X/Y source-up authority must fail closed here; relabeling a Z-axis
 * scalar reaction as X_UP/Y_UP would claim mechanics that were never executed.
 *
 * This seam is intentionally applied only after ledger-driven execution so
 * legacy direct callers retain their historical contract until migrated.
 */
export function bindAuthorizedEmpiricalSourceAxis({ distribution, profile } = {}) {
  if (!distribution || typeof distribution !== 'object' || !Array.isArray(distribution.loadCases)) {
    throw codedError(
      'A support-load distribution is required for source-axis binding.',
      'EMPIRICAL_SOURCE_AXIS_DISTRIBUTION_INVALID',
    );
  }
  const entry = projectDataEntry(profile, SOURCE_AXIS_PATH);
  const axis = stringValue(entry?.value).toUpperCase();
  if (!['X', 'Y', 'Z'].includes(axis)) {
    throw codedError(
      'Effective source up-axis must be X, Y, or Z before authorized support-load publication.',
      'EMPIRICAL_SOURCE_AXIS_INVALID',
      { projectDataPath: SOURCE_AXIS_PATH, value: entry?.value ?? null },
    );
  }
  if (entry.approved !== true || !entry.evidence) {
    throw codedError(
      'Effective source up-axis must retain approved source/project/default evidence.',
      'EMPIRICAL_SOURCE_AXIS_AUTHORITY_INVALID',
      { projectDataPath: SOURCE_AXIS_PATH },
    );
  }
  if (axis !== IMPLEMENTED_GRAVITY_AXIS) {
    throw codedError(
      `Authorized empirical gravity currently implements source ${IMPLEMENTED_GRAVITY_AXIS}-up scalar mechanics only; ${axis}-up requires an explicit gravity-vector/coordinate transformation before calculation.`,
      'EMPIRICAL_SOURCE_AXIS_MECHANICS_UNSUPPORTED',
      {
        projectDataPath: SOURCE_AXIS_PATH,
        requestedSourceUpAxis: axis,
        implementedSourceUpAxis: IMPLEMENTED_GRAVITY_AXIS,
      },
    );
  }
  if (distribution.sourceAxisBasis !== IMPLEMENTED_KERNEL_BASIS) {
    throw codedError(
      'Authorized empirical gravity kernel basis is inconsistent with the implemented source-axis mechanics.',
      'EMPIRICAL_SOURCE_AXIS_KERNEL_BASIS_MISMATCH',
      {
        expected: IMPLEMENTED_KERNEL_BASIS,
        actual: distribution.sourceAxisBasis ?? null,
      },
    );
  }

  const sourceAxisBasis = IMPLEMENTED_KERNEL_BASIS;
  const authority = freezeDeep({
    schema: AUTHORIZED_EMPIRICAL_SOURCE_AXIS_BINDING_SCHEMA,
    projectDataPath: SOURCE_AXIS_PATH,
    sourceUpAxis: axis,
    sourceAxisBasis,
    mechanicsScope: 'SOURCE_Z_UP_SCALAR_VERTICAL_GRAVITY',
    evidence: clonePlain(entry.evidence),
    projectDataEntrySemanticHash: semanticHash(entry),
  });
  const rebound = clonePlain(distribution);
  rebound.sourceAxisBasis = sourceAxisBasis;
  rebound.sourceAxisAuthority = authority;
  rebound.loadCases = rebound.loadCases.map((loadCase) => ({
    ...loadCase,
    supportResults: (loadCase.supportResults || []).map((support) => ({
      ...support,
      sourceAxisBasis,
    })),
  }));
  return freezeDeep(rebound);
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
