#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildM047ElementReplay } from './lfea-m047-element-replay.mjs';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const ACTION_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);
const DEFAULT_SOURCE_IDS = Object.freeze(['4', '5']);
const PIVOT_RELATIVE_TOLERANCE = 1e-12;
const SUPERPOSITION_RELATIVE_TOLERANCE = 1e-10;
const SUPERPOSITION_ABSOLUTE_TOLERANCE = 1e-7;

export function buildM047SourceActionDecomposition(report, sourceIds = DEFAULT_SOURCE_IDS) {
  requireReport(report);
  const requestedSources = Object.freeze(unique(sourceIds.map(String)).sort(compareSourceIds));
  if (requestedSources.length === 0) throw new TypeError('At least one source element id is required.');

  const replay = buildM047ElementReplay(report);
  const referenceCases = new Map(report.cases.map((entry) => [entry.caseId, entry]));
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const referenceCase = referenceCases.get(caseId);
    if (!referenceCase) throw new TypeError(`Benchmark report is missing reference case ${caseId}.`);
    const displacement = referenceDisplacementMap(referenceCase.referenceRows);
    const ledger = report.mechanics?.cases?.[caseId]?.elementLedger;
    if (!Array.isArray(ledger) || ledger.length === 0) {
      throw new TypeError(`Mechanics case ${caseId} is missing replay-instrumented element ledger.`);
    }
    const replayCase = replay.cases[caseId];
    const sourceRecords = {};
    for (const sourceElementId of requestedSources) {
      const replaySource = replayCase.sources.find((entry) => entry.sourceElementId === sourceElementId);
      if (!replaySource) {
        throw new TypeError(`I008 replay has no source ${sourceElementId} in ${caseId}; decomposition refuses to infer a new reference.`);
      }
      const elements = ledger.filter((entry) => String(entry.sourceElementId) === sourceElementId);
      if (elements.length === 0) throw new TypeError(`Mechanics ledger has no source ${sourceElementId} in ${caseId}.`);
      sourceRecords[sourceElementId] = decomposeSource({
        caseId,
        sourceElementId,
        elements,
        replaySource,
        displacement,
      });
    }
    cases[caseId] = Object.freeze({
      caseId,
      sources: Object.freeze(sourceRecords),
      summary: summarizeCase(sourceRecords),
    });
  }

  const base = {
    schema: 'lfea-m047-source-action-decomposition/v1',
    issueId: 'M047',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: report.source.sha256,
    requestedSourceElementIds: requestedSources,
    method: Object.freeze({
      parentEvidence: 'M047-I008 CAESAR_ENDPOINT_SOURCE_ELEMENT_REPLAY',
      constitutiveEquation: 'q = K*d - f_equivalent - f_initial',
      decomposition: 'q_total = q_stiffness + q_equivalent + q_initial',
      stiffnessContribution: 'CAESAR boundary DOFs; zero free-load vectors; internal artificial nodes statically condensed',
      equivalentContribution: 'zero boundary DOFs; assembled equivalent-load vector only; internal artificial nodes statically condensed',
      initialContribution: 'zero boundary DOFs; assembled initial-strain-load vector only; internal artificial nodes statically condensed',
      interpretationRule: 'counterfactual omission deltas are localization evidence only and are never production mechanics authority',
      globalSolverUsed: false,
      benchmarkOutputFitUsed: false,
      productionMechanicsChanged: false,
    }),
    cases: Object.freeze(cases),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function decomposeSource({ caseId, sourceElementId, elements, replaySource, displacement }) {
  for (const element of elements) requireContribution(element, sourceElementId);
  const endpoints = [String(replaySource.fromNodeId), String(replaySource.toNodeId)];
  for (const nodeId of endpoints) {
    if (!displacement.has(nodeId)) throw new TypeError(`Source ${sourceElementId} ${caseId} endpoint ${nodeId} lacks CAESAR six-DOF displacement.`);
  }

  const nodeIds = unique(elements.flatMap((entry) => [String(entry.nodeI), String(entry.nodeJ)]));
  const incidence = new Map(nodeIds.map((nodeId) => [nodeId, 0]));
  for (const element of elements) {
    incidence.set(String(element.nodeI), incidence.get(String(element.nodeI)) + 1);
    incidence.set(String(element.nodeJ), incidence.get(String(element.nodeJ)) + 1);
  }
  const topologicalBoundary = [...incidence].filter(([, count]) => count === 1).map(([nodeId]) => nodeId).sort(compareNodeIds);
  if (topologicalBoundary.length !== 2 || !endpoints.every((nodeId) => topologicalBoundary.includes(nodeId))) {
    throw new TypeError(`Source ${sourceElementId} ${caseId} boundary ${JSON.stringify(topologicalBoundary)} disagrees with I008 endpoints ${JSON.stringify(endpoints)}.`);
  }

  const internalNodeIds = nodeIds.filter((nodeId) => !endpoints.includes(nodeId)).sort(compareNodeIds);
  const orderedNodeIds = [...endpoints, ...internalNodeIds];
  const nodeOffset = new Map(orderedNodeIds.map((nodeId, index) => [nodeId, index * 6]));
  const size = orderedNodeIds.length * 6;
  const stiffness = zeros(size, size);
  const equivalentLoad = Array(size).fill(0);
  const initialLoad = Array(size).fill(0);
  for (const element of elements) assembleElement(stiffness, equivalentLoad, initialLoad, nodeOffset, element);

  const boundaryDisplacement = Object.freeze([
    ...displacement.get(endpoints[0]),
    ...displacement.get(endpoints[1]),
  ]);
  const zeroBoundary = Object.freeze(Array(12).fill(0));
  const zeroLoad = Object.freeze(Array(size).fill(0));
  const totalLoad = Object.freeze(equivalentLoad.map((value, index) => value + initialLoad[index]));

  const qStiffness = solveBoundaryAction(stiffness, zeroLoad, boundaryDisplacement, sourceElementId, caseId, 'STIFFNESS');
  const qEquivalent = solveBoundaryAction(stiffness, equivalentLoad, zeroBoundary, sourceElementId, caseId, 'EQUIVALENT');
  const qInitial = solveBoundaryAction(stiffness, initialLoad, zeroBoundary, sourceElementId, caseId, 'INITIAL');
  const qTotal = solveBoundaryAction(stiffness, totalLoad, boundaryDisplacement, sourceElementId, caseId, 'TOTAL');
  const recomposed = qTotal.map((_, index) => qStiffness[index] + qEquivalent[index] + qInitial[index]);
  const closure = qTotal.map((value, index) => value - recomposed[index]);
  assertVectorClose(qTotal, recomposed, `Source ${sourceElementId} ${caseId} superposition closure`);

  const replayVector = replaySource.components.map((entry) => entry.replayValue);
  assertVectorClose(qTotal, replayVector, `Source ${sourceElementId} ${caseId} I008 replay reproduction`);
  const referenceVector = replaySource.components.map((entry) => entry.referenceValue);

  const components = qTotal.map((replayValue, index) => {
    const parent = replaySource.components[index];
    const residual = replayValue - referenceVector[index];
    const withoutEquivalent = qStiffness[index] + qInitial[index];
    const withoutInitial = qStiffness[index] + qEquivalent[index];
    const stiffnessOnly = qStiffness[index];
    const residualWithoutEquivalent = withoutEquivalent - referenceVector[index];
    const residualWithoutInitial = withoutInitial - referenceVector[index];
    const stiffnessOnlyResidual = stiffnessOnly - referenceVector[index];
    return Object.freeze({
      end: parent.end,
      quantity: parent.quantity,
      component: parent.component,
      unit: parent.unit,
      referenceValue: referenceVector[index],
      replayValue,
      replayResidual: residual,
      normalizedReplayResidual: parent.normalizedResidual,
      contributions: Object.freeze({
        stiffnessFromCaesarBoundaryDofs: qStiffness[index],
        equivalentLoad: qEquivalent[index],
        initialStrainLoad: qInitial[index],
      }),
      superpositionClosure: closure[index],
      counterfactuals: Object.freeze({
        withoutEquivalentLoad: Object.freeze({
          value: withoutEquivalent,
          residual: residualWithoutEquivalent,
          absoluteResidualImprovement: Math.abs(residual) - Math.abs(residualWithoutEquivalent),
        }),
        withoutInitialStrainLoad: Object.freeze({
          value: withoutInitial,
          residual: residualWithoutInitial,
          absoluteResidualImprovement: Math.abs(residual) - Math.abs(residualWithoutInitial),
        }),
        stiffnessOnly: Object.freeze({
          value: stiffnessOnly,
          residual: stiffnessOnlyResidual,
          absoluteResidualImprovement: Math.abs(residual) - Math.abs(stiffnessOnlyResidual),
        }),
      }),
    });
  });

  return Object.freeze({
    sourceElementId,
    caseId,
    fromNodeId: endpoints[0],
    toNodeId: endpoints[1],
    referenceAuthority: replaySource.referenceAuthority,
    analysisElementCount: elements.length,
    internalNodeCount: internalNodeIds.length,
    analysisElementKinds: Object.freeze(unique(elements.map((entry) => entry.kind)).sort()),
    analysisElementLedger: Object.freeze(elements.map((entry) => Object.freeze({
      elementId: entry.elementId,
      nodeI: String(entry.nodeI),
      nodeJ: String(entry.nodeJ),
      kind: entry.kind,
      pressureAxialStrain: entry.pressureAxialStrain ?? 0,
      bourdonRotationRadians: entry.bourdonRotationRadians ?? 0,
      bourdonFreeEndTranslationM: entry.bourdonFreeEndTranslationM ?? [0, 0, 0],
      gravityWeightN: entry.gravityWeightN ?? 0,
    }))),
    maximumSuperpositionClosure: Math.max(...closure.map(Math.abs)),
    components: Object.freeze(components),
    ranking: Object.freeze({
      largestReplayResiduals: rankComponents(components, (entry) => Math.abs(entry.replayResidual)),
      largestImprovementIfEquivalentOmitted: rankComponents(components, (entry) => entry.counterfactuals.withoutEquivalentLoad.absoluteResidualImprovement),
      largestImprovementIfInitialOmitted: rankComponents(components, (entry) => entry.counterfactuals.withoutInitialStrainLoad.absoluteResidualImprovement),
      largestImprovementIfOnlyStiffnessRetained: rankComponents(components, (entry) => entry.counterfactuals.stiffnessOnly.absoluteResidualImprovement),
    }),
  });
}

function solveBoundaryAction(stiffness, freeLoad, boundaryDisplacement, sourceElementId, caseId, label) {
  const size = stiffness.length;
  const boundaryDofs = Array.from({ length: 12 }, (_, index) => index);
  const internalDofs = Array.from({ length: size - 12 }, (_, index) => index + 12);
  const displacement = Array(size).fill(0);
  boundaryDisplacement.forEach((value, index) => { displacement[index] = value; });

  if (internalDofs.length > 0) {
    const kii = submatrix(stiffness, internalDofs, internalDofs);
    const kib = submatrix(stiffness, internalDofs, boundaryDofs);
    const rhs = internalDofs.map((globalIndex, row) => freeLoad[globalIndex] - dot(kib[row], boundaryDisplacement));
    const solved = solveLinearSystem(kii, rhs, `source ${sourceElementId} ${caseId} ${label}`);
    solved.forEach((value, index) => { displacement[internalDofs[index]] = value; });
  }
  const action = matVec(stiffness, displacement).map((value, index) => value - freeLoad[index]);
  return Object.freeze(action.slice(0, 12));
}

function assembleElement(stiffness, equivalentLoad, initialLoad, nodeOffset, element) {
  const contribution = element.replayElementContribution;
  const starts = [nodeOffset.get(String(element.nodeI)), nodeOffset.get(String(element.nodeJ))];
  if (starts.some((value) => value === undefined)) throw new TypeError(`Element ${element.elementId} has an unindexed node.`);
  const dofs = [...Array(6).keys()].map((index) => starts[0] + index)
    .concat([...Array(6).keys()].map((index) => starts[1] + index));
  for (let localRow = 0; localRow < 12; localRow += 1) {
    const globalRow = dofs[localRow];
    equivalentLoad[globalRow] += contribution.equivalentLoadGlobal[localRow];
    initialLoad[globalRow] += contribution.initialStrainLoadGlobal[localRow];
    for (let localColumn = 0; localColumn < 12; localColumn += 1) {
      stiffness[globalRow][dofs[localColumn]] += contribution.globalStiffness[localRow * 12 + localColumn];
    }
  }
}

function requireContribution(element, sourceElementId) {
  const contribution = element.replayElementContribution;
  if (!contribution || !Array.isArray(contribution.globalStiffness) || contribution.globalStiffness.length !== 144) {
    throw new TypeError(`Source ${sourceElementId} element ${element.elementId} lacks replay global stiffness.`);
  }
  for (const field of ['equivalentLoadGlobal', 'initialStrainLoadGlobal']) {
    if (!Array.isArray(contribution[field]) || contribution[field].length !== 12 || contribution[field].some((value) => !Number.isFinite(value))) {
      throw new TypeError(`Source ${sourceElementId} element ${element.elementId} lacks finite ${field}.`);
    }
  }
}

function referenceDisplacementMap(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || !['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) continue;
    const nodeId = String(row.entityId);
    const current = grouped.get(nodeId) ?? new Map();
    current.set(row.component, row.value);
    grouped.set(nodeId, current);
  }
  const result = new Map();
  for (const [nodeId, components] of grouped) {
    if (DOFS.every((dof) => Number.isFinite(components.get(dof)))) {
      result.set(nodeId, Object.freeze(DOFS.map((dof) => components.get(dof))));
    }
  }
  return result;
}

function summarizeCase(sourceRecords) {
  const rows = Object.values(sourceRecords).flatMap((source) => source.components.map((component) => ({
    sourceElementId: source.sourceElementId,
    ...component,
  })));
  return Object.freeze({
    sourceCount: Object.keys(sourceRecords).length,
    maximumSuperpositionClosure: Math.max(0, ...Object.values(sourceRecords).map((entry) => entry.maximumSuperpositionClosure)),
    largestReplayResiduals: Object.freeze([...rows]
      .sort((left, right) => Math.abs(right.replayResidual) - Math.abs(left.replayResidual))
      .slice(0, 12)
      .map(compactComponent)),
    largestInitialOmissionImprovements: Object.freeze([...rows]
      .sort((left, right) => right.counterfactuals.withoutInitialStrainLoad.absoluteResidualImprovement - left.counterfactuals.withoutInitialStrainLoad.absoluteResidualImprovement)
      .slice(0, 12)
      .map((entry) => Object.freeze({
        ...compactComponent(entry),
        absoluteResidualImprovement: entry.counterfactuals.withoutInitialStrainLoad.absoluteResidualImprovement,
      }))),
    largestEquivalentOmissionImprovements: Object.freeze([...rows]
      .sort((left, right) => right.counterfactuals.withoutEquivalentLoad.absoluteResidualImprovement - left.counterfactuals.withoutEquivalentLoad.absoluteResidualImprovement)
      .slice(0, 12)
      .map((entry) => Object.freeze({
        ...compactComponent(entry),
        absoluteResidualImprovement: entry.counterfactuals.withoutEquivalentLoad.absoluteResidualImprovement,
      }))),
  });
}

function rankComponents(components, score) {
  return Object.freeze([...components]
    .sort((left, right) => score(right) - score(left))
    .slice(0, 12)
    .map((entry) => Object.freeze({
      end: entry.end,
      component: entry.component,
      replayResidual: entry.replayResidual,
      score: score(entry),
    })));
}

function compactComponent(entry) {
  return Object.freeze({
    sourceElementId: entry.sourceElementId,
    end: entry.end,
    component: entry.component,
    unit: entry.unit,
    replayResidual: entry.replayResidual,
  });
}

function assertVectorClose(actual, expected, label) {
  if (actual.length !== expected.length) throw new TypeError(`${label}: vector lengths differ.`);
  for (let index = 0; index < actual.length; index += 1) {
    const tolerance = SUPERPOSITION_ABSOLUTE_TOLERANCE
      + SUPERPOSITION_RELATIVE_TOLERANCE * Math.max(Math.abs(actual[index]), Math.abs(expected[index]));
    if (Math.abs(actual[index] - expected[index]) > tolerance) {
      throw new Error(`${label}: component ${index} differs by ${actual[index] - expected[index]} beyond ${tolerance}.`);
    }
  }
}

function requireReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new TypeError('Benchmark report must be an object.');
  if (report.source?.sha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError(`Source-action decomposition requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  }
  if (!Array.isArray(report.cases) || !report.mechanics?.cases) throw new TypeError('Benchmark report is missing cases/mechanics evidence.');
}

function solveLinearSystem(matrix, rhs, label) {
  const n = rhs.length;
  if (matrix.length !== n || matrix.some((row) => row.length !== n)) throw new TypeError(`${label}: square matrix required.`);
  const a = matrix.map((row, index) => [...row, rhs[index]]);
  const scale = Math.max(1, ...matrix.flat().map(Math.abs));
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) <= PIVOT_RELATIVE_TOLERANCE * scale) {
      throw new Error(`${label}: singular/ill-conditioned internal stiffness at column ${column}.`);
    }
    if (pivot !== column) [a[column], a[pivot]] = [a[pivot], a[column]];
    const pivotValue = a[column][column];
    for (let row = column + 1; row < n; row += 1) {
      const factor = a[row][column] / pivotValue;
      if (factor === 0) continue;
      a[row][column] = 0;
      for (let next = column + 1; next <= n; next += 1) a[row][next] -= factor * a[column][next];
    }
  }
  const result = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let value = a[row][n];
    for (let column = row + 1; column < n; column += 1) value -= a[row][column] * result[column];
    result[row] = value / a[row][row];
  }
  if (result.some((value) => !Number.isFinite(value))) throw new Error(`${label}: internal solve returned non-finite values.`);
  return result;
}

function zeros(rows, columns) { return Array.from({ length: rows }, () => Array(columns).fill(0)); }
function submatrix(matrix, rows, columns) { return rows.map((row) => columns.map((column) => matrix[row][column])); }
function matVec(matrix, vector) { return matrix.map((row) => dot(row, vector)); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function unique(values) { return [...new Set(values)]; }
function compareNodeIds(left, right) { return Number(left) - Number(right) || String(left).localeCompare(String(right)); }
function compareSourceIds(left, right) { return Number(left) - Number(right) || String(left).localeCompare(String(right)); }

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
  if (!report || !out) throw new TypeError('Usage: --report <benchmark.json> --out <source-action-decomposition.json> [--sources 4,5].');
  const unknown = [...args.keys()].filter((key) => !['--report', '--out', '--sources'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  const sources = (args.get('--sources') ?? DEFAULT_SOURCE_IDS.join(','))
    .split(',').map((value) => value.trim()).filter(Boolean);
  return { report: resolve(report), out: resolve(out), sources };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(input.report, 'utf8'));
  const result = buildM047SourceActionDecomposition(report, input.sources);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  for (const caseId of ['L19', 'L20']) {
    process.stdout.write(`M047 I012 ${caseId}: evidence=${result.semanticHash}; max superposition closure=${result.cases[caseId].summary.maximumSuperpositionClosure}\n`);
    for (const sourceElementId of result.requestedSourceElementIds) {
      const source = result.cases[caseId].sources[sourceElementId];
      const worst = source.ranking.largestReplayResiduals[0];
      const initial = source.ranking.largestImprovementIfInitialOmitted[0];
      const equivalent = source.ranking.largestImprovementIfEquivalentOmitted[0];
      process.stdout.write(`  source ${sourceElementId}: worst=${worst.end}/${worst.component} residual=${worst.replayResidual}; omit-initial best=${initial.end}/${initial.component} improvement=${initial.score}; omit-equivalent best=${equivalent.end}/${equivalent.component} improvement=${equivalent.score}\n`);
    }
  }
}
