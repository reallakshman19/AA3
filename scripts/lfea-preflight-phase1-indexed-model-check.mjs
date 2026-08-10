#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ENGINEERING_FIELDS as PHASE0_ENGINEERING_FIELDS,
  FIELD_STATUS as PHASE0_FIELD_STATUS,
  buildEnrichmentUiFixture,
} from './enrichment-ui-phase0-fixtures.mjs';
import {
  LFEA_PREFLIGHT_COLUMN_SCHEMA,
  LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_EXCEPTION_QUEUE,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../src/workspace/lfea-preflight-phase1-schema.js';
import {
  LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
  buildLfeaPreflightPhase1Index,
  countLfeaPreflightPhase1Facet,
  createLfeaPreflightPhase1TargetId,
  getLfeaPreflightPhase1ComponentViewport,
  getLfeaPreflightPhase1Queue,
  lookupLfeaPreflightPhase1NormalizedKey,
  queryLfeaPreflightPhase1Index,
} from '../src/workspace/lfea-preflight-phase1-index.js';
import {
  LFEA_PREFLIGHT_REVIEW_ACTION,
  appendLfeaPreflightReviewEvent,
  createLfeaPreflightReviewLedger,
  createLfeaPreflightReviewProposal,
  projectLfeaPreflightReviewState,
  requireLfeaPreflightReviewLedger,
  reviewLedgerEventIds,
} from '../src/workspace/lfea-preflight-phase1-review-ledger.js';

const PINNED_TIMESTAMP = '2026-08-02T00:00:00.000Z';
const EXPECTED_P06A_LARGE_STRUCTURAL_HASH = 'fnv1a64:27bd84d10b3436e3';

assert.deepEqual(LFEA_PREFLIGHT_ENGINEERING_FIELDS, PHASE0_ENGINEERING_FIELDS,
  'P06A production schema must exactly adopt the pinned Phase-0 40-field contract.');
assert.deepEqual(LFEA_PREFLIGHT_FIELD_STATUS, PHASE0_FIELD_STATUS,
  'P06A field-status ordinals must exactly adopt the pinned Phase-0 contract.');
assert.equal(LFEA_PREFLIGHT_COLUMN_SCHEMA.length, 40);
assert.deepEqual(LFEA_PREFLIGHT_COLUMN_SCHEMA.map((column) => column.ordinal), [...Array(40).keys()]);
console.log(`P06A-01 PASS closed 40-column ordinal schema ${LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH}`);

const stableA = createLfeaPreflightPhase1TargetId({
  sourceModelId: 'MODEL-SHA-001',
  sourceEntityId: 'LINE-100',
  targetKind: 'LINE',
  provenancePath: '/lines/LINE-100',
});
const stableB = createLfeaPreflightPhase1TargetId({
  sourceModelId: 'MODEL-SHA-001',
  sourceEntityId: 'LINE-100',
  targetKind: 'LINE',
  provenancePath: '/lines/LINE-100',
});
const changedProvenance = createLfeaPreflightPhase1TargetId({
  sourceModelId: 'MODEL-SHA-001',
  sourceEntityId: 'LINE-100',
  targetKind: 'LINE',
  provenancePath: '/lines/LINE-100/revision-2',
});
assert.equal(stableA, stableB);
assert.notEqual(stableA, changedProvenance);
assert.doesNotMatch(stableA, /ROW|ORDINAL|INDEX/u);
console.log('P06A-02 PASS stable target identity depends on source identity/provenance, not row position');

const smallFixture = buildEnrichmentUiFixture('small');
const smallSnapshot = snapshotFromFixture(smallFixture, 4);
const smallIndex = buildWithNondeterminismGuards(smallSnapshot);
const reversedIndex = buildWithNondeterminismGuards(reverseSnapshot(smallSnapshot));
assert.equal(smallIndex.structuralHash, reversedIndex.structuralHash,
  'P06A indexed structure must be invariant to input row order.');
assert.deepEqual(smallIndex.queueCounts, reversedIndex.queueCounts);
assert.deepEqual(smallIndex.facetValues, reversedIndex.facetValues);
assert.throws(() => {
  smallIndex.targetIds[0] = 'MUTATED';
}, TypeError);
assert.throws(() => {
  smallIndex.queueCounts.MISSING = -1;
}, TypeError);
console.log('P06A-03 PASS caller-immutable index is input-order independent');

const duplicateSnapshot = snapshotFromFixture(smallFixture, 0);
duplicateSnapshot.lines.targetIdByOrdinal[1] = duplicateSnapshot.lines.targetIdByOrdinal[0];
assert.throws(
  () => buildLfeaPreflightPhase1Index(duplicateSnapshot),
  (error) => error?.code === 'E_P06_DUPLICATE_TARGET_ID',
);
const duplicateKey = smallFixture.lines.normalizedLineKeyByOrdinal[0];
const duplicateLookup = lookupLfeaPreflightPhase1NormalizedKey(smallIndex, duplicateKey);
assert.equal(duplicateLookup.status, 'BLOCKED_AMBIGUOUS');
assert.equal(duplicateLookup.selectedTargetId, null);
assert.equal(duplicateLookup.candidateTargetIds.length, 2);
console.log('P06A-04 PASS target-ID duplicates reject while normalized-key duplicates remain explicit candidate sets');

const largeFixture = buildEnrichmentUiFixture('large');
const largeSnapshot = snapshotFromFixture(largeFixture, 12);
const largeIndex = buildWithNondeterminismGuards(largeSnapshot);
assert.equal(largeIndex.targetCount, 100_000);
assert.equal(largeIndex.componentCount, 1_000_000);
assert.equal(largeIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.MISSING], 2_000);
assert.equal(largeIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.AMBIGUOUS], 11_000);
assert.equal(largeIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.CONFLICTING], 3_000);
assert.equal(largeIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.STALE], 1_000);
assert.equal(largeIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.PROPOSED], 100_000);
assert.equal(largeIndex.queueCounts[LFEA_PREFLIGHT_EXCEPTION_QUEUE.DEFERRED], 12);
console.log(`P06A-PIN largeStructuralHash=${largeIndex.structuralHash}`);
assert.equal(largeIndex.structuralHash, EXPECTED_P06A_LARGE_STRUCTURAL_HASH,
  'P06A large structural hash must remain pinned to the controlled qualification digest.');
