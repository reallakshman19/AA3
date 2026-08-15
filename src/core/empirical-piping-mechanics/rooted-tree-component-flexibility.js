import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireFiniteNumber,
  requireNonEmptyString,
} from './contracts.js';
import {
  calculatePrismaticVirtualWorkContribution,
} from './flexibility.js';
import {
  buildDeterministicMemberAxes,
} from './rooted-tree-unit-load.js';
import {
  EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY,
  buildCircularElbowThermalEndTranslation,
  calculateCircularElbowVirtualWorkContribution,
  normalizeCircularElbowGeometry,
  requireEmpiricalElbowFlexibilityAuthority,
  reverseCircularElbowGeometry,
} from './circular-elbow-flexibility.js';
import {
  THERMAL_EXPANSION_COEFFICIENT_BASES,
} from './thermal-reference.js';
import {
  solveLinearRestraintCompatibility,
} from './restraint-compatibility.js';

export const EMPIRICAL_ROOTED_COMPONENT_FLEXIBILITY_SCHEMA =
  'empirical-rooted-component-flexibility/v1';
export const EMPIRICAL_ROOTED_COMPONENT_THERMAL_COMPATIBILITY_SCHEMA =
  'empirical-rooted-component-thermal-compatibility/v1';

const UNIT_VECTOR_TOLERANCE = 1e-12;
const ZERO_TOLERANCE = 1e-14;
const COMPONENT_KEYS = Object.freeze([
  'componentId',
  'kind',
  'nodeAId',
  'nodeBId',
  'properties',
  'thermal',
  'geometry',
  'flexibilityAuthority',
]);
const COORDINATE_KEYS = Object.freeze([
  'coordinateId',
  'nodeId',
  'direction',
  'targetDisplacementM',
  'supportStiffnessNPerM',
]);
const PROPERTY_KEYS = Object.freeze([
  'elasticModulusPa',
  'shearModulusPa',
  'areaM2',
  'secondMomentYM4',
  'secondMomentZM4',
  'torsionConstantM4',
]);

export function assembleRootedTreeComponentFlexibility(input) {
  requireRecord(input, 'rooted component flexibility input');
  exactKeys(
    input,
    ['nodes', 'components', 'rootNodeId', 'cases'],
    'rooted component flexibility input',
  );
  const nodes = requireNodes(input.nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const components = requireComponents(input.components, nodeById, false);
  const rootNodeId = requireNonEmptyString(input.rootNodeId, 'rootNodeId');
  if (!nodeById.has(rootNodeId)) throw new TypeError(`rootNodeId ${rootNodeId} does not exist.`);
  const cases = requireCases(input.cases, nodeById, rootNodeId);
  const oriented = orientTree(nodes, components, rootNodeId);
  const pathByCaseId = Object.fromEntries(cases.map((loadCase) => [
    loadCase.caseId,
    pathComponentIds(loadCase.nodeId, rootNodeId, oriented.parentByNodeId),
  ]));
  const componentEvidence = oriented.components.map((component) => (
    component.kind === 'STRAIGHT'
      ? prepareStraightComponent(component, nodeById)
      : prepareElbowComponent(component, nodeById)
  ));
  const caseIds = cases.map((row) => row.caseId);
  const matrix = caseIds.map(() => caseIds.map(() => 0));
  const pairEvidence = [];

  for (let row = 0; row < caseIds.length; row += 1) {
    for (let column = 0; column < caseIds.length; column += 1) {
      const caseA = cases[row];
      const caseB = cases[column];
      const contributions = componentEvidence.map((component) => {
        const activeA = pathByCaseId[caseA.caseId].has(component.componentId);
        const activeB = pathByCaseId[caseB.caseId].has(component.componentId);
        return component.kind === 'STRAIGHT'
          ? straightPairContribution(component, caseA, caseB, activeA, activeB, nodeById)
          : elbowPairContribution(component, caseA, caseB, activeA, activeB, nodeById);
      });
      const value = contributions.reduce((sum, contribution) => sum + contribution.total, 0);
      matrix[row][column] = value;
      pairEvidence.push(deepFreeze({
        rowCaseId: caseA.caseId,
        columnCaseId: caseB.caseId,
        value,
        componentContributions: contributions,
      }));
    }
  }

  let maximumReciprocityResidual = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = row + 1; column < matrix.length; column += 1) {
      maximumReciprocityResidual = Math.max(
        maximumReciprocityResidual,
        Math.abs(matrix[row][column] - matrix[column][row]),
      );
    }
  }

  return deepFreeze({
    schema: EMPIRICAL_ROOTED_COMPONENT_FLEXIBILITY_SCHEMA,
    rootNodeId,
    caseIds,
    matrixMPerN: matrix,
    coefficientUnit: 'm/N',
    components: componentEvidence,
    pairEvidence,
    reciprocity: {
      maximumResidual: maximumReciprocityResidual,
      construction: 'PAIRWISE_IDENTICAL_VIRTUAL_WORK_INTEGRALS',
    },
    evidence: {
      topologyClass: 'CONNECTED_ACYCLIC_ROOTED_COMPONENT_TREE',
      componentKinds: [...new Set(componentEvidence.map((row) => row.kind))].sort(),
      unitLoadAuthority: 'STATIC_CUT_EQUILIBRIUM_AND_MOMENT_TRANSPORT',
      straightMemberAuthority: 'EXACT_PRISMATIC_VIRTUAL_WORK',
      elbowAuthority: 'CONTINUOUS_CIRCULAR_ARC_VIRTUAL_WORK_WITH_COMPONENT_LOCAL_B31J_K',
      globalNodalStiffnessMatrixAssembled: false,
      finiteElementRouteUsed: false,
      empiricalResponseMultiplierConsumed: false,
      formulaTrace: [EMPIRICAL_FORMULA_IDS.componentFlexibilityMatrixAssembly],
    },
  });
}

