import {
  BASE_LIMITATIONS,
  CORRELATION_REQUEST_SCHEMA,
  CORRELATION_RESULT_SCHEMA,
  FORCE_COMPONENTS,
  LOAD_BASES,
  LOAD_COMPONENTS,
  QUALIFICATION_STATES,
  STRESS_COMPONENTS,
} from './constants.js';
import { bilinearNoExtrapolation } from './interpolation.js';
import { createCorrelationProfile } from './profile.js';

export function calculateLocalAttachmentCorrelation(requestInput, profileInput) {
  let request;
  let profile;
  try {
    request = canonicalRequest(requestInput);
    profile = createCorrelationProfile(profileInput);
    return acceptedResult(request, profile);
  } catch (error) {
    return rejectedResult(requestInput, profileInput, error);
  }
}

function acceptedResult(request, profile) {
  const parameters = dimensionlessParameters(request.geometry);
  const contributions = profile.responses.map((response) => responseContribution(
    response, request, profile, parameters,
  ));
  const targetResults = profile.targets.map((target) => targetResult(
    target, contributions, request.pressureByTarget,
  ));
  return freeze({
    schema: CORRELATION_RESULT_SCHEMA,
    requestIdentity: request.requestIdentity,
    qualification: {
      state: QUALIFICATION_STATES.ACCEPTED,
      engineeringUseAuthorized: profile.authority.engineeringUseAuthorized,
      authorizationBasis: profile.authority.authorizationBasis,
    },
    geometryParameters: parameters,
    methodEvidence: methodEvidence(profile),
    contributions,
    targetResults,
    uncertainty: profile.uncertainty,
    limitations: [...BASE_LIMITATIONS],
    diagnostics: [],
  });
}

function responseContribution(response, request, profile, parameters) {
  const interpolation = bilinearNoExtrapolation(
    profile.axes.diameterRatio.knots,
    profile.axes.diameterThicknessRatio.knots,
    response.coefficients,
    parameters.diameterRatio,
    parameters.diameterThicknessRatio,
  );
  const basisStress = normalizedLoadStress(
    request.loads[response.loadComponent], response.loadBasis, request.geometry,
  );
  return freeze({
    responseId: response.responseId,
    targetId: response.targetId,
    stressComponent: response.stressComponent,
    stressClass: response.stressClass,
    loadComponent: response.loadComponent,
    loadBasis: response.loadBasis,
    sourceLoad: request.loads[response.loadComponent],
    basisStress,
    coefficient: interpolation.value,
    stressContribution: interpolation.value * basisStress,
    interpolationEvidence: interpolation.evidence,
  });
}

function targetResult(target, contributions, pressureRows) {
  const components = Object.fromEntries(STRESS_COMPONENTS.map((component) => [
    component, { membrane: 0, bending: 0, pressure: 0 },
  ]));
  contributions.filter((row) => row.targetId === target.targetId).forEach((row) => {
    const bucket = components[row.stressComponent];
    if (row.stressClass === 'MEMBRANE') bucket.membrane += row.stressContribution;
    else bucket.bending += row.stressContribution;
  });
  const pressure = pressureRows.find((row) => row.targetId === target.targetId);
  if (pressure) STRESS_COMPONENTS.forEach((component) => { components[component].pressure = pressure[component]; });
  const finalized = Object.fromEntries(Object.entries(components).map(([key, value]) => [
    key, freeze({
      ...value,
      mechanicalSurface: value.membrane + value.bending,
      totalSurface: value.membrane + value.bending + value.pressure,
    }),
  ]));
  return freeze({
    targetId: target.targetId,
    surface: target.surface,
    description: target.description,
    components: finalized,
    vonMises: vonMises(finalized),
  });
}

function canonicalRequest(input) {
  const value = structuredClone(input);
  exactKeys(value, ['schema', 'requestIdentity', 'geometry', 'loads', 'pressureByTarget'], 'request');
  if (value.schema !== CORRELATION_REQUEST_SCHEMA) fail('CORRELATION_REQUEST_SCHEMA_MISMATCH', 'schema');
  requiredString(value.requestIdentity, 'requestIdentity');
  exactKeys(value.geometry, ['pipeOutsideDiameter', 'pipeThickness', 'attachmentDiameter'], 'geometry');
  positive(value.geometry.pipeOutsideDiameter, 'geometry.pipeOutsideDiameter');
  positive(value.geometry.pipeThickness, 'geometry.pipeThickness');
  positive(value.geometry.attachmentDiameter, 'geometry.attachmentDiameter');
  if (value.pipeThickness * 2 >= value.pipeOutsideDiameter) fail('CORRELATION_WALL_GEOMETRY_INVALID', 'geometry.pipeThickness');
  exactKeys(value.loads, LOAD_COMPONENTS, 'loads');
  LOAD_COMPONENTS.forEach((key) => finite(value.loads[key], `loads.${key}`));
  if (!Array.isArray(value.pressureByTarget)) fail('CORRELATION_PRESSURE_ROWS_REQUIRED', 'pressureByTarget');
  const targets = new Set();
  value.pressureByTarget.forEach((row, index) => {
    exactKeys(row, ['targetId', ...STRESS_COMPONENTS], `pressureByTarget[${index}]`);
    requiredString(row.targetId, `pressureByTarget[${index}].targetId`);
    if (targets.has(row.targetId)) fail('CORRELATION_PRESSURE_TARGET_DUPLICATE', `pressureByTarget[${index}].targetId`);
    targets.add(row.targetId);
    STRESS_COMPONENTS.forEach((key) => finite(row[key], `pressureByTarget[${index}].${key}`));
  });
  return freeze(value);
}

