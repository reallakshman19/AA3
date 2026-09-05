/**
 * Governed identity-matrix detection check for EMP.1/LAFEA.1 presentation.
 *
 * The renderer may compact complete declared value-column families and complete
 * X/Y/Z vector triples. It must never infer engineering identity or edit authority
 * from row/column position, and incomplete/incompatible families must fall back.
 */
import assert from 'node:assert/strict';
import {
  collectRenderableMatrixPresentation,
  collectVectorTriples,
} from '../src/workspace/lafea-document-table-form.js';
import {
  lafeaStageInputDescriptors,
  resolveLafeaDescriptorSourceRef,
} from '../src/workspace/lafea-stage-input-descriptors.js';
import { collectDeclaredGovernedMatrices } from '../src/workspace/lafea-governed-matrix-presentation.js';
import { lafeaDescriptorInstances } from '../src/workspace/lafea-document-table-support.js';

const stageOne = lafeaStageInputDescriptors('LAFEA.1');

// --- declared Pressure matrix ----------------------------------------------------
const pressure = stageOne
  .filter((descriptor) => descriptor.presentation.groupId === 'PRESSURE');
assert.equal(pressure.length, 2, 'Pressure retains exactly Internal and External descriptors');

const pressureMatrices = collectDeclaredGovernedMatrices(pressure);
assert.equal(pressureMatrices.size, 2, 'both Pressure descriptors resolve one declared matrix');
const pressureMatrix = pressureMatrices.get('LAFEA.1.pressure.internal');
assert.ok(pressureMatrix);
assert.equal(pressureMatrices.get('LAFEA.1.pressure.external'), pressureMatrix);
assert.equal(pressureMatrix.familyId, 'LAFEA.1.pressure');
assert.equal(pressureMatrix.rowLabel, 'Pressure');
assert.deepEqual(
  pressureMatrix.columns.map(({ columnId, label, descriptor }) => [
    columnId, label, descriptor.descriptorId,
  ]),
  [
    ['INTERNAL', 'Internal', 'LAFEA.1.pressure.internal'],
    ['EXTERNAL', 'External', 'LAFEA.1.pressure.external'],
  ],
);

const pressurePresentation = collectRenderableMatrixPresentation(pressure);
assert.ok(pressurePresentation, 'complete compatible Pressure family matrix-renders');
assert.deepEqual(pressurePresentation.columnLabels, ['Internal', 'External']);

// Five-identity independent presentation oracle. These are existing descriptor
// instances over an ordinary governed document shape; no pressure calculation or
// renderer output is used as its own oracle.
const sourceRef = (id, side) => `SOURCE-PIPE-MODEL@7#pressure.${id}.${side}`;
const pressureDocument = {
  units: { pressure: 'MPa' },
  pressureDefinitions: [
    ['P-CLOSED', 2, 0],
    ['P-OPEN', 2, 0],
    ['P-EXPLICIT', 2, 0],
    ['P-UNSPECIFIED', 2, 0],
    ['P-EXTERNAL', 0, 1],
  ].map(([identity, internal, external]) => ({
    identity,
    internalPressure: { value: internal, sourceRef: sourceRef(identity, 'internal') },
    externalPressure: { value: external, sourceRef: sourceRef(identity, 'external') },
  })),
};
const internalDescriptor = pressureMatrix.columns[0].descriptor;
const externalDescriptor = pressureMatrix.columns[1].descriptor;
const internals = lafeaDescriptorInstances(pressureDocument, internalDescriptor);
const externals = lafeaDescriptorInstances(pressureDocument, externalDescriptor);
assert.equal(internals.length, 5);
assert.equal(externals.length, 5);
assert.equal(internals.length + externals.length, 10, '5x2 keeps ten governed scalar instances');
const valueById = (instances) => Object.fromEntries(instances.map((row) => [row.entityId, row.value]));
assert.deepEqual(valueById(internals), {
  'P-CLOSED': 2, 'P-OPEN': 2, 'P-EXPLICIT': 2, 'P-UNSPECIFIED': 2, 'P-EXTERNAL': 0,
});
assert.deepEqual(valueById(externals), {
  'P-CLOSED': 0, 'P-OPEN': 0, 'P-EXPLICIT': 0, 'P-UNSPECIFIED': 0, 'P-EXTERNAL': 1,
});
assert.equal(
  resolveLafeaDescriptorSourceRef(pressureDocument, internalDescriptor, 'P-EXTERNAL'),
  sourceRef('P-EXTERNAL', 'internal'),
);
assert.equal(
  resolveLafeaDescriptorSourceRef(pressureDocument, externalDescriptor, 'P-EXTERNAL'),
  sourceRef('P-EXTERNAL', 'external'),
);
assert.equal(
  valueById(internals)['P-EXTERNAL'] - valueById(externals)['P-EXTERNAL'],
  -1,
  'P-EXTERNAL independent Pi-Po oracle detects an Internal/External column swap',
);

