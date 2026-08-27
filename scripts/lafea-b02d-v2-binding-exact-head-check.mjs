#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  B02D_V2_GATE_STATUS as S,
  classifyB02dV2BindingExactHead,
  verifyIntegratedB01Envelope,
} from './lib/lafea-b02d-v2-binding-exact-head.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_FROZEN_ASSET_MERGE = '2c9ed9d1045431a43a926696c6d5a015cbd0e926';
const B01_REPORT = path.join(ROOT, 'reports/qualification/B01/integrated-exact-head.json');
const FINAL_REPORT = path.join(ROOT, 'reports/qualification/B02D/v2-binding-exact-head.json');
const CUSTODY_PATHS = Object.freeze([
  'src/workspace/lafea-mesh-producer-binding.js',
  'src/core/lafea-meshing/b02d-probe-stable-polar-mesh-v2.js',
  'validation/lafea-b02-definitions/B02D-lug-pinhole-v2.json',
  'scripts/lafea-b02d-v2-preobservation-quality-check.mjs',
  'scripts/lafea-b02d-v2-producer-binding-check.mjs',
  'scripts/lafea-b01-integrated-exact-head-check.mjs',
  'scripts/lib/lafea-b01-integrated-exact-head.js',
]);

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    schema: 'lafea-b02d-v2-binding-exact-head-failure/v1',
    status: 'NOT_RUN_OR_UNSEALED',
    message: firstLine(error),
    integratedB01Qualified: false,
    b02PrerequisiteEvidenceAvailable: false,
    b02dV2PreobservationQualityQualified: false,
    b02dV2BindingQualified: false,
    b02NumericalAuthorityGranted: false,
    responseSolverRepairAuthorized: false,
    reactionEquilibriumRepairAuthorized: false,
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
  if (spawnSync('git', ['merge-base', '--is-ancestor', REQUIRED_FROZEN_ASSET_MERGE, repositoryHead], {
    cwd: ROOT,
    stdio: 'ignore',
  }).status !== 0) {
    throw new Error('LAFEA_B02D_V2_FROZEN_ASSET_MERGE_NOT_ANCESTOR');
  }
  requireCleanCheckout('start');

  const b01Command = runCommand(
    'integrated-b01-exact-head',
    process.execPath,
    [path.join(ROOT, 'scripts/lafea-b01-integrated-exact-head-check.mjs')],
  );
  let b01Verification = S.NOT_RUN;
  let b01VerificationError = null;
  let b01Receipt = null;
  if (b01Command.status === S.PASS) {
    try {
      b01Receipt = readJson(B01_REPORT);
      verifyIntegratedB01Envelope(b01Receipt, repositoryHead);
      b01Verification = S.PASS;
    } catch (error) {
      b01Verification = S.FAIL;
      b01VerificationError = firstLine(error);
    }
  }

  let preobservationCommand = notRun('b02d-v2-preobservation-quality');
  if (b01Command.status === S.PASS && b01Verification === S.PASS) {
    preobservationCommand = runCommand(
      'b02d-v2-preobservation-quality',
      process.execPath,
      [path.join(ROOT, 'scripts/lafea-b02d-v2-preobservation-quality-check.mjs')],
    );
  }

  let bindingCommand = notRun('b02d-v2-producer-binding');
  if (b01Command.status === S.PASS
    && b01Verification === S.PASS
    && preobservationCommand.status === S.PASS) {
    bindingCommand = runCommand(
      'b02d-v2-producer-binding',
      process.execPath,
      [path.join(ROOT, 'scripts/lafea-b02d-v2-producer-binding-check.mjs')],
    );
  }

  const classification = classifyB02dV2BindingExactHead({
    b01Command: b01Command.status,
    b01Verification,
    preobservationCommand: preobservationCommand.status,
    bindingCommand: bindingCommand.status,
  });

  if (!isCleanTree()) {
    throw new Error('LAFEA_B02D_V2_BINDING_CHECKOUT_DIRTIED_BEFORE_SEAL');
  }
  const sourceCustody = Object.freeze(Object.fromEntries(
    CUSTODY_PATHS.map((relative) => [relative, git(['rev-parse', `HEAD:${relative}`])]),
  ));
  const envelopeBase = {
    schema: 'lafea-b02d-v2-binding-exact-head-envelope/v1',
    stageId: 'LAFEA.3',
    repositoryHead,
    requiredFrozenAssetMergeAncestor: REQUIRED_FROZEN_ASSET_MERGE,
    checkoutCleanBeforeExecution: true,
    checkoutCleanBeforeSeal: true,
    commands: Object.freeze([b01Command, preobservationCommand, bindingCommand]),
    verification: Object.freeze({
      integratedB01: Object.freeze({
        status: b01Verification,
        error: b01VerificationError,
        receiptSha256: fileShaIfPresent(B01_REPORT),
        envelopeSha256: b01Receipt?.envelopeSha256 ?? null,
      }),
    }),
    sourceCustody,
    ...classification,
  };
  const envelope = {
    ...envelopeBase,
    status: classification.b02dV2BindingQualified ? 'PASS' : 'FAIL',
    envelopeSha256: sha256(JSON.stringify(envelopeBase)),
  };
  fs.mkdirSync(path.dirname(FINAL_REPORT), { recursive: true });
  fs.writeFileSync(FINAL_REPORT, `${JSON.stringify(envelope, null, 2)}\n`);
  if (!isCleanTree()) {
    throw new Error('LAFEA_B02D_V2_BINDING_IGNORED_RECEIPT_DIRTIED_CHECKOUT');
  }
  console.log(JSON.stringify(envelope, null, 2));
  process.exit(envelope.status === 'PASS' ? 0 : 1);
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
    throw new Error('LAFEA_B02D_V2_BINDING_REPOSITORY_ROOT_REQUIRED');
  }
}
function requireCleanCheckout(stage) {
  if (!isCleanTree()) throw new Error(`LAFEA_B02D_V2_BINDING_CLEAN_CHECKOUT_REQUIRED_${stage.toUpperCase()}`);
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
