#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LINEAR_PIPING_ANALYZER_INTEGRATION_POLICY,
  retireStandaloneInputXmlAnalyzerEntry,
} from '../src/workspace/linear-piping-analyzer-integration.js';
import {
  renderLinearPipingInputXmlDiagnostics,
} from '../src/workspace/linear-piping-inputxml-diagnostics-view.js';

const doc = new FakeDocument();
const diagnosticsRoot = doc.createElement('div');
const preFlight = governedReceiptFixture();
const rendered = renderLinearPipingInputXmlDiagnostics(doc, diagnosticsRoot, preFlight);
const text = flattenText(diagnosticsRoot);

assert.equal(rendered.dataset.diagnosticsSemanticHash, 'fnv1a64:p08diagnostics');
assert.equal(rendered.dataset.diagnosticsEvidenceHash, 'fnv1a64:p08diagnosticsevidence');
assert.equal(rendered.dataset.preparationSemanticHash, 'fnv1a64:p08preparation');
assert.match(text, /Governed InputXML diagnostics/u);
assert.match(text, /Pre-FEA readiness/u);
assert.match(text, /Restraint diagnostics/u);
assert.match(text, /Topology diagnostics/u);
assert.match(text, /Representability/u);
assert.match(text, /IXP-W/u);
assert.match(text, /RESTRAINT_DIRECTION_CONDITIONAL/u);
assert.match(text, /STRICT_LINEAR_STATIC/u);
assert.match(text, /GENERIC_APPROX_RESTRAINT_DIRECTION/u);
console.log('P08-01 PASS LFEA renders retained readiness/restraint/topology/representability evidence from one pre-flight receipt');

const link = {
  href: 'analyze.html',
  removed: false,
  getAttribute(name) {
    return name === 'href' ? this.href : null;
  },
  remove() {
    this.removed = true;
  },
};
const applicationRoot = {
  querySelector(selector) {
    return selector === '[data-role="linear-piping-analyzer-link"]' && !link.removed
      ? link
      : null;
  },
};
const retirement = retireStandaloneInputXmlAnalyzerEntry(applicationRoot);
assert.equal(retirement.normalWorkflowLinkRemoved, true);
assert.equal(retirement.retiredHref, 'analyze.html');
assert.equal(retirement.normalWorkflow, 'LFEA_SOURCE_PREFLIGHT');
assert.equal(retirement.standaloneAnalyzerRole, 'DEVELOPER_DIAGNOSTICS_ONLY');
assert.equal(retirement.standaloneExecutionAuthority, false);
assert.equal(link.removed, true);
assert.equal(applicationRoot.querySelector('[data-role="linear-piping-analyzer-link"]'), null);
assert.equal(LINEAR_PIPING_ANALYZER_INTEGRATION_POLICY.standaloneExecutionAuthority, false);
console.log('P08-02 PASS normal LFEA composition retires the standalone Analyzer detour without deleting the utility');

const mainSource = fs.readFileSync('src/main.js', 'utf8');
const mountResultsAt = mainSource.indexOf('mountLinearPipingResultsWorkbench(applicationRoot');
const retireAnalyzerAt = mainSource.indexOf('retireStandaloneInputXmlAnalyzerEntry(applicationRoot)');
assert.ok(mountResultsAt >= 0);
assert.ok(retireAnalyzerAt > mountResultsAt, 'Normal composition must retire the link after the legacy results toolbar mounts it.');
assert.match(mainSource, /getLinearPipingInputXmlAnalyzerIntegrationPolicy/u);
console.log('P08-03 PASS normal composition exposes one LFEA diagnostics workflow policy');

const sourceWorkflow = fs.readFileSync('src/workspace/linear-piping-inputxml-source-workflow.js', 'utf8');
const diagnosticsView = fs.readFileSync('src/workspace/linear-piping-inputxml-diagnostics-view.js', 'utf8');
assert.match(sourceWorkflow, /renderLinearPipingInputXmlDiagnostics/u);
assert.doesNotMatch(diagnosticsView, /parseInputXml|diagnoseInputXml|prepareInputXml|authorizeInputXml|solveInputXml/u);
assert.doesNotMatch(diagnosticsView, /innerHTML|insertAdjacentHTML|outerHTML/u);
assert.doesNotMatch(diagnosticsView, /Math\.random|randomUUID|localeCompare/u);
console.log('P08-04 PASS integrated diagnostics consume retained receipt evidence and own no parser, preparation or solve authority');

