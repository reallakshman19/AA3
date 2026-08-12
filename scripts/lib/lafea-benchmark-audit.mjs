import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite number in audit evidence.');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('Audit evidence must contain JSON-safe plain objects only.');
  }
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function sha256Text(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function sha256File(filePath) {
  return `sha256:${createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
}

export function runAuditedMethod({ root, method, runDir }) {
  const started = process.hrtime.bigint();
  const env = { ...process.env, LAFEA_BENCHMARK_AUDIT: '1' };
  let reportPath = null;
  if (method.reportEnv) {
    reportPath = `${runDir}/${method.reportEnv.filename}`;
    env[method.reportEnv.name] = reportPath;
  }
  const result = spawnSync(method.command[0], method.command.slice(1), {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const stdoutPath = `${runDir}/${method.methodId}.stdout.log`;
  const stderrPath = `${runDir}/${method.methodId}.stderr.log`;
  fs.writeFileSync(stdoutPath, stdout, 'utf8');
  fs.writeFileSync(stderrPath, stderr, 'utf8');
  const refs = Object.fromEntries(method.sourceRefs.map((ref) => [ref, sha256File(`${root}/${ref}`)]));
  const retainedEvidence = reportPath && fs.existsSync(reportPath)
    ? { path: relativeToRoot(root, reportPath), sha256: sha256File(reportPath) }
    : null;
  return {
    methodId: method.methodId,
    authorityClass: method.authorityClass,
    command: method.command,
    sourceRefHashes: refs,
    oracleAuthority: method.oracleAuthority,
    expectedEvidenceSchema: method.expectedEvidenceSchema,
    exitCode: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal ?? null,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    stdout: { path: relativeToRoot(root, stdoutPath), sha256: sha256Text(stdout) },
    stderr: { path: relativeToRoot(root, stderrPath), sha256: sha256Text(stderr) },
    retainedEvidence,
    status: result.status === 0 ? 'PASS' : 'FAIL',
  };
}

export function caseDisposition(methodResults) {
  const pass = methodResults.length > 0 && methodResults.every((row) => row.status === 'PASS');
  return {
    caseStatus: pass ? 'PASS' : 'FAIL',
    nextBenchmarkAuthorized: pass,
    baselineDisposition: pass ? 'ELIGIBLE_EXECUTION_BASELINE' : 'NOT_ELIGIBLE',
  };
}

export function finalizeAuditRecord(recordWithoutHash) {
  return Object.freeze({
    ...recordWithoutHash,
    recordHash: sha256Text(canonicalJson(recordWithoutHash)),
  });
}

function relativeToRoot(root, filePath) {
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  return filePath.startsWith(normalizedRoot) ? filePath.slice(normalizedRoot.length) : filePath;
}
