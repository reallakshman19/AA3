#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const standalone = [
  'lafea-accessory-panel-source-guard.mjs',
  'lafea-nb-t4b-recovery-render-check.mjs',
  'lafea-nb-t6e-evidence-handoff-review-check.mjs',
  'lafea-nb-t6e-workbench-display-handoff-check.mjs',
  'lafea-nb-t6f-read-only-review-session-check.mjs',
  'lafea-nonbucket-scope-guard.mjs',
  'lafea-u2b-editor-store-check.mjs',
];

const contextBound = [
  'lafea-template-t6a-source-guard.mjs',
  'lafea-template-t6b-source-guard.mjs',
  'lafea-template-t6c-source-guard.mjs',
  'lafea-template-t7a-source-guard.mjs',
  'lafea-template-t7b-source-guard.mjs',
  'lafea-template-t7c-source-guard.mjs',
];

const standaloneRows = standalone.map(runStandalone);
const contextRows = contextBound.map(classifyContextBound);

for (const row of standaloneRows) {
  assert.equal(row.status, 'PASS', `${row.script} failed:\n${row.tail}`);
}
for (const row of contextRows) {
  assert.equal(row.status, 'CONTEXT_BOUND', `${row.script} is no longer an exact-diff source guard.`);
}

const report = {
  schema: 'lafea-p2-11-check-classification/v1',
  totalIssueEntries: standalone.length + contextBound.length,
  standaloneCount: standalone.length,
  standalonePassed: standaloneRows.filter((row) => row.status === 'PASS').length,
  standaloneFailed: standaloneRows.filter((row) => row.status !== 'PASS').length,
  contextBoundCount: contextBound.length,
  contextBoundClassified: contextRows.filter((row) => row.status === 'CONTEXT_BOUND').length,
  standaloneRows,
  contextRows,
};

console.log(JSON.stringify(report, null, 2));

function runStandalone(script) {
  const path = `scripts/${script}`;
  assert.equal(fs.existsSync(path), true, `Missing standalone P2-11 check: ${path}`);
  const run = spawnSync(process.execPath, [path], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
  });
  const combined = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim();
  return {
    script,
    classification: 'STANDALONE_HEALTH_CHECK',
    status: run.status === 0 ? 'PASS' : 'FAIL',
    exitCode: run.status,
    signal: run.signal ?? null,
    tail: combined.split(/\r?\n/u).slice(-12).join('\n'),
  };
}

/**
 * These six scripts are deliberately not standalone health checks. They take
 * an explicit base ref and assert an exact historical PR write set. Their
 * implementations use three equivalent perimeter idioms, so classify the
 * semantics rather than one brittle source-code spelling:
 *
 * 1. T6A: `allowed` Set + exact row count/path equality;
 * 2. T6B/T6C/T7C: `changed` deep-equals `expected`;
 * 3. T7A/T7B: `samePaths(changed, acceptedWriteSet)` with explicit failure
 *    for every other write set.
 */
function classifyContextBound(script) {
  const path = `scripts/${script}`;
  assert.equal(fs.existsSync(path), true, `Missing context-bound P2-11 guard: ${path}`);
  const source = fs.readFileSync(path, 'utf8');
  const requiresBase = source.includes("process.argv.indexOf('--base')")
    && /--base\s+<[^>]+>/u.test(source);
  const comparesPrDelta = source.includes('${base}...HEAD')
    && /['"]diff['"]/u.test(source)
    && /['"]--name-(?:only|status)['"]/u.test(source);
  const exactExpectedSet = /assert\.deepEqual\(\s*changed\s*,\s*expected\s*\)/u.test(source);
  const exactAllowedSet = source.includes('const allowed = new Set(')
    && /assert\.equal\(\s*rows\.length\s*,\s*allowed\.size/u.test(source)
    && /assert\.deepEqual\([\s\S]*?\[\.\.\.allowed\]\.sort\(\)/u.test(source);
  const exactAcceptedAlternatives = /samePaths\(changed\s*,/u.test(source)
    && /assert\.fail\(`Unexpected T7[AB] write set:/u.test(source);
  const enforcesExactPerimeter = exactExpectedSet
    || exactAllowedSet
    || exactAcceptedAlternatives;
  return {
    script,
    classification: 'CONTEXT_BOUND_EXACT_DIFF_GUARD',
    status: requiresBase && comparesPrDelta && enforcesExactPerimeter
      ? 'CONTEXT_BOUND' : 'INVALID_CLASSIFICATION',
    evidence: {
      requiresBase,
      comparesPrDelta,
      exactExpectedSet,
      exactAllowedSet,
      exactAcceptedAlternatives,
    },
    reason: 'Requires an explicit base SHA and validates an exact historical PR file perimeter; it is not a clean-main health check.',
  };
}
