import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireFiniteNumber,
  requireNonEmptyString,
  requireNonNegativeNumber,
  requirePositiveNumber,
} from './contracts.js';
import { assembleUnitForceFlexibilityMatrix } from './flexibility.js';
import { solveScaledDenseSystem } from './linear-system.js';
import { buildRootedTreeUnitForceActions } from './rooted-tree-unit-load.js';

export const EMPIRICAL_RESTRAINT_COMPATIBILITY_SCHEMA =
  'empirical-linear-restraint-compatibility/v1';
export const EMPIRICAL_ROOTED_TREE_COMPATIBILITY_SCHEMA =
  'empirical-rooted-tree-restraint-compatibility/v1';

const DEFAULT_OPTIONS = Object.freeze({
  reciprocityRelativeTolerance: 1e-10,
  reciprocityAbsoluteTolerance: 1e-15,
  positiveDefiniteToleranceMultiplier: 100,
  maximumScaledResidual: 1e-12,
  maximumCompatibilityResidualM: 1e-10,
  maximumEnergyRelativeResidual: 1e-10,
  pivotMultiplier: 100,
  minimumReciprocalCondition: 1e-14,
  flexibilityAssemblyReciprocityTolerance: 1e-15,
});
const OPTION_KEYS = Object.freeze(Object.keys(DEFAULT_OPTIONS));
const AXISYMMETRIC_RELATIVE_TOLERANCE = 1e-10;

