#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildBenchmarkEngineeringAssessment,
  buildCaesarAccdbBenchmarkPackage,
  createCaesarAccdbQualificationAdapter,
  normalizeBenchmarkResultRows,
  resolveCaesarConfigurationSetting,
  resolveCaesarEffectiveFriction,
  runGovernedBenchmarkQualification,
  solveCaesarAccdbFrictionBenchmark,
  solveCaesarAccdbLinearBenchmark,
} from '../src/core/fea-benchmarks/index.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const args = parseArguments(process.argv.slice(2));
const profile = readJson(args.profile, 'BM4_L profile');
const rawExport = readJson(args.rawExport, 'BM4_L raw ACCDB export');
const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
const resolvedConfiguration = buildResolvedConfiguration(benchmarkPackage);
writeJson(resolvedConfiguration, args.configOut);

const controls = solveCaesarAccdbLinearBenchmark(benchmarkPackage, ['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const friction = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13', 'L7', 'L15', 'L1']);
const actual = mergeActual(benchmarkPackage, controls, friction);
writeJson(actual, args.actualOut);

const qualification = qualifyActual(benchmarkPackage, actual);
const caseRecords = benchmarkPackage.cases
  .filter((record) => actual.cases[record.caseId])
  .map((record) => ({ ...record, referenceRows: benchmarkPackage.references[record.caseId].rows }));
const engineeringAssessment = buildBenchmarkEngineeringAssessment({
  caseRecords,
  qualification,
  actual,
  equilibriumTolerance: benchmarkPackage.profile.equilibriumTolerance,
  policy: benchmarkPackage.profile.engineeringAssessment,
});
const nonlinearFailures = ['L13', 'L7', 'L1'].filter((caseId) =>
  actual.mechanics.cases[caseId]?.executionStatus !== 'PASS'
  || actual.mechanics.cases[caseId]?.nonlinearStateGate?.status !== 'PASS'
  || actual.mechanics.cases[caseId]?.recoveredEquilibrium?.status !== 'PASS');
const l15Failure = actual.mechanics.cases.L15?.executionStatus !== 'PASS';
const report = Object.freeze({
  schema: 'lfea-m047-bm4l-friction-stage2-report/v1',
  benchmarkId: benchmarkPackage.benchmarkId,
  profileId: benchmarkPackage.profile.profileId,
  source: benchmarkPackage.source,
  packageSemanticHash: benchmarkPackage.semanticHash,
  resolvedConfiguration,
  status: nonlinearFailures.length > 0 || l15Failure
    ? 'ACTUAL_INVALID'
    : qualification.status,
  qualification,
  engineeringAssessment,
  nonlinearGate: {
    status: nonlinearFailures.length === 0 ? 'PASS' : 'FAIL',
    failedPrimitiveCases: nonlinearFailures,
    l15AlgebraicStatus: l15Failure ? 'FAIL' : 'PASS',
  },
  pairedDeltas: actual.mechanics.pairedDeltas,
  repeatedRuns: actual.mechanics.repeatedRuns,
  sensitivity: actual.mechanics.sensitivity,
  limitations: actual.mechanics.limitations,
});
writeJson(report, args.reportOut);
if (args.summaryOut) writeSummary(report, args.summaryOut);
process.stdout.write(`${report.status}\n`);

function mergeActual(benchmarkPackage, controls, friction) {
  const cases = Object.fromEntries(benchmarkPackage.cases
    .filter((record) => controls.cases[record.caseId] || friction.cases[record.caseId])
    .map((record) => [record.caseId, controls.cases[record.caseId] ?? friction.cases[record.caseId]]));
  return Object.freeze({
    schema: 'lfea-accdb-benchmark-actual/v1',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    cases,
    mechanics: Object.freeze({
      schema: 'lfea-m047-bm4l-friction-stage2-evidence/v1',
      sourceModelSemanticHash: benchmarkPackage.model.semanticHash,
      cases: Object.freeze({ ...controls.mechanics.cases, ...friction.mechanics.cases }),
      frictionProfile: friction.mechanics.profile,
      executionOrder: friction.mechanics.executionOrder,
      pairedDeltas: friction.mechanics.pairedDeltas,
      repeatedRuns: friction.mechanics.repeatedRuns,
      sensitivity: friction.mechanics.sensitivity,
      limitations: friction.mechanics.limitations,
    }),
  });
}

function qualifyActual(benchmarkPackage, actual) {
  const caseIds = Object.keys(actual.cases);
  const adapter = createCaesarAccdbQualificationAdapter(benchmarkPackage, caseIds);
  return runGovernedBenchmarkQualification({
    adapter,
    source: benchmarkPackage,
    tolerances: benchmarkPackage.profile.tolerances,
    optionalQuantities: [],
    excludedQuantities: benchmarkPackage.profile.engineeringAssessment?.equilibriumOnlyQuantities ?? [],
    prepare: ({ caseIds: ids, modelInput }) => governedRecord('M047-PREPARATION', {
      caseIds: ids,
      modelSemanticHash: modelInput.semanticHash,
    }),
    authorize: ({ caseIds: ids, preparation }) => governedRecord('M047-AUTHORIZATION', {
      caseIds: ids,
      preparationSemanticHash: preparation.semanticHash,
      executionBoundary: { authorizationIssued: true },
    }),
    solve: ({ caseId }) => actual.cases[caseId],
    normalizeSolved: (caseId, solved) => {
      const rows = normalizeBenchmarkResultRows(solved.rows, caseId);
      return Object.freeze({
        rows,
        exposedQuantities: Object.freeze([...new Set(rows.map((row) => row.quantity))].sort()),
        executionSemanticHash: solved.executionSemanticHash,
        executionEvidenceHash: solved.executionEvidenceHash,
      });
    },
  });
}

