#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveDensityRangeToMax,
  resolveLineListDensity,
} from '../src/calc-workspace/cii-standalone-port/core/line-density-resolver.js';
import {
  detectLineListFieldMap,
  normalizeLineListRow,
} from '../src/calc-workspace/cii-standalone-port/core/linelist-mapping.js';
import { MasterDataController } from '../src/workspace/master-data-controller.js';
import { normalizeLineList } from '../src/workspace/master-data-normalizers.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
  validateProjectDataProfile,
} from '../src/workspace/project-data/project-data-contract.js';

const ROOT = path.resolve('.');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function pass(id, description) {
  console.log(`PASS: ${id} - ${description}`);
}

console.log('--- PR1136 Master Density and Provenance Qualification ---');

const fieldMap = {
  lineKey1: 'Service',
  lineKey2: 'Line number',
  density: 'Oper Density',
  densityMixed: 'Mixed Density',
  densityGas: 'Gas Density',
  densityLiquid: 'Liquid Density',
  phase: 'Phase',
};

{
  const result = resolveLineListDensity({
    'Oper Density': '850',
    'Mixed Density': '300',
    'Liquid Density': '900',
    Phase: 'MIXED',
  }, null, fieldMap);
  assert.equal(result.value, '850');
  assert.equal(result.source, 'linelist-density');
  pass('D-001', 'explicit mapped operating density is authoritative over phase-specific alternatives');
}

{
  const result = resolveLineListDensity({
    'Mixed Density': '300',
    'Liquid Density': '900',
    Phase: 'MIXED',
  }, null, fieldMap);
  assert.equal(result.value, '300');
  assert.equal(result.selected, 'densityMixed');
  pass('D-002', 'MIXED phase uses mixed density rather than liquid-only density');
}

{
  const gas = resolveLineListDensity({ 'Gas Density': '42', Phase: 'GAS' }, null, fieldMap);
  const liquid = resolveLineListDensity({ 'Liquid Density': '910', Phase: 'LIQUID' }, null, fieldMap);
  assert.equal(gas.value, '42');
  assert.equal(gas.selected, 'densityGas');
  assert.equal(liquid.value, '910');
  assert.equal(liquid.selected, 'densityLiquid');
  pass('D-003', 'recognized GAS and LIQUID phases consume only their exact phase density');
}

{
  const unique = resolveLineListDensity({ 'Gas Density': '38' }, null, fieldMap);
  const ambiguous = resolveLineListDensity({ 'Gas Density': '38', 'Liquid Density': '890' }, null, fieldMap);
  assert.equal(unique.value, '38');
  assert.equal(unique.selected, 'densityGas');
  assert.equal(unique.source, 'linelist-density-gas');
  assert.equal(ambiguous.value, '');
  assert.equal(ambiguous.source, 'ambiguous-phase-density');
  pass('D-004', 'phase-free fallback is allowed only for one unambiguous candidate');
}

{
  const missingMixed = resolveLineListDensity({ 'Liquid Density': '900', Phase: 'MIXED' }, null, fieldMap);
  assert.equal(missingMixed.value, '');
  assert.equal(missingMixed.source, 'missing-phase-density');
  assert.equal(missingMixed.selected, 'densityMixed');
  pass('D-005', 'missing MIXED density fails closed instead of substituting liquid density');
}

{
  const override = resolveLineListDensity({ 'Oper Density': '850' }, { density: '720' }, fieldMap);
  assert.equal(override.value, '720');
  assert.equal(override.source, 'override');
  assert.equal(resolveDensityRangeToMax('800-900'), '900');
  const ranged = resolveLineListDensity({ 'Oper Density': '800-900' }, null, fieldMap);
  assert.equal(ranged.value, '900');
  assert.equal(ranged.source, 'linelist-density-range-max');
  pass('D-006', 'explicit process override and existing conservative range-max policy remain intact');
}

{
  const customMap = {
    density: 'Custom OpD',
    densityGas: 'Gas Density',
    phase: 'Phase',
  };
  const result = resolveLineListDensity({
    'Custom OpD': '777',
    'Gas Density': '42',
    Phase: 'GAS',
  }, null, customMap);
  assert.equal(result.value, '777');
  assert.equal(result.source, 'linelist-density');
  pass('D-007', 'explicit custom operating-density mapping is honored as direct source authority');
}

{
  const raw = [{ 'Mixed Density': '300', 'Gas Density': '42', Phase: 'GAS' }];
  const detected = detectLineListFieldMap(raw);
  assert.equal(detected.density, detected.densityMixed, 'fixture must exercise the legacy promoted-density map');
  const normalized = normalizeLineListRow(raw[0], detected, 0);
  assert.equal(normalized.density, '42');
  assert.equal(normalized.densitySource, 'linelist-density-gas');
  pass('D-008', 'legacy generic-density promotion cannot override the exact GAS phase source');
}

{
  const [row] = normalizeLineList([{
    Service: 'P',
    'Line number': '1001',
    'Oper Density': '845',
    Phase: 'MIXED',
    _sourceRowNumber: 4,
    _sourceSheet: 'Lines',
  }], fieldMap);
  assert.equal(row.lineKey, 'P1001');
  assert.equal(row.operatingFluidDensity, '845');
  assert.equal(row.density, '845');
  assert.equal(row.densitySource, 'linelist-density');
  pass('D-009', 'normalized line-list row carries resolved operating density and provenance');
}

