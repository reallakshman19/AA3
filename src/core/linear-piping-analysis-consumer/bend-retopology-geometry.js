import { discretiseBend } from '../centerline-beam-fea/bend-geometry.js';
import {
  BEND_RETOPOLOGY_RELATIVE_TOLERANCE,
  failBendRetopology,
} from './bend-retopology-contract.js';

export function buildAccdbBendDefinition(input) {
  const { segment, sourceSegments, sourceNodesById } = input;
  const sourceSegmentId = String(segment.id);
  const cornerNodeId = String(segment.endNodeId);
  const incomingStart = requireNode(sourceNodesById, segment.startNodeId, sourceSegmentId);
  const corner = requireNode(sourceNodesById, cornerNodeId, sourceSegmentId);
  const outgoing = sourceSegments.filter((candidate) =>
    String(candidate.startNodeId) === cornerNodeId && String(candidate.id) !== sourceSegmentId);
  const incident = sourceSegments.filter((candidate) =>
    String(candidate.startNodeId) === cornerNodeId || String(candidate.endNodeId) === cornerNodeId);
  if (outgoing.length !== 1 || incident.length !== 2
    || !incident.some((candidate) => String(candidate.id) === sourceSegmentId)) {
    failBendRetopology(
      'BEND_RETOPOLOGY_CORNER_CONNECTIVITY_AMBIGUOUS',
      `ACCDB bend ${sourceSegmentId} corner ${cornerNodeId} is not a simple two-span route corner.`,
      {
        sourceSegmentId,
        cornerNodeId,
        outgoingSegmentIds: outgoing.map((row) => String(row.id)),
        incidentSegmentIds: incident.map((row) => String(row.id)),
      },
    );
  }
  const outgoingSegment = outgoing[0];
  const outgoingEnd = requireNode(sourceNodesById, outgoingSegment.endNodeId, String(outgoingSegment.id));
  const tangentStartPoint = requirePoint(segment.meta?.bendTangentStart, sourceSegmentId, 'bendTangentStart');
  const tangentEndPoint = requirePoint(segment.meta?.bendTangentEnd, sourceSegmentId, 'bendTangentEnd');
  requirePointOnOpenSpan(tangentStartPoint, incomingStart, corner, sourceSegmentId, 'incoming');
  requirePointOnOpenSpan(tangentEndPoint, corner, outgoingEnd, sourceSegmentId, 'outgoing');

  // The benchmark solve binds the arc to the source's own station nodes:
  // NODE2 to the near tangent, NODE1 to the mid-arc station, and the element's
  // TO_NODE to the far tangent. That last binding is the important one. The
  // adapter reads TO_NODE's coordinate as the corner intersection, which is
  // correct for deriving the arc, but in an analysis model that node belongs at
  // the far tangent -- which is where caesar-accdb-linear-solve.js puts it, and
  // that reading is the one CAESAR's own output validated.
  //
  // Binding it here rather than retiring it is what removes the whole
  // corner-load problem. Every BM4_L bend declares a force/moment at TO_NODE,
  // so retiring it stranded a real applied load on all twelve bends. The node
  // now survives, carries its load, and simply sits at the tangent.
  const tangentStartNode = generatedNode(
    stationNodeId(segment.meta?.bendStationNode2) ?? `${sourceSegmentId}.T0`,
    tangentStartPoint, sourceSegmentId, 'START', input.generatedNodes,
  );
  const tangentEndNode = repositionedNode(
    cornerNodeId, tangentEndPoint, sourceSegmentId, 'END_WORKING_POINT', input.repositionedNodes,
  );
  registerTrim(input.endTrimBySegmentId, sourceSegmentId, tangentStartNode, sourceSegmentId, 'end');
  registerTrim(input.startTrimBySegmentId, String(outgoingSegment.id), tangentEndNode, sourceSegmentId, 'start');

  const definition = discretisedDefinition({
    segment,
    tangentStartNode,
    tangentEndNode,
    chordCount: input.chordCount,
    lengthErrorLimit: input.lengthErrorLimit,
    generatedNodes: input.generatedNodes,
    midArcStationNodeId: segment.meta?.bendStationNode1 ?? null,
    retiredCornerNodeId: null,
  });
  // No retired-node record: the working point is rebound onto the arc rather
  // than removed, so there is nothing to re-target and no binding to resolve.
  return definition;
}

