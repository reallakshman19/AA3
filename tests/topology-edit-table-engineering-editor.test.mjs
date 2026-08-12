import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/index.js';
import {
  createTopologyEditSpecificationCatalogue,
} from '../src/workspace/topology-edit/professional/topology-edit-spec-catalog.js';
import {
  topologyEditInlineCatalogueBinding,
} from '../src/workspace/topology-edit/professional/topology-edit-inline-component-operation.js';
import {
  TOPOLOGY_EDIT_TABLE_PROJECTION_SCHEMA,
} from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
import {
  describeTopologyEditTableIntent,
  renderTopologyEditTableEngineeringEditor,
} from '../src/workspace/viewport-productivity/topology-edit-table-engineering-editor.js';
import {
  topologyEditTableTypeSummary,
  topologyEditTableVisibleColumns,
} from '../src/workspace/viewport-productivity/topology-edit-table-properties-view.js';

const CATALOGUE = createTopologyEditSpecificationCatalogue({
  catalogueId: 'TABLE-EDITOR-VALVES', catalogueVersion: '1',
  authority: { sourceId: 'EDITOR-SPEC', sourceVersion: '1', sourceHash: `sha256:${'2'.repeat(64)}` },
  records: [
    valveRecord('BALL-DN80', 80, 'PCL-80', 300),
    valveRecord('BALL-DN100', 100, 'PCL-100', 400),
  ],
});
const BALL_RECORD = CATALOGUE.records.find((record) => record.recordId === 'BALL-DN80');
const BALL = Object.freeze(topologyEditInlineCatalogueBinding(CATALOGUE, BALL_RECORD));

function valveRecord(recordId, nominalSizeMm, pipingClass, valveFaceToFaceMm) {
  return {
    recordId, componentType: 'VALVE', nominalSizeMm,
    outsideDiameterMm: nominalSizeMm === 80 ? 88.9 : 114.3,
    pressureClass: '150', materialSpecification: 'A216-WCB',
    componentLengthMm: valveFaceToFaceMm, componentMassKg: 24,
    endConnectionFrom: 'FLANGED', endConnectionTo: 'FLANGED',
    valveType: 'BALL', valveFaceToFaceMm, pipingClass,
    sourceReference: { documentId: 'EDITOR-SPEC', revision: '1', path: `/valve/${recordId}` },
  };
}
function valveRow(type = 'GATE') {
  return {
    elementType: 'VALVE', targetRevision: 'sha256:valve-r1',
    identity: { canonicalKind: 'EDGE', canonicalId: 'edge:valve', nodeIds: [], portBindings: [] },
    fields: {
      tag: 'V-101', valveType: type, lengthMm: 200, dnInMm: 80,
      pipingClass: 'PCL-80', pressureClass: '150',
      endConnectionFrom: 'FLANGED', endConnectionTo: 'FLANGED',
    },
    custody: { sourceStatus: 'IMPORTED', catalogueAuthority: 'EXACT' },
  };
}
function teeRow() {
  return {
    elementType: 'TEE', targetRevision: 'sha256:tee-r1',
    identity: {
      canonicalKind: 'JUNCTION', canonicalId: 'junction:tee',
      nodeIds: ['node:a', 'node:b', 'node:c'],
      portBindings: [
        { endpoint: 'MULTIPORT', nodeId: 'node:a', portKey: 'tee:port:a' },
        { endpoint: 'MULTIPORT', nodeId: 'node:b', portKey: 'tee:port:b' },
        { endpoint: 'MULTIPORT', nodeId: 'node:c', portKey: 'tee:port:c' },
      ],
    },
    fields: { tag: 'TEE-1', runDnMm: 150, branchDnMm: 100 },
    custody: { sourceStatus: 'IMPORTED', catalogueAuthority: 'UNRESOLVED' },
  };
}
function reducerRow(exact = true, id = 'edge:reducer') {
  return {
    elementType: 'REDUCER', targetRevision: `sha256:${id}-r1`,
    identity: {
      canonicalKind: 'EDGE', canonicalId: id, nodeIds: ['node:c', 'node:d'],
      portBindings: [
        { endpoint: 'FROM', nodeId: 'node:c', portKey: `${id}:from` },
        { endpoint: 'TO', nodeId: 'node:d', portKey: `${id}:to` },
      ],
    },
    fields: { tag: 'RED-1', dnInMm: 100, dnOutMm: 80 },
    custody: {
      sourceStatus: 'IMPORTED', catalogueAuthority: exact ? 'EXACT' : 'UNRESOLVED',
      catalogue: exact ? {
        catalogueHash: 'sha256:red-catalogue', sourceHash: 'sha256:red-source',
        recordId: 'RED-100-80', recordHash: 'sha256:red-record',
      } : null,
    },
  };
}
function tableProjection(rows) {
  const authority = {
    datasetId: 'dataset:editor', datasetVersion: 1,
    sourceHash: 'sha256:source', topologyGraphHash: 'sha256:graph',
    canonicalTopologyHash: 'sha256:canonical',
  };
  const material = { schema: TOPOLOGY_EDIT_TABLE_PROJECTION_SCHEMA, authority, rows };
  return { ...material, projectionHash: semanticHash(material) };
}

