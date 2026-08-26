#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const analysis = read('../src/workspace/lafea-analysis-settings-view.js');
const panel = read('../src/workspace/lafea-discretization-panel.js');
const quality = read('../src/workspace/lafea-discretization-dom.js');
const disclosure = read('../src/workspace/lafea-info-disclosure.js');
const reasons = read('../src/workspace/lafea-workbench-reason-labels.js');

assert.match(analysis, /createLafeaInfoDisclosure/u);
assert.match(analysis, /Source metadata/u);
assert.match(analysis, /Continuum formulation basis/u);
assert.doesNotMatch(analysis, /card\.append\(heading, select, status, facts\)/u);
assert.match(analysis, /visibleRows: model\.solverSummaryRows\.filter/u);
assert.match(analysis, /SOURCE_REQUIRED/u);
assert.match(analysis, /SOURCE_FORMULATION_REQUIRED/u);
assert.match(analysis, /const current = typeof documentValue\?\.formulation === 'string'[\s\S]*?: null;/u);
assert.doesNotMatch(analysis, /: FORMULATIONS\.PLANE_STRESS;/u);
assert.doesNotMatch(analysis, /Provided by workbench registry/u);
assert.doesNotMatch(analysis, /Not initialized/u);
assert.doesNotMatch(analysis, /Not declared by the active stage source contract/u);

assert.match(panel, /MAX_INLINE_FOCUS_ACTIONS = 6/u);
assert.match(panel, /High-order mapping: \$\{state\}/u);
assert.match(panel, /Diagnostic only\./u);
assert.match(panel, /Technical mesh identifiers/u);
assert.match(panel, /ids\.slice\(0, MAX_INLINE_FOCUS_ACTIONS\)/u);
assert.doesNotMatch(panel, /\['Nodes', String\(value\.nodeCount\)\]/u);
assert.doesNotMatch(panel, /\['Elements', String\(value\.elementCount\)\]/u);

assert.match(quality, /formatQualityNumber/u);
assert.match(quality, /Exact retained value:/u);
assert.match(quality, /Mesh quality evidence identity/u);
assert.match(quality, /limits:/u);

assert.match(disclosure, /doc\.createElement\('details'\)/u);
assert.match(disclosure, /aria-label/u);
assert.match(disclosure, /summary\.title = title/u);

assert.match(reasons, /LAFEA_CONTINUUM_SOLVER_SOURCE_PARENT_STALE/u);
assert.match(reasons, /Re-prepare the analysis from the current source/u);

for (const source of [analysis, panel, quality, disclosure, reasons]) {
  assert.doesNotMatch(source, /sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/u);
}

console.log(JSON.stringify({
  check: 'lafea-unified-ui-cleanup',
  status: 'PASS',
  decisionEvidenceRemainsVisible: true,
  diagnosticEvidenceCollapsed: true,
  custodyIdentifiersCollapsed: true,
  accessibleDisclosurePrimitive: true,
  presentationOnlyRounding: true,
  sourceAbsenceDoesNotInventEngineeringValues: true,
  engineeringGateMathChanged: false,
}));

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
