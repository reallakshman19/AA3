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

// The companion must actually be doing something: at least one case passes on
// it that the relative measure alone would have failed.
const rescued = rows.filter((row) => row.absoluteAccepted && row.relative > 1e-6);
assert.ok(rescued.length > 0,
  'The absolute companion must be what lets the weight-only case through; if nothing '
  + 'relies on it the relative gate is no longer the thing being corrected.');
assert.ok(rescued.every((row) => row.imbalanceN <= row.absoluteLimit));

// And it must NOT be a blanket pass. Every case whose imbalance genuinely
// exceeds the absolute limit has to stand on the relative measure alone -- a
// real equilibrium defect on a piping system is not sub-newton.
const notRescued = rows.filter((row) => row.imbalanceN > row.absoluteLimit);
assert.ok(notRescued.length > 0,
  'At least one BM4_L case must exceed the absolute limit, or this model cannot '
  + 'demonstrate that the companion is selective.');
for (const row of notRescued) {
  assert.equal(row.absoluteAccepted, false,
    `${row.caseId} has a ${row.imbalanceN} N imbalance and must not be accepted on the absolute path.`);
  assert.ok(row.relative <= 1e-6,
    `${row.caseId} passes only because its relative imbalance is genuinely small.`);
}

// No case may be blocked on force equilibrium: that was the state this fixed.
assert.deepEqual(rows.filter((row) => row.checkStatus === 'BLOCK'), [],
  'No BM4_L case should now block on force equilibrium.');

console.log(JSON.stringify({
  check: 'lfea-equilibrium-absolute-companion',
  status: 'PASS',
  rescuedByAbsolute: rescued.map((row) => row.caseId),
  standingOnRelative: notRescued.map((row) => ({
    caseId: row.caseId,
    imbalanceN: Number(row.imbalanceN.toFixed(3)),
    relative: row.relative,
  })),
}, null, 2));
