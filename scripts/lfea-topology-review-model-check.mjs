#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_TOPOLOGY_REVIEW_KIND,
  createLfeaTopologyReviewModel,
  getLfeaTopologyReviewFinding,
  getLfeaTopologyReviewQueue,
  listLfeaTopologyReviewQueueSummaries,
} from '../src/workspace/lfea-topology-review-model.js';

const sourceAuthority = Object.freeze({
  sourceSemanticHash: 'fnv1a64:1111111111111111',
  sourceEvidenceHash: 'fnv1a64:2222222222222222',
  diagnosticsSemanticHash: 'fnv1a64:3333333333333333',
  diagnosticsEvidenceHash: 'fnv1a64:4444444444444444',
});
const findings = Object.freeze([
  finding({
    findingId: 'TOP-00042',
    kind: 'OVERLAP_CANDIDATE',
    sourceEntityIds: ['SUP-1042', 'SUP-1043'],
    sourcePaths: ['/supports/SUP-1042', '/supports/SUP-1043'],
    distanceM: 0.00062,
    toleranceM: 0.001,
    message: 'Two support targets fall within the controlled proximity tolerance.',
    technicalBasis: 'Distance is below the review tolerance; no topology change is implied.',
    evidence: { coordinateFrame: 'SOURCE_GLOBAL', detector: 'PROXIMITY_REVIEW_V1' },
  }),
  finding({
    findingId: 'TOP-00043',
    kind: 'COINCIDENT_SUPPORT',
    sourceEntityIds: ['SUP-2001', 'SUP-2002'],
    sourcePaths: ['/supports/SUP-2001', '/supports/SUP-2002'],
    distanceM: 0,
    toleranceM: 0.001,
    message: 'Two source supports are coincident.',
    technicalBasis: 'Coincidence requires engineering review because source identities remain distinct.',
    evidence: { detector: 'COINCIDENCE_REVIEW_V1' },
  }),
  finding({
    findingId: 'TOP-00044',
    kind: 'POSSIBLE_DUPLICATE_NODE',
    sourceEntityIds: ['NODE-88', 'NODE-89'],
    sourcePaths: ['/nodes/NODE-88', '/nodes/NODE-89'],
    distanceM: 0.0001,
    toleranceM: 0.0005,
    message: 'Two nodes are closer than the duplicate-node review threshold.',
    technicalBasis: 'Spatial proximity alone does not prove identical engineering identity.',
    evidence: { detector: 'NODE_DUPLICATE_REVIEW_V1' },
  }),
  finding({
    findingId: 'TOP-00045',
    kind: 'UNRESOLVED_CONNECTIVITY',
    sourceEntityIds: ['SEG-A', 'SEG-B'],
    sourcePaths: ['/segments/SEG-A', '/segments/SEG-B'],
    message: 'Connectivity relationship is unresolved.',
    technicalBasis: 'Source connectivity evidence is incomplete; topology mutation is prohibited.',
    evidence: { detector: 'CONNECTIVITY_REVIEW_V1' },
  }),
]);

