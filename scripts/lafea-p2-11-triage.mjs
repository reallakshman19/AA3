#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const scripts = [
  'lafea-accessory-panel-source-guard.mjs',
  'lafea-nb-t4b-recovery-render-check.mjs',
  'lafea-nb-t6e-evidence-handoff-review-check.mjs',
  'lafea-nb-t6e-workbench-display-handoff-check.mjs',
  'lafea-nb-t6f-read-only-review-session-check.mjs',
  'lafea-nonbucket-scope-guard.mjs',
  'lafea-template-t6a-source-guard.mjs',
  'lafea-template-t6b-source-guard.mjs',
  'lafea-template-t6c-source-guard.mjs',
  'lafea-template-t7a-source-guard.mjs',
  'lafea-template-t7b-source-guard.mjs',
  'lafea-template-t7c-source-guard.mjs',
  'lafea-u2b-editor-store-check.mjs',
];

const rows = scripts.map((script) => {
  const path = `scripts/${script}`;
  if (!fs.existsSync(path)) return { script, status: 'MISSING', exitCode: null, tail: 'script missing' };
  const run = spawnSync(process.execPath, [path], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  const combined = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim();
  return {
    script,
    status: run.status === 0 ? 'PASS' : 'FAIL',
    exitCode: run.status,
    signal: run.signal ?? null,
    tail: combined.split(/\r?\n/u).slice(-12).join('\n'),
  };
});
const report = {
  schema: 'lafea-p2-11-triage/v1',
  total: rows.length,
  passed: rows.filter((row) => row.status === 'PASS').length,
  failed: rows.filter((row) => row.status === 'FAIL').length,
  missing: rows.filter((row) => row.status === 'MISSING').length,
  rows,
};
fs.writeFileSync('lafea-p2-11-triage.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
