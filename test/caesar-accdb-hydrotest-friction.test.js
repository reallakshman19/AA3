import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3,
  buildBm4lHydrotestCompatibilityPackage,
  resolveBm4lHydrotestAuthority,
} from '../src/core/fea-benchmarks/caesar-accdb-hydrotest-friction.js';

function packageFixture(overrides = {}) {
  const authority = {
    schema: 'caesar-configuration-authority/v1',
    layers: {
      overallGlobalDefault: { settings: {} },
      individualFile: { settings: {} },
      loadCase: {
        cases: {
          L1: { FLEXIBILITY_ELASTIC_MODULUS: 'EC' },
          L13: { SOME_OLD_L13_SETTING: 'MUST_NOT_SURVIVE_HYDRO_ALIAS' },
        },
      },
      modelInput: { settings: { COEFFICIENT_OF_FRICTION_MU: 0.3 } },
    },
  };
  const fixture = {
    schema: 'caesar-accdb-benchmark-package/v1',
    benchmarkId: 'BM4_L',
    semanticHash: 'package-hash',
    source: {
      fileName: 'BM4_L.ACCDB',
      byteLength: 5136384,
      sha256: 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c',
    },
    profile: { configurationAuthority: authority },
    model: {
      semanticHash: 'source-model-hash',
      tables: {
        INPUT_BASIC_ELEMENT_DATA: {
          rows: [
            {
              ELEMENTID: 1,
              PRESSURE1: 111,
              HYDRO_PRESSURE: 222,
              FLUID_DENSITY: 0.00085,
              INSUL_THICK: 25,
              INSUL_DENSITY: 0.0002,
            },
          ],
        },
        INPUT_UNITS: { rows: [{ TRANS: 'N./cm.' }] },
      },
    },
    cases: [
      { caseId: 'L1', lcaseNumber: 1, caseClass: 'HYD', formula: 'WW+HP' },
      { caseId: 'L13', lcaseNumber: 13, caseClass: 'SUS', formula: 'W+P1' },
    ],
    references: {},
  };
  return { ...fixture, ...overrides };
}

test('resolves exact L1 HYD WW+HP with SG=1 water and default hydro insulation exclusion', () => {
  const authority = resolveBm4lHydrotestAuthority(packageFixture());
  assert.equal(authority.sourceCaseClass, 'HYD');
  assert.equal(authority.sourceFormula, 'WW+HP');
  assert.equal(authority.weightAuthority.waterSpecificGravity, 1);
  assert.equal(authority.weightAuthority.waterDensityKgPerCm3, 0.001);
  assert.equal(authority.weightAuthority.operatingFluidDensityReused, false);
  assert.equal(authority.insulation.included, false);
  assert.equal(authority.insulation.resolvedSetting.level, 'CAESAR_DEFAULT');
  assert.equal(authority.pressureField, 'HYDRO_PRESSURE');
});

test('fails closed if source L1 is not exact HYD WW+HP', () => {
  const fixture = packageFixture();
  fixture.cases = fixture.cases.map((row) => row.caseId === 'L1' ? { ...row, formula: 'W+P1' } : row);
  assert.throws(
    () => resolveBm4lHydrotestAuthority(fixture),
    (error) => error?.code === 'CAESAR_ACCDB_HYDROTEST_CASE_UNQUALIFIED',
  );
});

test('fails closed on explicit Include Insulation in Hydrotest=True', () => {
  const fixture = packageFixture();
  fixture.profile.configurationAuthority.layers.individualFile.settings.INCLUDE_INSULATION_IN_HYDROTEST = true;
  assert.throws(
    () => resolveBm4lHydrotestAuthority(fixture),
    (error) => error?.code === 'CAESAR_ACCDB_HYDROTEST_INSULATION_OVERRIDE_UNQUALIFIED',
  );
});

test('fails closed on invalid HYDRO_PRESSURE', () => {
  const fixture = packageFixture();
  fixture.model.tables.INPUT_BASIC_ELEMENT_DATA.rows[0].HYDRO_PRESSURE = Number.NaN;
  assert.throws(
    () => resolveBm4lHydrotestAuthority(fixture),
    (error) => error?.code === 'CAESAR_ACCDB_HYDROTEST_PRESSURE_INVALID',
  );
});

test('compatibility package replaces operating fluid with water, removes hydro insulation and maps HP to P1', () => {
  const source = packageFixture();
  const { compatibilityPackage, hydrotestAuthority } = buildBm4lHydrotestCompatibilityPackage(source);
  const row = compatibilityPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows[0];
  assert.equal(row.PRESSURE1, 222);
  assert.equal(row.FLUID_DENSITY, BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3);
  assert.equal(row.INSUL_THICK, 0);
  assert.equal(row.INSUL_DENSITY, 0);
  assert.equal(source.model.tables.INPUT_BASIC_ELEMENT_DATA.rows[0].PRESSURE1, 111);
  assert.equal(source.model.tables.INPUT_BASIC_ELEMENT_DATA.rows[0].FLUID_DENSITY, 0.00085);
  assert.notEqual(compatibilityPackage.model.semanticHash, source.model.semanticHash);
  assert.equal(compatibilityPackage.source.sha256, source.source.sha256);
  assert.equal(hydrotestAuthority.benchmarkReferenceRule,
    'PINNED_ACCDB_L1_OUTPUT_REMAINS_THE_ONLY_COMPARISON_REFERENCE');

  const alias = compatibilityPackage.cases.find((entry) => entry.caseId === 'L13');
  assert.equal(alias.formula, 'W+P1');
  assert.equal(alias.caseClass, 'HYD');
  assert.equal(alias.lcaseNumber, 13);
  const aliasSettings = compatibilityPackage.profile.configurationAuthority.layers.loadCase.cases.L13;
  assert.deepEqual(aliasSettings, { FLEXIBILITY_ELASTIC_MODULUS: 'EC' });
});
