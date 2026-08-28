#!/usr/bin/env node

/**
 * Does CAESAR discretize reducer stiffness at all?
 *
 * S4-Q1 asks two things: whether CAESAR discretizes a reducer, and if so which
 * station each cylinder samples. Those are not equally hard, and BM4_L settles
 * the first one on its own.
 *
 * The benchmark solver already carries both treatments -- `reducerCondensation`
 * true builds the ten-cylinder condensed authority, false builds a single
 * prismatic element at the reducer's own (From-end) section. Running BM4_L both
 * ways against CAESAR's retained output separates them by an order of
 * magnitude, so a claim that this model "cannot discriminate" is measurably
 * false for this question.
 *
 * It remains true for the SECOND question. Measured on 2026-08-27, the
 * ten-cylinder sampling variants land at 1.47% (end station), 1.74% (midpoint,
 * the implemented rule) and 2.73% (start station) -- a 1.26 point spread on a
 * model carrying bends, tees and restraints. That is not a clean separation,
 * and end-station edging out midpoint on a non-discriminating model is not
 * evidence to change the rule. The controlled isolated-load runs are still what
 * answers it.
 *
 * So this check locks in what BM4_L does establish, and deliberately asserts
 * nothing about sampling station.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCaesarAccdbBenchmark } from './lfea-caesar-accdb-benchmark.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const PROFILE_PATH = path.join(ROOT, 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json');
const LINEAR_CASE_IDS = ['L2', 'L3', 'L4', 'L5', 'L6', 'L14'];
// The separation measured on 2026-08-27 was 1.74% against 16.48%. Requiring
// only a factor of three leaves generous headroom: this guards the conclusion
// that discretization matters, not the exact numbers behind it.
const REQUIRED_SEPARATION_FACTOR = 3;

if (!fs.existsSync(ACCDB)) {
  console.log(JSON.stringify({
    check: 'lfea-s4-reducer-discretization',
    status: 'SKIPPED_MODEL_NOT_PRESENT',
  }));
  process.exit(0);
}

const reducerSourceIds = await declaredReducerIds();

async function solve(reducerCondensation) {
  const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
  profile.linearSolve.reducerCondensation = reducerCondensation;
  return runCaesarAccdbBenchmark({
    accdbPath: ACCDB, profile, solveLinear: true, solveCaseIds: LINEAR_CASE_IDS,
    solveFrictionCaseIds: [], actualPath: null, actualOutPath: null,
    frictionEvidenceOutPath: null, extractor: 'js', expectedAccdbSha256: null, outPath: null,
  });
}

/** Worst relative end-action error per reducer per case. */
function worstReducerErrors(report) {
  const worst = new Map();
  for (const qualifiedCase of report.qualification.cases) {
    for (const row of qualifiedCase.comparison.rows) {
      if (row.entityKind !== 'ELEMENT') continue;
      const sourceId = String(row.entityId).match(/INPUT_ELEMENT:(\d+)\|/)?.[1] ?? null;
      if (sourceId === null || !reducerSourceIds.has(sourceId)) continue;
      if (!['PASS', 'FAIL'].includes(row.status) || row.rawRelativeError === null) continue;
      const key = `${qualifiedCase.caseId}:E${sourceId}`;
      const error = Math.abs(row.rawRelativeError) * 100;
      if (!worst.has(key) || error > worst.get(key)) worst.set(key, error);
    }
  }
  return worst;
}

const condensed = worstReducerErrors(await solve(true));
const uniform = worstReducerErrors(await solve(false));

assert.ok(condensed.size > 0, 'BM4_L must compare reducer end actions for this to mean anything.');
assert.equal(condensed.size, uniform.size, 'Both treatments must cover the same comparisons.');

const mean = (byKey) => [...byKey.values()].reduce((sum, value) => sum + value, 0) / byKey.size;
const condensedMean = mean(condensed);
const uniformMean = mean(uniform);
const condensedWins = [...condensed.entries()].filter(([key, value]) => value < uniform.get(key)).length;

assert.ok(
  uniformMean > condensedMean * REQUIRED_SEPARATION_FACTOR,
  `Ten-cylinder condensation must track CAESAR at least ${REQUIRED_SEPARATION_FACTOR}x closer than a `
  + `single prismatic element: got ${condensedMean.toFixed(4)}% against ${uniformMean.toFixed(4)}%. `
  + 'If these converge, BM4_L no longer supports the conclusion that CAESAR discretizes reducer stiffness.',
);
assert.equal(condensedWins, condensed.size,
  'Ten-cylinder condensation must be closer to CAESAR in every reducer/case comparison, not on average only.');

console.log(JSON.stringify({
  check: 'lfea-s4-reducer-discretization',
  status: 'PASS',
  establishes: 'CAESAR_DISCRETIZES_REDUCER_STIFFNESS_ON_BM4L_EVIDENCE',
  doesNotEstablish: 'WHICH_STATION_EACH_CYLINDER_SAMPLES',
  comparisons: condensed.size,
  tenCylinderMeanWorstErrorPercent: Number(condensedMean.toFixed(4)),
  singlePrismaticMeanWorstErrorPercent: Number(uniformMean.toFixed(4)),
  tenCylinderCloserIn: `${condensedWins}/${condensed.size}`,
  reducerExactMechanicsAuthorized: false,
}, null, 2));

async function declaredReducerIds() {
  const MDBReaderModule = await import('mdb-reader');
  const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
  const reader = new MDBReader(fs.readFileSync(ACCDB));
  return new Set(reader.getTable('INPUT_BASIC_ELEMENT_DATA').getData()
    .filter((row) => Number(row.REDUCER_PTR) > 0)
    .map((row) => String(row.ELEMENTID)));
}