export function solveRootedTreeComponentThermalCompatibility(input) {
  requireRecord(input, 'rooted component thermal compatibility input');
  exactKeys(
    input,
    ['nodes', 'components', 'rootNodeId', 'coordinates', 'options'],
    'rooted component thermal compatibility input',
  );
  const nodes = requireNodes(input.nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const components = requireComponents(input.components, nodeById, true);
  const rootNodeId = requireNonEmptyString(input.rootNodeId, 'rootNodeId');
  if (!nodeById.has(rootNodeId)) throw new TypeError(`rootNodeId ${rootNodeId} does not exist.`);
  const coordinates = requireCoordinates(input.coordinates, nodeById, rootNodeId);
  const cases = coordinates.map((coordinate) => ({
    caseId: coordinate.coordinateId,
    nodeId: coordinate.nodeId,
    direction: coordinate.direction,
  }));
  const flexibility = assembleRootedTreeComponentFlexibility({
    nodes,
    components,
    rootNodeId,
    cases,
  });
  const thermalReference = buildComponentThermalReference({
    nodes,
    components,
    rootNodeId,
    coordinates,
  });
  const referenceByCoordinate = new Map(
    thermalReference.rows.map((row) => [row.coordinateId, row.referenceDisplacementM]),
  );
  const compatibility = solveLinearRestraintCompatibility({
    flexibilityMatrixMPerN: flexibility.matrixMPerN,
    coordinates: coordinates.map((coordinate) => ({
      coordinateId: coordinate.coordinateId,
      referenceDisplacementM: requiredMapValue(
        referenceByCoordinate,
        coordinate.coordinateId,
        'thermal reference displacement',
      ),
      targetDisplacementM: coordinate.targetDisplacementM,
      supportStiffnessNPerM: coordinate.supportStiffnessNPerM,
    })),
    options: input.options,
  });

  return deepFreeze({
    schema: EMPIRICAL_ROOTED_COMPONENT_THERMAL_COMPATIBILITY_SCHEMA,
    rootNodeId,
    coordinateIds: coordinates.map((row) => row.coordinateId),
    flexibility,
    thermalReference,
    compatibility,
    evidence: {
      solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM',
      componentRoute: 'STRAIGHT_AND_PLANAR_CIRCULAR_ELBOW',
      thermalLoadRepresentation: 'FREE_THERMAL_STRAIN_AND_REFERENCE_DISPLACEMENT',
      elbowThermalKinematics: 'UNIFORM_STRAIN_ENDPOINT_CHORD_IDENTITY',
      directThermalForceInjected: false,
      globalNodalStiffnessMatrixAssembled: false,
      finiteElementRouteUsed: false,
      gapContactOrFrictionSolved: false,
      formulaTrace: [
        EMPIRICAL_FORMULA_IDS.componentFlexibilityMatrixAssembly,
        EMPIRICAL_FORMULA_IDS.circularElbowThermalChordExpansion,
        EMPIRICAL_FORMULA_IDS.thermalReferenceCompatibility,
      ],
    },
  });
}

function buildComponentThermalReference({ nodes, components, rootNodeId, coordinates }) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const oriented = orientTree(nodes, components, rootNodeId);
  const displacementByNodeId = new Map([[rootNodeId, deepFreeze([0, 0, 0])]]);
  const componentEvidence = [];
  for (const component of oriented.discoveryOrder) {
    const parent = requiredMapValue(
      displacementByNodeId,
      component.nodeIId,
      'parent thermal displacement',
    );
    const thermal = component.thermal;
    const deltaTK = thermal.analysisTemperatureC - thermal.referenceTemperatureC;
    const strain = thermal.expansionCoefficientPerK * deltaTK;
    let freeExpansionVectorM;
    let arcLengthExpansionM = null;
    let geometrySemanticHash = null;
    if (component.kind === 'STRAIGHT') {
      freeExpansionVectorM = scale(
        subtractPoint(nodeById.get(component.nodeJId).pointM, nodeById.get(component.nodeIId).pointM),
        strain,
      );
    } else {
      const prepared = prepareElbowComponent(component, nodeById);
      const elbowThermal = buildCircularElbowThermalEndTranslation({
        geometry: prepared.geometry,
        expansionCoefficientPerK: thermal.expansionCoefficientPerK,
        referenceTemperatureC: thermal.referenceTemperatureC,
        analysisTemperatureC: thermal.analysisTemperatureC,
      });
      freeExpansionVectorM = elbowThermal.endTranslationM;
      arcLengthExpansionM = elbowThermal.arcLengthExpansionM;
      geometrySemanticHash = prepared.geometry.semanticHash;
    }
    const child = add(parent, freeExpansionVectorM);
    displacementByNodeId.set(component.nodeJId, deepFreeze(child));
    componentEvidence.push(deepFreeze({
      componentId: component.componentId,
      kind: component.kind,
      nodeIId: component.nodeIId,
      nodeJId: component.nodeJId,
      thermal,
      deltaTK,
      thermalStrain: strain,
      freeExpansionVectorM,
      arcLengthExpansionM,
      geometrySemanticHash,
      accumulatedDisplacementAtJM: child,
    }));
  }
  const rows = coordinates.map((coordinate) => {
    const vector = requiredMapValue(
      displacementByNodeId,
      coordinate.nodeId,
      `thermal displacement at ${coordinate.nodeId}`,
    );
    return deepFreeze({
      coordinateId: coordinate.coordinateId,
      nodeId: coordinate.nodeId,
      direction: coordinate.direction,
      displacementVectorM: vector,
      referenceDisplacementM: dot(vector, coordinate.direction),
    });
  });
  return deepFreeze({
    rootNodeId,
    rows,
    componentEvidence,
    evidence: {
      topologyClass: 'CONNECTED_ACYCLIC_ROOTED_COMPONENT_TREE',
      temperatureField: 'UNIFORM_PER_COMPONENT',
      straightKinematics: 'EPSILON_TIMES_ENDPOINT_CHORD',
      elbowKinematics: 'INTEGRAL_EPSILON_T_DS_EQUALS_EPSILON_TIMES_ENDPOINT_CHORD',
      thermalGradientSolved: false,
      directThermalForceAccepted: false,
    },
  });
}

