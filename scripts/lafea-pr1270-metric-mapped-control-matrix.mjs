#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const casePath = 'scripts/lafea-pr1270-source-remesh-case.mjs';
const original = fs.readFileSync(casePath, 'utf8');
const candidate = makeMappedMetricControl(makeObservationFirst(original));
const family = 'T3';
const globalTarget = 30;
const acceptanceGrowth = 1.5;
const localTargets = [15, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.50, yf: 0.50 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.50 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
  { name: 'ELONGATED', width: 300, height: 90, xf: 0.50, yf: 0.50 },
];
const rows = [];

try {
  fs.writeFileSync(casePath, candidate);
  for (const localTarget of localTargets) {
    for (const scenario of scenarios) rows.push(runCase(localTarget, scenario));
  }
} finally {
  fs.writeFileSync(casePath, original);
}

const failures = rows.filter((row) => (
  row.exitCode !== 0
  || row.qualification !== 'PASS'
  || row.replayEqual !== true
  || row.replayInsertionCountEqual !== true
  || row.qualityWorstStatus === 'BLOCK'
  || row.violatingAdjacencyCount !== 0
  || !(row.maximumObserved <= acceptanceGrowth + 1e-12)
  || !(row.insertedPointCount > 0)
  || !(row.localCornerGain > 0)
  || !(row.construction?.maximumAxisIntervalRatio <= acceptanceGrowth + 1e-12)
));
const observed = rows.map((row) => row.maximumObserved).filter(Number.isFinite);
const receipt = {
  check: 'PR1270_MAPPED_METRIC_GRADING_CONTROL_V1',
  classification: 'CONTROL_PROOF_NOT_PRODUCT_MESHER',
  architecture: 'SIMULTANEOUS_TENSOR_METRIC_GRID_THEN_FIXED_DIAGONAL_TRIANGULATION',
  field: 'H(D)=MIN(H_GLOBAL,H_LOCAL+(1-1/G_MAX)*D)',
  metric: 'M(D)=INTEGRAL_0^D DS/H(S); UNIFORM_DELTA_M_PER_AXIS',
  handBound: 'ADJACENT_1D_INTERVAL_RATIO<=EXP((1-1/G_MAX)*DELTA_M)<=EXP(1/3)',
  theoreticalAxisRatioBound: Math.exp(1 / 3),
  acceptanceGrowth,
  caseCount: rows.length,
  passCount: rows.length - failures.length,
  failCount: failures.length,
  worstMaximumObserved: maxFinite(observed),
  minimumAcceptanceMargin: observed.length ? acceptanceGrowth - Math.max(...observed) : null,
  worstAxisIntervalRatio: maxFinite(rows.map((row) => row.construction?.maximumAxisIntervalRatio)),
  worstAspectRatio: maxFinite(rows.map((row) => row.construction?.maximumTriangleAspectRatio)),
  minimumScaledJacobian: minFinite(rows.map((row) => row.construction?.minimumTriangleScaledJacobian)),
  maximumChildNodes: maxFinite(rows.map((row) => row.childNodes)),
  maximumChildElements: maxFinite(rows.map((row) => row.childElements)),
  minimumLocalCornerGain: minFinite(rows.map((row) => row.localCornerGain)),
  replayFailureCaseIds: rows.filter((row) => row.replayEqual !== true || row.replayInsertionCountEqual !== true).map((row) => row.caseId),
  qualityBlockCaseIds: rows.filter((row) => row.qualityWorstStatus === 'BLOCK').map((row) => row.caseId),
  adjacencyFailureCaseIds: rows.filter((row) => !(row.maximumObserved <= acceptanceGrowth + 1e-12) || row.violatingAdjacencyCount !== 0).map((row) => row.caseId),
  deliveryFailureCaseIds: rows.filter((row) => !(row.insertedPointCount > 0) || !(row.localCornerGain > 0)).map((row) => row.caseId),
  failureCaseIds: failures.map((row) => row.caseId),
  qualification: failures.length ? 'BLOCK' : 'PASS',
  rows,
};
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/pr1270-metric-mapped-control-matrix.json', `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PR1270_METRIC_MAPPED_CONTROL=${JSON.stringify(receipt)}`);
assert.equal(failures.length, 0, `mapped metric control failed ${failures.length}/${rows.length} cases`);

