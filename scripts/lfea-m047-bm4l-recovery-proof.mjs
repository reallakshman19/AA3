#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);
const EXPECTED_ACCDB_SHA256 = 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c';
const ABSOLUTE_NUMERICAL_FLOOR = 1e-9;
const RELATIVE_NUMERICAL_LIMIT = 1e-11;

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const actual = args.get('--actual');
  if (!actual) throw new TypeError('Usage: --actual <bm4l-actual.json> [--out <proof.json>].');
  const unknown = [...args.keys()].filter((key) => !['--actual', '--out'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return Object.freeze({ actualPath: resolve(actual), outPath: args.has('--out') ? resolve(args.get('--out')) : null });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function requireActual(actual) {
  if (actual?.schema !== 'lfea-accdb-benchmark-actual/v1') {
    throw new TypeError(`Unexpected actual schema ${String(actual?.schema)}.`);
  }
  if (actual.sourceAccdbSha256 !== EXPECTED_ACCDB_SHA256) {
    throw new TypeError(`Recovery proof is pinned to BM4_L ACCDB ${EXPECTED_ACCDB_SHA256}.`);
  }
  for (const caseId of CASES) {
    if (!actual.cases?.[caseId]) throw new TypeError(`Actual result is missing ${caseId}.`);
    if (!actual.mechanics?.cases?.[caseId]) throw new TypeError(`Mechanics evidence is missing ${caseId}.`);
  }
}

function requireVector12(value, field) {
  if (!Array.isArray(value) || value.length !== 12 || value.some((entry) => !Number.isFinite(Number(entry)))) {
    throw new TypeError(`${field} must be a finite 12-component vector.`);
  }
  return value.map(Number);
}

function vectorResidual(left, right) {
  if (left.length !== right.length) throw new TypeError('Vector lengths differ.');
  const differences = left.map((value, index) => Number(value) - Number(right[index]));
  const maximumAbsolute = differences.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  const scale = Math.max(1, ...left.map((value) => Math.abs(Number(value))), ...right.map((value) => Math.abs(Number(value))));
  const limit = Math.max(ABSOLUTE_NUMERICAL_FLOOR, RELATIVE_NUMERICAL_LIMIT * scale);
  return Object.freeze({ maximumAbsolute, scale, limit, status: maximumAbsolute <= limit ? 'PASS' : 'FAIL' });
}

function qIdentity(entry, caseId) {
  const elastic = requireVector12(entry.globalElasticAction, `${caseId}:${entry.elementId}.globalElasticAction`);
  const fixed = requireVector12(entry.equivalentLoadGlobal, `${caseId}:${entry.elementId}.equivalentLoadGlobal`);
  const initial = requireVector12(entry.initialStrainLoadGlobal, `${caseId}:${entry.elementId}.initialStrainLoadGlobal`);
  const q = requireVector12(entry.qGlobal, `${caseId}:${entry.elementId}.qGlobal`);
  const recomposed = elastic.map((value, index) => value - fixed[index] - initial[index]);
  return vectorResidual(q, recomposed);
}

function sourceEntityId(rows, sourceElementId) {
  const prefix = `INPUT_ELEMENT:${sourceElementId}|`;
  const ids = [...new Set(rows
    .filter((row) => row.entityKind === 'ELEMENT' && String(row.entityId).startsWith(prefix))
    .map((row) => String(row.entityId)))];
  if (ids.length !== 1) throw new TypeError(`Source element ${sourceElementId} resolves ${ids.length} result entity IDs.`);
  return ids[0];
}

function sourceEndVector(rows, entityId, end) {
  const index = new Map(rows.map((row) => [[row.entityKind, row.entityId, row.quantity, row.component].join(':'), row]));
  const values = [];
  for (const component of FORCE_COMPONENTS) {
    const key = ['ELEMENT', entityId, `GLOBAL_END_FORCE_${end}`, component].join(':');
    const row = index.get(key);
    if (!row) throw new TypeError(`Missing source result row ${key}.`);
    values.push(Number(row.value));
  }
  for (const component of MOMENT_COMPONENTS) {
    const key = ['ELEMENT', entityId, `GLOBAL_END_MOMENT_${end}`, component].join(':');
    const row = index.get(key);
    if (!row) throw new TypeError(`Missing source result row ${key}.`);
    values.push(Number(row.value));
  }
  return values;
}

function proveSourceMapping(caseId, actualCase, recoveryLedger) {
  const grouped = new Map();
  for (const entry of recoveryLedger) {
    const sourceElementId = String(entry.sourceElementId);
    if (!grouped.has(sourceElementId)) grouped.set(sourceElementId, []);
    grouped.get(sourceElementId).push(entry);
  }
  const rows = [];
  for (const [sourceElementId, descendants] of grouped) {
    let chainStatus = 'PASS';
    for (let index = 1; index < descendants.length; index += 1) {
      if (String(descendants[index - 1].nodeJ) !== String(descendants[index].nodeI)) chainStatus = 'FAIL';
    }
    const entityId = sourceEntityId(actualCase.rows, sourceElementId);
    const fromReported = sourceEndVector(actualCase.rows, entityId, 'FROM');
    const toReported = sourceEndVector(actualCase.rows, entityId, 'TO');
    const fromRaw = requireVector12(descendants[0].qGlobal, `${caseId}:${descendants[0].elementId}.qGlobal`).slice(0, 6);
    const toRaw = requireVector12(descendants.at(-1).qGlobal, `${caseId}:${descendants.at(-1).elementId}.qGlobal`).slice(6, 12);
    const fromResidual = vectorResidual(fromReported, fromRaw);
    const toResidual = vectorResidual(toReported, toRaw);
    rows.push(Object.freeze({
      sourceElementId,
      entityId,
      analysisElementIds: Object.freeze(descendants.map((entry) => entry.elementId)),
      chainStatus,
      fromResidual,
      toResidual,
      status: chainStatus === 'PASS' && fromResidual.status === 'PASS' && toResidual.status === 'PASS' ? 'PASS' : 'FAIL',
    }));
  }
  return Object.freeze(rows.sort((left, right) => compareText(left.sourceElementId, right.sourceElementId)));
}

function proveCase(actual, caseId) {
  const actualCase = actual.cases[caseId];
  const mechanics = actual.mechanics.cases[caseId];
  const caseHash = String(actualCase.stiffnessStateHash ?? '');
  const mechanicsHash = String(mechanics.stiffnessStateHash ?? '');
  if (!/^[a-f0-9]{64}$/u.test(caseHash)) throw new TypeError(`${caseId} lacks a valid cases[].stiffnessStateHash.`);
  if (caseHash !== mechanicsHash) throw new TypeError(`${caseId} stiffness hashes disagree between result and mechanics evidence.`);
  const ledger = mechanics.recoveryLedger;
  if (!Array.isArray(ledger) || ledger.length === 0) throw new TypeError(`${caseId} has no recoveryLedger.`);

  const recoveryRows = ledger.map((entry) => {
    const q = requireVector12(entry.qGlobal, `${caseId}:${entry.elementId}.qGlobal`);
    const transformed = requireVector12(entry.transformedLocalQGlobal, `${caseId}:${entry.elementId}.transformedLocalQGlobal`);
    const identity = qIdentity(entry, caseId);
    const transformation = vectorResidual(q, transformed);
    return Object.freeze({
      elementId: entry.elementId,
      sourceElementId: entry.sourceElementId,
      qIdentity: identity,
      localToGlobal: transformation,
      status: identity.status === 'PASS' && transformation.status === 'PASS' ? 'PASS' : 'FAIL',
    });
  });
  const sourceMapping = proveSourceMapping(caseId, actualCase, ledger);
  const equilibrium = mechanics.recoveredEquilibrium ?? null;
  return Object.freeze({
    caseId,
    stiffnessStateHash: caseHash,
    recoveryElementCount: recoveryRows.length,
    maximumQIdentityResidual: Math.max(...recoveryRows.map((row) => row.qIdentity.maximumAbsolute)),
    maximumLocalToGlobalResidual: Math.max(...recoveryRows.map((row) => row.localToGlobal.maximumAbsolute)),
    recoveryFailures: Object.freeze(recoveryRows.filter((row) => row.status === 'FAIL')),
    sourceMappingFailures: Object.freeze(sourceMapping.filter((row) => row.status === 'FAIL')),
    equilibrium,
    status: recoveryRows.every((row) => row.status === 'PASS')
      && sourceMapping.every((row) => row.status === 'PASS')
      && equilibrium?.status === 'PASS' ? 'PASS' : 'FAIL',
  });
}

function buildProof(actual) {
  requireActual(actual);
  const cases = CASES.map((caseId) => proveCase(actual, caseId));
  const stiffnessHashes = [...new Set(cases.map((entry) => entry.stiffnessStateHash))];
  const commonOperator = Object.freeze({
    status: stiffnessHashes.length === 1 ? 'PASS' : 'FAIL',
    distinctStiffnessStateHashes: Object.freeze(stiffnessHashes),
    byCase: Object.freeze(Object.fromEntries(cases.map((entry) => [entry.caseId, entry.stiffnessStateHash]))),
  });
  return Object.freeze({
    schema: 'lfea-bm4l-recovery-proof/v1',
    sourceAccdbSha256: actual.sourceAccdbSha256,
    commonOperator,
    cases: Object.freeze(cases),
    status: commonOperator.status === 'PASS' && cases.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL',
  });
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function writeJson(value, path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const proof = buildProof(readJson(args.actualPath));
  if (args.outPath) writeJson(proof, args.outPath);
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  if (proof.status !== 'PASS') process.exitCode = 1;
}

main();
