import assert from 'node:assert/strict';
import * as basis from '../src/workspace/lfea-bend-factor-authority-control.js';

assert.equal(typeof basis.commitLfeaComponentBasisSelection, 'function',
  'Shared component basis needs an atomic source-owner adoption boundary');
const before = basis.lfeaBendFactorAuthoritySelection();
const selected = { editionProfileId: 'B31_3_2022_B31J_2017', smooth90FlexibilityCorrection: false };
const intake = { semanticHash: 'fnv1a64:1111111111111111' };
const detached = basis.lfeaBendFactorAuthorityForIntake(intake, selected);
assert.equal(detached.editionProfileId, selected.editionProfileId);
assert.deepEqual(basis.lfeaBendFactorAuthoritySelection(), before, 'Preview cannot change shared settings');
assert.throws(() => basis.normalizeLfeaComponentBasisSelection({ ...selected, editionProfileId: 'invented' }));
let adoptions = 0;
assert.throws(() => basis.commitLfeaComponentBasisSelection(selected, {
  expectedSelection: selected, onAdopt() { adoptions++; },
}), /stale/i);
assert.equal(adoptions, 0);
assert.throws(() => basis.commitLfeaComponentBasisSelection(selected, {
  expectedSelection: before, onAdopt() { throw new Error('rejected candidate'); },
}), /rejected candidate/);
assert.deepEqual(basis.lfeaBendFactorAuthoritySelection(), before);
let observed = null;
const owner = {};
const unsubscribe = basis.subscribeLfeaBendFactorAuthoritySelection((selection, context) => {
  observed = { selection, owner: context.owner };
});
const result = basis.commitLfeaComponentBasisSelection(selected, {
  expectedSelection: before, owner,
  onAdopt() { assert.deepEqual(basis.lfeaBendFactorAuthoritySelection(), before); adoptions++; },
});
assert.equal(adoptions, 1);
assert.equal(result.selection.complete, true);
assert.equal(observed.owner, owner);
assert.equal(observed.selection.editionProfileId, selected.editionProfileId);
assert.equal(basis.lfeaBendFactorAuthorityForIntake(intake).semanticHash, detached.semanticHash);
unsubscribe();
console.log('PASS: detached component authority and atomic owner adoption');