console.log('P06A-05 PASS 100k-line / 1m-component index has pinned structural identity and first-class exception queues');

const serviceFacet = countLfeaPreflightPhase1Facet(largeIndex, 'service');
assert.equal(Object.values(serviceFacet).reduce((sum, value) => sum + value, 0), 100_000);
const serviceOr = queryLfeaPreflightPhase1Index(largeIndex, {
  combine: 'AND',
  clauses: [{ facetId: 'service', mode: 'OR', values: ['0', '1'] }],
});
assert.equal(serviceOr.count, countFixtureRows(largeFixture, (ordinal) => [0, 1]
  .includes(largeFixture.lines.serviceIdByOrdinal[ordinal])));
const serviceAndRating = queryLfeaPreflightPhase1Index(largeIndex, {
  combine: 'AND',
  clauses: [
    { facetId: 'service', mode: 'OR', values: ['0', '1'] },
    { facetId: 'rating', mode: 'OR', values: ['0'] },
  ],
});
assert.equal(serviceAndRating.count, countFixtureRows(largeFixture, (ordinal) => [0, 1]
  .includes(largeFixture.lines.serviceIdByOrdinal[ordinal])
  && largeFixture.lines.ratingIdByOrdinal[ordinal] === 0));
const missingQueue = getLfeaPreflightPhase1Queue(largeIndex, 'MISSING');
assert.equal(missingQueue.count, 2_000);
const missingQuery = queryLfeaPreflightPhase1Index(largeIndex, {
  clauses: [{ queueId: 'MISSING', mode: 'OR', values: ['MISSING'] }],
});
assert.deepEqual(missingQuery.targetIds, missingQueue.targetIds);
console.log('P06A-06 PASS bitset facets expose explicit OR-within / AND-between semantics and complete-dataset counts');

const firstLineId = largeIndex.targetIds[0];
const components = getLfeaPreflightPhase1ComponentViewport(largeIndex, firstLineId, 0, 4);
assert.equal(components.totalComponentCount, 10);
assert.equal(components.componentOrdinals.length, 4);
assert(Object.isFrozen(components.componentOrdinals));
console.log('P06A-07 PASS one-million component adjacency remains compressed until an explicit bounded viewport request');

