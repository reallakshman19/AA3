#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cli = parseArgs(process.argv.slice(2));
const bundleArg = cli._[0];
if (!bundleArg) {
  console.error('Usage: node scripts/lafea-independent-qualification-verify.mjs <bundle-dir> [--expected-digest <sha256>] [--require-pass]');
  process.exit(64);
}
const bundle = path.resolve(bundleArg);
const hashesPath = path.join(bundle, 'hashes.sha256');
const manifestPath = path.join(bundle, 'manifest.json');
const commandsPath = path.join(bundle, 'commands.json');
const planPath = path.join(bundle, 'plan.json');
for (const required of [hashesPath, manifestPath, commandsPath, planPath]) {
  if (!fs.existsSync(required)) fail(`LAFEA_EVIDENCE_REQUIRED_FILE_MISSING:${path.basename(required)}`);
}

const hashesText = fs.readFileSync(hashesPath, 'utf8');
const digest = sha256(Buffer.from(hashesText, 'utf8'));
if (cli['expected-digest']) {
  const expected = cli['expected-digest'];
  if (!/^[0-9a-f]{64}$/u.test(expected) || digest !== expected) {
    fail(`LAFEA_EVIDENCE_DIGEST_MISMATCH:${digest}`);
  }
}
const recordedDigestPath = path.join(bundle, 'evidence-digest.txt');
if (fs.existsSync(recordedDigestPath)) {
  const recorded = fs.readFileSync(recordedDigestPath, 'utf8').trim();
  if (recorded !== digest) fail('LAFEA_EVIDENCE_RECORDED_DIGEST_MISMATCH');
}

const hashRows = hashesText.split(/\r?\n/u).filter(Boolean).map(parseHashLine);
const seen = new Set();
for (const row of hashRows) {
  if (seen.has(row.relative)) fail(`LAFEA_EVIDENCE_DUPLICATE_HASH_PATH:${row.relative}`);
  seen.add(row.relative);
  const resolved = path.resolve(bundle, row.relative);
  if (resolved !== bundle && !resolved.startsWith(`${bundle}${path.sep}`)) {
    fail(`LAFEA_EVIDENCE_PATH_TRAVERSAL:${row.relative}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    fail(`LAFEA_EVIDENCE_HASHED_FILE_MISSING:${row.relative}`);
  }
  const actual = sha256(fs.readFileSync(resolved));
  if (actual !== row.hash) fail(`LAFEA_EVIDENCE_FILE_HASH_MISMATCH:${row.relative}`);
}

for (const requiredRelative of ['manifest.json', 'environment.json', 'commands.json', 'plan.json', 'summary.md']) {
  if (!seen.has(requiredRelative)) fail(`LAFEA_EVIDENCE_CORE_FILE_NOT_HASHED:${requiredRelative}`);
}

const manifest = readJson(manifestPath);
const commands = readJson(commandsPath);
const plan = readJson(planPath);
if (manifest.schema !== 'lafea-independent-qualification-manifest/v1') {
  fail('LAFEA_EVIDENCE_MANIFEST_SCHEMA_INVALID');
}
if (commands.schema !== 'lafea-independent-qualification-commands/v1') {
  fail('LAFEA_EVIDENCE_COMMANDS_SCHEMA_INVALID');
}
if (plan.schema !== 'lafea-independent-qualification-plan/v1') {
  fail('LAFEA_EVIDENCE_PLAN_SCHEMA_INVALID');
}
if (manifest.qualificationId !== commands.qualificationId || manifest.qualificationId !== plan.qualificationId) {
  fail('LAFEA_EVIDENCE_QUALIFICATION_ID_MISMATCH');
}
if (manifest.expectedHead !== manifest.currentHead || commands.expectedHead !== manifest.expectedHead) {
  fail('LAFEA_EVIDENCE_HEAD_BINDING_INVALID');
}
if (manifest.planSha256 !== sha256(fs.readFileSync(planPath))) {
  fail('LAFEA_EVIDENCE_PLAN_HASH_INVALID');
}

const derived = deriveDisposition(
  manifest.preflightAccepted === true,
  manifest.postflightAccepted === true,
  commands.records ?? [],
);
if (derived !== manifest.disposition) fail(`LAFEA_EVIDENCE_DISPOSITION_MISMATCH:${derived}:${manifest.disposition}`);
if (manifest.qualificationComplete !== (manifest.disposition === 'PASS')) {
  fail('LAFEA_EVIDENCE_COMPLETION_FLAG_INVALID');
}
if (cli['require-pass'] === true && manifest.disposition !== 'PASS') {
  fail(`LAFEA_EVIDENCE_QUALIFICATION_NOT_PASS:${manifest.disposition}`);
}

console.log(JSON.stringify({
  check: 'lafea-independent-qualification-evidence',
  integrity: 'PASS',
  qualificationDisposition: manifest.disposition,
  qualificationId: manifest.qualificationId,
  expectedHead: manifest.expectedHead,
  evidenceDigest: digest,
  hashedFileCount: hashRows.length,
}, null, 2));

function parseHashLine(line) {
  const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
  if (!match) fail(`LAFEA_EVIDENCE_HASH_LINE_INVALID:${line}`);
  return { hash: match[1], relative: match[2] };
}

function deriveDisposition(preflightAccepted, postflightAccepted, records) {
  if (!preflightAccepted || !postflightAccepted) return 'FAIL';
  if (records.some((row) => row.required && row.classification === 'ENGINEERING' && row.disposition === 'FAIL')) {
    return 'FAIL';
  }
  if (records.some((row) => row.required && row.disposition === 'NOT_RUN')) return 'NOT_RUN';
  return 'PASS';
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`LAFEA_EVIDENCE_JSON_INVALID:${path.basename(file)}:${error.message}`); }
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const key = token.slice(2);
    if (key === 'require-pass') { out[key] = true; continue; }
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
