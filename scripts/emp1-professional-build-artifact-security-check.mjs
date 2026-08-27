#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { basename, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const artifactRoot = resolve(options.dist ?? resolve(root, 'dist'));

const CONTROLLED_SOURCE_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'WRC537_2013_PRIMARY_SOURCE',
    basename: 'WRC537_2013.pdf',
    sha256: '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
  }),
  Object.freeze({
    id: 'CAUX_2017_WRC01F_BENCHMARK_SOURCE',
    basename: 'CAUx 2017 - WRC01f.pdf',
    sha256: 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e',
  }),
]);

const BLOCKED_EXTENSIONS = new Map([
  ['.map', 'DEPLOYABLE_SOURCE_MAP_PROHIBITED'],
  ['.pem', 'DEPLOYABLE_PRIVATE_KEY_CONTAINER_PROHIBITED'],
  ['.key', 'DEPLOYABLE_PRIVATE_KEY_CONTAINER_PROHIBITED'],
  ['.p12', 'DEPLOYABLE_PRIVATE_KEY_CONTAINER_PROHIBITED'],
  ['.pfx', 'DEPLOYABLE_PRIVATE_KEY_CONTAINER_PROHIBITED'],
]);

const SECRET_PATTERNS = Object.freeze([
  Object.freeze({
    id: 'PRIVATE_KEY_PEM_HEADER',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/u,
  }),
  Object.freeze({
    id: 'GITHUB_PERSONAL_ACCESS_TOKEN',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/u,
  }),
  Object.freeze({
    id: 'AWS_ACCESS_KEY_ID',
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/u,
  }),
]);

const violations = [];
let fileCount = 0;
let totalBytes = 0;

try {
  await walk(artifactRoot);
} catch (error) {
  const receipt = resultReceipt({
    status: 'FAIL_BUILD_ARTIFACT_SECURITY_SCAN_UNAVAILABLE',
    violations: [Object.freeze({
      code: error?.code === 'ENOENT'
        ? 'BUILD_ARTIFACT_DIRECTORY_REQUIRED'
        : 'BUILD_ARTIFACT_SECURITY_SCAN_ERROR',
      path: '.',
    })],
  });
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(1);
}

violations.sort((a, b) => `${a.path}\0${a.code}`.localeCompare(`${b.path}\0${b.code}`));
const receipt = resultReceipt({
  status: violations.length
    ? 'FAIL_BUILD_ARTIFACT_SECURITY_VIOLATIONS'
    : 'PASS_BUILD_ARTIFACT_SECURITY',
  violations,
});
console.log(JSON.stringify(receipt, null, 2));
process.exit(violations.length ? 1 : 0);

async function walk(path) {
  const stat = await lstat(path);
  const rel = relative(artifactRoot, path).replaceAll('\\', '/') || '.';
  if (stat.isSymbolicLink()) {
    addViolation('DEPLOYABLE_SYMLINK_PROHIBITED', rel);
    return;
  }
  if (stat.isFile()) {
    await inspectFile(path, rel, stat.size);
    return;
  }
  if (!stat.isDirectory()) return;
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    await walk(resolve(path, entry.name));
  }
}

async function inspectFile(path, rel, declaredBytes) {
  fileCount += 1;
  totalBytes += declaredBytes;
  const name = basename(path);
  const lowerName = name.toLowerCase();
  const lowerExt = extname(name).toLowerCase();

  for (const source of CONTROLLED_SOURCE_ARTIFACTS) {
    if (lowerName === source.basename.toLowerCase()) {
      addViolation(`CONTROLLED_SOURCE_BASENAME_PROHIBITED:${source.id}`, rel);
    }
  }

  const blockedExtensionCode = BLOCKED_EXTENSIONS.get(lowerExt);
  if (blockedExtensionCode) addViolation(blockedExtensionCode, rel);
  if (lowerName === '.npmrc' || lowerName === '.env' || lowerName.startsWith('.env.')) {
    addViolation('DEPLOYABLE_CREDENTIAL_CONFIGURATION_PROHIBITED', rel);
  }

  const bytes = await readFile(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  for (const source of CONTROLLED_SOURCE_ARTIFACTS) {
    if (sha256 === source.sha256) {
      addViolation(`CONTROLLED_SOURCE_SHA256_PROHIBITED:${source.id}`, rel);
    }
  }

  const text = decodeUtf8IfText(bytes);
  if (text === null) return;
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(text)) addViolation(`SECRET_SIGNATURE_PROHIBITED:${pattern.id}`, rel);
  }
}

function decodeUtf8IfText(bytes) {
  if (!bytes.length) return '';
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function addViolation(code, path) {
  violations.push(Object.freeze({ code, path }));
}

function resultReceipt({ status, violations: rows }) {
  return Object.freeze({
    schema: 'emp1-professional-build-artifact-security/v1',
    status,
    artifact: Object.freeze({
      root: relative(root, artifactRoot).replaceAll('\\', '/') || '.',
      fileCount,
      totalBytes,
    }),
    controlledSourceChecks: CONTROLLED_SOURCE_ARTIFACTS.map((source) => Object.freeze({
      id: source.id,
      basename: source.basename,
      sha256: source.sha256,
    })),
    secretSignatureChecks: SECRET_PATTERNS.map((pattern) => pattern.id),
    violations: rows,
    diagnosticsExposeMatchedSecretOrSourceContent: false,
    authorityBoundary: Object.freeze({
      engineeringAuthorityCreated: false,
      sourceAuthorityCreated: false,
      routeAuthorityCreated: false,
      codeComplianceCreated: false,
      releaseAuthorityCreated: false,
      deploymentAuthorityCreated: false,
    }),
  });
}

function parseArgs(args) {
  const out = { dist: null };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--dist') {
      const next = args[index + 1];
      if (!next) throw new TypeError('EMP1_BUILD_ARTIFACT_SECURITY_DIST_PATH_REQUIRED');
      out.dist = next;
      index += 1;
      continue;
    }
    throw new TypeError(`EMP1_BUILD_ARTIFACT_SECURITY_UNKNOWN_ARGUMENT:${value}`);
  }
  return out;
}
