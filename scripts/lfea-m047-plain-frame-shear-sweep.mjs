#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameLocalStiffness, transformDisplacementToLocal } from '../src/core/linear-fea-frame-element/index.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const KAPPA = 0.53;
const ORDINARY_MINIMUM_LENGTH_M = 0.01;
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const COMPONENTS = Object.freeze(['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);
const TRANSVERSE = Object.freeze([1, 2, 4, 5, 7, 8, 10, 11]);
const AXIAL = Object.freeze([0, 6]);
const TORSION = Object.freeze([3, 9]);
const BUCKETS = Object.freeze([
  Object.freeze({ id: 'LT_0P01_M', minimumM: 0, maximumExclusiveM: 0.01 }),
  Object.freeze({ id: '0P01_TO_0P25_M', minimumM: 0.01, maximumExclusiveM: 0.25 }),
  Object.freeze({ id: '0P25_TO_1_M', minimumM: 0.25, maximumExclusiveM: 1 }),
  Object.freeze({ id: '1_TO_3_M', minimumM: 1, maximumExclusiveM: 3 }),
  Object.freeze({ id: 'GE_3_M', minimumM: 3, maximumExclusiveM: null }),
]);

export function buildM047PlainFrameShearSweep(report) {
  requireReport(report);
  const references = new Map(report.cases.map((entry) => [entry.caseId, entry]));
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const reference = references.get(caseId);
    const ledger = report.mechanics.cases?.[caseId]?.elementLedger;
    if (!reference || !Array.isArray(ledger)) throw new TypeError(`Missing ${caseId} reference/mechanics evidence.`);
    cases[caseId] = sweepCase(reference, ledger, caseId);
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
      shearCorrectionAuthority: 'COWPER-1966-THIN-ANNULUS-INPUT',
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

function sweepCase(reference, ledger, caseId) {
  const groups = new Map();
  for (const element of ledger) {
    const id = String(element.sourceElementId);
    const group = groups.get(id) ?? [];
    group.push(element);
    groups.set(id, group);
  }
  const sources = [];
  for (const [sourceElementId, elements] of [...groups.entries()].sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b))) {
    if (elements.length !== 1) continue;
    const element = elements[0];
    const frame = element.replayFrameRecord;
    if (element.kind !== 'FRAME' || element.teeJunctionNodeId !== null || !frame) continue;
    if (frame.rigidOffsets?.I !== null || frame.rigidOffsets?.J !== null) continue;
    sources.push(replaySource(reference, element, frame, sourceElementId, caseId));
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
    population: summarize(sources),
    ordinaryPopulation: summarize(ordinary),
    nearZeroPopulation: summarize(nearZero),
    lengthBuckets: Object.freeze(BUCKETS.map((bucket) => Object.freeze({
      ...bucket,
      summary: summarize(sources.filter((entry) => entry.lengthM >= bucket.minimumM
        && (bucket.maximumExclusiveM === null || entry.lengthM < bucket.maximumExclusiveM))),
    }))),
  });
}

