#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const I015_SEMANTIC_HASH = 'fnv1a64:296422c2764f7b4f';
const I014_SEMANTIC_HASH = 'fnv1a64:7ed521d0ee654c46';
const CLUSTER_SOURCE_IDS = Object.freeze(['9', '10', '11']);
const CLUSTER_INTERFACE_NODES = Object.freeze(['20170', '20220']);
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);

const args = parseArgs(process.argv.slice(2));
const baselineActual = readJson(requireArg(args, '--baseline-actual'));
const candidateActual = readJson(requireArg(args, '--candidate-actual'));
const candidateBenchmark = readJson(requireArg(args, '--candidate-benchmark'));
const i015Ab = readJson(requireArg(args, '--i015-ab'));
const i014Sweep = readJson(requireArg(args, '--i014-sweep'));
const outPath = requireArg(args, '--out');

requireSourceCustody(baselineActual, candidateActual, candidateBenchmark, i015Ab, i014Sweep);
if (i015Ab.semanticHash !== I015_SEMANTIC_HASH) {
  throw new TypeError(`I015 semantic hash drifted: ${String(i015Ab.semanticHash)}.`);
}
if (i014Sweep.semanticHash !== I014_SEMANTIC_HASH) {
  throw new TypeError(`I014 semantic hash drifted: ${String(i014Sweep.semanticHash)}.`);
}

const benchmarkCase = candidateBenchmark.cases.find((entry) => entry.caseId === 'L19');
if (!benchmarkCase || benchmarkCase.formula !== 'W+P1') throw new TypeError('I019 requires locked L19=W+P1 reference case.');
const referenceIndex = indexRows(benchmarkCase.referenceRows);
const baselineIndex = indexRows(baselineActual.cases?.L19?.rows ?? []);
const candidateIndex = indexRows(candidateActual.cases?.L19?.rows ?? []);
const tolerance = candidateBenchmark.tolerances;

const sourceReferenceRows = benchmarkCase.referenceRows.filter(isSourceActionRow);
const transitions = sourceReferenceRows.map((referenceRow) => {
  const key = resultKey(referenceRow);
  const baselineValue = requireIndexedValue(baselineIndex, key);
  const candidateValue = requireIndexedValue(candidateIndex, key);
  const rule = tolerance[referenceRow.quantity];
  if (!rule) throw new TypeError(`Missing tolerance for ${referenceRow.quantity}.`);
  const baseline = comparison(referenceRow.value, baselineValue, rule);
  const candidate = comparison(referenceRow.value, candidateValue, rule);
  return Object.freeze({
    key,
    sourceElementId: sourceId(referenceRow.entityId),
    entityId: referenceRow.entityId,
    quantity: referenceRow.quantity,
    component: referenceRow.component,
    unit: referenceRow.unit,
    referenceValue: referenceRow.value,
    baselineValue,
    candidateValue,
    candidateMinusBaseline: candidateValue - baselineValue,
    baseline,
    candidate,
  });
});

const newFailures = transitions.filter((entry) => entry.baseline.pass && !entry.candidate.pass);
const resolvedFailures = transitions.filter((entry) => !entry.baseline.pass && entry.candidate.pass);
const clusterNewFailures = newFailures
  .filter((entry) => CLUSTER_SOURCE_IDS.includes(entry.sourceElementId))
  .sort(compareTransition);

if (clusterNewFailures.length !== 6 || clusterNewFailures.some((entry) => entry.component !== 'MZ')) {
  throw new Error(`Expected six new sources 9-11 MZ failures; found ${JSON.stringify(clusterNewFailures)}.`);
}
if (newFailures.length !== 6) {
  throw new Error(`Expected the six 9-11 MZ rows to be the complete L19 new-failure set; found ${newFailures.length}.`);
}

