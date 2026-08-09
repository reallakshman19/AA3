#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildM047ResidualDecomposition } from './lfea-m047-residual-decomposition.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';

function row(caseId, entityKind, entityId, quantity, component, unit, actualValue, referenceValue, scaleFloor) {
  return {
    caseId,
    entityKind,
    entityId,
    quantity,
    component,
    unit,
    actualValue,
    referenceValue,
    tolerance: { absolute: 0, relative: 0.1, scaleFloor },
  };
}

function report() {
  const tracked = [
    ['20090', 'UY'],
    ['20350', 'UY'],
    ['20390', 'UZ'],
    ['20550', 'UZ'],
    ['22140', 'UX'],
    ['22490', 'UX'],
  ];
  const l19 = [
    row('L19', 'NODE', '20010', 'DISPLACEMENT', 'UX', 'm', 0.003, 0.002, 1e-6),
    row('L19', 'ELEMENT', 'INPUT_ELEMENT:SYNTHETIC', 'GLOBAL_END_FORCE_FROM', 'FX', 'N', 120, 100, 50),
    ...tracked.map(([nodeId, component], index) => row('L19', 'NODE', nodeId, 'FORCE', component, 'N', 100 + index, 90 + index, 50)),
  ];
  const l20 = [
    row('L20', 'NODE', '20010', 'DISPLACEMENT', 'UX', 'm', 0.0055, 0.004, 1e-6),
    row('L20', 'ELEMENT', 'INPUT_ELEMENT:SYNTHETIC', 'GLOBAL_END_FORCE_FROM', 'FX', 'N', 170, 150, 50),
    ...tracked.map(([nodeId, component], index) => row('L20', 'NODE', nodeId, 'FORCE', component, 'N', 150 + index, 140 + index, 50)),
  ];
  return {
    benchmarkId: 'BM4_NL',
    profileId: 'SYNTHETIC-M047-CHECK',
    source: { sha256: LOCKED },
    qualification: {
      cases: [
        { caseId: 'L19', comparison: { rows: l19 } },
        { caseId: 'L20', comparison: { rows: l20 } },
      ],
    },
  };
}

console.log('\n--- M047 residual decomposition qualification ---');

{
  const result = buildM047ResidualDecomposition(report());
  assert.equal(result.rowCount, 8);
  const displacement = result.rows.find((entry) => entry.identity === 'NODE:20010:DISPLACEMENT:UX');
  assert.ok(displacement);
  assert.equal(displacement.wpResidual, 0.001);
  assert.ok(Math.abs(displacement.thermal.actualIncrement - 0.0025) < 1e-15);
  assert.ok(Math.abs(displacement.thermal.referenceIncrement - 0.002) < 1e-15);
  assert.ok(Math.abs(displacement.thermal.residual - 0.0005) < 1e-15);
  assert.equal(result.tracked.L19_20090_FY.entityId, '20090');
  assert.equal(result.summaries.families.DISPLACEMENT_ROTATION.rowCount, 1);
  assert.equal(result.summaries.families.SUPPORT_REACTION.rowCount, 6);
  assert.equal(result.summaries.families.SOURCE_END_ACTION.rowCount, 1);
  process.stdout.write('M047-I007-T01 PASS residual algebra and family custody\n');
}

{
  const input = report();
  input.qualification.cases[1].comparison.rows.pop();
  assert.throws(
    () => buildM047ResidualDecomposition(input),
    /physical identity mismatch/u,
  );
  process.stdout.write('M047-I007-T02 PASS cross-case identity mismatch fails closed\n');
}

{
  const input = report();
  input.qualification.cases[1].comparison.rows[0].unit = 'mm';
  assert.throws(
    () => buildM047ResidualDecomposition(input),
    /changes unit/u,
  );
  process.stdout.write('M047-I007-T03 PASS unit mismatch fails closed\n');
}

{
  const input = report();
  input.source.sha256 = '0'.repeat(64);
  assert.throws(
    () => buildM047ResidualDecomposition(input),
    /locked ACCDB SHA-256/u,
  );
  process.stdout.write('M047-I007-T04 PASS source hash fails closed\n');
}

process.stdout.write('lfea-m047-residual-decomposition-check: PASS\n');
