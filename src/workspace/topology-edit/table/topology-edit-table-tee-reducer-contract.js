import { deepFreeze, semanticHash, stringValue } from '../../../core/shared-piping-model/index.js';
import {
  normalizeTopologyEditJunctionRelationPayload,
} from '../topology-edit-junction-relation-command.js';

export function normalizeTopologyEditTableTeeReducerRelation(requestedValue, row, projection) {
  if (row?.elementType !== 'TEE' || row.identity?.canonicalKind !== 'JUNCTION') {
    throw new RangeError('TopologyEditTableIntent: TEE_REDUCER_RELATION requires an exact TEE junction row.');
  }
  const branchNodeId = requiredText(requestedValue?.branchNodeId, 'requestedValue.branchNodeId');
  const branchPortKey = requiredText(requestedValue?.branchPortKey, 'requestedValue.branchPortKey');
  const runNodeIds = [...(requestedValue?.runNodeIds ?? [])].sort();
  const binding = row.identity.portBindings.find((item) => (
    item.nodeId === branchNodeId && item.portKey === branchPortKey
  ));
  if (!binding) {
    throw new RangeError('TopologyEditTableIntent: branch node/port is not an exact TEE row binding.');
  }
  const expectedRuns = row.identity.nodeIds.filter((id) => id !== branchNodeId).sort();
  if (runNodeIds.length !== 2 || semanticHash(runNodeIds) !== semanticHash(expectedRuns)) {
    throw new RangeError('TopologyEditTableIntent: runNodeIds must be the exact two non-branch TEE nodes.');
  }
  const reducerRow = exactRow(
    projection,
    requestedValue?.reducerCanonicalId ?? requestedValue?.reducerEdgeId,
  );
  if (reducerRow.elementType !== 'REDUCER' || reducerRow.identity.canonicalKind !== 'EDGE') {
    throw new RangeError('TopologyEditTableIntent: M10 requires an exact REDUCER edge row.');
  }
  if (reducerRow.custody.catalogueAuthority !== 'EXACT' || !reducerRow.custody.catalogue) {
    throw new RangeError('TopologyEditTableIntent: M10 reducer catalogue authority must be exact.');
  }
  const catalogue = reducerRow.custody.catalogue;
  const suppliedHash = requestedValue?.reducerCatalogueBinding?.recordHash;
  if (suppliedHash && suppliedHash !== catalogue.recordHash) {
    throw new Error('TopologyEditTableIntent: reducer catalogue record changed before intent rebase.');
  }
  const normalized = normalizeTopologyEditJunctionRelationPayload({
    junctionId: row.identity.canonicalId,
    branchNodeId,
    branchPortKey,
    runNodeIds,
    reducerEdgeId: reducerRow.identity.canonicalId,
    reducerCatalogueBinding: {
      catalogueHash: catalogue.catalogueHash,
      sourceHash: catalogue.sourceHash,
      recordId: catalogue.recordId,
      recordHash: catalogue.recordHash,
      componentType: 'REDUCER',
      fromNominalSizeMm: reducerRow.fields.dnInMm,
      toNominalSizeMm: reducerRow.fields.dnOutMm,
    },
    runNominalSizeMm: requestedValue?.runNominalSizeMm,
    teeBranchNominalSizeMm: requestedValue?.teeBranchNominalSizeMm,
    downstreamNominalSizeMm: requestedValue?.downstreamNominalSizeMm,
    relationPolicy: requestedValue?.relationPolicy ?? 'EXPLICIT_REDUCER',
  });
  return { requestedValue: normalized, geometryPolicy: null };
}

export function topologyEditTableTeeReducerPriorValue(row) {
  return deepFreeze({
    runDnMm: row.fields?.runDnMm,
    branchDnMm: row.fields?.branchDnMm,
    branchAngleDeg: row.fields?.branchAngleDeg,
  });
}

function exactRow(projection, canonicalIdInput) {
  const canonicalId = requiredText(canonicalIdInput, 'canonicalId');
  const matches = projection.rows.filter((row) => row.identity.canonicalId === canonicalId);
  if (matches.length !== 1) {
    throw new RangeError(`TopologyEditTableIntent: canonicalId ${canonicalId} resolved ${matches.length} rows.`);
  }
  return matches[0];
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditTableIntent: ${label} is required.`);
  return text;
}
