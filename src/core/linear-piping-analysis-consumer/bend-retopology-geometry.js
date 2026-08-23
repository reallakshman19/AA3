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

  const tangentStartNode = generatedNode(
    `${sourceSegmentId}/T0`, tangentStartPoint, sourceSegmentId, 'START', input.generatedNodes,
  );
  const tangentEndNode = generatedNode(
    `${sourceSegmentId}/T1`, tangentEndPoint, sourceSegmentId, 'END', input.generatedNodes,
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
    retiredCornerNodeId: cornerNodeId,
  });
  const candidates = [tangentStartNode, tangentEndNode].map((node) => Object.freeze({
    nodeId: String(node.id),
    distance: distance(corner, node),
  }));
  const nearestNodeId = uniqueNearest(candidates);
  input.retiredNodeRecords.set(cornerNodeId, {
    sourceNodeId: cornerNodeId,
    bendSegmentId: sourceSegmentId,
    candidates,
    nearestNodeId,
    codeStationNodeId: definition.midArcNodeId,
    reason: nearestNodeId === null ? 'AMBIGUOUS_NEAREST_RETAINED_NODE' : 'UNIQUE_NEAREST_RETAINED_NODE',
  });
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
    chain.push(generatedNode(
      `${sourceSegmentId}/A${index}`,
      discretised.points[index],
      sourceSegmentId,
      index === input.chordCount / 2 ? 'MID_ARC' : 'ARC',
      input.generatedNodes,
    ));
  }
  chain.push(input.tangentEndNode);
  const chordSegments = [];
  for (let index = 1; index < chain.length; index += 1) {
    chordSegments.push(Object.freeze({
      id: `${sourceSegmentId}/B${index}`,
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

function uniqueNearest(candidates) {
  const ordered = [...candidates].sort((left, right) => left.distance - right.distance);
  if (ordered.length === 0) return null;
  if (ordered.length === 1) return ordered[0].nodeId;
  const scaleValue = Math.max(ordered[0].distance, ordered[1].distance, Number.MIN_VALUE);
  return Math.abs(ordered[1].distance - ordered[0].distance) / scaleValue
    <= BEND_RETOPOLOGY_RELATIVE_TOLERANCE ? null : ordered[0].nodeId;
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
