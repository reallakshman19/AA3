import { ELEMENT_TYPES, ELEMENT_TYPE_CORNER_COUNTS, ELEMENT_TYPE_NODE_COUNTS } from './constants.js';
import { modelError } from './errors.js';
import { positiveNumber, strictNumber, tolerance } from './numeric.js';
import { convert } from './units.js';
import {
  arrayValue, codeUnitCompare, enumValue, exactRecord, nonEmptyString, uniqueIdentities,
} from './validation.js';

export function normalizeMaterials(values) {
  const rows = arrayValue(values, 'materials').map((value, index) => {
    const path = `materials[${index}]`;
    const row = exactRecord(
      value,
      ['materialId', 'elasticModulus', 'poissonRatio', 'sourceReference'],
      path,
    );
    const poissonRatio = strictNumber(row.poissonRatio, `${path}.poissonRatio`);
    if (!(poissonRatio > -1 && poissonRatio < 0.5)) {
      throw modelError(
        'POISSON_RATIO_OUT_OF_RANGE',
        `${path}.poissonRatio`,
        'Poisson ratio must satisfy -1 < nu < 0.5.',
      );
    }
    return {
      materialId: nonEmptyString(row.materialId, `${path}.materialId`),
      elasticModulus: positiveNumber(row.elasticModulus, `${path}.elasticModulus`),
      poissonRatio,
      sourceReference: nonEmptyString(row.sourceReference, `${path}.sourceReference`),
    };
  });
  uniqueIdentities(rows, 'materialId', 'materials');
  return rows.sort((left, right) => codeUnitCompare(left.materialId, right.materialId));
}

export function normalizeNodes(values) {
  const rows = arrayValue(values, 'nodes').map((value, index) => {
    const path = `nodes[${index}]`;
    const row = exactRecord(value, ['nodeId', 'x', 'y', 'sourceReference'], path);
    return {
      nodeId: nonEmptyString(row.nodeId, `${path}.nodeId`),
      x: strictNumber(row.x, `${path}.x`),
      y: strictNumber(row.y, `${path}.y`),
      sourceReference: nonEmptyString(row.sourceReference, `${path}.sourceReference`),
    };
  });
  uniqueIdentities(rows, 'nodeId', 'nodes');
  return rows.sort((left, right) => codeUnitCompare(left.nodeId, right.nodeId));
}

export function normalizeElements(values, nodes) {
  rejectCoincidentIndependentNodes(nodes);
  const nodeMap = new Map(nodes.map((row) => [row.nodeId, row]));
  const rows = arrayValue(values, 'elements').map((value, index) => (
    normalizeElement(value, index, nodeMap)
  ));
  uniqueIdentities(rows, 'elementId', 'elements');
  rejectDuplicateElementNodeSets(rows);
  requireConformingManifoldEdges(rows);
  rejectDisconnectedElementComponents(rows);
  return rows.sort((left, right) => codeUnitCompare(left.elementId, right.elementId));
}

function normalizeElement(value, index, nodeMap) {
  const path = `elements[${index}]`;
  const row = exactRecord(
    value,
    ['elementId', 'elementType', 'nodeIds', 'materialId', 'thickness', 'sourceReference'],
    path,
  );
  const elementType = enumValue(row.elementType, ELEMENT_TYPES, `${path}.elementType`);
  const nodeIds = arrayValue(row.nodeIds, `${path}.nodeIds`).map((id, nodeIndex) => (
    nonEmptyString(id, `${path}.nodeIds[${nodeIndex}]`)
  ));
  const expectedCount = ELEMENT_TYPE_NODE_COUNTS[elementType];
  if (nodeIds.length !== expectedCount) {
    throw modelError(
      'ELEMENT_NODE_COUNT_MISMATCH',
      `${path}.nodeIds`,
      `${elementType} elements require exactly ${expectedCount} node IDs.`,
    );
  }
  if (new Set(nodeIds).size !== nodeIds.length) {
    throw modelError(
      'REPEATED_ELEMENT_NODE',
      `${path}.nodeIds`,
      'Element node IDs must be distinct.',
    );
  }
  nodeIds.forEach((id) => assertNodeReference(id, nodeMap, path));
  const canonicalNodeIds = elementType === ELEMENT_TYPES.T3
    ? canonicalTriangleIds(nodeIds, nodeMap)
    : requireCounterClockwiseCorners(nodeIds, elementType, nodeMap, path);
  return {
    elementId: nonEmptyString(row.elementId, `${path}.elementId`),
    elementType,
    // T3's declared node order is not semantically meaningful (any rotation/
    // reflection is the same triangle) and is canonicalized for determinism.
    // T6/Q8 node order IS meaningful (corners first, then edge midsides in
    // parent-edge order), so it is preserved exactly and its corners are
    // required CCW. The physical midside coordinates are part of the
    // isoparametric geometry and may lie on a curved parent boundary; they are
    // never snapped to a chord midpoint. Mapping validity is qualified later
    // from the actual T6/Q8 Jacobian at the formulation's control/integration
    // locations.
    nodeIds: canonicalNodeIds,
    materialId: nonEmptyString(row.materialId, `${path}.materialId`),
    thickness: positiveNumber(row.thickness, `${path}.thickness`),
    sourceReference: nonEmptyString(row.sourceReference, `${path}.sourceReference`),
  };
}

