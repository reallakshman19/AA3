#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';

const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('--package is required');
const outPath = args.out ?? '.work/bm4nl-b31j-smooth90-authority.json';
const settings = readJson('benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json');
const pkg = readJson(args.package);
assert.equal(pkg.benchmarkId, 'BM4_NL');
assert.equal(settings.overall.settings.DEFAULT_CODE, 'B31.3_2022');
assert.equal(settings.overall.settings.APPLY_B31J_SIFS_AND_FLEX, 'DEFAULT');
assert.equal(pkg.profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, true);

const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const bendRows = pkg.model.tables.INPUT_BENDS.rows;
const byPtr = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));
const records = [];
for (const row of sourceRows) {
  const ptr = Number(row.BEND_PTR);
  if (!(ptr > 0)) continue;
  const declaration = byPtr.get(ptr);
  assert.ok(declaration, `Missing INPUT_BENDS BEND_PTR ${ptr}`);
  const outgoing = sourceRows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));
  assert.equal(outgoing.length, 1, `BEND_PTR ${ptr} must have exactly one outgoing element`);
  const angleDegrees = Math.acos(clamp(dot(direction(row), direction(outgoing[0])), -1, 1)) * 180 / Math.PI;
  assert.ok(Math.abs(angleDegrees - 90) <= 1e-6, `BEND_PTR ${ptr} angle ${angleDegrees} is not smooth-90 applicable`);
  assert.ok(!(Number(declaration.NUM_MITER) > 0), `BEND_PTR ${ptr} is a miter bend`);
  assert.ok(!(Number(declaration.KFACTOR) > 0), `BEND_PTR ${ptr} carries a user K-factor override`);
  const factor = calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `ISSUE947-BM4NL-BEND-${ptr}-B31J-SMOOTH90-AUTHORITY`,
    componentId: `ACCDB-BEND-${ptr}`,
    editionProfileId: 'B31_3_2022_B31J_2017',
    componentType: 'BEND',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'BEND',
      lengthUnit: 'm',
      outerDiameter: Number(row.DIAMETER) * 1e-3,
      wallThickness: Number(row.WALL_THICK) * 1e-3,
      bendRadius: Number(declaration.RADIUS) * 1e-3,
      pressure: Number(row.PRESSURE1) * 1e3,
      elasticModulus: Number(row.MODULUS) * 1e3,
      bendAngleDegrees: angleDegrees,
      smooth90FlexibilityCorrection: true,
      sourceEvidence: { sourceId: `ACCDB:BEND:${ptr}`, sourceRevision: pkg.source.sha256 },
    },
    momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
    semanticHash: '',
  });
  assert.equal(factor.status, 'QUALIFIED');
  assert.equal(factor.factors.flexibilityRule.coefficient, 1.3);
  assert.equal(factor.factors.flexibilityRule.smooth90CorrectionApplied, true);
  records.push({
    bendPointer: ptr,
    sourceElementId: String(row.ELEMENTID),
    outgoingSourceElementId: String(outgoing[0].ELEMENTID),
    angleDegrees,
    bendType: Number(declaration.TYPE),
    numMiterRaw: Number(declaration.NUM_MITER),
    userKFactorRaw: Number(declaration.KFACTOR),
    flexibilityCharacteristic: factor.factors.flexibilityCharacteristic,
    pressureDenominator: factor.factors.pressureCorrection.flexibilityDenominator,
    coefficient: factor.factors.flexibilityRule.coefficient,
    inPlaneFlexibility: factor.factors.flexibility.inPlane,
    outOfPlaneFlexibility: factor.factors.flexibility.outOfPlane,
  });
}
assert.equal(records.length, bendRows.length);
assert.equal(records.length, 12);

const result = {
  check: 'lfea-issue947-bm4nl-b31j-smooth90-authority-audit',
  status: 'PASS',
  sourceAccdbSha256: pkg.source.sha256,
  authorityChain: [
    'CAESAR_II_V14_DEFAULT_CODE_B31_3_2022',
    'CAESAR_II_V14_APPLY_B31J_DEFAULT_APPLIES_B31J_TO_B31_3_2020_AND_LATER',
    'CAESAR_II_V14_B31J_SMOOTH_90_BEND_USES_1_3_OVER_H',
  ],
  bendCount: records.length,
  allSmoothNonMiter90: true,
  allWithoutUserKFactorOverride: true,
  coefficient: 1.3,
  records,
  classification: 'BM4NL_ALL_BENDS_REQUIRE_B31J_SMOOTH90_1_3_OVER_H',
  falsificationRule: 'Fail if any pinned bend is not 90 degrees, is mitered, carries a positive user K-factor override, or if the B31.3-2022/B31J-2017 factor calculator does not select the 1.3/h smooth-90 rule.',
};
fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  check: result.check,
  status: result.status,
  bendCount: result.bendCount,
  coefficient: result.coefficient,
  classification: result.classification,
}, null, 2));

function direction(row) {
  const vector = [Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)];
  const magnitude = Math.hypot(...vector);
  if (!(magnitude > 0)) throw new TypeError(`Element ${row.ELEMENTID} has zero direction`);
  return vector.map((value) => value / magnitude);
}
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function parseArgs(tokens) {
  const result = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i]; const value = tokens[i + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid arguments near ${String(key)}`);
    result[key.slice(2)] = value;
  }
  return result;
}
function readJson(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
