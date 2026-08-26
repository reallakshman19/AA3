#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { request } from 'node:https';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY_SEMANTIC_HASH,
  validateEmp1ProfessionalSecurityHeaders,
} from './emp1-professional-security-header-policy.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));

if (options.fixtureNetworkError) {
  emit(notRun(`EMP1_SECURITY_HEADERS_NETWORK_${safeCode(options.fixtureNetworkError)}`, null, false));
}

if (options.fixtureResponse) {
  let fixture;
  try {
    fixture = JSON.parse(await readFile(resolve(root, options.fixtureResponse), 'utf8'));
  } catch {
    emit(fail('EMP1_SECURITY_HEADERS_FIXTURE_INVALID', null, false));
  }
  const classified = validateEmp1ProfessionalSecurityHeaders(fixture);
  emit(Object.freeze({
    ...classified,
    code: classified.status === 'PASS'
      ? 'PASS_EMP1_DEPLOYED_SECURITY_HEADERS_FIXTURE_CLASSIFICATION_ONLY'
      : classified.code,
    liveHeadersObserved: false,
    browserCompatibilityEstablished: false,
  }));
}

const receipt = await readDeploymentReceipt(options);
const deploymentUrl = receipt.deployment.url;
const observation = await observeHttps(deploymentUrl);
if (observation.status === 'NOT_RUN_EXECUTION_ENVIRONMENT') {
  emit(notRun(observation.code, deploymentUrl, false));
}
if (observation.status === 'FAIL') emit(fail(observation.code, deploymentUrl, false));

const classified = validateEmp1ProfessionalSecurityHeaders({
  initialUrl: deploymentUrl,
  finalUrl: observation.finalUrl,
  statusCode: observation.statusCode,
  headers: observation.headers,
});
if (classified.status !== 'PASS') {
  emit(Object.freeze({
    ...classified,
    deploymentUrl,
    liveHeadersObserved: true,
    browserCompatibilityEstablished: false,
  }));
}

emit(Object.freeze({
  ...classified,
  code: 'PASS_EMP1_DEPLOYED_SECURITY_HEADERS_OBSERVED',
  deploymentUrl,
  liveHeadersObserved: true,
  browserCompatibilityEstablished: false,
  authorityBoundary: Object.freeze({
    ...classified.authorityBoundary,
    deployedHeadersCanBlockRelease: true,
    liveHeadersObserved: true,
    browserCompatibilityEstablished: false,
    releaseAuthorityGranted: false,
  }),
}));

async function readDeploymentReceipt(options) {
  if (!options.receipt) throw controlledError('EMP1_SECURITY_HEADERS_DEPLOYMENT_RECEIPT_REQUIRED');
  let receipt;
  try {
    receipt = JSON.parse(await readFile(resolve(root, options.receipt), 'utf8'));
  } catch {
    throw controlledError('EMP1_SECURITY_HEADERS_DEPLOYMENT_RECEIPT_INVALID');
  }
  assert.equal(receipt.schema, 'emp1-professional-deployment-receipt/v1',
    'EMP1_SECURITY_HEADERS_DEPLOYMENT_RECEIPT_SCHEMA_INVALID');
  assert.equal(receipt.candidate?.headSha, options.expectedHead,
    'EMP1_SECURITY_HEADERS_DEPLOYMENT_HEAD_MISMATCH');
  assert.equal(receipt.candidate?.treeSha, options.expectedTree,
    'EMP1_SECURITY_HEADERS_DEPLOYMENT_TREE_MISMATCH');
  assert.equal(receipt.candidate?.buildArtifactSha256, options.expectedArtifactSha256,
    'EMP1_SECURITY_HEADERS_DEPLOYMENT_ARTIFACT_MISMATCH');
  assert.equal(receipt.deployment?.deployedArtifactSha256, options.expectedArtifactSha256,
    'EMP1_SECURITY_HEADERS_DEPLOYED_ARTIFACT_MISMATCH');
  assert.equal(receipt.deployment?.environment, 'PRODUCTION',
    'EMP1_SECURITY_HEADERS_PRODUCTION_DEPLOYMENT_REQUIRED');
  assert.equal(receipt.deployment?.state, 'DEPLOYED',
    'EMP1_SECURITY_HEADERS_DEPLOYED_STATE_REQUIRED');
  assert.ok(safeHttpsUrl(receipt.deployment?.url), 'EMP1_SECURITY_HEADERS_DEPLOYMENT_HTTPS_URL_REQUIRED');
  assert.equal(receipt.smokeCheck?.status, 'PASS', 'EMP1_SECURITY_HEADERS_DEPLOYMENT_SMOKE_PASS_REQUIRED');
  assert.equal(receipt.smokeCheck?.url, receipt.deployment.url,
    'EMP1_SECURITY_HEADERS_DEPLOYMENT_SMOKE_URL_MISMATCH');
  assert.equal(receipt.receiptSemanticHash, semanticHash(receipt),
    'EMP1_SECURITY_HEADERS_DEPLOYMENT_RECEIPT_SEMANTIC_HASH_MISMATCH');
  return receipt;
}

async function observeHttps(initialUrl) {
  const initial = safeHttpsUrl(initialUrl);
  if (!initial) return failTransport('EMP1_SECURITY_HEADERS_INITIAL_HTTPS_URL_REQUIRED');
  return requestUrl(initial, initial.origin, 0);
}

