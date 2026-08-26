import assert from 'node:assert/strict';

/**
 * Validation-only physical statics for the cylindrical WRC basis.
 *
 * This module deliberately imports no production code. It starts from global
 * physical geometry and loads, transfers the source moment to the attachment
 * target, constructs the source-reviewed WRC cylindrical basis, then projects
 * the global result into {P,Vc,Vl,Mc,Ml,Mt}.
 */
export function deriveIndependentWrc537PhysicalStatics({
  sourcePointGlobal,
  targetPointGlobal,
  vesselLongitudinalPositiveGlobal,
  foundationRadialLineGlobal,
  forceAtSourceGlobal,
  momentAtSourceGlobal,
  orthogonalityTolerance = 1e-12,
  collinearityTolerance = 1e-12,
} = {}) {
  const source = vector3(sourcePointGlobal, 'SOURCE_POINT');
  const target = vector3(targetPointGlobal, 'TARGET_POINT');
  const eVl = normalize3(vesselLongitudinalPositiveGlobal, 'VESSEL_LONGITUDINAL');
  const radialLine = normalize3(foundationRadialLineGlobal, 'FOUNDATION_RADIAL_LINE');
  const force = vector3(forceAtSourceGlobal, 'FORCE_AT_SOURCE');
  const sourceMoment = vector3(momentAtSourceGlobal, 'MOMENT_AT_SOURCE');

  const sourceToTarget = subtract(target, source);
  const eP = normalize3(sourceToTarget, 'SOURCE_TO_TARGET_RADIAL');
  const longitudinalResidual = Math.abs(dot(eVl, eP));
  assert.ok(longitudinalResidual <= orthogonalityTolerance,
    `INDEPENDENT_WRC_SOURCE_TO_TARGET_NOT_RADIAL:${longitudinalResidual}`);
  const radialAlignment = dot(radialLine, eP);
  assert.ok(Math.abs(Math.abs(radialAlignment) - 1) <= collinearityTolerance,
    `INDEPENDENT_WRC_SOURCE_TO_TARGET_NOT_COLLINEAR:${radialAlignment}`);

  const eVc = normalize3(cross(eVl, eP), 'CIRCUMFERENTIAL_BASIS');
  const basisGlobal = deepFreeze({
    P: eP,
    Vc: eVc,
    Vl: eVl,
    Mc: scale(eVl, -1),
    Ml: eVc,
    Mt: scale(eP, -1),
  });

  // Equivalent moment at target: M_T = M_S + (r_S - r_T) x F.
  const sourceFromTarget = subtract(source, target);
  const transferMoment = cross(sourceFromTarget, force);
  const momentAtTargetGlobal = add(sourceMoment, transferMoment);
  const wrcLoads = deepFreeze({
    P: zero(dot(force, basisGlobal.P)),
    Vc: zero(dot(force, basisGlobal.Vc)),
    Vl: zero(dot(force, basisGlobal.Vl)),
    Mc: zero(dot(momentAtTargetGlobal, basisGlobal.Mc)),
    Ml: zero(dot(momentAtTargetGlobal, basisGlobal.Ml)),
    Mt: zero(dot(momentAtTargetGlobal, basisGlobal.Mt)),
  });

  return deepFreeze({
    schema: 'emp1-wrc537-independent-physical-statics/v1',
    productionImports: [],
    productionObservationUsed: false,
    sourcePointGlobal: source,
    targetPointGlobal: target,
    sourceFromTargetGlobal: sourceFromTarget,
    vesselLongitudinalPositiveGlobal: eVl,
    foundationRadialLineGlobal: radialLine,
    sourceToTargetUnitGlobal: eP,
    sourceToTargetLongitudinalResidual: zero(longitudinalResidual),
    sourceToTargetRadialAlignment: zero(radialAlignment),
    basisGlobal,
    forceAtSourceGlobal: force,
    momentAtSourceGlobal: sourceMoment,
    transferMomentGlobal: transferMoment,
    momentAtTargetGlobal,
    wrcLoads,
    convention: {
      P: 'SOURCE_REFERENCE_TOWARD_ATTACHMENT_TARGET',
      Vl: 'POSITIVE_VESSEL_LONGITUDINAL',
      Vc: 'VL_CROSS_P',
      Mc: 'NEGATIVE_VESSEL_LONGITUDINAL_RIGHT_HAND_VECTOR',
      Ml: 'SAME_VECTOR_AS_VC',
      Mt: 'OPPOSITE_P_RIGHT_HAND_VECTOR',
    },
  });
}

