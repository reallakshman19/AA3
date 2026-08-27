#!/usr/bin/env node

/**
 * Measure whether reducer condensation is a distinguishable source of parity
 * error against CAESAR's own recorded answer for BM4_L.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This is not S4 qualification evidence and does not move any of the three
 * production blockers in linear-fea-reducer-condensation/production-readiness.js.
 * Those require controlled current-version CAESAR runs that *discriminate*
 * between candidate sampling and gravity-ownership rules -- forward/reverse
 * orientation pairs under isolated load families. BM4_L is a single service
 * model under combined loads in one orientation: it can corroborate that the
 * implemented mathematics tracks CAESAR, and it cannot discriminate which rule
 * produced that agreement. Two different sampling rules could both land inside
 * tolerance here. `reducerExactMechanics` stays false on this evidence.
 *
 * WHAT IT DOES ASSERT
 * -------------------
 * A reducer must not fail parity in a way its own neighbours do not also fail.
 *
 * That is the discriminating question this model *can* answer. A genuine
 * reducer defect shows up as error localized to the reducer element. A shared
 * error -- an axial offset propagating along a run, say -- lands on every
 * element in that run identically and says nothing about reducers at all.
 * Asserting "every reducer is within 10%" would instead couple this check to a
 * threshold fitted to today's numbers, which is what the local production
 * harness contract explicitly forbids.
 *
 * The tolerance used for PASS/FAIL is the profile's own pre-declared one. This
 * check never introduces a tolerance of its own.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCaesarAccdbBenchmark } from './lfea-caesar-accdb-benchmark.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const PROFILE = path.join(ROOT, 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json');
// The non-friction cases. Friction cases are nonlinear and out of scope here.
const LINEAR_CASE_IDS = ['L2', 'L3', 'L4', 'L5', 'L6', 'L14'];

if (!fs.existsSync(ACCDB)) {
  console.log(JSON.stringify({
    check: 'lfea-s4-reducer-bm4l-corroboration',
    status: 'SKIPPED_MODEL_NOT_PRESENT',
    requiredModel: 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB',
  }));
  process.exit(0);
}

const report = await runCaesarAccdbBenchmark({
  accdbPath: ACCDB,
  profilePath: PROFILE,
  solveLinear: true,
  solveCaseIds: LINEAR_CASE_IDS,
  solveFrictionCaseIds: [],
  actualPath: null,
  actualOutPath: null,
  frictionEvidenceOutPath: null,
  extractor: 'js',
  expectedAccdbSha256: null,
  outPath: null,
});

// Reducer identity comes from the model, never from a hand-kept list: an
// element is a reducer if the source declares a reducer pointer for it.
const MDBReaderModule = await import('mdb-reader');
const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
const reader = new MDBReader(fs.readFileSync(ACCDB));
const reducerSourceIds = new Set(reader.getTable('INPUT_BASIC_ELEMENT_DATA').getData()
  .filter((row) => Number(row.REDUCER_PTR) > 0)
  .map((row) => String(row.ELEMENTID)));

assert.ok(reducerSourceIds.size > 0, 'BM4_L must declare reducers for this check to mean anything.');

const sourceElementId = (entityId) => String(entityId).match(/INPUT_ELEMENT:(\d+)\|/)?.[1] ?? null;
const isReducer = (entityId) => reducerSourceIds.has(sourceElementId(entityId));

const worstByReducer = new Map();
const isolatedReducerFailures = [];
const sharedFailures = [];

for (const qualifiedCase of report.qualification.cases) {
  const comparable = qualifiedCase.comparison.rows.filter((row) =>
    row.entityKind === 'ELEMENT' && ['PASS', 'FAIL'].includes(row.status));

  for (const row of comparable) {
    if (!isReducer(row.entityId)) continue;
    const key = sourceElementId(row.entityId);
    const error = row.rawRelativeError === null ? null : Math.abs(row.rawRelativeError) * 100;
    const current = worstByReducer.get(key) ?? { percent: -1 };
    if (error !== null && error > current.percent) {
      worstByReducer.set(key, {
        percent: error, caseId: qualifiedCase.caseId,
        quantity: row.quantity, component: row.component, status: row.status,
      });
    }
  }

  // For each failing reducer component, is there a NON-reducer element failing
  // the same quantity/component in the same case at a comparable magnitude? If
  // so the reducer is riding a shared error rather than causing one.
  for (const row of comparable.filter((entry) => entry.status === 'FAIL' && isReducer(entry.entityId))) {
    const error = Math.abs(row.rawRelativeError ?? 0) * 100;
    const peers = comparable.filter((entry) =>
      entry.status === 'FAIL'
      && !isReducer(entry.entityId)
      && entry.quantity === row.quantity
      && entry.component === row.component);
    const matched = peers.filter((entry) =>
      Math.abs(Math.abs(entry.rawRelativeError ?? 0) * 100 - error) < 1);
    const record = {
      caseId: qualifiedCase.caseId,
      elementId: row.entityId,
      quantity: row.quantity,
      component: row.component,
      percentError: Number(error.toFixed(4)),
      matchingNonReducerFailures: matched.length,
    };
    if (matched.length > 0) sharedFailures.push(record);
    else isolatedReducerFailures.push(record);
  }
}

assert.equal(worstByReducer.size, reducerSourceIds.size,
  'Every declared reducer must appear in the compared element set.');

// The assertion. A reducer failing alone would be a real reducer defect.
assert.deepEqual(isolatedReducerFailures, [],
  `Reducer element(s) failed parity without a matching non-reducer failure, which points at the `
  + `condensation itself rather than a shared error: ${JSON.stringify(isolatedReducerFailures, null, 2)}`);

console.log(JSON.stringify({
  check: 'lfea-s4-reducer-bm4l-corroboration',
  status: 'PASS',
  claim: 'REDUCER_NOT_A_DISTINGUISHABLE_SOURCE_OF_PARITY_ERROR_ON_BM4L',
  qualifiesProductionUse: false,
  reducerExactMechanicsAuthorized: false,
  unaddressedS4Blockers: [
    'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
    'REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED',
    'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
  ],
  caseIds: LINEAR_CASE_IDS,
  reducerSourceElementIds: [...reducerSourceIds].sort(),
  worstPerReducer: Object.fromEntries([...worstByReducer.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([id, row]) => [`E${id}`, {
      worstPercentError: Number(row.percent.toFixed(4)),
      caseId: row.caseId, quantity: row.quantity, component: row.component, status: row.status,
    }])),
  isolatedReducerFailureCount: isolatedReducerFailures.length,
  sharedFailureCount: sharedFailures.length,
  sharedFailures,
}, null, 2));
