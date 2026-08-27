#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  classifyPostNullspaceBoundary,
  POST_NULLSPACE_COMMAND_STATUS as S,
} from './lib/lafea-b01-post-nullspace-boundary.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_NULLSPACE_MERGE = 'e74d2d3c45d918895d3a613014f08aa7c0abce79';
const REPORT = path.join(ROOT, 'reports/qualification/B01/post-nullspace-boundary.json');
const CUSTODY_PATHS = Object.freeze([
  'src/core/local-continuum/planar-translation-nullspace.js',
  'src/core/local-continuum/bbar-plane-strain.js',
  'src/core/local-continuum/t6-element.js',
  'src/core/local-continuum/q8-element.js',
  'src/core/local-continuum/solver.js',
  'scripts/lafea-b01-bbar-translation-nullspace-check.mjs',
  'scripts/lafea-plane-strain-bbar-kernel-check.mjs',
  'scripts/lafea-b01-bbar-lame-diagnostic.mjs',
  'scripts/lib/lafea-plane-strain-bbar-lame-fixture.mjs',
  'validation/lafea-incompressible/plane-strain-bbar-v1.json',
  'validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json',
]);

requireRepositoryRoot();
const repositoryHead = git(['rev-parse', 'HEAD']);
if (!/^[0-9a-f]{40}$/u.test(repositoryHead)) {
  throw new TypeError(`Expected full Git HEAD, received ${repositoryHead}`);
}
if (spawnSync('git', ['merge-base', '--is-ancestor', REQUIRED_NULLSPACE_MERGE, repositoryHead], {
  cwd: ROOT,
  stdio: 'ignore',
}).status !== 0) {
  throw new Error('LAFEA_B01_POST_NULLSPACE_REQUIRED_MERGE_NOT_ANCESTOR');
}
requireCleanCheckout('start');

const commands = [];
const focused = runCommand(
  'focused-nullspace',
  path.join(ROOT, 'scripts/lafea-b01-bbar-translation-nullspace-check.mjs'),
);
commands.push(focused);

let kernel = notRun('bbar-kernel');
let governing = notRun('governing-lame');
if (focused.status === S.PASS) {
  kernel = runCommand(
    'bbar-kernel',
    path.join(ROOT, 'scripts/lafea-plane-strain-bbar-kernel-check.mjs'),
  );
  commands.push(kernel);
}
if (focused.status === S.PASS && kernel.status === S.PASS) {
  governing = runCommand(
    'governing-lame',
    path.join(ROOT, 'scripts/lafea-b01-bbar-lame-diagnostic.mjs'),
  );
  commands.push(governing);
}

const classification = classifyPostNullspaceBoundary({
  focusedNullspace: focused.status,
  kernel: kernel.status,
  governingLame: governing.status,
});
const cleanTreeAtEnd = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
const passed = classification.disposition === 'POST_NULLSPACE_GOVERNING_CASE_CLEARED'
  && cleanTreeAtEnd;
const receipt = Object.freeze({
  schema: 'lafea-b01-post-nullspace-boundary-receipt/v1',
  status: passed ? 'PASS' : 'FAIL',
  repositoryHead,
  requiredNullspaceMergeAncestor: REQUIRED_NULLSPACE_MERGE,
  cleanTreeAtStart: true,
  cleanTreeAtEnd,
  sourceCustody: Object.freeze(Object.fromEntries(
    CUSTODY_PATHS.map((relative) => [relative, git(['rev-parse', `HEAD:${relative}`])]),
  )),
  commands: Object.freeze(commands),
  ...classification,
  nextAction: nextAction(classification.disposition),
});
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(passed ? 0 : 1);

function runCommand(id, script) {
  const child = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  return Object.freeze({
    id,
    status: child.status === 0 ? S.PASS : S.FAIL,
    exitCode: child.status ?? -1,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutSummary: parseJson(stdout),
    stderrTail: stderr.slice(-8000),
  });
}

function notRun(id) {
  return Object.freeze({
    id,
    status: S.NOT_RUN,
    exitCode: null,
    stdoutSha256: null,
    stderrSha256: null,
    stdoutSummary: null,
    stderrTail: '',
  });
}

function nextAction(disposition) {
  if (disposition === 'ELEMENT_NULLSPACE_REPAIR_NOT_QUALIFIED') {
    return 'RCA the focused element-nullspace failure; do not inspect or modify the sparse solver.';
  }
  if (disposition === 'BBAR_KERNEL_REGRESSION_REQUIRES_RCA') {
    return 'RCA the B-bar kernel regression before any governing-case or solver work.';
  }
  if (disposition === 'GOVERNING_LAME_CASE_FAILED_RCA_REQUIRED') {
    return 'Inspect the first governing Lame failure and assign the owning boundary before opening any solver repair.';
  }
  return 'Proceed to the full integrated B01 qualification; no solver repair is authorized by this gate.';
}

function parseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return Object.freeze({ parseableJson: false, tail: trimmed.slice(-4000) });
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function requireRepositoryRoot() {
  const actual = git(['rev-parse', '--show-toplevel']);
  if (path.resolve(process.cwd()) !== ROOT || path.resolve(actual) !== ROOT) {
    throw new Error('LAFEA_B01_POST_NULLSPACE_REPOSITORY_ROOT_REQUIRED');
  }
}

function requireCleanCheckout(stage) {
  const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
  if (status !== '') {
    throw new Error(`LAFEA_B01_POST_NULLSPACE_CLEAN_CHECKOUT_REQUIRED_${stage.toUpperCase()}`);
  }
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}
