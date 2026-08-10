#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSourceReplay } from './lfea-m047-bm4l-source-replay.mjs';

const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const MM_TO_M = 0.001;

const args = parseArgs(process.argv.slice(2));
const actual = readJson(args.actual);
const report = readJson(args.report);
const tables = readJson(args.tables);
const caseId = args.case ?? 'L2';
const rows = report.qualification?.cases?.find((entry) => entry.caseId === caseId)?.comparison?.rows;
if (!Array.isArray(rows)) throw new TypeError(`Missing ${caseId} comparison rows.`);

const elements = tables.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
const bends = tables.tables?.INPUT_BENDS?.rows;
const coordinates = tables.tables?.INPUT_NODAL_COORDINATES?.rows;
if (![elements, bends, coordinates].every(Array.isArray)) {
  throw new TypeError('Bend diagnostic requires INPUT_BASIC_ELEMENT_DATA, INPUT_BENDS and INPUT_NODAL_COORDINATES.');
}
if (actual.sourceAccdbSha256 !== tables.source?.sha256 || actual.sourceAccdbSha256 !== report.source?.sha256) {
  throw new TypeError('Actual/report/table source hashes do not match.');
}

const positionByNode = buildPositions(coordinates);
const bendByPointer = new Map(bends.map((row) => [Number(row.BEND_PTR), row]));
const outgoingByFromNode = groupBy(elements, (row) => String(row.FROM_NODE));
const baselineReplay = buildSourceReplay({ actual, report, caseId });
const diagnostics = [];

for (const entering of elements.filter((row) => Number(row.BEND_PTR) > 0)) {
  const sourceElementId = String(entering.ELEMENTID);
  const pointer = Number(entering.BEND_PTR);
  if (!bendByPointer.has(pointer)) throw new TypeError(`Missing INPUT_BENDS pointer ${pointer}.`);
  const outgoing = outgoingByFromNode.get(String(entering.TO_NODE)) ?? [];
  if (outgoing.length !== 1) throw new TypeError(`BEND_PTR ${pointer} requires one outgoing element; found ${outgoing.length}.`);
  const geometry = bendGeometry(entering, outgoing[0], bendByPointer.get(pointer), positionByNode);
  const baseSource = requireComparedSource(baselineReplay, sourceElementId);
  const failureRows = rows.filter((row) => row.entityKind === 'ELEMENT'
    && String(row.entityId).startsWith(`INPUT_ELEMENT:${sourceElementId}|`)
    && String(row.quantity).startsWith('GLOBAL_END_')
    && row.status === 'FAIL')
    .map((row) => ({ quantity: row.quantity, component: row.component, unit: row.unit,
      referenceValue: row.referenceValue, actualValue: row.actualValue }));

  const asIntersectionReport = structuredClone(report);
  transportReferenceNodeDisplacement(
    asIntersectionReport,
    caseId,
    String(entering.TO_NODE),
    geometry.intersectionToFarOffsetM,
  );
  const intersectionReplay = buildSourceReplay({ actual, report: asIntersectionReport, caseId });
  const intersectionSource = requireComparedSource(intersectionReplay, sourceElementId);

  const sensitivity = endpointSensitivity({
    actual,
    report,
    caseId,
    sourceElementId,
    fromNode: String(entering.FROM_NODE),
    toNode: String(entering.TO_NODE),
    baselineSource: baseSource,
  });

  const baselineMismatch = baseSource.caesarReferenceReplay.maximumAbsoluteDifference;
  const transportedMismatch = intersectionSource.caesarReferenceReplay.maximumAbsoluteDifference;
  diagnostics.push({
    sourceElementId,
    bendPointer: pointer,
    outgoingSourceElementId: String(outgoing[0].ELEMENTID),
    geometry,
    literalFailedSourceRows: failureRows,
    caesarFarPointReplay: summarizeReplay(baseSource.caesarReferenceReplay),
    hypotheticalIfReportedNodeWereTheoreticalIntersection: {
      transportRule: 'u_far = u_intersection + theta x (far - intersection)',
      ...summarizeReplay(intersectionSource.caesarReferenceReplay),
      mismatchRatioToAsReported: baselineMismatch > 0 ? transportedMismatch / baselineMismatch : null,
    },
    pointConventionDecision: transportedMismatch < 0.5 * baselineMismatch
      ? 'THEORETICAL_INTERSECTION_HYPOTHESIS_REQUIRES_REVIEW'
      : 'CAESAR_FAR_POINT_CONVENTION_SUPPORTED_OVER_INTERSECTION_HYPOTHESIS',
    endpointReferenceDeltaSensitivity: sensitivity,
  });
}

