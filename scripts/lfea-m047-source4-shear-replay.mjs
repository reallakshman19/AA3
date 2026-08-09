#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  frameLocalStiffness,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../src/core/linear-fea-frame-element/index.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const SOURCE_ID = '4';
const KAPPA = 0.53;
const KAPPA_SOURCE = 'COWPER-1966-THIN-ANNULUS-INPUT';
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const COMPONENTS = Object.freeze(['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);

export function buildM047Source4ShearReplay(report) {
  requireReport(report);
  const referenceCases = new Map(report.cases.map((entry) => [entry.caseId, entry]));
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const referenceCase = referenceCases.get(caseId);
    const ledger = report.mechanics.cases?.[caseId]?.elementLedger;
    if (!referenceCase || !Array.isArray(ledger)) throw new TypeError(`Missing ${caseId} reference/mechanics evidence.`);
    const sourceElements = ledger.filter((entry) => String(entry.sourceElementId) === SOURCE_ID);
    if (sourceElements.length !== 1 || sourceElements[0].kind !== 'FRAME') {
      throw new TypeError(`${caseId} source 4 must remain exactly one plain FRAME element; found ${sourceElements.length}.`);
    }
    cases[caseId] = replayCase({ report, caseId, referenceCase, element: sourceElements[0] });
  }

  const base = {
    schema: 'lfea-m047-source4-shear-replay/v1',
    issueId: 'M047',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: report.source.sha256,
    sourceElementId: SOURCE_ID,
    method: Object.freeze({
      parentEvidence: 'M047-I012 SOURCE_ACTION_DECOMPOSITION',
      baselineMechanicsCommit: '882d59a99c3a03847d20bec34770ba57ff479d91',
      boundaryCondition: 'CAESAR six-DOF displacement/rotation at source 4 FROM/TO nodes',
      baselineFormulation: 'PIPE_FRAME3D_EULER_BERNOULLI_V1',
      diagnosticFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
      shearCorrectionFactorY: KAPPA,
      shearCorrectionFactorZ: KAPPA,
      shearCorrectionAuthority: KAPPA_SOURCE,
      loadVectors: 'identical assembled equivalent and initial-strain vectors from baseline source 4; uniform gravity vector is phi-invariant',
      globalSolverUsed: false,
      bendMechanicsChanged: false,
      pressureMechanicsChanged: false,
      benchmarkOutputFitUsed: false,
      productionMechanicsChanged: false,
    }),
    cases: Object.freeze(cases),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function replayCase({ report, caseId, referenceCase, element }) {
  const frame = element.replayFrameRecord;
  requirePlainFrame(frame, element, caseId);
  const dGlobal = endpointDisplacement(referenceCase.referenceRows, element.nodeI, element.nodeJ);
  const dLocal = transformDisplacementToLocal(dGlobal, frame.transformation.matrix);
  const baselineLocal = element.replayEffectiveLocalStiffness;
  if (!Array.isArray(baselineLocal) || baselineLocal.length !== 144) {
    throw new TypeError(`${caseId} source 4 lacks baseline effective local stiffness.`);
  }

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
  const equivalentLocal = frame.equivalentLoadVector.local;
  const initialLocal = frame.initialStrainLoadVector.local;
  requireVector(equivalentLocal, 12, `${caseId}.equivalentLocal`);
  requireVector(initialLocal, 12, `${caseId}.initialLocal`);

  const baselineQlocal = subtract(subtract(matVec12(baselineLocal, dLocal), equivalentLocal), initialLocal);
  const timoQlocal = subtract(subtract(matVec12(timo.matrix, dLocal), equivalentLocal), initialLocal);
  const baselineQglobal = transformLoadToGlobal(baselineQlocal, frame.transformation.matrix);
  const timoQglobal = transformLoadToGlobal(timoQlocal, frame.transformation.matrix);
  const reference = sourceReferenceVector(referenceCase.referenceRows, element.nodeI, element.nodeJ);
  const rows = [];
  for (let endIndex = 0; endIndex < 2; endIndex += 1) {
    const end = endIndex === 0 ? 'FROM' : 'TO';
    for (let componentIndex = 0; componentIndex < 6; componentIndex += 1) {
      const index = endIndex * 6 + componentIndex;
      const component = COMPONENTS[componentIndex];
      const quantity = componentIndex < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`;
      const unit = componentIndex < 3 ? 'N' : 'N*m';
      const scaleFloor = report.tolerances?.[quantity]?.scaleFloor ?? (componentIndex < 3 ? 50 : 5);
      const baselineResidual = baselineQglobal[index] - reference[index];
      const timoResidual = timoQglobal[index] - reference[index];
      rows.push(Object.freeze({
        end,
        quantity,
        component,
        unit,
        referenceValue: reference[index],
        baselineValue: baselineQglobal[index],
        timoshenkoValue: timoQglobal[index],
        baselineResidual,
        timoshenkoResidual: timoResidual,
        absoluteResidualImprovement: Math.abs(baselineResidual) - Math.abs(timoResidual),
        baselineNormalizedResidual: Math.abs(baselineResidual) / Math.max(Math.abs(reference[index]), scaleFloor),
        timoshenkoNormalizedResidual: Math.abs(timoResidual) / Math.max(Math.abs(reference[index]), scaleFloor),
      }));
    }
  }

  const transverse = rows.filter((entry) => ['FY', 'FZ', 'MY', 'MZ'].includes(entry.component));
  const axial = rows.filter((entry) => entry.component === 'FX');
  return Object.freeze({
    caseId,
    fromNodeId: String(element.nodeI),
    toNodeId: String(element.nodeJ),
    kind: element.kind,
    frame: Object.freeze({
      lengthM: frame.geometry.length,
      baselineFormulationId: frame.formulationId,
      baselineShearDeformation: frame.shearDeformation,
      localAxes: frame.localAxes.axes,
      rigidOffsets: frame.rigidOffsets,
      material: frame.material,
      section: frame.section,
      diagnostic: Object.freeze({
        formulationId: 'PIPE_FRAME3D_TIMOSHENKO_V1',
        shearCorrectionFactorY: KAPPA,
        shearCorrectionFactorZ: KAPPA,
        phiXY: timo.phiXY,
        phiXZ: timo.phiXZ,
      }),
    }),
    components: Object.freeze(rows),
    summary: Object.freeze({
      baselineTransverseRmsResidual: rms(transverse.map((entry) => entry.baselineResidual)),
      timoshenkoTransverseRmsResidual: rms(transverse.map((entry) => entry.timoshenkoResidual)),
      baselineTransverseMaxAbsResidual: maxAbs(transverse.map((entry) => entry.baselineResidual)),
      timoshenkoTransverseMaxAbsResidual: maxAbs(transverse.map((entry) => entry.timoshenkoResidual)),
      baselineAxialMaxAbsResidual: maxAbs(axial.map((entry) => entry.baselineResidual)),
      timoshenkoAxialMaxAbsResidual: maxAbs(axial.map((entry) => entry.timoshenkoResidual)),
      improvedTransverseComponentCount: transverse.filter((entry) => entry.absoluteResidualImprovement > 0).length,
      worsenedTransverseComponentCount: transverse.filter((entry) => entry.absoluteResidualImprovement < 0).length,
      largestImprovements: Object.freeze([...rows]
        .sort((left, right) => right.absoluteResidualImprovement - left.absoluteResidualImprovement)
        .slice(0, 8)
        .map(compact)),
      largestRegressions: Object.freeze([...rows]
        .sort((left, right) => left.absoluteResidualImprovement - right.absoluteResidualImprovement)
        .slice(0, 8)
        .map(compact)),
    }),
  });
}

function requirePlainFrame(frame, element, caseId) {
  if (!frame || frame.schema !== 'fea-linear-frame-element/v1') throw new TypeError(`${caseId} source 4 lacks a sealed frame record.`);
  if (frame.formulationId !== 'PIPE_FRAME3D_EULER_BERNOULLI_V1' || frame.shearDeformation !== false) {
    throw new TypeError(`${caseId} source 4 baseline formulation drifted from Euler-Bernoulli.`);
  }
  if (frame.rigidOffsets?.I !== null || frame.rigidOffsets?.J !== null) throw new TypeError(`${caseId} source 4 unexpectedly carries a rigid offset.`);
  if (element.teeJunctionNodeId !== null && element.teeJunctionNodeId !== undefined) throw new TypeError(`${caseId} source 4 unexpectedly carries tee flexibility.`);
  requireVector(frame.localStiffness, 144, `${caseId}.frame.localStiffness`);
}

function endpointDisplacement(rows, nodeI, nodeJ) {
  const byNode = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || !['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) continue;
    const nodeId = String(row.entityId);
    const values = byNode.get(nodeId) ?? new Map();
    values.set(row.component, row.value);
    byNode.set(nodeId, values);
  }
  return [String(nodeI), String(nodeJ)].flatMap((nodeId) => {
    const values = byNode.get(nodeId);
    if (!values || !DOFS.every((dof) => Number.isFinite(values.get(dof)))) {
      throw new TypeError(`CAESAR reference lacks all six DOFs at node ${nodeId}.`);
    }
    return DOFS.map((dof) => values.get(dof));
  });
}

function sourceReferenceVector(rows, nodeI, nodeJ) {
  const entityId = `INPUT_ELEMENT:${SOURCE_ID}|${String(nodeI)}->${String(nodeJ)}|`;
  const result = [];
  for (const end of ['FROM', 'TO']) {
    for (let index = 0; index < 6; index += 1) {
      const component = COMPONENTS[index];
      const quantity = index < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`;
      const row = rows.find((entry) => entry.entityKind === 'ELEMENT'
        && entry.entityId === entityId && entry.quantity === quantity && entry.component === component);
      if (!row) throw new TypeError(`CAESAR reference lacks ${entityId} ${quantity}/${component}.`);
      result.push(row.value);
    }
  }
  return result;
}

function compact(entry) {
  return Object.freeze({
    end: entry.end,
    component: entry.component,
    unit: entry.unit,
    baselineResidual: entry.baselineResidual,
    timoshenkoResidual: entry.timoshenkoResidual,
    absoluteResidualImprovement: entry.absoluteResidualImprovement,
  });
}

function matVec12(matrix, vector) {
  requireVector(matrix, 144, 'matrix');
  requireVector(vector, 12, 'vector');
  const out = Array(12).fill(0);
  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 12; column += 1) out[row] += matrix[row * 12 + column] * vector[column];
  }
  return out;
}
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function rms(values) { return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(values.length, 1)); }
function maxAbs(values) { return values.reduce((best, value) => Math.max(best, Math.abs(value)), 0); }
function requireVector(value, length, field) {
  if (!Array.isArray(value) || value.length !== length || value.some((entry) => !Number.isFinite(entry))) {
    throw new TypeError(`${field} must contain ${length} finite numbers.`);
  }
}
function requireReport(report) {
  if (!report || report.source?.sha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError(`I013 requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  }
  if (!Array.isArray(report.cases) || !report.mechanics?.cases) throw new TypeError('I013 requires benchmark cases and mechanics evidence.');
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
  if (!report || !out) throw new TypeError('Usage: --report <benchmark.json> --out <source4-shear-replay.json>.');
  return { report: resolve(report), out: resolve(out) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(input.report, 'utf8'));
  const result = buildM047Source4ShearReplay(report);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  for (const caseId of ['L19', 'L20']) {
    const summary = result.cases[caseId].summary;
    process.stdout.write(`M047 I013 ${caseId}: transverse RMS ${summary.baselineTransverseRmsResidual} -> ${summary.timoshenkoTransverseRmsResidual}; max ${summary.baselineTransverseMaxAbsResidual} -> ${summary.timoshenkoTransverseMaxAbsResidual}; phi=${result.cases[caseId].frame.diagnostic.phiXY}/${result.cases[caseId].frame.diagnostic.phiXZ}\n`);
  }
  process.stdout.write(`M047 I013 evidence ${result.semanticHash}\n`);
}
