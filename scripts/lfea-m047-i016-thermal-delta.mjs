#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';

function physicalRows(report, caseId) {
  const selected = report.qualification?.cases?.find((entry) => entry.caseId === caseId);
  if (!selected?.comparison?.rows) throw new TypeError(`Missing ${caseId} comparison rows.`);
  return selected.comparison.rows.filter((row) => Number.isFinite(row.actualValue) && Number.isFinite(row.referenceValue));
}

function identity(row) {
  return `${row.entityKind}:${row.entityId}:${row.quantity}:${row.component}`;
}

function mapRows(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = identity(row);
    if (result.has(key)) throw new TypeError(`Duplicate physical row ${key}.`);
    result.set(key, row);
  }
  return result;
}

function familyOf(row) {
  if (row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity)) return 'restraint';
  if (row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) return 'displacementRotation';
  if (row.entityKind === 'ELEMENT' && row.quantity.startsWith('GLOBAL_END_')) return 'sourceEndAction';
  return null;
}

function sourceElementNumber(entityId) {
  const match = /^INPUT_ELEMENT:(\d+)\|/u.exec(String(entityId));
  return match ? Number(match[1]) : null;
}

function thermalResidualRows(report) {
  if (report.source?.sha256 !== LOCKED_ACCDB_SHA256) throw new TypeError('I016 thermal delta requires the locked BM4_NL ACCDB.');
  const l19 = mapRows(physicalRows(report, 'L19'));
  const l20 = mapRows(physicalRows(report, 'L20'));
  const shared = [...l19.keys()].filter((key) => l20.has(key)).sort();
  const rows = [];
  for (const key of shared) {
    const cold = l19.get(key);
    const hot = l20.get(key);
    const family = familyOf(cold);
    if (family === null || familyOf(hot) !== family) continue;
    if (cold.unit !== hot.unit) throw new TypeError(`Unit drift for ${key}.`);
    const actualIncrement = hot.actualValue - cold.actualValue;
    const referenceIncrement = hot.referenceValue - cold.referenceValue;
    const rT = actualIncrement - referenceIncrement;
    const floor = Math.max(Number(cold.tolerance?.scaleFloor ?? 0), Number(hot.tolerance?.scaleFloor ?? 0));
    const scale = Math.max(Math.abs(referenceIncrement), floor > 0 ? floor : 1);
    rows.push(Object.freeze({
      identity: key,
      family,
      entityKind: cold.entityKind,
      entityId: cold.entityId,
      sourceElementNumber: sourceElementNumber(cold.entityId),
      quantity: cold.quantity,
      component: cold.component,
      unit: cold.unit,
      actualIncrement,
      referenceIncrement,
      residual: rT,
      normalizedResidual: Math.abs(rT) / scale,
      scale,
      scaleFloor: floor,
    }));
  }
  return rows;
}

