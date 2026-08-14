import { deepFreeze, semanticHash } from '../../core/shared-piping-model/index.js';
import {
  assertPipeSegmentCatalogueBinding,
} from './topology-edit-pipe-segment-contract.js';

export const REBIND_PIPE_SPECIFICATION = 'REBIND_PIPE_SPECIFICATION';
export const TOPOLOGY_EDIT_PIPE_SPECIFICATION_REBIND_SCHEMA =
  'TopologyEditPipeSpecificationRebind.v1';

const EPSILON = 1e-9;

export function normalizeTopologyEditPipeSpecificationRebindPayload(input = {}) {
  return deepFreeze({
    schema: TOPOLOGY_EDIT_PIPE_SPECIFICATION_REBIND_SCHEMA,
    edgeId: requiredText(input.edgeId, 'edgeId'),
    catalogueBinding: assertPipeSegmentCatalogueBinding(input.catalogueBinding),
  });
}

export function assertTopologyEditPipeSpecificationRebindTarget(topology, payloadInput) {
  const payload = normalizeTopologyEditPipeSpecificationRebindPayload(payloadInput);
  const edge = exact(topology?.edges, payload.edgeId, 'pipe edge');
  if (token(edge.entityType) !== 'PIPE') {
    throw new RangeError(`TopologyEditPipeSpecificationRebind: ${edge.id} is not a PIPE edge.`);
  }
  const from = exact(topology?.nodes, edge.fromNodeId, 'FROM node');
  const to = exact(topology?.nodes, edge.toNodeId, 'TO node');
  assertKnownEndConnection(edge.endConnectionFrom, payload.catalogueBinding.endConnectionFrom, 'FROM');
  assertKnownEndConnection(edge.endConnectionTo, payload.catalogueBinding.endConnectionTo, 'TO');
  assertDiameterInterface(topology, edge, payload.catalogueBinding.nominalSizeMm);

  const existingRecordHash = edge.catalogueBinding?.recordHash ?? edge.catalogueRecordHash ?? null;
  if (existingRecordHash === payload.catalogueBinding.recordHash) {
    if (!sameSpecification(edge, payload.catalogueBinding)) {
      throw new Error(
        `TopologyEditPipeSpecificationRebind: ${edge.id} differs from its existing catalogue record custody.`,
      );
    }
    throw new RangeError(`TopologyEditPipeSpecificationRebind: ${edge.id} rebind is a no-op.`);
  }
  return deepFreeze({ payload, edge, from, to });
}

export function applyTopologyEditPipeSpecificationRebind(topology, command) {
  const target = assertTopologyEditPipeSpecificationRebindTarget(topology, command.payload);
  const binding = target.payload.catalogueBinding;
  const edges = clone(topology.edges);
  const index = edges.findIndex((edge) => edge.id === target.edge.id);
  const engineeringEvidenceHash = semanticHash({
    edgeId: target.edge.id,
    priorRevision: semanticHash({ kind: 'EDGE', record: target.edge }),
    bindingHash: binding.bindingHash,
  });
  edges[index] = {
    ...target.edge,
    diameterMm: binding.nominalSizeMm,
    nominalSizeMm: binding.nominalSizeMm,
    outsideDiameterMm: binding.outsideDiameterMm,
    diameterAuthority: 'OUTSIDE_DIAMETER',
    schedule: binding.schedule,
    wallThicknessMm: binding.wallThicknessMm,
    materialSpecification: binding.materialSpecification,
    pipingClass: binding.pipingClass,
    pressureClass: binding.pressureClass,
    endConnectionFrom: binding.endConnectionFrom,
    endConnectionTo: binding.endConnectionTo,
    catalogueBinding: binding,
    catalogueId: binding.catalogueId,
    catalogueVersion: binding.catalogueVersion,
    catalogueHash: binding.catalogueHash,
    catalogueSourceHash: binding.catalogueSourceHash,
    catalogueRecordId: binding.recordId,
    catalogueRecordHash: binding.recordHash,
    catalogueSourceReference: binding.sourceReference,
    topologyOperation: REBIND_PIPE_SPECIFICATION,
    lastModifiedByCommandId: command.commandId,
    engineeringEvidenceHash,
    editAncestry: uniqueText([
      ...(target.edge.editAncestry ?? []),
      target.edge.id,
      command.commandId,
    ]),
  };
  return { ...topology, edges };
}

