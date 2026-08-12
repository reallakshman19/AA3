import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  migrateCaesarFrictionAuthorityV1ToV2,
} from './caesar-configuration-authority.js';
import {
  BM4L_FRICTION_MULTIPLIERS,
  solveCaesarAccdbFrictionBenchmark as solveRawCaesarAccdbFrictionBenchmark,
} from './caesar-accdb-friction-solve.js';
import { resolveCaesarFrictionCaseSettings } from './caesar-friction-active-set.js';

export const BM4L_HYDROTEST_AUTHORITY_SCHEMA = 'm047-bm4l-hydrotest-authority/v1';
export const BM4L_HYDROTEST_WATER_DENSITY_KG_PER_M3 = 1000;
export const BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3 = 0.001;

const HYDRO_INSULATION_SETTING = 'INCLUDE_INSULATION_IN_HYDROTEST';
const INTERNAL_ALIAS_CASE_ID = 'L13';

/**
 * Resolve the only Stage-2 L1 interpretation authorized by Issue #1083 and
 * CAESAR II's documented WW/HP load semantics.
 *
 * The numerical water basis is SG=1.0 expressed in the ACCDB density unit.
 * CAESAR II v14 documents WW as pipe + water as the fluid and HP as Hydro
 * Pressure. It also documents Include Insulation in Hydrotest=False as the
 * default; an explicit true override fails closed here rather than being hidden.
 */
export function resolveBm4lHydrotestAuthority(benchmarkPackage) {
  requireBenchmarkPackage(benchmarkPackage);
  const l1 = benchmarkPackage.cases.find((entry) => String(entry.caseId) === 'L1');
  if (!l1) throw hydroError('BM4_L Stage 2 requires L1.', 'CAESAR_ACCDB_HYDROTEST_CASE_MISSING');
  const caseClass = String(l1.caseClass ?? '').trim().toUpperCase();
  const formula = normalizeFormula(l1.formula);
  if (Number(l1.lcaseNumber) !== 1 || caseClass !== 'HYD' || formula !== 'WW+HP') {
    throw hydroError(
      `L1 must remain exact L1 / HYD / WW+HP; got L${String(l1.lcaseNumber)} / ${String(l1.caseClass)} / ${String(l1.formula)}.`,
      'CAESAR_ACCDB_HYDROTEST_CASE_UNQUALIFIED',
    );
  }

  const insulation = resolveHydroInsulationSetting(benchmarkPackage.profile.configurationAuthority);
  if (insulation.value === true) {
    throw hydroError(
      'BM4_L L1 declares Include Insulation in Hydrotest=True, but Stage 2 has only qualified the CAESAR default False hydrotest basis.',
      'CAESAR_ACCDB_HYDROTEST_INSULATION_OVERRIDE_UNQUALIFIED',
    );
  }

  const elementRows = benchmarkPackage.model?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
  if (!Array.isArray(elementRows) || elementRows.length === 0) {
    throw hydroError('BM4_L L1 requires INPUT_BASIC_ELEMENT_DATA.', 'CAESAR_ACCDB_HYDROTEST_SOURCE_ROWS_MISSING');
  }
  const pressureRows = elementRows.map((row, index) => {
    const pressure = Number(row.HYDRO_PRESSURE);
    if (!Number.isFinite(pressure) || pressure < 0) {
      throw hydroError(
        `INPUT_BASIC_ELEMENT_DATA[${index}] element ${String(row.ELEMENTID)} has invalid HYDRO_PRESSURE=${String(row.HYDRO_PRESSURE)}.`,
        'CAESAR_ACCDB_HYDROTEST_PRESSURE_INVALID',
      );
    }
    return Object.freeze({ elementId: String(row.ELEMENTID), hydroPressureDisplayed: pressure });
  });

  return deepFreeze({
    schema: BM4L_HYDROTEST_AUTHORITY_SCHEMA,
    benchmarkId: 'BM4_L',
    caseId: 'L1',
    sourceLcaseNumber: 1,
    sourceCaseClass: 'HYD',
    sourceFormula: 'WW+HP',
    weightTerm: 'WW',
    weightAuthority: {
      rule: 'CAESAR_WW_EQUALS_PIPE_PLUS_WATER_AS_FLUID',
      waterSpecificGravity: 1,
      waterDensityKgPerM3: BM4L_HYDROTEST_WATER_DENSITY_KG_PER_M3,
      waterDensityKgPerCm3: BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3,
      operatingFluidDensityReused: false,
      caesarHelp: [
        'CAESAR_II_V14_LOADS_DEFINED_IN_INPUT_1452260',
        'CAESAR_II_V14_FLUID_DENSITY_334967',
        'CAESAR_II_APPLICATIONS_FLUID_SG_EXAMPLE_839412',
      ],
    },
    insulation: {
      included: false,
      resolvedSetting: insulation,
      authority: 'CAESAR_II_V14_INCLUDE_INSULATION_IN_HYDROTEST_1403380_DEFAULT_FALSE',
    },
    pressureTerm: 'HP',
    pressureField: 'HYDRO_PRESSURE',
    pressureAuthority: 'CAESAR_II_V14_HP_HYDROSTATIC_TEST_PRESSURE_FROM_HYDRO_PRESSURE',
    pressureRowCount: pressureRows.length,
    transformation: {
      frozenPrimitiveFormula: 'W+P1',
      rule: 'WW_TO_W_WITH_SG1_WATER;_HP_TO_P1_BY_HYDRO_PRESSURE_TO_PRESSURE1;_HYDRO_INSULATION_ZERO',
      sourceCasePreservedAsBenchmarkReference: true,
      internalAliasCaseId: INTERNAL_ALIAS_CASE_ID,
      internalAliasQualificationUse: 'ASSEMBLY_ONLY_NOT_REFERENCE_AUTHORITY',
    },
    benchmarkReferenceRule: 'PINNED_ACCDB_L1_OUTPUT_REMAINS_THE_ONLY_COMPARISON_REFERENCE',
  });
}

