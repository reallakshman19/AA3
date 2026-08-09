#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('--package is required');
const outPath = args.out ?? '.work/bm4nl-bend-axial-shape-audit.json';
const settingsPath = args.settings
  ?? 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';
const solverPath = 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
const bendPath = 'src/core/linear-fea-piping-components/bend-component.js';

const pkg = readJson(args.package);
const settings = readJson(settingsPath);
assert.equal(pkg.benchmarkId, 'BM4_NL');
assert.equal(settings.overall.settings.BEND_AXIAL_SHAPE, 'YES');

const solverSource = fs.readFileSync(solverPath, 'utf8');
const bendSource = fs.readFileSync(bendPath, 'utf8');
const maxAngleDegrees = numberFromSource(
  solverSource,
  /bendMaxAngleDegrees:\s*\{\s*value:\s*([0-9.]+)/u,
  'bendMaxAngleDegrees',
);
const convergenceTolerance = numberFromSource(
  solverSource,
  /convergenceRelativeTolerance:\s*\{\s*value:\s*([0-9.eE+-]+)/u,
  'convergenceRelativeTolerance',
);
assert.equal(maxAngleDegrees, 5);
assert.equal(convergenceTolerance, 1e-2);
assert.match(
  bendSource,
  /The bend is a deterministic chain of B-3\.1 straight elements along its arc/u,
  'bend formulation must remain a segmented frame chain',
);
assert.match(
  bendSource,
  /appliedTo:\s*\['BENDING_Y',\s*'BENDING_Z'\]/u,
  'B31 flexibility correction must remain bending-only for this audit',
);
assert.match(
  bendSource,
  /kinematicRelations:\s*\[\]/u,
  'audit assumes no extra hidden bend kinematic relation',
);

const rows = pkg.model?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
const bendRows = pkg.model?.tables?.INPUT_BENDS?.rows;
assert.ok(Array.isArray(rows) && Array.isArray(bendRows));
const byPointer = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));
const bendEntries = [];

for (const row of rows) {
  const pointer = Number(row.BEND_PTR);
  if (!(pointer > 0)) continue;
  const declaration = byPointer.get(pointer);
  assert.ok(declaration, `missing INPUT_BENDS row for BEND_PTR ${pointer}`);
  const outgoing = rows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));
  assert.equal(outgoing.length, 1, `BEND_PTR ${pointer} requires one outgoing source element`);
  const incoming = unit([Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)]);
  const leaving = unit([
    Number(outgoing[0].DELTA_X),
    Number(outgoing[0].DELTA_Y),
    Number(outgoing[0].DELTA_Z),
  ]);
  const beta = Math.acos(clamp(dot(incoming, leaving), -1, 1));
  assert.ok(beta > 0 && beta < Math.PI, `invalid bend angle for BEND_PTR ${pointer}`);

  const subdivision = resolveSubdivision(beta, maxAngleDegrees, 4, 2);
  const tangent = axialCompliance(beta, subdivision.elementCount, 'END_TANGENT');
  const normal = axialCompliance(beta, subdivision.elementCount, 'END_NORMAL');
  const maxRelativeError = Math.max(tangent.relativeError, normal.relativeError);
  assert.ok(
    maxRelativeError <= convergenceTolerance,
    `BEND_PTR ${pointer} segmented axial compliance error ${maxRelativeError} exceeds ${convergenceTolerance}`,
  );
  bendEntries.push({
    bendPointer: pointer,
    sourceElementId: String(row.ELEMENTID),
    outgoingSourceElementId: String(outgoing[0].ELEMENTID),
    bendAngleDegrees: beta * 180 / Math.PI,
    elementCount: subdivision.elementCount,
    segmentAngleDegrees: beta * 180 / Math.PI / subdivision.elementCount,
    governingSubdivisionRule: subdivision.governingRule,
    tangent,
    normal,
    maxRelativeError,
  });
}

assert.equal(bendEntries.length, bendRows.length, 'all declared BM4_NL bends must be audited');
const maxRelativeError = Math.max(...bendEntries.map((entry) => entry.maxRelativeError));
const worst = bendEntries.reduce((best, entry) =>
  (entry.maxRelativeError > best.maxRelativeError ? entry : best));

