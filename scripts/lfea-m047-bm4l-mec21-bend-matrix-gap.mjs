#!/usr/bin/env node

/**
 * M047 instrumentation-only diagnostic for the remaining BM4_L bend operator gap.
 *
 * Inputs are retained qualification artifacts only. The script recovers each
 * bend arc's first corrected chord matrix, proves whether the current in-plane
 * chord formulation carries Timoshenko shear, reconstructs the physical bend
 * radius from chord length and turn angle, and compares the condensed chord
 * chain against the continuous MEC-21 curved-bending terms using the exact same
 * effective EI. No benchmark coefficient is fitted and no production mechanic
 * is changed.
 *
 * The MEC-21/Intergraph planar FALSE formulation contains three independently
 * identifiable energy parts:
 *   1. curved bending/ovalization terms proportional to k/(EI),
 *   2. transverse-shear terms proportional to alpha/(AG), and
 *   3. no centroidal R/(AE) axial-shape terms when Bend Axial Shape = FALSE.
 *
 * This script evaluates (1) exactly from the retained LFEA operator. Presence
 * of (2) in the current chord elements is read from their Timoshenko phi. The
 * separate lfea-caesar-accdb-bend-axial-shape-authority.mjs owns (3).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BEND_ELEMENT_PATTERN = /^ACCDB-BEND-(\d+)\.E(\d+)$/u;
const PLANAR_LABELS = Object.freeze(['AXIAL_TRANSLATION', 'IN_PLANE_TRANSLATION', 'IN_PLANE_ROTATION']);
const PHI_ZERO_TOLERANCE = 1e-10;
const RADIUS_ROUNDTRIP_RELATIVE_TOLERANCE = 1e-10;

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const actual = args.get('--actual');
  const bendProfile = args.get('--bend-profile');
  const out = args.get('--out');
  if (!actual || !bendProfile || !out) {
    throw new TypeError('Usage: --actual <bm4l-actual.json> --bend-profile <bm4l-bend-effective-stiffness.json> --out <json>.');
  }
  const unknown = [...args.keys()].filter((key) => !['--actual', '--bend-profile', '--out'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return Object.freeze({ actualPath: resolve(actual), bendProfilePath: resolve(bendProfile), outPath: resolve(out) });
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return Object.is(number, -0) ? 0 : number;
}
function vector(value, length, field) {
  if (!Array.isArray(value) || value.length !== length) throw new TypeError(`${field} must contain ${length} entries.`);
  return value.map((entry, index) => finite(entry, `${field}[${index}]`));
}
function matrixFlat(value, size, field) {
  const flat = vector(value, size * size, field);
  return Array.from({ length: size }, (_, row) => flat.slice(row * size, (row + 1) * size));
}
function zeros(size) { return Array.from({ length: size }, () => new Array(size).fill(0)); }
function transpose(matrix) { return matrix[0].map((_, column) => matrix.map((row) => row[column])); }
function multiply(left, right) {
  const result = Array.from({ length: left.length }, () => new Array(right[0].length).fill(0));
  for (let row = 0; row < left.length; row += 1) {
    for (let inner = 0; inner < right.length; inner += 1) {
      const coefficient = left[row][inner];
      if (coefficient === 0) continue;
      for (let column = 0; column < right[0].length; column += 1) {
        result[row][column] += coefficient * right[inner][column];
      }
    }
  }
  return result;
}
function degreesToRadians(value) { return finite(value, 'degrees') * Math.PI / 180; }
function relativeDelta(actual, reference) {
  return (actual - reference) / Math.max(Math.abs(reference), Number.MIN_VALUE);
}
function magnitudeRelativeDelta(actual, reference) {
  return relativeDelta(Math.abs(actual), Math.abs(reference));
}
function clean(value) { return Math.abs(value) < 1e-18 ? 0 : Number(value); }

function localTransformation(localAxes, field) {
  const x = vector(localAxes?.x, 3, `${field}.x`);
  const y = vector(localAxes?.y, 3, `${field}.y`);
  const z = vector(localAxes?.z, 3, `${field}.z`);
  const rotation = [x, y, z];
  const result = zeros(12);
  for (let block = 0; block < 4; block += 1) {
    const offset = block * 3;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) result[offset + row][offset + column] = rotation[row][column];
    }
  }
  return result;
}

function recoverCorrectedChordProperties(entry, medianChordTurnDegrees) {
  const Kglobal = matrixFlat(entry.globalStiffness, 12, `${entry.elementId}.globalStiffness`);
  const T = localTransformation(entry.localAxes, `${entry.elementId}.localAxes`);
  const Klocal = multiply(multiply(T, Kglobal), transpose(T));

  // Local z bending plane: UY/RZ. These are the exact identities used by the
  // frozen straight-frame kernel, including its Timoshenko family.
  const a = Klocal[1][1];
  const b = Klocal[1][5];
  const c = Klocal[5][5];
  const d = Klocal[5][11];
  if (!(a > 0) || !(b > 0) || !(c > d)) {
    throw new Error(`${entry.elementId} does not expose a valid corrected in-plane chord matrix.`);
  }
  const chordLength = 2 * b / a;
  const effectiveEI = (c - d) * chordLength / 2;
  const normalizedC = c * chordLength / effectiveEI;
  const phi = (4 - normalizedC) / (normalizedC - 1);
  const turn = degreesToRadians(medianChordTurnDegrees);
  if (!(turn > 0 && turn < Math.PI)) throw new Error(`${entry.elementId} has invalid chord turn ${medianChordTurnDegrees}.`);
  const bendRadius = chordLength / (2 * Math.sin(turn / 2));
  const roundTripChord = 2 * bendRadius * Math.sin(turn / 2);
  const radiusRoundTripRelativeResidual = Math.abs(roundTripChord - chordLength) / chordLength;
  if (radiusRoundTripRelativeResidual > RADIUS_ROUNDTRIP_RELATIVE_TOLERANCE) {
    throw new Error(`${entry.elementId} radius round-trip residual ${radiusRoundTripRelativeResidual} exceeds tolerance.`);
  }
  return Object.freeze({
    chordLength: clean(chordLength),
    medianChordTurnRadians: clean(turn),
    bendRadius: clean(bendRadius),
    effectiveBendingRigidityEIoverK: clean(effectiveEI),
    timoshenkoPhiInPlane: clean(phi),
    transverseShearPresentInChord: Math.abs(phi) > PHI_ZERO_TOLERANCE,
    radiusRoundTripRelativeResidual: clean(radiusRoundTripRelativeResidual),
  });
}

function continuousMec21BendingOnly(properties, centralAngleDegrees) {
  const theta = degreesToRadians(centralAngleDegrees);
  const R = properties.bendRadius;
  const EIeff = properties.effectiveBendingRigidityEIoverK;
  if (!(theta > 0 && theta < Math.PI) || !(R > 0) || !(EIeff > 0)) {
    throw new Error('MEC-21 continuous bend inputs must be positive and theta must be less than pi.');
  }
  const B1 = theta - Math.sin(theta);
  const B2 = 1 - Math.cos(theta);
  const B3 = (2 * theta - Math.sin(2 * theta)) / 4;
  const R2overEI = (R ** 2) / EIeff;
  const R3overEI = (R ** 3) / EIeff;
  return Object.freeze({
    thetaRadians: clean(theta),
    B1: clean(B1),
    B2: clean(B2),
    B3: clean(B3),
    matrix3x3: Object.freeze([
      Object.freeze([R3overEI * (2 * B1 - B3), R3overEI * (B2 ** 2 / 2), -R2overEI * B1]),
      Object.freeze([R3overEI * (B2 ** 2 / 2), R3overEI * B3, -R2overEI * B2]),
      Object.freeze([-R2overEI * B1, -R2overEI * B2, R * theta / EIeff]),
    ]),
  });
}

function currentPlanarCompliance(bend) {
  const C = matrixFlat(bend.operator?.fixedNearFarEndCompliance, 6, `${bend.bendId}.fixedNearFarEndCompliance`);
  return Object.freeze([
    Object.freeze([C[0][0], C[0][1], C[0][5]]),
    Object.freeze([C[1][0], C[1][1], C[1][5]]),
    Object.freeze([C[5][0], C[5][1], C[5][5]]),
  ]);
}

function comparisonRows(current, mec) {
  const channels = [
    ['Caa', 0, 0],
    ['Cac', 0, 1],
    ['Ccc', 1, 1],
    ['CaM', 0, 2],
    ['CcM', 1, 2],
    ['CMM', 2, 2],
  ];
  return Object.freeze(channels.map(([channel, row, column]) => Object.freeze({
    channel,
    currentChordChain: clean(current[row][column]),
    continuousMec21BendingOnly: clean(mec[row][column]),
    magnitudeRelativeDelta: clean(magnitudeRelativeDelta(mec[row][column], current[row][column])),
  })));
}

function range(rows, channel) {
  const values = rows.map((row) => row.comparison.find((entry) => entry.channel === channel).magnitudeRelativeDelta);
  return Object.freeze({ minimum: Math.min(...values), maximum: Math.max(...values) });
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const actual = readJson(args.actualPath);
  const bendProfile = readJson(args.bendProfilePath);
  if (String(actual.sourceAccdbSha256) !== String(bendProfile.sourceAccdbSha256)) {
    throw new Error('Actual and bend-profile artifacts do not share source ACCDB identity.');
  }
  const recovery = actual.mechanics?.cases?.L3?.recoveryLedger;
  if (!Array.isArray(recovery)) throw new Error('Actual artifact lacks L3 recoveryLedger.');
  const recoveryByElement = new Map(recovery.map((entry) => [String(entry.elementId), entry]));
  const bends = bendProfile.bends;
  if (!Array.isArray(bends) || bends.length === 0) throw new Error('Bend-profile artifact contains no bends.');

  const rows = bends.map((bend) => {
    const firstElementId = bend.analysisElementIds?.[0];
    if (!BEND_ELEMENT_PATTERN.test(String(firstElementId))) throw new Error(`${bend.bendId} has invalid first bend element.`);
    const entry = recoveryByElement.get(String(firstElementId));
    if (!entry) throw new Error(`L3 recovery ledger lacks ${firstElementId}.`);
    const chord = recoverCorrectedChordProperties(entry, bend.frame?.medianChordTurnDegrees);
    const current = currentPlanarCompliance(bend);
    const mec = continuousMec21BendingOnly(chord, bend.frame?.centralAngleDegrees);
    return Object.freeze({
      bendId: String(bend.bendId),
      bendPointer: Number(bend.bendPointer),
      sourceElementId: String(bend.sourceElementId),
      firstAnalysisElementId: String(firstElementId),
      centralAngleDegrees: finite(bend.frame?.centralAngleDegrees, `${bend.bendId}.centralAngleDegrees`),
      chord,
      currentPlanarCompliance3x3: current,
      continuousMec21BendingOnly3x3: mec.matrix3x3,
      comparison: comparisonRows(current, mec.matrix3x3),
    });
  });

  const phiMaximumAbsolute = Math.max(...rows.map((row) => Math.abs(row.chord.timoshenkoPhiInPlane)));
  const allCurrentBendChordsEulerBernoulli = phiMaximumAbsolute <= PHI_ZERO_TOLERANCE;
  const summary = Object.freeze({
    bendCount: rows.length,
    allCurrentBendChordsEulerBernoulli,
    maximumAbsoluteTimoshenkoPhiInPlane: clean(phiMaximumAbsolute),
    phiZeroTolerance: PHI_ZERO_TOLERANCE,
    reconstructedRadiusM: Object.freeze([...new Set(rows.map((row) => row.chord.bendRadius.toFixed(9)))].map(Number).sort((a, b) => a - b)),
    continuousBendingOnlyMagnitudeDeltaRanges: Object.freeze(Object.fromEntries(
      ['Caa', 'Cac', 'Ccc', 'CaM', 'CcM', 'CMM'].map((channel) => [channel, range(rows, channel)]),
    )),
  });

  const result = Object.freeze({
    schema: 'lfea-m047-bm4l-mec21-bend-matrix-gap/v1',
    status: 'PASS_DIAGNOSTIC_ONLY',
    productionMechanicsChanged: false,
    sourceAccdbSha256: String(actual.sourceAccdbSha256),
    conventions: Object.freeze({
      currentPlanarDofs: PLANAR_LABELS,
      comparisonSignRule: 'MAGNITUDE_ONLY_BECAUSE_MEC21_C_AXIS_AND_PROFILER_IN_PLANE_AXIS_SIGN_DEPEND_ON_BEND_NORMAL_ORIENTATION',
      effectiveRigidityRule: 'EI_EFFECTIVE = EI / DECLARED_BEND_FLEXIBILITY_FACTOR, RECOVERED_FROM CORRECTED_CHORD_MATRIX',
      radiusRule: 'R = CHORD_LENGTH / (2 sin(CHORD_TURN/2))',
    }),
    authorityBoundary: Object.freeze({
      curvedBendingTerms: 'INTERGRAPH_CAUX_2015_F_EQUALS_KX_MEC21_BEND_FLEXIBILITY_FALSE_EXAMPLE_AND_MEC21_CASTIGLIANO_METHOD',
      transverseShearTerms: 'MEC21_FALSE_FORMULATION_CONTAINS_ALPHA_R_OVER_AG_TERMS; THIS_SCRIPT_DOES_NOT_INFER_OR_FIT_ALPHA_AG',
      axialShapeTerms: 'OWNED_BY_lfea-caesar-accdb-bend-axial-shape-authority.mjs_AND_REMAIN_BLOCKED_FOR_PRODUCTION_TRUE_PROMOTION',
    }),
    summary,
    interpretation: Object.freeze({
      currentBendShearFinding: allCurrentBendChordsEulerBernoulli
        ? 'The retained BM4_L bend arc chords carry effectively zero Timoshenko transverse-shear flexibility.'
        : 'At least one retained BM4_L bend arc chord already carries nonzero Timoshenko transverse-shear flexibility.',
      curvedBendingFinding: 'Continuous MEC-21 curved-bending geometry alone changes the translational/coupling block materially while leaving pure rotational compliance nearly unchanged.',
      nextHypothesis: 'Qualify the MEC-21 bend transverse-shear contribution alpha*R/(A*G) as a separate mechanism before considering a full bend-operator replacement.',
      noFitRule: 'No alpha, A, G, flexibility factor or correction coefficient is inferred from CAESAR-vs-LFEA residuals.',
    }),
    bends: Object.freeze(rows),
  });

  mkdirSync(dirname(args.outPath), { recursive: true });
  writeFileSync(args.outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

main();