function prepareStraightComponent(component, nodeById) {
  const pointI = nodeById.get(component.nodeIId).pointM;
  const pointJ = nodeById.get(component.nodeJId).pointM;
  const axes = buildDeterministicMemberAxes(pointI, pointJ);
  return deepFreeze({
    componentId: component.componentId,
    kind: 'STRAIGHT',
    nodeIId: component.nodeIId,
    nodeJId: component.nodeJId,
    pointI,
    pointJ,
    lengthM: axes.lengthM,
    axes,
    properties: component.properties,
    thermal: component.thermal,
  });
}

function prepareElbowComponent(component, nodeById) {
  const pointI = nodeById.get(component.nodeIId).pointM;
  const pointJ = nodeById.get(component.nodeJId).pointM;
  const sourceGeometry = component.geometry?.semanticHash
    ? normalizeCircularElbowGeometry({
      componentId: component.geometry.componentId,
      startPointM: component.geometry.startPointM,
      endPointM: component.geometry.endPointM,
      centerPointM: component.geometry.centerPointM,
      planeNormal: component.geometry.planeNormal,
    })
    : normalizeCircularElbowGeometry(component.geometry);
  if (component.geometry?.semanticHash && sourceGeometry.semanticHash !== component.geometry.semanticHash) {
    throw coded('EMPIRICAL_COMPONENT_ELBOW_GEOMETRY_HASH_MISMATCH', `Elbow ${component.componentId} geometry is stale.`);
  }
  const scaleM = Math.max(sourceGeometry.radiusM, 1);
  const toleranceM = EMPIRICAL_CIRCULAR_ELBOW_NUMERICAL_POLICY.endpointRelativeTolerance * scaleM;
  let geometry;
  if (distance(pointI, sourceGeometry.startPointM) <= toleranceM
      && distance(pointJ, sourceGeometry.endPointM) <= toleranceM) {
    geometry = sourceGeometry;
  } else if (distance(pointI, sourceGeometry.endPointM) <= toleranceM
      && distance(pointJ, sourceGeometry.startPointM) <= toleranceM) {
    geometry = reverseCircularElbowGeometry(sourceGeometry);
  } else {
    throw coded(
      'EMPIRICAL_COMPONENT_ELBOW_NODE_GEOMETRY_MISMATCH',
      `Elbow ${component.componentId} endpoints do not match its rooted mechanical nodes.`,
    );
  }
  return deepFreeze({
    componentId: component.componentId,
    kind: 'CIRCULAR_ELBOW',
    nodeIId: component.nodeIId,
    nodeJId: component.nodeJId,
    pointI,
    pointJ,
    geometry,
    properties: component.properties,
    thermal: component.thermal,
    flexibilityAuthority: component.flexibilityAuthority,
  });
}

