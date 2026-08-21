import { semanticHash } from '../shared-primitives/canonical-json.js';

export const EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY_SCHEMA =
  'emp1-wrc537-attachment-source-authority/v1';
export const EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS =
  'OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE';
export const EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION =
  'ATTACHMENT_SHELL_JUNCTURE';
export const EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY =
  'EMP1_TYPED_ENGINEERING_SOURCE_BINDING_V1';
export const EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED =
  'QUALIFIED_FOR_BOUNDED_R0_CUSTODY';

/**
 * Promote an engineer-authored EMP.1 product geometry binding into retained WRC
 * r0 source authority. The product source must explicitly say that the entered
 * dimension is the attachment OUTSIDE diameter at the shell juncture. A generic
 * diameter or a locator string alone is not sufficient and cannot be upgraded
 * by this function.
 */
export function createEmp1Wrc537AttachmentSourceAuthority({
  geometryIdentity,
  outsideDiameter,
  diameterBasis,
  physicalLocation,
  unit,
  sourceReference,
  sourceBindingSemanticHash,
  productionObservationUsedToSetAuthority = false,
} = {}) {
  if (productionObservationUsedToSetAuthority !== false) {
    throw authorityError('EMP1_WRC537_R0_PRODUCTION_OBSERVATION_PROHIBITED');
  }
  if (diameterBasis !== EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS) {
    throw authorityError('EMP1_WRC537_R0_OUTSIDE_DIAMETER_BASIS_REQUIRED');
  }
  if (physicalLocation !== EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION) {
    throw authorityError('EMP1_WRC537_R0_SHELL_JUNCTURE_LOCATION_REQUIRED');
  }
  const base = {
    schema: EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY_SCHEMA,
    authority: EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY,
    sourceQualification: EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED,
    geometryIdentity: requiredText(geometryIdentity,
      'EMP1_WRC537_R0_GEOMETRY_IDENTITY_REQUIRED'),
    physicalQuantity: 'WRC_CYLINDRICAL_ATTACHMENT_R0_SOURCE_DIAMETER',
    diameterBasis,
    outsideDiameter: positive(outsideDiameter,
      'EMP1_WRC537_R0_OUTSIDE_DIAMETER_INVALID'),
    physicalLocation,
    unit: requiredText(unit, 'EMP1_WRC537_R0_UNIT_REQUIRED'),
    sourceReference: requiredText(sourceReference,
      'EMP1_WRC537_R0_SOURCE_REFERENCE_REQUIRED'),
    sourceBindingSemanticHash: requiredText(sourceBindingSemanticHash,
      'EMP1_WRC537_R0_SOURCE_BINDING_HASH_REQUIRED'),
    productionObservationUsedToSetAuthority: false,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function requireEmp1Wrc537QualifiedAttachmentSourceAuthority(value) {
  if (!record(value)
    || value.schema !== EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY_SCHEMA
    || value.authority !== EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY
    || value.sourceQualification !== EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED) {
    throw authorityError('EMP1_WRC537_R0_QUALIFIED_SOURCE_AUTHORITY_REQUIRED');
  }
  if (value.diameterBasis !== EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS) {
    throw authorityError('EMP1_WRC537_R0_OUTSIDE_DIAMETER_BASIS_REQUIRED');
  }
  if (value.physicalLocation !== EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION) {
    throw authorityError('EMP1_WRC537_R0_SHELL_JUNCTURE_LOCATION_REQUIRED');
  }
  requiredText(value.geometryIdentity, 'EMP1_WRC537_R0_GEOMETRY_IDENTITY_REQUIRED');
  positive(value.outsideDiameter, 'EMP1_WRC537_R0_OUTSIDE_DIAMETER_INVALID');
  requiredText(value.unit, 'EMP1_WRC537_R0_UNIT_REQUIRED');
  requiredText(value.sourceReference, 'EMP1_WRC537_R0_SOURCE_REFERENCE_REQUIRED');
  requiredText(value.sourceBindingSemanticHash,
    'EMP1_WRC537_R0_SOURCE_BINDING_HASH_REQUIRED');
  if (value.productionObservationUsedToSetAuthority !== false) {
    throw authorityError('EMP1_WRC537_R0_PRODUCTION_OBSERVATION_PROHIBITED');
  }
  const { semanticHash: retainedHash, ...base } = value;
  if (!retainedHash || retainedHash !== semanticHash(base)) {
    throw authorityError('EMP1_WRC537_R0_SOURCE_AUTHORITY_HASH_MISMATCH');
  }
  return deepFreeze(structuredClone(value));
}

function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw authorityError(code);
  return value.trim();
}
function positive(value, code) {
  if (!Number.isFinite(value) || value <= 0) throw authorityError(code);
  return Number(value);
}
function record(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function authorityError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
