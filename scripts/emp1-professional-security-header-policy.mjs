#!/usr/bin/env node
import { createHash } from 'node:crypto';

export const EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY = Object.freeze({
  schema: 'emp1-professional-security-header-policy/v1',
  contentSecurityPolicy: Object.freeze({
    requiredDirectives: Object.freeze({
      'default-src': Object.freeze(["'self'"]),
      'base-uri': Object.freeze(["'self'"]),
      'object-src': Object.freeze(["'none'"]),
      'frame-ancestors': Object.freeze(["'none'"]),
      'form-action': Object.freeze(["'self'"]),
      'script-src': Object.freeze(["'self'"]),
      'style-src': Object.freeze(["'self'", "'unsafe-inline'"]),
      'connect-src': Object.freeze(["'self'"]),
      'worker-src': Object.freeze(["'self'", 'blob:']),
      'img-src': Object.freeze(["'self'", 'data:', 'blob:']),
      'font-src': Object.freeze(["'self'", 'data:']),
    }),
    optionalOverrideDirectives: Object.freeze({
      'script-src-elem': Object.freeze(["'self'"]),
      'script-src-attr': Object.freeze(["'none'"]),
      'style-src-elem': Object.freeze(["'self'", "'unsafe-inline'"]),
      'style-src-attr': Object.freeze(["'unsafe-inline'"]),
      'child-src': Object.freeze(["'self'", 'blob:']),
      'frame-src': Object.freeze(["'none'"]),
      'manifest-src': Object.freeze(["'self'"]),
      'media-src': Object.freeze(["'self'", 'blob:']),
    }),
    forbiddenTokensAnywhere: Object.freeze([
      '*',
      "'unsafe-eval'",
      "'wasm-unsafe-eval'",
      'http:',
      'https:',
    ]),
    compatibilityExceptions: Object.freeze([
      'STYLE_SRC_UNSAFE_INLINE_REQUIRED_BY_CURRENT_DOM_STYLE_RUNTIME',
      'WORKER_SRC_BLOB_ALLOWED_FOR_BOUNDED_CURRENT_RUNTIME',
      'IMG_SRC_DATA_BLOB_ALLOWED_FOR_BOUNDED_CURRENT_RUNTIME',
    ]),
  }),
  requiredHeaders: Object.freeze({
    'x-content-type-options': 'nosniff',
    referrerPolicyAllowed: Object.freeze(['no-referrer', 'strict-origin-when-cross-origin']),
    permissionsPolicyRequired: Object.freeze({
      camera: '()',
      microphone: '()',
      geolocation: '()',
    }),
  }),
  authorityBoundary: Object.freeze({
    engineeringAuthorityGranted: false,
    releaseAuthorityGranted: false,
    deploymentAuthorityGranted: false,
    browserCompatibilityEstablishedByStaticPolicy: false,
    broaderApplicationSecurityCertificationClaimed: false,
  }),
});

export const EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY_SEMANTIC_HASH = sha256Canonical(
  EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY,
);

export function validateEmp1ProfessionalSecurityHeaders(input) {
  const initialUrl = safeHttpsUrl(input?.initialUrl);
  if (!initialUrl) return fail('EMP1_SECURITY_HEADERS_INITIAL_HTTPS_URL_REQUIRED');
  const finalUrl = safeHttpsUrl(input?.finalUrl ?? input?.initialUrl);
  if (!finalUrl) return fail('EMP1_SECURITY_HEADERS_FINAL_HTTPS_URL_REQUIRED');
  if (initialUrl.origin !== finalUrl.origin) {
    return fail('EMP1_SECURITY_HEADERS_CROSS_ORIGIN_REDIRECT_PROHIBITED');
  }
  if (!Number.isInteger(input?.statusCode) || input.statusCode < 200 || input.statusCode >= 300) {
    return fail('EMP1_SECURITY_HEADERS_HTTP_SUCCESS_REQUIRED');
  }

  const headers = normalizeHeaders(input?.headers);
  const cspRaw = headers['content-security-policy'];
  if (!requiredText(cspRaw)) return fail('EMP1_SECURITY_HEADERS_CSP_REQUIRED');
  const csp = parseCsp(cspRaw);
  if (!csp) return fail('EMP1_SECURITY_HEADERS_CSP_PARSE_FAILED');

  const forbiddenCategory = findForbiddenCspCategory(csp);
  if (forbiddenCategory) return fail(`EMP1_SECURITY_HEADERS_CSP_FORBIDDEN_${forbiddenCategory}`);

  for (const [directive, expected] of Object.entries(
    EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.contentSecurityPolicy.requiredDirectives,
  )) {
    const actual = csp.get(directive);
    if (!actual) return fail(`EMP1_SECURITY_HEADERS_CSP_${sanitizeCodeToken(directive)}_REQUIRED`);
    if (!sameTokenSet(actual, expected)) {
      return fail(`EMP1_SECURITY_HEADERS_CSP_${sanitizeCodeToken(directive)}_POLICY_MISMATCH`);
    }
  }

  for (const [directive, expected] of Object.entries(
    EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.contentSecurityPolicy.optionalOverrideDirectives,
  )) {
    const actual = csp.get(directive);
    if (actual && !sameTokenSet(actual, expected)) {
      return fail(`EMP1_SECURITY_HEADERS_CSP_${sanitizeCodeToken(directive)}_OVERRIDE_MISMATCH`);
    }
  }

  if ((headers['x-content-type-options'] ?? '').trim().toLowerCase() !== 'nosniff') {
    return fail('EMP1_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS_NOSNIFF_REQUIRED');
  }
  const referrerPolicy = (headers['referrer-policy'] ?? '').trim().toLowerCase();
  if (!EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.requiredHeaders.referrerPolicyAllowed.includes(referrerPolicy)) {
    return fail('EMP1_SECURITY_HEADERS_REFERRER_POLICY_UNQUALIFIED');
  }
  const permissions = parsePermissionsPolicy(headers['permissions-policy']);
  if (!permissions) return fail('EMP1_SECURITY_HEADERS_PERMISSIONS_POLICY_REQUIRED');
  for (const [feature, expected] of Object.entries(
    EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.requiredHeaders.permissionsPolicyRequired,
  )) {
    if (permissions.get(feature) !== expected) {
      return fail(`EMP1_SECURITY_HEADERS_PERMISSIONS_${sanitizeCodeToken(feature)}_DISABLE_REQUIRED`);
    }
  }

  const observed = Object.freeze({
    contentSecurityPolicy: canonicalCsp(csp),
    xContentTypeOptions: 'nosniff',
    referrerPolicy,
    permissionsPolicy: canonicalPermissions(permissions),
  });
  return Object.freeze({
    schema: 'emp1-professional-security-header-policy-observation/v1',
    status: 'PASS',
    code: 'PASS_EMP1_DEPLOYED_SECURITY_HEADERS_POLICY',
    initialUrl: initialUrl.href,
    finalUrl: finalUrl.href,
    statusCode: input.statusCode,
    policySemanticHash: EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY_SEMANTIC_HASH,
    observedSecurityHeadersSha256: sha256Canonical(observed),
    observed,
    authorityBoundary: EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.authorityBoundary,
  });
}

