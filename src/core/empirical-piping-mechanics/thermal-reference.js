import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireFiniteNumber,
  requireNonEmptyString,
} from './contracts.js';

export const EMPIRICAL_ROOTED_TREE_THERMAL_REFERENCE_SCHEMA =
  'empirical-rooted-tree-thermal-reference-displacement/v1';

export const THERMAL_EXPANSION_COEFFICIENT_BASES = Object.freeze([
  'CONSTANT_OVER_TEMPERATURE_RANGE',
  'APPROVED_MEAN_BETWEEN_REFERENCE_AND_ANALYSIS',
]);

const UNIT_VECTOR_TOLERANCE = 1e-12;
const ZERO_TOLERANCE = 1e-14;
const FORMULA_TRACE = Object.freeze([
  EMPIRICAL_FORMULA_IDS.thermalStrain,
  EMPIRICAL_FORMULA_IDS.freeThermalExpansion,
  EMPIRICAL_FORMULA_IDS.thermalFreeExpansionVector,
  EMPIRICAL_FORMULA_IDS.thermalPathAccumulation,
  EMPIRICAL_FORMULA_IDS.thermalCoordinateProjection,
]);

export function buildRootedTreeThermalReferenceDisplacements(input) {
  requireRecord(input, 'rooted-tree thermal reference input');
  exactKeys(
    input,
    ['nodes', 'segments', 'rootNodeId', 'coordinates'],
    'rooted-tree thermal reference input',
  );
  const nodes = requireNodes(input.nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const segments = requireSegments(input.segments, nodeById);
  const rootNodeId = requireNonEmptyString(input.rootNodeId, 'rootNodeId');
  if (!nodeById.has(rootNodeId)) throw new TypeError(`rootNodeId ${rootNodeId} does not exist.`);
  const coordinates = requireCoordinates(input.coordinates, nodeById);
  const oriented = orientConnectedTree(nodes, segments, rootNodeId);
  const displacementByNodeId = new Map([[rootNodeId, deepFreeze([0, 0, 0])]]);
  const segmentEvidence = [];

  for (const segment of oriented.discoveryOrder) {
    const parentDisplacement = displacementByNodeId.get(segment.nodeIId);
    if (!parentDisplacement) {
      throw new TypeError(`Thermal path order is incomplete at segment ${segment.segmentId}.`);
    }
    const thermal = segment.thermal;
    const deltaTK = thermal.analysisTemperatureC - thermal.referenceTemperatureC;
    const strain = thermal.expansionCoefficientPerK * deltaTK;
    const chord = subtract(segment.pointJ, segment.pointI);
    const lengthM = magnitude(chord);
    if (!(lengthM > ZERO_TOLERANCE)) {
      throw new RangeError(`Segment ${segment.segmentId} has zero length.`);
    }
    const tangent = scale(chord, 1 / lengthM);
    const freeExpansionM = strain * lengthM;
    const freeExpansionVectorM = scale(tangent, freeExpansionM);
    const childDisplacement = add(parentDisplacement, freeExpansionVectorM);
    displacementByNodeId.set(segment.nodeJId, deepFreeze(childDisplacement));
    segmentEvidence.push(deepFreeze({
      segmentId: segment.segmentId,
      nodeIId: segment.nodeIId,
      nodeJId: segment.nodeJId,
      lengthM,
      tangent,
      thermal,
      deltaTK,
      thermalStrain: strain,
      freeExpansionM,
      freeExpansionVectorM,
      accumulatedDisplacementAtJM: childDisplacement,
      formulaTrace: FORMULA_TRACE.slice(0, 4),
    }));
  }

  const rows = coordinates.map((coordinate) => {
    const displacementVectorM = displacementByNodeId.get(coordinate.nodeId);
    if (!displacementVectorM) {
      throw new TypeError(`No thermal reference displacement exists for node ${coordinate.nodeId}.`);
    }
    const referenceDisplacementM = dot(displacementVectorM, coordinate.direction);
    return deepFreeze({
      coordinateId: coordinate.coordinateId,
      nodeId: coordinate.nodeId,
      direction: coordinate.direction,
      displacementVectorM,
      referenceDisplacementM,
      formulaTrace: [EMPIRICAL_FORMULA_IDS.thermalCoordinateProjection],
    });
  });

  return deepFreeze({
    schema: EMPIRICAL_ROOTED_TREE_THERMAL_REFERENCE_SCHEMA,
    rootNodeId,
    coordinateIds: rows.map((row) => row.coordinateId),
    rows,
    segmentEvidence,
    evidence: {
      referenceStructure: 'CONNECTED_ACYCLIC_ROOTED_STRAIGHT_PIPE_TREE',
      temperatureField: 'UNIFORM_PER_SEGMENT',
      coefficientAuthority: 'EXPLICIT_CONSTANT_OR_APPROVED_MEAN_PER_SEGMENT',
      temperatureDependentCoefficientIntegration: false,
      throughWallThermalGradientSolved: false,
      directThermalForceAccepted: false,
      kinematicAssumption: 'INFINITESIMAL_FREE_AXIAL_EXPANSION_ALONG_UNDEFORMED_MEMBER_TANGENT',
      formulaTrace: FORMULA_TRACE,
    },
  });
}

function orientConnectedTree(nodes, segments, rootNodeId) {
  if (segments.length !== nodes.length - 1) {
    throw new TypeError('Thermal reference route must be a tree with segmentCount = nodeCount - 1.');
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  segments.forEach((segment) => {
    adjacency.get(segment.nodeAId).push({ segment, otherNodeId: segment.nodeBId });
    adjacency.get(segment.nodeBId).push({ segment, otherNodeId: segment.nodeAId });
  });
  const visited = new Set([rootNodeId]);
  const queue = [rootNodeId];
  const discoveryOrder = [];
  while (queue.length) {
    const nodeIId = queue.shift();
    const neighbors = [...adjacency.get(nodeIId)]
      .sort((left, right) => left.segment.segmentId.localeCompare(right.segment.segmentId));
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.otherNodeId)) continue;
      visited.add(neighbor.otherNodeId);
      queue.push(neighbor.otherNodeId);
      discoveryOrder.push(deepFreeze({
        segmentId: neighbor.segment.segmentId,
        nodeIId,
        nodeJId: neighbor.otherNodeId,
        pointI: nodeById.get(nodeIId).pointM,
        pointJ: nodeById.get(neighbor.otherNodeId).pointM,
        thermal: neighbor.segment.thermal,
      }));
    }
  }
  if (visited.size !== nodes.length) {
    throw new TypeError('Thermal reference route must be connected.');
  }
  return deepFreeze({ discoveryOrder });
}