/**
 * Build an assembly-only package that lets the frozen W/P1 adapter construct
 * CAESAR WW+HP without teaching that qualified adapter a second load grammar.
 *
 * L1 is temporarily exposed to the raw nonlinear adapter as L13 because the raw
 * adapter currently blocks L1 before assembly. L13 and L1 have the same governed
 * friction multiplier (1); all L13 load-case settings are replaced by L1's
 * settings for this package. The alias never supplies benchmark reference data.
 */
export function buildBm4lHydrotestCompatibilityPackage(benchmarkPackage) {
  const hydrotestAuthority = resolveBm4lHydrotestAuthority(benchmarkPackage);
  const sourceL1 = benchmarkPackage.cases.find((entry) => String(entry.caseId) === 'L1');
  const sourceRows = benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const hydroRows = sourceRows.map((row) => Object.freeze({
    ...row,
    PRESSURE1: Number(row.HYDRO_PRESSURE),
    FLUID_DENSITY: BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3,
    INSUL_THICK: 0,
    INSUL_DENSITY: 0,
  }));

  const transformedModelSemanticHash = semanticHash({
    sourceModelSemanticHash: benchmarkPackage.model.semanticHash,
    transformation: hydrotestAuthority.transformation.rule,
    waterDensityKgPerCm3: BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3,
    insulationIncluded: false,
    pressureField: 'HYDRO_PRESSURE',
  });
  const transformedModel = Object.freeze({
    ...benchmarkPackage.model,
    semanticHash: transformedModelSemanticHash,
    tables: Object.freeze({
      ...benchmarkPackage.model.tables,
      INPUT_BASIC_ELEMENT_DATA: Object.freeze({
        ...benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA,
        rows: Object.freeze(hydroRows),
      }),
    }),
  });

  const aliasCase = Object.freeze({
    ...sourceL1,
    caseId: INTERNAL_ALIAS_CASE_ID,
    lcaseNumber: 13,
    formula: 'W+P1',
  });
  const transformedCases = Object.freeze(benchmarkPackage.cases.map((entry) =>
    String(entry.caseId) === INTERNAL_ALIAS_CASE_ID ? aliasCase : entry));

  const sourceAuthority = benchmarkPackage.profile.configurationAuthority;
  const loadCaseLayer = sourceAuthority.layers?.loadCase;
  const sourceL1Settings = loadCaseLayer?.cases?.L1 ?? {};
  const transformedAuthority = Object.freeze({
    ...sourceAuthority,
    layers: Object.freeze({
      ...sourceAuthority.layers,
      loadCase: Object.freeze({
        ...loadCaseLayer,
        cases: Object.freeze({
          ...(loadCaseLayer?.cases ?? {}),
          [INTERNAL_ALIAS_CASE_ID]: Object.freeze({ ...sourceL1Settings }),
        }),
      }),
    }),
  });
  const transformedProfile = Object.freeze({
    ...benchmarkPackage.profile,
    configurationAuthority: transformedAuthority,
  });

  const packageBase = {
    ...benchmarkPackage,
    profile: transformedProfile,
    model: transformedModel,
    cases: transformedCases,
  };
  const compatibilityPackage = deepFreeze({
    ...packageBase,
    semanticHash: semanticHash({
      sourcePackageSemanticHash: benchmarkPackage.semanticHash,
      transformedModelSemanticHash,
      aliasCase,
      authority: hydrotestAuthority,
    }),
  });
  return deepFreeze({ compatibilityPackage, hydrotestAuthority });
}

