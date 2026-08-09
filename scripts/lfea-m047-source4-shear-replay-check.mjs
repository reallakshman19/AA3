#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  frameLocalStiffness,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import { compileFixtureElement } from './lfea-b3.1-frame-element-fixtures.mjs';
import { buildM047Source4ShearReplay } from './lfea-m047-source4-shear-replay.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const DOFS = ['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ'];
const COMPONENTS = ['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ'];
const KAPPA = 0.53;

function test(id, name, body) {
  body();
  process.stdout.write(`${id} PASS ${name}\n`);
}
function matVec(matrix, vector) {
  const out = Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) for (let column = 0; column < 12; column += 1) out[row] += matrix[row * 12 + column] * vector[column];
  return out;
}
function referenceRows(frame, dGlobal) {
  const dLocal = transformDisplacementToLocal(dGlobal, frame.transformation.matrix);
  const timo = frameLocalStiffness({
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
  });
  const qGlobal = transformLoadToGlobal(matVec(timo.matrix, dLocal), frame.transformation.matrix);
  const rows = [];
  for (const [endIndex, nodeId] of [[0, '1'], [1, '2']]) {
    for (let index = 0; index < 6; index += 1) {
      rows.push({
        entityKind: 'NODE', entityId: nodeId,
        quantity: index < 3 ? 'DISPLACEMENT' : 'ROTATION', component: DOFS[index],
        value: dGlobal[endIndex * 6 + index], unit: index < 3 ? 'm' : 'rad', required: true,
      });
    }
  }
  for (const [endIndex, end] of [[0, 'FROM'], [1, 'TO']]) {
    for (let index = 0; index < 6; index += 1) {
      rows.push({
        entityKind: 'ELEMENT', entityId: 'INPUT_ELEMENT:4|1->2|',
        quantity: index < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`,
        component: COMPONENTS[index], value: qGlobal[endIndex * 6 + index],
        unit: index < 3 ? 'N' : 'N*m', required: true,
      });
    }
  }
  return rows;
}
function fixture() {
  const frame = compileFixtureElement();
  const dGlobal = [0, 0, 0, 0, 0, -0.002, 0.0001, 0, -0.0003, 0, 0.0004, 0.001];
  const makeCase = (caseId) => ({ caseId, referenceRows: referenceRows(frame, dGlobal) });
  const ledgerEntry = {
    elementId: 'ACCDB.E4', sourceElementId: '4', nodeI: '1', nodeJ: '2', kind: 'FRAME', teeJunctionNodeId: null,
    pressureAxialStrain: 0, bourdonRotationRadians: 0, bourdonFreeEndTranslationM: [0, 0, 0], gravityWeightN: 0,
    replayElementContribution: { globalStiffness: frame.globalStiffness, equivalentLoadGlobal: Array(12).fill(0), initialStrainLoadGlobal: Array(12).fill(0) },
    replayFrameRecord: frame, replayEffectiveLocalStiffness: frame.localStiffness,
  };
  return {
    benchmarkId: 'BM4_NL', profileId: 'TEST', source: { sha256: LOCKED },
    tolerances: {
      GLOBAL_END_FORCE_FROM: { scaleFloor: 50 }, GLOBAL_END_FORCE_TO: { scaleFloor: 50 },
      GLOBAL_END_MOMENT_FROM: { scaleFloor: 5 }, GLOBAL_END_MOMENT_TO: { scaleFloor: 5 },
    },
    cases: [makeCase('L19'), makeCase('L20')],
    mechanics: { cases: { L19: { elementLedger: [ledgerEntry] }, L20: { elementLedger: [ledgerEntry] } } },
  };
}

console.log('\n--- M047 I013 source-4 shear replay qualification ---');

test('M047-I013-T01', 'Cowper Timoshenko replay closes a synthetic Timoshenko reference', () => {
  const result = buildM047Source4ShearReplay(fixture());
  for (const caseId of ['L19', 'L20']) {
    const summary = result.cases[caseId].summary;
    assert.ok(summary.baselineTransverseMaxAbsResidual > 0);
    assert.ok(summary.timoshenkoTransverseMaxAbsResidual <= 1e-7);
    assert.equal(summary.worsenedTransverseComponentCount, 0);
    assert.ok(result.cases[caseId].frame.diagnostic.phiXY > 0);
    assert.ok(result.cases[caseId].frame.diagnostic.phiXZ > 0);
  }
});

test('M047-I013-T02', 'diagnostic keeps axial response invariant', () => {
  const result = buildM047Source4ShearReplay(fixture());
  for (const caseId of ['L19', 'L20']) {
    assert.ok(result.cases[caseId].summary.timoshenkoAxialMaxAbsResidual <= 1e-7);
  }
});

test('M047-I013-T03', 'diagnostic declares no production, bend, pressure, or global-solver change', () => {
  const result = buildM047Source4ShearReplay(fixture());
  assert.equal(result.method.productionMechanicsChanged, false);
  assert.equal(result.method.bendMechanicsChanged, false);
  assert.equal(result.method.pressureMechanicsChanged, false);
  assert.equal(result.method.globalSolverUsed, false);
  assert.equal(result.method.benchmarkOutputFitUsed, false);
  assert.equal(result.method.shearCorrectionFactorY, 0.53);
  assert.equal(result.method.shearCorrectionAuthority, 'COWPER-1966-THIN-ANNULUS-INPUT');
});

process.stdout.write('lfea-m047-source4-shear-replay-check: PASS\n');
