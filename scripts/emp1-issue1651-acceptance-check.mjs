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
  manualAudit: 'scripts/emp1-manual-browser-audit.js',
  manualAuditStatic: 'scripts/emp1-manual-browser-audit-check.mjs',
  manualGuide: 'agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0012.md',
});

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [
  key,
  await readFile(resolve(root, path), 'utf8'),
])));

// TASK-001: progressive disclosure must not shrink raw-token coverage. The live
// browser spec visits every available evidence tab and scans the visible state;
// explicit technical/raw regions remain the only exemptions.
for (const required of [
  "'emp1-benchmark-evidence-panel'",
  '[data-emp1-raw-technical="true"]',
  '[data-lafea-raw-json="true"]',
  'machineUnderscore',
  'machineDotted',
  "[data-role=\"emp1-evidence-tab\"]",
  'for (let index = 0; index < evidenceCount; index += 1)',
  'scanVisibleLeaks',
]) assert.ok(source.rawTokens.includes(required), `raw-token progressive coverage missing: ${required}`);

// TASK-002: exact Pressure 5 x 2 governed custody remains unchanged.
for (const required of [
  'toHaveCount(5)',
  'toHaveCount(10)',
  'LAFEA.1.pressure.internal',
  'LAFEA.1.pressure.external',
  'P-EXTERNAL',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
  'expect(sourceBefore.values[0] - sourceBefore.values[1]).toBe(-1)',
]) assert.ok(source.pressure.includes(required), `Pressure acceptance evidence missing: ${required}`);
assert.ok(source.pressureStatic.includes('PRESSURE'),
  'static governed-table qualification must retain Pressure coverage');

// TASK-003 / recovery #1664: acceptance is now task-focus and bounded vertical
// composition, not merely the existence of two columns.
for (const required of [
  'emp1-analytical-layout/v2',
  'COMPACT_WORKFLOW_NAV',
  'ACTIVE_TASK',
  'BASIS_RAIL',
  'EVIDENCE_WORKSPACE',
  'EMP1_TASK_SHELL_INPUT_GROUPS',
  'visibleHeavyEvidenceMaximum: 1',
  "['PRESSURE', 'LOAD_CASES']",
  "['REFERENCE_POINTS']",
  'EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE',
  'EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH',
]) assert.ok(source.layoutStatic.includes(required), `task-shell static evidence missing: ${required}`);

for (const required of [
  'data-emp1-task-shell',
  'assertSingleVisibleEvidence',
  'assertVisibleInputGroups',
  "['PIPE_GEOMETRY', 'THICKNESS']",
  "['PRESSURE', 'LOAD_CASES']",
  "['REFERENCE_POINTS']",
  "['SCREENING_CASES', 'EVALUATION_LOCATIONS']",
  'emp1-unselected-evidence-height-falsifier',
  'hiddenSentinelDelta.delta',
  'pageScrollHeight / desktopGeometry.clientHeight',
  'pageScrollHeight / narrowGeometry.clientHeight',
  'toBeLessThan(6)',
  'analyticalScrollWidth',
  'analyticalClientWidth',
]) assert.ok(source.layout.includes(required), `task-shell browser falsifier missing: ${required}`);

// TASK-004: benchmark remains authority-safe but now must be explicitly selected
// in the evidence workspace before its browser assertions execute.
for (const required of [
  "toHaveAttribute('data-emp1-layout-surface', 'benchmarkEvidence')",
  "toHaveAttribute('data-emp1-layout-region', 'EVIDENCE_WORKSPACE')",
  'data-emp1-evidence-view="benchmarkEvidence"',
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

// Existing Stage-17 carrier still owns all focused browser families.
for (const path of [
  paths.rawTokens,
  paths.pressure,
  paths.layout,
  paths.benchmark,
]) assert.ok(source.carrier.includes(path), `Stage-17 carrier missing ${path}`);

// Deterministic human-observed fallback mirrors the task-shell acceptance while
// explicitly refusing to manufacture automated browser PASS.
for (const required of [
  'emp1-manual-browser-audit/v2',
  'selectRecoveryAuditViews',
  'presentation.rawTokenLeaks.none',
  'pressure.rows.5',
  'pressure.governedCells.10',
  'layout.taskShell.loadsActive',
  'layout.workflow.details.closed',
  'layout.loads.inputGroups.exact',
  'layout.evidence.visibleAtMostOne',
  'layout.evidence.hiddenHeight.zero',
  'layout.unselectedEvidence.heightDelta',
  'layout.pageDepth.materiallyReduced',
  'EVIDENCE_WORKSPACE',
  'Engineering use not authorized',
  'benchmark.caux.rows.8',
  'benchmark.pvElite.rows.0',
  'browserAcceptanceComplete: false',
  'automatedPlaywrightPassCreated: false',
]) assert.ok(source.manualAudit.includes(required), `manual task-shell acceptance mirror missing: ${required}`);
assert.ok(source.manualAuditStatic.includes('PASS_STATIC_TASK_SHELL_MANUAL_BROWSER_AUDIT_CONTRACT'));
assert.ok(source.manualGuide.includes('PASS_CURRENT_VIEWPORT_DOM_OBSERVATION'));
assert.ok(source.manualGuide.includes('pageDepth.viewportRatio < 6'));
assert.ok(source.manualGuide.includes('must not promote the blocked Playwright suite to PASS'));

// Closure remains presentation/test evidence only with no calculation-core or
// workflow-YAML authority mutation.
assert.equal(source.carrier.includes('.github/workflows/'), false);
assert.equal(source.manualAudit.includes('../src/core/'), false);

console.log(JSON.stringify({
  schema: 'emp1-issue1651-acceptance-check/v2',
  status: 'PASS_STATIC_TASK_SHELL_ACCEPTANCE_MANIFEST_EXECUTABLE_BROWSER_GATES_RETAINED',
  issue: 1651,
  recoveryIssue: 1664,
  rawTokenEvidenceViewsEnumerated: true,
  pressureMatrix: { identities: 5, valueColumns: 2, governedCells: 10 },
  taskShell: {
    professionalSteps: 7,
    visibleHeavyEvidenceMaximum: 1,
    pageDepthViewportLimit: 6,
    hiddenEvidenceHeightDeltaPx: 1,
    desktopSplit: true,
    narrowCollapse: true,
    overflowFalsifier: true,
  },
  benchmark: {
    cauxRows: 8,
    pvEliteRows: 0,
    keyboardDisclosure: true,
    tableSemantics: true,
    engineeringUseAuthorized: false,
  },
  manualEvidencePath: {
    helper: paths.manualAudit,
    guide: paths.manualGuide,
    requiresHumanExecution: true,
  },
  executableBrowserPassCreatedByThisStaticCheck: false,
}, null, 2));