function assertDiameterInterface(topology, edge, requestedNominalSizeMm) {
  const current = positiveMaybe(edge.nominalSizeMm ?? edge.diameterMm);
  if (current !== null && nearlyEqual(current, requestedNominalSizeMm)) return;
  for (const [endpoint, nodeId] of [['FROM', edge.fromNodeId], ['TO', edge.toNodeId]]) {
    const junction = (topology?.junctions ?? []).find((record) => recordNodeIds(record).includes(nodeId));
    if (junction) {
      throw new RangeError(
        `TopologyEditPipeSpecificationRebind: ${edge.id} ${endpoint} endpoint participates in junction ${junction.id}; DN change requires explicit junction/reducer policy.`,
      );
    }
    const peers = (topology?.edges ?? []).filter((candidate) => (
      candidate.id !== edge.id
      && (candidate.fromNodeId === nodeId || candidate.toNodeId === nodeId)
    ));
    for (const peer of peers) {
      const peerSize = endpointNominalSize(peer, nodeId);
      if (peerSize === null) {
        throw new RangeError(
          `TopologyEditPipeSpecificationRebind: ${edge.id} ${endpoint} neighbour ${peer.id} has unresolved DN authority.`,
        );
      }
      if (!nearlyEqual(peerSize, requestedNominalSizeMm)) {
        throw new RangeError(
          `TopologyEditPipeSpecificationRebind: ${edge.id} DN ${requestedNominalSizeMm} is incompatible with ${peer.id} endpoint DN ${peerSize}.`,
        );
      }
    }
  }
}

function endpointNominalSize(edge, nodeId) {
  const primary = positiveMaybe(edge.nominalSizeMm ?? edge.diameterMm);
  const secondary = positiveMaybe(edge.secondaryNominalSizeMm);
  if (token(edge.entityType) !== 'REDUCER' || secondary === null) return primary;
  const reverse = token(edge.insertionDirection) === 'TO_FROM';
  if (edge.fromNodeId === nodeId) return reverse ? secondary : primary;
  if (edge.toNodeId === nodeId) return reverse ? primary : secondary;
  return null;
}

function sameSpecification(edge, binding) {
  return nearlyEqual(edge.nominalSizeMm ?? edge.diameterMm, binding.nominalSizeMm)
    && nearlyEqual(edge.outsideDiameterMm, binding.outsideDiameterMm)
    && nearlyEqual(edge.wallThicknessMm, binding.wallThicknessMm)
    && token(edge.schedule) === token(binding.schedule)
    && token(edge.materialSpecification) === token(binding.materialSpecification)
    && token(edge.pipingClass) === token(binding.pipingClass)
    && token(edge.pressureClass) === token(binding.pressureClass)
    && token(edge.endConnectionFrom) === token(binding.endConnectionFrom)
    && token(edge.endConnectionTo) === token(binding.endConnectionTo);
}
function assertKnownEndConnection(observed, requested, endpoint) {
  if (String(observed ?? '').trim() && token(observed) !== token(requested)) {
    throw new RangeError(
      `TopologyEditPipeSpecificationRebind: ${endpoint} end connection differs from the selected catalogue record.`,
    );
  }
}
function recordNodeIds(record) {
  return [...new Set([
    record?.nodeId, record?.fromNodeId, record?.toNodeId,
    ...(record?.nodeIds ?? []), ...(record?.fromNodeIds ?? []), ...(record?.toNodeIds ?? []),
  ].filter(Boolean))];
}
function exact(rows, id, label) {
  const matches = (rows ?? []).filter((row) => row?.id === id);
  if (matches.length !== 1) {
    throw new RangeError(
      `TopologyEditPipeSpecificationRebind: ${label} ${id} resolved ${matches.length} records.`,
    );
  }
  return matches[0];
}
function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`TopologyEditPipeSpecificationRebind: ${label} is required.`);
  return text;
}
function positiveMaybe(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function nearlyEqual(left, right) {
  const a = Number(left); const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= EPSILON;
}
function token(value) { return String(value ?? '').trim().toUpperCase(); }
function clone(value) { return JSON.parse(JSON.stringify(value ?? [])); }
function uniqueText(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
}
