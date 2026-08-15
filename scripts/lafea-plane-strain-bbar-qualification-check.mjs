#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['freeze-and-independent-lame-oracle', 'scripts/lafea-plane-strain-bbar-freeze-check.mjs'],
  ['authority-source-guard', 'scripts/lafea-plane-strain-bbar-source-guard.mjs'],
  ['element-kernel-affine-and-fail-closed', 'scripts/lafea-plane-strain-bbar-kernel-check.mjs'],
  ['lame-nu-distortion-production-matrix', 'scripts/lafea-plane-strain-bbar-lame-check.mjs'],
];

const evidence = checks.map(([id, relative]) => {
  const child = spawnSync(process.execPath, [path.join(ROOT, relative)], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  return Object.freeze({
    id,
    script: relative,
    exitCode: child.status,
    signal: child.signal,
    stdout: child.stdout ?? '',
    stderr: child.stderr ?? '',
  });
});

for (const row of evidence) {
  if (row.stdout) process.stdout.write(row.stdout.endsWith('\n') ? row.stdout : `${row.stdout}\n`);
  if (row.stderr) process.stderr.write(row.stderr.endsWith('\n') ? row.stderr : `${row.stderr}\n`);
}
assert.equal(
  evidence.every((row) => row.exitCode === 0),
  true,
  `B-bar qualification failed: ${evidence.filter((row) => row.exitCode !== 0).map((row) => `${row.id}:${row.exitCode}`).join(', ')}`,
);

console.log(JSON.stringify({
  schema: 'lafea-plane-strain-bbar-qualification-aggregate/v1',
  status: 'PASS',
  programmeId: 'LAFEA3-PS-BBAR-001',
  checkCount: evidence.length,
  checks: evidence.map((row) => ({ id: row.id, script: row.script, exitCode: row.exitCode })),
  exactProductionMatrixSolveCount: 120,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}));
