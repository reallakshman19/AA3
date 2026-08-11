import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

runNode('scripts/lfea-standalone-boundary-self-test.mjs');
runNode('scripts/lfea-standalone-boundary-check.mjs');
runNode('scripts/linear-piping-inputxml-source-workflow-check.mjs');
runNode('scripts/lfea-standalone-governed-journey-check.mjs');
runNode('scripts/lfea-standalone-native-execution-check.mjs');
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
