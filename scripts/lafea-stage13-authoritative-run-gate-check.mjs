#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  'scripts/lafea-stage12b-parity-gate-check.mjs',
  'scripts/lafea-continuum-authoritative-run-check.mjs',
];
const results = [];
for (const check of checks) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(root, check)], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    results.push({ check, status: 'PASS', output: stdout.trim().split('\n').at(-1) });
  } catch (error) {
    results.push({
      check,
      status: 'FAIL',
      stdout: String(error.stdout ?? '').trim(),
      stderr: String(error.stderr ?? '').trim(),
    });
  }
}
const failures = results.filter((row) => row.status !== 'PASS');
console.log(JSON.stringify({
  schema: 'lafea-stage13-authoritative-run-gate/v1',
  status: failures.length ? 'FAIL' : 'PASS',
  stageId: 'LAFEA.3',
  results,
  failures: failures.map((row) => row.check),
  authoritativeRunPromoted: failures.length === 0,
  lifecycleExecutionRecoveryRequired: true,
  explicitPreflightRequired: true,
  releaseAuthorityChanged: false,
}));
if (failures.length) process.exitCode = 1;
