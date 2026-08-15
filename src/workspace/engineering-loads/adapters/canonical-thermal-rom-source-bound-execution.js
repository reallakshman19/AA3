import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  requirePreproductionThermalLiftoffDisplacementAuthority,
} from '../preproduction-thermal-liftoff-displacement-authority.js';
import {
  executeCanonicalThermalRomCompatibility,
} from './canonical-thermal-rom-authority-adapter.js';

export const EMPIRICAL_CANONICAL_SOURCE_BOUND_THERMAL_ROM_SCHEMA =
  'empirical-canonical-source-bound-thermal-rom-execution/v1';

const GLOBAL_Z_PLUS = Object.freeze([0, 0, 1]);

/**
 * Public experimental entry gate for PR #1145 canonical custody.
 *
 * The lower-level adapter can consume an already-qualified displacement
 * authority shape. This gate narrows that input further: only source-backed
 * support/ground displacement is accepted. A qualified free-expansion mapping
 * is not support movement authority for force-method target displacement.
 *
 * The current support-movement authority is GLOBAL_XYZ_Z_UP. Until a separate
 * frame transformation is governed and qualified, this gate also requires the
 * empirical request to use global +Z as its vertical vector.
 */
export function executeCanonicalSourceBoundThermalRomCompatibility(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Canonical source-bound thermal ROM input must be an object.');
  }
  requireGlobalZUpFrame(input.adaptedRequest?.coordinateFrame);
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
      coordinateFrameAuthority: 'GLOBAL_XYZ_Z_UP_ONLY_IN_THIS_PHASE',
      coordinateFrameTransformationPerformed: false,
      sourceKinds: [...new Set(authorities.map((row) => row.source.sourceKind))].sort(),
      productionCalculationConsumptionEnabled: false,
      productionMethodRegistrationPermitted: false,
    },
  });
}

function requireGlobalZUpFrame(frame) {
  const vertical = frame?.verticalUnitVector;
  if (!Array.isArray(vertical) || vertical.length !== 3
      || vertical.some((value) => !Number.isFinite(value))) {
    throw coded(
      'EMPIRICAL_CANONICAL_SOURCE_COORDINATE_FRAME_INVALID',
      'Empirical request must declare a finite three-component vertical unit vector.',
    );
  }
  if (vertical.some((value, index) => value !== GLOBAL_Z_PLUS[index])) {
    throw coded(
      'EMPIRICAL_CANONICAL_SOURCE_COORDINATE_FRAME_UNQUALIFIED',
      'Current source-bound movement bridge requires GLOBAL_XYZ_Z_UP; coordinate-frame transformation is not yet qualified.',
    );
  }
}

function coded(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
