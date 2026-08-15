import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireFiniteNumber,
  requireNonEmptyString,
  requirePositiveNumber,
} from './contracts.js';
import { semanticHash } from './identity.js';

export const EMPIRICAL_ELBOW_FLEXIBILITY_AUTHORITY_SCHEMA =
  'empirical-elbow-flexibility-authority/v1';
export const EMPIRICAL_CIRCULAR_ELBOW_VIRTUAL_WORK_SCHEMA =
  'empirical-circular-elbow-virtual-work/v1';

export const EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY = deepFreeze({
  unitVectorTolerance: 1e-12,
  radiusRelativeTolerance: 1e-10,
  planeRelativeTolerance: 1e-10,
  endpointRelativeTolerance: 1e-10,
  axisymmetryRelativeTolerance: 1e-10,
  coarseQuadratureOrder: 16,
  fineQuadratureOrder: 32,
  quadratureAbsoluteTolerance: 1e-15,
  quadratureRelativeTolerance: 1e-11,
  newtonTolerance: 1e-15,
  maximumNewtonIterations: 64,
});

const FLEX_AUTHORITY_KEYS = Object.freeze([
  'schema',
  'authorityId',
  'componentId',
  'basis',
  'inPlaneFlexibilityFactor',
  'outOfPlaneFlexibilityFactor',
  'torsionalFlexibilityFactor',
  'source',
  'geometryBinding',
  'semanticHash',
]);
const FLEX_SOURCE_KEYS = Object.freeze([
  'standard',
  'edition',
  'ruleId',
  'sourceSemanticHash',
  'factorResultSemanticHash',
]);
const FLEX_GEOMETRY_BINDING_KEYS = Object.freeze([
  'bendRadiusM',
  'outerDiameterM',
  'wallThicknessM',
  'pressurePa',
  'elasticModulusPa',
]);
const GEOMETRY_KEYS = Object.freeze([
  'componentId',
  'startPointM',
  'endPointM',
  'centerPointM',
  'planeNormal',
]);
const PROPERTY_KEYS = Object.freeze([
  'elasticModulusPa',
  'shearModulusPa',
  'areaM2',
  'secondMomentYM4',
  'secondMomentZM4',
  'torsionConstantM4',
]);
const UNIT_CASE_KEYS = Object.freeze([
  'caseId',
  'loadPointM',
  'direction',
  'active',
]);
const TERM_KEYS = Object.freeze(['axial', 'inPlaneBending', 'outOfPlaneBending', 'torsion']);