const ledger = candidateActual.mechanics?.cases?.L19?.elementLedger;
if (!Array.isArray(ledger)) throw new TypeError('Candidate L19 mechanics ledger is missing.');
const sourceMechanics = Object.fromEntries(CLUSTER_SOURCE_IDS.map((id) => {
  const entries = ledger.filter((entry) => String(entry.sourceElementId) === id);
  if (entries.length === 0) throw new TypeError(`Candidate mechanics ledger lacks source ${id}.`);
  const i015CandidateSelected = entries.length === 1
    && entries[0].kind === 'FRAME'
    && entries[0].teeJunctionNodeId === null;
  return [id, Object.freeze({
    sourceElementId: id,
    analysisElementCount: entries.length,
    kinds: Object.freeze([...new Set(entries.map((entry) => entry.kind))].sort()),
    endpoints: Object.freeze({
      fromNode: String(entries[0].nodeI),
      toNode: String(entries.at(-1).nodeJ),
    }),
    teeJunctionNodeIds: Object.freeze([...new Set(entries
      .map((entry) => entry.teeJunctionNodeId)
      .filter((value) => value !== null)
      .map(String))].sort()),
    i015CandidateSelected,
  })];
}));

if (sourceMechanics['9'].i015CandidateSelected
  || !sourceMechanics['10'].i015CandidateSelected
  || sourceMechanics['11'].i015CandidateSelected) {
  throw new Error(`I015 cluster mutation custody drifted: ${JSON.stringify(sourceMechanics)}.`);
}

const interfaceContinuity = [
  interfaceRecord('9', 'TO', '10', 'FROM', '20170'),
  interfaceRecord('10', 'TO', '11', 'FROM', '20220'),
];

for (const entry of interfaceContinuity) {
  for (const field of ['referenceClosureNm', 'baselineClosureNm', 'candidateClosureNm']) {
    if (Math.abs(entry[field]) > 1e-6) {
      throw new Error(`I019 interface ${entry.nodeId} ${field} exceeded 1e-6 N*m: ${entry[field]}.`);
    }
  }
  if (Math.abs(entry.candidateDeltaClosureNm) > 1e-6) {
    throw new Error(`I019 interface ${entry.nodeId} candidate delta closure exceeded 1e-6 N*m.`);
  }
}

const nodeState = Object.fromEntries(
  ['20160', ...CLUSTER_INTERFACE_NODES, '20230'].map((nodeId) => [nodeId, nodeRecord(nodeId)]),
);
for (const nodeId of CLUSTER_INTERFACE_NODES) {
  const rz = nodeState[nodeId].RZ;
  if (!(rz.candidateAbsoluteError < rz.baselineAbsoluteError)) {
    throw new Error(`I019 expected RZ at interface ${nodeId} to move toward CAESAR.`);
  }
}

const i014L19 = i014Sweep.cases?.L19;
const i014Source10 = i014L19?.sources?.find((entry) => String(entry.sourceElementId) === '10');
if (!i014Source10) throw new TypeError('I014 evidence lacks source 10.');
if (i014Source10.summary?.improvedTransverseComponentCount !== 8
  || i014Source10.summary?.worsenedTransverseComponentCount !== 0) {
  throw new Error(`I014 source-10 fixed-CAESAR replay no longer has 8/8 transverse improvements.`);
}

