import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assertAllowedFixture('scripts/fixtures/lafea-stage16-allowed-entry.js');
assertForbiddenFixture(
  'scripts/fixtures/lafea-stage16-forbidden-lfea-import.js',
  'FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY',
);
assertForbiddenFixture(
  'scripts/fixtures/lafea-stage16-forbidden-combined-import.js',
  'FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY',
);
assertForbiddenFixture(
  'scripts/fixtures/lafea-stage16-forbidden-lfea-topic.js',
  'LFEA_RUNTIME_OR_TOPIC_REFERENCE',
);
assertForbiddenFixture(
  'scripts/fixtures/lafea-stage16-forbidden-storage.js',
  'CROSS_PRODUCT_STORAGE_KEY',
);

console.log(JSON.stringify({
  schema: 'lafea-standalone-boundary-self-test/v1',
  status: 'PASS',
  roadmap: 'A16',
  allowedFixtureAccepted: true,
  forbiddenLfeaImportRejected: true,
  forbiddenCombinedImportRejected: true,
  forbiddenLfeaTopicRejected: true,
  crossProductStorageKeyRejected: true,
}));

function run(entry) {
  const result = spawnSync(
    process.execPath,
    ['scripts/lafea-standalone-boundary-check.mjs', '--entry', entry],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  return result;
}

function assertAllowedFixture(entry) {
  const result = run(entry);
  if (result.status !== 0) {
    throw new Error(`Standalone boundary self-test expected ${entry} to pass:\n${output(result)}`);
  }
}

function assertForbiddenFixture(entry, reason) {
  const result = run(entry);
  if (result.status === 0) {
    throw new Error(`Standalone boundary self-test expected ${entry} to fail.`);
  }
  if (!output(result).includes(reason)) {
    throw new Error(`Standalone boundary self-test failed for the wrong reason (${entry}):\n${output(result)}`);
  }
}

function output(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}
