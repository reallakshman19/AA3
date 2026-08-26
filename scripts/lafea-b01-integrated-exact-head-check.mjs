#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  B01_GATE_STATUS as S,
  classifyIntegratedB01ExactHead,
  verifyHistoricalIntegratedReceipt,
  verifyPostNullspaceBoundaryReceipt,
} from './lib/lafea-b01-integrated-exact-head.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_GATE_MERGE = '20e0abb5301363bef0659cf615bc8a37559ac869';
const BOUNDARY_REPORT = path.join(ROOT, 'reports/qualification/B01/post-nullspace-boundary.json');
const FINAL_REPORT = path.join(ROOT, 'reports/qualification/B01/integrated-exact-head.json');
const CUSTODY_PATHS = Object.freeze([
  'src/core/local-continuum/planar-translation-nullspace.js',
  'src/core/local-continuum/bbar-plane-strain.js',
  'src/core/local-continuum/t6-element.js',
  'src/core/local-continuum/q8-element.js',
  'src/core/local-continuum/solver.js',
  'scripts/lafea-b01-bbar-translation-nullspace-check.mjs',
  'scripts/lafea-b01-post-nullspace-boundary-check.mjs',
  'scripts/lib/lafea-b01-post-nullspace-boundary.js',
  'scripts/lafea-b01-bbar-lame-diagnostic.mjs',
  'scripts/lafea-plane-strain-bbar-qualification-check.mjs',
  'scripts/lafea-b01-final-qualification.mjs',
  'validation/lafea-incompressible/plane-strain-bbar-v1.json',
  'validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json',
]);

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    schema: 'lafea-b01-integrated-exact-head-failure/v1',
    status: 'NOT_RUN_OR_UNSEALED',
    message: firstLine(error),
    integratedB01Qualified: false,
    solverRepairAuthorized: false,
    b02NumericalAuthorityGranted: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  }, null, 2));
  process.exit(1);
}