export function reconstructGlobalLoadsFromIndependentWrc({ basisGlobal, wrcLoads } = {}) {
  const basis = requireBasis(basisGlobal);
  const loads = requireLoads(wrcLoads);
  return deepFreeze({
    forceGlobal: linearCombination([
      [loads.P, basis.P], [loads.Vc, basis.Vc], [loads.Vl, basis.Vl],
    ]),
    momentAtTargetGlobal: linearCombination([
      [loads.Mc, basis.Mc], [loads.Ml, basis.Ml], [loads.Mt, basis.Mt],
    ]),
  });
}

export function assertIndependentWrcRoundtrip(statics, tolerance = 1e-12) {
  const reconstructed = reconstructGlobalLoadsFromIndependentWrc(statics);
  assertVectorClose(reconstructed.forceGlobal, statics.forceAtSourceGlobal, tolerance,
    'INDEPENDENT_WRC_FORCE_ROUNDTRIP');
  assertVectorClose(reconstructed.momentAtTargetGlobal, statics.momentAtTargetGlobal, tolerance,
    'INDEPENDENT_WRC_MOMENT_ROUNDTRIP');
  return true;
}

function requireBasis(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'WRC basis required');
  const result = {};
  for (const key of ['P', 'Vc', 'Vl', 'Mc', 'Ml', 'Mt']) result[key] = normalize3(value[key], `BASIS_${key}`);
  return result;
}
function requireLoads(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'WRC loads required');
  return Object.fromEntries(['P', 'Vc', 'Vl', 'Mc', 'Ml', 'Mt'].map((key) => {
    assert(Number.isFinite(value[key]), `WRC load invalid:${key}`);
    return [key, Number(value[key])];
  }));
}
function linearCombination(terms) {
  const result = [0, 0, 0];
  for (const [factor, vector] of terms) {
    for (let index = 0; index < 3; index += 1) result[index] += factor * vector[index];
  }
  return result.map(zero);
}
function assertVectorClose(actual, expected, tolerance, label) {
  assert.equal(actual.length, 3); assert.equal(expected.length, 3);
  actual.forEach((value, index) => {
    const scaleValue = Math.max(1, Math.abs(value), Math.abs(expected[index]));
    assert.ok(Math.abs(value - expected[index]) <= scaleValue * tolerance,
      `${label}[${index}]: actual=${value} expected=${expected[index]}`);
  });
}
function vector3(value, label) {
  assert(Array.isArray(value) && value.length === 3, `${label}: vector3 required`);
  assert(value.every(Number.isFinite), `${label}: finite vector required`);
  return value.map((item) => zero(Number(item)));
}
function normalize3(value, label) {
  const vector = vector3(value, label);
  const magnitude = Math.sqrt(dot(vector, vector));
  assert.ok(magnitude > 0, `${label}: nonzero vector required`);
  return vector.map((item) => zero(item / magnitude));
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [
    zero(a[1] * b[2] - a[2] * b[1]),
    zero(a[2] * b[0] - a[0] * b[2]),
    zero(a[0] * b[1] - a[1] * b[0]),
  ];
}
function subtract(a, b) { return a.map((value, index) => zero(value - b[index])); }
function add(a, b) { return a.map((value, index) => zero(value + b[index])); }
function scale(a, factor) { return a.map((value) => zero(value * factor)); }
function zero(value) { return Object.is(value, -0) || value === 0 ? 0 : value; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
