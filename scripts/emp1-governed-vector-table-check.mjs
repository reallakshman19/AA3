/**
 * Vector-triple detection check for stage 3c.
 *
 * Batch groups whose descriptors form complete X/Y/Z triples are presented one row
 * per identity with an input per axis, so ten reference points read as ten rows
 * rather than thirty. This guards the detection that decides which descriptors may
 * be regrouped. Detection has to be conservative: anything that does not clearly
 * form a triple must fall through to the existing per-descriptor rendering rather
 * than be reshaped on a guess.
 *
 * The rendered DOM itself is covered by e2e/lafea-empirical-grouped-edit.spec.js,
 * which selects inputs by descriptor and entity id — attributes the regrouping
 * deliberately preserves.
 */
import assert from 'node:assert/strict';
import { collectVectorTriples } from '../src/workspace/lafea-document-table-form.js';
import { lafeaStageInputDescriptors } from '../src/workspace/lafea-stage-input-descriptors.js';

const stageOne = lafeaStageInputDescriptors('LAFEA.1');

// --- real descriptors: the generated vector families are detected ---------------
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
// all three members share one triple object, so a row renders once
assert.equal(triples.get('LAFEA.1.referencePoint.z'), triple);

// load cases carry two separate vector families and both are detected
const loadCases = stageOne
  .filter((descriptor) => descriptor.presentation.groupId === 'LOAD_CASES');
const loadTriples = collectVectorTriples(loadCases);
const loadGroups = new Set([...loadTriples.values()].map((entry) => entry.groupKey));
assert.deepEqual([...loadGroups].sort(), ['LAFEA.1.load.force', 'LAFEA.1.load.moment']);

// --- conservative: anything short of a complete, agreeing triple is left alone ---
const descriptor = (descriptorId, label) => ({
  descriptorId,
  presentation: { label },
});

// a scalar is never a triple
assert.equal(collectVectorTriples([descriptor('LAFEA.1.pipe.outsideDiameter', 'Pipe outside diameter')]).size, 0);

// an incomplete triple stays per-row
assert.equal(collectVectorTriples([
  descriptor('a.b.x', 'Point X'),
  descriptor('a.b.y', 'Point Y'),
]).size, 0, 'a missing axis must not regroup');

// the id suffix and the label must agree, so an unrelated id ending in .x is safe
assert.equal(collectVectorTriples([
  descriptor('a.b.x', 'Something else'),
  descriptor('a.b.y', 'Point Y'),
  descriptor('a.b.z', 'Point Z'),
]).size, 0, 'a label that does not name the axis must not regroup');

// two different families do not merge just because they share axes
const mixed = collectVectorTriples([
  descriptor('one.x', 'One X'), descriptor('one.y', 'One Y'), descriptor('one.z', 'One Z'),
  descriptor('two.x', 'Two X'), descriptor('two.y', 'Two Y'), descriptor('two.z', 'Two Z'),
]);
assert.equal(mixed.size, 6);
assert.notEqual(mixed.get('one.x'), mixed.get('two.x'));
assert.equal(mixed.get('one.x').label, 'One');
assert.equal(mixed.get('two.z').label, 'Two');

// an empty set is not an error
assert.equal(collectVectorTriples([]).size, 0);

console.log(`  reference points: ${referencePoints.length} descriptors -> 1 row per identity;`
  + ` load cases: ${loadGroups.size} vector families detected`);
console.log('EMP1_GOVERNED_VECTOR_TABLE_CHECK_PASS');
