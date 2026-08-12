import {
  deepFreeze,
  isPlainRecord,
  semanticHash,
  stringValue,
} from '../../../core/shared-piping-model/index.js';
import {
  assertTopologyEditValidationWorkerRequest,
  assertTopologyEditValidationWorkerResponse,
} from './topology-edit-validation-worker-contract.js';

export const TOPOLOGY_EDIT_VALIDATION_WORKER_STATE_SCHEMA =
  'TopologyEditValidationWorkerState.v2';
export const TOPOLOGY_EDIT_VALIDATION_WORKER_DISPOSITION_SCHEMA =
  'TopologyEditValidationWorkerDisposition.v2';

const REJECTION_STATUSES = Object.freeze({
  CANCELLED: 'REJECTED_CANCELLED',
  SUPERSEDED: 'REJECTED_SUPERSEDED',
  NO_ACTIVE: 'REJECTED_NO_ACTIVE_REQUEST',
  SOURCE: 'REJECTED_SOURCE_HASH',
  BASIS: 'REJECTED_BASIS_HASH',
  SESSION_ID: 'REJECTED_SESSION_ID',
  SESSION_VERSION: 'REJECTED_SESSION_VERSION',
  SELECTION_REVISION: 'REJECTED_SELECTION_REVISION',
  INTERACTION_ID: 'REJECTED_INTERACTION_ID',
  REQUEST_ID: 'REJECTED_REQUEST_ID',
  PLAN: 'REJECTED_PLAN_HASH',
  SCOPE: 'REJECTED_CHANGED_SCOPE_HASH',
  TOPOLOGY: 'REJECTED_VALIDATED_TOPOLOGY_HASH',
});

export function createTopologyEditValidationWorkerState() {
  return createState({
    generation: 0,
    activeRequest: null,
    supersededRequestIds: [],
    cancelledRequestIds: [],
    acceptedResponse: null,
  });
}

export function assertTopologyEditValidationWorkerState(value) {
  if (!isPlainRecord(value)) fail('state must be an object.');
  if (value.schema !== TOPOLOGY_EDIT_VALIDATION_WORKER_STATE_SCHEMA) {
    fail(`state must use ${TOPOLOGY_EDIT_VALIDATION_WORKER_STATE_SCHEMA}.`);
  }
  const material = { ...value };
  delete material.stateHash;
  if (value.stateHash !== semanticHash(material)) {
    fail('stateHash does not match state authority.', RangeError);
  }
  nonNegativeInteger(value.generation, 'generation');
  sortedUnique(value.supersededRequestIds, 'supersededRequestIds');
  sortedUnique(value.cancelledRequestIds, 'cancelledRequestIds');
  if (value.activeRequest !== null) assertRequestSummary(value.activeRequest);
  if (value.acceptedResponse !== null) assertAcceptedSummary(value.acceptedResponse);
  return value;
}

export function beginTopologyEditValidationWorkerRequest(stateInput, requestInput) {
  const state = assertTopologyEditValidationWorkerState(stateInput);
  const request = assertTopologyEditValidationWorkerRequest(requestInput);
  if (state.activeRequest?.requestId === request.requestId) return state;
  const superseded = new Set(state.supersededRequestIds);
  if (state.activeRequest) superseded.add(state.activeRequest.requestId);
  const cancelled = new Set(state.cancelledRequestIds);
  cancelled.delete(request.requestId);
  return createState({
    generation: state.generation + 1,
    activeRequest: requestSummary(request),
    supersededRequestIds: [...superseded],
    cancelledRequestIds: [...cancelled],
    acceptedResponse: state.acceptedResponse,
  });
}

export function cancelTopologyEditValidationWorkerRequest(stateInput, requestIdInput) {
  const state = assertTopologyEditValidationWorkerState(stateInput);
  const requestId = requiredText(requestIdInput, 'requestId');
  if (state.activeRequest?.requestId !== requestId) return state;
  const cancelled = new Set(state.cancelledRequestIds);
  cancelled.add(requestId);
  return createState({
    generation: state.generation + 1,
    activeRequest: null,
    supersededRequestIds: state.supersededRequestIds,
    cancelledRequestIds: [...cancelled],
    acceptedResponse: state.acceptedResponse,
  });
}

export function acceptTopologyEditValidationWorkerResponse(stateInput, responseInput) {
  const state = assertTopologyEditValidationWorkerState(stateInput);
  const response = assertTopologyEditValidationWorkerResponse(responseInput);
  const status = responseDisposition(state, response);
  if (status !== 'ACCEPTED') return disposition(status, state, response, null);
  const next = createState({
    generation: state.generation + 1,
    activeRequest: null,
    supersededRequestIds: state.supersededRequestIds,
    cancelledRequestIds: state.cancelledRequestIds,
    acceptedResponse: {
      requestId: response.requestId,
      responseHash: response.responseHash,
      validationHash: response.validationHash,
    },
  });
  return disposition('ACCEPTED', next, response, response.receipt);
}

export function assertTopologyEditValidationWorkerDisposition(value) {
  if (!isPlainRecord(value)) fail('disposition must be an object.');
  if (value.schema !== TOPOLOGY_EDIT_VALIDATION_WORKER_DISPOSITION_SCHEMA) {
    fail(`disposition must use ${TOPOLOGY_EDIT_VALIDATION_WORKER_DISPOSITION_SCHEMA}.`);
  }
  const material = { ...value };
  delete material.dispositionHash;
  if (value.dispositionHash !== semanticHash(material)) {
    fail('dispositionHash does not match disposition authority.', RangeError);
  }
  assertTopologyEditValidationWorkerState(value.state);
  return value;
}