function requireCounterClockwiseCorners(nodeIds, elementType, nodeMap, path) {
  const cornerCount = ELEMENT_TYPE_CORNER_COUNTS[elementType];
  const corners = nodeIds.slice(0, cornerCount);
  if (!(polygonSignedArea(corners, nodeMap) > 0)) {
    throw modelError(
      'ELEMENT_NOT_COUNTERCLOCKWISE',
      `${path}.nodeIds`,
      `${elementType} corner nodes (first ${cornerCount} of nodeIds) must be declared counter-clockwise.`,
    );
  }
  return nodeIds;
}

function polygonSignedArea(cornerIds, nodeMap) {
  const points = cornerIds.map((id) => nodeMap.get(id));
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]; const b = points[(index + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function assertNodeReference(nodeId, nodeMap, path) {
  if (!nodeMap.has(nodeId)) {
    throw modelError(
      'UNRESOLVED_NODE_REFERENCE',
      `${path}.nodeIds`,
      `Unknown node ${nodeId}.`,
    );
  }
}

function rejectDuplicateElementNodeSets(rows) {
  const sets = new Set();
  rows.forEach((row) => {
    const key = [...row.nodeIds].sort(codeUnitCompare).join('\0');
    if (sets.has(key)) {
      throw modelError('DUPLICATE_ELEMENT_NODE_SET', 'elements', `Duplicate element node set ${key}.`);
    }
    sets.add(key);
  });
}

/**
 * Continuum interfaces are edge-connected, conforming and manifold. Sharing a
 * single corner node is not sufficient continuum connectivity. Two elements
 * that own the same physical corner edge must use the same full edge topology
 * (including the same quadratic midside identity) and traverse the edge in
 * opposite directions because all elements are counter-clockwise. More than
 * two owners is a non-manifold interface and is rejected before assembly.
 */
function requireConformingManifoldEdges(rows) {
  const edgeUses = buildCornerEdgeUses(rows);
  for (const [key, owners] of edgeUses) {
    if (owners.length > 2) {
      throw modelError(
        'NON_MANIFOLD_CONTINUUM_EDGE',
        'elements',
        `Physical edge ${printableEdgeKey(key)} has ${owners.length} element owners; at most two are permitted.`,
      );
    }
    if (owners.length !== 2) continue;
    const [left, right] = owners;
    if (fullEdgeKey(left.sequence) !== fullEdgeKey(right.sequence)) {
      throw modelError(
        'NONCONFORMING_SHARED_EDGE',
        'elements',
        `Elements ${left.elementId} and ${right.elementId} share the same corner edge but not the same complete edge topology/midside identity.`,
      );
    }
    if (
      left.sequence[0] !== right.sequence[right.sequence.length - 1]
      || left.sequence[left.sequence.length - 1] !== right.sequence[0]
    ) {
      throw modelError(
        'INCONSISTENT_SHARED_EDGE_ORIENTATION',
        'elements',
        `Elements ${left.elementId} and ${right.elementId} must traverse their shared edge in opposite directions.`,
      );
    }
  }
}

function rejectCoincidentIndependentNodes(nodes) {
  const coordinates = new Map();
  for (const node of nodes) {
    const key = `${Object.is(node.x, -0) ? 0 : node.x}\0${Object.is(node.y, -0) ? 0 : node.y}`;
    const prior = coordinates.get(key);
    if (prior) {
      throw modelError(
        'COINCIDENT_INDEPENDENT_NODE',
        'nodes',
        `Nodes ${prior.nodeId} and ${node.nodeId} occupy the same declared coordinate but have independent identities.`,
      );
    }
    coordinates.set(key, node);
  }
}

function rejectDisconnectedElementComponents(rows) {
  if (rows.length <= 1) return;
  const adjacency = Array.from({ length: rows.length }, () => new Set());
  for (const owners of buildCornerEdgeUses(rows).values()) {
    if (owners.length !== 2 || fullEdgeKey(owners[0].sequence) !== fullEdgeKey(owners[1].sequence)) {
      continue;
    }
    adjacency[owners[0].elementIndex].add(owners[1].elementIndex);
    adjacency[owners[1].elementIndex].add(owners[0].elementIndex);
  }
  const visited = new Set([0]);
  const pending = [0];
  while (pending.length) {
    const elementIndex = pending.pop();
    for (const neighbor of adjacency[elementIndex]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        pending.push(neighbor);
      }
    }
  }
  if (visited.size !== rows.length) {
    throw modelError(
      'DISCONNECTED_MESH_COMPONENT',
      'elements',
      `Continuum mesh contains ${countEdgeConnectedComponents(adjacency)} edge-disconnected element components; point-only node contact is not continuum connectivity.`,
    );
  }
}

function buildCornerEdgeUses(rows) {
  const uses = new Map();
  rows.forEach((row, elementIndex) => {
    topologyEdgeSequences(row).forEach((sequence) => {
      const key = cornerEdgeKey(sequence);
      const owners = uses.get(key) ?? [];
      owners.push({ elementIndex, elementId: row.elementId, sequence });
      uses.set(key, owners);
    });
  });
  return uses;
}

function topologyEdgeSequences(row) {
  const cornerCount = ELEMENT_TYPE_CORNER_COUNTS[row.elementType];
  const corners = row.nodeIds.slice(0, cornerCount);
  const midsides = row.nodeIds.slice(cornerCount);
  return corners.map((corner, index) => {
    const next = corners[(index + 1) % cornerCount];
    return midsides.length ? [corner, midsides[index], next] : [corner, next];
  });
}

function cornerEdgeKey(sequence) {
  return [sequence[0], sequence[sequence.length - 1]].sort(codeUnitCompare).join('\0');
}
function fullEdgeKey(sequence) {
  return [...sequence].sort(codeUnitCompare).join('\0');
}
function printableEdgeKey(key) {
  return key.split('\0').join('–');
}

function countEdgeConnectedComponents(adjacency) {
  const visited = new Set();
  let count = 0;
  for (let start = 0; start < adjacency.length; start += 1) {
    if (visited.has(start)) continue;
    count += 1;
    visited.add(start);
    const pending = [start];
    while (pending.length) {
      const index = pending.pop();
      for (const neighbor of adjacency[index]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          pending.push(neighbor);
        }
      }
    }
  }
  return count;
}

