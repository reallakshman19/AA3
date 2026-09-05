import assert from 'node:assert/strict';
import {
  EMP1_ANALYTICAL_LAYOUT_REGIONS,
  EMP1_ANALYTICAL_SURFACE_ORDER,
  EMP1_ANALYTICAL_SURFACE_PLACEMENT,
  composeEmp1AnalyticalLayout,
  emp1AnalyticalLayoutPlacementManifest,
} from '../src/workspace/emp1-analytical-layout.js';

const expectedOrder = [
  'workflow',
  'route',
  'source',
  'engineeringEvidence',
  'screeningCustody',
  'correlationAvailability',
  'boundedCorrelation',
  'runConfiguration',
  'transactionSummary',
  'correlationResult',
  'settings',
  'results',
  'lineage',
  'benchmark',
];
assert.deepEqual(EMP1_ANALYTICAL_SURFACE_ORDER, expectedOrder,
  'LEG-003 baseline must retain the complete pre-layout analytical surface manifest');
assert.deepEqual(Object.keys(EMP1_ANALYTICAL_SURFACE_PLACEMENT).sort(), [...expectedOrder].sort(),
  'every baseline surface must have exactly one declared placement');

const regionCounts = {};
for (const entry of emp1AnalyticalLayoutPlacementManifest()) {
  (regionCounts[entry.regionId] ??= []).push(entry);
}
assert.equal(regionCounts.WORKFLOW.length, 1);
assert.equal(regionCounts.PRIMARY_WORK.length, 4);
assert.equal(regionCounts.ENGINEERING_BASIS.length, 5);
assert.equal(regionCounts.FULL_WIDTH_DETAIL.length, 4);
assert.deepEqual(
  regionCounts.PRIMARY_WORK.map((entry) => entry.surfaceId),
  ['route', 'source', 'runConfiguration', 'settings'],
);
assert.deepEqual(
  regionCounts.ENGINEERING_BASIS.map((entry) => entry.surfaceId),
  ['engineeringEvidence', 'correlationAvailability', 'boundedCorrelation', 'transactionSummary', 'lineage'],
);
assert.deepEqual(
  regionCounts.FULL_WIDTH_DETAIL.map((entry) => entry.surfaceId),
  ['screeningCustody', 'correlationResult', 'results', 'benchmark'],
);

const documentRef = new FakeDocument();
const shell = documentRef.createElement('div');
const surfaces = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  documentRef.createElement('section'),
]));
const layout = composeEmp1AnalyticalLayout(shell, surfaces);
assert.equal(layout.presentSurfaceCount, expectedOrder.length);
assert.equal(shell.children.length, 3, 'workflow, lanes and full-width detail are the three shell children');
assert.equal(layout.lanes.children.length, 2, 'desktop lane owner contains Primary and Engineering Basis only');

for (const surfaceId of expectedOrder) {
  const surface = surfaces[surfaceId];
  const regionId = EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId];
  assert.equal(surface.dataset.emp1LayoutSurface, surfaceId);
  assert.equal(surface.dataset.emp1LayoutRegion, regionId);
  assert.equal(surface.parentNode?.dataset.emp1LayoutRegion, regionId,
    `${surfaceId} must be moved exactly once to its declared region`);
}

const optionalAbsent = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  surfaceId === 'benchmark' || surfaceId === 'screeningCustody'
    ? null
    : documentRef.createElement('section'),
]));
assert.equal(composeEmp1AnalyticalLayout(documentRef.createElement('div'), optionalAbsent).presentSurfaceCount, 12,
  'conditional surfaces may be absent without inventing replacement content');

const duplicate = Object.fromEntries(expectedOrder.map((surfaceId) => [
  surfaceId,
  documentRef.createElement('section'),
]));
duplicate.results = duplicate.source;
assert.throws(
  () => composeEmp1AnalyticalLayout(documentRef.createElement('div'), duplicate),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE/u,
  'duplicate engineering surfaces must fail instead of rendering in two regions',
);

const missing = { ...surfaces };
delete missing.lineage;
assert.throws(
  () => composeEmp1AnalyticalLayout(documentRef.createElement('div'), missing),
  /EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH/u,
  'omitting a declared surface key must fail the layout contract',
);

assert.equal(EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK, 'PRIMARY_WORK');
assert.equal(EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS, 'ENGINEERING_BASIS');
assert.equal(EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL, 'FULL_WIDTH_DETAIL');
console.log('EMP1_ANALYTICAL_LAYOUT_CHECK_PASS');

class FakeDocument {
  createElement(tagName) {
    return new FakeNode(this, tagName);
  }
}

class FakeNode {
  constructor(ownerDocument, tagName) {
    this.ownerDocument = ownerDocument;
    this.tagName = String(tagName).toUpperCase();
    this.nodeType = 1;
    this.dataset = {};
    this.className = '';
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (node.parentNode) {
        const index = node.parentNode.children.indexOf(node);
        if (index >= 0) node.parentNode.children.splice(index, 1);
      }
      node.parentNode = this;
      this.children.push(node);
    });
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}
