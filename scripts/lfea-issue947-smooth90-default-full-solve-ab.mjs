#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { solveCaesarAccdbLinearBenchmark as solveBaseline } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
import { compareBenchmarkResultRows } from '../src/core/fea-benchmarks/qualification-comparison.js';

const SOURCE_SHA = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const args = parse(process.argv.slice(2));
if (!args.package) throw new TypeError('--package required');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
assert.equal(pkg.source.sha256, SOURCE_SHA, 'ACCDB source drift');
assert.equal(pkg.profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, false,
  'Baseline package no longer represents the fail-closed pending-setting state.');

const bendRows = pkg.model.tables.INPUT_BENDS.rows;
const elementRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const coordinates = coordinateIndex(pkg.model.tables.INPUT_NODAL_COORDINATES.rows);
const applicability = elementRows.filter((row) => Number(row.BEND_PTR) > 0).map((row) => {
  const declaration = bendRows.find((entry) => Number(entry.BEND_PTR) === Number(row.BEND_PTR));
  if (!declaration) throw new TypeError(`Missing bend ${row.BEND_PTR}.`);
  const outgoing = elementRows.filter((entry) => String(entry.FROM_NODE) === String(row.TO_NODE));
  if (outgoing.length !== 1) throw new TypeError(`Bend ${row.BEND_PTR} outgoing topology drift.`);
  const u = subtract(coordinates.get(String(row.TO_NODE)), coordinates.get(String(row.FROM_NODE)));
  const v = subtract(coordinates.get(String(outgoing[0].TO_NODE)), coordinates.get(String(row.TO_NODE)));
  const angleDeg = Math.acos(clamp(dot(unit(u), unit(v)), -1, 1)) * 180 / Math.PI;
  const alternateFittingThicknessActive = Number(declaration.FIT_THICK) > 0;
  return {
    pointer: Number(row.BEND_PTR),
    sourceElementId: String(row.ELEMENTID),
    angleDeg,
    fitThicknessRaw: Number(declaration.FIT_THICK),
    alternateFittingThicknessActive,
    qualifiesByExportedGeometry: Math.abs(angleDeg - 90) <= 1e-9 && !alternateFittingThicknessActive,
  };
});
assert.equal(applicability.length, 12, 'BM4_NL bend population drift');
assert.ok(applicability.every((entry) => entry.qualifiesByExportedGeometry),
  'Global default candidate is inadmissible unless every BM4_NL bend qualifies by exported geometry.');

const solverPath = fileURLToPath(new URL('../src/core/fea-benchmarks/caesar-accdb-linear-solve.js', import.meta.url));
const candidatePath = fileURLToPath(new URL('../src/core/fea-benchmarks/.issue947-smooth90-default-candidate.mjs', import.meta.url));
const original = readFileSync(solverPath, 'utf8');
const old = '        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled,';
const replacement = `        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled\n          || (Math.abs(bendAngle * 180 / Math.PI - 90) <= 1e-9 && !(Number(declaration.FIT_THICK) > 0)),`;
assert.equal(original.split(old).length - 1, 1, 'smooth90 factor-selection site drift');
const candidateSource = original.replace(old, replacement);

const baseline = solveBaseline(pkg);
let candidate;
writeFileSync(candidatePath, candidateSource);
try {
  const mod = await import(pathToFileURL(candidatePath).href + `?v=${Date.now()}`);
  candidate = mod.solveCaesarAccdbLinearBenchmark(pkg);
} finally {
  try { unlinkSync(candidatePath); } catch {}
}

