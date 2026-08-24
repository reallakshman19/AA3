import { discretiseBend } from '../centerline-beam-fea/index.js';

/**
 * Rewrite declared bends into tangent-to-tangent arcs before conditioning.
 *
 * A bend only becomes flexible if its curvature is somewhere in the model, and
 * until now it was nowhere: the arc was resolved at ingestion, discarded at
 * preparation, and then reported downstream as a limitation of the solver.
 *
 * Putting it back is not a subdivision. `seedBendSegment` can split a span in
 * place, and that is correct for a source whose bend element already runs
 * tangent to tangent, which InputXML does. An ACCDB bend element runs from its
 * FROM_NODE to the corner intersection, so the arc straddles the corner across
 * this element and the next one:
 *
 *     before   A --------------------- T --------------------- B
 *     after    A ----------- t0 ) arc chords ( t1 ----------- B
 *
 * Three spans change, not one. The incoming span is shortened to the first
 * tangent, the arc is inserted as chords, and the outgoing span is shortened
 * from the second tangent. The corner node T carries no pipe afterwards and is
 * retired, which is why anything bound to it has to be accounted for before it
 * disappears -- see `retiredNodeIds` and the caller's re-target rules. An
 * omitted or silently moved support changes every reaction downstream of it and
 * still produces a result that looks entirely reasonable.
 *
 * Pure: the input geometry is never mutated. Ordering is deterministic (source
 * segment order, then chord index) so semantic hashes are stable across runs.
 */

export const BEND_RETOPOLOGY_SCHEMA = 'lfea-bend-retopology/v1';
export const ACCDB_TANGENT_BASIS = 'ACCDB_CORNER_INTERSECTION_V1';
export const INPUTXML_TANGENT_BASIS = 'INPUTXML_TANGENT_TO_TANGENT_V1';

const COINCIDENT_TOLERANCE = 1e-9;

export class BendRetopologyError extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = 'BendRetopologyError';
    this.code = code;
    this.data = data ?? null;
  }
}

