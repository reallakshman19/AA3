import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireFiniteNumber,
  requireNonEmptyString,
  requireNonNegativeNumber,
  requirePositiveNumber,
} from './contracts.js';

const ACTION_KEYS = Object.freeze([
  'axialN',
  'bendingMomentYNm',
  'bendingMomentZNm',
  'torsionNm',
]);

export function integrateLinearEndFieldProduct({ lengthM, fieldA, fieldB }) {
  const L = requirePositiveNumber(lengthM, 'lengthM');
  const a = requireEndField(fieldA, 'fieldA');
  const b = requireEndField(fieldB, 'fieldB');
  return (L / 6) * (
    (2 * a.i * b.i)
    + (a.i * b.j)
    + (a.j * b.i)
    + (2 * a.j * b.j)
  );
}

export function calculatePrismaticVirtualWorkContribution(input) {
  requireRecord(input, 'prismatic virtual-work input');
  const segmentId = requireNonEmptyString(input.segmentId, 'segmentId');
  const lengthM = requirePositiveNumber(input.lengthM, 'lengthM');
  const properties = requireProperties(input.properties);
  const actionA = requireActionField(input.actionA, 'actionA');
  const actionB = requireActionField(input.actionB, 'actionB');

  const axial = integrateLinearEndFieldProduct({
    lengthM,
    fieldA: actionA.axialN,
    fieldB: actionB.axialN,
  }) / (properties.elasticModulusPa * properties.areaM2);
  const bendingY = integrateLinearEndFieldProduct({
    lengthM,
    fieldA: actionA.bendingMomentYNm,
    fieldB: actionB.bendingMomentYNm,
  }) / (properties.elasticModulusPa * properties.secondMomentYM4);
  const bendingZ = integrateLinearEndFieldProduct({
    lengthM,
    fieldA: actionA.bendingMomentZNm,
    fieldB: actionB.bendingMomentZNm,
  }) / (properties.elasticModulusPa * properties.secondMomentZM4);
  const torsion = integrateLinearEndFieldProduct({
    lengthM,
    fieldA: actionA.torsionNm,
    fieldB: actionB.torsionNm,
  }) / (properties.shearModulusPa * properties.torsionConstantM4);
  const total = axial + bendingY + bendingZ + torsion;

  return deepFreeze({
    segmentId,
    lengthM,
    terms: {
      axial,
      bendingY,
      bendingZ,
      torsion,
    },
    total,
    formulaTrace: [
      EMPIRICAL_FORMULA_IDS.virtualWorkAxial,
      EMPIRICAL_FORMULA_IDS.virtualWorkBendingY,
      EMPIRICAL_FORMULA_IDS.virtualWorkBendingZ,
      EMPIRICAL_FORMULA_IDS.virtualWorkTorsion,
    ],
  });
}

export function assembleUnitForceFlexibilityMatrix(input) {
  requireRecord(input, 'unit-force flexibility matrix input');
  const caseIds = requireCaseIds(input.caseIds);
  const segments = requireSegments(input.segments, caseIds);
  const reciprocityTolerance = requireNonNegativeNumber(
    input.reciprocityTolerance ?? 1e-12,
    'reciprocityTolerance',
  );
  const matrix = caseIds.map(() => caseIds.map(() => 0));
  const pairEvidence = [];
  let maximumReciprocityResidual = 0;

  for (let row = 0; row < caseIds.length; row += 1) {
    for (let column = 0; column < caseIds.length; column += 1) {
      const caseI = caseIds[row];
      const caseJ = caseIds[column];
      const contributions = segments.map((segment) => calculatePrismaticVirtualWorkContribution({
        segmentId: segment.segmentId,
        lengthM: segment.lengthM,
        properties: segment.properties,
        actionA: segment.actionByCaseId[caseI],
        actionB: segment.actionByCaseId[caseJ],
      }));
      const value = contributions.reduce((sum, contribution) => sum + contribution.total, 0);
      matrix[row][column] = value;
      pairEvidence.push(deepFreeze({
        rowCaseId: caseI,
        columnCaseId: caseJ,
        value,
        segmentContributions: contributions,
      }));
    }
  }

  for (let row = 0; row < caseIds.length; row += 1) {
    for (let column = row + 1; column < caseIds.length; column += 1) {
      maximumReciprocityResidual = Math.max(
        maximumReciprocityResidual,
        Math.abs(matrix[row][column] - matrix[column][row]),
      );
    }
  }
  if (maximumReciprocityResidual > reciprocityTolerance) {
    throw new RangeError(
      `Unit-force flexibility matrix violates reciprocity: ${maximumReciprocityResidual} > ${reciprocityTolerance}.`,
    );
  }

  return deepFreeze({
    caseIds,
    unitConvention: 'UNIT_TRANSLATIONAL_FORCE_CASES_SI',
    coefficientUnit: 'm/N',
    matrix,
    reciprocity: {
      maximumResidual: maximumReciprocityResidual,
      tolerance: reciprocityTolerance,
      satisfied: true,
    },
    pairEvidence,
    formulaTrace: [EMPIRICAL_FORMULA_IDS.flexibilityMatrixAssembly],
  });
}

