#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const I015_SEMANTIC_HASH = 'fnv1a64:296422c2764f7b4f';
const CLUSTER_SOURCE_IDS = Object.freeze(['9', '10', '11']);
const OUTER_START_NODES = Object.freeze(['20160', '20230']);
const MZ_CLOSURE_TOLERANCE_NM = 1e-6;

const args = parseArgs(process.argv.slice(2));
const baselineActual = readJson(requireArg(args, '--baseline-actual'));
const candidateActual = readJson(requireArg(args, '--candidate-actual'));
const i015Ab = readJson(requireArg(args, '--i015-ab'));
const outPath = requireArg(args, '--out');

for (const document of [baselineActual, candidateActual, i015Ab]) {
  const sourceHash = String(document.sourceAccdbSha256 ?? '').toLowerCase();
  if (sourceHash !== LOCKED_ACCDB_SHA256) throw new TypeError(`I020 source custody drifted: ${sourceHash || '<missing>'}.`);
}
if (i015Ab.semanticHash !== I015_SEMANTIC_HASH) throw new TypeError(`I015 semantic hash drifted: ${i015Ab.semanticHash}.`);

const baselineIndex = indexRows(baselineActual.cases?.L19?.rows ?? []);
const candidateIndex = indexRows(candidateActual.cases?.L19?.rows ?? []);
const ledger = candidateActual.mechanics?.cases?.L19?.elementLedger;
if (!Array.isArray(ledger) || ledger.length === 0) throw new TypeError('I020 requires candidate L19 mechanics ledger.');

const sources = buildSources(ledger, candidateIndex);
const nodeIncidence = buildNodeIncidence(sources);
const nodeBalances = new Map();

const pathResults = OUTER_START_NODES.map((startNode) => Object.freeze({
  startNode,
  pathsToNearestI015SelectedSources: Object.freeze(findNearestSelectedPaths(startNode)),
}));

const selectedEndpoints = new Set(pathResults.flatMap((entry) =>
  entry.pathsToNearestI015SelectedSources.map((path) => path.selectedSourceId)));
const expectedSelected = new Set(['8', '14', '44']);
if (!setEquals(selectedEndpoints, expectedSelected)) {
  throw new Error(`I020 selected-boundary topology drifted: ${JSON.stringify([...selectedEndpoints].sort(compareIds))}.`);
}

for (const nodeId of ['20150', '20160', '20230', '20240', '21590', '21600']) {
  const balance = nodeBalance(nodeId);
  nodeBalances.set(nodeId, balance);
  if (Math.abs(balance.candidateMinusBaselineMzClosureNm) > MZ_CLOSURE_TOLERANCE_NM) {
    throw new Error(`I020 MZ delta closure exceeded ${MZ_CLOSURE_TOLERANCE_NM} N*m at node ${nodeId}: ${balance.candidateMinusBaselineMzClosureNm}.`);
  }
}

const sourceCustody = Object.fromEntries(
  ['8', '9', '10', '11', '12', '13', '14', '42', '43', '44'].map((sourceId) => {
    const source = sources.get(sourceId);
    if (!source) throw new TypeError(`I020 expected source ${sourceId} in mechanics ledger.`);
    return [sourceId, compactSource(source)];
  }),
);

const base = {
  schema: 'lfea-m047-i020-mz-boundary-trace/v1',
  issueId: 'M047',
  iterationId: 'M047-I020',
  sourceAccdbSha256: LOCKED_ACCDB_SHA256,
  parentI015SemanticHash: i015Ab.semanticHash,
  method: Object.freeze({
    observable: 'candidate L19 global MZ end action minus baseline L19 global MZ end action',
    sourceTopology: 'mechanics-ledger source boundary graph',
    selectionRule: 'I015 selected iff one analysis carrier, kind FRAME, teeJunctionNodeId null',
    traversal: 'from outer nodes of carried 9-11 cluster, block cluster sources, traverse non-selected component sources until first selected plain FRAME source',
    productionMechanicsChanged: false,
    toleranceChanged: false,
    benchmarkFitUsed: false,
  }),
  pathResults: Object.freeze(pathResults),
  sourceCustody: Object.freeze(sourceCustody),
  nodeBalances: Object.freeze(Object.fromEntries(nodeBalances)),
  interpretation: Object.freeze({
    classification: 'I015_PARTIAL_CONSTITUTIVE_BOUNDARY_REDISTRIBUTION',
    findings: Object.freeze([
      'On the tee side, the source-9 MZ shift is supplied through unmodified tee-owned sources 12 and 13 and terminates at I015-selected plain FRAME sources 8 and 14.',
      'On the reducer side, the source-11 MZ shift propagates through the unmodified reducer/bend chain 11 -> 42 -> 43 and terminates at I015-selected plain FRAME source 44.',
      'All visited physical-node MZ action deltas close to numerical tolerance, so this is redistribution through the assembled system rather than recovery imbalance.',
      'The carried 9-11 cluster therefore sits on interfaces between I015-selected ordinary pipe and special-component families intentionally excluded from the current qualification boundary.',
      'This topology supports the existing one-component-family-at-a-time propagation roadmap; it does not by itself authorize any special-component cutover.',
    ]),
    nextQualificationOrder: Object.freeze([
      'BEND_INCOMING_STRAIGHT',
      'BEND_ARC',
      'TEE_BRANCH',
      'REDUCER_STIFFNESS_AND_LOAD_CONDENSATION',
    ]),
  }),
};
const output = Object.freeze({ ...base, semanticHash: semanticHash(base) });
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  semanticHash: output.semanticHash,
  classification: output.interpretation.classification,
  pathResults: output.pathResults,
  nodeBalances: output.nodeBalances,
}, null, 2));

