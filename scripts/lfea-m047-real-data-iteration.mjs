#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const NODE = process.execPath;
const DEFAULT_PROFILE = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-l19-l20-linear-solve.profile.json';
const DEFAULT_META_DIR = 'benchmarks/LFEA/CAESAR_ACCDB/m047';
const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';

function main(argv) {
  const input = parseArguments(argv);
  if (process.platform !== 'win32') {
    throw new Error('M047 real-data qualification requires Windows and the Microsoft ACE OLE DB provider.');
  }

  const metaPath = resolve(ROOT, DEFAULT_META_DIR, `${input.iterationId}.request.json`);
  const request = readJson(metaPath, 'iteration request');
  if (request.iterationId !== input.iterationId) {
    throw new TypeError(`Iteration request ${metaPath} declares ${String(request.iterationId)}.`);
  }
  if (request.expectedSourceAccdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError('Iteration request is not bound to the locked BM4_NL ACCDB SHA-256.');
  }

  const outputDir = resolve(input.outDir ?? resolve(ROOT, 'reports/m047', input.iterationId));
  const benchmarkPath = resolve(outputDir, 'benchmark.json');
  const actualPath = resolve(outputDir, 'actual.json');
  const benchmarkSummaryPath = resolve(outputDir, 'benchmark-summary.md');
  const iterationPath = resolve(outputDir, 'iteration.json');
  const iterationSummaryPath = resolve(outputDir, 'iteration-summary.md');
  const runManifestPath = resolve(outputDir, 'run.json');
  mkdirSync(outputDir, { recursive: true });

  const candidateIntegrity = verifyCandidatePaths(request);
  const workspaceBefore = gitStatus();
  const headSha = git(['rev-parse', 'HEAD']).trim();
  const accdbSha256 = powershellSha256(resolve(input.accdbPath));
  if (accdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new Error(
      `ACCDB SHA-256 ${accdbSha256} does not match locked source ${LOCKED_ACCDB_SHA256}.`,
    );
  }

  const benchmarkArgs = [
    resolve(ROOT, 'scripts/lfea-caesar-accdb-benchmark.mjs'),
    '--accdb', resolve(input.accdbPath),
    '--profile', resolve(ROOT, DEFAULT_PROFILE),
    '--solve-linear', 'true',
    '--actual-out', actualPath,
    '--summary-out', benchmarkSummaryPath,
    '--out', benchmarkPath,
  ];
  const benchmarkRun = runNode(benchmarkArgs, 'BM4_NL locked ACCDB benchmark');
  const workspaceAfterBenchmark = gitStatus();
  const unrelatedAfterBenchmark = compareUnrelatedWorkspace(
    workspaceBefore,
    workspaceAfterBenchmark,
    outputDir,
  );
  if (!unrelatedAfterBenchmark.preserved) {
    throw new Error(
      `Benchmark run changed unrelated worktree paths: ${unrelatedAfterBenchmark.changed.join(', ')}.`,
    );
  }

  const iterationArgs = [
    resolve(ROOT, 'scripts/lfea-caesar-accdb-iteration.mjs'),
    '--report', benchmarkPath,
    '--meta', metaPath,
    '--out', iterationPath,
    '--summary-out', iterationSummaryPath,
  ];
  if (input.parentPath !== null) {
    iterationArgs.push('--parent', resolve(input.parentPath));
  }
  const iterationRun = runNode(iterationArgs, 'M047 iteration evidence');
  const workspaceAfter = gitStatus();
  const unrelatedFinal = compareUnrelatedWorkspace(workspaceBefore, workspaceAfter, outputDir);
  if (!unrelatedFinal.preserved) {
    throw new Error(
      `Iteration materialization changed unrelated worktree paths: ${unrelatedFinal.changed.join(', ')}.`,
    );
  }

  const evidence = readJson(iterationPath, 'iteration evidence');
  const benchmark = readJson(benchmarkPath, 'benchmark report');
  const runBase = {
    schema: 'lfea-m047-real-data-run/v1',
    issueId: 'M047',
    iterationId: request.iterationId,
    requestedCandidateCommitSha: request.candidateCommitSha,
    observedHeadCommitSha: headSha,
    candidateIntegrity,
    source: {
      accdbPath: resolve(input.accdbPath),
      accdbSha256,
      profilePath: resolve(ROOT, DEFAULT_PROFILE),
      benchmarkPackageSemanticHash: benchmark.packageSemanticHash ?? null,
      modelSemanticHash: benchmark.model?.semanticHash ?? null,
    },
    commands: {
      benchmark: benchmarkRun,
      iterationEvidence: iterationRun,
    },
    workspace: {
      before: workspaceBefore,
      afterBenchmark: workspaceAfterBenchmark,
      after: workspaceAfter,
      unrelatedChangesPreserved: unrelatedFinal.preserved,
    },
    outputs: {
      benchmarkPath: repoRelative(benchmarkPath),
      actualPath: repoRelative(actualPath),
      benchmarkSummaryPath: repoRelative(benchmarkSummaryPath),
      iterationPath: repoRelative(iterationPath),
      iterationSummaryPath: repoRelative(iterationSummaryPath),
    },
    evidenceSemanticHash: evidence.semanticHash,
    benchmarkStatus: benchmark.status,
    invariants: evidence.invariants,
  };
  const runManifest = { ...runBase, semanticHash: semanticHash(runBase) };
  writeFileSync(runManifestPath, canonicalPrettyStringify(runManifest), 'utf8');
  process.stdout.write(`${runManifestPath}\n`);
}

