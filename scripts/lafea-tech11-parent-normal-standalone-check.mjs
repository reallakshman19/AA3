#!/usr/bin/env node
import assert from 'node:assert/strict';

const EPS_FACTOR = 128;

function stationaryCandidates(thetaMinimum, thetaMaximum, a, b) {
  const rows = [
    { theta: thetaMinimum, kind: 'INTERVAL_MINIMUM_U' },
    { theta: thetaMaximum, kind: 'INTERVAL_MAXIMUM_U' },
  ];
  const phase = Math.atan2(b, a);
  const kMinimum = Math.floor((thetaMinimum - phase) / Math.PI) - 1;
  const kMaximum = Math.ceil((thetaMaximum - phase) / Math.PI) + 1;
  const tolerance = 64 * Number.EPSILON
    * Math.max(1, Math.abs(thetaMinimum), Math.abs(thetaMaximum));
  for (let k = kMinimum; k <= kMaximum; k += 1) {
    const theta = phase + k * Math.PI;
    if (theta > thetaMinimum + tolerance && theta < thetaMaximum - tolerance) {
      rows.push({
        theta,
        kind: k % 2 === 0 ? 'STATIONARY_MAXIMUM' : 'STATIONARY_MINIMUM',
      });
    }
  }
  return rows;
}

function exactMinimum(thetaMinimum, thetaMaximum, a, b) {
  const candidates = stationaryCandidates(thetaMinimum, thetaMaximum, a, b)
    .map((row) => ({
      ...row,
      value: a * Math.cos(row.theta) + b * Math.sin(row.theta),
    }))
    .sort((left, right) => left.value - right.value
      || left.theta - right.theta || left.kind.localeCompare(right.kind));
  return candidates[0];
}

function classify(value, jacobianMagnitude) {
  const envelope = EPS_FACTOR * Number.EPSILON * jacobianMagnitude;
  if (value < -envelope) return { classification: 'NEGATIVE', envelope };
  if (value <= envelope) return { classification: 'ZERO_OR_ROUNDOFF_BAND', envelope };
  return { classification: 'POSITIVE', envelope };
}

function denseMinimum(thetaMinimum, thetaMaximum, a, b, divisions = 500000) {
  let best = Number.POSITIVE_INFINITY;
  let theta = thetaMinimum;
  for (let index = 0; index <= divisions; index += 1) {
    const t = index / divisions;
    const candidateTheta = thetaMinimum + (thetaMaximum - thetaMinimum) * t;
    const value = a * Math.cos(candidateTheta) + b * Math.sin(candidateTheta);
    if (value < best) {
      best = value;
      theta = candidateTheta;
    }
  }
  return { value: best, theta };
}

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`);
}

const radius = 100;
const axial = 50;
const chord120 = 2 * radius * Math.sin(Math.PI / 3);
const jacobian120 = chord120 * axial;

const positive = exactMinimum(-Math.PI / 3, Math.PI / 3, jacobian120, 0);
close(positive.value, jacobian120 * 0.5, 1e-12);
assert.equal(classify(positive.value, jacobian120).classification, 'POSITIVE');

const jacobian180 = 2 * radius * axial;
const zeroBoundary = exactMinimum(-Math.PI / 2, Math.PI / 2, jacobian180, 0);
close(zeroBoundary.value, 0, 1e-12);
assert.equal(classify(zeroBoundary.value, jacobian180).classification,
  'ZERO_OR_ROUNDOFF_BAND');

const reversed = exactMinimum(-Math.PI / 3, Math.PI / 3, -jacobian120, 0);
close(reversed.value, -jacobian120, 1e-12);
assert.equal(classify(reversed.value, jacobian120).classification, 'NEGATIVE');
assert.match(reversed.kind, /STATIONARY_MINIMUM/u);

const generalCases = [
  { min: -1.2, max: 0.8, a: 3, b: 4 },
  { min: -0.4, max: 1.7, a: -7.5, b: 2.25 },
  { min: -Math.PI / 2, max: Math.PI / 2, a: 2.5, b: -6 },
  { min: 0.2, max: 2.9, a: -1.1, b: -3.7 },
  { min: -3.0, max: -0.1, a: 9.25, b: 0.125 },
];
const comparisons = generalCases.map((row) => {
  const exact = exactMinimum(row.min, row.max, row.a, row.b);
  const dense = denseMinimum(row.min, row.max, row.a, row.b);
  const denseError = Math.abs(exact.value - dense.value);
  assert.ok(denseError <= 2e-9 * Math.max(1, Math.hypot(row.a, row.b)),
    `analytic minimum disagrees with dense reference: ${denseError}`);
  return { ...row, exact, dense, denseError };
});

const zeroEnvelope = EPS_FACTOR * Number.EPSILON * jacobian180;
assert.equal(classify(zeroEnvelope * 0.5, jacobian180).classification,
  'ZERO_OR_ROUNDOFF_BAND');
assert.equal(classify(zeroEnvelope * 2, jacobian180).classification, 'POSITIVE');
assert.equal(classify(-zeroEnvelope * 2, jacobian180).classification, 'NEGATIVE');

console.log(JSON.stringify({
  check: 'lafea-tech11-parent-normal-standalone',
  status: 'PASS',
  node: process.version,
  criterion: 'MIN_PARENT_DIRECTED_SURFACE_JACOBIAN_STRICTLY_POSITIVE_OVER_ELEMENT_U_INTERVAL_V1',
  positive120: {
    jacobianMagnitude: jacobian120,
    minimum: positive.value,
    alignmentCosine: positive.value / jacobian120,
    classification: classify(positive.value, jacobian120).classification,
  },
  zeroBoundary180: {
    jacobianMagnitude: jacobian180,
    minimum: zeroBoundary.value,
    centroidPositiveReference: jacobian180 * Math.cos(Math.PI / 6),
    classification: classify(zeroBoundary.value, jacobian180).classification,
  },
  reversed120: {
    minimum: reversed.value,
    alignmentCosine: reversed.value / jacobian120,
    classification: classify(reversed.value, jacobian120).classification,
  },
  denseReferenceComparisons: comparisons,
  roundoffEnvelopeAtJ10000: zeroEnvelope,
}, null, 2));
