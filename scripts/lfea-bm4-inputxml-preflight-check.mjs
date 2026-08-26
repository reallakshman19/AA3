#!/usr/bin/env node
/**
 * The check that would have caught the original failure.
 *
 * A real CAESAR II model (BM4, 96 elements) must reach a non-BLOCK pre-flight
 * and offer real load cases. Before Phase 8 Stage A this model returned 72
 * BLOCK findings and "Available cases: None", and nothing in this repository
 * noticed, because no real InputXML model was committed anywhere in it.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import { prepareLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';
import { BM4_REPAIRED_PATH, BM4_SOURCE_PATH } from './lfea-bm4-cii-output-comparison.mjs';

function preFlightOf(path) {
  return prepareLinearPipingInputXmlPreFlight(
    createLinearPipingInputXmlIntake({ fileName: path, content: readFileSync(path, 'utf8') }, {}),
  );
}

function blockCodes(preFlight) {
  const counts = new Map();
  for (const finding of preFlight.preparation.findings ?? []) {
    if (finding.disposition !== 'BLOCK') continue;
    counts.set(finding.code, (counts.get(finding.code) ?? 0) + 1);
  }
  return counts;
}

console.log('\n--- LFEA BM4 real-model pre-flight ---');

// The repaired model is the one that must actually work.
const repaired = preFlightOf(BM4_REPAIRED_PATH);
assert.notEqual(repaired.status, 'BLOCK', `BM4 pre-flight returned ${repaired.status}`);
assert.equal(blockCodes(repaired).size, 0, 'BM4 must reach pre-flight with no BLOCK findings');
assert.equal(repaired.sourceSummary.nodeCount, 97);
assert.equal(repaired.sourceSummary.elementCount, 96);

// "Available cases: None" was the user-visible symptom. Real standard piping
// cases must be offered -- not just any case list.
const cases = repaired.sourceSummary.availableCaseIds;
for (const required of ['IXP-W', 'IXP-WP', 'IXP-WT', 'IXP-WPT']) {
  assert.ok(cases.includes(required), `BM4 must offer ${required}; got ${JSON.stringify(cases)}`);
}
// The model's own seven declared FORCESMOMENTS vector sets must be compiled
// rather than reported as uncompiled (Stage A2).
for (let set = 1; set <= 7; set += 1) {
  assert.ok(cases.includes(`IXP-F${set}`), `BM4 must compile applied force set F${set}`);
}

// A WARN verdict still requires explicit reviewer authorization before a
// solve. That gate is deliberately not bypassed by any of this work.
assert.equal(repaired.status, 'WARN');
assert.equal(repaired.solveAuthorized, false);

// The as-received model must STILL block, on the collinear overlap only. The
// detector was not relaxed to make BM4 pass -- the source model was repaired,
// reproducibly, under a declared bound. If this ever stops blocking, either
// the detector drifted or the wrong file is being read.
const asReceived = preFlightOf(BM4_SOURCE_PATH);
assert.equal(asReceived.status, 'BLOCK', 'the as-received BM4 must still BLOCK');
const asReceivedBlocks = blockCodes(asReceived);
assert.equal(asReceivedBlocks.get('TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP'), 7);
assert.deepEqual(
  [...asReceivedBlocks.keys()].sort(),
  ['REQUIRED_CAPABILITY_BLOCKED', 'TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP'],
  'the as-received BM4 must block ONLY on the real collinear overlap and what derives from it',
);

const conditionalCount = (repaired.preparation.findings ?? [])
  .filter((finding) => finding.disposition === 'CONDITIONAL').length;

console.log(JSON.stringify({
  check: 'lfea-bm4-inputxml-preflight',
  status: 'PASS',
  asReceivedStatus: asReceived.status,
  asReceivedBlockFindings: [...asReceivedBlocks.entries()].map(([code, count]) => `${count} ${code}`),
  repairedStatus: repaired.status,
  repairedBlockFindings: 0,
  repairedConditionalFindings: conditionalCount,
  availableCaseIds: cases,
}, null, 2));
console.log('LFEA BM4 real-model pre-flight PASS');
