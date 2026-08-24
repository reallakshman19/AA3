const POSITION_RELATIVE_TOLERANCE = 1e-9;

export function groupBendChordBindings(bindings) {
  const map = new Map();
  for (const binding of bindings) {
    if (binding.bendChordOf == null) continue;
    const key = String(binding.bendChordOf);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(binding);
  }
  return map;
}

/**
 * Require the component builder to reproduce exactly the S2 chord topology:
 * same span count, same element identities, and the same endpoint coordinates.
 * This prevents a factor/profile change from silently solving a different bend
 * mesh than the mechanical model that owns the node/element bindings.
 */
export function requireBendComponentMatchesTopology({
  component,
  sourceSegmentId,
  bindings,
  conditionedGeometry,
}) {
  const segmentById = new Map(conditionedGeometry.segments.map((row) => [String(row.id), row]));
  const nodeById = new Map(conditionedGeometry.nodes.map((row) => [String(row.id), row]));
  const ordered = bindings.map((binding) => {
    const segment = segmentById.get(String(binding.segmentId)) ?? null;
    if (segment === null) fail(
      'BEND_COMPONENT_TOPOLOGY_SPAN_MISSING',
      `Bend ${sourceSegmentId} conditioned chord ${binding.segmentId} is missing.`,
    );
    const index = Number(segment.meta?.bendChordIndex);
    if (!Number.isInteger(index) || index < 1) fail(
      'BEND_COMPONENT_TOPOLOGY_INDEX_INVALID',
      `Bend ${sourceSegmentId} chord ${binding.segmentId} has no valid bendChordIndex.`,
    );
    return { binding, segment, index };
  }).sort((left, right) => left.index - right.index);

  if (ordered.length !== component.elements.length) fail(
    'BEND_COMPONENT_TOPOLOGY_COUNT_MISMATCH',
    `Bend ${sourceSegmentId} has ${ordered.length} conditioned chords but ${component.elements.length} component elements.`,
  );
  ordered.forEach((row, position) => {
    const componentElement = component.elements[position];
    if (row.index !== position + 1 || row.binding.elementId !== componentElement.elementId) {
      fail(
        'BEND_COMPONENT_ELEMENT_ID_MISMATCH',
        `Bend ${sourceSegmentId} chord ${row.index} identity ${row.binding.elementId} does not match ${componentElement.elementId}.`,
      );
    }
    requirePointMatch(
      requireNodePoint(nodeById, row.segment.startNodeId, sourceSegmentId),
      componentElement.frameElement.geometry.nodeI,
      sourceSegmentId,
      row.index,
      'I',
    );
    requirePointMatch(
      requireNodePoint(nodeById, row.segment.endNodeId, sourceSegmentId),
      componentElement.frameElement.geometry.nodeJ,
      sourceSegmentId,
      row.index,
      'J',
    );
  });
}

function requireNodePoint(nodeById, nodeId, sourceSegmentId) {
  const node = nodeById.get(String(nodeId)) ?? null;
  if (node === null || ![node.x, node.y, node.z].every(Number.isFinite)) fail(
    'BEND_COMPONENT_TOPOLOGY_NODE_MISSING',
    `Bend ${sourceSegmentId} references missing/non-finite conditioned node ${nodeId}.`,
  );
  return [node.x, node.y, node.z];
}

function requirePointMatch(actual, expected, sourceSegmentId, index, end) {
  if (!Array.isArray(expected) || expected.length !== 3 || !expected.every(Number.isFinite)) fail(
    'BEND_COMPONENT_TOPOLOGY_GEOMETRY_INVALID',
    `Bend ${sourceSegmentId} component chord ${index} end ${end} is non-finite.`,
  );
  const delta = Math.hypot(
    actual[0] - expected[0],
    actual[1] - expected[1],
    actual[2] - expected[2],
  );
  const scale = Math.max(Math.hypot(...actual), Math.hypot(...expected), 1);
  if (delta / scale > POSITION_RELATIVE_TOLERANCE) fail(
    'BEND_COMPONENT_TOPOLOGY_GEOMETRY_MISMATCH',
    `Bend ${sourceSegmentId} chord ${index} end ${end} differs from S2 topology by relative ${delta / scale}.`,
  );
}

function fail(code, message) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}
