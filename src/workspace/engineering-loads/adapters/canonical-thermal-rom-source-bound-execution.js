import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  requirePreproductionThermalLiftoffDisplacementAuthority,
} from '../preproduction-thermal-liftoff-displacement-authority.js';
import {
  executeCanonicalThermalRomCompatibility,
} from './canonical-thermal-rom-authority-adapter.js';

export const EMPIRICAL_CANONICAL_SOURCE_BOUND_THERMAL_ROM_SCHEMA =
  'empirical-canonical-source-bound-thermal-rom-execution/v1';

/**
 * Public experimental entry gate for PR #1145 canonical custody.
 *
 * The lower-level adapter can consume an already-qualified displacement
 * authority shape. This gate narrows that input further: only source-backed
 * support/ground displacement is accepted. A qualified free-expansion mapping
 * is not support movement authority for force-method target displacement.
 */
export function executeCanonicalSourceBoundThermalRomCompatibility(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Canonical source-bound thermal ROM input must be an object.');
  }
  if (!Array.isArray(input.supportMovementAuthorities)
      || input.supportMovementAuthorities.length === 0) {
    throw coded(
      'EMPIRICAL_CANONICAL_SOURCE_MOVEMENT_MISSING',
      'Source-backed movement authority is required for root and every solved restraint.',
    );
  }
  const authorities = input.supportMovementAuthorities.map((value) => {
    const authority = requirePreproductionThermalLiftoffDisplacementAuthority(value);
    if (authority.qualification !== 'QUALIFIED') {
      throw coded(
        'EMPIRICAL_CANONICAL_SOURCE_MOVEMENT_UNQUALIFIED',
        `Support movement ${authority.supportSiteId} is not QUALIFIED.`,
      );
    }
    if (authority.provenance !== 'SOURCE_BACKED_SUPPORT_DISPLACEMENT') {
      throw coded(
        'EMPIRICAL_CANONICAL_SOURCE_MOVEMENT_PROVENANCE_INVALID',
        `Support movement ${authority.supportSiteId} must use SOURCE_BACKED_SUPPORT_DISPLACEMENT; free-expansion mapping cannot become support/ground movement authority.`,
      );
    }
    if (!['GOVERNED_IMPORT', 'APPROVED_ENGINEERING_DATA'].includes(authority.source?.sourceKind)) {
      throw coded(
        'EMPIRICAL_CANONICAL_SOURCE_MOVEMENT_SOURCE_KIND_INVALID',
        `Support movement ${authority.supportSiteId} source kind is outside the governed source set.`,
      );
    }
    return authority;
  });

  const result = executeCanonicalThermalRomCompatibility({
    ...input,
    supportMovementAuthorities: authorities.map((row) => structuredClone(row)),
  });

  return deepFreeze({
    schema: EMPIRICAL_CANONICAL_SOURCE_BOUND_THERMAL_ROM_SCHEMA,
    result,
    evidence: {
      supportMovementAuthority: 'SOURCE_BACKED_SUPPORT_DISPLACEMENT_ONLY',
      freeExpansionMappingAcceptedAsSupportMovement: false,
      sourceKinds: [...new Set(authorities.map((row) => row.source.sourceKind))].sort(),
      productionCalculationConsumptionEnabled: false,
      productionMethodRegistrationPermitted: false,
    },
  });
}

function coded(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
