#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const INPUT_SCHEMA = 'lfea-m047-caesar-straight-pipe-shear-reference/v1';
const OUTPUT_SCHEMA = 'lfea-m047-caesar-straight-pipe-shear-inference/v1';

function fail(message) {
  throw new Error(message);
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`${label} must be finite.`);
  return number;
}

function positive(value, label) {
  const number = finite(value, label);
  if (!(number > 0)) fail(`${label} must be > 0.`);
  return number;
}

function ratio(value, label) {
  const number = finite(value, label);
  if (!(number >= 0 && number < 0.5)) fail(`${label} must be in [0, 0.5).`);
  return number;
}

function annulusProperties(section) {
  const outerDiameter = positive(section.outerDiameterM, `${section.sectionId}.outerDiameterM`);
  const wallThickness = positive(section.wallThicknessM, `${section.sectionId}.wallThicknessM`);
  const innerDiameter = outerDiameter - 2 * wallThickness;
  if (!(innerDiameter > 0)) fail(`${section.sectionId}: wall thickness closes the section.`);
  const area = Math.PI / 4 * (outerDiameter ** 2 - innerDiameter ** 2);
  const secondMoment = Math.PI / 64 * (outerDiameter ** 4 - innerDiameter ** 4);
  return { outerDiameter, innerDiameter, wallThickness, area, secondMoment };
}

function cowperHollowCircleKappa(innerDiameter, outerDiameter, poissonRatio) {
  const a = innerDiameter / outerDiameter;
  const onePlusA2 = 1 + a ** 2;
  return 6 * (1 + poissonRatio) * onePlusA2 ** 2
    / ((7 + 6 * poissonRatio) * onePlusA2 ** 2 + (20 + 12 * poissonRatio) * a ** 2);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function coefficientOfVariation(values) {
  const average = mean(values);
  if (!(Math.abs(average) > 0)) return Number.POSITIVE_INFINITY;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(average);
}

function linearFit(xs, ys) {
  const xMean = mean(xs);
  const yMean = mean(ys);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    sxx += (xs[i] - xMean) ** 2;
    sxy += (xs[i] - xMean) * (ys[i] - yMean);
  }
  if (!(sxx > 0)) fail('At least two distinct lengths are required.');
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const fitted = xs.map((x) => intercept + slope * x);
  const residuals = ys.map((y, i) => y - fitted[i]);
  const rmse = Math.sqrt(mean(residuals.map((value) => value ** 2)));
  const yScale = Math.max(...ys.map((value) => Math.abs(value)), Number.EPSILON);
  const relativeRmse = rmse / yScale;
  return { slope, intercept, rmse, relativeRmse, fitted, residuals };
}

