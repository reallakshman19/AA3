#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RUNNER_SCHEMA = 'lafea-independent-qualification-run/v1';
const MANIFEST_SCHEMA = 'lafea-independent-qualification-manifest/v1';
const ENVIRONMENT_SCHEMA = 'lafea-independent-qualification-environment/v1';
const COMMANDS_SCHEMA = 'lafea-independent-qualification-commands/v1';
const MAX_BUFFER = 64 * 1024 * 1024;

const cli = parseArgs(process.argv.slice(2));
const expectedHead = cli['expected-head'] ?? process.env.LAFEA_EXPECTED_HEAD ?? null;
if (!expectedHead || !/^[0-9a-f]{40}$/u.test(expectedHead)) {
  console.error('Usage: node scripts/lafea-independent-qualification.mjs --expected-head <40-char SHA> [--output <dir>] [--skip-browser] [--plan <path>]');
  process.exit(64);
}

const runnerPath = fileURLToPath(import.meta.url);
const runnerDir = path.dirname(runnerPath);
const initialCwd = process.cwd();
const repoProbe = rawSpawn('git', ['rev-parse', '--show-toplevel'], initialCwd);
if (repoProbe.status !== 0 || !repoProbe.stdout.trim()) {
  console.error('LAFEA_INDEPENDENT_QUALIFICATION_NOT_IN_GIT_WORKTREE');
  process.exit(65);
}
const repoRoot = path.resolve(repoProbe.stdout.trim());
const planPath = path.resolve(repoRoot, cli.plan ?? 'validation/lafea-independent-qualification/plan-v1.json');
const plan = readJson(planPath, 'LAFEA_INDEPENDENT_QUALIFICATION_PLAN_INVALID');
validatePlan(plan);

const startedAt = new Date().toISOString();
const runId = `${timestampToken(startedAt)}-${process.pid}`;
const outputDir = path.resolve(
  cli.output ?? path.join(repoRoot, '..', 'lafea-qualification-evidence', expectedHead, runId),
);
const planBytes = fs.readFileSync(planPath);
const planSha256 = sha256(planBytes);
const preflight = runPreflight(repoRoot, expectedHead, plan, runnerPath, planSha256);

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.join(outputDir, 'logs'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'results'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'tools'), { recursive: true });
fs.writeFileSync(path.join(outputDir, 'plan.json'), planBytes);
writeJson(path.join(outputDir, 'environment.json'), preflight.environment);
fs.copyFileSync(runnerPath, path.join(outputDir, 'tools', path.basename(runnerPath)));
const verifierPath = path.join(runnerDir, 'lafea-independent-qualification-verify.mjs');
if (fs.existsSync(verifierPath)) {
  fs.copyFileSync(verifierPath, path.join(outputDir, 'tools', path.basename(verifierPath)));
}

const commandRecords = [];
let installSucceeded = false;
let browserProvisionSucceeded = false;
let dependencyUnavailable = false;
const skipBrowser = cli['skip-browser'] === true;

if (preflight.accepted) {
  const install = executeStep(plan.dependencyInstall, commandRecords.length, repoRoot, outputDir, {
    env: qualificationEnv(),
  });
  commandRecords.push(install);
  installSucceeded = install.disposition === 'PASS';
  dependencyUnavailable = !installSucceeded;

  if (installSucceeded) {
    for (const step of plan.steps) {
      if (step.browser === true) {
        if (skipBrowser) {
          commandRecords.push(notRunRecord(step, commandRecords.length, 'BROWSER_EXPLICITLY_SKIPPED'));
          continue;
        }
        if (!browserProvisionSucceeded) {
          const provision = executeStep(
            plan.browserProvision,
            commandRecords.length,
            repoRoot,
            outputDir,
            { env: qualificationEnv({ PLAYWRIGHT_BROWSERS_PATH: '0' }) },
          );
          commandRecords.push(provision);
          browserProvisionSucceeded = provision.disposition === 'PASS';
        }
        if (!browserProvisionSucceeded) {
          commandRecords.push(notRunRecord(step, commandRecords.length, 'BROWSER_RUNTIME_NOT_PROVISIONED'));
          continue;
        }
      }

      const record = step.kind === 'BASELINE_COMPARATOR'
        ? executeBaselineComparator(step, commandRecords.length, repoRoot, outputDir)
        : executeStep(step, commandRecords.length, repoRoot, outputDir, {
          env: qualificationEnv(step.browser ? { PLAYWRIGHT_BROWSERS_PATH: '0' } : {}),
        });
      commandRecords.push(record);
    }
  }
} else {
  dependencyUnavailable = true;
}

