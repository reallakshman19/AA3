import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  normalizeTopologyEditSupportPlacementPayload,
} from '../topology-edit-support-placement-command.js';

export function normalizeTopologyEditTableSupportPlacementPayload(requestedValue, row) {
  if (row?.elementType !== 'SUPPORT' || row?.identity?.canonicalKind !== 'SUPPORT') {
    throw new RangeError(
      'TopologyEditTableIntent: SUPPORT_PLACEMENT requires an exact canonical SUPPORT row.',
    );
  }
  const normalized = normalizeTopologyEditSupportPlacementPayload({
    ...requestedValue,
    supportId: row.identity.canonicalId,
  });
  return {
    requestedValue: normalized,
    geometryPolicy: null,
  };
}

export function topologyEditTableSupportPlacementPriorValue(row) {
  return deepFreeze({
    hostEntityId: row.fields?.hostEntityId ?? null,
    stationMm: finiteOrNull(row.fields?.stationMm),
  });
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
