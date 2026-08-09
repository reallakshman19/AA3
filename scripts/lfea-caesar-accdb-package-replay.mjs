#!/usr/bin/env node
/**
 * Capture or replay the canonical CAESAR ACCDB benchmark package.
 *
 * Source authority remains the read-only ACCDB extraction plus
 * buildCaesarAccdbBenchmarkPackage. The serialized package exists only to make
 * later solver iterations replay the exact normalized model/reference state
 * without requiring Microsoft ACE on every machine.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCaesarAccdbBenchmarkPackage,
  requiredCaesarAccdbTables,
  solveCaesarAccdbLinearBenchmark,
} from '../src/core/fea-benchmarks/index.js';
import {
  canonicalPrettyStringify,
  semanticHash,
} from '../src/core/shared-piping-model/canonical-json.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const EXPORT_SCRIPT = resolve(SCRIPT_DIR, 'lfea-caesar-accdb-export.ps1');
const PACKAGE_SCHEMA = 'caesar-accdb-benchmark-package/v1';

export function captureOrLoadCaesarAccdbPackage(input) {
  if (input.packageInPath !== null) {
    if (input.accdbPath !== null || input.profilePath !== null) {
      throw new TypeError('--package-in is mutually exclusive with --accdb/--profile.');
    }
    return requireReplayPackage(readJson(input.packageInPath, 'canonical ACCDB benchmark package'));
  }
  if (input.accdbPath === null || input.profilePath === null) {
    throw new TypeError('Package capture requires both --accdb and --profile.');
  }
  const profile = readJson(input.profilePath, 'benchmark profile');
  const tableNames = requiredCaesarAccdbTables(profile);
  const rawExport = extractAccdb(input.accdbPath, tableNames);
  return requireReplayPackage(buildCaesarAccdbBenchmarkPackage({ rawExport, profile }));
}

/** Verify the two deterministic identities used by the authoritative builder. */
export function requireReplayPackage(value) {
  if (!value || value.schema !== PACKAGE_SCHEMA) {
    throw new TypeError(`Replay package must use ${PACKAGE_SCHEMA}.`);
  }
  if (!value.source || !/^[a-f0-9]{64}$/u.test(String(value.source.sha256))) {
    throw new TypeError('Replay package source SHA-256 is missing or invalid.');
  }
  if (!value.model || value.model.schema !== 'caesar-accdb-model-input/v1') {
    throw new TypeError('Replay package model input is missing or invalid.');
  }
  const expectedModelHash = semanticHash({
    installationTemperatureK: value.model.installationTemperatureK,
    tables: value.model.tables,
  });
  if (value.model.semanticHash !== expectedModelHash) {
    throw new TypeError(
      `Replay package model semantic hash mismatch: ${String(value.model.semanticHash)} != ${expectedModelHash}.`,
    );
  }

  const sourceIdentity = {
    fileName: value.source.fileName,
    byteLength: value.source.byteLength,
    lastWriteTimeUtc: value.source.lastWriteTimeUtc,
    sha256: value.source.sha256,
  };
  const { semanticHash: claimedPackageHash, ...base } = value;
  const expectedPackageHash = semanticHash({ ...base, source: sourceIdentity });
  if (claimedPackageHash !== expectedPackageHash) {
    throw new TypeError(
      `Replay package semantic hash mismatch: ${String(claimedPackageHash)} != ${expectedPackageHash}.`,
    );
  }
  return value;
}

function extractAccdb(accdbPath, tableNames) {
  if (process.platform !== 'win32') {
    throw new Error(
      'ACCDB package capture requires Windows and Microsoft ACE; use --package-in for cross-platform replay.',
    );
  }
  const result = spawnSync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', EXPORT_SCRIPT,
    '-AccdbPath', resolve(accdbPath),
    '-TablesCsv', tableNames.join(','),
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (result.error) {
    throw new Error(`ACCDB extraction failed to start: ${result.error.message}`, { cause: result.error });
  }
  if (result.status !== 0) {
    throw new Error(`ACCDB extraction failed with exit ${result.status}: ${String(result.stderr).trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`ACCDB extraction returned invalid JSON: ${error.message}`, { cause: error });
  }
}

function runCommand(argv) {
  const args = parseArguments(argv);
  const benchmarkPackage = captureOrLoadCaesarAccdbPackage(args);
  if (args.expectedSourceSha256 !== null
      && benchmarkPackage.source.sha256 !== args.expectedSourceSha256) {
    throw new TypeError(
      `ACCDB source SHA-256 mismatch: ${benchmarkPackage.source.sha256} != ${args.expectedSourceSha256}.`,
    );
  }
  if (args.packageOutPath !== null) writeJson(benchmarkPackage, args.packageOutPath);

  let actual = null;
  if (args.solveLinear) {
    actual = solveCaesarAccdbLinearBenchmark(benchmarkPackage);
    if (args.actualOutPath === null) {
      throw new TypeError('--solve-linear true requires --actual-out to preserve iteration evidence.');
    }
    writeJson(actual, args.actualOutPath);
  } else if (args.actualOutPath !== null) {
    throw new TypeError('--actual-out requires --solve-linear true.');
  }

  return Object.freeze({
    status: 'PASS',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    packageSemanticHash: benchmarkPackage.semanticHash,
    modelSemanticHash: benchmarkPackage.model.semanticHash,
    profileId: benchmarkPackage.profile.profileId,
    caseIds: benchmarkPackage.cases.map((entry) => entry.caseId),
    packageMode: args.packageInPath === null ? 'CAPTURE_FROM_ACCDB' : 'REPLAY_CANONICAL_PACKAGE',
    solved: actual !== null,
    executionSemanticHashes: actual === null
      ? null
      : Object.fromEntries(Object.entries(actual.cases)
          .map(([caseId, entry]) => [caseId, entry.executionSemanticHash])),
    executionEvidenceHashes: actual === null
      ? null
      : Object.fromEntries(Object.entries(actual.cases)
          .map(([caseId, entry]) => [caseId, entry.executionEvidenceHash])),
  });
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
  const known = new Set([
    '--accdb', '--profile', '--package-in', '--package-out', '--expected-source-sha256',
    '--solve-linear', '--actual-out',
  ]);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  const solveLinearText = accepted.get('--solve-linear') ?? 'false';
  if (!['true', 'false'].includes(solveLinearText.toLowerCase())) {
    throw new TypeError('--solve-linear must be true or false.');
  }
  const expectedSourceSha256 = accepted.get('--expected-source-sha256') ?? null;
  if (expectedSourceSha256 !== null && !/^[a-f0-9]{64}$/u.test(expectedSourceSha256)) {
    throw new TypeError('--expected-source-sha256 must be a lowercase 64-character SHA-256.');
  }
  return Object.freeze({
    accdbPath: accepted.get('--accdb') ?? null,
    profilePath: accepted.get('--profile') ?? null,
    packageInPath: accepted.get('--package-in') ?? null,
    packageOutPath: accepted.get('--package-out') ?? null,
    expectedSourceSha256,
    solveLinear: solveLinearText.toLowerCase() === 'true',
    actualOutPath: accepted.get('--actual-out') ?? null,
  });
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function writeJson(value, path) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, canonicalPrettyStringify(value), 'utf8');
}

if (resolve(process.argv[1] ?? '') === resolve(SCRIPT_PATH)) {
  try {
    console.log(canonicalPrettyStringify(runCommand(process.argv.slice(2))));
  } catch (error) {
    console.error(error?.stack ?? String(error));
    process.exitCode = 1;
  }
}