if (dependencyUnavailable) {
  if (!commandRecords.some((row) => row.id === plan.dependencyInstall.id)) {
    commandRecords.push(notRunRecord(
      plan.dependencyInstall,
      commandRecords.length,
      'PREFLIGHT_NOT_ACCEPTED',
    ));
  }
  for (const step of plan.steps) {
    if (commandRecords.some((row) => row.id === step.id)) continue;
    commandRecords.push(notRunRecord(step, commandRecords.length, 'DEPENDENCIES_NOT_AVAILABLE'));
  }
}

const browserExecution = [...commandRecords].reverse().find((row) => row.browser === true && row.classification === 'ENGINEERING');
const browserArtifacts = browserExecution && browserExecution.disposition !== 'NOT_RUN'
  ? copyBrowserArtifacts(
    repoRoot,
    outputDir,
    plan.browserArtifactPaths ?? [],
    Date.parse(browserExecution.startedAt) - 1000,
  )
  : Object.freeze([]);
const postflight = runPostflight(repoRoot, expectedHead, preflight.environment.packageLockSha256);
const completedAt = new Date().toISOString();
const disposition = deriveDisposition(preflight.accepted, postflight.accepted, commandRecords);
const counts = dispositionCounts(commandRecords);

const commandsDocument = Object.freeze({
  schema: COMMANDS_SCHEMA,
  qualificationId: plan.qualificationId,
  expectedHead,
  records: commandRecords,
});
writeJson(path.join(outputDir, 'commands.json'), commandsDocument);

const manifest = Object.freeze({
  schema: MANIFEST_SCHEMA,
  runnerSchema: RUNNER_SCHEMA,
  qualificationId: plan.qualificationId,
  runId,
  startedAt,
  completedAt,
  expectedHead,
  currentHead: preflight.environment.currentHead,
  disposition,
  qualificationComplete: disposition === 'PASS',
  preflightAccepted: preflight.accepted,
  postflightAccepted: postflight.accepted,
  postflight,
  browserRequested: !skipBrowser,
  dependencyInstallSucceeded: installSucceeded,
  browserProvisionSucceeded: skipBrowser ? false : browserProvisionSucceeded,
  planSha256,
  runnerSha256: preflight.environment.runnerSha256,
  packageLockSha256: preflight.environment.packageLockSha256,
  commandDispositionCounts: counts,
  browserArtifacts,
  evidenceFiles: Object.freeze({
    plan: 'plan.json',
    environment: 'environment.json',
    commands: 'commands.json',
    summary: 'summary.md',
    hashes: 'hashes.sha256',
    digest: 'evidence-digest.txt',
  }),
});
writeJson(path.join(outputDir, 'manifest.json'), manifest);
fs.writeFileSync(path.join(outputDir, 'summary.md'), summaryMarkdown(manifest, commandRecords));

const hashLines = hashEvidenceFiles(outputDir);
const hashesText = `${hashLines.join('\n')}\n`;
fs.writeFileSync(path.join(outputDir, 'hashes.sha256'), hashesText);
const evidenceDigest = sha256(Buffer.from(hashesText, 'utf8'));
fs.writeFileSync(path.join(outputDir, 'evidence-digest.txt'), `${evidenceDigest}\n`);

console.log(JSON.stringify({
  check: 'lafea-independent-qualification',
  status: disposition,
  expectedHead,
  currentHead: preflight.environment.currentHead,
  outputDir,
  evidenceDigest,
  commandDispositionCounts: counts,
  browserArtifacts,
}, null, 2));

process.exit(disposition === 'PASS' ? 0 : disposition === 'FAIL' ? 1 : 2);

