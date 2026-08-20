#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// EMP1-01 independent engineering baseline.
// Deliberately imports no src/core module and observes no production EMP.1 output.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baselinePath = resolve(root, 'validation/emp1/wrc537-2013/main-baseline-gamma15-handcalc-v1.json');
const pdfPath = resolve(root, 'docs/emp1/WRC537_2013.pdf');
const markdownPath = resolve(root, 'docs/emp1/WRC537_2013_Tables_and_Charts.md');
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const pdfBytes = await readFile(pdfPath);
const markdownBytes = await readFile(markdownPath);
const markdown = markdownBytes.toString('utf8');

assert.equal(baseline.status, 'FROZEN_CURRENT_MAIN_INDEPENDENT_HANDCALC_BASELINE');
assert.equal(baseline.authority.productionAuthority, false);
assert.equal(baseline.authority.routeRegistrationAuthority, false);
assert.equal(baseline.authority.codeComplianceAuthority, false);
assert.equal(sha256(pdfBytes), baseline.source.rawPdfSha256, 'WRC PDF SHA-256 drift');
assert.equal(gitBlobSha1(markdownBytes), baseline.source.sourceExtractionGitBlobSha1, 'WRC source extraction Git blob drift');

const { geometry, loadsAtWrcAttachmentReferencePoint: loads } = baseline.case;
const gamma = geometry.meanRadius / geometry.shellThickness;
const beta = 0.875 * geometry.attachmentRadius / geometry.meanRadius;
close(gamma, baseline.domain.gamma, 'gamma');
close(beta, baseline.domain.beta, 'beta');
assert.equal(baseline.domain.differentialPressure, 0);
assert.equal(baseline.domain.Kn, 1);
assert.equal(baseline.domain.Kb, 1);
assert.equal(baseline.domain.interpolationUsed, false);
assert.equal(baseline.domain.extrapolationUsed, false);
assert.equal(baseline.domain.crossVariantFallbackUsed, false);

const figureMap = {
  circumferential: baseline.figureMap.circumferential,
  longitudinal: baseline.figureMap.longitudinal,
};
const figures = [...new Set([...Object.values(figureMap.circumferential), ...Object.values(figureMap.longitudinal)])];
assert.equal(figures.length, 14, 'Table-5 full route must use 14 unique figures');

const sourceRows = {};
const ordinates = {};
for (const figure of figures) {
  const row = parseGammaOriginal(markdown, figure, baseline.domain.gamma);
  sourceRows[figure] = row;
  ordinates[figure] = rational(row.coefficients, baseline.domain.beta);
  assert.equal(row.pdfPage, baseline.sourceCoefficientPages[figure], `source page drift:${figure}`);
}

const q = {
  circumferential: Object.fromEntries(Object.entries(figureMap.circumferential).map(([key, figure]) => [key, ordinates[figure]])),
  longitudinal: Object.fromEntries(Object.entries(figureMap.longitudinal).map(([key, figure]) => [key, ordinates[figure]])),
};
compareObject(q.circumferential, baseline.expected.curveOrdinates.circumferential, 'curveOrdinates.circumferential');
compareObject(q.longitudinal, baseline.expected.curveOrdinates.longitudinal, 'curveOrdinates.longitudinal');

const Rm = geometry.meanRadius;
const T = geometry.shellThickness;
const r0 = geometry.attachmentRadius;
const Kn = baseline.domain.Kn;
const Kb = baseline.domain.Kb;
const scale = {
  pMem: Math.abs(loads.P) * Kn / (Rm * T),
  pBend: 6 * Math.abs(loads.P) * Kb / T ** 2,
  mcMem: Math.abs(loads.Mc) * Kn / (Rm ** 2 * beta * T),
  mcBend: 6 * Math.abs(loads.Mc) * Kb / (Rm * beta * T ** 2),
  mlMem: Math.abs(loads.Ml) * Kn / (Rm ** 2 * beta * T),
  mlBend: 6 * Math.abs(loads.Ml) * Kb / (Rm * beta * T ** 2),
  vcShear: Math.abs(loads.Vc) / (Math.PI * r0 * T),
  vlShear: Math.abs(loads.Vl) / (Math.PI * r0 * T),
  mtShear: Math.abs(loads.Mt) / (2 * Math.PI * r0 ** 2 * T),
};
compareObject(scale, baseline.expected.scaleFactors, 'scaleFactors');