function requireNodes(value) {
  if (!Array.isArray(value) || value.length < 2) {
    throw new TypeError('nodes must contain at least two nodes.');
  }
  const rows = value.map((node, index) => {
    requireRecord(node, `nodes[${index}]`);
    exactKeys(node, ['id', 'pointM'], `nodes[${index}]`);
    return deepFreeze({
      id: requireNonEmptyString(node.id, `nodes[${index}].id`),
      pointM: requirePoint(node.pointM, `nodes[${index}].pointM`),
    });
  });
  requireUnique(rows.map((row) => row.id), 'node ids');
  return deepFreeze(rows.sort((left, right) => left.id.localeCompare(right.id)));
}

function requireSegments(value, nodeById) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('segments must be a non-empty array.');
  }
  const pairs = new Set();
  const rows = value.map((segment, index) => {
    requireRecord(segment, `segments[${index}]`);
    exactKeys(segment, ['segmentId', 'nodeAId', 'nodeBId', 'thermal'], `segments[${index}]`);
    const segmentId = requireNonEmptyString(segment.segmentId, `segments[${index}].segmentId`);
    const nodeAId = requireNonEmptyString(segment.nodeAId, `segments[${index}].nodeAId`);
    const nodeBId = requireNonEmptyString(segment.nodeBId, `segments[${index}].nodeBId`);
    if (nodeAId === nodeBId) throw new TypeError(`Segment ${segmentId} is a self-loop.`);
    if (!nodeById.has(nodeAId) || !nodeById.has(nodeBId)) {
      throw new TypeError(`Segment ${segmentId} references a missing node.`);
    }
    const pair = [nodeAId, nodeBId].sort().join('\0');
    if (pairs.has(pair)) throw new TypeError(`Duplicate thermal segment pair ${nodeAId}/${nodeBId}.`);
    pairs.add(pair);
    const thermal = requireThermal(segment.thermal, `segments[${index}].thermal`);
    return deepFreeze({ segmentId, nodeAId, nodeBId, thermal });
  });
  requireUnique(rows.map((row) => row.segmentId), 'segment ids');
  return deepFreeze(rows.sort((left, right) => left.segmentId.localeCompare(right.segmentId)));
}

