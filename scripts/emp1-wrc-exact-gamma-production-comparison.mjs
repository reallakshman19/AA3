#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateEmp1Wrc537ExactGammaCurve,
  EMP1_WRC537_EXACT_GAMMA_CORE_SCHEMA,
} from '../src/core/emp1/emp1-wrc537-exact-gamma.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async (relativePath) => JSON.parse(await readFile(resolve(root, relativePath), 'utf8'));
const oracle = await readJson('validation/emp1/wrc537-2013/exact-gamma-oracle-1a-g5-v1.json');
const capability = await readJson('validation/emp1/wrc537-2013/exact-gamma-capability-v1.json');

assert.equal(oracle.status, 'PASS_REOBSERVED_INDEPENDENT_EXACT_GAMMA_ORACLE');
assert.equal(oracle.engineeringAuthority, true);
assert.equal(oracle.productionObservationUsed, false);
assert.equal(oracle.reobservation?.status, 'PASS');
assert.deepEqual(oracle.reobservation?.productionImports, []);
assert.equal(capability.status, 'PASS_BOUNDED_EXACT_TABULATED_GAMMA_SELECTION');
assert.equal(capability.authorization?.boundedProductionComparisonAllowed, true);
assert.equal(capability.authorization?.globalEmp1CRouteRegistrationAllowed, false);
assert.equal(capability.authorization?.nonTabulatedGammaEngineeringUse, false);
assert.equal(capability.qualificationEvidence?.independentExactGammaOracleHash, oracle.semanticHash);

const p = oracle.semanticPayload;
const productionInput = {
  sourceDocumentSha256: oracle.source.rawPdfSha256,
  figure: p.figure,
  variant: p.variant,
  gamma: p.gamma,
  sourceGamma: p.gamma,
  beta: p.beta,
  curveFitModel: p.curveFitModel,
  gammaSelectionPolicy: capability.qualifiedDomain.gammaSelection,
  sourceParameterResolved: true,
  interpolationUsed: false,
  extrapolationFallbackUsed: false,
  coefficients: p.coefficients,
};
const result = evaluateEmp1Wrc537ExactGammaCurve(productionInput);
assert.equal(result.schema, EMP1_WRC537_EXACT_GAMMA_CORE_SCHEMA);
assert.equal(result.state, 'EVALUATED_WITHIN_BOUNDED_DOMAIN');
assert.equal(result.engineeringUseAuthorized, true);
assert.equal(result.globalRouteAuthority, false);
assert.equal(result.fullDomainAuthority, false);
assert.equal(result.interpolationUsed, false);
assert.equal(result.extrapolationFallbackUsed, false);

const tolerance = 2e-15;
const near = (actual, expected) => Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));
assert(near(result.numerator, p.expected.numerator), `production numerator mismatch:${result.numerator}`);
assert(near(result.denominator, p.expected.denominator), `production denominator mismatch:${result.denominator}`);
assert(near(result.y, p.expected.y), `production Y mismatch:${result.y}`);

const expectCode = (mutate, code) => {
  const candidate = structuredClone(productionInput);
  mutate(candidate);
  assert.throws(
    () => evaluateEmp1Wrc537ExactGammaCurve(candidate),
    (error) => error?.code === code,
    code,
  );
};
expectCode((row) => { row.gamma = 7.5; }, 'EMP1_WRC537_NON_TABULATED_GAMMA_BLOCKED');
expectCode((row) => { row.interpolationUsed = true; }, 'EMP1_WRC537_EXACT_GAMMA_INTERPOLATION_PROHIBITED');
expectCode((row) => { row.extrapolationFallbackUsed = true; }, 'EMP1_WRC537_EXACT_GAMMA_VARIANT_FALLBACK_PROHIBITED');
expectCode((row) => { row.sourceParameterResolved = false; }, 'EMP1_WRC537_EXACT_GAMMA_SOURCE_PARAMETER_UNRESOLVED');
expectCode((row) => { row.sourceDocumentSha256 = '0'.repeat(64); }, 'EMP1_WRC537_EXACT_GAMMA_SOURCE_SHA_MISMATCH');
expectCode((row) => { row.curveFitModel = 'NINTH_ORDER_POLYNOMIAL'; }, 'EMP1_WRC537_EXACT_GAMMA_CURVE_MODEL_INVALID');
expectCode((row) => { row.gammaSelectionPolicy = 'LINEAR_INTERPOLATION'; }, 'EMP1_WRC537_EXACT_GAMMA_SELECTION_POLICY_INVALID');

console.log(JSON.stringify({
  schema:'emp1-wrc537-exact-gamma-production-comparison/v1',
  status:'PASS',
  engineeringAuthority:true,
  globalRouteAuthority:false,
  fullDomainAuthority:false,
  expectedSource:'FROZEN_INDEPENDENT_WRC_PDF_ORACLE',
  oracleSemanticHash:oracle.semanticHash,
  productionModule:'src/core/emp1/emp1-wrc537-exact-gamma.js',
  case:{figure:p.figure,variant:p.variant,gamma:p.gamma,beta:p.beta},
  expected:p.expected,
  actual:{numerator:result.numerator,denominator:result.denominator,y:result.y},
  tolerance,
  negativeProofs:[
    'NON_TABULATED_GAMMA_BLOCKED',
    'INTERPOLATION_FLAG_BLOCKED',
    'VARIANT_FALLBACK_FLAG_BLOCKED',
    'UNRESOLVED_SOURCE_PARAMETER_BLOCKED',
    'SOURCE_SHA_SUBSTITUTION_BLOCKED',
    'LEGACY_POLYNOMIAL_MODEL_BLOCKED',
    'INTERPOLATION_POLICY_SUBSTITUTION_BLOCKED'
  ]
},null,2));