function main() {
  requireRepositoryRoot();
  const repositoryHead = git(['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/u.test(repositoryHead)) {
    throw new TypeError(`Expected full Git HEAD, received ${repositoryHead}`);
  }
  if (spawnSync('git', ['merge-base', '--is-ancestor', REQUIRED_GATE_MERGE, repositoryHead], {
    cwd: ROOT,
    stdio: 'ignore',
  }).status !== 0) {
    throw new Error('LAFEA_B01_INTEGRATED_REQUIRED_GATE_MERGE_NOT_ANCESTOR');
  }
  requireCleanCheckout('start');

  const boundaryCommand = runCommand(
    'post-nullspace-boundary',
    process.execPath,
    [path.join(ROOT, 'scripts/lafea-b01-post-nullspace-boundary-check.mjs')],
  );
  let boundaryVerification = S.NOT_RUN;
  let boundaryVerificationError = null;
  let boundaryReceipt = null;
  if (boundaryCommand.status === S.PASS) {
    try {
      boundaryReceipt = readJson(BOUNDARY_REPORT);
      verifyPostNullspaceBoundaryReceipt(boundaryReceipt, repositoryHead);
      verifyBoundarySourceCustody(boundaryReceipt, repositoryHead);
      boundaryVerification = S.PASS;
    } catch (error) {
      boundaryVerification = S.FAIL;
      boundaryVerificationError = firstLine(error);
    }
  }

  let integratedCommand = notRun('historical-integrated-b01');
  let integratedVerification = S.NOT_RUN;
  let integratedVerificationError = null;
  let historicalReceipt = null;
  let historicalReceiptPath = null;
  if (boundaryCommand.status === S.PASS && boundaryVerification === S.PASS) {
    const reportDir = path.join(os.tmpdir(), `lafea-b01-final-${repositoryHead}-${process.pid}`);
    integratedCommand = runCommand(
      'historical-integrated-b01',
      process.execPath,
      [
        path.join(ROOT, 'scripts/lafea-b01-final-qualification.mjs'),
        '--expected-head', repositoryHead,
        '--report-dir', reportDir,
      ],
    );
    historicalReceiptPath = path.join(reportDir, 'B01-final-integrated-receipt.json');
    if (integratedCommand.status === S.PASS) {
      try {
        historicalReceipt = readJson(historicalReceiptPath);
        verifyHistoricalIntegratedReceipt(historicalReceipt, repositoryHead);
        integratedVerification = S.PASS;
      } catch (error) {
        integratedVerification = S.FAIL;
        integratedVerificationError = firstLine(error);
      }
    }
  }

  const classification = classifyIntegratedB01ExactHead({
    boundaryCommand: boundaryCommand.status,
    boundaryVerification,
    integratedCommand: integratedCommand.status,
    integratedVerification,
  });

  if (!isCleanTree()) {
    throw new Error('LAFEA_B01_INTEGRATED_CHECKOUT_DIRTIED_BEFORE_SEAL');
  }

  const sourceCustody = Object.freeze(Object.fromEntries(
    CUSTODY_PATHS.map((relative) => [relative, git(['rev-parse', `HEAD:${relative}`])]),
  ));
  const envelopeBase = {
    schema: 'lafea-b01-integrated-exact-head-envelope/v1',
    issue: 1100,
    stageId: 'LAFEA.3',
    repositoryHead,
    requiredGateMergeAncestor: REQUIRED_GATE_MERGE,
    checkoutCleanBeforeExecution: true,
    checkoutCleanBeforeSeal: true,
    commands: Object.freeze([boundaryCommand, integratedCommand]),
    verification: Object.freeze({
      postNullspaceBoundary: Object.freeze({
        status: boundaryVerification,
        error: boundaryVerificationError,
        receiptSha256: fileShaIfPresent(BOUNDARY_REPORT),
      }),
      historicalIntegratedB01: Object.freeze({
        status: integratedVerification,
        error: integratedVerificationError,
        receiptSha256: fileShaIfPresent(historicalReceiptPath),
        evidenceHash: historicalReceipt?.evidenceHash ?? null,
      }),
    }),
    sourceCustody,
    ...classification,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  };
  const envelope = {
    ...envelopeBase,
    status: classification.integratedB01Qualified ? 'PASS' : 'FAIL',
    envelopeSha256: sha256(JSON.stringify(envelopeBase)),
  };
  fs.mkdirSync(path.dirname(FINAL_REPORT), { recursive: true });
  fs.writeFileSync(FINAL_REPORT, `${JSON.stringify(envelope, null, 2)}\n`);
  if (!isCleanTree()) {
    throw new Error('LAFEA_B01_INTEGRATED_IGNORED_RECEIPT_DIRTIED_CHECKOUT');
  }
  console.log(JSON.stringify(envelope, null, 2));
  process.exit(envelope.status === 'PASS' ? 0 : 1);
}

function verifyBoundarySourceCustody(receipt, repositoryHead) {
  const critical = [
    'src/core/local-continuum/planar-translation-nullspace.js',
    'src/core/local-continuum/bbar-plane-strain.js',
    'src/core/local-continuum/t6-element.js',
    'src/core/local-continuum/q8-element.js',
    'src/core/local-continuum/solver.js',
    'scripts/lafea-b01-bbar-translation-nullspace-check.mjs',
    'scripts/lafea-b01-bbar-lame-diagnostic.mjs',
  ];
  for (const relative of critical) {
    const expected = git(['rev-parse', `${repositoryHead}:${relative}`]);
    if (receipt.sourceCustody?.[relative] !== expected) {
      throw new TypeError(`boundary sourceCustody mismatch for ${relative}`);
    }
  }
}

function runCommand(id, executable, args) {
  const child = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  return Object.freeze({
    id,
    status: child.status === 0 ? S.PASS : S.FAIL,
    exitCode: child.status ?? -1,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    stderrTail: stderr.slice(-8000),
  });
}

function notRun(id) {
  return Object.freeze({
    id,
    status: S.NOT_RUN,
    exitCode: null,
    stdoutSha256: null,
    stderrSha256: null,
    stdoutBytes: 0,
    stderrBytes: 0,
    stderrTail: '',
  });
}

function requireRepositoryRoot() {
  const actual = git(['rev-parse', '--show-toplevel']);
  if (path.resolve(process.cwd()) !== ROOT || path.resolve(actual) !== ROOT) {
    throw new Error('LAFEA_B01_INTEGRATED_REPOSITORY_ROOT_REQUIRED');
  }
}

function requireCleanCheckout(stage) {
  if (!isCleanTree()) throw new Error(`LAFEA_B01_INTEGRATED_CLEAN_CHECKOUT_REQUIRED_${stage.toUpperCase()}`);
}

function isCleanTree() {
  return git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fileShaIfPresent(file) {
  if (!file || !fs.existsSync(file)) return null;
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}

function firstLine(error) {
  return String(error?.message ?? error).split('\n')[0].slice(0, 1000);
}
