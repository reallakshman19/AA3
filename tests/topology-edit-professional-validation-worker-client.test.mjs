import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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
  executeTopologyEditValidationWorkerRequest,
} from '../src/workspace/topology-edit/professional/topology-edit-validation-worker-contract.js';
import {
  TopologyEditValidationWorkerClient,
} from '../src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js';

function baseTopology() {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'DS-WORKER',
    datasetVersion: 0,
    sourceHash: 'source:worker',
    topologyGraphHash: 'graph:worker',
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
}

function validationInput(distanceMm = 10, identityOverrides = {}) {
  const session = new TopologyEditCertifiedSession(baseTopology());
  const operationPlan = planExtendEdge({
    topology: session.currentTopology(),
    edgeId: 'edge:e1',
    endpoint: 'TO',
    distanceMm,
  });
  const candidate = prepareTopologyEditOperationCandidate({
    session,
    operationPlan,
  });
  const identity = createTopologyEditValidationIdentity({
    sourceHash: session.baseAuthority.sourceHash,
    basisHash: operationPlan.basisHash,
    sessionId: 'validation-session:test:worker',
    sessionVersion: session.journal.sessionVersion,
    selectionRevision: 3,
    interactionId: `validation-interaction:test:${distanceMm}`,
    ...identityOverrides,
  });
  let liveIdentity = identity;
  return {
    identity,
    getCurrentIdentity: () => liveIdentity,
    setCurrentIdentity: (next) => { liveIdentity = next; },
    operationPlan,
    canonicalTopology: candidate.canonicalTopology,
    previousDiagnostics: [],
    checkerOptions: {},
    performancePolicy: {
      fastPathBudgetMs: 16,
      warningBudgetMs: 100,
      hysteresisMs: 4,
    },
    blockingSeverities: ['HIGH'],
  };
}

function executePayload(payload) {
  return executeTopologyEditValidationWorkerRequest({
    request: payload.request,
    operationPlan: payload.operationPlan,
    canonicalTopology: payload.canonicalTopology,
    previousDiagnostics: payload.previousDiagnostics,
    checker: () => [],
    now: clock([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6]),
  });
}

class ExecutingWorker {
  static instances = [];

  constructor() {
    this.listeners = { message: new Set(), error: new Set() };
    this.terminated = false;
    ExecutingWorker.instances.push(this);
  }

  addEventListener(type, listener) { this.listeners[type].add(listener); }
  removeEventListener(type, listener) { this.listeners[type].delete(listener); }
  terminate() { this.terminated = true; }

  emit(response) {
    for (const listener of this.listeners.message) {
      listener({
        data: {
          type: 'VALIDATED',
          requestId: response.requestId,
          response,
        },
      });
    }
  }

  postMessage(payload) {
    const response = executePayload(payload);
    queueMicrotask(() => this.emit(response));
  }
}

class StaleSelectionWorker extends ExecutingWorker {
  postMessage(payload) {
    const response = executePayload(payload);
    const staleResponse = {
      ...response,
      selectionRevision: response.selectionRevision + 1,
    };
    queueMicrotask(() => this.emit(staleResponse));
  }
}

class DeferredWorker extends ExecutingWorker {
  postMessage(payload) {
    this.response = executePayload(payload);
  }

  release() {
    this.emit(this.response);
  }
}

class SilentWorker extends ExecutingWorker {
  postMessage() {}
}

class BrokenPostWorker extends ExecutingWorker {
  postMessage() { throw new Error('structured clone failed'); }
}

class BrokenConstructorWorker {
  constructor() { throw new Error('worker unavailable'); }
}

test('worker client accepts exact response authority and terminates the worker', async () => {
  ExecutingWorker.instances.length = 0;
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: ExecutingWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  const input = validationInput();
  const result = await client.validate(input);

  assert.equal(result.disposition.status, 'ACCEPTED');
  assert.equal(result.response.sourceHash, input.identity.sourceHash);
  assert.equal(result.response.sessionId, input.identity.sessionId);
  assert.equal(result.response.sessionVersion, input.identity.sessionVersion);
  assert.equal(result.response.selectionRevision, input.identity.selectionRevision);
  assert.equal(result.response.interactionId, input.identity.interactionId);
  assert.equal(
    result.receipt.validatedTopologyHash,
    input.canonicalTopology.canonicalTopologyHash,
  );
  assert.equal(ExecutingWorker.instances[0].terminated, true);
  assert.equal(client.snapshot().activeRequest, null);
  client.destroy();
});