function fail(code, message, data) {
  throw new BendRetopologyError(message, code, data);
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function finitePoint(point) {
  return Boolean(point)
    && [point.x, point.y, point.z].every((value) => typeof value === 'number' && Number.isFinite(value));
}

function declaredArc(segment) {
  const meta = segment?.meta ?? {};
  if (!finitePoint(meta.bendArcCentre)) return null;
  if (!finitePoint(meta.bendTangentStart) || !finitePoint(meta.bendTangentEnd)) return null;
  if (meta.bendTangentBasis !== ACCDB_TANGENT_BASIS && meta.bendTangentBasis !== INPUTXML_TANGENT_BASIS) {
    return null;
  }
  return {
    centre: meta.bendArcCentre,
    tangentStart: meta.bendTangentStart,
    tangentEnd: meta.bendTangentEnd,
    basis: meta.bendTangentBasis,
    radius: meta.bendComputedRadius,
  };
}

/**
 * Chord spans carry no arc metadata of their own.
 *
 * They are straight pieces of an already-represented curve. Leaving the centre
 * on them would invite conditioning to discretise the same arc a second time,
 * and would leave the flexibility ownership question ambiguous for S3.
 */
function chordSegment(parent, index, fromNodeId, toNodeId, length) {
  const meta = { ...(parent.meta ?? {}) };
  delete meta.bendArcCentre;
  delete meta.bendComputedRadius;
  delete meta.bendTangentStart;
  delete meta.bendTangentEnd;
  delete meta.bendTangentBasis;
  return Object.freeze({
    ...parent,
    id: `${parent.id}/B${index}`,
    type: 'PIPE',
    startNodeId: fromNodeId,
    endNodeId: toNodeId,
    length,
    meta: Object.freeze({
      ...meta,
      parentSegmentId: parent.id,
      bendChordOf: parent.id,
      bendChordIndex: index,
      bendArcRepresented: true,
    }),
  });
}

function shortened(segment, fromNodeId, toNodeId, length, role) {
  const meta = { ...(segment.meta ?? {}) };
  delete meta.bendArcCentre;
  delete meta.bendComputedRadius;
  delete meta.bendTangentStart;
  delete meta.bendTangentEnd;
  delete meta.bendTangentBasis;
  return Object.freeze({
    ...segment,
    type: segment.type === 'BEND' ? 'PIPE' : segment.type,
    startNodeId: fromNodeId,
    endNodeId: toNodeId,
    length,
    meta: Object.freeze({ ...meta, bendTangentRole: role, bendArcRepresented: true }),
  });
}

/**
 * @param {object} geometry Canonical geometry carrying resolved bend arcs.
 * @param {{bendChordCount:number, bendLengthErrorLimit:number}} profile
 * @returns {Readonly<object>} `{ schema, geometry, spanOrigin, retiredNodeIds, bends }`
 */
export function retopologiseDeclaredBends(geometry, profile) {
  requireProfile(profile);
  const nodesById = new Map(geometry.nodes.map((node) => [String(node.id), node]));
  const segments = [...geometry.segments];
  const touchingByNode = new Map();
  for (const segment of segments) {
    for (const nodeId of [String(segment.startNodeId), String(segment.endNodeId)]) {
      if (!touchingByNode.has(nodeId)) touchingByNode.set(nodeId, []);
      touchingByNode.get(nodeId).push(segment);
    }
  }

  const addedNodes = [];
  const retiredNodeIds = new Set();
  const spanOrigin = new Map();
  const bends = [];
  // A span may be trimmed at BOTH ends: at its start by the arc of the bend
  // that precedes it, and at its end by its own arc. Back-to-back bends are
  // ordinary piping -- BM4_L has three -- and rewriting each bend against the
  // original geometry strands the second one's start node.
  const trimStart = new Map();
  const trimEnd = new Map();
  const chordsAfter = new Map();
  const replaceWhole = new Set();

  const candidates = segments
    .filter((segment) => declaredArc(segment) !== null)
    .sort((left, right) => compareAscii(String(left.id), String(right.id)));

  for (const segment of candidates) {
    const arc = declaredArc(segment);
    const parentId = String(segment.id);
    const chain = discretiseBend(arc.tangentStart, arc.tangentEnd, arc.centre, profile.bendChordCount);
    if (!(chain.lengthErrorFraction <= profile.bendLengthErrorLimit)) {
      fail('BEND_RETOPOLOGY_CHORD_ERROR_EXCEEDS_LIMIT',
        `Bend ${parentId} chord shortfall ${chain.lengthErrorFraction} exceeds limit ${profile.bendLengthErrorLimit}.`,
        { segmentId: parentId, lengthErrorFraction: chain.lengthErrorFraction });
    }
    const startNode = nodesById.get(String(segment.startNodeId));
    const cornerNode = nodesById.get(String(segment.endNodeId));
    if (!startNode || !cornerNode) {
      fail('BEND_RETOPOLOGY_NODE_MISSING', `Bend ${parentId} endpoints are not both present.`, { segmentId: parentId });
    }

    const startsAtTangent = distance(startNode, arc.tangentStart) <= COINCIDENT_TOLERANCE;
    const endsAtTangent = distance(cornerNode, arc.tangentEnd) <= COINCIDENT_TOLERANCE;
    const arcStartNodeId = startsAtTangent ? String(startNode.id) : `${parentId}/T0`;
    const arcEndNodeId = endsAtTangent ? String(cornerNode.id) : `${parentId}/T1`;
    if (!startsAtTangent) {
      addedNodes.push(freezeNode(arcStartNodeId, arc.tangentStart, { bendTangentOf: parentId, tangentRole: 'START' }));
    }
    if (!endsAtTangent) {
      addedNodes.push(freezeNode(arcEndNodeId, arc.tangentEnd, { bendTangentOf: parentId, tangentRole: 'END' }));
    }

    const interiorIds = [];
    for (let index = 1; index < chain.points.length - 1; index += 1) {
      const nodeId = `${parentId}/N${index}`;
      interiorIds.push(nodeId);
      addedNodes.push(freezeNode(nodeId, chain.points[index], { bendChordOf: parentId, chordNodeIndex: index }));
    }
    const arcNodeIds = [arcStartNodeId, ...interiorIds, arcEndNodeId];
    const chords = [];
    for (let index = 1; index < arcNodeIds.length; index += 1) {
      chords.push(chordSegment(segment, index, arcNodeIds[index - 1], arcNodeIds[index],
        distance(chain.points[index - 1], chain.points[index])));
    }

    let successorId = null;
    if (endsAtTangent) {
      // The span already runs tangent to tangent, so the arc replaces it whole.
      replaceWhole.add(parentId);
    } else {
      // The arc ends inside the following span. Exactly one other span may meet
      // the corner: more than one is a junction, and retiring a junction node
      // would silently delete a load path.
      const others = (touchingByNode.get(String(cornerNode.id)) ?? [])
        .filter((row) => String(row.id) !== parentId);
      if (others.length !== 1) {
        fail('BEND_RETOPOLOGY_AMBIGUOUS_SUCCESSOR',
          `Bend ${parentId} corner node ${cornerNode.id} joins ${others.length} other spans; exactly one is required to place the arc.`,
          { segmentId: parentId, cornerNodeId: String(cornerNode.id), otherSpanCount: others.length });
      }
      const successor = others[0];
      successorId = String(successor.id);
      if (String(successor.startNodeId) !== String(cornerNode.id)) {
        fail('BEND_RETOPOLOGY_SUCCESSOR_ORIENTATION',
          `Bend ${parentId} successor ${successorId} does not start at the corner node.`,
          { segmentId: parentId, successorId });
      }
      // The corner carries no pipe once the arc is placed, so it is retired.
      // If anything is attached to it, it must not be silently moved: a support
      // that relocates changes the load path and every reaction downstream of
      // it, and the result still looks entirely reasonable. Where the re-target
      // is not unambiguous this model blocks and names the node, because that
      // is an engineering decision rather than a default an adapter may pick.
      requireUnboundCorner(cornerNode, parentId);
      trimEnd.set(parentId, arcStartNodeId);
      trimStart.set(successorId, arcEndNodeId);
      retiredNodeIds.add(String(cornerNode.id));
    }
    chordsAfter.set(parentId, chords);

    bends.push(Object.freeze({
      segmentId: parentId,
      basis: arc.basis,
      chordCount: chords.length,
      arcLength: chain.arcLength,
      chordLength: chain.chordLength,
      lengthErrorFraction: chain.lengthErrorFraction,
      radius: chain.radius,
      sweepAngle: chain.sweepAngle,
      midArcNodeId: arcNodeIds[arcNodeIds.length >> 1],
      retiredCornerNodeId: endsAtTangent ? null : String(cornerNode.id),
      successorSegmentId: successorId,
      addedNodeIds: Object.freeze([...interiorIds]),
    }));
  }

  if (bends.length === 0) {
    return Object.freeze({
      schema: BEND_RETOPOLOGY_SCHEMA,
      geometry,
      spanOrigin: Object.freeze(new Map()),
      retiredNodeIds: Object.freeze([]),
      bends: Object.freeze([]),
    });
  }

  const nodeIndex = new Map(nodesById);
  for (const node of addedNodes) nodeIndex.set(String(node.id), node);

  const rewrittenSegments = [];
  for (const segment of segments) {
    const id = String(segment.id);
    const startId = trimStart.get(id) ?? String(segment.startNodeId);
    const endId = trimEnd.get(id) ?? String(segment.endNodeId);
    if (!replaceWhole.has(id)) {
      const from = nodeIndex.get(startId);
      const to = nodeIndex.get(endId);
      if (!from || !to) {
        fail('BEND_RETOPOLOGY_NODE_MISSING', `Span ${id} trimmed onto a node that does not exist.`,
          { segmentId: id, startId, endId });
      }
      const length = distance(from, to);
      if (length > COINCIDENT_TOLERANCE) {
        const untouched = startId === String(segment.startNodeId) && endId === String(segment.endNodeId);
        const role = trimStart.has(id) && trimEnd.has(id)
          ? 'LEAD_BETWEEN'
          : trimStart.has(id) ? 'LEAD_OUT' : 'LEAD_IN';
        const trimmed = untouched ? segment : shortened(segment, startId, endId, length, role);
        rewrittenSegments.push(trimmed);
        spanOrigin.set(String(trimmed.id), id);
      } else if (!chordsAfter.has(id)) {
        fail('BEND_RETOPOLOGY_SPAN_CONSUMED',
          `Span ${id} is fully consumed by adjacent bend tangents and carries no arc of its own.`,
          { segmentId: id });
      }
    }
    for (const chord of chordsAfter.get(id) ?? []) {
      rewrittenSegments.push(chord);
      spanOrigin.set(String(chord.id), id);
    }
  }

  const keptNodes = geometry.nodes.filter((node) => !retiredNodeIds.has(String(node.id)));
  const nextGeometry = Object.freeze({
    ...geometry,
    nodes: Object.freeze([...keptNodes, ...addedNodes]),
    segments: Object.freeze(rewrittenSegments),
  });
  requireClosedTopology(nextGeometry, new Map(segments.map((s, i) => [String(s.id), i])));

  return Object.freeze({
    schema: BEND_RETOPOLOGY_SCHEMA,
    geometry: nextGeometry,
    spanOrigin: Object.freeze(spanOrigin),
    retiredNodeIds: Object.freeze([...retiredNodeIds].sort(compareAscii)),
    bends: Object.freeze(bends),
  });
}

/** Every span endpoint must still resolve to a node that exists. */
function requireClosedTopology(geometry, bySource) {
  const ids = new Set(geometry.nodes.map((node) => String(node.id)));
  const dangling = [];
  for (const segment of geometry.segments) {
    for (const nodeId of [String(segment.startNodeId), String(segment.endNodeId)]) {
      if (!ids.has(nodeId)) dangling.push({ segmentId: String(segment.id), nodeId });
    }
  }
  if (dangling.length > 0) {
    fail('BEND_RETOPOLOGY_DANGLING_SPAN',
      'Re-topologised geometry references nodes that no longer exist.',
      { dangling: dangling.slice(0, 8), sourceSpanCount: bySource.size });
  }
}

/**
 * A node about to be retired must be carrying nothing.
 *
 * `restraint` covers the conditioned classification and `meta.restraints`
 * covers the retained source rows; either one means a support is attached.
 * Both are checked because a model can carry the source row while the
 * classification is still FREE, and dropping that would be just as wrong.
 */
function requireUnboundCorner(cornerNode, segmentId) {
  const declaredRows = Array.isArray(cornerNode?.meta?.restraints) ? cornerNode.meta.restraints.length : 0;
  const classified = cornerNode?.restraint !== undefined
    && cornerNode.restraint !== null
    && String(cornerNode.restraint) !== 'FREE';
  if (declaredRows === 0 && !classified) return;
  fail('BEND_RETOPOLOGY_RETIRED_NODE_IS_BOUND',
    `Bend ${segmentId} would retire corner node ${cornerNode.id}, which carries a restraint. `
    + 'Re-targeting a support is an engineering decision: retain the corner as a station or declare the target explicitly.',
    {
      segmentId,
      cornerNodeId: String(cornerNode.id),
      restraintClassification: cornerNode.restraint ?? null,
      declaredRestraintRows: declaredRows,
    });
}

function freezeNode(id, point, meta) {
  return Object.freeze({
    id,
    x: point.x,
    y: point.y,
    z: point.z,
    restraint: 'FREE',
    meta: Object.freeze({ ...meta }),
  });
}

function requireProfile(profile) {
  const count = profile?.bendChordCount;
  if (!Number.isInteger(count) || count < 2) {
    fail('BEND_RETOPOLOGY_PROFILE_INVALID', 'profile.bendChordCount must be an integer of at least 2.', { profile });
  }
  if (count % 2 !== 0) {
    // An odd chord count has no node at the middle of the arc, and the middle
    // of the arc is where a code stress check reads a bend.
    fail('BEND_RETOPOLOGY_PROFILE_INVALID', 'profile.bendChordCount must be even for an exact mid-arc station.', { profile });
  }
  const limit = profile?.bendLengthErrorLimit;
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0 || limit >= 1) {
    fail('BEND_RETOPOLOGY_PROFILE_INVALID', 'profile.bendLengthErrorLimit must be a fraction in (0,1).', { profile });
  }
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