function rms(values) {
  return values.length === 0 ? 0 : Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

function summarize(rows) {
  const byFamily = {};
  for (const family of ['restraint', 'displacementRotation', 'sourceEndAction']) {
    const selected = rows.filter((row) => row.family === family);
    const top = [...selected]
      .sort((a, b) => Math.abs(b.normalizedResidual) - Math.abs(a.normalizedResidual) || a.identity.localeCompare(b.identity))
      .slice(0, 30);
    byFamily[family] = Object.freeze({
      rowCount: selected.length,
      rmsAbsoluteResidual: rms(selected.map((row) => row.residual)),
      rmsNormalizedResidual: rms(selected.map((row) => row.normalizedResidual)),
      maximumAbsoluteResidual: selected.reduce((maximum, row) => Math.max(maximum, Math.abs(row.residual)), 0),
      maximumNormalizedResidual: selected.reduce((maximum, row) => Math.max(maximum, row.normalizedResidual), 0),
      topResiduals: Object.freeze(top),
    });
  }
  return Object.freeze(byFamily);
}

function compareRows(beforeRows, afterRows) {
  const before = new Map(beforeRows.map((row) => [row.identity, row]));
  const after = new Map(afterRows.map((row) => [row.identity, row]));
  const keys = [...before.keys()].sort();
  if (keys.length !== after.size || keys.some((key) => !after.has(key))) throw new TypeError('I016 thermal residual row identity changed.');
  const families = {};
  for (const family of ['restraint', 'displacementRotation', 'sourceEndAction']) {
    let improved = 0;
    let regressed = 0;
    let unchanged = 0;
    const changes = [];
    for (const key of keys) {
      const left = before.get(key);
      const right = after.get(key);
      if (left.family !== family) continue;
      if (left.referenceIncrement !== right.referenceIncrement || left.unit !== right.unit || left.scale !== right.scale) {
        throw new TypeError(`I016 reference custody changed for ${key}.`);
      }
      const beforeAbs = Math.abs(left.normalizedResidual);
      const afterAbs = Math.abs(right.normalizedResidual);
      const delta = afterAbs - beforeAbs;
      if (delta < -1e-15) improved += 1;
      else if (delta > 1e-15) regressed += 1;
      else unchanged += 1;
      changes.push(Object.freeze({
        identity: key,
        sourceElementNumber: left.sourceElementNumber,
        beforeResidual: left.residual,
        afterResidual: right.residual,
        beforeNormalizedResidual: left.normalizedResidual,
        afterNormalizedResidual: right.normalizedResidual,
        normalizedAbsoluteResidualDelta: delta,
        unit: left.unit,
      }));
    }
    changes.sort((a, b) => Math.abs(b.normalizedAbsoluteResidualDelta) - Math.abs(a.normalizedAbsoluteResidualDelta) || a.identity.localeCompare(b.identity));
    families[family] = Object.freeze({
      improvedRowCount: improved,
      regressedRowCount: regressed,
      unchangedRowCount: unchanged,
      topChanges: Object.freeze(changes.slice(0, 30)),
    });
  }
  return Object.freeze(families);
}

export function buildI016ThermalDelta(beforeReport, afterReport, manifest = null) {
  const beforeRows = thermalResidualRows(beforeReport);
  const afterRows = thermalResidualRows(afterReport);
  const base = {
    schema: 'lfea-m047-i016-thermal-delta/v1',
    issueId: 'M047',
    iterationId: 'M047-I016',
    observable: 'r_T=(L20-L19)_LFEA-(L20-L19)_CAESAR',
    sourceAccdbSha256: LOCKED_ACCDB_SHA256,
    manifest,
    before: summarize(beforeRows),
    after: summarize(afterRows),
    comparison: compareRows(beforeRows, afterRows),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
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
  for (const key of ['--before', '--after', '--out']) if (!args.get(key)) throw new TypeError(`Missing ${key}.`);
  const unknown = [...args.keys()].filter((key) => !['--before', '--after', '--out', '--manifest'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return {
    before: resolve(args.get('--before')),
    after: resolve(args.get('--after')),
    out: resolve(args.get('--out')),
    manifest: args.get('--manifest') ? resolve(args.get('--manifest')) : null,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const before = JSON.parse(readFileSync(input.before, 'utf8'));
  const after = JSON.parse(readFileSync(input.after, 'utf8'));
  const manifest = input.manifest ? JSON.parse(readFileSync(input.manifest, 'utf8')) : null;
  const result = buildI016ThermalDelta(before, after, manifest);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  for (const family of ['restraint', 'displacementRotation', 'sourceEndAction']) {
    process.stdout.write(`I016 r_T ${family}: RMSnorm ${result.before[family].rmsNormalizedResidual} -> ${result.after[family].rmsNormalizedResidual}; improved=${result.comparison[family].improvedRowCount}; regressed=${result.comparison[family].regressedRowCount}\n`);
  }
  process.stdout.write(`M047 I016 thermal-delta evidence: ${result.semanticHash}\n`);
}