function findNearestSelectedPaths(startNode) {
  const queue = [{ nodeId: String(startNode), steps: [] }];
  const visitedNodes = new Set();
  const visitedSources = new Set(CLUSTER_SOURCE_IDS);
  const found = [];
  let foundDepth = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (foundDepth !== null && current.steps.length >= foundDepth) continue;
    if (visitedNodes.has(current.nodeId)) continue;
    visitedNodes.add(current.nodeId);

    for (const incident of nodeIncidence.get(current.nodeId) ?? []) {
      const sourceId = incident.sourceId;
      if (visitedSources.has(sourceId)) continue;
      const source = sources.get(sourceId);
      if (!source) continue;
      const step = Object.freeze({
        nodeId: current.nodeId,
        sourceId,
        sourceKinds: source.kinds,
        sourceSelectedByI015: source.i015CandidateSelected,
        entryEnd: incident.end,
        candidateMinusBaselineMzNm: incident.deltaMzNm,
      });
      const steps = [...current.steps, step];
      if (source.i015CandidateSelected) {
        foundDepth ??= steps.length;
        if (steps.length === foundDepth) {
          found.push(Object.freeze({
            selectedSourceId: sourceId,
            selectedSourceEndpoints: source.endpoints,
            steps: Object.freeze(steps),
          }));
        }
        continue;
      }
      visitedSources.add(sourceId);
      const oppositeNode = source.endpoints.fromNode === current.nodeId
        ? source.endpoints.toNode
        : source.endpoints.fromNode;
      queue.push({ nodeId: oppositeNode, steps });
    }
  }
  if (found.length === 0) throw new Error(`I020 found no selected source reachable from outer node ${startNode}.`);
  return found.sort((left, right) => compareIds(left.selectedSourceId, right.selectedSourceId));
}

function nodeBalance(nodeId) {
  const incident = (nodeIncidence.get(String(nodeId)) ?? []).map((entry) => Object.freeze({
    sourceId: entry.sourceId,
    end: entry.end,
    sourceKinds: sources.get(entry.sourceId)?.kinds ?? [],
    i015CandidateSelected: Boolean(sources.get(entry.sourceId)?.i015CandidateSelected),
    baselineMzNm: entry.baselineMzNm,
    candidateMzNm: entry.candidateMzNm,
    candidateMinusBaselineMzNm: entry.deltaMzNm,
  })).sort((left, right) => compareIds(left.sourceId, right.sourceId));
  if (incident.length < 2) throw new Error(`I020 node ${nodeId} has fewer than two source-boundary MZ actions.`);
  return Object.freeze({
    nodeId: String(nodeId),
    incident: Object.freeze(incident),
    baselineMzClosureNm: sum(incident.map((entry) => entry.baselineMzNm)),
    candidateMzClosureNm: sum(incident.map((entry) => entry.candidateMzNm)),
    candidateMinusBaselineMzClosureNm: sum(incident.map((entry) => entry.candidateMinusBaselineMzNm)),
  });
}

