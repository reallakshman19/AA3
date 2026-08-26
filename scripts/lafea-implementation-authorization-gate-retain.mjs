#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKER = path.join(ROOT, 'scripts/lafea-implementation-authorization-gate-check.mjs');
const Q1_DIRECT_LOADED_CHECKER = path.join(
  ROOT,
  'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
);
const Q3_INDEPENDENT_PRESSURE_CHECKER = path.join(
  ROOT,
  'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
);
const REPORT_PATH = path.resolve(
  ROOT,
  process.env.LAFEA_IMPLEMENTATION_AUTHORIZATION_REPORT_PATH
    ?? 'reports/qualification/lafea-implementation-authorization-gate.json',
);

const repositoryHead = git(['rev-parse', '--verify', 'HEAD']).trim();
assert.match(repositoryHead, /^[0-9a-f]{40}$/u, 'exact repository HEAD must be a full Git SHA');

const dirtyBefore = git(['status', '--porcelain=v1', '--untracked-files=all']).trim();
assert.equal(
  dirtyBefore,
  '',
  `authorization evidence requires a clean checkout before execution; dirty state:\n${dirtyBefore}`,
);

const receipt = runJson(CHECKER);
assert.equal(receipt?.schema, 'lafea-implementation-authorization-gate-receipt/v1');
assert.equal(receipt?.status, 'PASS');
assert.match(receipt?.receiptHash ?? '', /^sha256:[0-9a-f]{64}$/u);
assert.equal(receipt?.authority?.releaseAuthorityGranted, false);

const q1DirectLoadedElementEvidence = runJson(Q1_DIRECT_LOADED_CHECKER);
assert.equal(
  q1DirectLoadedElementEvidence?.schema,
  'lafea3-direct-loaded-element-authorization-addendum/v1',
);
assert.equal(q1DirectLoadedElementEvidence?.status, 'PASS');
assert.match(q1DirectLoadedElementEvidence?.semanticHash ?? '', /^sha256:[0-9a-f]{64}$/u);
assertTraceParity(
  q1DirectLoadedElementEvidence.trace,
  receipt.q1.trace,
  'Q1 direct-loaded addendum',
);

const q3IndependentPressureEvidence = runJson(Q3_INDEPENDENT_PRESSURE_CHECKER);
assert.equal(
  q3IndependentPressureEvidence?.schema,
  'lafea4-independent-pressure-resultant-authorization-addendum/v1',
);
assert.equal(q3IndependentPressureEvidence?.status, 'PASS');
assert.match(q3IndependentPressureEvidence?.semanticHash ?? '', /^sha256:[0-9a-f]{64}$/u);
assert.equal(
  q3IndependentPressureEvidence.calculationAuthority.productionLoadAssemblerUsedForIndependentSum,
  false,
);
assertTraceParity(
  q3IndependentPressureEvidence.trace,
  receipt.q3.trace,
  'Q3 independent-pressure addendum',
);
vectorClose(
  q3IndependentPressureEvidence.analyticalCylinder.force,
  receipt.q3.analyticalForce,
  2e-10,
  1e-7,
);
vectorClose(
  q3IndependentPressureEvidence.analyticalCylinder.momentAboutOrigin,
  receipt.q3.analyticalMomentAboutOrigin,
  2e-10,
  1e-6,
);
vectorClose(
  q3IndependentPressureEvidence.independentRetainedFacetResultant.force,
  receipt.q3.compiledAppliedForce,
  2e-10,
  1e-7,
);
vectorClose(
  q3IndependentPressureEvidence.independentRetainedFacetResultant.momentAboutOrigin,
  receipt.q3.compiledAppliedMomentAboutOrigin,
  2e-10,
  1e-6,
);

const dirtyAfterEngineeringChecks = git([
  'status', '--porcelain=v1', '--untracked-files=all',
]).trim();
assert.equal(
  dirtyAfterEngineeringChecks,
  '',
  `authorization engineering checks changed the checkout before receipt sealing; dirty state:\n${dirtyAfterEngineeringChecks}`,
);

const body = Object.freeze({
  schema: 'lafea-implementation-authorization-exact-head-envelope/v4',
  repository: 'reallaksh19/Advanced_Analysis',
  repositoryHead,
  checkoutCleanBeforeExecution: true,
  checkoutCleanAfterEngineeringChecks: true,
  checkerPaths: Object.freeze([
    'scripts/lafea-implementation-authorization-gate-check.mjs',
    'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
    'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
  ]),
  reportPath: path.relative(ROOT, REPORT_PATH).split(path.sep).join('/'),
  evidenceStatus: 'PASS',
  releaseAuthorityGranted: false,
  receipt,
  q1DirectLoadedElementEvidence,
  q3IndependentPressureEvidence,
});
const envelope = Object.freeze({
  ...body,
  evidenceArtifactHash: canonicalLafeaSha256({
    schema: 'lafea-implementation-authorization-exact-head-envelope-hash-input/v4',
    evidence: body,
  }),
});

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(envelope, null, 2));

function assertTraceParity(addendumTrace, mainTrace, label) {
  for (const key of [
    'sourceHash',
    'retainedMeshHash',
    'solverModelHash',
    'compiledExecutionHash',
    'recoveryArtifactHash',
  ]) {
    assert.equal(
      addendumTrace[key],
      mainTrace[key],
      `${label} must use the same ${key} as the main receipt`,
    );
  }
}

function vectorClose(actual, expected, relative, absolute) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    const tolerance = Math.max(absolute, relative * Math.max(1, Math.abs(expected[index])));
    assert.ok(
      Math.abs(value - expected[index]) <= tolerance,
      `${value} differs from ${expected[index]} by more than ${tolerance}`,
    );
  });
}

function runJson(scriptPath) {
  const stdout = execFileSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(stdout);
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
