#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  frameLocalStiffness,
  transformDisplacementToLocal,
} from '../src/core/linear-fea-frame-element/index.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const KAPPA = 0.53;
const KAPPA_SOURCE = 'COWPER-1966-THIN-ANNULUS-INPUT';
const ORDINARY_MINIMUM_LENGTH_M = 0.01;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const COMPONENTS = Object.freeze(['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);
const TRANSVERSE_INDICES = Object.freeze([1, 2, 4, 5, 7, 8, 10, 11]);
const AXIAL_INDICES = Object.freeze([0, 6]);
const TORSION_INDICES = Object.freeze([3, 9]);
const LENGTH_BUCKETS = Object.freeze([
  Object.freeze({ id: 'LT_0P01_M', minimum: 0, maximum: 0.01 }),
  Object.freeze({ id: '0P01_TO_0P25_M', minimum: 0.01, maximum: 0.25 }),
  Object.freeze({ id: '0P25_TO_1_M', minimum: 0.25, maximum: 1 }),
  Object.freeze({ id: '1_TO_3_M', minimum: 1, maximum: 3 }),
  Object.freeze({ id: 'GE_3_M', minimum: 3, maximum: Number.POSITIVE_INFINITY }),
]);

export function buildM047PlainFrameShearSweep(report) {
  requireReport(report);
  const referenceCases = new Map(report.cases.map((entry) => [entry.caseId, entry]));
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const referenceCase = referenceCases.get(caseId);
    const ledger = report.mechanics.cases?.[caseId]?.elementLedger;
    if (!referenceCase || !Array.isArray(ledger)) throw new TypeError(`Missing ${caseId} reference/mechanics evidence.`);
    cases[caseId] = sweepCase(report, caseId, referenceCase, ledger);
  }

  const base = {
    schema: 'lfea-m047-plain-frame-shear-sweep/v1',
    issueId: 'M047',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: report.source.sha256,
    method: Object.freeze({
      parentEvidence: 'M047-I013 SOURCE4_SHEAR_REPLAY',
      baselineMechanicsCommit: '882d59a99c3a03847d20bec34770ba57ff479d91',
      sourceSelection: 'exactly one analysis descendant; kind FRAME; no tee modifier; no rigid offset; sealed replay frame record present',
      boundaryCondition: 'CAESAR six-DOF endpoint displacement/rotation for every selected source',
      comparisonBasis: 'element-local actions so axial projection cannot contaminate transverse residuals on oriented pipes',
      baselineFormulation: 'PIPE_FRAME3D_EULER_BERNOULLI_V1',
      diagnosticFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
      shearCorrectionFactorY: KAPPA,
      shearCorrectionFactorZ: KAPPA,
      shearCorrectionAuthority: KAPPA_SOURCE,
      ordinaryMinimumLengthM: ORDINARY_MINIMUM_LENGTH_M,
      loadVectors: 'identical baseline equivalent and initial-strain vectors; no load magnitude is refit',
      globalSolverUsed: false,
      bendMechanicsChanged: false,
      pressureMechanicsChanged: false,
      thermalAuthorityChanged: false,
      benchmarkOutputFitUsed: false,
      productionMechanicsChanged: false,
    }),
    cases: Object.freeze(cases),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function sweepCase(report, caseId, referenceCase, ledger) {
  const bySource = new Map();
  for (const entry of ledger) {
    const sourceId = String(entry.sourceElementId);
    const values = bySource.get(sourceId) ?? [];
    values.push(entry);
    bySource.set(sourceId, values);
  }

  const sources = [];
  for (const [sourceElementId, elements] of [...bySource.entries()].sort(compareSourceEntry)) {
    if (elements.length !== 1) continue;
    const element = elements[0];
    const frame = element.replayFrameRecord;
    if (element.kind !== 'FRAME' || element.teeJunctionNodeId !== null || !frame) continue;
    if (frame.rigidOffsets?.I !== null || frame.rigidOffsets?.J !== null) continue;
    sources.push(replaySource({ report, caseId, referenceCase, sourceElementId, element, frame }));
  }
  if (sources.length === 0) throw new TypeError(`${caseId} has no qualifying plain FRAME sources.`);

  const ordinary = sources.filter((entry) => entry.lengthM >= ORDINARY_MINIMUM_LENGTH_M);
  const nearZero = sources.filter((entry) => entry.lengthM < ORDINARY_MINIMUM_LENGTH_M);
  return Object.freeze({
    caseId,
    sourceCount: sources.length,
    ordinarySourceCount: ordinary.length,
    nearZeroSourceCount: nearZero.length,
    sources: Object.freeze(sources),
    population: populationSummary(sources),
    ordinaryPopulation: populationSummary(ordinary),
    nearZeroPopulation: populationSummary(nearZero),
    lengthBuckets: Object.freeze(LENGTH_BUCKETS.map((bucket) => Object.freeze({
      ...bucket,
      summary: populationSummary(sources.filter((entry) => entry.lengthM >= bucket.minimum && entry.lengthM < bucket.maximum)),
    }))),
  });
}

function replaySource({ report, caseId, referenceCase, sourceElementId, element, frame }) {
  requirePlainFrame(frame, element, caseId, sourceElementId);
  const nodeI = String(element.nodeI);
  const nodeJ = String(element.nodeJ);
  const dGlobal = endpointDisplacement(referenceCase.referenceRows, nodeI, nodeJ);
  const transformation = frame.transformation.matrix;
  const dLocal = transformDisplacementToLocal(dGlobal, transformation);
  const baselineLocal = element.replayEffectiveLocalStiffness;
  requireVector(baselineLocal, 144, `${caseId}.source${sourceElementId}.baselineLocal`);
  const equivalentLocal = frame.equivalentLoadVector.local;
  const initialLocal = frame.initialStrainLoadVector.local;
  requireVector(equivalentLocal, 12, `${caseId}.source${sourceElementId}.equivalentLocal`);
  requireVector(initialLocal, 12, `${caseId}.source${sourceElementId}.initialLocal`);

  const timo = frameLocalStiffness({
    elasticModulus: frame.material.elasticModulus,
    shearModulus: frame.material.shearModulus,
    area: frame.section.area,
    secondMomentY: frame.section.secondMomentY,
    secondMomentZ: frame.section.secondMomentZ,
    polarMoment: frame.section.polarMoment,
    length: frame.geometry.length,
    shearDeformation: true,
    shearCorrectionFactorY: KAPPA,
    shearCorrectionFactorZ: KAPPA,
  });

  const baselineLocalAction = subtract(subtract(matVec12(baselineLocal, dLocal), equivalentLocal), initialLocal);
  const timoLocalAction = subtract(subtract(matVec12(timo.matrix, dLocal), equivalentLocal), initialLocal);
  const referenceGlobalAction = sourceReferenceVector(referenceCase.referenceRows, sourceElementId, nodeI, nodeJ);
  const referenceLocalAction = transformDisplacementToLocal(referenceGlobalAction, transformation);
  const baselineResidual = subtract(baselineLocalAction, referenceLocalAction);
  const timoResidual = subtract(timoLocalAction, referenceLocalAction);

  const components = [];
  for (let endIndex = 0; endIndex < 2; endIndex += 1) {
    const end = endIndex === 0 ? 'FROM' : 'TO';
    for (let componentIndex = 0; componentIndex < 6; componentIndex += 1) {
      const index = endIndex * 6 + componentIndex;
      const component = COMPONENTS[componentIndex];
      components.push(Object.freeze({
        end,
        component,
        localDof: DOFS[componentIndex],
        unit: componentIndex < 3 ? 'N' : 'N*m',
        referenceValue: referenceLocalAction[index],
        baselineValue: baselineLocalAction[index],
        timoshenkoValue: timoLocalAction[index],
        baselineResidual: baselineResidual[index],
        timoshenkoResidual: timoResidual[index],
        absoluteResidualImprovement: Math.abs(baselineResidual[index]) - Math.abs(timoResidual[index]),
      }));
    }
  }

  const transverse = TRANSVERSE_INDICES.map((index) => ({ baseline: baselineResidual[index], timoshenko: timoResidual[index] }));
  return Object.freeze({
    sourceElementId,
    nodeI,
    nodeJ,
    lengthM: frame.geometry.length,
    phiXY: timo.phiXY,
    phiXZ: timo.phiXZ,
    materialStateId: frame.material.materialStateId,
    sectionStateId: frame.section.sectionStateId,
    localAxes: frame.localAxes.axes,
    components: Object.freeze(components),
    summary: Object.freeze({
      baselineTransverseRmsResidual: rms(transverse.map((entry) => entry.baseline)),
      timoshenkoTransverseRmsResidual: rms(transverse.map((entry) => entry.timoshenko)),
      baselineTransverseMaxAbsResidual: maxAbs(transverse.map((entry) => entry.baseline)),
      timoshenkoTransverseMaxAbsResidual: maxAbs(transverse.map((entry) => entry.timoshenko)),
      improvedTransverseComponentCount: transverse.filter((entry) => Math.abs(entry.timoshenko) < Math.abs(entry.baseline)).length,
      worsenedTransverseComponentCount: transverse.filter((entry) => Math.abs(entry.timoshenko) > Math.abs(entry.baseline)).length,
      maximumAxialResidualDelta: maxAbs(AXIAL_INDICES.map((index) => timoResidual[index] - baselineResidual[index])),
      maximumTorsionResidualDelta: maxAbs(TORSION_INDICES.map((index) => timoResidual[index] - baselineResidual[index])),
    }),
  });
}

function populationSummary(sources) {
  if (sources.length === 0) {
    return Object.freeze({
      sourceCount: 0,
      transverseComponentCount: 0,
      baselineTransverseRmsResidual: 0,
      timoshenkoTransverseRmsResidual: 0,
      baselineTransverseMaxAbsResidual: 0,
      timoshenkoTransverseMaxAbsResidual: 0,
      improvedTransverseComponentCount: 0,
      worsenedTransverseComponentCount: 0,
      improvedSourceRmsCount: 0,
      worsenedSourceRmsCount: 0,
      maximumAxialResidualDelta: 0,
      maximumTorsionResidualDelta: 0,
    });
  }
  const residuals = [];
  for (const source of sources) {
    const transverse = source.components.filter((entry) => ['FY', 'FZ', 'MY', 'MZ'].includes(entry.component));
    residuals.push(...transverse.map((entry) => ({ baseline: entry.baselineResidual, timoshenko: entry.timoshenkoResidual })));
  }
  return Object.freeze({
    sourceCount: sources.length,
    transverseComponentCount: residuals.length,
    baselineTransverseRmsResidual: rms(residuals.map((entry) => entry.baseline)),
    timoshenkoTransverseRmsResidual: rms(residuals.map((entry) => entry.timoshenko)),
    baselineTransverseMaxAbsResidual: maxAbs(residuals.map((entry) => entry.baseline)),
    timoshenkoTransverseMaxAbsResidual: maxAbs(residuals.map((entry) => entry.timoshenko)),
    improvedTransverseComponentCount: residuals.filter((entry) => Math.abs(entry.timoshenko) < Math.abs(entry.baseline)).length,
    worsenedTransverseComponentCount: residuals.filter((entry) => Math.abs(entry.timoshenko) > Math.abs(entry.baseline)).length,
    improvedSourceRmsCount: sources.filter((entry) => entry.summary.timoshenkoTransverseRmsResidual < entry.summary.baselineTransverseRmsResidual).length,
    worsenedSourceRmsCount: sources.filter((entry) => entry.summary.timoshenkoTransverseRmsResidual > entry.summary.baselineTransverseRmsResidual).length,
    maximumAxialResidualDelta: Math.max(...sources.map((entry) => entry.summary.maximumAxialResidualDelta)),
    maximumTorsionResidualDelta: Math.max(...sources.map((entry) => entry.summary.maximumTorsionResidualDelta)),
  });
}

function requirePlainFrame(frame, element, caseId, sourceElementId) {
  if (frame.schema !== 'fea-linear-frame-element/v1') throw new TypeError(`${caseId} source ${sourceElementId} lacks a sealed frame record.`);
  if (frame.formulationId !== 'PIPE_FRAME3D_EULER_BERNOULLI_V1' || frame.shearDeformation !== false) {
    throw new TypeError(`${caseId} source ${sourceElementId} baseline formulation drifted from Euler-Bernoulli.`);
  }
  if (frame.rigidOffsets?.I !== null || frame.rigidOffsets?.J !== null) throw new TypeError(`${caseId} source ${sourceElementId} carries a rigid offset.`);
  if (element.teeJunctionNodeId !== null) throw new TypeError(`${caseId} source ${sourceElementId} carries a tee modifier.`);
}

function endpointDisplacement(rows, nodeI, nodeJ) {
  const byNode = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || !['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) continue;
    const values = byNode.get(String(row.entityId)) ?? new Map();
    values.set(row.component, row.value);
    byNode.set(String(row.entityId), values);
  }
  return [nodeI, nodeJ].flatMap((nodeId) => {
    const values = byNode.get(nodeId);
    if (!values || !DOFS.every((dof) => Number.isFinite(values.get(dof)))) throw new TypeError(`CAESAR reference lacks six DOFs at node ${nodeId}.`);
    return DOFS.map((dof) => values.get(dof));
  });
}

function sourceReferenceVector(rows, sourceElementId, nodeI, nodeJ) {
  const prefix = `INPUT_ELEMENT:${sourceElementId}|${nodeI}->${nodeJ}|`;
  const identities = [...new Set(rows
    .filter((entry) => entry.entityKind === 'ELEMENT' && String(entry.entityId).startsWith(prefix))
    .map((entry) => entry.entityId))];
  if (identities.length !== 1) throw new TypeError(`CAESAR reference source ${sourceElementId} identity count is ${identities.length}.`);
  const entityId = identities[0];
  const result = [];
  for (const end of ['FROM', 'TO']) {
    for (let index = 0; index < 6; index += 1) {
      const component = COMPONENTS[index];
      const quantity = index < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`;
      const matches = rows.filter((entry) => entry.entityKind === 'ELEMENT' && entry.entityId === entityId
        && entry.quantity === quantity && entry.component === component);
      if (matches.length !== 1) throw new TypeError(`CAESAR reference ${entityId} ${quantity}/${component} count is ${matches.length}.`);
      result.push(matches[0].value);
    }
  }
  return result;
}

function compareSourceEntry([left], [right]) {
  return Number(left) - Number(right) || String(left).localeCompare(String(right));
}
function matVec12(matrix, vector) {
  requireVector(matrix, 144, 'matrix');
  requireVector(vector, 12, 'vector');
  const output = Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) for (let column = 0; column < 12; column += 1) output[row] += matrix[row * 12 + column] * vector[column];
  return output;
}
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function rms(values) { return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(values.length, 1)); }
function maxAbs(values) { return values.reduce((best, value) => Math.max(best, Math.abs(value)), 0); }
function requireVector(value, length, field) {
  if (!Array.isArray(value) || value.length !== length || value.some((entry) => !Number.isFinite(entry))) throw new TypeError(`${field} must contain ${length} finite numbers.`);
}
function requireReport(report) {
  if (!report || report.source?.sha256 !== LOCKED_ACCDB_SHA256) throw new TypeError(`I014 requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  if (!Array.isArray(report.cases) || !report.mechanics?.cases) throw new TypeError('I014 requires benchmark cases and mechanics evidence.');
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
  const report = args.get('--report');
  const out = args.get('--out');
  if (!report || !out) throw new TypeError('Usage: --report <benchmark.json> --out <plain-frame-shear-sweep.json>.');
  return { report: resolve(report), out: resolve(out) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(input.report, 'utf8'));
  const result = buildM047PlainFrameShearSweep(report);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  for (const caseId of ['L19', 'L20']) {
    const c = result.cases[caseId];
    const ordinary = c.ordinaryPopulation;
    process.stdout.write(`M047 I014 ${caseId}: plain=${c.sourceCount}, ordinary=${ordinary.sourceCount}, near-zero=${c.nearZeroSourceCount}; ordinary transverse RMS ${ordinary.baselineTransverseRmsResidual} -> ${ordinary.timoshenkoTransverseRmsResidual}; improved=${ordinary.improvedTransverseComponentCount}/${ordinary.transverseComponentCount}, worsened=${ordinary.worsenedTransverseComponentCount}; axialDelta=${ordinary.maximumAxialResidualDelta}; torsionDelta=${ordinary.maximumTorsionResidualDelta}\n`);
  }
  process.stdout.write(`M047 I014 evidence ${result.semanticHash}\n`);
}
