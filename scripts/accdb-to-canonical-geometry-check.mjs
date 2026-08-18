#!/usr/bin/env node

/**
 * Real-code check for accdbTablesToCanonicalGeometry against the
 * deterministic fixture in accdb-to-canonical-geometry-fixture.mjs. Covers
 * the code paths the real BM_CII.ACCDB validation fixture could not (empty
 * INPUT_REDUCERS/INPUT_OFFSETS/INPUT_FORCMNT there) and regression-guards
 * the two real bugs found during development: the bend tangent-point
 * derivation (ACCDB's TO_NODE on a bend element is the theoretical
 * intersection point, not a tangent point, unlike InputXML) and the
 * "bars" pressure/stress unit token.
 */
import assert from 'node:assert/strict';
import { accdbTablesToCanonicalGeometry } from '../src/core/geometry/adapters/accdb-to-canonical-geometry.js';
import { buildAccdbFixtureTables, ACCDB_FIXTURE_ELEMENT_COUNT } from './accdb-to-canonical-geometry-fixture.mjs';

const tables = buildAccdbFixtureTables();
const geometry = accdbTablesToCanonicalGeometry(tables, { source: 'accdb-fixture-check' });

assert.equal(geometry.schemaVersion, 'canonical-geometry-v1');
assert.equal(geometry.unit, 'm');
assert.equal(geometry.nodes.length, 7);
assert.equal(geometry.segments.length, ACCDB_FIXTURE_ELEMENT_COUNT);
// This fixture deliberately includes an EOFF_PTR and a restraint CNODE
// (elements 6 / node 60) to exercise this adapter's fail-closed paths, so
// geometry.valid is expected to be false here -- assert exactly those two
// known errors are present and nothing else went wrong unexpectedly.
const errorDiagnostics = geometry.diagnostics.filter((d) => d.severity === 'error');
const errorCodes = errorDiagnostics.map((d) => d.code).sort();
assert.deepEqual(errorCodes, ['ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED', 'ACCDB_RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED'], `Unexpected error diagnostics: ${JSON.stringify(errorDiagnostics)}`);

const byId = Object.fromEntries(geometry.segments.map((segment) => [segment.meta.sourceElementId, segment]));

// Bend: correctly resolved from ACCDB's own intersection-point convention.
assert.equal(byId[1].type, 'BEND');
assert.ok(byId[1].meta.bendArcCentre, 'Expected a resolved bend arc centre.');
assert.ok(Math.abs(byId[1].meta.bendComputedRadius - 0.5) < 1e-6, 'Bend computed radius should match the declared 500mm radius.');

// Field inheritance: elements 2-6 declare sentinel/blank analysis fields
// and must inherit element 1's explicit values.
for (const elementId of [2, 3, 4, 6]) {
  const segment = byId[elementId];
  assert.equal(segment.diameter, byId[1].diameter, `Element ${elementId} should inherit diameter.`);
  assert.equal(segment.thickness, byId[1].thickness, `Element ${elementId} should inherit thickness.`);
  assert.equal(segment.meta.analysis.elasticModulus, byId[1].meta.analysis.elasticModulus, `Element ${elementId} should inherit elasticModulus.`);
}

// "bars" pressure/stress token (real CAESAR ACCDB label; regression guard
// for the plural-BARS fix in caesar-accdb-units.js).
assert.ok(Math.abs(byId[1].meta.analysis.pressure - 200000) < 1e-6, `Expected PRESSURE1=2 bars -> 200000 Pa, got ${byId[1].meta.analysis.pressure}`);
assert.ok(Math.abs(byId[1].meta.analysis.hydroPressure - 500000) < 1e-6, `Expected HYDRO_PRESSURE=5 bars -> 500000 Pa, got ${byId[1].meta.analysis.hydroPressure}`);
assert.ok(Math.abs(byId[1].meta.analysis.pipeDensity - 7833) < 1, `Expected PIPE_DENSITY 0.007833 kg/cu.cm -> ~7833 kg/m^3, got ${byId[1].meta.analysis.pipeDensity}`);
assert.ok(Math.abs(byId[1].meta.analysis.elasticModulus - 203390.7e6) < 1e3, `Expected MODULUS 203390.7 MPa -> Pa, got ${byId[1].meta.analysis.elasticModulus}`);