function requireThermal(value, label) {
  requireRecord(value, label);
  exactKeys(
    value,
    [
      'referenceTemperatureC',
      'analysisTemperatureC',
      'expansionCoefficientPerK',
      'coefficientBasis',
    ],
    label,
  );
  const coefficientBasis = requireNonEmptyString(value.coefficientBasis, `${label}.coefficientBasis`);
  if (!THERMAL_EXPANSION_COEFFICIENT_BASES.includes(coefficientBasis)) {
    throw new TypeError(`${label}.coefficientBasis is outside the qualified thermal basis set.`);
  }
  return deepFreeze({
    referenceTemperatureC: requireFiniteNumber(
      value.referenceTemperatureC,
      `${label}.referenceTemperatureC`,
    ),
    analysisTemperatureC: requireFiniteNumber(
      value.analysisTemperatureC,
      `${label}.analysisTemperatureC`,
    ),
    expansionCoefficientPerK: requireFiniteNumber(
      value.expansionCoefficientPerK,
      `${label}.expansionCoefficientPerK`,
    ),
    coefficientBasis,
  });
}

function requireCoordinates(value, nodeById) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('coordinates must be a non-empty array.');
  }
  const rows = value.map((coordinate, index) => {
    requireRecord(coordinate, `coordinates[${index}]`);
    exactKeys(coordinate, ['coordinateId', 'nodeId', 'direction'], `coordinates[${index}]`);
    const coordinateId = requireNonEmptyString(
      coordinate.coordinateId,
      `coordinates[${index}].coordinateId`,
    );
    const nodeId = requireNonEmptyString(coordinate.nodeId, `coordinates[${index}].nodeId`);
    if (!nodeById.has(nodeId)) throw new TypeError(`Coordinate ${coordinateId} references missing node ${nodeId}.`);
    const direction = requireVector3(coordinate.direction, `coordinates[${index}].direction`);
    const norm = magnitude(direction);
    if (Math.abs(norm - 1) > UNIT_VECTOR_TOLERANCE) {
      throw new RangeError(
        `Coordinate ${coordinateId} direction must be unit length within ${UNIT_VECTOR_TOLERANCE}.`,
      );
    }
    return deepFreeze({ coordinateId, nodeId, direction });
  });
  requireUnique(rows.map((row) => row.coordinateId), 'coordinate ids');
  return deepFreeze(rows.sort((left, right) => left.coordinateId.localeCompare(right.coordinateId)));
}

function requirePoint(value, label) {
  requireRecord(value, label);
  exactKeys(value, ['x', 'y', 'z'], label);
  return deepFreeze({
    x: requireFiniteNumber(value.x, `${label}.x`),
    y: requireFiniteNumber(value.y, `${label}.y`),
    z: requireFiniteNumber(value.z, `${label}.z`),
  });
}
function requireVector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`${label} must contain exactly three components.`);
  }
  return deepFreeze(value.map((item, index) => requireFiniteNumber(item, `${label}[${index}]`)));
}
function requireUnique(ids, label) {
  if (new Set(ids).size !== ids.length) throw new TypeError(`${label} must be unique.`);
}
function subtract(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
function add(a, b) { return a.map((item, index) => item + b[index]); }
function scale(vector, factor) { return vector.map((item) => item * factor); }
function dot(a, b) { return a.reduce((sum, item, index) => sum + (item * b[index]), 0); }
function magnitude(vector) { return Math.hypot(...vector); }
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
