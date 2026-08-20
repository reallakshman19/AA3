#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pageTextPath = process.argv[2] ?? '/tmp/wrc-page95.txt';
const oraclePath = resolve(root, 'validation/emp1/wrc537-2013/exact-gamma-oracle-1a-g5-v1.json');
const pdfPath = resolve(root, 'docs/emp1/WRC537_2013.pdf');
const [oracle, pageText, pdfBytes] = await Promise.all([
  readFile(oraclePath, 'utf8').then(JSON.parse),
  readFile(pageTextPath, 'utf8'),
  readFile(pdfPath),
]);

assert.equal(oracle.schema, 'emp1-wrc537-exact-gamma-oracle/v1');
assert.equal(oracle.productionObservationUsed, false);
assert.equal(oracle.productionAuthority, false);
assert.equal(oracle.authorization?.mayAuthorizeNonTabulatedGamma, false);
assert.equal(oracle.authorization?.mayAuthorizeGlobalEmp1CRoute, false);

const observedPdfSha256 = createHash('sha256').update(pdfBytes).digest('hex');
assert.equal(observedPdfSha256, oracle.source.rawPdfSha256, 'WRC PDF SHA-256 drift');
assert.match(pageText, /Curve Fit Coefficients for Figure 1A - Original/u);
assert.match(pageText, /Shell parameter/u);

const gammaHeader = pageText.split('\n').find((line) => /^\s*5\s+15\s+50\s+100\s+300\s*$/u.test(line));
assert(gammaHeader, '1A Original gamma header 5/15/50/100/300 not found on PDF page 95');

const names = ['a','b','c','d','e','f','g','h','i','j'];
const observedCoefficients = {};
for (const name of names) {
  const line = pageText.split('\n').find((candidate) => new RegExp(`^\\s*${name}\\s+`, 'u').test(candidate));
  assert(line, `coefficient row ${name} not found on PDF page 95`);
  const tokens = line.trim().split(/\s+/u);
  assert.equal(tokens[0], name);
  assert(tokens.length >= 6, `coefficient row ${name} lacks five gamma columns`);
  const gamma5 = Number(tokens[1]);
  assert(Number.isFinite(gamma5), `coefficient ${name}/gamma5 not numeric`);
  observedCoefficients[name] = gamma5;
  assert.equal(gamma5, oracle.semanticPayload.coefficients[name], `primary PDF coefficient mismatch:${name}`);
}

const p = oracle.semanticPayload;
assert.equal(p.figure, '1A');
assert.equal(p.variant, 'ORIGINAL');
assert.equal(p.gamma, 5);
assert.equal(p.beta, 0.155);
assert.equal(p.curveFitModel, 'RATIONAL_5_OVER_6');
const c = observedCoefficients;
const beta = p.beta;
const numerator = c.a + c.c*beta + c.e*beta**2 + c.g*beta**3 + c.i*beta**4;
const denominator = 1 + c.b*beta + c.d*beta**2 + c.f*beta**3 + c.h*beta**4 + c.j*beta**5;
const y = numerator / denominator;
const near = (actual, expected, scale = 1) => Math.abs(actual-expected) <= 2e-15 * Math.max(scale, Math.abs(expected));
assert(near(numerator, p.expected.numerator), `numerator drift:${numerator}`);
assert(near(denominator, p.expected.denominator), `denominator drift:${denominator}`);
assert(near(y, p.expected.y), `Y drift:${y}`);

const semanticHash = createHash('sha256').update(JSON.stringify(p)).digest('hex');
if (oracle.semanticHash != null) {
  assert.equal(semanticHash, oracle.semanticHash, 'oracle semantic hash drift');
}
const status = oracle.semanticHash == null ? 'PASS_CANDIDATE_HASH_NOT_FROZEN' : 'PASS_REOBSERVED_FROZEN_ORACLE';
console.log(JSON.stringify({
  schema:'emp1-wrc-exact-gamma-independent-oracle-check/v1',
  status,
  engineeringAuthority: oracle.semanticHash != null,
  productionAuthority:false,
  productionImports:[],
  productionObservationUsed:false,
  source:{
    rawPdfSha256:observedPdfSha256,
    pdfPage:95,
    figure:'1A - Original',
  },
  case:{gamma:p.gamma,beta:p.beta,coefficients:observedCoefficients,numerator,denominator,y},
  semanticHash,
},null,2));