const result = {
  schema: 'm047-bm4l-bend-point-replay-diagnostics/v1',
  classification: 'DIAGNOSTIC_ONLY_NO_MECHANICS_CHANGE',
  caseId,
  sourceAccdbSha256: actual.sourceAccdbSha256,
  referenceConventionAuthority: {
    source: 'HEXAGON_CAESAR_II_APPLICATIONS_GUIDE_BEND_DEFINITION',
    rule: 'The To node of the element entering a bend is geometrically at the bend far-point for stress and displacement output.',
  },
  replayCurrentClosure: baselineReplay.currentReplayProof,
  bends: diagnostics,
};
writeFileSync(resolve(args.out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

function endpointSensitivity(input) {
  const endpointNodes = [input.fromNode, input.toNode];
  const allActual = structuredClone(input.report);
  for (const nodeId of endpointNodes) copyNodeActualToReference(allActual, input.caseId, nodeId);
  const allActualReplay = buildSourceReplay({ actual: input.actual, report: allActual, caseId: input.caseId });
  const allActualSource = requireComparedSource(allActualReplay, input.sourceElementId);
  const baseAction = allActualSource.caesarReferenceReplay.predictedOuterAction;
  const entries = [];
  for (const [nodeIndex, nodeId] of endpointNodes.entries()) {
    for (const dof of DOFS) {
      const candidate = structuredClone(allActual);
      restoreOriginalReferenceDof(candidate, input.report, input.caseId, nodeId, dof);
      const replay = buildSourceReplay({ actual: input.actual, report: candidate, caseId: input.caseId });
      const source = requireComparedSource(replay, input.sourceElementId);
      const action = source.caesarReferenceReplay.predictedOuterAction;
      const contribution = action.map((value, index) => value - baseAction[index]);
      const row = nodeResultRow(input.report, input.caseId, nodeId, dof);
      entries.push({
        end: nodeIndex === 0 ? 'FROM' : 'TO',
        nodeId,
        dof,
        referenceMinusActual: Number(row.referenceValue) - Number(row.actualValue),
        maximumAbsoluteActionContribution: maximumAbsolute(contribution),
        actionContributionL2Norm: Math.hypot(...contribution),
        actionContribution: contribution,
      });
    }
  }
  entries.sort((left, right) => right.maximumAbsoluteActionContribution - left.maximumAbsoluteActionContribution
    || compareText(`${left.end}:${left.dof}`, `${right.end}:${right.dof}`));
  return {
    basis: 'Start from LFEA endpoint motion; replace one endpoint DOF at a time with the CAESAR reference value and replay the same condensed source stiffness/load state.',
    topDrivers: entries.slice(0, 6),
    allDofs: entries,
  };
}

function transportReferenceNodeDisplacement(report, caseId, nodeId, offset) {
  const rotation = DOFS.slice(3).map((dof) => Number(nodeResultRow(report, caseId, nodeId, dof).referenceValue));
  const translation = DOFS.slice(0, 3).map((dof) => Number(nodeResultRow(report, caseId, nodeId, dof).referenceValue));
  const transported = add(translation, cross(rotation, offset));
  for (let index = 0; index < 3; index += 1) {
    nodeResultRow(report, caseId, nodeId, DOFS[index]).referenceValue = transported[index];
  }
}

function copyNodeActualToReference(report, caseId, nodeId) {
  for (const dof of DOFS) {
    const row = nodeResultRow(report, caseId, nodeId, dof);
    row.referenceValue = row.actualValue;
  }
}

function restoreOriginalReferenceDof(targetReport, originalReport, caseId, nodeId, dof) {
  nodeResultRow(targetReport, caseId, nodeId, dof).referenceValue =
    nodeResultRow(originalReport, caseId, nodeId, dof).referenceValue;
}

function nodeResultRow(report, caseId, nodeId, dof) {
  const quantity = dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION';
  const rows = report.qualification?.cases?.find((entry) => entry.caseId === caseId)?.comparison?.rows ?? [];
  const matches = rows.filter((row) => row.entityKind === 'NODE' && String(row.entityId) === nodeId
    && row.quantity === quantity && row.component === dof);
  if (matches.length !== 1) throw new TypeError(`Expected one ${caseId} ${nodeId} ${dof} row; found ${matches.length}.`);
  return matches[0];
}

function bendGeometry(entering, outgoing, declaration, positions) {
  const start = requirePosition(positions, entering.FROM_NODE);
  const intersection = requirePosition(positions, entering.TO_NODE);
  const outletEnd = requirePosition(positions, outgoing.TO_NODE);
  const incomingDirection = unit(subtract(intersection, start));
  const outgoingDirection = unit(subtract(outletEnd, intersection));
  const bendAngleRadians = Math.acos(clamp(dot(incomingDirection, outgoingDirection), -1, 1));
  const radiusM = Number(declaration.RADIUS) * MM_TO_M;
  const tangentLengthM = radiusM * Math.tan(bendAngleRadians / 2);
  const nearPointM = subtract(intersection, scale(incomingDirection, tangentLengthM));
  const farPointM = add(intersection, scale(outgoingDirection, tangentLengthM));
  return {
    fromNode: String(entering.FROM_NODE),
    sourceToNode: String(entering.TO_NODE),
    radiusM,
    bendAngleDegrees: bendAngleRadians * 180 / Math.PI,
    tangentLengthM,
    sourceFromPointM: start,
    theoreticalIntersectionM: intersection,
    nearPointM,
    farPointM,
    intersectionToFarOffsetM: subtract(farPointM, intersection),
    incomingDirection,
    outgoingDirection,
  };
}

function buildPositions(rows) {
  const result = new Map();
  for (const row of rows) {
    setPosition(result, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]);
    setPosition(result, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]);
  }
  return result;
}

