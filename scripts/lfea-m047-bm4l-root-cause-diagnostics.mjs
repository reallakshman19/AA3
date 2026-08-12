import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBm4lCommonReportParity } from './lfea-m047-bm4l-common-report-parity.mjs';
import { buildBm4lTeeStiffnessAuthority } from './lfea-m047-bm4l-tee-stiffness-authority.mjs';

function argumentMap(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid diagnostics argument near ${String(key)}.`);
    }
    result.set(key, value);
  }
  return result;
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function sha256Text(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function referenceCoverageByCase(report) {
  return new Map((report.cases ?? []).map((entry) => [
    entry.caseId,
    new Set((entry.referenceRows ?? []).map(rowIdentity)),
  ]));
}

function projectActualToReferenceCoverage(actual, report) {
  const referenceCoverage = referenceCoverageByCase(report);
  const cases = {};
  const coverage = {};
  for (const [caseId, actualCase] of Object.entries(actual.cases ?? {})) {
    const referenceIds = referenceCoverage.get(caseId);
    if (!referenceIds) {
      cases[caseId] = actualCase;
      coverage[caseId] = Object.freeze({
        actualRowCount: actualCase.rows?.length ?? 0,
        projectedRowCount: actualCase.rows?.length ?? 0,
        referenceRowCount: null,
        excludedActualOnlyRowCount: 0,
        excludedActualOnlyIdentities: Object.freeze([]),
        status: 'NO_REFERENCE_CASE_PROJECTION',
      });
      continue;
    }
    const rows = actualCase.rows ?? [];
    const projectedRows = rows.filter((row) => referenceIds.has(rowIdentity(row)));
    const actualIds = new Set(rows.map(rowIdentity));
    const referenceOnly = [...referenceIds].filter((identity) => !actualIds.has(identity)).sort();
    if (referenceOnly.length > 0) {
      throw new Error(
        `Actual case ${caseId} is missing ${referenceOnly.length} CAESAR reference-covered identities; `
        + `first: ${referenceOnly.slice(0, 10).join(', ')}.`,
      );
    }
    const excluded = rows
      .map(rowIdentity)
      .filter((identity) => !referenceIds.has(identity))
      .sort();
    cases[caseId] = Object.freeze({ ...actualCase, rows: Object.freeze(projectedRows) });
    coverage[caseId] = Object.freeze({
      actualRowCount: rows.length,
      projectedRowCount: projectedRows.length,
      referenceRowCount: referenceIds.size,
      excludedActualOnlyRowCount: excluded.length,
      excludedActualOnlyIdentities: Object.freeze(excluded),
      status: projectedRows.length === referenceIds.size
        ? 'PASS_REFERENCE_COVERAGE_COMPLETE'
        : 'FAIL_REFERENCE_COVERAGE_INCOMPLETE',
    });
  }
  return Object.freeze({
    value: Object.freeze({ ...actual, cases: Object.freeze(cases) }),
    coverage: Object.freeze(coverage),
  });
}

const argv = process.argv.slice(2);
const args = argumentMap(argv);
const actualPath = resolve(args.get('--actual') ?? '');
const reportPath = resolve(args.get('--report') ?? '');
const outPath = resolve(args.get('--out') ?? '');
if (!actualPath || !reportPath || !outPath) {
  throw new TypeError('Diagnostics require --actual, --report and --out.');
}

const actualText = readFileSync(actualPath, 'utf8');
const reportText = readFileSync(reportPath, 'utf8');
const actual = JSON.parse(actualText);
const report = JSON.parse(reportText);
const projection = projectActualToReferenceCoverage(actual, report);
const projectedText = `${JSON.stringify(projection.value)}\n`;
const projectedPath = `${outPath}.reference-coverage-actual.tmp.json`;
writeFileSync(projectedPath, projectedText, 'utf8');

const coreArgv = [...argv];
const actualIndex = coreArgv.indexOf('--actual');
if (actualIndex < 0 || actualIndex + 1 >= coreArgv.length) {
  throw new TypeError('Diagnostics require --actual.');
}
coreArgv[actualIndex + 1] = projectedPath;

const corePath = fileURLToPath(new URL('./lfea-m047-bm4l-root-cause-diagnostics-core.mjs', import.meta.url));
try {
  const core = spawnSync(process.execPath, [corePath, ...coreArgv], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (core.error) throw core.error;
  if (core.status !== 0) {
    throw new Error(`BM4_L diagnostics core exited ${core.status}.`);
  }

  const diagnostics = JSON.parse(readFileSync(outPath, 'utf8'));
  const commonReportParity = await buildBm4lCommonReportParity(actual, report);
  const teeStiffnessAuthority = buildBm4lTeeStiffnessAuthority();
  const source = Object.freeze({
    ...diagnostics.source,
    actualPath,
    actualSha256: sha256Text(actualText),
  });
  const diagnosticsInputProjection = Object.freeze({
    rule: 'PROJECT_ACTUAL_ROWS_TO_COMPLETE_CAESAR_REFERENCE_COVERAGE_FOR_CROSS_DATASET_SUPERPOSITION_V1',
    reason:
      'The solver retains analysis-element and recovery rows beyond CAESAR source-report coverage. Cross-dataset superposition compares only identities present in the complete CAESAR reference set; actual-only rows remain explicitly enumerated here.',
    originalActualPath: actualPath,
    originalActualSha256: sha256Text(actualText),
    projectedActualSha256: sha256Text(projectedText),
    cases: projection.coverage,
  });

  writeFileSync(
    outPath,
    `${JSON.stringify({
      ...diagnostics,
      source,
      diagnosticsInputProjection,
      commonReportParity,
      teeStiffnessAuthority,
    }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Augmented BM4_L diagnostics with pinned Common report parity and tee Kb authority: ${outPath}`);
} finally {
  rmSync(projectedPath, { force: true });
}
