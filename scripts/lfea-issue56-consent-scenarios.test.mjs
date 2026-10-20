import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPreset } from '../src/workspace/lfea-diagnostics/lfea-error-check-preset.js';
import { staleTokenScenario, captureScenarioBaseline, checkScenarioRecovery } from '../src/workspace/lfea-diagnostics/lfea-error-check-scenario-probes.js';
import { renderReviewSheet } from '../src/workspace/lfea-diagnostics/lfea-error-check-review-sheet.js';

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

test('adversarial source diagnostic text in review sheet renders safely without HTML injection', () => {
  const host = {
    children: [],
    append(...kids) { this.children.push(...kids); },
    replaceChildren(...kids) { this.children = kids; },
    appendChild(child) { this.children.push(child); },
  };
  const doc = {
    createElement(tag) {
      return {
        tagName: tag,
        children: [],
        attributes: {},
        dataset: {},
        style: {},
        append(...kids) { this.children.push(...kids); },
        replaceChildren(...kids) { this.children = kids; },
        addEventListener() {},
      };
    },
    createTextNode(text) { return { text }; },
  };
  const adversarialGroup = {
    groupId: 'ADV-1',
    code: '<script>alert("xss")</script>',
    plainMessage: '<img src=x onerror=alert(1)>Malicious input',
    disposition: 'CONDITIONAL',
    limitationKind: 'PROCESS_NOTE',
    occurrences: 1,
  };
  const presentation = { sections: [{ groups: [adversarialGroup] }] };
  const controller = { reviewSheetOpen: true, reviewerIdentity: '', reviewReason: '', render() {} };
  renderReviewSheet(doc, controller, host, presentation);
  assert.ok(host.children.length > 0, 'Review sheet rendered');
  const card = host.children[0];
  const table = card.children.find((c) => c.className === 'lfea-workbench-review-table');
  assert.ok(table);
  const tbody = table.children.find((c) => c.tagName === 'tbody');
  assert.ok(tbody);
  const row = tbody.children[0];
  const strong = row.children[0].children[0];
  assert.equal(strong.textContent, '<script>alert("xss")</script>');
  assert.equal(row.children[2].textContent, '<img src=x onerror=alert(1)>Malicious input');
});
