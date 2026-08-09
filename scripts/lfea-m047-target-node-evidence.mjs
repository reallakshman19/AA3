#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

export const M047_TRACKED_RESTRAINTS = Object.freeze([
  Object.freeze({ caseId: 'L19', nodeId: '20090', quantity: 'FORCE', dof: 'UY', globalComponent: 'FY' }),
  Object.freeze({ caseId: 'L20', nodeId: '20350', quantity: 'FORCE', dof: 'UY', globalComponent: 'FY' }),
  Object.freeze({ caseId: 'L20', nodeId: '20390', quantity: 'FORCE', dof: 'UZ', globalComponent: 'FZ' }),
  Object.freeze({ caseId: 'L20', nodeId: '20550', quantity: 'FORCE', dof: 'UZ', globalComponent: 'FZ' }),
  Object.freeze({ caseId: 'L20', nodeId: '22140', quantity: 'FORCE', dof: 'UX', globalComponent: 'FX' }),
  Object.freeze({ caseId: 'L20', nodeId: '22490', quantity: 'FORCE', dof: 'UX', globalComponent: 'FX' }),
]);

export function buildM047TargetNodeEvidence({ benchmark, actual }) {
  requireBenchmark(benchmark);
  requireActual(actual);
  if (benchmark.source?.sha256 !== actual.sourceAccdbSha256) {
    throw new TypeError('Benchmark and actual result are bound to different ACCDB sources.');
  }
  const targets = M047_TRACKED_RESTRAINTS.map((target) => targetEvidence(target, benchmark, actual));
  const base = {
    schema: 'lfea-m047-target-node-evidence/v1',
    issueId: 'M047',
    benchmarkId: benchmark.benchmarkId,
    profileId: benchmark.profileId,
    sourceAccdbSha256: benchmark.source.sha256,
    targets,
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function targetEvidence(target, benchmark, actual) {
  const qualifiedCase = benchmark.qualification?.cases?.find((row) => String(row.caseId) === target.caseId);
  if (!qualifiedCase) throw new TypeError(`Benchmark qualification is missing ${target.caseId}.`);
  const comparison = qualifiedCase.comparison?.rows?.find((row) =>
    row.entityKind === 'NODE' && String(row.entityId) === target.nodeId && row.quantity === target.quantity && row.component === target.dof);
  if (!comparison) throw new TypeError(`Benchmark qualification is missing ${target.caseId} node ${target.nodeId} ${target.quantity}:${target.dof}.`);
  const actualCase = actual.cases?.[target.caseId];
  if (!actualCase || !Array.isArray(actualCase.rows)) throw new TypeError(`Actual result is missing case ${target.caseId}.`);
  const mechanics = actual.mechanics?.cases?.[target.caseId];
  if (!mechanics || !Array.isArray(mechanics.elementLedger)) throw new TypeError(`Actual mechanics evidence is missing ${target.caseId} element ledger.`);
  const rows = actualCase.rows;
  const rowIndex = new Map(rows.map((row) => [rowIdentity(row), row]));
  const reactionRow = requireRow(rowIndex, ['NODE', target.nodeId, target.quantity, target.dof], `${target.caseId} target reaction`);
  const incidentRow = requireRow(rowIndex, ['NODE', target.nodeId, 'INCIDENT_GLOBAL_FORCE', target.dof], `${target.caseId} target incident force`);
  const incidentElements = mechanics.elementLedger.flatMap((entry) => {
    const end = String(entry.nodeI) === target.nodeId ? 'FROM' : String(entry.nodeJ) === target.nodeId ? 'TO' : null;
    if (end === null) return [];
    const force = Object.fromEntries(['FX', 'FY', 'FZ'].map((component) => [component, requireRow(rowIndex, ['ELEMENT', entry.elementId, `GLOBAL_END_FORCE_${end}`, component], `${target.caseId} ${entry.elementId} ${end} ${component}`).value]));
    const moment = Object.fromEntries(['MX', 'MY', 'MZ'].map((component) => [component, requireRow(rowIndex, ['ELEMENT', entry.elementId, `GLOBAL_END_MOMENT_${end}`, component], `${target.caseId} ${entry.elementId} ${end} ${component}`).value]));
    return [{ elementId: entry.elementId, sourceElementId: entry.sourceElementId, kind: entry.kind, end, oppositeNodeId: String(end === 'FROM' ? entry.nodeJ : entry.nodeI), force, moment, pressureAxialStrain: entry.pressureAxialStrain, bourdonRotationRadians: entry.bourdonRotationRadians, bourdonFreeEndTranslationM: entry.bourdonFreeEndTranslationM }];
  });
  if (incidentElements.length === 0) throw new TypeError(`${target.caseId} node ${target.nodeId} has no incident analysis elements.`);
  const incidentComponentSum = incidentElements.reduce((sum, entry) => sum + Number(entry.force[target.globalComponent]), 0);
  const reportedIncident = Number(incidentRow.value);
  const supportReaction = Number(reactionRow.value);
  const comparisonActual = Number(comparison.actualValue);
  return Object.freeze({
    ...target,
    comparison: Object.freeze({ status: comparison.status, referenceValue: comparison.referenceValue, actualValue: comparison.actualValue, absoluteError: comparison.absoluteError, relativeError: comparison.relativeError, percentError: comparison.relativeError === null ? null : 100 * comparison.relativeError, acceptanceLimit: comparison.acceptanceLimit, tolerance: comparison.tolerance, unit: comparison.unit }),
    balance: Object.freeze({ incidentComponentSum, reportedIncident, supportReaction, comparisonActual, actionSumResidual: incidentComponentSum - reportedIncident, equilibriumResidual: reportedIncident - supportReaction, comparisonResidual: supportReaction - comparisonActual }),
    incidentElements: Object.freeze(incidentElements),
  });
}
function rowIdentity(row) { return [row.entityKind, row.entityId, row.quantity, row.component].join(':'); }
function requireRow(index, identity, label) { const key = identity.join(':'); const row = index.get(key); if (!row) throw new TypeError(`${label} is missing actual row ${key}.`); return row; }
function requireBenchmark(value) { if (!value || value.schema !== 'lfea-caesar-accdb-benchmark-report/v1') throw new TypeError('A qualified CAESAR ACCDB benchmark report is required.'); if (!value.qualification) throw new TypeError('Benchmark report must contain qualification evidence.'); }
function requireActual(value) { if (!value || value.schema !== 'lfea-accdb-benchmark-actual/v1') throw new TypeError('A CAESAR ACCDB actual-result package is required.'); }
function readJson(path, label) { try { return JSON.parse(readFileSync(resolve(path), 'utf8')); } catch (error) { throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error }); } }
function parseArguments(argv) { const accepted = new Map(); for (let index = 0; index < argv.length; index += 2) { const key = argv[index]; const value = argv[index + 1]; if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`); if (accepted.has(key)) throw new TypeError(`Duplicate argument ${key}.`); accepted.set(key, value); } const benchmarkPath = accepted.get('--benchmark'); const actualPath = accepted.get('--actual'); const outPath = accepted.get('--out'); if (!benchmarkPath || !actualPath || !outPath || accepted.size !== 3) throw new TypeError('Usage: --benchmark <benchmark.json> --actual <actual.json> --out <targets.json>.'); return { benchmarkPath, actualPath, outPath }; }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { const args = parseArguments(process.argv.slice(2)); const evidence = buildM047TargetNodeEvidence({ benchmark: readJson(args.benchmarkPath, 'benchmark report'), actual: readJson(args.actualPath, 'actual result') }); writeFileSync(resolve(args.outPath), canonicalPrettyStringify(evidence), 'utf8'); process.stdout.write(`${resolve(args.outPath)}\n`); } catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; } }
