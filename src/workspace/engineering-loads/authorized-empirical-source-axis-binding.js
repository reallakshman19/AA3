import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, stringValue } from '../dataset-utils.js';
import { projectDataEntry } from '../project-data/project-data-contract.js';

export const AUTHORIZED_EMPIRICAL_SOURCE_AXIS_BINDING_SCHEMA =
  'authorized-empirical-source-axis-binding/v1';

const SOURCE_AXIS_PATH = 'sourcesAndUnits.sourceUpAxis';
const ALLOWED_AXES = Object.freeze(['X', 'Y', 'Z']);

/**
 * Rebinds support-load result metadata to the governed source/project up-axis.
 * This is intentionally applied only after ledger-driven gravity execution, so
 * legacy direct callers retain their historical result contract until they are
 * migrated explicitly.
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
  if (!ALLOWED_AXES.includes(axis)) {
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

  const sourceAxisBasis = `${axis}_UP`;
  const authority = freezeDeep({
    schema: AUTHORIZED_EMPIRICAL_SOURCE_AXIS_BINDING_SCHEMA,
    projectDataPath: SOURCE_AXIS_PATH,
    sourceUpAxis: axis,
    sourceAxisBasis,
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
