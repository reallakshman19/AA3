#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const FROZEN_BASELINE = '56b826d915c0ae8a390524736cbf27f5afa84d4d';
const args = parseArgs(process.argv.slice(2));
const reportDir = path.resolve(args.reportDir ?? '/tmp/lafea-b01-final');
const commandDir = path.join(reportDir, 'commands');
const baseDir = path.join(reportDir, 'base');
const metamorphicDir = path.join(reportDir, 'metamorphic');
const negativeDir = path.join(reportDir, 'negative');
fs.rmSync(reportDir, { recursive: true, force: true });
fs.mkdirSync(commandDir, { recursive: true });
fs.mkdirSync(baseDir, { recursive: true });
fs.mkdirSync(metamorphicDir, { recursive: true });
fs.mkdirSync(negativeDir, { recursive: true });

const gitHead = git(['rev-parse', 'HEAD']);
const expectedHead = args.expectedHead ?? null;
const cleanTreeAtStart = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
const baselineIsAncestor = commandExit('git', ['merge-base', '--is-ancestor', FROZEN_BASELINE, gitHead]) === 0;
const changedPaths = git(['diff', '--name-only', `${FROZEN_BASELINE}..${gitHead}`])
  .split('\n').filter(Boolean).sort();

const commands = [
  runCommand('independent-oracle', 'python3', [
    path.join(B01, 'oracle/independent-oracle.py'), '--check',
  ]),
  runCommand('deterministic-meshes', 'python3', [
    path.join(B01, 'mesh-generator.py'), '--check',
  ]),
  runCommand('shared-unit-contract', process.execPath, [
    path.join(ROOT, 'scripts/lafea-stage15-neutral-shared-primitives-check.mjs'),
  ]),
  runCommand('prior-solver-control', process.execPath, [
    path.join(ROOT, 'scripts/lafea.3-solver-check.mjs'),
  ]),
  runCommand('prior-imposed-displacement-control', process.execPath, [
    path.join(ROOT, 'scripts/lafea.3-loads-imposed-displacement-check.mjs'),
  ]),
  runCommand('prior-t6-control', process.execPath, [
    path.join(ROOT, 'scripts/lafea.3-t6-patch-check.mjs'),
  ]),
  runCommand('prior-q8-control', process.execPath, [
    path.join(ROOT, 'scripts/lafea.3-q8-patch-check.mjs'),
  ]),
  runCommand('registered-base-54', process.execPath, [
    path.join(ROOT, 'scripts/lafea-b01-registered-route-check.mjs'),
    '--report-dir', baseDir,
  ]),
  runCommand('metamorphic-270', process.execPath, [
    path.join(ROOT, 'scripts/lafea-b01-metamorphic-route-check.mjs'),
    '--report-dir', metamorphicDir,
  ]),
  runCommand('fail-closed-16', process.execPath, [
    path.join(ROOT, 'scripts/lafea-b01-negative-governed-check.mjs'),
    '--report-dir', negativeDir,
  ]),
];

const baseMaster = readIfPresent(path.join(baseDir, 'B01-untouched-baseline-master.json'));
const metamorphicMaster = readIfPresent(path.join(metamorphicDir, 'B01-metamorphic-master.json'));
const negativeMaster = readIfPresent(path.join(negativeDir, 'B01-negative-master.json'));
const meshSummary = readJson(path.join(B01, 'meshes/mesh-generation-summary.json'));
const sourceRegistry = readJson(path.join(B01, 'sources/source-registry.json'));
const composition = requireLafeaStageComposition('LAFEA.3');

const custodyFiles = [
  'LAFEA/Bucket1_deep-research-report (2).md',
  'validation/lafea-benchmark-data/B01/README.md',
  'validation/lafea-benchmark-data/B01/bucket-manifest.json',
  'validation/lafea-benchmark-data/B01/sources/source-registry.json',
  'validation/lafea-benchmark-data/B01/oracle/cases.json',
  'validation/lafea-benchmark-data/B01/oracle/expected-values.json',
  'validation/lafea-benchmark-data/B01/oracle/independent-oracle.py',
  'validation/lafea-benchmark-data/B01/convergence/fixed-probes.json',
  'validation/lafea-benchmark-data/B01/convergence/mesh-ladders.json',
  'validation/lafea-benchmark-data/B01/meshes/mesh-generation-summary.json',
  'validation/lafea-benchmark-data/B01/governance/fem-semantics.json',
  'validation/lafea-benchmark-data/B01/governance/negative-cases.json',
  'validation/lafea-benchmark-data/B01/mesh-generator.py',
  'validation/lafea-benchmark-program/program.json',
  'src/workspace/lafea-stage-registry.js',
  'src/workspace/lafea-stage-components.js',
  'src/core/local-continuum/element.js',
  'src/core/local-continuum/t6-element.js',
  'src/core/local-continuum/q8-element.js',
  'src/core/local-continuum/source-mesh.js',
  'src/core/local-continuum/solver.js',
  'src/core/local-continuum/rigid-reference-conditioning.js',
  'src/core/shared-primitives/units.js',
  'scripts/lafea-b01-registered-route-check.mjs',
  'scripts/lafea-b01-metamorphic-route-check.mjs',
  'scripts/lafea-b01-negative-route-check.mjs',
  'scripts/lafea-b01-negative-governed-check.mjs',
  'scripts/lafea-b01-final-qualification.mjs',
  'scripts/lafea-stage15-neutral-shared-primitives-check.mjs',
];
const fileCustody = Object.fromEntries(custodyFiles.map((relative) => {
  const absolute = path.join(ROOT, relative);
  return [relative, {
    sha256: shaFile(absolute),
    gitBlobSha: git(['hash-object', relative]),
    bytes: fs.statSync(absolute).size,
  }];
}));

