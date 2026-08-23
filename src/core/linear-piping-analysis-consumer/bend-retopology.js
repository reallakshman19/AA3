import { discretiseBend } from '../centerline-beam-fea/bend-geometry.js';

const RELATIVE_GEOMETRY_TOLERANCE = 1e-9;
const BEND_TYPES = new Set(['BEND', 'ELBOW']);

export class BendRetopologyError extends Error {
  constructor(message, code, data = null) {
    super(message);
    this.name = 'BendRetopologyError';
    this.code = code;
    this.data = data;
  }
}

/**
 * Rewrite source bend topology into explicit tangent-to-tangent chord chains.
 *
 * ACCDB source bends use FROM -> theoretical corner and therefore consume part
 * of the following source span. InputXML bends with an evidenced
 * INPUTXML_TANGENT_TO_TANGENT_V1 basis already use physical tangents as their
 * endpoints and only need the arc chain inserted.
 *
 * The pass is pure. Every produced span retains one source origin in
 * `spanOrigin`; retired corner nodes retain an explicit node-target record so
 * structural restraints can be re-bound or fail closed rather than disappear.
 */
export function retopologiseDeclaredBends(geometry, profile) {
  requireGeometry(geometry);
  const chordCount = requireEvenChordCount(profile);
  const lengthErrorLimit = requirePositiveDeclaredValue(profile, 'bendLengthErrorLimit');
  const sourceNodesById = new Map(geometry.nodes.map((node) => [String(node.id), node]));
  const sourceSegments = [...geometry.segments].sort((left, right) => compareAscii(left.id, right.id));

  const definitions = [];
  const startTrimBySegmentId = new Map();
  const endTrimBySegmentId = new Map();
  const generatedNodes = new Map();
  const retiredNodeRecords = new Map();

  for (const segment of sourceSegments) {
    if (!BEND_TYPES.has(String(segment.type))) continue;
    const basis = String(segment.meta?.bendTangentBasis ?? '');
    if (basis === '') continue;
    const definition = basis === 'ACCDB_CORNER_INTERSECTION_V1'
      ? buildAccdbDefinition({
          segment,
          sourceSegments,
          sourceNodesById,
          startTrimBySegmentId,
          endTrimBySegmentId,
          generatedNodes,
          retiredNodeRecords,
          chordCount,
          lengthErrorLimit,
        })
      : basis === 'INPUTXML_TANGENT_TO_TANGENT_V1'
        ? buildInputXmlDefinition({
            segment,
            sourceNodesById,
            generatedNodes,
            chordCount,
            lengthErrorLimit,
          })
        : fail(
            'BEND_RETOPOLOGY_TANGENT_BASIS_UNSUPPORTED',
            `Bend ${segment.id} declares unsupported tangent basis ${basis}.`,
            { segmentId: String(segment.id), basis },
          );
    definitions.push(definition);
  }

  requireRetiredNodeBindingsResolvable({
    retiredNodeRecords,
    sourceNodesById,
    sourceSegments,
  });

  const definitionBySegmentId = new Map(definitions.map((row) => [row.sourceSegmentId, row]));
  const outputSegments = [];
  const spanOrigin = {};
  for (const source of sourceSegments) {
    const sourceId = String(source.id);
    const bend = definitionBySegmentId.get(sourceId) ?? null;
    const start = startTrimBySegmentId.get(sourceId)?.node
      ?? requireNode(sourceNodesById, source.startNodeId, sourceId);
    const end = endTrimBySegmentId.get(sourceId)?.node
      ?? requireNode(sourceNodesById, source.endNodeId, sourceId);
    const changedBody = String(start.id) !== String(source.startNodeId)
      || String(end.id) !== String(source.endNodeId)
      || bend !== null;
    const bodyLength = distance(start, end);
    // An ACCDB bend source includes a finite incoming straight ending at t0.
    // A tangent-to-tangent InputXML bend does not: retaining its original
    // start->end chord would put a parallel straight member across the arc.
    const bodyAllowed = bend === null || bend.tangentBasis === 'ACCDB_CORNER_INTERSECTION_V1';
    const bodyExists = bodyAllowed && bodyLength > absoluteTolerance(start, end);
    let boundEvidenceOwned = false;

    if (bodyExists) {
      const id = changedBody ? `${sourceId}/S1` : sourceId;
      const body = Object.freeze({
        ...source,
        id,
        startNodeId: String(start.id),
        endNodeId: String(end.id),
        type: bend === null ? source.type : 'PIPE',
        length: bodyLength,
        meta: segmentMeta(source, {
          ...(changedBody ? { parentSegmentId: sourceId } : {}),
          ...(bend === null ? {} : {
            bendIncomingStraightOf: sourceId,
            retopologyRole: 'BEND_INCOMING_STRAIGHT',
          }),
          ...(startTrimBySegmentId.has(sourceId)
            ? { retopologyTrimmedStartByBend: startTrimBySegmentId.get(sourceId).bendSegmentId }
            : {}),
        }, true),
      });
      outputSegments.push(body);
      spanOrigin[id] = sourceId;
      boundEvidenceOwned = true;
    }

    if (bend !== null) {
      bend.chordSegments.forEach((chord, index) => {
        const preserveBoundEvidence = !boundEvidenceOwned && index === 0;
        const row = Object.freeze({
          ...source,
          id: chord.id,
          startNodeId: chord.startNodeId,
          endNodeId: chord.endNodeId,
          type: source.type,
          length: chord.length,
          meta: segmentMeta(source, {
            parentSegmentId: sourceId,
            bendChordOf: sourceId,
            bendChordIndex: index + 1,
            bendChordCount: chordCount,
            bendMidArcNodeId: bend.midArcNodeId,
            retopologyRole: 'BEND_ARC_CHORD',
          }, preserveBoundEvidence),
        });
        outputSegments.push(row);
        spanOrigin[row.id] = sourceId;
      });
      boundEvidenceOwned = true;
    }

    if (!boundEvidenceOwned) {
      fail(
        'BEND_RETOPOLOGY_SOURCE_SPAN_ELIMINATED',
        `Source segment ${sourceId} has no retained span after bend retopology.`,
        { sourceSegmentId: sourceId },
      );
    }
  }

  const finalSegments = outputSegments.map((segment) =>
    retargetBoundSegmentEvidence(segment, retiredNodeRecords));
  const referencedNodeIds = new Set(finalSegments.flatMap((segment) => [
    String(segment.startNodeId), String(segment.endNodeId),
  ]));
  const retiredNodeIds = [...retiredNodeRecords.keys()].sort(compareAscii);
  const nodes = [];
  for (const node of geometry.nodes) {
    const id = String(node.id);
    if (retiredNodeRecords.has(id) && !referencedNodeIds.has(id)) continue;
    nodes.push(node);
  }
  for (const [id, node] of [...generatedNodes.entries()].sort((left, right) => compareAscii(left[0], right[0]))) {
    if (!sourceNodesById.has(id)) nodes.push(node);
  }

  const geometryOut = Object.freeze({
    ...geometry,
    nodes: Object.freeze(nodes),
    segments: Object.freeze(finalSegments),
  });
  const nodeRetargeting = Object.freeze(Object.fromEntries(
    [...retiredNodeRecords.entries()]
      .sort((left, right) => compareAscii(left[0], right[0]))
      .map(([nodeId, record]) => [nodeId, freezeNodeRetargeting(record)]),
  ));

  return Object.freeze({
    geometry: geometryOut,
    spanOrigin: Object.freeze({ ...spanOrigin }),
    retiredNodeIds: Object.freeze(retiredNodeIds),
    nodeRetargeting,
    bendRecords: Object.freeze(definitions.map((row) => Object.freeze({
      sourceSegmentId: row.sourceSegmentId,
      tangentBasis: row.tangentBasis,
      chordCount,
      midArcNodeId: row.midArcNodeId,
      arcLength: row.arcLength,
      chordChainLength: row.chordChainLength,
      lengthErrorFraction: row.lengthErrorFraction,
      retiredCornerNodeId: row.retiredCornerNodeId,
    }))),
    summary: Object.freeze({
      bendCount: definitions.length,
      chordCount: definitions.reduce((sum, row) => sum + row.chordSegments.length, 0),
      retiredNodeCount: retiredNodeIds.length,
      sourceSegmentCount: sourceSegments.length,
      producedSegmentCount: finalSegments.length,
    }),
  });
}