function replaySource(reference, element, frame, sourceElementId, caseId) {
  if (frame.schema !== 'fea-linear-frame-element/v1'
    || frame.formulationId !== 'PIPE_FRAME3D_EULER_BERNOULLI_V1'
    || frame.shearDeformation !== false) {
    throw new TypeError(`${caseId} source ${sourceElementId} baseline frame authority drifted.`);
  }
  const nodeI = String(element.nodeI);
  const nodeJ = String(element.nodeJ);
  const T = frame.transformation.matrix;
  const dLocal = transformDisplacementToLocal(endpointDofs(reference.referenceRows, nodeI, nodeJ), T);
  const baselineK = element.replayEffectiveLocalStiffness;
  const equivalent = frame.equivalentLoadVector.local;
  const initial = frame.initialStrainLoadVector.local;
  requireVector(baselineK, 144, 'baselineK');
  requireVector(equivalent, 12, 'equivalent');
  requireVector(initial, 12, 'initial');
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
  const baseline = minus(minus(matVec(baselineK, dLocal), equivalent), initial);
  const timoshenko = minus(minus(matVec(timo.matrix, dLocal), equivalent), initial);
  const referenceLocal = transformDisplacementToLocal(referenceAction(reference.referenceRows, sourceElementId, nodeI, nodeJ), T);
  const baselineResidual = minus(baseline, referenceLocal);
  const timoshenkoResidual = minus(timoshenko, referenceLocal);
  const components = [];
  for (let endIndex = 0; endIndex < 2; endIndex += 1) {
    for (let componentIndex = 0; componentIndex < 6; componentIndex += 1) {
      const index = endIndex * 6 + componentIndex;
      components.push(Object.freeze({
        end: endIndex === 0 ? 'FROM' : 'TO',
        component: COMPONENTS[componentIndex],
        localDof: DOFS[componentIndex],
        unit: componentIndex < 3 ? 'N' : 'N*m',
        referenceValue: referenceLocal[index],
        baselineValue: baseline[index],
        timoshenkoValue: timoshenko[index],
        baselineResidual: baselineResidual[index],
        timoshenkoResidual: timoshenkoResidual[index],
        absoluteResidualImprovement: Math.abs(baselineResidual[index]) - Math.abs(timoshenkoResidual[index]),
      }));
    }
  }
  return Object.freeze({
    sourceElementId,
    nodeI,
    nodeJ,
    lengthM: frame.geometry.length,
    phiXY: timo.phiXY,
    phiXZ: timo.phiXZ,
    components: Object.freeze(components),
    summary: Object.freeze({
      baselineTransverseRmsResidual: rms(TRANSVERSE.map((i) => baselineResidual[i])),
      timoshenkoTransverseRmsResidual: rms(TRANSVERSE.map((i) => timoshenkoResidual[i])),
      baselineTransverseMaxAbsResidual: maxAbs(TRANSVERSE.map((i) => baselineResidual[i])),
      timoshenkoTransverseMaxAbsResidual: maxAbs(TRANSVERSE.map((i) => timoshenkoResidual[i])),
      improvedTransverseComponentCount: TRANSVERSE.filter((i) => Math.abs(timoshenkoResidual[i]) < Math.abs(baselineResidual[i])).length,
      worsenedTransverseComponentCount: TRANSVERSE.filter((i) => Math.abs(timoshenkoResidual[i]) > Math.abs(baselineResidual[i])).length,
      maximumAxialResidualDelta: maxAbs(AXIAL.map((i) => timoshenkoResidual[i] - baselineResidual[i])),
      maximumTorsionResidualDelta: maxAbs(TORSION.map((i) => timoshenkoResidual[i] - baselineResidual[i])),
    }),
  });
}

function summarize(sources) {
  if (sources.length === 0) return Object.freeze({
    sourceCount: 0, transverseComponentCount: 0,
    baselineTransverseRmsResidual: 0, timoshenkoTransverseRmsResidual: 0,
    baselineTransverseMaxAbsResidual: 0, timoshenkoTransverseMaxAbsResidual: 0,
    improvedTransverseComponentCount: 0, worsenedTransverseComponentCount: 0,
    improvedSourceRmsCount: 0, worsenedSourceRmsCount: 0,
    maximumAxialResidualDelta: 0, maximumTorsionResidualDelta: 0,
  });
  const pairs = sources.flatMap((source) => source.components
    .filter((entry) => ['FY', 'FZ', 'MY', 'MZ'].includes(entry.component))
    .map((entry) => [entry.baselineResidual, entry.timoshenkoResidual]));
  return Object.freeze({
    sourceCount: sources.length,
    transverseComponentCount: pairs.length,
    baselineTransverseRmsResidual: rms(pairs.map(([baseline]) => baseline)),
    timoshenkoTransverseRmsResidual: rms(pairs.map(([, timoshenko]) => timoshenko)),
    baselineTransverseMaxAbsResidual: maxAbs(pairs.map(([baseline]) => baseline)),
    timoshenkoTransverseMaxAbsResidual: maxAbs(pairs.map(([, timoshenko]) => timoshenko)),
    improvedTransverseComponentCount: pairs.filter(([baseline, timoshenko]) => Math.abs(timoshenko) < Math.abs(baseline)).length,
    worsenedTransverseComponentCount: pairs.filter(([baseline, timoshenko]) => Math.abs(timoshenko) > Math.abs(baseline)).length,
    improvedSourceRmsCount: sources.filter((entry) => entry.summary.timoshenkoTransverseRmsResidual < entry.summary.baselineTransverseRmsResidual).length,
    worsenedSourceRmsCount: sources.filter((entry) => entry.summary.timoshenkoTransverseRmsResidual > entry.summary.baselineTransverseRmsResidual).length,
    maximumAxialResidualDelta: Math.max(...sources.map((entry) => entry.summary.maximumAxialResidualDelta)),
    maximumTorsionResidualDelta: Math.max(...sources.map((entry) => entry.summary.maximumTorsionResidualDelta)),
  });
}

