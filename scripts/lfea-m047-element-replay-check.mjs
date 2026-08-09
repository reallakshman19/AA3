#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildM047ElementReplay } from './lfea-m047-element-replay.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const DOFS = ['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ'];
const ACTION_COMPONENTS = ['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ'];

function springContribution(stiffnesses) {
  const matrix = Array(144).fill(0);
  for (let dof = 0; dof < 6; dof += 1) {
    const k = stiffnesses[dof];
    matrix[dof * 12 + dof] = k;
    matrix[dof * 12 + 6 + dof] = -k;
    matrix[(6 + dof) * 12 + dof] = -k;
    matrix[(6 + dof) * 12 + 6 + dof] = k;
  }
  return { globalStiffness: matrix, equivalentLoadGlobal: Array(12).fill(0), initialStrainLoadGlobal: Array(12).fill(0) };
}

function displacementRows(caseId, nodeId, values) {
  return values.map((value, index) => ({
    caseId,
    entityKind: 'NODE',
    entityId: String(nodeId),
    quantity: index < 3 ? 'DISPLACEMENT' : 'ROTATION',
    component: DOFS[index],
    value,
    unit: index < 3 ? 'm' : 'rad',
    required: true,
    note: null,
  }));
}

function actionRows(caseId, sourceId, fromNodeId, toNodeId, vector) {
  const entityId = `INPUT_ELEMENT:${sourceId}|${fromNodeId}->${toNodeId}|`;
  return vector.map((value, index) => {
    const end = index < 6 ? 'FROM' : 'TO';
    const local = index % 6;
    const component = ACTION_COMPONENTS[local];
    const type = local < 3 ? 'FORCE' : 'MOMENT';
    return {
      caseId,
      entityKind: 'ELEMENT',
      entityId,
      quantity: `GLOBAL_END_${type}_${end}`,
      component,
      value,
      unit: local < 3 ? 'N' : 'N*m',
      required: true,
      note: null,
    };
  });
}

function expectedSpringActions(k, from, to, seriesFactor = 1) {
  const fromAction = from.map((value, index) => k[index] * seriesFactor * (value - to[index]));
  return [...fromAction, ...fromAction.map((value) => -value)];
}

function syntheticReport() {
  const stiffnesses = [1000, 1200, 1400, 1600, 1800, 2000];
  const cases = [];
  const mechanicsCases = {};
  for (const [caseId, multiplier] of [['L19', 1], ['L20', 1.7]]) {
    const d1 = [0, 0, 0, 0, 0, 0];
    const d2 = [0.001, -0.002, 0.003, -0.004, 0.005, -0.006].map((value) => value * multiplier);
    const d3 = [0.002, 0.001, -0.003, 0.004, -0.002, 0.005].map((value) => value * multiplier);
    const d5 = [-0.001, 0.003, 0.002, -0.005, 0.004, 0.001].map((value) => value * multiplier);
    const referenceRows = [
      ...displacementRows(caseId, '1', d1),
      ...displacementRows(caseId, '2', d2),
      ...displacementRows(caseId, '3', d3),
      ...displacementRows(caseId, '5', d5),
      ...actionRows(caseId, '4', '1', '2', expectedSpringActions(stiffnesses, d1, d2)),
      ...actionRows(caseId, '5', '3', '5', expectedSpringActions(stiffnesses, d3, d5, 0.5)),
    ];
    cases.push({ caseId, referenceRows });
    mechanicsCases[caseId] = {
      elementLedger: [
        {
          elementId: `${caseId}.E4`, sourceElementId: '4', nodeI: '1', nodeJ: '2', kind: 'FRAME',
          replayElementContribution: springContribution(stiffnesses),
        },
        {
          elementId: `${caseId}.E5.A`, sourceElementId: '5', nodeI: '3', nodeJ: '4', kind: 'BEND_ARC',
          replayElementContribution: springContribution(stiffnesses),
        },
        {
          elementId: `${caseId}.E5.B`, sourceElementId: '5', nodeI: '4', nodeJ: '5', kind: 'BEND_ARC',
          replayElementContribution: springContribution(stiffnesses),
        },
      ],
    };
  }
  const tolerances = {};
  for (const end of ['FROM', 'TO']) {
    tolerances[`GLOBAL_END_FORCE_${end}`] = { absolute: 0, relative: 0.1, scaleFloor: 50 };
    tolerances[`GLOBAL_END_MOMENT_${end}`] = { absolute: 0, relative: 0.1, scaleFloor: 5 };
  }
  return {
    benchmarkId: 'BM4_NL',
    profileId: 'SYNTHETIC-M047-REPLAY',
    source: { sha256: LOCKED },
    cases,
    tolerances,
    mechanics: { cases: mechanicsCases },
  };
}

console.log('\n--- M047 CAESAR endpoint element replay qualification ---');

{
  const result = buildM047ElementReplay(syntheticReport());
  for (const caseId of ['L19', 'L20']) {
    assert.equal(result.cases[caseId].replayedSourceCount, 2);
    assert.equal(result.cases[caseId].skippedSourceCount, 0);
    assert.ok(result.cases[caseId].tracked.source4.maximumNormalizedResidual < 1e-12);
    assert.ok(result.cases[caseId].tracked.source5.maximumNormalizedResidual < 1e-12);
    assert.equal(result.cases[caseId].tracked.source5.internalNodeCount, 1);
  }
  assert.equal(result.method.globalSolverUsed, false);
  process.stdout.write('M047-I008-T01 PASS single-element and condensed multi-element replay\n');
}

{
  const input = syntheticReport();
  delete input.mechanics.cases.L19.elementLedger[0].replayElementContribution;
  const result = buildM047ElementReplay(input);
  assert.equal(result.cases.L19.tracked.source4, null);
  assert.ok(result.cases.L19.skipped.some((entry) => entry.sourceElementId === '4' && entry.reason === 'REPLAY_INSTRUMENTATION_MISSING'));
  process.stdout.write('M047-I008-T02 PASS missing contribution evidence is explicit\n');
}

{
  const input = syntheticReport();
  input.source.sha256 = '0'.repeat(64);
  assert.throws(() => buildM047ElementReplay(input), /locked ACCDB SHA-256/u);
  process.stdout.write('M047-I008-T03 PASS source identity fails closed\n');
}

process.stdout.write('lfea-m047-element-replay-check: PASS\n');