const base = {
  schema: 'lfea-m047-i019-source-action-cluster/v1',
  issueId: 'M047',
  iterationId: 'M047-I019',
  sourceAccdbSha256: LOCKED_ACCDB_SHA256,
  parentEvidence: Object.freeze({
    i014: Object.freeze({
      semanticHash: i014Sweep.semanticHash,
      source10: Object.freeze({
        nodeI: i014Source10.nodeI,
        nodeJ: i014Source10.nodeJ,
        lengthM: i014Source10.lengthM,
        phiXY: i014Source10.phiXY,
        phiXZ: i014Source10.phiXZ,
        baselineTransverseRmsResidual: i014Source10.summary.baselineTransverseRmsResidual,
        timoshenkoTransverseRmsResidual: i014Source10.summary.timoshenkoTransverseRmsResidual,
        improvedTransverseComponentCount: i014Source10.summary.improvedTransverseComponentCount,
        worsenedTransverseComponentCount: i014Source10.summary.worsenedTransverseComponentCount,
      }),
      interpretation: 'FIXED_CAESAR_ENDPOINT_DOF_LOCAL_CONSTITUTIVE_REPLAY',
    }),
    i015: Object.freeze({
      semanticHash: i015Ab.semanticHash,
      interpretation: 'LOCKED_SYSTEM_AB_SOLVED_STATE',
      sourceEndActionFailureCountBefore: i015Ab.cases.L19.before.sourceEndAction.failingComponentCount,
      sourceEndActionFailureCountAfter: i015Ab.cases.L19.after.sourceEndAction.failingComponentCount,
      sourceEndActionRmsBefore: i015Ab.cases.L19.before.sourceEndAction.rmsNormalizedError,
      sourceEndActionRmsAfter: i015Ab.cases.L19.after.sourceEndAction.rmsNormalizedError,
    }),
  }),
  findings: Object.freeze({
    newFailureCount: newFailures.length,
    resolvedFailureCount: resolvedFailures.length,
    clusterNewFailures: Object.freeze(clusterNewFailures),
    sourceMechanics: Object.freeze(sourceMechanics),
    interfaceContinuity: Object.freeze(interfaceContinuity),
    nodeState: Object.freeze(nodeState),
  }),
  interpretation: Object.freeze({
    classification: 'SYSTEM_STATE_REDISTRIBUTION_ACROSS_CONNECTED_9_10_11_PATH',
    localConstitutiveRegressionSupported: false,
    rationale: Object.freeze([
      'Only source 10 is inside the I015 plain-FRAME/no-tee mutation boundary; sources 9 and 11 are not modified by I015.',
      'All six threshold crossings are MZ rows on the connected 9-10-11 path and close as equal-and-opposite interface action pairs.',
      'The MZ action shift is transmitted through source 9 (tee-modified FRAME), source 10 (I015-selected FRAME), and source 11 (REDUCER), proving a solved-state redistribution rather than six independent component defects.',
      'At fixed CAESAR endpoint DOFs, I014 source 10 improved all eight local transverse end-action components with zero transverse regressions.',
      'At both shared interfaces, solved I015 RZ moves closer to the CAESAR reference even while the global MZ threshold crosses, so a simple endpoint-rotation degradation is falsified.',
      'This custody finding does not prove the final architecture or authorize tee/reducer propagation; it narrows follow-up to the first upstream system DOF/component where redistribution diverges.',
    ]),
    productionMechanicsChanged: false,
    toleranceChanged: false,
    benchmarkTargetFitted: false,
  }),
};
const output = Object.freeze({ ...base, semanticHash: semanticHash(base) });

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  semanticHash: output.semanticHash,
  newFailureCount: newFailures.length,
  resolvedFailureCount: resolvedFailures.length,
  clusterSourceKinds: Object.fromEntries(CLUSTER_SOURCE_IDS.map((id) => [id, sourceMechanics[id].kinds])),
  i015SelectedSources: CLUSTER_SOURCE_IDS.filter((id) => sourceMechanics[id].i015CandidateSelected),
  interfaceContinuity,
  source10FixedDofReplay: output.parentEvidence.i014.source10,
}, null, 2));

function interfaceRecord(leftId, leftEnd, rightId, rightEnd, nodeId) {
  const left = requireTransition(leftId, leftEnd, 'MZ');
  const right = requireTransition(rightId, rightEnd, 'MZ');
  return Object.freeze({
    nodeId,
    left: `${leftId}:${leftEnd}:MZ`,
    right: `${rightId}:${rightEnd}:MZ`,
    referenceClosureNm: left.referenceValue + right.referenceValue,
    baselineClosureNm: left.baselineValue + right.baselineValue,
    candidateClosureNm: left.candidateValue + right.candidateValue,
    leftCandidateDeltaNm: left.candidateMinusBaseline,
    rightCandidateDeltaNm: right.candidateMinusBaseline,
    candidateDeltaClosureNm: left.candidateMinusBaseline + right.candidateMinusBaseline,
  });
}

