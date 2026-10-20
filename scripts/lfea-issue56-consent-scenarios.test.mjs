import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPreset } from '../src/workspace/lfea-diagnostics/lfea-error-check-preset.js';
import { staleTokenScenario, captureScenarioBaseline, checkScenarioRecovery } from '../src/workspace/lfea-diagnostics/lfea-error-check-scenario-probes.js';

function fixtureOwner() {
  const tokens = new Set();
  const tables = { INPUT_BASIC_ELEMENT_DATA: { rows: [{ ELEMENTID: 1, DIAMETER: 100 }] } };
  const owner = {
    tables, effectiveTables: tables, preFlight: { semanticHash: 'SEALED', status: 'CONDITIONAL' },
    requestedProfileId: 'PROFILE', requestedCaseIds: ['CASE-A'], originalAccdbByteSha256: 'F',
    overrideSet: null, approved: null, notifications: 0,
    getWorkbenchSnapshot() { return { expectedSourceIdentity: 'SOURCE', expectedGeneration: 1, expectedPreparationHash: this.preFlight.semanticHash }; },
    previewWorkbenchBatch(request) {
      assert.equal(request.propertyPatches.length, 1);
      assert.equal(request.expectedPreparationHash, 'SEALED');
      const token = {};
      tokens.add(token);
      return { changed: true, token };
    },
    cancelWorkbenchBatch(token) { tokens.delete(token); },
    applyWorkbenchBatch(token) {
      if (!tokens.has(token)) throw new TypeError('Workbench token is stale, used or unknown.');
      this.notifications++;
    },
  };
  return owner;
}

test('preset never creates or assigns a human reviewer or signoff reason', () => {
  const controller = { options: { getAccdbController: () => fixtureOwner() }, reviewerIdentity: '', reviewReason: '', render() {} };
  applyPreset(controller);
  assert.equal(controller.reviewerIdentity, '');
  assert.equal(controller.reviewReason, '');
  assert.equal(Object.hasOwn(controller.stagedPreset, 'reviewerIdentity'), false);
  assert.equal(Object.hasOwn(controller.stagedPreset, 'reviewReason'), false);
  assert.equal(controller.stagedBatch.propertyPatches.length, 0);
});

test('caller-supplied preset signoff fields are never copied to live review state', () => {
  const controller = { options: { getAccdbController: () => fixtureOwner() }, reviewerIdentity: '', reviewReason: '', render() {} };
  applyPreset(controller, { reviewerIdentity: 'FAKE', reviewReason: 'FAKE', componentBasis: null, requestedProfileId: 'PROFILE', requestedCaseIds: ['CASE-A'] });
  assert.equal(controller.reviewerIdentity, '');
  assert.equal(controller.reviewReason, '');
});

test('real token preview + cancel + apply exercises stale rejection with no model publication', () => {
  const owner = fixtureOwner();
  const before = captureScenarioBaseline(owner, () => ({ editionProfileId: 'EXPLICIT' }));
  const result = staleTokenScenario(owner, () => ({ editionProfileId: 'EXPLICIT' }));
  assert.equal(result.status, 'BLOCK');
  assert.match(result.blocker, /stale|used|unknown/i);
  assert.equal(owner.notifications, 0);
  assert.equal(checkScenarioRecovery(owner, before, () => ({ editionProfileId: 'EXPLICIT' })).recovered, true);
});

test('if apply accepts cancelled token, stale scenario must FAIL, not report BLOCK', () => {
  const owner = fixtureOwner();
  owner.applyWorkbenchBatch = () => { owner.notifications++; };
  const result = staleTokenScenario(owner, () => ({ editionProfileId: 'EXPLICIT' }));
  assert.equal(result.status, 'FAILED');
});

test('recovery cannot claim success after hidden live-model change', () => {
  const owner = fixtureOwner();
  const before = captureScenarioBaseline(owner, () => ({ editionProfileId: 'EXPLICIT' }));
  owner.preFlight = { semanticHash: 'CHANGED' };
  const result = checkScenarioRecovery(owner, before, () => ({ editionProfileId: 'EXPLICIT' }));
  assert.equal(result.recovered, false);
  assert.equal(result.status, 'FAILED');
});

test('recovery cannot claim success after shared-basis change', () => {
  const owner = fixtureOwner();
  const before = captureScenarioBaseline(owner, () => ({ editionProfileId: 'EXPLICIT' }));
  const result = checkScenarioRecovery(owner, before, () => ({ editionProfileId: 'CHANGED' }));
  assert.equal(result.recovered, false);
});
