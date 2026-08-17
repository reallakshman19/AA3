#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'src/workspace/engineering-loads/support-load-distribution-v3.js';
const source = fs.readFileSync(path, 'utf8');

console.log('--- Support Load Performance Index Check ---');

function functionBody(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}(`, start + 1) : source.length;
  assert.notEqual(end, -1, `Missing boundary function ${nextName}`);
  return source.slice(start, end);
}

const distributionBody = functionBody('calculateDistribution', 'buildExecutionIndex');
const indexBody = functionBody('buildExecutionIndex', 'calculateCase');
const caseBody = functionBody('calculateCase', 'calculateRoute');
const routeBody = functionBody('calculateRoute', 'resolveApplicationPoint');
const contributionBody = functionBody('recordContribution', 'supportResults');
const resultBody = functionBody('supportResults', 'equilibriumCheck');

// P01 — discovery indexes are constructed once at distribution scope.
assert.match(distributionBody, /\.\.\.buildExecutionIndex\(input, globalBlockers\)/u);
assert.match(indexBody, /new Map\(input\.dataset\.entities\.map/u);
assert.match(indexBody, /new Map\(input\.routePartitionModel\.edges\.map/u);
assert.match(indexBody, /const chainageByEntityId = new Map\(/u);
assert.doesNotMatch(caseBody, /new Map\(input\.dataset\.entities/u);
assert.doesNotMatch(routeBody, /new Map\(input\.routePartitionModel\.edges/u);
console.log('PASS P01: entity/edge/chainage indexes are distribution-scoped.');

// P02 — physical-edge chainage lookup is indexed rather than linear-find.
assert.doesNotMatch(routeBody, /route\.entityChainages\.find\(/u);
assert.match(routeBody, /routeExecution\.chainageByEntityId\.get\(entityId\)/u);
console.log('PASS P02: route physical-edge chainage lookup is O(1) map lookup.');

// P03 — support projection remains behind the same old authority conditions:
// global Project Data must be unblocked and route must be READY.
assert.match(
  indexBody,
  /if \(globalBlockers\.length === 0 && route\.status === 'READY'\) \{[\s\S]*?supports = routeSupports\(/u,
);
assert.doesNotMatch(routeBody, /routeSupports\(/u);
console.log('PASS P03: case-independent support projection is built only for executable READY routes.');

// P04 — contributor IDs are indexed as contributions are recorded. Set-based
// de-duplication preserves old `.some()` semantics for duplicate site allocations,
// while append order remains contribution-ledger order.
assert.match(contributionBody, /const contributorSites = new Set\(\)/u);
assert.match(contributionBody, /contributors\.push\(contributionId\)/u);
assert.match(contributionBody, /state\.contributorsBySite\.set\(allocation\.siteId, contributors\)/u);
assert.doesNotMatch(resultBody, /state\.ledger\s*\.filter/u);
assert.match(resultBody, /state\.contributorsBySite\.get\(site\.siteId\)/u);
console.log('PASS P04: support-result contributor discovery no longer rescans the full ledger.');

// P05 — no protected numerical mechanics were replaced by this optimization.
for (const required of [
  'resolveCaseMass(entity, edge, state.caseId, input.profile)',
  'distributeUniform(chainage.startMm, chainage.endMm, forceN, supports)',
  'distributePoint(application.chainageMm, forceN, supports)',
  'equilibriumCheck(state, input.profile)',
  "EMPIRICAL_LOAD_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V2'",
  "EMPIRICAL_LOAD_COG_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V3_COG'",
]) {
  assert.ok(source.includes(required), `Protected mechanics token missing: ${required}`);
}
console.log('PASS P05: protected mass/distribution/equilibrium method seams remain present.');

console.log('\nSTRUCTURAL PERFORMANCE STATUS: PASS if this script executes successfully.');
console.log('NOTE: this guard is implementation-coupled. Numerical/output equivalence still requires existing empirical qualification on the exact head.');
