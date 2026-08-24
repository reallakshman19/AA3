import { failBendRetopology } from './bend-retopology-contract.js';

/**
 * Recover the incoming tangent direction from the same source topology that
 * authorized the bend tangent geometry. This is not a geometric guess:
 * ACCDB uses the bend-pointered incoming span itself; tangent-to-tangent
 * InputXML uses the unique predecessor that the adapter already required when
 * it accepted the arc centre.
 */
export function bendSourceIncomingDirection(definition, sourceSegments, sourceNodesById) {
  const sourceSegmentId = String(definition.sourceSegmentId);
  const source = sourceSegments.find((segment) => String(segment.id) === sourceSegmentId) ?? null;
  if (source === null) {
    fail('BEND_RETOPOLOGY_SOURCE_SEGMENT_MISSING', sourceSegmentId, { sourceSegmentId });
  }
  if (definition.tangentBasis === 'ACCDB_CORNER_INTERSECTION_V1') {
    return directionBetween(
      requireNode(sourceNodesById, source.startNodeId, sourceSegmentId),
      requireNode(sourceNodesById, source.endNodeId, sourceSegmentId),
      sourceSegmentId,
    );
  }
  if (definition.tangentBasis === 'INPUTXML_TANGENT_TO_TANGENT_V1') {
    const predecessors = sourceSegments.filter((candidate) =>
      String(candidate.endNodeId) === String(source.startNodeId)
      && String(candidate.id) !== sourceSegmentId);
    if (predecessors.length !== 1) {
      failBendRetopology(
        'BEND_RETOPOLOGY_INCOMING_DIRECTION_AMBIGUOUS',
        `Bend ${sourceSegmentId} does not have exactly one source predecessor for its incoming direction.`,
        { sourceSegmentId, predecessorSegmentIds: predecessors.map((row) => String(row.id)) },
      );
    }
    const predecessor = predecessors[0];
    return directionBetween(
      requireNode(sourceNodesById, predecessor.startNodeId, String(predecessor.id)),
      requireNode(sourceNodesById, source.startNodeId, sourceSegmentId),
      sourceSegmentId,
    );
  }
  failBendRetopology(
    'BEND_RETOPOLOGY_TANGENT_BASIS_UNSUPPORTED',
    `Bend ${sourceSegmentId} has unsupported tangent basis ${definition.tangentBasis}.`,
    { sourceSegmentId, tangentBasis: definition.tangentBasis },
  );
}

function directionBetween(start, end, sourceSegmentId) {
  const delta = [end.x - start.x, end.y - start.y, end.z - start.z];
  const length = Math.hypot(...delta);
  if (!(length > 0) || !Number.isFinite(length)) {
    failBendRetopology(
      'BEND_RETOPOLOGY_INCOMING_DIRECTION_DEGENERATE',
      `Bend ${sourceSegmentId} incoming source span is degenerate.`,
      { sourceSegmentId },
    );
  }
  return Object.freeze(delta.map((value) => value / length));
}

function requireNode(nodesById, nodeId, sourceSegmentId) {
  const node = nodesById.get(String(nodeId)) ?? null;
  if (node === null || ![node.x, node.y, node.z].every(Number.isFinite)) {
    failBendRetopology(
      'BEND_RETOPOLOGY_NODE_MISSING',
      `Segment ${sourceSegmentId} references missing/non-finite node ${nodeId}.`,
      { sourceSegmentId, nodeId },
    );
  }
  return node;
}

function fail(code, sourceSegmentId, data) {
  failBendRetopology(code, `Bend ${sourceSegmentId} source segment is unavailable.`, data);
}
