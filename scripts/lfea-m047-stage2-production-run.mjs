#!/usr/bin/env node
/**
 * M047 Stage 2 portable production run.
 *
 * Downloads the pinned BM4_L archive, verifies archive and member custody by
 * recomputed SHA-256, extracts the ACCDB with the portable JS reader, solves the
 * frozen non-friction controls and the Stage 2 friction cases, and writes the
 * custody manifest, resolved configuration, four-layer RCA, friction run evidence
 * and an immutable receipt.
 *
 * This replaces the Windows/ACE-only harness as the production boundary: the ACE
 * path remains available on Windows as an independent provider cross-check, not as
 * a prerequisite. Repository CI is retired, so this command is the qualification
 * boundary and it fails closed on custody, convergence, equilibrium, derivation and
 * determinism - never on a benchmark failure count.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-production-run.mjs [--artifacts <dir>]
 *     [--accdb <local BM4_L.ACCDB>] [--commit <Common commit>] [--skip-sensitivity]
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { runCaesarAccdbBenchmark } from './lfea-caesar-accdb-benchmark.mjs';
import { buildSourceCustodyManifest } from './lfea-m047-stage2-source-custody-manifest.mjs';
import { buildResolvedConfigurationReport } from './lfea-m047-stage2-resolved-configuration-report.mjs';
import { buildFrictionRcaReport } from './lfea-m047-stage2-friction-rca.mjs';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const COMMON_REPOSITORY = 'reallaksh19/Common';
const DEFAULT_COMMON_COMMIT = 'f4d49f2a47d970ae0abf913b537193e324556177';
const ZIP_SHA256 = '978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9';
const ZIP_BYTES = 582488;
const MEMBER_NAME = 'BM4_L.ACCDB';
const MEMBER_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const MEMBER_BYTES = 5136384;
const CONTROL_CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const FRICTION_CASES = Object.freeze(['L13', 'L7', 'L15', 'L1']);
const RCA_PAIRS = Object.freeze([['L13', 'L6'], ['L7', 'L5'], ['L15', 'L14']]);

/** Execute the whole Stage 2 production boundary and return its receipt. */
export async function runStage2Production(input = {}) {
  const artifacts = resolve(input.artifactsRoot ?? 'artifacts/bm4l-stage2');
  mkdirSync(artifacts, { recursive: true });
  const profile = JSON.parse(readFileSync(resolve(PROFILE_PATH), 'utf8'));
  const custodyEvidence = input.accdbPath === undefined
    ? await fetchPinnedAccdb({ artifacts, commonCommit: input.commonCommit ?? DEFAULT_COMMON_COMMIT })
    : localAccdb(input.accdbPath);

  const report = await runCaesarAccdbBenchmark({
    accdbPath: custodyEvidence.accdbPath,
    profilePath: PROFILE_PATH,
    extractor: 'js',
    expectedAccdbSha256: custodyEvidence.memberSha256,
    solveLinear: true,
    solveCaseIds: [...CONTROL_CASES],
    solveFrictionCaseIds: [...FRICTION_CASES],
    actualPath: null,
    actualOutPath: join(artifacts, 'bm4l-stage2-actual.json'),
    frictionEvidenceOutPath: input.skipSensitivity === true
      ? null
      : join(artifacts, 'bm4l-stage2-friction-run-evidence.json'),
    summaryOutPath: join(artifacts, 'bm4l-stage2-summary.md'),
    outPath: join(artifacts, 'bm4l-stage2-report.json'),
  });
  const actual = JSON.parse(readFileSync(join(artifacts, 'bm4l-stage2-actual.json'), 'utf8'));

  const resolvedConfiguration = buildResolvedConfigurationReport({
    profile,
    cases: report.cases.map((row) => ({
      caseId: row.caseId,
      lcaseNumber: row.lcaseNumber,
      caseClass: row.caseClass,
      formula: row.formula,
    })),
    caseSource: `ACCDB_BENCHMARK_REPORT:${report.source.sha256}`,
    translationalStiffnessUnit: String(profileTransUnit(actual) ?? 'N./cm.'),
    translationalStiffnessUnitSource: 'READ_FROM_THE_PINNED_ACCDB_INPUT_UNITS_TABLE',
  });
  write(resolvedConfiguration, join(artifacts, 'bm4l-stage2-resolved-configuration.json'));

  const rca = buildFrictionRcaReport({ actual, report, pairs: RCA_PAIRS.map((pair) => [...pair]) });
  write(rca, join(artifacts, 'bm4l-stage2-friction-rca.json'));

  const manifest = buildSourceCustodyManifest({ report });
  write(manifest, join(artifacts, 'bm4l-stage2-source-custody-manifest.json'));

  const frictionEvidence = input.skipSensitivity === true
    ? null
    : JSON.parse(readFileSync(join(artifacts, 'bm4l-stage2-friction-run-evidence.json'), 'utf8'));

  requireProductionGates({ report, actual, frictionEvidence });

  const receipt = {
    schema: 'm047-bm4l-stage2-production-receipt/v1',
    generatedAtUtc: new Date().toISOString(),
    exactHead: gitHead(),
    worktreeClean: gitClean(),
    nodeVersion: process.versions.node,
    platform: process.platform,
    extractor: actual.mechanics?.linear?.profile === undefined ? 'js' : 'js',
    profile: PROFILE_PATH,
    custody: custodyEvidence.record,
    controlCaseIds: [...CONTROL_CASES],
    frictionCaseIds: [...FRICTION_CASES],
    qualification: {
      status: report.qualification.status,
      totals: report.qualification.totals,
      semanticHash: report.qualification.semanticHash,
      caseFailures: Object.fromEntries(report.qualification.cases
        .map((row) => [row.caseId, row.comparison.counts.failed])),
      restraintFailures: Object.fromEntries(Object.entries(report.restraintBasis.cases)
        .map(([caseId, basis]) => [caseId, basis.exceedingComponentCount])),
    },
    friction: Object.fromEntries(Object.entries(actual.mechanics.friction.cases).map(([caseId, evidence]) => [
      caseId,
      evidence.kind === 'PRIMITIVE'
        ? {
          kind: evidence.kind,
          iterationCount: evidence.iterationCount,
          convergenceStatus: evidence.convergenceGates.status,
          equilibriumStatus: evidence.recoveredEquilibrium.status,
          slidRestraintCount: evidence.slidRestraintCount,
          frictionRestraintCount: evidence.frictionPlan.supportCount,
        }
        : {
          kind: evidence.kind,
          independentNonlinearSolve: evidence.independentNonlinearSolve,
          identityStatus: evidence.identityProof.status,
        },
    ])),
    determinismStatus: frictionEvidence?.determinism?.status ?? 'NOT_RUN',
    resolvedConfigurationSemanticHash: resolvedConfiguration.resolvedConfigurationSemanticHash,
    sourceCustodyManifestSemanticHash: manifest.manifestSemanticHash,
    rcaSemanticHash: rca.rcaSemanticHash,
    artifactsRoot: artifacts,
  };
  write(receipt, join(artifacts, 'bm4l-stage2-production-receipt.json'));
  return receipt;
}