function endpointDofs(rows, nodeI, nodeJ) {
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

function referenceAction(rows, sourceElementId, nodeI, nodeJ) {
  const prefix = `INPUT_ELEMENT:${sourceElementId}|${nodeI}->${nodeJ}|`;
  const ids = [...new Set(rows.filter((row) => row.entityKind === 'ELEMENT' && String(row.entityId).startsWith(prefix)).map((row) => row.entityId))];
  if (ids.length !== 1) throw new TypeError(`CAESAR source ${sourceElementId} identity count is ${ids.length}.`);
  const output = [];
  for (const end of ['FROM', 'TO']) for (let i = 0; i < 6; i += 1) {
    const quantity = i < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`;
    const matches = rows.filter((row) => row.entityKind === 'ELEMENT' && row.entityId === ids[0] && row.quantity === quantity && row.component === COMPONENTS[i]);
    if (matches.length !== 1) throw new TypeError(`CAESAR ${ids[0]} ${quantity}/${COMPONENTS[i]} count is ${matches.length}.`);
    output.push(matches[0].value);
  }
  return output;
}

function matVec(matrix, vector) {
  const result = Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) for (let col = 0; col < 12; col += 1) result[row] += matrix[row * 12 + col] * vector[col];
  return result;
}
function minus(left, right) { return left.map((value, index) => value - right[index]); }
function rms(values) { return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(values.length, 1)); }
function maxAbs(values) { return values.reduce((best, value) => Math.max(best, Math.abs(value)), 0); }
function requireVector(value, length, label) { if (!Array.isArray(value) || value.length !== length || value.some((entry) => !Number.isFinite(entry))) throw new TypeError(`${label} must contain ${length} finite numbers.`); }
function requireReport(report) {
  if (!report || report.source?.sha256 !== LOCKED) throw new TypeError(`I014 requires locked ACCDB SHA-256 ${LOCKED}.`);
  if (!Array.isArray(report.cases) || !report.mechanics?.cases) throw new TypeError('I014 requires benchmark cases and mechanics evidence.');
}
function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) args.set(argv[index], argv[index + 1]);
  if (!args.get('--report') || !args.get('--out')) throw new TypeError('Usage: --report <benchmark.json> --out <plain-frame-shear-sweep.json>.');
  return { report: resolve(args.get('--report')), out: resolve(args.get('--out')) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(input.report, 'utf8'));
  const result = buildM047PlainFrameShearSweep(report);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  for (const caseId of ['L19', 'L20']) {
    const c = result.cases[caseId];
    const o = c.ordinaryPopulation;
    process.stdout.write(`M047 I014 ${caseId}: plain=${c.sourceCount}, ordinary=${o.sourceCount}, near-zero=${c.nearZeroSourceCount}; ordinary transverse RMS ${o.baselineTransverseRmsResidual} -> ${o.timoshenkoTransverseRmsResidual}; improved=${o.improvedTransverseComponentCount}/${o.transverseComponentCount}, worsened=${o.worsenedTransverseComponentCount}; axialDelta=${o.maximumAxialResidualDelta}; torsionDelta=${o.maximumTorsionResidualDelta}\n`);
  }
  process.stdout.write(`M047 I014 evidence ${result.semanticHash}\n`);
}