{
  const events = [];
  const controller = new MasterDataController({ publish: (topic, payload) => events.push({ topic, payload }) });
  assert.equal(controller.getMasterData().weight.rawRows.length, 0);
  assert.equal(controller.getMasterData().materialMap.rawRows.length, 0);
  const lineHash = 'a'.repeat(64);
  const classHash = 'b'.repeat(64);
  const weightHash = 'c'.repeat(64);
  controller.setRawRows('lineList', [{ Line: 'L-1' }], 'lines.csv', 'Lines', { sourceHash: lineHash, byteLength: 12 });
  controller.setRawRows('pipingClass', [{ Class: 'A1' }], 'class.csv', 'Class', { sourceHash: classHash, byteLength: 13 });
  controller.setRawRows('weight', [{ Weight: '10' }], 'weights.csv', 'Weights', { sourceHash: weightHash, byteLength: 14 });
  const legacy = controller.getLegacyContext();
  assert.equal(legacy.sourceMetadata.lineList.sourceHash, lineHash);
  assert.equal(legacy.sourceMetadata.pipingClass.sourceHash, classHash);
  assert.equal(legacy.sourceMetadata.weight.sourceHash, weightHash);
  assert.equal(legacy.sourceMetadata.lineList.byteLength, 12);
  pass('P-001', 'master source hashes remain exact and no default master rows are injected');
}

function loadPolicyAudit(insulationDensities, section) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(
    profile,
    'loadCalculation.insulationDensitiesKgPerM3',
    insulationDensities,
    { source: 'PR1136 analytical fixture' },
    true,
  );
  profile = replaceProjectDataValue(
    profile,
    'loadCalculation.pipeSectionProperties',
    { L1: section },
    { source: 'PR1136 analytical fixture' },
    true,
  );
  return validateProjectDataProfile(profile, 'benchmark', {});
}

{
  const audit = loadPolicyAudit(
    { NONE: 0, UNINSULATED: 0, CAL_SIL: 200 },
    {
      outsideDiameterMm: 168.3,
      wallThicknessMm: 10.97,
      materialCode: 'A106-B',
      insulationThicknessMm: 0,
      insulationCode: 'NONE',
    },
  );
  const loadErrors = audit.errors.filter((row) => (
    row.path.startsWith('loadCalculation.insulationDensitiesKgPerM3')
    || row.path.startsWith('loadCalculation.pipeSectionProperties')
  ));
  assert.deepEqual(loadErrors, []);
  pass('V-001', 'explicit uninsulated zero thickness/density is accepted as physically valid');
}

{
  const densityAudit = loadPolicyAudit(
    { NONE: 0, CAL_SIL: 0 },
    {
      outsideDiameterMm: 168.3,
      wallThicknessMm: 10.97,
      materialCode: 'A106-B',
      insulationThicknessMm: 0,
      insulationCode: 'NONE',
    },
  );
  assert.ok(densityAudit.errors.some((row) => (
    row.path === 'loadCalculation.insulationDensitiesKgPerM3.CAL_SIL'
    && row.code === 'NON_POSITIVE_ENGINEERING_VALUE'
  )));

  const wallAudit = loadPolicyAudit(
    { NONE: 0, CAL_SIL: 200 },
    {
      outsideDiameterMm: 168.3,
      wallThicknessMm: 0,
      materialCode: 'A106-B',
      insulationThicknessMm: 0,
      insulationCode: 'NONE',
    },
  );
  assert.ok(wallAudit.errors.some((row) => (
    row.path === 'loadCalculation.pipeSectionProperties.L1.wallThicknessMm'
    && row.code === 'NON_POSITIVE_ENGINEERING_VALUE'
  )));

  const inconsistentInsulationAudit = loadPolicyAudit(
    { NONE: 0, CAL_SIL: 200 },
    {
      outsideDiameterMm: 168.3,
      wallThicknessMm: 10.97,
      materialCode: 'A106-B',
      insulationThicknessMm: 0,
      insulationCode: 'CAL_SIL',
    },
  );
  assert.ok(inconsistentInsulationAudit.errors.some((row) => (
    row.path === 'loadCalculation.pipeSectionProperties.L1.insulationThicknessMm'
    && row.code === 'NON_POSITIVE_ENGINEERING_VALUE'
  )));
  pass('V-002', 'invalid zero insulation density, pipe wall, and insulated-section thickness remain blocked');
}

{
  const supportDistribution = read('src/workspace/engineering-loads/support-load-distribution-v3.js');
  const engineeringController = read('src/workspace/engineering-model-controller.js');
  const loadController = read('src/workspace/load-calc-consumer-controller.js');
  const masterController = read('src/workspace/master-data-controller.js');

  assert.doesNotMatch(supportDistribution, /['"]\d['"]\.repeat\(64\)|['"]0['"]\.repeat\(64\)/u);
  assert.doesNotMatch(engineeringController, /EXEC-DIRECT|engineeringModelStore\.calculate\(masterData\)/u);
  assert.doesNotMatch(loadController, /S8811951|\.repeat\(64\)|\|\|\s*1000|\|\|\s*50/u);
  assert.doesNotMatch(masterController, /DEFAULT_WEIGHT_MASTER_ROWS|DEFAULT_MATERIAL_MASTER_ROWS/u);
  pass('G-001', 'no fake hash, authorization bypass, synthetic line, density/mass fallback, or hidden master catalogue is present');
}

console.log('\nPR1136 QUALIFICATION STATUS: PASS');
