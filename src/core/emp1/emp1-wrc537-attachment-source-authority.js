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

const AUTHORITY_KEYS = Object.freeze([
  'schema',
  'authority',
  'sourceQualification',
  'geometryIdentity',
  'physicalQuantity',
  'diameterBasis',
  'outsideDiameter',
  'physicalLocation',
  'unit',
  'sourceReference',
  'sourceBindingSemanticHash',
  'productionObservationUsedToSetAuthority',
  'semanticHash',
]);

/**
 * Promote an engineer-authored EMP.1 product geometry binding into retained WRC
 * r0 source authority. The product source must explicitly state that the entered
 * dimension is the attachment OUTSIDE diameter at the shell juncture. The
 * source-binding hash is derived here from those typed fields; callers cannot
 * supply an unrelated hash and have it promoted to authority.
 */
export function createEmp1Wrc537AttachmentSourceAuthority({
  geometryIdentity,
  outsideDiameter,
  diameterBasis,
  physicalLocation,
  unit,
  sourceReference,
  productionObservationUsedToSetAuthority = false,
} = {}) {
  if (productionObservationUsedToSetAuthority !== false) {
    throw authorityError('EMP1_WRC537_R0_PRODUCTION_OBSERVATION_PROHIBITED');
  }
  const binding = sourceBindingPayload({
    geometryIdentity,
    outsideDiameter,
    diameterBasis,
    physicalLocation,
    unit,
    sourceReference,
  });
  const base = {
    schema: EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY_SCHEMA,
    authority: EMP1_WRC537_ATTACHMENT_SOURCE_AUTHORITY,
    sourceQualification: EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFIED,
    geometryIdentity: binding.geometryIdentity,
    physicalQuantity: 'WRC_CYLINDRICAL_ATTACHMENT_R0_SOURCE_DIAMETER',
    diameterBasis: binding.diameterBasis,
    outsideDiameter: binding.attachmentDiameter,
    physicalLocation: binding.physicalLocation,
    unit: binding.unit,
    sourceReference: binding.sourceReference,
    sourceBindingSemanticHash: semanticHash(binding),
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
  if (!sameKeys(value, AUTHORITY_KEYS)) {
    throw authorityError('EMP1_WRC537_R0_SOURCE_AUTHORITY_SHAPE_MISMATCH');
  }
  if (value.productionObservationUsedToSetAuthority !== false) {
    throw authorityError('EMP1_WRC537_R0_PRODUCTION_OBSERVATION_PROHIBITED');
  }
  const binding = sourceBindingPayload({
    geometryIdentity: value.geometryIdentity,
    outsideDiameter: value.outsideDiameter,
    diameterBasis: value.diameterBasis,
    physicalLocation: value.physicalLocation,
    unit: value.unit,
    sourceReference: value.sourceReference,
  });
  const expectedBindingHash = semanticHash(binding);
  if (value.sourceBindingSemanticHash !== expectedBindingHash) {
    throw authorityError('EMP1_WRC537_R0_SOURCE_BINDING_HASH_MISMATCH');
  }
  const { semanticHash: retainedHash, ...base } = value;
  if (!retainedHash || retainedHash !== semanticHash(base)) {
    throw authorityError('EMP1_WRC537_R0_SOURCE_AUTHORITY_HASH_MISMATCH');
  }
  return deepFreeze(structuredClone(value));
}

function sourceBindingPayload({
  geometryIdentity,
  outsideDiameter,
  diameterBasis,
  physicalLocation,
  unit,
  sourceReference,
}) {
  if (diameterBasis !== EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS) {
    throw authorityError('EMP1_WRC537_R0_OUTSIDE_DIAMETER_BASIS_REQUIRED');
  }
  if (physicalLocation !== EMP1_WRC537_ATTACHMENT_PHYSICAL_LOCATION) {
    throw authorityError('EMP1_WRC537_R0_SHELL_JUNCTURE_LOCATION_REQUIRED');
  }
  return {
    geometryIdentity: requiredText(
      geometryIdentity,
      'EMP1_WRC537_R0_GEOMETRY_IDENTITY_REQUIRED',
    ),
    attachmentDiameter: positive(
      outsideDiameter,
      'EMP1_WRC537_R0_OUTSIDE_DIAMETER_INVALID',
    ),
    diameterBasis,
    physicalLocation,
    unit: requiredText(unit, 'EMP1_WRC537_R0_UNIT_REQUIRED'),
    sourceReference: requiredText(
      sourceReference,
      'EMP1_WRC537_R0_SOURCE_REFERENCE_REQUIRED',
    ),
  };
}
function sameKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort())
    === JSON.stringify([...expected].sort());
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