test('M06 editor selects compatible immutable BALL records and exposes no catalogue free text', () => {
  const empty = renderTopologyEditTableEngineeringEditor(valveRow(), null, { rows: [] }, CATALOGUE);
  assert.match(empty, /data-table-edit-valve-catalogue-record/);
  assert.match(empty, /BALL-DN80/);
  assert.doesNotMatch(empty, /BALL-DN100/);
  assert.doesNotMatch(empty, /textarea/);
  assert.doesNotMatch(empty, /data-table-edit-valve-catalogue=/);
  assert.match(empty, /record values and hashes are never typed or inferred/);
  assert.match(empty, /Stage GATE → BALL/);
  assert.doesNotMatch(empty, /disabled>Stage GATE/);

  const staged = renderTopologyEditTableEngineeringEditor(valveRow(), {
    intentKind: 'VALVE_REPLACEMENT', requestedValue: { catalogueBinding: BALL },
    geometryPolicy: { anchor: 'TO', propagation: 'UPSTREAM' },
  }, { rows: [] }, CATALOGUE);
  assert.match(staged, /value="BALL-DN80" selected/);
  assert.match(staged, /<option selected>TO<\/option>/);
  assert.match(staged, /<option selected>UPSTREAM<\/option>/);

  const nongate = renderTopologyEditTableEngineeringEditor(valveRow('BALL'), null, { rows: [] }, CATALOGUE);
  assert.match(nongate, /disabled>Stage GATE → BALL/);
  const unavailable = renderTopologyEditTableEngineeringEditor(valveRow(), null, { rows: [] }, null);
  assert.match(unavailable, /Certified catalogue unavailable/);
  assert.match(unavailable, /disabled>Stage GATE → BALL/);
});

test('M10 editor constrains reducers to the explicitly selected branch topology', () => {
  const tee = teeRow();
  const unresolved = reducerRow(false, 'edge:unresolved');
  const projection = tableProjection([tee, reducerRow(true), unresolved]);
  const initial = renderTopologyEditTableEngineeringEditor(tee, null, projection);
  assert.match(initial, /tee:port:a · node:a/);
  assert.match(initial, /tee:port:b · node:b/);
  assert.match(initial, /tee:port:c · node:c/);
  assert.match(initial, /Choose branch port first/);
  assert.doesNotMatch(initial, /value="edge:reducer"/);
  assert.match(initial, /disabled>Stage TEE \/ reducer relation/);

  const staged = renderTopologyEditTableEngineeringEditor(tee, {
    intentKind: 'TEE_REDUCER_RELATION', requestedValue: {
      branchPortKey: 'tee:port:c', reducerEdgeId: 'edge:reducer',
      runNominalSizeMm: 150, teeBranchNominalSizeMm: 100, downstreamNominalSizeMm: 80,
    },
  }, projection);
  assert.match(staged, /value="tee:port:c" selected/);
  assert.match(staged, /value="edge:reducer" selected/);
  assert.doesNotMatch(staged, /edge:unresolved/);
  assert.match(staged, /DN 100 → 80/);
  assert.match(staged, /Certified branch\/reducer relation/);
  assert.doesNotMatch(staged, /disabled>Stage TEE \/ reducer relation/);
  assert.match(staged, /no branch role, orientation, or reducer size is guessed/);
});

test('staged descriptions disclose exact M06 and M10 engineering intent', () => {
  assert.match(describeTopologyEditTableIntent({
    intentKind: 'VALVE_REPLACEMENT', priorValue: { valveType: 'GATE', lengthMm: 200 },
    requestedValue: { catalogueBinding: BALL }, geometryPolicy: { anchor: 'FROM', propagation: 'DOWNSTREAM' },
  }), /GATE → BALL · record BALL-DN80/);
  assert.match(describeTopologyEditTableIntent({
    intentKind: 'TEE_REDUCER_RELATION', requestedValue: {
      branchPortKey: 'tee:port:c', reducerEdgeId: 'edge:reducer',
      runNominalSizeMm: 150, teeBranchNominalSizeMm: 100, downstreamNominalSizeMm: 80,
    },
  }), /DN run 150 \/ branch 100 \/ downstream 80/);
});

test('Table property surface exposes support, flange, valve, tee and bend engineering columns', () => {
  const projection = {
    rows: [
      { elementType: 'SUPPORT', fields: { supportType: 'GUIDE', direction: { x: 0, y: 1, z: 0 }, gapMm: 2, travelMm: 4 } },
      { elementType: 'FLANGE', fields: { flangeType: 'WN', flangeFacing: 'RF', rating: '300' } },
      { elementType: 'VALVE', fields: { valveType: 'GATE', operator: 'HANDWHEEL', flowDirection: 'FROM_TO' } },
      { elementType: 'TEE', fields: { runDnMm: 150, branchDnMm: 100, branchAngleDeg: 90 } },
      { elementType: 'ELBOW', fields: { angleDeg: 90, radiusMm: 228.6, turnIntent: 'LONG_RADIUS' } },
    ],
  };
  const columns = new Set(topologyEditTableVisibleColumns(projection).map((column) => column.key));
  for (const key of [
    'supportType', 'direction', 'gapMm', 'travelMm',
    'flangeType', 'flangeFacing', 'rating',
    'valveType', 'operator', 'flowDirection',
    'runDnMm', 'branchDnMm', 'branchAngleDeg',
    'angleDeg', 'radiusMm', 'turnIntent',
  ]) assert.equal(columns.has(key), true, `missing visible engineering column ${key}`);

  const summary = topologyEditTableTypeSummary(projection.rows);
  assert.match(summary, /SUPPORT 1/);
  assert.match(summary, /FLANGE 1/);
  assert.match(summary, /VALVE 1/);
  assert.match(summary, /TEE 1/);
  assert.match(summary, /BEND\/ELBOW 1/);
});
