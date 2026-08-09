#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildM047ThermalAxialFingerprint } from './lfea-m047-thermal-axial-fingerprint.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const ALPHA = 11.7e-6;

function contribution(initialFx, stiffnessMarker = 1) {
  const globalStiffness = Array(144).fill(0);
  globalStiffness[0] = stiffnessMarker;
  return {
    globalStiffness,
    initialStrainLoadGlobal: [initialFx, 0, 0, 0, 0, 0, -initialFx, 0, 0, 0, 0, 0],
  };
}

function ledgerEntry(sourceElementId, caseId, initialFx, weight, stiffnessMarker = 1) {
  return {
    elementId: `${caseId}.E${sourceElementId}`.replace(`${caseId}.`, ''),
    sourceElementId: String(sourceElementId),
    kind: 'FRAME',
    teeJunctionNodeId: null,
    gravityWeightN: weight,
    pressureAxialStrain: 7e-5,
    replayElementContribution: contribution(initialFx, stiffnessMarker),
  };
}

function replaySource(sourceElementId, residual, authority = 'CAESAR_DIRECT_SOURCE_END_ACTION') {
  return {
    sourceElementId: String(sourceElementId),
    referenceAuthority: authority,
    components: [
      { quantity: 'GLOBAL_END_FORCE_FROM', component: 'FX', replayValue: residual, referenceValue: 0, residual, normalizedResidual: Math.abs(residual) / 50 },
      { quantity: 'GLOBAL_END_FORCE_TO', component: 'FX', replayValue: -residual, referenceValue: 0, residual: -residual, normalizedResidual: Math.abs(residual) / 50 },
    ],
  };
}

function fixture() {
  const l19 = [
    ledgerEntry('4', 'L19', 200, 100),
    ledgerEntry('7', 'L19', 300, 300),
  ];
  const l20 = [
    ledgerEntry('4', 'L20', 1200, 100),
    ledgerEntry('7', 'L20', 2300, 300),
  ];
  const replay = {
    benchmarkId: 'BM4_NL',
    profileId: 'SYNTHETIC-M047-I009',
    sourceAccdbSha256: LOCKED,
    method: { displacementAuthority: 'CAESAR_REFERENCE_NODE_DISPLACEMENT_AND_ROTATION' },
    cases: {
      L19: { sources: [replaySource('4', 0.01), replaySource('7', 0.02)] },
      L20: { sources: [replaySource('4', 50), replaySource('7', 100)] },
    },
  };
  const report = {
    benchmarkId: 'BM4_NL',
    profileId: 'SYNTHETIC-M047-I009',
    source: { sha256: LOCKED },
    tolerances: { GLOBAL_END_FORCE_FROM: { scaleFloor: 50 } },
    mechanics: {
      profile: { thermalExpansionCoefficientPerKelvin: ALPHA },
      cases: { L19: { elementLedger: l19 }, L20: { elementLedger: l20 } },
    },
  };
  return { report, replay };
}

console.log('\n--- M047 thermal axial fingerprint qualification ---');

{
  const { report, replay } = fixture();
  const result = buildM047ThermalAxialFingerprint(report, replay);
  assert.equal(result.qualifiedSourceCount, 2);
  assert.equal(result.skippedSourceCount, 0);
  assert.ok(Math.abs(result.summary.medianMultiplier - 1.05) < 1e-14);
  assert.ok(Math.abs(result.summary.gravityWeightedMedianMultiplier - 1.05) < 1e-14);
  assert.ok(Math.abs(result.summary.medianImpliedThermalExpansionCoefficientPerKelvin - ALPHA * 1.05) < 1e-18);
  assert.equal(result.tracked.source4.impliedThermalMultiplier.from, 1.05);
  assert.equal(result.tracked.source4.impliedThermalMultiplier.to, 1.05);
  assert.equal(result.tracked.source4L19AxialReplay.residualN, 0.01);
  assert.equal(result.method.outputFitUsedForProduction, false);
  process.stdout.write('M047-I009-T01 PASS common thermal multiplier fingerprint\n');
}

{
  const { report, replay } = fixture();
  report.mechanics.cases.L20.elementLedger[0].replayElementContribution.globalStiffness[0] = 2;
  const result = buildM047ThermalAxialFingerprint(report, replay);
  assert.equal(result.qualifiedSourceCount, 1);
  assert.ok(result.skipped.some((entry) => entry.sourceElementId === '4' && entry.reason === 'L19_L20_GLOBAL_STIFFNESS_DIFFERS'));
  process.stdout.write('M047-I009-T02 PASS case-stiffness changes are excluded rather than misattributed to alpha\n');
}

{
  const { report, replay } = fixture();
  replay.cases.L20.sources[0].referenceAuthority = 'CAESAR_INCIDENT_NODE_ACTION_MINUS_DIRECT_NEIGHBOR_END_ACTIONS';
  const result = buildM047ThermalAxialFingerprint(report, replay);
  assert.equal(result.qualifiedSourceCount, 1);
  assert.ok(result.skipped.some((entry) => entry.sourceElementId === '4' && entry.reason === 'SOURCE_REFERENCE_IS_NOT_DIRECT_CAESAR_END_ACTION'));
  process.stdout.write('M047-I009-T03 PASS direct CAESAR action custody is mandatory\n');
}

{
  const { report, replay } = fixture();
  replay.sourceAccdbSha256 = '0'.repeat(64);
  assert.throws(() => buildM047ThermalAxialFingerprint(report, replay), /locked ACCDB SHA-256/u);
  process.stdout.write('M047-I009-T04 PASS source identity fails closed\n');
}

process.stdout.write('lfea-m047-thermal-axial-fingerprint-check: PASS\n');