export function buildInputXmlBendDefinition(input) {
  const sourceSegmentId = String(input.segment.id);
  const startNode = requireNode(input.sourceNodesById, input.segment.startNodeId, sourceSegmentId);
  const endNode = requireNode(input.sourceNodesById, input.segment.endNodeId, sourceSegmentId);
  const tangentStart = requirePoint(input.segment.meta?.bendTangentStart, sourceSegmentId, 'bendTangentStart');
  const tangentEnd = requirePoint(input.segment.meta?.bendTangentEnd, sourceSegmentId, 'bendTangentEnd');
  requireCoincident(tangentStart, startNode, sourceSegmentId, 'InputXML tangent start/source start');
  requireCoincident(tangentEnd, endNode, sourceSegmentId, 'InputXML tangent end/source end');
  return discretisedDefinition({
    segment: input.segment,
    tangentStartNode: startNode,
    tangentEndNode: endNode,
    chordCount: input.chordCount,
    lengthErrorLimit: input.lengthErrorLimit,
    generatedNodes: input.generatedNodes,
    retiredCornerNodeId: null,
  });
}

export function distanceBetween(left, right) {
  return distance(left, right);
}

export function absoluteGeometryTolerance(left, right) {
  return BEND_RETOPOLOGY_RELATIVE_TOLERANCE * Math.max(norm(left), norm(right), 1);
}

/**
 * A CAESAR bend station node, when the source declares one.
 *
 * ACCDB carries NODE1/NODE2 on the bend record. The benchmark solve binds them
 * onto the arc rather than generating names for those stations, and a code
 * stress check reads the bend at NODE1, so losing them would move the station a
 * reader is looking for.
 */
/**
 * A source node kept, with its analysis-model position.
 *
 * Distinct from a generated node because the id already exists in the source:
 * anything bound to it -- an applied load, a support -- stays bound. Only the
 * coordinate changes, from the working point to the tangent it represents.
 */
function repositionedNode(nodeId, point, sourceSegmentId, role, repositionedNodes) {
  const id = String(nodeId);
  const existing = repositionedNodes.get(id);
  if (existing) return existing;
  const node = Object.freeze({
    id,
    x: point.x,
    y: point.y,
    z: point.z,
    meta: Object.freeze({ bendWorkingPointOf: sourceSegmentId, bendArcRole: role }),
  });
  repositionedNodes.set(id, node);
  return node;
}

function stationNodeId(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return String(numeric);
}

function discretisedDefinition(input) {
  const sourceSegmentId = String(input.segment.id);
  const centre = requirePoint(input.segment.meta?.bendArcCentre, sourceSegmentId, 'bendArcCentre');
  const discretised = discretiseBend(
    pointOf(input.tangentStartNode),
    pointOf(input.tangentEndNode),
    centre,
    input.chordCount,
  );
  if (!(discretised.lengthErrorFraction <= input.lengthErrorLimit)) {
    failBendRetopology(
      'BEND_RETOPOLOGY_LENGTH_ERROR_EXCEEDS_LIMIT',
      `Bend ${sourceSegmentId} chord length error ${discretised.lengthErrorFraction} exceeds ${input.lengthErrorLimit}.`,
      { sourceSegmentId, lengthErrorFraction: discretised.lengthErrorFraction, limit: input.lengthErrorLimit },
    );
  }
  const chain = [input.tangentStartNode];
  for (let index = 1; index < discretised.points.length - 1; index += 1) {
    const isMidArc = index === input.chordCount / 2;
    const declaredMidArc = isMidArc ? stationNodeId(input.midArcStationNodeId) : null;
    chain.push(generatedNode(
      declaredMidArc ?? `${sourceSegmentId}.A${index}`,
      discretised.points[index],
      sourceSegmentId,
      isMidArc ? 'MID_ARC' : 'ARC',
      input.generatedNodes,
    ));
  }
  chain.push(input.tangentEndNode);
  const chordSegments = [];
  for (let index = 1; index < chain.length; index += 1) {
    chordSegments.push(Object.freeze({
      id: `${sourceSegmentId}.B${index}`,
      startNodeId: String(chain[index - 1].id),
      endNodeId: String(chain[index].id),
      length: distance(chain[index - 1], chain[index]),
    }));
  }
  return Object.freeze({
    sourceSegmentId,
    tangentBasis: String(input.segment.meta.bendTangentBasis),
    chordSegments: Object.freeze(chordSegments),
    midArcNodeId: String(chain[input.chordCount / 2].id),
    arcLength: discretised.arcLength,
    chordChainLength: discretised.chordLength,
    lengthErrorFraction: discretised.lengthErrorFraction,
    retiredCornerNodeId: input.retiredCornerNodeId,
  });
}

