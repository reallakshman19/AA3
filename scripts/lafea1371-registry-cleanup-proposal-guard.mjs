#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAFEA_STAGE_REGISTRY } from '../src/workspace/lafea-stage-registry.js';
import { assertCleanCheckout, git } from './lib/lafea-implementation-authorization-local-runtime.mjs';
import {
  LAFEA1371_REGISTRY_CLOSURE_READINESS_REPORT_RELATIVE_PATH,
  LAFEA1371_REGISTRY_SOURCE_RELATIVE_PATH,
} from './lib/lafea1371-registry-closure-readiness.mjs';
import { evaluateLafea1371RegistryCleanupProposal } from './lib/lafea1371-registry-cleanup-proposal-guard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(path.resolve(process.cwd()), ROOT, `run from repository root: ${ROOT}`);
assertCleanCheckout(ROOT, 'registry cleanup proposal guard requires a clean checkout');

const readinessPath = path.resolve(ROOT, LAFEA1371_REGISTRY_CLOSURE_READINESS_REPORT_RELATIVE_PATH);
assert.equal(fs.existsSync(readinessPath), true,
  `Section 17 readiness receipt is required: ${LAFEA1371_REGISTRY_CLOSURE_READINESS_REPORT_RELATIVE_PATH}`);
const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));

git(ROOT, ['merge-base', '--is-ancestor', readiness.qualifiedRepositoryHead, 'HEAD']);
const changedPaths = git(ROOT, ['diff', '--name-only', `${readiness.qualifiedRepositoryHead}..HEAD`])
  .trim().split(/\r?\n/u).filter(Boolean);

const qualifiedRegistrySource = git(ROOT, [
  'show',
  `${readiness.qualifiedRepositoryHead}:${LAFEA1371_REGISTRY_SOURCE_RELATIVE_PATH}`,
]);
const candidateRegistrySource = fs.readFileSync(
  path.resolve(ROOT, LAFEA1371_REGISTRY_SOURCE_RELATIVE_PATH),
  'utf8',
);

const result = evaluateLafea1371RegistryCleanupProposal({
  readiness,
  candidateRegistry: LAFEA_STAGE_REGISTRY,
  changedPaths,
  qualifiedRegistrySource,
  candidateRegistrySource,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
