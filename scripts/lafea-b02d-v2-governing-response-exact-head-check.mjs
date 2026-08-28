#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  B02D_V2_GOVERNING_STATUS as S,
  classifyB02dV2GoverningResponse,
  verifyB02dV2BindingEnvelope,
} from './lib/lafea-b02d-v2-governing-response.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_BINDING_MERGE = '1465e4fbd72c0ddff6e0332ea0a502e354537bfe';
const BINDING_REPORT = path.join(ROOT, 'reports/qualification/B02D/v2-binding-exact-head.json');
const FINAL_REPORT = path.join(ROOT, 'reports/qualification/B02D/v2-governing-response-exact-head.json');
const CUSTODY_PATHS = Object.freeze([
  'src/workspace/lafea-mesh-producer-binding.js',
  'src/core/lafea-meshing/b02d-probe-stable-polar-mesh-v2.js',
  'validation/lafea-b02-definitions/B02D-lug-pinhole-v2.json',
  'scripts/lafea-b02d-v2-producer-binding-check.mjs',
  'scripts/lafea-b02d-v2-binding-exact-head-check.mjs',
  'scripts/lib/lafea-b02d-v2-binding-exact-head.js',
  'scripts/lafea-b02d-v2-governing-response-check.mjs',
  'scripts/lib/lafea-b02d-v2-governing-response.js',
  'src/core/local-continuum/calculate.js',
  'src/core/local-continuum/solver.js',
]);

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    schema: 'lafea-b02d-v2-governing-response-exact-head-failure/v1',
    status: 'NOT_RUN_OR_UNSEALED',
    message: firstLine(error),
    b02dV2BindingQualified: false,
    b02dV2GoverningResponseObserved: false,
    b02dV2GoverningResponseAccepted: false,
    fullResponseLadderMayNowRun: false,
    b02NumericalAuthorityGranted: false,
    responseSolverRepairAuthorized: false,
    reactionEquilibriumRepairAuthorized: false,
    historicalGalerkinCandidateAuthorized: false,
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
  if (spawnSync('git', ['merge-base', '--is-ancestor', REQUIRED_BINDING_MERGE, repositoryHead], {
    cwd: ROOT,
    stdio: 'ignore',
  }).status !== 0) {
    throw new Error('LAFEA_B02D_V2_BINDING_MERGE_NOT_ANCESTOR');
  }
  requireCleanCheckout('start');

  const bindingCommand = runCommand(
    'b02d-v2-binding-exact-head',
    process.execPath,
    [path.join(ROOT, 'scripts/lafea-b02d-v2-binding-exact-head-check.mjs')],
  );
  let bindingVerification = S.NOT_RUN;
  let bindingVerificationError = null;
  let bindingReceipt = null;
  if (bindingCommand.status === S.PASS) {
    try {
      bindingReceipt = readJson(BINDING_REPORT);
      verifyB02dV2BindingEnvelope(bindingReceipt, repositoryHead);
      bindingVerification = S.PASS;
    } catch (error) {
      bindingVerification = S.FAIL;
      bindingVerificationError = firstLine(error);
    }
  }

  let governingCommand = notRun('b02d-v2-governing-response');
  let governingObservation = null;
  if (bindingCommand.status === S.PASS && bindingVerification === S.PASS) {
    const observed = runJsonCommand(
      'b02d-v2-governing-response',
      process.execPath,
      [path.join(ROOT, 'scripts/lafea-b02d-v2-governing-response-check.mjs')],
    );
    governingCommand = observed.command;
    governingObservation = observed.payload;
  }

  const classification = classifyB02dV2GoverningResponse({
    bindingCommand: bindingCommand.status,
    bindingVerification,
    governingCommand: governingCommand.status,
    governingObservation,
  });

  if (!isCleanTree()) {
    throw new Error('LAFEA_B02D_V2_GOVERNING_RESPONSE_CHECKOUT_DIRTIED_BEFORE_SEAL');
  }
  const sourceCustody = Object.freeze(Object.fromEntries(
    CUSTODY_PATHS.map((relative) => [relative, git(['rev-parse', `HEAD:${relative}`])]),
  ));
  const envelopeBase = {
    schema: 'lafea-b02d-v2-governing-response-exact-head-envelope/v1',
    stageId: 'LAFEA.3',
    repositoryHead,
    requiredBindingMergeAncestor: REQUIRED_BINDING_MERGE,
    checkoutCleanBeforeExecution: true,
    checkoutCleanBeforeSeal: true,
    commands: Object.freeze([bindingCommand, governingCommand]),
    verification: Object.freeze({
      binding: Object.freeze({
        status: bindingVerification,
        error: bindingVerificationError,
        receiptSha256: fileShaIfPresent(BINDING_REPORT),
        envelopeSha256: bindingReceipt?.envelopeSha256 ?? null,
      }),
    }),
    governingObservation,
    sourceCustody,
    ...classification,
  };
  const envelope = {
    ...envelopeBase,
    status: classification.b02dV2GoverningResponseAccepted ? 'PASS' : 'FAIL',
    envelopeSha256: sha256(JSON.stringify(envelopeBase)),
  };
  fs.mkdirSync(path.dirname(FINAL_REPORT), { recursive: true });
  fs.writeFileSync(FINAL_REPORT, `${JSON.stringify(envelope, null, 2)}\n`);
  if (!isCleanTree()) {
    throw new Error('LAFEA_B02D_V2_GOVERNING_RESPONSE_IGNORED_RECEIPT_DIRTIED_CHECKOUT');
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
  return commandRecord(id, child, child.status === 0 ? S.PASS : S.FAIL);
}

function runJsonCommand(id, executable, args) {
  const child = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (child.status !== 0) {
    return Object.freeze({ command: commandRecord(id, child, S.FAIL), payload: null });
  }
  try {
    const payload = JSON.parse(child.stdout ?? '');
    return Object.freeze({ command: commandRecord(id, child, S.PASS), payload });
  } catch (error) {
    const parseFailure = {
      ...commandRecord(id, child, S.FAIL),
      parseError: firstLine(error),
    };
    return Object.freeze({ command: Object.freeze(parseFailure), payload: null });
  }
}

function commandRecord(id, child, status) {
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  return Object.freeze({
    id,
    status,
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
    throw new Error('LAFEA_B02D_V2_GOVERNING_RESPONSE_REPOSITORY_ROOT_REQUIRED');
  }
}
function requireCleanCheckout(stage) {
  if (!isCleanTree()) {
    throw new Error(`LAFEA_B02D_V2_GOVERNING_RESPONSE_CLEAN_CHECKOUT_REQUIRED_${stage.toUpperCase()}`);
  }
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
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}
function firstLine(error) {
  return String(error?.message ?? error).split('\n')[0].slice(0, 1000);
}