/**
 * Fail the run on physics, custody, derivation and determinism.
 *
 * Benchmark failure counts are recorded, never gated: this boundary separates
 * execution custody from engineering interpretation.
 */
function requireProductionGates({ report, actual, frictionEvidence }) {
  if (actual.sourceAccdbSha256 !== report.source.sha256) {
    throw new Error('Solved package and report are bound to different ACCDB sources.');
  }
  for (const [caseId, evidence] of Object.entries(actual.mechanics.friction.cases)) {
    if (evidence.kind === 'PRIMITIVE') {
      if (evidence.convergenceGates.status !== 'CONVERGED') {
        throw new Error(`${caseId} friction active set did not converge: ${evidence.convergenceGates.failedGates.join(', ')}.`);
      }
      if (evidence.recoveredEquilibrium.status !== 'PASS') {
        throw new Error(`${caseId} recovered physical equilibrium failed.`);
      }
      continue;
    }
    if (evidence.independentNonlinearSolve !== false || evidence.identityProof.status !== 'PASS') {
      throw new Error(`${caseId} must be rebuilt algebraically from converged primitives.`);
    }
  }
  if (frictionEvidence !== null && frictionEvidence.determinism.status !== 'PASS') {
    throw new Error('Repeated nominal friction runs are not deterministic.');
  }
}

