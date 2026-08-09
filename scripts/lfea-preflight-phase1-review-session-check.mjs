#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../src/workspace/lfea-preflight-phase1-schema.js';
import {
  LFEA_PREFLIGHT_REVIEW_ACTION,
} from '../src/workspace/lfea-preflight-phase1-review-ledger.js';
import {
  appendLfeaPreflightPhase1ReviewAction,
  createLfeaPreflightPhase1ReviewSession,
  getLfeaPreflightPhase1CellReview,
  getLfeaPreflightPhase1ReviewLedger,
  getLfeaPreflightPhase1ReviewSessionSnapshot,
  registerLfeaPreflightPhase1CellProposal,
  registerLfeaPreflightPhase1Proposal,
} from '../src/workspace/lfea-preflight-phase1-review-session.js';

const targetId = 'P1-LINE-QUALIFIED';
const fieldOrdinal = LFEA_PREFLIGHT_ENGINEERING_FIELDS.indexOf('piping.wallThicknessMm');
const proposedOrdinal = LFEA_PREFLIGHT_ENGINEERING_FIELDS.indexOf('material.materialCode');
const cells = new Map();
cells.set(`${targetId}:${fieldOrdinal}`, cell(fieldOrdinal, 7.11, LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT, 'RESOLVED_EXACT'));
cells.set(`${targetId}:${proposedOrdinal}`, cell(proposedOrdinal, 'A106-B', LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW, 'PROPOSED_REVIEW'));
const source = Object.freeze({
  blocked: false,
  datasetIdentity: 'fnv1a64:p06c-dataset',
  structuralHash: 'fnv1a64:p06c-source',
});
const providers = Object.freeze({
  getLine(_source, requested) {
    return String(requested) === targetId ? Object.freeze({ targetId }) : null;
  },
  getCell(_source, requested, ordinal) {
    return cells.get(`${String(requested)}:${ordinal}`) ?? cell(
      ordinal,
      null,
      LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
      'BLOCKED_MISSING',
    );
  },
});
const sourceBefore = JSON.stringify([...cells.entries()]);
const session = createLfeaPreflightPhase1ReviewSession(source, providers);

assert.throws(
  () => registerLfeaPreflightPhase1CellProposal(session, {
    targetId,
    fieldOrdinal,
    createdAt: '2026-08-09T10:00:00.000Z',
  }),
  (error) => error?.code === 'E_P06_REVIEW_CELL_NOT_PROPOSED',
  'Exact/resolved cells must not be silently promoted into proposals.',
);
console.log('P06C-01 PASS exact resolved engineering cells are not fabricated into proposals');

const upstreamProposal = registerLfeaPreflightPhase1CellProposal(session, {
  targetId,
  fieldOrdinal: proposedOrdinal,
  createdAt: '2026-08-09T10:00:01.000Z',
  sourceEvidence: { proposalAuthority: 'QUALIFICATION_UPSTREAM_PRODUCER' },
});
assert.equal(upstreamProposal.proposedValue, 'A106-B');
assert.equal(upstreamProposal.fieldId, 'material.materialCode');
console.log(`P06C-02 PASS explicit upstream proposal registered ${upstreamProposal.proposalId}`);

let result = appendLfeaPreflightPhase1ReviewAction(session, {
  action: LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT,
  targetId,
  fieldOrdinal: proposedOrdinal,
  proposalId: upstreamProposal.proposalId,
  actor: 'qualification-reviewer',
  reason: 'Material evidence reviewed and accepted.',
  occurredAt: '2026-08-09T10:00:02.000Z',
});
assert.equal(result.reviewState.disposition, 'ACCEPTED');
assert.equal(JSON.stringify([...cells.entries()]), sourceBefore, 'Accept must not mutate engineering source cells.');
const acceptedEventId = result.event.eventId;
console.log('P06C-03 PASS ACCEPT appends immutable event without mutating engineering values');

const secondProposal = registerLfeaPreflightPhase1Proposal(session, {
  targetId,
  fieldOrdinal,
  proposedValue: 7.5,
  method: 'PROJECT_SPECIFICATION_PROPOSAL',
  sourceEvidence: { source: 'ProjectSpec.pdf', locator: 'P06C-7.5' },
  createdAt: '2026-08-09T10:00:03.000Z',
});
result = appendLfeaPreflightPhase1ReviewAction(session, {
  action: LFEA_PREFLIGHT_REVIEW_ACTION.REJECT,
  targetId,
  fieldOrdinal,
  proposalId: secondProposal.proposalId,
  actor: 'qualification-reviewer',
  reason: 'Project proposal conflicts with controlled class data.',
  occurredAt: '2026-08-09T10:00:04.000Z',
});
assert.equal(result.reviewState.disposition, 'REJECTED');
console.log('P06C-04 PASS REJECT appends proposal-specific review evidence');

