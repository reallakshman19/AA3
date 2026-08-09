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

function incidentRows(caseId, nodeId, vector) {
  return vector.map((value, index) => ({
    caseId,
    entityKind: 'NODE',
    entityId: String(nodeId),
    quantity: index < 3 ? 'INCIDENT_GLOBAL_FORCE' : 'INCIDENT_GLOBAL_MOMENT',
    component: DOFS[index],
    value,
    unit: index < 3 ? 'N' : 'N*m',
    required: true,
    note: null,
  }));
}

function expectedSpringActions(k, from, to, seriesFactor = 1) {
  const fromAction = from.map((value, index) => k[index] * seriesFactor * (value - to[index]));
  return [...fromAction, ...fromAction.map((value) => -value)];
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function syntheticReport() {
  const stiffnesses = [1000, 1200, 1400, 1600, 1800, 2000];
  const cases = [];
  const mechanicsCases = {};
  for (const [caseId, multiplier] of [['L19', 1], ['L20', 1.7]]) {
    const d1 = [0, 0, 0, 0, 0, 0];
    const d2 = [0.001, -0.002, 0.003, -0.004, 0.005, -0.006].map((value) => value * multiplier);
    const d3 = [0.002, 0.001, -0.003, 0.004, -0.002, 0.005].map((value) => value * multiplier);
    const d4 = [-0.001, 0.003, 0.002, -0.005, 0.004, 0.001].map((value) => value * multiplier);
    const action4 = expectedSpringActions(stiffnesses, d1, d2);
    const action5 = expectedSpringActions(stiffnesses, d2, d3, 0.5);
    const action6 = expectedSpringActions(stiffnesses, d3, d4);
    const referenceRows = [
      ...displacementRows(caseId, '1', d1),
      ...displacementRows(caseId, '2', d2),
      ...displacementRows(caseId, '3', d3),
      ...displacementRows(caseId, '4', d4),
      ...actionRows(caseId, '4', '1', '2', action4),
      ...actionRows(caseId, '6', '3', '4', action6),
      ...incidentRows(caseId, '2', add(action4.slice(6, 12), action5.slice(0, 6))),
      ...incidentRows(caseId, '3', add(action5.slice(6, 12), action6.slice(0, 6))),
    ];
    cases.push({ caseId, referenceRows });
    mechanicsCases[caseId] = {
      elementLedger: [
        {
          elementId: `${caseId}.E4`, sourceElementId: '4', nodeI: '1', nodeJ: '2', kind: 'FRAME',
          replayElementContribution: springContribution(stiffnesses),
        },
        {
          elementId: `${caseId}.E5.A`, sourceElementId: '5', nodeI: '2', nodeJ: '5', kind: 'BEND_ARC',
          replayElementContribution: springContribution(stiffnesses),
        },
        {
          elementId: `${caseId}.E5.B`, sourceElementId: '5', nodeI: '5', nodeJ: '3', kind: 'BEND_ARC',
          replayElementContribution: springContribution(stiffnesses),
        },
        {
          elementId: `${caseId}.E6`, sourceElementId: '6', nodeI: '3', nodeJ: '4', kind: 'FRAME',
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
    const value = result.cases[caseId];
    assert.equal(value.directReferenceSourceCount, 2);
    assert.equal(value.derivedReferenceSourceCount, 1);
    assert.equal(value.replayedSourceCount, 3);
    assert.equal(value.skippedSourceCount, 0);
    assert.ok(value.tracked.source4.maximumNormalizedResidual < 1e-12);
    assert.ok(value.tracked.source5.maximumNormalizedResidual < 1e-12);
    assert.equal(value.tracked.source5.internalNodeCount, 1);
    assert.equal(value.tracked.source5.referenceAuthority, 'CAESAR_INCIDENT_NODE_ACTION_MINUS_DIRECT_NEIGHBOR_END_ACTIONS');
    assert.equal(value.tracked.source5.referenceDerivation.FROM.directNeighbors[0].sourceElementId, '4');
    assert.equal(value.tracked.source5.referenceDerivation.TO.directNeighbors[0].sourceElementId, '6');
  }
  assert.equal(result.method.globalSolverUsed, false);
  process.stdout.write('M047-I008-T01 PASS direct and incident-derived source replay with static condensation\n');
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
  input.cases[0].referenceRows = input.cases[0].referenceRows.filter(
    (row) => !(row.entityKind === 'NODE' && row.entityId === '3' && row.quantity.startsWith('INCIDENT_GLOBAL_')),
  );
  const result = buildM047ElementReplay(input);
  assert.equal(result.cases.L19.tracked.source5, null);
  const skipped = result.cases.L19.skipped.find((entry) => entry.sourceElementId === '5');
  assert.ok(skipped);
  assert.equal(skipped.reason, 'NO_CAESAR_SOURCE_END_ACTION_REFERENCE');
  assert.match(skipped.detail, /TO node 3 has no complete CAESAR incident-action vector/u);
  process.stdout.write('M047-I008-T03 PASS incomplete incident authority cannot derive a source action\n');
}

{
  const input = syntheticReport();
  input.source.sha256 = '0'.repeat(64);
  assert.throws(() => buildM047ElementReplay(input), /locked ACCDB SHA-256/u);
  process.stdout.write('M047-I008-T04 PASS source identity fails closed\n');
}

process.stdout.write('lfea-m047-element-replay-check: PASS\n');
