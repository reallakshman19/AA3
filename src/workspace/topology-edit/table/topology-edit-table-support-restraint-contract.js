import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  normalizeTopologyEditSupportRestraintPayload,
} from '../topology-edit-support-restraint-command.js';

export function normalizeTopologyEditTableSupportRestraintPayload(requestedValue, row) {
  if (row?.elementType !== 'SUPPORT' || row?.identity?.canonicalKind !== 'SUPPORT') {
    throw new RangeError(
      'TopologyEditTableIntent: SUPPORT_RESTRAINT requires an exact canonical SUPPORT row.',
    );
  }
  const normalized = normalizeTopologyEditSupportRestraintPayload({
    ...requestedValue,
    supportId: row.identity.canonicalId,
  });
  return {
    requestedValue: normalized,
    geometryPolicy: null,
  };
}

export function topologyEditTableSupportRestraintPriorValue(row) {
  return deepFreeze({
    supportType: row.fields?.supportType ?? null,
    direction: row.fields?.direction ?? null,
    gapMm: row.fields?.gapMm ?? null,
    travelMm: row.fields?.travelMm ?? null,
  });
}