function straightPairContribution(component, caseA, caseB, activeA, activeB, nodeById) {
  const actionA = straightAction(component, caseA, activeA, nodeById);
  const actionB = straightAction(component, caseB, activeB, nodeById);
  const contribution = calculatePrismaticVirtualWorkContribution({
    segmentId: component.componentId,
    lengthM: component.lengthM,
    properties: component.properties,
    actionA,
    actionB,
  });
  return deepFreeze({
    componentId: component.componentId,
    kind: component.kind,
    total: contribution.total,
    terms: contribution.terms,
    evidence: contribution,
  });
}

function elbowPairContribution(component, caseA, caseB, activeA, activeB, nodeById) {
  const contribution = calculateCircularElbowVirtualWorkContribution({
    geometry: component.geometry,
    properties: component.properties,
    flexibilityAuthority: component.flexibilityAuthority,
    caseA: {
      caseId: caseA.caseId,
      loadPointM: nodeById.get(caseA.nodeId).pointM,
      direction: caseA.direction,
      active: activeA,
    },
    caseB: {
      caseId: caseB.caseId,
      loadPointM: nodeById.get(caseB.nodeId).pointM,
      direction: caseB.direction,
      active: activeB,
    },
  });
  return deepFreeze({
    componentId: component.componentId,
    kind: component.kind,
    total: contribution.total,
    terms: contribution.terms,
    evidence: contribution,
  });
}