const reviewEvidence = qualifyReviewLedger();
console.log(`P06A-08 PASS immutable proposal/review ledger ${JSON.stringify(reviewEvidence)}`);

for (const path of [
  'src/workspace/lfea-preflight-phase1-schema.js',
  'src/workspace/lfea-preflight-phase1-bitset.js',
  'src/workspace/lfea-preflight-phase1-index.js',
  'src/workspace/lfea-preflight-phase1-review-ledger.js',
]) {
  const source = fs.readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /enrichment-ui-phase0/u, `${path} must not import Phase-0 qualification fixtures.`);
  assert.doesNotMatch(source, /Date\.now|Math\.random|randomUUID|localeCompare/u,
    `${path} must not depend on clocks, random identity or locale ordering.`);
  assert.doesNotMatch(source, /document\.|createElement|innerHTML|insertAdjacentHTML/u,
    `${path} must remain independent of DOM creation/mutation.`);
}
// The live UI has now adopted the Phase-1 core; that integration is asserted by
// scripts/lfea-preflight-phase1-live-ui-check.mjs and the review-surface check.
// This guard previously held the pre-integration line — the UI must not import
// the core "before the reviewed integration batch" — and became unsatisfiable
// the moment that batch landed. Holding it would mean the integration guard and
// this one could never both pass.
//
// The invariant that outlives the integration is the direction of the
// dependency: the UI may consume the core, but the core must never consume the
// UI, or the DOM-free and fixture-free properties asserted above stop being
// enforceable. That is what is asserted now, so this is a narrowing of scope,
// not a removal.
for (const path of [
  'src/workspace/lfea-preflight-phase1-schema.js',
  'src/workspace/lfea-preflight-phase1-bitset.js',
  'src/workspace/lfea-preflight-phase1-index.js',
  'src/workspace/lfea-preflight-phase1-review-ledger.js',
  'src/workspace/lfea-preflight-phase1-index.js',
  'src/workspace/lfea-preflight-phase1-viewport.js',
  'src/workspace/lfea-preflight-phase1-review-source.js',
  'src/workspace/lfea-preflight-phase1-review-session.js',
]) {
  const source = fs.readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /lfea-preflight-ui|lfea-preflight-phase1-review-surface/u,
    `${path} must not depend on the live UI or the review surface; the Phase-1 core dependency runs one way.`);
  assert.doesNotMatch(source, /from '\.\/main\.js'|from '\.\.\/main\.js'/u,
    `${path} must not depend on the application entry point.`);
}
console.log('P06A-09 PASS Phase-1 core stays fixture/DOM/clock independent and the core never depends on the live UI');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-indexed-model',
  status: 'PASS',
  columnCount: 40,
  columnSchemaHash: LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
  largeStructuralHash: largeIndex.structuralHash,
  lineCount: largeIndex.targetCount,
  componentCount: largeIndex.componentCount,
  queueCounts: largeIndex.queueCounts,
  facetSemantics: 'OR_WITHIN_AND_BETWEEN',
  reviewLedger: reviewEvidence,
}));

function snapshotFromFixture(fixture, deferredCount) {
  const engineeringStatusByField = Object.fromEntries(PHASE0_ENGINEERING_FIELDS.map((fieldId) => [
    fieldId,
    fixture.lines.engineeringColumns[fieldId].statuses,
  ]));
  return {
    schema: LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
    datasetIdentity: fixture.semanticHash,
    lines: {
      targetIdByOrdinal: [...fixture.lines.targetIdByOrdinal],
      normalizedKeyByOrdinal: [...fixture.lines.normalizedLineKeyByOrdinal],
      serviceByOrdinal: fixture.lines.serviceIdByOrdinal,
      ratingByOrdinal: fixture.lines.ratingIdByOrdinal,
      classByOrdinal: fixture.lines.classIdByOrdinal,
      engineeringStatusByField,
    },
    components: {
      count: fixture.components.count,
      parentLineOrdinal: fixture.components.parentLineOrdinal,
    },
    deferredTargetIds: fixture.lines.targetIdByOrdinal.slice(-deferredCount),
  };
}

