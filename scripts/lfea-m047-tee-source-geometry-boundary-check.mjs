#!/usr/bin/env node
/**
 * M047 welding-tee 20295 SOURCE-DIMENSION FORENSIC only.
 *
 * Reproduces the rounded CAESAR II FLEXb/Kb output using the original,
 * slightly oversized branch mean diameter. This DOES NOT waive the calculator's
 * B31J 0 < d/D <= 1 applicability gate or qualify an out-of-range component.
 *
 * Original external report: reallaksh19/Common@179c4831cf521cf797c13699cfbbd118315c9244
 * LFEA/BM4/Miscdata_BM4_L.txt git blob ef23d224925e4568185a360ecbe1ee62503f15ff
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';

const authority = JSON.parse(readFileSync(fileURLToPath(new URL(
  '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json',
  import.meta.url,
)), 'utf8'));
const row = authority.type21Tees.find((entry) => entry.teeNode === 20295);
assert.ok(row, 'CAESAR II source must contain a welding tee at node 20295');
assert.equal(authority.sources.commonCommit, '179c4831cf521cf797c13699cfbbd118315c9244');
assert.equal(authority.sources.misc.gitBlobSha, 'ef23d224925e4568185a360ecbe1ee62503f15ff');

const runMean = row.runMeanDiameterMm / 1000;
const branchMean = row.branchMeanDiameterMm / 1000;
const wall = row.runWallMm / 1000;
assert.equal(row.branchWallMm, row.runWallMm, 'Diagnostic assumes the pinned equal tee wall thicknesses');
const qSource = branchMean / runMean;
const relativeExcess = qSource - 1;
assert.ok(qSource > 1 && relativeExcess < 0.001,
  'Source must demonstrably lie just outside (not inside) the present q<=1 applicability boundary');

function request(branchMeanDiameter) {
  return {
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: 'M047-TEE-20295-BOUNDARY-FORENSIC',
    componentId: 'M047-TEE-20295',
    editionProfileId: 'B31_3_2022_B31J_2017',
    componentType: 'WELDING_TEE',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'WELDING_TEE',
      lengthUnit: 'm',
      runOuterDiameter: runMean + wall,
      runWallThickness: wall,
      branchOuterDiameter: branchMeanDiameter + wall,
      branchWallThickness: wall,
      fittingQuality: 'UNVERIFIED',
      sourceEvidence: {
        sourceId: 'COMMON:BM4_L:MISC:TYPE2.1:20295',
        sourceRevision: authority.sources.commonCommit,
      },
    },
    momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
    semanticHash: '',
  };
}

const blocked = calculateB31Factors(request(branchMean));
assert.equal(blocked.status, 'BLOCKED',
  'Reported d/D>1 must not silently promote to B31J production qualification');
assert.ok(blocked.applicability.violations.some((entry) => entry.field === 'd/D'));

const capped = calculateB31Factors(request(runMean));
assert.equal(capped.status, 'QUALIFIED');
const cappedK = capped.factors.flexibility.branch.inPlane;

// An independent *diagnostic extrapolation*, not a B31J production result.
// The polynomial/powers are spelled out to attribute the effect of q alone.
const rt = (runMean / 2) / wall;
const q = branchMean / runMean;
const sourceExtrapolatedK =
  (1.91 * q - 4.32 * q ** 2 + 2.7 * q ** 3) * rt ** 0.77 * q ** 0.47;
assert.ok(Math.abs(cappedK - 1.3214165064292276) < 1e-12);
assert.ok(Math.abs(sourceExtrapolatedK - 1.3225078462797053) < 1e-12);

// Compare both against the *published rounded* 3-decimal FLEXb, not against
// invented unrounded CAESAR factors. The existing 0.1% engineering check
// remains unchanged, and the rounded-display ±0.0005 band is also explicit.
const publishedFlex = row.flexBranchInPlane;
const checkTolerance = 0.001;
const capRelativeError = Math.abs(cappedK - publishedFlex) / publishedFlex;
const rawRelativeError = Math.abs(sourceExtrapolatedK - publishedFlex) / publishedFlex;
assert.ok(capRelativeError > checkTolerance, 'Capped source must reproduce M047 failed tolerance');
assert.ok(rawRelativeError <= checkTolerance, 'Uncapped diagnostic must recover printed FLEXb');
assert.ok(Math.abs(sourceExtrapolatedK - publishedFlex) <= 0.0005,
  'Uncapped source diagnostic must round to published FLEXb');

// N.m/rad -> N.m/degree: Kb = E*I/(k*meanDiameter) * pi/180.
const E = 203395008e3; // Cold EC in the existing M047 benchmark fixture (Pa).
const branchOuter = branchMean + wall;
const branchInner = branchOuter - 2 * wall;
const secondMoment = Math.PI * (branchOuter ** 4 - branchInner ** 4) / 64;
const kb = (flexibility) =>
  E * secondMoment / (flexibility * branchMean) * Math.PI / 180;
const cappedKb = kb(cappedK);
const sourceKb = kb(sourceExtrapolatedK);
assert.ok(Math.abs(sourceKb - row.kbBranchInPlaneNmPerDegree) /
  row.kbBranchInPlaneNmPerDegree < 1e-3,
  'Source-dimension diagnostic must reproduce printed Kb to established 0.1%');
assert.ok(Math.abs(cappedKb - row.kbBranchInPlaneNmPerDegree) /
  row.kbBranchInPlaneNmPerDegree < 1e-3,
  'Kb tolerance alone cannot discriminate the source/cap basis');

// Keep both rows and their legal meaning in the machine-readable output.
console.log(JSON.stringify({
  check: 'lfea-m047-tee-source-diameter-boundary',
  status: 'PASS_DIAGNOSTIC_ONLY_NOT_QUALIFIED_FOR_PRODUCTION',
  node: row.teeNode,
  source: authority.sources,
  runMeanDiameterMm: row.runMeanDiameterMm,
  branchMeanDiameterMm: row.branchMeanDiameterMm,
  sourceDOverD: qSource,
  sourceRatioExcessPercent: 100 * relativeExcess,
  calculatorOriginalSourceStatus: blocked.status,
  calculatorOriginalSourceViolationFields: blocked.applicability.violations.map((entry) => entry.field),
  calculatedCappedFlexb: cappedK,
  diagnosticUncappedFlexb: sourceExtrapolatedK,
  publishedCaesarFlexb: publishedFlex,
  cappedFlexbRelativeError: capRelativeError,
  diagnosticUncappedFlexbRelativeError: rawRelativeError,
  diagnosticUncappedKbNmPerDegree: sourceKb,
  cappedKbNmPerDegree: cappedKb,
  publishedCaesarKbNmPerDegree: row.kbBranchInPlaneNmPerDegree,
  engineeringProductionPromotion: false,
}, null, 2));
