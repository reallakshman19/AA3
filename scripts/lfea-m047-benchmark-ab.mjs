#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const TRACKED = Object.freeze([
  ['L19_20090_FY', 'L19', 'NODE', '20090', 'FORCE', 'UY'],
  ['L20_20350_FY', 'L20', 'NODE', '20350', 'FORCE', 'UY'],
  ['L20_20390_FZ', 'L20', 'NODE', '20390', 'FORCE', 'UZ'],
  ['L20_20550_FZ', 'L20', 'NODE', '20550', 'FORCE', 'UZ'],
  ['L20_22140_FX', 'L20', 'NODE', '22140', 'FORCE', 'UX'],
  ['L20_22490_FX', 'L20', 'NODE', '22490', 'FORCE', 'UX'],
]);

export function compareM047Benchmarks(baseline, candidate, manifest = null) {
  requireBenchmark(baseline, 'baseline');
  requireBenchmark(candidate, 'candidate');
  if (baseline.source.sha256 !== LOCKED_ACCDB_SHA256 || candidate.source.sha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError(`M047 A/B requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  }
  if (baseline.benchmarkId !== candidate.benchmarkId) throw new TypeError('M047 A/B benchmark ID mismatch.');
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const before = qualificationCase(baseline, caseId);
    const after = qualificationCase(candidate, caseId);
    const referenceHashBefore = referenceCustodyHash(before.comparison.rows);
    const referenceHashAfter = referenceCustodyHash(after.comparison.rows);
    if (referenceHashBefore !== referenceHashAfter) {
      throw new TypeError(`M047 ${caseId} A/B reference custody changed.`);
    }
    const beforeMetrics = familyMetrics(before.comparison.rows);
    const afterMetrics = familyMetrics(after.comparison.rows);
    cases[caseId] = Object.freeze({
      referenceCustodyHash: referenceHashBefore,
      before: beforeMetrics,
      after: afterMetrics,
      delta: metricDelta(beforeMetrics, afterMetrics),
      actualRowChange: actualRowChange(before.comparison.rows, after.comparison.rows),
    });
  }

  const tracked = Object.fromEntries(TRACKED.map(([label, caseId, entityKind, entityId, quantity, component]) => {
    const beforeCase = qualificationCase(baseline, caseId);
    const afterCase = qualificationCase(candidate, caseId);
    const before = requireRow(beforeCase.comparison.rows, entityKind, entityId, quantity, component);
    const after = requireRow(afterCase.comparison.rows, entityKind, entityId, quantity, component);
    return [label, Object.freeze({
      caseId,
      entityKind,
      entityId,
      quantity,
      component,
      unit: before.unit,
      referenceValue: before.referenceValue,
      before: rowWitness(before),
      after: rowWitness(after),
      actualDelta: after.actualValue - before.actualValue,
      relativeErrorDelta: Number(after.relativeError ?? 0) - Number(before.relativeError ?? 0),
    })];
  }));

  const base = {
    schema: 'lfea-m047-benchmark-ab/v1',
    issueId: 'M047',
    benchmarkId: baseline.benchmarkId,
    sourceAccdbSha256: LOCKED_ACCDB_SHA256,
    baselineProfileId: baseline.profileId,
    candidateProfileId: candidate.profileId,
    manifest,
    cases: Object.freeze(cases),
    tracked: Object.freeze(tracked),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function requireBenchmark(value, label) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.qualification?.cases) || !value.source?.sha256) {
    throw new TypeError(`${label} benchmark report is incomplete.`);
  }
}

function qualificationCase(report, caseId) {
  const value = report.qualification.cases.find((entry) => entry.caseId === caseId);
  if (!value?.comparison || !Array.isArray(value.comparison.rows)) {
    throw new TypeError(`Benchmark report is missing ${caseId} comparison rows.`);
  }
  return value;
}

function physicalRows(rows) {
  return rows.filter((row) => Number.isFinite(row.actualValue) && Number.isFinite(row.referenceValue));
}

function identity(row) {
  return `${row.entityKind}:${row.entityId}:${row.quantity}:${row.component}`;
}

function mapRows(rows) {
  const result = new Map();
  for (const row of physicalRows(rows)) {
    const key = identity(row);
    if (result.has(key)) throw new TypeError(`Duplicate M047 A/B row ${key}.`);
    result.set(key, row);
  }
  return result;
}

function referenceCustodyHash(rows) {
  const projection = [...mapRows(rows)].sort(([a], [b]) => a.localeCompare(b)).map(([key, row]) => ({
    identity: key,
    referenceValue: row.referenceValue,
    unit: row.unit,
    tolerance: row.tolerance,
  }));
  return semanticHash(projection);
}

function familyMetrics(rows) {
  const physical = physicalRows(rows);
  const families = {
    restraint: physical.filter((row) => row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity)),
    displacementRotation: physical.filter((row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)),
    sourceEndAction: physical.filter((row) => row.entityKind === 'ELEMENT' && row.quantity.startsWith('GLOBAL_END_')),
  };
  return Object.freeze(Object.fromEntries(Object.entries(families).map(([name, entries]) => {
    const failures = entries.filter((row) => row.status === 'FAIL');
    const normalized = entries.map((row) => {
      const floor = Number(row.tolerance?.scaleFloor);
      const scale = Number.isFinite(floor) && floor > 0 ? Math.max(Math.abs(row.referenceValue), floor) : Math.max(Math.abs(row.referenceValue), 1);
      return Math.abs(row.actualValue - row.referenceValue) / scale;
    });
    return [name, Object.freeze({
      rowCount: entries.length,
      failingComponentCount: failures.length,
      failingEntityCount: new Set(failures.map((row) => `${row.entityKind}:${row.entityId}`)).size,
      maximumRelativeError: entries.reduce((maximum, row) => Math.max(maximum, Number(row.relativeError ?? 0)), 0),
      rmsNormalizedError: normalized.length === 0 ? 0 : Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0) / normalized.length),
    })];
  })));
}

function metricDelta(before, after) {
  return Object.freeze(Object.fromEntries(Object.keys(before).map((family) => [family, Object.freeze({
    failingComponentCount: after[family].failingComponentCount - before[family].failingComponentCount,
    failingEntityCount: after[family].failingEntityCount - before[family].failingEntityCount,
    maximumRelativeError: after[family].maximumRelativeError - before[family].maximumRelativeError,
    rmsNormalizedError: after[family].rmsNormalizedError - before[family].rmsNormalizedError,
  })])));
}

function actualRowChange(beforeRows, afterRows) {
  const before = mapRows(beforeRows);
  const after = mapRows(afterRows);
  const beforeKeys = [...before.keys()].sort();
  const afterKeys = [...after.keys()].sort();
  if (beforeKeys.length !== afterKeys.length || beforeKeys.some((key, index) => key !== afterKeys[index])) {
    throw new TypeError('M047 A/B physical row identity changed.');
  }
  const changes = [];
  for (const key of beforeKeys) {
    const left = before.get(key);
    const right = after.get(key);
    if (left.referenceValue !== right.referenceValue || left.unit !== right.unit) {
      throw new TypeError(`M047 A/B reference changed for ${key}.`);
    }
    const delta = right.actualValue - left.actualValue;
    if (delta !== 0) changes.push(Object.freeze({
      identity: key,
      before: left.actualValue,
      after: right.actualValue,
      delta,
      unit: left.unit,
    }));
  }
  changes.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || left.identity.localeCompare(right.identity));
  return Object.freeze({
    rowCount: beforeKeys.length,
    changedActualRowCount: changes.length,
    maximumAbsoluteActualDelta: changes.length === 0 ? 0 : Math.abs(changes[0].delta),
    topActualChanges: Object.freeze(changes.slice(0, 20)),
  });
}

function requireRow(rows, entityKind, entityId, quantity, component) {
  const matches = physicalRows(rows).filter((row) => row.entityKind === entityKind
    && String(row.entityId) === String(entityId)
    && row.quantity === quantity
    && row.component === component);
  if (matches.length !== 1) {
    throw new TypeError(`Expected exactly one tracked row ${entityKind}:${entityId}:${quantity}:${component}; found ${matches.length}.`);
  }
  return matches[0];
}

function rowWitness(row) {
  return Object.freeze({
    actualValue: row.actualValue,
    relativeError: row.relativeError,
    status: row.status,
    absoluteError: row.absoluteError,
    acceptanceLimit: row.acceptanceLimit,
  });
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const baseline = args.get('--baseline');
  const candidate = args.get('--candidate');
  const out = args.get('--out');
  if (!baseline || !candidate || !out) throw new TypeError('Usage: --baseline <json> --candidate <json> --out <json> [--manifest <json>].');
  const unknown = [...args.keys()].filter((key) => !['--baseline', '--candidate', '--out', '--manifest'].includes(key));
  if (unknown.length) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return { baseline, candidate, out, manifest: args.get('--manifest') ?? null };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const baseline = JSON.parse(readFileSync(resolve(input.baseline), 'utf8'));
  const candidate = JSON.parse(readFileSync(resolve(input.candidate), 'utf8'));
  const manifest = input.manifest === null ? null : JSON.parse(readFileSync(resolve(input.manifest), 'utf8'));
  const result = compareM047Benchmarks(baseline, candidate, manifest);
  const target = resolve(input.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, canonicalPrettyStringify(result), 'utf8');
  for (const caseId of ['L19', 'L20']) {
    const value = result.cases[caseId];
    process.stdout.write(`M047 A/B ${caseId}: restraints ${value.before.restraint.failingComponentCount}->${value.after.restraint.failingComponentCount}; displacement ${value.before.displacementRotation.failingComponentCount}->${value.after.displacementRotation.failingComponentCount}; source actions ${value.before.sourceEndAction.failingComponentCount}->${value.after.sourceEndAction.failingComponentCount}\n`);
  }
  process.stdout.write(`M047 A/B evidence: ${result.semanticHash}\n`);
}
