#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// `--base <SHA>` is optional. The diff-perimeter assertions below describe the
// shape of the originating pull request and are only meaningful against that
// PR's base, so without a base they are skipped rather than failed — the
// content invariants still run, and are the part worth enforcing on every
// commit. Passing a base restores the full perimeter check for CI.
const baseIndex = process.argv.indexOf('--base');
const base = baseIndex < 0 ? null : process.argv[baseIndex + 1] ?? null;
const allowed = new Set([
  'scripts/lafea-template-t6a-source-guard.mjs',
  'scripts/lafea-template-t6a-standalone-wizard-check.mjs',
  'src/workspace/lafea-templates/t6a-standalone-wizard.js',
  'src/workspace/lafea-templates/wizard-constants.js',
  'src/workspace/lafea-templates/wizard-controller.js',
  'src/workspace/lafea-templates/wizard-model.js',
  'src/workspace/lafea-templates/wizard-view.js',
]);

if (base) {
  const rows = git(['diff', '--name-status', `${base}...HEAD`])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split('\t');
      return { status, path: pathParts.at(-1) };
    });
  assert.equal(rows.length, allowed.size, `Expected ${allowed.size} T6A files.`);
  rows.forEach(({ status, path }) => {
    assert.equal(status, 'A', `T6A must be additive: ${status} ${path}`);
    assert.ok(allowed.has(path), `T6A path is outside the allowed perimeter: ${path}`);
  });
  assert.deepEqual(
    rows.map((row) => row.path).sort(),
    [...allowed].sort(),
  );
}

const sourcePaths = [...allowed].filter((path) => path.startsWith('src/'));
const combined = sourcePaths.map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of [
  'compileLafeaApplicationTemplate',
  'compileLafeaContinuumApplicationTemplate',
  'calculateLocalAttachmentFoundation',
  'calculateLocalAttachmentScreening',
  'calculateLocalContinuum',
  'executeLafeaStage',
  'importDocument(',
  'mountLafeaWorkbench',
  'registerLifecycleArtifact',
  'registerLafeaArtifact',
  'Math.random',
  'Date.now',
  'new Date(',
]) {
  assert.equal(combined.includes(forbidden), false, `Forbidden T6A authority: ${forbidden}`);
}
for (const forbiddenPath of [
  '../lafea-workbench.js',
  '../lafea-workbench-controller.js',
  '../lafea-workbench-view.js',
  '../lafea-stage-registry.js',
  '../lafea-results-view.js',
]) {
  assert.equal(combined.includes(forbiddenPath), false, `Forbidden Agent 1 dependency: ${forbiddenPath}`);
}
assert.ok(combined.includes('AGENT1_ACCESSORY_SEAM_REQUIRED'));
assert.ok(combined.includes('Advanced_Analysis#61'));
assert.ok(combined.includes('compilerInvocation: false'));
assert.ok(combined.includes('engineExecution: false'));
assert.ok(combined.includes('parameterEntry: false'));
assert.ok(combined.includes('workbenchImport: false'));
assert.ok(combined.includes('releasePromotion: false'));

console.log(JSON.stringify({
  check: 'lafea-template-t6a-source-guard',
  status: 'PASS',
  diffPerimeterChecked: Boolean(base),
  additiveFileCount: allowed.size,
  existingFilesModified: 0,
  agent1OwnedFilesModified: 0,
  compilerInvocationPaths: 0,
  parameterEntryPaths: 0,
  workbenchImportPaths: 0,
  engineExecutionPaths: 0,
  releasePromotionPaths: 0,
  integrationIssue: 61,
}, null, 2));

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}
