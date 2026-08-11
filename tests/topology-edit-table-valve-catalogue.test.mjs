import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTopologyEditSpecificationCatalogue,
} from '../src/workspace/topology-edit/professional/topology-edit-spec-catalog.js';
import {
  resolveTopologyEditTableValveCatalogueSelection,
  topologyEditTableValveCatalogueCandidates,
} from '../src/workspace/topology-edit/table/topology-edit-table-valve-catalogue.js';

function catalogue() {
  return createTopologyEditSpecificationCatalogue({
    catalogueId: 'TABLE-VALVE-TEST',
    catalogueVersion: '1',
    authority: {
      sourceId: 'TABLE-VALVE-SPEC',
      sourceVersion: '1',
      sourceHash: `sha256:${'1'.repeat(64)}`,
    },
    records: [
      valve('BALL-DN80-PCL80', 'BALL', 80, 'PCL-80', 300),
      valve('BALL-DN100-PCL100', 'BALL', 100, 'PCL-100', 400),
      valve('GATE-DN80-PCL80', 'GATE', 80, 'PCL-80', 250),
    ],
  });
}

function valve(recordId, valveType, nominalSizeMm, pipingClass, valveFaceToFaceMm) {
  return {
    recordId,
    componentType: 'VALVE',
    nominalSizeMm,
    outsideDiameterMm: nominalSizeMm === 80 ? 88.9 : 114.3,
    pressureClass: '150',
    materialSpecification: 'A216-WCB',
    componentLengthMm: valveFaceToFaceMm,
    componentMassKg: 20,
    valveType,
    valveFaceToFaceMm,
    endConnectionFrom: 'FLANGED',
    endConnectionTo: 'FLANGED',
    pipingClass,
    sourceReference: {
      documentId: 'TABLE-VALVE-SPEC',
      revision: '1',
      path: `/valve/${recordId}`,
    },
  };
}

function row(overrides = {}) {
  return {
    elementType: 'VALVE',
    identity: { canonicalKind: 'EDGE', canonicalId: 'edge:valve' },
    fields: {
      valveType: 'GATE',
      dnInMm: 80,
      pipingClass: 'PCL-80',
      pressureClass: '150',
      endConnectionFrom: 'FLANGED',
      endConnectionTo: 'FLANGED',
      ...overrides,
    },
  };
}

test('Table valve catalogue candidates expose only compatible BALL records', () => {
  const records = topologyEditTableValveCatalogueCandidates({ catalogue: catalogue(), row: row() });
  assert.deepEqual(records.map((record) => record.recordId), ['BALL-DN80-PCL80']);
});

test('Table valve selection reconstructs immutable binding from certified record authority', () => {
  const exactCatalogue = catalogue();
  const selected = resolveTopologyEditTableValveCatalogueSelection({
    catalogue: exactCatalogue,
    row: row(),
    recordId: 'BALL-DN80-PCL80',
  });
  const record = exactCatalogue.records.find((item) => item.recordId === 'BALL-DN80-PCL80');
  assert.equal(selected.catalogueHash, exactCatalogue.catalogueHash);
  assert.equal(selected.sourceHash, exactCatalogue.authority.sourceHash);
  assert.equal(selected.catalogueBinding.catalogueHash, exactCatalogue.catalogueHash);
  assert.equal(selected.catalogueBinding.sourceHash, exactCatalogue.authority.sourceHash);
  assert.equal(selected.catalogueBinding.recordId, record.recordId);
  assert.equal(selected.catalogueBinding.recordHash, record.recordHash);
  assert.equal(selected.catalogueBinding.valveType, 'BALL');
  assert.equal(selected.catalogueBinding.valveFaceToFaceMm, 300);
});

test('Table valve selection fails closed for unknown or incompatible records', () => {
  const exactCatalogue = catalogue();
  assert.throws(() => resolveTopologyEditTableValveCatalogueSelection({
    catalogue: exactCatalogue, row: row(), recordId: 'BALL-DN100-PCL100',
  }), /resolved 0 compatible BALL records/);
  assert.throws(() => resolveTopologyEditTableValveCatalogueSelection({
    catalogue: exactCatalogue, row: row(), recordId: 'NOT-A-RECORD',
  }), /resolved 0 compatible BALL records/);
  assert.throws(() => resolveTopologyEditTableValveCatalogueSelection({
    catalogue: exactCatalogue, row: row(), recordId: '',
  }), /record selection is required/);
});

test('Table valve candidate authority rejects invalid catalogue custody', () => {
  const invalid = { ...catalogue(), catalogueHash: 'sha256:tampered' };
  assert.throws(() => topologyEditTableValveCatalogueCandidates({
    catalogue: invalid,
    row: row(),
  }), /immutable content authority/);
});