function verifyCandidatePaths(request) {
  const paths = request.changedPaths ?? [];
  if (!Array.isArray(paths)) throw new TypeError('Iteration changedPaths must be an array.');
  if (paths.length === 0) {
    return { status: 'PASS', candidateCommitSha: request.candidateCommitSha, verifiedPaths: [] };
  }
  const result = spawnSync('git', ['diff', '--quiet', request.candidateCommitSha, '--', ...paths], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.error) throw new Error(`Cannot verify candidate paths: ${result.error.message}`, { cause: result.error });
  if (result.status !== 0) {
    throw new Error(
      `Current checkout differs from candidate ${request.candidateCommitSha} on iteration-owned paths. `
      + 'Checkout the candidate state or materialize this iteration before later mechanics changes.',
    );
  }
  return {
    status: 'PASS',
    candidateCommitSha: request.candidateCommitSha,
    verifiedPaths: [...paths],
  };
}

function powershellSha256(path) {
  const result = spawnSync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
    `(Get-FileHash -LiteralPath '${path.replaceAll("'", "''")}' -Algorithm SHA256).Hash.ToLowerInvariant()`,
  ], { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(`Cannot hash ACCDB: ${result.error?.message ?? String(result.stderr).trim()}`);
  }
  return String(result.stdout).trim().toLowerCase();
}

function runNode(args, label) {
  const result = spawnSync(NODE, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed: ${result.error?.message ?? `exit ${String(result.status)}`}`);
  }
  return {
    executable: NODE,
    arguments: args.map(repoRelativeArgument),
    exitStatus: result.status,
  };
}

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ?? String(result.stderr).trim()}`);
  }
  return String(result.stdout);
}

function gitStatus() {
  const output = git(['status', '--porcelain=v1', '-z']);
  if (output === '') return [];
  return output.split('\0').filter(Boolean).map((entry) => {
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    return { status, path };
  }).sort((left, right) => left.path.localeCompare(right.path));
}

function compareUnrelatedWorkspace(before, after, outputDir) {
  const outputPrefix = `${repoRelative(outputDir).replaceAll('\\', '/')}/`;
  const normalize = (rows) => new Map(rows
    .filter((row) => {
      const path = row.path.replaceAll('\\', '/');
      return path !== outputPrefix.slice(0, -1) && !path.startsWith(outputPrefix);
    })
    .map((row) => [row.path.replaceAll('\\', '/'), row.status]));
  const left = normalize(before);
  const right = normalize(after);
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();
  const changed = paths.filter((path) => left.get(path) !== right.get(path));
  return { preserved: changed.length === 0, changed };
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function repoRelative(path) {
  return relative(ROOT, resolve(path)).replaceAll('\\', '/');
}

function repoRelativeArgument(value) {
  const text = String(value);
  if (!text.startsWith(ROOT)) return text;
  return repoRelative(text);
}

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid command argument near ${String(key)}.`);
    }
    if (accepted.has(key)) throw new TypeError(`Duplicate command argument ${key}.`);
    accepted.set(key, value);
  }
  const known = new Set(['--accdb', '--iteration', '--parent', '--out-dir']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  const accdbPath = accepted.get('--accdb');
  const iterationId = accepted.get('--iteration');
  if (!accdbPath || !iterationId) {
    throw new TypeError(
      'Usage: --accdb <BM4_NL.ACCDB> --iteration <M047-I###> '
      + '[--parent <parent-iteration.json>] [--out-dir <directory>].',
    );
  }
  if (!/^M047-I\d{3}$/u.test(iterationId)) throw new TypeError('--iteration must use M047-I###.');
  return {
    accdbPath,
    iterationId,
    parentPath: accepted.get('--parent') ?? null,
    outDir: accepted.get('--out-dir') ?? null,
  };
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