/** Solve L1 with #1085's existing row-driven friction mechanics. */
export function solveBm4lHydrotestFrictionCase(benchmarkPackage, options = {}) {
  const { compatibilityPackage, hydrotestAuthority } =
    buildBm4lHydrotestCompatibilityPackage(benchmarkPackage);
  const aliasResult = solveRawCaesarAccdbFrictionBenchmark(compatibilityPackage, {
    ...options,
    caseIds: [INTERNAL_ALIAS_CASE_ID],
  });
  const aliasCase = aliasResult.cases?.[INTERNAL_ALIAS_CASE_ID];
  const aliasEvidence = aliasResult.mechanics?.cases?.[INTERNAL_ALIAS_CASE_ID];
  if (!aliasCase || !Array.isArray(aliasCase.rows) || aliasCase.rows.length === 0 || !aliasEvidence) {
    throw hydroError('The L1 hydrotest assembly alias produced no nonlinear result.', 'CAESAR_ACCDB_HYDROTEST_ALIAS_SOLVE_MISSING');
  }

  const rows = Object.freeze(aliasCase.rows.map((row) => Object.freeze({ ...row, caseId: 'L1' })));
  const migratedAuthority = migrateCaesarFrictionAuthorityV1ToV2(
    benchmarkPackage.profile.configurationAuthority,
    BM4L_FRICTION_MULTIPLIERS,
  );
  const translationUnit = requireTranslationUnit(benchmarkPackage);
  const configuration = resolveCaesarFrictionCaseSettings(migratedAuthority, 'L1', { translationUnit });
  const evidence = deepFreeze({
    ...aliasEvidence,
    kind: 'PRIMITIVE_NONLINEAR',
    formula: 'WW+HP',
    status: aliasEvidence.status,
    configuration,
    hydrotestAuthority,
    compatibilityAssembly: {
      sourceCaseId: 'L1',
      internalAliasCaseId: INTERNAL_ALIAS_CASE_ID,
      sourceFormula: 'WW+HP',
      frozenAssemblyFormula: 'W+P1',
      transformedModelSemanticHash: compatibilityPackage.model.semanticHash,
      rawAliasExecutionSemanticHash: aliasCase.executionSemanticHash,
      qualificationUse: 'ASSEMBLY_ONLY;_PINNED_ACCDB_L1_OUTPUT_IS_REFERENCE_AUTHORITY',
    },
  });
  const executionSemanticHash = semanticHash({
    schema: 'm047-bm4l-hydrotest-friction-execution/v1',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    sourceCaseId: 'L1',
    hydrotestAuthority,
    rows,
    rawAliasExecutionSemanticHash: aliasCase.executionSemanticHash,
  });
  const caseResult = deepFreeze({
    executionSemanticHash,
    executionEvidenceHash: semanticHash(evidence),
    stiffnessStateHash: aliasCase.stiffnessStateHash,
    rows,
  });
  return deepFreeze({
    caseResult,
    evidence,
    solverContext: {
      configurationAuthority: aliasResult.mechanics.configurationAuthority,
      solverProfile: aliasResult.mechanics.solverProfile,
      limitations: aliasResult.mechanics.limitations,
    },
  });
}

