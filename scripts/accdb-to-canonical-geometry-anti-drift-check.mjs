#!/usr/bin/env node

/**
 * Static anti-drift guard for the ACCDB -> canonical geometry adapter
 * (src/core/geometry/adapters/accdb-to-canonical-geometry.js) and its
 * source-binding layer (src/core/linear-piping-analysis-consumer/
 * accdb-source-binding.js). Mirrors the forbidden-pattern convention in
 * linear-piping-analysis-consumer-anti-drift-check.mjs and
 * stagedjson-to-inputxml-anti-drift-check.mjs, scoped to what matters for
 * this module family: real engineering-authority derivation from raw
 * ACCDB fields, so no generic/guessed default is allowed, and no
 * synthetic identity may be introduced without disclosure.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const GEOMETRY_FILE = path.resolve('src/core/geometry/adapters/accdb-to-canonical-geometry.js');
const BINDING_FILE = path.resolve('src/core/linear-piping-analysis-consumer/accdb-source-binding.js');
const geometrySource = fs.readFileSync(GEOMETRY_FILE, 'utf8');
const bindingSource = fs.readFileSync(BINDING_FILE, 'utf8');

const forbidden = [
  ['RANDOM_IDENTITY', /Math\.random|randomUUID/u],
  ['LOCALE_ORDERING', /localeCompare/u],
  // A generic steel/process default would silently misrepresent a real
  // ACCDB model's own declared material/process data -- this adapter must
  // fail closed (an error diagnostic, null value) instead, exactly like
  // inputXmlToCanonicalGeometry.js.
  ['GENERIC_MATERIAL_DEFAULT', /DEFAULT_(MODULUS|DENSITY|POISSON)/u],
];
for (const [code, pattern] of forbidden) {
  assert.doesNotMatch(geometrySource, pattern, `${code}: accdb-to-canonical-geometry.js`);
  assert.doesNotMatch(bindingSource, pattern, `${code}: accdb-source-binding.js`);
}

// The 11-table MODEL_TABLE_NAMES list must stay exactly what
// caesar-accdb-package.js's own MODEL_TABLES declares -- a silent
// narrowing here would make the adapter fail closed on real ACCDB files
// with an unhelpful "missing table" error instead of the intended one.
const EXPECTED_TABLES = [
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
];
const tableNamesMatch = geometrySource.match(/MODEL_TABLE_NAMES = Object\.freeze\(\[([\s\S]*?)\]\);/u);
assert.ok(tableNamesMatch, 'Expected a MODEL_TABLE_NAMES declaration.');
const declaredTables = [...tableNamesMatch[1].matchAll(/'([^']+)'/gu)].map((m) => m[1]).sort();
assert.deepEqual(declaredTables, [...EXPECTED_TABLES].sort(), 'MODEL_TABLE_NAMES drifted from the 11-table ACCDB model contract.');

const packageJsonSource = fs.readFileSync(path.resolve('src/core/fea-benchmarks/caesar-accdb-package.js'), 'utf8');
const referenceMatch = packageJsonSource.match(/MODEL_TABLES = Object\.freeze\(\[([\s\S]*?)\]\);/u);
if (referenceMatch) {
  const referenceTables = [...referenceMatch[1].matchAll(/'([^']+)'/gu)].map((m) => m[1]).sort();
  assert.deepEqual(declaredTables, referenceTables, 'ACCDB adapter MODEL_TABLE_NAMES drifted from caesar-accdb-package.js MODEL_TABLES.');
}

// Geometry stays SI-normalized (unit: 'm') -- a deliberate, documented
// divergence from InputXML's native-unit convention. A drift back to a
// native-unit passthrough would silently break every downstream consumer
// that now assumes ACCDB-sourced canonical-geometry-v1 is always metres.
assert.match(geometrySource, /unit:\s*'m'/u);

// The bend arc math must keep reusing the shared InputXML helpers, not a
// re-derived copy -- this is the actual cross-adapter code-sharing the
// design relies on for correctness.
assert.match(geometrySource, /resolveBendArcCentre/u);
assert.match(geometrySource, /checkDeclaredRadius/u);
assert.match(geometrySource, /from '\.\/inputxml-bend-arc\.js'/u);

// A declared element offset (EOFF_PTR) or a restraint CNODE both change
// true physical geometry and must fail closed with an error diagnostic,
// not be silently dropped -- regression guard for both disclosed scope
// boundaries.
assert.match(geometrySource, /ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED/u);
assert.match(geometrySource, /ACCDB_RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED/u);

// The "bars" pressure/stress token fix in caesar-accdb-units.js must stay
// present -- regression guard for the real, disclosed correctness bug
// found during development (plural CAESAR unit label, singular-only table).
const unitsSource = fs.readFileSync(path.resolve('src/core/fea-benchmarks/caesar-accdb-units.js'), 'utf8');
assert.match(unitsSource, /BARS\\b.*BAR/u, 'Expected the BARS -> BAR normalization fold in caesar-accdb-units.js.');

// package.json wiring: the umbrella check script must exist, chain all
// four sibling checks, and be reachable from `gate`.
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const umbrella = packageJson.scripts['check:accdb-to-canonical-geometry'];
assert.ok(umbrella, 'Expected a check:accdb-to-canonical-geometry npm script.');
for (const scriptName of [
  'accdb-to-canonical-geometry-check.mjs',
  'accdb-source-binding-check.mjs',
  'accdb-to-canonical-geometry-anti-drift-check.mjs',
]) {
  assert.ok(umbrella.includes(scriptName), `check:accdb-to-canonical-geometry must chain ${scriptName}`);
}
assert.ok(packageJson.scripts.gate.includes('check:accdb-to-canonical-geometry'), 'gate must run check:accdb-to-canonical-geometry.');

console.log(JSON.stringify({
  check: 'accdb-to-canonical-geometry-anti-drift',
  status: 'PASS',
}));
