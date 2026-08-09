#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildM047SourceActionDecomposition } from './lfea-m047-source-action-decomposition.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const COMPONENTS = ['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ'];

function test(id, name, body) {
  body();
  process.stdout.write(`${id} PASS ${name}\n`);
}

function springMatrix(stiffnessByDof) {
  const matrix = Array(144).fill(0);
  for (let dof = 0; dof < 6; dof += 1) {
    const k = stiffnessByDof[dof];
    matrix[dof * 12 + dof] = k;
    matrix[dof * 12 + dof + 6] = -k;
    matrix[(dof + 6) * 12 + dof] = -k;
    matrix[(dof + 6) * 12 + dof + 6] = k;
  }
  return matrix;
}

function displacementRows(caseScale = 1) {
  const values = {
    '1': [0.001, -0.002, 0.0005, 0.0001, -0.0002, 0.0003],
    '2': [0.003, -0.001, -0.0007, -0.0002, 0.0004, -0.0001],
  };
  const rows = [];
  for (const [nodeId, vector] of Object.entries(values)) {
    for (let index = 0; index < 6; index += 1) {
      rows.push({
        entityKind: 'NODE',
        entityId: nodeId,
        quantity: index < 3 ? 'DISPLACEMENT' : 'ROTATION',
        component: ['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ'][index],
        value: vector[index] * caseScale,
        unit: index < 3 ? 'm' : 'rad',
        required: true,
      });
    }
  }
  return rows;
}

function actionRows() {
  const rows = [];
  const entityId = 'INPUT_ELEMENT:4|1->2|';
  for (const end of ['FROM', 'TO']) {
    for (let index = 0; index < COMPONENTS.length; index += 1) {
      const component = COMPONENTS[index];
      rows.push({
        entityKind: 'ELEMENT',
        entityId,
        quantity: `GLOBAL_END_${index < 3 ? 'FORCE' : 'MOMENT'}_${end}`,
        component,
        value: 0,
        unit: index < 3 ? 'N' : 'N*m',
        required: true,
      });
    }
  }
  return rows;
}

function ledger(caseScale = 1) {
  const stiffness = springMatrix([1000, 1200, 1400, 1600, 1800, 2000]);
  const make = (elementId, nodeI, nodeJ, sign) => ({
    elementId,
    sourceElementId: '4',
    nodeI,
    nodeJ,
    kind: 'FRAME',
    pressureAxialStrain: 1e-6,
    bourdonRotationRadians: 0,
    bourdonFreeEndTranslationM: [0, 0, 0],
    gravityWeightN: 10,
    replayElementContribution: {
      globalStiffness: stiffness,
      equivalentLoadGlobal: [1, -2, 3, 0.1, -0.2, 0.3, -1, 2, -3, -0.1, 0.2, -0.3]
        .map((value) => sign * caseScale * value),
      initialStrainLoadGlobal: [4, -5, 6, 0.4, -0.5, 0.6, -4, 5, -6, -0.4, 0.5, -0.6]
        .map((value) => sign * caseScale * value),
    },
  });
  return [make('E4.A', '1', '99', 1), make('E4.B', '99', '2', -1)];
}

function fixture() {
  const makeCase = (caseId, caseScale) => ({
    caseId,
    referenceRows: [...displacementRows(caseScale), ...actionRows()],
  });
  return {
    benchmarkId: 'BM4_NL',
    profileId: 'TEST',
    source: { sha256: LOCKED },
    tolerances: {
      GLOBAL_END_FORCE_FROM: { scaleFloor: 50 },
      GLOBAL_END_FORCE_TO: { scaleFloor: 50 },
      GLOBAL_END_MOMENT_FROM: { scaleFloor: 5 },
      GLOBAL_END_MOMENT_TO: { scaleFloor: 5 },
    },
    cases: [makeCase('L19', 1), makeCase('L20', 1.5)],
    mechanics: {
      cases: {
        L19: { elementLedger: ledger(1) },
        L20: { elementLedger: ledger(1.5) },
      },
    },
  };
}

console.log('\n--- M047 I012 source-action decomposition qualification ---');

test('M047-I012-T01', 'decomposition exactly reproduces I008 replay through a condensed internal node', () => {
  const result = buildM047SourceActionDecomposition(fixture(), ['4']);
  for (const caseId of ['L19', 'L20']) {
    const source = result.cases[caseId].sources['4'];
    assert.equal(source.analysisElementCount, 2);
    assert.equal(source.internalNodeCount, 1);
    assert.ok(source.maximumSuperpositionClosure <= 1e-7);
    for (const component of source.components) {
      const sum = component.contributions.stiffnessFromCaesarBoundaryDofs
        + component.contributions.equivalentLoad
        + component.contributions.initialStrainLoad;
      assert.ok(Math.abs(sum - component.replayValue) <= 1e-7);
      assert.ok(Math.abs(component.superpositionClosure) <= 1e-7);
    }
  }
});

test('M047-I012-T02', 'counterfactual localization fields are finite and do not mutate production mechanics', () => {
  const result = buildM047SourceActionDecomposition(fixture(), ['4']);
  assert.equal(result.method.globalSolverUsed, false);
  assert.equal(result.method.benchmarkOutputFitUsed, false);
  assert.equal(result.method.productionMechanicsChanged, false);
  for (const component of result.cases.L19.sources['4'].components) {
    assert.ok(Number.isFinite(component.counterfactuals.withoutEquivalentLoad.absoluteResidualImprovement));
    assert.ok(Number.isFinite(component.counterfactuals.withoutInitialStrainLoad.absoluteResidualImprovement));
    assert.ok(Number.isFinite(component.counterfactuals.stiffnessOnly.absoluteResidualImprovement));
  }
});

test('M047-I012-T03', 'source selection fails closed instead of inventing missing CAESAR references', () => {
  assert.throws(
    () => buildM047SourceActionDecomposition(fixture(), ['5']),
    /I008 replay has no source 5/u,
  );
});

test('M047-I012-T04', 'locked source identity is mandatory', () => {
  const report = fixture();
  report.source.sha256 = '0'.repeat(64);
  assert.throws(
    () => buildM047SourceActionDecomposition(report, ['4']),
    /requires locked ACCDB SHA-256/u,
  );
});

process.stdout.write('lfea-m047-source-action-decomposition-check: PASS\n');
