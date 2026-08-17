/** Pure display topology for retained finite-element mesh overlays. */

export function lafeaRetainedMeshDisplayBoundary(element, nodeById) {
  if (!element || !Array.isArray(element.nodeIds) || !(nodeById instanceof Map)) {
    throw displayError('LAFEA_RETAINED_MESH_DISPLAY_TOPOLOGY_INPUT_INVALID');
  }
  const nodes = element.nodeIds.map((nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) throw displayError('LAFEA_RETAINED_MESH_DISPLAY_NODE_NOT_FOUND');
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw displayError('LAFEA_RETAINED_MESH_DISPLAY_NODE_INVALID');
    }
    return node;
  });

  if (element.elementType === 'T6') {
    return quadraticLoop(element, nodes, 3, 'T6');
  }
  if (element.elementType === 'Q8') {
    return quadraticLoop(element, nodes, 4, 'Q8');
  }
  if (nodes.length >= 3) {
    return freeze({
      kind: 'POLYGON',
      elementType: element.elementType ?? null,
      points: nodes,
    });
  }
  if (nodes.length === 2) {
    return freeze({
      kind: 'POLYLINE',
      elementType: element.elementType ?? null,
      points: nodes,
    });
  }
  throw displayError('LAFEA_RETAINED_MESH_DISPLAY_ELEMENT_NODE_COUNT_INVALID');
}

export function lafeaQuadraticEdgeControlPoint(start, midside, end) {
  for (const [name, point] of [['start', start], ['midside', midside], ['end', end]]) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw displayError(`LAFEA_RETAINED_MESH_DISPLAY_${name.toUpperCase()}_INVALID`);
    }
  }
  return freeze({
    x: 2 * midside.x - (start.x + end.x) / 2,
    y: 2 * midside.y - (start.y + end.y) / 2,
  });
}

function quadraticLoop(element, nodes, cornerCount, family) {
  if (nodes.length !== 2 * cornerCount) {
    throw displayError(`LAFEA_RETAINED_MESH_DISPLAY_${family}_NODE_COUNT_INVALID`);
  }
  const corners = nodes.slice(0, cornerCount);
  const midsides = nodes.slice(cornerCount);
  const edges = corners.map((start, index) => {
    const end = corners[(index + 1) % cornerCount];
    const midside = midsides[index];
    return freeze({
      start,
      midside,
      end,
      control: lafeaQuadraticEdgeControlPoint(start, midside, end),
    });
  });
  return freeze({
    kind: 'QUADRATIC_LOOP',
    elementType: family,
    edges,
  });
}

function displayError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