function reverseSnapshot(snapshot) {
  const lineCount = snapshot.lines.targetIdByOrdinal.length;
  const reverseArrayLike = (values) => Array.from(values).reverse();
  const engineeringStatusByField = Object.fromEntries(PHASE0_ENGINEERING_FIELDS.map((fieldId) => [
    fieldId,
    Uint8Array.from(reverseArrayLike(snapshot.lines.engineeringStatusByField[fieldId])),
  ]));
  const parentLineOrdinal = new Uint32Array(snapshot.components.count);
  for (let ordinal = 0; ordinal < parentLineOrdinal.length; ordinal += 1) {
    parentLineOrdinal[ordinal] = lineCount - 1 - snapshot.components.parentLineOrdinal[ordinal];
  }
  return {
    schema: snapshot.schema,
    datasetIdentity: snapshot.datasetIdentity,
    lines: {
      targetIdByOrdinal: reverseArrayLike(snapshot.lines.targetIdByOrdinal),
      normalizedKeyByOrdinal: reverseArrayLike(snapshot.lines.normalizedKeyByOrdinal),
      serviceByOrdinal: reverseArrayLike(snapshot.lines.serviceByOrdinal),
      ratingByOrdinal: reverseArrayLike(snapshot.lines.ratingByOrdinal),
      classByOrdinal: reverseArrayLike(snapshot.lines.classByOrdinal),
      engineeringStatusByField,
    },
    components: { count: snapshot.components.count, parentLineOrdinal },
    deferredTargetIds: [...snapshot.deferredTargetIds],
  };
}

