#!/usr/bin/env node
/**
 * Real-ACCDB control regression for the Stage 2 refactor.
 *
 * Solves the frozen non-friction control cases on the pinned BM4_L.ACCDB with the
 * current tree and compares every result row, execution semantic hash and
 * stiffness-state hash against a baseline solved by another checkout of this
 * repository (typically the commit this branch started from).
 *
 * Both sides read the same ACCDB bytes through the same portable reader. Each side
 * uses its own checked-in profile, because the baseline predates the governed
 * friction declaration and would reject the migrated one; for a control case the
 * two profiles describe the same physics, since effective friction is zero either
 * way. Any surviving difference is therefore solver behaviour.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-control-regression.mjs --accdb <BM4_L.ACCDB>
 *     [--baseline-root <other checkout>] [--baseline <baseline-actual.json>]
 *     [--cases L2,L3,L4,L5,L6,L14] [--out <regression.json>]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';

const DEFAULT_CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';

/** Solve the controls with the current tree. */
export async function solveControls({ accdbPath, caseIds, profilePath = PROFILE_PATH }) {
  const profile = JSON.parse(readFileSync(resolve(profilePath), 'utf8'));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const actual = solveCaesarAccdbLinearBenchmark(benchmarkPackage, caseIds);
  return {
    sourceAccdbSha256: actual.sourceAccdbSha256,
    modelSemanticHash: benchmarkPackage.model.semanticHash,
    cases: Object.fromEntries(caseIds.map((caseId) => [caseId, {
      rowCount: actual.cases[caseId].rows.length,
      rowsSemanticHash: semanticHash(actual.cases[caseId].rows),
      executionSemanticHash: actual.cases[caseId].executionSemanticHash,
      stiffnessStateHash: actual.cases[caseId].stiffnessStateHash,
      recoveredEquilibriumStatus: actual.mechanics.cases[caseId].recoveredEquilibrium.status,
      rows: actual.cases[caseId].rows,
    }])),
  };
}

/**
 * Solve the controls with another checkout's solver, using this tree's reader.
 *
 * The reader is an input path only, so lending it to the baseline checkout keeps
 * the comparison focused on the solver.
 */
async function solveBaselineControls({ baselineRoot, accdbPath, caseIds, baselineProfilePath }) {
  const root = resolve(baselineRoot);
  const packageModule = await import(pathToFileURL(`${root}/src/core/fea-benchmarks/caesar-accdb-package.js`).href);
  const solverModule = await import(pathToFileURL(`${root}/src/core/fea-benchmarks/caesar-accdb-linear-solve.js`).href);
  const profile = JSON.parse(readFileSync(
    resolve(baselineProfilePath ?? `${root}/${PROFILE_PATH}`),
    'utf8',
  ));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath,
    tableNames: packageModule.requiredCaesarAccdbTables(profile),
  });
  const benchmarkPackage = packageModule.buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const actual = solverModule.solveCaesarAccdbLinearBenchmark(benchmarkPackage, caseIds);
  return {
    sourceAccdbSha256: actual.sourceAccdbSha256,
    modelSemanticHash: benchmarkPackage.model.semanticHash,
    cases: Object.fromEntries(caseIds.map((caseId) => [caseId, {
      rowCount: actual.cases[caseId].rows.length,
      rowsSemanticHash: semanticHash(actual.cases[caseId].rows),
      executionSemanticHash: actual.cases[caseId].executionSemanticHash,
      stiffnessStateHash: actual.cases[caseId].stiffnessStateHash,
      recoveredEquilibriumStatus: actual.mechanics.cases[caseId].recoveredEquilibrium.status,
      rows: actual.cases[caseId].rows,
    }])),
  };
}