function runPreflight(repo, expected, qualificationPlan, currentRunnerPath, currentPlanSha) {
  const currentHeadResult = rawSpawn('git', ['rev-parse', 'HEAD'], repo);
  const statusResult = rawSpawn('git', ['status', '--porcelain=v1', '--untracked-files=all'], repo);
  const diffCheckResult = rawSpawn('git', ['diff', '--check'], repo);
  const gitVersionResult = rawSpawn('git', ['--version'], repo);
  const npmVersionResult = rawSpawn(resolveExecutable('npm'), ['--version'], repo);
  const shallowResult = rawSpawn('git', ['rev-parse', '--is-shallow-repository'], repo);
  const currentHead = currentHeadResult.stdout.trim();
  const cleanTree = statusResult.status === 0 && statusResult.stdout.trim() === '';
  const diffCheckPass = diffCheckResult.status === 0;
  const headMatches = currentHead === expected;
  const requiredNodeMajor = qualificationPlan.requiredNodeMajor;
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  const nodeVersionAccepted = nodeMajor === requiredNodeMajor;
  const packageLockPath = path.join(repo, 'package-lock.json');
  const packageLockExists = fs.existsSync(packageLockPath);
  const packageLockSha256 = packageLockExists ? sha256(fs.readFileSync(packageLockPath)) : null;
  const runnerSha256 = sha256(fs.readFileSync(currentRunnerPath));
  const accepted = currentHeadResult.status === 0
    && statusResult.status === 0
    && diffCheckPass
    && headMatches
    && cleanTree
    && nodeVersionAccepted
    && packageLockExists;

  return Object.freeze({
    accepted,
    environment: Object.freeze({
      schema: ENVIRONMENT_SCHEMA,
      qualificationId: qualificationPlan.qualificationId,
      expectedHead: expected,
      currentHead,
      headMatches,
      cleanTree,
      gitDiffCheckPass: diffCheckPass,
      gitStatusPorcelain: statusResult.stdout,
      nodeVersion: process.versions.node,
      requiredNodeMajor,
      nodeVersionAccepted,
      npmVersion: npmVersionResult.status === 0 ? npmVersionResult.stdout.trim() : null,
      gitVersion: gitVersionResult.status === 0 ? gitVersionResult.stdout.trim() : null,
      shallowRepository: shallowResult.status === 0 ? shallowResult.stdout.trim() === 'true' : null,
      platform: process.platform,
      architecture: process.arch,
      osRelease: os.release(),
      cpuModel: os.cpus()[0]?.model ?? null,
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      planSha256: currentPlanSha,
      runnerSha256,
      packageLockSha256,
      packageLockExists,
    }),
  });
}

function runPostflight(repo, expected, initialPackageLockSha256) {
  const currentHead = rawSpawn('git', ['rev-parse', 'HEAD'], repo);
  const trackedStatus = rawSpawn('git', ['status', '--porcelain=v1', '--untracked-files=no'], repo);
  const packageLockPath = path.join(repo, 'package-lock.json');
  const packageLockSha256 = fs.existsSync(packageLockPath) ? sha256(fs.readFileSync(packageLockPath)) : null;
  const headStable = currentHead.status === 0 && currentHead.stdout.trim() === expected;
  const trackedTreeUnchanged = trackedStatus.status === 0 && trackedStatus.stdout.trim() === '';
  const packageLockStable = packageLockSha256 === initialPackageLockSha256;
  return Object.freeze({
    schema: 'lafea-independent-qualification-postflight/v1',
    accepted: headStable && trackedTreeUnchanged && packageLockStable,
    currentHead: currentHead.stdout.trim(),
    headStable,
    trackedTreeUnchanged,
    trackedStatusPorcelain: trackedStatus.stdout,
    packageLockStable,
    packageLockSha256,
  });
}

