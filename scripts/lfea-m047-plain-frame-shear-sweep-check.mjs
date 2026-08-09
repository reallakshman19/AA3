#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  frameLocalStiffness,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import { compileFixtureElement } from './lfea-b3.1-frame-element-fixtures.mjs';
import { buildM047PlainFrameShearSweep } from './lfea-m047-plain-frame-shear-sweep.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const KAPPA = 0.53;
const DOFS = ['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ'];
const COMPONENTS = ['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ'];

function test(id, name, body) { body(); process.stdout.write(`${id} PASS ${name}\n`); }
function matVec(matrix, vector) {
  const out = Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) for (let column = 0; column < 12; column += 1) out[row] += matrix[row * 12 + column] * vector[column];
  return out;
}
function timoAction(frame, dGlobal) {
  const dLocal = transformDisplacementToLocal(dGlobal, frame.transformation.matrix);
  const k = frameLocalStiffness({
    elasticModulus: frame.material.elasticModulus,
    shearModulus: frame.material.shearModulus,
    area: frame.section.area,
    secondMomentY: frame.section.secondMomentY,
    secondMomentZ: frame.section.secondMomentZ,
    polarMoment: frame.section.polarMoment,
    length: frame.geometry.length,
    shearDeformation: true,
    shearCorrectionFactorY: KAPPA,
    shearCorrectionFactorZ: KAPPA,
  }).matrix;
  return transformLoadToGlobal(matVec(k, dLocal), frame.transformation.matrix);
}
function rowsForSource(sourceId, nodeI, nodeJ, frame, dGlobal) {
  const action = timoAction(frame, dGlobal);
  const rows = [];
  for (const [endIndex, nodeId] of [[0, nodeI], [1, nodeJ]]) {
    for (let index = 0; index < 6; index += 1) rows.push({
      entityKind: 'NODE', entityId: String(nodeId), quantity: index < 3 ? 'DISPLACEMENT' : 'ROTATION',
      component: DOFS[index], value: dGlobal[endIndex * 6 + index], unit: index < 3 ? 'm' : 'rad', required: true,
    });
  }
  for (const [endIndex, end] of [[0, 'FROM'], [1, 'TO']]) {
    for (let index = 0; index < 6; index += 1) rows.push({
      entityKind: 'ELEMENT', entityId: `INPUT_ELEMENT:${sourceId}|${nodeI}->${nodeJ}|`,
      quantity: index < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`,
      component: COMPONENTS[index], value: action[endIndex * 6 + index], unit: index < 3 ? 'N' : 'N*m', required: true,
    });
  }
  return rows;
}
function ledgerEntry(sourceId, nodeI, nodeJ, frame) {
  return {
    elementId: `ACCDB.E${sourceId}`, sourceElementId: String(sourceId), nodeI: String(nodeI), nodeJ: String(nodeJ), kind: 'FRAME', teeJunctionNodeId: null,
    pressureAxialStrain: 0, bourdonRotationRadians: 0, bourdonFreeEndTranslationM: [0, 0, 0], gravityWeightN: 0,
    replayFrameRecord: frame, replayEffectiveLocalStiffness: frame.localStiffness,
  };
}
function fixture() {
  const ordinary = compileFixtureElement({ nodeJ: [2, 0, 0] });
  const nearZero = compileFixtureElement({ nodeJ: [0.005, 0, 0] });
  const d1 = [0, 0, 0, 0, 0, -0.002, 0.0001, 0.001, -0.0003, 0, 0.0004, 0.001];
  const d2 = [0, 0, 0, 0, -0.001, 0.002, 0.00001, -0.00002, 0.00003, 0, 0.002, -0.001];
  const referenceRows = [
    ...rowsForSource('4', '1', '2', ordinary, d1),
    ...rowsForSource('9', '3', '4', nearZero, d2),
  ];
  const ledger = [ledgerEntry('4', '1', '2', ordinary), ledgerEntry('9', '3', '4', nearZero)];
  return {
    benchmarkId: 'BM4_NL', profileId: 'TEST', source: { sha256: LOCKED },
    cases: [{ caseId: 'L19', referenceRows }, { caseId: 'L20', referenceRows }],
    mechanics: { cases: { L19: { elementLedger: ledger }, L20: { elementLedger: ledger } } },
  };
}

console.log('\n--- M047 I014 plain-frame shear sweep qualification ---');

test('M047-I014-T01', 'population sweep closes independent Timoshenko references', () => {
  const result = buildM047PlainFrameShearSweep(fixture());
  for (const caseId of ['L19', 'L20']) {
    const c = result.cases[caseId];
    assert.equal(c.sourceCount, 2);
    assert.equal(c.ordinarySourceCount, 1);
    assert.equal(c.nearZeroSourceCount, 1);
    assert.equal(c.population.improvedSourceRmsCount, 2);
    assert.equal(c.population.worsenedSourceRmsCount, 0);
    assert.equal(c.population.improvedTransverseComponentCount, 16);
    assert.equal(c.population.worsenedTransverseComponentCount, 0);
    assert.ok(c.population.timoshenkoTransverseMaxAbsResidual <= 1e-6);
  }
});

test('M047-I014-T02', 'local axial and torsion residuals are invariant under shear-only replay', () => {
  const result = buildM047PlainFrameShearSweep(fixture());
  for (const caseId of ['L19', 'L20']) {
    assert.ok(result.cases[caseId].population.maximumAxialResidualDelta <= 1e-9);
    assert.ok(result.cases[caseId].population.maximumTorsionResidualDelta <= 1e-9);
  }
});

test('M047-I014-T03', 'near-zero spans are reported separately rather than silently excluded', () => {
  const result = buildM047PlainFrameShearSweep(fixture());
  assert.equal(result.method.ordinaryMinimumLengthM, 0.01);
  assert.equal(result.cases.L19.nearZeroPopulation.sourceCount, 1);
  assert.equal(result.cases.L19.lengthBuckets[0].summary.sourceCount, 1);
  assert.equal(result.cases.L19.ordinaryPopulation.sourceCount, 1);
});

test('M047-I014-T04', 'diagnostic declares fixed authority and no production mutation', () => {
  const result = buildM047PlainFrameShearSweep(fixture());
  assert.equal(result.method.shearCorrectionFactorY, 0.53);
  assert.equal(result.method.shearCorrectionAuthority, 'COWPER-1966-THIN-ANNULUS-INPUT');
  assert.equal(result.method.productionMechanicsChanged, false);
  assert.equal(result.method.globalSolverUsed, false);
  assert.equal(result.method.benchmarkOutputFitUsed, false);
});

process.stdout.write('lfea-m047-plain-frame-shear-sweep-check: PASS\n');