// --- existing vector grouping remains equivalent -------------------------------
const referencePoints = stageOne
  .filter((descriptor) => descriptor.presentation.groupId === 'REFERENCE_POINTS');
assert.equal(referencePoints.length, 3, 'reference points are one X/Y/Z triple');

const triples = collectVectorTriples(referencePoints);
assert.equal(triples.size, 3, 'every member of the triple maps to the triple');
const triple = triples.get('LAFEA.1.referencePoint.x');
assert.ok(triple, 'the X descriptor resolves its triple');
assert.equal(triple.groupKey, 'LAFEA.1.referencePoint');
assert.equal(triple.label, 'Reference point', 'the axis suffix is dropped from the row label');
assert.equal(triple.axes.X.descriptorId, 'LAFEA.1.referencePoint.x');
assert.equal(triple.axes.Y.descriptorId, 'LAFEA.1.referencePoint.y');
assert.equal(triple.axes.Z.descriptorId, 'LAFEA.1.referencePoint.z');
assert.equal(triples.get('LAFEA.1.referencePoint.z'), triple);
assert.deepEqual(
  collectRenderableMatrixPresentation(referencePoints).columnLabels,
  ['X', 'Y', 'Z'],
);

const loadCases = stageOne
  .filter((descriptor) => descriptor.presentation.groupId === 'LOAD_CASES');
const loadTriples = collectVectorTriples(loadCases);
const loadGroups = new Set([...loadTriples.values()].map((entry) => entry.groupKey));
assert.deepEqual([...loadGroups].sort(), ['LAFEA.1.load.force', 'LAFEA.1.load.moment']);
assert.deepEqual(
  collectRenderableMatrixPresentation(loadCases).columnLabels,
  ['X', 'Y', 'Z'],
);

// --- conservative negative controls ---------------------------------------------
const descriptor = (descriptorId, label) => ({ descriptorId, presentation: { label } });
assert.equal(collectVectorTriples([descriptor('LAFEA.1.pipe.outsideDiameter', 'Pipe outside diameter')]).size, 0);
assert.equal(collectVectorTriples([
  descriptor('a.b.x', 'Point X'), descriptor('a.b.y', 'Point Y'),
]).size, 0, 'a missing axis must not regroup');
assert.equal(collectVectorTriples([
  descriptor('a.b.x', 'Something else'), descriptor('a.b.y', 'Point Y'), descriptor('a.b.z', 'Point Z'),
]).size, 0, 'a label that does not name the axis must not regroup');

assert.equal(
  collectDeclaredGovernedMatrices([internalDescriptor]).size,
  0,
  'a missing declared Pressure column must not regroup',
);

function clone(value) { return structuredClone(value); }
for (const [label, mutate] of [
  ['collectionPath', (item) => { item.target.collectionPath = 'otherPressureDefinitions'; }],
  ['identityKey', (item) => { item.target.identityKey = 'otherIdentity'; }],
  ['unitContract', (item) => { item.unitContract.dimension = 'DIMENSIONLESS'; }],
  ['valueContract', (item) => { item.valueContract.minimum = -1; }],
  ['authority', (item) => { item.authority.sourceStatus = 'OTHER_SOURCE'; }],
]) {
  const incompatibleExternal = clone(externalDescriptor);
  mutate(incompatibleExternal);
  assert.equal(
    collectDeclaredGovernedMatrices([internalDescriptor, incompatibleExternal]).size,
    0,
    `Pressure must fall back when ${label} disagrees`,
  );
  assert.equal(
    collectRenderableMatrixPresentation([internalDescriptor, incompatibleExternal]),
    null,
    `generic matrix renderer must not guess across ${label} disagreement`,
  );
}

const mixed = collectVectorTriples([
  descriptor('one.x', 'One X'), descriptor('one.y', 'One Y'), descriptor('one.z', 'One Z'),
  descriptor('two.x', 'Two X'), descriptor('two.y', 'Two Y'), descriptor('two.z', 'Two Z'),
]);
assert.equal(mixed.size, 6);
assert.notEqual(mixed.get('one.x'), mixed.get('two.x'));
assert.equal(collectVectorTriples([]).size, 0);

console.log('  Pressure: 5 identities x 2 declared columns = 10 governed scalar instances;');
console.log(`  reference points: ${referencePoints.length} descriptors -> 1 row per identity;`
  + ` load cases: ${loadGroups.size} vector families retained`);
console.log('EMP1_GOVERNED_VECTOR_TABLE_CHECK_PASS');