function makeMappedMetricControl(source) {
  const generationStart = source.indexOf('function generateSourceRemesh(');
  const candidatesStart = source.indexOf('function gradedCandidates(', generationStart);
  assert.ok(generationStart >= 0 && candidatesStart > generationStart, 'mapped control generation anchors missing');
  const replacement = String.raw`function generateSourceRemesh(geometryValue, targets, transition, meshProfile, elementFamily, policy) {
  void meshProfile; void policy;
  if (elementFamily !== 'T3') throw new Error('PR1270_METRIC_MAPPED_CONTROL_T3_ONLY');
  if (targets.length !== 1) throw new Error('PR1270_METRIC_MAPPED_CONTROL_SINGLE_TARGET_ONLY');
  const bounds = geometryBounds(geometryValue);
  const local = transition.levels[0];
  const global = transition.levels.at(-1);
  const growth = transition.adjacentRatio;
  const target = targets[0];
  const xAxis = metricAxisCoordinates(bounds.minimumX, bounds.maximumX, target.x, local, global, growth);
  const yAxis = metricAxisCoordinates(bounds.minimumY, bounds.maximumY, target.y, local, global, growth);
  const coreElements = [];
  for (let j = 0; j < yAxis.coordinates.length - 1; j += 1) {
    for (let i = 0; i < xAxis.coordinates.length - 1; i += 1) {
      const p00 = { x: xAxis.coordinates[i], y: yAxis.coordinates[j] };
      const p10 = { x: xAxis.coordinates[i + 1], y: yAxis.coordinates[j] };
      const p11 = { x: xAxis.coordinates[i + 1], y: yAxis.coordinates[j + 1] };
      const p01 = { x: xAxis.coordinates[i], y: yAxis.coordinates[j + 1] };
      coreElements.push(Object.freeze({ elementIndex: coreElements.length, elementType: 'T3', nodes: Object.freeze([p00, p10, p11]) }));
      coreElements.push(Object.freeze({ elementIndex: coreElements.length, elementType: 'T3', nodes: Object.freeze([p00, p11, p01]) }));
    }
  }
  const construction = mappedMetricConstructionDiagnostics(xAxis, yAxis);
  const insertedPointCount = Math.max(0, (xAxis.coordinates.length - 2) * (yAxis.coordinates.length - 2));
  return Object.freeze({ mesh: weld(coreElements, elementFamily), insertedPointCount, construction });
}

function geometryBounds(geometryValue) {
  const xs = geometryValue.vertices.map((row) => row.x);
  const ys = geometryValue.vertices.map((row) => row.y);
  return {
    minimumX: Math.min(...xs), maximumX: Math.max(...xs),
    minimumY: Math.min(...ys), maximumY: Math.max(...ys),
  };
}

function metricAxisCoordinates(minimum, maximum, target, local, global, growth) {
  if (!(minimum < target && target < maximum)) throw new Error('PR1270_METRIC_TARGET_MUST_BE_INTERIOR');
  const beta = 1 - 1 / growth;
  const cutoffDistance = (global - local) / beta;
  const cutoffMetric = Math.log(global / local) / beta;
  const metricDistance = (distance) => distance <= cutoffDistance
    ? Math.log((local + beta * distance) / local) / beta
    : cutoffMetric + (distance - cutoffDistance) / global;
  const physicalDistance = (metricValue) => metricValue <= cutoffMetric
    ? local * (Math.exp(beta * metricValue) - 1) / beta
    : cutoffDistance + global * (metricValue - cutoffMetric);
  const leftMetric = metricDistance(target - minimum);
  const rightMetric = metricDistance(maximum - target);
  const totalMetric = leftMetric + rightMetric;
  const intervalCount = Math.max(1, Math.ceil(totalMetric - 64 * Number.EPSILON * Math.max(1, totalMetric)));
  const deltaMetric = totalMetric / intervalCount;
  const coordinates = [];
  for (let index = 0; index <= intervalCount; index += 1) {
    const signedMetric = -leftMetric + index * deltaMetric;
    coordinates.push(signedMetric < 0
      ? target - physicalDistance(-signedMetric)
      : target + physicalDistance(signedMetric));
  }
  coordinates[0] = minimum;
  coordinates[coordinates.length - 1] = maximum;
  const intervals = coordinates.slice(1).map((value, index) => value - coordinates[index]);
  const adjacentRatios = intervals.slice(1).map((value, index) => Math.max(value, intervals[index]) / Math.min(value, intervals[index]));
  return Object.freeze({
    coordinates: Object.freeze(coordinates), intervals: Object.freeze(intervals),
    intervalCount, totalMetric, deltaMetric, beta,
    theoreticalAdjacentRatioBound: Math.exp(beta * deltaMetric),
    maximumObservedAdjacentIntervalRatio: adjacentRatios.length ? Math.max(...adjacentRatios) : 1,
  });
}

function mappedMetricConstructionDiagnostics(xAxis, yAxis) {
  let maximumTriangleAspectRatio = 1;
  let minimumTriangleScaledJacobian = 1;
  for (const dx of xAxis.intervals) {
    for (const dy of yAxis.intervals) {
      const diagonal = Math.hypot(dx, dy);
      maximumTriangleAspectRatio = Math.max(maximumTriangleAspectRatio, diagonal / Math.min(dx, dy));
      minimumTriangleScaledJacobian = Math.min(minimumTriangleScaledJacobian, Math.min(dx, dy) / diagonal);
    }
  }
  return Object.freeze({
    xIntervalCount: xAxis.intervalCount, yIntervalCount: yAxis.intervalCount,
    xMetricStep: xAxis.deltaMetric, yMetricStep: yAxis.deltaMetric,
    xTheoreticalIntervalRatioBound: xAxis.theoreticalAdjacentRatioBound,
    yTheoreticalIntervalRatioBound: yAxis.theoreticalAdjacentRatioBound,
    xMaximumObservedIntervalRatio: xAxis.maximumObservedAdjacentIntervalRatio,
    yMaximumObservedIntervalRatio: yAxis.maximumObservedAdjacentIntervalRatio,
    maximumAxisIntervalRatio: Math.max(xAxis.maximumObservedAdjacentIntervalRatio, yAxis.maximumObservedAdjacentIntervalRatio),
    maximumTriangleAspectRatio, minimumTriangleScaledJacobian,
    xMinimumInterval: Math.min(...xAxis.intervals), xMaximumInterval: Math.max(...xAxis.intervals),
    yMinimumInterval: Math.min(...yAxis.intervals), yMaximumInterval: Math.max(...yAxis.intervals),
  });
}

`;
  let patched = source.slice(0, generationStart) + replacement + source.slice(candidatesStart);
  const logAnchor = '  insertedPointCount: first.insertedPointCount,';
  assert.ok(patched.includes(logAnchor), 'mapped control log anchor missing');
  patched = patched.replace(logAnchor, `${logAnchor}\n  construction: first.construction,`);
  return patched;
}