function executeStep(step, index, cwd, outputRoot, options = {}) {
  const started = new Date();
  const command = resolveExecutable(step.executable);
  const result = rawSpawn(command, step.args, cwd, options.env);
  const completed = new Date();
  const baseName = `${String(index + 1).padStart(2, '0')}-${safeName(step.id)}`;
  const stdoutPath = path.join('logs', `${baseName}.stdout.log`);
  const stderrPath = path.join('logs', `${baseName}.stderr.log`);
  fs.writeFileSync(path.join(outputRoot, stdoutPath), result.stdout);
  fs.writeFileSync(path.join(outputRoot, stderrPath), result.stderr);
  const resultPath = maybeWriteJsonResult(result.stdout, outputRoot, step.id);
  const disposition = result.error
    ? 'NOT_RUN'
    : result.status === 0 ? 'PASS' : step.classification === 'INFRASTRUCTURE' ? 'NOT_RUN' : 'FAIL';
  return Object.freeze({
    id: step.id,
    kind: step.kind ?? 'COMMAND',
    classification: step.classification,
    required: step.required === true,
    browser: step.browser === true,
    command: Object.freeze({ executable: step.executable, args: Object.freeze([...step.args]) }),
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMs: completed.getTime() - started.getTime(),
    exitCode: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal ?? null,
    spawnError: result.error ? String(result.error.message ?? result.error) : null,
    disposition,
    reason: disposition === 'NOT_RUN' && result.error ? 'EXECUTABLE_NOT_AVAILABLE' : null,
    stdoutPath,
    stderrPath,
    stdoutSha256: sha256(Buffer.from(result.stdout, 'utf8')),
    stderrSha256: sha256(Buffer.from(result.stderr, 'utf8')),
    resultJsonPath: resultPath,
  });
}