export function solveLinearRestraintCompatibility(input) {
  requireRecord(input, 'linear restraint compatibility input');
  exactKeys(input, ['flexibilityMatrixMPerN', 'coordinates', 'options'], 'linear restraint compatibility input');
  const coordinates = requireCompatibilityCoordinates(input.coordinates);
  const matrix = requireSquareMatrix(
    input.flexibilityMatrixMPerN,
    coordinates.length,
    'flexibilityMatrixMPerN',
  );
  const options = requireOptions(input.options);
  const reciprocity = inspectSymmetry(matrix, options);
  if (!reciprocity.satisfied) {
    throw new RangeError(
      `Flexibility matrix violates reciprocity: ${reciprocity.maximumResidual} > ${reciprocity.tolerance}.`,
    );
  }
  const structuralPositiveDefinite = inspectPositiveDefinite(
    matrix,
    options.positiveDefiniteToleranceMultiplier,
    'flexibilityMatrixMPerN',
  );
  const supportFlexibility = coordinates.map((coordinate) => (
    coordinate.supportStiffnessNPerM === null ? 0 : 1 / coordinate.supportStiffnessNPerM
  ));
  const systemMatrix = matrix.map((row, rowIndex) => row.map((value, columnIndex) => (
    value + (rowIndex === columnIndex ? supportFlexibility[rowIndex] : 0)
  )));
  const systemPositiveDefinite = inspectPositiveDefinite(
    systemMatrix,
    options.positiveDefiniteToleranceMultiplier,
    'compatibilitySystemMatrixMPerN',
  );
  const rhs = coordinates.map((coordinate) => (
    coordinate.targetDisplacementM - coordinate.referenceDisplacementM
  ));
  const numerical = solveScaledDenseSystem(systemMatrix, rhs, {
    pivotMultiplier: options.pivotMultiplier,
    minimumReciprocalCondition: options.minimumReciprocalCondition,
  });
  if (numerical.scaledResidual > options.maximumScaledResidual) {
    throw new RangeError(
      `Compatibility solve scaled residual ${numerical.scaledResidual} exceeds ${options.maximumScaledResidual}.`,
    );
  }
  const reactionsN = numerical.solution;
  const pipeDisplacementM = coordinates.map((coordinate, rowIndex) => (
    coordinate.referenceDisplacementM
      + matrix[rowIndex].reduce((sum, value, columnIndex) => (
        sum + (value * reactionsN[columnIndex])
      ), 0)
  ));
  const supportDeformationM = supportFlexibility.map((value, index) => value * reactionsN[index]);
  const compatibilityResidualM = coordinates.map((coordinate, index) => (
    pipeDisplacementM[index]
      + supportDeformationM[index]
      - coordinate.targetDisplacementM
  ));
  const maximumCompatibilityResidualM = maxAbs(compatibilityResidualM);
  if (maximumCompatibilityResidualM > options.maximumCompatibilityResidualM) {
    throw new RangeError(
      `Compatibility residual ${maximumCompatibilityResidualM} m exceeds ${options.maximumCompatibilityResidualM} m.`,
    );
  }
  const structuralStrainEnergyJ = 0.5 * quadraticForm(matrix, reactionsN);
  const supportStrainEnergyJ = 0.5 * reactionsN.reduce((sum, reaction, index) => (
    sum + (supportFlexibility[index] * reaction * reaction)
  ), 0);
  const generalizedWorkJ = 0.5 * dot(reactionsN, rhs);
  const totalStrainEnergyJ = structuralStrainEnergyJ + supportStrainEnergyJ;
  const energyResidualJ = totalStrainEnergyJ - generalizedWorkJ;
  const energyScaleJ = Math.max(
    Math.abs(totalStrainEnergyJ),
    Math.abs(generalizedWorkJ),
  );
  const energyRelativeResidual = energyScaleJ === 0 ? 0 : Math.abs(energyResidualJ) / energyScaleJ;
  if (energyRelativeResidual > options.maximumEnergyRelativeResidual) {
    throw new RangeError(
      `Compatibility energy residual ${energyRelativeResidual} exceeds ${options.maximumEnergyRelativeResidual}.`,
    );
  }
  const rows = coordinates.map((coordinate, index) => deepFreeze({
    coordinateId: coordinate.coordinateId,
    referenceDisplacementM: coordinate.referenceDisplacementM,
    targetDisplacementM: coordinate.targetDisplacementM,
    supportStiffnessNPerM: coordinate.supportStiffnessNPerM,
    supportFlexibilityMPerN: supportFlexibility[index],
    reactionN: reactionsN[index],
    pipeDisplacementM: pipeDisplacementM[index],
    supportDeformationM: supportDeformationM[index],
    compatibilityResidualM: compatibilityResidualM[index],
  }));
  return deepFreeze({
    schema: EMPIRICAL_RESTRAINT_COMPATIBILITY_SCHEMA,
    coordinateIds: coordinates.map((coordinate) => coordinate.coordinateId),
    reactionConvention: 'REACTION_ON_PIPE_POSITIVE_ALONG_COORDINATE_DIRECTION',
    compatibilityEquation: '(F+S)R=TARGET_MINUS_REFERENCE',
    coefficientUnit: 'm/N',
    displacementUnit: 'm',
    reactionUnit: 'N',
    flexibilityMatrixMPerN: matrix,
    supportFlexibilityMPerN: supportFlexibility,
    systemMatrixMPerN: systemMatrix,
    rhsDisplacementM: rhs,
    rows,
    numerical,
    reciprocity,
    positiveDefinite: {
      structuralFlexibility: structuralPositiveDefinite,
      compatibilitySystem: systemPositiveDefinite,
    },
    compatibility: {
      maximumResidualM: maximumCompatibilityResidualM,
      toleranceM: options.maximumCompatibilityResidualM,
      satisfied: true,
    },
    energy: {
      structuralStrainEnergyJ,
      supportStrainEnergyJ,
      totalStrainEnergyJ,
      generalizedWorkJ,
      residualJ: energyResidualJ,
      relativeResidual: energyRelativeResidual,
      tolerance: options.maximumEnergyRelativeResidual,
      satisfied: true,
    },
    options,
    formulaTrace: [
      EMPIRICAL_FORMULA_IDS.restraintCompatibilityForceMethod,
      EMPIRICAL_FORMULA_IDS.linearSupportFlexibility,
      EMPIRICAL_FORMULA_IDS.restraintCompatibilityRecovery,
      EMPIRICAL_FORMULA_IDS.restraintCompatibilityEnergy,
    ],
  });
}

