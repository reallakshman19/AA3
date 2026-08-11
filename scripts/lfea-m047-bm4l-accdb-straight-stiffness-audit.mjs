#!/usr/bin/env node

/**
 * BM4_L.ACCDB-only straight-pipe constitutive audit.
 *
 * This script does NOT read the LFEA comparison report or issue failure counts.
 * It asks a narrower mechanics question directly of the CAESAR output stored in
 * BM4_L.ACCDB: for ordinary straight PIPE spans, do CAESAR end forces agree
 * better with the Euler-Bernoulli or section-derived Cowper/Timoshenko member
 * stiffness when evaluated against CAESAR's own nodal motions?
 *
 * L3 (T1) and L4 (P1) are chosen because their straight-span transverse
 * mechanics have no gravity distributed-load vector. Thermal/pressure initial
 * strains act axially, so the transverse force/moment block can be tested as
 * q_transverse = K_transverse d directly.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const SOURCE_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const CASES = Object.freeze([
  Object.freeze({ caseId: 'L3', lcaseNumber: 3, primitive: 'T1' }),
  Object.freeze({ caseId: 'L4', lcaseNumber: 4, primitive: 'P1' }),
]);
const SIGNAL_FLOOR_FORCE_EQUIVALENT_N = 1e-3;
const EPS = 1e-14;
const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const DEG_TO_RAD = Math.PI / 180;

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
  const globalForceRows = requiredTable(rawExport, 'OUTPUT_GLOBAL_ELEMENT_FORCES').rows;

  const coordinateByPair = new Map(coordinateRows.map((row) => [pairKey(row.FROM_NODE, row.TO_NODE), row]));
  const displacementByCaseNode = new Map(displacementRows.map((row) => [
    `${Number(row.LCASE_NUM)}|${nodeKey(row.NODE)}`,
    row,
  ]));
  const forceByCasePair = new Map(globalForceRows.map((row) => [
    `${Number(row.LCASE_NUM)}|${pairKey(row.FROM_NODE, row.TO_NODE)}`,
    row,
  ]));

  const ordinaryRows = basicRows.filter(isOrdinaryStraightSourceSpan);
  const cases = {};

  for (const caseDef of CASES) {
    const usable = [];
    const skipped = [];
    for (const row of ordinaryRows) {
      const pair = pairKey(row.FROM_NODE, row.TO_NODE);
      const coordinates = coordinateByPair.get(pair);
      const force = forceByCasePair.get(`${caseDef.lcaseNumber}|${pair}`);
      const displacementI = displacementByCaseNode.get(`${caseDef.lcaseNumber}|${nodeKey(row.FROM_NODE)}`);
      const displacementJ = displacementByCaseNode.get(`${caseDef.lcaseNumber}|${nodeKey(row.TO_NODE)}`);

      if (!coordinates || !force || !displacementI || !displacementJ) {
        skipped.push(Object.freeze({
          elementId: String(row.ELEMENTID),
          fromNode: nodeKey(row.FROM_NODE),
          toNode: nodeKey(row.TO_NODE),
          reason: 'MISSING_DIRECT_ACCDB_REFERENCE_ROW',
        }));
        continue;
      }

      const evaluated = evaluateSpan({ row, coordinates, force, displacementI, displacementJ, caseDef });
      if (evaluated.referenceSignalForceEquivalentN <= SIGNAL_FLOOR_FORCE_EQUIVALENT_N) {
        skipped.push(Object.freeze({
          elementId: String(row.ELEMENTID),
          fromNode: nodeKey(row.FROM_NODE),
          toNode: nodeKey(row.TO_NODE),
          reason: 'TRANSVERSE_REFERENCE_SIGNAL_BELOW_FIXED_FLOOR',
          referenceSignalForceEquivalentN: evaluated.referenceSignalForceEquivalentN,
        }));
        continue;
      }
      usable.push(evaluated);
    }

    cases[caseDef.caseId] = Object.freeze({
      primitive: caseDef.primitive,
      lcaseNumber: caseDef.lcaseNumber,
      ordinaryStraightSourceSpanCount: ordinaryRows.length,
      usableSpanCount: usable.length,
      skippedSpanCount: skipped.length,
      cowperBetterCount: usable.filter((row) => row.cowper.normalizedResidual < row.euler.normalizedResidual).length,
      eulerBetterCount: usable.filter((row) => row.euler.normalizedResidual < row.cowper.normalizedResidual).length,
      exactTieCount: usable.filter((row) => row.euler.normalizedResidual === row.cowper.normalizedResidual).length,
      residualStatistics: summarizeResiduals(usable),
      intersectionFreeSubset: summarizeSubset(usable.filter((row) => row.intersectionPointer === 0)),
      rows: Object.freeze(usable),
      skipped: Object.freeze(skipped),
    });
  }

  const summary = Object.freeze({
    sourceSha256: SOURCE_SHA256,
    method: 'CAESAR_NODAL_MOTIONS_AND_END_ACTIONS_DIRECT_CONSTITUTIVE_DISCRIMINATOR',
    candidate: 'COWPER_HOLLOW_CIRCLE_TIMOSHENKO_FROM_ACCDB_SECTION_AND_POISSON',
    benchmarkFailureRowsConsumed: false,
    signalFloorForceEquivalentN: SIGNAL_FLOOR_FORCE_EQUIVALENT_N,
    cases: Object.freeze(Object.fromEntries(CASES.map(({ caseId }) => {
      const result = cases[caseId];
      return [caseId, Object.freeze({
        usableSpanCount: result.usableSpanCount,
        cowperBetterCount: result.cowperBetterCount,
        eulerBetterCount: result.eulerBetterCount,
        eulerMedianNormalizedResidual: result.residualStatistics.euler.median,
        cowperMedianNormalizedResidual: result.residualStatistics.cowper.median,
        intersectionFreeUsableSpanCount: result.intersectionFreeSubset.usableSpanCount,
        intersectionFreeCowperBetterCount: result.intersectionFreeSubset.cowperBetterCount,
        intersectionFreeEulerMedianNormalizedResidual: result.intersectionFreeSubset.euler.median,
        intersectionFreeCowperMedianNormalizedResidual: result.intersectionFreeSubset.cowper.median,
      })];
    }))),
    interpretation: Object.freeze([
      'The audit consumes only BM4_L.ACCDB input geometry/material data and CAESAR output displacement/element-force tables.',
      'No LFEA benchmark comparison row, error threshold result, or failure count is used to derive or select the Cowper coefficient.',
      'Cowper kappa is calculated independently for each span from the ACCDB outside diameter, wall thickness, and Poisson ratio.',
      'Moment residuals are divided by span length before combining them with force residuals, giving a dimensionally consistent force-equivalent norm.',
      'The intersection-free subset is reported as a precision diagnostic only; the primary decision uses every usable ordinary straight source span.',
    ]),
  });

  return Object.freeze({
    schema: 'lfea-m047-bm4l-accdb-straight-stiffness-audit/v1',
    source: Object.freeze({
      accdbSha256: SOURCE_SHA256,
      provider: rawExport.provider,
      inputTables: Object.freeze(['INPUT_BASIC_ELEMENT_DATA', 'INPUT_NODAL_COORDINATES']),
      outputTables: Object.freeze(['OUTPUT_DISPLACEMENTS', 'OUTPUT_GLOBAL_ELEMENT_FORCES']),
    }),
    formulation: Object.freeze({
      euler: 'PIPE_FRAME3D_EULER_BERNOULLI_V1',
      timoshenko: 'PIPE_FRAME3D_TIMOSHENKO_V1',
      shearCorrection: 'COWPER_HOLLOW_CIRCULAR_SECTION',
      shearModulus: 'E_OVER_2_TIMES_1_PLUS_NU',
      transverseResidual: 'FORCE_EQUIVALENT_NORM_WITH_MOMENT_DIVIDED_BY_SPAN_LENGTH',
    }),
    summary,
    cases: Object.freeze(cases),
  });
}

function evaluateSpan(input) {
  const fromPoint = coordinatePoint(input.coordinates, 'FROM');
  const toPoint = coordinatePoint(input.coordinates, 'TO');
  const delta = subtract(toPoint, fromPoint);
  const lengthM = norm(delta);
  if (!(lengthM > EPS)) throw new Error(`Element ${input.row.ELEMENTID} has zero source chord length.`);

  const axes = deterministicCircularSectionAxes(delta);
  const localDisplacement = [
    ...matVec3(axes, displacementTranslation(input.displacementI)),
    ...matVec3(axes, displacementRotation(input.displacementI)),
    ...matVec3(axes, displacementTranslation(input.displacementJ)),
    ...matVec3(axes, displacementRotation(input.displacementJ)),
  ];
  const localReferenceAction = [
    ...matVec3(axes, forceVector(input.force, 'FROM')),
    ...matVec3(axes, momentVector(input.force, 'FROM')),
    ...matVec3(axes, forceVector(input.force, 'TO')),
    ...matVec3(axes, momentVector(input.force, 'TO')),
  ];

  const section = sectionProperties(input.row);
  const material = materialProperties(input.row);
  const kappa = cowperHollowCircleKappa(section.innerDiameterM / section.outerDiameterM, material.poissonRatio);

  const eulerMatrix = transverseFrameMatrix({
    elasticModulusPa: material.elasticModulusPa,
    shearModulusPa: material.shearModulusPa,
    areaM2: section.areaM2,
    secondMomentM4: section.secondMomentM4,
    lengthM,
    kappa: null,
  });
  const cowperMatrix = transverseFrameMatrix({
    elasticModulusPa: material.elasticModulusPa,
    shearModulusPa: material.shearModulusPa,
    areaM2: section.areaM2,
    secondMomentM4: section.secondMomentM4,
    lengthM,
    kappa,
  });
  const eulerPredicted = multiplyMatrixVector12(eulerMatrix.matrix, localDisplacement);
  const cowperPredicted = multiplyMatrixVector12(cowperMatrix.matrix, localDisplacement);

  const referenceScaled = transverseForceEquivalent(localReferenceAction, lengthM);
  const referenceSignal = norm(referenceScaled);
  const eulerResidual = subtract(
    transverseForceEquivalent(eulerPredicted, lengthM),
    referenceScaled,
  );
  const cowperResidual = subtract(
    transverseForceEquivalent(cowperPredicted, lengthM),
    referenceScaled,
  );

  return Object.freeze({
    caseId: input.caseDef.caseId,
    lcaseNumber: input.caseDef.lcaseNumber,
    elementId: String(input.row.ELEMENTID),
    fromNode: nodeKey(input.row.FROM_NODE),
    toNode: nodeKey(input.row.TO_NODE),
    intersectionPointer: finiteNumber(input.row.INT_PTR),
    lengthM,
    section: Object.freeze(section),
    material: Object.freeze(material),
    cowperKappa: kappa,
    cowperPhi: cowperMatrix.phi,
    referenceSignalForceEquivalentN: referenceSignal,
    euler: residualRecord(eulerResidual, referenceSignal),
    cowper: residualRecord(cowperResidual, referenceSignal),
  });
}

function residualRecord(residualVector, referenceSignal) {
  const absoluteResidualForceEquivalentN = norm(residualVector);
  return Object.freeze({
    absoluteResidualForceEquivalentN,
    normalizedResidual: absoluteResidualForceEquivalentN / referenceSignal,
  });
}

function summarizeResiduals(rows) {
  return Object.freeze({
    euler: distribution(rows.map((row) => row.euler.normalizedResidual)),
    cowper: distribution(rows.map((row) => row.cowper.normalizedResidual)),
    cowperToEulerMedianRatio: median(rows.map((row) => row.cowper.normalizedResidual))
      / median(rows.map((row) => row.euler.normalizedResidual)),
  });
}

function summarizeSubset(rows) {
  return Object.freeze({
    usableSpanCount: rows.length,
    cowperBetterCount: rows.filter((row) => row.cowper.normalizedResidual < row.euler.normalizedResidual).length,
    eulerBetterCount: rows.filter((row) => row.euler.normalizedResidual < row.cowper.normalizedResidual).length,
    euler: distribution(rows.map((row) => row.euler.normalizedResidual)),
    cowper: distribution(rows.map((row) => row.cowper.normalizedResidual)),
  });
}

function distribution(values) {
  if (values.length === 0) return Object.freeze({ count: 0, min: null, median: null, p90: null, max: null });
  const sorted = [...values].sort((a, b) => a - b);
  return Object.freeze({
    count: sorted.length,
    min: sorted[0],
    median: median(sorted),
    p90: quantileSorted(sorted, 0.9),
    max: sorted.at(-1),
  });
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantileSorted(sorted, probability) {
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function transverseFrameMatrix(input) {
  const phi = input.kappa === null
    ? 0
    : (12 * input.elasticModulusPa * input.secondMomentM4)
      / (input.shearModulusPa * input.kappa * input.areaM2 * input.lengthM ** 2);
  const matrix = new Array(144).fill(0);
  const setSymmetric = (row, column, value) => {
    matrix[row * 12 + column] = value;
    matrix[column * 12 + row] = value;
  };

  const a = (12 * input.elasticModulusPa * input.secondMomentM4)
    / ((1 + phi) * input.lengthM ** 3);
  const b = (6 * input.elasticModulusPa * input.secondMomentM4)
    / ((1 + phi) * input.lengthM ** 2);
  const c = ((4 + phi) * input.elasticModulusPa * input.secondMomentM4)
    / ((1 + phi) * input.lengthM);
  const d = ((2 - phi) * input.elasticModulusPa * input.secondMomentM4)
    / ((1 + phi) * input.lengthM);

  // local-y deflection / local-z rotation
  setSymmetric(1, 1, a);
  setSymmetric(1, 5, b);
  setSymmetric(1, 7, -a);
  setSymmetric(1, 11, b);
  setSymmetric(5, 5, c);
  setSymmetric(5, 7, -b);
  setSymmetric(5, 11, d);
  setSymmetric(7, 7, a);
  setSymmetric(7, 11, -b);
  setSymmetric(11, 11, c);

  // local-z deflection / local-y rotation
  setSymmetric(2, 2, a);
  setSymmetric(2, 4, -b);
  setSymmetric(2, 8, -a);
  setSymmetric(2, 10, -b);
  setSymmetric(4, 4, c);
  setSymmetric(4, 8, b);
  setSymmetric(4, 10, d);
  setSymmetric(8, 8, a);
  setSymmetric(8, 10, b);
  setSymmetric(10, 10, c);

  return Object.freeze({ matrix: Object.freeze(matrix), phi });
}

function transverseForceEquivalent(vector12, lengthM) {
  return [
    vector12[1],
    vector12[2],
    vector12[4] / lengthM,
    vector12[5] / lengthM,
    vector12[7],
    vector12[8],
    vector12[10] / lengthM,
    vector12[11] / lengthM,
  ];
}

function sectionProperties(row) {
  const outerDiameterM = finiteNumber(row.DIAMETER) * MM_TO_M;
  const wallThicknessM = finiteNumber(row.WALL_THICK) * MM_TO_M;
  const innerDiameterM = outerDiameterM - 2 * wallThicknessM;
  if (!(outerDiameterM > 0 && wallThicknessM > 0 && innerDiameterM > 0)) {
    throw new Error(`Invalid pipe section on element ${row.ELEMENTID}.`);
  }
  const areaM2 = Math.PI / 4 * (outerDiameterM ** 2 - innerDiameterM ** 2);
  const secondMomentM4 = Math.PI / 64 * (outerDiameterM ** 4 - innerDiameterM ** 4);
  return {
    outerDiameterM,
    wallThicknessM,
    innerDiameterM,
    areaM2,
    secondMomentM4,
  };
}

function materialProperties(row) {
  const elasticModulusPa = finiteNumber(row.MODULUS) * KPA_TO_PA;
  const poissonRatio = finiteNumber(row.POISSONS);
  const shearModulusPa = elasticModulusPa / (2 * (1 + poissonRatio));
  if (!(elasticModulusPa > 0 && shearModulusPa > 0 && poissonRatio > -1 && poissonRatio < 0.5)) {
    throw new Error(`Invalid material state on element ${row.ELEMENTID}.`);
  }
  return { elasticModulusPa, poissonRatio, shearModulusPa };
}

function cowperHollowCircleKappa(innerToOuterDiameterRatio, poissonRatio) {
  const a = innerToOuterDiameterRatio;
  if (!(a >= 0 && a < 1)) throw new Error(`Invalid hollow-circle diameter ratio ${a}.`);
  const onePlusA2 = 1 + a ** 2;
  const numerator = 6 * (1 + poissonRatio) * onePlusA2 ** 2;
  const denominator = (7 + 6 * poissonRatio) * onePlusA2 ** 2
    + (20 + 12 * poissonRatio) * a ** 2;
  const kappa = numerator / denominator;
  if (!(kappa > 0 && kappa < 1)) throw new Error(`Invalid Cowper kappa ${kappa}.`);
  return kappa;
}

function deterministicCircularSectionAxes(delta) {
  const x = normalize(delta);
  const candidates = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const reference = candidates.reduce((best, candidate) =>
    Math.abs(dot(x, candidate)) < Math.abs(dot(x, best)) ? candidate : best);
  const y = normalize(subtract(reference, scale(x, dot(reference, x))));
  const z = normalize(cross(x, y));
  return Object.freeze([Object.freeze(x), Object.freeze(y), Object.freeze(z)]);
}

function coordinatePoint(row, end) {
  return [
    finiteNumber(row[`${end}_NODE_X`]) * MM_TO_M,
    finiteNumber(row[`${end}_NODE_Y`]) * MM_TO_M,
    finiteNumber(row[`${end}_NODE_Z`]) * MM_TO_M,
  ];
}

function displacementTranslation(row) {
  requireUnits(row.DUNITS, 'mm.', 'OUTPUT_DISPLACEMENTS.DUNITS');
  return [finiteNumber(row.DX), finiteNumber(row.DY), finiteNumber(row.DZ)].map((value) => value * MM_TO_M);
}

function displacementRotation(row) {
  requireUnits(row.RUNITS, 'deg.', 'OUTPUT_DISPLACEMENTS.RUNITS');
  return [finiteNumber(row.RX), finiteNumber(row.RY), finiteNumber(row.RZ)].map((value) => value * DEG_TO_RAD);
}

function forceVector(row, end) {
  requireUnits(String(row.FUNITS).trim(), 'N.', 'OUTPUT_GLOBAL_ELEMENT_FORCES.FUNITS');
  const suffix = end === 'FROM' ? 'F' : 'T';
  return ['FX', 'FY', 'FZ'].map((field) => finiteNumber(row[`${field}${suffix}`]));
}

function momentVector(row, end) {
  if (!String(row.MUNITS).includes('N.m.')) throw new Error(`Unexpected moment units: ${row.MUNITS}`);
  const suffix = end === 'FROM' ? 'F' : 'T';
  return ['MX', 'MY', 'MZ'].map((field) => finiteNumber(row[`${field}${suffix}`]));
}

function isOrdinaryStraightSourceSpan(row) {
  return finiteNumber(row.BEND_PTR) <= 0
    && finiteNumber(row.RIGID_PTR) <= 0
    && finiteNumber(row.REDUCER_PTR) <= 0;
}

function multiplyMatrixVector12(matrix, vector) {
  const out = new Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      out[row] += matrix[row * 12 + column] * vector[column];
    }
  }
  return out;
}

function matVec3(rows, vector) { return rows.map((row) => dot(row, vector)); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function scale(a, scalar) { return a.map((value) => value * scalar); }
function norm(a) { return Math.hypot(...a); }
function normalize(a) {
  const magnitude = norm(a);
  if (!(magnitude > EPS)) throw new Error('Cannot normalize zero vector.');
  return a.map((value) => value / magnitude);
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
function finiteNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Expected finite number, got ${String(value)}.`);
  return n;
}

function renderSummary(audit) {
  const lines = [];
  lines.push('# BM4_L ACCDB-only straight-pipe constitutive audit');
  lines.push('');
  lines.push(`Source ACCDB SHA-256: \`${audit.source.accdbSha256}\`.`);
  lines.push('');
  lines.push('This audit uses only BM4_L.ACCDB input geometry/material records and CAESAR output displacements/end actions. It does **not** read the LFEA benchmark comparison or failure counts.');
  lines.push('');
  lines.push('For each ordinary straight source span, the CAESAR nodal motion is inserted into two otherwise identical circular-pipe transverse stiffness matrices: Euler-Bernoulli and Cowper/Timoshenko. Cowper kappa is derived independently from that span\'s ACCDB OD, wall and Poisson ratio.');
  lines.push('');
  lines.push('| Case | Usable spans | Cowper better | Euler better | Euler median residual | Cowper median residual | Cowper/Euler median |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const { caseId } of CASES) {
    const result = audit.cases[caseId];
    lines.push(`| ${caseId} | ${result.usableSpanCount} | ${result.cowperBetterCount} | ${result.eulerBetterCount} | ${percent(result.residualStatistics.euler.median)} | ${percent(result.residualStatistics.cowper.median)} | ${result.residualStatistics.cowperToEulerMedianRatio.toFixed(4)} |`);
  }
  lines.push('');
  lines.push('## Intersection-free precision subset');
  lines.push('');
  lines.push('This is reported separately and is not used to choose the formulation.');
  lines.push('');
  lines.push('| Case | Spans | Cowper better | Euler median | Cowper median |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const { caseId } of CASES) {
    const subset = audit.cases[caseId].intersectionFreeSubset;
    lines.push(`| ${caseId} | ${subset.usableSpanCount} | ${subset.cowperBetterCount} | ${percent(subset.euler.median)} | ${percent(subset.cowper.median)} |`);
  }
  lines.push('');
  lines.push('## Decision boundary');
  lines.push('');
  lines.push('- This is a constitutive identification check, not a benchmark-count optimization.');
  lines.push('- The issue #991 component-by-component 10% acceptance rule is unchanged.');
  lines.push('- A Cowper win here supports the ordinary straight-span stiffness formulation only; bend, rigid and reducer formulations remain separate authorities.');
  return `${lines.join('\n')}\n`;
}

function percent(value) { return value === null ? 'n/a' : `${(value * 100).toFixed(3)}%`; }
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
