#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  validateLafea4ParentNormalActivationRecord,
} from '../src/workspace/lafea4-parent-normal-activation-record.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH,
  renderLafea4ParentNormalProductionActivationSource,
  validateLafea4ParentNormalPromotionRecordForHead,
} from '../src/workspace/lafea4-parent-normal-promotion-source.js';

const cli = parseArgs(process.argv.slice(2));
const bundleArg = cli._[0];
const recordArg = cli._[1];
const expectedHead = cli['expected-head'];
if (!bundleArg || !recordArg || typeof expectedHead !== 'string'
  || !/^[0-9a-f]{40}$/u.test(expectedHead)) {
  fail('Usage: node scripts/lafea-tech12f-parent-normal-promotion-source.mjs <TECH8-bundle-dir> <TECH12D-record.json> --expected-head <40-char SHA> [--output <file>] [--write-trust-root]');
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const bundle = path.resolve(bundleArg);
const recordPath = path.resolve(recordArg);
const trustRootPath = path.join(repoRoot, LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH);
requireExactCleanCheckout(repoRoot, expectedHead);

const supplied = readJson(recordPath, 'LAFEA4_PARENT_NORMAL_PROMOTION_RECORD_JSON_INVALID');
const suppliedRecord = validateLafea4ParentNormalPromotionRecordForHead(supplied, expectedHead);

// A semantic-hash-valid JSON record is not sufficient promotion evidence.
// Reconstruct the record from the exact TECH-8 evidence bundle using TECH-12D's
// canonical generator and require identity with the supplied review artifact.
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-tech12f-promotion-'));
try {
  const reconstructedPath = path.join(tempRoot, 'reconstructed-tech12d.json');
  const tech12d = path.join(scriptDir, 'lafea-tech12d-parent-normal-activation-record.mjs');
  const reconstruction = spawnSync(process.execPath, [
    tech12d,
    bundle,
    '--expected-head', expectedHead,
    '--output', reconstructedPath,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (reconstruction.error || reconstruction.status !== 0) {
    const detail = `${reconstruction.stdout ?? ''}\n${reconstruction.stderr ?? ''}`.trim();
    fail(`LAFEA4_PARENT_NORMAL_PROMOTION_TECH12D_RECONSTRUCTION_REJECTED:${detail}`);
  }
  const reconstructed = validateLafea4ParentNormalPromotionRecordForHead(
    readJson(reconstructedPath, 'LAFEA4_PARENT_NORMAL_PROMOTION_RECONSTRUCTED_JSON_INVALID'),
    expectedHead,
  );
  if (reconstructed.semanticHash !== suppliedRecord.semanticHash
    || JSON.stringify(reconstructed) !== JSON.stringify(suppliedRecord)) {
    fail('LAFEA4_PARENT_NORMAL_PROMOTION_RECORD_NOT_EXACT_TECH8_RECONSTRUCTION');
  }

  const source = renderLafea4ParentNormalProductionActivationSource(reconstructed);
  const output = cli.output ? path.resolve(cli.output) : null;
  if (output && cli['write-trust-root']) {
    fail('LAFEA4_PARENT_NORMAL_PROMOTION_OUTPUT_AND_TRUST_ROOT_WRITE_MUTUALLY_EXCLUSIVE');
  }
  if (output) {
    if (path.resolve(output) === path.resolve(trustRootPath)) {
      fail('LAFEA4_PARENT_NORMAL_PROMOTION_TRUST_ROOT_REQUIRES_EXPLICIT_WRITE_FLAG');
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, source);
  }

  let promotionDiffVerified = false;
  if (cli['write-trust-root']) {
    fs.writeFileSync(trustRootPath, source);
    requireTrustRootOnlyTrackedDiff(repoRoot);
    promotionDiffVerified = true;
    const promotedModule = await import(
      `${pathToFileURL(trustRootPath).href}?tech12f=${Date.now()}`
    );
    const promotedRecord = validateLafea4ParentNormalActivationRecord(
      promotedModule.LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
    );
    if (promotedRecord.semanticHash !== reconstructed.semanticHash
      || promotedModule.LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY
        !== LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY) {
      fail('LAFEA4_PARENT_NORMAL_PROMOTION_WRITTEN_TRUST_ROOT_REPLAY_MISMATCH');
    }
  }

  console.log(JSON.stringify({
    check: 'lafea-tech12f-parent-normal-promotion-source',
    status: 'PASS',
    expectedHead,
    activationRecordHash: reconstructed.semanticHash,
    evidenceDigest: reconstructed.evidenceDigest,
    sourcePath: LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH,
    sourceBytes: Buffer.byteLength(source, 'utf8'),
    output: output ?? null,
    trustRootWritten: Boolean(cli['write-trust-root']),
    promotionDiffVerified,
    productionActivationRequiresReviewAndCommit: Boolean(cli['write-trust-root']),
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function requireExactCleanCheckout(repo, expected) {
  const head = git(repo, ['rev-parse', 'HEAD']);
  const status = git(repo, ['status', '--porcelain=v1', '--untracked-files=no']);
  if (head.trim() !== expected || status.trim() !== '') {
    fail('LAFEA4_PARENT_NORMAL_PROMOTION_REQUIRES_EXACT_CLEAN_QUALIFIED_HEAD');
  }
}
function requireTrustRootOnlyTrackedDiff(repo) {
  const status = git(repo, ['status', '--porcelain=v1', '--untracked-files=no'])
    .split(/\r?\n/u).map((row) => row.trimEnd()).filter(Boolean);
  const changed = git(repo, ['diff', '--name-only'])
    .split(/\r?\n/u).map((row) => row.trim()).filter(Boolean);
  if (status.length !== 1
    || changed.length !== 1
    || changed[0] !== LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH
    || !status[0].endsWith(LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH)) {
    fail('LAFEA4_PARENT_NORMAL_PROMOTION_DIFF_NOT_TRUST_ROOT_ONLY');
  }
  const diffCheck = spawnSync('git', ['diff', '--check'], { cwd: repo, encoding: 'utf8' });
  if (diffCheck.status !== 0) {
    fail(`LAFEA4_PARENT_NORMAL_PROMOTION_DIFF_CHECK_FAILED:${diffCheck.stderr ?? ''}`);
  }
}
function git(repo, args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    fail(`LAFEA4_PARENT_NORMAL_PROMOTION_GIT_COMMAND_FAILED:${args.join(' ')}`);
  }
  return result.stdout ?? '';
}
function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${code}:${error.message}`); }
}
function parseArgs(argv) {
  const out = { _: [] };
  const booleanFlags = new Set(['write-trust-root']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const key = token.slice(2);
    if (booleanFlags.has(key)) { out[key] = true; continue; }
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