function setPosition(map, nodeId, raw) {
  const point = raw.map((value) => Number(value) * MM_TO_M);
  const key = String(nodeId);
  const prior = map.get(key);
  if (prior && maximumAbsolute(prior.map((value, index) => value - point[index])) > 1e-9) {
    throw new TypeError(`Conflicting coordinates for node ${key}.`);
  }
  map.set(key, point);
}

function requirePosition(map, nodeId) {
  const point = map.get(String(nodeId));
  if (!point) throw new TypeError(`Missing coordinate for node ${nodeId}.`);
  return point;
}

function requireComparedSource(replay, sourceElementId) {
  const row = replay.sources.find((entry) => entry.sourceElementId === String(sourceElementId));
  if (!row || row.status !== 'COMPARED') throw new TypeError(`Source ${sourceElementId} was not replay-compared.`);
  return row;
}

function summarizeReplay(value) {
  return {
    maximumAbsoluteDifference: value.maximumAbsoluteDifference,
    maximumRelativeDifference: value.maximumRelativeDifference,
    worstComponent: value.worstComponent,
  };
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid CLI argument near ${String(key)}.`);
    result[key.slice(2)] = value;
  }
  for (const required of ['actual', 'report', 'tables', 'out']) {
    if (!result[required]) throw new TypeError(`Missing --${required}.`);
  }
  return result;
}

function readJson(path) { return JSON.parse(readFileSync(resolve(path), 'utf8').replace(/^\uFEFF/, '')); }
function groupBy(values, key) { const map = new Map(); for (const value of values) { const k = key(value); if (!map.has(k)) map.set(k, []); map.get(k).push(value); } return map; }
function unit(vector) { const n = Math.hypot(...vector); if (!(n > 0)) throw new TypeError('Zero-length direction.'); return vector.map((value) => value / n); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function add(a, b) { return a.map((value, index) => value + b[index]); }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function scale(a, factor) { return a.map((value) => value * factor); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
function maximumAbsolute(values) { return Math.max(...values.map((value) => Math.abs(Number(value)))); }
function compareText(left, right) { return String(left).localeCompare(String(right), 'en', { numeric: true }); }
