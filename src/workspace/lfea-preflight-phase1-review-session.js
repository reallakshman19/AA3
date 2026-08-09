import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from './lfea-preflight-phase1-schema.js';
import {
  LFEA_PREFLIGHT_REVIEW_ACTION,
  appendLfeaPreflightReviewEvent,
  createLfeaPreflightReviewLedger,
  createLfeaPreflightReviewProposal,
  projectLfeaPreflightReviewState,
} from './lfea-preflight-phase1-review-ledger.js';

export const LFEA_PREFLIGHT_PHASE1_REVIEW_SESSION_SCHEMA = 'lfea-preflight-phase1-review-session/v1';

const SESSION_STATE = new WeakMap();

/**
 * Bind the append-only review ledger to one exact indexed review source.
 * The session owns review evidence only. It never mutates source values, the
 * shared model, master data, solver state, or authorization state.
 */
export function createLfeaPreflightPhase1ReviewSession(source, providers, options = {}) {
  requireSource(source);
  const acceptedProviders = requireProviders(providers);
  const reviewerPolicyId = nonempty(
    options.reviewerPolicyId ?? 'LFEA-PREFLIGHT-PHASE1-REVIEW-R1',
    'reviewerPolicyId',
  );
  const ledger = createLfeaPreflightReviewLedger({
    datasetIdentity: source.datasetIdentity,
    reviewerPolicyId,
  });
  const session = Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_REVIEW_SESSION_SCHEMA,
    datasetIdentity: source.datasetIdentity,
    sourceStructuralHash: source.structuralHash,
    reviewerPolicyId,
  });
  SESSION_STATE.set(session, {
    source,
    providers: acceptedProviders,
    ledger,
    proposals: new Map(),
    proposalIdsByCell: new Map(),
  });
  return session;
}

/** Register an explicit upstream proposal without applying it. */
export function registerLfeaPreflightPhase1Proposal(session, input) {
  const state = requireSession(session);
  const targetId = requireTarget(state, input?.targetId);
  const fieldOrdinal = requireFieldOrdinal(input?.fieldOrdinal);
  const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];
  const cell = requireCell(state, targetId, fieldOrdinal);
  const proposal = createLfeaPreflightReviewProposal({
    datasetIdentity: session.datasetIdentity,
    targetId,
    fieldId,
    proposedValue: input?.proposedValue,
    method: nonempty(input?.method, 'proposal.method'),
    sourceEvidence: Object.freeze({
      ...(input?.sourceEvidence ?? {}),
      upstreamCellStatus: cell.statusText,
      upstreamCellMethod: cell.method,
      upstreamCellLocator: cell.locator,
      upstreamCellSourceHash: cell.sourceHash,
    }),
    createdAt: requireTimestamp(input?.createdAt, 'proposal.createdAt'),
  });
  state.proposals.set(proposal.proposalId, proposal);
  const key = cellKey(targetId, fieldOrdinal);
  const ids = state.proposalIdsByCell.get(key) ?? [];
  if (!ids.includes(proposal.proposalId)) {
    ids.push(proposal.proposalId);
    ids.sort(compareAscii);
    state.proposalIdsByCell.set(key, ids);
  }
  return proposal;
}

/**
 * Append one review action. ACCEPT/REJECT require a matching registered
 * proposal; OVERRIDE/DEFER act on the selected cell; UNDO compensates a prior
 * event. The indexed engineering source is never modified.
 */
