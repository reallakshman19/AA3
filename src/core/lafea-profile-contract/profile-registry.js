import { canonicalProfile } from './schema.js';
import { PROFILE_KINDS, PROFILE_SCHEMA_IDS } from './constants.js';
import { LAFEA3_QUALIFIED_MESH_QUALITY_POLICY } from './stage-qualified-policies.js';

/**
 * Visible, versioned, exportable default field values — spec §15.1: "Defaults
 * are visible, versioned and exportable; no browser-local hidden defaults."
 * Generic defaults remain configuration defaults, not qualification evidence.
 * The mesh-quality threshold defaults are deliberately aligned with the
 * explicit LAFEA.3 qualified policy so a newly-created profile starts inside
 * that stage's authority envelope without making the defaults themselves the
 * source of qualification authority.
 */
export const DEFAULT_PROFILE_SOURCE_REVISION = 'lafea-profile-defaults/v1';

const LAFEA3_MESH_POLICY = LAFEA3_QUALIFIED_MESH_QUALITY_POLICY.fields;

const DEFAULT_FIELDS = Object.freeze({
  [PROFILE_KINDS.GEOMETRY]: Object.freeze({
    mergeTolerance: 1e-9,
    curveChordError: 1e-4,
    normalPropagationRule: 'TOPOLOGY_SEEDED_DETERMINISTIC_V1',
  }),
  [PROFILE_KINDS.MESH]: Object.freeze({
    continuumElement: 'T6_Q8_MIXED_V1',
    shellElement: 'MITC4_WITH_MITC3_TRANSITION_V1',
    globalTargetSize: 0.01,
    adjacentSizeRatioMax: LAFEA3_MESH_POLICY.adjacentSizeRatioMax,
    aspectRatioWarn: LAFEA3_MESH_POLICY.aspectRatioWarn,
    aspectRatioBlock: LAFEA3_MESH_POLICY.aspectRatioBlock,
    scaledJacobianWarn: LAFEA3_MESH_POLICY.scaledJacobianWarn,
    scaledJacobianBlock: LAFEA3_MESH_POLICY.scaledJacobianBlock,
    adaptiveLevels: LAFEA3_MESH_POLICY.adaptiveLevelsMinimum,
  }),
  [PROFILE_KINDS.SOLVER]: Object.freeze({
    backend: 'SPARSE_CHOLESKY_LDLT_V1',
    scaling: 'DIAGONAL_ENERGY_SCALING_V1',
    normalizedResidualLimit: 1e-9,
    equilibriumRelativeLimit: 1e-6,
    conditionWarning: 1e12,
  }),
  [PROFILE_KINDS.RECOVERY]: Object.freeze({
    gaussPointRetention: true,
    nodalProjection: 'PATCH_AVERAGE_WITH_DISCONTINUITY_MASK_V1',
    shellSurfaces: Object.freeze(['BOTTOM', 'MIDDLE', 'TOP']),
    sclProcedure: 'COMPONENTWISE_MEMBRANE_BENDING_V1',
  }),
  [PROFILE_KINDS.CONVERGENCE]: Object.freeze({
    energyChangeLimit: 0.02,
    displacementChangeLimit: 0.01,
    sclMembraneBendingChangeLimit: 0.03,
    structuralStressChangeLimit: 0.05,
  }),
  [PROFILE_KINDS.CODE]: Object.freeze({
    edition: 'USER_SELECTED_LICENSED_EDITION',
    method: 'ELASTIC_STRESS_ANALYSIS',
    allowableSourceIdentity: 'UNSET_REQUIRES_USER_AUTHORIZATION',
    equivalentStressRule: 'UNSET_REQUIRES_EDITION_PROFILE',
    categoryLimitProfile: 'UNSET_REQUIRES_EDITION_PROFILE',
  }),
  [PROFILE_KINDS.OUTPUT]: Object.freeze({
    retainIntegrationPointResults: true,
    exportJson: true,
    exportCsv: true,
    generateEngineeringReport: true,
  }),
});

/**
 * @param {string} kind One of `PROFILE_KINDS`.
 * @returns {Readonly<object>} The default `fields` record for that kind.
 */
export function defaultProfileFields(kind) {
  const fields = DEFAULT_FIELDS[kind];
  if (!fields) throw new TypeError(`No default fields registered for profile kind: ${kind}`);
  return fields;
}

/**
 * Build a canonical default profile for one kind under an explicit
 * `profileIdentity`. The identity is required from the caller — even a
 * default is a declared, attributable profile, never an anonymous one.
 *
 * @param {string} kind One of `PROFILE_KINDS`.
 * @param {string} profileIdentity Caller-declared profile identity.
 * @returns {Readonly<object>} Canonical, hashed default profile.
 */
export function createDefaultProfile(kind, profileIdentity) {
  return canonicalProfile(kind, {
    schema: PROFILE_SCHEMA_IDS[kind],
    profileIdentity,
    sourceRevision: DEFAULT_PROFILE_SOURCE_REVISION,
    fields: defaultProfileFields(kind),
    semanticHash: undefined,
  });
}

/**
 * Build the complete default profile set (all seven kinds) under a single
 * caller-declared identity prefix, e.g. for a fresh document.
 *
 * @param {string} profileIdentityPrefix Prefix applied to each kind's identity.
 * @returns {Readonly<Record<string, object>>} Kind -> canonical default profile.
 */
export function createDefaultProfileSet(profileIdentityPrefix) {
  const set = {};
  for (const kind of Object.values(PROFILE_KINDS)) {
    set[kind] = createDefaultProfile(kind, `${profileIdentityPrefix}/${kind}`);
  }
  return Object.freeze(set);
}
