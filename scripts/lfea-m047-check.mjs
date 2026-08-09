#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const NODE = process.execPath;
const baselineOut = mkdtempSync(join(tmpdir(), 'lfea-m047-baseline-'));

const CHECKS = Object.freeze([
  ['I000-I003 retained baseline chain', ['scripts/lfea-m047-materialize-baseline-chain.mjs', '--out-dir', baselineOut]],
  ['I001 iteration evidence', ['scripts/lfea-caesar-accdb-iteration-evidence-check.mjs']],
  ['I002 MEC-21 equation', ['scripts/lfea-m047-bourdon-mechanics-check.mjs']],
  ['I003 subdivision diagnosis', ['scripts/lfea-m047-bourdon-subdivision-check.mjs']],
  ['I004 compatible field', ['scripts/lfea-m047-bourdon-compatible-field-check.mjs']],
  ['I004 Bourdon source guard', ['scripts/lfea-m047-bourdon-source-guard.mjs']],
  ['B3.2 piping component', ['scripts/lfea-b3.2-piping-component-check.mjs']],
  ['B3.2 reviewer', ['scripts/lfea-b3.2-reviewer-check.mjs']],
  ['B3.2 source guard', ['scripts/lfea-b3.2-source-guard.mjs']],
  ['B3.3 solver', ['scripts/lfea-b3.3-solver-check.mjs']],
  ['B3.3 reviewer', ['scripts/lfea-b3.3-reviewer-check.mjs']],
  ['B3.3 source guard', ['scripts/lfea-b3.3-source-guard.mjs']],
  ['B3.4 recovery', ['scripts/lfea-b3.4-recovery-check.mjs']],
  ['B3.4 reviewer', ['scripts/lfea-b3.4-reviewer-check.mjs']],
  ['B3.4 source guard', ['scripts/lfea-b3.4-source-guard.mjs']],
]);

const failures = [];
try {
  for (const [label, command] of CHECKS) {
    const [relativePath, ...args] = command;
    const started = Date.now();
    process.stdout.write(`\n[M047] RUN ${label}: ${relativePath}${args.length > 0 ? ` ${args.join(' ')}` : ''}\n`);
    const result = spawnSync(NODE, [resolve(ROOT, relativePath), ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    const elapsedMs = Date.now() - started;
    if (result.error || result.status !== 0) {
      const reason = result.error?.message ?? `exit ${String(result.status)}`;
      failures.push({ label, relativePath, reason, elapsedMs });
      process.stderr.write(`[M047] FAIL ${label}: ${reason} (${elapsedMs} ms)\n`);
      continue;
    }
    process.stdout.write(`[M047] PASS ${label} (${elapsedMs} ms)\n`);
  }
} finally {
  rmSync(baselineOut, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stderr.write(`\n[M047] ${failures.length}/${CHECKS.length} checks failed.\n`);
  for (const failure of failures) {
    process.stderr.write(`- ${failure.label}: ${failure.reason}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`\n[M047] PASS ${CHECKS.length}/${CHECKS.length} focused checks.\n`);
}
