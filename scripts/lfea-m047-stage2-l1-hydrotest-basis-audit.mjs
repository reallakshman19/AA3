#!/usr/bin/env node
/**
 * M047 Stage 2 L1 hydrotest-basis audit.
 *
 * This is a data/assembly diagnostic only. It changes no production mechanic and
 * makes no benchmark-accuracy claim. It exists because real R2 L1 converges but
 * its normal reactions are globally poor while L13/L7 normals are already close.
 *
 * The audit answers two narrow questions before any friction change is allowed:
 *
 * 1. Does the current WW assembly replace operating contents density with the
 *    governed hydrotest density consistently for every component path?
 * 2. Is HP actually bound to ACCDB HYDRO_PRESSURE throughout the prepared case?
 *
 * To expose component-path inconsistencies without changing production code, the
 * script prepares L1 twice from the same pinned ACCDB:
 *
 * - CURRENT: the unmodified source rows;
 * - UNIFORM_WW_COUNTERFACTUAL: only RIGID/REDUCER source-row FLUID_DENSITY is
 *   replaced with the governed hydrotest density before preparation.
 *
 * Ordinary pipe/bend spans already take caseMode.contentsDensityKgPerM3 directly,
 * so the counterfactual can move only a special component path that still reads
 * ACCDB FLUID_DENSITY. That makes a nonzero delta a structural discriminator, not
 * a fitted load correction. The counterfactual is never benchmark authority.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAESAR_ACCDB_CASE_GATES,
  buildCaesarAccdbBenchmarkPackage,
  prepareCaesarAccdbCaseState,
  requiredCaesarAccdbTables,
} from '../src/core/fea-benchmarks/index.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const EXPECTED_ACCDB_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const CASE_ID = 'L1';
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const NUMERIC_FLOOR_N = 1e-9;

function n(value) { return Number(value); }
function sum(values) { return values.reduce((total, value) => total + Number(value), 0); }
function maximum(values) { return values.length === 0 ? 0 : Math.max(...values); }
function minimum(values) { return values.length === 0 ? 0 : Math.min(...values); }

/** Build the audit record from one custody-verified ACCDB. */
export async function buildL1HydrotestBasisAudit(input) {
  const profile = input.profile ?? JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const tableNames = requiredCaesarAccdbTables(profile);
  const raw = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames,
    expectedSha256: EXPECTED_ACCDB_SHA256,
  });
  const currentPackage = buildCaesarAccdbBenchmarkPackage({ rawExport: raw, profile });
  const currentCase = requireCase(currentPackage, CASE_ID);
  const hydrotestBasis = currentPackage.profile.linearSolve?.hydrotestBasis ?? null;
  if (!hydrotestBasis || hydrotestBasis.authorityStatus !== 'RESOLVED') {
    throw new TypeError('L1 hydrotest audit requires a RESOLVED linearSolve.hydrotestBasis.');
  }
  if (hydrotestBasis.pressureField !== 'HYDRO_PRESSURE') {
    throw new TypeError(`L1 hydrotest pressure field is ${String(hydrotestBasis.pressureField)}, expected HYDRO_PRESSURE.`);
  }
  if (!(n(hydrotestBasis.testFluidDensityKgPerM3) > 0)) {
    throw new TypeError('L1 hydrotest basis requires a positive testFluidDensityKgPerM3.');
  }

  const currentPrepared = prepare(currentPackage, currentCase);
  const counterfactualRaw = uniformSpecialComponentHydrotestDensity(raw, hydrotestBasis.testFluidDensityKgPerM3);
  const counterfactualPackage = buildCaesarAccdbBenchmarkPackage({ rawExport: counterfactualRaw, profile });
  const counterfactualCase = requireCase(counterfactualPackage, CASE_ID);
  const counterfactualPrepared = prepare(counterfactualPackage, counterfactualCase);

  const sourceRows = new Map(raw.tables.INPUT_BASIC_ELEMENT_DATA.rows
    .map((row) => [String(row.ELEMENTID), row]));
  const currentGravity = gravityLedger(currentPrepared, sourceRows);
  const counterfactualGravity = gravityLedger(counterfactualPrepared, sourceRows);
  const sourceIds = [...new Set([...currentGravity.bySource.keys(), ...counterfactualGravity.bySource.keys()])]
    .sort(compareText);
  const changedSources = sourceIds.map((sourceElementId) => {
    const before = currentGravity.bySource.get(sourceElementId) ?? emptyGravitySource(sourceElementId, sourceRows);
    const after = counterfactualGravity.bySource.get(sourceElementId) ?? emptyGravitySource(sourceElementId, sourceRows);
    return {
      sourceElementId,
      sourceKind: before.sourceKind,
      analysisKinds: before.analysisKinds,
      currentGravityWeightN: before.gravityWeightN,
      counterfactualGravityWeightN: after.gravityWeightN,
      deltaN: after.gravityWeightN - before.gravityWeightN,
      operatingFluidDensityKgPerM3: n(before.sourceRow.FLUID_DENSITY) * KG_PER_CM3_TO_KG_PER_M3,
      hydrotestFluidDensityKgPerM3: n(hydrotestBasis.testFluidDensityKgPerM3),
    };
  }).filter((row) => Math.abs(row.deltaN) > NUMERIC_FLOOR_N);

  const referenceForce = referenceSupportForceSum(currentPackage, CASE_ID);
  const currentVerticalMagnitudeErrorN = Math.abs(Math.abs(referenceForce.FY) - currentGravity.totalWeightN);
  const counterfactualVerticalMagnitudeErrorN = Math.abs(
    Math.abs(referenceForce.FY) - counterfactualGravity.totalWeightN,
  );
  const referenceScaleN = Math.max(Math.abs(referenceForce.FY), 1);
  const pressureAudit = buildPressureAudit(currentPrepared, raw.tables.INPUT_BASIC_ELEMENT_DATA.rows);

  const base = {
    schema: 'm047-bm4l-stage2-l1-hydrotest-basis-audit/v1',
    sourceAccdbSha256: raw.source.sha256,
    caseId: CASE_ID,
    caseFormula: currentCase.formula,
    boundary: 'DATA_AND_PREPARED_ASSEMBLY_DIAGNOSTIC_ONLY_NO_PRODUCTION_MECHANIC_CHANGED',
    hydrotestAuthority: {
      testFluidDensityKgPerM3: n(hydrotestBasis.testFluidDensityKgPerM3),
      temperatureBasis: hydrotestBasis.temperatureBasis,
      pressureField: hydrotestBasis.pressureField,
      source: hydrotestBasis.source ?? null,
    },
    currentAssembly: {
      caseMode: currentPrepared.caseMode,
      totalGravityWeightN: currentGravity.totalWeightN,
      gravityBySourceKindN: currentGravity.byKind,
      analysisElementCount: currentPrepared.analysis.elements.length,
      modelSemanticHash: currentPackage.model.semanticHash,
    },
    uniformWwSpecialComponentCounterfactual: {
      rule: 'REPLACE_ONLY_RIGID_AND_REDUCER_SOURCE_FLUID_DENSITY_WITH_GOVERNED_TEST_DENSITY_BEFORE_PREPARATION',
      benchmarkAuthority: false,
      totalGravityWeightN: counterfactualGravity.totalWeightN,
      gravityBySourceKindN: counterfactualGravity.byKind,
      totalDeltaN: counterfactualGravity.totalWeightN - currentGravity.totalWeightN,
      changedSourceCount: changedSources.length,
      changedSources,
      modelSemanticHash: counterfactualPackage.model.semanticHash,
    },
    referenceGlobalForceCheck: {
      convention: currentPackage.profile.conventions.restraintReaction,
      source: 'PINNED_ACCDB_L1_OUTPUT_RESTRAINTS_SUMMARY_NORMALIZED_REFERENCE_ROWS',
      supportForceSumN: referenceForce,
      expectedGravityDirection: [0, -1, 0],
      currentVerticalMagnitudeErrorN,
      counterfactualVerticalMagnitudeErrorN,
      currentVerticalMagnitudeErrorFraction: currentVerticalMagnitudeErrorN / referenceScaleN,
      counterfactualVerticalMagnitudeErrorFraction: counterfactualVerticalMagnitudeErrorN / referenceScaleN,
      closerAssembly: counterfactualVerticalMagnitudeErrorN < currentVerticalMagnitudeErrorN
        ? 'UNIFORM_WW_SPECIAL_COMPONENT_COUNTERFACTUAL'
        : counterfactualVerticalMagnitudeErrorN > currentVerticalMagnitudeErrorN
          ? 'CURRENT'
          : 'TIE',
      interpretationRule: 'GLOBAL_SUPPORT_FY_MAGNITUDE_IS_COMPARED_TO_PREPARED_GRAVITY_MAGNITUDE_ONLY_AS_AN_RCA_DISCRIMINATOR_NOT_AN_ACCEPTANCE_GATE',
    },
    pressureAudit,
    sourceCodeDiscriminator: {
      status: changedSources.length > 0 ? 'SPECIAL_COMPONENT_FLUID_DENSITY_PATH_IS_CASE_INCONSISTENT' : 'NO_SPECIAL_COMPONENT_WEIGHT_DELTA_OBSERVED',
      explanation: changedSources.length > 0
        ? 'Changing only RIGID/REDUCER source FLUID_DENSITY changes prepared WW gravity while ordinary spans are unchanged; at least one special component path is still consuming operating fluid density instead of the governed hydrotest density.'
        : 'The special-component-only density counterfactual did not change prepared WW gravity; this audit does not support that asymmetry on the supplied model.',
      productionChangeAuthorized: false,
      nextGate: 'If the real pinned ACCDB shows a nonzero special-component delta and improved global FY closure, change exactly those component call sites, then rerun frozen L2-L6/L14 controls and real L1 before promoting anything.',
    },
  };
  return Object.freeze({ ...base, auditSemanticHash: semanticHash(base) });
}

