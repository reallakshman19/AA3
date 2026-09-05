#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const auditPath = 'scripts/emp1-manual-browser-audit.js';
const guidePath = 'agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0014.md';
const [audit, guide] = await Promise.all([
  readFile(resolve(root, auditPath), 'utf8'),
  readFile(resolve(root, guidePath), 'utf8'),
]);

for (const required of [
  'emp1-manual-browser-audit/v3',
  'runEmp1ManualBrowserAudit',
  'seedQualificationPressureIfNeeded',
  'scanAllSplitConsoleViews',
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
  'layout.loads.inputGroups.exact',
  'layout.inspector.selectedAtMostOne',
  'layout.evidence.selectedAtMostOne',
  'layout.evidence.collapsedByDefault',
  'layout.evidence.hiddenHeight.zero',
  'layout.unselectedEvidence.heightDelta',
  'layout.outerShell.bounded',
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
  "await import('/scripts/emp1-manual-browser-audit.js?manual-audit=3')",
  'seedQualificationPressure: true',
  'PASS_CURRENT_VIEWPORT_DOM_OBSERVATION',
  'failures = []',
  'scrollHeight <= clientHeight + 1 px',
  'Pressure + Load Cases only',
  'Reference Points only',
  'width <=1050 px',
  'Work / Basis / Evidence',
  'Do **not** accept Work → Basis → Evidence vertical stacking',
  'Press **Enter**',
  'Press **Space**',
  'keyboard PASS',
  'must not promote the blocked Playwright suite to PASS',
]) {
  assert.ok(guide.includes(required), `manual browser guide missing evidence instruction: ${required}`);
}

assert.equal(audit.includes('../src/core/'), false,
  'manual browser audit must not import calculation core');
assert.equal(audit.includes('.github/workflows/'), false,
  'manual browser audit must not mutate workflow authority');

console.log(JSON.stringify({
  schema: 'emp1-manual-browser-audit-check/v3',
  status: 'PASS_STATIC_SPLIT_CONSOLE_MANUAL_BROWSER_AUDIT_CONTRACT',
  issue: 1651,
  recoveryIssue: 1664,
  auditPath,
  guidePath,
  outerShellOverflowTolerancePx: 1,
  narrowModes: ['WORK', 'BASIS', 'EVIDENCE'],
  registeredRouteCapabilityPanelsVisibleMaximum: 1,
  automatedBrowserPassCreated: false,
  engineeringAuthorityChanged: false,
}, null, 2));
