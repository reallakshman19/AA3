import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, stringValue } from '../dataset-utils.js';
import { projectDataEntry } from '../project-data/project-data-contract.js';

export const AUTHORIZED_EMPIRICAL_SOURCE_AXIS_BINDING_SCHEMA =
  'authorized-empirical-source-axis-binding/v1';

const SOURCE_AXIS_PATH = 'sourcesAndUnits.sourceUpAxis';
const LENGTH_UNIT_PATH = 'sourcesAndUnits.lengthUnit';
const IMPLEMENTED_GRAVITY_AXIS = 'Z';
const IMPLEMENTED_LENGTH_UNIT = 'mm';
const IMPLEMENTED_KERNEL_BASIS = 'Z_UP';

/**
 * Validates the engineering-coordinate basis implemented by the current scalar
 * gravity statics before the kernel is allowed to execute.
 *
 * Workspace geometry coordinates are retained in source engineering space;
 * the available coordinate transform is rendering-only. The gravity kernel
 * also uses millimetre chainage/section dimensions and N/N·mm output. Until an
 * engineering vector/unit transformation exists, non-Z-up or non-mm input must
 * fail closed rather than be cosmetically relabelled.
 */
export function requireAuthorizedEmpiricalSourceBasis(profile) {
  const axisEntry = projectDataEntry(profile, SOURCE_AXIS_PATH);
  const axis = stringValue(axisEntry?.value).toUpperCase();
  requireApprovedEntry(axisEntry, SOURCE_AXIS_PATH, 'EMPIRICAL_SOURCE_AXIS_AUTHORITY_INVALID');
  if (!['X', 'Y', 'Z'].includes(axis)) {
    throw codedError(
      'Effective source up-axis must be X, Y, or Z before authorized support-load calculation.',
      'EMPIRICAL_SOURCE_AXIS_INVALID',
      { projectDataPath: SOURCE_AXIS_PATH, value: axisEntry?.value ?? null },
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

  const unitEntry = projectDataEntry(profile, LENGTH_UNIT_PATH);
  const lengthUnit = stringValue(unitEntry?.value);
  requireApprovedEntry(unitEntry, LENGTH_UNIT_PATH, 'EMPIRICAL_SOURCE_LENGTH_UNIT_AUTHORITY_INVALID');
  if (lengthUnit.toLowerCase() !== IMPLEMENTED_LENGTH_UNIT) {
    throw codedError(
      `Authorized empirical gravity currently implements ${IMPLEMENTED_LENGTH_UNIT} source geometry only; ${lengthUnit || 'missing'} requires an explicit engineering-unit transformation before calculation.`,
      'EMPIRICAL_SOURCE_LENGTH_UNIT_UNSUPPORTED',
      {
        projectDataPath: LENGTH_UNIT_PATH,
        requestedLengthUnit: lengthUnit || null,
        implementedLengthUnit: IMPLEMENTED_LENGTH_UNIT,
      },
    );
  }

  return freezeDeep({
    sourceUpAxis: IMPLEMENTED_GRAVITY_AXIS,
    sourceAxisBasis: IMPLEMENTED_KERNEL_BASIS,
    lengthUnit: IMPLEMENTED_LENGTH_UNIT,
    mechanicsScope: 'SOURCE_Z_UP_MM_SCALAR_VERTICAL_GRAVITY',
    sourceAxisEvidence: clonePlain(axisEntry.evidence),
    sourceAxisEntrySemanticHash: semanticHash(axisEntry),
    lengthUnitEvidence: clonePlain(unitEntry.evidence),
    lengthUnitEntrySemanticHash: semanticHash(unitEntry),
  });
}

/**
 * Binds already-calculated result metadata to the same governed source basis
 * that was required before ledger-driven execution.
 */
export function bindAuthorizedEmpiricalSourceAxis({ distribution, profile } = {}) {
  if (!distribution || typeof distribution !== 'object' || !Array.isArray(distribution.loadCases)) {
    throw codedError(
      'A support-load distribution is required for source-axis binding.',
      'EMPIRICAL_SOURCE_AXIS_DISTRIBUTION_INVALID',
    );
  }
  const basis = requireAuthorizedEmpiricalSourceBasis(profile);
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

  const authority = freezeDeep({
    schema: AUTHORIZED_EMPIRICAL_SOURCE_AXIS_BINDING_SCHEMA,
    projectDataPath: SOURCE_AXIS_PATH,
    lengthUnitProjectDataPath: LENGTH_UNIT_PATH,
    ...basis,
  });
  const rebound = clonePlain(distribution);
  rebound.sourceAxisBasis = basis.sourceAxisBasis;
  rebound.sourceAxisAuthority = authority;
  rebound.loadCases = rebound.loadCases.map((loadCase) => ({
    ...loadCase,
    supportResults: (loadCase.supportResults || []).map((support) => ({
      ...support,
      sourceAxisBasis: basis.sourceAxisBasis,
    })),
  }));
  return freezeDeep(rebound);
}

function requireApprovedEntry(entry, projectDataPath, code) {
  if (entry?.approved !== true || !entry?.evidence) {
    throw codedError(
      `Effective ${projectDataPath} must retain approved source/project/default evidence.`,
      code,
      { projectDataPath },
    );
  }
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
