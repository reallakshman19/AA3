#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boundedLafeaDiagnosticCode,
  publicLafeaFailure,
  sanitizeLafeaPublicResult,
  sanitizeLafeaPublicState,
} from '../src/workspace/lafea-public-failure.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sentinel = 'PROPRIETARY_EMP1_SOURCE_VALUE_8F9A_DO_NOT_DISCLOSE';

const sourceError = new TypeError(sentinel);
sourceError.code = 'EMP1_SOURCE_PARSE_REJECTED';
const failure = publicLafeaFailure(
  sourceError,
  'EMP1_WORKBENCH_RUN_FAILED',
  'EMP.1 execution failed.',
);
assert.equal(failure.code, 'EMP1_SOURCE_PARSE_REJECTED');
assert.equal(failure.message.includes(sentinel), false);
assert.match(failure.message, /Diagnostic code: EMP1_SOURCE_PARSE_REJECTED\./u);

const legacyCodeOnly = publicLafeaFailure(
  new TypeError('LAFEA_SIMULATED_SOURCE_NOT_CONFIGURED'),
  'LAFEA_PUBLIC_FAILURE',
  'LAFEA source operation failed.',
);
assert.equal(legacyCodeOnly.code, 'LAFEA_SIMULATED_SOURCE_NOT_CONFIGURED');

assert.equal(
  boundedLafeaDiagnosticCode(`EMP1 BAD CODE ${sentinel}`, 'EMP1_WORKBENCH_RUN_FAILED'),
  'EMP1_WORKBENCH_RUN_FAILED',
);

const rawState = {
  schema: 'lafea-workbench-state/v2',
  status: 'FAILED',
  diagnostics: [
    {
      severity: 'ERROR',
      code: 'LAFEA_SOURCE_EDIT_REJECTED',
      path: 'document',
      entityId: null,
      message: sentinel,
    },
    {
      severity: 'WARNING',
      code: 'LAFEA_REVIEW_WARNING',
      message: sentinel,
    },
  ],
  stages: {
    'LAFEA.1': {
      lifecycleReadiness: {
        blockingReasons: [sentinel],
      },
      execution: {
        status: 'FAILED',
        runId: 'run-redaction-falsifier',
        diagnostics: [{
          severity: 'ERROR',
          code: 'LAFEA_WORKER_SOURCE_FAILURE',
          message: sentinel,
          inputSemanticHash: 'input-hash',
        }],
      },
      lastEditResult: {
        status: 'REJECTED',
        diagnostics: [{
          severity: 'ERROR',
          code: `BAD CODE ${sentinel}`,
          path: 'loads[0]',
          message: sentinel,
        }],
      },
    },
  },
};

const publicState = sanitizeLafeaPublicState(rawState);
assert.notEqual(publicState, rawState);
assert.equal(publicState.status, 'FAILED');
assert.equal(publicState.diagnostics[0].code, 'LAFEA_SOURCE_EDIT_REJECTED');
assert.equal(publicState.diagnostics[0].path, 'document');
assert.equal(publicState.diagnostics[0].message.includes(sentinel), false);
assert.equal(publicState.diagnostics[1].message, sentinel,
  'non-error review/warning messages must not be rewritten by the exception boundary');
assert.equal(publicState.stages['LAFEA.1'].execution.status, 'FAILED');
assert.equal(publicState.stages['LAFEA.1'].execution.runId, 'run-redaction-falsifier');
assert.equal(
  publicState.stages['LAFEA.1'].execution.diagnostics[0].message.includes(sentinel),
  false,
);
assert.equal(
  publicState.stages['LAFEA.1'].lastEditResult.diagnostics[0].code,
  'LAFEA_PUBLIC_FAILURE',
);
assert.equal(
  publicState.stages['LAFEA.1'].lastEditResult.diagnostics[0].message.includes(sentinel),
  false,
);
assert.equal(
  publicState.stages['LAFEA.1'].lifecycleReadiness.blockingReasons[0],
  sentinel,
  'governed readiness reasons are not exception messages and must remain visible',
);
assert.equal(rawState.diagnostics[0].message, sentinel,
  'public projection must not mutate retained/internal diagnostic custody');

const evidence = Object.freeze({ schema: 'some-evidence/v1', status: 'QUALIFIED' });
assert.equal(sanitizeLafeaPublicResult(evidence), evidence,
  'non-workbench evidence/projection objects must pass through unchanged');

const controllerSource = await read('src/workspace/lafea-workbench-controller.js');
assert.match(controllerSource, /import \{ publicLafeaFailure \} from '\.\/lafea-public-failure\.js';/u);
assert.equal((controllerSource.match(/publicLafeaFailure\(/gu) ?? []).length, 3,
  'qualification sample, run-input rejection and product-run exception must use the public projection');
assert.equal(/message:\s*error instanceof Error \? error\.message/u.test(controllerSource), false,
  'controller public EMP.1 failure projection must not copy raw error.message');
assert.match(
  controllerSource,
  /code: 'EMP1_WORKBENCH_RUN_NOT_READY',[\s\S]*?message: readiness\.reasons\.join\(', '\)/u,
  'governed EMP.1 readiness reasons must remain visible',
);

const apiSource = await read('src/workspace/lafea-workbench-orchestrator-api.js');
assert.match(apiSource, /sanitizeLafeaPublicResult/u);
assert.match(apiSource, /sanitizeLafeaPublicState/u);
assert.match(
  apiSource,
  /subscribe: \(listener\) => c\.subscribe\(\(state\) => listener\(sanitizeLafeaPublicState\(state\)\)\)/u,
  'canonical subscriptions must cross the public state projection',
);
assert.match(
  apiSource,
  /typeof value === 'function'[\s\S]*?exposePublicResult\(value\(\.\.\.args\)\)/u,
  'canonical API return values must cross the public result projection',
);
assert.match(
  apiSource,
  /return sanitizeLafeaPublicResult\(value\);/u,
  'synchronous canonical state returns must be sanitized',
);

for (const obsoletePath of [
  'lafea-workbench-document-store.js',
  'lafea-workbench-run-state.js',
  'lafea-workbench-run-store.js',
]) {
  assert.equal(apiSource.includes(obsoletePath), false,
    `canonical API must not depend on obsolete modular store path ${obsoletePath}`);
}

console.log('EMP1_RUNTIME_ERROR_REDACTION_CHECK: PASS');

async function read(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}
