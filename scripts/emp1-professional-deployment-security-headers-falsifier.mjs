#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEmp1ProfessionalSecurityHeaders } from './emp1-professional-security-header-policy.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checker = resolve(root, 'scripts/emp1-professional-deployment-security-headers-check.mjs');
const temp = await mkdtemp(join(tmpdir(), 'emp1-security-headers-'));

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
].join('; ');
const GOOD_HEADERS = Object.freeze({
  'content-security-policy': CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
});
const BASE = Object.freeze({
  initialUrl: 'https://example.invalid/app',
  finalUrl: 'https://example.invalid/app',
  statusCode: 200,
  headers: GOOD_HEADERS,
});

try {
  const good = validateEmp1ProfessionalSecurityHeaders(BASE);
  assert.equal(good.status, 'PASS');
  assert.equal(good.authorityBoundary.browserCompatibilityEstablishedByStaticPolicy, false);

  expectFail({ ...BASE, headers: omit(GOOD_HEADERS, 'content-security-policy') }, 'EMP1_SECURITY_HEADERS_CSP_REQUIRED');
  expectFail(cspMutation("script-src 'self' 'unsafe-inline'"), 'EMP1_SECURITY_HEADERS_CSP_FORBIDDEN_TOKEN_UNSAFE_INLINE');
  expectFail(cspMutation("script-src 'self' 'unsafe-eval'"), 'EMP1_SECURITY_HEADERS_CSP_FORBIDDEN_TOKEN_UNSAFE_EVAL');
  expectFail(cspMutation("script-src 'self' *"), 'EMP1_SECURITY_HEADERS_CSP_FORBIDDEN_TOKEN_TOKEN');
  expectFail(cspMutation("script-src 'self' https://cdn.example.com"));
  expectFail(cspRemove('object-src'), 'EMP1_SECURITY_HEADERS_CSP_OBJECT_SRC_REQUIRED');
  expectFail(cspRemove('frame-ancestors'), 'EMP1_SECURITY_HEADERS_CSP_FRAME_ANCESTORS_REQUIRED');
  expectFail(cspRemove('base-uri'), 'EMP1_SECURITY_HEADERS_CSP_BASE_URI_REQUIRED');
  expectFail(cspRemove('form-action'), 'EMP1_SECURITY_HEADERS_CSP_FORM_ACTION_REQUIRED');
  expectFail(cspMutation("style-src 'self'"), 'EMP1_SECURITY_HEADERS_CSP_STYLE_SRC_POLICY_MISMATCH');
  expectFail({ ...BASE, headers: omit(GOOD_HEADERS, 'x-content-type-options') },
    'EMP1_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS_NOSNIFF_REQUIRED');
  expectFail({ ...BASE, headers: { ...GOOD_HEADERS, 'referrer-policy': 'unsafe-url' } },
    'EMP1_SECURITY_HEADERS_REFERRER_POLICY_UNQUALIFIED');
  expectFail({ ...BASE, headers: { ...GOOD_HEADERS, 'permissions-policy': 'camera=(), microphone=()' } },
    'EMP1_SECURITY_HEADERS_PERMISSIONS_GEOLOCATION_DISABLE_REQUIRED');
  expectFail({ ...BASE, finalUrl: 'https://other.invalid/app' },
    'EMP1_SECURITY_HEADERS_CROSS_ORIGIN_REDIRECT_PROHIBITED');
  expectFail({ ...BASE, statusCode: 500 }, 'EMP1_SECURITY_HEADERS_HTTP_SUCCESS_REQUIRED');

  const fixturePath = join(temp, 'good-response.json');
  await writeFile(fixturePath, `${JSON.stringify(BASE, null, 2)}\n`, 'utf8');
  const fixtureRun = spawnSync(process.execPath, [checker, '--fixture-response', fixturePath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(fixtureRun.error, undefined);
  assert.equal(fixtureRun.status, 0);
  const fixturePayload = JSON.parse(fixtureRun.stdout);
  assert.equal(fixturePayload.status, 'PASS');
  assert.equal(fixturePayload.code, 'PASS_EMP1_DEPLOYED_SECURITY_HEADERS_FIXTURE_CLASSIFICATION_ONLY');
  assert.equal(fixturePayload.liveHeadersObserved, false);
  assert.equal(fixturePayload.browserCompatibilityEstablished, false);

  const networkRun = spawnSync(process.execPath, [checker, '--fixture-network-error', 'ENOTFOUND'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(networkRun.error, undefined);
  assert.equal(networkRun.status, 3);
  const networkPayload = JSON.parse(networkRun.stdout);
  assert.equal(networkPayload.status, 'NOT_RUN_EXECUTION_ENVIRONMENT');
  assert.equal(networkPayload.liveHeadersObserved, false);

  const candidateSource = await readFile(resolve(root, 'scripts/emp1-professional-release-candidate.mjs'), 'utf8');
  const deploymentIndex = candidateSource.indexOf("runNode('DEPLOYMENT_EVIDENCE'");
  const headersIndex = candidateSource.indexOf("runNode('DEPLOYMENT_SECURITY_HEADERS'");
  assert.ok(deploymentIndex >= 0, 'deployment receipt gate must exist');
  assert.ok(headersIndex > deploymentIndex, 'security headers must be observed after deployment receipt verification');
  assert.match(candidateSource, /emp1-professional-deployment-security-headers-check\.mjs/u);
  assert.match(candidateSource, /gateId === 'DEPLOYMENT_SECURITY_HEADERS' && result\.status === 3/u,
    'deployment header observer exit 3 must remain NOT_RUN');
  assert.match(candidateSource, /browserCompatibilityEstablishedByHeaderPolicy:\s*false/u,
    'release harness must not claim browser compatibility from header policy');

  console.log(JSON.stringify({
    schema: 'emp1-professional-deployment-security-headers-falsifier/v1',
    status: 'PASS',
    falsifiers: [
      'MISSING_CSP_REJECTED',
      'SCRIPT_UNSAFE_INLINE_REJECTED',
      'SCRIPT_UNSAFE_EVAL_REJECTED',
      'SCRIPT_WILDCARD_REJECTED',
      'EXTERNAL_SCRIPT_ORIGIN_REJECTED',
      'OBJECT_FRAME_BASE_FORM_RESTRICTIONS_REQUIRED',
      'CURRENT_STYLE_INLINE_COMPATIBILITY_BOUND',
      'NOSNIFF_REFERRER_PERMISSIONS_REQUIRED',
      'CROSS_ORIGIN_REDIRECT_REJECTED',
      'HTTP_NON_SUCCESS_REJECTED',
      'FIXTURE_PASS_CANNOT_CREATE_LIVE_HEADER_OR_BROWSER_AUTHORITY',
      'NETWORK_FAILURE_IS_NOT_RUN',
      'HEADER_GATE_ORDERED_AFTER_DEPLOYMENT_RECEIPT',
      'HEADER_GATE_EXIT3_BOUND_TO_NOT_RUN',
      'BROWSER_COMPATIBILITY_CLAIM_FORBIDDEN',
    ],
    authorityBoundary: {
      liveHeadersObserved: false,
      browserCompatibilityEstablished: false,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
    },
  }, null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
}

function expectFail(input, expectedCode = null) {
  const result = validateEmp1ProfessionalSecurityHeaders(input);
  assert.equal(result.status, 'FAIL');
  if (expectedCode) assert.equal(result.code, expectedCode);
}
function cspMutation(replacement) {
  const directive = replacement.split(/\s+/u)[0];
  const rows = CSP.split('; ').map((row) => row.startsWith(`${directive} `) ? replacement : row);
  return { ...BASE, headers: { ...GOOD_HEADERS, 'content-security-policy': rows.join('; ') } };
}
function cspRemove(directive) {
  return {
    ...BASE,
    headers: {
      ...GOOD_HEADERS,
      'content-security-policy': CSP.split('; ').filter((row) => !row.startsWith(`${directive} `)).join('; '),
    },
  };
}
function omit(object, key) {
  const out = { ...object };
  delete out[key];
  return out;
}