function straightAction(component, loadCase, active, nodeById) {
  if (!active) return zeroStraightAction();
  const loadPoint = nodeById.get(loadCase.nodeId).pointM;
  const direction = loadCase.direction;
  const internalForce = scale(direction, -1);
  const momentI = scale(cross(subtractPoint(loadPoint, component.pointI), direction), -1);
  const momentJ = scale(cross(subtractPoint(loadPoint, component.pointJ), direction), -1);
  return deepFreeze({
    axialN: endField(dot(internalForce, component.axes.x), dot(internalForce, component.axes.x)),
    bendingMomentYNm: endField(dot(momentI, component.axes.y), dot(momentJ, component.axes.y)),
    bendingMomentZNm: endField(dot(momentI, component.axes.z), dot(momentJ, component.axes.z)),
    torsionNm: endField(dot(momentI, component.axes.x), dot(momentJ, component.axes.x)),
  });
}

function orientTree(nodes, components, rootNodeId) {
  if (components.length !== nodes.length - 1) {
    throw new TypeError('Rooted component route must satisfy componentCount = nodeCount - 1.');
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  components.forEach((component) => {
    adjacency.get(component.nodeAId).push({ component, otherNodeId: component.nodeBId });
    adjacency.get(component.nodeBId).push({ component, otherNodeId: component.nodeAId });
  });
  const visited = new Set([rootNodeId]);
  const queue = [rootNodeId];
  const parentByNodeId = new Map([[rootNodeId, null]]);
  const oriented = [];
  const discoveryOrder = [];
  while (queue.length) {
    const nodeIId = queue.shift();
    const rows = [...adjacency.get(nodeIId)]
      .sort((a, b) => a.component.componentId.localeCompare(b.component.componentId));
    for (const row of rows) {
      if (visited.has(row.otherNodeId)) continue;
      visited.add(row.otherNodeId);
      queue.push(row.otherNodeId);
      parentByNodeId.set(row.otherNodeId, {
        parentNodeId: nodeIId,
        componentId: row.component.componentId,
      });
      const entry = deepFreeze({
        ...row.component,
        nodeIId,
        nodeJId: row.otherNodeId,
        pointI: nodeById.get(nodeIId).pointM,
        pointJ: nodeById.get(row.otherNodeId).pointM,
      });
      oriented.push(entry);
      discoveryOrder.push(entry);
    }
  }
  if (visited.size !== nodes.length) throw new TypeError('Rooted component route must be connected.');
  return deepFreeze({
    components: oriented.sort((a, b) => a.componentId.localeCompare(b.componentId)),
    discoveryOrder,
    parentByNodeId,
  });
}

function pathComponentIds(nodeId, rootNodeId, parentByNodeId) {
  const result = new Set();
  let current = nodeId;
  while (current !== rootNodeId) {
    const parent = parentByNodeId.get(current);
    if (!parent) throw new TypeError(`Node ${nodeId} is not connected to root ${rootNodeId}.`);
    result.add(parent.componentId);
    current = parent.parentNodeId;
  }
  return result;
}

function requireNodes(value) {
  if (!Array.isArray(value) || value.length < 2) throw new TypeError('nodes must contain at least two nodes.');
  const rows = value.map((node, index) => {
    exactKeys(node, ['id', 'pointM'], `nodes[${index}]`);
    return deepFreeze({
      id: requireNonEmptyString(node.id, `nodes[${index}].id`),
      pointM: requirePoint(node.pointM, `nodes[${index}].pointM`),
    });
  });
  requireUnique(rows.map((row) => row.id), 'node ids');
  return deepFreeze(rows.sort((a, b) => a.id.localeCompare(b.id)));
}

function requireComponents(value, nodeById, thermalRequired) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('components must be a non-empty array.');
  const pairs = new Set();
  const rows = value.map((component, index) => {
    exactKeys(component, COMPONENT_KEYS, `components[${index}]`);
    const componentId = requireNonEmptyString(component.componentId, `components[${index}].componentId`);
    if (!['STRAIGHT', 'CIRCULAR_ELBOW'].includes(component.kind)) {
      throw new TypeError(`Component ${componentId} kind is unsupported.`);
    }
    const nodeAId = requireNonEmptyString(component.nodeAId, `components[${index}].nodeAId`);
    const nodeBId = requireNonEmptyString(component.nodeBId, `components[${index}].nodeBId`);
    if (nodeAId === nodeBId || !nodeById.has(nodeAId) || !nodeById.has(nodeBId)) {
      throw new TypeError(`Component ${componentId} has invalid node ownership.`);
    }
    const pair = [nodeAId, nodeBId].sort().join('\0');
    if (pairs.has(pair)) throw new TypeError(`Duplicate component pair ${nodeAId}/${nodeBId}.`);
    pairs.add(pair);
    const properties = requireProperties(component.properties, `components[${index}].properties`);
    const thermal = component.thermal === null
      ? null
      : requireThermal(component.thermal, `components[${index}].thermal`);
    if (thermalRequired && !thermal) throw new TypeError(`Component ${componentId} requires thermal authority.`);
    if (component.kind === 'STRAIGHT') {
      if (component.geometry !== null || component.flexibilityAuthority !== null) {
        throw new TypeError(`Straight component ${componentId} must not carry elbow geometry/flexibility authority.`);
      }
    } else {
      if (!component.geometry || !component.flexibilityAuthority) {
        throw new TypeError(`Elbow component ${componentId} requires circular geometry and flexibility authority.`);
      }
      const geometry = normalizeCircularElbowGeometry({
        componentId: component.geometry.componentId,
        startPointM: component.geometry.startPointM,
        endPointM: component.geometry.endPointM,
        centerPointM: component.geometry.centerPointM,
        planeNormal: component.geometry.planeNormal,
      });
      if (component.geometry.semanticHash && component.geometry.semanticHash !== geometry.semanticHash) {
        throw coded('EMPIRICAL_COMPONENT_ELBOW_GEOMETRY_HASH_MISMATCH', `Elbow ${componentId} geometry hash mismatch.`);
      }
      if (geometry.componentId !== componentId) throw new TypeError(`Elbow geometry identity does not match ${componentId}.`);
      requireEmpiricalElbowFlexibilityAuthority(component.flexibilityAuthority);
    }
    return deepFreeze({
      componentId,
      kind: component.kind,
      nodeAId,
      nodeBId,
      properties,
      thermal,
      geometry: component.geometry === null ? null : structuredClone(component.geometry),
      flexibilityAuthority: component.flexibilityAuthority === null
        ? null
        : structuredClone(component.flexibilityAuthority),
    });
  });
  requireUnique(rows.map((row) => row.componentId), 'component ids');
  return deepFreeze(rows.sort((a, b) => a.componentId.localeCompare(b.componentId)));
}