function inferSection(section, options = {}) {
  const sectionId = String(section.sectionId ?? '').trim();
  if (!sectionId) fail('sectionId is required.');
  const { outerDiameter, innerDiameter, wallThickness, area, secondMoment } = annulusProperties({ ...section, sectionId });
  const elasticModulus = positive(section.elasticModulusPa, `${sectionId}.elasticModulusPa`);
  const poissonRatio = ratio(section.poissonRatio, `${sectionId}.poissonRatio`);
  const isotropicShearModulus = elasticModulus / (2 * (1 + poissonRatio));
  const shearModulus = section.shearModulusPa == null
    ? isotropicShearModulus
    : positive(section.shearModulusPa, `${sectionId}.shearModulusPa`);
  const cowperKappa = cowperHollowCircleKappa(innerDiameter, outerDiameter, poissonRatio);

  const tests = Array.isArray(section.tests) ? section.tests : [];
  if (tests.length < 3) fail(`${sectionId}: at least three cantilever lengths are required.`);

  const rows = tests.map((test, index) => {
    const length = positive(test.lengthM, `${sectionId}.tests[${index}].lengthM`);
    const force = finite(test.forceN, `${sectionId}.tests[${index}].forceN`);
    if (!(Math.abs(force) > 0)) fail(`${sectionId}.tests[${index}].forceN must be non-zero.`);
    const displacement = finite(test.tipDisplacementM, `${sectionId}.tests[${index}].tipDisplacementM`);
    const rotation = finite(test.tipRotationRad, `${sectionId}.tests[${index}].tipRotationRad`);
    const observedCompliance = Math.abs(displacement / force);
    const observedRotationCompliance = Math.abs(rotation / force);
    const bendingCompliance = length ** 3 / (3 * elasticModulus * secondMoment);
    const bendingRotationCompliance = length ** 2 / (2 * elasticModulus * secondMoment);
    const shearCompliance = observedCompliance - bendingCompliance;
    const eulerDisplacement = Math.abs(force) * bendingCompliance;
    const cowperDisplacement = Math.abs(force)
      * (bendingCompliance + length / (cowperKappa * shearModulus * area));
    const bendingRotation = Math.abs(force) * bendingRotationCompliance;
    const rotationRelativeError = Math.abs(rotation) > 0 || bendingRotation > 0
      ? Math.abs(Math.abs(rotation) - bendingRotation) / Math.max(Math.abs(rotation), bendingRotation, Number.EPSILON)
      : 0;
    const pointKappa = shearCompliance > 0
      ? length / (shearModulus * area * shearCompliance)
      : null;
    return {
      testId: test.testId ?? `${sectionId}-L${length}`,
      axis: test.axis ?? 'Y',
      lengthM: length,
      forceN: force,
      tipDisplacementM: displacement,
      tipRotationRad: rotation,
      observedComplianceMPerN: observedCompliance,
      eulerBendingComplianceMPerN: bendingCompliance,
      inferredShearComplianceMPerN: shearCompliance,
      pointKappa,
      predictedEulerTipDisplacementM: eulerDisplacement,
      predictedCowperTipDisplacementM: cowperDisplacement,
      predictedPureBendingTipRotationRad: bendingRotation,
      rotationRelativeError,
    };
  });

  const positiveShearRows = rows.filter((row) => row.inferredShearComplianceMPerN > 0 && row.pointKappa != null);
  const uniqueLengths = new Set(rows.map((row) => row.lengthM.toPrecision(12)));
  if (uniqueLengths.size < 3) fail(`${sectionId}: tests must contain at least three distinct lengths.`);

  const maxRotationRelativeError = Math.max(...rows.map((row) => row.rotationRelativeError));
  const maxObservedCompliance = Math.max(...rows.map((row) => row.observedComplianceMPerN));
  const maxPositiveShearCompliance = positiveShearRows.length === 0
    ? 0
    : Math.max(...positiveShearRows.map((row) => row.inferredShearComplianceMPerN));
  const shearFraction = maxPositiveShearCompliance / Math.max(maxObservedCompliance, Number.EPSILON);

  let classification = 'INCONCLUSIVE';
  let fit = null;
  let inferredKappa = null;
  let pointKappaMedian = null;
  let pointKappaCv = null;
  let cowperRelativeDifference = null;

  if (positiveShearRows.length >= 3) {
    fit = linearFit(
      positiveShearRows.map((row) => row.lengthM),
      positiveShearRows.map((row) => row.inferredShearComplianceMPerN),
    );
    if (fit.slope > 0) {
      inferredKappa = 1 / (shearModulus * area * fit.slope);
      const pointKappas = positiveShearRows.map((row) => row.pointKappa);
      pointKappaMedian = median(pointKappas);
      pointKappaCv = coefficientOfVariation(pointKappas);
      cowperRelativeDifference = Math.abs(inferredKappa - cowperKappa) / cowperKappa;
      const rotationTolerance = options.rotationTolerance ?? 0.03;
      const linearityTolerance = options.linearityTolerance ?? 0.05;
      const kappaCvTolerance = options.kappaCvTolerance ?? 0.08;
      if (
        inferredKappa > 0
        && inferredKappa < 2
        && fit.relativeRmse <= linearityTolerance
        && pointKappaCv <= kappaCvTolerance
        && maxRotationRelativeError <= rotationTolerance
      ) {
        classification = 'CONSISTENT_WITH_TIMOSHENKO_TRANSVERSE_SHEAR';
      }
    }
  }

  if (classification === 'INCONCLUSIVE' && shearFraction <= (options.eulerShearFractionTolerance ?? 1e-4)) {
    classification = maxRotationRelativeError <= (options.rotationTolerance ?? 0.03)
      ? 'EULER_LIKE_NO_RESOLVABLE_TRANSVERSE_SHEAR'
      : 'INCONCLUSIVE';
  }

  return {
    sectionId,
    geometry: { outerDiameterM: outerDiameter, innerDiameterM: innerDiameter, wallThicknessM: wallThickness, areaM2: area, secondMomentM4: secondMoment },
    material: {
      elasticModulusPa: elasticModulus,
      poissonRatio,
      shearModulusPa: shearModulus,
      isotropicShearModulusPa: isotropicShearModulus,
      shearModulusSource: section.shearModulusPa == null ? 'DERIVED_E_OVER_2_ONE_PLUS_NU' : 'INPUT',
    },
    cowperHollowCircleKappa: cowperKappa,
    classification,
    inferredKappa,
    pointKappaMedian,
    pointKappaCoefficientOfVariation: pointKappaCv,
    cowperRelativeDifference,
    shearComplianceFit: fit,
    maxRotationRelativeError,
    maximumResolvedShearFractionOfTotalCompliance: shearFraction,
    rows,
  };
}

