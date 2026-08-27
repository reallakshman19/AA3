#!/usr/bin/env node

/**
 * The absolute companion to the relative force-equilibrium gate.
 *
 * The relative measure divides the net imbalance by a sum of force MAGNITUDES
 * over every node. Self-equilibrating loads inflate that denominator enormously,
 * so a thermal case is judged far more leniently than a weight-only case for the
 * same quality of solve. On BM4_L the weight case had the smallest absolute
 * imbalance of all four and was the only one the relative gate failed.
 *
 * The companion accepts an imbalance below a declared absolute limit regardless
 * of the ratio. The risk in any such escape hatch is that it quietly passes
 * everything, so this checks the opposite: the cases with genuinely large
 * imbalances must NOT be rescued by it. They pass on the relative measure, on
 * their own merit, and would still fail if that measure went bad.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLinearPipingAccdbSession,
  prepareLinearPipingAccdbPreFlight,
} from '../src/workspace/linear-piping-accdb-intake.js';
import { authorizeLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';
import { sealInputXmlProductionBendFactorAuthority } from '../src/core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import { sealInputXmlProductionBranchFactorAuthority } from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const CASE_IDS = ['IXP-W', 'IXP-WP', 'IXP-WPT', 'IXP-WT'];
const MODEL_TABLES = [
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
];

if (!fs.existsSync(ACCDB)) {
  console.log(JSON.stringify({
    check: 'lfea-equilibrium-absolute-companion',
    status: 'SKIPPED_MODEL_NOT_PRESENT',
  }));
  process.exit(0);
}

const MDBReaderModule = await import('mdb-reader');
const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
const reader = new MDBReader(fs.readFileSync(ACCDB));
const tables = Object.fromEntries(
  MODEL_TABLES.map((name) => [name, { rows: reader.getTable(name).getData() }]),
);

const session = createLinearPipingAccdbSession(tables, {
  fileName: 'BM4_L.ACCDB',
  requestedCaseIds: CASE_IDS,
});
const prepared = prepareLinearPipingAccdbPreFlight(session.intake, session.sourceBundle, {
  bendFactorAuthority: sealInputXmlProductionBendFactorAuthority({
    authorityId: 'EQ-CHECK-BEND', editionProfileId: 'B31_3_2022_B31J_2017',
    smooth90FlexibilityCorrection: true, sourceId: 'EQ_CHECK', sourceRevision: '1',
  }),
  branchFactorAuthority: sealInputXmlProductionBranchFactorAuthority({
    authorityId: 'EQ-CHECK-BRANCH', editionProfileId: 'B31_3_2022_B31J_2017',
    sourceId: 'EQ_CHECK', sourceRevision: '1',
  }),
});
const authorized = authorizeLinearPipingInputXmlPreFlight(prepared, {
  approverIdentity: 'lfea-equilibrium-absolute-companion-check',
  reason: 'Verify the absolute equilibrium companion discriminates.',
});
const executed = createLfeaNativeExecutionAuthority().run(authorized, { requestedCaseIds: CASE_IDS });

const rows = executed.execution.caseExecutions.map((entry) => {
  const check = entry.execution.diagnostics.forceEquilibrium;
  return {
    caseId: entry.caseId,
    status: entry.executionStatus,
    imbalanceN: check.imbalance,
    relative: check.value,
    absoluteLimit: check.absoluteLimit,
    absoluteAccepted: check.absoluteAccepted,
    checkStatus: check.status,
  };
});

for (const row of rows) {
  assert.ok(Number.isFinite(row.absoluteLimit) && row.absoluteLimit > 0,
    `${row.caseId} must carry a declared absolute equilibrium limit.`);
}

/*
 * The companion was added because the weight-only case carried a real absolute
 * imbalance (0.31 N) that the relative measure alone would have failed. Moving
 * production straight pipe to Timoshenko removed the cause rather than the
 * symptom: the solve's condition estimate fell from 3.56e13 to 4.76e6 and every
 * case now balances to 1e-13 relative or better, so nothing is rescued any more.
 *
 * The companion stays declared -- a model that is genuinely lightly loaded can
 * still need it -- but it is no longer load-bearing here, and this check now
 * pins the stronger property that replaced it: equilibrium is essentially exact
 * on every case, with no case relying on the absolute escape hatch.
 */
for (const row of rows) {
  assert.ok(row.relative < 1e-9,
    `${row.caseId} must balance on the relative measure alone (got ${row.relative}).`);
}
const rescued = rows.filter((row) => row.absoluteAccepted && row.relative > 1e-6);
assert.equal(rescued.length, 0,
  'No case should now need the absolute companion; if one does, conditioning has regressed and '
  + 'the Timoshenko alignment that made the relative gate sufficient should be re-measured.');

/*
 * Selectivity can no longer be demonstrated on BM4_L: with the solve well
 * conditioned, no case carries an imbalance anywhere near the absolute limit,
 * so there is no case left that the companion would have to refuse. That is
 * recorded here rather than asserted, because asserting it would require the
 * model to stay defective.
 */
const exceedingAbsolute = rows.filter((row) => row.imbalanceN > row.absoluteLimit);
for (const row of exceedingAbsolute) {
  assert.equal(row.absoluteAccepted, false,
    `${row.caseId} has a ${row.imbalanceN} N imbalance and must not be accepted on the absolute path.`);
}

// No case may be blocked on force equilibrium.
assert.deepEqual(rows.filter((row) => row.checkStatus === 'BLOCK'), [],
  'No BM4_L case should block on force equilibrium.');

console.log(JSON.stringify({
  check: 'lfea-equilibrium-absolute-companion',
  status: 'PASS',
  companionLoadBearing: false,
  companionRetainedFor: 'GENUINELY_LIGHTLY_LOADED_MODELS',
  selectivityDemonstrableOnThisModel: exceedingAbsolute.length > 0,
  cases: rows.map((row) => ({
    caseId: row.caseId,
    imbalanceN: Number(row.imbalanceN.toPrecision(4)),
    relative: row.relative,
  })),
}, null, 2));
