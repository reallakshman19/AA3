#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  buildDiagnosticAlphaProfile,
  compareThermalAlphaAb,
} from './lfea-m047-thermal-alpha-ab.mjs';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';

function row(caseId, entityKind, entityId, quantity, component, actualValue, referenceValue, pass) {
  const unit = quantity.includes('MOMENT')
    ? 'N*m'
    : quantity === 'ROTATION'
      ? 'rad'
      : quantity === 'DISPLACEMENT'
        ? 'm'
        : 'N';
  return {
    caseId,
    entityKind,
    entityId,
    quantity,
    component,
    unit,
    actualValue,
    referenceValue,
    status: pass ? 'PASS' : 'FAIL',
    relativeError: referenceValue === 0
      ? Math.abs(actualValue)
      : Math.abs(actualValue - referenceValue) / Math.max(Math.abs(referenceValue), 1),
  };
}

function benchmark(l19Delta = 0, l20Delta = 100) {
  const cases = [];
  for (const caseId of ['L19', 'L20']) {
    const delta = caseId === 'L19' ? l19Delta : l20Delta;
    cases.push({
      caseId,
      comparison: {
        rows: [
          row(caseId, 'NODE', '20090', 'FORCE', 'UY', -1600 + delta, -1600, Math.abs(delta) <= 160),
          row(caseId, 'NODE', '20090', 'DISPLACEMENT', 'UX', 0.001 + delta * 1e-6, 0.001, Math.abs(delta) <= 100),
          row(caseId, 'ELEMENT', 'INPUT_ELEMENT:4|20030->20090|', 'GLOBAL_END_FORCE_FROM', 'FX', 300 + delta, 300, Math.abs(delta) <= 30),
        ],
      },
    });
  }
  return {
    benchmarkId: 'BM4_NL',
    source: { sha256: LOCKED },
    qualification: { cases },
  };
}

console.log('\n--- M047 non-production thermal alpha A/B qualification ---');

{
  const baseProfile = {
    profileId: 'BASE',
    linearSolve: { thermalExpansionCoefficientPerKelvin: 11.7e-6 },
  };
  const fingerprint = {
    schema: 'lfea-m047-thermal-axial-fingerprint/v1',
    sourceAccdbSha256: LOCKED,
    semanticHash: 'fnv1a64:synthetic',
    method: { outputFitUsedForProduction: false },
    summary: { gravityWeightedMedianImpliedThermalExpansionCoefficientPerKelvin: 12.23e-6 },
  };
  const built = buildDiagnosticAlphaProfile(baseProfile, fingerprint);
  assert.equal(built.profile.linearSolve.thermalExpansionCoefficientPerKelvin, 12.23e-6);
  assert.equal(built.manifest.productionAuthority, false);
  assert.equal(built.manifest.outputFitUsedForProduction, false);
  assert.match(built.manifest.warning, /MUST NOT/u);
  process.stdout.write('M047-I010-T01 PASS fitted alpha is explicitly diagnostic-only\n');
}

{
  const baseline = benchmark(0, 100);
  const diagnostic = benchmark(0, 0);
  const manifest = { productionAuthority: false, diagnosticThermalExpansionCoefficientPerKelvin: 12.23e-6 };
  const result = compareThermalAlphaAb(baseline, diagnostic, manifest);
  assert.equal(result.invariants.l19NumericallyUnchanged, true);
  assert.equal(result.cases.L20.before.restraint.failingComponentCount, 0);
  assert.equal(result.cases.L20.before.sourceEndAction.failingComponentCount, 1);
  assert.equal(result.cases.L20.after.sourceEndAction.failingComponentCount, 0);
  assert.equal(result.productionAuthority, false);
  process.stdout.write('M047-I010-T02 PASS A/B measures L20 change while enforcing exact L19 invariance\n');
}

{
  const baseline = benchmark(0, 100);
  const diagnostic = benchmark(1, 0);
  const result = compareThermalAlphaAb(baseline, diagnostic, { productionAuthority: false });
  assert.equal(result.invariants.l19NumericallyUnchanged, false);
  assert.ok(result.cases.L19.actualRowChange.changedActualRowCount > 0);
  process.stdout.write('M047-I010-T03 PASS L19 numerical change is exposed as invariant failure\n');
}

{
  const baseProfile = { profileId: 'BASE', linearSolve: { thermalExpansionCoefficientPerKelvin: 11.7e-6 } };
  const bad = {
    schema: 'lfea-m047-thermal-axial-fingerprint/v1',
    sourceAccdbSha256: LOCKED,
    semanticHash: 'fnv1a64:bad',
    method: { outputFitUsedForProduction: true },
    summary: { gravityWeightedMedianImpliedThermalExpansionCoefficientPerKelvin: 12.23e-6 },
  };
  assert.throws(() => buildDiagnosticAlphaProfile(baseProfile, bad), /forbid production fitting/u);
  process.stdout.write('M047-I010-T04 PASS production-fitting evidence fails closed\n');
}

process.stdout.write('lfea-m047-thermal-alpha-ab-check: PASS\n');
