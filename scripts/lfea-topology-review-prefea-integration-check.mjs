#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createLfeaTopologyReviewFromDiagnostics,
} from '../src/workspace/lfea-topology-review-from-prefea.js';
import {
  getLfeaTopologyReviewQueue,
} from '../src/workspace/lfea-topology-review-model.js';
import { renderLfeaTopologyReview } from '../src/workspace/lfea-topology-review-view.js';
import { renderLinearPipingInputXmlDiagnostics } from '../src/workspace/linear-piping-inputxml-diagnostics-view.js';

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

  setAttribute(name, value) {
    this[name] = value;
  }
}

const diagnostics = diagnosticsFixture('mm');
const review = createLfeaTopologyReviewFromDiagnostics(diagnostics);
assert.equal(review.summary.findingCount, 4);
assert.equal(review.summary.mutationApplied, false);
assert.equal(getLfeaTopologyReviewQueue(review, 'POSSIBLE_DUPLICATE_NODE').count, 2);
assert.equal(getLfeaTopologyReviewQueue(review, 'OVERLAP_CANDIDATE').count, 1);
assert.equal(getLfeaTopologyReviewQueue(review, 'UNRESOLVED_CONNECTIVITY').count, 1);
assert.equal(getLfeaTopologyReviewQueue(review, 'COINCIDENT_SUPPORT').count, 0);
console.log(`P02B-01 PASS retained topology/proximity findings project into deterministic review queues ${review.semanticHash}`);

const nearNode = review.findings.find((row) => row.findingId.includes('NEAR_COINCIDENT'));
assert(nearNode);
assert.equal(nearNode.distanceM, 0.0005);
assert.equal(nearNode.toleranceM, 0.001);
assert.equal(nearNode.evidence.geometryUnit, 'mm');
assert.equal(nearNode.evidence.detectorRerun, false);
const closure = review.findings.find((row) => row.findingId.includes('CLOSURE_MISMATCH'));
assert(closure);
assert.equal(closure.distanceM, 0.002);
assert.equal(closure.toleranceM, 0.001);
const overlap = review.findings.find((row) => row.findingId.includes('COLLINEAR_SEGMENT_OVERLAP'));
assert(overlap);
assert.equal(overlap.distanceM, 0.0002);
assert.equal(overlap.toleranceM, 0.001);
console.log('P02B-02 PASS retained native-mm distances/tolerances are explicitly converted to metres without magnitude inference');

const inches = createLfeaTopologyReviewFromDiagnostics(diagnosticsFixture('in'));
const inchNearNode = inches.findings.find((row) => row.findingId.includes('NEAR_COINCIDENT'));
assert.equal(inchNearNode.distanceM, 0.0127);
assert.equal(inchNearNode.toleranceM, 0.0254);
assert.notEqual(inches.semanticHash, review.semanticHash);
console.log('P02B-03 PASS identical numeric evidence under explicit inch authority converts by 0.0254 m/in and changes review identity');

const stale = structuredClone(diagnostics);
stale.proximityDiagnostics.sourceBundleEvidenceHash = 'fnv1a64:ffffffffffffffff';
assert.throws(
  () => createLfeaTopologyReviewFromDiagnostics(stale),
  (error) => error?.code === 'E_P02_DIAGNOSTIC_PARENT_STALE',
);
const unsupported = structuredClone(diagnostics);
unsupported.proximityDiagnostics.geometryUnit = 'ft';
assert.throws(
  () => createLfeaTopologyReviewFromDiagnostics(unsupported),
  (error) => error?.code === 'E_P02_GEOMETRY_UNIT_UNSUPPORTED',
);
console.log('P02B-04 PASS substituted parent evidence and unsupported measured geometry units fail closed');