function requireCases(value, nodeById, rootNodeId) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('cases must be non-empty.');
  const rows = value.map((loadCase, index) => {
    exactKeys(loadCase, ['caseId', 'nodeId', 'direction'], `cases[${index}]`);
    const caseId = requireNonEmptyString(loadCase.caseId, `cases[${index}].caseId`);
    const nodeId = requireNonEmptyString(loadCase.nodeId, `cases[${index}].nodeId`);
    if (!nodeById.has(nodeId) || nodeId === rootNodeId) throw new TypeError(`Case ${caseId} has invalid node ${nodeId}.`);
    return deepFreeze({
      caseId,
      nodeId,
      direction: requireUnitVector(loadCase.direction, `cases[${index}].direction`),
    });
  });
  requireUnique(rows.map((row) => row.caseId), 'case ids');
  return deepFreeze(rows.sort((a, b) => a.caseId.localeCompare(b.caseId)));
}

function requireCoordinates(value, nodeById, rootNodeId) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('coordinates must be non-empty.');
  const rows = value.map((coordinate, index) => {
    exactKeys(coordinate, COORDINATE_KEYS, `coordinates[${index}]`);
    const coordinateId = requireNonEmptyString(coordinate.coordinateId, `coordinates[${index}].coordinateId`);
    const nodeId = requireNonEmptyString(coordinate.nodeId, `coordinates[${index}].nodeId`);
    if (!nodeById.has(nodeId) || nodeId === rootNodeId) throw new TypeError(`Coordinate ${coordinateId} has invalid node ${nodeId}.`);
    const supportStiffnessNPerM = coordinate.supportStiffnessNPerM === null
      ? null
      : requirePositive(coordinate.supportStiffnessNPerM, `coordinates[${index}].supportStiffnessNPerM`);
    return deepFreeze({
      coordinateId,
      nodeId,
      direction: requireUnitVector(coordinate.direction, `coordinates[${index}].direction`),
      targetDisplacementM: requireFiniteNumber(coordinate.targetDisplacementM, `coordinates[${index}].targetDisplacementM`),
      supportStiffnessNPerM,
    });
  });
  requireUnique(rows.map((row) => row.coordinateId), 'coordinate ids');
  return deepFreeze(rows.sort((a, b) => a.coordinateId.localeCompare(b.coordinateId)));
}

