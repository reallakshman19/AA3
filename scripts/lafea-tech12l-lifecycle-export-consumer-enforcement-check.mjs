#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8');

const b7d = read('src/workspace/lafea-b7d-workbench-display-handoff.js');
const panel = read('src/workspace/lafea-selected-pilot-review-panel.js');
const authority = read('src/workspace/lafea-workbench-lifecycle-export-authority.js');
const activation = read('src/workspace/lafea4-parent-normal-production-activation.js');

for (const [label, source, tokens] of [
  ['B7D', b7d, [
    'validateLafeaWorkbenchLifecycleExportAuthority',
    'requireV2CurrentAuthority(value)',
    "value.schema !== 'lafea-workbench-lifecycle-export/v2'",
    'currentResultAccepted !== true',
    'LAFEA_NB_T6E_EXPORT_CURRENT_RESULT_NOT_ACCEPTED',
  ]],
  ['REVIEW_PANEL', panel, [
    'validateLafeaWorkbenchLifecycleExportAuthority',
    'LIFECYCLE_EXPORT_SCHEMAS',
    "'lafea-workbench-lifecycle-export/v2'",
    'requireV2CurrentAuthority(exported)',
    'currentResultAccepted !== true',
    'LAFEA_NB_T6G_EXPORT_CURRENT_RESULT_NOT_ACCEPTED',
  ]],
]) {
  for (const token of tokens) assert.ok(source.includes(token), `${label}: ${token}`);
}

assert.ok(authority.includes('lifecycleArtifactStatusIsRetainedEvidenceOnly: true'));
assert.ok(authority.includes('retainedExecutionQualificationGrantsCurrentAuthority: false'));
assert.ok(authority.includes('exportGrantsCurrentResultAuthority: false'));
assert.match(activation, /LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD\s*=\s*null/u);

// Positive compatibility is qualified by the existing focused integrations.
// B7D uses a real orchestrator controller and therefore exercises the v2 path;
// the selected-pilot test preserves legacy v1 compatibility.
const integrations = [
  'scripts/lafea-u3b-live-lifecycle-check.mjs',
  'scripts/lafea-nb-t6e-workbench-display-handoff-check.mjs',
  'scripts/lafea-nb-t6g-read-only-review-panel-check.mjs',
];
const integrationResults = [];
for (const script of integrations) {
  const output = execFileSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const lastLine = output.split(/\r?\n/u).filter(Boolean).at(-1);
  const parsed = JSON.parse(lastLine);
  assert.equal(parsed.status, 'PASS', script);
  integrationResults.push({ script, status: parsed.status });
}

const planText = read('validation/lafea-independent-qualification/plan-v1.json');
const plan = JSON.parse(planText);
assert.equal(`${JSON.stringify(plan, null, 2)}\n`, planText);
const rows = plan.steps.filter((row) => row.id === 'TECH12L_LIFECYCLE_EXPORT_CONSUMER_ENFORCEMENT');
assert.equal(rows.length, 1);
assert.equal(rows[0].classification, 'ENGINEERING');
assert.equal(rows[0].required, true);
assert.equal(rows[0].executable, 'node');
assert.deepEqual(rows[0].args, [
  'scripts/lafea-tech12l-lifecycle-export-consumer-enforcement-check.mjs',
]);
const ids = plan.steps.map((row) => row.id);
assert.ok(ids.indexOf('TECH12K_LIFECYCLE_EXPORT_CURRENT_AUTHORITY')
  < ids.indexOf('TECH12L_LIFECYCLE_EXPORT_CONSUMER_ENFORCEMENT'));
assert.ok(ids.indexOf('TECH12L_LIFECYCLE_EXPORT_CONSUMER_ENFORCEMENT')
  < ids.indexOf('TECH7_GRADED_REFINEMENT_EXECUTOR'));

const definition = JSON.parse(read(
  'validation/lafea4-refinement/parent-normal-lifecycle-export-consumer-enforcement-v1.json',
));
assert.equal(definition.currentTrustRoot, 'NULL');
assert.equal(definition.v2ConsumersMustRequireCurrentResultAccepted, true);
assert.equal(definition.legacyV1CompatibilityRetained, true);

console.log(JSON.stringify({
  check: 'lafea-tech12l-lifecycle-export-consumer-enforcement',
  status: 'PASS',
  currentTrustRoot: 'NULL',
  v2Consumers: ['B7D_WORKBENCH_DISPLAY_HANDOFF', 'SELECTED_PILOT_REVIEW_PANEL'],
  v2CurrentResultAcceptanceRequired: true,
  legacyV1CompatibilityRetained: true,
  integrations: integrationResults,
  productionBindingAuthorized: false,
  releaseQualified: false,
}, null, 2));
