#!/usr/bin/env node
/**
 * Audit bend gravity resultants and first moments from retained real-solve evidence.
 * Inputs are an ACCDB actual package and one gravity case; output reports the
 * chord-load centroid against the exact circular-arc centroid without changing mechanics.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BEND_ELEMENT = /^ACCDB-BEND-(\d+)\.E(\d+)$/u;

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid argument near ${String(key)}.`);
    }
    if (values.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    values.set(key, value);
  }
  const unknown = [...values.keys()].filter((key) => !['--actual', '--case', '--out'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  for (const key of ['--actual', '--case', '--out']) {
    if (!values.has(key)) throw new TypeError('Usage: --actual <actual.json> --case <gravity-case> --out <evidence.json>.');
  }
  return Object.freeze({
    actualPath: resolve(values.get('--actual')),
    caseId: String(values.get('--case')),
    outPath: resolve(values.get('--out')),
  });
}

function buildEvidence(actual, caseId) {
  if (actual?.schema !== 'lfea-accdb-benchmark-actual/v1') {
    throw new TypeError('Bend gravity audit requires lfea-accdb-benchmark-actual/v1.');
  }
  const mechanics = actual.mechanics?.cases?.[caseId];
  if (!mechanics) throw new TypeError(`Actual package is missing mechanics case ${caseId}.`);
  if (mechanics.gravityIncluded !== true) throw new TypeError(`Case ${caseId} does not include gravity.`);
  const positions = positionMap(mechanics.analysisNodePositions);
  const recovery = new Map((mechanics.recoveryLedger ?? []).map((entry) => [String(entry.elementId), entry]));
  const grouped = groupBendElements(mechanics.elementLedger ?? []);
  if (grouped.size === 0) throw new TypeError(`Case ${caseId} has no bend-arc elements.`);
  const bends = [...grouped.entries()].map(([pointer, entries]) =>
    auditBend(pointer, entries, positions, recovery));
  const failed = bends.filter((entry) => entry.status === 'FAIL');
  return {
    schema: 'lfea-accdb-bend-gravity-first-moment/v1',
    sourceAccdbSha256: actual.sourceAccdbSha256,
    caseId,
    rule: 'ASSEMBLED_CONSISTENT_CHORD_LOAD_VS_EXACT_CIRCULAR_ARC_CENTROID_V1',
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    counts: { bendCount: bends.length, passed: bends.length - failed.length, failed: failed.length },
    totals: {
      arcWeightN: bends.reduce((sum, entry) => sum + entry.arcWeightN, 0),
      analyticFirstMomentDifferenceAbsoluteSumNm: bends.reduce((sum, entry) =>
        sum + entry.analyticFirstMomentDifferenceNormNm, 0),
      maximumAnalyticFirstMomentDifferenceNm: Math.max(...bends.map((entry) =>
        entry.analyticFirstMomentDifferenceNormNm)),
      maximumCentroidDifferenceM: Math.max(...bends.map((entry) => entry.centroidDifferenceNormM)),
    },
    bends,
  };
}

function positionMap(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError('Actual mechanics evidence is missing analysisNodePositions.');
  }
  const result = new Map();
  for (const row of rows) {
    const nodeId = String(row.nodeId);
    if (result.has(nodeId)) throw new TypeError(`Duplicate analysis-node position ${nodeId}.`);
    result.set(nodeId, vector3(row.positionM, `analysisNodePositions.${nodeId}`));
  }
  return result;
}

function groupBendElements(rows) {
  const grouped = new Map();
  for (const entry of rows) {
    if (entry.kind !== 'BEND_ARC') continue;
    const match = BEND_ELEMENT.exec(String(entry.elementId));
    if (!match) throw new TypeError(`Bend arc has unsupported identity ${entry.elementId}.`);
    const pointer = Number(match[1]);
    const segment = Number(match[2]);
    if (!grouped.has(pointer)) grouped.set(pointer, []);
    grouped.get(pointer).push({ ...entry, segment });
  }
  for (const entries of grouped.values()) entries.sort((left, right) => left.segment - right.segment);
  return grouped;
}

function auditBend(pointer, entries, positions, recovery) {
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index].segment !== index + 1) {
      throw new TypeError(`BEND_PTR ${pointer} segment sequence is incomplete.`);
    }
    if (index > 0 && String(entries[index - 1].nodeJ) !== String(entries[index].nodeI)) {
      throw new TypeError(`BEND_PTR ${pointer} segment chain is discontinuous.`);
    }
  }
  const points = [position(positions, entries[0].nodeI), ...entries.map((entry) =>
    position(positions, entry.nodeJ))];
  const centre = circumcentre3d(points[0], points[Math.floor(points.length / 2)], points.at(-1));
  const radii = points.map((point) => norm(subtract(point, centre)));
  const radiusM = radii.reduce((sum, value) => sum + value, 0) / radii.length;
  const radiusSpreadM = Math.max(...radii.map((value) => Math.abs(value - radiusM)));
  const referencePoint = points[0];
  let arcWeightN = 0;
  let exactCentroidWeighted = zero3();
  let chordCentroidWeighted = zero3();
  let assembledResultant = zero3();
  let assembledFirstMoment = zero3();
  let chordFirstMoment = zero3();
  let analyticFirstMoment = zero3();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const recovered = recovery.get(String(entry.elementId));
    if (!recovered) throw new TypeError(`Recovery evidence is missing ${entry.elementId}.`);
    const equivalent = vector12(recovered.equivalentLoadGlobal, `${entry.elementId}.equivalentLoadGlobal`);
    const pointI = points[index];
    const pointJ = points[index + 1];
    const forceI = equivalent.slice(0, 3);
    const momentI = equivalent.slice(3, 6);
    const forceJ = equivalent.slice(6, 9);
    const momentJ = equivalent.slice(9, 12);
    const resultant = add(forceI, forceJ);
    const chordCentroid = scale(add(pointI, pointJ), 0.5);
    const exactCentroid = circularSubarcCentroid(pointI, pointJ, centre, radiusM);
    const weightN = finiteNonnegative(entry.gravityWeightN, `${entry.elementId}.gravityWeightN`);
    arcWeightN += weightN;
    exactCentroidWeighted = add(exactCentroidWeighted, scale(exactCentroid, weightN));
    chordCentroidWeighted = add(chordCentroidWeighted, scale(chordCentroid, weightN));
    assembledResultant = add(assembledResultant, resultant);
    assembledFirstMoment = add(assembledFirstMoment, add(
      add(momentI, cross(subtract(pointI, referencePoint), forceI)),
      add(momentJ, cross(subtract(pointJ, referencePoint), forceJ)),
    ));
    chordFirstMoment = add(chordFirstMoment, cross(subtract(chordCentroid, referencePoint), resultant));
    analyticFirstMoment = add(analyticFirstMoment, cross(subtract(exactCentroid, referencePoint), resultant));
  }
  if (!(arcWeightN > 0)) throw new TypeError(`BEND_PTR ${pointer} has no gravity weight.`);
  const analyticCentroid = scale(exactCentroidWeighted, 1 / arcWeightN);
  const chordCentroid = scale(chordCentroidWeighted, 1 / arcWeightN);
  const centroidDifference = subtract(chordCentroid, analyticCentroid);
  const expectedResultantMagnitude = arcWeightN;
  const resultantMagnitudeErrorN = Math.abs(norm(assembledResultant) - expectedResultantMagnitude);
  const chordLedgerResidual = subtract(assembledFirstMoment, chordFirstMoment);
  const analyticDifference = subtract(assembledFirstMoment, analyticFirstMoment);
  const forceToleranceN = numericalTolerance([expectedResultantMagnitude, ...assembledResultant]);
  const momentToleranceNm = numericalTolerance([...assembledFirstMoment, ...chordFirstMoment]);
  const status = resultantMagnitudeErrorN <= forceToleranceN
    && norm(chordLedgerResidual) <= momentToleranceNm
    && radiusSpreadM <= numericalTolerance([radiusM])
    ? 'PASS' : 'FAIL';
  return {
    bendPointer: pointer,
    sourceElementId: String(entries[0].sourceElementId),
    segmentCount: entries.length,
    radiusM,
    radiusSpreadM,
    arcWeightN,
    referencePointM: referencePoint,
    analyticArcCentroidM: analyticCentroid,
    chordLoadCentroidM: chordCentroid,
    centroidDifferenceM: centroidDifference,
    centroidDifferenceNormM: norm(centroidDifference),
    assembledResultantN: assembledResultant,
    resultantMagnitudeErrorN,
    assembledFirstMomentNm: assembledFirstMoment,
    analyticArcFirstMomentNm: analyticFirstMoment,
    analyticFirstMomentDifferenceNm: analyticDifference,
    analyticFirstMomentDifferenceNormNm: norm(analyticDifference),
    chordLedgerFirstMomentResidualNm: chordLedgerResidual,
    chordLedgerFirstMomentResidualNormNm: norm(chordLedgerResidual),
    numericalTolerance: { forceN: forceToleranceN, momentNm: momentToleranceNm },
    status,
  };
}

function circularSubarcCentroid(pointI, pointJ, centre, radius) {
  const radialI = scale(subtract(pointI, centre), 1 / radius);
  const radialJ = scale(subtract(pointJ, centre), 1 / radius);
  const angle = Math.acos(clamp(dot(radialI, radialJ), -1, 1));
  if (!(angle > 0 && angle < Math.PI)) throw new TypeError('Circular subarc angle is invalid.');
  const bisector = scale(add(radialI, radialJ), 1 / norm(add(radialI, radialJ)));
  const centroidRadius = radius * Math.sin(angle / 2) / (angle / 2);
  return add(centre, scale(bisector, centroidRadius));
}

function circumcentre3d(pointA, pointB, pointC) {
  const u = subtract(pointB, pointA);
  const v = subtract(pointC, pointA);
  const w = cross(u, v);
  const denominator = 2 * dot(w, w);
  if (!(denominator > 0)) throw new TypeError('Bend points are collinear; circular centre is undefined.');
  const offset = scale(add(
    scale(cross(v, w), dot(u, u)),
    scale(cross(w, u), dot(v, v)),
  ), 1 / denominator);
  return add(pointA, offset);
}

function position(positions, nodeId) {
  const value = positions.get(String(nodeId));
  if (!value) throw new TypeError(`Analysis-node position is missing for ${nodeId}.`);
  return value;
}

function vector3(value, field) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${field} must have three values.`);
  return value.map((entry, index) => finite(entry, `${field}[${index}]`));
}

function vector12(value, field) {
  if (!Array.isArray(value) || value.length !== 12) throw new TypeError(`${field} must have twelve values.`);
  return value.map((entry, index) => finite(entry, `${field}[${index}]`));
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return number;
}

function finiteNonnegative(value, field) {
  const number = finite(value, field);
  if (number < 0) throw new TypeError(`${field} must be nonnegative.`);
  return number;
}

function numericalTolerance(values) {
  const scaleValue = Math.max(1, ...values.map((value) => Math.abs(Number(value))));
  return 8192 * Number.EPSILON * scaleValue;
}

function zero3() { return [0, 0, 0]; }
function add(left, right) { return left.map((value, index) => value + right[index]); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function scale(value, factor) { return value.map((entry) => entry * factor); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function norm(value) { return Math.hypot(...value); }
function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${path}: ${error.message}`, { cause: error });
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const input = parseArguments(process.argv.slice(2));
const evidence = buildEvidence(readJson(input.actualPath), input.caseId);
writeJson(input.outPath, evidence);
console.log(`Wrote bend gravity first-moment evidence to ${input.outPath}`);
