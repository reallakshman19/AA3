#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const NODE = process.execPath;
const DEFAULT_PROFILE = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-l19-l20-linear-solve.profile.json';
const DEFAULT_META_DIR = 'benchmarks/LFEA/CAESAR_ACCDB/m047';
const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const EVIDENCE_CRITICAL_PATHS = Object.freeze([
  'scripts/lfea-m047-real-data-iteration.mjs',
  'scripts/lfea-m047-target-node-evidence.mjs',
  'scripts/lfea-caesar-accdb-iteration.mjs',
  'scripts/lfea-m047-decision-guard.mjs',
  'src/core/fea-benchmarks/caesar-accdb-iteration-evidence.js',
  'src/core/shared-piping-model/canonical-json.js',
  'src/core/shared-piping-model/immutable.js',
]);
const LEGACY_REGRESSION_CHECKS = Object.freeze([
  'scripts/lfea-b3.2-piping-component-check.mjs',
  'scripts/lfea-b3.2-reviewer-check.mjs',
  'scripts/lfea-b3.2-source-guard.mjs',
  'scripts/lfea-b3.3-solver-check.mjs',
  'scripts/lfea-b3.3-reviewer-check.mjs',
  'scripts/lfea-b3.3-source-guard.mjs',
  'scripts/lfea-b3.4-recovery-check.mjs',
  'scripts/lfea-b3.4-reviewer-check.mjs',
  'scripts/lfea-b3.4-source-guard.mjs',
]);