function nodeRecord(nodeId) {
  return Object.freeze(Object.fromEntries(DOFS.map((dof) => {
    const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
    const key = ['NODE', nodeId, quantity, dof].join('|');
    const referenceValue = requireIndexedValue(referenceIndex, key);
    const baselineValue = requireIndexedValue(baselineIndex, key);
    const candidateValue = requireIndexedValue(candidateIndex, key);
    return [dof, Object.freeze({
      unit: dof.startsWith('U') ? 'm' : 'rad',
      referenceValue,
      baselineValue,
      candidateValue,
      candidateMinusBaseline: candidateValue - baselineValue,
      baselineAbsoluteError: Math.abs(baselineValue - referenceValue),
      candidateAbsoluteError: Math.abs(candidateValue - referenceValue),
      absoluteErrorImprovement: Math.abs(baselineValue - referenceValue) - Math.abs(candidateValue - referenceValue),
    })];
  })));
}

function requireTransition(id, end, component) {
  const quantity = component.startsWith('M') ? `GLOBAL_END_MOMENT_${end}` : `GLOBAL_END_FORCE_${end}`;
  const match = transitions.find((entry) =>
    entry.sourceElementId === String(id) && entry.quantity === quantity && entry.component === component);
  if (!match) throw new TypeError(`Missing source transition ${id}:${end}:${component}.`);
  return match;
}

function comparison(referenceValue, actualValue, rule) {
  const absoluteError = Math.abs(actualValue - referenceValue);
  const denominator = Math.max(Math.abs(referenceValue), Number(rule.scaleFloor ?? 0));
  const normalizedError = denominator > 0 ? absoluteError / denominator : absoluteError;
  const allowed = Number(rule.absolute ?? 0) + Number(rule.relative ?? 0) * denominator;
  return Object.freeze({
    absoluteError,
    normalizedError,
    allowedAbsoluteError: allowed,
    pass: absoluteError <= allowed + 1e-12,
  });
}

function isSourceActionRow(row) {
  return row.entityKind === 'ELEMENT'
    && String(row.entityId).startsWith('INPUT_ELEMENT:')
    && /^GLOBAL_END_(FORCE|MOMENT)_(FROM|TO)$/.test(row.quantity);
}
function sourceId(entityId) {
  const match = /^INPUT_ELEMENT:([^|]+)\|/.exec(String(entityId));
  if (!match) throw new TypeError(`Cannot parse source element id from ${entityId}.`);
  return match[1];
}
function indexRows(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = resultKey(row);
    if (result.has(key)) throw new TypeError(`Duplicate result row ${key}.`);
    result.set(key, Number(row.value));
  }
  return result;
}
function resultKey(row) {
  return [row.entityKind, String(row.entityId), row.quantity, row.component].join('|');
}
function requireIndexedValue(index, key) {
  const value = index.get(key);
  if (!Number.isFinite(value)) throw new TypeError(`Missing finite result row ${key}.`);
  return value;
}
function requireSourceCustody(...documents) {
  for (const document of documents) {
    const hash = String(document.sourceAccdbSha256 ?? document.source?.sha256 ?? '').toLowerCase();
    if (hash !== LOCKED_ACCDB_SHA256) {
      throw new TypeError(`I019 source custody drifted: ${hash || '<missing>'}.`);
    }
  }
}
function compareTransition(left, right) {
  const sourceDelta = Number(left.sourceElementId) - Number(right.sourceElementId);
  if (sourceDelta !== 0) return sourceDelta;
  return left.quantity.localeCompare(right.quantity) || left.component.localeCompare(right.component);
}
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
