#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const auditPath = 'scripts/emp1-manual-browser-audit.js';
const guidePath = 'agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0025.md';
const carrierPath = 'scripts/emp1-issue1651-executable-validation.mjs';
const browserPreflightPath = 'scripts/lib/project-local-playwright-browser.mjs';
const [audit, guide, carrier, browserPreflight] = await Promise.all([
  readFile(resolve(root, auditPath), 'utf8'),
  readFile(resolve(root, guidePath), 'utf8'),
  readFile(resolve(root, carrierPath), 'utf8'),
  readFile(resolve(root, browserPreflightPath), 'utf8'),
]);

for (const required of [
  'emp1-manual-browser-audit/v4',
  'runEmp1ManualBrowserAudit',
  'seedQualificationPressureIfNeeded',
  'scanAllSplitConsoleViews',
  'auditPresentationCoherence',
  'globalThis.AnalysisWorkspace',
  "workspace.importEmpiricalDocument(documentValue, 'LAFEA.1')",
  'P-EXTERNAL',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
  'pressure.rows.5',
  'pressure.governedCells.10',
  'presentation.rawTokenLeaks.none',
  'layout.splitConsole.enabled',
  'layout.taskShell.loadsActive',
  'layout.workflow.steps.7',
  'layout.workflow.details.closed',
  'layout.workflow.selectionMatchesTask',
  'layout.workflow.labels.compact',
  'layout.workflow.details.overlayNoGrowth',
  'layout.loads.inputGroups.exact',
  'layout.inspector.selectedAtMostOne',
  'layout.inspector.loadsContextOnly',
  'layout.inspector.headerContained',
  'layout.evidence.selectedAtMostOne',
  'layout.evidence.collapsedByDefault',
  'layout.evidence.hiddenHeight.zero',
  'layout.evidence.affordanceInViewport',
  'layout.unselectedEvidence.heightDelta',
  'layout.outerShell.bounded',
  'layout.outerShell.inViewport',
  'layout.review.afterBackingB.coherent',
  'layout.pageDepth.reasonable',
  'layout.desktop.sideBySide',
  'layout.narrow.modeTabs.3',
  'layout.narrow.workOnly',
  'layout.narrow.basisOnly',
  'layout.narrow.evidenceOnly',
  'layout.noHorizontalOverflow',
  'routes.capabilities.2',
  'routes.visiblePanel.1',
  'routes.authorityStates.preserved',
  'routes.inspector.contextual',
  'routes.deepDetails.closedByDefault',
  'EVIDENCE_WORKSPACE',
  'Comparison qualified',
  'Engineering use not authorized',
  '8 / 8 within frozen tolerance',
  'Du reference / Du EMP.1 · Agreement: Yes',
  'not WRC method authority',
  'No reference values or tolerance are inferred.',
  'benchmark.pvElite.rows.0',
  'browserAcceptanceComplete: false',
  'automatedPlaywrightPassCreated: false',
]) {
  assert.ok(audit.includes(required), `manual browser audit missing contract token: ${required}`);
}

for (const required of [
  'Windows PowerShell',
  '$env:PLAYWRIGHT_BROWSERS_PATH = "0"',
  'npx playwright install chromium',
  'node scripts/emp1-issue1651-executable-validation.mjs',
  'node scripts/emp1-issue1651-executable-validation.mjs --preflight-only',
  'PLAYWRIGHT_LOCAL_CHROMIUM_MISSING',
  'PASS_EXECUTABLE_EXACT_HEAD_GATE_SEQUENCE',
  'node scripts/emp1-qualification-sample-orchestration-check.mjs',
  'node scripts/emp1-public-product-check.mjs',
  'npx playwright test',
  'e2e/emp1-qualification-sample-orchestration.spec.js',
  'node scripts/lafea-stage17-browser-run.mjs',
  '[SIMULATED] Load complete EMP.1 qualification sample',
  'EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED',
  "await import('/scripts/emp1-manual-browser-audit.js?manual-audit=4')",
  'seedQualificationPressure: true',
  'PASS_CURRENT_VIEWPORT_DOM_OBSERVATION',
  'failures = []',
  '5 Section Screening',
  '7 Review & Evidence',
  'Backing calculation stage',
  'Pressure + Load Cases only',
  'Work / Basis / Evidence',
  'Do **not** accept Work -> Basis -> Evidence vertical stacking',
  'Press **Enter**',
  'Press **Space**',
  'keyboard PASS',
  'Do not proceed to human-factor acceptance',
]) {
  assert.ok(guide.includes(required), `manual browser guide missing evidence instruction: ${required}`);
}

for (const required of [
  'inspectProjectLocalChromium',
  'scripts/emp1-qualification-sample-orchestration-check.mjs',
  'scripts/emp1-analytical-layout-check.mjs',
  'scripts/emp1-manual-browser-audit-check.mjs',
  'scripts/emp1-issue1651-acceptance-check.mjs',
  'scripts/emp1-public-product-check.mjs',
  'e2e/emp1-qualification-sample-orchestration.spec.js',
  'scripts/lafea-stage17-browser-run.mjs',
  'PASS_EXECUTABLE_EXACT_HEAD_GATE_SEQUENCE',
  'humanFactorMayProceed: false',
  "args.has('--preflight-only')",
  "args.has('--plan')",
]) {
  assert.ok(carrier.includes(required), `executable validation carrier missing contract token: ${required}`);
}

for (const required of [
  "PLAYWRIGHT_BROWSERS_PATH: '0'",
  'PLAYWRIGHT_LOCAL_CHROMIUM_MISSING',
  'PASS_BROWSER_ENVIRONMENT_PREFLIGHT',
  '$env:PLAYWRIGHT_BROWSERS_PATH = "0"; npx playwright install chromium',
  'PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium',
]) {
  assert.ok(browserPreflight.includes(required), `browser preflight missing contract token: ${required}`);
}

assert.equal(audit.includes('../src/core/'), false,
  'manual browser audit must not import calculation core');
assert.equal(audit.includes('.github/workflows/'), false,
  'manual browser audit must not mutate workflow authority');
assert.equal(carrier.includes('../src/core/'), false,
  'validation carrier must not import calculation core');
assert.equal(carrier.includes('.github/workflows/'), false,
  'validation carrier must not mutate workflow authority');
assert.equal(browserPreflight.includes('../src/core/'), false,
  'browser preflight must not import calculation core');

console.log(JSON.stringify({
  schema: 'emp1-manual-browser-audit-check/v7',
  status: 'PASS_STATIC_SPLIT_CONSOLE_MANUAL_BROWSER_AUDIT_CONTRACT',
  issue: 1651,
  recoveryIssue: 1664,
  auditPath,
  guidePath,
  carrierPath,
  browserPreflightPath,
  qualificationSamplePrerequisiteExplicit: true,
  executableGateBeforeHumanObservation: true,
  crossPlatformExecutableCarrier: true,
  projectLocalChromiumPreflight: true,
  outerShellOverflowTolerancePx: 1,
  outerShellMustFitViewport: true,
  workflowDetailOverlayNoGrowth: true,
  explicitTaskSelectionOwnsPresentation: true,
  taskContextualInspector: true,
  narrowModes: ['WORK', 'BASIS', 'EVIDENCE'],
  registeredRouteCapabilityPanelsVisibleMaximum: 1,
  automatedBrowserPassCreated: false,
  engineeringAuthorityChanged: false,
}, null, 2));
