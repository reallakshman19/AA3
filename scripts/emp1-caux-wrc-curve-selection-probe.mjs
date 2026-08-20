#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdown = await readFile(resolve(repoRoot, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const benchmark = JSON.parse(await readFile(resolve(repoRoot, 'validation/emp1/caux2017-wrc01f/benchmark-source-pp24-31-v2.json'), 'utf8')).benchmark;
const targetGamma = benchmark.geometry.dimensionless.gammaSourceReported;
const beta = benchmark.geometry.dimensionless.betaSourceReported;
const tables = parseCylindricalTables(markdown);
const targets = flattenTargets(benchmark.curveOrdinates);

const results = [];
for (const target of targets) {
  const candidates = tables.filter((table) => canonicalFigure(table.figure) === canonicalFigure(target.figure));
  assert(candidates.length > 0, `No WRC coefficient table for benchmark figure ${target.figure}`);
  const evaluated = candidates.map((table) => evaluateTableAtGamma(table, targetGamma, beta, target.value));
  results.push({ ...target, targetGamma, beta, candidates: evaluated });
}

const schemeSummary = {};
for (const row of results) {
  for (const candidate of row.candidates) {
    for (const [scheme, observation] of Object.entries(candidate.schemes)) {
      const key = `${candidate.variant}|${scheme}`;
      const bucket = schemeSummary[key] ?? { count: 0, available: 0, within0005: 0, within001: 0, within002: 0, maxAbsError: 0, rmsAccumulator: 0 };
      bucket.count += 1;
      if (observation.available) {
        bucket.available += 1;
        bucket.maxAbsError = Math.max(bucket.maxAbsError, observation.absError);
        bucket.rmsAccumulator += observation.error ** 2;
        if (observation.absError <= 0.0005) bucket.within0005 += 1;
        if (observation.absError <= 0.001) bucket.within001 += 1;
        if (observation.absError <= 0.002) bucket.within002 += 1;
      }
      schemeSummary[key] = bucket;
    }
  }
}
for (const bucket of Object.values(schemeSummary)) {
  bucket.rmsError = bucket.available ? Math.sqrt(bucket.rmsAccumulator / bucket.available) : null;
  delete bucket.rmsAccumulator;
}

const ranked = Object.entries(schemeSummary)
  .filter(([, row]) => row.available > 0)
  .sort((a, b) => b[1].within001 - a[1].within001 || a[1].rmsError - b[1].rmsError || a[1].maxAbsError - b[1].maxAbsError)
  .map(([policy, metrics]) => ({ policy, ...metrics }));

console.log(JSON.stringify({
  schema: 'emp1-caux-wrc-curve-selection-probe/v1',
  status: 'PASS_PROBE_ONLY',
  authority: 'NON_AUTHORITATIVE_NUMERICAL_POLICY_PROBE',
  source: {
    wrcPdfSha256: '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
    cauxPdfSha256: 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e',
    benchmarkSemanticHash: '8d97539f03f077321eef1e496e315a6a7700a9d83a6c8cd4ff1b83382ebe45fe',
  },
  targetGamma,
  beta,
  targetCount: targets.length,
  rankedPolicies: ranked,
  results,
  interpretationRule: 'This probe may falsify candidate selection/interpolation policies. It does not by itself turn a policy into WRC source authority. Coefficient interpolation is included only as a comparator and remains prohibited unless independently authorized.',
}, null, 2));

function parseCylindricalTables(text) {
  const lines = String(text).replace(/\r/gu, '').split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^### Curve Fit Coefficients for Figure (.+?)\s*$/u);
    if (!match) continue;
    const figure = match[1].trim();
    if (/^(?:SP|SM|SR)-/u.test(figure)) continue;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^### Curve Fit Coefficients for Figure /u.test(lines[j]) || /^## /u.test(lines[j])) { end = j; break; }
    }
    const block = lines.slice(i + 1, end);
    const pageMatch = block.find((line) => /^\*\*PDF Page \d+\*\*/u.test(line))?.match(/PDF Page (\d+)/u);
    assert(pageMatch, `${figure}: PDF page`);
    const rows = block.map(parseRow).filter(Boolean);
    const header = rows.find((row) => row.length === 11 && row[0] === '' && row.slice(1).join('|') === 'a|b|c|d|e|f|g|h|i|j');
    assert(header, `${figure}: gamma/coefficient header`);
    const curves = [];
    for (const row of rows) {
      if (row.length !== 11 || !row.slice(1).every((cell) => cell !== '' && Number.isFinite(Number(cell)))) continue;
      const gammaText = row[0].trim();
      curves.push({
        gamma: gammaText !== '' && Number.isFinite(Number(gammaText)) ? Number(gammaText) : null,
        gammaRaw: gammaText,
        coefficients: Object.fromEntries(['a','b','c','d','e','f','g','h','i','j'].map((name, index) => [name, Number(row[index + 1])])),
      });
    }
    assert(curves.length > 0, `${figure}: no coefficient curves`);
    result.push({
      figure,
      pdfPage: Number(pageMatch[1]),
      variant: /Extrapolated/iu.test(figure) ? 'EXTRAPOLATED' : /Original/iu.test(figure) ? 'ORIGINAL' : 'STANDARD',
      curves,
    });
  }
  return result;
}

