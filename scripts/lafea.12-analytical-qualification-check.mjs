import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const LAFEA12_ANALYTICAL_QUALIFICATION_CHECKS = Object.freeze([
  'lafea.1-contract-check.mjs',
  'lafea.2-contract-check.mjs',
  'lafea.12-pressure-thrust-custody-check.mjs',
  'lafea.12-independent-oracle-check.mjs',
  'lafea.12-analytical-result-authority-check.mjs',
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

for (const scriptName of LAFEA12_ANALYTICAL_QUALIFICATION_CHECKS) {
  const scriptPath = path.join(scriptDir, scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(scriptDir, '..'),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`LAFEA.1/.2 analytical qualification failed at ${scriptName} with exit ${result.status}.`);
    error.code = 'LAFEA12_ANALYTICAL_QUALIFICATION_FAILED';
    error.failedCheck = scriptName;
    error.exitCode = result.status;
    throw error;
  }
}

console.log('LAFEA.1/.2 bounded analytical qualification aggregate passed.');