function buildAccdbDefinition(input) {
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
    fail(
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

function buildInputXmlDefinition(input) {
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
    fail(
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

function requireRetiredNodeBindingsResolvable(input) {
  for (const [sourceNodeId, record] of input.retiredNodeRecords) {
    if (record.nearestNodeId !== null) continue;
    const node = input.sourceNodesById.get(sourceNodeId);
    const boundKinds = boundKindsAtNode(node, sourceNodeId, input.sourceSegments);
    if (boundKinds.length === 0) continue;
    fail(
      'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS',
      `Retired bend corner node ${sourceNodeId} carries bound engineering entities but has no unique retained target.`,
      {
        sourceNodeId,
        bendSegmentId: record.bendSegmentId,
        candidates: record.candidates,
        boundKinds,
      },
    );
  }
}

function boundKindsAtNode(node, sourceNodeId, sourceSegments) {
  const kinds = [];
  if (node) {
    if (String(node.restraint ?? 'FREE') !== 'FREE') kinds.push('CANONICAL_RESTRAINT_CLASS');
    if (Array.isArray(node.meta?.restraints) && node.meta.restraints.length > 0) kinds.push('RESTRAINT');
    if (Array.isArray(node.meta?.attachmentPoints) && node.meta.attachmentPoints.length > 0) kinds.push('ATTACHMENT_POINT');
  }
  for (const segment of sourceSegments) {
    for (const record of segment.meta?.analysis?.forcesMoments ?? []) {
      if (record?.nodeId != null && String(record.nodeId) === String(sourceNodeId)) {
        kinds.push('APPLIED_FORCE_MOMENT');
      }
    }
  }
  return [...new Set(kinds)].sort(compareAscii);
}

function retargetBoundSegmentEvidence(segment, retiredNodeRecords) {
  const records = segment.meta?.analysis?.forcesMoments;
  if (!Array.isArray(records) || records.length === 0) return segment;
  let changed = false;
  const forcesMoments = records.map((record) => {
    if (record?.nodeId === null || record?.nodeId === undefined) return record;
    const sourceNodeId = String(record.nodeId);
    const target = retiredNodeRecords.get(sourceNodeId) ?? null;
    if (target === null) return record;
    if (target.nearestNodeId === null) {
      fail(
        'BEND_RETOPOLOGY_BOUND_NODE_AMBIGUOUS',
        `Applied force/moment at retired bend corner node ${sourceNodeId} has no unique retained target.`,
        { sourceNodeId, bendSegmentId: target.bendSegmentId, candidates: target.candidates },
      );
    }
    changed = true;
    return Object.freeze({
      ...record,
      nodeId: String(target.nearestNodeId),
      retopologySourceNodeId: sourceNodeId,
    });
  });
  if (!changed) return segment;
  return Object.freeze({
    ...segment,
    meta: Object.freeze({
      ...segment.meta,
      analysis: Object.freeze({ ...segment.meta.analysis, forcesMoments: Object.freeze(forcesMoments) }),
    }),
  });
}

function segmentMeta(source, extra, preserveBoundEvidence) {
  const meta = { ...(source.meta ?? {}), ...extra };
  if (meta.analysis && typeof meta.analysis === 'object') {
    const analysis = { ...meta.analysis };
    if (!preserveBoundEvidence) delete analysis.forcesMoments;
    meta.analysis = Object.freeze(analysis);
  }
  return Object.freeze(meta);
}

function freezeNodeRetargeting(record) {
  return Object.freeze({
    sourceNodeId: record.sourceNodeId,
    bendSegmentId: record.bendSegmentId,
    candidates: Object.freeze(record.candidates.map((row) => Object.freeze({ ...row }))),
    nearestNodeId: record.nearestNodeId,
    codeStationNodeId: record.codeStationNodeId,
    reason: record.reason,
  });
}

function registerTrim(map, segmentId, node, bendSegmentId, side) {
  if (map.has(segmentId)) {
    const existing = map.get(segmentId);
    fail(
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
  if (Math.abs(ordered[1].distance - ordered[0].distance) / scaleValue <= RELATIVE_GEOMETRY_TOLERANCE) return null;
  return ordered[0].nodeId;
}

function requirePointOnOpenSpan(point, start, end, segmentId, side) {
  const vector = subtract(end, start);
  const lengthSquared = dot(vector, vector);
  if (!(lengthSquared > 0)) {
    fail('BEND_RETOPOLOGY_TANGENT_OVERRUN', `Bend ${segmentId} ${side} span has zero length.`, { segmentId, side });
  }
  const fraction = dot(subtract(point, start), vector) / lengthSquared;
  const projected = add(start, scale(vector, fraction));
  const residual = distance(point, projected);
  const spanLength = Math.sqrt(lengthSquared);
  if (!(fraction > 0 && fraction < 1) || residual / spanLength > RELATIVE_GEOMETRY_TOLERANCE) {
    fail(
      'BEND_RETOPOLOGY_TANGENT_OVERRUN',
      `Bend ${segmentId} ${side} tangent is not strictly inside its adjacent source span.`,
      { segmentId, side, fraction, relativeResidual: residual / spanLength },
    );
  }
}

function requireCoincident(left, right, segmentId, label) {
  const delta = distance(left, right);
  const scaleValue = Math.max(norm(left), norm(right), 1);
  if (delta / scaleValue > RELATIVE_GEOMETRY_TOLERANCE) {
    fail(
      'BEND_RETOPOLOGY_TANGENT_ENDPOINT_MISMATCH',
      `Bend ${segmentId} ${label} is inconsistent with the source endpoint.`,
      { segmentId, label, relativeResidual: delta / scaleValue },
    );
  }
}

function requireGeometry(geometry) {
  if (!geometry || geometry.schemaVersion !== 'canonical-geometry-v1'
    || !Array.isArray(geometry.nodes) || !Array.isArray(geometry.segments)) {
    throw new TypeError('retopologiseDeclaredBends requires canonical-geometry-v1 nodes and segments.');
  }
}

function requireEvenChordCount(profile) {
  const value = profile?.bendSeedingSegments?.value;
  if (!Number.isInteger(value) || value < 2 || value % 2 !== 0) {
    fail(
      'BEND_RETOPOLOGY_CHORD_COUNT_INVALID',
      'bendSeedingSegments.value must be an even integer >= 2 so a mid-arc station exists.',
      { value },
    );
  }
  return value;
}

function requirePositiveDeclaredValue(profile, key) {
  const value = profile?.[key]?.value;
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) {
    fail('BEND_RETOPOLOGY_PROFILE_INVALID', `${key}.value must be declared and positive.`, { key, value });
  }
  return value;
}

function requireNode(nodesById, nodeId, segmentId) {
  const node = nodesById.get(String(nodeId)) ?? null;
  if (node === null) {
    fail('BEND_RETOPOLOGY_NODE_MISSING', `Segment ${segmentId} references missing node ${nodeId}.`, { segmentId, nodeId });
  }
  return node;
}

function requirePoint(value, segmentId, field) {
  if (!value || typeof value !== 'object'
    || ![value.x, value.y, value.z].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    fail('BEND_RETOPOLOGY_POINT_INVALID', `Bend ${segmentId} has invalid ${field}.`, { segmentId, field });
  }
  return value;
}

function pointOf(node) {
  return { x: node.x, y: node.y, z: node.z };
}

function distance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
}

function norm(point) {
  return Math.hypot(point.x, point.y, point.z);
}

function absoluteTolerance(left, right) {
  return RELATIVE_GEOMETRY_TOLERANCE * Math.max(norm(left), norm(right), 1);
}

function subtract(left, right) {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function add(left, right) {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function scale(vector, factor) {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

function dot(left, right) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function fail(code, message, data) {
  throw new BendRetopologyError(message, code, data);
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
