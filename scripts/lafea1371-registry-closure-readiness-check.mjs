#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LAFEA_STAGE_REGISTRY,
  requireLafeaStageRegistryEntry,
} from '../src/workspace/lafea-stage-registry.js';
import {
  AUTHORIZATION_REPORT_RELATIVE_PATH,
  assertCleanCheckout,
  git,
  verifyRetainedAuthorizationEnvelope,
} from './lib/lafea-implementation-authorization-local-runtime.mjs';
import {
  LAFEA1371_REGISTRY_CLOSURE_READINESS_REPORT_RELATIVE_PATH,
  evaluateLafea1371RegistryClosureReadiness,
} from './lib/lafea1371-registry-closure-readiness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(
  path.resolve(process.cwd()),
  ROOT,
  `run from repository root: ${ROOT}`,
);

const repositoryHead = git(ROOT, ['rev-parse', '--verify', 'HEAD']).trim();
assert.match(repositoryHead, /^[0-9a-f]{40}$/u, 'current HEAD must be a full Git SHA');
assertCleanCheckout(ROOT, 'Section 17 readiness requires a clean exact-head checkout');

const reportPath = path.resolve(ROOT, AUTHORIZATION_REPORT_RELATIVE_PATH);
assert.equal(
  fs.existsSync(reportPath),
  true,
  `executed exact-head implementation-authorization report is required: ${AUTHORIZATION_REPORT_RELATIVE_PATH}`,
);

const envelope = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const verification = verifyRetainedAuthorizationEnvelope({
  root: ROOT,
  repositoryHead,
  envelope,
});

const readiness = evaluateLafea1371RegistryClosureReadiness({
  repositoryHead,
  implementationAuthorizationVerification: verification,
  lafea3RegistryEntry: requireLafeaStageRegistryEntry('LAFEA.3'),
  lafea4RegistryEntry: requireLafeaStageRegistryEntry('LAFEA.4'),
  stageRegistry: LAFEA_STAGE_REGISTRY,
});

const readinessPath = path.resolve(
  ROOT,
  LAFEA1371_REGISTRY_CLOSURE_READINESS_REPORT_RELATIVE_PATH,
);
fs.mkdirSync(path.dirname(readinessPath), { recursive: true });
fs.writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`, 'utf8');
assertCleanCheckout(ROOT, 'Section 17 readiness receipt write must preserve clean Git custody');

process.stdout.write(`${JSON.stringify(readiness, null, 2)}\n`);