function resolveHydroInsulationSetting(authority) {
  const observed = [];
  const layers = authority?.layers ?? {};
  pushSetting(observed, 'OVERALL_GLOBAL_DEFAULT', layers.overallGlobalDefault?.settings?.[HYDRO_INSULATION_SETTING]);
  pushSetting(observed, 'INDIVIDUAL_FILE_SETTING', layers.individualFile?.settings?.[HYDRO_INSULATION_SETTING]);
  pushSetting(observed, 'LOAD_CASE_SETTING', layers.loadCase?.cases?.L1?.[HYDRO_INSULATION_SETTING]);
  pushSetting(observed, 'MODEL_INPUT', layers.modelInput?.settings?.[HYDRO_INSULATION_SETTING]);
  if (observed.length === 0) {
    return deepFreeze({
      value: false,
      level: 'CAESAR_DEFAULT',
      source: 'CAESAR_II_V14_INCLUDE_INSULATION_IN_HYDROTEST_DEFAULT_FALSE',
      explicit: false,
    });
  }
  const winner = observed.at(-1);
  return deepFreeze({ ...winner, explicit: true });
}

function pushSetting(target, level, value) {
  if (value === undefined || value === null || value === '') return;
  const normalized = typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
  const boolean = parseBoolean(normalized, `${level}.${HYDRO_INSULATION_SETTING}`);
  target.push(Object.freeze({ value: boolean, level, source: 'PROFILE_CONFIGURATION_AUTHORITY' }));
}

function parseBoolean(value, field) {
  if (value === true || value === false) return value;
  const token = String(value).trim().toUpperCase();
  if (['TRUE', 'YES', '1'].includes(token)) return true;
  if (['FALSE', 'NO', '0'].includes(token)) return false;
  throw hydroError(`${field} must be boolean-like; got ${String(value)}.`, 'CAESAR_ACCDB_HYDROTEST_INSULATION_SETTING_INVALID');
}

function requireTranslationUnit(benchmarkPackage) {
  const rows = benchmarkPackage.model?.tables?.INPUT_UNITS?.rows;
  if (!Array.isArray(rows) || rows.length !== 1 || String(rows[0].TRANS) !== 'N./cm.') {
    throw hydroError('BM4_L hydrotest friction requires INPUT_UNITS TRANS=N./cm..', 'CAESAR_ACCDB_HYDROTEST_UNIT_UNQUALIFIED');
  }
  return rows[0].TRANS;
}

function requireBenchmarkPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
  if (value.benchmarkId !== 'BM4_L') {
    throw new TypeError('The hydrotest friction authority is qualified only for BM4_L.');
  }
}

function normalizeFormula(value) {
  return String(value ?? '').replace(/\s+/gu, '').toUpperCase();
}

function hydroError(message, code) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}