function requestUrl(url, initialOrigin, redirectDepth) {
  return new Promise((resolveObservation) => {
    if (redirectDepth > 3) {
      resolveObservation(failTransport('EMP1_SECURITY_HEADERS_REDIRECT_LIMIT_EXCEEDED'));
      return;
    }
    const req = request(url, {
      method: 'GET',
      headers: {
        accept: 'text/html,*/*;q=0.1',
        'user-agent': 'EMP1-Professional-Release-Security-Header-Observer/1',
      },
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        const location = response.headers.location;
        response.resume();
        if (!location) {
          resolveObservation(failTransport('EMP1_SECURITY_HEADERS_REDIRECT_LOCATION_REQUIRED'));
          return;
        }
        let next;
        try {
          next = new URL(location, url);
        } catch {
          resolveObservation(failTransport('EMP1_SECURITY_HEADERS_REDIRECT_URL_INVALID'));
          return;
        }
        if (next.protocol !== 'https:') {
          resolveObservation(failTransport('EMP1_SECURITY_HEADERS_REDIRECT_HTTPS_REQUIRED'));
          return;
        }
        if (next.origin !== initialOrigin) {
          resolveObservation(failTransport('EMP1_SECURITY_HEADERS_CROSS_ORIGIN_REDIRECT_PROHIBITED'));
          return;
        }
        resolveObservation(requestUrl(next, initialOrigin, redirectDepth + 1));
        return;
      }
      const headers = response.headers;
      response.resume();
      resolveObservation(Object.freeze({
        status: 'OBSERVED',
        finalUrl: url.href,
        statusCode,
        headers,
      }));
    });
    req.setTimeout(10_000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', (error) => {
      resolveObservation(Object.freeze({
        status: 'NOT_RUN_EXECUTION_ENVIRONMENT',
        code: `EMP1_SECURITY_HEADERS_NETWORK_${safeCode(error?.code ?? 'REQUEST_ERROR')}`,
      }));
    });
    req.end();
  });
}

function failTransport(code) { return Object.freeze({ status: 'FAIL', code }); }
function notRun(code, deploymentUrl, liveHeadersObserved) {
  return Object.freeze({
    schema: 'emp1-professional-deployment-security-headers/v1',
    status: 'NOT_RUN_EXECUTION_ENVIRONMENT',
    code,
    deploymentUrl,
    policySemanticHash: EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY_SEMANTIC_HASH,
    liveHeadersObserved,
    browserCompatibilityEstablished: false,
    authorityBoundary: Object.freeze({
      deployedHeadersCanBlockRelease: true,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
      browserCompatibilityEstablished: false,
    }),
  });
}
function fail(code, deploymentUrl, liveHeadersObserved) {
  return Object.freeze({
    schema: 'emp1-professional-deployment-security-headers/v1',
    status: 'FAIL',
    code,
    deploymentUrl,
    policySemanticHash: EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY_SEMANTIC_HASH,
    liveHeadersObserved,
    browserCompatibilityEstablished: false,
    authorityBoundary: Object.freeze({
      deployedHeadersCanBlockRelease: true,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
      browserCompatibilityEstablished: false,
    }),
  });
}
function parseArgs(args) {
  const out = {
    receipt: null,
    expectedHead: null,
    expectedTree: null,
    expectedArtifactSha256: null,
    fixtureResponse: null,
    fixtureNetworkError: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--receipt') out.receipt = requiredValue(args, ++index, arg);
    else if (arg === '--expected-head') out.expectedHead = requiredValue(args, ++index, arg);
    else if (arg === '--expected-tree') out.expectedTree = requiredValue(args, ++index, arg);
    else if (arg === '--expected-artifact-sha256') out.expectedArtifactSha256 = requiredValue(args, ++index, arg);
    else if (arg === '--fixture-response') out.fixtureResponse = requiredValue(args, ++index, arg);
    else if (arg === '--fixture-network-error') out.fixtureNetworkError = requiredValue(args, ++index, arg);
    else throw controlledError(`EMP1_SECURITY_HEADERS_ARGUMENT_UNSUPPORTED:${arg}`);
  }
  const fixtureMode = Boolean(out.fixtureResponse || out.fixtureNetworkError);
  if (fixtureMode) {
    if (out.fixtureResponse && out.fixtureNetworkError) {
      throw controlledError('EMP1_SECURITY_HEADERS_FIXTURE_MODES_MUTUALLY_EXCLUSIVE');
    }
    return out;
  }
  if (!out.receipt) throw controlledError('EMP1_SECURITY_HEADERS_DEPLOYMENT_RECEIPT_REQUIRED');
  if (!/^[0-9a-f]{40}$/u.test(out.expectedHead ?? '')) {
    throw controlledError('EMP1_SECURITY_HEADERS_EXPECTED_HEAD_INVALID');
  }
  if (!/^[0-9a-f]{40}$/u.test(out.expectedTree ?? '')) {
    throw controlledError('EMP1_SECURITY_HEADERS_EXPECTED_TREE_INVALID');
  }
  if (!/^[0-9a-f]{64}$/u.test(out.expectedArtifactSha256 ?? '')) {
    throw controlledError('EMP1_SECURITY_HEADERS_EXPECTED_ARTIFACT_SHA256_INVALID');
  }
  return out;
}
function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw controlledError(`EMP1_SECURITY_HEADERS_ARGUMENT_VALUE_REQUIRED:${flag}`);
  return value;
}
function semanticHash(value) {
  const { receiptSemanticHash: _hash, ...payload } = value;
  return createHash('sha256').update(JSON.stringify(sortValue(payload)), 'utf8').digest('hex');
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}
function safeCode(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]+/gu, '_').replace(/^_+|_+$/gu, '').slice(0, 80) || 'UNKNOWN';
}
function controlledError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
function emit(payload) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.status === 'PASS' ? 0 : payload.status === 'NOT_RUN_EXECUTION_ENVIRONMENT' ? 3 : 1);
}