function prepare(benchmarkPackage, caseRecord) {
  return prepareCaesarAccdbCaseState({
    benchmarkPackage,
    caseRecord,
    solveProfile: benchmarkPackage.profile.linearSolve,
    gate: CAESAR_ACCDB_CASE_GATES.NONLINEAR_EFFECTIVE_FRICTION,
    frictionDofKeys: [],
  });
}

function requireCase(benchmarkPackage, caseId) {
  const record = benchmarkPackage.cases.find((row) => row.caseId === caseId);
  if (!record) throw new TypeError(`Benchmark profile does not select ${caseId}.`);
  return record;
}

function uniformSpecialComponentHydrotestDensity(raw, testFluidDensityKgPerM3) {
  const cloned = structuredClone(raw);
  const storedDensity = n(testFluidDensityKgPerM3) / KG_PER_CM3_TO_KG_PER_M3;
  for (const row of cloned.tables.INPUT_BASIC_ELEMENT_DATA.rows) {
    if (n(row.RIGID_PTR) > 0 || n(row.REDUCER_PTR) > 0) row.FLUID_DENSITY = storedDensity;
  }
  cloned.provider = `${String(raw.provider ?? 'ACCDB')}:L1_WW_SPECIAL_COMPONENT_COUNTERFACTUAL`;
  cloned.source = {
    ...cloned.source,
    path: `${String(raw.source.path)}#counterfactual-special-component-fluid-density`,
  };
  return cloned;
}