const LOC = baseline.expected.locations;
assert.deepEqual(LOC, ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl']);
const SIGN = {
  pMem: [-1, -1, -1, -1, -1, -1, -1, -1],
  pBend: [-1, 1, -1, 1, -1, 1, -1, 1],
  mcMem: [0, 0, 0, 0, -1, -1, 1, 1],
  mcBend: [0, 0, 0, 0, -1, 1, 1, -1],
  mlMem: [-1, -1, 1, 1, 0, 0, 0, 0],
  mlBend: [-1, 1, 1, -1, 0, 0, 0, 0],
  vc: [1, 1, -1, -1, 0, 0, 0, 0],
  vl: [0, 0, 0, 0, -1, -1, 1, 1],
  mt: [1, 1, 1, 1, 1, 1, 1, 1],
};

const circComponents = {
  Pmem: apply(SIGN.pMem, loads.P, grouped(q.circumferential.Pmem_AB * scale.pMem, q.circumferential.Pmem_CD * scale.pMem)),
  Pbend: apply(SIGN.pBend, loads.P, grouped(q.circumferential.Pbend_AB * scale.pBend, q.circumferential.Pbend_CD * scale.pBend)),
  Mcmem: apply(SIGN.mcMem, loads.Mc, q.circumferential.Mcmem * scale.mcMem),
  Mcbend: apply(SIGN.mcBend, loads.Mc, q.circumferential.Mcbend * scale.mcBend),
  Mlmem: apply(SIGN.mlMem, loads.Ml, q.circumferential.Mlmem * scale.mlMem),
  Mlbend: apply(SIGN.mlBend, loads.Ml, q.circumferential.Mlbend * scale.mlBend),
};
const longComponents = {
  Pmem: apply(SIGN.pMem, loads.P, grouped(q.longitudinal.Pmem_AB * scale.pMem, q.longitudinal.Pmem_CD * scale.pMem)),
  Pbend: apply(SIGN.pBend, loads.P, grouped(q.longitudinal.Pbend_AB * scale.pBend, q.longitudinal.Pbend_CD * scale.pBend)),
  Mcmem: apply(SIGN.mcMem, loads.Mc, q.longitudinal.Mcmem * scale.mcMem),
  Mcbend: apply(SIGN.mcBend, loads.Mc, q.longitudinal.Mcbend * scale.mcBend),
  Mlmem: apply(SIGN.mlMem, loads.Ml, q.longitudinal.Mlmem * scale.mlMem),
  Mlbend: apply(SIGN.mlBend, loads.Ml, q.longitudinal.Mlbend * scale.mlBend),
};
const shearComponents = {
  Vc: apply(SIGN.vc, loads.Vc, scale.vcShear),
  Vl: apply(SIGN.vl, loads.Vl, scale.vlShear),
  Mt: apply(SIGN.mt, loads.Mt, scale.mtShear),
};
const circumferential = sum(LOC, circComponents);
const longitudinal = sum(LOC, longComponents);
const shear = sum(LOC, shearComponents);
const stressIntensity = LOC.map((_, i) => tresca(circumferential[i], longitudinal[i], shear[i]));
compareArray(circumferential, baseline.expected.circumferentialStress, 'circumferentialStress');
compareArray(longitudinal, baseline.expected.longitudinalStress, 'longitudinalStress');
compareArray(shear, baseline.expected.shearStress, 'shearStress');
compareArray(stressIntensity, baseline.expected.stressIntensity, 'stressIntensity');

const governingIndex = stressIntensity.reduce((best, value, i, values) => value > values[best] ? i : best, 0);
assert.equal(LOC[governingIndex], baseline.expected.governing.location, 'governing location drift');
close(stressIntensity[governingIndex], baseline.expected.governing.stressIntensity, 'governing stress intensity');

console.log(JSON.stringify({
  schema: 'emp1-current-main-gamma15-independent-baseline-check/v1',
  status: 'PASS',
  productionImports: [],
  productionObservationUsed: false,
  source: {
    pdfSha256: sha256(pdfBytes),
    extractionGitBlobSha1: gitBlobSha1(markdownBytes),
    figures: figures.length,
    sourceRows: Object.keys(sourceRows).length,
  },
  case: { gamma, beta },
  comparisons: {
    curveOrdinates: 16,
    scaleFactors: 9,
    stressComponents: 24,
    stressIntensities: 8,
  },
  governing: {
    location: LOC[governingIndex],
    stressIntensity: stressIntensity[governingIndex],
  },
}, null, 2));

function parseGammaOriginal(markdownText, figure, targetGamma) {
  const escaped = figure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^### Curve Fit Coefficients for Figure ${escaped}\\s+[–-]\\s+Original\\s*$`, 'mu');
  const match = re.exec(markdownText);
  assert(match, `source heading missing:${figure}`);
  const start = match.index + match[0].length;
  const rest = markdownText.slice(start);
  const next = rest.search(/^### Curve Fit Coefficients for Figure |^## /mu);
  const block = next >= 0 ? rest.slice(0, next) : rest;
  const page = Number(block.match(/\*\*PDF Page (\d+)\*\*/u)?.[1]);
  assert(Number.isInteger(page), `page missing:${figure}`);
  const lines = block.replace(/\r/gu, '').split('\n');
  const mdRows = lines.map(parseRow).filter(Boolean);
  const coefficientOrder = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const header = mdRows.find((row) => row.length === 11 && row[0] === '' && row.slice(1).join('|') === coefficientOrder.join('|'));
  if (header) {
    const row = mdRows.find((cells) => cells.length === 11 && Number(cells[0]) === targetGamma && cells.slice(1).every((x) => Number.isFinite(Number(x))));
    assert(row, `gamma${targetGamma} row missing:${figure}`);
    return { pdfPage: page, gamma: targetGamma, coefficients: Object.fromEntries(coefficientOrder.map((name, i) => [name, Number(row[i + 1])])) };
  }
  const coeffRows = mdRows.filter((row) => coefficientOrder.includes(row[0]));
  assert.equal(coeffRows.length, 10, `coefficient row count:${figure}`);
  const count = coeffRows[0].length - 1;
  assert(count > 0 && coeffRows.every((row) => row.length - 1 === count), `coefficient shape:${figure}`);
  const firstCoeffLineIndex = lines.findIndex((line) => {
    const row = parseRow(line);
    return row && coefficientOrder.includes(row[0]);
  });
  const candidates = lines.slice(0, firstCoeffLineIndex).map(parseRow).filter((row) => row && row.length === count + 1);
  const gammaHeader = [...candidates].reverse().find((row) => row[0] === '');
  assert(gammaHeader, `gamma header missing:${figure}`);
  const column = gammaHeader.slice(1).findIndex((x) => Number(x) === targetGamma);
  assert(column >= 0, `gamma${targetGamma} column missing:${figure}`);
  return { pdfPage: page, gamma: targetGamma, coefficients: Object.fromEntries(coeffRows.map((row) => [row[0], Number(row[column + 1])])) };
}

function rational(c, x) {
  const numerator = c.a + c.c * x + c.e * x ** 2 + c.g * x ** 3 + c.i * x ** 4;
  const denominator = 1 + c.b * x + c.d * x ** 2 + c.f * x ** 3 + c.h * x ** 4 + c.j * x ** 5;
  assert(Number.isFinite(denominator) && denominator !== 0, 'invalid rational denominator');
  return numerator / denominator;
}
function parseRow(line) {
  const text = String(line ?? '').trim();
  if (!text.startsWith('|') || !text.endsWith('|')) return null;
  return text.slice(1, -1).split('|').map((x) => x.trim());
}
function apply(signs, load, magnitude) {
  const values = Array.isArray(magnitude) ? magnitude : Array(signs.length).fill(magnitude);
  const direction = load < 0 ? -1 : 1;
  return signs.map((sign, i) => zero(sign * direction * values[i]));
}
function grouped(ab, cd) { return [ab, ab, ab, ab, cd, cd, cd, cd]; }
function sum(locations, components) {
  const rows = Object.values(components);
  return locations.map((_, i) => zero(rows.reduce((total, row) => total + row[i], 0)));
}
function tresca(a, b, t) {
  const delta = Math.sqrt((a - b) ** 2 + 4 * t ** 2);
  const p1 = 0.5 * (a + b + delta);
  const p2 = 0.5 * (a + b - delta);
  const p3 = 0;
  return Math.max(Math.abs(p1 - p2), Math.abs(p2 - p3), Math.abs(p3 - p1));
}
function zero(value) { return Object.is(value, -0) ? 0 : value; }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}
function close(actual, expected, label) {
  const rel = baseline.comparisonTolerance.floatingPointRelative;
  const abs = baseline.comparisonTolerance.floatingPointAbsolute;
  const tolerance = Math.max(abs, Math.max(1, Math.abs(expected)) * rel);
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}, tol ${tolerance}`);
}
function compareArray(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: length`);
  actual.forEach((value, i) => close(value, expected[i], `${label}[${i}]`));
}
function compareObject(actual, expected, label) {
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${label}: keys`);
  for (const key of Object.keys(expected)) close(actual[key], expected[key], `${label}.${key}`);
}