const analyzerSource = fs.readFileSync('src/analyze/analyze-controller.js', 'utf8');
assert.match(analyzerSource, /PREFEA_AUTHORIZATION_REQUIRED/u);
assert.match(analyzerSource, /Standalone developer diagnostics only/u);
assert.match(analyzerSource, /Normal engineering work belongs in LFEA → Source → Pre-flight/u);
assert.match(analyzerSource, /Standalone InputXML Analyzer execution is disabled/u);
assert.doesNotMatch(analyzerSource, /runLinearPipingWorkbenchAnalysis|solveInputXmlLinearAnalysis|compileSolverExecution/u);
console.log('P08-05 PASS standalone Analyzer remains an explicit fail-closed developer utility with no executor');

const resultsSource = fs.readFileSync('src/workspace/linear-piping-results-workbench.js', 'utf8');
assert.match(resultsSource, /data\.role = 'linear-piping-analyzer-link'|dataset\.role = 'linear-piping-analyzer-link'/u);
assert.match(resultsSource, /href = 'analyze\.html'/u);
assert.match(mainSource, /retireStandaloneInputXmlAnalyzerEntry/u);
console.log('P08-06 PASS legacy link may remain internally defined, but normal product composition removes the competing entry path');

console.log(JSON.stringify({
  check: 'linear-piping-inputxml-analyzer-integration',
  status: 'PASS',
  normalWorkflow: 'LFEA_SOURCE_PREFLIGHT',
  integratedDiagnostics: ['PRE_FEA_READINESS', 'RESTRAINT', 'TOPOLOGY', 'REPRESENTABILITY'],
  reparsesRawInputXml: false,
  standaloneAnalyzerExecutionAuthority: false,
  normalWorkflowAnalyzerLink: false,
}));

function governedReceiptFixture() {
  return Object.freeze({
    solveAuthorized: false,
    authorization: null,
    diagnostics: Object.freeze({
      semanticHash: 'fnv1a64:p08diagnostics',
      evidenceHash: 'fnv1a64:p08diagnosticsevidence',
      summary: Object.freeze({
        affectedRestraintCount: 1,
        blockedCapabilityIds: Object.freeze([]),
        conditionalCapabilityIds: Object.freeze(['STRICT_LINEAR_STATIC']),
        authorizedCapabilityIds: Object.freeze(['SUSTAINED_CASE']),
      }),
      topologyDiagnostics: Object.freeze({
        status: 'CONDITIONAL',
        semanticHash: 'fnv1a64:p08topology',
        evidenceHash: 'fnv1a64:p08topologyevidence',
        summary: Object.freeze({
          connectedComponentCount: 1,
          isolatedNodeCount: 0,
          unboundSegmentCount: 0,
          selfLoopSegmentCount: 0,
          coordinateClosureMismatchCount: 0,
          coordinateClosureUnresolvedCount: 0,
        }),
        findings: Object.freeze([Object.freeze({
          findingId: 'TOP-P08-01',
          code: 'TOPOLOGY_REVIEW_ADVISORY',
          effect: 'ADVISORY',
          message: 'Topology review evidence retained.',
        })]),
      }),
      proximityDiagnostics: Object.freeze({
        status: 'PASS',
        semanticHash: 'fnv1a64:p08proximity',
        evidenceHash: 'fnv1a64:p08proximityevidence',
        findings: Object.freeze([]),
      }),
      representabilityDiagnostics: Object.freeze({
        semanticHash: 'fnv1a64:p08representability',
        evidenceHash: 'fnv1a64:p08representabilityevidence',
      }),
      capabilities: Object.freeze([
        Object.freeze({
          capabilityId: 'STRICT_LINEAR_STATIC',
          status: 'CONDITIONAL',
          limitationCodes: Object.freeze(['GENERIC_APPROX_RESTRAINT_DIRECTION']),
        }),
        Object.freeze({
          capabilityId: 'SUSTAINED_CASE',
          status: 'PASS',
          limitationCodes: Object.freeze([]),
        }),
      ]),
    }),
    preparation: Object.freeze({
      status: 'WARN',
      semanticHash: 'fnv1a64:p08preparation',
      evidenceHash: 'fnv1a64:p08preparationevidence',
      requestedCaseIds: Object.freeze(['IXP-W']),
      findings: Object.freeze([
        Object.freeze({
          findingId: 'PF-P08-01',
          disposition: 'CONDITIONAL',
          category: 'RESTRAINT',
          code: 'RESTRAINT_DIRECTION_CONDITIONAL',
          message: 'Restraint direction requires explicit review.',
        }),
        Object.freeze({
          findingId: 'PF-P08-02',
          disposition: 'PASS',
          category: 'MODEL',
          code: 'MODEL_READY',
          message: 'Model preparation completed.',
        }),
      ]),
    }),
  });
}

function flattenText(node) {
  return [node.textContent, ...node.children.map(flattenText)].join(' ');
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.textContent = '';
    this.scope = '';
    this.parentNode = null;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}
