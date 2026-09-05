#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const paths = Object.freeze({
  rawTokens: 'e2e/emp1-human-presentation-tokens.spec.js',
  pressure: 'e2e/lafea-empirical-grouped-edit.spec.js',
  pressureStatic: 'scripts/emp1-governed-vector-table-check.mjs',
  layoutStatic: 'scripts/emp1-analytical-layout-check.mjs',
  layout: 'e2e/emp1-analytical-layout.spec.js',
  benchmarkStatic: 'scripts/emp1-benchmark-evidence-ui-check.mjs',
  benchmark: 'e2e/emp1-benchmark-evidence.spec.js',
  carrier: 'scripts/lafea-stage17-browser-run.mjs',
});

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [
  key,
  await readFile(resolve(root, path), 'utf8'),
])));

// Finding 2 / TASK-001: the live rendered-token gate must follow the benchmark
// panel after LEG-004 moved it out of the workflow card. Raw technical regions
// remain the only explicit exemptions.
assert.ok(source.rawTokens.includes("'emp1-benchmark-evidence-panel'"),
  'moved Benchmark Evidence panel must stay inside the live raw-token sweep');
assert.ok(source.rawTokens.includes('[data-emp1-raw-technical="true"]'));
assert.ok(source.rawTokens.includes('[data-lafea-raw-json="true"]'));
assert.ok(source.rawTokens.includes('machineUnderscore'));
assert.ok(source.rawTokens.includes('machineDotted'));

// Finding 3 / TASK-002: the browser proof must still exercise the exact 5 x 2
// Pressure acceptance with distinct internal/external descriptor custody.
for (const required of [
  "toHaveCount(5)",
  "toHaveCount(10)",
  'LAFEA.1.pressure.internal',
  'LAFEA.1.pressure.external',
  'P-EXTERNAL',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
  'expect(sourceBefore.values[0] - sourceBefore.values[1]).toBe(-1)',
]) assert.ok(source.pressure.includes(required), `Pressure acceptance evidence missing: ${required}`);
assert.ok(source.pressureStatic.includes('PRESSURE'),
  'static governed-table qualification must retain Pressure coverage');

// Finding 1 / TASK-003: declaration and browser geometry gates must both remain
// present. The browser proof carries desktop two-lane, narrow one-column and
// horizontal-overflow falsifiers.
for (const required of [
  'EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE',
  'EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH',
  'PRIMARY_WORK',
  'ENGINEERING_BASIS',
  'FULL_WIDTH_DETAIL',
  'benchmarkEvidence',
]) assert.ok(source.layoutStatic.includes(required), `layout static evidence missing: ${required}`);
for (const required of [
  'desktopGeometry',
  'narrowGeometry',
  'analyticalScrollWidth',
  'analyticalClientWidth',
  'assertUniqueLayoutSurfaceManifest',
  'assertEngineerFacingCardinality',
]) assert.ok(source.layout.includes(required), `layout browser evidence missing: ${required}`);

// TASK-004: one formal benchmark panel, retained CAUx/PV Elite distinctions,
// keyboard-operable progressive disclosure and table semantics are executable
// browser obligations, not source-inspection substitutes.
for (const required of [
  "toHaveAttribute('data-emp1-layout-surface', 'benchmarkEvidence')",
  "toHaveCount(2)",
  "toHaveCount(8)",
  "toHaveCount(0)",
  "page.keyboard.press('Enter')",
  "page.keyboard.press('Space')",
  "table.locator('caption')",
  "table.getByRole('columnheader')",
  "table.getByRole('rowheader')",
  'Engineering use not authorized',
  'Reference not available',
]) assert.ok(source.benchmark.includes(required), `benchmark browser evidence missing: ${required}`);
for (const required of [
  '2.0355862430856293',
  '26.786740343133943',
  'engineeringUseAuthorized',
  'REFERENCE_NOT_AVAILABLE',
]) assert.ok(source.benchmarkStatic.includes(required), `benchmark static evidence missing: ${required}`);

// The existing Stage-17 browser carrier must execute every focused issue gate.
for (const path of [
  paths.rawTokens,
  paths.pressure,
  paths.layout,
  paths.benchmark,
]) assert.ok(source.carrier.includes(path), `Stage-17 carrier missing ${path}`);

// This closure checker is test/evidence only. It intentionally reads contracts
// and browser specs; it does not import calculation core or retained benchmark JSON.
assert.equal(source.carrier.includes('.github/workflows/'), false);

console.log(JSON.stringify({
  schema: 'emp1-issue1651-acceptance-check/v1',
  status: 'PASS_STATIC_ACCEPTANCE_MANIFEST_EXECUTABLE_BROWSER_GATES_RETAINED',
  issue: 1651,
  rawTokenBenchmarkCoverage: true,
  pressureMatrix: { identities: 5, valueColumns: 2, governedCells: 10 },
  layout: { desktopSplit: true, narrowCollapse: true, overflowFalsifier: true },
  benchmark: {
    cauxRows: 8,
    pvEliteRows: 0,
    keyboardDisclosure: true,
    tableSemantics: true,
    engineeringUseAuthorized: false,
  },
  executableBrowserPassCreatedByThisStaticCheck: false,
}, null, 2));
