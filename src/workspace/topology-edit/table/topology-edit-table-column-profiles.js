import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import { topologyEditTableColumnsFor } from './topology-edit-table-columns.js';

export const TOPOLOGY_EDIT_TABLE_COLUMN_PROFILE_SCHEMA = 'TopologyEditTableColumnProfile.v1';

const PROFILE_KEYS = Object.freeze({
  GEOMETRY: Object.freeze([
    'tag', 'elementType', 'line', 'connectFrom', 'connectTo',
    'fromX', 'fromY', 'fromZ', 'toX', 'toY', 'toZ',
    'deltaX', 'deltaY', 'deltaZ',
    'lengthMm', 'slopePercent', 'componentLengthMm', 'angleDeg', 'radiusMm',
  ]),
  SPECIFICATION: Object.freeze([
    'tag', 'elementType', 'line',
    'dnInMm', 'dnOutMm', 'schedule', 'material', 'pipingClass', 'pressureClass',
    'flangeType', 'flangeFacing', 'rating', 'valveType',
    'reducerType', 'reducerOrientation', 'runDnMm', 'branchDnMm', 'downstreamDnMm',
  ]),
  SUPPORT: Object.freeze([
    'tag', 'elementType', 'line',
    'hostEntityId', 'stationMm', 'supportType', 'direction', 'gapMm', 'travelMm',
  ]),
  CONNECTIVITY: Object.freeze([
    'tag', 'elementType', 'line',
    'fromNodeId', 'fromPortKey', 'toNodeId', 'toPortKey',
    'connectFrom', 'connectTo', 'branchPortKey', 'reducerCanonicalId',
    'endConnectionFrom', 'endConnectionTo', 'flowDirection',
  ]),
  AUTHORITY: Object.freeze([
    'tag', 'elementType', 'line', 'catalogueAuthority', 'sourceStatus',
  ]),
  ALL: null,
});

export const TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS = deepFreeze({
  GEOMETRY: [],
  SPECIFICATION: [
    'outsideDiameterMm', 'wallThicknessMm', 'insideDiameterMm', 'catalogueRecordId',
  ],
  SUPPORT: [
    'hostEdgeId', 'supportX', 'supportY', 'supportZ',
  ],
  CONNECTIVITY: [],
  TEE: [],
});

export function topologyEditTableColumnProfile(profileInput, elementTypes = []) {
  const profile = String(profileInput ?? 'ALL').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(PROFILE_KEYS, profile)) {
    throw new RangeError(`TopologyEditTableColumnProfile: unsupported profile ${profile}.`);
  }
  const types = [...new Set((elementTypes ?? []).map((value) => String(value ?? '').trim().toUpperCase()).filter(Boolean))];
  const descriptors = uniqueColumns(types.length ? types : ['COMPONENT', 'PIPE', 'ELBOW', 'FLANGE', 'VALVE', 'TEE', 'REDUCER', 'SUPPORT']);
  const keys = PROFILE_KEYS[profile];
  const columns = keys === null
    ? descriptors
    : keys.map((key) => descriptors.find((column) => column.key === key)).filter(Boolean);
  return deepFreeze({
    schema: TOPOLOGY_EDIT_TABLE_COLUMN_PROFILE_SCHEMA,
    profile,
    columnKeys: columns.map((column) => column.key),
    columns,
    targetFieldGaps: targetGaps(profile),
  });
}

export function topologyEditTableColumnProfileNames() {
  return Object.freeze(Object.keys(PROFILE_KEYS));
}

function uniqueColumns(types) {
  const map = new Map();
  for (const type of types) {
    for (const column of topologyEditTableColumnsFor(type)) {
      if (!map.has(column.key)) map.set(column.key, column);
    }
  }
  return [...map.values()];
}

function targetGaps(profile) {
  if (profile === 'ALL') {
    return [...new Set(Object.values(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS).flat())].sort();
  }
  return [...(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS[profile] ?? [])];
}