function dimensionlessParameters(geometry) {
  return freeze({
    diameterRatio: geometry.attachmentDiameter / geometry.pipeOutsideDiameter,
    diameterThicknessRatio: geometry.pipeOutsideDiameter / geometry.pipeThickness,
  });
}

function normalizedLoadStress(load, basis, geometry) {
  if (basis === LOAD_BASES.FORCE_OVER_D_T) return load / (geometry.pipeOutsideDiameter * geometry.pipeThickness);
  if (basis === LOAD_BASES.MOMENT_OVER_D2_T) return load / (geometry.pipeOutsideDiameter ** 2 * geometry.pipeThickness);
  fail('CORRELATION_LOAD_BASIS_UNSUPPORTED', 'loadBasis');
}

function vonMises(components) {
  const sx = components.SIGMA_X.totalSurface;
  const st = components.SIGMA_THETA.totalSurface;
  const sr = components.SIGMA_R.totalSurface;
  const tau = components.TAU_XTHETA.totalSurface;
  return Math.sqrt(0.5 * ((sx - st) ** 2 + (st - sr) ** 2 + (sr - sx) ** 2) + 3 * tau ** 2);
}

function methodEvidence(profile) {
  return freeze({
    methodIdentity: profile.methodIdentity,
    methodEdition: profile.methodEdition,
    coefficientDatasetId: profile.coefficientDatasetId,
    coefficientDatasetHash: profile.coefficientDatasetHash,
    interpolationPolicyId: profile.interpolationPolicyId,
    applicabilityProfileId: profile.applicabilityProfileId,
    provenance: profile.provenance,
  });
}

function rejectedResult(requestInput, profileInput, error) {
  const outside = error?.code === 'OUTSIDE_CORRELATION_DOMAIN';
  return freeze({
    schema: CORRELATION_RESULT_SCHEMA,
    requestIdentity: typeof requestInput?.requestIdentity === 'string' ? requestInput.requestIdentity : null,
    qualification: {
      state: outside ? QUALIFICATION_STATES.OUTSIDE_DOMAIN : QUALIFICATION_STATES.REJECTED_REQUEST,
      engineeringUseAuthorized: false,
      authorizationBasis: 'REJECTED',
    },
    geometryParameters: null,
    methodEvidence: safeMethodEvidence(profileInput),
    contributions: [],
    targetResults: [],
    uncertainty: null,
    limitations: [...BASE_LIMITATIONS, 'NO_AUTHORITATIVE_CORRELATION_RESULT'],
    diagnostics: [{
      severity: 'ERROR',
      code: error?.code ?? 'CORRELATION_REQUEST_REJECTED',
      path: error?.path ?? 'request',
      message: error instanceof Error ? error.message : 'Unknown correlation failure.',
      domain: error?.domain ?? null,
    }],
  });
}

function safeMethodEvidence(profile) {
  return profile && typeof profile === 'object' ? {
    methodIdentity: profile.methodIdentity ?? null,
    methodEdition: profile.methodEdition ?? null,
    coefficientDatasetId: profile.coefficientDatasetId ?? null,
    coefficientDatasetHash: profile.coefficientDatasetHash ?? null,
    interpolationPolicyId: profile.interpolationPolicyId ?? null,
    applicabilityProfileId: profile.applicabilityProfileId ?? null,
    provenance: profile.provenance ?? null,
  } : null;
}
function exactKeys(value, expected, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('CORRELATION_OBJECT_REQUIRED', path);
  const actual = Object.keys(value).sort(); const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) fail('CORRELATION_EXACT_KEYS_MISMATCH', path);
}
function finite(value, path) { if (!Number.isFinite(value)) fail('CORRELATION_NUMBER_NON_FINITE', path); }
function positive(value, path) { finite(value, path); if (value <= 0) fail('CORRELATION_NUMBER_NOT_POSITIVE', path); }
function requiredString(value, path) { if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path); }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
