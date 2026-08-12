#!/usr/bin/env node

/**
 * M047 instrumentation-only diagnostic for the remaining BM4_L bend operator gap.
 *
 * The diagnostic binds the retained numeric bend operator to a read-only ACCDB
 * export so MEC-21 transverse-shear terms use exact source OD, wall, Ec and
 * Poisson ratio. It does not infer A, G, alpha, kappa, a flexibility factor, or
 * any correction coefficient from CAESAR-vs-LFEA residuals.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BEND_ELEMENT_PATTERN = /^ACCDB-BEND-(\d+)\.E(\d+)$/u;
const PLANAR_LABELS = Object.freeze(['AXIAL_TRANSLATION', 'IN_PLANE_TRANSLATION', 'IN_PLANE_ROTATION']);
const CHANNELS = Object.freeze([
  Object.freeze(['Caa', 0, 0]),
  Object.freeze(['Cac', 0, 1]),
  Object.freeze(['Ccc', 1, 1]),
  Object.freeze(['CaM', 0, 2]),
  Object.freeze(['CcM', 1, 2]),
  Object.freeze(['CMM', 2, 2]),
]);
const FALSIFICATION_BEND_POINTERS = Object.freeze([1, 9]);
const PHI_ZERO_TOLERANCE = 1e-10;
const RADIUS_ROUNDTRIP_RELATIVE_TOLERANCE = 1e-10;
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;

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
  const source = args.get('--source');
  const out = args.get('--out');
  if (!actual || !bendProfile || !source || !out) {
    throw new TypeError('Usage: --actual <bm4l-actual.json> --bend-profile <bm4l-bend-effective-stiffness.json> --source <raw-accdb-export.json> --out <json>.');
  }
  const allowed = ['--actual', '--bend-profile', '--source', '--out'];
  const unknown = [...args.keys()].filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return Object.freeze({
    actualPath: resolve(actual),
    bendProfilePath: resolve(bendProfile),
    sourcePath: resolve(source),
    outPath: resolve(out),
  });
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return Object.is(number, -0) ? 0 : number;
}
function positive(value, field) {
  const number = finite(value, field);
  if (!(number > 0)) throw new TypeError(`${field} must be positive.`);
  return number;
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
      for (let column = 0; column < right[0].length; column += 1) result[row][column] += coefficient * right[inner][column];
    }
  }
  return result;
}
function addMatrices(left, right) {
  return left.map((row, rowIndex) => Object.freeze(row.map((value, columnIndex) => value + right[rowIndex][columnIndex])));
}
function degreesToRadians(value) { return finite(value, 'degrees') * Math.PI / 180; }
function magnitudeRelativeDelta(actual, reference) {
  return (Math.abs(actual) - Math.abs(reference)) / Math.max(Math.abs(reference), Number.MIN_VALUE);
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
  const a = Klocal[1][1];
  const b = Klocal[1][5];
  const c = Klocal[5][5];
  const d = Klocal[5][11];
  if (!(a > 0) || !(b > 0) || !(c > d)) throw new Error(`${entry.elementId} does not expose a valid corrected in-plane chord matrix.`);
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

function sourceRowsByElement(rawSource, expectedSha256) {
  if (String(rawSource.source?.sha256) !== String(expectedSha256)) {
    throw new Error(`Raw ACCDB export hash ${String(rawSource.source?.sha256)} does not match solver source ${expectedSha256}.`);
  }
  const rows = rawSource.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Raw ACCDB export lacks INPUT_BASIC_ELEMENT_DATA rows.');
  return new Map(rows.map((row) => [String(Number(row.ELEMENTID)), row]));
}

function sourceMechanics(row, sourceElementId) {
  if (!row) throw new Error(`Raw ACCDB export lacks source element ${sourceElementId}.`);
  const outerDiameter = positive(row.DIAMETER, `${sourceElementId}.DIAMETER`) * MM_TO_M;
  const wallThickness = positive(row.WALL_THICK, `${sourceElementId}.WALL_THICK`) * MM_TO_M;
  const elasticModulus = positive(row.MODULUS, `${sourceElementId}.MODULUS`) * KPA_TO_PA;
  const poissonRatio = finite(row.POISSONS, `${sourceElementId}.POISSONS`);
  if (!(poissonRatio > -1 && poissonRatio < 0.5)) throw new TypeError(`${sourceElementId}.POISSONS=${poissonRatio} is outside isotropic elastic bounds.`);
  const outerRadius = outerDiameter / 2;
  const innerRadius = outerRadius - wallThickness;
  if (!(innerRadius > 0)) throw new TypeError(`${sourceElementId} wall leaves no positive bore.`);
  const area = Math.PI * (outerRadius ** 2 - innerRadius ** 2);
  const shearModulus = elasticModulus / (2 * (1 + poissonRatio));
  const alpha = 4 / 3 * (outerRadius ** 3 - innerRadius ** 3)
    / ((outerRadius ** 2 + innerRadius ** 2) * (outerRadius - innerRadius));
  return Object.freeze({
    accdbFields: Object.freeze({
      ELEMENTID: Number(row.ELEMENTID),
      BEND_PTR: Number(row.BEND_PTR),
      DIAMETER_mm: finite(row.DIAMETER, `${sourceElementId}.DIAMETER`),
      WALL_THICK_mm: finite(row.WALL_THICK, `${sourceElementId}.WALL_THICK`),
      MODULUS_kPa: finite(row.MODULUS, `${sourceElementId}.MODULUS`),
      POISSONS: poissonRatio,
    }),
    outerDiameterM: clean(outerDiameter),
    wallThicknessM: clean(wallThickness),
    innerDiameterM: clean(2 * innerRadius),
    areaM2: clean(area),
    elasticModulusPa: clean(elasticModulus),
    poissonRatio: clean(poissonRatio),
    shearModulusPa: clean(shearModulus),
    mec21ShearDistributionFactorAlpha: clean(alpha),
    equivalentTimoshenkoKappa: clean(1 / alpha),
  });
}

function mec21ShapeTerms(centralAngleDegrees) {
  const theta = degreesToRadians(centralAngleDegrees);
  if (!(theta > 0 && theta < Math.PI)) throw new Error('MEC-21 bend angle must lie between zero and pi.');
  const B1 = theta - Math.sin(theta);
  const B2 = 1 - Math.cos(theta);
  const B3 = (2 * theta - Math.sin(2 * theta)) / 4;
  return Object.freeze({ theta, B1, B2, B3, crossShape: B2 * (1 - B2 / 2) });
}

function continuousMec21BendingOnly(properties, shape) {
  const R = properties.bendRadius;
  const EIeff = properties.effectiveBendingRigidityEIoverK;
  const { theta, B1, B2, B3 } = shape;
  if (!(R > 0) || !(EIeff > 0)) throw new Error('MEC-21 continuous bend inputs must be positive.');
  const R2overEI = (R ** 2) / EIeff;
  const R3overEI = (R ** 3) / EIeff;
  return Object.freeze([
    Object.freeze([R3overEI * (2 * B1 - B3), R3overEI * (B2 ** 2 / 2), -R2overEI * B1]),
    Object.freeze([R3overEI * (B2 ** 2 / 2), R3overEI * B3, -R2overEI * B2]),
    Object.freeze([-R2overEI * B1, -R2overEI * B2, R * theta / EIeff]),
  ]);
}

function mec21TransverseShearOnly(properties, source, shape) {
  const scale = source.mec21ShearDistributionFactorAlpha * properties.bendRadius
    / (source.areaM2 * source.shearModulusPa);
  const { theta, B3, crossShape } = shape;
  return Object.freeze({
    scaleAlphaRoverAG: clean(scale),
    matrix3x3: Object.freeze([
      Object.freeze([scale * B3, scale * crossShape, 0]),
      Object.freeze([scale * crossShape, scale * (theta - B3), 0]),
      Object.freeze([0, 0, 0]),
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

function comparisonRows(current, bending, shear, fullFalse) {
  return Object.freeze(CHANNELS.map(([channel, row, column]) => Object.freeze({
    channel,
    currentChordChain: clean(current[row][column]),
    continuousMec21BendingOnly: clean(bending[row][column]),
    mec21TransverseShearContribution: clean(shear[row][column]),
    mec21AxialShapeFalseTotal: clean(fullFalse[row][column]),
    bendingOnlyMagnitudeRelativeDelta: clean(magnitudeRelativeDelta(bending[row][column], current[row][column])),
    falseTotalMagnitudeRelativeDelta: clean(magnitudeRelativeDelta(fullFalse[row][column], current[row][column])),
  })));
}

function range(rows, field, channel) {
  const values = rows.map((row) => row.comparison.find((entry) => entry.channel === channel)[field]);
  return Object.freeze({ minimum: Math.min(...values), maximum: Math.max(...values) });
}

function falsificationCases(rows, bendProfile) {
  return Object.freeze(FALSIFICATION_BEND_POINTERS.map((pointer) => {
    const row = rows.find((entry) => entry.bendPointer === pointer);
    const bend = bendProfile.bends.find((entry) => Number(entry.bendPointer) === pointer);
    if (!row || !bend) throw new Error(`Predeclared falsification bend ${pointer} is absent.`);
    return Object.freeze({
      bendPointer: pointer,
      sourceElementId: row.sourceElementId,
      expectedShearSignature: Object.freeze({
        directPositiveComplianceChannels: Object.freeze(['Caa', 'Cac', 'Ccc']),
        directZeroComplianceChannels: Object.freeze(['CaM', 'CcM', 'CMM']),
        productionABRule: 'Enable only source-derived MEC21 transverse shear. Reject if unrelated out-of-plane/torsion families move without matrix-coupling explanation or if equilibrium/recovery gates regress.',
      }),
      sourceMechanics: row.sourceMechanics,
      comparison: row.comparison,
      observedL3FarEndCorrectionLocal: Object.freeze(bend.residuals?.L3?.to?.requiredCorrectionLocal ?? []),
      observedL3FarEndCorrectionLabels: Object.freeze(bend.residuals?.L3?.to?.localComponentLabels ?? []),
      residualUseRule: 'OBSERVATIONAL_FALSIFICATION_ONLY__NO_SOURCE_OR_COEFFICIENT_IS_DERIVED_FROM_THIS_RESIDUAL',
    });
  }));
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const actual = readJson(args.actualPath);
  const bendProfile = readJson(args.bendProfilePath);
  const rawSource = readJson(args.sourcePath);
  if (String(actual.sourceAccdbSha256) !== String(bendProfile.sourceAccdbSha256)) {
    throw new Error('Actual and bend-profile artifacts do not share source ACCDB identity.');
  }
  const sourceByElement = sourceRowsByElement(rawSource, actual.sourceAccdbSha256);
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
    const sourceElementId = String(bend.sourceElementId);
    const source = sourceMechanics(sourceByElement.get(sourceElementId), sourceElementId);
    if (Number(source.accdbFields.BEND_PTR) !== Number(bend.bendPointer)) {
      throw new Error(`${bend.bendId} source BEND_PTR ${source.accdbFields.BEND_PTR} does not match profiler pointer ${bend.bendPointer}.`);
    }
    const chord = recoverCorrectedChordProperties(entry, bend.frame?.medianChordTurnDegrees);
    const current = currentPlanarCompliance(bend);
    const shape = mec21ShapeTerms(bend.frame?.centralAngleDegrees);
    const bending = continuousMec21BendingOnly(chord, shape);
    const shear = mec21TransverseShearOnly(chord, source, shape);
    const fullFalse = addMatrices(bending, shear.matrix3x3);
    return Object.freeze({
      bendId: String(bend.bendId),
      bendPointer: Number(bend.bendPointer),
      sourceElementId,
      firstAnalysisElementId: String(firstElementId),
      centralAngleDegrees: finite(bend.frame?.centralAngleDegrees, `${bend.bendId}.centralAngleDegrees`),
      sourceMechanics: source,
      chord,
      mec21Shape: Object.freeze(Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, clean(value)]))),
      currentPlanarCompliance3x3: current,
      continuousMec21BendingOnly3x3: bending,
      mec21TransverseShear: shear,
      mec21AxialShapeFalse3x3: fullFalse,
      comparison: comparisonRows(current, bending, shear.matrix3x3, fullFalse),
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
    sourceDerivedKappaRange: Object.freeze({
      minimum: Math.min(...rows.map((row) => row.sourceMechanics.equivalentTimoshenkoKappa)),
      maximum: Math.max(...rows.map((row) => row.sourceMechanics.equivalentTimoshenkoKappa)),
    }),
    continuousBendingOnlyMagnitudeDeltaRanges: Object.freeze(Object.fromEntries(
      CHANNELS.map(([channel]) => [channel, range(rows, 'bendingOnlyMagnitudeRelativeDelta', channel)]),
    )),
    mec21FalseTotalMagnitudeDeltaRanges: Object.freeze(Object.fromEntries(
      CHANNELS.map(([channel]) => [channel, range(rows, 'falseTotalMagnitudeRelativeDelta', channel)]),
    )),
  });

  const result = Object.freeze({
    schema: 'lfea-m047-bm4l-mec21-bend-matrix-gap/v2',
    status: 'PASS_DIAGNOSTIC_ONLY',
    productionMechanicsChanged: false,
    sourceAccdbSha256: String(actual.sourceAccdbSha256),
    sourceExportSha256: String(rawSource.source?.sha256),
    conventions: Object.freeze({
      currentPlanarDofs: PLANAR_LABELS,
      comparisonSignRule: 'MAGNITUDE_ONLY_BECAUSE_MEC21_C_AXIS_AND_PROFILER_IN_PLANE_AXIS_SIGN_DEPEND_ON_BEND_NORMAL_ORIENTATION',
      effectiveRigidityRule: 'EI_EFFECTIVE = EI / DECLARED_BEND_FLEXIBILITY_FACTOR, RECOVERED_FROM_CORRECTED_CHORD_MATRIX',
      radiusRule: 'R = CHORD_LENGTH / (2 sin(CHORD_TURN/2))',
      sourceUnitRule: 'ACCDB_DIAMETER_WALL_MM_TO_M__MODULUS_KPA_TO_PA__POISSONS_DIMENSIONLESS',
      shearRule: 'ALPHA = 4/3*(ro^3-ri^3)/((ro^2+ri^2)*(ro-ri)); G=E/(2*(1+nu)); KAPPA_EQUIVALENT=1/ALPHA',
    }),
    authorityBoundary: Object.freeze({
      curvedBendingTerms: 'INTERGRAPH_CAUX_2015_F_EQUALS_KX_MEC21_BEND_FLEXIBILITY_FALSE_EXAMPLE_AND_MEC21_CASTIGLIANO_METHOD',
      transverseShearTerms: 'INTERGRAPH_CAUX_2015_MEC21_FALSE_MATRIX__ALPHA_R_OVER_AG__WITH_ALPHA_FROM_PIPE_ANNULUS_GEOMETRY',
      sourceInputs: 'ACCDB_INPUT_BASIC_ELEMENT_DATA__ELEMENTID_BEND_PTR_DIAMETER_WALL_THICK_MODULUS_POISSONS__READ_ONLY_ACE_EXPORT',
      axialShapeTerms: 'OWNED_BY_lfea-caesar-accdb-bend-axial-shape-authority.mjs_AND_REMAIN_BLOCKED_FOR_PRODUCTION_TRUE_PROMOTION',
    }),
    summary,
    falsificationCases: falsificationCases(rows, bendProfile),
    interpretation: Object.freeze({
      currentBendShearFinding: allCurrentBendChordsEulerBernoulli
        ? 'The retained BM4_L bend arc chords carry effectively zero Timoshenko transverse-shear flexibility.'
        : 'At least one retained BM4_L bend arc chord already carries nonzero Timoshenko transverse-shear flexibility.',
      curvedBendingFinding: 'Continuous MEC-21 curved-bending geometry changes the translational/coupling block while leaving pure rotational compliance nearly unchanged.',
      shearFinding: 'The exact MEC-21 transverse-shear matrix is now evaluated from ACCDB section/material authority. Its equivalent straight-frame shear coefficient is kappa=1/alpha, not a benchmark-fitted constant.',
      nextHypothesis: 'If the predeclared bend-1 and bend-9 signatures remain consistent, test one production A/B that enables only this source-derived bend shear while leaving B31J flexibility, pressure stiffening, Bourdon and axial-shape mechanics unchanged.',
      noFitRule: 'No alpha, A, G, kappa, flexibility factor or correction coefficient is inferred from CAESAR-vs-LFEA residuals.',
    }),
    bends: Object.freeze(rows),
  });

  mkdirSync(dirname(args.outPath), { recursive: true });
  writeFileSync(args.outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

main();