function gravityLedger(prepared, sourceRows) {
  const bySource = new Map();
  const byKind = {};
  for (const element of prepared.analysis.elements) {
    const sourceElementId = String(element.sourceElementId);
    const sourceRow = sourceRows.get(sourceElementId);
    if (!sourceRow) throw new TypeError(`Prepared analysis element ${element.elementId} lacks source row ${sourceElementId}.`);
    const sourceKind = sourceKindOf(sourceRow);
    const record = bySource.get(sourceElementId) ?? {
      sourceElementId,
      sourceKind,
      sourceRow,
      analysisKinds: [],
      gravityWeightN: 0,
    };
    record.analysisKinds.push(element.kind);
    record.gravityWeightN += n(element.gravityWeightN);
    bySource.set(sourceElementId, record);
    byKind[sourceKind] = (byKind[sourceKind] ?? 0) + n(element.gravityWeightN);
  }
  for (const record of bySource.values()) {
    record.analysisKinds = [...new Set(record.analysisKinds)].sort(compareText);
  }
  return {
    totalWeightN: sum([...bySource.values()].map((row) => row.gravityWeightN)),
    bySource,
    byKind: Object.fromEntries(Object.entries(byKind).sort(([left], [right]) => compareText(left, right))),
  };
}

function emptyGravitySource(sourceElementId, sourceRows) {
  const sourceRow = sourceRows.get(sourceElementId);
  if (!sourceRow) throw new TypeError(`Missing source row ${sourceElementId}.`);
  return {
    sourceElementId,
    sourceKind: sourceKindOf(sourceRow),
    sourceRow,
    analysisKinds: [],
    gravityWeightN: 0,
  };
}

function sourceKindOf(row) {
  if (n(row.RIGID_PTR) > 0) return 'RIGID';
  if (n(row.REDUCER_PTR) > 0) return 'REDUCER';
  if (n(row.BEND_PTR) > 0) return 'BEND_SOURCE';
  return 'PIPE';
}

function referenceSupportForceSum(benchmarkPackage, caseId) {
  const rows = benchmarkPackage.references[caseId]?.rows ?? [];
  const forces = rows.filter((row) => row.entityKind === 'NODE' && row.quantity === 'FORCE');
  if (forces.length === 0) throw new TypeError(`${caseId} reference contains no restraint force rows.`);
  const result = { FX: 0, FY: 0, FZ: 0 };
  for (const row of forces) {
    if (Object.hasOwn(result, row.component)) result[row.component] += n(row.value);
  }
  return result;
}

