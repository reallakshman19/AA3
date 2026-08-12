#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  caseDisposition,
  finalizeAuditRecord,
  runAuditedMethod,
} from './lib/lafea-benchmark-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const program = JSON.parse(fs.readFileSync(path.join(ROOT, 'validation/lafea-benchmark-program/program.json'), 'utf8'));
const args = parseArgs(process.argv.slice(2));
const caseId = args.caseId ?? program.activeCaseId;
const benchmark = program.cases.find((row) => row.caseId === caseId);
assert.ok(benchmark, `Unknown or not-yet-activated benchmark case ${caseId}.`);
assert.equal(benchmark.definitionState, 'READY', `${caseId} is not ready for execution.`);

const exactHeadSha = git('rev-parse', 'HEAD').trim();
assert.match(exactHeadSha, /^[0-9a-f]{40}$/);
if (args.expectedHead) assert.equal(exactHeadSha, args.expectedHead, 'exact head mismatch');
const trackedStatus = git('status', '--porcelain', '--untracked-files=no');
assert.equal(trackedStatus, '', 'tracked tree must be clean before audited execution');

const generatedAt = new Date().toISOString();
const runId = args.runId ?? `${caseId}-${generatedAt.replace(/[:.]/g, '-')}`;
const runDir = path.join(ROOT, 'reports/qualification/lafea-benchmark-program', runId);
fs.mkdirSync(runDir, { recursive: true });

const methodResults = benchmark.methods.map((method) => runAuditedMethod({
  root: ROOT,
  method,
  runDir,
}));
const disposition = caseDisposition(methodResults);
const record = finalizeAuditRecord({
  schema: 'lafea-benchmark-audit-record/v1',
  programId: program.programId,
  runId,
  generatedAt,
  repository: program.repository,
  exactHeadSha,
  trackedTreeClean: true,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
  },
  caseId: benchmark.caseId,
  stageId: benchmark.stageId,
  benchmarkClass: benchmark.benchmarkClass,
  comparisonPolicy: benchmark.comparisonPolicy,
  methodResults,
  ...disposition,
  governance: {
    productionOutputGeneratedExpectedValues: false,
    releaseAuthorityGranted: false,
    temperatureAuthorityGranted: false,
  },
});

const recordPath = path.join(runDir, 'audit-record.json');
fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(runDir, 'audit-record.md'), markdown(record), 'utf8');
console.log(JSON.stringify({
  schema: 'lafea-benchmark-program-run/v1',
  runId,
  caseId,
  status: record.caseStatus,
  nextBenchmarkAuthorized: record.nextBenchmarkAuthorized,
  recordHash: record.recordHash,
  recordPath: path.relative(ROOT, recordPath),
}));
if (record.caseStatus !== 'PASS') process.exitCode = 1;

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${gitArgs.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}
function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === '--case') out.caseId = values[++i];
    else if (values[i] === '--expected-head') out.expectedHead = values[++i];
    else if (values[i] === '--run-id') out.runId = values[++i];
    else throw new TypeError(`Unknown argument ${values[i]}`);
  }
  return out;
}
function markdown(record) {
  const rows = record.methodResults.map((row) =>
    `| ${row.methodId} | ${row.authorityClass} | ${row.status} | ${row.exitCode ?? 'n/a'} | ${row.elapsedMs.toFixed(3)} | ${row.stdout.sha256} | ${row.stderr.sha256} |`,
  ).join('\n');
  return `# LAFEA Benchmark Audit — ${record.runId}\n\n` +
    `- Exact head: \`${record.exactHeadSha}\`\n` +
    `- Case: **${record.caseId}** (${record.stageId})\n` +
    `- Status: **${record.caseStatus}**\n` +
    `- Next benchmark authorized: **${record.nextBenchmarkAuthorized}**\n` +
    `- Execution baseline: **${record.baselineDisposition}**\n` +
    `- Release authority granted: **false**\n` +
    `- Temperature authority granted: **false**\n` +
    `- Record hash: \`${record.recordHash}\`\n\n` +
    `| Method | Authority class | Status | Exit | ms | stdout hash | stderr hash |\n` +
    `|---|---|---:|---:|---:|---|---|\n${rows}\n\n` +
    `Observed production output is not permitted to generate or alter expected engineering values.\n`;
}
