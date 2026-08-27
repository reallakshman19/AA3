#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOAD_CALC_PRIMARY_WORKFLOW_V1,
  LOAD_CALC_PROMOTED_ADVANCED_TABS_V1,
  isRoutineRunReady,
  renderLoadCalcTopologyPane,
} from '../src/workspace/load-calc-current-system-view.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.deepEqual(
  LOAD_CALC_PRIMARY_WORKFLOW_V1.map((row) => [row.id, row.label, row.tab]),
  [
    ['import', 'Import', null],
    ['topology', 'Check Topology', 'topology'],
    ['defaults', 'Calculation Defaults', 'project-data'],
    ['run', 'Run', 'verify'],
    ['results', 'Results', 'loads'],
  ],
  'Issue #1321 normal Load Calc workflow must contain exactly five primary product steps.',
);
assert.equal(LOAD_CALC_PRIMARY_WORKFLOW_V1.length, 5);
assert.deepEqual(
  LOAD_CALC_PROMOTED_ADVANCED_TABS_V1.map((row) => [row.tab, row.label]),
  [
    ['masters', 'Master Data'],
    ['preflight', 'Input Check'],
  ],
  'Former Masters/Input Check primary gates must remain reachable as Advanced engineering-input diagnostics.',
);

assert.equal(isRoutineRunReady({
  error: null,
  commonInput: null,
  report: {
    packageState: 'READY',
    readyMethodIds: ['WEIGHT_AND_GRAVITY'],
    blockedMethodIds: [],
  },
}), true, 'five-step UX must not reintroduce a manual seal prerequisite');
assert.equal(isRoutineRunReady({
  error: null,
  commonInput: null,
  report: {
    packageState: 'PARTIALLY_READY',
    readyMethodIds: ['WEIGHT_AND_GRAVITY'],
    blockedMethodIds: ['THERMAL_FREE_DISPLACEMENT'],
  },
}), false, 'five-step UX must not weaken READY-only routine Run eligibility');

const topologyContainer = { innerHTML: '' };
renderLoadCalcTopologyPane(
  topologyContainer,
  { status: 'READY', blockers: [], summary: { physicalLocationCount: 1 } },
  { status: 'READY', blockers: [], summary: { routeCount: 1 } },
  {
    state: 'READY',
    blockingFindings: [],
    reviewFindings: [],
    findings: [],
    blockingIssueCount: 0,
    reviewIssueCount: 0,
    skippedIssueCount: 0,
    autoFix: {
      certifiedExactGapCount: 0,
      exactToleranceMm: 1.5,
      exactGapIssueIds: [],
      nearGapIssueIds: [],
    },
  },
  '',
);
assert.match(topologyContainer.innerHTML, /<h2>Check Topology<\/h2>/u);
assert.match(topologyContainer.innerHTML, /Continue to Calculation Defaults/u);
assert.doesNotMatch(topologyContainer.innerHTML, /Continue to Project Data/u);

const wrapperSource = await readFile(
  path.join(root, 'src/workspace/load-calc-current-system-view.js'),
  'utf8',
);
assert.match(wrapperSource, /LOAD_CALC_PRIMARY_WORKFLOW_V1/u);
assert.match(wrapperSource, /LOAD_CALC_PROMOTED_ADVANCED_TABS_V1/u);
assert.match(wrapperSource, /legacyButton\.remove\(\)/u,
  'former Masters/Input Check numbered buttons must be removed from the product row');
assert.match(wrapperSource, /insertAdjacentHTML\('afterbegin', promotedAdvancedGroupMarkup/u,
  'secondary engineering-input tabs must be inserted into Advanced tools');
assert.match(wrapperSource, /Advanced → Input Check/u,
  'blocked Run guidance must point to the secondary Input Check location');
assert.doesNotMatch(wrapperSource, /CURRENT_COMMON_INPUT_CALCULATE_REQUESTED/u,
  'presentation convergence must not own or duplicate Run execution events');

const controllerSource = await readFile(
  path.join(root, 'src/workspace/load-calc-consumer-controller.js'),
  'utf8',
);
for (const requiredDiagnostic of [
  "./master-data-ui.js",
  "./empirical-preflight-view.js",
]) {
  assert.equal(controllerSource.includes(requiredDiagnostic), true,
    `${requiredDiagnostic} must remain mounted after five-step convergence.`);
}
assert.match(controllerSource, /CURRENT_COMMON_INPUT_CALCULATE_REQUESTED/u,
  'governed routine Run execution must remain controller/event-owned');

const legacySource = await readFile(
  path.join(root, 'src/workspace/load-calc-consumer-view.js'),
  'utf8',
);
assert.match(legacySource, /Import Masters/u,
  'legacy shell compatibility source is intentionally retained behind the product wrapper');
assert.match(legacySource, /Validate Input/u,
  'legacy Input Check compatibility source is intentionally retained behind the product wrapper');

console.log(JSON.stringify({
  status: 'PASS',
  primaryWorkflow: LOAD_CALC_PRIMARY_WORKFLOW_V1.map((row) => row.label),
  promotedAdvancedTabs: LOAD_CALC_PROMOTED_ADVANCED_TABS_V1.map((row) => row.tab),
  readyReportRunStillEligible: true,
  partialReadyRunStillBlocked: true,
  topologyContinuesToCalculationDefaults: true,
  controllerEngineeringSemanticsUnchanged: true,
}, null, 2));