result = appendLfeaPreflightPhase1ReviewAction(session, {
  action: LFEA_PREFLIGHT_REVIEW_ACTION.OVERRIDE,
  targetId,
  fieldOrdinal,
  value: 8,
  actor: 'qualification-reviewer',
  reason: 'Controlled project specification requires 8.0 mm wall.',
  occurredAt: '2026-08-09T10:00:05.000Z',
  evidence: { specification: 'P06C-SPEC-008' },
});
assert.equal(result.reviewState.disposition, 'OVERRIDDEN');
assert.equal(result.reviewState.overrideValue, 8);
const overrideEventId = result.event.eventId;
assert.equal(JSON.stringify([...cells.entries()]), sourceBefore, 'Override review event must not mutate source cell value.');
console.log('P06C-05 PASS OVERRIDE records replacement value as review evidence only');

result = appendLfeaPreflightPhase1ReviewAction(session, {
  action: LFEA_PREFLIGHT_REVIEW_ACTION.UNDO,
  targetId,
  fieldOrdinal,
  compensatesEventId: overrideEventId,
  actor: 'qualification-reviewer',
  reason: 'Withdraw override after controlled evidence reconciliation.',
  occurredAt: '2026-08-09T10:00:06.000Z',
});
assert.equal(result.reviewState.disposition, 'REJECTED');
assert(result.reviewState.compensatedEventIds.includes(overrideEventId));
const ledgerAfterUndo = getLfeaPreflightPhase1ReviewLedger(session);
assert(ledgerAfterUndo.events.some((event) => event.eventId === overrideEventId), 'UNDO must not delete override history.');
console.log('P06C-06 PASS UNDO is a compensating event; historical override remains in ledger');

result = appendLfeaPreflightPhase1ReviewAction(session, {
  action: LFEA_PREFLIGHT_REVIEW_ACTION.DEFER,
  targetId,
  fieldOrdinal,
  actor: 'qualification-reviewer',
  reason: 'Awaiting process/project authority reconciliation.',
  occurredAt: '2026-08-09T10:00:07.000Z',
  evidence: { dependency: 'PROJECT_AUTHORITY' },
});
assert.equal(result.reviewState.disposition, 'DEFERRED');
assert.equal(JSON.stringify([...cells.entries()]), sourceBefore);
console.log('P06C-07 PASS DEFER appends immutable dependency evidence only');

const cellReview = getLfeaPreflightPhase1CellReview(session, targetId, fieldOrdinal);
assert.equal(cellReview.events.length, 4);
assert(cellReview.proposalIds.includes(secondProposal.proposalId));
assert.equal(cellReview.reviewState.disposition, 'DEFERRED');
const sessionSnapshot = getLfeaPreflightPhase1ReviewSessionSnapshot(session);
assert.equal(sessionSnapshot.proposalCount, 2);
assert.equal(sessionSnapshot.eventCount, 5);
assert(sessionSnapshot.eventIds.includes(acceptedEventId));
assert.match(sessionSnapshot.ledgerSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
console.log('P06C-08 PASS per-cell Trace can recover proposal IDs, event history and ledger identity');

const staleProposal = Object.freeze({ ...secondProposal, proposalId: 'PRP-UNKNOWN' });
void staleProposal;
assert.throws(
  () => appendLfeaPreflightPhase1ReviewAction(session, {
    action: LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT,
    targetId,
    fieldOrdinal,
    proposalId: 'PRP-UNKNOWN',
    actor: 'qualification-reviewer',
    reason: 'Must fail.',
    occurredAt: '2026-08-09T10:00:08.000Z',
  }),
  (error) => error?.code === 'E_P06_REVIEW_PROPOSAL_UNKNOWN',
);
console.log('P06C-09 PASS stale/unregistered proposal cannot be accepted');

const sessionSource = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-session.js', 'utf8');
assert.doesNotMatch(sessionSource, /EventBus|publish\(|dispatchEvent|masterDataController|runLinearPiping|solveInputXml|compileSolver|factorization/u);
assert.doesNotMatch(sessionSource, /document\.|createElement|innerHTML|insertAdjacentHTML/u);
assert.doesNotMatch(sessionSource, /Date\.now|Math\.random|randomUUID|localeCompare/u);
assert.doesNotMatch(sessionSource, /enrichment-ui-phase0/u);
assert.match(sessionSource, /E_P06_REVIEW_MUTATED_SOURCE/u);
console.log('P06C-10 PASS review session has no model/master/solver/DOM/clock/random/test-fixture mutation authority');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-review-session',
  status: 'PASS',
  proposalCount: sessionSnapshot.proposalCount,
  eventCount: sessionSnapshot.eventCount,
  ledgerSemanticHash: sessionSnapshot.ledgerSemanticHash,
  actions: ['ACCEPT', 'REJECT', 'OVERRIDE', 'DEFER', 'UNDO'],
  sourceMutated: false,
  acceptedEventId,
  overrideEventId,
}));

function cell(ordinal, value, status, statusText) {
  const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[ordinal];
  return Object.freeze({
    fieldId,
    fieldOrdinal: ordinal,
    value,
    status,
    statusText,
    sourceKind: status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING ? 'UNRESOLVED' : 'QUALIFICATION_SOURCE',
    sourceHash: status === LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING ? null : 'fnv1a64:p06c-cell',
    locator: `/qualification/${ordinal}`,
    method: statusText,
    candidateCount: status === LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW ? 1 : 0,
  });
}