const result = {
  check: 'lfea-issue947-ordinary-curved-centreline-axial-mode-audit',
  status: 'PASS_ORDINARY_CURVED_CENTRELINE_MODE_ONLY',
  sourceSetting: {
    BEND_AXIAL_SHAPE: settings.overall.settings.BEND_AXIAL_SHAPE,
    authority: settings.overall.source,
  },
  governingEquation: 'C_AXIAL=INTEGRAL_0_BETA[(F_DOT_T)^2*R/(EA)]_DTHETA',
  formulationInterpretation: {
    production: 'SEGMENTED_STRAIGHT_FRAME_CHAIN_WITH_AXIAL_DOF_ON_EVERY_CHORD',
    b31Correction: 'BENDING_Y_Z_ONLY',
    hiddenKinematicRelations: false,
    disabledAxialShapeCanonicalCompliance: 0,
    note: 'This audit qualifies only ordinary curved-centreline axial strain-energy convergence of the segmented frame chain. It does not qualify CAESAR BEND_AXIAL_SHAPE operator identity, which remains explicitly unmapped.',
  },
  canonicalClosedForm: {
    endTangent: 'R/(EA)*(beta/2 + sin(2*beta)/4)',
    endNormal: 'R/(EA)*(beta/2 - sin(2*beta)/4)',
  },
  productionSubdivision: {
    maxSegmentAngleDegrees: maxAngleDegrees,
    minimumElements: 4,
    minimumElementsBetweenTangentAndMidArc: 2,
    convergenceRelativeTolerance: convergenceTolerance,
  },
  bendCount: bendEntries.length,
  maxRelativeError,
  worstBendPointer: worst.bendPointer,
  bends: bendEntries,
  falsification: {
    omittedModeRelativeError: 1,
    existingConvergenceLimit: convergenceTolerance,
    conclusion: 'ORDINARY_CURVED_CENTRELINE_AXIAL_MODE_IS_PRESENT_AND_CONVERGED_CAESAR_OPERATOR_IDENTITY_UNQUALIFIED',
  },
  caesarSettingQualification: 'BLOCKING_CAESAR_BEND_AXIAL_SHAPE_OPERATOR_UNMAPPED',
  limitation: 'CAESAR_INTERNAL_CURVED_ELEMENT_INTERPOLATION_REMAINS_UNOBSERVED; THIS_AUDIT_IS_NOT_AUTHORITY_FOR_BEND_AXIAL_SHAPE_YES',
};

fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

function axialCompliance(beta, count, direction) {
  // Dimensionless R/(EA)=1. Tangent starts at theta=0 and rotates through beta.
  const exact = direction === 'END_TANGENT'
    ? beta / 2 + Math.sin(2 * beta) / 4
    : beta / 2 - Math.sin(2 * beta) / 4;
  const delta = beta / count;
  const chordLength = 2 * Math.sin(delta / 2);
  let segmented = 0;
  for (let index = 0; index < count; index += 1) {
    const theta = (index + 0.5) * delta;
    const projection = direction === 'END_TANGENT'
      ? Math.cos(beta - theta)
      : Math.sin(beta - theta);
    segmented += projection ** 2 * chordLength;
  }
  const relativeError = Math.abs(segmented - exact) / Math.max(Math.abs(exact), Number.EPSILON);
  return { exact, segmented, relativeError };
}

function resolveSubdivision(beta, maxAngleDegrees, minimumElements, minimumBetweenStations) {
  const maximumSegmentAngle = maxAngleDegrees * Math.PI / 180;
  const candidates = [
    { rule: 'MAX_CENTRAL_ANGLE', count: Math.ceil(beta / maximumSegmentAngle) },
    { rule: 'MINIMUM_ELEMENTS', count: minimumElements },
    { rule: 'TANGENT_TO_MID_ARC_STATION_SEPARATION', count: 2 * minimumBetweenStations },
  ];
  const governing = candidates.reduce((best, entry) => entry.count > best.count ? entry : best);
  return {
    elementCount: governing.count % 2 === 1 ? governing.count + 1 : governing.count,
    governingRule: governing.rule,
  };
}

function numberFromSource(source, pattern, field) {
  const match = source.match(pattern);
  if (!match) throw new TypeError(`cannot resolve ${field} from production source`);
  const value = Number(match[1]);
  if (!Number.isFinite(value)) throw new TypeError(`${field} is not finite`);
  return value;
}

function parseArgs(tokens) {
  const result = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i];
    const value = tokens[i + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`invalid arguments near ${String(key)}`);
    result[key.slice(2)] = value;
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function unit(vector) {
  const length = Math.hypot(...vector);
  if (!(length > 0)) throw new TypeError('zero-length direction');
  return vector.map((value) => value / length);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