export function solveRootedTreeRestraintCompatibility(input) {
  requireRecord(input, 'rooted-tree restraint compatibility input');
  exactKeys(
    input,
    ['nodes', 'segments', 'rootNodeId', 'coordinates', 'options'],
    'rooted-tree restraint compatibility input',
  );
  const rootNodeId = requireNonEmptyString(input.rootNodeId, 'rootNodeId');
  const coordinates = requireRootedTreeCoordinates(input.coordinates);
  const options = requireOptions(input.options);
  const segments = requirePropertySegments(input.segments);
  const propertiesBySegmentId = new Map(segments.map((segment) => [segment.segmentId, segment.properties]));
  const actions = buildRootedTreeUnitForceActions({
    nodes: input.nodes,
    segments: segments.map((segment) => ({
      segmentId: segment.segmentId,
      nodeAId: segment.nodeAId,
      nodeBId: segment.nodeBId,
    })),
    rootNodeId,
    cases: coordinates.map((coordinate) => ({
      caseId: coordinate.coordinateId,
      nodeId: coordinate.nodeId,
      direction: coordinate.direction,
    })),
  });
  const coordinateById = new Map(coordinates.map((coordinate) => [coordinate.coordinateId, coordinate]));
  const orderedCoordinates = actions.caseIds.map((coordinateId) => {
    const coordinate = coordinateById.get(coordinateId);
    if (!coordinate) throw new TypeError(`Missing compatibility coordinate ${coordinateId}.`);
    return coordinate;
  });
  const flexibilitySegments = actions.segments.map((segment) => ({
    segmentId: segment.segmentId,
    lengthM: segment.lengthM,
    properties: propertiesBySegmentId.get(segment.segmentId),
    actionByCaseId: segment.actionByCaseId,
  }));
  const flexibility = assembleUnitForceFlexibilityMatrix({
    caseIds: actions.caseIds,
    segments: flexibilitySegments,
    reciprocityTolerance: options.flexibilityAssemblyReciprocityTolerance,
  });
  const compatibility = solveLinearRestraintCompatibility({
    flexibilityMatrixMPerN: flexibility.matrix,
    coordinates: orderedCoordinates.map((coordinate) => ({
      coordinateId: coordinate.coordinateId,
      referenceDisplacementM: coordinate.referenceDisplacementM,
      targetDisplacementM: coordinate.targetDisplacementM,
      supportStiffnessNPerM: coordinate.supportStiffnessNPerM,
    })),
    options,
  });
  return deepFreeze({
    schema: EMPIRICAL_ROOTED_TREE_COMPATIBILITY_SCHEMA,
    rootNodeId: actions.rootNodeId,
    coordinateIds: actions.caseIds,
    actions,
    flexibility,
    compatibility,
    evidence: {
      referenceStructure: 'CONNECTED_ACYCLIC_ROOTED_STRAIGHT_PIPE_TREE',
      flexibilityAuthority: 'UNIT_LOAD_VIRTUAL_WORK',
      compatibilityAuthority: 'CLASSICAL_FORCE_METHOD_LINEAR_COMPATIBILITY',
      callerInternalActionsConsumed: false,
      empiricalResponseMultipliersConsumed: false,
      bilateralTranslationalCoordinatesOnly: true,
      contactOrGapSolved: false,
      supportFlexibilityBasis: 'EXPLICIT_LINEAR_STIFFNESS_OR_RIGID',
      sectionOrientationAuthority: 'AXISYMMETRIC_SECTION_ONLY_IN_THIS_ORCHESTRATOR',
      referenceDisplacementAuthority: 'UPSTREAM_REFERENCE_STRUCTURE_RESULT_NOT_ESTABLISHED_BY_THIS_PR',
    },
  });
}

function requireCompatibilityCoordinates(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('coordinates must be a non-empty array.');
  }
  const rows = value.map((coordinate, index) => {
    exactKeys(
      coordinate,
      ['coordinateId', 'referenceDisplacementM', 'targetDisplacementM', 'supportStiffnessNPerM'],
      `coordinates[${index}]`,
    );
    const stiffness = coordinate.supportStiffnessNPerM === null
      ? null
      : requirePositiveNumber(
        coordinate.supportStiffnessNPerM,
        `coordinates[${index}].supportStiffnessNPerM`,
      );
    return deepFreeze({
      coordinateId: requireNonEmptyString(coordinate.coordinateId, `coordinates[${index}].coordinateId`),
      referenceDisplacementM: requireFiniteNumber(
        coordinate.referenceDisplacementM,
        `coordinates[${index}].referenceDisplacementM`,
      ),
      targetDisplacementM: requireFiniteNumber(
        coordinate.targetDisplacementM,
        `coordinates[${index}].targetDisplacementM`,
      ),
      supportStiffnessNPerM: stiffness,
    });
  });
  requireUniqueIds(rows.map((row) => row.coordinateId), 'coordinate ids');
  return deepFreeze(rows);
}

