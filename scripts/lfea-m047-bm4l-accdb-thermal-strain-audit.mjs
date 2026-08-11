#!/usr/bin/env node

/**
 * Infer BM4_L T1 total thermal strain directly from BM4_L.ACCDB.
 *
 * For an ordinary straight source span under the pure T1 case:
 *
 *   N = E A (epsilon_kinematic - epsilon_thermal)
 *
 * therefore:
 *
 *   epsilon_thermal = ((uJ-uI) dot t)/L - N/(EA)
 *
 * CAESAR nodal motions come from OUTPUT_DISPLACEMENTS and signed axial end
 * actions come from OUTPUT_LOCAL_ELEMENT_FORCES. Geometry/material/section
 * values come from the ACCDB input tables. No LFEA comparison/failure rows
 * are consumed.
 *
 * Source spans sharing an endpoint with a bend-bearing source element are
 * excluded because the source chord endpoint is not an independent straight
 * analysis station under CAESAR bend tangent geometry. The robust median is
 * calculated over all remaining directly observable straight spans; a
 * >=0.1 m precision subset is reported separately but is not used to derive
 * the retained median.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const SOURCE_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const TARGET_CASES = Object.freeze([
  Object.freeze({ caseId: 'L3', lcaseNumber: 3 }),
  Object.freeze({ caseId: 'L14', lcaseNumber: 14 }),
]);
const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const PRECISION_SUBSET_LENGTH_M = 0.1;
const EPS = 1e-15;

const args = parseArgs(process.argv.slice(2));
const raw = readJson(required(args, 'raw'));
const outPath = resolve(required(args, 'out'));
const summaryPath = resolve(required(args, 'summary-out'));

requireSource(raw);
const audit = buildAudit(raw);
writeJson(outPath, audit);
writeText(summaryPath, renderSummary(audit));
console.log(JSON.stringify(audit.summary, null, 2));

function buildAudit(rawExport) {
  const basicRows = requiredTable(rawExport, 'INPUT_BASIC_ELEMENT_DATA').rows;
  const coordinateRows = requiredTable(rawExport, 'INPUT_NODAL_COORDINATES').rows;
  const displacementRows = requiredTable(rawExport, 'OUTPUT_DISPLACEMENTS').rows;
  const localForceRows = requiredTable(rawExport, 'OUTPUT_LOCAL_ELEMENT_FORCES').rows;

  const coordinateByPair = new Map(coordinateRows.map((row) => [pairKey(row.FROM_NODE, row.TO_NODE), row]));
  const displacementByCaseNode = new Map(displacementRows.map((row) => [
    `${Number(row.LCASE_NUM)}|${nodeKey(row.NODE)}`,
    row,
  ]));
  const localForceByCasePair = new Map(localForceRows.map((row) => [
    `${Number(row.LCASE_NUM)}|${pairKey(row.FROM_NODE, row.TO_NODE)}`,
    row,
  ]));
  const bendEndpointNodes = new Set(
    basicRows
      .filter((row) => finite(row.BEND_PTR) > 0)
      .flatMap((row) => [nodeKey(row.FROM_NODE), nodeKey(row.TO_NODE)]),
  );

  const candidateRows = basicRows.filter((row) =>
    finite(row.BEND_PTR) <= 0
    && finite(row.RIGID_PTR) <= 0
    && finite(row.REDUCER_PTR) <= 0
    && !bendEndpointNodes.has(nodeKey(row.FROM_NODE))
    && !bendEndpointNodes.has(nodeKey(row.TO_NODE)));

  const cases = {};
  for (const caseDef of TARGET_CASES) {
    const rows = [];
    const skipped = [];
    for (const source of candidateRows) {
      const pair = pairKey(source.FROM_NODE, source.TO_NODE);
      const coordinates = coordinateByPair.get(pair);
      const fromDisplacement = displacementByCaseNode.get(`${caseDef.lcaseNumber}|${nodeKey(source.FROM_NODE)}`);
      const toDisplacement = displacementByCaseNode.get(`${caseDef.lcaseNumber}|${nodeKey(source.TO_NODE)}`);
      const localForce = localForceByCasePair.get(`${caseDef.lcaseNumber}|${pair}`);
      if (!coordinates || !fromDisplacement || !toDisplacement || !localForce) {
        skipped.push(Object.freeze({
          elementId: String(source.ELEMENTID),
          pair,
          reason: 'MISSING_DIRECT_ACCDB_REFERENCE_ROW',
        }));
        continue;
      }
      rows.push(inferSpan({ source, coordinates, fromDisplacement, toDisplacement, localForce, caseDef }));
    }

    const inferred = rows.map((row) => row.inferredThermalStrain);
    const medianValue = median(inferred);
    const deviations = inferred.map((value) => Math.abs(value - medianValue));
    const precisionRows = rows.filter((row) => row.lengthM >= PRECISION_SUBSET_LENGTH_M);
    const precisionValues = precisionRows.map((row) => row.inferredThermalStrain);
    cases[caseDef.caseId] = Object.freeze({
      lcaseNumber: caseDef.lcaseNumber,
      usableSpanCount: rows.length,
      skippedSpanCount: skipped.length,
      inferredMedianThermalStrain: medianValue,
      medianAbsoluteDeviation: median(deviations),
      relativeMedianAbsoluteDeviation: median(deviations) / medianValue,
      minimum: Math.min(...inferred),
      maximum: Math.max(...inferred),
      precisionSubset: Object.freeze({
        minimumLengthM: PRECISION_SUBSET_LENGTH_M,
        usableSpanCount: precisionRows.length,
        medianThermalStrain: median(precisionValues),
        minimum: Math.min(...precisionValues),
        maximum: Math.max(...precisionValues),
        maximumRelativeDeviationFromPrimaryMedian: Math.max(
          ...precisionValues.map((value) => Math.abs(value - medianValue) / medianValue),
        ),
      }),
      rows: Object.freeze(rows),
      skipped: Object.freeze(skipped),
    });
  }

  const l3 = cases.L3;
  const l14 = cases.L14;
  const caseMedianDelta = Math.abs(l3.inferredMedianThermalStrain - l14.inferredMedianThermalStrain);
  if (caseMedianDelta > 1e-15) {
    throw new Error(`L3/L14 ACCDB thermal-strain medians disagree by ${caseMedianDelta}.`);
  }
  const inferredThermalStrain = (l3.inferredMedianThermalStrain + l14.inferredMedianThermalStrain) / 2;
  const retainedThermalStrain = 0.0012;

  const summary = Object.freeze({
    sourceSha256: SOURCE_SHA256,
    method: 'AXIAL_CONSTITUTIVE_INVERSION_FROM_ACCDB_NODAL_MOTION_AND_LOCAL_END_FORCE',
    benchmarkFailureRowsConsumed: false,
    inferredT1TotalThermalStrain: inferredThermalStrain,
    retainedT1TotalThermalStrain: retainedThermalStrain,
    retainedRelativeDifference: (inferredThermalStrain - retainedThermalStrain) / retainedThermalStrain,
    l3L14MedianDifference: caseMedianDelta,
    cases: Object.freeze(Object.fromEntries(TARGET_CASES.map(({ caseId }) => [caseId, Object.freeze({
      usableSpanCount: cases[caseId].usableSpanCount,
      medianThermalStrain: cases[caseId].inferredMedianThermalStrain,
      medianAbsoluteDeviation: cases[caseId].medianAbsoluteDeviation,
      precisionSubsetSpanCount: cases[caseId].precisionSubset.usableSpanCount,
      precisionSubsetMaximumRelativeDeviation: cases[caseId].precisionSubset.maximumRelativeDeviationFromPrimaryMedian,
    })]))),
    interpretation: Object.freeze([
      'The inferred strain is derived from BM4_L.ACCDB only; no external CAESAR report or LFEA benchmark error is used.',
      'L3 and L14 independently produce the same robust median, consistent with their physical T1 identity.',
      'Bend-adjacent source chords are excluded from inversion because CAESAR bend tangent geometry means their source endpoints are not independent straight analysis stations.',
      'The >=0.1 m subset is a precision diagnostic only; the primary inferred value is the robust median over every directly observable non-bend-adjacent ordinary straight span.',
    ]),
  });

  return Object.freeze({
    schema: 'lfea-m047-bm4l-accdb-thermal-strain-audit/v1',
    source: Object.freeze({
      accdbSha256: SOURCE_SHA256,
      provider: rawExport.provider,
      inputTables: Object.freeze(['INPUT_BASIC_ELEMENT_DATA', 'INPUT_NODAL_COORDINATES']),
      outputTables: Object.freeze(['OUTPUT_DISPLACEMENTS', 'OUTPUT_LOCAL_ELEMENT_FORCES']),
    }),
    summary,
    cases: Object.freeze(cases),
  });
}

function inferSpan(input) {
  requireUnits(input.fromDisplacement.DUNITS, 'mm.', 'OUTPUT_DISPLACEMENTS.DUNITS');
  requireUnits(input.toDisplacement.DUNITS, 'mm.', 'OUTPUT_DISPLACEMENTS.DUNITS');
  requireUnits(String(input.localForce.FUNITS).trim(), 'N.', 'OUTPUT_LOCAL_ELEMENT_FORCES.FUNITS');

  const fromPoint = point(input.coordinates, 'FROM');
  const toPoint = point(input.coordinates, 'TO');
  const delta = subtract(toPoint, fromPoint);
  const lengthM = norm(delta);
  if (!(lengthM > EPS)) throw new Error(`Zero source chord for element ${input.source.ELEMENTID}.`);
  const tangent = delta.map((value) => value / lengthM);

  const fromTranslation = translation(input.fromDisplacement);
  const toTranslation = translation(input.toDisplacement);
  const axialKinematicStrain = dot(subtract(toTranslation, fromTranslation), tangent) / lengthM;

  const fromAxialEndActionN = finite(input.localForce.FXF);
  const toAxialEndActionN = finite(input.localForce.FXT);
  const axialEndActionAntisymmetryN = Math.abs(fromAxialEndActionN + toAxialEndActionN);
  const signedTensionForceN = (toAxialEndActionN - fromAxialEndActionN) / 2;

  const elasticModulusPa = finite(input.source.MODULUS) * KPA_TO_PA;
  const outerDiameterM = finite(input.source.DIAMETER) * MM_TO_M;
  const wallThicknessM = finite(input.source.WALL_THICK) * MM_TO_M;
  const innerDiameterM = outerDiameterM - 2 * wallThicknessM;
  const areaM2 = Math.PI / 4 * (outerDiameterM ** 2 - innerDiameterM ** 2);
  const mechanicalAxialStrain = signedTensionForceN / (elasticModulusPa * areaM2);
  const inferredThermalStrain = axialKinematicStrain - mechanicalAxialStrain;

  return Object.freeze({
    caseId: input.caseDef.caseId,
    elementId: String(input.source.ELEMENTID),
    fromNode: nodeKey(input.source.FROM_NODE),
    toNode: nodeKey(input.source.TO_NODE),
    lengthM,
    elasticModulusPa,
    outerDiameterM,
    wallThicknessM,
    areaM2,
    axialKinematicStrain,
    signedTensionForceN,
    mechanicalAxialStrain,
    inferredThermalStrain,
    axialEndActionAntisymmetryN,
  });
}

function renderSummary(audit) {
  const lines = [];
  lines.push('# BM4_L ACCDB-only T1 thermal-strain audit');
  lines.push('');
  lines.push(`Source ACCDB SHA-256: \`${audit.source.accdbSha256}\`.`);
  lines.push('');
  lines.push('The T1 total strain is inferred by direct axial constitutive inversion from CAESAR nodal motions and local element forces stored in BM4_L.ACCDB. No external report and no LFEA comparison row are used.');
  lines.push('');
  lines.push(`**Inferred T1 total strain: ${audit.summary.inferredT1TotalThermalStrain.toPrecision(16)}**`);
  lines.push(`Retained representation before this audit: ${audit.summary.retainedT1TotalThermalStrain.toPrecision(8)}`);
  lines.push(`Relative difference: ${(audit.summary.retainedRelativeDifference * 100).toFixed(4)}%`);
  lines.push('');
  lines.push('| Case | Spans | Median strain | MAD | >=0.1m spans | Max >=0.1m deviation |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const { caseId } of TARGET_CASES) {
    const c = audit.cases[caseId];
    lines.push(`| ${caseId} | ${c.usableSpanCount} | ${c.inferredMedianThermalStrain.toPrecision(16)} | ${c.medianAbsoluteDeviation.toExponential(4)} | ${c.precisionSubset.usableSpanCount} | ${(c.precisionSubset.maximumRelativeDeviationFromPrimaryMedian * 100).toFixed(5)}% |`);
  }
  lines.push('');
  lines.push('## Decision boundary');
  lines.push('');
  lines.push('- This identifies an ACCDB-internal mechanics property; it is not selected from benchmark failure counts.');
  lines.push('- L3 and L14 must infer the same strain independently.');
  lines.push('- Any production A/B using the inferred strain must leave L2/L4/L6 bit-identical and preserve recovered equilibrium.');
  lines.push('- Issue #991 literal 10% acceptance remains unchanged.');
  return `${lines.join('\n')}\n`;
}

function point(row, end) {
  return [
    finite(row[`${end}_NODE_X`]) * MM_TO_M,
    finite(row[`${end}_NODE_Y`]) * MM_TO_M,
    finite(row[`${end}_NODE_Z`]) * MM_TO_M,
  ];
}
function translation(row) { return [finite(row.DX), finite(row.DY), finite(row.DZ)].map((value) => value * MM_TO_M); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function norm(a) { return Math.hypot(...a); }
function median(values) {
  if (values.length === 0) throw new Error('Cannot take median of empty collection.');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function requiredTable(raw, name) {
  const table = raw.tables?.[name];
  if (!table || !Array.isArray(table.rows)) throw new Error(`Missing ACCDB table ${name}.`);
  return table;
}
function requireSource(raw) {
  const hash = String(raw.source?.sha256 ?? '').toLowerCase();
  if (hash !== SOURCE_SHA256) throw new Error(`BM4_L.ACCDB custody mismatch: ${hash}.`);
}
function requireUnits(actual, expected, field) {
  if (String(actual).trim() !== expected) throw new Error(`${field} must be ${expected}; got ${actual}.`);
}
function pairKey(fromNode, toNode) { return `${nodeKey(fromNode)}->${nodeKey(toNode)}`; }
function nodeKey(value) { return String(Number(value)); }
function finite(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Expected finite number, got ${String(value)}.`);
  return number;
}
function parseArgs(values) {
  const out = {};
  for (let index = 0; index < values.length; index += 2) out[String(values[index] ?? '').replace(/^--/u, '')] = values[index + 1];
  return out;
}
function required(map, key) {
  const value = map[key];
  if (!value) throw new Error(`Missing --${key}.`);
  return value;
}
function readJson(path) { return JSON.parse(readFileSync(resolve(path), 'utf8').replace(/^\uFEFF/u, '')); }
function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
}
