#!/usr/bin/env node

/**
 * Cross-platform M047 Stage 2 BM4_L friction production boundary.
 *
 * ACCDB extraction uses the pure-JavaScript mdb-reader browser engine adapted
 * from reallaksh19/XML_Compare_Utilities; Microsoft ACE/OLE DB is not required.
 * The command always runs frozen non-friction controls before L13/L7/L15/L1.
 * It writes a standard ACCDB actual-result package plus direct reference
 * comparisons and a friction-specific evidence ledger. L1 remains explicit
 * BLOCKED until WW+HP load construction is independently qualified in the
 * shared ACCDB mechanics.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCaesarAccdbBenchmarkPackage,
  compareBenchmarkResultRows,
  requiredCaesarAccdbTables,
  solveCaesarAccdbFrictionBenchmark,
  solveCaesarAccdbLinearBenchmark,
} from '../src/core/fea-benchmarks/index.js';
import { selectBm4lAccdbFrictionRows } from '../src/core/fea-benchmarks/caesar-accdb-friction-restraint-selection.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXPORT_SCRIPT = resolve(SCRIPT_DIR, 'lfea-caesar-accdb-mdb-export.mjs');
const RESTRAINT_AUTHORITY_PATH = resolve(
  SCRIPT_DIR,
  '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-restraint-authority.json',
);
const CONTROL_CASE_IDS = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const FRICTION_CASE_IDS = Object.freeze(['L13', 'L7', 'L15', 'L1']);
const FRICTION_COMPARISON_CASE_IDS = Object.freeze(['L13', 'L7', 'L15', 'L1']);

export function runBm4lFrictionProduction(input) {
  const profile = readJson(input.profilePath, 'BM4_L benchmark profile');
  const frictionSolverProfile = readJson(input.frictionProfilePath, 'friction solver profile');
  const restraintAuthority = readJson(RESTRAINT_AUTHORITY_PATH, 'BM4_L friction restraint authority');
  if (profile.benchmarkId !== 'BM4_L') throw new TypeError('M047 friction production requires benchmarkId BM4_L.');
  const rawExport = extractAccdb(input.accdbPath, requiredCaesarAccdbTables(profile));
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const restraintCustody = verifyFrictionRestraintCustody(benchmarkPackage, restraintAuthority);

  // Issue #1083 gate: prove the frozen non-friction cases before accepting friction.
  const controls = solveCaesarAccdbLinearBenchmark(benchmarkPackage, CONTROL_CASE_IDS);
  const friction = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, {
    caseIds: FRICTION_CASE_IDS,
    frictionSolverProfile,
    repeatCount: frictionSolverProfile.repeatCount ?? 2,
  });

  const successfulFrictionIds = FRICTION_CASE_IDS.filter((caseId) =>
    Array.isArray(friction.cases?.[caseId]?.rows) && friction.cases[caseId].rows.length > 0);
  const actualCases = {
    ...controls.cases,
    ...Object.fromEntries(successfulFrictionIds.map((caseId) => [caseId, friction.cases[caseId]])),
  };
  const mechanicsCases = {
    ...controls.mechanics.cases,
    ...Object.fromEntries(successfulFrictionIds.map((caseId) => {
      const evidence = friction.mechanics.cases[caseId];
      const lastRepeat = evidence.repeats?.at(-1) ?? null;
      return [caseId, {
        ...evidence,
        recoveredEquilibrium: lastRepeat?.physicalEquilibrium ?? undefined,
        effectiveConfiguration: {
          friction: {
            value: evidence.configuration?.effectiveCoefficient ?? null,
            level: 'MODEL_MU_X_LOAD_CASE_FRICTION_MULTIPLIER',
          },
        },
      }];
    })),
  };
  const actual = Object.freeze({
    schema: 'lfea-accdb-benchmark-actual/v1',
    benchmarkId: benchmarkPackage.benchmarkId,
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    cases: actualCases,
    mechanics: {
      ...controls.mechanics,
      schema: 'lfea-accdb-benchmark-mechanics-with-friction/v1',
      cases: mechanicsCases,
      frictionStageEvidenceHash: semanticHash(friction.mechanics),
    },
  });

  const accuracy = buildAccuracyEvidence(benchmarkPackage, actualCases);
  const pairedDeltaEvidence = buildPairedDeltaEvidence(actualCases);
  const overallStatus = resolveOverallAcceptanceStatus(
    friction.status,
    accuracy.frictionRestraintGateStatus,
    restraintCustody.status,
  );
  const evidence = Object.freeze({
    schema: 'm047-bm4l-friction-production-evidence/v1',
    benchmarkId: benchmarkPackage.benchmarkId,
    source: benchmarkPackage.source,
    packageSemanticHash: benchmarkPackage.semanticHash,
    restraintCustody,
    controls: {
      caseIds: CONTROL_CASE_IDS,
      mechanicsSemanticHash: semanticHash(controls.mechanics),
    },
    accuracy,
    friction,
    pairedDeltas: pairedDeltaEvidence,
    acceptance: {
      nonFrictionControlsExecutedFirst: true,
      primitiveFrictionCasesConverged: ['L13', 'L7'].every((caseId) =>
        friction.mechanics.cases[caseId]?.status === 'PASS'),
      l15IndependentSolvePerformed: false,
      directReferenceComparisonEmitted: true,
      mechanicsStatus: friction.status,
      frictionRestraintSourceCustodyStatus: restraintCustody.status,
      benchmarkRestraintAccuracyStatus: accuracy.frictionRestraintGateStatus,
      l1Status: friction.mechanics.cases.L1?.status ?? 'BLOCKED',
      overallStatus,
    },
  });
  return { actual, evidence };
}

export function verifyFrictionRestraintCustody(benchmarkPackage, authority) {
  if (!authority || authority.schema !== 'm047-bm4l-friction-restraint-authority/v1') {
    throw new TypeError('A versioned BM4_L friction restraint authority is required.');
  }
  if (authority.benchmarkId !== benchmarkPackage.benchmarkId) {
    throw new TypeError('BM4_L friction restraint authority benchmarkId does not match the benchmark package.');
  }
  const rows = benchmarkPackage.model.tables.INPUT_RESTRAINTS.rows;
  const modelCoefficient = Number(authority.frictionSurfaceAuthority.governedModelCoefficient);
  const selected = selectBm4lAccdbFrictionRows(rows, modelCoefficient);
  const actualNodeIds = selected.map((entry) => entry.nodeId);
  const expectedNodeIds = authority.frictionSurfaceAuthority.nodeIds.map(String);
  const actualNonFrictionYNodeIds = rows
    .filter((row) => Number(row.RES_TYPEID) === Number(authority.frictionSurfaceAuthority.resTypeId)
      && !(Number(row.FRIC_COEF) > 0))
    .map((row) => String(row.NODE_NUM))
    .sort(compareText);
  const expectedNonFrictionYNodeIds = authority.frictionSurfaceAuthority.nonFrictionYNodeIds
    .map(String)
    .sort(compareText);
  const checks = Object.freeze({
    sourceAccdbSha256: Object.freeze({
      expected: authority.source.accdbSha256,
      actual: benchmarkPackage.source.sha256,
      status: benchmarkPackage.source.sha256 === authority.source.accdbSha256 ? 'PASS' : 'FAIL',
    }),
    restraintRowCount: Object.freeze({
      expected: Number(authority.source.rowCount),
      actual: rows.length,
      status: rows.length === Number(authority.source.rowCount) ? 'PASS' : 'FAIL',
    }),
    selectedFrictionRowCount: Object.freeze({
      expected: Number(authority.frictionSurfaceAuthority.selectedRowCount),
      actual: selected.length,
      status: selected.length === Number(authority.frictionSurfaceAuthority.selectedRowCount) ? 'PASS' : 'FAIL',
    }),
    selectedFrictionNodeIds: Object.freeze({
      expected: Object.freeze([...expectedNodeIds]),
      actual: Object.freeze([...actualNodeIds]),
      status: sameStrings(actualNodeIds, expectedNodeIds) ? 'PASS' : 'FAIL',
    }),
    nonFrictionYNodeIds: Object.freeze({
      expected: Object.freeze([...expectedNonFrictionYNodeIds]),
      actual: Object.freeze([...actualNonFrictionYNodeIds]),
      status: sameStrings(actualNonFrictionYNodeIds, expectedNonFrictionYNodeIds) ? 'PASS' : 'FAIL',
    }),
  });
  const failedChecks = Object.entries(checks)
    .filter(([, check]) => check.status !== 'PASS')
    .map(([name]) => name);
  return Object.freeze({
    schema: 'm047-bm4l-friction-restraint-custody-check/v1',
    sourceAuthority: authority.source,
    selectionRule: authority.frictionSurfaceAuthority.rule,
    solverSelectionIsRowDriven: true,
    selectedRows: Object.freeze(selected.map((entry) => Object.freeze({
      nodeId: entry.nodeId,
      sourceRowIndex: entry.sourceRowIndex,
      sourceRestraintTypeId: entry.sourceRestraintTypeId,
      sourceFrictionCoefficient: entry.sourceFrictionCoefficient,
      normalDirection: entry.normalDirection,
    }))),
    checks,
    failedChecks: Object.freeze(failedChecks),
    status: failedChecks.length === 0 ? 'PASS' : 'BLOCKED_SOURCE_CUSTODY',
  });
}

function buildAccuracyEvidence(benchmarkPackage, actualCases) {
  const excludedQuantities = benchmarkPackage.profile.engineeringAssessment
    ?.equilibriumOnlyQuantities ?? [];
  const cases = {};
  for (const caseId of Object.keys(actualCases).sort()) {
    const actualRows = actualCases[caseId]?.rows;
    const referenceRows = benchmarkPackage.references?.[caseId]?.rows;
    if (!Array.isArray(actualRows) || !Array.isArray(referenceRows)) continue;
    const exposedQuantities = [...new Set(actualRows.map((row) => row.quantity))].sort();
    const comparison = compareBenchmarkResultRows({
      caseId,
      referenceRows,
      actualRows,
      tolerances: benchmarkPackage.profile.tolerances,
      optionalQuantities: [],
      exposedQuantities,
      excludedQuantities,
    });
    const comparable = comparison.rows.filter((row) => ['PASS', 'FAIL'].includes(row.status));
    const nonzero = comparable.filter((row) => Number(row.referenceValue) !== 0);
    const relativeErrors = nonzero
      .map((row) => row.rawRelativeError)
      .filter((value) => Number.isFinite(value));
    const restraintRows = comparable.filter((row) =>
      row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity));
    const restraintFailures = restraintRows.filter((row) => row.status === 'FAIL');
    cases[caseId] = Object.freeze({
      status: comparison.status,
      counts: comparison.counts,
      restraint: Object.freeze({
        compared: restraintRows.length,
        failed: restraintFailures.length,
        status: restraintFailures.length === 0 && restraintRows.length > 0 ? 'PASS' : 'FAIL',
      }),
      maximumNonzeroReferencePercentError: relativeErrors.length === 0
        ? null
        : 100 * Math.max(...relativeErrors),
      comparison,
    });
  }
  const frictionCaseIds = FRICTION_COMPARISON_CASE_IDS.filter((caseId) => cases[caseId]);
  const missingFrictionCaseIds = FRICTION_COMPARISON_CASE_IDS.filter((caseId) => !cases[caseId]);
  const frictionRestraintGateStatus = missingFrictionCaseIds.length > 0
    ? 'NOT_READY'
    : FRICTION_COMPARISON_CASE_IDS.every((caseId) => cases[caseId].restraint.status === 'PASS')
      ? 'PASS'
      : 'FAIL';
  return Object.freeze({
    schema: 'm047-bm4l-direct-reference-accuracy/v1',
    cases: Object.freeze(cases),
    frictionCaseIds: Object.freeze(frictionCaseIds),
    missingFrictionCaseIds: Object.freeze(missingFrictionCaseIds),
    frictionRestraintGateStatus,
  });
}

export function resolveOverallAcceptanceStatus(
  mechanicsStatus,
  benchmarkRestraintAccuracyStatus,
  sourceCustodyStatus = 'PASS',
) {
  const mechanics = String(mechanicsStatus ?? '').trim().toUpperCase();
  const accuracy = String(benchmarkRestraintAccuracyStatus ?? '').trim().toUpperCase();
  const custody = String(sourceCustodyStatus ?? '').trim().toUpperCase();
  if (custody !== 'PASS') return 'BLOCKED';
  if (mechanics !== 'PASS') return mechanics || 'BLOCKED';
  if (accuracy === 'PASS') return 'PASS';
  if (accuracy === 'FAIL') return 'FAIL';
  return 'BLOCKED';
}

function buildPairedDeltaEvidence(cases) {
  const sustained = subtractRows('L13-L6', cases.L13?.rows, cases.L6?.rows);
  const operating = subtractRows('L7-L5', cases.L7?.rows, cases.L5?.rows);
  const expansion = subtractRows('L15-L14', cases.L15?.rows, cases.L14?.rows);
  const identity = subtractRowSets(
    'EXP_IDENTITY',
    expansion,
    subtractRowSets('OPE_MINUS_SUS', operating, sustained),
  );
  return Object.freeze({
    schema: 'm047-bm4l-friction-paired-delta/v1',
    sustained: { formula: 'L13-L6', rows: sustained },
    operating: { formula: 'L7-L5', rows: operating },
    expansion: { formula: 'L15-L14', rows: expansion },
    identity: {
      formula: '(L15-L14)-((L7-L5)-(L13-L6))',
      maximumAbsoluteResidual: maximumAbsoluteValue(identity),
      rows: identity,
    },
  });
}

function subtractRows(caseId, leftRows, rightRows) {
  if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) return [];
  return subtractRowSets(caseId, leftRows, rightRows);
}

function subtractRowSets(caseId, leftRows, rightRows) {
  const left = new Map(leftRows.map((row) => [rowIdentity(row), row]));
  const right = new Map(rightRows.map((row) => [rowIdentity(row), row]));
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  return keys.map((key) => {
    const a = left.get(key);
    const b = right.get(key);
    if (!a || !b) throw new TypeError(`${caseId} paired delta has incomplete row ${key}.`);
    if (a.unit !== b.unit) throw new TypeError(`${caseId} paired delta unit mismatch at ${key}.`);
    return { ...a, caseId, value: Number(a.value) - Number(b.value) };
  });
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join('|');
}

function maximumAbsoluteValue(rows) {
  return rows.reduce((maximum, row) => Math.max(maximum, Math.abs(Number(row.value))), 0);
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => String(value) === String(right[index]));
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function extractAccdb(accdbPath, tableNames) {
  const result = spawnSync(process.execPath, [
    EXPORT_SCRIPT,
    '--accdb', resolve(accdbPath),
    '--tables', tableNames.join(','),
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) {
    throw new Error(`mdb-reader ACCDB extraction failed to start: ${result.error.message}`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new Error(
      `mdb-reader ACCDB extraction failed with exit ${result.status}: ${String(result.stderr).trim()}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`mdb-reader ACCDB extraction returned invalid JSON: ${error.message}`, { cause: error });
  }
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function writeJson(value, path) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, canonicalPrettyStringify(value), 'utf8');
  return target;
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (values.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    values.set(key, value);
  }
  const known = new Set(['--accdb', '--profile', '--friction-profile', '--actual-out', '--evidence-out']);
  const unknown = [...values.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  const accdbPath = values.get('--accdb');
  const profilePath = values.get('--profile');
  const frictionProfilePath = values.get('--friction-profile');
  const actualOutPath = values.get('--actual-out');
  const evidenceOutPath = values.get('--evidence-out');
  if (!accdbPath || !profilePath || !frictionProfilePath || !actualOutPath || !evidenceOutPath) {
    throw new TypeError('Usage: --accdb <BM4_L.ACCDB> --profile <bm4l-validation.profile.json> --friction-profile <bm4l-friction-solver.profile.json> --actual-out <actual.json> --evidence-out <evidence.json>.');
  }
  return { accdbPath, profilePath, frictionProfilePath, actualOutPath, evidenceOutPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = parseArguments(process.argv.slice(2));
    const result = runBm4lFrictionProduction(input);
    const actualPath = writeJson(result.actual, input.actualOutPath);
    const evidencePath = writeJson(result.evidence, input.evidenceOutPath);
    process.stdout.write(`${actualPath}\n${evidencePath}\n`);
    if (result.evidence.acceptance.overallStatus !== 'PASS') process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
