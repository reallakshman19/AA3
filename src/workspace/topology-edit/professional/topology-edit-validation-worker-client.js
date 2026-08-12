import {
  assertTopologyEditOperationPlan,
} from './topology-edit-operation-plan.js';
import {
  assertTopologyEditValidationWorkerResponse,
  createTopologyEditValidationWorkerRequest,
} from './topology-edit-validation-worker-contract.js';
import {
  assertTopologyEditValidationIdentity,
  createTopologyEditValidationIdentity,
  topologyEditValidationIdentityStaleFields,
} from './topology-edit-validation-identity.js';
import { topologyEditDiagnosticsHash } from './topology-edit-validation-diagnostics.js';
import {
  acceptTopologyEditValidationWorkerResponse,
  beginTopologyEditValidationWorkerRequest,
  cancelTopologyEditValidationWorkerRequest,
  createTopologyEditValidationWorkerState,
} from './topology-edit-validation-worker-state.js';

const DEFAULT_POLICY = Object.freeze({
  fastPathBudgetMs: 16,
  warningBudgetMs: 100,
  hysteresisMs: 4,
});

const RESPONSE_IDENTITY_FIELDS = Object.freeze([
  'sourceHash',
  'basisHash',
  'sessionId',
  'sessionVersion',
  'selectionRevision',
  'interactionId',
  'requestId',
]);

export class TopologyEditValidationWorkerClient {
  constructor(options = {}) {
    this.WorkerCtor = options.WorkerCtor ?? null;
    this.workerUrl = options.workerUrl ?? null;
    this.state = createTopologyEditValidationWorkerState();
    this.active = null;
    this.destroyed = false;
  }

  validate(input = {}) {
    this.assertAvailable();
    const plan = assertTopologyEditOperationPlan(input.operationPlan);
    const identity = assertTopologyEditValidationIdentity(input.identity);
    const getCurrentIdentity = requiredIdentityProvider(input.getCurrentIdentity);
    const startIdentity = assertTopologyEditValidationIdentity(getCurrentIdentity());
    const staleStartFields = topologyEditValidationIdentityStaleFields(identity, startIdentity);
    if (staleStartFields.length) throw staleIdentityError(staleStartFields[0]);
    const canonicalTopology = input.canonicalTopology;
    const previousDiagnostics = input.previousDiagnostics ?? [];
    const request = input.request ?? createTopologyEditValidationWorkerRequest({
      identity,
      operationPlan: plan,
      validatedTopologyHash: canonicalTopology?.canonicalTopologyHash,
      previousIssueHash: topologyEditDiagnosticsHash(previousDiagnostics),
      checkerOptions: input.checkerOptions ?? {},
      performancePolicy: input.performancePolicy ?? DEFAULT_POLICY,
      blockingSeverities: input.blockingSeverities ?? ['HIGH'],
    });
    const requestIdentity = createTopologyEditValidationIdentity(request);
    const staleRequestFields = topologyEditValidationIdentityStaleFields(
      identity,
      requestIdentity,
    );
    if (staleRequestFields.length) throw staleIdentityError(staleRequestFields[0]);
    const worker = this.createWorker();
    const prior = this.active;
    this.state = beginTopologyEditValidationWorkerRequest(this.state, request);
    if (prior) {
      this.cleanupActive(prior);
      prior.reject(cancellationError('SUPERSEDED', prior.request.requestId));
    }

    return new Promise((resolve, reject) => {
      const active = {
        request,
        getCurrentIdentity,
        worker,
        resolve,
        reject,
        settled: false,
        onMessage: (event) => this.handleMessage(event),
        onError: (event) => this.handleWorkerError(event),
      };
      this.active = active;
      try {
        worker.addEventListener('message', active.onMessage);
        worker.addEventListener('error', active.onError);
        worker.postMessage({
          type: 'VALIDATE',
          request,
          operationPlan: plan,
          canonicalTopology,
          previousDiagnostics,
        });
      } catch (error) {
        this.rejectActiveError(active, workerStartupFailure(error));
      }
    });
  }

