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
 * same span count, same element identities, same chord lengths, and the same
 * absolute position at the three points a code stress check actually reads a
 * bend at. This prevents a factor/profile change from silently solving a
 * different bend mesh than the mechanical model that owns the node/element
 * bindings.
 *
 * This does not compare every element's absolute endpoint, because the kernel
 * does not expose one. `compileFrameElement`'s sealed contract is
 * `geometry: { length }` -- deliberately position-agnostic, since a frame
 * element's stiffness cannot depend on where in space it sits. Comparing
 * `frameElement.geometry.nodeI/nodeJ` reads a field that has never existed on
 * that contract; it always reads back `undefined` and always fails, for every
 * bend, unconditionally. What the kernel does expose is `codeStations[]`,
 * carrying `position` for exactly the tangent-start, mid-arc and tangent-end
 * stations -- the same three points structural topology already names via
 * the chord chain's own endpoints and `bendRecord.midArcNodeId`. Checking
 * length per chord plus position at those three named stations proves the
 * same thing the full per-element check intended to, using only fields the
 * kernel actually returns.
 */
export function requireBendComponentMatchesTopology({
  component,
  sourceSegmentId,
  bindings,
  conditionedGeometry,
  bendRecord,
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
    requireChordLengthMatch(
      requireNodePoint(nodeById, row.segment.startNodeId, sourceSegmentId),
      requireNodePoint(nodeById, row.segment.endNodeId, sourceSegmentId),
      componentElement.frameElement?.geometry?.length,
      sourceSegmentId,
      row.index,
    );
  });

  requireCodeStationsMatchTopology({ component, ordered, nodeById, sourceSegmentId, bendRecord });
}

function requireCodeStationsMatchTopology({ component, ordered, nodeById, sourceSegmentId, bendRecord }) {
  const stationByKind = new Map((component.codeStations ?? []).map((row) => [row.kind, row]));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const expectations = [
    ['BEND_TANGENT_START', String(first.segment.startNodeId)],
    ['BEND_TANGENT_END', String(last.segment.endNodeId)],
  ];
  if (bendRecord?.midArcNodeId != null) {
    expectations.push(['BEND_MID_ARC', String(bendRecord.midArcNodeId)]);
  }
  for (const [kind, structuralNodeId] of expectations) {
    const station = stationByKind.get(kind);
    if (!station) fail(
      'BEND_COMPONENT_TOPOLOGY_STATION_MISSING',
      `Bend ${sourceSegmentId} component reports no ${kind} code station.`,
    );
    requirePointMatch(
      requireNodePoint(nodeById, structuralNodeId, sourceSegmentId),
      station.position,
      sourceSegmentId,
      kind,
    );
  }
}

function requireNodePoint(nodeById, nodeId, sourceSegmentId) {
  const node = nodeById.get(String(nodeId)) ?? null;
  if (node === null || ![node.x, node.y, node.z].every(Number.isFinite)) fail(
    'BEND_COMPONENT_TOPOLOGY_NODE_MISSING',
    `Bend ${sourceSegmentId} references missing/non-finite conditioned node ${nodeId}.`,
  );
  return [node.x, node.y, node.z];
}

function requireChordLengthMatch(startPoint, endPoint, componentLength, sourceSegmentId, index) {
  if (typeof componentLength !== 'number' || !Number.isFinite(componentLength)) fail(
    'BEND_COMPONENT_TOPOLOGY_GEOMETRY_INVALID',
    `Bend ${sourceSegmentId} component chord ${index} reports a non-finite length.`,
  );
  const structuralLength = Math.hypot(
    endPoint[0] - startPoint[0],
    endPoint[1] - startPoint[1],
    endPoint[2] - startPoint[2],
  );
  const scale = Math.max(structuralLength, componentLength, 1);
  const delta = Math.abs(structuralLength - componentLength);
  if (delta / scale > POSITION_RELATIVE_TOLERANCE) fail(
    'BEND_COMPONENT_TOPOLOGY_GEOMETRY_MISMATCH',
    `Bend ${sourceSegmentId} chord ${index} length differs from S2 topology by relative ${delta / scale} `
    + `(structural ${structuralLength}, component ${componentLength}).`,
  );
}

function requirePointMatch(actual, expected, sourceSegmentId, label) {
  if (!Array.isArray(expected) || expected.length !== 3 || !expected.every(Number.isFinite)) fail(
    'BEND_COMPONENT_TOPOLOGY_GEOMETRY_INVALID',
    `Bend ${sourceSegmentId} component station ${label} is non-finite.`,
  );
  const delta = Math.hypot(
    actual[0] - expected[0],
    actual[1] - expected[1],
    actual[2] - expected[2],
  );
  const scale = Math.max(Math.hypot(...actual), Math.hypot(...expected), 1);
  if (delta / scale > POSITION_RELATIVE_TOLERANCE) fail(
    'BEND_COMPONENT_TOPOLOGY_GEOMETRY_MISMATCH',
    `Bend ${sourceSegmentId} station ${label} differs from S2 topology by relative ${delta / scale}.`,
  );
}

function fail(code, message) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}