export function appendLfeaPreflightPhase1ReviewAction(session, input) {
  const state = requireSession(session);
  const action = requireAction(input?.action);
  const targetId = requireTarget(state, input?.targetId);
  const fieldOrdinal = requireFieldOrdinal(input?.fieldOrdinal);
  const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];
  const beforeCell = requireCell(state, targetId, fieldOrdinal);
  const proposalId = normalizeProposalForAction(state, action, input?.proposalId, targetId, fieldOrdinal);
  const priorLedgerHash = state.ledger.semanticHash;
  state.ledger = appendLfeaPreflightReviewEvent(state.ledger, {
    action,
    targetId,
    fieldId,
    proposalId,
    value: input?.value,
    actor: nonempty(input?.actor, 'review.actor'),
    reason: nonempty(input?.reason, 'review.reason'),
    occurredAt: requireTimestamp(input?.occurredAt, 'review.occurredAt'),
    evidence: Object.freeze({
      ...(input?.evidence ?? {}),
      sourceStructuralHash: session.sourceStructuralHash,
      cellSourceHash: beforeCell.sourceHash,
      cellStatus: beforeCell.statusText,
      cellMethod: beforeCell.method,
      cellLocator: beforeCell.locator,
      priorLedgerHash,
    }),
    compensatesEventId: input?.compensatesEventId,
  });
  const afterCell = requireCell(state, targetId, fieldOrdinal);
  if (semanticHash(beforeCell) !== semanticHash(afterCell)) {
    throw reviewSessionError(
      'E_P06_REVIEW_MUTATED_SOURCE',
      'Review event append unexpectedly changed the indexed engineering source.',
    );
  }
  return Object.freeze({
    event: state.ledger.events.at(-1),
    ledgerSemanticHash: state.ledger.semanticHash,
    reviewState: projectLfeaPreflightReviewState(state.ledger, targetId, fieldId),
  });
}

export function getLfeaPreflightPhase1ReviewSessionSnapshot(session) {
  const state = requireSession(session);
  return Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_REVIEW_SESSION_SCHEMA,
    datasetIdentity: session.datasetIdentity,
    sourceStructuralHash: session.sourceStructuralHash,
    reviewerPolicyId: session.reviewerPolicyId,
    proposalCount: state.proposals.size,
    eventCount: state.ledger.events.length,
    ledgerSemanticHash: state.ledger.semanticHash,
    eventIds: Object.freeze(state.ledger.events.map((event) => event.eventId)),
    proposalIds: Object.freeze([...state.proposals.keys()].sort(compareAscii)),
  });
}

export function getLfeaPreflightPhase1CellReview(session, targetId, fieldOrdinal) {
  const state = requireSession(session);
  const target = requireTarget(state, targetId);
  const ordinal = requireFieldOrdinal(fieldOrdinal);
  const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[ordinal];
  const proposalIds = Object.freeze([...(state.proposalIdsByCell.get(cellKey(target, ordinal)) ?? [])]);
  const proposals = Object.freeze(proposalIds.map((proposalId) => state.proposals.get(proposalId)));
  const reviewState = projectLfeaPreflightReviewState(state.ledger, target, fieldId);
  const events = Object.freeze(state.ledger.events.filter((event) =>
    event.targetId === target && event.fieldId === fieldId));
  return Object.freeze({
    targetId: target,
    fieldOrdinal: ordinal,
    fieldId,
    proposalIds,
    proposals,
    reviewState,
    events,
    ledgerSemanticHash: state.ledger.semanticHash,
  });
}

export function getLfeaPreflightPhase1ReviewLedger(session) {
  return requireSession(session).ledger;
}

/**
 * Convenience registration for a cell that is already explicitly tagged as a
 * proposal by an upstream producer. Exact/resolved/blocked cells are not
 * silently promoted into proposals.
 */
export function registerLfeaPreflightPhase1CellProposal(session, input) {
  const state = requireSession(session);
  const targetId = requireTarget(state, input?.targetId);
  const fieldOrdinal = requireFieldOrdinal(input?.fieldOrdinal);
  const cell = requireCell(state, targetId, fieldOrdinal);
  if (cell.status !== LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW) {
    throw reviewSessionError(
      'E_P06_REVIEW_CELL_NOT_PROPOSED',
      `Cell ${targetId}/${fieldOrdinal} is not explicitly PROPOSED_REVIEW.`,
    );
  }
  return registerLfeaPreflightPhase1Proposal(session, {
    ...input,
    proposedValue: input?.proposedValue ?? cell.value,
    method: input?.method ?? cell.method,
    sourceEvidence: {
      ...(input?.sourceEvidence ?? {}),
      upstreamProposalSource: cell.sourceKind,
    },
  });
}

