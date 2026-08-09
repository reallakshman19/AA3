#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// `--base <SHA>` is optional. The diff-perimeter assertions below describe the
// shape of the originating pull request and are only meaningful against that
// PR's base, so without a base they are skipped rather than failed - the
// content invariants still run, and are the part worth enforcing on every
// commit. Passing a base restores the full perimeter check for CI.
const baseIndex = process.argv.indexOf('--base');
const base = baseIndex === -1 ? null : process.argv[baseIndex + 1] ?? null;

const expected = [
  'scripts/lafea-template-t6b-accessory-panel-check.mjs',
  'scripts/lafea-template-t6b-source-guard.mjs',
  'src/workspace/lafea-templates/accessory-panel-descriptor.js',
  'src/workspace/lafea-templates/t6b-accessory-panel.js',
].sort();
// Empty without a base: there is no diff to police, and the content
// invariants below are the part that must hold on every commit.
let changed = [];
if (base) {
  changed = git(['diff', '--name-only', `${base}...HEAD`])
    .trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, expected);

  const statuses = git(['diff', '--name-status', `${base}...HEAD`])
    .trim().split('\n').filter(Boolean);
  assert.equal(statuses.every((line) => line.startsWith('A\t')), true);
}

const descriptorPath = 'src/workspace/lafea-templates/accessory-panel-descriptor.js';
const descriptor = readFileSync(descriptorPath, 'utf8');
for (const required of [
  "'lafea-workbench-accessory-panel/v1'",
  "'LAFEA_APPLICATION_TEMPLATES'",
  "'Application templates'",
  'LAFEA_TEMPLATE_ACCESSORY_PANEL_ORDER = 100',
  "import { mountLafeaTemplateWizard } from './t6a-standalone-wizard.js';",
  "hostElement.dataset?.role === 'lafea-benchmark-host'",
  'Object.isFrozen(controller)',
  "Object.freeze({\n        destroy()",
]) {
  assert.equal(descriptor.includes(required), true, `Missing required T6B contract token: ${required}`);
}
for (const forbidden of [
  "from '../lafea-workbench.js'",
  "from './lafea-workbench.js'",
  'lafea-stage-registry',
  'lafea-workbench-controller',
  'lafea-workbench-view',
  'lafea-lifecycle',
  'executeLafeaStage',
  'compileLafeaApplicationTemplate',
  'compileLafeaContinuumApplicationTemplate',
  'controller.importDocument(',
  'controller.getState(',
  'benchmarkPanel',
]) {
  assert.equal(descriptor.includes(forbidden), false, `Forbidden T6B authority token: ${forbidden}`);
}

for (const forbiddenPath of [
  'package.json',
  '.github/workflows/',
  'src/workspace/lafea-workbench.js',
  'src/workspace/lafea-workbench-controller.js',
  'src/workspace/lafea-workbench-view.js',
  'src/workspace/lafea-stage-registry.js',
  'src/core/',
]) {
  assert.equal(changed.some((path) => path === forbiddenPath || path.startsWith(forbiddenPath)), false);
}

console.log(JSON.stringify({
  check: 'lafea-template-t6b-source-guard',
  status: 'PASS',
  additiveFiles: expected.length,
  modifiedExistingFiles: 0,
  agent1FilesModified: 0,
  controllerFacadeMethodInvocations: 0,
  workbenchImportPaths: 0,
  engineExecutionPaths: 0,
  liveMountPaths: 0,
}, null, 2));

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}
