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
const baseMassBody = functionBody('resolveBaseMass', 'resolveCaseMass');
const caseMassBody = functionBody('resolveCaseMass', 'insulationMass');
const contributionBody = functionBody('recordContribution', 'supportResults');
const resultBody = functionBody('supportResults', 'equilibriumCheck');

// P01 — discovery indexes are constructed once at distribution scope.
assert.match(distributionBody, /\.\.\.buildExecutionIndex\(input, globalBlockers, caseIds\.length > 0\)/u);
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

// P03 — support projection remains behind the same authority conditions:
// global Project Data must be unblocked and route must be READY.
assert.match(
  indexBody,
  /if \(globalBlockers\.length === 0 && route\.status === 'READY'\) \{[\s\S]*?supports = routeSupports\(/u,
);
assert.doesNotMatch(routeBody, /routeSupports\(/u);
console.log('PASS P03: support projection remains distribution-scoped for executable READY routes.');

// P04 — contributor IDs are indexed as contributions are recorded. Set-based
// de-duplication preserves old `.some()` semantics for duplicate site allocations,
// while append order remains contribution-ledger order.
assert.match(contributionBody, /const contributorSites = new Set\(\)/u);
assert.match(contributionBody, /contributors\.push\(contributionId\)/u);
assert.match(contributionBody, /state\.contributorsBySite\.set\(allocation\.siteId, contributors\)/u);
assert.doesNotMatch(resultBody, /state\.ledger\s*\.filter/u);
assert.match(resultBody, /state\.contributorsBySite\.get\(site\.siteId\)/u);
console.log('PASS P04: support-result contributor discovery no longer rescans the full ledger.');

// P05 — protected numerical mechanics remain byte-structurally represented.
// The mass split preserves the old floating-point association:
//   old: metalKg + insulation.massKg + fluid.massKg
//   new: (metalKg + insulation.massKg) + fluid.massKg
for (const required of [
  'baseMassKg: metalKg + insulation.massKg',
  'massKg: baseMass.baseMassKg + fluid.massKg',
  'resolveCaseMass(baseMass, entity, state.caseId, input.profile)',
  'distributeUniform(chainage.startMm, chainage.endMm, forceN, supports)',
  'distributePoint(application.chainageMm, forceN, supports)',
  'equilibriumCheck(state, input.profile)',
  "EMPIRICAL_LOAD_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V2'",
  "EMPIRICAL_LOAD_COG_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V3_COG'",
]) {
  assert.ok(source.includes(required), `Protected mechanics token missing: ${required}`);
}
assert.match(baseMassBody, /const metalKg = annulusAreaM2\([\s\S]*?\) \* lengthM \* materialDensity;/u);
assert.match(baseMassBody, /const insulation = insulationMass\(section, lengthM, profile\);/u);
assert.doesNotMatch(baseMassBody, /fluidMass\(/u);
assert.match(caseMassBody, /const fluid = fluidMass\(/u);
assert.doesNotMatch(caseMassBody, /annulusAreaM2\(/u);
assert.doesNotMatch(caseMassBody, /insulationMass\(/u);
assert.doesNotMatch(caseMassBody, /componentMass\(/u);
console.log('PASS P05: mass equation partition preserves the old arithmetic order and mechanics seams.');

// P06 — invariant mass work is built once per executable physical entity, only
// when a load case actually exists. Missing entity/edge/chainage follows the old
// MISSING_ROUTE_CHAINAGE path and therefore is deliberately not precomputed.
assert.match(indexBody, /const baseMassByEntityId = new Map\(\)/u);
assert.match(
  indexBody,
  /if \(globalBlockers\.length === 0 && hasActiveCases\) \{[\s\S]*?baseMassArtifactBuilds \+= 1;/u,
);
assert.match(
  indexBody,
  /if \(hasActiveCases\) \{[\s\S]*?route\.physicalEdgeIds\.forEach\([\s\S]*?if \(!entity \|\| !edge \|\| !chainage \|\| !Number\.isFinite\(chainage\.pointMm\)\) return;[\s\S]*?if \(baseMassByEntityId\.has\(entityId\)\) return;[\s\S]*?resolveBaseMass\(entity, edge, input\.profile\)/u,
);
assert.match(routeBody, /execution\.baseMassByEntityId\.has\(entityId\)/u);
assert.match(routeBody, /execution\.baseMassByEntityId\.get\(entityId\)/u);
assert.doesNotMatch(routeBody, /resolveBaseMass\(/u);
assert.equal((source.match(/resolveBaseMass\(/gu) || []).length, 2,
  'resolveBaseMass must have exactly one production call site plus its declaration.');
console.log('PASS P06: case-invariant mass preprocessing has one distribution-scope call site.');

// P07 — operation counters remain observational only and expose the expected
// N-versus-C*N split for exact-head performance qualification.
for (const metric of [
  'baseMassArtifactBuilds',
  'baseMassComputations',
  'caseMassCompositions',
  'fluidMassComputations',
]) {
  assert.ok(source.includes(`${metric}: 0`), `Missing performance metric ${metric}.`);
}
assert.match(indexBody, /supportLoadPerformanceMetrics\.baseMassComputations \+= 1;/u);
assert.match(caseMassBody, /supportLoadPerformanceMetrics\.caseMassCompositions \+= 1;/u);
assert.match(caseMassBody, /supportLoadPerformanceMetrics\.fluidMassComputations \+= 1;/u);
console.log('PASS P07: base/case/fluid mass operation counters are available outside engineering output.');

console.log('\nSTRUCTURAL PERFORMANCE STATUS: PASS if this script executes successfully.');
console.log('NOTE: this guard is implementation-coupled. Numerical/output equivalence still requires existing empirical qualification on the exact head.');