const baselineSourceCustody = sourceRegistry.sources.map((source) => {
  const absolute = path.join(ROOT, source.path);
  const present = fs.existsSync(absolute);
  const currentGitBlobSha = present ? git(['hash-object', source.path]) : null;
  return {
    role: source.role,
    path: source.path,
    baselineBlobSha: source.blobSha,
    currentGitBlobSha,
    changedSinceFrozenBaseline: currentGitBlobSha !== source.blobSha,
  };
});

const repairReceiptFiles = listJsonFiles(path.join(ROOT, 'reports/qualification/B01/repairs'));
const repairReceiptCustody = repairReceiptFiles.map((absolute) => ({
  path: path.relative(ROOT, absolute),
  sha256: shaFile(absolute),
  gitBlobSha: git(['hash-object', path.relative(ROOT, absolute)]),
}));

const cleanTreeAtEnd = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
const allCommandsPassed = commands.every((row) => row.exitCode === 0);
const exactHeadMatchesExpectation = expectedHead === null || expectedHead === gitHead;
const baseQualified = baseMaster?.status === 'PASS'
  && baseMaster?.selectedRunCount === 54
  && baseMaster?.passCount === 54
  && baseMaster?.failCount === 0;
const metamorphicQualified = metamorphicMaster?.status === 'PASS'
  && metamorphicMaster?.selectedVariantRunCount === 270
  && metamorphicMaster?.passCount === 270
  && metamorphicMaster?.failCount === 0;
const negativeQualified = negativeMaster?.status === 'PASS'
  && negativeMaster?.selectedRunCount === 16
  && negativeMaster?.passCount === 16
  && negativeMaster?.failCount === 0;
const routeQualified = composition.registryEntry.authority === 'T3_T6_Q8_LINEAR_CONTINUUM'
  && composition.registryEntry.enginePackage === 'local-continuum';

