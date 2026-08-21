import { semanticHash } from '../shared-primitives/canonical-json.js';

export const EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY_SCHEMA =
  'emp1-wrc537-applicability-source-authority/v1';
export const EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY =
  'EMP1_TYPED_WRC537_4_5_GEOMETRY_SOURCE_BINDING_V1';
export const EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED =
  'QUALIFIED_FOR_BOUNDED_WRC537_4_5_GEOMETRY';
export const EMP1_WRC537_CYLINDER_LENGTH_BASIS =
  'BETWEEN_CYLINDER_END_PLANES';
export const EMP1_WRC537_ATTACHMENT_STATION_BASIS =
  'FROM_CYLINDER_START_END_PLANE_TO_WRC_ATTACHMENT_REFERENCE_POINT';

const AUTHORITY_KEYS = Object.freeze([
  'schema',
  'authority',
  'sourceQualification',
  'geometryIdentity',
  'cylinderLengthBasis',
  'cylinderLength',
  'attachmentStationBasis',
  'attachmentStationFromCylinderStart',
  'distanceFromCylinderStart',
  'distanceFromCylinderEnd',
  'nearestCylinderEndDistance',
  'unit',
  'cylinderLengthSourceReference',
  'attachmentStationSourceReference',
  'sourceBindingSemanticHash',
  'productionObservationUsedToSetAuthority',
  'semanticHash',
]);

