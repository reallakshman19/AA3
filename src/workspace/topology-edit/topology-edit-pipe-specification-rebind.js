import { deepFreeze, semanticHash } from '../../core/shared-piping-model/index.js';
import {
  assertPipeSegmentCatalogueBinding,
} from './topology-edit-pipe-segment-contract.js';

export const REBIND_PIPE_SPECIFICATION = 'REBIND_PIPE_SPECIFICATION';
export const TOPOLOGY_EDIT_PIPE_SPECIFICATION_REBIND_SCHEMA =
  'TopologyEditPipeSpecificationRebind.v1';

const EPSILON = 1e-9;
const SPECIFICATION_MUTABLE_KEYS = new Set([
  'diameterMm', 'nominalSizeMm', 'outsideDiameterMm', 'diameterAuthority',
  'schedule', 'wallThicknessMm', 'materialSpecification', 'pipingClass', 'pressureClass',
  'endConnectionFrom', 'endConnectionTo',
  'catalogueBinding', 'catalogueId', 'catalogueVersion', 'catalogueHash',
  'catalogueSourceHash', 'catalogueRecordId', 'catalogueRecordHash',
  'catalogueSourceReference', 'topologyOperation', 'lastModifiedByCommandId',
  'engineeringEvidenceHash', 'editAncestry',
]);

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
  const engineeringEvidenceHash = specificationEvidenceHash(target.edge, binding);
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

export function validateTopologyEditPipeSpecificationRebindEffect(candidate) {
  if (candidate?.commandType !== REBIND_PIPE_SPECIFICATION) return [];
  let payload;
  try {
    payload = normalizeTopologyEditPipeSpecificationRebindPayload(candidate.resolvedPayload);
  } catch (error) {
    return [finding(
      'REBIND_PIPE_SPECIFICATION_PAYLOAD_INVALID',
      error instanceof Error ? error.message : String(error),
    )];
  }
  const prior = (candidate.resolvedTargets?.edges ?? [])
    .find((target) => target?.id === payload.edgeId)?.record ?? null;
  const edge = (candidate.canonicalTopology?.edges ?? [])
    .find((record) => record?.id === payload.edgeId) ?? null;
  if (!prior || !edge) {
    return [finding(
      'REBIND_PIPE_SPECIFICATION_TARGET_INVALID',
      'REBIND_PIPE_SPECIFICATION requires one exact resolved prior edge and one resulting edge.',
      [payload.edgeId],
    )];
  }
  const delta = candidate.topologyDelta ?? {};
  const unchangedCollections = ['nodes', 'junctions', 'supports', 'boundaries', 'rigids', 'bends'];
  const exactDelta = unchangedCollections.every((key) => noChanges(delta[key]))
    && (delta.edges?.addedIds ?? []).length === 0
    && (delta.edges?.removedIds ?? []).length === 0
    && semanticHash(delta.edges?.changedIds ?? []) === semanticHash([payload.edgeId]);
  if (!exactDelta) {
    return [finding(
      'REBIND_PIPE_SPECIFICATION_DELTA_INVALID',
      'REBIND_PIPE_SPECIFICATION must change exactly one existing PIPE edge and no node, geometry, junction, support, boundary, rigid, or bend record.',
      [payload.edgeId, ...changedIds(delta)],
    )];
  }
  if (semanticHash(stripSpecificationFields(edge)) !== semanticHash(stripSpecificationFields(prior))) {
    return [finding(
      'REBIND_PIPE_SPECIFICATION_NON_SPEC_FIELD_CHANGED',
      'REBIND_PIPE_SPECIFICATION changed PIPE identity, geometry, connectivity, or another non-specification field.',
      [payload.edgeId],
    )];
  }
  const binding = payload.catalogueBinding;
  const expectedAncestry = uniqueText([
    ...(prior.editAncestry ?? []), prior.id, candidate.commandId,
  ]);
  const exactAuthority = sameSpecification(edge, binding)
    && edge.diameterAuthority === 'OUTSIDE_DIAMETER'
    && edge.catalogueBinding?.bindingHash === binding.bindingHash
    && edge.catalogueId === binding.catalogueId
    && edge.catalogueVersion === binding.catalogueVersion
    && edge.catalogueHash === binding.catalogueHash
    && edge.catalogueSourceHash === binding.catalogueSourceHash
    && edge.catalogueRecordId === binding.recordId
    && edge.catalogueRecordHash === binding.recordHash
    && semanticHash(edge.catalogueSourceReference) === semanticHash(binding.sourceReference)
    && edge.topologyOperation === REBIND_PIPE_SPECIFICATION
    && edge.lastModifiedByCommandId === candidate.commandId
    && edge.engineeringEvidenceHash === specificationEvidenceHash(prior, binding)
    && semanticHash(edge.editAncestry ?? []) === semanticHash(expectedAncestry);
  return exactAuthority ? [] : [finding(
    'REBIND_PIPE_SPECIFICATION_AUTHORITY_INVALID',
    'REBIND_PIPE_SPECIFICATION candidate differs from its exact catalogue binding or immutable engineering evidence.',
    [payload.edgeId],
  )];
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
function specificationEvidenceHash(edge, binding) {
  return semanticHash({
    edgeId: edge.id,
    priorRevision: semanticHash({ kind: 'EDGE', record: edge }),
    bindingHash: binding.bindingHash,
  });
}
function stripSpecificationFields(edge) {
  return Object.fromEntries(Object.entries(edge ?? {})
    .filter(([key]) => !SPECIFICATION_MUTABLE_KEYS.has(key)));
}
function noChanges(delta = {}) {
  return [
    ...(delta?.addedIds ?? []),
    ...(delta?.removedIds ?? []),
    ...(delta?.changedIds ?? []),
  ].length === 0;
}
function changedIds(delta) {
  return Object.values(delta ?? {}).flatMap((entry) => [
    ...(entry?.addedIds ?? []), ...(entry?.removedIds ?? []), ...(entry?.changedIds ?? []),
  ]).filter(Boolean);
}
function finding(code, message, targetIds = []) {
  return { code, message, targetIds: [...new Set(targetIds.filter(Boolean))].sort() };
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
