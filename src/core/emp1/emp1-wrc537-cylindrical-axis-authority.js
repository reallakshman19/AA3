export const EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_SCHEMA =
  'emp1-wrc537-cylindrical-axis-authority/v1';
export const EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID =
  'WRC537_2013_FIGURE2_TABLE4_TABLE5_CYLINDRICAL_LOAD_BASIS_V1';
export const EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256 =
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
export const EMP1_WRC537_CYLINDRICAL_AXIS_QUALIFIED = 'QUALIFIED_SOURCE_POLARITY';
export const EMP1_WRC537_CYLINDRICAL_AXIS_UNRESOLVED =
  'BLOCKED_SOURCE_TO_TARGET_POLARITY_UNRESOLVED';

const SOURCE_LOCATORS = Object.freeze([
  Object.freeze({ section: '4.1', figure: 'Figure 2', purpose: 'cylindrical load/stress sign convention' }),
  Object.freeze({ table: 'Table 4', pages: '39-40', purpose: 'stress signs and A/B/C/D locations' }),
  Object.freeze({ table: 'Table 5', pages: '41-42', purpose: 'signed cylindrical load superposition' }),
  Object.freeze({ section: '4.3.4', equation: '47', purpose: 'torsional shear term' }),
  Object.freeze({ section: '4.3.5', equations: '48-49', purpose: 'Vc/Vl shear terms' }),
]);

/**
 * Resolve WRC cylindrical load polarity from retained physical reference geometry.
 * The generic foundation radial hint is only an unoriented line. +P is instead
 * derived from the selected remote load reference point toward the attachment
 * target, then required to be collinear with the retained radial line and
 * orthogonal to the vessel longitudinal axis.
 *
 * Source-reviewed cylindrical basis used by EMP.1:
 *   +P  = toward vessel / attachment target
 *   +VL = +vessel longitudinal direction
 *   +VC = +VL x +P
 *   +MC = -VL (right-hand axial vector for the WRC shown turning sense)
 *   +ML = +VC
 *   +MT = -P
 */
export function deriveEmp1Wrc537CylindricalAxisAuthority({
  foundationResult,
  foundationModel,
  loadCaseIdentity,
  orthogonalityTolerance = 1e-10,
  collinearityTolerance = 1e-10,
} = {}) {
  const result = requireRecord(foundationResult,
    'EMP1_WRC537_AXIS_FOUNDATION_RESULT_REQUIRED');
  if (result.schema !== 'local-attachment-foundation-result/v1'
    || result.qualification?.state !== 'ACCEPTED') {
    throw axisError('EMP1_WRC537_AXIS_FOUNDATION_RESULT_NOT_QUALIFIED');
  }
  const model = requireRecord(foundationModel,
    'EMP1_WRC537_AXIS_FOUNDATION_MODEL_REQUIRED');
  const load = selectLoadCase(result.transformedLoadCases, loadCaseIdentity);
  const eLong = normalize3(result.coordinateSystemEvidence?.axesGlobal?.eX,
    'EMP1_WRC537_AXIS_VESSEL_LONGITUDINAL_INVALID');
  const radialLine = normalize3(result.coordinateSystemEvidence?.axesGlobal?.eZ,
    'EMP1_WRC537_AXIS_FOUNDATION_RADIAL_INVALID');
  const sourcePoint = vector3(load.sourcePointGlobal,
    'EMP1_WRC537_AXIS_SOURCE_POINT_INVALID');
  const targetPoint = vector3(load.targetPointGlobal,
    'EMP1_WRC537_AXIS_TARGET_POINT_INVALID');
  const inwardVector = targetPoint.map((value, index) => value - sourcePoint[index]);
  const inwardNorm = norm(inwardVector);
  const sourceRefs = axisSourceRefs(model);

  const base = {
    schema: EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_SCHEMA,
    authorityId: EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID,
    sourceDocumentSha256: EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256,
    sourceLocators: SOURCE_LOCATORS,
    loadCaseIdentity: load.identity,
    coordinateSystemIdentity: result.coordinateSystemEvidence?.identity ?? null,
    sourceReferences: sourceRefs,
    sourcePointGlobal: sourcePoint,
    targetPointGlobal: targetPoint,
    foundationRadialLineGlobal: radialLine,
    vesselLongitudinalPositiveGlobal: eLong,
    convention: Object.freeze({
      P: 'SOURCE_REFERENCE_TOWARD_ATTACHMENT_TARGET',
      Vl: 'POSITIVE_VESSEL_LONGITUDINAL',
      Vc: 'VL_CROSS_P',
      Mc: 'NEGATIVE_VESSEL_LONGITUDINAL_RIGHT_HAND_VECTOR',
      Ml: 'SAME_VECTOR_AS_VC',
      Mt: 'OPPOSITE_P_RIGHT_HAND_VECTOR',
      actionDomain: 'LOAD_COMPONENTS_AT_WRC_ATTACHMENT_REFERENCE',
    }),
    productionObservationUsedToSetAuthority: false,
  };

  if (!(inwardNorm > 0)) {
    return deepFreeze({
      ...base,
      state: EMP1_WRC537_CYLINDRICAL_AXIS_UNRESOLVED,
      engineeringUseAuthorized: false,
      reason: 'SELECTED_LOAD_SOURCE_AND_TARGET_POINTS_COINCIDE',
      frameInput: null,
      basisGlobal: null,
    });
  }

  const eP = inwardVector.map((value) => value / inwardNorm);
  const longitudinalResidual = Math.abs(dot(eLong, eP));
  if (longitudinalResidual > orthogonalityTolerance) {
    throw axisError(`EMP1_WRC537_AXIS_SOURCE_TO_TARGET_NOT_RADIAL:${longitudinalResidual}`);
  }
  const radialAlignment = dot(radialLine, eP);
  if (Math.abs(Math.abs(radialAlignment) - 1) > collinearityTolerance) {
    throw axisError(`EMP1_WRC537_AXIS_SOURCE_TO_TARGET_NOT_COLLINEAR_WITH_RADIAL:${radialAlignment}`);
  }
  const eVc = normalize3(cross(eLong, eP), 'EMP1_WRC537_AXIS_VC_INVALID');
  const basisGlobal = {
    P: eP,
    Vc: eVc,
    Vl: eLong,
    Mc: scale(eLong, -1),
    Ml: eVc,
    Mt: scale(eP, -1),
  };
  return deepFreeze({
    ...base,
    state: EMP1_WRC537_CYLINDRICAL_AXIS_QUALIFIED,
    engineeringUseAuthorized: true,
    reason: null,
    sourceToTargetRadialAlignment: radialAlignment,
    sourceToTargetLongitudinalResidual: longitudinalResidual,
    frameInput: {
      vesselCenterlineGlobal: eLong,
      nozzleCenterlineGlobal: eP,
      orthogonalityTolerance,
    },
    basisGlobal,
  });
}

