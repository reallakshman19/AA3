#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  LinearPipingResultsWorkbenchController,
} from '../src/workspace/linear-piping-results-workbench.js';
import { LINEAR_PIPING_PRERUN_PROFILE_IDS } from '../src/workspace/linear-piping-prerun-check.js';
import { buildM003LiveRunRequest } from './m003-live-run-analysis-fixture.mjs';

class FakeDocument {
  constructor() {
    this.downloads = [];
    this.defaultView = {};
    this.body = new FakeElement('body', this);
    this.documentElement = this.body;
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.type = '';
    this.accept = '';
    this.value = '';
    this.files = [];
    this.href = '';
    this.download = '';
    this.scope = '';
    this.colSpan = 1;
    this.clickCount = 0;
    this.listeners = new Map();
    this.attributes = new Map();
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...children);
  }

  addEventListener(type, callback) {
    const current = this.listeners.get(type) ?? [];
    current.push(callback);
    this.listeners.set(type, current);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  click() {
    this.clickCount += 1;
    if (this.tagName === 'a') {
      this.ownerDocument.downloads.push({ fileName: this.download, href: this.href });
    }
    for (const callback of this.listeners.get('click') ?? []) callback({ currentTarget: this });
  }

  async dispatch(type) {
    await Promise.all(
      (this.listeners.get(type) ?? []).map((callback) => callback({ currentTarget: this })),
    );
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}

class FakeUrlApi {
  createObjectURL() {
    return 'blob:p09';
  }

  revokeObjectURL() {}
}

const documentRef = new FakeDocument();
const panelContainer = documentRef.createElement('div');
documentRef.body.append(panelContainer);
const controller = new LinearPipingResultsWorkbenchController(
  panelContainer,
  documentRef,
  new FakeUrlApi(),
).init();

assert.equal(controller.elements.runButton.textContent, 'Run Analysis');
assert.equal(controller.getSnapshot().runStatus, 'IDLE');
assert.equal(controller.elements.runButton.disabled, true, 'Run must be disabled before pre-flight.');
assert.equal(controller.elements.section.dataset.runAuthorized, 'false');

const request = buildM003LiveRunRequest();
assert.throws(
  () => controller.runRequest(request),
  (error) => error?.code === 'PIPING_RUN_GATE_AUTHORIZATION_REQUIRED'
    && error?.analysisStage === 'PRE_FEA_RUN_GATE',
  'The formerly direct M003 run must no longer execute without a gate receipt.',
);
assert.equal(controller.getLiveRunResult(), null);
controller.clear();

controller.elements.profileSelect.value = LINEAR_PIPING_PRERUN_PROFILE_IDS[1];
const preRun = controller.checkRequest(request);
assert.equal(preRun.status, 'BLOCK', 'The real M003 source must preserve its governed BLOCK result.');
assert.equal(preRun.solveAuthorized, false);
assert.match(preRun.gateSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(preRun.runRequestSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(preRun.cases.length, 2);
assert.ok(preRun.cases.every((entry) => entry.status === 'BLOCK'));
assert.ok(preRun.cases.every((entry) => entry.authorizationId === null));
assert.ok(preRun.cases.every((entry) => entry.blockingFindingIds.length > 0));
assert.ok(preRun.cases.every((entry) => entry.findings.some(
  (finding) => finding.code === 'MODEL_OPERATING_TEMPERATURE_NOT_DECLARED'
    && finding.disposition === 'BLOCK',
)));
assert.ok(preRun.cases.every((entry) => entry.findings.some(
  (finding) => finding.code === 'REQUIRED_CAPABILITY_BLOCKED'
    && finding.message.includes('THERMAL_AUTHORITY'),
)));
assert.equal(controller.elements.runButton.disabled, true);
assert.equal(controller.elements.authorizeButton.hidden, true, 'BLOCK must expose no acceptance control.');
assert.equal(controller.elements.section.dataset.runAuthorized, 'false');
assert.match(flattenText(controller.elements.preRunRoot), /Run authorization: NOT READY/u);
assert.match(flattenText(controller.elements.preRunRoot), /no bypass is available/u);
assert.match(flattenText(controller.elements.preRunRoot), /MODEL_OPERATING_TEMPERATURE_NOT_DECLARED/u);

assert.throws(
  () => controller.authorizePreRun(),
  (error) => error?.code === 'PIPING_RUN_GATE_BLOCK_OVERRIDE_PROHIBITED',
  'Even a programmatic attempt to authorize BLOCK must fail closed.',
);
assert.equal(controller.elements.runButton.disabled, true);

assert.throws(
  () => controller.runRequest(request),
  (error) => error?.code === 'PIPING_RUN_GATE_AUTHORIZATION_REQUIRED'
    && error?.analysisStage === 'PRE_FEA_RUN_GATE',
  'A retained BLOCK pre-run record must still prohibit execution.',
);
assert.equal(controller.getLiveRunResult(), null);
assert.equal(controller.getSnapshot().status, 'EMPTY');

const priorGateHash = controller.getSnapshot().preRunGateSemanticHash;
const changedProfile = controller.elements.profileSelect.value === LINEAR_PIPING_PRERUN_PROFILE_IDS[0]
  ? LINEAR_PIPING_PRERUN_PROFILE_IDS[1]
  : LINEAR_PIPING_PRERUN_PROFILE_IDS[0];
controller.elements.profileSelect.value = changedProfile;
await controller.elements.profileSelect.dispatch('change');
assert.equal(controller.getPreRunCheck(), null);
assert.equal(controller.elements.runButton.disabled, true);
assert.equal(controller.elements.section.dataset.runAuthorized, 'false');
assert.match(controller.getSnapshot().message, /profile changed/u);

console.log(JSON.stringify({
  check: 'linear-piping-live-run-workbench',
  status: 'PASS',
  policy: 'BLOCK_HARD_GATE_NO_BYPASS',
  formerlyExecutableLegacyFixture: 'M003',
  preRunProfile: LINEAR_PIPING_PRERUN_PROFILE_IDS[1],
  blockedCaseIds: preRun.cases.map((entry) => entry.caseId),
  blockingCodes: [...new Set(preRun.cases.flatMap((entry) => entry.findings
    .filter((finding) => finding.disposition === 'BLOCK')
    .map((finding) => finding.code)))].sort(),
  gateSemanticHash: priorGateHash,
  runtimeCreated: false,
}));

function flattenText(node) {
  return [node.textContent, ...node.children.map(flattenText)].join(' ');
}
