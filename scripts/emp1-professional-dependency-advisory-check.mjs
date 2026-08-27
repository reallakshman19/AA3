#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const lockPath = resolve(root, options.lockPath);
let lockBytes;
try {
  lockBytes = await readFile(lockPath);
} catch {
  emit(notRun('DEPENDENCY_ADVISORY_LOCKFILE_UNREADABLE', null, null, null));
}
const lockSha256 = sha256(lockBytes);

if (options.fixturePath) {
  let fixture;
  try {
    fixture = JSON.parse(await readFile(resolve(root, options.fixturePath), 'utf8'));
  } catch {
    emit(fail('DEPENDENCY_ADVISORY_FIXTURE_INVALID', lockSha256, null, null));
  }
  emit(classifyAuditPayload({
    payload: fixture,
    commandExitCode: options.fixtureExitCode,
    packageLockSha256: lockSha256,
    npmVersion: 'fixture',
    live: false,
    stdoutSha256: null,
    stderrSha256: null,
    stdoutBytes: null,
    stderrBytes: null,
  }));
}

const npmVersionRun = spawnSync(npmCommand(), ['--version'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
});
if (launchNotRun(npmVersionRun) || npmVersionRun.status !== 0) {
  emit(notRun('DEPENDENCY_ADVISORY_NPM_TOOL_UNAVAILABLE', lockSha256, null, npmVersionRun));
}
const npmVersion = /^\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/u.test(String(npmVersionRun.stdout ?? '').trim())
  ? String(npmVersionRun.stdout).trim()
  : null;
if (!npmVersion) emit(notRun('DEPENDENCY_ADVISORY_NPM_VERSION_UNQUALIFIED', lockSha256, null, npmVersionRun));

const auditRun = spawnSync(npmCommand(), ['audit', '--package-lock-only', '--json', '--audit-level=high'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env },
});
if (launchNotRun(auditRun)) {
  emit(notRun('DEPENDENCY_ADVISORY_NPM_AUDIT_NOT_RUN', lockSha256, npmVersion, auditRun));
}
if (auditEnvironmentUnavailable(auditRun)) {
  emit(notRun('DEPENDENCY_ADVISORY_SERVICE_UNAVAILABLE', lockSha256, npmVersion, auditRun));
}
let payload;
try {
  payload = JSON.parse(String(auditRun.stdout ?? ''));
} catch {
  emit(fail('DEPENDENCY_ADVISORY_OUTPUT_JSON_INVALID', lockSha256, npmVersion, auditRun));
}
emit(classifyAuditPayload({
  payload,
  commandExitCode: auditRun.status,
  packageLockSha256: lockSha256,
  npmVersion,
  live: true,
  stdoutSha256: sha256Text(auditRun.stdout ?? ''),
  stderrSha256: sha256Text(auditRun.stderr ?? ''),
  stdoutBytes: Buffer.byteLength(auditRun.stdout ?? '', 'utf8'),
  stderrBytes: Buffer.byteLength(auditRun.stderr ?? '', 'utf8'),
}));

export function classifyAuditPayload(input) {
  const auditErrorCode = safeCode(input.payload?.error?.code);
  if (input.payload?.error) {
    return notRun(
      auditErrorCode ? `DEPENDENCY_ADVISORY_SERVICE_${auditErrorCode}` : 'DEPENDENCY_ADVISORY_SERVICE_ERROR',
      input.packageLockSha256,
      input.npmVersion,
      null,
      input,
    );
  }
  const vulnerabilities = input.payload?.metadata?.vulnerabilities;
  if (!validVulnerabilityCounts(vulnerabilities)) {
    return fail('DEPENDENCY_ADVISORY_RESULT_SCHEMA_INVALID', input.packageLockSha256, input.npmVersion, null, input);
  }
  const counts = Object.freeze({
    info: vulnerabilities.info,
    low: vulnerabilities.low,
    moderate: vulnerabilities.moderate,
    high: vulnerabilities.high,
    critical: vulnerabilities.critical,
    total: vulnerabilities.total,
  });
  const liveEstablished = input.live === true;
  if (counts.high > 0 || counts.critical > 0) {
    return result({
      status: 'FAIL',
      code: 'DEPENDENCY_ADVISORY_HIGH_OR_CRITICAL_FOUND',
      packageLockSha256: input.packageLockSha256,
      npmVersion: input.npmVersion,
      commandExitCode: input.commandExitCode,
      counts,
      liveEstablished,
      evidence: input,
    });
  }
  if (input.commandExitCode !== 0) {
    return result({
      status: 'FAIL',
      code: 'DEPENDENCY_ADVISORY_COMMAND_EXIT_UNEXPECTED',
      packageLockSha256: input.packageLockSha256,
      npmVersion: input.npmVersion,
      commandExitCode: input.commandExitCode,
      counts,
      liveEstablished: false,
      evidence: input,
    });
  }
  return result({
    status: 'PASS',
    code: liveEstablished
      ? 'PASS_DEPENDENCY_ADVISORY_NO_HIGH_OR_CRITICAL'
      : 'PASS_DEPENDENCY_ADVISORY_FIXTURE_CLASSIFICATION_ONLY',
    packageLockSha256: input.packageLockSha256,
    npmVersion: input.npmVersion,
    commandExitCode: input.commandExitCode,
    counts,
    liveEstablished,
    evidence: input,
  });
}

