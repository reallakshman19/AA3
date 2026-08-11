import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const REPORT = path.join(ROOT, 'reports', 'lfea-physical-absence-rehearsal.json');
const QUARANTINE = fs.mkdtempSync(path.join(ROOT, '.lfea-absence-'));
const moved = [];
const childRuns = [];
let ownedRelativePaths = [];
let primaryFailure = null;

try {
  const ownedPaths = discoverLafeaOwnedPaths(SRC);
  ownedRelativePaths = ownedPaths.map((entry) => slash(path.relative(ROOT, entry)));
  assertPhysicalWitness(ownedPaths);
  for (const sourcePath of ownedPaths) quarantine(sourcePath);
  assertAbsent(ownedPaths);
  runNode('scripts/run-lfea-standalone-check.mjs');
  runNode('scripts/run-lfea-standalone-e2e.mjs');
} catch (error) {
  primaryFailure = error;
} finally {
  const restorationFailure = restoreAll();
  try { fs.rmSync(QUARANTINE, { recursive: true, force: true }); } catch {}
  if (!primaryFailure && restorationFailure) primaryFailure = restorationFailure;
  writeReport(primaryFailure);
}

if (primaryFailure) throw primaryFailure;
console.log('LFEA physical-LAFEA-absence rehearsal PASS.');

function discoverLafeaOwnedPaths(directory) {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (isLafeaOwnedName(entry.name)) {
      results.push(absolute);
      continue;
    }
    if (entry.isDirectory()) results.push(...discoverLafeaOwnedPaths(absolute));
  }
  return results.sort(compareAscii);
}

function isLafeaOwnedName(name) {
  return /^lafea(?:[-_.]|$)/iu.test(String(name));
}

function assertPhysicalWitness(paths) {
  if (!paths.length) {
    throw rehearsalError('LFEA_ABSENCE_DISCOVERY_EMPTY', 'No LAFEA-owned production paths were discovered under src/.');
  }
  const relative = paths.map((entry) => slash(path.relative(ROOT, entry)));
  const expected = [
    'src/workspace/lafea-workbench-controller.js',
    'src/core/lafea-linear-solve',
  ];
  if (!expected.some((entry) => relative.includes(entry))) {
    throw rehearsalError(
      'LFEA_ABSENCE_WITNESS_MISSING',
      `Expected LAFEA runtime witness was not discovered. Found: ${relative.join(', ')}`,
    );
  }
  console.log(`LFEA absence quarantine will remove ${relative.length} production path(s).`);
  for (const entry of relative) console.log(`  - ${entry}`);
}

function quarantine(sourcePath) {
  const relative = path.relative(ROOT, sourcePath);
  const targetPath = path.join(QUARANTINE, relative);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.renameSync(sourcePath, targetPath);
  moved.push({ sourcePath, targetPath });
}

function assertAbsent(paths) {
  const stillPresent = paths.filter((entry) => fs.existsSync(entry));
  if (stillPresent.length) {
    throw rehearsalError(
      'LFEA_ABSENCE_QUARANTINE_FAILED',
      `LAFEA production paths remain present: ${stillPresent.map((entry) => slash(path.relative(ROOT, entry))).join(', ')}`,
    );
  }
}

function runNode(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, LFEA_PHYSICAL_ABSENCE_REHEARSAL: '1' },
  });
  const record = {
    scriptPath,
    status: result.status,
    signal: result.signal ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
  childRuns.push(record);
  if (record.stdout) process.stdout.write(record.stdout);
  if (record.stderr) process.stderr.write(record.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = rehearsalError(
      'LFEA_ABSENCE_CHILD_FAILED',
      `Physical-absence qualification failed: ${scriptPath} exited ${result.status ?? 'unknown'}.`,
    );
    error.childScript = scriptPath;
    throw error;
  }
}

function restoreAll() {
  let firstFailure = null;
  for (const entry of [...moved].reverse()) {
    try {
      fs.mkdirSync(path.dirname(entry.sourcePath), { recursive: true });
      if (fs.existsSync(entry.sourcePath)) {
        throw rehearsalError(
          'LFEA_ABSENCE_RESTORE_COLLISION',
          `Cannot restore over existing path: ${slash(path.relative(ROOT, entry.sourcePath))}`,
        );
      }
      fs.renameSync(entry.targetPath, entry.sourcePath);
    } catch (error) {
      firstFailure ??= error;
    }
  }
  const missing = moved.filter((entry) => !fs.existsSync(entry.sourcePath));
  if (missing.length && !firstFailure) {
    firstFailure = rehearsalError(
      'LFEA_ABSENCE_RESTORE_INCOMPLETE',
      `Failed to restore: ${missing.map((entry) => slash(path.relative(ROOT, entry.sourcePath))).join(', ')}`,
    );
  }
  return firstFailure;
}

function writeReport(failure) {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  const payload = {
    schema: 'lfea-physical-absence-rehearsal-evidence/v1',
    status: failure ? 'FAIL' : 'PASS',
    quarantinedPaths: ownedRelativePaths,
    restored: moved.every((entry) => fs.existsSync(entry.sourcePath)),
    failure: failure ? {
      code: failure.code ?? null,
      message: failure.message ?? String(failure),
      childScript: failure.childScript ?? null,
    } : null,
    childRuns,
  };
  fs.writeFileSync(REPORT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function rehearsalError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function slash(value) { return String(value).replaceAll(path.sep, '/'); }
