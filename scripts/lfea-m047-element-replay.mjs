#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const ACTION_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);
const PIVOT_RELATIVE_TOLERANCE = 1e-12;

export function buildM047ElementReplay(report) {
  requireReport(report);
  const referenceCases = new Map(report.cases.map((entry) => [entry.caseId, entry]));
  const mechanicsCases = report.mechanics?.cases ?? {};
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const referenceCase = referenceCases.get(caseId);
    if (!referenceCase) throw new TypeError(`Benchmark report is missing reference case ${caseId}.`);
    const ledger = mechanicsCases[caseId]?.elementLedger;
    if (!Array.isArray(ledger) || ledger.length === 0) {
      throw new TypeError(`Mechanics case ${caseId} is missing replay-instrumented element ledger.`);
    }
    cases[caseId] = replayCase(report, caseId, referenceCase.referenceRows, ledger);
  }
  const base = {
    schema: 'lfea-m047-element-replay/v1',
    issueId: 'M047',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: report.source.sha256,
    method: Object.freeze({
      displacementAuthority: 'CAESAR_REFERENCE_NODE_DISPLACEMENT_AND_ROTATION',
      constitutiveEquation: 'q_global = K_global d_global - equivalentLoadGlobal - initialStrainLoadGlobal',
      internalNodeRule: 'ZERO_EXTERNAL_LOAD_STATIC_CONDENSATION',
      globalSolverUsed: false,
      benchmarkOutputFitUsed: false,
    }),
    cases: Object.freeze(cases),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function replayCase(report, caseId, referenceRows, ledger) {
  const displacement = referenceDisplacementMap(referenceRows);
  const sourceReferences = sourceActionReferences(referenceRows);
  const grouped = groupBySourceElement(ledger);
  const sourceRows = [];
  const skipped = [];
  for (const [sourceElementId, elements] of [...grouped].sort(compareSourceIds)) {
    const reference = sourceReferences.get(sourceElementId);
    if (!reference) {
      skipped.push({ sourceElementId, reason: 'NO_CAESAR_SOURCE_END_ACTION_REFERENCE' });
      continue;
    }
    try {
      const replay = replaySource(report, caseId, sourceElementId, elements, reference, displacement);
      sourceRows.push(replay);
    } catch (error) {
      skipped.push({ sourceElementId, reason: error.code ?? 'REPLAY_ERROR', detail: error.message });
    }
  }
  return Object.freeze({
    caseId,
    replayedSourceCount: sourceRows.length,
    skippedSourceCount: skipped.length,
    summary: summarizeSources(sourceRows),
    tracked: Object.freeze({
      source4: sourceRows.find((entry) => entry.sourceElementId === '4') ?? null,
      source5: sourceRows.find((entry) => entry.sourceElementId === '5') ?? null,
    }),
    sources: Object.freeze(sourceRows),
    skipped: Object.freeze(skipped),
  });
}

function replaySource(report, caseId, sourceElementId, elements, reference, displacement) {
  for (const element of elements) requireReplayContribution(element, sourceElementId);
  const endpoints = [reference.fromNodeId, reference.toNodeId];
  const nodeIds = unique(elements.flatMap((entry) => [String(entry.nodeI), String(entry.nodeJ)]));
  const incidence = new Map(nodeIds.map((nodeId) => [nodeId, 0]));
  for (const element of elements) {
    incidence.set(String(element.nodeI), incidence.get(String(element.nodeI)) + 1);
    incidence.set(String(element.nodeJ), incidence.get(String(element.nodeJ)) + 1);
  }
  const topologicalBoundary = [...incidence].filter(([, count]) => count === 1).map(([nodeId]) => nodeId).sort();
  if (!endpoints.every((nodeId) => nodeIds.includes(nodeId))) {
    throw replayError('SOURCE_ENDPOINT_NOT_IN_ANALYSIS_SUBSTRUCTURE', `Source ${sourceElementId} endpoints ${endpoints.join('->')} are not both present in analysis nodes.`);
  }
  if (topologicalBoundary.length !== 2 || !endpoints.every((nodeId) => topologicalBoundary.includes(nodeId))) {
    throw replayError('SOURCE_SUBSTRUCTURE_BOUNDARY_NOT_TWO_ENDPOINTS', `Source ${sourceElementId} has topological boundary ${JSON.stringify(topologicalBoundary)} instead of ${JSON.stringify(endpoints)}.`);
  }
  for (const nodeId of endpoints) {
    if (!displacement.has(nodeId)) throw replayError('CAESAR_ENDPOINT_DOF_MISSING', `Source ${sourceElementId} endpoint ${nodeId} lacks CAESAR six-DOF reference.`);
  }

  const internalNodeIds = nodeIds.filter((nodeId) => !endpoints.includes(nodeId)).sort(compareNodeIds);
  const orderedNodeIds = [...endpoints, ...internalNodeIds];
  const nodeOffset = new Map(orderedNodeIds.map((nodeId, index) => [nodeId, index * 6]));
  const size = orderedNodeIds.length * 6;
  const stiffness = zeros(size, size);
  const freeLoad = Array(size).fill(0);
  for (const element of elements) assembleElement(stiffness, freeLoad, nodeOffset, element);

  const boundaryDofs = Array.from({ length: 12 }, (_, index) => index);
  const internalDofs = Array.from({ length: size - 12 }, (_, index) => index + 12);
  const displacementVector = Array(size).fill(0);
  const from = displacement.get(reference.fromNodeId);
  const to = displacement.get(reference.toNodeId);
  [...from, ...to].forEach((value, index) => { displacementVector[index] = value; });

  if (internalDofs.length > 0) {
    const kii = submatrix(stiffness, internalDofs, internalDofs);
    const kib = submatrix(stiffness, internalDofs, boundaryDofs);
    const rhs = internalDofs.map((globalIndex, row) => freeLoad[globalIndex] - dot(kib[row], displacementVector.slice(0, 12)));
    const solvedInternal = solveLinearSystem(kii, rhs, `source ${sourceElementId} case ${caseId}`);
    solvedInternal.forEach((value, index) => { displacementVector[internalDofs[index]] = value; });
  }

  const nodalAction = matVec(stiffness, displacementVector).map((value, index) => value - freeLoad[index]);
  const replayVector = [...nodalAction.slice(0, 6), ...nodalAction.slice(6, 12)];
  const referenceVector = reference.vector;
  const residual = replayVector.map((value, index) => value - referenceVector[index]);
  const componentRows = residual.map((value, index) => {
    const end = index < 6 ? 'FROM' : 'TO';
    const localIndex = index % 6;
    const component = ACTION_COMPONENTS[localIndex];
    const quantity = localIndex < 3 ? `GLOBAL_END_FORCE_${end}` : `GLOBAL_END_MOMENT_${end}`;
    const tolerance = report.tolerances[quantity];
    if (!tolerance || !Number.isFinite(tolerance.scaleFloor) || tolerance.scaleFloor <= 0) {
      throw replayError('REPLAY_TOLERANCE_MISSING', `Missing positive scale floor for ${quantity}.`);
    }
    const scale = Math.max(Math.abs(referenceVector[index]), tolerance.scaleFloor);
    return Object.freeze({
      end,
      quantity,
      component,
      unit: localIndex < 3 ? 'N' : 'N*m',
      replayValue: replayVector[index],
      referenceValue: referenceVector[index],
      residual: value,
      normalizedResidual: Math.abs(value) / scale,
    });
  });
  return Object.freeze({
    sourceElementId,
    fromNodeId: reference.fromNodeId,
    toNodeId: reference.toNodeId,
    analysisElementCount: elements.length,
    internalNodeCount: internalNodeIds.length,
    analysisElementKinds: Object.freeze(unique(elements.map((entry) => entry.kind)).sort()),
    maximumNormalizedResidual: Math.max(...componentRows.map((entry) => entry.normalizedResidual)),
    rmsNormalizedResidual: Math.sqrt(componentRows.reduce((sum, entry) => sum + entry.normalizedResidual ** 2, 0) / componentRows.length),
    components: Object.freeze(componentRows),
  });
}

function requireReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new TypeError('Benchmark report must be an object.');
  if (report.source?.sha256 !== LOCKED_ACCDB_SHA256) throw new TypeError(`Element replay requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  if (!Array.isArray(report.cases) || !report.mechanics?.cases) throw new TypeError('Benchmark report is missing cases/mechanics evidence.');
}

function requireReplayContribution(element, sourceElementId) {
  const contribution = element.replayElementContribution;
  if (!contribution || !Array.isArray(contribution.globalStiffness) || contribution.globalStiffness.length !== 144) {
    throw replayError('REPLAY_INSTRUMENTATION_MISSING', `Source ${sourceElementId} element ${element.elementId} lacks 144-entry global stiffness.`);
  }
  for (const field of ['equivalentLoadGlobal', 'initialStrainLoadGlobal']) {
    if (!Array.isArray(contribution[field]) || contribution[field].length !== 12) {
      throw replayError('REPLAY_INSTRUMENTATION_MISSING', `Source ${sourceElementId} element ${element.elementId} lacks 12-entry ${field}.`);
    }
  }
}

function referenceDisplacementMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || !['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) continue;
    const nodeId = String(row.entityId);
    const current = map.get(nodeId) ?? new Map();
    current.set(row.component, row.value);
    map.set(nodeId, current);
  }
  const result = new Map();
  for (const [nodeId, components] of map) {
    if (DOFS.every((dof) => Number.isFinite(components.get(dof)))) {
      result.set(nodeId, DOFS.map((dof) => components.get(dof)));
    }
  }
  return result;
}

function sourceActionReferences(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'ELEMENT' || !row.quantity.startsWith('GLOBAL_END_')) continue;
    const parsed = parseSourceEntityId(row.entityId);
    if (!parsed) continue;
    const current = groups.get(parsed.sourceElementId) ?? {
      sourceElementId: parsed.sourceElementId,
      fromNodeId: parsed.fromNodeId,
      toNodeId: parsed.toNodeId,
      values: new Map(),
    };
    if (current.fromNodeId !== parsed.fromNodeId || current.toNodeId !== parsed.toNodeId) {
      throw new TypeError(`Source ${parsed.sourceElementId} changes endpoint identity across reference rows.`);
    }
    current.values.set(`${row.quantity}:${row.component}`, row.value);
    groups.set(parsed.sourceElementId, current);
  }
  const result = new Map();
  for (const [sourceElementId, group] of groups) {
    const vector = [];
    for (const end of ['FROM', 'TO']) {
      for (const component of ACTION_COMPONENTS) {
        const type = component.startsWith('F') ? 'FORCE' : 'MOMENT';
        const key = `GLOBAL_END_${type}_${end}:${component}`;
        const value = group.values.get(key);
        if (!Number.isFinite(value)) throw new TypeError(`Source ${sourceElementId} is missing reference ${key}.`);
        vector.push(value);
      }
    }
    result.set(sourceElementId, Object.freeze({ ...group, vector: Object.freeze(vector) }));
  }
  return result;
}

function parseSourceEntityId(value) {
  const match = /^INPUT_ELEMENT:([^|]+)\|([^|]+)->([^|]+)\|$/u.exec(String(value));
  return match ? { sourceElementId: match[1], fromNodeId: match[2], toNodeId: match[3] } : null;
}

function groupBySourceElement(ledger) {
  const map = new Map();
  for (const element of ledger) {
    const sourceElementId = String(element.sourceElementId);
    const current = map.get(sourceElementId) ?? [];
    current.push(element);
    map.set(sourceElementId, current);
  }
  return map;
}

function assembleElement(stiffness, freeLoad, nodeOffset, element) {
  const contribution = element.replayElementContribution;
  const starts = [nodeOffset.get(String(element.nodeI)), nodeOffset.get(String(element.nodeJ))];
  if (starts.some((value) => value === undefined)) throw new TypeError(`Element ${element.elementId} has unindexed node.`);
  const dofs = [...Array(6).keys()].map((i) => starts[0] + i).concat([...Array(6).keys()].map((i) => starts[1] + i));
  for (let localRow = 0; localRow < 12; localRow += 1) {
    const globalRow = dofs[localRow];
    freeLoad[globalRow] += contribution.equivalentLoadGlobal[localRow] + contribution.initialStrainLoadGlobal[localRow];
    for (let localColumn = 0; localColumn < 12; localColumn += 1) {
      stiffness[globalRow][dofs[localColumn]] += contribution.globalStiffness[localRow * 12 + localColumn];
    }
  }
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
      throw replayError('SOURCE_INTERNAL_STIFFNESS_SINGULAR', `${label}: singular/ill-conditioned internal stiffness at column ${column}.`);
    }
    if (pivot !== column) [a[column], a[pivot]] = [a[pivot], a[column]];
    const pivotValue = a[column][column];
    for (let row = column + 1; row < n; row += 1) {
      const factor = a[row][column] / pivotValue;
      if (factor === 0) continue;
      a[row][column] = 0;
      for (let j = column + 1; j <= n; j += 1) a[row][j] -= factor * a[column][j];
    }
  }
  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let value = a[row][n];
    for (let column = row + 1; column < n; column += 1) value -= a[row][column] * x[column];
    x[row] = value / a[row][row];
  }
  if (x.some((value) => !Number.isFinite(value))) throw replayError('SOURCE_INTERNAL_SOLVE_NONFINITE', `${label}: internal solve returned non-finite values.`);
  return x;
}

function summarizeSources(sources) {
  if (sources.length === 0) return Object.freeze({ sourceCount: 0, maximum: null, top: Object.freeze([]) });
  const ranked = [...sources].sort((a, b) => b.maximumNormalizedResidual - a.maximumNormalizedResidual || compareSourceIds([a.sourceElementId], [b.sourceElementId]));
  return Object.freeze({
    sourceCount: sources.length,
    maximum: Object.freeze({ sourceElementId: ranked[0].sourceElementId, maximumNormalizedResidual: ranked[0].maximumNormalizedResidual }),
    top: Object.freeze(ranked.slice(0, 20).map((entry) => Object.freeze({
      sourceElementId: entry.sourceElementId,
      fromNodeId: entry.fromNodeId,
      toNodeId: entry.toNodeId,
      analysisElementCount: entry.analysisElementCount,
      internalNodeCount: entry.internalNodeCount,
      maximumNormalizedResidual: entry.maximumNormalizedResidual,
      rmsNormalizedResidual: entry.rmsNormalizedResidual,
    }))),
  });
}

function replayError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function zeros(rows, columns) { return Array.from({ length: rows }, () => Array(columns).fill(0)); }
function submatrix(matrix, rows, columns) { return rows.map((row) => columns.map((column) => matrix[row][column])); }
function matVec(matrix, vector) { return matrix.map((row) => dot(row, vector)); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function unique(values) { return [...new Set(values)]; }
function compareNodeIds(left, right) { return Number(left) - Number(right) || String(left).localeCompare(String(right)); }
function compareSourceIds([left], [right]) { return Number(left) - Number(right) || String(left).localeCompare(String(right)); }

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
  if (!report || !out) throw new TypeError('Usage: --report <benchmark.json> --out <element-replay.json>.');
  return { report: resolve(report), out: resolve(out) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(input.report, 'utf8'));
  const result = buildM047ElementReplay(report);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  for (const caseId of ['L19', 'L20']) {
    const value = result.cases[caseId];
    process.stdout.write(`M047 element replay ${caseId}: ${value.replayedSourceCount} sources; max normalized residual=${value.summary.maximum?.maximumNormalizedResidual ?? 'n/a'}\n`);
    for (const sourceId of ['4', '5']) {
      const tracked = value.sources.find((entry) => entry.sourceElementId === sourceId);
      if (tracked) process.stdout.write(`  source ${sourceId}: max=${tracked.maximumNormalizedResidual}, rms=${tracked.rmsNormalizedResidual}, analysisElements=${tracked.analysisElementCount}\n`);
    }
  }
  process.stdout.write(`M047 element replay evidence: ${result.semanticHash}\n`);
}
