#!/usr/bin/env node

/**
 * M047 diagnostic-only authority check for CAESAR II Bend Axial Shape.
 *
 * This script intentionally changes no production mechanics. It verifies the
 * published Intergraph CAUx 2015 MEC-21 bend-flexibility example with
 * BEND_AXIAL_SHAPE=FALSE, then derives the centroidal axial-strain contribution
 * independently from Castigliano strain energy in CAESAR/MEC-21 final-point
 * local axes. The derived TRUE candidate remains blocked from production until
 * direct CAESAR TRUE parity or an equally explicit primary matrix is retained.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const INTERGRAPH_PRINT_ABS_TOLERANCE = 5e-10;
const QUADRATURE_REL_TOLERANCE = 2e-10;
const SYMMETRY_ABS_TOLERANCE = 1e-15;

function parseArguments(argv) {
  if (argv.length === 0) return Object.freeze({ outPath: null });
  if (argv.length !== 2 || argv[0] !== '--out' || !argv[1]) {
    throw new TypeError('Usage: node scripts/lfea-caesar-accdb-bend-axial-shape-authority.mjs [--out <json>].');
  }
  return Object.freeze({ outPath: resolve(argv[1]) });
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite.`);
  return Object.is(number, -0) ? 0 : number;
}

function relativeError(actual, expected) {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.MIN_VALUE);
}

function assertClose(actual, expected, absoluteTolerance, field) {
  const residual = Math.abs(actual - expected);
  if (!(residual <= absoluteTolerance)) {
    throw new Error(`${field} residual ${residual} exceeds ${absoluteTolerance}; actual=${actual}, expected=${expected}.`);
  }
  return residual;
}

function assertRelative(actual, expected, relativeTolerance, field) {
  const residual = relativeError(actual, expected);
  if (!(residual <= relativeTolerance)) {
    throw new Error(`${field} relative residual ${residual} exceeds ${relativeTolerance}; actual=${actual}, expected=${expected}.`);
  }
  return residual;
}

function annulus(outerDiameter, wallThickness) {
  const ro = outerDiameter / 2;
  const ri = ro - wallThickness;
  if (!(ri > 0)) throw new TypeError('wallThickness must leave a positive inner radius.');
  return Object.freeze({
    outerRadius: ro,
    innerRadius: ri,
    area: Math.PI * (ro ** 2 - ri ** 2),
    secondMoment: Math.PI / 4 * (ro ** 4 - ri ** 4),
  });
}

function mec21PlanarFalseFlexibility(input) {
  const section = annulus(input.outerDiameter, input.wallThickness);
  const E = finite(input.elasticModulus, 'elasticModulus');
  const G = E / (2 * (1 + finite(input.poissonRatio, 'poissonRatio')));
  const R = finite(input.bendRadius, 'bendRadius');
  const theta = finite(input.bendAngleRadians, 'bendAngleRadians');
  const { outerRadius: ro, innerRadius: ri, area: A, secondMoment: I } = section;
  const alpha = 4 / 3 * (ro ** 3 - ri ** 3) / ((ro ** 2 + ri ** 2) * (ro - ri));
  const B1 = theta - Math.sin(theta);
  const B2 = 1 - Math.cos(theta);
  const B3 = 0.25 * (2 * theta - Math.sin(2 * theta));
  const k = finite(input.flexibilityFactor, 'flexibilityFactor');
  const crossShape = B2 * (1 - B2 / 2);

  return Object.freeze({
    section,
    shearModulus: G,
    shearDistributionFactor: alpha,
    B1,
    B2,
    B3,
    crossShape,
    matrix: Object.freeze([
      Object.freeze([
        k * R ** 3 / (E * I) * (2 * B1 - B3) + alpha * R / (A * G) * B3,
        k * R ** 3 / (E * I) * (B2 ** 2 / 2) + alpha * R / (A * G) * crossShape,
        -k * R ** 2 / (E * I) * B1,
      ]),
      Object.freeze([
        k * R ** 3 / (E * I) * (B2 ** 2 / 2) + alpha * R / (A * G) * crossShape,
        k * R ** 3 / (E * I) * B3 + alpha * R / (A * G) * (theta - B3),
        -k * R ** 2 / (E * I) * B2,
      ]),
      Object.freeze([
        -k * R ** 2 / (E * I) * B1,
        -k * R ** 2 / (E * I) * B2,
        k * R * theta / (E * I),
      ]),
    ]),
  });
}

/**
 * Centroidal axial-strain flexibility from U_N = integral N^2/(2EA) ds.
 *
 * Final-point local axes follow the MEC-21/CAESAR convention: a is tangent at
 * the far end and c points toward the bend centre. At an arc station measured
 * backward by x from the far end, N = Pa*cos(x) - Pc*sin(x). Castigliano then
 * gives the symmetric 2x2 translational contribution below; moment rows/cols
 * receive no direct centroidal axial-strain term.
 */