for (const finding of review.findings) {
  assert.equal(finding.mutationApplied, false);
  assert.equal(finding.evidence.mutationApplied, false);
  assert.equal(finding.evidence.detectorRerun, false);
  assert.match(finding.sourcePaths[0], /^\/diagnostics\/(?:topology|proximity)\//u);
  assert.equal(finding.evidence.upstreamFindingId, finding.findingId);
  assert.match(finding.evidence.diagnosticSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
  assert.match(finding.evidence.diagnosticEvidenceHash, /^fnv1a64:[0-9a-f]{16}$/u);
}
console.log('P02B-05 PASS finding identity/code/effect/source scope and diagnostic semantic/evidence hashes remain auditable');

const doc = new FakeDocument();
const root = doc.createElement('div');
const section = renderLfeaTopologyReview(doc, root, review);
const text = flattenText(root);
assert.equal(section.dataset.mutationApplied, 'false');
assert.equal(section.dataset.detectorRerun, 'false');
assert.match(text, /Topology Review — governed diagnostics/u);
assert.match(text, /POSSIBLE_DUPLICATE_NODE/u);
assert.match(text, /OVERLAP_CANDIDATE/u);
assert.match(text, /UNRESOLVED_CONNECTIVITY/u);
assert.match(text, /COINCIDENT_SUPPORT/u);
assert.match(text, /No merge, delete, reconnect, snap, autofix, or geometry mutation/u);
assert.match(text, /0\.0005 m \/ 0\.001 m/u);
console.log('P02B-06 PASS read-only review UI exposes queues, measurement basis, source trace and explicit no-mutation policy');

const integratedRoot = doc.createElement('div');
const renderedDiagnostics = renderLinearPipingInputXmlDiagnostics(doc, integratedRoot, preFlightFixture(diagnostics));
const integratedText = flattenText(integratedRoot);
assert.equal(renderedDiagnostics.dataset.topologyReviewSemanticHash, review.semanticHash);
assert.equal(renderedDiagnostics.dataset.topologyReviewFindingCount, '4');
assert.equal(renderedDiagnostics.dataset.topologyMutationApplied, 'false');
assert.match(integratedText, /Governed InputXML diagnostics/u);
assert.match(integratedText, /Topology Review — governed diagnostics/u);
console.log('P02B-07 PASS normal P-08 diagnostics composition projects the same retained evidence into P-02 review without another detector');

const adapterSource = fs.readFileSync('src/workspace/lfea-topology-review-from-prefea.js', 'utf8');
const viewSource = fs.readFileSync('src/workspace/lfea-topology-review-view.js', 'utf8');
const diagnosticsViewSource = fs.readFileSync('src/workspace/linear-piping-inputxml-diagnostics-view.js', 'utf8');
assert.doesNotMatch(adapterSource, /parseInputXml|diagnoseInputXml|buildTopologyGraph|classifySegmentPair/u);
assert.doesNotMatch(adapterSource, /mergeNodes|deleteNode|deleteSegment|applyTopology|mutateTopology|writeTopology/u);
assert.doesNotMatch(viewSource, /addEventListener|dispatchEvent|EventBus|publish\(|runLinearPiping|solveInputXml/u);
assert.doesNotMatch(diagnosticsViewSource, /parseInputXml|diagnoseInputXml|prepareInputXml|authorizeInputXml|solveInputXml/u);
console.log('P02B-08 PASS P-02B owns no parser, detector rerun, topology mutation, solver, event-bus or authorization authority');

console.log(JSON.stringify({
  check: 'lfea-topology-review-prefea-integration',
  status: 'PASS',
  p02aReviewSemanticHash: review.semanticHash,
  projectedFindingCount: review.summary.findingCount,
  queues: {
    OVERLAP_CANDIDATE: getLfeaTopologyReviewQueue(review, 'OVERLAP_CANDIDATE').count,
    COINCIDENT_SUPPORT: getLfeaTopologyReviewQueue(review, 'COINCIDENT_SUPPORT').count,
    POSSIBLE_DUPLICATE_NODE: getLfeaTopologyReviewQueue(review, 'POSSIBLE_DUPLICATE_NODE').count,
    UNRESOLVED_CONNECTIVITY: getLfeaTopologyReviewQueue(review, 'UNRESOLVED_CONNECTIVITY').count,
  },
  sourceReparse: false,
  detectorRerun: false,
  mutationApplied: false,
}));

function diagnosticsFixture(geometryUnit) {
  const sourceSemanticHash = 'fnv1a64:1111111111111111';
  const sourceEvidenceHash = 'fnv1a64:2222222222222222';
  return Object.freeze({
    semanticHash: 'fnv1a64:3333333333333333',
    evidenceHash: 'fnv1a64:4444444444444444',
    sourceAuthority: Object.freeze({
      sourceBundleSemanticHash: sourceSemanticHash,
      sourceBundleEvidenceHash: sourceEvidenceHash,
    }),
    summary: Object.freeze({
      affectedRestraintCount: 0,
      blockedCapabilityIds: Object.freeze([]),
      conditionalCapabilityIds: Object.freeze([]),
      authorizedCapabilityIds: Object.freeze(['STRICT_INPUTXML_LINEAR_STATIC_V1']),
    }),
    capabilities: Object.freeze([]),
    representabilityDiagnostics: Object.freeze({
      semanticHash: 'fnv1a64:5555555555555555',
      evidenceHash: 'fnv1a64:6666666666666666',
    }),
    topologyDiagnostics: diagnosticRecord({
      sourceSemanticHash,
      sourceEvidenceHash,
      semanticHash: 'fnv1a64:7777777777777777',
      evidenceHash: 'fnv1a64:8888888888888888',
      geometryUnit,
      findings: [
        finding({
          findingId: 'TOPOLOGY_GRAPH:TOPOLOGY_NODE_ID_DUPLICATE:NODE:N10',
          code: 'TOPOLOGY_NODE_ID_DUPLICATE',
          entities: { nodeIds: ['N10'] },
          evidence: { nodeId: 'N10' },
          message: 'Node identity N10 is declared more than once.',
        }),
        finding({
          findingId: 'TOPOLOGY_GRAPH:TOPOLOGY_ELEMENT_DELTA_CLOSURE_MISMATCH:SOURCE:E2',
          code: 'TOPOLOGY_ELEMENT_DELTA_CLOSURE_MISMATCH',
          entities: { nodeIds: ['N20', 'N30'], segmentIds: ['S2'], sourceFeatureIds: ['E2'] },
          evidence: { residualNorm: 2, acceptanceTolerance: 1 },
          message: 'Source element E2 delta does not close.',
        }),
      ],
    }),
    proximityDiagnostics: diagnosticRecord({
      sourceSemanticHash,
      sourceEvidenceHash,
      semanticHash: 'fnv1a64:9999999999999999',
      evidenceHash: 'fnv1a64:aaaaaaaaaaaaaaaa',
      geometryUnit,
      findings: [
        finding({
          findingId: 'TOPOLOGY_PROXIMITY:TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT:NODE_PAIR:N40|N41',
          code: 'TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT',
          effect: 'ADVISORY',
          entities: { nodeIds: ['N40', 'N41'] },
          evidence: {
            classification: 'NEAR_COINCIDENT',
            nodeIds: ['N40', 'N41'],
            separation: 0.5,
            coincidenceTolerance: 0.01,
            nearTolerance: 1,
          },
          message: 'N40 and N41 are near coincident.',
        }),
        finding({
          findingId: 'TOPOLOGY_PROXIMITY:TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP:SEGMENT_PAIR:S10|S11',
          code: 'TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP',
          entities: { segmentIds: ['S10', 'S11'] },
          evidence: {
            classification: 'COLLINEAR_OVERLAP',
            segmentIds: ['S10', 'S11'],
            sharedNodeIds: [],
            evidence: { distance: 0.2, hitTolerance: 1, nearTolerance: 2, overlapLength: 50 },
          },
          message: 'S10 and S11 classify as collinear overlap.',
        }),
      ],
    }),
  });
}

function diagnosticRecord({ sourceSemanticHash, sourceEvidenceHash, semanticHash, evidenceHash, geometryUnit, findings }) {
  return Object.freeze({
    status: 'BLOCKED',
    sourceBundleSemanticHash: sourceSemanticHash,
    sourceBundleEvidenceHash: sourceEvidenceHash,
    semanticHash,
    evidenceHash,
    geometryUnit,
    findings: Object.freeze(findings),
    summary: Object.freeze({
      connectedComponentCount: 1,
      isolatedNodeCount: 0,
      unboundSegmentCount: 0,
      selfLoopSegmentCount: 0,
      coordinateClosureMismatchCount: 1,
      coordinateClosureUnresolvedCount: 0,
    }),
  });
}

function finding({ findingId, code, effect = 'BLOCK', entities, evidence, message }) {
  return Object.freeze({
    findingId,
    code,
    category: 'TOPOLOGY',
    severity: effect === 'BLOCK' ? 'error' : 'warning',
    capabilityEffects: Object.freeze([Object.freeze({
      capabilityId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
      effect,
    })]),
    entities: Object.freeze(entities),
    evidence: Object.freeze(evidence),
    message,
    remediation: 'Engineer review required; no automatic topology change.',
  });
}

function preFlightFixture(diagnosticsValue) {
  return Object.freeze({
    solveAuthorized: false,
    authorization: null,
    diagnostics: diagnosticsValue,
    preparation: Object.freeze({
      status: 'BLOCK',
      semanticHash: 'fnv1a64:bbbbbbbbbbbbbbbb',
      evidenceHash: 'fnv1a64:cccccccccccccccc',
      requestedCaseIds: Object.freeze(['IXP-W']),
      findings: Object.freeze([]),
    }),
  });
}

function flattenText(node) {
  return [node.textContent, ...node.children.map(flattenText)].join(' ');
}