function executeBaselineComparator(step, index, repo, outputRoot) {
  const started = new Date();
  const baseName = `${String(index + 1).padStart(2, '0')}-${safeName(step.id)}`;
  const candidate = rawSpawn(resolveExecutable(step.executable), step.args, repo, qualificationEnv());
  const candidateStdoutPath = path.join('logs', `${baseName}.candidate.stdout.log`);
  const candidateStderrPath = path.join('logs', `${baseName}.candidate.stderr.log`);
  fs.writeFileSync(path.join(outputRoot, candidateStdoutPath), candidate.stdout);
  fs.writeFileSync(path.join(outputRoot, candidateStderrPath), candidate.stderr);

  const baseExists = rawSpawn('git', ['cat-file', '-e', `${step.qualificationBase}^{commit}`], repo).status === 0;
  let base = null;
  let baseStdoutPath = null;
  let baseStderrPath = null;
  let worktreeError = null;
  if (baseExists) {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-qualification-base-'));
    const add = rawSpawn('git', ['worktree', 'add', '--detach', temporary, step.qualificationBase], repo);
    if (add.status === 0) {
      base = rawSpawn(resolveExecutable(step.executable), step.args, temporary, qualificationEnv());
      baseStdoutPath = path.join('logs', `${baseName}.base.stdout.log`);
      baseStderrPath = path.join('logs', `${baseName}.base.stderr.log`);
      fs.writeFileSync(path.join(outputRoot, baseStdoutPath), base.stdout);
      fs.writeFileSync(path.join(outputRoot, baseStderrPath), base.stderr);
      rawSpawn('git', ['worktree', 'remove', '--force', temporary], repo);
    } else {
      worktreeError = `${add.stdout}\n${add.stderr}`.trim();
      try { fs.rmSync(temporary, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }

  const candidateForbidden = firstLineWithPrefix(candidate.stdout + candidate.stderr, step.inheritedErrorPrefix);
  const baseForbidden = base
    ? firstLineWithPrefix(base.stdout + base.stderr, step.inheritedErrorPrefix)
    : null;
  let disposition;
  let reason;
  if (candidate.error) {
    disposition = 'NOT_RUN';
    reason = 'CANDIDATE_EXECUTABLE_NOT_AVAILABLE';
  } else if (candidate.status === 0) {
    disposition = 'PASS';
    reason = 'CANDIDATE_BOUNDARY_CHECK_PASSES';
  } else if (!baseExists || worktreeError || !base) {
    disposition = 'NOT_RUN';
    reason = !baseExists ? 'QUALIFICATION_BASE_NOT_AVAILABLE_LOCALLY' : 'QUALIFICATION_BASE_WORKTREE_FAILED';
  } else if (base.status !== 0 && candidateForbidden && candidateForbidden === baseForbidden) {
    disposition = 'PASS';
    reason = 'INHERITED_BASELINE_FAILURE_MATCHES_EXACTLY';
  } else {
    disposition = 'FAIL';
    reason = 'BOUNDARY_FAILURE_DIFFERS_FROM_QUALIFICATION_BASE';
  }

  const completed = new Date();
  return Object.freeze({
    id: step.id,
    kind: 'BASELINE_COMPARATOR',
    classification: step.classification,
    required: step.required === true,
    browser: false,
    command: Object.freeze({ executable: step.executable, args: Object.freeze([...step.args]) }),
    qualificationBase: step.qualificationBase,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMs: completed.getTime() - started.getTime(),
    exitCode: candidate.status,
    baseExitCode: base?.status ?? null,
    disposition,
    reason,
    candidateForbidden,
    baseForbidden,
    worktreeError,
    stdoutPath: candidateStdoutPath,
    stderrPath: candidateStderrPath,
    baseStdoutPath,
    baseStderrPath,
  });
}

function notRunRecord(step, index, reason) {
  const now = new Date().toISOString();
  return Object.freeze({
    id: step.id,
    kind: step.kind ?? 'COMMAND',
    classification: step.classification,
    required: step.required === true,
    browser: step.browser === true,
    command: Object.freeze({ executable: step.executable, args: Object.freeze([...(step.args ?? [])]) }),
    startedAt: now,
    completedAt: now,
    durationMs: 0,
    exitCode: null,
    signal: null,
    spawnError: null,
    disposition: 'NOT_RUN',
    reason,
    stdoutPath: null,
    stderrPath: null,
    stdoutSha256: null,
    stderrSha256: null,
    resultJsonPath: null,
  });
}

function deriveDisposition(preflightAccepted, postflightAccepted, records) {
  if (!preflightAccepted || !postflightAccepted) return 'FAIL';
  if (records.some((row) => row.required && row.classification === 'ENGINEERING' && row.disposition === 'FAIL')) {
    return 'FAIL';
  }
  if (records.some((row) => row.required && row.disposition === 'NOT_RUN')) return 'NOT_RUN';
  return 'PASS';
}

function dispositionCounts(records) {
  const counts = { PASS: 0, FAIL: 0, NOT_RUN: 0 };
  records.forEach((row) => { counts[row.disposition] = (counts[row.disposition] ?? 0) + 1; });
  return Object.freeze(counts);
}

function maybeWriteJsonResult(stdout, outputRoot, id) {
  const text = stdout.trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(text);
    const relative = path.join('results', `${safeName(id)}.json`);
    writeJson(path.join(outputRoot, relative), parsed);
    return relative;
  } catch {
    return null;
  }
}

function copyBrowserArtifacts(repo, outputRoot, artifactPaths, modifiedSinceMs) {
  const copied = [];
  for (const relative of artifactPaths) {
    const source = path.join(repo, relative);
    if (!fs.existsSync(source)) continue;
    const targetRelative = path.join('browser', relative).replaceAll('\\', '/');
    const target = path.join(outputRoot, targetRelative);
    const count = copyRecentTree(source, target, modifiedSinceMs);
    if (count > 0) copied.push(targetRelative);
  }
  return Object.freeze(copied.sort());
}

function copyRecentTree(source, target, modifiedSinceMs) {
  const stat = fs.statSync(source);
  if (stat.isFile()) {
    if (stat.mtimeMs < modifiedSinceMs) return 0;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    return 1;
  }
  if (!stat.isDirectory()) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    count += copyRecentTree(path.join(source, entry.name), path.join(target, entry.name), modifiedSinceMs);
  }
  return count;
}

function hashEvidenceFiles(root) {
  const excluded = new Set(['hashes.sha256', 'evidence-digest.txt']);
  return listFiles(root)
    .filter((relative) => !excluded.has(relative))
    .sort()
    .map((relative) => `${sha256(fs.readFileSync(path.join(root, relative)))}  ${relative}`);
}

function listFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const childRelative = path.join(relative, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) out.push(...listFiles(root, childRelative));
    else if (entry.isFile()) out.push(childRelative);
  }
  return out;
}