function normalizeProposalForAction(state, action, proposalId, targetId, fieldOrdinal) {
  if (![LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT, LFEA_PREFLIGHT_REVIEW_ACTION.REJECT].includes(action)) {
    return proposalId === undefined || proposalId === null || String(proposalId).trim() === ''
      ? null
      : requireProposal(state, proposalId, targetId, fieldOrdinal).proposalId;
  }
  return requireProposal(state, proposalId, targetId, fieldOrdinal).proposalId;
}

function requireProposal(state, proposalId, targetId, fieldOrdinal) {
  const id = nonempty(proposalId, 'proposalId');
  const proposal = state.proposals.get(id) ?? null;
  if (proposal === null) {
    throw reviewSessionError('E_P06_REVIEW_PROPOSAL_UNKNOWN', `Unknown registered proposal: ${id}`);
  }
  const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];
  if (proposal.datasetIdentity !== state.source.datasetIdentity
    || proposal.targetId !== targetId
    || proposal.fieldId !== fieldId) {
    throw reviewSessionError(
      'E_P06_REVIEW_PROPOSAL_STALE',
      `Proposal ${id} does not match the selected source/cell identity.`,
    );
  }
  return proposal;
}

function requireTarget(state, value) {
  const targetId = nonempty(value, 'targetId');
  const line = state.providers.getLine(state.source, targetId);
  if (line === null || line === undefined || String(line.targetId) !== targetId) {
    throw reviewSessionError('E_P06_REVIEW_TARGET_UNKNOWN', `Unknown Phase-1 review target: ${targetId}`);
  }
  return targetId;
}

function requireCell(state, targetId, fieldOrdinal) {
  const cell = state.providers.getCell(state.source, targetId, fieldOrdinal);
  if (cell === null || cell === undefined
    || cell.fieldOrdinal !== fieldOrdinal
    || cell.fieldId !== LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal]) {
    throw reviewSessionError(
      'E_P06_REVIEW_CELL_STALE',
      `Phase-1 review cell identity is stale: ${targetId}/${fieldOrdinal}`,
    );
  }
  return cell;
}

function requireSource(source) {
  if (!source || typeof source !== 'object' || source.blocked
    || !source.datasetIdentity || !source.structuralHash) {
    throw reviewSessionError('E_P06_REVIEW_SOURCE_REQUIRED', 'A non-blocked Phase-1 review source is required.');
  }
}

function requireProviders(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.getLine !== 'function'
    || typeof value.getCell !== 'function') {
    throw reviewSessionError('E_P06_REVIEW_PROVIDERS_REQUIRED', 'Phase-1 review providers must expose getLine/getCell.');
  }
  return Object.freeze({ getLine: value.getLine, getCell: value.getCell });
}

function requireFieldOrdinal(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= LFEA_PREFLIGHT_ENGINEERING_FIELDS.length) {
    throw reviewSessionError('E_P06_FIELD_ORDINAL_INVALID', `Phase-1 field ordinal is invalid: ${value}`);
  }
  return value;
}

function requireAction(value) {
  const action = String(value ?? '').trim().toUpperCase();
  if (!Object.values(LFEA_PREFLIGHT_REVIEW_ACTION).includes(action)) {
    throw reviewSessionError('E_P06_REVIEW_ACTION_INVALID', `Unknown Phase-1 review action: ${value}`);
  }
  return action;
}

function requireTimestamp(value, field) {
  const text = nonempty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(text)) {
    throw reviewSessionError('E_P06_REVIEW_TIMESTAMP_INVALID', `${field} must be explicit UTC ISO-8601.`);
  }
  return text;
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw reviewSessionError('E_P06_REVIEW_FIELD_REQUIRED', `${field} must be a non-empty string.`);
  return text;
}

function cellKey(targetId, fieldOrdinal) {
  return `${targetId}\u0000${fieldOrdinal}`;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireSession(session) {
  const state = SESSION_STATE.get(session);
  if (!state) throw reviewSessionError('E_P06_REVIEW_SESSION_REQUIRED', 'A Phase-1 review session is required.');
  if (state.source.datasetIdentity !== session.datasetIdentity
    || state.source.structuralHash !== session.sourceStructuralHash) {
    throw reviewSessionError('E_P06_REVIEW_SOURCE_STALE', 'Phase-1 review session source identity is stale.');
  }
  return state;
}

function reviewSessionError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_REVIEW_SESSION';
  return error;
}