export function parseCsp(value) {
  if (!requiredText(value)) return null;
  const directives = new Map();
  for (const rawDirective of String(value).split(';')) {
    const trimmed = rawDirective.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/u);
    const name = parts.shift()?.toLowerCase();
    if (!name || !/^[a-z][a-z0-9-]*$/u.test(name) || directives.has(name)) return null;
    directives.set(name, parts.map((token) => token.toLowerCase()));
  }
  return directives.size > 0 ? directives : null;
}

export function parsePermissionsPolicy(value) {
  if (!requiredText(value)) return null;
  const out = new Map();
  for (const raw of String(value).split(',')) {
    const match = /^\s*([a-z][a-z0-9-]*)\s*=\s*(\([^)]*\))\s*$/iu.exec(raw);
    if (!match) return null;
    const feature = match[1].toLowerCase();
    const allowlist = match[2].replace(/\s+/gu, '');
    if (out.has(feature)) return null;
    out.set(feature, allowlist);
  }
  return out.size > 0 ? out : null;
}

function findForbiddenCspCategory(csp) {
  const forbidden = new Set(
    EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.contentSecurityPolicy.forbiddenTokensAnywhere,
  );
  for (const [directive, tokens] of csp.entries()) {
    for (const token of tokens) {
      if (token === '*') return 'WILDCARD';
      if (token === "'unsafe-eval'") return 'UNSAFE_EVAL';
      if (token === "'wasm-unsafe-eval'") return 'WASM_UNSAFE_EVAL';
      if (token === 'http:' || token === 'https:' || /^https?:\/\//u.test(token)) return 'EXTERNAL_ORIGIN';
      if (forbidden.has(token)) return 'UNQUALIFIED_SOURCE';
      if (directive !== 'style-src' && directive !== 'style-src-elem' && directive !== 'style-src-attr'
        && token === "'unsafe-inline'") return 'UNSAFE_INLINE';
    }
  }
  return null;
}

function normalizeHeaders(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.freeze({});
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const name = String(key).trim().toLowerCase();
    if (!name) continue;
    if (Array.isArray(raw)) out[name] = raw.map(String).join(', ');
    else if (raw != null) out[name] = String(raw);
  }
  return Object.freeze(out);
}
function sameTokenSet(actual, expected) {
  const a = [...actual].sort();
  const b = [...expected].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function canonicalCsp(csp) {
  return [...csp.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, tokens]) => `${name} ${[...tokens].sort().join(' ')}`)
    .join('; ');
}
function canonicalPermissions(value) {
  return [...value.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, allowlist]) => `${name}=${allowlist}`)
    .join(', ');
}
function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}
function fail(code) {
  return Object.freeze({
    schema: 'emp1-professional-security-header-policy-observation/v1',
    status: 'FAIL',
    code,
    policySemanticHash: EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY_SEMANTIC_HASH,
    authorityBoundary: EMP1_PROFESSIONAL_SECURITY_HEADER_POLICY.authorityBoundary,
  });
}
function sanitizeCodeToken(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') || 'TOKEN';
}
function requiredText(value) { return typeof value === 'string' && value.trim().length > 0; }
function sha256Canonical(value) {
  return createHash('sha256').update(JSON.stringify(sortValue(value)), 'utf8').digest('hex');
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