function registerTrim(map, segmentId, node, bendSegmentId, side) {
  if (map.has(segmentId)) {
    const existing = map.get(segmentId);
    failBendRetopology(
      'BEND_RETOPOLOGY_TRIM_COLLISION',
      `Segment ${segmentId} receives more than one ${side} trim.`,
      { segmentId, side, existingBendSegmentId: existing.bendSegmentId, bendSegmentId },
    );
  }
  map.set(segmentId, Object.freeze({ node, bendSegmentId }));
}

function generatedNode(id, point, bendSegmentId, role, generatedNodes) {
  const existing = generatedNodes.get(id);
  if (existing) {
    requireCoincident(existing, point, bendSegmentId, `generated node ${id}`);
    return existing;
  }
  const node = Object.freeze({
    id,
    x: point.x,
    y: point.y,
    z: point.z,
    restraint: 'FREE',
    meta: Object.freeze({ bendRetopologyOf: bendSegmentId, bendRetopologyRole: role }),
  });
  generatedNodes.set(id, node);
  return node;
}

function requirePointOnOpenSpan(point, start, end, segmentId, side) {
  const vector = subtract(end, start);
  const lengthSquared = dot(vector, vector);
  if (!(lengthSquared > 0)) {
    failBendRetopology('BEND_RETOPOLOGY_TANGENT_OVERRUN',
      `Bend ${segmentId} ${side} span has zero length.`, { segmentId, side });
  }
  const fraction = dot(subtract(point, start), vector) / lengthSquared;
  const projected = add(start, scale(vector, fraction));
  const relativeResidual = distance(point, projected) / Math.sqrt(lengthSquared);
  if (!(fraction > 0 && fraction < 1)
    || relativeResidual > BEND_RETOPOLOGY_RELATIVE_TOLERANCE) {
    failBendRetopology(
      'BEND_RETOPOLOGY_TANGENT_OVERRUN',
      `Bend ${segmentId} ${side} tangent is not strictly inside its adjacent source span.`,
      { segmentId, side, fraction, relativeResidual },
    );
  }
}

function requireCoincident(left, right, segmentId, label) {
  const delta = distance(left, right);
  const scaleValue = Math.max(norm(left), norm(right), 1);
  if (delta / scaleValue > BEND_RETOPOLOGY_RELATIVE_TOLERANCE) {
    failBendRetopology(
      'BEND_RETOPOLOGY_TANGENT_ENDPOINT_MISMATCH',
      `Bend ${segmentId} ${label} is inconsistent with the source endpoint.`,
      { segmentId, label, relativeResidual: delta / scaleValue },
    );
  }
}

function requireNode(nodesById, nodeId, segmentId) {
  const node = nodesById.get(String(nodeId)) ?? null;
  if (node === null) {
    failBendRetopology('BEND_RETOPOLOGY_NODE_MISSING',
      `Segment ${segmentId} references missing node ${nodeId}.`, { segmentId, nodeId });
  }
  return node;
}

function requirePoint(value, segmentId, field) {
  if (!value || typeof value !== 'object'
    || ![value.x, value.y, value.z].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    failBendRetopology('BEND_RETOPOLOGY_POINT_INVALID',
      `Bend ${segmentId} has invalid ${field}.`, { segmentId, field });
  }
  return value;
}

function pointOf(node) { return { x: node.x, y: node.y, z: node.z }; }
function distance(left, right) { return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z); }
function norm(point) { return Math.hypot(point.x, point.y, point.z); }
function subtract(left, right) { return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z }; }
function add(left, right) { return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z }; }
function scale(vector, factor) { return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }; }
function dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
