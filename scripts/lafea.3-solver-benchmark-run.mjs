#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  finalizeAuditRecord,
  runAuditedMethod,
} from './lib/lafea-benchmark-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'validation/lafea-benchmark-data/B02/bucket-manifest.json');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const args = parseArgs(process.argv.slice(2));
const stages = selectStages(manifest, args.stageSpec);

const exactHeadSha = git('rev-parse', 'HEAD').trim();
assert.match(exactHeadSha, /^[0-9a-f]{40}$/u);
if (args.expectedHead) assert.equal(exactHeadSha, args.expectedHead, 'exact head mismatch');
assert.equal(
  git('status', '--porcelain', '--untracked-files=no'),
  '',
  'tracked tree must be clean before audited execution',
);

const generatedAt = new Date().toISOString();
const runId = args.runId ?? `B02-${generatedAt.replace(/[:.]/gu, '-')}`;
const runDir = path.join(ROOT, 'reports/qualification/lafea-benchmark-program', runId);
fs.mkdirSync(runDir, { recursive: true });

let contiguousGateAuthorized = true;
let priorStageIndex = -1;
const stageSummaries = [];
for (const stage of stages) {
  const stageIndex = manifest.stageOrder.indexOf(stage.benchmarkStage);
  const predecessorSelected = stageIndex === 0 || priorStageIndex === stageIndex - 1;
  const predecessorGateSatisfied = predecessorSelected && contiguousGateAuthorized;
  const stageDir = path.join(runDir, stage.benchmarkStage);
  fs.mkdirSync(stageDir, { recursive: true });

  const methodResults = stage.methods.map((method) => runAuditedMethod({
    root: ROOT,
    method,
    runDir: stageDir,
  }));
  const executionPass = methodResults.length > 0
    && methodResults.every((row) => row.status === 'PASS');
  const stageAuthorized = predecessorGateSatisfied && executionPass;
  const recordWithoutHash = {
    schema: 'lafea-benchmark-audit-record/v1',
    programId: 'LAFEA-BENCHMARK-VALIDATION-PROGRAM',
    runId: `${runId}-${stage.benchmarkStage}`,
    generatedAt,
    repository: 'reallaksh19/Advanced_Analysis',
    exactHeadSha,
    trackedTreeClean: true,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
    },
    caseId: 'B02',
    stageId: manifest.stageId,
    benchmarkStage: stage.benchmarkStage,
    benchmarkClass: 'STAGED_SOLVER_BENCHMARK',
    comparisonPolicy: 'STAGE_SPECIFIC_INDEPENDENT_ORACLE_AND_INVARIANTS',
    methodResults,
    caseStatus: executionPass ? 'PASS' : 'FAIL',
    nextBenchmarkAuthorized: stageAuthorized,
    baselineDisposition: stageAuthorized
      ? 'ELIGIBLE_EXECUTION_BASELINE'
      : 'NOT_ELIGIBLE',
    stageGate: {
      predecessorSelected,
      predecessorGateSatisfied,
      executionPass,
      stageAuthorized,
    },
    governance: {
      productionOutputGeneratedExpectedValues: false,
      releaseAuthorityGranted: false,
      temperatureAuthorityGranted: false,
      productionMeshQualificationGranted: false,
      performanceIsInformational: true,
    },
  };
  const record = finalizeAuditRecord(recordWithoutHash);
  const recordPath = path.join(stageDir, 'audit-record.json');
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  stageSummaries.push({
    benchmarkStage: stage.benchmarkStage,
    status: record.caseStatus,
    stageAuthorized,
    recordHash: record.recordHash,
    recordPath: path.relative(ROOT, recordPath),
  });
  contiguousGateAuthorized = stageAuthorized;
  priorStageIndex = stageIndex;
}

const summary = {
  schema: 'lafea3-bm-s-program-run/v1',
  runId,
  caseId: 'B02',
  exactHeadSha,
  selectedStages: stages.map((row) => row.benchmarkStage),
  nextBenchmarkAuthorized: contiguousGateAuthorized,
  releaseAuthorityGranted: false,
  stageSummaries,
};
fs.writeFileSync(path.join(runDir, 'run-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary));
if (stageSummaries.some((row) => row.status !== 'PASS')) process.exitCode = 1;

function selectStages(value, stageSpec) {
  const byId = new Map(value.stages.map((row) => [row.benchmarkStage, row]));
  const selectedIds = stageSpec ? parseStageSpec(stageSpec, value.stageOrder) : value.stageOrder
    .filter((stageId) => byId.get(stageId)?.definitionState === 'READY');
  assert.ok(selectedIds.length > 0, 'no benchmark stages selected');
  return selectedIds.map((stageId) => {
    const stage = byId.get(stageId);
    assert.ok(stage, `unknown benchmark stage ${stageId}`);
    assert.equal(stage.definitionState, 'READY', `${stageId} is not ready for execution`);
    assert.ok(stage.methods.length > 0, `${stageId} has no executable benchmark methods`);
    return stage;
  });
}

function parseStageSpec(spec, order) {
  if (spec.includes('..')) {
    const [first, last, ...extra] = spec.split('..');
    assert.equal(extra.length, 0, `invalid stage range ${spec}`);
    const firstIndex = order.indexOf(first);
    const lastIndex = order.indexOf(last);
    assert.ok(firstIndex >= 0 && lastIndex >= firstIndex, `invalid stage range ${spec}`);
    return order.slice(firstIndex, lastIndex + 1);
  }
  return spec.split(',').map((row) => row.trim()).filter(Boolean);
}

function parseArgs(values) {
  const out = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--stage') out.stageSpec = values[++index];
    else if (value === '--expected-head') out.expectedHead = values[++index];
    else if (value === '--run-id') out.runId = values[++index];
    else throw new TypeError(`Unknown argument ${value}`);
  }
  return out;
}

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${gitArgs.join(' ')} failed: ${result.stderr}`);
  }
  return result.stdout;
}
