#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { resolvePythonInterpreter } from './lib/python-interpreter.mjs';

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
for (const directory of [commandDir, baseDir, metamorphicDir, negativeDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

const gitHead = git(['rev-parse', 'HEAD']);
const expectedHead = args.expectedHead ?? null;
const cleanTreeAtStart = isCleanTree();
const baselineIsAncestor = spawnSync(
  'git', ['merge-base', '--is-ancestor', FROZEN_BASELINE, gitHead],
  { cwd: ROOT, stdio: 'ignore' },
).status === 0;
const changedPaths = git(['diff', '--name-only', `${FROZEN_BASELINE}..${gitHead}`])
  .split('\n').filter(Boolean).sort();

// Resolved once so the recorded command evidence names the interpreter that
// actually ran, rather than a bare "python3" that means different things on
// Linux and Windows.
const PYTHON = resolvePythonInterpreter();

const commands = [
  command('independent-oracle', PYTHON.command, [...PYTHON.prefixArgs, path.join(B01, 'oracle/independent-oracle.py'), '--check']),
  command('deterministic-meshes', PYTHON.command, [...PYTHON.prefixArgs, path.join(B01, 'mesh-generator.py'), '--check']),
  command('shared-unit-contract', process.execPath, [path.join(ROOT, 'scripts/lafea-stage15-neutral-shared-primitives-check.mjs')]),
  command('prior-solver-control', process.execPath, [path.join(ROOT, 'scripts/lafea.3-solver-check.mjs')]),
  command('prior-imposed-displacement-control', process.execPath, [path.join(ROOT, 'scripts/lafea.3-loads-imposed-displacement-check.mjs')]),
  command('prior-t6-control', process.execPath, [path.join(ROOT, 'scripts/lafea.3-t6-patch-check.mjs')]),
  command('prior-q8-control', process.execPath, [path.join(ROOT, 'scripts/lafea.3-q8-patch-check.mjs')]),
  command('plane-strain-bbar-qualification', process.execPath, [path.join(ROOT, 'scripts/lafea-plane-strain-bbar-qualification-check.mjs')]),
  command('registered-base-54', process.execPath, [path.join(ROOT, 'scripts/lafea-b01-registered-route-check.mjs'), '--report-dir', baseDir]),
  command('metamorphic-270', process.execPath, [path.join(ROOT, 'scripts/lafea-b01-metamorphic-route-check.mjs'), '--report-dir', metamorphicDir]),
  command('fail-closed-16', process.execPath, [path.join(ROOT, 'scripts/lafea-b01-negative-governed-check.mjs'), '--report-dir', negativeDir]),
];

const baseMaster = readIfPresent(path.join(baseDir, 'B01-untouched-baseline-master.json'));
const metamorphicMaster = readIfPresent(path.join(metamorphicDir, 'B01-metamorphic-master.json'));
const negativeMaster = readIfPresent(path.join(negativeDir, 'B01-negative-master.json'));
const meshSummary = readJson(path.join(B01, 'meshes/mesh-generation-summary.json'));
const sourceRegistry = readJson(path.join(B01, 'sources/source-registry.json'));
const composition = requireLafeaStageComposition('LAFEA.3');

const custodyPaths = [
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
  'validation/lafea-incompressible/plane-strain-bbar-v1.json',
  'validation/lafea-incompressible/plane-strain-bbar-convergence-v1.json',
  'validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json',
  'src/workspace/lafea-stage-registry.js',
  'src/workspace/lafea-stage-components.js',
  'src/core/local-continuum/bbar-plane-strain.js',
  'src/core/local-continuum/element.js',
  'src/core/local-continuum/t6-element.js',
  'src/core/local-continuum/q8-element.js',
  'src/core/local-continuum/source-mesh.js',
  'src/core/local-continuum/solver.js',
  'src/core/local-continuum/rigid-reference-conditioning.js',
  'src/core/shared-primitives/units.js',
  'scripts/lafea-plane-strain-bbar-freeze-check.mjs',
  'scripts/lafea-plane-strain-bbar-source-guard.mjs',
  'scripts/lafea-plane-strain-bbar-kernel-check.mjs',
  'scripts/lafea-plane-strain-bbar-lame-check.mjs',
  'scripts/lafea-plane-strain-bbar-qualification-check.mjs',
  'scripts/lafea-b01-registered-route-check.mjs',
  'scripts/lafea-b01-metamorphic-route-check.mjs',
  'scripts/lafea-b01-negative-route-check.mjs',
  'scripts/lafea-b01-negative-governed-check.mjs',
  'scripts/lafea-b01-final-qualification.mjs',
  'scripts/lafea-stage15-neutral-shared-primitives-check.mjs',
];
const fileCustody = Object.fromEntries(custodyPaths.map((relative) => [relative, fileRecord(relative)]));
const repairReceiptCustody = listJsonFiles(path.join(ROOT, 'reports/qualification/B01/repairs'))
  .map((absolute) => {
    const relative = path.relative(ROOT, absolute);
    return { path: relative, ...fileRecord(relative) };
  });
const frozenBaselineSourceCustody = sourceRegistry.sources.map((source) => {
  const absolute = path.join(ROOT, source.path);
  const currentGitBlobSha = fs.existsSync(absolute) ? git(['hash-object', source.path]) : null;
  return {
    role: source.role,
    path: source.path,
    baselineBlobSha: source.blobSha,
    currentGitBlobSha,
    changedSinceFrozenBaseline: currentGitBlobSha !== source.blobSha,
  };
});

const exactHeadMatchesExpectation = expectedHead === null || expectedHead === gitHead;
const allCommandsPassed = commands.every((row) => row.exitCode === 0);
const bbarQualified = commands.find((row) => row.id === 'plane-strain-bbar-qualification')?.exitCode === 0;
const baseQualified = baseMaster?.status === 'PASS'
  && baseMaster.selectedRunCount === 54 && baseMaster.passCount === 54 && baseMaster.failCount === 0;
const metamorphicQualified = metamorphicMaster?.status === 'PASS'
  && metamorphicMaster.selectedVariantRunCount === 270
  && metamorphicMaster.passCount === 270 && metamorphicMaster.failCount === 0;
const negativeQualified = negativeMaster?.status === 'PASS'
  && negativeMaster.selectedRunCount === 16 && negativeMaster.passCount === 16 && negativeMaster.failCount === 0;
const routeQualified = composition.registryEntry.authority === 'T3_T6_Q8_LINEAR_CONTINUUM'
  && composition.registryEntry.enginePackage === 'local-continuum';
const cleanTreeAtEnd = isCleanTree();

const receiptBase = {
  schema: 'lafea-b01-final-integrated-receipt/v1',
  issue: 1100,
  program: 'B01_PLUS_BBAR_INTEGRATION',
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
    inputContractRole: composition.registryEntry.inputContractRole,
    resultContractRole: composition.registryEntry.resultContractRole,
    presenterRole: composition.registryEntry.presenterRole,
    unitSourceRole: composition.registryEntry.unitSourceRole,
    sequence: ['normalizeDocument', 'canonicalize', 'calculate', 'acceptResult', 'presentResult'],
  },
  researchArchiveCustody: sourceRegistry.missingResearchArtifact,
  frozenBaselineSourceCustody,
  fileCustody,
  repairReceiptCustody,
  meshCustody: {
    summarySha256: fileCustody['validation/lafea-benchmark-data/B01/meshes/mesh-generation-summary.json'].sha256,
    meshCount: meshSummary.meshCount,
    meshes: meshSummary.meshes.map((row) => ({
      meshId: row.meshId,
      family: row.family,
      meshSemanticHash: row.meshSemanticHash,
      nodeCount: row.nodeCount,
      elementCount: row.elementCount,
      midsideNodeCount: row.midsideNodeCount,
      connectedComponentCount: row.connectedComponentCount,
    })),
  },
  frozenOracleCustody: {
    casesSha256: fileCustody['validation/lafea-benchmark-data/B01/oracle/cases.json'].sha256,
    expectedValuesSha256: fileCustody['validation/lafea-benchmark-data/B01/oracle/expected-values.json'].sha256,
    independentOracleSha256: fileCustody['validation/lafea-benchmark-data/B01/oracle/independent-oracle.py'].sha256,
  },
  frozenProbeCustody: {
    sha256: fileCustody['validation/lafea-benchmark-data/B01/convergence/fixed-probes.json'].sha256,
  },
  frozenAcceptanceCustody: {
    sha256: fileCustody['validation/lafea-benchmark-data/B01/governance/fem-semantics.json'].sha256,
  },
  frozenNegativeDefinitionCustody: {
    sha256: fileCustody['validation/lafea-benchmark-data/B01/governance/negative-cases.json'].sha256,
  },
  bbarCustody: {
    qualificationDefinitionSha256: fileCustody['validation/lafea-incompressible/plane-strain-bbar-v1.json'].sha256,
    convergenceDefinitionSha256: fileCustody['validation/lafea-incompressible/plane-strain-bbar-convergence-v1.json'].sha256,
    probeMeshPolicySha256: fileCustody['validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json'].sha256,
    mechanicsBlobSha: fileCustody['src/core/local-continuum/bbar-plane-strain.js'].gitBlobSha,
    expectedProductionSolveCount: 120,
  },
  commands,
  qualification: {
    allCommandsPassed,
    routeQualified,
    planeStrainBbar: {
      status: bbarQualified ? 'PASS' : 'FAIL',
      qualified: bbarQualified,
      releaseAuthorityGranted: false,
      temperatureAuthorityGranted: false,
    },
    base: summary(baseMaster, 54, baseQualified, 'selectedRunCount'),
    metamorphic: summary(metamorphicMaster, 270, metamorphicQualified, 'selectedVariantRunCount'),
    failClosed: {
      ...summary(negativeMaster, 16, negativeQualified, 'selectedRunCount'),
      lowLevelEvidenceHash: negativeMaster?.lowLevelMasterEvidenceHash ?? null,
    },
  },
  limitations: [
    'B01_AFFINE_LINEAR_CONTINUUM_CODE_VERIFICATION_ONLY',
    'PLANE_STRAIN_BBAR_MECHANICAL_AUTHORITY_REQUIRES_FROZEN_LAME_NU_DISTORTION_MATRIX',
    'PLANE_STRAIN_BBAR_T3_AUTHORITY_NOT_GRANTED',
    'PLANE_STRAIN_BBAR_TEMPERATURE_AUTHORITY_NOT_GRANTED',
    'NO_NONLINEAR_AUTHORITY_FROM_B01_OR_BBAR',
    'NO_CONTACT_AUTHORITY_FROM_B01_OR_BBAR',
    'NO_SHELL_OR_WELD_AUTHORITY_FROM_B01_OR_BBAR',
    'NO_DESIGN_CODE_AUTHORITY_FROM_B01_OR_BBAR',
    'NO_RELEASE_AUTHORITY_FROM_B01_OR_BBAR',
    'T6_Q8_INTEGRATION_POINT_STRESS_AUTHORITATIVE; PROJECTED_NODAL_STRESS_DISPLAY_ONLY',
  ],
  releaseAuthorityGrantedByProgram: false,
  temperatureAuthorityGrantedByProgram: false,
};
const pass = cleanTreeAtStart && cleanTreeAtEnd && exactHeadMatchesExpectation
  && baselineIsAncestor && allCommandsPassed && routeQualified && bbarQualified
  && baseQualified && metamorphicQualified && negativeQualified;
const receipt = {
  ...receiptBase,
  status: pass ? 'PASS' : 'FAIL',
  evidenceHash: canonicalLafeaSha256({ ...receiptBase, status: pass ? 'PASS' : 'FAIL' }),
};
fs.writeFileSync(
  path.join(reportDir, 'B01-final-integrated-receipt.json'),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(JSON.stringify({
  schema: receipt.schema,
  status: receipt.status,
  branchHead: receipt.branchHead,
  planeStrainBbar: receipt.qualification.planeStrainBbar,
  base: receipt.qualification.base,
  metamorphic: receipt.qualification.metamorphic,
  failClosed: receipt.qualification.failClosed,
  evidenceHash: receipt.evidenceHash,
  releaseAuthorityGrantedByProgram: false,
}));
process.exit(pass ? 0 : 1);

function command(id, executable, parameters) {
  const child = spawnSync(executable, parameters, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  fs.writeFileSync(path.join(commandDir, `${id}.stdout`), stdout);
  fs.writeFileSync(path.join(commandDir, `${id}.stderr`), stderr);
  fs.writeFileSync(path.join(commandDir, `${id}.exit-code`), `${child.status ?? -1}\n`);
  return {
    id,
    executable: path.basename(executable),
    arguments: parameters.map((value) => path.isAbsolute(value) && value.startsWith(ROOT)
      ? path.relative(ROOT, value) : value),
    exitCode: child.status,
    signal: child.signal,
    stdoutSha256: shaText(stdout),
    stderrSha256: shaText(stderr),
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
  };
}
function summary(master, expectedCount, qualified, countKey) {
  return {
    status: master?.status ?? null,
    selectedRunCount: master?.[countKey] ?? null,
    expectedRunCount: expectedCount,
    passCount: master?.passCount ?? null,
    failCount: master?.failCount ?? null,
    evidenceHash: master?.evidenceHash ?? null,
    qualified,
  };
}
function fileRecord(relative) {
  const absolute = path.join(ROOT, relative);
  return {
    sha256: shaFile(absolute),
    gitBlobSha: git(['hash-object', relative]),
    bytes: fs.statSync(absolute).size,
  };
}
function listJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return listJsonFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.json') ? [absolute] : [];
  }).sort();
}
function isCleanTree() { return git(['status', '--porcelain=v1', '--untracked-files=all']) === ''; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readIfPresent(file) { return fs.existsSync(file) ? readJson(file) : null; }
function shaFile(file) { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`; }
function shaText(text) { return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`; }
function git(parameters) { return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim(); }
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