function summaryMarkdown(manifest, records) {
  const lines = [
    '# LAFEA Independent Qualification Evidence',
    '',
    `- Qualification: \`${manifest.qualificationId}\``,
    `- Expected HEAD: \`${manifest.expectedHead}\``,
    `- Actual HEAD: \`${manifest.currentHead}\``,
    `- Disposition: **${manifest.disposition}**`,
    `- Started: ${manifest.startedAt}`,
    `- Completed: ${manifest.completedAt}`,
    `- Browser requested: ${manifest.browserRequested}`,
    '',
    '## Commands',
    '',
    '| ID | Classification | Required | Disposition | Exit |',
    '|---|---|---:|---|---:|',
  ];
  for (const row of records) {
    lines.push(`| ${row.id} | ${row.classification} | ${row.required ? 'yes' : 'no'} | ${row.disposition} | ${row.exitCode ?? ''} |`);
  }
  lines.push('', 'PASS means the command executed and exited zero. FAIL means an engineering command executed and rejected the candidate. NOT_RUN means required execution evidence is incomplete because infrastructure or an explicit skip prevented execution.', '');
  return `${lines.join('\n')}\n`;
}

function qualificationEnv(extra = {}) {
  return Object.freeze({
    ...process.env,
    CI: '1',
    ...extra,
  });
}

function rawSpawn(executable, args, cwd, env = process.env) {
  try {
    const result = spawnSync(executable, args, {
      cwd,
      env,
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      error: result.error ?? null,
    };
  } catch (error) {
    return { status: null, signal: null, stdout: '', stderr: '', error };
  }
}

function resolveExecutable(value) {
  if (process.platform !== 'win32') return value;
  if (value === 'npm') return 'npm.cmd';
  if (value === 'npx') return 'npx.cmd';
  return value;
}

function validatePlan(value) {
  if (!value || value.schema !== 'lafea-independent-qualification-plan/v1') {
    throw new TypeError('LAFEA_INDEPENDENT_QUALIFICATION_PLAN_SCHEMA_INVALID');
  }
  if (typeof value.qualificationId !== 'string' || !value.qualificationId) {
    throw new TypeError('LAFEA_INDEPENDENT_QUALIFICATION_ID_INVALID');
  }
  if (!Number.isInteger(value.requiredNodeMajor) || value.requiredNodeMajor < 1) {
    throw new TypeError('LAFEA_INDEPENDENT_QUALIFICATION_NODE_MAJOR_INVALID');
  }
  const all = [value.dependencyInstall, value.browserProvision, ...(value.steps ?? [])];
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    throw new TypeError('LAFEA_INDEPENDENT_QUALIFICATION_STEPS_INVALID');
  }
  const ids = new Set();
  for (const step of all) {
    if (!step || typeof step.id !== 'string' || !step.id || ids.has(step.id)) {
      throw new TypeError('LAFEA_INDEPENDENT_QUALIFICATION_STEP_ID_INVALID');
    }
    ids.add(step.id);
    if (!['ENGINEERING', 'INFRASTRUCTURE'].includes(step.classification)) {
      throw new TypeError(`LAFEA_INDEPENDENT_QUALIFICATION_STEP_CLASS_INVALID:${step.id}`);
    }
    if (typeof step.executable !== 'string' || !Array.isArray(step.args)
      || step.args.some((item) => typeof item !== 'string')) {
      throw new TypeError(`LAFEA_INDEPENDENT_QUALIFICATION_STEP_COMMAND_INVALID:${step.id}`);
    }
    if (step.kind && step.kind !== 'BASELINE_COMPARATOR') {
      throw new TypeError(`LAFEA_INDEPENDENT_QUALIFICATION_STEP_KIND_INVALID:${step.id}`);
    }
    if (step.kind === 'BASELINE_COMPARATOR'
      && (!/^[0-9a-f]{40}$/u.test(step.qualificationBase ?? '')
        || typeof step.inheritedErrorPrefix !== 'string')) {
      throw new TypeError(`LAFEA_INDEPENDENT_QUALIFICATION_BASELINE_INVALID:${step.id}`);
    }
  }
}

function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { const wrapped = new TypeError(code); wrapped.cause = error; throw wrapped; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function firstLineWithPrefix(text, prefix) {
  return text.split(/\r?\n/u).map((line) => line.trim()).find((line) => line.includes(prefix)) ?? null;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/gu, '-');
}

function timestampToken(value) {
  return value.replace(/[-:.TZ]/gu, '').slice(0, 14);
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (['skip-browser'].includes(key)) { out[key] = true; continue; }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) throw new TypeError(`Missing value for --${key}`);
    out[key] = next;
    index += 1;
  }
  return out;
}