function requireRootedTreeCoordinates(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('coordinates must be a non-empty array.');
  }
  const rows = value.map((coordinate, index) => {
    exactKeys(
      coordinate,
      [
        'coordinateId',
        'nodeId',
        'direction',
        'referenceDisplacementM',
        'targetDisplacementM',
        'supportStiffnessNPerM',
      ],
      `coordinates[${index}]`,
    );
    const stiffness = coordinate.supportStiffnessNPerM === null
      ? null
      : requirePositiveNumber(
        coordinate.supportStiffnessNPerM,
        `coordinates[${index}].supportStiffnessNPerM`,
      );
    return deepFreeze({
      coordinateId: requireNonEmptyString(coordinate.coordinateId, `coordinates[${index}].coordinateId`),
      nodeId: requireNonEmptyString(coordinate.nodeId, `coordinates[${index}].nodeId`),
      direction: requireVector3(coordinate.direction, `coordinates[${index}].direction`),
      referenceDisplacementM: requireFiniteNumber(
        coordinate.referenceDisplacementM,
        `coordinates[${index}].referenceDisplacementM`,
      ),
      targetDisplacementM: requireFiniteNumber(
        coordinate.targetDisplacementM,
        `coordinates[${index}].targetDisplacementM`,
      ),
      supportStiffnessNPerM: stiffness,
    });
  }).sort((left, right) => left.coordinateId.localeCompare(right.coordinateId));
  requireUniqueIds(rows.map((row) => row.coordinateId), 'coordinate ids');
  return deepFreeze(rows);
}

function requirePropertySegments(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('segments must be a non-empty array.');
  }
  const rows = value.map((segment, index) => {
    exactKeys(segment, ['segmentId', 'nodeAId', 'nodeBId', 'properties'], `segments[${index}]`);
    const properties = requireAxisymmetricProperties(segment.properties, `segments[${index}].properties`);
    return deepFreeze({
      segmentId: requireNonEmptyString(segment.segmentId, `segments[${index}].segmentId`),
      nodeAId: requireNonEmptyString(segment.nodeAId, `segments[${index}].nodeAId`),
      nodeBId: requireNonEmptyString(segment.nodeBId, `segments[${index}].nodeBId`),
      properties,
    });
  });
  requireUniqueIds(rows.map((row) => row.segmentId), 'segment ids');
  return deepFreeze(rows.sort((left, right) => left.segmentId.localeCompare(right.segmentId)));
}

function requireAxisymmetricProperties(value, label) {
  requireRecord(value, label);
  exactKeys(
    value,
    [
      'elasticModulusPa',
      'shearModulusPa',
      'areaM2',
      'secondMomentYM4',
      'secondMomentZM4',
      'torsionConstantM4',
    ],
    label,
  );
  const properties = {
    elasticModulusPa: requirePositiveNumber(value.elasticModulusPa, `${label}.elasticModulusPa`),
    shearModulusPa: requirePositiveNumber(value.shearModulusPa, `${label}.shearModulusPa`),
    areaM2: requirePositiveNumber(value.areaM2, `${label}.areaM2`),
    secondMomentYM4: requirePositiveNumber(value.secondMomentYM4, `${label}.secondMomentYM4`),
    secondMomentZM4: requirePositiveNumber(value.secondMomentZM4, `${label}.secondMomentZM4`),
    torsionConstantM4: requirePositiveNumber(value.torsionConstantM4, `${label}.torsionConstantM4`),
  };
  const secondMomentScale = Math.max(properties.secondMomentYM4, properties.secondMomentZM4);
  const relativeDifference = Math.abs(properties.secondMomentYM4 - properties.secondMomentZM4) / secondMomentScale;
  if (relativeDifference > AXISYMMETRIC_RELATIVE_TOLERANCE) {
    throw new RangeError(
      `${label} must be axisymmetric in this orchestrator: Iy/Iz relative difference ${relativeDifference}.`,
    );
  }
  return deepFreeze(properties);
}

