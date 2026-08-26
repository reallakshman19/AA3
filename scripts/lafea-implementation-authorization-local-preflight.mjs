#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RETAIN = path.join(ROOT, 'scripts/lafea-implementation-authorization-gate-retain.mjs');
const REQUIRED_PATHS = Object.freeze([
  'package.json',
  'scripts/lafea-implementation-authorization-gate-check.mjs',
  'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
  'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
  'scripts/lafea-implementation-authorization-gate-retain.mjs',
]);

assert.equal(
  path.resolve(process.cwd()),
  ROOT,
  `run from repository root: ${ROOT}`,
);

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(packageJson?.name, 'advanced-analysis', 'unexpected repository package identity');
assert.equal(packageJson?.type, 'module', 'authorization runner requires the repository ESM contract');
assert.equal(typeof globalThis.structuredClone, 'function', 'Node runtime lacks structuredClone');
assert.equal(typeof globalThis.URL, 'function', 'Node runtime lacks URL');
assert.ok(process.versions?.node, 'Node runtime version identity is unavailable');

for (const relativePath of REQUIRED_PATHS) {
  const absolutePath = path.join(ROOT, relativePath);
  assert.equal(fs.existsSync(absolutePath), true, `required authorization path missing: ${relativePath}`);
  assert.equal(fs.statSync(absolutePath).isFile(), true, `required authorization path is not a file: ${relativePath}`);
}

const gitTopLevel = git(['rev-parse', '--show-toplevel']).trim();
assert.equal(path.resolve(gitTopLevel), ROOT, 'Git top-level directory does not match repository root');

const repositoryHead = git(['rev-parse', '--verify', 'HEAD']).trim();
assert.match(repositoryHead, /^[0-9a-f]{40}$/u, 'exact repository HEAD must be a full Git SHA');

const dirty = git(['status', '--porcelain=v1', '--untracked-files=all']).trim();
assert.equal(dirty, '', `authorization execution requires a clean checkout; dirty state:\n${dirty}`);

const preflight = Object.freeze({
  schema: 'lafea-implementation-authorization-local-preflight/v1',
  status: 'PASS',
  repository: 'reallaksh19/Advanced_Analysis',
  repositoryHead,
  repositoryRoot: ROOT,
  packageIdentity: packageJson.name,
  packageType: packageJson.type,
  nodeVersion: process.versions.node,
  gitAvailable: true,
  checkoutClean: true,
  requiredPaths: REQUIRED_PATHS,
  engineeringAuthorityCreated: false,
  releaseAuthorityGranted: false,
  delegatedEntryPoint: 'scripts/lafea-implementation-authorization-gate-retain.mjs',
});

console.error(JSON.stringify(preflight, null, 2));
execFileSync(process.execPath, [RETAIN], {
  cwd: ROOT,
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 128 * 1024 * 1024,
  stdio: ['ignore', 'inherit', 'inherit'],
});

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
