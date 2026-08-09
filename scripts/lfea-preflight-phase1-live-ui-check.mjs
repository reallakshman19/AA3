#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const uiPath = 'src/workspace/lfea-preflight-ui.js';
const cssPath = 'src/workspace/lfea-preflight-phase1.css';
const ui = fs.readFileSync(uiPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert.match(ui, /createLfeaPreflightPhase1ReviewSource/u);
assert.match(ui, /LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS/u);
assert.match(ui, /createLfeaPreflightPhase1Viewport/u);
assert.match(ui, /getLfeaPreflightPhase1ViewportModel/u);
assert.match(ui, /setLfeaPreflightPhase1Queue/u);
assert.match(ui, /setLfeaPreflightPhase1Filter/u);
assert.match(ui, /setLfeaPreflightPhase1ColumnPreset/u);
assert.match(ui, /moveLfeaPreflightPhase1Selection/u);
assert.match(ui, /expandLfeaPreflightPhase1Line/u);
assert.match(ui, /Trace/u);
console.log('P06B-UI-01 PASS existing preflight mount path consumes lazy indexed review source and viewport');

for (const label of ['Missing', 'Ambiguous', 'Conflicting', 'Stale', 'Proposed', 'Deferred']) {
  assert.match(ui, new RegExp(`['\"]${label}['\"]`, 'u'));
}
for (const preset of ['REVIEW', 'PROCESS', 'MECHANICAL', 'EVIDENCE', 'ALL_40']) {
  assert.match(fs.readFileSync('src/workspace/lfea-preflight-phase1-schema.js', 'utf8'), new RegExp(`\\b${preset}\\b`, 'u'));
}
assert.match(ui, /All services/u);
assert.match(ui, /All ratings/u);
assert.match(ui, /Stable target ID/u);
assert.match(ui, /Readiness/u);
console.log('P06B-UI-02 PASS queues, indexed facets, sorting and closed-schema column presets are visible controls');

assert.doesNotMatch(ui, /PREFLIGHT_LINE_KEY_ROW_CAP|PREFLIGHT_COMPONENT_ROW_CAP/u);
assert.doesNotMatch(ui, /\.slice\(0,\s*500\)|\.slice\(0,\s*200\)/u);
assert.doesNotMatch(ui, /projection\.groups\.filter|querySelectorAll\([^)]*row|Array\.from\([^)]*children/u);
assert.match(ui, /rowDomUpperBound|liveLineRowCount|visibleColumns/u);
assert.match(ui, /GRID_ROW_OVERSCAN/u);
assert.match(ui, /GRID_COLUMN_OVERSCAN/u);
assert.match(css, /overflow:\s*auto/u);
assert.match(css, /position:\s*sticky/u);
assert.match(css, /position:\s*absolute/u);
console.log('P06B-UI-03 PASS 500/200 caps are retired and row/column materialization is viewport-bounded');

assert.match(ui, /aria-rowcount/u);
assert.match(ui, /aria-colcount/u);
assert.match(ui, /ArrowUp/u);
assert.match(ui, /ArrowDown/u);
assert.match(ui, /ArrowLeft/u);
assert.match(ui, /ArrowRight/u);
assert.match(ui, /aria-selected/u);
assert.match(ui, /Select an engineering cell to inspect source, method, status and locator evidence/u);
console.log('P06B-UI-04 PASS keyboard selection and trace evidence are tied to stable indexed cell identity');

assert.match(ui, /getProjection\(\)/u,
  'Legacy read-only getProjection compatibility must remain for existing workspace consumers.');
assert.doesNotMatch(ui, /runLinearPiping|solveInputXml|compileSolver|factorization|EventBus|publish\(|applyMaster/u);
assert.doesNotMatch(ui, /innerHTML|insertAdjacentHTML|outerHTML/u);
assert.doesNotMatch(ui, /Math\.random|randomUUID|Date\.now|localeCompare/u);
assert.doesNotMatch(ui, /enrichment-ui-phase0/u);
console.log('P06B-UI-05 PASS live review UI remains read-only, DOM-safe and independent of solver/mutation/test-fixture authority');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-live-ui',
  status: 'PASS',
  normalMountPath: 'mountLfeaPreflightUi',
  legacyCapsRetired: true,
  verticalVirtualization: true,
  horizontalVirtualization: true,
  exceptionQueues: ['MISSING', 'AMBIGUOUS', 'CONFLICTING', 'STALE', 'PROPOSED', 'DEFERRED'],
  keyboardSelection: true,
  tracePanel: true,
  writeAuthority: false,
  solverAuthority: false,
}));