const cases = {};
for (const caseId of ['L19', 'L20']) {
  const b = compare(caseId, baseline.cases[caseId].rows);
  const c = compare(caseId, candidate.cases[caseId].rows);
  const bf = new Set(b.rows.filter((row) => row.status === 'FAIL').map((row) => row.identity));
  const cf = new Set(c.rows.filter((row) => row.status === 'FAIL').map((row) => row.identity));
  cases[caseId] = {
    baseline: b.counts,
    candidate: c.counts,
    removedFailures: [...bf].filter((id) => !cf.has(id)).sort(),
    addedFailures: [...cf].filter((id) => !bf.has(id)).sort(),
    node20390Uz: {
      baseline: findNode(b, '20390', 'FORCE', 'UZ'),
      candidate: findNode(c, '20390', 'FORCE', 'UZ'),
    },
    execution: {
      baseline: baseline.mechanics.cases[caseId].executionStatus,
      candidate: candidate.mechanics.cases[caseId].executionStatus,
    },
  };
}

const l19 = cases.L19;
const output = {
  schema: 'lfea-issue947-smooth90-default-full-solve-ab/v1',
  issue: 947,
  sourceAccdbSha256: SOURCE_SHA,
  purpose: 'GOVERNED_GLOBAL_B31J_SMOOTH90_DEFAULT_FULL_SOLVE_AB_NO_PRODUCTION_UPDATE',
  authority: {
    caesarSetting: 'Use Smooth 90 Degree Bend Correction',
    documentedDefault: true,
    trueCoefficient: '1.3/h',
    falseCoefficient: '1.65/h',
    repositoryProfileBaseline: pkg.profile.linearSolve.b31jSmooth90FlexibilityCorrection,
  },
  applicability,
  sourceHashes: { baseline: hash(original), candidate: hash(candidateSource) },
  cases,
  gates: {
    allDeclaredBendsQualifyByExportedGeometry: applicability.every((entry) => entry.qualifiesByExportedGeometry) ? 'PASS' : 'FAIL',
    l19NoNewFailures: l19.addedFailures.length === 0 ? 'PASS' : 'FAIL',
    l19FailureCountReduces: l19.candidate.failed < l19.baseline.failed ? 'PASS' : 'FAIL',
    executionQualified: Object.values(cases).every((entry) => entry.execution.baseline !== 'BLOCKED' && entry.execution.candidate !== 'BLOCKED') ? 'PASS' : 'FAIL',
  },
  classification: applicability.every((entry) => entry.qualifiesByExportedGeometry)
    && l19.addedFailures.length === 0
    && l19.candidate.failed < l19.baseline.failed
    ? 'SMOOTH90_DOCUMENTED_DEFAULT_SUPPORTED_FOR_PROFILE_AUTHORITY_UPDATE'
    : 'SMOOTH90_GLOBAL_DEFAULT_CANDIDATE_REJECT_OR_INVESTIGATE',
  acceptanceBoundary: 'This A/B does not itself mutate the benchmark profile. L19 is primary; L20 is reported only. No tolerance, solver, reference, or coefficient fitting is permitted.',
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

function compare(caseId, actualRows) {
  return compareBenchmarkResultRows({
    caseId,
    referenceRows: pkg.references[caseId].rows,
    actualRows,
    tolerances: pkg.profile.tolerances,
  });
}
function findNode(comparison, entityId, quantity, component) {
  return comparison.rows.find((row) => row.entityKind === 'NODE' && String(row.entityId) === entityId
    && row.quantity === quantity && row.component === component) ?? null;
}
function coordinateIndex(rows) {
  const map = new Map();
  for (const row of rows) {
    set(map, row.FROM_NODE, row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z);
    set(map, row.TO_NODE, row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z);
  }
  return map;
}
function set(map, id, x, y, z) {
  const key = String(id);
  const p = [Number(x), Number(y), Number(z)];
  if (!map.has(key)) map.set(key, p);
}
function unit(v) { const n = Math.hypot(...v); if (!(n > 0)) throw new TypeError('degenerate direction'); return v.map((x) => x / n); }
function subtract(a, b) { return a.map((x, i) => x - b[i]); }
function dot(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }
function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function hash(s) { return createHash('sha256').update(s).digest('hex'); }
function parse(argv) {
  const result = { package: null, out: null };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--package') result.package = argv[i + 1];
    else if (argv[i] === '--out') result.out = argv[i + 1];
    else throw new TypeError(argv[i]);
  }
  return result;
}