function requireOptions(value) {
  if (value === undefined || value === null) value = {};
  requireRecord(value, 'options');
  const unexpected = Object.keys(value).filter((key) => !OPTION_KEYS.includes(key));
  if (unexpected.length > 0) throw new TypeError(`options contains unexpected keys: ${unexpected.sort().join(', ')}.`);
  const options = {
    reciprocityRelativeTolerance: requireNonNegativeNumber(
      value.reciprocityRelativeTolerance ?? DEFAULT_OPTIONS.reciprocityRelativeTolerance,
      'options.reciprocityRelativeTolerance',
    ),
    reciprocityAbsoluteTolerance: requireNonNegativeNumber(
      value.reciprocityAbsoluteTolerance ?? DEFAULT_OPTIONS.reciprocityAbsoluteTolerance,
      'options.reciprocityAbsoluteTolerance',
    ),
    positiveDefiniteToleranceMultiplier: requirePositiveNumber(
      value.positiveDefiniteToleranceMultiplier ?? DEFAULT_OPTIONS.positiveDefiniteToleranceMultiplier,
      'options.positiveDefiniteToleranceMultiplier',
    ),
    maximumScaledResidual: requireNonNegativeNumber(
      value.maximumScaledResidual ?? DEFAULT_OPTIONS.maximumScaledResidual,
      'options.maximumScaledResidual',
    ),
    maximumCompatibilityResidualM: requireNonNegativeNumber(
      value.maximumCompatibilityResidualM ?? DEFAULT_OPTIONS.maximumCompatibilityResidualM,
      'options.maximumCompatibilityResidualM',
    ),
    maximumEnergyRelativeResidual: requireNonNegativeNumber(
      value.maximumEnergyRelativeResidual ?? DEFAULT_OPTIONS.maximumEnergyRelativeResidual,
      'options.maximumEnergyRelativeResidual',
    ),
    pivotMultiplier: requirePositiveNumber(
      value.pivotMultiplier ?? DEFAULT_OPTIONS.pivotMultiplier,
      'options.pivotMultiplier',
    ),
    minimumReciprocalCondition: requireNonNegativeNumber(
      value.minimumReciprocalCondition ?? DEFAULT_OPTIONS.minimumReciprocalCondition,
      'options.minimumReciprocalCondition',
    ),
    flexibilityAssemblyReciprocityTolerance: requireNonNegativeNumber(
      value.flexibilityAssemblyReciprocityTolerance ?? DEFAULT_OPTIONS.flexibilityAssemblyReciprocityTolerance,
      'options.flexibilityAssemblyReciprocityTolerance',
    ),
  };
  return deepFreeze(options);
}

function inspectSymmetry(matrix, options) {
  const scale = maxAbs(matrix.flat());
  let maximumResidual = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = row + 1; column < matrix.length; column += 1) {
      maximumResidual = Math.max(maximumResidual, Math.abs(matrix[row][column] - matrix[column][row]));
    }
  }
  const tolerance = options.reciprocityAbsoluteTolerance
    + (options.reciprocityRelativeTolerance * scale);
  return deepFreeze({ maximumResidual, tolerance, scale, satisfied: maximumResidual <= tolerance });
}

function inspectPositiveDefinite(matrix, toleranceMultiplier, label) {
  const n = matrix.length;
  const scale = maxAbs(matrix.flat());
  if (!(scale > 0)) throw new RangeError(`${label} has zero magnitude.`);
  const tolerance = toleranceMultiplier * Number.EPSILON * scale;
  const lower = Array.from({ length: n }, () => Array(n).fill(0));
  let minimumPivot = Infinity;
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row][column];
      for (let k = 0; k < column; k += 1) value -= lower[row][k] * lower[column][k];
      if (row === column) {
        if (!(value > tolerance)) {
          throw new RangeError(`${label} is not positive definite at pivot ${row}: ${value} <= ${tolerance}.`);
        }
        lower[row][column] = Math.sqrt(value);
        minimumPivot = Math.min(minimumPivot, value);
      } else {
        lower[row][column] = value / lower[column][column];
      }
    }
  }
  return deepFreeze({ satisfied: true, tolerance, matrixScale: scale, minimumCholeskyPivot: minimumPivot });
}

function requireSquareMatrix(value, order, label) {
  if (!Array.isArray(value) || value.length !== order) {
    throw new TypeError(`${label} must have order ${order}.`);
  }
  return deepFreeze(value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== order) {
      throw new TypeError(`${label}[${rowIndex}] must have length ${order}.`);
    }
    return row.map((item, columnIndex) => requireFiniteNumber(
      item,
      `${label}[${rowIndex}][${columnIndex}]`,
    ));
  }));
}

function quadraticForm(matrix, vector) {
  return vector.reduce((sum, left, row) => (
    sum + (left * matrix[row].reduce((rowSum, value, column) => rowSum + (value * vector[column]), 0))
  ), 0);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + (value * right[index]), 0);
}

function maxAbs(values) {
  return values.length === 0 ? 0 : Math.max(...values.map((value) => Math.abs(value)));
}

function requireVector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`${label} must contain exactly three components.`);
  }
  return deepFreeze(value.map((item, index) => requireFiniteNumber(item, `${label}[${index}]`)));
}

function requireUniqueIds(ids, label) {
  if (new Set(ids).size !== ids.length) throw new TypeError(`${label} must be unique.`);
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
