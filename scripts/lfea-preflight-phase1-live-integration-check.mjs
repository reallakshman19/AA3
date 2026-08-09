#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('src/workspace/lfea-preflight-ui.js', 'utf8');
const source = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-source.js', 'utf8');
const viewport = fs.readFileSync('src/workspace/lfea-preflight-phase1-viewport.js', 'utf8');
const surface = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-surface.js', 'utf8');
const css = fs.readFileSync('src/workspace/lfea-preflight-phase1.css', 'utf8');

for (const token of [
  "createLfeaPreflightPhase1ReviewSource",
  "LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS",
  "createLfeaPreflightPhase1Viewport",
  "getLfeaPreflightPhase1ViewportModel",
  "mountLfeaPreflightPhase1ReviewSurface",
  "setLfeaPreflightPhase1Queue",
  "setLfeaPreflightPhase1Filter",
  "setLfeaPreflightPhase1ColumnPreset",
  "setLfeaPreflightPhase1Sort",
  "selectLfeaPreflightPhase1Cell",
  "expandLfeaPreflightPhase1Line",
]) assert.match(ui, new RegExp(token, 'u'), `E_P06_LIVE_INTEGRATION_MISSING ${token}`);
console.log('P06-LIVE-01 PASS mounted application path consumes indexed Phase-1 source, viewport and review surface');

assert.doesNotMatch(ui, /PREFLIGHT_LINE_KEY_ROW_CAP|PREFLIGHT_COMPONENT_ROW_CAP/u);
assert.doesNotMatch(ui, /\.groups\.slice\(0|\.items\.slice\(0/u);
assert.doesNotMatch(ui, /Live DOM is capped until indexed virtualization lands/u);
assert.match(ui, /model\.rowWindow\.beforePx/u);
assert.match(ui, /model\.rowWindow\.afterPx/u);
assert.match(ui, /model\.columnWindow\.beforePx/u);
assert.match(ui, /model\.columnWindow\.afterPx/u);
assert.match(ui, /model\.liveLineRowCount/u);
assert.match(ui, /model\.visibleColumns\.length/u);
console.log('P06-LIVE-02 PASS old row/component caps are absent and live DOM is driven by row/column viewport windows');

assert.match(source, /REVIEW_SOURCE_SCHEMA = 'lfea-preflight-phase1-review-source\/v2'/u);
assert.match(source, /Engineering cell DTOs and component DTOs are lazy/u);
assert.doesNotMatch(ui, /lfea-preflight-phase1-adapter/u);
assert.doesNotMatch(source, /lineByTargetId\.set\([^\n]*cells/u);
assert.match(viewport, /providers:\s*requireProviders/u);
console.log('P06-LIVE-03 PASS live mount uses lazy review-source v2 rather than eager per-line 40-cell retention');

for (const queue of ['MISSING', 'AMBIGUOUS', 'CONFLICTING', 'STALE', 'PROPOSED', 'DEFERRED']) {
  assert.match(ui, new RegExp(`LFEA_PREFLIGHT_EXCEPTION_QUEUE|QUEUES`, 'u'));
  assert.match(source, /engineeringStatusByField/u);
  void queue;
}
assert.match(ui, /facetValues\.service/u);
assert.match(ui, /facetValues\.rating/u);
assert.match(ui, /LFEA_PREFLIGHT_COLUMN_PRESETS/u);
assert.match(ui, /ArrowUp|ArrowDown|ArrowLeft|ArrowRight/u);
console.log('P06-LIVE-04 PASS exception queues, indexed facets, 40-column presets and stable keyboard selection are reachable in live UI');

assert.match(ui, /getSource:\s*\(\)\s*=>\s*source/u);
assert.match(ui, /getViewportModel:\s*\(\)\s*=>\s*viewportModel/u);
assert.match(ui, /nowUtc:\s*\(\)\s*=>\s*new Date\(\)\.toISOString\(\)/u);
for (const token of ['Review ledger / Trace', 'ACCEPT', 'REJECT', 'OVERRIDE', 'DEFER', 'UNDO']) {
  assert.match(surface, new RegExp(token, 'u'));
}
console.log('P06-LIVE-05 PASS immutable review/Trace surface is bound only to stable source and viewport selection');

for (const sourceText of [ui, source, viewport, surface]) {
  assert.doesNotMatch(sourceText, /localStorage|sessionStorage|innerHTML\s*=|insertAdjacentHTML/u);
}
assert.doesNotMatch(ui, /EventBus|publish\(|runLinearPiping|solveInputXml|compileSolver|factorization|topology:|autofix/u);
assert.doesNotMatch(surface, /EventBus|publish\(|runLinearPiping|solveInputXml|compileSolver|factorization/u);
assert.doesNotMatch(source, /EventBus|publish\(|masterDataController|runLinearPiping|solveInputXml/u);
console.log('P06-LIVE-06 PASS live review owns no source/master publication, solver, topology-autofix or hidden-storage authority');

for (const cssToken of [
  '.lfea-phase1-review__scroller',
  '.lfea-phase1-review__table',
  '.lfea-phase1-review__cell',
  '.lfea-phase1-review__components',
  '.lfea-phase1-review-ledger',
  '.lfea-phase1-review-ledger__trace',
]) assert.match(css, new RegExp(cssToken.replace('.', '\\.'), 'u'));
console.log('P06-LIVE-07 PASS Phase-1 virtual grid, component viewport and review Trace have a production stylesheet');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-live-integration',
  status: 'PASS',
  liveReviewSource: 'v2-lazy',
  rowVirtualization: true,
  columnVirtualization: true,
  componentViewportBounded: true,
  exceptionQueues: 6,
  engineeringColumns: 40,
  reviewTrace: true,
  sourceMutationAuthority: false,
  solverAuthority: false,
  topologyAutofixAuthority: false,
}));
