#!/usr/bin/env node
/**
 * BM4_L source-element reference-displacement replay.
 *
 * For each physical ACCDB source element, statically condense the exact sealed
 * LFEA analysis-element chain. First replay LFEA's own source-end displacements
 * to prove the condensation/report path. Then impose CAESAR's source-end
 * displacement/rotation vector and predict source end actions with the same
 * stiffness and generated fixed/initial loads. A CAESAR mismatch therefore
 * identifies a component/load formulation difference independently of global
 * solver equilibrium and independently of the surrounding model response.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const ACTIONS = Object.freeze([
  ['GLOBAL_END_FORCE_FROM', 'FX', 0], ['GLOBAL_END_FORCE_FROM', 'FY', 1], ['GLOBAL_END_FORCE_FROM', 'FZ', 2],
  ['GLOBAL_END_MOMENT_FROM', 'MX', 3], ['GLOBAL_END_MOMENT_FROM', 'MY', 4], ['GLOBAL_END_MOMENT_FROM', 'MZ', 5],
  ['GLOBAL_END_FORCE_TO', 'FX', 6], ['GLOBAL_END_FORCE_TO', 'FY', 7], ['GLOBAL_END_FORCE_TO', 'FZ', 8],
  ['GLOBAL_END_MOMENT_TO', 'MX', 9], ['GLOBAL_END_MOMENT_TO', 'MY', 10], ['GLOBAL_END_MOMENT_TO', 'MZ', 11],
]);

export function buildSourceReplay({ actual, report, caseId = 'L2' }) {
  requireSchema(actual, 'lfea-accdb-benchmark-actual/v1', 'actual');
  requireSchema(report, 'lfea-caesar-accdb-benchmark-report/v1', 'report');
  if (actual.sourceAccdbSha256 !== report.source?.sha256) throw new TypeError('Actual/report source hash mismatch.');
  const evidence = actual.mechanics?.cases?.[caseId];
  if (!evidence || !Array.isArray(evidence.recoveryLedger)) throw new TypeError(`Missing ${caseId} recovery ledger.`);
  if (!evidence.recoveryLedger.every((row) => matrix12(row.globalStiffness))) {
    throw new TypeError(`${caseId} recovery ledger does not retain every sealed 12x12 global stiffness matrix.`);
  }
  const comparisonRows = report.qualification?.cases?.find((row) => row.caseId === caseId)?.comparison?.rows;
  if (!Array.isArray(comparisonRows)) throw new TypeError(`Missing ${caseId} comparison rows.`);

  const sourceDefinitions = sourceDefinitionsFromRows(comparisonRows);
  const referenceNodeU = nodeVectors(comparisonRows, 'referenceValue');
  const actualNodeU = nodeVectors(comparisonRows, 'actualValue');
  const restrainedNodes = new Set(comparisonRows
    .filter((row) => row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity))
    .map((row) => String(row.entityId)));
  const kindByAnalysisElement = new Map((evidence.elementLedger ?? []).map((row) => [String(row.elementId), String(row.kind ?? 'UNKNOWN')]));
  const bySource = groupBy(evidence.recoveryLedger, (row) => String(row.sourceElementId));

  const results = [];
  for (const definition of sourceDefinitions.values()) {
    const chain = bySource.get(definition.sourceElementId) ?? [];
    if (chain.length === 0) {
      results.push({ sourceElementId: definition.sourceElementId, status: 'SKIP_NO_ANALYSIS_CHAIN' });
      continue;
    }
    const topology = classifyTopology(chain.map((row) => kindByAnalysisElement.get(String(row.elementId)) ?? 'UNKNOWN'));
    const nodes = orderedUnique(chain.flatMap((row) => [String(row.nodeI), String(row.nodeJ)]));
    if (!nodes.includes(definition.fromNode) || !nodes.includes(definition.toNode)) {
      results.push({ sourceElementId: definition.sourceElementId, topology, status: 'SKIP_SOURCE_ENDPOINT_MISMATCH', nodes, definition });
      continue;
    }
    const internalNodes = nodes.filter((nodeId) => nodeId !== definition.fromNode && nodeId !== definition.toNode);
    const externallyRestrainedInternalNodes = internalNodes.filter((nodeId) => restrainedNodes.has(nodeId));
    if (externallyRestrainedInternalNodes.length > 0) {
      results.push({
        sourceElementId: definition.sourceElementId,
        topology,
        status: 'SKIP_INTERNAL_RESTRAINT',
        internalNodes: externallyRestrainedInternalNodes,
      });
      continue;
    }
    const referenceFrom = referenceNodeU.get(definition.fromNode);
    const referenceTo = referenceNodeU.get(definition.toNode);
    const actualFrom = actualNodeU.get(definition.fromNode);
    const actualTo = actualNodeU.get(definition.toNode);
    if (![referenceFrom, referenceTo, actualFrom, actualTo].every((value) => Array.isArray(value) && value.length === 6)) {
      results.push({ sourceElementId: definition.sourceElementId, topology, status: 'SKIP_ENDPOINT_DISPLACEMENT_MISSING' });
      continue;
    }

    const system = assembleSourceSystem(chain, nodes);
    const currentReplay = replaySource(system, definition, [...actualFrom, ...actualTo]);
    const referenceReplay = replaySource(system, definition, [...referenceFrom, ...referenceTo]);
    const reportedActual = actionVector(comparisonRows, definition.entityId, 'actualValue');
    const reportedReference = actionVector(comparisonRows, definition.entityId, 'referenceValue');
    if (!reportedActual || !reportedReference) {
      results.push({ sourceElementId: definition.sourceElementId, topology, status: 'SKIP_SOURCE_ACTION_MISSING' });
      continue;
    }
    const currentClosure = compareVectors(currentReplay.outerAction, reportedActual);
    const referenceCompatibility = compareVectors(referenceReplay.outerAction, reportedReference);
    results.push({
      sourceElementId: definition.sourceElementId,
      entityId: definition.entityId,
      fromNode: definition.fromNode,
      toNode: definition.toNode,
      topology,
      analysisElementCount: chain.length,
      internalNodeCount: internalNodes.length,
      status: 'COMPARED',
      currentReplay: {
        maximumAbsoluteDifference: currentClosure.maximumAbsoluteDifference,
        maximumRelativeDifference: currentClosure.maximumRelativeDifference,
        worstComponent: currentClosure.worstComponent,
      },
      caesarReferenceReplay: {
        maximumAbsoluteDifference: referenceCompatibility.maximumAbsoluteDifference,
        maximumRelativeDifference: referenceCompatibility.maximumRelativeDifference,
        worstComponent: referenceCompatibility.worstComponent,
        predictedOuterAction: referenceReplay.outerAction,
        referenceOuterAction: reportedReference,
      },
    });
  }

  const compared = results.filter((row) => row.status === 'COMPARED');
  const currentReplayWorst = maximum(compared, (row) => row.currentReplay.maximumAbsoluteDifference);
  const ranked = compared.slice().sort((left, right) =>
    finiteRank(right.caesarReferenceReplay.maximumRelativeDifference) - finiteRank(left.caesarReferenceReplay.maximumRelativeDifference)
    || right.caesarReferenceReplay.maximumAbsoluteDifference - left.caesarReferenceReplay.maximumAbsoluteDifference
    || compareText(left.sourceElementId, right.sourceElementId));
  const byTopology = {};
  for (const row of compared) {
    const bucket = byTopology[row.topology] ??= { sourceCount: 0, worstAbsoluteDifference: 0, worstRelativeDifference: 0, worstSourceElementId: null };
    bucket.sourceCount += 1;
    if (row.caesarReferenceReplay.maximumAbsoluteDifference > bucket.worstAbsoluteDifference) {
      bucket.worstAbsoluteDifference = row.caesarReferenceReplay.maximumAbsoluteDifference;
      bucket.worstSourceElementId = row.sourceElementId;
    }
    bucket.worstRelativeDifference = Math.max(bucket.worstRelativeDifference, finiteRank(row.caesarReferenceReplay.maximumRelativeDifference));
  }

  return {
    schema: 'lfea-bm4l-source-reference-replay/v1',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: actual.sourceAccdbSha256,
    caseId,
    stiffnessStateHash: evidence.stiffnessStateHash,
    sourceElementCount: sourceDefinitions.size,
    comparedSourceElementCount: compared.length,
    skippedSourceElementCount: results.length - compared.length,
    currentReplayProof: {
      worstSourceElementId: currentReplayWorst?.sourceElementId ?? null,
      maximumAbsoluteDifference: currentReplayWorst?.currentReplay.maximumAbsoluteDifference ?? null,
      status: (currentReplayWorst?.currentReplay.maximumAbsoluteDifference ?? Infinity) <= 1e-5 ? 'PASS' : 'FAIL',
    },
    topologyCompatibility: byTopology,
    rankedReferenceCompatibility: ranked,
    sources: results,
  };
}

function sourceDefinitionsFromRows(rows) {
  const result = new Map();
  const expression = /^INPUT_ELEMENT:([^|]+)\|([^|]+)->([^|]+)\|/;
  for (const row of rows) {
    if (row.entityKind !== 'ELEMENT' || !String(row.quantity).startsWith('GLOBAL_END_')) continue;
    const match = expression.exec(String(row.entityId));
    if (!match) continue;
    const [, sourceElementId, fromNode, toNode] = match;
    const prior = result.get(sourceElementId);
    const definition = { sourceElementId, entityId: String(row.entityId), fromNode, toNode };
    if (prior && JSON.stringify(prior) !== JSON.stringify(definition)) throw new TypeError(`Conflicting source identity for element ${sourceElementId}.`);
    result.set(sourceElementId, definition);
  }
  return result;
}

function nodeVectors(rows, field) {
  const values = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE') continue;
    let index = -1;
    if (row.quantity === 'DISPLACEMENT') index = DOFS.indexOf(row.component);
    else if (row.quantity === 'ROTATION') index = DOFS.indexOf(row.component);
    if (index < 0) continue;
    const nodeId = String(row.entityId);
    if (!values.has(nodeId)) values.set(nodeId, Array(6).fill(null));
    values.get(nodeId)[index] = finite(row[field], `${field}:${nodeId}:${row.quantity}:${row.component}`);
  }
  return values;
}

function actionVector(rows, entityId, field) {
  const vector = Array(12).fill(null);
  for (const [quantity, component, index] of ACTIONS) {
    const row = rows.find((candidate) => candidate.entityKind === 'ELEMENT'
      && String(candidate.entityId) === entityId && candidate.quantity === quantity && candidate.component === component);
    if (!row) return null;
    vector[index] = finite(row[field], `${field}:${entityId}:${quantity}:${component}`);
  }
  return vector;
}

function assembleSourceSystem(chain, nodes) {
  const nodeIndex = new Map(nodes.map((nodeId, index) => [nodeId, index]));
  const n = nodes.length * 6;
  const K = Array.from({ length: n }, () => Array(n).fill(0));
  const f = Array(n).fill(0);
  for (const element of chain) {
    const ke = element.globalStiffness;
    const fe = element.equivalentLoadGlobal.map((value, index) => Number(value) + Number(element.initialStrainLoadGlobal[index]));
    const elementNodes = [String(element.nodeI), String(element.nodeJ)];
    const map = [];
    for (const nodeId of elementNodes) {
      const start = nodeIndex.get(nodeId) * 6;
      for (let dof = 0; dof < 6; dof += 1) map.push(start + dof);
    }
    for (let local = 0; local < 12; local += 1) {
      f[map[local]] += Number(fe[local]);
      for (let local2 = 0; local2 < 12; local2 += 1) K[map[local]][map[local2]] += Number(ke[local][local2]);
    }
  }
  return { K, f, nodes, nodeIndex };
}

function replaySource(system, definition, boundaryVector) {
  const boundaryDofs = [definition.fromNode, definition.toNode].flatMap((nodeId) => {
    const start = system.nodeIndex.get(nodeId) * 6;
    return Array.from({ length: 6 }, (_value, index) => start + index);
  });
  const boundarySet = new Set(boundaryDofs);
  const internalDofs = Array.from({ length: system.K.length }, (_value, index) => index).filter((index) => !boundarySet.has(index));
  const displacement = Array(system.K.length).fill(0);
  boundaryDofs.forEach((globalIndex, index) => { displacement[globalIndex] = boundaryVector[index]; });
  if (internalDofs.length > 0) {
    const A = internalDofs.map((row) => internalDofs.map((col) => system.K[row][col]));
    const b = internalDofs.map((row) => {
      let rhs = system.f[row];
      for (let index = 0; index < boundaryDofs.length; index += 1) rhs -= system.K[row][boundaryDofs[index]] * boundaryVector[index];
      return rhs;
    });
    const solved = solveDense(A, b);
    internalDofs.forEach((globalIndex, index) => { displacement[globalIndex] = solved[index]; });
  }
  const action = multiply(system.K, displacement).map((value, index) => value - system.f[index]);
  const outerAction = boundaryDofs.map((globalIndex) => action[globalIndex]);
  return { displacement, outerAction };
}

function solveDense(matrix, rhs) {
  const n = rhs.length;
  const A = matrix.map((row, index) => [...row, rhs[index]]);
  let scale = 0;
  for (const row of matrix) for (const value of row) scale = Math.max(scale, Math.abs(value));
  const pivotFloor = Math.max(1, scale) * 1e-13;
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    if (Math.abs(A[pivot][col]) <= pivotFloor) throw new Error(`Source condensation is singular at pivot ${col}: ${A[pivot][col]}.`);
    [A[col], A[pivot]] = [A[pivot], A[col]];
    const diagonal = A[col][col];
    for (let row = col + 1; row < n; row += 1) {
      const factor = A[row][col] / diagonal;
      if (factor === 0) continue;
      A[row][col] = 0;
      for (let j = col + 1; j <= n; j += 1) A[row][j] -= factor * A[col][j];
    }
  }
  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let value = A[row][n];
    for (let col = row + 1; col < n; col += 1) value -= A[row][col] * x[col];
    x[row] = value / A[row][row];
  }
  return x;
}

function compareVectors(predicted, expected) {
  let maximumAbsoluteDifference = 0;
  let maximumRelativeDifference = 0;
  let worstComponent = null;
  for (let index = 0; index < predicted.length; index += 1) {
    const absoluteDifference = Math.abs(predicted[index] - expected[index]);
    const relativeDifference = Math.abs(expected[index]) > 1e-12 ? absoluteDifference / Math.abs(expected[index]) : null;
    if (absoluteDifference > maximumAbsoluteDifference) {
      maximumAbsoluteDifference = absoluteDifference;
      worstComponent = { index, predicted: predicted[index], expected: expected[index], absoluteDifference, relativeDifference };
    }
    if (relativeDifference !== null) maximumRelativeDifference = Math.max(maximumRelativeDifference, relativeDifference);
  }
  return { maximumAbsoluteDifference, maximumRelativeDifference, worstComponent };
}

function multiply(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function matrix12(value) {
  return Array.isArray(value) && value.length === 12 && value.every((row) => Array.isArray(row) && row.length === 12 && row.every(Number.isFinite));
}

function classifyTopology(kinds) {
  if (kinds.some((kind) => kind.startsWith('BEND_'))) return 'BEND';
  if (kinds.some((kind) => kind === 'RIGID')) return 'RIGID';
  if (kinds.some((kind) => kind.startsWith('REDUCER'))) return 'REDUCER';
  if (kinds.some((kind) => kind.includes('TEE'))) return 'TEE_ADJACENT';
  if (kinds.every((kind) => kind === 'FRAME')) return 'STRAIGHT';
  return [...new Set(kinds)].sort(compareText).join('+') || 'UNKNOWN';
}

function groupBy(values, keyOf) {
  const result = new Map();
  for (const value of values) {
    const key = keyOf(value);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  }
  return result;
}

function orderedUnique(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) ? false : (seen.add(value), true));
}

function maximum(values, score) {
  let best = null;
  for (const value of values) if (best === null || score(value) > score(best)) best = value;
  return best;
}

function finiteRank(value) {
  return Number.isFinite(value) ? value : -Infinity;
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return number;
}

function requireSchema(value, schema, label) {
  if (value?.schema !== schema) throw new TypeError(`${label} must use ${schema}.`);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function parseArguments(argv) {
  const args = { actualPath: null, reportPath: null, caseId: 'L2', outPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--actual') args.actualPath = value, index += 1;
    else if (flag === '--report') args.reportPath = value, index += 1;
    else if (flag === '--case') args.caseId = value, index += 1;
    else if (flag === '--out') args.outPath = value, index += 1;
    else throw new TypeError(`Unknown argument ${flag}.`);
  }
  if (!args.actualPath || !args.reportPath) throw new TypeError('Usage: --actual <actual.json> --report <report.json> [--case L2] [--out replay.json]');
  return args;
}

function readJson(path, label) {
  try { return JSON.parse(readFileSync(resolve(path), 'utf8')); }
  catch (error) { throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error }); }
}

function main(argv) {
  const args = parseArguments(argv);
  const result = buildSourceReplay({ actual: readJson(args.actualPath, 'actual'), report: readJson(args.reportPath, 'report'), caseId: args.caseId });
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (args.outPath) writeFileSync(resolve(args.outPath), serialized, 'utf8');
  else process.stdout.write(serialized);
  if (result.currentReplayProof.status !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
