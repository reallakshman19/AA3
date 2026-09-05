#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const auditPath = 'scripts/emp1-manual-browser-audit.js';
const guidePath = 'agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0010.md';
const [audit, guide] = await Promise.all([
  readFile(resolve(root, auditPath), 'utf8'),
  readFile(resolve(root, guidePath), 'utf8'),
]);

for (const required of [
  'runEmp1ManualBrowserAudit',
  'seedQualificationPressureIfNeeded',
  'globalThis.AnalysisWorkspace',
  "workspace.importEmpiricalDocument(documentValue, 'LAFEA.1')",
  'P-EXTERNAL',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
  'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
  'pressure.rows.5',
  'pressure.governedCells.10',
  'presentation.rawTokenLeaks.none',
  'layout.desktop.sideBySide',
  'layout.narrow.stacked',
  'layout.noHorizontalOverflow',
  'emp1-benchmark-evidence-panel',
  'FULL_WIDTH_DETAIL',
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
  "await import('/scripts/emp1-manual-browser-audit.js?manual-audit=1')",
  'seedQualificationPressure: true',
  'PASS_CURRENT_VIEWPORT_DOM_OBSERVATION',
  'failures = []',
  'width <=1050 px',
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
  schema: 'emp1-manual-browser-audit-check/v1',
  status: 'PASS_STATIC_MANUAL_BROWSER_AUDIT_CONTRACT',
  issue: 1651,
  auditPath,
  guidePath,
  automatedBrowserPassCreated: false,
  engineeringAuthorityChanged: false,
}, null, 2));
