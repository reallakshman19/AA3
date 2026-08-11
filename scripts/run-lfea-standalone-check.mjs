import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

runNode('scripts/lfea-standalone-boundary-self-test.mjs');
runNode('scripts/lfea-linear-solver-neutral-dependency-check.mjs');
runNode('scripts/lfea-standalone-boundary-check.mjs');
runNode('scripts/lfea-standalone-e2e-source-check.mjs');
runNode('scripts/lfea-physical-absence-source-check.mjs');
runNode('scripts/linear-piping-inputxml-source-workflow-check.mjs');
runNode('scripts/lfea-standalone-governed-journey-check.mjs');
runNode('scripts/lfea-standalone-native-execution-check.mjs');
runNode('scripts/lfea-standalone-native-production-solve-check.mjs');
runNode('scripts/lfea-standalone-native-results-check.mjs');
runNode('scripts/lfea-standalone-native-history-check.mjs');
runNode('scripts/lfea-standalone-native-comparison-check.mjs');
runNode('scripts/lfea-standalone-persistence-check.mjs');
runNode('scripts/lfea-standalone-publication-readiness-check.mjs');
runNode('scripts/lfea-standalone-native-verification-check.mjs');
runNode('scripts/lfea-workbench-check.mjs');
runNode('node_modules/vite/bin/vite.js', ['build', '--config', 'vite.lfea.config.js']);
runNode('scripts/lfea-standalone-build-artifact-check.mjs');

console.log('LFEA standalone qualification PASS.');

function runNode(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`Standalone LFEA qualification step failed: ${scriptPath}`);
  }
}