function castiglianoAxialContribution(input) {
  const section = annulus(input.outerDiameter, input.wallThickness);
  const E = finite(input.elasticModulus, 'elasticModulus');
  const R = finite(input.bendRadius, 'bendRadius');
  const theta = finite(input.bendAngleRadians, 'bendAngleRadians');
  const B2 = 1 - Math.cos(theta);
  const B3 = 0.25 * (2 * theta - Math.sin(2 * theta));
  const crossShape = B2 * (1 - B2 / 2);
  const scale = R / (section.area * E);
  return Object.freeze({
    scaleRoverEA: scale,
    matrix: Object.freeze([
      Object.freeze([scale * (theta - B3), -scale * crossShape, 0]),
      Object.freeze([-scale * crossShape, scale * B3, 0]),
      Object.freeze([0, 0, 0]),
    ]),
  });
}

function simpsonIntegral(fn, a, b, panels = 20000) {
  if (panels % 2 !== 0) throw new TypeError('Simpson panels must be even.');
  const h = (b - a) / panels;
  let sum = fn(a) + fn(b);
  for (let index = 1; index < panels; index += 1) {
    sum += (index % 2 === 0 ? 2 : 4) * fn(a + index * h);
  }
  return sum * h / 3;
}

function quadratureAxialContribution(input) {
  const section = annulus(input.outerDiameter, input.wallThickness);
  const E = finite(input.elasticModulus, 'elasticModulus');
  const R = finite(input.bendRadius, 'bendRadius');
  const theta = finite(input.bendAngleRadians, 'bendAngleRadians');
  const scale = R / (section.area * E);
  return Object.freeze([
    Object.freeze([
      scale * simpsonIntegral((x) => Math.cos(x) ** 2, 0, theta),
      scale * simpsonIntegral((x) => -Math.cos(x) * Math.sin(x), 0, theta),
      0,
    ]),
    Object.freeze([
      scale * simpsonIntegral((x) => -Math.cos(x) * Math.sin(x), 0, theta),
      scale * simpsonIntegral((x) => Math.sin(x) ** 2, 0, theta),
      0,
    ]),
    Object.freeze([0, 0, 0]),
  ]);
}

function addMatrices(left, right) {
  return left.map((row, i) => Object.freeze(row.map((value, j) => value + right[i][j])));
}

function matrixSymmetryResidual(matrix) {
  let maximum = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = row + 1; column < matrix.length; column += 1) {
      maximum = Math.max(maximum, Math.abs(matrix[row][column] - matrix[column][row]));
    }
  }
  return maximum;
}