function analyze(input) {
  if (input?.schema !== INPUT_SCHEMA) fail(`Input schema must be ${INPUT_SCHEMA}.`);
  if (!Array.isArray(input.sections) || input.sections.length === 0) fail('sections must be a non-empty array.');
  const sections = input.sections.map((section) => inferSection(section, input.tolerances ?? {}));
  return {
    schema: OUTPUT_SCHEMA,
    source: input.source ?? null,
    caesarVersion: input.caesarVersion ?? null,
    modelProtocol: input.modelProtocol ?? null,
    acceptanceBoundary: 'Inference uses only CAESAR unit-load displacements/rotations and section/material inputs. BM4 reference residuals are not inputs.',
    sections,
    allSectionsConsistentWithTimoshenko: sections.every((section) => section.classification === 'CONSISTENT_WITH_TIMOSHENKO_TRANSVERSE_SHEAR'),
  };
}

function syntheticInput(kappa) {
  const outerDiameterM = 0.273;
  const wallThicknessM = 0.018263;
  const elasticModulusPa = 2.0e11;
  const poissonRatio = 0.3;
  const innerDiameter = outerDiameterM - 2 * wallThicknessM;
  const area = Math.PI / 4 * (outerDiameterM ** 2 - innerDiameter ** 2);
  const secondMoment = Math.PI / 64 * (outerDiameterM ** 4 - innerDiameter ** 4);
  const shearModulus = elasticModulusPa / (2 * (1 + poissonRatio));
  const forceN = 10000;
  return {
    schema: INPUT_SCHEMA,
    source: 'SYNTHETIC_SELF_TEST',
    caesarVersion: 'SELF_TEST',
    sections: [{
      sectionId: 'SYNTHETIC-273',
      outerDiameterM,
      wallThicknessM,
      elasticModulusPa,
      poissonRatio,
      tests: [1.0, 2.0, 4.0, 8.0].map((lengthM) => ({
        testId: `L${lengthM}`,
        axis: 'Y',
        lengthM,
        forceN,
        tipDisplacementM: forceN * (lengthM ** 3 / (3 * elasticModulusPa * secondMoment) + lengthM / (kappa * shearModulus * area)),
        tipRotationRad: forceN * lengthM ** 2 / (2 * elasticModulusPa * secondMoment),
      })),
    }],
  };
}

function selfTest() {
  const expectedKappa = 0.535;
  const result = analyze(syntheticInput(expectedKappa));
  const section = result.sections[0];
  if (section.classification !== 'CONSISTENT_WITH_TIMOSHENKO_TRANSVERSE_SHEAR') {
    fail(`Self-test classification failed: ${section.classification}`);
  }
  if (Math.abs(section.inferredKappa - expectedKappa) > 1e-10) {
    fail(`Self-test kappa mismatch: ${section.inferredKappa}`);
  }
  process.stdout.write(`${JSON.stringify({ status: 'PASS', expectedKappa, inferredKappa: section.inferredKappa }, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = { input: null, out: null, selfTest: false, requireTimoshenko: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--self-test') args.selfTest = true;
    else if (token === '--require-timoshenko') args.requireTimoshenko = true;
    else if (token === '--input') args.input = argv[++i];
    else if (token === '--out') args.out = argv[++i];
    else fail(`Unknown argument: ${token}`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    selfTest();
    return;
  }
  if (!args.input) fail('Usage: node scripts/lfea-m047-caesar-straight-pipe-shear-inference.mjs --input <reference.json> [--out <report.json>] [--require-timoshenko]');
  const inputPath = path.resolve(args.input);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const result = analyze(input);
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (args.out) fs.writeFileSync(path.resolve(args.out), text);
  process.stdout.write(text);
  if (args.requireTimoshenko && !result.allSectionsConsistentWithTimoshenko) process.exitCode = 2;
}

main();