function makeObservationFirst(source) {
  const replacements = [
    ["assert.equal(JSON.stringify(second.mesh), JSON.stringify(first.mesh), 'source remesh replay must be byte-identical');\nassert.equal(second.insertedPointCount, first.insertedPointCount);",
      "const replayEqual = JSON.stringify(second.mesh) === JSON.stringify(first.mesh);\nconst replayInsertionCountEqual = second.insertedPointCount === first.insertedPointCount;"],
    ["assert.notEqual(quality.worstStatus, 'BLOCK');\nassert.equal(adjacency.qualification, 'PASS');\nassert.equal(adjacency.violatingAdjacencyCount, 0);\nassert.ok(first.insertedPointCount > 0, 'graded source remesh inserted no interior points');\nassert.ok(childLocalCorners > parentLocalCorners,\n  `local corner density did not increase: ${parentLocalCorners} -> ${childLocalCorners}`);\nassert.equal(boundary.offGeometryCornerCount, 0);\nassert.equal(boundary.offGeometryMidsideCount, 0);\nassert.equal(boundary.nonManifoldBoundaryOwnerCount, 0);",
      "const acceptancePass = replayEqual && replayInsertionCountEqual\n  && quality.worstStatus !== 'BLOCK' && adjacency.qualification === 'PASS'\n  && adjacency.violatingAdjacencyCount === 0 && first.insertedPointCount > 0\n  && childLocalCorners > parentLocalCorners && boundary.offGeometryCornerCount === 0\n  && boundary.offGeometryMidsideCount === 0 && boundary.nonManifoldBoundaryOwnerCount === 0;"],
    ["  qualityWorstStatus: quality.worstStatus,",
      "  replayEqual, replayInsertionCountEqual,\n  qualityWorstStatus: quality.worstStatus,"],
    ["  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,\n  boundary,\n  qualification: 'PASS',",
      "  violatingAdjacencyCount: adjacency.violatingAdjacencyCount,\n  boundary,\n  qualification: acceptancePass ? 'PASS' : 'BLOCK',"],
  ];
  let patched = source;
  for (const [from, to] of replacements) {
    assert.ok(patched.includes(from), `observation patch anchor missing: ${from.slice(0, 48)}`);
    patched = patched.replace(from, to);
  }
  return patched;
}

