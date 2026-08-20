#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_WRC_EXACT_GAMMA_SCHEMA,
  EMP1_WRC_PRIMARY_PDF_SHA256,
  parseCylindricalExactGammaPackage,
  selectExactGammaCurve,
  evaluateCylindricalRationalCurve,
} from './emp1-wrc-cylindrical-exact-gamma-lib.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdown = await readFile(resolve(root, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const pkg = parseCylindricalExactGammaPackage(markdown);

assert.equal(pkg.schema, EMP1_WRC_EXACT_GAMMA_SCHEMA);
assert.equal(pkg.source.rawPdfSha256, EMP1_WRC_PRIMARY_PDF_SHA256);
assert.equal(pkg.source.independentVariable, 'BETA');
assert.equal(pkg.source.curveFitModel, 'RATIONAL_5_OVER_6');
assert.equal(pkg.capability.admittedGammaPolicy, 'EXACT_SOURCE_TABULATED_GAMMA_ONLY');
assert.equal(pkg.capability.nonTabulatedGamma, 'BLOCKED_NO_INTERPOLATION_AUTHORITY');
assert.equal(pkg.capability.originalVsExtrapolated, 'EXPLICIT_VARIANT_REQUIRED_NO_FALLBACK');

assert.equal(pkg.counts.tables, 28);
assert.equal(pkg.counts.qualifiedCurves, 321);
assert.equal(pkg.counts.unresolvedCurves, 1);
assert.equal(pkg.counts.originalQualifiedCurves, 177);
assert.equal(pkg.counts.originalUnresolvedCurves, 1);
assert.equal(pkg.counts.extrapolatedQualifiedCurves, 144);
assert.equal(pkg.counts.extrapolatedUnresolvedCurves, 0);
assert.equal(pkg.counts.sourceQualifiedScalars, 3210);
assert.equal(pkg.counts.sourceUnresolvedScalars, 10);

assert.equal(pkg.unresolvedRows.length, 1);
const unresolved = pkg.unresolvedRows[0];
assert.equal(unresolved.figure, '1B');
assert.equal(unresolved.variant, 'ORIGINAL');
assert.equal(unresolved.gamma, null);
assert.equal(unresolved.productionSelectable, false);
assert.match(unresolved.sourceLocator.document, /WRC537_2013\.pdf/u);

const byFamily = new Map();
for (const curve of pkg.curves) {
  const key = `${curve.figure}|${curve.variant}`;
  const rows = byFamily.get(key) ?? [];
  rows.push(curve);
  byFamily.set(key, rows);
}
const family = [...byFamily.values()].find((rows) => rows.length >= 2 && rows.every((row) => Number.isFinite(row.gamma)));
assert(family, 'need source family with at least two resolved gamma curves');
const sorted = [...family].sort((a,b) => a.gamma-b.gamma);
const sourceCurve = sorted[0];
const exact = selectExactGammaCurve(pkg, { figure: sourceCurve.figure, variant: sourceCurve.variant, gamma: sourceCurve.gamma });
assert.equal(exact.status, 'PASS_EXACT_SOURCE_TABULATED_GAMMA');
assert.equal(exact.interpolationUsed, false);
assert.equal(exact.extrapolationFallbackUsed, false);
assert.equal(exact.sourceGamma, sourceCurve.gamma);

const roundOffOnly = selectExactGammaCurve(pkg, {
  figure: sourceCurve.figure,
  variant: sourceCurve.variant,
  gamma: sourceCurve.gamma * (1 + 1e-13),
});
assert.equal(roundOffOnly.status, 'PASS_EXACT_SOURCE_TABULATED_GAMMA');

const midpoint = (sorted[0].gamma + sorted[1].gamma) / 2;
const nonTabulated = selectExactGammaCurve(pkg, { figure: sourceCurve.figure, variant: sourceCurve.variant, gamma: midpoint });
assert.match(nonTabulated.status, /^BLOCKED_/u);
assert.equal(nonTabulated.engineeringAuthority, false);
assert.equal(nonTabulated.interpolationUsed, false);
assert.equal(nonTabulated.extrapolationFallbackUsed, false);
assert(!nonTabulated.availableSourceGammas.some((gamma) => gamma === midpoint));

const synthetic = {
  schema: EMP1_WRC_EXACT_GAMMA_SCHEMA,
  source: { rawPdfSha256: EMP1_WRC_PRIMARY_PDF_SHA256 },
  curves: [
    { figure:'TEST', variant:'ORIGINAL', gamma:10, independentVariable:'BETA', coefficients:{a:1,b:0,c:0,d:0,e:0,f:0,g:0,h:0,i:0,j:0} },
    { figure:'TEST', variant:'EXTRAPOLATED', gamma:20, independentVariable:'BETA', coefficients:{a:2,b:0,c:0,d:0,e:0,f:0,g:0,h:0,i:0,j:0} },
  ],
  unresolvedRows: [],
};
const noVariantFallback = selectExactGammaCurve(synthetic, { figure:'TEST', variant:'ORIGINAL', gamma:20 });
assert.equal(noVariantFallback.status, 'BLOCKED_NON_TABULATED_GAMMA');
assert.equal(noVariantFallback.extrapolationFallbackUsed, false);

const beta = 0.155;
const evaluated = evaluateCylindricalRationalCurve(exact.curve, beta);
const c = exact.curve.coefficients;
const independent = (c.a + c.c*beta + c.e*beta**2 + c.g*beta**3 + c.i*beta**4)
  / (1 + c.b*beta + c.d*beta**2 + c.f*beta**3 + c.h*beta**4 + c.j*beta**5);
assert(Math.abs(evaluated.y-independent) <= 1e-14 * Math.max(1,Math.abs(independent)));

assert.throws(() => selectExactGammaCurve(pkg, { figure:sourceCurve.figure, variant:'STANDARD', gamma:sourceCurve.gamma }), /VARIANT_REQUIRED/u);
assert.throws(() => selectExactGammaCurve(pkg, { figure:sourceCurve.figure, variant:sourceCurve.variant, gamma:NaN }), /VALUE_INVALID/u);

console.log(JSON.stringify({
  schema:'emp1-wrc-cylindrical-exact-gamma-self-test/v1',
  status:'PASS',
  productionAuthority:false,
  counts:pkg.counts,
  boundedRestriction:{
    unresolvedCurve:unresolved.curveId,
    nonTabulatedGammaStatus:nonTabulated.status,
    crossVariantFallbackStatus:noVariantFallback.status,
  },
  exactSelectionExample:{
    figure:sourceCurve.figure,
    variant:sourceCurve.variant,
    gamma:sourceCurve.gamma,
    beta,
    y:evaluated.y,
  },
},null,2));