// Rigid (VALVE) classification + weight conversion.
assert.equal(byId[4].type, 'VALVE');
assert.equal(byId[4].meta.analysis.rigid.type, 'VALVE');
assert.ok(Math.abs(byId[4].meta.analysis.rigid.weight - 150) < 1e-6, 'Expected RIGID_WGT 150 N (unit N, factor 1).');

// Reducer geometry.
assert.equal(byId[5].type, 'PIPE');
assert.ok(byId[5].meta.reducer, 'Expected reducer geometry on element 5.');
assert.ok(Math.abs(byId[5].meta.reducer.toOuterDiameter - 0.0889) < 1e-6);
assert.ok(Math.abs(byId[5].meta.reducer.toWallThickness - 0.0055) < 1e-6);

// SIF: welding-tee classification + an undocumented type code disclosed,
// not guessed at.
assert.equal(byId[3].type, 'TEE');
const sifCodes = byId[3].meta.analysis.sifs.map((sif) => sif.typeCode).sort((a, b) => a - b);
assert.deepEqual(sifCodes, [3, 11]);
assert.ok(
  geometry.diagnostics.some((d) => d.code === 'ACCDB_SIF_TYPE_UNCLASSIFIED'),
  'Expected an ACCDB_SIF_TYPE_UNCLASSIFIED diagnostic for the undocumented TYPE=11 code.',
);

// Element offset: a real geometry-changing field this adapter does not
// model -- must fail closed with an error diagnostic, not be silently
// dropped.
assert.ok(
  geometry.diagnostics.some((d) => d.code === 'ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED' && d.data?.sourceElementId === '6'),
  'Expected ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED for element 6 (EOFF_PTR=1).',
);

// Forces/moments: retained as disclosed evidence, not silently compiled
// into a load.
assert.ok(
  geometry.diagnostics.some((d) => d.code === 'ACCDB_FORCES_MOMENTS_PRESENT_NOT_COMPILED'),
  'Expected ACCDB_FORCES_MOMENTS_PRESENT_NOT_COMPILED for element 6 (FORCMNT_PTR=1).',
);

// Restraints.
const nodeById = Object.fromEntries(geometry.nodes.map((node) => [node.id, node]));
assert.equal(nodeById['10'].restraint, 'ANCHOR');
assert.equal(nodeById['40'].restraint, 'UNKNOWN');
assert.ok(
  geometry.diagnostics.some((d) => d.code === 'ACCDB_RESTRAINT_GAP_NOT_MODELED' && d.data?.nodeId === '40'),
  'Expected a disclosed, not-modeled GAP diagnostic for the node 40 restraint.',
);
assert.ok(
  geometry.diagnostics.some((d) => d.code === 'ACCDB_RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED' && d.data?.nodeId === '60'),
  'A restraint declaring CNODE changes the physical restraint target and must fail closed, not be silently ignored.',
);
assert.ok(
  geometry.diagnostics.some((d) => d.code === 'ACCDB_RESTRAINT_NODE_UNRESOLVED'),
  'Expected a warning for the restraint referencing an unresolved node (9999).',
);

// Unsupported density token must fail closed (an error diagnostic, and the
// geometry marked invalid), not silently guess at an unconfirmed factor.
const badTables = buildAccdbFixtureTables();
badTables.INPUT_UNITS.rows[0] = { ...badTables.INPUT_UNITS.rows[0], PIPE_DENSITY: 'LB./CU.FT.' };
const badGeometry = accdbTablesToCanonicalGeometry(badTables, { source: 'accdb-fixture-check-bad-density' });
assert.equal(badGeometry.valid, false, 'An unsupported density token must not produce valid geometry.');
assert.ok(
  badGeometry.diagnostics.some((d) => d.severity === 'error' && d.code === 'ACCDB_UNIT_TOKEN_UNSUPPORTED'),
  'Expected ACCDB_UNIT_TOKEN_UNSUPPORTED for an unrecognized density token.',
);

console.log(JSON.stringify({
  check: 'accdb-to-canonical-geometry',
  status: 'PASS',
  nodeCount: geometry.nodes.length,
  segmentCount: geometry.segments.length,
  diagnosticCount: geometry.diagnostics.length,
}));