function validateQuadrature(example) {
  const cases = [15, 30, 45, 60, 90, 120].map((degrees) => {
    const input = { ...example, bendAngleRadians: degrees * Math.PI / 180 };
    const analytic = castiglianoAxialContribution(input).matrix;
    const numeric = quadratureAxialContribution(input);
    let maximumRelativeResidual = 0;
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        maximumRelativeResidual = Math.max(
          maximumRelativeResidual,
          assertRelative(numeric[row][column], analytic[row][column], QUADRATURE_REL_TOLERANCE, `quadrature.${degrees}.${row}.${column}`),
        );
      }
    }
    return Object.freeze({ degrees, maximumRelativeResidual });
  });
  return Object.freeze(cases);
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const exampleBase = {
    outerDiameter: 114.3,
    wallThickness: 6.0198,
    elasticModulus: 2e5,
    poissonRatio: 0.3,
    bendRadius: 152.4,
    bendAngleRadians: Math.PI / 2,
  };
  const section = annulus(exampleBase.outerDiameter, exampleBase.wallThickness);
  const meanRadius = (section.outerRadius + section.innerRadius) / 2;
  const h = exampleBase.wallThickness * exampleBase.bendRadius / meanRadius ** 2;
  const example = Object.freeze({ ...exampleBase, flexibilityFactor: 1.65 / h });

  const falseFlexibility = mec21PlanarFalseFlexibility(example);
  const published = Object.freeze([
    Object.freeze([1.2556e-5, 1.6462e-5, -1.1608e-7]),
    Object.freeze([1.6462e-5, 2.5858e-5, -2.0336e-7]),
    Object.freeze([-1.1608e-7, -2.0336e-7, 2.096e-9]),
  ]);
  const fixtureResiduals = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      fixtureResiduals.push(assertClose(
        falseFlexibility.matrix[row][column],
        published[row][column],
        INTERGRAPH_PRINT_ABS_TOLERANCE,
        `intergraphFalse.${row}.${column}`,
      ));
    }
  }

  const axial = castiglianoAxialContribution(example);
  const trueCandidate = addMatrices(falseFlexibility.matrix, axial.matrix);
  const symmetryResidual = Math.max(
    matrixSymmetryResidual(falseFlexibility.matrix),
    matrixSymmetryResidual(axial.matrix),
    matrixSymmetryResidual(trueCandidate),
  );
  if (symmetryResidual > SYMMETRY_ABS_TOLERANCE) {
    throw new Error(`Planar flexibility symmetry residual ${symmetryResidual} exceeds ${SYMMETRY_ABS_TOLERANCE}.`);
  }
  const quadrature = validateQuadrature(example);

  const result = Object.freeze({
    schema: 'lfea-m047-caesar-bend-axial-shape-authority/v1',
    status: 'PASS_DIAGNOSTIC_ONLY',
    productionPromotion: 'BLOCKED_PENDING_DIRECT_CAESAR_BEND_AXIAL_SHAPE_TRUE_PARITY_OR_EXPLICIT_PRIMARY_TRUE_MATRIX',
    scope: 'ISOLATED_MEC21_PLANAR_BEND_FLEXIBILITY_ONLY',
    authority: Object.freeze({
      caesarSetting: 'BEND_AXIAL_SHAPE',
      hexagonMeaning: 'TRUE retains the bend axial displacement mode; FALSE ignores it and makes the bend stiffer.',
      intergraphTraining: 'CAESAR II CAUx 2015 F=KX uses MEC-21 bend flexibility and sets Bend Axial Shape FALSE; the shown flexibility equations annotate removed R/(AE) terms.',
      mec21Method: 'Element flexibility coefficients are obtained by Castigliano theorem at the final point in local a-b-c axes.',
      derivationClassification: '[DERIVED_FROM_PRIMARY_METHOD_AND_AXIS_CONVENTION; NOT_BENCHMARK_FITTED]',
    }),
    intergraphFalseFixture: Object.freeze({
      input: example,
      computedFlexibility3x3: falseFlexibility.matrix,
      publishedRoundedFlexibility3x3: published,
      maximumAbsoluteResidual: Math.max(...fixtureResiduals),
      absoluteTolerance: INTERGRAPH_PRINT_ABS_TOLERANCE,
    }),
    axialShapeCandidate: Object.freeze({
      formula: Object.freeze({
        deltaA_Pa: 'R/(EA) * (theta - B3)',
        deltaA_Pc: '-R/(EA) * B2 * (1 - B2/2)',
        deltaC_Pa: '-R/(EA) * B2 * (1 - B2/2)',
        deltaC_Pc: 'R/(EA) * B3',
        momentTerms: '0',
        B2: '1 - cos(theta)',
        B3: '(2*theta - sin(2*theta))/4',
      }),
      contribution3x3: axial.matrix,
      falsePlusAxialCandidate3x3: trueCandidate,
      note: 'Candidate restores centroidal axial-strain energy only. It is not production authority until CAESAR TRUE parity or an explicit primary TRUE matrix is retained.',
    }),
    independentChecks: Object.freeze({
      symmetryMaximumAbsoluteResidual: symmetryResidual,
      quadratureAngleCases: quadrature,
      quadratureRelativeTolerance: QUADRATURE_REL_TOLERANCE,
    }),
  });

  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (args.outPath === null) process.stdout.write(json);
  else {
    mkdirSync(dirname(args.outPath), { recursive: true });
    writeFileSync(args.outPath, json, 'utf8');
  }
}

main();
