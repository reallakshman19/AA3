import { deepFreeze } from '../../../core/shared-piping-model/index.js';

export const TOPOLOGY_EDIT_TABLE_COLUMN_SCHEMA = 'TopologyEditTableColumn.v1';

const COMMON = [
  column('tag', 'Tag', 'text', { frozen: true }),
  column('elementType', 'Type', 'text', { frozen: true }),
  column('line', 'Line', 'text'),
  column('connectFrom', 'Connect From', 'identity', { frozen: true }),
  column('connectTo', 'Connect To', 'identity', { frozen: true }),
  column('dnInMm', 'DN In', 'length'),
  column('dnOutMm', 'DN Out', 'length'),
  column('schedule', 'Schedule', 'text'),
  column('material', 'Material', 'text'),
  column('pipingClass', 'Piping Class', 'text'),
  column('pressureClass', 'Pressure Class', 'text'),
  column('catalogueAuthority', 'Catalogue', 'status', { readOnly: true }),
  column('sourceStatus', 'Source', 'status', { readOnly: true }),
];

const EDGE_GEOMETRY = [
  column('fromNodeId', 'From Node', 'identity', { readOnly: true }),
  column('fromPortKey', 'From Port', 'identity', { readOnly: true }),
  column('fromX', 'From X', 'length', { editor: 'NODE_POSITION' }),
  column('fromY', 'From Y', 'length', { editor: 'NODE_POSITION' }),
  column('fromZ', 'From Z', 'length', { editor: 'NODE_POSITION' }),
  column('toNodeId', 'To Node', 'identity', { readOnly: true }),
  column('toPortKey', 'To Port', 'identity', { readOnly: true }),
  column('toX', 'To X', 'length', { editor: 'NODE_POSITION' }),
  column('toY', 'To Y', 'length', { editor: 'NODE_POSITION' }),
  column('toZ', 'To Z', 'length', { editor: 'NODE_POSITION' }),
  column('deltaX', 'ΔX', 'length', { readOnly: true }),
  column('deltaY', 'ΔY', 'length', { readOnly: true }),
  column('deltaZ', 'ΔZ', 'length', { readOnly: true }),
];

const BY_TYPE = Object.freeze({
  PIPE: [
    ...EDGE_GEOMETRY,
    column('lengthMm', 'Length', 'length', { editor: 'PIPE_LENGTH' }),
    column('slopePercent', 'Slope %', 'number', { readOnly: true }),
  ],
  ELBOW: [
    ...EDGE_GEOMETRY,
    column('angleDeg', 'Angle', 'angle', { readOnly: true }),
    column('radiusMm', 'Radius', 'length', { readOnly: true }),
    column('turnIntent', 'Turn Intent', 'enum', { readOnly: true }),
  ],
  FLANGE: [
    ...EDGE_GEOMETRY,
    column('flangeType', 'Flange Type', 'enum', { readOnly: true }),
    column('flangeFacing', 'Facing', 'enum', { readOnly: true }),
    column('rating', 'Rating', 'text', { readOnly: true }),
  ],
  VALVE: [
    ...EDGE_GEOMETRY,
    column('valveType', 'Valve Type', 'enum', { editor: 'VALVE_REPLACE' }),
    column('endConnectionFrom', 'From End', 'enum'),
    column('endConnectionTo', 'To End', 'enum'),
    column('operator', 'Operator', 'text'),
    column('flowDirection', 'Flow Direction', 'enum'),
    column('componentLengthMm', 'Face-to-Face', 'length', { readOnly: true }),
  ],
  TEE: [
    column('runDnMm', 'Run DN', 'length', { editor: 'BRANCH_RECONFIGURE' }),
    column('branchDnMm', 'Branch DN', 'length', { editor: 'BRANCH_RECONFIGURE' }),
    column('downstreamDnMm', 'Downstream DN', 'length', { editor: 'BRANCH_RECONFIGURE' }),
    column('branchPortKey', 'Branch Port', 'identity', { editor: 'BRANCH_RECONFIGURE' }),
    column('reducerCanonicalId', 'Reducer', 'identity', { editor: 'BRANCH_RECONFIGURE' }),
    column('branchAngleDeg', 'Branch Angle', 'angle', { readOnly: true }),
  ],
  REDUCER: [
    ...EDGE_GEOMETRY,
    column('reducerType', 'Reducer Type', 'enum', { readOnly: true }),
    column('reducerOrientation', 'Orientation', 'enum', { readOnly: true }),
  ],
  SUPPORT: [
    column('hostEntityId', 'Host', 'identity', { readOnly: true }),
    column('stationMm', 'Station', 'length', { editor: 'SUPPORT_PLACEMENT' }),
    column('supportType', 'Support Type', 'enum', { editor: 'SUPPORT_RESTRAINT' }),
    column('direction', 'Direction', 'enum', { editor: 'SUPPORT_RESTRAINT' }),
    column('gapMm', 'Gap', 'length', { editor: 'SUPPORT_RESTRAINT' }),
    column('travelMm', 'Travel', 'length', { editor: 'SUPPORT_RESTRAINT' }),
  ],
  COMPONENT: [...EDGE_GEOMETRY],
  JUNCTION: [],
});

export function topologyEditTableColumnsFor(elementType) {
  const type = String(elementType ?? 'COMPONENT').trim().toUpperCase();
  const specific = BY_TYPE[type] ?? BY_TYPE.COMPONENT;
  return deepFreeze([...COMMON, ...specific]);
}

export function topologyEditTableColumnKeysFor(elementType) {
  return topologyEditTableColumnsFor(elementType).map((descriptor) => descriptor.key);
}

function column(key, label, valueType, options = {}) {
  return deepFreeze({
    schema: TOPOLOGY_EDIT_TABLE_COLUMN_SCHEMA,
    key,
    label,
    valueType,
    frozen: options.frozen === true,
    readOnly: options.readOnly === true,
    editor: options.editor ?? null,
  });
}
