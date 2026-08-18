#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS,
  createLafea4ParentNormalActivationRecord,
  validateLafea4ParentNormalActivationRecord,
} from '../src/workspace/lafea4-parent-normal-activation-record.js';

const cli = parseArgs(process.argv.slice(2));
const bundleArg = cli._[0];
const expectedHead = cli['expected-head'];
if (!bundleArg || !expectedHead || !/^[0-9a-f]{40}$/u.test(expectedHead)) {
  console.error('Usage: node scripts/lafea-tech12d-parent-normal-activation-record.mjs <TECH8-bundle-dir> --expected-head <40-char SHA> [--output <path>]');
  process.exit(64);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const bundle = path.resolve(bundleArg);
const files = {
  manifest: path.join(bundle, 'manifest.json'),
  commands: path.join(bundle, 'commands.json'),
  plan: path.join(bundle, 'plan.json'),
  hashes: path.join(bundle, 'hashes.sha256'),
  digest: path.join(bundle, 'evidence-digest.txt'),
  bundledVerifier: path.join(bundle, 'tools', 'lafea-independent-qualification-verify.mjs'),
  bundledRunner: path.join(bundle, 'tools', 'lafea-independent-qualification.mjs'),
};
for (const name of ['manifest', 'commands', 'plan', 'hashes', 'digest']) {
  const file = files[name];
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`LAFEA4_PARENT_NORMAL_ACTIVATION_BUNDLE_FILE_MISSING:${name}`);
  }
}

const hashesText = fs.readFileSync(files.hashes, 'utf8');
const evidenceDigest = sha256(Buffer.from(hashesText, 'utf8'));
const recordedDigest = fs.readFileSync(files.digest, 'utf8').trim();
if (recordedDigest !== evidenceDigest) {
  fail('LAFEA4_PARENT_NORMAL_ACTIVATION_RECORDED_DIGEST_MISMATCH');
}

// Reuse TECH-8's canonical evidence verifier as the only bundle-integrity
// authority. We deliberately do not pass --require-pass here: an integrity-
// valid NOT_RUN/FAIL bundle must produce a deterministic BLOCKED record rather
// than being mistaken for missing evidence.
const verifier = path.join(scriptDir, 'lafea-independent-qualification-verify.mjs');
const verification = spawnSync(process.execPath, [
  verifier,
  bundle,
  '--expected-digest', evidenceDigest,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
if (verification.error || verification.status !== 0) {
  const detail = `${verification.stdout ?? ''}\n${verification.stderr ?? ''}`.trim();
  fail(`LAFEA4_PARENT_NORMAL_ACTIVATION_BUNDLE_INTEGRITY_REJECTED:${detail}`);
}

const manifest = readJson(files.manifest, 'MANIFEST');
const commands = readJson(files.commands, 'COMMANDS');
const plan = readJson(files.plan, 'PLAN');

// Promotion must be evaluated by the exact checkout that was independently
// qualified. A valid old bundle evaluated from a newer checkout is a BLOCK,
// never an authorization.
const currentHead = rawSpawn('git', ['rev-parse', 'HEAD'], repoRoot);
const trackedStatus = rawSpawn(
  'git', ['status', '--porcelain=v1', '--untracked-files=no'], repoRoot,
);
const exactCheckoutVerified = currentHead.status === 0
  && currentHead.stdout.trim() === expectedHead
  && trackedStatus.status === 0
  && trackedStatus.stdout.trim() === '';

const currentPlan = path.join(repoRoot, 'validation/lafea-independent-qualification/plan-v1.json');
const currentRunner = path.join(scriptDir, 'lafea-independent-qualification.mjs');
const currentPackageLock = path.join(repoRoot, 'package-lock.json');
const currentPlanSha256 = fileSha256(currentPlan);
const currentRunnerSha256 = fileSha256(currentRunner);
const currentPackageLockSha256 = fileSha256(currentPackageLock);
const currentVerifierSha256 = fileSha256(verifier);
const bundledVerifierSha256 = fileSha256(files.bundledVerifier);
const bundledRunnerSha256 = fileSha256(files.bundledRunner);
const toolingParityVerified = currentPlanSha256 === manifest.planSha256
  && currentRunnerSha256 === manifest.runnerSha256
  && bundledRunnerSha256 === manifest.runnerSha256
  && currentPackageLockSha256 === manifest.packageLockSha256
  && currentVerifierSha256 !== null
  && currentVerifierSha256 === bundledVerifierSha256;

const record = validateLafea4ParentNormalActivationRecord(
  createLafea4ParentNormalActivationRecord({
    expectedHead,
    evidenceDigest,
    manifest,
    commands,
    plan,
    bundleIntegrity: {
      schema: 'lafea-independent-qualification-bundle-integrity/v1',
      verified: true,
      evidenceDigest,
      exactCheckoutVerified,
      toolingParityVerified,
      verifierSha256: currentVerifierSha256,
    },
  }),
);

const output = path.resolve(cli.output ?? path.join(
  path.dirname(bundle),
  `lafea4-parent-normal-activation-${expectedHead}.json`,
));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);

console.log(JSON.stringify({
  check: 'lafea-tech12d-parent-normal-activation-record',
  status: record.status,
  expectedHead: record.expectedHead,
  currentHead: currentHead.stdout.trim() || null,
  exactCheckoutVerified,
  toolingParityVerified,
  evidenceDigest: record.evidenceDigest,
  recordHash: record.semanticHash,
  output,
  productHardGateActivated: record.hardGateActivated,
  productionBindingAuthorized: record.productionBindingAuthorized,
  reasons: record.reasons,
}, null, 2));

process.exit(record.status === LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS ? 0 : 2);

function readJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`LAFEA4_PARENT_NORMAL_ACTIVATION_${label}_JSON_INVALID:${error.message}`); }
}
function fileSha256(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return sha256(fs.readFileSync(file));
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function rawSpawn(executable, args, cwd) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: Number.isInteger(result.status) ? result.status : null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ?? null,
  };
}
function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) fail(`Missing value for --${key}`);
    out[key] = next;
    index += 1;
  }
  return out;
}
function fail(code) {
  console.error(code);
  process.exit(1);
}