/** Compare two control solves row by row. */
export function compareControls({ current, baseline, caseIds }) {
  const cases = {};
  for (const caseId of caseIds) {
    const left = current.cases[caseId];
    const right = baseline.cases[caseId];
    const leftRows = new Map(left.rows.map((row) => [rowIdentity(row), row]));
    const rightRows = new Map(right.rows.map((row) => [rowIdentity(row), row]));
    const identities = [...new Set([...leftRows.keys(), ...rightRows.keys()])].sort(compareText);
    const differences = [];
    let maximumAbsoluteDifference = 0;
    for (const identity of identities) {
      const a = leftRows.get(identity);
      const b = rightRows.get(identity);
      if (a === undefined || b === undefined) {
        differences.push({ identity, kind: a === undefined ? 'CURRENT_ROW_MISSING' : 'BASELINE_ROW_MISSING' });
        continue;
      }
      if (a.unit !== b.unit) {
        differences.push({ identity, kind: 'UNIT_DIFFERENCE', current: a.unit, baseline: b.unit });
        continue;
      }
      const delta = Math.abs(Number(a.value) - Number(b.value));
      if (delta !== 0) {
        maximumAbsoluteDifference = Math.max(maximumAbsoluteDifference, delta);
        differences.push({
          identity, kind: 'VALUE_DIFFERENCE', currentValue: a.value, baselineValue: b.value, absoluteDifference: delta,
        });
      }
    }
    cases[caseId] = {
      rowCount: left.rowCount,
      baselineRowCount: right.rowCount,
      rowsIdentical: differences.length === 0,
      rowsSemanticHashMatch: left.rowsSemanticHash === right.rowsSemanticHash,
      executionSemanticHashMatch: left.executionSemanticHash === right.executionSemanticHash,
      stiffnessStateHashMatch: left.stiffnessStateHash === right.stiffnessStateHash,
      recoveredEquilibriumStatus: left.recoveredEquilibriumStatus,
      baselineRecoveredEquilibriumStatus: right.recoveredEquilibriumStatus,
      maximumAbsoluteDifference,
      differenceCount: differences.length,
      differences: differences.slice(0, 50),
    };
  }
  const base = {
    schema: 'm047-bm4l-stage2-control-regression/v1',
    rule: 'THE_STAGE_2_REFACTOR_MUST_NOT_CHANGE_ANY_NON_FRICTION_CONTROL_RESULT_ROW',
    sourceAccdbSha256: current.sourceAccdbSha256,
    baselineSourceAccdbSha256: baseline.sourceAccdbSha256,
    modelSemanticHash: current.modelSemanticHash,
    baselineModelSemanticHash: baseline.modelSemanticHash,
    caseIds: [...caseIds],
    status: caseIds.every((caseId) => cases[caseId].rowsIdentical) ? 'PASS' : 'FAIL',
    cases,
  };
  return Object.freeze({ ...base, regressionSemanticHash: semanticHash(base) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const accepted = new Map();
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 2) accepted.set(argv[index], argv[index + 1]);
  const accdbPath = accepted.get('--accdb');
  if (!accdbPath) throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--baseline-root <checkout>] [--baseline <json>] [--cases ...] [--out <json>]');
  const caseIds = (accepted.get('--cases') ?? DEFAULT_CASES.join(',')).split(',').map((entry) => entry.trim());
  const profilePath = accepted.get('--profile') ?? PROFILE_PATH;
  const current = await solveControls({ accdbPath, caseIds, profilePath });
  const baseline = accepted.has('--baseline')
    ? JSON.parse(readFileSync(resolve(accepted.get('--baseline')), 'utf8'))
    : await solveBaselineControls({
      baselineRoot: accepted.get('--baseline-root'),
      accdbPath,
      caseIds,
      baselineProfilePath: accepted.get('--baseline-profile') ?? null,
    });
  const record = compareControls({ current, baseline, caseIds });
  const outPath = accepted.get('--out') ?? null;
  const content = `${canonicalPrettyStringify(record)}\n`;
  if (outPath === null) {
    process.stdout.write(content);
  } else {
    mkdirSync(dirname(resolve(outPath)), { recursive: true });
    writeFileSync(resolve(outPath), content, 'utf8');
    process.stdout.write(`${record.status} ${resolve(outPath)}\n`);
  }
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
