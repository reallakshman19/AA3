#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = Object.freeze([
  'scripts/lafea-continuum-solver-model-check.mjs',
  'scripts/lafea-continuum-compiled-input-check.mjs',
  'scripts/lafea-continuum-compiled-execution-check.mjs',
  'scripts/lafea-continuum-compiled-load-parity-check.mjs',
]);
const failures = [];

for (const check of checks) {
  const result = spawnSync(process.execPath, [path.join(ROOT, check)], {
    cwd: ROOT, encoding: 'utf8', stdio: 'inherit',
  });
  if (result.error) failures.push({ check, code: 'CHECK_SPAWN_FAILED', message: result.error.message });
  else if (result.status !== 0) failures.push({ check, code: 'CHECK_FAILED', status: result.status });
}

const report = Object.freeze({
  schema: 'lafea-stage12b-parity-gate-report/v1',
  check: 'lafea-stage12b-parity-gate',
  status: failures.length ? 'FAIL' : 'PASS',
  exactHead: gitHead(),
  stageId: 'LAFEA.3',
  executedChecks: checks,
  failures,
  solverModelCompilationIncluded: true,
  compiledInputLoweringIncluded: true,
  concentratedLoadAndRestraintParityIncluded: true,
  tractionPressureBodyForceImposedParityIncluded: true,
  existingNumericalKernelReused: true,
  authoritativeRunChanged: false,
  lifecycleExecutionPublished: false,
  releaseAuthorityChanged: false,
});
console.log(JSON.stringify(report));
if (failures.length) process.exit(1);

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}
