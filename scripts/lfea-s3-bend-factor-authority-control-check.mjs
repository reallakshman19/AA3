#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  ensureLfeaBendFactorAuthorityControl,
  lfeaBendFactorAuthorityForIntake,
  lfeaBendFactorAuthoritySelection,
} from '../src/workspace/lfea-bend-factor-authority-control.js';

const doc = fakeDocument();
const inputProfile = doc.makeRole('select', 'linear-piping-inputxml-profile');
const accdbProfile = doc.makeRole('select', 'lfea-pipeline-accdb-profile');
let inputRegenerations = 0;
let accdbRegenerations = 0;
inputProfile.addEventListener('change', () => { inputRegenerations += 1; });
accdbProfile.addEventListener('change', () => { accdbRegenerations += 1; });

assert.deepEqual(lfeaBendFactorAuthoritySelection(), {
  editionProfileId: null,
  smooth90FlexibilityCorrection: null,
  complete: false,
}, 'The production UI authority must start unresolved; no code edition or smooth-90 policy may be defaulted.');
assert.equal(lfeaBendFactorAuthorityForIntake({ semanticHash: 'fnv1a64:1111111111111111' }), null,
  'An unresolved UI selection must not manufacture bend factor authority.');

const control = ensureLfeaBendFactorAuthorityControl(doc);
assert.ok(control, 'The shared bend-factor authority control must mount in the LFEA source root.');
assert.equal(ensureLfeaBendFactorAuthorityControl(doc), control,
  'Repeated mount requests must reuse the same control.');
assert.equal(control.snapshot().complete, false);
assert.equal(control.editionSelect.value, '');
assert.equal(control.smoothSelect.value, '');

control.editionSelect.value = 'B31_3_2022_B31J_2017';
control.editionSelect.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
assert.equal(lfeaBendFactorAuthoritySelection().complete, false,
  'Edition alone is insufficient engineering authority.');
assert.equal(inputRegenerations, 1);
assert.equal(accdbRegenerations, 1);

control.smoothSelect.value = 'NO';
control.smoothSelect.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
assert.deepEqual(lfeaBendFactorAuthoritySelection(), {
  editionProfileId: 'B31_3_2022_B31J_2017',
  smooth90FlexibilityCorrection: false,
  complete: true,
});
assert.equal(inputRegenerations, 2,
  'Completing the factor basis must regenerate current InputXML pre-flight.');
assert.equal(accdbRegenerations, 2,
  'Completing the factor basis must regenerate current ACCDB pre-flight.');

const first = lfeaBendFactorAuthorityForIntake({ semanticHash: 'fnv1a64:1111111111111111' });
const replacementSource = lfeaBendFactorAuthorityForIntake({ semanticHash: 'fnv1a64:2222222222222222' });
assert.equal(first.editionProfileId, 'B31_3_2022_B31J_2017');
assert.equal(first.smooth90FlexibilityCorrection, false);
assert.equal(first.sourceEvidence.sourceId, 'LFEA_UI_EXPLICIT_COMPONENT_FACTOR_SELECTION');
assert.notEqual(first.semanticHash, replacementSource.semanticHash,
  'Replacing the source must reseal the visible selection against the replacement intake identity.');
assert.notEqual(first.sourceEvidence.sourceRevision, replacementSource.sourceEvidence.sourceRevision);

control.clear();
assert.equal(lfeaBendFactorAuthoritySelection().complete, false,
  'Clearing either authority basis must return production to unresolved state.');
assert.equal(lfeaBendFactorAuthorityForIntake({ semanticHash: 'fnv1a64:1111111111111111' }), null);
assert.equal(inputRegenerations, 3,
  'Clearing the authority must regenerate InputXML pre-flight and invalidate prior authorization.');
assert.equal(accdbRegenerations, 3,
  'Clearing the authority must regenerate ACCDB pre-flight and invalidate prior authorization.');

console.log(JSON.stringify({
  check: 'lfea-s3-bend-factor-authority-control',
  status: 'PASS',
  startsUnresolved: true,
  sourceBoundAuthority: true,
  inputXmlPreflightRegenerations: inputRegenerations,
  accdbPreflightRegenerations: accdbRegenerations,
}));

function fakeDocument() {
  class FakeEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = options.bubbles === true;
    }
  }
  class FakeElement {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.listeners = new Map();
      this.value = '';
      this.textContent = '';
      this.className = '';
      this.isConnected = false;
    }
    append(...children) {
      for (const child of children) {
        this.children.push(child);
        child.isConnected = this.isConnected;
      }
    }
    prepend(...children) {
      for (const child of [...children].reverse()) {
        this.children.unshift(child);
        child.isConnected = this.isConnected;
      }
    }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    }
    dispatchEvent(event) {
      for (const listener of this.listeners.get(event.type) ?? []) listener(event);
      return true;
    }
    querySelector(selector) {
      const role = /^\[data-role="([^"]+)"\]$/u.exec(selector)?.[1] ?? null;
      if (role === null) return null;
      if (this.dataset.role === role) return this;
      for (const child of this.children) {
        const found = child.querySelector?.(selector) ?? null;
        if (found) return found;
      }
      return null;
    }
  }

  const root = new FakeElement('div');
  root.dataset.role = 'linear-piping-consumer-root';
  root.isConnected = true;
  const doc = {
    defaultView: { Event: FakeEvent },
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: (selector) => root.querySelector(selector),
    makeRole(tagName, role) {
      const element = new FakeElement(tagName);
      element.dataset.role = role;
      root.append(element);
      return element;
    },
  };
  return doc;
}