function canonicalTriangleIds(nodeIds, nodeMap) {
  let ordered = [...nodeIds];
  if (signedDoubleArea(ordered, nodeMap) < 0) {
    ordered = [ordered[0], ordered[2], ordered[1]];
  }
  const rotations = [
    ordered,
    [ordered[1], ordered[2], ordered[0]],
    [ordered[2], ordered[0], ordered[1]],
  ];
  return rotations.sort((left, right) => (
    codeUnitCompare(left.join('\0'), right.join('\0'))
  ))[0];
}

function signedDoubleArea(nodeIds, nodeMap) {
  const [a, b, c] = nodeIds.map((id) => nodeMap.get(id));
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}

export function canonicalMaterial(row, units) {
  return {
    ...row,
    elasticModulus: convert(
      row.elasticModulus,
      'modulus',
      units,
      `materials.${row.materialId}.elasticModulus`,
    ),
    sourceUnit: units.declared.modulus,
    canonicalUnit: units.canonical.modulus,
  };
}

export function canonicalNode(row, units) {
  return {
    ...row,
    x: convert(row.x, 'length', units, `nodes.${row.nodeId}.x`),
    y: convert(row.y, 'length', units, `nodes.${row.nodeId}.y`),
    sourceUnit: units.declared.length,
    canonicalUnit: units.canonical.length,
  };
}

export function canonicalElements(rows, nodes, units, profile) {
  const nodeMap = new Map(nodes.map((row) => [row.nodeId, row]));
  return rows.map((row) => canonicalElement(row, nodeMap, units, profile));
}

function canonicalElement(row, nodeMap, units, profile) {
  const thickness = convert(
    row.thickness,
    'length',
    units,
    `elements.${row.elementId}.thickness`,
  );
  // Area is computed from the element's corner nodes (all of them for T3;
  // the first `cornerCount` of nodeIds for T6/Q8) — a straight-edge polygon
  // approximation of the true (possibly curved-boundary) area, sufficient
  // for this degeneracy sanity check without claiming exact curved area.
  const cornerCount = ELEMENT_TYPE_CORNER_COUNTS[row.elementType];
  const cornerIds = row.nodeIds.slice(0, cornerCount);
  const coordinates = cornerIds.map((id) => nodeMap.get(id));
  const area = Math.abs(polygonSignedArea(cornerIds, nodeMap));
  const scale = geometryScale(coordinates);
  const limit = tolerance(profile, 'minimumElementArea', scale ** 2);
  if (!(area > limit)) {
    throw modelError(
      'DEGENERATE_ELEMENT',
      `elements.${row.elementId}`,
      `Element area ${area} does not exceed ${limit}.`,
    );
  }
  return {
    ...row,
    thickness,
    sourceUnit: units.declared.length,
    canonicalUnit: units.canonical.length,
    signedAreaBeforeNormalization: area,
    canonicalArea: area,
    orientation: 'COUNTER_CLOCKWISE',
    areaQualification: {
      geometryScale: scale,
      area,
      tolerance: limit,
      accepted: true,
    },
  };
}

function geometryScale(nodes) {
  let scale = 0;
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      scale = Math.max(
        scale,
        Math.hypot(nodes[left].x - nodes[right].x, nodes[left].y - nodes[right].y),
      );
    }
  }
  return scale;
}