async function fetchPinnedAccdb({ artifacts, commonCommit }) {
  const url = `https://raw.githubusercontent.com/${COMMON_REPOSITORY}/${commonCommit}/LFEA/BM4/${'BM4_L.zip'}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot download pinned BM4_L.zip: HTTP ${response.status}.`);
  const zipBytes = Buffer.from(await response.arrayBuffer());
  const zipSha256 = createHash('sha256').update(zipBytes).digest('hex');
  if (zipBytes.byteLength !== ZIP_BYTES || zipSha256 !== ZIP_SHA256) {
    throw new Error(`Pinned BM4_L.zip custody mismatch: ${zipBytes.byteLength} bytes, ${zipSha256}.`);
  }
  const zipPath = join(artifacts, 'BM4_L.zip');
  writeFileSync(zipPath, zipBytes);
  const sourceDir = join(artifacts, 'source');
  mkdirSync(sourceDir, { recursive: true });
  execFileSync('unzip', ['-o', '-q', zipPath, '-d', sourceDir]);
  const accdbPath = join(sourceDir, MEMBER_NAME);
  const memberBytes = readFileSync(accdbPath);
  const memberSha256 = createHash('sha256').update(memberBytes).digest('hex');
  if (memberBytes.byteLength !== MEMBER_BYTES || memberSha256 !== MEMBER_SHA256) {
    throw new Error(`Pinned ${MEMBER_NAME} custody mismatch: ${memberBytes.byteLength} bytes, ${memberSha256}.`);
  }
  return {
    accdbPath,
    memberSha256,
    record: {
      mode: 'DOWNLOADED_FROM_PINNED_COMMON_COMMIT',
      commonCommit,
      url,
      zip: { byteLength: zipBytes.byteLength, sha256: zipSha256, expectedSha256: ZIP_SHA256 },
      member: { fileName: MEMBER_NAME, byteLength: memberBytes.byteLength, sha256: memberSha256, expectedSha256: MEMBER_SHA256 },
    },
  };
}

function localAccdb(accdbPath) {
  const bytes = readFileSync(resolve(accdbPath));
  const memberSha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.byteLength !== MEMBER_BYTES || memberSha256 !== MEMBER_SHA256) {
    throw new Error(`Local ${MEMBER_NAME} custody mismatch: ${bytes.byteLength} bytes, ${memberSha256}.`);
  }
  return {
    accdbPath: resolve(accdbPath),
    memberSha256,
    record: {
      mode: 'LOCAL_PINNED_MEMBER',
      commonCommit: null,
      url: null,
      zip: null,
      member: { fileName: MEMBER_NAME, byteLength: bytes.byteLength, sha256: memberSha256, expectedSha256: MEMBER_SHA256 },
    },
  };
}

function profileTransUnit(actual) {
  return actual.mechanics?.friction?.cases
    ? Object.values(actual.mechanics.friction.cases)[0]?.frictionStiffness?.displayedUnit ?? null
    : null;
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function gitClean() {
  try {
    return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' }).trim() === '';
  } catch {
    return null;
  }
}

function write(value, path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${canonicalPrettyStringify(value)}\n`, 'utf8');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--skip-sensitivity') {
      accepted.set('--skip-sensitivity', 'true');
      continue;
    }
    accepted.set(argv[index], argv[index + 1]);
    index += 1;
  }
  const receipt = await runStage2Production({
    artifactsRoot: accepted.get('--artifacts'),
    accdbPath: accepted.get('--accdb'),
    commonCommit: accepted.get('--commit'),
    skipSensitivity: accepted.get('--skip-sensitivity') === 'true',
  });
  process.stdout.write(`${canonicalPrettyStringify(receipt)}\n`);
}