const model = createLfeaTopologyReviewModel({ sourceAuthority, findings });
assert.equal(model.summary.findingCount, 4);
assert.equal(model.summary.unresolvedCount, 4);
assert.equal(model.summary.mutationApplied, false);
assert.equal(model.summary.overlapCandidateCount, 1);
assert.equal(model.summary.coincidentSupportCount, 1);
assert.equal(model.summary.possibleDuplicateNodeCount, 1);
assert.equal(model.summary.unresolvedConnectivityCount, 1);
assert.match(model.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
console.log(`P02A-01 PASS immutable review model ${model.semanticHash}`);

const reversed = createLfeaTopologyReviewModel({ sourceAuthority, findings: [...findings].reverse() });
assert.equal(reversed.semanticHash, model.semanticHash, 'Topology review identity must be input-order invariant.');
assert.deepEqual(reversed.findings, model.findings);
console.log('P02A-02 PASS finding order is ASCII deterministic and semantic identity is input-order invariant');

for (const kind of Object.values(LFEA_TOPOLOGY_REVIEW_KIND)) {
  const queue = getLfeaTopologyReviewQueue(model, kind);
  assert.equal(queue.count, 1);
  assert.equal(queue.findingIds.length, 1);
  assert.match(queue.digest, /^fnv1a64:[0-9a-f]{16}$/u);
}
assert.equal(listLfeaTopologyReviewQueueSummaries(model).length, 4);
console.log('P02A-03 PASS overlap/coincident-support/duplicate-node/unresolved-connectivity queues are first-class indexed review sets');

const overlap = getLfeaTopologyReviewFinding(model, 'TOP-00042');
assert.equal(overlap.distanceM, 0.00062);
assert.equal(overlap.toleranceM, 0.001);
assert.deepEqual(overlap.sourceEntityIds, ['SUP-1042', 'SUP-1043']);
assert.equal(overlap.mutationApplied, false);
assert(Object.isFrozen(overlap));
assert(Object.isFrozen(overlap.evidence));
console.log('P02A-04 PASS selected candidate retains source IDs, paths, distance, tolerance, evidence and explicit no-mutation disposition');

assert.throws(
  () => createLfeaTopologyReviewModel({ sourceAuthority, findings: [findings[0], findings[0]] }),
  (error) => error?.code === 'E_P02_DUPLICATE_FINDING_ID',
);
assert.throws(
  () => createLfeaTopologyReviewModel({
    sourceAuthority,
    findings: [finding({
      findingId: 'TOP-BAD-PAIR',
      kind: 'OVERLAP_CANDIDATE',
      sourceEntityIds: ['A', 'B'],
      sourcePaths: ['/A', '/B'],
      distanceM: 0.001,
      message: 'Missing tolerance must fail.',
      technicalBasis: 'Pair is incomplete.',
      evidence: {},
    })],
  }),
  (error) => error?.code === 'E_P02_DISTANCE_TOLERANCE_PAIR_REQUIRED',
);
assert.throws(
  () => createLfeaTopologyReviewModel({
    sourceAuthority,
    findings: [finding({
      findingId: 'TOP-BAD-ID',
      kind: 'POSSIBLE_DUPLICATE_NODE',
      sourceEntityIds: [],
      sourcePaths: [],
      message: 'Missing source identity must fail.',
      technicalBasis: 'Source identity is mandatory.',
      evidence: {},
    })],
  }),
  (error) => error?.code === 'E_P02_SOURCE_ENTITY_REQUIRED',
);
console.log('P02A-05 PASS duplicate finding identity, incomplete distance/tolerance and missing source custody fail closed');

const source = fs.readFileSync('src/workspace/lfea-topology-review-model.js', 'utf8');
assert.doesNotMatch(source, /autofix|autoFix|mergeNodes|deleteNode|deleteSegment|applyTopology|mutateTopology|writeTopology/u);
assert.doesNotMatch(source, /EventBus|publish\(|dispatchEvent|runLinearPiping|solveInputXml|compileSolver|factorization/u);
assert.doesNotMatch(source, /document\.|createElement|innerHTML|insertAdjacentHTML/u);
assert.doesNotMatch(source, /Date\.now|new Date|Math\.random|randomUUID|localeCompare/u);
assert.doesNotMatch(source, /enrichment-ui-phase0/u);
assert.match(source, /mutationApplied:\s*false/u);
console.log('P02A-06 PASS topology review contract contains no autofix, mutation, solver, DOM, clock, entropy or test-fixture authority');

console.log(JSON.stringify({
  check: 'lfea-topology-review-model',
  status: 'PASS',
  semanticHash: model.semanticHash,
  findingCount: model.summary.findingCount,
  queues: Object.fromEntries(listLfeaTopologyReviewQueueSummaries(model).map((entry) => [entry.kind, entry.count])),
  mutationApplied: model.summary.mutationApplied,
  topologyModificationApi: false,
}));

function finding(input) {
  return Object.freeze({
    severity: 'WARN',
    disposition: 'UNRESOLVED',
    ...input,
  });
}