export function createEmpiricalElbowFlexibilityAuthority(input) {
  requireRecord(input, 'elbow flexibility authority input');
  const material = normalizeFlexibilityAuthority(input, false);
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

export function requireEmpiricalElbowFlexibilityAuthority(value) {
  const accepted = normalizeFlexibilityAuthority(value, true);
  const { semanticHash: actual, ...material } = accepted;
  if (actual !== semanticHash(material)) {
    throw coded(
      'EMPIRICAL_ELBOW_FLEXIBILITY_AUTHORITY_HASH_MISMATCH',
      'Elbow flexibility authority semantic hash mismatch.',
    );
  }
  return deepFreeze(accepted);
}

export function normalizeCircularElbowGeometry(input) {
  exactKeys(input, GEOMETRY_KEYS, 'circular elbow geometry');
  const componentId = requireNonEmptyString(input.componentId, 'geometry.componentId');
  const startPointM = requirePoint(input.startPointM, 'geometry.startPointM');
  const endPointM = requirePoint(input.endPointM, 'geometry.endPointM');
  const centerPointM = requirePoint(input.centerPointM, 'geometry.centerPointM');
  const planeNormal = requireUnitVector(input.planeNormal, 'geometry.planeNormal');
  const radialStart = subtractPoint(startPointM, centerPointM);
  const radialEnd = subtractPoint(endPointM, centerPointM);
  const startRadiusM = magnitude(radialStart);
  const endRadiusM = magnitude(radialEnd);
  if (!(startRadiusM > 0) || !(endRadiusM > 0)) {
    throw coded('EMPIRICAL_ELBOW_RADIUS_INVALID', 'Elbow endpoints must be separated from the bend center.');
  }
  const radiusRelativeResidual = Math.abs(startRadiusM - endRadiusM)
    / Math.max(startRadiusM, endRadiusM);
  if (radiusRelativeResidual > EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.radiusRelativeTolerance) {
    throw coded(
      'EMPIRICAL_ELBOW_RADIUS_MISMATCH',
      `Elbow start/end radii differ by relative residual ${radiusRelativeResidual}.`,
    );
  }
  const radiusM = (startRadiusM + endRadiusM) / 2;
  const radialStartUnit = scale(radialStart, 1 / startRadiusM);
  const radialEndUnit = scale(radialEnd, 1 / endRadiusM);
  const startPlaneResidual = Math.abs(dot(radialStartUnit, planeNormal));
  const endPlaneResidual = Math.abs(dot(radialEndUnit, planeNormal));
  const planeRelativeResidual = Math.max(startPlaneResidual, endPlaneResidual);
  if (planeRelativeResidual > EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.planeRelativeTolerance) {
    throw coded(
      'EMPIRICAL_ELBOW_PLANE_MISMATCH',
      `Elbow radial vectors are not in the declared plane; residual ${planeRelativeResidual}.`,
    );
  }
  const cosine = clamp(dot(radialStartUnit, radialEndUnit), -1, 1);
  const sine = dot(planeNormal, cross(radialStartUnit, radialEndUnit));
  const includedAngleRad = Math.atan2(sine, cosine);
  if (!(includedAngleRad > 0) || !(includedAngleRad < Math.PI)) {
    throw coded(
      'EMPIRICAL_ELBOW_SWEEP_INVALID',
      'Declared plane normal must define a positive circular sweep strictly below 180 degrees.',
    );
  }
  const tangentStart = normalize(cross(planeNormal, radialStartUnit), 'elbow start tangent');
  const tangentEnd = normalize(cross(planeNormal, radialEndUnit), 'elbow end tangent');
  const arcLengthM = radiusM * includedAngleRad;
  const chordVectorM = subtractPoint(endPointM, startPointM);
  const chordLengthM = magnitude(chordVectorM);
  const material = {
    componentId,
    startPointM,
    endPointM,
    centerPointM,
    planeNormal,
    radialStartUnit,
    radialEndUnit,
    tangentStart,
    tangentEnd,
    radiusM,
    includedAngleRad,
    arcLengthM,
    chordVectorM,
    chordLengthM,
    evidence: {
      geometryClass: 'PLANAR_CIRCULAR_ARC',
      radiusRelativeResidual,
      planeRelativeResidual,
      radiusRelativeTolerance: EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.radiusRelativeTolerance,
      planeRelativeTolerance: EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.planeRelativeTolerance,
      sweepConvention: 'POSITIVE_ABOUT_DECLARED_PLANE_NORMAL_START_TO_END',
      segmentedBeamApproximationUsed: false,
    },
  };
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

export function reverseCircularElbowGeometry(geometryInput) {
  const geometry = geometryInput?.semanticHash
    ? requireNormalizedGeometry(geometryInput)
    : normalizeCircularElbowGeometry(geometryInput);
  return normalizeCircularElbowGeometry({
    componentId: geometry.componentId,
    startPointM: geometry.endPointM,
    endPointM: geometry.startPointM,
    centerPointM: geometry.centerPointM,
    planeNormal: scale(geometry.planeNormal, -1),
  });
}

export function buildCircularElbowUnitLoadAction(input) {
  requireRecord(input, 'circular elbow unit-load action input');
  exactKeys(
    input,
    ['geometry', 'loadCase', 'thetaRad'],
    'circular elbow unit-load action input',
  );
  const geometry = input.geometry?.semanticHash
    ? requireNormalizedGeometry(input.geometry)
    : normalizeCircularElbowGeometry(input.geometry);
  const loadCase = requireUnitLoadCase(input.loadCase, 'loadCase');
  const thetaRad = requireFiniteNumber(input.thetaRad, 'thetaRad');
  if (thetaRad < 0 || thetaRad > geometry.includedAngleRad) {
    throw new RangeError('thetaRad must lie within the circular elbow sweep.');
  }
  if (!loadCase.active) return zeroAction(thetaRad, geometry);
  return actionAtTheta(geometry, loadCase, thetaRad);
}

export function calculateCircularElbowVirtualWorkContribution(input) {
  requireRecord(input, 'circular elbow virtual-work input');
  exactKeys(
    input,
    ['geometry', 'properties', 'flexibilityAuthority', 'caseA', 'caseB'],
    'circular elbow virtual-work input',
  );
  const geometry = input.geometry?.semanticHash
    ? requireNormalizedGeometry(input.geometry)
    : normalizeCircularElbowGeometry(input.geometry);
  const properties = requireProperties(input.properties);
  const flexibilityAuthority = requireEmpiricalElbowFlexibilityAuthority(input.flexibilityAuthority);
  bindAuthorityToMechanics({ geometry, properties, flexibilityAuthority });
  const caseA = requireUnitLoadCase(input.caseA, 'caseA');
  const caseB = requireUnitLoadCase(input.caseB, 'caseB');

  const zero = !caseA.active || !caseB.active;
  const coarse = zero
    ? zeroTerms()
    : integrateTerms(
      geometry,
      properties,
      flexibilityAuthority,
      caseA,
      caseB,
      EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.coarseQuadratureOrder,
    );
  const fine = zero
    ? zeroTerms()
    : integrateTerms(
      geometry,
      properties,
      flexibilityAuthority,
      caseA,
      caseB,
      EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.fineQuadratureOrder,
    );
  const convergence = compareTerms(coarse, fine);
  if (!convergence.satisfied) {
    throw coded(
      'EMPIRICAL_ELBOW_QUADRATURE_NOT_CONVERGED',
      `Continuous elbow virtual-work quadrature failed the fixed numerical policy; maximum scaled residual ${convergence.maximumScaledResidual}.`,
    );
  }
  const total = TERM_KEYS.reduce((sum, key) => sum + fine[key], 0);

  return deepFreeze({
    schema: EMPIRICAL_CIRCULAR_ELBOW_VIRTUAL_WORK_SCHEMA,
    componentId: geometry.componentId,
    rowCaseId: caseA.caseId,
    columnCaseId: caseB.caseId,
    coefficientUnit: 'm/N',
    geometrySemanticHash: geometry.semanticHash,
    flexibilityAuthoritySemanticHash: flexibilityAuthority.semanticHash,
    terms: fine,
    total,
    convergence,
    evidence: {
      actionAuthority: 'STATIC_CUT_EQUILIBRIUM_AND_MOMENT_TRANSPORT_ON_CONTINUOUS_ARC',
      integrationAuthority: 'GAUSS_LEGENDRE_CONTINUOUS_ARC_VIRTUAL_WORK',
      componentFlexibilityBasis: flexibilityAuthority.basis,
      sifConsumedAsFlexibility: false,
      segmentedBeamApproximationUsed: false,
      finiteElementRouteUsed: false,
      formulaTrace: [
        EMPIRICAL_FORMULA_IDS.circularElbowGeometry,
        EMPIRICAL_FORMULA_IDS.circularElbowUnitLoadAction,
        EMPIRICAL_FORMULA_IDS.circularElbowVirtualWork,
        EMPIRICAL_FORMULA_IDS.codeComponentFlexibilityWeighting,
      ],
    },
  });
}

export function buildCircularElbowThermalEndTranslation(input) {
  requireRecord(input, 'circular elbow thermal input');
  exactKeys(
    input,
    ['geometry', 'expansionCoefficientPerK', 'referenceTemperatureC', 'analysisTemperatureC'],
    'circular elbow thermal input',
  );
  const geometry = input.geometry?.semanticHash
    ? requireNormalizedGeometry(input.geometry)
    : normalizeCircularElbowGeometry(input.geometry);
  const alpha = requireFiniteNumber(input.expansionCoefficientPerK, 'expansionCoefficientPerK');
  if (alpha < 0) throw new RangeError('expansionCoefficientPerK must be non-negative.');
  const referenceTemperatureC = requireFiniteNumber(input.referenceTemperatureC, 'referenceTemperatureC');
  const analysisTemperatureC = requireFiniteNumber(input.analysisTemperatureC, 'analysisTemperatureC');
  const deltaTK = analysisTemperatureC - referenceTemperatureC;
  const strain = alpha * deltaTK;
  const endTranslationM = scale(geometry.chordVectorM, strain);
  return deepFreeze({
    componentId: geometry.componentId,
    strain,
    deltaTK,
    endTranslationM,
    arcLengthExpansionM: strain * geometry.arcLengthM,
    evidence: {
      kinematicIdentity: 'INTEGRAL_EPSILON_T_DS_EQUALS_EPSILON_TIMES_ENDPOINT_CHORD',
      includedAngleChangeAssumed: 0,
      thermalGradientIncluded: false,
      flexibilityFactorConsumed: false,
      formulaTrace: [EMPIRICAL_FORMULA_IDS.circularElbowThermalChordExpansion],
    },
  });
}

function normalizeFlexibilityAuthority(input, sealed) {
  exactKeys(
    input,
    sealed ? FLEX_AUTHORITY_KEYS : FLEX_AUTHORITY_KEYS.filter((key) => key !== 'semanticHash'),
    'elbow flexibility authority',
  );
  if (input.schema !== EMPIRICAL_ELBOW_FLEXIBILITY_AUTHORITY_SCHEMA) {
    throw new TypeError(`Elbow flexibility authority schema must be ${EMPIRICAL_ELBOW_FLEXIBILITY_AUTHORITY_SCHEMA}.`);
  }
  if (input.basis !== 'CODE_COMPONENT_FLEXIBILITY') {
    throw new TypeError('Elbow flexibility authority basis must be CODE_COMPONENT_FLEXIBILITY.');
  }
  exactKeys(input.source, FLEX_SOURCE_KEYS, 'elbow flexibility authority source');
  exactKeys(input.geometryBinding, FLEX_GEOMETRY_BINDING_KEYS, 'elbow flexibility geometry binding');
  if (input.source.standard !== 'ASME_B31J') {
    throw new TypeError('Current elbow ROM flexibility authority requires ASME_B31J.');
  }
  return {
    schema: input.schema,
    authorityId: requireNonEmptyString(input.authorityId, 'authorityId'),
    componentId: requireNonEmptyString(input.componentId, 'componentId'),
    basis: input.basis,
    inPlaneFlexibilityFactor: requirePositiveNumber(
      input.inPlaneFlexibilityFactor,
      'inPlaneFlexibilityFactor',
    ),
    outOfPlaneFlexibilityFactor: requirePositiveNumber(
      input.outOfPlaneFlexibilityFactor,
      'outOfPlaneFlexibilityFactor',
    ),
    torsionalFlexibilityFactor: requirePositiveNumber(
      input.torsionalFlexibilityFactor,
      'torsionalFlexibilityFactor',
    ),
    source: {
      standard: input.source.standard,
      edition: requireNonEmptyString(input.source.edition, 'source.edition'),
      ruleId: requireNonEmptyString(input.source.ruleId, 'source.ruleId'),
      sourceSemanticHash: requireNonEmptyString(
        input.source.sourceSemanticHash,
        'source.sourceSemanticHash',
      ),
      factorResultSemanticHash: requireNonEmptyString(
        input.source.factorResultSemanticHash,
        'source.factorResultSemanticHash',
      ),
    },
    geometryBinding: {
      bendRadiusM: requirePositiveNumber(input.geometryBinding.bendRadiusM, 'geometryBinding.bendRadiusM'),
      outerDiameterM: requirePositiveNumber(input.geometryBinding.outerDiameterM, 'geometryBinding.outerDiameterM'),
      wallThicknessM: requirePositiveNumber(input.geometryBinding.wallThicknessM, 'geometryBinding.wallThicknessM'),
      pressurePa: requireNonNegative(input.geometryBinding.pressurePa, 'geometryBinding.pressurePa'),
      elasticModulusPa: requirePositiveNumber(input.geometryBinding.elasticModulusPa, 'geometryBinding.elasticModulusPa'),
    },
    semanticHash: sealed
      ? requireNonEmptyString(input.semanticHash, 'semanticHash')
      : undefined,
  };
}

function requireNormalizedGeometry(value) {
  requireRecord(value, 'normalized circular elbow geometry');
  const reconstructed = normalizeCircularElbowGeometry({
    componentId: value.componentId,
    startPointM: value.startPointM,
    endPointM: value.endPointM,
    centerPointM: value.centerPointM,
    planeNormal: value.planeNormal,
  });
  if (value.semanticHash !== reconstructed.semanticHash) {
    throw coded(
      'EMPIRICAL_ELBOW_GEOMETRY_HASH_MISMATCH',
      'Circular elbow geometry semantic hash mismatch.',
    );
  }
  return reconstructed;
}

function requireProperties(value) {
  exactKeys(value, PROPERTY_KEYS, 'circular elbow properties');
  const properties = {
    elasticModulusPa: requirePositiveNumber(value.elasticModulusPa, 'properties.elasticModulusPa'),
    shearModulusPa: requirePositiveNumber(value.shearModulusPa, 'properties.shearModulusPa'),
    areaM2: requirePositiveNumber(value.areaM2, 'properties.areaM2'),
    secondMomentYM4: requirePositiveNumber(value.secondMomentYM4, 'properties.secondMomentYM4'),
    secondMomentZM4: requirePositiveNumber(value.secondMomentZM4, 'properties.secondMomentZM4'),
    torsionConstantM4: requirePositiveNumber(value.torsionConstantM4, 'properties.torsionConstantM4'),
  };
  const axisymmetryResidual = Math.abs(properties.secondMomentYM4 - properties.secondMomentZM4)
    / Math.max(properties.secondMomentYM4, properties.secondMomentZM4);
  if (axisymmetryResidual > EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.axisymmetryRelativeTolerance) {
    throw coded(
      'EMPIRICAL_ELBOW_SECTION_ORIENTATION_UNRESOLVED',
      'Circular elbow ROM requires an axisymmetric section until rotating principal-axis custody is established.',
    );
  }
  return deepFreeze({ ...properties, axisymmetryResidual });
}

function requireUnitLoadCase(value, label) {
  exactKeys(value, UNIT_CASE_KEYS, label);
  const direction = requireUnitVector(value.direction, `${label}.direction`);
  return deepFreeze({
    caseId: requireNonEmptyString(value.caseId, `${label}.caseId`),
    loadPointM: requirePoint(value.loadPointM, `${label}.loadPointM`),
    direction,
    active: requireBoolean(value.active, `${label}.active`),
  });
}

function bindAuthorityToMechanics({ geometry, properties, flexibilityAuthority }) {
  if (flexibilityAuthority.componentId !== geometry.componentId) {
    throw coded(
      'EMPIRICAL_ELBOW_FLEXIBILITY_COMPONENT_MISMATCH',
      'Elbow flexibility authority component identity does not match geometry.',
    );
  }
  relativeEqualOrThrow(
    flexibilityAuthority.geometryBinding.bendRadiusM,
    geometry.radiusM,
    EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.radiusRelativeTolerance,
    'EMPIRICAL_ELBOW_FLEXIBILITY_RADIUS_MISMATCH',
    'B31J bend radius does not match the continuous-arc geometry radius.',
  );
  relativeEqualOrThrow(
    flexibilityAuthority.geometryBinding.elasticModulusPa,
    properties.elasticModulusPa,
    EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.radiusRelativeTolerance,
    'EMPIRICAL_ELBOW_FLEXIBILITY_MODULUS_MISMATCH',
    'B31J elastic modulus does not match the ROM component modulus.',
  );
}

function actionAtTheta(geometry, loadCase, thetaRad) {
  const c = Math.cos(thetaRad);
  const s = Math.sin(thetaRad);
  const radial = add(
    scale(geometry.radialStartUnit, c),
    scale(geometry.tangentStart, s),
  );
  const tangent = add(
    scale(geometry.radialStartUnit, -s),
    scale(geometry.tangentStart, c),
  );
  const point = addPointVector(
    geometry.centerPointM,
    scale(radial, geometry.radiusM),
  );
  const internalForce = scale(loadCase.direction, -1);
  const moment = scale(
    cross(subtractPoint(loadCase.loadPointM, point), loadCase.direction),
    -1,
  );
  return deepFreeze({
    thetaRad,
    pointM: point,
    tangent,
    radial,
    planeNormal: geometry.planeNormal,
    axialN: cleanZero(dot(internalForce, tangent)),
    inPlaneBendingMomentNm: cleanZero(dot(moment, geometry.planeNormal)),
    outOfPlaneBendingMomentNm: cleanZero(dot(moment, radial)),
    torsionNm: cleanZero(dot(moment, tangent)),
  });
}

function zeroAction(thetaRad, geometry) {
  const c = Math.cos(thetaRad);
  const s = Math.sin(thetaRad);
  const radial = add(
    scale(geometry.radialStartUnit, c),
    scale(geometry.tangentStart, s),
  );
  const tangent = add(
    scale(geometry.radialStartUnit, -s),
    scale(geometry.tangentStart, c),
  );
  return deepFreeze({
    thetaRad,
    pointM: addPointVector(geometry.centerPointM, scale(radial, geometry.radiusM)),
    tangent,
    radial,
    planeNormal: geometry.planeNormal,
    axialN: 0,
    inPlaneBendingMomentNm: 0,
    outOfPlaneBendingMomentNm: 0,
    torsionNm: 0,
  });
}

function integrateTerms(geometry, properties, authority, caseA, caseB, order) {
  const rule = gaussLegendreRule(order);
  const half = geometry.includedAngleRad / 2;
  const midpoint = half;
  const terms = zeroTerms();
  for (let index = 0; index < rule.nodes.length; index += 1) {
    const theta = midpoint + half * rule.nodes[index];
    const weightDs = rule.weights[index] * half * geometry.radiusM;
    const a = actionAtTheta(geometry, caseA, theta);
    const b = actionAtTheta(geometry, caseB, theta);
    terms.axial += weightDs
      * a.axialN * b.axialN
      / (properties.elasticModulusPa * properties.areaM2);
    terms.inPlaneBending += weightDs
      * authority.inPlaneFlexibilityFactor
      * a.inPlaneBendingMomentNm * b.inPlaneBendingMomentNm
      / (properties.elasticModulusPa * properties.secondMomentZM4);
    terms.outOfPlaneBending += weightDs
      * authority.outOfPlaneFlexibilityFactor
      * a.outOfPlaneBendingMomentNm * b.outOfPlaneBendingMomentNm
      / (properties.elasticModulusPa * properties.secondMomentYM4);
    terms.torsion += weightDs
      * authority.torsionalFlexibilityFactor
      * a.torsionNm * b.torsionNm
      / (properties.shearModulusPa * properties.torsionConstantM4);
  }
  return deepFreeze(terms);
}

function compareTerms(coarse, fine) {
  let maximumScaledResidual = 0;
  const rows = TERM_KEYS.map((key) => {
    const absoluteResidual = Math.abs(fine[key] - coarse[key]);
    const scaleValue = Math.max(Math.abs(fine[key]), Math.abs(coarse[key]));
    const limit = EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.quadratureAbsoluteTolerance
      + EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.quadratureRelativeTolerance * scaleValue;
    const scaledResidual = limit > 0 ? absoluteResidual / limit : absoluteResidual;
    maximumScaledResidual = Math.max(maximumScaledResidual, scaledResidual);
    return deepFreeze({ key, coarse: coarse[key], fine: fine[key], absoluteResidual, limit, satisfied: absoluteResidual <= limit });
  });
  return deepFreeze({
    coarseOrder: EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.coarseQuadratureOrder,
    fineOrder: EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.fineQuadratureOrder,
    maximumScaledResidual,
    satisfied: rows.every((row) => row.satisfied),
    rows,
  });
}

function gaussLegendreRule(order) {
  if (!Number.isInteger(order) || order < 2) throw new TypeError('Gauss-Legendre order must be an integer >= 2.');
  const nodes = new Array(order);
  const weights = new Array(order);
  const half = Math.floor((order + 1) / 2);
  for (let i = 0; i < half; i += 1) {
    let z = Math.cos(Math.PI * (i + 0.75) / (order + 0.5));
    let converged = false;
    for (let iteration = 0; iteration < EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.maximumNewtonIterations; iteration += 1) {
      const evaluation = legendreWithDerivative(order, z);
      const next = z - evaluation.p / evaluation.dp;
      if (Math.abs(next - z) <= EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.newtonTolerance) {
        z = next;
        converged = true;
        break;
      }
      z = next;
    }
    if (!converged) throw coded('EMPIRICAL_ELBOW_QUADRATURE_RULE_FAILED', `Gauss-Legendre root ${i} did not converge.`);
    const evaluation = legendreWithDerivative(order, z);
    const weight = 2 / ((1 - z * z) * evaluation.dp * evaluation.dp);
    nodes[i] = -z;
    nodes[order - 1 - i] = z;
    weights[i] = weight;
    weights[order - 1 - i] = weight;
  }
  return { nodes, weights };
}

function legendreWithDerivative(order, x) {
  let p0 = 1;
  let p1 = x;
  if (order === 0) return { p: p0, dp: 0 };
  if (order === 1) return { p: p1, dp: 1 };
  for (let n = 2; n <= order; n += 1) {
    const pn = ((2 * n - 1) * x * p1 - (n - 1) * p0) / n;
    p0 = p1;
    p1 = pn;
  }
  const dp = order * (x * p1 - p0) / (x * x - 1);
  return { p: p1, dp };
}

function zeroTerms() {
  return { axial: 0, inPlaneBending: 0, outOfPlaneBending: 0, torsion: 0 };
}

function requirePoint(value, label) {
  exactKeys(value, ['x', 'y', 'z'], label);
  return deepFreeze({
    x: requireFiniteNumber(value.x, `${label}.x`),
    y: requireFiniteNumber(value.y, `${label}.y`),
    z: requireFiniteNumber(value.z, `${label}.z`),
  });
}

function requireUnitVector(value, label) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain three components.`);
  const vector = value.map((item, index) => requireFiniteNumber(item, `${label}[${index}]`));
  const norm = magnitude(vector);
  if (Math.abs(norm - 1) > EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.unitVectorTolerance) {
    throw coded('EMPIRICAL_ELBOW_UNIT_VECTOR_INVALID', `${label} must be unit length.`);
  }
  return deepFreeze(vector.map(cleanZero));
}

function relativeEqualOrThrow(left, right, tolerance, code, message) {
  const residual = Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right));
  if (residual > tolerance) throw coded(code, `${message} Relative residual ${residual}.`);
}
function requireNonNegative(value, label) {
  const result = requireFiniteNumber(value, label);
  if (result < 0) throw new RangeError(`${label} must be non-negative.`);
  return result;
}
function requireBoolean(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean.`);
  return value;
}
function exactKeys(value, keys, label) {
  requireRecord(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}
function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
}
function subtractPoint(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
function addPointVector(point, vector) { return deepFreeze({ x: point.x + vector[0], y: point.y + vector[1], z: point.z + vector[2] }); }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(v, factor) { return [v[0] * factor, v[1] * factor, v[2] * factor]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function magnitude(v) { return Math.hypot(v[0], v[1], v[2]); }
function normalize(v, label) { const m = magnitude(v); if (!(m > 0)) throw new RangeError(`${label} has zero magnitude.`); return scale(v, 1 / m); }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function cleanZero(value) { return Math.abs(value) <= 1e-15 ? 0 : value; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