function responseDisposition(state, response) {
  if (state.cancelledRequestIds.includes(response.requestId)) {
    return REJECTION_STATUSES.CANCELLED;
  }
  if (state.supersededRequestIds.includes(response.requestId)) {
    return REJECTION_STATUSES.SUPERSEDED;
  }
  if (!state.activeRequest) return REJECTION_STATUSES.NO_ACTIVE;
  const active = state.activeRequest;
  if (active.sourceHash !== response.sourceHash) return REJECTION_STATUSES.SOURCE;
  if (active.basisHash !== response.basisHash) return REJECTION_STATUSES.BASIS;
  if (active.sessionId !== response.sessionId) return REJECTION_STATUSES.SESSION_ID;
  if (active.sessionVersion !== response.sessionVersion) {
    return REJECTION_STATUSES.SESSION_VERSION;
  }
  if (active.selectionRevision !== response.selectionRevision) {
    return REJECTION_STATUSES.SELECTION_REVISION;
  }
  if (active.interactionId !== response.interactionId) {
    return REJECTION_STATUSES.INTERACTION_ID;
  }
  if (active.requestId !== response.requestId) return REJECTION_STATUSES.REQUEST_ID;
  if (active.planHash !== response.planHash) return REJECTION_STATUSES.PLAN;
  if (active.changedScopeHash !== response.changedScopeHash) {
    return REJECTION_STATUSES.SCOPE;
  }
  if (active.validatedTopologyHash !== response.validatedTopologyHash) {
    return REJECTION_STATUSES.TOPOLOGY;
  }
  return 'ACCEPTED';
}

function createState(input) {
  const material = {
    schema: TOPOLOGY_EDIT_VALIDATION_WORKER_STATE_SCHEMA,
    generation: nonNegativeInteger(input.generation, 'generation'),
    activeRequest: input.activeRequest === null ? null : assertRequestSummary(input.activeRequest),
    supersededRequestIds: normalizedIds(input.supersededRequestIds),
    cancelledRequestIds: normalizedIds(input.cancelledRequestIds),
    acceptedResponse: input.acceptedResponse === null
      ? null
      : assertAcceptedSummary(input.acceptedResponse),
  };
  return deepFreeze({ ...material, stateHash: semanticHash(material) });
}

function disposition(status, state, response, receipt) {
  const material = {
    schema: TOPOLOGY_EDIT_VALIDATION_WORKER_DISPOSITION_SCHEMA,
    status,
    requestId: response.requestId,
    responseHash: response.responseHash,
    state,
    receipt,
  };
  return deepFreeze({ ...material, dispositionHash: semanticHash(material) });
}

function requestSummary(request) {
  return {
    requestId: request.requestId,
    sourceHash: request.sourceHash,
    basisHash: request.basisHash,
    sessionId: request.sessionId,
    sessionVersion: request.sessionVersion,
    selectionRevision: request.selectionRevision,
    interactionId: request.interactionId,
    identityHash: request.identityHash,
    planHash: request.planHash,
    changedScopeHash: request.changedScopeHash,
    validatedTopologyHash: request.validatedTopologyHash,
  };
}

function assertRequestSummary(value) {
  if (!isPlainRecord(value)) fail('activeRequest must be an object.');
  return {
    requestId: requiredText(value.requestId, 'activeRequest.requestId'),
    sourceHash: requiredText(value.sourceHash, 'activeRequest.sourceHash'),
    basisHash: requiredText(value.basisHash, 'activeRequest.basisHash'),
    sessionId: requiredText(value.sessionId, 'activeRequest.sessionId'),
    sessionVersion: nonNegativeInteger(
      value.sessionVersion,
      'activeRequest.sessionVersion',
    ),
    selectionRevision: nonNegativeInteger(
      value.selectionRevision,
      'activeRequest.selectionRevision',
    ),
    interactionId: requiredText(value.interactionId, 'activeRequest.interactionId'),
    identityHash: requiredText(value.identityHash, 'activeRequest.identityHash'),
    planHash: requiredText(value.planHash, 'activeRequest.planHash'),
    changedScopeHash: requiredText(
      value.changedScopeHash,
      'activeRequest.changedScopeHash',
    ),
    validatedTopologyHash: requiredText(
      value.validatedTopologyHash,
      'activeRequest.validatedTopologyHash',
    ),
  };
}

function assertAcceptedSummary(value) {
  if (!isPlainRecord(value)) fail('acceptedResponse must be an object.');
  return {
    requestId: requiredText(value.requestId, 'acceptedResponse.requestId'),
    responseHash: requiredText(value.responseHash, 'acceptedResponse.responseHash'),
    validationHash: requiredText(value.validationHash, 'acceptedResponse.validationHash'),
  };
}

function normalizedIds(value) {
  if (!Array.isArray(value)) fail('request ID collection must be an array.');
  return [...new Set(value.map((row, index) => (
    requiredText(row, `requestIds[${index}]`)
  )))].sort(compareText);
}
function sortedUnique(value, label) {
  const normalized = normalizedIds(value);
  if (normalized.length !== value.length
    || normalized.some((row, index) => row !== value[index])) {
    fail(`${label} must be sorted and unique.`, RangeError);
  }
}
function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    fail(`${label} must be a non-negative integer.`, RangeError);
  }
  return number;
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) fail(`${label} is required.`);
  return text;
}
function compareText(left, right) { return left.localeCompare(right); }
function fail(message, Constructor = TypeError) {
  throw new Constructor(`TopologyEditValidationWorkerState: ${message}`);
}
