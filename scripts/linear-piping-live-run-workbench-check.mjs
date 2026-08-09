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

  get childElementCount() {
    return this.children.length;
  }
}

class FakeUrlApi {
  createObjectURL() {
    return 'blob:m003';
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
assert.equal(controller.elements.importButton.textContent, 'Import Sealed Result Package');
assert.equal(controller.getSnapshot().runStatus, 'IDLE');
assert.equal(controller.elements.runButton.disabled, true, 'Run must be disabled before pre-flight');
assert.equal(controller.elements.section.dataset.runAuthorized, 'false');

const request = buildM003LiveRunRequest();
assert.throws(
  () => controller.runRequest(request),
  (error) => error?.code === 'PIPING_RUN_GATE_AUTHORIZATION_REQUIRED'
    && error?.analysisStage === 'PRE_FEA_RUN_GATE',
  'Direct workbench execution without a pre-run authorization must fail before runtime creation.',
);
assert.equal(controller.getLiveRunResult(), null);
controller.clear();

// Use the disclosed generic profile deliberately so representable engineering
// limitations are reviewable rather than silently treated as PASS. BLOCK still
// has no authorization path under either profile.
controller.elements.profileSelect.value = LINEAR_PIPING_PRERUN_PROFILE_IDS[1];
const preRun = controller.checkRequest(request);
assert.notEqual(preRun.status, 'BLOCK', 'The live M003 fixture must remain eligible for governed review.');
assert.match(preRun.gateSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(preRun.runRequestSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(preRun.cases.length, request.cases.length);
assert.ok(preRun.cases.every((entry) => entry.preparationSemanticHash));
assert.ok(preRun.cases.every((entry) => entry.diagnosticsSemanticHash));
assert.match(flattenText(controller.elements.preRunRoot), /Run request hash:/u);
assert.match(flattenText(controller.elements.preRunRoot), /Gate hash:/u);

if (preRun.status === 'WARN') {
  assert.equal(preRun.solveAuthorized, false);
  assert.equal(controller.elements.runButton.disabled, true);
  assert.equal(controller.elements.authorizeButton.hidden, false);
  assert.ok(preRun.cases.some((entry) => entry.limitations.length > 0));
  controller.elements.reviewerIdentityInput.value = 'AGENT16-P09-QUALIFICATION';
  controller.elements.reviewReasonInput.value = 'Accept complete disclosed limitations for governed M003 qualification.';
  const authorized = controller.authorizePreRun();
  assert.equal(authorized.solveAuthorized, true);
  assert.ok(authorized.authorizationSemanticHashes.length > 0);
  for (const entry of authorized.cases.filter((row) => row.status === 'WARN')) {
    assert.equal(entry.approverIdentity, 'AGENT16-P09-QUALIFICATION');
    assert.deepEqual(entry.limitationsAccepted, entry.limitations);
  }
} else {
  assert.equal(preRun.status, 'PASS');
  assert.equal(preRun.solveAuthorized, true);
  assert.ok(preRun.authorizationSemanticHashes.length > 0);
}

const authorizedSnapshot = controller.getSnapshot();
assert.equal(authorizedSnapshot.preRunSolveAuthorized, true);
assert.equal(controller.elements.runButton.disabled, false);
assert.equal(controller.elements.section.dataset.runAuthorized, 'true');
const gateHashBeforeRun = authorizedSnapshot.preRunGateSemanticHash;

controller.elements.runFileInput.files = [jsonFile('m003-live-run.json', request)];
controller.elements.runButton.click();
assert.equal(controller.elements.runFileInput.clickCount, 1);
await controller.elements.runFileInput.dispatch('change');

const snapshot = controller.getSnapshot();
assert.equal(snapshot.status, 'CURRENT');
assert.equal(snapshot.runStatus, 'SUCCEEDED');
assert.equal(snapshot.applicationId, request.applicationId);
assert.equal(snapshot.preRunGateSemanticHash, gateHashBeforeRun, 'Run must retain the authorization receipt');
assert.equal(snapshot.preRunSolveAuthorized, true);
assert.equal(snapshot.exportEligibility, 'AUDIT_ONLY_CONDITIONAL');
assert.equal(controller.elements.auditButton.disabled, false);
assert.equal(controller.elements.engineeringButton.disabled, true);
assert.equal(controller.elements.runOutcome.dataset.status, 'SUCCEEDED');
assert.match(flattenText(controller.elements.runOutcome), /authorization receipt/u);

const runResult = controller.getLiveRunResult();
assert.equal(runResult.runtimeEvidence.sharedAcrossCaseCount, 2);
assert.ok(runResult.runtimeEvidence.factorizationCacheEntryCount >= 1);
assert.equal(runResult.runtimeEvidence.runGateSemanticHash, gateHashBeforeRun);
assert.equal(runResult.runtimeEvidence.requestedProfileId, LINEAR_PIPING_PRERUN_PROFILE_IDS[1]);
assert.equal(
  runResult.runtimeEvidence.authorizationSemanticHashes.length,
  request.cases.length,
);
const highContext = runResult.cases
  .find((entry) => entry.caseId === 'HIGH')
  .inputXmlAnalysisContext;
const highResult = highContext.sourceAnalysisContext.analysisResult;
assert.equal(highResult.status, 'CONDITIONAL');
assert.ok(Math.abs(reactionAt(highResult, 'RED-001.N0', 'UY') + 1000) < 1e-8);
assert.ok(Math.abs(reactionAt(highResult, 'RED-001.N0', 'RZ') + 2400) < 1e-8);
assert.ok(
  runResult.multicaseApplication.applicationResult.analysisResultSemanticHashes
    .includes(highResult.semanticHash),
);
assert.equal(
  snapshot.applicationResultSemanticHash,
  runResult.multicaseApplication.applicationResult.semanticHash,
);
assert.match(flattenText(controller.elements.resultsRoot), /B31\.3 application results/u);

// Re-check the untampered request, then present a different request to Run.
// The run-request hash must stop execution at PRE_FEA_RUN_GATE, before the
// existing production source-authority mismatch could even be reached.
const staleBase = buildM003LiveRunRequest();
controller.checkRequest(staleBase);
if (controller.getPreRunCheck().status === 'WARN') {
  controller.elements.reviewerIdentityInput.value = 'AGENT16-P09-STALE-TEST';
  controller.elements.reviewReasonInput.value = 'Authorize the untampered request only.';
  controller.authorizePreRun();
}
const staleGateHash = controller.getSnapshot().preRunGateSemanticHash;
const rejected = buildM003LiveRunRequest();
rejected.cases[0].inputXmlAnalysisRequest.sourceAnalysisRequest.expectedSourceAuthorities
  .compilerProfileSemanticHash = 'fnv1a64:0000000000000000';
controller.elements.runFileInput.files = [jsonFile('m003-live-run-stale.json', rejected)];
controller.elements.runButton.click();
await controller.elements.runFileInput.dispatch('change');

const blocked = controller.getSnapshot();
assert.equal(blocked.status, 'EMPTY');
assert.equal(blocked.runStatus, 'BLOCKED');
assert.equal(blocked.runFailure.code, 'PIPING_RUN_GATE_STALE');
assert.equal(blocked.runFailure.analysisStage, 'PRE_FEA_RUN_GATE');
assert.equal(blocked.preRunGateSemanticHash, staleGateHash);
assert.equal(blocked.applicationId, null);
assert.equal(blocked.exportEligibility, null);
assert.equal(controller.getLiveRunResult(), null);
assert.equal(controller.elements.auditButton.disabled, true);
assert.equal(controller.elements.engineeringButton.disabled, true);
assert.equal(controller.elements.runOutcome.dataset.status, 'BLOCKED');
assert.match(flattenText(controller.elements.runOutcome), /PIPING_RUN_GATE_STALE/u);
assert.match(flattenText(controller.elements.runOutcome), /PRE_FEA_RUN_GATE/u);
assert.throws(
  () => controller.createAuditExport(),
  (error) => error?.code === 'PIPING_WORKSPACE_RESULT_REQUIRED',
);

// Changing the requested profile invalidates the retained gate in the visible
// workbench and disables Run even when the previously sealed receipt was valid.
controller.checkRequest(staleBase);
const changedProfile = controller.elements.profileSelect.value === LINEAR_PIPING_PRERUN_PROFILE_IDS[0]
  ? LINEAR_PIPING_PRERUN_PROFILE_IDS[1]
  : LINEAR_PIPING_PRERUN_PROFILE_IDS[0];
controller.elements.profileSelect.value = changedProfile;
await controller.elements.profileSelect.dispatch('change');
assert.equal(controller.getPreRunCheck(), null);
assert.equal(controller.elements.runButton.disabled, true);
assert.equal(controller.elements.section.dataset.runAuthorized, 'false');

console.log(JSON.stringify({
  check: 'linear-piping-live-run-workbench',
  status: 'PASS',
  governedRunGate: true,
  realUiInteraction: true,
  realOrchestration: true,
  gateSemanticHash: gateHashBeforeRun,
  numericAssertions: {
    nodeId: 'RED-001.N0',
    UY: reactionAt(highResult, 'RED-001.N0', 'UY'),
    RZ: reactionAt(highResult, 'RED-001.N0', 'RZ'),
    tolerance: 1e-8,
  },
  staleGateRejection: blocked.runFailure,
}));

function reactionAt(result, nodeId, dof) {
  const entry = result.execution.reactions
    .find((row) => row.nodeId === nodeId && row.dof === dof);
  assert.ok(entry, `Missing reaction ${nodeId}:${dof}`);
  return entry.value;
}

function jsonFile(name, value) {
  const content = JSON.stringify(value);
  return Object.freeze({
    name,
    type: 'application/json',
    async text() {
      return content;
    },
  });
}

function flattenText(node) {
  return [node.textContent, ...node.children.map(flattenText)].join(' ');
}
