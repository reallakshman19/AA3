#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUTHORIZATION_REPORT_RELATIVE_PATH,
  runLocalAuthorizationPreflight,
  verifyRetainedAuthorizationEnvelope,
} from './lib/lafea-implementation-authorization-local-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RETAIN = path.join(ROOT, 'scripts/lafea-implementation-authorization-gate-retain.mjs');
let executionPhase = 'ENVIRONMENT_PREFLIGHT';
let repositoryHead = null;

try {
  const preflight = runLocalAuthorizationPreflight({ root: ROOT });
  repositoryHead = preflight.repositoryHead;
  process.stderr.write(`${JSON.stringify(preflight, null, 2)}\n`);

  executionPhase = 'DELEGATED_ENGINEERING_GATE';
  const child = spawnSync(process.execPath, [RETAIN], {
    cwd: ROOT,
    env: {
      ...process.env,
      LAFEA_IMPLEMENTATION_AUTHORIZATION_REPORT_PATH: AUTHORIZATION_REPORT_RELATIVE_PATH,
    },
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (child.stderr) process.stderr.write(child.stderr);
  if (child.error) throw child.error;
  if (child.signal) throw new Error(`delegated engineering gate terminated by signal ${child.signal}`);
  if (child.status !== 0) {
    const error = new Error(`delegated engineering gate exited with status ${child.status}`);
    error.status = child.status;
    throw error;
  }

  const envelope = JSON.parse(child.stdout);
  executionPhase = 'POST_GATE_RECEIPT_VERIFICATION';
  const verification = verifyRetainedAuthorizationEnvelope({
    root: ROOT,
    repositoryHead,
    envelope,
  });

  process.stdout.write(`${JSON.stringify({
    schema: 'lafea-implementation-authorization-local-execution/v1',
    status: 'PASS',
    repository: preflight.repository,
    repositoryHead,
    preflight,
    verification,
    retainedEnvelope: envelope,
    delegatedEngineeringGateEntered: true,
    q1ToQ5Disposition: 'PASS',
    implementationAuthorizationEvidenceVerified: true,
    localHarnessAuthorityCreated: false,
    releaseAuthorityGranted: false,
  }, null, 2)}\n`);
} catch (error) {
  const delegatedGateEntered = executionPhase !== 'ENVIRONMENT_PREFLIGHT';
  const exitStatus = Number.isInteger(error?.status) && error.status !== 0 ? error.status : 1;
  const postGateVerification = executionPhase === 'POST_GATE_RECEIPT_VERIFICATION';
  process.stderr.write(`${JSON.stringify({
    schema: 'lafea-implementation-authorization-local-failure/v2',
    status: 'FAIL',
    repository: 'reallaksh19/Advanced_Analysis',
    repositoryHead,
    phase: executionPhase,
    classification: postGateVerification
      ? 'POST_GATE_EVIDENCE_VERIFICATION_FAILED'
      : delegatedGateEntered
        ? 'DELEGATED_ENGINEERING_GATE_NONZERO_STOP_AT_FIRST_CHILD_FAILURE'
        : 'NOT_RUN_ENVIRONMENT_OR_CHECKOUT_PREFLIGHT_FAILED',
    delegatedEngineeringGateEntered: delegatedGateEntered,
    q1ToQ5Disposition: postGateVerification
      ? 'CHILD_RETURNED_ZERO_BUT_EXACT_HEAD_EVIDENCE_NOT_ACCEPTED'
      : delegatedGateEntered
        ? 'UNKNOWN_OR_PARTIAL_SEE_FIRST_CHILD_FAILURE'
        : 'NOT_RUN',
    implementationAuthorizationEvidenceVerified: false,
    localHarnessAuthorityCreated: false,
    releaseAuthorityGranted: false,
    exitStatus,
    message: conciseError(error),
  }, null, 2)}\n`);
  process.exit(exitStatus);
}

function conciseError(error) {
  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : String(error ?? 'unknown failure');
  return message.split(/\r?\n/u)[0].slice(0, 500);
}