export function requireEmp1Wrc537QualifiedCylindricalAxisAuthority(value) {
  if (!value || value.schema !== EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_SCHEMA
    || value.authorityId !== EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_ID
    || value.sourceDocumentSha256 !== EMP1_WRC537_CYLINDRICAL_AXIS_SOURCE_SHA256) {
    throw axisError('EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_REQUIRED');
  }
  if (value.state !== EMP1_WRC537_CYLINDRICAL_AXIS_QUALIFIED
    || value.engineeringUseAuthorized !== true
    || value.productionObservationUsedToSetAuthority !== false) {
    throw axisError('EMP1_WRC537_CYLINDRICAL_AXIS_AUTHORITY_NOT_QUALIFIED');
  }
  const frameInput = requireRecord(value.frameInput,
    'EMP1_WRC537_CYLINDRICAL_AXIS_FRAME_INPUT_REQUIRED');
  const eLong = normalize3(frameInput.vesselCenterlineGlobal,
    'EMP1_WRC537_AXIS_VESSEL_LONGITUDINAL_INVALID');
  const eP = normalize3(frameInput.nozzleCenterlineGlobal,
    'EMP1_WRC537_AXIS_P_INVALID');
  const eVc = normalize3(cross(eLong, eP), 'EMP1_WRC537_AXIS_VC_INVALID');
  const expected = { P: eP, Vc: eVc, Vl: eLong, Mc: scale(eLong, -1), Ml: eVc, Mt: scale(eP, -1) };
  for (const [name, vector] of Object.entries(expected)) {
    if (!sameVector(value.basisGlobal?.[name], vector, 1e-12)) {
      throw axisError(`EMP1_WRC537_CYLINDRICAL_AXIS_BASIS_DRIFT:${name}`);
    }
  }
  return deepFreeze(structuredClone(value));
}

function axisSourceRefs(model) {
  const cs = model.pipeCoordinateSystem;
  return {
    axialDirection: cs?.axialDirection?.sourceRef ?? null,
    radialHint: cs?.radialHint?.sourceRef ?? null,
    circumferentialHint: cs?.circumferentialHint?.sourceRef ?? null,
  };
}
function selectLoadCase(rows, identity) {
  if (typeof identity !== 'string' || !identity.trim()) {
    throw axisError('EMP1_WRC537_AXIS_LOAD_CASE_IDENTITY_REQUIRED');
  }
  const matches = Array.isArray(rows) ? rows.filter((row) => row?.identity === identity) : [];
  if (matches.length !== 1) throw axisError('EMP1_WRC537_AXIS_LOAD_CASE_NOT_UNIQUE');
  return matches[0];
}
function sameVector(actual, expected, tolerance) {
  return Array.isArray(actual) && actual.length === 3
    && actual.every((value, index) => Number.isFinite(value)
      && Math.abs(value - expected[index]) <= tolerance);
}
function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw axisError(code);
  return value;
}
function vector3(value, code) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw axisError(code);
  }
  return value.map(Number);
}
function normalize3(value, code) {
  const vector = vector3(value, code);
  const magnitude = norm(vector);
  if (!(magnitude > 0)) throw axisError(code);
  return vector.map((item) => item / magnitude);
}
function norm(value) { return Math.sqrt(dot(value, value)); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function scale(vector, scalar) { return vector.map((value) => value * scalar); }
function axisError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