function buildPressureAudit(prepared, sourceRows) {
  const hydroPressuresPa = sourceRows.map((row) => n(row.HYDRO_PRESSURE) * 1000);
  const operatingPressuresPa = sourceRows.map((row) => n(row.PRESSURE1) * 1000);
  const byKind = {};
  for (const element of prepared.analysis.elements) {
    const kind = element.kind;
    const record = byKind[kind] ?? {
      analysisElementCount: 0,
      nonzeroPressureAxialStrainCount: 0,
      maximumAbsPressureAxialStrain: 0,
      nonzeroBourdonRotationCount: 0,
      maximumAbsBourdonRotationRadians: 0,
      maximumBourdonFreeEndTranslationM: 0,
    };
    record.analysisElementCount += 1;
    if (Math.abs(n(element.pressureAxialStrain)) > 0) record.nonzeroPressureAxialStrainCount += 1;
    record.maximumAbsPressureAxialStrain = Math.max(
      record.maximumAbsPressureAxialStrain,
      Math.abs(n(element.pressureAxialStrain)),
    );
    if (Math.abs(n(element.bourdonRotationRadians)) > 0) record.nonzeroBourdonRotationCount += 1;
    record.maximumAbsBourdonRotationRadians = Math.max(
      record.maximumAbsBourdonRotationRadians,
      Math.abs(n(element.bourdonRotationRadians)),
    );
    record.maximumBourdonFreeEndTranslationM = Math.max(
      record.maximumBourdonFreeEndTranslationM,
      Math.hypot(...element.bourdonFreeEndTranslationM.map(n)),
    );
    byKind[kind] = record;
  }
  return {
    preparedPressureField: prepared.caseMode.pressureField,
    pressureIncluded: prepared.caseMode.pressure,
    hydrotestIncluded: prepared.caseMode.hydrotest,
    hydroPressureRangePa: { minimum: minimum(hydroPressuresPa), maximum: maximum(hydroPressuresPa) },
    operatingPressureRangePa: { minimum: minimum(operatingPressuresPa), maximum: maximum(operatingPressuresPa) },
    sourceElementCount: sourceRows.length,
    sourceElementsWhereHydroDiffersFromP1: sourceRows.filter((row) => n(row.HYDRO_PRESSURE) !== n(row.PRESSURE1)).length,
    preparedElementEvidenceByKind: Object.fromEntries(Object.entries(byKind).sort(([left], [right]) => compareText(left, right))),
    bindingStatus: prepared.caseMode.pressureField === 'HYDRO_PRESSURE' ? 'PASS' : 'FAIL',
  };
}

function compareText(left, right) { return String(left).localeCompare(String(right), 'en'); }

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--accdb' || key === '--profile' || key === '--out') {
      const value = argv[index + 1];
      if (value === undefined) throw new TypeError(`Missing value for ${key}.`);
      accepted.set(key, value);
      index += 1;
      continue;
    }
    throw new TypeError(`Unknown argument ${String(key)}.`);
  }
  const accdbPath = accepted.get('--accdb');
  if (!accdbPath) {
    throw new TypeError('Usage: node scripts/lfea-m047-stage2-l1-hydrotest-basis-audit.mjs --accdb <BM4_L.ACCDB> [--profile profile.json] [--out report.json]');
  }
  return {
    accdbPath,
    profilePath: accepted.get('--profile') ?? PROFILE_PATH,
    outPath: accepted.get('--out') ?? null,
  };
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const args = parseArguments(process.argv.slice(2));
  const result = await buildL1HydrotestBasisAudit(args);
  if (args.outPath !== null) {
    const outputPath = resolve(args.outPath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${canonicalPrettyStringify(result)}\n`, 'utf8');
  }
  process.stdout.write(`${canonicalPrettyStringify({
    sourceAccdbSha256: result.sourceAccdbSha256,
    currentGravityWeightN: result.currentAssembly.totalGravityWeightN,
    counterfactualGravityWeightN: result.uniformWwSpecialComponentCounterfactual.totalGravityWeightN,
    specialComponentDeltaN: result.uniformWwSpecialComponentCounterfactual.totalDeltaN,
    changedSourceCount: result.uniformWwSpecialComponentCounterfactual.changedSourceCount,
    referenceSupportFyN: result.referenceGlobalForceCheck.supportForceSumN.FY,
    closerAssembly: result.referenceGlobalForceCheck.closerAssembly,
    pressureBinding: result.pressureAudit.bindingStatus,
    status: result.sourceCodeDiscriminator.status,
  })}\n`);
}
