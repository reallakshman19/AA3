#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const checks = Array.from({ length: 17 }, (_, index) =>
  path.join(here, `lafea-mesh-workspace-v3-batch${index + 1}-check.mjs`));
const results = [];
for (const check of checks) {
  const run = spawnSync(process.execPath, [check], { encoding: 'utf8' });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  results.push({ check: path.basename(check), status: run.status });
  if (run.status !== 0) {
    console.error(JSON.stringify({
      check: 'lafea-mesh-workspace-v3', status: 'FAIL', failed: path.basename(check), results,
    }));
    process.exit(run.status ?? 1);
  }
}
console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3',
  status: 'PASS',
  batchCount: checks.length,
  results,
}));