test('client rejects stale response selection identity before accepting worker readiness', async () => {
  ExecutingWorker.instances.length = 0;
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: StaleSelectionWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  const pending = client.validate(validationInput());

  await assert.rejects(pending, {
    code: 'STALE_VALIDATION_SELECTION_REVISION',
  });
  assert.equal(client.snapshot().acceptedResponse, null);
  assert.equal(client.snapshot().activeRequest, null);
  assert.equal(ExecutingWorker.instances.at(-1).terminated, true);
});

test('exact old response is rejected when live selection changed while worker was running', async () => {
  ExecutingWorker.instances.length = 0;
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: DeferredWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  const input = validationInput();
  const pending = client.validate(input);
  const worker = ExecutingWorker.instances.at(-1);
  input.setCurrentIdentity(createTopologyEditValidationIdentity({
    ...input.identity,
    selectionRevision: input.identity.selectionRevision + 1,
  }));

  worker.release();
  await assert.rejects(pending, {
    code: 'STALE_VALIDATION_SELECTION_REVISION',
  });
  assert.equal(client.snapshot().acceptedResponse, null);
  assert.equal(client.snapshot().activeRequest, null);
  assert.equal(worker.terminated, true);
});

test('validation refuses to start without live identity custody', () => {
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: SilentWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  const input = validationInput();
  delete input.getCurrentIdentity;
  assert.throws(
    () => client.validate(input),
    /getCurrentIdentity function is required/i,
  );
  assert.equal(client.snapshot().activeRequest, null);
});

test('cancellation terminates active computation and rejects with AbortError', async () => {
  ExecutingWorker.instances.length = 0;
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: SilentWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  const pending = client.validate(validationInput());
  const requestId = client.snapshot().activeRequest.requestId;

  assert.equal(client.cancel(requestId), true);
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(ExecutingWorker.instances.at(-1).terminated, true);
  assert.ok(client.snapshot().cancelledRequestIds.includes(requestId));
});

test('a newer request supersedes and terminates the prior worker', async () => {
  ExecutingWorker.instances.length = 0;
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: SilentWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  const first = client.validate(validationInput(10));
  const firstId = client.snapshot().activeRequest.requestId;
  const second = client.validate(validationInput(20));

  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(ExecutingWorker.instances[0].terminated, true);
  assert.ok(client.snapshot().supersededRequestIds.includes(firstId));
  client.cancel();
  await assert.rejects(second, { name: 'AbortError' });
});

test('constructor failure leaves worker state unchanged and inactive', () => {
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: BrokenConstructorWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  assert.throws(
    () => client.validate(validationInput()),
    /worker startup failed: worker unavailable/i,
  );
  assert.equal(client.snapshot().activeRequest, null);
  assert.equal(client.active, null);
});

test('postMessage failure terminates the worker and clears the active request', async () => {
  ExecutingWorker.instances.length = 0;
  const client = new TopologyEditValidationWorkerClient({
    WorkerCtor: BrokenPostWorker,
    workerUrl: new URL('file:///professional-worker.js'),
  });
  await assert.rejects(
    client.validate(validationInput()),
    /worker startup failed: structured clone failed/i,
  );
  assert.equal(ExecutingWorker.instances.at(-1).terminated, true);
  assert.equal(client.snapshot().activeRequest, null);
  assert.equal(client.active, null);
});

test('production worker URL remains directly nested in the Worker constructor', async () => {
  const source = await readFile(new URL(
    '../src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js',
    import.meta.url,
  ), 'utf8');

  assert.match(source, /return new Worker\(\s*new URL\(\s*['"]\.\/topology-edit-validation-worker\.js['"]\s*,\s*import\.meta\.url\s*\)/s);
  assert.doesNotMatch(
    source,
    /workerUrl\s*=\s*options\.workerUrl\s*\?\?\s*new URL\(/,
  );
});

function clock(values) {
  let index = 0;
  return () => values[index++];
}