  cancel(requestId = this.active?.request.requestId, reason = 'CANCELLED') {
    if (!this.active || this.active.request.requestId !== requestId) return false;
    const active = this.active;
    this.state = cancelTopologyEditValidationWorkerRequest(this.state, requestId);
    this.cleanupActive(active);
    active.reject(cancellationError(reason, requestId));
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.active) this.cancel(this.active.request.requestId, 'DESTROYED');
  }

  snapshot() {
    return this.state;
  }

  handleMessage(event) {
    const active = this.active;
    if (!active || active.settled) return;
    const payload = event.data;
    if (payload?.type === 'FAILED') {
      if (payload.requestId !== active.request.requestId) {
        this.rejectActiveIdentity(active, 'requestId');
        return;
      }
      this.cleanupActive(active);
      active.reject(workerFailure(payload.error));
      return;
    }
    if (payload?.type !== 'VALIDATED') return;
    const responseStaleField = firstResponseIdentityMismatch(active.request, payload);
    if (responseStaleField) {
      this.rejectActiveIdentity(active, responseStaleField);
      return;
    }
    let liveStaleFields;
    try {
      const liveIdentity = assertTopologyEditValidationIdentity(active.getCurrentIdentity());
      liveStaleFields = topologyEditValidationIdentityStaleFields(
        createTopologyEditValidationIdentity(active.request),
        liveIdentity,
      );
    } catch (error) {
      this.rejectActiveError(active, error);
      return;
    }
    if (liveStaleFields.length) {
      this.rejectActiveIdentity(active, liveStaleFields[0]);
      return;
    }
    try {
      const response = assertTopologyEditValidationWorkerResponse(payload.response);
      const disposition = acceptTopologyEditValidationWorkerResponse(this.state, response);
      this.state = disposition.state;
      this.cleanupActive(active);
      if (disposition.status !== 'ACCEPTED') {
        active.reject(new Error(
          `TopologyEditValidationWorkerClient: response ${disposition.status}.`,
        ));
        return;
      }
      active.resolve({
        request: active.request,
        response,
        receipt: disposition.receipt,
        disposition,
      });
    } catch (error) {
      this.cleanupActive(active);
      active.reject(error);
    }
  }

  rejectActiveIdentity(active, field) {
    this.rejectActiveError(active, staleIdentityError(field));
  }

  rejectActiveError(active, error) {
    this.state = cancelTopologyEditValidationWorkerRequest(
      this.state,
      active.request.requestId,
    );
    this.cleanupActive(active);
    active.reject(error);
  }

  handleWorkerError(event) {
    const active = this.active;
    if (!active || active.settled) return;
    this.cleanupActive(active);
    active.reject(new Error(
      `TopologyEditValidationWorkerClient: ${event?.message || 'validation worker failed'}.`,
    ));
  }

  cleanupActive(active) {
    if (active.settled) return;
    active.settled = true;
    active.worker.removeEventListener?.('message', active.onMessage);
    active.worker.removeEventListener?.('error', active.onError);
    active.worker.terminate?.();
    if (this.active === active) this.active = null;
  }

  createWorker() {
    try {
      if (typeof this.WorkerCtor === 'function') {
        return new this.WorkerCtor(
          this.workerUrl ?? new URL('./topology-edit-validation-worker.js', import.meta.url),
          { type: 'module', name: 'topology-edit-professional-validation' },
        );
      }
      if (this.workerUrl) {
        return new Worker(this.workerUrl, {
          type: 'module',
          name: 'topology-edit-professional-validation',
        });
      }
      return new Worker(
        new URL('./topology-edit-validation-worker.js', import.meta.url),
        { type: 'module', name: 'topology-edit-professional-validation' },
      );
    } catch (error) {
      throw workerStartupFailure(error);
    }
  }

  assertAvailable() {
    if (this.destroyed) {
      throw new Error('TopologyEditValidationWorkerClient: client is destroyed.');
    }
    if (typeof this.WorkerCtor !== 'function' && typeof Worker !== 'function') {
      throw new Error('TopologyEditValidationWorkerClient: module Worker support is required.');
    }
  }
}

function firstResponseIdentityMismatch(request, payload) {
  const response = payload?.response;
  if (!response || typeof response !== 'object' || Array.isArray(response)) return 'response';
  for (const field of RESPONSE_IDENTITY_FIELDS) {
    const actual = field === 'requestId' ? payload.requestId : response[field];
    if (actual !== request[field]) return field;
    if (field === 'requestId' && response.requestId !== request.requestId) return field;
  }
  return null;
}

function requiredIdentityProvider(value) {
  if (typeof value !== 'function') {
    throw new TypeError(
      'TopologyEditValidationWorkerClient: getCurrentIdentity function is required.',
    );
  }
  return value;
}

function staleIdentityError(field) {
  const error = new RangeError(
    `TopologyEditValidationWorkerClient: stale validation response ${field}.`,
  );
  error.code = `STALE_VALIDATION_${String(field)
    .replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`;
  return error;
}

function cancellationError(reason, requestId) {
  const error = new Error(
    `TopologyEditValidationWorkerClient: ${reason.toLowerCase()} ${requestId}.`,
  );
  error.name = 'AbortError';
  return error;
}

function workerFailure(value) {
  const error = new Error(
    `TopologyEditValidationWorkerClient: ${value?.message || 'validation failed'}.`,
  );
  error.name = value?.name || 'Error';
  return error;
}

function workerStartupFailure(value) {
  const error = new Error(
    `TopologyEditValidationWorkerClient: worker startup failed: ${
      value instanceof Error ? value.message : String(value)
    }.` ,
  );
  error.name = value instanceof Error ? value.name : 'Error';
  return error;
}