function main(argv) {
  const input = parseArguments(argv);
  if (process.platform !== 'win32') {
    throw new Error('M047 real-data qualification requires Windows and the Microsoft ACE OLE DB provider.');
  }

  const metaPath = resolve(ROOT, DEFAULT_META_DIR, `${input.iterationId}.request.json`);
  const request = readJson(metaPath, 'iteration request');
  validateRequest(request, input);
  const parentEvidence = requireSequentialParent(request, input.parentPath);

  const outputDir = resolve(input.outDir ?? resolve(ROOT, 'reports/m047', input.iterationId));
  const benchmarkPath = resolve(outputDir, 'benchmark.json');
  const actualPath = resolve(outputDir, 'actual.json');
  const benchmarkSummaryPath = resolve(outputDir, 'benchmark-summary.md');
  const targetNodeEvidencePath = resolve(outputDir, 'target-nodes.json');
  const iterationPath = resolve(outputDir, 'iteration.json');
  const iterationSummaryPath = resolve(outputDir, 'iteration-summary.md');
  const runManifestPath = resolve(outputDir, 'run.json');
  mkdirSync(outputDir, { recursive: true });

  const workspaceBefore = gitStatus(ROOT);
  const evidenceToolHeadSha = gitAt(ROOT, ['rev-parse', 'HEAD']).trim();
  requireEvidenceToolPathsClean(workspaceBefore, repoRelative(metaPath));

  const accdbPath = resolve(input.accdbPath);
  const accdbSha256 = powershellSha256(accdbPath);
  if (accdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new Error(
      `ACCDB SHA-256 ${accdbSha256} does not match locked source ${LOCKED_ACCDB_SHA256}.`,
    );
  }

  const worktreeRoot = mkdtempSync(join(tmpdir(), 'lfea-m047-candidate-'));
  const candidateRoot = resolve(worktreeRoot, 'candidate');
  let worktreeAdded = false;
  let candidateHeadSha = null;
  let regressionRuns = [];
  let benchmarkRun = null;
  let candidateWorkspaceAfter = [];

  try {
    gitAt(ROOT, ['worktree', 'add', '--detach', candidateRoot, request.candidateCommitSha]);
    worktreeAdded = true;
    candidateHeadSha = gitAt(candidateRoot, ['rev-parse', 'HEAD']).trim();
    if (candidateHeadSha !== request.candidateCommitSha) {
      throw new Error(
        `Detached candidate worktree resolved ${candidateHeadSha}, expected ${request.candidateCommitSha}.`,
      );
    }

    const candidateWorkspaceBefore = gitStatus(candidateRoot);
    if (candidateWorkspaceBefore.length !== 0) {
      throw new Error('Detached candidate worktree is not clean before qualification.');
    }

    regressionRuns = runCandidateRegressions(candidateRoot);

    const benchmarkArgs = [
      resolve(candidateRoot, 'scripts/lfea-caesar-accdb-benchmark.mjs'),
      '--accdb', accdbPath,
      '--profile', resolve(candidateRoot, DEFAULT_PROFILE),
      '--solve-linear', 'true',
      '--actual-out', actualPath,
      '--summary-out', benchmarkSummaryPath,
      '--out', benchmarkPath,
    ];
    benchmarkRun = runNode(candidateRoot, benchmarkArgs, 'BM4_NL locked ACCDB benchmark');
    candidateWorkspaceAfter = gitStatus(candidateRoot);
    if (candidateWorkspaceAfter.length !== 0) {
      throw new Error(
        `Candidate qualification dirtied its detached worktree: ${candidateWorkspaceAfter.map(formatStatus).join(', ')}.`,
      );
    }
  } finally {
    if (worktreeAdded) {
      const removal = spawnSync('git', ['worktree', 'remove', '--force', candidateRoot], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      if (removal.error || removal.status !== 0) {
        process.stderr.write(
          `Warning: could not remove candidate worktree ${candidateRoot}: `
          + `${removal.error?.message ?? String(removal.stderr).trim()}\n`,
        );
      }
    }
    rmSync(worktreeRoot, { recursive: true, force: true });
  }

  const workspaceAfterBenchmark = gitStatus(ROOT);
  const unrelatedAfterBenchmark = compareUnrelatedWorkspace(
    workspaceBefore,
    workspaceAfterBenchmark,
    outputDir,
  );
  if (!unrelatedAfterBenchmark.preserved) {
    throw new Error(
      `Candidate benchmark changed unrelated current-worktree paths: ${unrelatedAfterBenchmark.changed.join(', ')}.`,
    );
  }

  const targetNodeRun = runNode(ROOT, [
    resolve(ROOT, 'scripts/lfea-m047-target-node-evidence.mjs'),
    '--benchmark', benchmarkPath,
    '--actual', actualPath,
    '--out', targetNodeEvidencePath,
  ], 'M047 target-node evidence');

  const iterationArgs = [
    resolve(ROOT, 'scripts/lfea-caesar-accdb-iteration.mjs'),
    '--report', benchmarkPath,
    '--meta', metaPath,
    '--out', iterationPath,
    '--summary-out', iterationSummaryPath,
  ];
  if (input.parentPath !== null) iterationArgs.push('--parent', resolve(input.parentPath));
  const iterationRun = runNode(ROOT, iterationArgs, 'M047 iteration evidence');
  const decisionGuardRun = runNode(ROOT, [
    resolve(ROOT, 'scripts/lfea-m047-decision-guard.mjs'),
    '--evidence', iterationPath,
  ], 'M047 iteration decision guard');

  const workspaceAfter = gitStatus(ROOT);
  const unrelatedFinal = compareUnrelatedWorkspace(workspaceBefore, workspaceAfter, outputDir);
  if (!unrelatedFinal.preserved) {
    throw new Error(
      `Iteration materialization changed unrelated current-worktree paths: ${unrelatedFinal.changed.join(', ')}.`,
    );
  }

  const evidence = readJson(iterationPath, 'iteration evidence');
  const targetEvidence = readJson(targetNodeEvidencePath, 'target-node evidence');
  const benchmark = readJson(benchmarkPath, 'benchmark report');
  if (request.iterationId !== 'M047-I000' && evidence.improvements === null) {
    throw new Error(`${request.iterationId} did not record parent-relative improvements.`);
  }
  if (parentEvidence !== null && evidence.parentIterationId !== parentEvidence.iterationId) {
    throw new Error(
      `Materialized parent ${String(evidence.parentIterationId)} does not match ${parentEvidence.iterationId}.`,
    );
  }
  if (targetEvidence.sourceAccdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new Error('Target-node evidence is not bound to the locked BM4_NL ACCDB.');
  }

  const runBase = {
    schema: 'lfea-m047-real-data-run/v1',
    issueId: 'M047',
    iterationId: request.iterationId,
    mechanicsCandidate: {
      requestedCommitSha: request.candidateCommitSha,
      executedCommitSha: candidateHeadSha,
      executionMode: 'DETACHED_TEMPORARY_GIT_WORKTREE',
      worktreeCleanAfterQualification: candidateWorkspaceAfter.length === 0,
    },
    evidenceTool: {
      commitSha: evidenceToolHeadSha,
      criticalPathsCleanAtStart: true,
    },
    source: {
      accdbPath,
      accdbSha256,
      profilePath: DEFAULT_PROFILE,
      benchmarkPackageSemanticHash: benchmark.packageSemanticHash ?? null,
      modelSemanticHash: benchmark.model?.semanticHash ?? null,
    },
    parent: parentEvidence === null ? null : {
      iterationId: parentEvidence.iterationId,
      semanticHash: parentEvidence.semanticHash,
    },
    commands: {
      regressionChecks: regressionRuns,
      benchmark: benchmarkRun,
      targetNodeEvidence: targetNodeRun,
      iterationEvidence: iterationRun,
      decisionGuard: decisionGuardRun,
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
      targetNodeEvidencePath: repoRelative(targetNodeEvidencePath),
      iterationPath: repoRelative(iterationPath),
      iterationSummaryPath: repoRelative(iterationSummaryPath),
    },
    evidenceSemanticHash: evidence.semanticHash,
    targetNodeEvidenceSemanticHash: targetEvidence.semanticHash,
    benchmarkStatus: benchmark.status,
    improvements: evidence.improvements,
    invariants: evidence.invariants,
  };
  const runManifest = { ...runBase, semanticHash: semanticHash(runBase) };
  writeFileSync(runManifestPath, canonicalPrettyStringify(runManifest), 'utf8');
  process.stdout.write(`${runManifestPath}\n`);
}

function validateRequest(request, input) {
  if (request.iterationId !== input.iterationId) {
    throw new TypeError(`Iteration request declares ${String(request.iterationId)}, expected ${input.iterationId}.`);
  }
  if (request.expectedSourceAccdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError('Iteration request is not bound to the locked BM4_NL ACCDB SHA-256.');
  }
  if (!/^[a-f0-9]{40}$/u.test(String(request.candidateCommitSha ?? ''))) {
    throw new TypeError('Iteration request must declare an exact 40-character candidateCommitSha.');
  }
}

function requireSequentialParent(request, parentPath) {
  const iterationNumber = Number(/I(\d{3})$/u.exec(request.iterationId)?.[1]);
  if (!Number.isInteger(iterationNumber)) throw new TypeError('Invalid M047 iteration identifier.');
  if (iterationNumber === 0) {
    if (parentPath !== null) throw new TypeError('M047-I000 must not declare a parent evidence file.');
    return null;
  }
  if (parentPath === null) {
    throw new TypeError(`${request.iterationId} requires --parent so improvement deltas cannot be omitted.`);
  }
  const parent = readJson(resolve(parentPath), 'parent iteration evidence');
  const expectedParentId = `M047-I${String(iterationNumber - 1).padStart(3, '0')}`;
  if (parent.iterationId !== expectedParentId) {
    throw new TypeError(
      `${request.iterationId} requires parent ${expectedParentId}; received ${String(parent.iterationId)}.`,
    );
  }
  if (parent.source?.accdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError('Parent iteration is not bound to the locked BM4_NL ACCDB SHA-256.');
  }
  if (!/^[a-f0-9]{64}$/u.test(String(parent.semanticHash ?? ''))) {
    throw new TypeError('Parent iteration must carry a semanticHash.');
  }
  return parent;
}

function requireEvidenceToolPathsClean(workspaceRows, metaPath) {
  const critical = new Set([...EVIDENCE_CRITICAL_PATHS, metaPath].map(normalizeRepoPath));
  const dirty = workspaceRows.filter((row) => {
    const path = normalizeRepoPath(row.path);
    const originalPath = row.originalPath === undefined ? null : normalizeRepoPath(row.originalPath);
    return critical.has(path) || (originalPath !== null && critical.has(originalPath));
  });
  if (dirty.length > 0) {
    throw new Error(
      'M047 evidence-critical paths must match the recorded evidence-tool HEAD; dirty paths: '
      + dirty.map(formatStatus).join(', '),
    );
  }
}

function runCandidateRegressions(candidateRoot) {
  const focused = resolve(candidateRoot, 'scripts/lfea-m047-check.mjs');
  if (existsSync(focused)) {
    return [runNode(candidateRoot, [focused], 'M047 focused regression gate')];
  }
  return LEGACY_REGRESSION_CHECKS.map((relativePath) => runNode(
    candidateRoot,
    [resolve(candidateRoot, relativePath)],
    `candidate regression ${relativePath}`,
  ));
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

function runNode(cwd, args, label) {
  const result = spawnSync(NODE, args, {
    cwd,
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
    label,
    executable: NODE,
    workingDirectory: repoOrAbsolute(cwd),
    arguments: args.map(repoOrAbsolute),
    exitStatus: result.status,
  };
}

function gitAt(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ?? String(result.stderr).trim()}`);
  }
  return String(result.stdout);
}

function gitStatus(cwd) {
  const output = gitAt(cwd, ['status', '--porcelain=v1', '-z']);
  if (output === '') return [];
  return parsePorcelainZ(output).sort((left, right) => left.path.localeCompare(right.path));
}

function parsePorcelainZ(output) {
  const entries = output.split('\0');
  const rows = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    if (status.includes('R') || status.includes('C')) {
      const originalPath = entries[index + 1];
      if (!originalPath) throw new Error(`Malformed porcelain rename/copy record for ${path}.`);
      rows.push({ status, path, originalPath });
      index += 1;
    } else {
      rows.push({ status, path });
    }
  }
  return rows;
}

function compareUnrelatedWorkspace(before, after, outputDir) {
  const outputPrefix = `${repoRelative(outputDir).replaceAll('\\', '/')}/`;
  const normalize = (rows) => new Map(rows
    .filter((row) => {
      const path = row.path.replaceAll('\\', '/');
      return path !== outputPrefix.slice(0, -1) && !path.startsWith(outputPrefix);
    })
    .map((row) => [row.path.replaceAll('\\', '/'), `${row.status}:${row.originalPath ?? ''}`]));
  const left = normalize(before);
  const right = normalize(after);
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();
  const changed = paths.filter((path) => left.get(path) !== right.get(path));
  return { preserved: changed.length === 0, changed };
}

function formatStatus(row) {
  return `${row.status} ${row.originalPath ? `${row.originalPath} -> ` : ''}${row.path}`;
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

function normalizeRepoPath(path) {
  const text = String(path).replaceAll('\\', '/');
  if (resolve(text) === resolve(text) && resolve(text).startsWith(ROOT)) return repoRelative(text);
  return text.replace(/^\.\//u, '');
}

function repoOrAbsolute(value) {
  const text = String(value);
  if (text.startsWith(ROOT)) return repoRelative(text);
  return text;
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
