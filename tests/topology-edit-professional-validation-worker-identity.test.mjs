import assert from 'node:assert/strict';
import test from 'node:test';

import { semanticHash } from '../src/core/shared-piping-model/index.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  prepareTopologyEditOperationCandidate,
} from '../src/workspace/topology-edit/professional/topology-edit-operation-candidate.js';
import {
  planExtendEdge,
} from '../src/workspace/topology-edit/professional/topology-edit-route-operations.js';
import {
  createTopologyEditValidationIdentity,
} from '../src/workspace/topology-edit/professional/topology-edit-validation-identity.js';
import {
  assertTopologyEditValidationWorkerResponse,
  createTopologyEditValidationWorkerRequest,
  executeTopologyEditValidationWorkerRequest,
} from '../src/workspace/topology-edit/professional/topology-edit-validation-worker-contract.js';
import { topologyEditDiagnosticsHash } from '../src/workspace/topology-edit/professional/topology-edit-validation-diagnostics.js';
import {
  acceptTopologyEditValidationWorkerResponse,
  beginTopologyEditValidationWorkerRequest,
  createTopologyEditValidationWorkerState,
} from '../src/workspace/topology-edit/professional/topology-edit-validation-worker-state.js';

function fixture() {
  const base = finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'DS-IDENTITY',
    datasetVersion: 0,
    sourceHash: 'source:validation-identity',
    topologyGraphHash: 'graph:validation-identity',
    nodes: [
      { id: 'node:a', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:b', position: { x: 100, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{
      id: 'edge:e1',
      componentKey: 'P-1',
      fromNodeId: 'node:a',
      toNodeId: 'node:b',
      diameterMm: 100,
      entityType: 'PIPE',
    }],
    junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
  });
  const session = new TopologyEditCertifiedSession(base);
  const operationPlan = planExtendEdge({
    topology: session.currentTopology(),
    edgeId: 'edge:e1',
    endpoint: 'TO',
    distanceMm: 10,
  });
  const candidate = prepareTopologyEditOperationCandidate({ session, operationPlan });
  const identity = createTopologyEditValidationIdentity({
    sourceHash: session.baseAuthority.sourceHash,
    basisHash: operationPlan.basisHash,
    sessionId: 'validation-session:identity-fixture',
    sessionVersion: session.journal.sessionVersion,
    selectionRevision: 7,
    interactionId: 'validation-interaction:identity-fixture',
  });
  const previousDiagnostics = [];
  const request = createTopologyEditValidationWorkerRequest({
    identity,
    operationPlan,
    validatedTopologyHash: candidate.canonicalTopology.canonicalTopologyHash,
    previousIssueHash: topologyEditDiagnosticsHash(previousDiagnostics),
    checkerOptions: {},
    performancePolicy: {
      fastPathBudgetMs: 16,
      warningBudgetMs: 100,
      hysteresisMs: 4,
    },
    blockingSeverities: ['HIGH'],
  });
  const response = executeTopologyEditValidationWorkerRequest({
    request,
    operationPlan,
    canonicalTopology: candidate.canonicalTopology,
    previousDiagnostics,
    checker: () => [],
    now: clock([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6]),
  });
  return { identity, request, response };
}

const STALE_CASES = Object.freeze([
  ['sourceHash', 'source:other', 'REJECTED_SOURCE_HASH'],
  ['basisHash', 'canonical:other', 'REJECTED_BASIS_HASH'],
  ['sessionId', 'validation-session:other', 'REJECTED_SESSION_ID'],
  ['sessionVersion', 1, 'REJECTED_SESSION_VERSION'],
  ['selectionRevision', 8, 'REJECTED_SELECTION_REVISION'],
  ['interactionId', 'validation-interaction:other', 'REJECTED_INTERACTION_ID'],
  ['requestId', 'validation-request:other', 'REJECTED_REQUEST_ID'],
  ['planHash', 'plan:other', 'REJECTED_PLAN_HASH'],
  ['changedScopeHash', 'scope:other', 'REJECTED_CHANGED_SCOPE_HASH'],
  ['validatedTopologyHash', 'topology:other', 'REJECTED_VALIDATED_TOPOLOGY_HASH'],
]);

test('requestId deterministically includes full validation interaction identity', () => {
  const { request } = fixture();
  const { request: changed } = fixtureWithSelectionRevision(8);
  assert.notEqual(changed.identityHash, request.identityHash);
  assert.notEqual(changed.requestId, request.requestId);
});

for (const [field, value, expectedStatus] of STALE_CASES) {
  test(`worker state rejects stale ${field} independently`, () => {
    const { request, response } = fixture();
    const initial = beginTopologyEditValidationWorkerRequest(
      createTopologyEditValidationWorkerState(),
      request,
    );
    const stale = rewriteResponse(response, { [field]: value });
    const disposition = acceptTopologyEditValidationWorkerResponse(initial, stale);

    assert.equal(disposition.status, expectedStatus);
    assert.equal(disposition.receipt, null);
    assert.equal(disposition.state.acceptedResponse, null);
    assert.equal(disposition.state.activeRequest.requestId, request.requestId);
  });
}

test('missing identity material fails closed before response interpretation', () => {
  const { response } = fixture();
  const missing = { ...response };
  delete missing.selectionRevision;
  const material = { ...missing };
  delete material.responseHash;
  missing.responseHash = semanticHash(material);

  assert.throws(
    () => assertTopologyEditValidationWorkerResponse(missing),
    /selectionRevision.*non-negative integer/i,
  );
});

function fixtureWithSelectionRevision(selectionRevision) {
  const data = fixture();
  const identity = createTopologyEditValidationIdentity({
    ...data.identity,
    selectionRevision,
  });
  const requestMaterial = {
    ...data.request,
    selectionRevision,
    identityHash: identity.identityHash,
  };
  delete requestMaterial.requestId;
  return {
    request: {
      ...requestMaterial,
      requestId: `validation-request:${semanticHash(requestMaterial)}`,
    },
  };
}

function rewriteResponse(response, changes) {
  const next = { ...response, ...changes };
  if (['sourceHash', 'basisHash', 'sessionId', 'sessionVersion', 'selectionRevision', 'interactionId']
    .some((field) => Object.hasOwn(changes, field))) {
    next.identityHash = createTopologyEditValidationIdentity(next).identityHash;
  }
  const material = { ...next };
  delete material.responseHash;
  next.responseHash = semanticHash(material);
  return next;
}

function clock(values) {
  let index = 0;
  return () => values[index++];
}
