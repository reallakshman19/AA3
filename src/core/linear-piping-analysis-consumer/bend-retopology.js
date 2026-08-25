import {
  BEND_RETOPOLOGY_TYPES,
  BendRetopologyError,
  compareAscii,
  failBendRetopology,
  requireBendRetopologyChordCount,
  requireBendRetopologyGeometry,
  requireBendRetopologyLengthErrorLimit,
} from './bend-retopology-contract.js';
import {
  absoluteGeometryTolerance,
  buildAccdbBendDefinition,
  buildInputXmlBendDefinition,
  distanceBetween,
} from './bend-retopology-geometry.js';
import {
  collectRetopologyBindingBlockers,
  freezeNodeRetargeting,
  requireBendRetopologyBindingsResolved,
  retargetBoundSegmentEvidence,
  segmentMeta,
} from './bend-retopology-bindings.js';
import { bendSourceIncomingDirection } from './bend-retopology-direction.js';

export { BendRetopologyError, requireBendRetopologyBindingsResolved };

/**
 * Pure source-topology rewrite that replaces evidenced bends by explicit
 * tangent-to-tangent chord chains before generic geometry conditioning.
 * Binding ambiguity is returned as evidence; production structural compilation
 * must call requireBendRetopologyBindingsResolved before using the topology.
 */