function requireProperties(value, label) {
  exactKeys(value, PROPERTY_KEYS, label);
  return deepFreeze({
    elasticModulusPa: requirePositive(value.elasticModulusPa, `${label}.elasticModulusPa`),
    shearModulusPa: requirePositive(value.shearModulusPa, `${label}.shearModulusPa`),
    areaM2: requirePositive(value.areaM2, `${label}.areaM2`),
    secondMomentYM4: requirePositive(value.secondMomentYM4, `${label}.secondMomentYM4`),
    secondMomentZM4: requirePositive(value.secondMomentZM4, `${label}.secondMomentZM4`),
    torsionConstantM4: requirePositive(value.torsionConstantM4, `${label}.torsionConstantM4`),
  });
}

function requireThermal(value, label) {
  exactKeys(value, [
    'referenceTemperatureC',
    'analysisTemperatureC',
    'expansionCoefficientPerK',
    'coefficientBasis',
  ], label);
  if (!THERMAL_EXPANSION_COEFFICIENT_BASES.includes(value.coefficientBasis)) {
    throw new TypeError(`${label}.coefficientBasis is outside the qualified set.`);
  }
  const expansionCoefficientPerK = requireFiniteNumber(value.expansionCoefficientPerK, `${label}.expansionCoefficientPerK`);
  if (expansionCoefficientPerK < 0) throw new RangeError(`${label}.expansionCoefficientPerK must be non-negative.`);
  return deepFreeze({
    referenceTemperatureC: requireFiniteNumber(value.referenceTemperatureC, `${label}.referenceTemperatureC`),
    analysisTemperatureC: requireFiniteNumber(value.analysisTemperatureC, `${label}.analysisTemperatureC`),
    expansionCoefficientPerK,
    coefficientBasis: value.coefficientBasis,
  });
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
  const result = value.map((item, index) => requireFiniteNumber(item, `${label}[${index}]`));
  const norm = magnitude(result);
  if (Math.abs(norm - 1) > UNIT_VECTOR_TOLERANCE) throw new RangeError(`${label} must be unit length.`);
  return deepFreeze(result.map(cleanZero));
}
function zeroStraightAction() {
  return deepFreeze({
    axialN: endField(0, 0),
    bendingMomentYNm: endField(0, 0),
    bendingMomentZNm: endField(0, 0),
    torsionNm: endField(0, 0),
  });
}
function endField(i, j) { return deepFreeze({ i: cleanZero(i), j: cleanZero(j) }); }
function requiredMapValue(map, key, label) { if (!map.has(key)) throw new TypeError(`${label} ${key} is missing.`); return map.get(key); }
function requirePositive(value, label) { const result = requireFiniteNumber(value, label); if (!(result > 0)) throw new RangeError(`${label} must be positive.`); return result; }
function requireUnique(values, label) { if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique.`); }
function exactKeys(value, keys, label) { requireRecord(value, label); const actual = Object.keys(value).sort(); const expected = [...keys].sort(); if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new TypeError(`${label} contains unexpected or missing keys.`); }
function requireRecord(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`); }
function subtractPoint(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(v, factor) { return [v[0] * factor, v[1] * factor, v[2] * factor]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function magnitude(v) { return Math.hypot(v[0], v[1], v[2]); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function cleanZero(value) { return Math.abs(value) <= ZERO_TOLERANCE ? 0 : value; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
