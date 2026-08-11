import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  normalizeTopologyEditInlineReplacementPayload,
} from '../topology-edit-inline-component-replacement.js';

export function normalizeTopologyEditTableCatalogueComponentReplacement(
  requestedValue,
  row,
) {
  if (!['FLANGE', 'REDUCER'].includes(row?.elementType)
    || row?.identity?.canonicalKind !== 'EDGE') {
    throw new RangeError(
      'TopologyEditTableIntent: CATALOGUE_COMPONENT_REPLACEMENT requires an exact FLANGE or REDUCER edge row.',
    );
  }
  const normalized = normalizeTopologyEditInlineReplacementPayload({
    edgeId: row.identity.canonicalId,
    direction: 'FROM_TO',
    catalogueBinding: requestedValue?.catalogueBinding ?? requestedValue,
  });
  if (normalized.catalogueBinding.componentType !== row.elementType) {
    throw new RangeError(
      `TopologyEditTableIntent: exact catalogue component type must remain ${row.elementType}.`,
    );
  }
  return {
    requestedValue: normalized,
    geometryPolicy: null,
  };
}

export function topologyEditTableCatalogueComponentPriorValue(row) {
  return deepFreeze({
    componentType: row.elementType,
    catalogueRecordHash: row.custody?.catalogue?.recordHash ?? null,
    dnInMm: row.fields?.dnInMm ?? null,
    dnOutMm: row.fields?.dnOutMm ?? null,
    flangeType: row.fields?.flangeType ?? null,
    flangeFacing: row.fields?.flangeFacing ?? null,
    rating: row.fields?.rating ?? null,
    reducerType: row.fields?.reducerType ?? null,
    reducerOrientation: row.fields?.reducerOrientation ?? null,
  });
}