function result({ status, code, packageLockSha256, npmVersion, commandExitCode, counts, liveEstablished, evidence }) {
  return Object.freeze({
    schema: 'emp1-professional-dependency-advisory/v1',
    status,
    code,
    auditLevel: 'HIGH',
    packageLockSha256,
    npmVersion,
    commandExitCode: Number.isInteger(commandExitCode) ? commandExitCode : null,
    vulnerabilityCounts: counts ?? null,
    stdoutSha256: evidence?.stdoutSha256 ?? null,
    stderrSha256: evidence?.stderrSha256 ?? null,
    stdoutBytes: evidence?.stdoutBytes ?? null,
    stderrBytes: evidence?.stderrBytes ?? null,
    authorityBoundary: Object.freeze({
      liveAdvisoryStatusEstablished: liveEstablished,
      vulnerabilityFreeClaimed: false,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
    }),
  });
}
function notRun(code, lockSha, npmVersion, run, evidence = null) {
  return result({
    status: 'NOT_RUN_EXECUTION_ENVIRONMENT',
    code,
    packageLockSha256: lockSha,
    npmVersion,
    commandExitCode: run?.status ?? evidence?.commandExitCode ?? null,
    counts: null,
    liveEstablished: false,
    evidence: evidence ?? runEvidence(run),
  });
}
function fail(code, lockSha, npmVersion, run, evidence = null) {
  return result({
    status: 'FAIL',
    code,
    packageLockSha256: lockSha,
    npmVersion,
    commandExitCode: run?.status ?? evidence?.commandExitCode ?? null,
    counts: null,
    liveEstablished: false,
    evidence: evidence ?? runEvidence(run),
  });
}
function runEvidence(run) {
  if (!run) return null;
  return {
    stdoutSha256: sha256Text(run.stdout ?? ''),
    stderrSha256: sha256Text(run.stderr ?? ''),
    stdoutBytes: Buffer.byteLength(run.stdout ?? '', 'utf8'),
    stderrBytes: Buffer.byteLength(run.stderr ?? '', 'utf8'),
  };
}
function validVulnerabilityCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return ['info', 'low', 'moderate', 'high', 'critical', 'total']
    .every((key) => Number.isInteger(value[key]) && value[key] >= 0);
}
function auditEnvironmentUnavailable(run) {
  if (!run || run.status === 0) return false;
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.toUpperCase();
  return [
    'ENETWORK',
    'EAI_AGAIN',
    'ENOTFOUND',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ERR_SOCKET',
    'ENOAUDIT',
    'E401',
    'E403',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_GET_ISSUER_CERT',
    'SELF_SIGNED_CERT',
  ].some((token) => text.includes(token));
}
function safeCode(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/u.test(value) ? value : null;
}
function launchNotRun(run) { return Boolean(run.error) || run.status == null || run.error?.code === 'ENOENT'; }
function npmCommand() { return process.platform === 'win32' ? 'npm.cmd' : 'npm'; }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function sha256Text(value) { return sha256(Buffer.from(String(value), 'utf8')); }
function emit(payload) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.status === 'PASS' ? 0 : payload.status === 'NOT_RUN_EXECUTION_ENVIRONMENT' ? 3 : 1);
}
function parseArgs(args) {
  const out = { lockPath: 'package-lock.json', fixturePath: null, fixtureExitCode: 0 };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--lock') out.lockPath = requireValue(args, ++index, arg);
    else if (arg === '--fixture') out.fixturePath = requireValue(args, ++index, arg);
    else if (arg === '--fixture-exit') {
      const raw = requireValue(args, ++index, arg);
      if (!/^-?\d+$/u.test(raw)) throw new TypeError('EMP1_DEPENDENCY_ADVISORY_FIXTURE_EXIT_INVALID');
      out.fixtureExitCode = Number(raw);
    } else throw new TypeError(`EMP1_DEPENDENCY_ADVISORY_ARGUMENT_UNSUPPORTED:${arg}`);
  }
  return out;
}
function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new TypeError(`EMP1_DEPENDENCY_ADVISORY_ARGUMENT_VALUE_REQUIRED:${flag}`);
  return value;
}