const receiptBase = {
  schema: 'lafea-b01-final-integrated-receipt/v1',
  issue: 1100,
  program: 'B01',
  stageId: 'LAFEA.3',
  branchHead: gitHead,
  expectedBranchHead: expectedHead,
  exactHeadMatchesExpectation,
  frozenBaselineCommit: FROZEN_BASELINE,
  frozenBaselineTree: sourceRegistry.baselineTree,
  frozenBaselineIsAncestor: baselineIsAncestor,
  cleanTreeAtStart,
  cleanTreeAtEnd,
  changedPathCountFromFrozenBaseline: changedPaths.length,
  changedPathsFromFrozenBaseline: changedPaths,
  route: {
    compositionRootId: composition.compositionRootId,
    authority: composition.registryEntry.authority,
    enginePackage: composition.registryEntry.enginePackage,
    inputArtifact: composition.registryEntry.inputArtifact,
    resultArtifact: composition.registryEntry.resultArtifact,
    calculator: composition.registryEntry.calculator,
    sequence: ['normalizeDocument', 'canonicalize', 'calculate', 'acceptResult', 'presentResult'],
  },
  researchArchiveCustody: sourceRegistry.missingResearchArtifact,
  frozenBaselineSourceCustody: baselineSourceCustody,
  fileCustody,
  meshCustody: {
    meshGenerationSummarySha256: fileCustody['validation/lafea-benchmark-data/B01/meshes/mesh-generation-summary.json'].sha256,
    meshCount: meshSummary.meshes.length,
    meshSemanticIdentities: meshSummary.meshes.map((row) => ({
      family: row.family,
      meshId: row.meshId,
      meshSemanticHash: row.meshSemanticHash,
      nodeCount: row.nodeCount,
      elementCount: row.elementCount,
    })),
  },
  frozenProbeCustody: {
    file: 'validation/lafea-benchmark-data/B01/convergence/fixed-probes.json',
    sha256: fileCustody['validation/lafea-benchmark-data/B01/convergence/fixed-probes.json'].sha256,
  },
  frozenAcceptanceCustody: {
    file: 'validation/lafea-benchmark-data/B01/governance/fem-semantics.json',
    sha256: fileCustody['validation/lafea-benchmark-data/B01/governance/fem-semantics.json'].sha256,
  },
  frozenOracleCustody: {
    casesSha256: fileCustody['validation/lafea-benchmark-data/B01/oracle/cases.json'].sha256,
    expectedValuesSha256: fileCustody['validation/lafea-benchmark-data/B01/oracle/expected-values.json'].sha256,
    independentOracleSha256: fileCustody['validation/lafea-benchmark-data/B01/oracle/independent-oracle.py'].sha256,
  },
  repairReceiptCustody,
  commands,
  qualification: {
    allCommandsPassed,
    routeQualified,
    base: {
      status: baseMaster?.status ?? null,
      selectedRunCount: baseMaster?.selectedRunCount ?? null,
      passCount: baseMaster?.passCount ?? null,
      failCount: baseMaster?.failCount ?? null,
      evidenceHash: baseMaster?.evidenceHash ?? null,
      qualified: baseQualified,
    },
    metamorphic: {
      status: metamorphicMaster?.status ?? null,
      selectedRunCount: metamorphicMaster?.selectedVariantRunCount ?? null,
      passCount: metamorphicMaster?.passCount ?? null,
      failCount: metamorphicMaster?.failCount ?? null,
      evidenceHash: metamorphicMaster?.evidenceHash ?? null,
      qualified: metamorphicQualified,
    },
    failClosed: {
      status: negativeMaster?.status ?? null,
      selectedRunCount: negativeMaster?.selectedRunCount ?? null,
      passCount: negativeMaster?.passCount ?? null,
      failCount: negativeMaster?.failCount ?? null,
      evidenceHash: negativeMaster?.evidenceHash ?? null,
      lowLevelEvidenceHash: negativeMaster?.lowLevelMasterEvidenceHash ?? null,
      qualified: negativeQualified,
    },
  },
  limitations: [
    'B01_AFFINE_LINEAR_CONTINUUM_CODE_VERIFICATION_ONLY',
    'NO_NONLINEAR_AUTHORITY_FROM_B01',
    'NO_CONTACT_AUTHORITY_FROM_B01',
    'NO_SHELL_OR_WELD_AUTHORITY_FROM_B01',
    'NO_DESIGN_CODE_AUTHORITY_FROM_B01',
    'NO_RELEASE_AUTHORITY_FROM_B01',
    'T6_Q8_INTEGRATION_POINT_STRESS_AUTHORITATIVE; PROJECTED_NODAL_STRESS_DISPLAY_ONLY',
    'PRODUCTION_GEOMETRY_TO_MESH_TO_CONVERGENCE_ORCHESTRATION_REMAINS_OUTSIDE_B01_SCOPE',
  ],
  releaseAuthorityGrantedByProgram: false,
  temperatureAuthorityGrantedByProgram: false,
};
const status = cleanTreeAtStart
  && cleanTreeAtEnd
  && exactHeadMatchesExpectation
  && baselineIsAncestor
  && routeQualified
  && allCommandsPassed
  && baseQualified
  && metamorphicQualified
  && negativeQualified
  ? 'PASS'
  : 'FAIL';
const receipt = {
  ...receiptBase,
  status,
  evidenceHash: canonicalLafeaSha256({ ...receiptBase, status }),
};
const receiptFile = path.join(reportDir, 'B01-final-integrated-receipt.json');
fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  schema: receipt.schema,
  status: receipt.status,
  branchHead: receipt.branchHead,
  base: receipt.qualification.base,
  metamorphic: receipt.qualification.metamorphic,
  failClosed: receipt.qualification.failClosed,
  evidenceHash: receipt.evidenceHash,
  releaseAuthorityGrantedByProgram: false,
}));
process.exit(status === 'PASS' ? 0 : 1);

function runCommand(id, executable, parameters) {
  const child = spawnSync(executable, parameters, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  const stdoutFile = path.join(commandDir, `${id}.stdout`);
  const stderrFile = path.join(commandDir, `${id}.stderr`);
  const exitFile = path.join(commandDir, `${id}.exit-code`);
  fs.writeFileSync(stdoutFile, stdout);
  fs.writeFileSync(stderrFile, stderr);
  fs.writeFileSync(exitFile, `${child.status ?? -1}\n`);
  return {
    id,
    executable: path.basename(executable),
    arguments: parameters.map((value) => path.isAbsolute(value) && value.startsWith(ROOT)
      ? path.relative(ROOT, value)
      : value),
    exitCode: child.status,
    signal: child.signal,
    stdoutSha256: shaText(stdout),
    stderrSha256: shaText(stderr),
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    stdoutFile: path.relative(reportDir, stdoutFile),
    stderrFile: path.relative(reportDir, stderrFile),
  };
}

function listJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...listJsonFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.json')) output.push(absolute);
  }
  return output.sort();
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readIfPresent(file) { return fs.existsSync(file) ? readJson(file) : null; }
function shaFile(file) { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`; }
function shaText(text) { return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`; }
function git(parameters) { return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function commandExit(executable, parameters) {
  return spawnSync(executable, parameters, { cwd: ROOT, stdio: 'ignore' }).status;
}
function parseArgs(values) {
  const output = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--report-dir') output.reportDir = values[++index];
    else if (value === '--expected-head') output.expectedHead = values[++index];
    else throw new Error(`Unknown argument ${value}.`);
  }
  return output;
}