function runCase(localTarget, scenario) {
  const caseId = `METRIC_GRID_T3_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, [casePath], { encoding: 'utf8', env: {
    ...process.env, PR1270_CASE_ID: caseId, PR1270_FAMILY: family,
    PR1270_HGLOBAL: String(globalTarget), PR1270_HLOCAL: String(localTarget),
    PR1270_WIDTH: String(scenario.width), PR1270_HEIGHT: String(scenario.height),
    PR1270_XF: String(scenario.xf), PR1270_YF: String(scenario.yf),
  }});
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const match = text.match(/PR1270_SOURCE_REMESH_CASE=(\{[^\n]+\})/u);
  const p = match ? JSON.parse(match[1]) : null;
  return {
    caseId, localTarget, targetRatio: localTarget / globalTarget, scenario: scenario.name,
    exitCode: run.status, qualification: p?.qualification ?? 'NOT_REACHED',
    replayEqual: p?.replayEqual ?? null, replayInsertionCountEqual: p?.replayInsertionCountEqual ?? null,
    maximumObserved: p?.maximumObserved ?? null, violatingAdjacencyCount: p?.violatingAdjacencyCount ?? null,
    qualityWorstStatus: p?.qualityWorstStatus ?? null, qualityBlockingElementCount: p?.qualityBlockingElementCount ?? null,
    qualityWarningElementCount: p?.qualityWarningElementCount ?? null, localCornerGain: p?.localCornerGain ?? null,
    insertedPointCount: p?.insertedPointCount ?? null, parentNodes: p?.parentNodes ?? null,
    childNodes: p?.childNodes ?? null, parentElements: p?.parentElements ?? null,
    childElements: p?.childElements ?? null, construction: p?.construction ?? null,
    boundary: p?.boundary ?? null,
    error: text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([^\n]+)/u)?.[1]?.trim() ?? null,
  };
}
function maxFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.max(...rows) : null; }
function minFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.min(...rows) : null; }
