#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const sourcePath = 'scripts/lafea-pr1270-metric-mapped-control-matrix.mjs';
const tempPath = 'scripts/.lafea-pr1270-target-anchored-metric-control.tmp.mjs';
const original = fs.readFileSync(sourcePath, 'utf8');
const functionStart = original.indexOf('function metricAxisCoordinates(');
const functionEnd = original.indexOf('function mappedMetricConstructionDiagnostics(', functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, 'target-anchored metric function anchors missing');

const replacement = String.raw`function metricAxisCoordinates(minimum, maximum, target, local, global, growth) {
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
  const epsilon = 64 * Number.EPSILON * Math.max(1, leftMetric, rightMetric);
  const leftIntervalCount = Math.max(1, Math.ceil(leftMetric - epsilon));
  const rightIntervalCount = Math.max(1, Math.ceil(rightMetric - epsilon));
  const leftDeltaMetric = leftMetric / leftIntervalCount;
  const rightDeltaMetric = rightMetric / rightIntervalCount;
  const leftCoordinates = [];
  for (let index = leftIntervalCount; index >= 1; index -= 1) {
    leftCoordinates.push(target - physicalDistance(index * leftDeltaMetric));
  }
  const rightCoordinates = [];
  for (let index = 1; index <= rightIntervalCount; index += 1) {
    rightCoordinates.push(target + physicalDistance(index * rightDeltaMetric));
  }
  const coordinates = [...leftCoordinates, target, ...rightCoordinates];
  coordinates[0] = minimum;
  coordinates[coordinates.length - 1] = maximum;
  const intervals = coordinates.slice(1).map((value, index) => value - coordinates[index]);
  const adjacentRatios = intervals.slice(1).map((value, index) => Math.max(value, intervals[index]) / Math.min(value, intervals[index]));
  const maximumDeltaMetric = Math.max(leftDeltaMetric, rightDeltaMetric);
  return Object.freeze({
    coordinates: Object.freeze(coordinates), intervals: Object.freeze(intervals),
    intervalCount: leftIntervalCount + rightIntervalCount,
    totalMetric: leftMetric + rightMetric,
    deltaMetric: maximumDeltaMetric,
    leftMetric, rightMetric, leftIntervalCount, rightIntervalCount,
    leftDeltaMetric, rightDeltaMetric,
    targetStationIndex: leftIntervalCount,
    targetStationExact: coordinates[leftIntervalCount] === target,
    beta,
    theoreticalAdjacentRatioBound: Math.exp(beta * maximumDeltaMetric),
    maximumObservedAdjacentIntervalRatio: adjacentRatios.length ? Math.max(...adjacentRatios) : 1,
  });
}

`;

let patched = original.slice(0, functionStart) + replacement + original.slice(functionEnd);
patched = patched.replace(
  "check: 'PR1270_MAPPED_METRIC_GRADING_CONTROL_V2'",
  "check: 'PR1270_TARGET_ANCHORED_MAPPED_METRIC_GRADING_CONTROL_V1'",
);
patched = patched.replace(
  "architecture: 'SIMULTANEOUS_TENSOR_METRIC_GRID_THEN_FIXED_DIAGONAL_TRIANGULATION'",
  "architecture: 'TARGET_ANCHORED_TENSOR_METRIC_GRID_THEN_FIXED_DIAGONAL_TRIANGULATION'",
);
patched = patched.replace(
  "metric: 'M(D)=INTEGRAL_0^D DS/H(S); UNIFORM_DELTA_M_PER_AXIS'",
  "metric: 'M(D)=INTEGRAL_0^D DS/H(S); TARGET_ANCHORED_LEFT_RIGHT_DELTA_M_LE_1'",
);

try {
  fs.writeFileSync(tempPath, patched);
  const run = spawnSync(process.execPath, [tempPath], { encoding: 'utf8' });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  assert.equal(run.status, 0, `target-anchored mapped metric control exited ${run.status}`);
} finally {
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}
