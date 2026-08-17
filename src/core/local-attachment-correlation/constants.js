export const CORRELATION_PROFILE_SCHEMA = 'local-attachment-correlation-profile/v1';
export const CORRELATION_REQUEST_SCHEMA = 'local-attachment-correlation-request/v1';
export const CORRELATION_RESULT_SCHEMA = 'local-attachment-correlation-result/v1';
export const CORRELATION_DATASET_HASH_SCHEMA = 'local-attachment-correlation-dataset-hash/v1';

export const INTERPOLATION_POLICIES = Object.freeze({
  BILINEAR_NO_EXTRAPOLATION: 'BILINEAR_NO_EXTRAPOLATION',
});

export const LOAD_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);
export const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
export const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);
export const LOAD_BASES = Object.freeze({
  FORCE_OVER_D_T: 'FORCE_OVER_D_T',
  MOMENT_OVER_D2_T: 'MOMENT_OVER_D2_T',
});
export const STRESS_COMPONENTS = Object.freeze([
  'SIGMA_X', 'SIGMA_THETA', 'SIGMA_R', 'TAU_XTHETA',
]);
export const STRESS_CLASSES = Object.freeze(['MEMBRANE', 'BENDING']);
export const SURFACES = Object.freeze(['INNER', 'OUTER', 'MID']);
export const QUALIFICATION_STATES = Object.freeze({
  ACCEPTED: 'ACCEPTED',
  REJECTED_REQUEST: 'REJECTED_REQUEST',
  OUTSIDE_DOMAIN: 'OUTSIDE_DOMAIN',
  NUMERICAL_FAILURE: 'NUMERICAL_FAILURE',
});

export const BASE_LIMITATIONS = Object.freeze([
  'SYNTHETIC_COEFFICIENT_DATA_ONLY',
  'NO_LICENSED_METHOD_AUTHORITY',
  'NO_CODE_COMPLIANCE',
  'NO_EXTRAPOLATION',
  'LINEAR_LOAD_SUPERPOSITION_ONLY',
]);
