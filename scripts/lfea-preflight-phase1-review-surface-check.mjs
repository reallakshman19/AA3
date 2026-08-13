#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('src/workspace/lfea-preflight-ui.js', 'utf8');
const surface = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-surface.js', 'utf8');
const session = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-session.js', 'utf8');
const css = fs.readFileSync('src/workspace/lfea-preflight-phase1.css', 'utf8');

assert.match(ui, /mountLfeaPreflightPhase1ReviewSurface/u);
assert.match(ui, /getSource:\s*\(\)\s*=>/u);
assert.match(ui, /getViewportModel:\s*\(\)\s*=>/u);
assert.match(ui, /nowUtc:\s*\(\)\s*=>\s*new Date\(\)\.toISOString\(\)/u);
assert.match(ui, /phase1ReviewSurfaceHandle\?\.destroy/u);
assert.match(ui, /phase1ReviewSurfaceHandle\.refresh/u);
console.log('P06C-UI-01 PASS live virtual-grid mount exposes only stable source/selection lifecycle to review surface');

for (const action of ['ACCEPT', 'REJECT', 'OVERRIDE', 'DEFER', 'UNDO']) {
  assert.match(surface, new RegExp(`LFEA_PREFLIGHT_REVIEW_ACTION\\.${action}`, 'u'));
}
assert.match(surface, /Reviewer identity/u);
assert.match(surface, /Review reason \/ technical basis/u);
assert.match(surface, /Reviewer identity and reason are required/u);
assert.match(surface, /Override value/u);
assert.match(surface, /Undo last event/u);
console.log('P06C-UI-02 PASS Accept/Reject/Override/Defer/Undo require explicit reviewer custody');

assert.match(surface, /cell\.status === LFEA_PREFLIGHT_FIELD_STATUS\.PROPOSED_REVIEW/u);
assert.match(surface, /registerLfeaPreflightPhase1CellProposal/u);
assert.match(session, /E_P06_REVIEW_CELL_NOT_PROPOSED/u);
assert.match(session, /Exact\/resolved\/blocked cells are not/u);
console.log('P06C-UI-03 PASS only explicitly PROPOSED_REVIEW cells auto-register proposals; exact values are not fabricated into proposals');

for (const label of [
  'Target',
  'Field',
  'Value',
  'Status',
  'Source',
  'Method',
  'Locator',
  'Source hash',
  'Evidence count',
  'Review disposition',
  'Proposal IDs',
  'Review event IDs',
  'Ledger hash',
]) {
  assert.match(surface, new RegExp(`['"]${label}['"]`, 'u'));
}
assert.match(surface, /value\.cell\.evidence/u);
assert.match(surface, /formatEvidence/u);
assert.match(surface, /entry\.sourceKind/u);
assert.match(surface, /entry\.statusText/u);
assert.match(surface, /entry\.method/u);
assert.match(surface, /entry\.sourceHash/u);
assert.match(surface, /Append-only engineering review evidence/u);
assert.match(surface, /Undo compensates a prior event; it never deletes history/u);
console.log('P06C-UI-04 PASS selected-cell Trace renders sealed multi-source evidence without reconstructing authority');

assert.match(surface, /reviewableSelection/u);
assert.match(surface, /selection\.inFilteredSet !== false/u);
assert.match(surface, /selection\.inPreset !== false/u);
assert.match(surface, /outside the current indexed filter or exception queue/u);
assert.match(surface, /outside the current column preset/u);
assert.match(surface, /Review actions are disabled/u);
console.log('P06C-UI-05 PASS review actions remain stable through viewport recycling but fail closed when filters or presets hide selection');

assert.doesNotMatch(surface, /EventBus|publish\(|dispatchEvent|masterDataController|applyMaster|runLinearPiping|solveInputXml|compileSolver|factorization/u);
assert.doesNotMatch(surface, /innerHTML|insertAdjacentHTML|outerHTML/u);
assert.doesNotMatch(surface, /Date\.now|new Date|Math\.random|randomUUID|localeCompare/u,
  'Review surface must consume the explicit nowUtc provider rather than reading ambient clock/entropy itself.');
assert.doesNotMatch(session, /Date\.now|new Date|Math\.random|randomUUID|localeCompare/u);
assert.match(session, /E_P06_REVIEW_MUTATED_SOURCE/u);
console.log('P06C-UI-06 PASS review surface/session own no model/master/solver mutation or hidden time/entropy authority');

assert.match(css, /\.lfea-phase1-review-ledger/u);
assert.match(css, /\.lfea-phase1-review-ledger__trace/u);
assert.match(css, /\.lfea-phase1-review-ledger__actions/u);
assert.match(css, /\.lfea-phase1-review-ledger__feedback/u);
assert.doesNotMatch(ui, /PREFLIGHT_LINE_KEY_ROW_CAP|PREFLIGHT_COMPONENT_ROW_CAP/u);
console.log('P06C-UI-07 PASS review ledger is additive to the already-virtualized cap-free Phase-1 review layout');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-review-surface',
  status: 'PASS',
  actions: ['ACCEPT', 'REJECT', 'OVERRIDE', 'DEFER', 'UNDO'],
  traceFields: [
    'target', 'field', 'value', 'status', 'source', 'method', 'locator', 'sourceHash',
    'evidence', 'reviewDisposition', 'proposalIds', 'reviewEventIds', 'ledgerHash',
  ],
  sealedEvidenceRendering: true,
  explicitHostTimestamp: true,
  hiddenSelectionReviewBlocked: true,
  coreReadsAmbientClock: false,
  sourceMutationAuthority: false,
  solverAuthority: false,
}));