function buildResolvedConfiguration(benchmarkPackage) {
  const authority = benchmarkPackage.profile.configurationAuthority;
  const primitiveCaseIds = ['L13', 'L7', 'L1'];
  const commonSettings = [
    'Z_AXIS_UP',
    'AMBIENT_TEMPERATURE',
    'BOURDON_PRESSURE',
    'RESTRAINT_DIRECTIONAL_BEHAVIOR',
    'DEFAULT_TRANS_RESTRAINT_STIFF',
    'DEFAULT_ROT_RESTRAINT_STIFF',
    'FRICT_STIF',
    'COEFFICIENT_OF_FRICTION_MU',
  ];
  const cases = {};
  for (const caseId of ['L13', 'L7', 'L15', 'L1']) {
    const caseRecord = benchmarkPackage.cases.find((entry) => entry.caseId === caseId);
    const primitive = primitiveCaseIds.includes(caseId);
    cases[caseId] = {
      caseType: caseRecord.caseType,
      formula: caseRecord.formula,
      combinationMethod: primitive ? null : 'ALG',
      independentNonlinearSolve: primitive,
      settings: Object.fromEntries(commonSettings.map((setting) => [
        setting,
        primitive || !['FRICT_STIF', 'COEFFICIENT_OF_FRICTION_MU'].includes(setting)
          ? safeResolve(authority, setting, primitive ? caseId : null)
          : null,
      ])),
      frictionMultiplier: primitive
        ? resolveCaesarConfigurationSetting(authority, 'FRICTION_MULTIPLIER', caseId)
        : null,
      effectiveFriction: primitive ? resolveCaesarEffectiveFriction(benchmarkPackage, caseId) : null,
    };
  }
  const frictStif = resolveCaesarConfigurationSetting(authority, 'FRICT_STIF', null);
  return Object.freeze({
    schema: 'lfea-m047-bm4l-resolved-configuration/v1',
    precedenceLowToHigh: authority.precedence,
    caesarVersion: authority.caesarVersion,
    frictionStiffnessConversion: {
      authority: frictStif,
      displayedUnit: 'N/cm',
      displayedValue: Number(frictStif.value.value),
      conversion: 'value * 100',
      solverUnit: 'N/m',
      solverValue: Number(frictStif.value.value) * 100,
    },
    cases,
  });
}

function safeResolve(authority, setting, caseId) {
  try {
    return resolveCaesarConfigurationSetting(authority, setting, caseId);
  } catch (error) {
    if (/has no declared authority value/u.test(String(error.message))) return null;
    throw error;
  }
}

function governedRecord(kind, fields) {
  const base = { kind, ...fields };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function writeSummary(report, path) {
  const a = report.engineeringAssessment;
  const lines = [
    '# M047 BM4_L friction Stage 2 qualification',
    '',
    `- Status: ${report.status}`,
    `- ACCDB SHA-256: \`${report.source.sha256}\``,
    `- Precedence: ${report.resolvedConfiguration.precedenceLowToHigh.join(' < ')}`,
    `- Friction stiffness: ${report.resolvedConfiguration.frictionStiffnessConversion.solverValue} N/m`,
    `- Literal external components: ${a.literalExternalComponents.status}; ${a.literalExternalComponents.counts.failed} failures.`,
    `- Restraint components: ${a.restraintComponents.status}; ${a.restraintComponents.counts.failed} failures.`,
    `- Coordinate-invariant vectors: ${a.vectorGroups.status}; ${a.vectorGroups.counts.failed} failures.`,
    `- Physical equilibrium: ${a.physicalEquilibrium.status}; ${a.physicalEquilibrium.counts.failed} failed cases.`,
    `- Nonlinear friction gate: ${report.nonlinearGate.status}.`,
    `- L15 algebraic identity: ${report.nonlinearGate.l15AlgebraicStatus}.`,
    '',
    'Sensitivity runs are diagnostic only; 1x nominal remains the qualification result.',
  ];
  writeText(lines.join('\n') + '\n', path);
}

function parseArguments(argv) {
  const map = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    map.set(key, value);
  }
  const required = ['--raw-export', '--profile', '--config-out', '--actual-out', '--report-out'];
  for (const key of required) if (!map.get(key)) throw new TypeError(`Missing ${key}.`);
  return Object.freeze({
    rawExport: map.get('--raw-export'),
    profile: map.get('--profile'),
    configOut: map.get('--config-out'),
    actualOut: map.get('--actual-out'),
    reportOut: map.get('--report-out'),
    summaryOut: map.get('--summary-out') ?? null,
  });
}

function readJson(path, label) {
  try { return JSON.parse(readFileSync(resolve(path), 'utf8')); }
  catch (error) { throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error }); }
}
function writeJson(value, path) { writeText(canonicalPrettyStringify(value), path); }
function writeText(value, path) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value, 'utf8');
}
