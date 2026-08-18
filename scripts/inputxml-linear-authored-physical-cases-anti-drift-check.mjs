#!/usr/bin/env node

/**
 * Static anti-drift guard for the engineer-authored physical-case merge
 * module (src/core/linear-piping-analysis-consumer/
 * inputxml-linear-authored-physical-cases.js). This directory's own
 * linear-piping-analysis-consumer-anti-drift-check.mjs already blanket-
 * scans every .js file here for the shared forbidden-pattern/line-ceiling
 * rules (confirmed: the new file passes that scan unmodified) -- this
 * script adds the invariants specific to this module family instead of
 * duplicating that scan.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const MODULE_FILE = path.resolve('src/core/linear-piping-analysis-consumer/inputxml-linear-authored-physical-cases.js');
const BUILDERS_FILE = path.resolve('src/core/linear-piping-analysis-consumer/inputxml-linear-physical-case-builders.js');
const source = fs.readFileSync(MODULE_FILE, 'utf8');
const buildersSource = fs.readFileSync(BUILDERS_FILE, 'utf8');

// Must reuse the same shared case/primitive compilation path every other
// InputXML physical case already goes through -- not a parallel,
// independently-derived implementation of load-case compilation.
assert.match(source, /caseRecord\(/u);
assert.match(source, /from '\.\/inputxml-linear-physical-case-builders\.js'/u);
assert.doesNotMatch(
  source,
  /import\s*\{[^}]*compilePhysicalLoadCase[^}]*\}\s*from/u,
  'Must call the shared caseRecord() helper, not import compilePhysicalLoadCase() to call it directly.',
);

// The shared caseRecord()/sourceEvidence() builders must stay exported for
// this module (and any future sibling) to reuse, rather than each new
// authoring module re-deriving its own copy of the sourceEvidence hash
// shape.
assert.match(buildersSource, /export function sourceEvidence\(/u);

// This package works in SI and converts nothing -- an authored case must
// never silently accept or convert a non-SI unit token.
assert.match(source, /force:\s*'N',\s*moment:\s*"N\*m"|force:\s*'N',\s*moment:\s*'N\*m'/u);
assert.doesNotMatch(source, /convertCaesarValue|convertCaesarUnit/u, 'Authored loads must already be SI; no unit conversion belongs in this module.');

// Only the one representable sign convention is ever used -- this module
// must not invent, accept, or silently flip a different sign convention.
assert.match(source, /REPRESENTABLE_LOAD_SIGN_CONVENTION/u);
assert.doesNotMatch(source, /signConvention:\s*['"](?!REPRESENTABLE_LOAD_SIGN_CONVENTION)/u);

// A physicalCasePreparation is sealed/hash-verified over its entire
// physicalCases+loadLedger arrays -- this module must re-seal a fresh
// preparation, never mutate the sealed input in place.
assert.match(source, /sealInputXmlLinearPhysicalCasePreparation\(/u);
assert.doesNotMatch(source, /physicalPreparation\.physicalCases\.push|prepared\.physicalCases\.push/u);

// inputxml-run-request-cases.js must stay untouched by this work -- an
// authored case reaches it as just another legitimate, properly-sealed
// caseId, requiring zero special-casing downstream.
const runRequestCasesFile = path.resolve('src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js');
const runRequestCasesSource = fs.readFileSync(runRequestCasesFile, 'utf8');
assert.doesNotMatch(runRequestCasesSource, /AUTHORED|authored/u, 'inputxml-run-request-cases.js must not need authored-case-specific branching.');

const forbidden = [
  ['RANDOM_IDENTITY', /Math\.random|randomUUID/u],
  ['LOCALE_ORDERING', /localeCompare/u],
];
for (const [code, pattern] of forbidden) {
  assert.doesNotMatch(source, pattern, `${code}: inputxml-linear-authored-physical-cases.js`);
}

// package.json wiring: the umbrella check script must exist, chain both
// sibling checks, and be reachable from `gate`.
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const umbrella = packageJson.scripts['check:lfea-load-case-authoring'];
assert.ok(umbrella, 'Expected a check:lfea-load-case-authoring npm script.');
for (const scriptName of [
  'inputxml-linear-authored-physical-cases-check.mjs',
  'inputxml-linear-authored-physical-cases-anti-drift-check.mjs',
]) {
  assert.ok(umbrella.includes(scriptName), `check:lfea-load-case-authoring must chain ${scriptName}`);
}
assert.ok(packageJson.scripts.gate.includes('check:lfea-load-case-authoring'), 'gate must run check:lfea-load-case-authoring.');

console.log(JSON.stringify({
  check: 'inputxml-linear-authored-physical-cases-anti-drift',
  status: 'PASS',
}));