function requireProperties(value) {
  exactKeys(value, [
    'elasticModulusPa',
    'shearModulusPa',
    'areaM2',
    'secondMomentYM4',
    'secondMomentZM4',
    'torsionConstantM4',
  ], 'properties');
  return deepFreeze({
    elasticModulusPa: requirePositiveNumber(value.elasticModulusPa, 'properties.elasticModulusPa'),
    shearModulusPa: requirePositiveNumber(value.shearModulusPa, 'properties.shearModulusPa'),
    areaM2: requirePositiveNumber(value.areaM2, 'properties.areaM2'),
    secondMomentYM4: requirePositiveNumber(value.secondMomentYM4, 'properties.secondMomentYM4'),
    secondMomentZM4: requirePositiveNumber(value.secondMomentZM4, 'properties.secondMomentZM4'),
    torsionConstantM4: requirePositiveNumber(value.torsionConstantM4, 'properties.torsionConstantM4'),
  });
}

function requireActionField(value, label) {
  exactKeys(value, ACTION_KEYS, label);
  return deepFreeze(Object.fromEntries(ACTION_KEYS.map((key) => [
    key,
    requireEndField(value[key], `${label}.${key}`),
  ])));
}

function requireEndField(value, label) {
  exactKeys(value, ['i', 'j'], label);
  return deepFreeze({
    i: requireFiniteNumber(value.i, `${label}.i`),
    j: requireFiniteNumber(value.j, `${label}.j`),
  });
}

function requireCaseIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('caseIds must be a non-empty array.');
  }
  const caseIds = value.map((caseId, index) => requireNonEmptyString(caseId, `caseIds[${index}]`));
  if (new Set(caseIds).size !== caseIds.length) {
    throw new TypeError('caseIds must be unique.');
  }
  return deepFreeze([...caseIds]);
}

function requireSegments(value, caseIds) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('segments must be a non-empty array.');
  }
  return deepFreeze(value.map((segment, index) => {
    requireRecord(segment, `segments[${index}]`);
    const segmentId = requireNonEmptyString(segment.segmentId, `segments[${index}].segmentId`);
    const lengthM = requirePositiveNumber(segment.lengthM, `segments[${index}].lengthM`);
    const properties = requireProperties(segment.properties);
    requireRecord(segment.actionByCaseId, `segments[${index}].actionByCaseId`);
    const actualCaseIds = Object.keys(segment.actionByCaseId).sort();
    const expectedCaseIds = [...caseIds].sort();
    if (JSON.stringify(actualCaseIds) !== JSON.stringify(expectedCaseIds)) {
      throw new TypeError(`segments[${index}].actionByCaseId must contain exactly the declared caseIds.`);
    }
    const actionByCaseId = Object.fromEntries(caseIds.map((caseId) => [
      caseId,
      requireActionField(
        segment.actionByCaseId[caseId],
        `segments[${index}].actionByCaseId.${caseId}`,
      ),
    ]));
    return deepFreeze({ segmentId, lengthM, properties, actionByCaseId });
  }));
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}