export function retopologiseDeclaredBends(geometry, profile) {
  requireBendRetopologyGeometry(geometry);
  const chordCount = requireBendRetopologyChordCount(profile);
  const lengthErrorLimit = requireBendRetopologyLengthErrorLimit(profile);
  const sourceNodesById = new Map(geometry.nodes.map((node) => [String(node.id), node]));
  const sourceSegments = [...geometry.segments]
    .sort((left, right) => compareAscii(left.id, right.id));
  const definitions = [];
  const startTrimBySegmentId = new Map();
  const endTrimBySegmentId = new Map();
  const generatedNodes = new Map();
  const retiredNodeRecords = new Map();
  const repositionedNodes = new Map();

  for (const segment of sourceSegments) {
    if (!BEND_RETOPOLOGY_TYPES.includes(String(segment.type))) continue;
    const tangentBasis = String(segment.meta?.bendTangentBasis ?? '');
    if (tangentBasis === '') continue;
    const shared = {
      segment,
      sourceSegments,
      sourceNodesById,
      startTrimBySegmentId,
      endTrimBySegmentId,
      generatedNodes,
      retiredNodeRecords,
      repositionedNodes,
      chordCount,
      lengthErrorLimit,
    };
    if (tangentBasis === 'ACCDB_CORNER_INTERSECTION_V1') {
      definitions.push(buildAccdbBendDefinition(shared));
    } else if (tangentBasis === 'INPUTXML_TANGENT_TO_TANGENT_V1') {
      definitions.push(buildInputXmlBendDefinition(shared));
    } else {
      failBendRetopology(
        'BEND_RETOPOLOGY_TANGENT_BASIS_UNSUPPORTED',
        `Bend ${segment.id} declares unsupported tangent basis ${tangentBasis}.`,
        { segmentId: String(segment.id), tangentBasis },
      );
    }
  }

  const bindingBlockers = collectRetopologyBindingBlockers({
    retiredNodeRecords,
    sourceNodesById,
    sourceSegments,
  });
  const definitionBySource = new Map(definitions.map((row) => [row.sourceSegmentId, row]));
  const outputSegments = [];
  const spanOrigin = {};
  for (const source of sourceSegments) {
    appendSourceRepresentation({
      source,
      definitionBySource,
      sourceNodesById,
      startTrimBySegmentId,
      endTrimBySegmentId,
      chordCount,
      outputSegments,
      spanOrigin,
    });
  }

  const finalSegments = outputSegments.map((segment) =>
    retargetBoundSegmentEvidence(segment, retiredNodeRecords));
  const referencedNodeIds = new Set(finalSegments.flatMap((segment) => [
    String(segment.startNodeId), String(segment.endNodeId),
  ]));
  const retiredNodeIds = [...retiredNodeRecords.keys()].sort(compareAscii);
  // A repositioned node keeps its identity and everything bound to it; only its
  // coordinate moves, from the working point onto the arc.
  const nodes = geometry.nodes
    .filter((node) => !retiredNodeRecords.has(String(node.id)) || referencedNodeIds.has(String(node.id)))
    .map((node) => {
      const moved = repositionedNodes.get(String(node.id));
      return moved === undefined
        ? node
        : Object.freeze({ ...node, x: moved.x, y: moved.y, z: moved.z, meta: Object.freeze({ ...(node.meta ?? {}), ...moved.meta }) });
    });
  for (const [id, node] of [...generatedNodes.entries()].sort((a, b) => compareAscii(a[0], b[0]))) {
    if (!sourceNodesById.has(id)) nodes.push(node);
  }

  return Object.freeze({
    geometry: Object.freeze({
      ...geometry,
      nodes: Object.freeze(nodes),
      segments: Object.freeze(finalSegments),
    }),
    spanOrigin: Object.freeze({ ...spanOrigin }),
    retiredNodeIds: Object.freeze(retiredNodeIds),
    nodeRetargeting: Object.freeze(Object.fromEntries(
      [...retiredNodeRecords.entries()]
        .sort((a, b) => compareAscii(a[0], b[0]))
        .map(([nodeId, record]) => [nodeId, freezeNodeRetargeting(record)]),
    )),
    bindingBlockers,
    bendRecords: Object.freeze(definitions.map((row) => Object.freeze({
      sourceSegmentId: row.sourceSegmentId,
      tangentBasis: row.tangentBasis,
      incomingDirection: bendSourceIncomingDirection(row, sourceSegments, sourceNodesById),
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
      bindingBlockerCount: bindingBlockers.length,
      sourceSegmentCount: sourceSegments.length,
      producedSegmentCount: finalSegments.length,
    }),
  });
}

function appendSourceRepresentation(input) {
  const sourceId = String(input.source.id);
  const bend = input.definitionBySource.get(sourceId) ?? null;
  const start = input.startTrimBySegmentId.get(sourceId)?.node
    ?? requireNode(input.sourceNodesById, input.source.startNodeId, sourceId);
  const end = input.endTrimBySegmentId.get(sourceId)?.node
    ?? requireNode(input.sourceNodesById, input.source.endNodeId, sourceId);
  const changedBody = String(start.id) !== String(input.source.startNodeId)
    || String(end.id) !== String(input.source.endNodeId) || bend !== null;
  const bodyLength = distanceBetween(start, end);
  const bodyAllowed = bend === null || bend.tangentBasis === 'ACCDB_CORNER_INTERSECTION_V1';
  const bodyExists = bodyAllowed && bodyLength > absoluteGeometryTolerance(start, end);
  let evidenceOwned = false;

  if (bodyExists) {
    const id = changedBody ? `${sourceId}.S1` : sourceId;
    input.outputSegments.push(Object.freeze({
      ...input.source,
      id,
      startNodeId: String(start.id),
      endNodeId: String(end.id),
      type: bend === null ? input.source.type : 'PIPE',
      length: bodyLength,
      meta: segmentMeta(input.source, {
        ...(changedBody ? { parentSegmentId: sourceId } : {}),
        ...(bend === null ? {} : {
          bendIncomingStraightOf: sourceId,
          retopologyRole: 'BEND_INCOMING_STRAIGHT',
        }),
        ...(input.startTrimBySegmentId.has(sourceId) ? {
          retopologyTrimmedStartByBend: input.startTrimBySegmentId.get(sourceId).bendSegmentId,
        } : {}),
      }, true),
    }));
    input.spanOrigin[id] = sourceId;
    evidenceOwned = true;
  }

  if (bend !== null) {
    bend.chordSegments.forEach((chord, index) => {
      const row = Object.freeze({
        ...input.source,
        id: chord.id,
        startNodeId: chord.startNodeId,
        endNodeId: chord.endNodeId,
        type: input.source.type,
        length: chord.length,
        meta: segmentMeta(input.source, {
          parentSegmentId: sourceId,
          bendChordOf: sourceId,
          bendChordIndex: index + 1,
          bendChordCount: input.chordCount,
          bendMidArcNodeId: bend.midArcNodeId,
          retopologyRole: 'BEND_ARC_CHORD',
        }, !evidenceOwned && index === 0),
      });
      input.outputSegments.push(row);
      input.spanOrigin[row.id] = sourceId;
    });
    evidenceOwned = true;
  }
  if (!evidenceOwned) {
    failBendRetopology('BEND_RETOPOLOGY_SOURCE_SPAN_ELIMINATED',
      `Source segment ${sourceId} has no retained span after bend retopology.`, { sourceSegmentId: sourceId });
  }
}

function requireNode(nodesById, nodeId, sourceSegmentId) {
  const node = nodesById.get(String(nodeId)) ?? null;
  if (node === null) {
    failBendRetopology('BEND_RETOPOLOGY_NODE_MISSING',
      `Segment ${sourceSegmentId} references missing node ${nodeId}.`, { sourceSegmentId, nodeId });
  }
  return node;
}
