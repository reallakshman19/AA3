import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
  process.execPath,
  [
    'scripts/lfea-standalone-boundary-check.mjs',
    '--entry',
    'scripts/fixtures/lfea-standalone-forbidden-import.js',
  ],
  {
    cwd: ROOT,
    encoding: 'utf8',
  },
);

if (result.error) throw result.error;
if (result.status === 0) {
  throw new Error('Standalone boundary self-test expected the forbidden fixture to fail.');
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
if (!output.includes('Forbidden LAFEA/legacy dependency')) {
  throw new Error(`Standalone boundary self-test failed for the wrong reason:\n${output}`);
}

console.log('LFEA standalone boundary self-test PASS (forbidden dependency rejected).');
