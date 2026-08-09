#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LinearPipingInputXmlSourceWorkflowController,
} from '../src/workspace/linear-piping-inputxml-source-workflow.js';

const DECLARED_MM_XML = fullInputXml({ withUnits: true });
const NO_UNITS_XML = fullInputXml({ withUnits: false });

function runChecks() {
  const doc = new FakeDocument();
  const panel = doc.createElement('div');
  doc.body.append(panel);
  const controller = new LinearPipingInputXmlSourceWorkflowController(panel, doc).init();
  controller.elements.profileSelect.value = 'STRICT_INPUTXML_LINEAR_STATIC_V1';
  controller.elements.unitSelect.value = 'mm';

  assert.equal(panel.children.length, 1);
  assert.equal(controller.elements.section.dataset.role, 'linear-piping-inputxml-source-workflow');
  assert.match(controller.elements.fileInput.accept, /\.xml/u);
  assert.match(controller.elements.importButton.textContent, /Import CAESAR II InputXML/u);
  assert.equal(controller.elements.section.dataset.nativeExecutionReady, 'false');
  console.log('P07-UI-01 PASS native InputXML is a first-class LFEA Source picker');

  let preFlight = controller.loadSource({
    fileName: 'P07-visible-declared-mm.xml',
    content: DECLARED_MM_XML,
  });
  let snapshot = controller.getSnapshot();
  assert.notEqual(preFlight.status, 'BLOCK');
  assert.equal(snapshot.sourceUnit, 'mm');
  assert.equal(snapshot.unitDeclared, true);
  assert.equal(snapshot.unitAuthority, 'CAESAR_INPUTXML_DECLARED_LENGTH_UNIT');
  assert.match(snapshot.contentSha256, /^[0-9a-f]{64}$/u);
  assert.equal(snapshot.requestedCaseRole, 'W');
  assert.deepEqual(snapshot.requestedCaseIds, ['IXP-W']);
  assert.ok(snapshot.availableCaseIds.includes('IXP-W'));
  assert.equal(snapshot.nativeExecutionReady, false);
  assert.match(flattenText(controller.elements.summaryRoot), /Execution custody: NOT CONNECTED/u);
  console.log('P07-UI-02 PASS declared source unit, SHA-256 and exact physical-case custody are visible');

  if (preFlight.status === 'WARN') {
    assert.equal(snapshot.preFlightSolveAuthorized, false);
    preFlight = controller.authorizePreFlight({
      approverIdentity: 'P07-VISIBLE-QUALIFICATION-ENGINEER',
      reason: 'Reviewed the complete disclosed native InputXML limitation set.',
    });
    snapshot = controller.getSnapshot();
    assert.equal(snapshot.preFlightSolveAuthorized, true);
    assert.match(snapshot.authorizationSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
  }
  assert.equal(controller.elements.section.dataset.nativeExecutionReady, 'false');
  console.log('P07-UI-03 PASS conditional review can seal pre-FEA authority without claiming Run custody');

  const priorReceiptHash = controller.getSnapshot().preFlightSemanticHash;
  controller.elements.profileSelect.value = 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1';
  controller.reprepareForProfileChange();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.requestedProfileId, 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1');
  assert.notEqual(snapshot.preFlightSemanticHash, priorReceiptHash);
  if (snapshot.preFlightStatus === 'WARN') assert.equal(snapshot.preFlightSolveAuthorized, false);
  console.log('P07-UI-04 PASS profile change regenerates custody and invalidates prior conditional authority');

  const unitRequired = controller.loadSource({
    fileName: 'P07-visible-no-units.xml',
    content: NO_UNITS_XML,
  });
  snapshot = controller.getSnapshot();
  assert.equal(unitRequired.status, 'UNIT_AUTHORITY_REQUIRED');
  assert.equal(snapshot.sourceStatus, 'UNIT_AUTHORITY_REQUIRED');
  assert.equal(snapshot.sourceUnit, null);
  assert.equal(controller.elements.unitLabel.hidden, false);
  assert.equal(controller.elements.unitButton.hidden, false);
  assert.match(controller.message, /No geometry-magnitude, diameter, filename, or coordinate heuristic is used/u);
  console.log('P07-UI-05 PASS missing LENGTH declaration fails closed with explicit mm/in controls');

  assert.throws(
    () => controller.authorizeUnit('mm'),
    (error) => error?.code === 'PREFEA_PREPARATION_RUNTIME_STATE_INVALID'
      && /Preparation retains prohibited runtime state/u.test(error?.message ?? ''),
    'Known PF-16 must remain a hard downstream pre-flight stop after source-unit authority is sealed.',
  );
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.sourceStatus, 'SOURCE_AUTHORIZED_PREFLIGHT_NOT_READY');
  assert.equal(snapshot.sourceUnit, 'mm');
  assert.equal(snapshot.unitDeclared, false);
  assert.equal(snapshot.unitAuthority, 'LFEA_ENGINEER_DECLARED_FALLBACK_LENGTH_UNIT');
  assert.equal(snapshot.preFlightStatus, 'NOT_PREPARED');
  assert.equal(snapshot.preFlightSolveAuthorized, false);
  assert.equal(snapshot.nativeExecutionReady, false);
  assert.match(snapshot.error, /PREFEA_PREPARATION_RUNTIME_STATE_INVALID/u);
  assert.match(snapshot.message, /source authority sealed/u);
  assert.match(snapshot.message, /pre-flight failed closed/u);
  assert.match(flattenText(controller.elements.summaryRoot), /FAILED CLOSED — NOT AUTHORIZED/u);
  assert.equal(controller.elements.unitLabel.hidden, true);
  assert.equal(controller.elements.unitButton.hidden, true);
  console.log('P07-UI-06 PASS explicit fallback unit remains retained while known PF-16 stops pre-flight and execution fail-closed');

  controller.clear();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.sourceStatus, 'EMPTY');
  assert.equal(snapshot.preFlightStatus, 'NOT_PREPARED');
  assert.equal(snapshot.preFlightSolveAuthorized, false);
  console.log('P07-UI-07 PASS clear removes retained native source and pre-FEA authority');

  const mainSource = fs.readFileSync('src/main.js', 'utf8');
  assert.match(mainSource, /mountLinearPipingInputXmlSourceWorkflow/u);
  assert.match(mainSource, /loadLinearPipingInputXmlSource/u);
  assert.match(mainSource, /authorizeLinearPipingInputXmlSourceUnit/u);
  assert.match(mainSource, /authorizeLinearPipingInputXmlPreFlight/u);
  assert.match(mainSource, /getLinearPipingInputXmlSourceState/u);
  const workflowSource = fs.readFileSync('src/workspace/linear-piping-inputxml-source-workflow.js', 'utf8');
  assert.doesNotMatch(workflowSource, /runLinearPipingWorkbenchAnalysis|solveInputXmlLinearAnalysis|compileSolverExecution/u);
  assert.doesNotMatch(workflowSource, /innerHTML|insertAdjacentHTML|outerHTML/u);
  assert.doesNotMatch(workflowSource, /Math\.random|randomUUID|localeCompare/u);
  assert.match(workflowSource, /nativeExecutionReady: false/u);
  console.log('P07-UI-08 PASS source surface is mounted, safe-DOM, deterministic and has no solver authority');

  controller.destroy();
  assert.equal(panel.children.length, 0);

  console.log(JSON.stringify({
    check: 'linear-piping-inputxml-source-workflow',
    status: 'PASS',
    normalLfeaInputXmlPicker: true,
    missingUnitFailsClosed: true,
    inferredUnits: false,
    carriedPf16AfterUnitSeal: true,
    nativeExecutionReady: false,
    legacyRunRequestFabricated: false,
  }));
}

function flattenText(node) {
  return [node.textContent, ...node.children.map(flattenText)].join(' ');
}

function fullInputXml({ withUnits }) {
  const units = withUnits ? `<UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/>
    <FORCE LABEL="N" FACTOR="4.4482216152605"/>
    <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/>
    <STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
    <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/>
    <EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/>
    <PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS>` : '';
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    ${units}
    <PIPINGMODEL xmlns="" JOBNAME="P07-VISIBLE">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}

class FakeDocument {
  constructor() {
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
    this.scope = '';
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
    for (const callback of this.listeners.get('click') ?? []) callback({ currentTarget: this });
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}

runChecks();