function buildSources(elements, candidateRows) {
  const grouped = new Map();
  for (const element of elements) {
    const sourceId = String(element.sourceElementId);
    if (!grouped.has(sourceId)) grouped.set(sourceId, []);
    grouped.get(sourceId).push(element);
  }
  const result = new Map();
  for (const [sourceId, entries] of grouped) {
    const degrees = new Map();
    for (const entry of entries) {
      bump(degrees, String(entry.nodeI));
      bump(degrees, String(entry.nodeJ));
    }
    const boundaries = [...degrees].filter(([, count]) => count === 1).map(([nodeId]) => nodeId);
    if (boundaries.length !== 2) continue;

    const entityId = findSourceEntityId(candidateRows, sourceId);
    if (!entityId) continue;
    const firstNode = String(entries[0].nodeI);
    const lastNode = String(entries.at(-1).nodeJ);
    const fromNode = boundaries.includes(firstNode) ? firstNode : boundaries[0];
    const toNode = boundaries.includes(lastNode) ? lastNode : boundaries.find((nodeId) => nodeId !== fromNode);
    const from = actionDelta(entityId, 'FROM');
    const to = actionDelta(entityId, 'TO');
    result.set(sourceId, Object.freeze({
      sourceId,
      entityId,
      endpoints: Object.freeze({ fromNode, toNode }),
      kinds: Object.freeze([...new Set(entries.map((entry) => entry.kind))].sort()),
      teeJunctionNodeIds: Object.freeze([...new Set(entries
        .map((entry) => entry.teeJunctionNodeId)
        .filter((value) => value !== null)
        .map(String))].sort()),
      analysisElementCount: entries.length,
      i015CandidateSelected: entries.length === 1
        && entries[0].kind === 'FRAME'
        && entries[0].teeJunctionNodeId === null,
      endActions: Object.freeze({ FROM: from, TO: to }),
    }));
  }
  return result;
}

function buildNodeIncidence(sourceMap) {
  const result = new Map();
  for (const source of sourceMap.values()) {
    for (const end of ['FROM', 'TO']) {
      const nodeId = end === 'FROM' ? source.endpoints.fromNode : source.endpoints.toNode;
      if (!result.has(nodeId)) result.set(nodeId, []);
      result.get(nodeId).push(Object.freeze({
        sourceId: source.sourceId,
        end,
        baselineMzNm: source.endActions[end].baselineMzNm,
        candidateMzNm: source.endActions[end].candidateMzNm,
        deltaMzNm: source.endActions[end].candidateMinusBaselineMzNm,
      }));
    }
  }
  return result;
}

function actionDelta(entityId, end) {
  const key = ['ELEMENT', entityId, `GLOBAL_END_MOMENT_${end}`, 'MZ'].join('|');
  const baselineMzNm = requireValue(baselineIndex, key);
  const candidateMzNm = requireValue(candidateIndex, key);
  return Object.freeze({
    baselineMzNm,
    candidateMzNm,
    candidateMinusBaselineMzNm: candidateMzNm - baselineMzNm,
  });
}

function compactSource(source) {
  return Object.freeze({
    sourceId: source.sourceId,
    endpoints: source.endpoints,
    kinds: source.kinds,
    teeJunctionNodeIds: source.teeJunctionNodeIds,
    analysisElementCount: source.analysisElementCount,
    i015CandidateSelected: source.i015CandidateSelected,
    mzDelta: Object.freeze({
      FROM: source.endActions.FROM.candidateMinusBaselineMzNm,
      TO: source.endActions.TO.candidateMinusBaselineMzNm,
    }),
  });
}

function findSourceEntityId(index, sourceId) {
  const prefix = `ELEMENT|INPUT_ELEMENT:${sourceId}|`;
  for (const key of index.keys()) {
    if (key.startsWith(prefix) && key.endsWith('|GLOBAL_END_MOMENT_FROM|MZ')) {
      return key.split('|GLOBAL_END_MOMENT_FROM|MZ')[0].slice('ELEMENT|'.length);
    }
  }
  return null;
}
function indexRows(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = [row.entityKind, String(row.entityId), row.quantity, row.component].join('|');
    if (result.has(key)) throw new TypeError(`Duplicate result row ${key}.`);
    result.set(key, Number(row.value));
  }
  return result;
}
function requireValue(index, key) {
  const value = index.get(key);
  if (!Number.isFinite(value)) throw new TypeError(`Missing finite result ${key}.`);
  return value;
}
function bump(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function setEquals(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}
function compareIds(left, right) { return Number(left) - Number(right); }
function readJson(filePath) { return JSON.parse(readFileSync(filePath, 'utf8')); }
function requireArg(values, name) {
  const value = values[name];
  if (!value) throw new TypeError(`Missing required argument ${name}.`);
  return value;
}
function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid CLI arguments near ${String(key)}.`);
    result[key] = value;
  }
  return result;
}