export function createEmp1Wrc537ApplicabilitySourceAuthority({
  geometryIdentity,
  cylinderLengthBasis,
  cylinderLength,
  attachmentStationBasis,
  attachmentStationFromCylinderStart,
  unit,
  cylinderLengthSourceReference,
  attachmentStationSourceReference,
  productionObservationUsedToSetAuthority = false,
} = {}) {
  if (productionObservationUsedToSetAuthority !== false) {
    throw authorityError('EMP1_WRC537_4_5_PRODUCTION_OBSERVATION_PROHIBITED');
  }
  const binding = sourceBindingPayload({
    geometryIdentity,
    cylinderLengthBasis,
    cylinderLength,
    attachmentStationBasis,
    attachmentStationFromCylinderStart,
    unit,
    cylinderLengthSourceReference,
    attachmentStationSourceReference,
  });
  const distances = deriveEndDistances(binding.cylinderLength,
    binding.attachmentStationFromCylinderStart);
  const base = {
    schema: EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY_SCHEMA,
    authority: EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY,
    sourceQualification: EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
    geometryIdentity: binding.geometryIdentity,
    cylinderLengthBasis: binding.cylinderLengthBasis,
    cylinderLength: binding.cylinderLength,
    attachmentStationBasis: binding.attachmentStationBasis,
    attachmentStationFromCylinderStart: binding.attachmentStationFromCylinderStart,
    distanceFromCylinderStart: distances.distanceFromCylinderStart,
    distanceFromCylinderEnd: distances.distanceFromCylinderEnd,
    nearestCylinderEndDistance: distances.nearestCylinderEndDistance,
    unit: binding.unit,
    cylinderLengthSourceReference: binding.cylinderLengthSourceReference,
    attachmentStationSourceReference: binding.attachmentStationSourceReference,
    sourceBindingSemanticHash: semanticHash(binding),
    productionObservationUsedToSetAuthority: false,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(value) {
  if (!record(value)
    || value.schema !== EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY_SCHEMA
    || value.authority !== EMP1_WRC537_APPLICABILITY_SOURCE_AUTHORITY
    || value.sourceQualification !== EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED) {
    throw authorityError('EMP1_WRC537_4_5_QUALIFIED_SOURCE_AUTHORITY_REQUIRED');
  }
  if (!sameKeys(value, AUTHORITY_KEYS)) {
    throw authorityError('EMP1_WRC537_4_5_SOURCE_AUTHORITY_SHAPE_MISMATCH');
  }
  if (value.productionObservationUsedToSetAuthority !== false) {
    throw authorityError('EMP1_WRC537_4_5_PRODUCTION_OBSERVATION_PROHIBITED');
  }
  const binding = sourceBindingPayload({
    geometryIdentity: value.geometryIdentity,
    cylinderLengthBasis: value.cylinderLengthBasis,
    cylinderLength: value.cylinderLength,
    attachmentStationBasis: value.attachmentStationBasis,
    attachmentStationFromCylinderStart: value.attachmentStationFromCylinderStart,
    unit: value.unit,
    cylinderLengthSourceReference: value.cylinderLengthSourceReference,
    attachmentStationSourceReference: value.attachmentStationSourceReference,
  });
  if (value.sourceBindingSemanticHash !== semanticHash(binding)) {
    throw authorityError('EMP1_WRC537_4_5_SOURCE_BINDING_HASH_MISMATCH');
  }
  const distances = deriveEndDistances(binding.cylinderLength,
    binding.attachmentStationFromCylinderStart);
  if (value.distanceFromCylinderStart !== distances.distanceFromCylinderStart
    || value.distanceFromCylinderEnd !== distances.distanceFromCylinderEnd
    || value.nearestCylinderEndDistance !== distances.nearestCylinderEndDistance) {
    throw authorityError('EMP1_WRC537_4_5_DERIVED_END_DISTANCE_MISMATCH');
  }
  const { semanticHash: retainedHash, ...base } = value;
  if (!retainedHash || retainedHash !== semanticHash(base)) {
    throw authorityError('EMP1_WRC537_4_5_SOURCE_AUTHORITY_HASH_MISMATCH');
  }
  return deepFreeze(structuredClone(value));
}

export function emp1Wrc537ApplicabilityEvidenceFromAuthority(value) {
  const authority = requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(value);
  return deepFreeze({
    cylinderLength: authority.cylinderLength,
    nearestCylinderEndDistance: authority.nearestCylinderEndDistance,
    distanceFromCylinderStart: authority.distanceFromCylinderStart,
    distanceFromCylinderEnd: authority.distanceFromCylinderEnd,
    sourceReferences: {
      cylinderLength: authority.cylinderLengthSourceReference,
      nearestCylinderEndDistance: authority.attachmentStationSourceReference,
    },
    basisAuthority: authority.authority,
    sourceQualification: authority.sourceQualification,
    sourceAuthoritySemanticHash: authority.semanticHash,
  });
}

function sourceBindingPayload({
  geometryIdentity,
  cylinderLengthBasis,
  cylinderLength,
  attachmentStationBasis,
  attachmentStationFromCylinderStart,
  unit,
  cylinderLengthSourceReference,
  attachmentStationSourceReference,
}) {
  if (cylinderLengthBasis !== EMP1_WRC537_CYLINDER_LENGTH_BASIS) {
    throw authorityError('EMP1_WRC537_4_5_CYLINDER_LENGTH_BASIS_REQUIRED');
  }
  if (attachmentStationBasis !== EMP1_WRC537_ATTACHMENT_STATION_BASIS) {
    throw authorityError('EMP1_WRC537_4_5_ATTACHMENT_STATION_BASIS_REQUIRED');
  }
  const length = positive(cylinderLength,
    'EMP1_WRC537_4_5_CYLINDER_LENGTH_INVALID');
  const station = nonNegative(attachmentStationFromCylinderStart,
    'EMP1_WRC537_4_5_ATTACHMENT_STATION_INVALID');
  if (station > length) {
    throw authorityError('EMP1_WRC537_4_5_ATTACHMENT_STATION_OUTSIDE_CYLINDER');
  }
  return {
    geometryIdentity: requiredText(geometryIdentity,
      'EMP1_WRC537_4_5_GEOMETRY_IDENTITY_REQUIRED'),
    cylinderLengthBasis,
    cylinderLength: length,
    attachmentStationBasis,
    attachmentStationFromCylinderStart: station,
    unit: requiredText(unit, 'EMP1_WRC537_4_5_UNIT_REQUIRED'),
    cylinderLengthSourceReference: requiredText(cylinderLengthSourceReference,
      'EMP1_WRC537_4_5_CYLINDER_LENGTH_SOURCE_REQUIRED'),
    attachmentStationSourceReference: requiredText(attachmentStationSourceReference,
      'EMP1_WRC537_4_5_ATTACHMENT_STATION_SOURCE_REQUIRED'),
  };
}

function deriveEndDistances(cylinderLength, station) {
  const distanceFromCylinderStart = normalizeZero(station);
  const distanceFromCylinderEnd = normalizeZero(cylinderLength - station);
  return {
    distanceFromCylinderStart,
    distanceFromCylinderEnd,
    nearestCylinderEndDistance: Math.min(distanceFromCylinderStart, distanceFromCylinderEnd),
  };
}
function sameKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw authorityError(code);
  return value.trim();
}
function positive(value, code) {
  if (!Number.isFinite(value) || value <= 0) throw authorityError(code);
  return Number(value);
}
function nonNegative(value, code) {
  if (!Number.isFinite(value) || value < 0) throw authorityError(code);
  return Number(value);
}
function normalizeZero(value) { return Object.is(value, -0) ? 0 : value; }
function record(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function authorityError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
