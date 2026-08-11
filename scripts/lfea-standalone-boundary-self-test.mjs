import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const physicalAbsence = process.env.LFEA_PHYSICAL_ABSENCE_REHEARSAL === '1';

assertForbiddenFixture('scripts/fixtures/lfea-standalone-forbidden-legacy-import.js');

const lafeaWitness = path.join(ROOT, 'src/workspace/lafea-workbench-controller.js');
if (physicalAbsence) {
  if (fs.existsSync(lafeaWitness)) {
    throw new Error('Physical-absence boundary self-test expected the LAFEA runtime witness to be absent.');
  }
  console.log('LFEA standalone boundary self-test PASS (LAFEA witness physically absent; legacy dependency rejected).');
} else {
  if (!fs.existsSync(lafeaWitness)) {
    throw new Error('Standalone boundary self-test requires the LAFEA runtime witness outside physical-absence rehearsal.');
  }
  assertForbiddenFixture('scripts/fixtures/lfea-standalone-forbidden-import.js');
  console.log('LFEA standalone boundary self-test PASS (LAFEA and legacy forbidden dependencies rejected).');
}

function assertForbiddenFixture(entry) {
  const result = spawnSync(
    process.execPath,
    ['scripts/lfea-standalone-boundary-check.mjs', '--entry', entry],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  if (result.status === 0) {
    throw new Error(`Standalone boundary self-test expected ${entry} to fail.`);
  }
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (!output.includes('Forbidden LAFEA/legacy dependency')) {
    throw new Error(`Standalone boundary self-test failed for the wrong reason (${entry}):\n${output}`);
  }
}