function evaluateTableAtGamma(table, gamma, x, target) {
  const resolved = table.curves.filter((curve) => Number.isFinite(curve.gamma)).sort((a,b) => a.gamma - b.gamma);
  const exact = resolved.find((curve) => curve.gamma === gamma) ?? null;
  let lower = null;
  let upper = null;
  for (const curve of resolved) {
    if (curve.gamma < gamma) lower = curve;
    if (curve.gamma > gamma) { upper = curve; break; }
  }
  if (exact) { lower = exact; upper = exact; }

  const schemes = {
    EXACT_GAMMA_Y: unavailable(),
    LINEAR_Y_IN_GAMMA: unavailable(),
    LINEAR_Y_IN_LOG_GAMMA: unavailable(),
    LINEAR_Y_IN_INVERSE_GAMMA: unavailable(),
    LINEAR_COEFFICIENTS_IN_GAMMA_THEN_Y: unavailable(),
    LOWER_BRACKET_Y: unavailable(),
    UPPER_BRACKET_Y: unavailable(),
  };

  if (exact) schemes.EXACT_GAMMA_Y = observation(evaluate(exact.coefficients, x), target);
  if (lower) schemes.LOWER_BRACKET_Y = observation(evaluate(lower.coefficients, x), target);
  if (upper) schemes.UPPER_BRACKET_Y = observation(evaluate(upper.coefficients, x), target);

  if (lower && upper && lower.gamma !== upper.gamma) {
    const y0 = evaluate(lower.coefficients, x);
    const y1 = evaluate(upper.coefficients, x);
    schemes.LINEAR_Y_IN_GAMMA = observation(interpolate(lower.gamma, y0, upper.gamma, y1, gamma), target);
    schemes.LINEAR_Y_IN_LOG_GAMMA = observation(interpolate(Math.log(lower.gamma), y0, Math.log(upper.gamma), y1, Math.log(gamma)), target);
    schemes.LINEAR_Y_IN_INVERSE_GAMMA = observation(interpolate(1/lower.gamma, y0, 1/upper.gamma, y1, 1/gamma), target);
    const coeff = {};
    for (const name of ['a','b','c','d','e','f','g','h','i','j']) coeff[name] = interpolate(lower.gamma, lower.coefficients[name], upper.gamma, upper.coefficients[name], gamma);
    schemes.LINEAR_COEFFICIENTS_IN_GAMMA_THEN_Y = observation(evaluate(coeff, x), target);
  }

  return {
    tableFigure: table.figure,
    canonicalFigure: canonicalFigure(table.figure),
    variant: table.variant,
    pdfPage: table.pdfPage,
    resolvedGammaRange: [resolved[0]?.gamma ?? null, resolved.at(-1)?.gamma ?? null],
    bracket: { lowerGamma: lower?.gamma ?? null, upperGamma: upper?.gamma ?? null },
    unresolvedGammaRows: table.curves.filter((curve) => curve.gamma == null).length,
    schemes,
  };
}

function flattenTargets(curveOrdinates) {
  const out = [];
  for (const [stressDirection, rows] of Object.entries(curveOrdinates)) {
    for (const [quantity, item] of Object.entries(rows)) out.push({ stressDirection, quantity, figure: item.figure, targetY: item.value, value: item.value });
  }
  return out;
}
function evaluate(c, x) {
  const numerator = c.a + c.c*x + c.e*x**2 + c.g*x**3 + c.i*x**4;
  const denominator = 1 + c.b*x + c.d*x**2 + c.f*x**3 + c.h*x**4 + c.j*x**5;
  if (!Number.isFinite(denominator) || denominator === 0) throw new RangeError('EMP1_CAUX_WRC_CURVE_DENOMINATOR_INVALID');
  return numerator / denominator;
}
function interpolate(x0,y0,x1,y1,x) { return y0 + (x-x0)*(y1-y0)/(x1-x0); }
function observation(value,target) { const error=value-target; return { available:true, value, error, absError:Math.abs(error) }; }
function unavailable() { return { available:false, value:null, error:null, absError:null }; }
function canonicalFigure(value) { return String(value).replace(/\s+[–-]\s+(Original|Extrapolated.*)$/iu,'').replace(/[-\s]/gu,'').toUpperCase(); }
function parseRow(line) {
  const text = String(line).trim();
  if (!text.startsWith('|') || !text.endsWith('|')) return null;
  return text.slice(1,-1).split('|').map((cell)=>cell.trim());
}
