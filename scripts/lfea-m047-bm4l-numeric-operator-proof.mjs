#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid argument near ${String(key)}.`);
    }
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const actualPath = args.get('--actual');
  const outPath = args.get('--out');
  if (!actualPath || !outPath) {
    throw new TypeError('Usage: --actual <bm4l-actual.json> --out <proof.json>.');
  }
  const unknown = [...args.keys()].filter((key) => !['--actual', '--out'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return Object.freeze({ actualPath: resolve(actualPath), outPath: resolve(outPath) });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function requireMatrix144(value, label) {
  if (!Array.isArray(value) || value.length !== 144 || value.some((entry) => !Number.isFinite(Number(entry)))) {
    throw new TypeError(`${label} must be a finite flat 12x12 matrix.`);
  }
  return value.map(Number);
}

function caseElementLedger(actual, caseId) {
  const ledger = actual.mechanics?.cases?.[caseId]?.recoveryLedger;
  if (!Array.isArray(ledger) || ledger.length === 0) {
    throw new TypeError(`${caseId} has no recoveryLedger.`);
  }
  const rows = ledger.map((entry) => Object.freeze({
    elementId: String(entry.elementId),
    sourceElementId: String(entry.sourceElementId),
    nodeI: String(entry.nodeI),
    nodeJ: String(entry.nodeJ),
    globalStiffness: Object.freeze(requireMatrix144(entry.globalStiffness, `${caseId}:${entry.elementId}.globalStiffness`)),
  })).sort((left, right) => compareText(left.elementId, right.elementId));
  const ids = new Set(rows.map((row) => row.elementId));
  if (ids.size !== rows.length) throw new TypeError(`${caseId} recoveryLedger has duplicate element IDs.`);
  return Object.freeze(rows);
}

function sha256Json(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function proveCase(actual, caseId) {
  const structuralHash = String(actual.cases?.[caseId]?.stiffnessStateHash ?? '');
  if (!structuralHash) throw new TypeError(`${caseId} lacks stiffnessStateHash.`);
  const ledger = caseElementLedger(actual, caseId);
  const elementStiffnessLedgerSha256 = sha256Json(ledger);
  const combinedOperatorSha256 = sha256Json({ structuralHash, elementStiffnessLedgerSha256 });
  return Object.freeze({
    caseId,
    structuralStiffnessStateHash: structuralHash,
    elementCount: ledger.length,
    elementStiffnessLedgerSha256,
    combinedOperatorSha256,
  });
}

function buildProof(actual) {
  if (actual?.schema !== 'lfea-accdb-benchmark-actual/v1') {
    throw new TypeError(`Unexpected actual schema ${String(actual?.schema)}.`);
  }
  const cases = CASES.map((caseId) => proveCase(actual, caseId));
  const structuralHashes = [...new Set(cases.map((entry) => entry.structuralStiffnessStateHash))];
  const numericLedgerHashes = [...new Set(cases.map((entry) => entry.elementStiffnessLedgerSha256))];
  const combinedHashes = [...new Set(cases.map((entry) => entry.combinedOperatorSha256))];
  const status = structuralHashes.length === 1 && numericLedgerHashes.length === 1 && combinedHashes.length === 1
    ? 'PASS'
    : 'FAIL';
  return Object.freeze({
    schema: 'lfea-m047-bm4l-numeric-operator-proof/v1',
    scope: 'STRUCTURAL_STIFFNESS_STATE_PLUS_ALL_RECOVERY_LEDGER_ELEMENT_GLOBAL_STIFFNESS_MATRICES',
    cases: Object.freeze(cases),
    distinctStructuralStiffnessStateHashes: Object.freeze(structuralHashes),
    distinctElementStiffnessLedgerSha256: Object.freeze(numericLedgerHashes),
    distinctCombinedOperatorSha256: Object.freeze(combinedHashes),
    commonElementStiffnessLedgerSha256: numericLedgerHashes.length === 1 ? numericLedgerHashes[0] : null,
    commonCombinedOperatorSha256: combinedHashes.length === 1 ? combinedHashes[0] : null,
    status,
  });
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const input = parseArguments(process.argv.slice(2));
const proof = buildProof(readJson(input.actualPath));
writeJson(input.outPath, proof);
process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
if (proof.status !== 'PASS') process.exitCode = 1;