function qualifyReviewLedger() {
  const targetId = stableA;
  const fieldId = 'piping.wallThicknessMm';
  const proposal = createLfeaPreflightReviewProposal({
    datasetIdentity: smallFixture.semanticHash,
    targetId,
    fieldId,
    proposedValue: 7.11,
    method: 'EXACT_PIPING_CLASS_MATCH',
    sourceEvidence: { source: 'PipingClass.xlsx', sheet: 'Class_S88', row: 41, sourceHash: 'sha256:p06a' },
    createdAt: PINNED_TIMESTAMP,
  });
  let ledger = createLfeaPreflightReviewLedger({
    datasetIdentity: smallFixture.semanticHash,
    reviewerPolicyId: 'LFEA-PREFLIGHT-PHASE1-REVIEW-R1',
  });
  ledger = appendLfeaPreflightReviewEvent(ledger, {
    action: LFEA_PREFLIGHT_REVIEW_ACTION.ACCEPT,
    targetId,
    fieldId,
    proposalId: proposal.proposalId,
    actor: 'qualification-reviewer',
    reason: 'Exact piping-class evidence reviewed.',
    occurredAt: PINNED_TIMESTAMP,
    evidence: { proposalSemanticHash: proposal.semanticHash },
  });
  const acceptedEventId = ledger.events.at(-1).eventId;
  assert.equal(projectLfeaPreflightReviewState(ledger, targetId, fieldId).disposition, 'ACCEPTED');

  ledger = appendLfeaPreflightReviewEvent(ledger, {
    action: LFEA_PREFLIGHT_REVIEW_ACTION.OVERRIDE,
    targetId,
    fieldId,
    value: 8,
    actor: 'qualification-reviewer',
    reason: 'Project specification requires thicker wall.',
    occurredAt: '2026-08-02T00:00:01.000Z',
    evidence: { specification: 'P06A-SPEC-001' },
  });
  const overrideEventId = ledger.events.at(-1).eventId;
  assert.equal(projectLfeaPreflightReviewState(ledger, targetId, fieldId).disposition, 'OVERRIDDEN');
  assert.equal(projectLfeaPreflightReviewState(ledger, targetId, fieldId).overrideValue, 8);

  ledger = appendLfeaPreflightReviewEvent(ledger, {
    action: LFEA_PREFLIGHT_REVIEW_ACTION.UNDO,
    targetId,
    fieldId,
    compensatesEventId: overrideEventId,
    actor: 'qualification-reviewer',
    reason: 'Return to accepted exact proposal after specification check.',
    occurredAt: '2026-08-02T00:00:02.000Z',
    evidence: { disposition: 'COMPENSATING_EVENT' },
  });
  const afterUndo = projectLfeaPreflightReviewState(ledger, targetId, fieldId);
  assert.equal(afterUndo.disposition, 'ACCEPTED');
  assert(afterUndo.compensatedEventIds.includes(overrideEventId));
  assert.equal(ledger.events.length, 3, 'UNDO must append history rather than deleting the override event.');

  const proposal2 = createLfeaPreflightReviewProposal({
    datasetIdentity: smallFixture.semanticHash,
    targetId,
    fieldId: 'material.materialCode',
    proposedValue: 'A106-B',
    method: 'AMBIGUOUS_CANDIDATE_REVIEW',
    sourceEvidence: { candidates: ['A106-B', 'A333-6'] },
    createdAt: '2026-08-02T00:00:03.000Z',
  });
  ledger = appendLfeaPreflightReviewEvent(ledger, {
    action: LFEA_PREFLIGHT_REVIEW_ACTION.REJECT,
    targetId,
    fieldId: 'material.materialCode',
    proposalId: proposal2.proposalId,
    actor: 'qualification-reviewer',
    reason: 'Candidate evidence is insufficient.',
    occurredAt: '2026-08-02T00:00:04.000Z',
    evidence: {},
  });
  ledger = appendLfeaPreflightReviewEvent(ledger, {
    action: LFEA_PREFLIGHT_REVIEW_ACTION.DEFER,
    targetId,
    fieldId: 'process.designPressureKpaG',
    actor: 'qualification-reviewer',
    reason: 'Awaiting process data authority.',
    occurredAt: '2026-08-02T00:00:05.000Z',
    evidence: { dependency: 'PROCESS-DATA' },
  });
  assert.equal(projectLfeaPreflightReviewState(ledger, targetId, 'material.materialCode').disposition, 'REJECTED');
  assert.equal(projectLfeaPreflightReviewState(ledger, targetId, 'process.designPressureKpaG').disposition, 'DEFERRED');
  assert.equal(new Set(ledger.events.map((event) => event.action)).size, 5);

  const tampered = structuredClone(ledger);
  tampered.events[0].reason = 'tampered review reason';
  assert.throws(
    () => requireLfeaPreflightReviewLedger(tampered),
    (error) => error?.code === 'E_P06_REVIEW_EVENT_HASH_INVALID',
  );
  assert(Object.isFrozen(ledger));
  assert(Object.isFrozen(ledger.events));
  assert(Object.isFrozen(ledger.events[0]));

  return Object.freeze({
    proposalId: proposal.proposalId,
    acceptedEventId,
    overrideEventId,
    eventCount: ledger.events.length,
    eventIds: reviewLedgerEventIds(ledger),
    ledgerSemanticHash: ledger.semanticHash,
    undoDisposition: afterUndo.disposition,
    tamperRejected: true,
  });
}

function buildWithNondeterminismGuards(snapshot) {
  const originalDateNow = Date.now;
  const originalMathRandom = Math.random;
  const globalCrypto = globalThis.crypto;
  const originalRandomUuid = globalCrypto?.randomUUID;
  Date.now = () => { throw Object.assign(new Error('E_P06_HIDDEN_CLOCK'), { code: 'E_P06_HIDDEN_CLOCK' }); };
  Math.random = () => { throw Object.assign(new Error('E_P06_RANDOM_SOURCE'), { code: 'E_P06_RANDOM_SOURCE' }); };
  if (globalCrypto && typeof originalRandomUuid === 'function') {
    globalCrypto.randomUUID = () => { throw Object.assign(new Error('E_P06_RANDOM_SOURCE'), { code: 'E_P06_RANDOM_SOURCE' }); };
  }
  try {
    return buildLfeaPreflightPhase1Index(snapshot);
  } finally {
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
    if (globalCrypto && typeof originalRandomUuid === 'function') globalCrypto.randomUUID = originalRandomUuid;
  }
}

function countFixtureRows(fixture, predicate) {
  let count = 0;
  for (let ordinal = 0; ordinal < fixture.manifest.lineCount; ordinal += 1) {
    if (predicate(ordinal)) count += 1;
  }
  return count;
}
